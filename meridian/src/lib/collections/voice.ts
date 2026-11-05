import { requiresAllPartyRecording } from "./recording";
import { limitationsDatePassed } from "./sol";
import type { CallTranscript, CallTurn, PortfolioAccount, QaFlag, VoiceSettings } from "./types";

export { requiresAllPartyRecording };

export type ConsumerTurn =
  | { type: "consent"; accepted: boolean }
  | { type: "verify"; name: string; checks: Array<{ kind: "last4" | "zip" | "portal"; value: string }> }
  | { type: "say"; text: string }
  | { type: "transfer" };

export interface VoiceStep {
  transcript: CallTranscript;
  say: string;
  disposition: string | null;
  accountPatch: Partial<PortfolioAccount>;
  paymentUrl: string | null;
  transferred: boolean;
  plan: { monthlyCents: number; months: number } | null;
  qaFlags: QaFlag[];
}

const SSN_SHAPE = /\b\d{3}-?\d{2}-?\d{4}\b/;
const CARD_SHAPE = /\b(?:\d[ -]*?){13,19}\b/;
const THREATS = /\b(arrest|jail|sue you tomorrow|garnish you tonight|prison|warrant)\b/i;
const FALSE_STATEMENTS = /\b(you will be arrested|the police are coming|this is a criminal case|we are the government)\b/i;

export function redactSensitive(text: string): { text: string; hadCard: boolean; hadSsn: boolean } {
  const hadSsn = SSN_SHAPE.test(text);
  const hadCard = CARD_SHAPE.test(text.replace(/\b\d{5}\b/g, ""));
  let next = text.replace(SSN_SHAPE, "[redacted]");
  next = next.replace(CARD_SHAPE, (match) => (match.replace(/\D/g, "").length >= 13 ? "[redacted-card]" : match));
  return { text: next, hadCard, hadSsn };
}

export function openingLine(agency: string, allParty: boolean): string {
  const recording = allParty
    ? "This call is recorded. Please say yes if you consent to recording. If you do not consent, we will stop."
    : "This call is recorded.";
  return `Hello, this is an automated assistant for ${agency}. I am not a live person. You can ask to speak with a person at any time. ${recording}`;
}

export function emptyTranscript(agency: string, allParty: boolean, at: string): CallTranscript {
  const say = openingLine(agency, allParty);
  return {
    phase: allParty ? "greeting" : "identify",
    aiDisclosed: true,
    recordingAnnounced: true,
    recordingConsent: allParty ? null : true,
    debtDisclosed: false,
    verified: false,
    turns: [{ role: "agent", text: say, at }],
  };
}

function push(transcript: CallTranscript, role: CallTurn["role"], text: string, at: string): CallTranscript {
  return { ...transcript, turns: [...transcript.turns, { role, text, at }] };
}

function miniMiranda(agency: string): string {
  return `This is an attempt to collect a debt, and any information obtained will be used for that purpose. This communication is from a debt collector at ${agency}.`;
}

export function stepCall(input: {
  transcript: CallTranscript;
  turn: ConsumerTurn;
  account: PortfolioAccount | null;
  settings: VoiceSettings;
  at: string;
  paymentUrl: string;
  agency: string;
}): VoiceStep {
  const redacted = input.turn.type === "say" ? redactSensitive(input.turn.text) : null;
  let transcript = input.transcript;
  const flags: QaFlag[] = [];
  if (!transcript.aiDisclosed) flags.push({ code: "missing_ai_disclosure", detail: "The opening did not say this is an automated assistant." });
  if (redacted?.hadCard) flags.push({ code: "card_in_transcript", detail: "A card-shaped number was redacted and was not stored." });
  if (redacted?.hadSsn || (input.turn.type === "verify" && input.turn.checks.some((check) => SSN_SHAPE.test(check.value)))) {
    const say = "Please do not provide a Social Security number. I can use the last four of the account, the ZIP code, or the portal code.";
    transcript = push(transcript, "consumer", "[consumer provided a number that was not stored]", input.at);
    transcript = push(transcript, "agent", say, input.at);
    return finish(transcript, say, null, {}, null, false, null, flags);
  }

  if (input.turn.type === "transfer") {
    const say = "Transferring you to a live collector now.";
    transcript = { ...push(push(transcript, "consumer", "Please transfer me to a person.", input.at), "agent", say, input.at), phase: "transfer" };
    return finish(transcript, say, "warm_transfer", {}, null, true, null, flags);
  }

  if (transcript.phase === "greeting") {
    if (input.turn.type !== "consent") {
      const say = "Please say yes if you consent to this recorded call, or no to stop.";
      transcript = push(transcript, "consumer", input.turn.type === "say" ? redacted?.text ?? "" : "response", input.at);
      transcript = push(transcript, "agent", say, input.at);
      return finish(transcript, say, null, {}, null, false, null, flags);
    }
    transcript = push(transcript, "consumer", input.turn.accepted ? "Yes, I consent to recording." : "No.", input.at);
    if (!input.turn.accepted) {
      const say = "Thank you. We will not continue on a recorded line. Goodbye.";
      transcript = { ...push(transcript, "agent", say, input.at), phase: "ended", recordingConsent: false };
      return finish(transcript, say, "recording_declined", {}, null, false, null, flags);
    }
    const say = "Thank you. Who am I speaking with? I will also need two of these: the last four of the account, the ZIP code on the account, or the portal code. I cannot discuss a debt until that is confirmed.";
    transcript = { ...push(transcript, "agent", say, input.at), phase: "identify", recordingConsent: true };
    return finish(transcript, say, null, {}, null, false, null, flags);
  }

  if (transcript.phase === "identify") {
    if (input.turn.type !== "verify" || !input.account) {
      const say = "I need to confirm the right person before I can discuss anything about an account. Please give the name and two identifiers. You can also ask for a live person.";
      const heard = input.turn.type === "say" ? redacted?.text ?? "" : "unverified response";
      if (/\b(balance|debt|owe)\b/i.test(heard)) {
        flags.push({ code: "third_party_disclosure", detail: "Debt content was withheld because the person is not verified yet." });
      }
      transcript = push(transcript, "consumer", heard, input.at);
      transcript = push(transcript, "agent", say, input.at);
      return finish(transcript, say, null, {}, null, false, null, flags);
    }
    const nameOk = input.turn.name.trim().toLowerCase() === input.account.consumerName.trim().toLowerCase();
    const matched = input.turn.checks.filter((check) => identifierMatches(input.account as PortfolioAccount, check));
    transcript = push(transcript, "consumer", `Verification attempt for ${input.turn.name}.`, input.at);
    if (!nameOk || matched.length < 2) {
      const say = "Those details do not match. I cannot discuss an account. You may try again or ask for a live person.";
      transcript = push(transcript, "agent", say, input.at);
      return finish(transcript, say, null, {}, null, false, null, flags);
    }
    const say = `${miniMiranda(input.agency)} How can I help?`;
    transcript = {
      ...push(transcript, "agent", say, input.at),
      phase: "assist",
      verified: true,
      debtDisclosed: true,
    };
    return finish(transcript, say, null, {}, null, false, null, flags);
  }

  if (transcript.phase !== "assist" && transcript.phase !== "payment") {
    const say = "This call is already finished. A live person can follow up if the account is still eligible.";
    return finish(transcript, say, transcript.phase === "ended" ? "ended" : null, {}, null, false, null, flags);
  }

  const heard = input.turn.type === "say" ? redacted?.text ?? "" : "";
  transcript = push(transcript, "consumer", heard || "request", input.at);
  if (THREATS.test(heard) || FALSE_STATEMENTS.test(heard)) {
    flags.push({
      code: FALSE_STATEMENTS.test(heard) ? "false_statement" : "threat",
      detail: "Consumer wording or a script hit a threat/false-statement pattern and must be reviewed. The agent will not repeat it.",
    });
  }
  if (!transcript.debtDisclosed) {
    flags.push({ code: "missing_miranda", detail: "Debt was discussed before the mini-Miranda." });
  }

  const lower = heard.toLowerCase();
  const barred = limitationsDatePassed(input.account?.solExpiresOn, input.at);
  const asksToPay = /\b(pay|payment|settle|plan)\b/i.test(heard) || Boolean(redacted?.hadCard) || /\b(card number|visa|mastercard)\b/i.test(heard);
  if (barred && asksToPay) {
    const say = "The limitations date on file is in the past. I will not offer a payment plan or a payment page. A collector has to use the counsel-reviewed time-barred notice. I can transfer you to a person.";
    flags.push({ code: "time_barred", detail: "Draft disclosure. Counsel has not approved this sentence or the state's time-barred notice." });
    transcript = push(transcript, "agent", say, input.at);
    return finish(transcript, say, "time_barred_hold", {}, null, false, null, flags);
  }
  if (/\b(cease|stop calling|do not call|don't call)\b/i.test(heard)) {
    const say = "I am noting that you want communications to stop. We will not place further collection calls. Goodbye.";
    transcript = { ...push(transcript, "agent", say, input.at), phase: "ended" };
    return finish(transcript, say, "cease", { status: "ceased", quarantineReason: "Consumer cease request on call." }, null, false, null, flags);
  }
  if (/\b(bankrupt|bankruptcy)\b/i.test(heard)) {
    const say = "I am marking bankruptcy on the account and stopping collection activity. A person will review the notice. Goodbye.";
    transcript = { ...push(transcript, "agent", say, input.at), phase: "ended" };
    return finish(transcript, say, "bankruptcy", { status: "bankruptcy" }, null, false, null, flags);
  }
  if (/\b(attorney|lawyer)\b/i.test(heard)) {
    const say = "I am noting attorney representation and stopping collection contact. Goodbye.";
    transcript = { ...push(transcript, "agent", say, input.at), phase: "ended" };
    return finish(transcript, say, "attorney", { status: "attorney" }, null, false, null, flags);
  }
  if (/\b(dispute|not my debt|don't owe)\b/i.test(heard)) {
    const say = "I am recording a dispute. Collection outreach will stop while it is open. Goodbye.";
    transcript = { ...push(transcript, "agent", say, input.at), phase: "ended" };
    return finish(transcript, say, "dispute", { status: "disputed" }, null, false, null, flags);
  }
  if (/\b(hardship|can't pay|cannot pay|lost my job)\b/i.test(lower)) {
    const say = "I am noting a hardship. A collector will review a plan. I cannot change the balance on this call. You can also ask for a person now.";
    transcript = push(transcript, "agent", say, input.at);
    return finish(transcript, say, "hardship", {}, null, false, null, flags);
  }
  if (redacted?.hadCard || /\b(card number|visa|mastercard)\b/i.test(heard)) {
    const say = `I cannot take a card number. I am sending a secure payment page that does not store a card here: ${input.paymentUrl}`;
    transcript = { ...push(transcript, "agent", say, input.at), phase: "payment" };
    return finish(transcript, say, "payment_handoff", {}, input.paymentUrl, false, null, flags);
  }
  if (/\b(pay|payment|settle|plan)\b/i.test(heard)) {
    const plan = proposePlan(input.account, input.settings, heard);
    if (!plan) {
      const say = "That request is outside the settlement authority on this account. I am transferring you to a collector.";
      transcript = { ...push(transcript, "agent", say, input.at), phase: "transfer" };
      return finish(transcript, say, "needs_human_authority", {}, null, true, null, flags);
    }
    const say = `I can set a plan of $${(plan.monthlyCents / 100).toFixed(2)} for ${plan.months} months, inside the current authority. The secure page is ${input.paymentUrl}. A person can change it if you want.`;
    transcript = { ...push(transcript, "agent", say, input.at), phase: "payment" };
    return finish(transcript, say, "plan_offered", {}, input.paymentUrl, false, plan, flags);
  }

  const say = "I can help with a payment link, a plan inside the published authority, a dispute, or a transfer to a person. I will not ask for a card number or a Social Security number.";
  transcript = push(transcript, "agent", say, input.at);
  return finish(transcript, say, null, {}, null, false, null, scoreTranscript(transcript, flags));
}

function finish(
  transcript: CallTranscript,
  say: string,
  disposition: string | null,
  accountPatch: Partial<PortfolioAccount>,
  paymentUrl: string | null,
  transferred: boolean,
  plan: { monthlyCents: number; months: number } | null,
  qaFlags: QaFlag[],
): VoiceStep {
  return { transcript, say, disposition, accountPatch, paymentUrl, transferred, plan, qaFlags: scoreTranscript(transcript, qaFlags) };
}

function identifierMatches(account: PortfolioAccount, check: { kind: "last4" | "zip" | "portal"; value: string }): boolean {
  const value = check.value.trim().toLowerCase();
  if (check.kind === "last4") return value === account.last4.trim().toLowerCase();
  if (check.kind === "zip") return value.slice(0, 5) === account.zip.trim().slice(0, 5);
  return value === account.portalCode.trim().toLowerCase();
}

function proposePlan(
  account: PortfolioAccount | null,
  settings: VoiceSettings,
  text: string,
): { monthlyCents: number; months: number } | null {
  if (!account || account.balanceCents <= 0) return null;
  const monthsMatch = text.match(/(\d+)\s*months?/i);
  const percentMatch = text.match(/(\d+)\s*%/);
  const months = monthsMatch ? Number(monthsMatch[1]) : Math.min(settings.maxPlanMonths, 6);
  const percent = percentMatch ? Number(percentMatch[1]) : 0;
  if (!Number.isFinite(months) || months < 1 || months > settings.maxPlanMonths) return null;
  if (percent > settings.maxDiscountPercent) return null;
  const remaining = Math.round(account.balanceCents * (1 - percent / 100));
  return { monthlyCents: Math.max(1, Math.ceil(remaining / months)), months };
}

export function scoreTranscript(transcript: CallTranscript, extra: QaFlag[] = []): QaFlag[] {
  const flags = [...extra];
  const agent = transcript.turns.filter((turn) => turn.role === "agent").map((turn) => turn.text).join("\n");
  if (!/automated assistant/i.test(agent)) {
    flags.push({ code: "missing_ai_disclosure", detail: "No automated-assistant disclosure found in the agent transcript." });
  }
  if (transcript.debtDisclosed && !/attempt to collect a debt/i.test(agent)) {
    flags.push({ code: "missing_miranda", detail: "Debt was marked disclosed without the mini-Miranda language." });
  }
  if (FALSE_STATEMENTS.test(agent)) flags.push({ code: "false_statement", detail: "Agent transcript contains a false-statement pattern." });
  if (THREATS.test(agent)) flags.push({ code: "threat", detail: "Agent transcript contains a threat pattern." });
  const unique = new Map(flags.map((flag) => [`${flag.code}:${flag.detail}`, flag]));
  return [...unique.values()];
}

export function rulesSummary(disposition: string | null, flags: QaFlag[]): string {
  const flagText = flags.length ? ` QA flags: ${flags.map((flag) => flag.code).join(", ")}.` : " No QA flags.";
  return `Rules-based summary${disposition ? ` (${disposition})` : ""}.${flagText} A realtime speech model was not called.`;
}
