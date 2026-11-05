import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import { requiresAllPartyRecording, emptyTranscript, rulesSummary, stepCall, type ConsumerTurn } from "@/lib/collections/voice";
import { evaluateGate, type GateContext } from "@/lib/collections/gate";
import { parsePortfolioCsv } from "@/lib/collections/portfolio";
import type {
  CallTranscript,
  ChannelMessage,
  CollectionChannel,
  CollectionTemplate,
  ConsumerConsent,
  PortfolioAccount,
  StateEligibility,
  VoiceCall,
  VoiceSettings,
} from "@/lib/collections/types";
import type { WorkspaceId } from "@/lib/types";
import { workspaceOf } from "@/lib/workspaces";
import { decryptSecret, encryptSecret } from "@/server/auth-crypto";
import { loadDb, mutate, nextId } from "@/server/db";
import { masterSecret } from "@/server/secrets";
import { publicBaseUrl } from "@/server/mailer";

const TEMPLATE_DIR = path.join(process.cwd(), "templates", "collections");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function accounts(workspaceId: WorkspaceId): PortfolioAccount[] {
  return (loadDb().portfolioAccounts ?? []).filter((account) => account.workspaceId === workspaceId);
}

export function collectionSnapshot(workspaceId: WorkspaceId) {
  const db = loadDb();
  return {
    settings: db.voiceSettings,
    eligibility: (db.stateEligibility ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    accounts: accounts(workspaceId),
    calls: (db.voiceCalls ?? []).filter((call) => call.workspaceId === workspaceId).slice(0, 30),
    messages: (db.channelMessages ?? []).filter((message) => message.workspaceId === workspaceId).slice(0, 30),
    templates: db.collectionTemplates ?? [],
    events: (db.complianceEvents ?? []).filter((event) => event.workspaceId === workspaceId).slice(0, 40),
  };
}

export function updateEligibility(code: string, patch: Partial<Pick<StateEligibility, "eligible" | "notes" | "needsCounselReview" | "bondOrRegistration">>): StateEligibility {
  return mutate((db) => {
    const row = (db.stateEligibility ?? []).find((item) => item.code === code.toUpperCase());
    if (!row) throw new Error("Unknown state");
    if (patch.eligible !== undefined) row.eligible = patch.eligible;
    if (patch.notes !== undefined) row.notes = patch.notes;
    if (patch.needsCounselReview !== undefined) row.needsCounselReview = patch.needsCounselReview;
    if (patch.bondOrRegistration !== undefined) row.bondOrRegistration = patch.bondOrRegistration;
    row.lastReviewed = new Date().toISOString().slice(0, 10);
    return row;
  });
}

export function updateVoiceSettings(patch: Partial<VoiceSettings>): VoiceSettings {
  return mutate((db) => {
    const next = { ...db.voiceSettings! };
    for (const [key, value] of Object.entries(patch) as Array<[keyof VoiceSettings, VoiceSettings[keyof VoiceSettings]]>) {
      if (value !== undefined) next[key] = value as never;
    }
    db.voiceSettings = next;
    return next;
  });
}

export function importPortfolio(workspaceId: WorkspaceId, csv: string, portfolioId: string) {
  const db = loadDb();
  const existing = new Set(accounts(workspaceId).map((account) => account.accountRef.toLowerCase()));
  const result = parsePortfolioCsv({
    csv,
    workspaceId,
    portfolioId: portfolioId || nextId("pf"),
    eligibility: db.stateEligibility ?? [],
    existingRefs: existing,
    now: new Date().toISOString(),
    id: () => nextId("acct"),
  });
  if (result.accounts.length === 0 && result.skipped.length > 0 && result.skipped[0]?.reason.includes("SSN")) {
    return result;
  }
  mutate((state) => {
    state.portfolioAccounts = [...(state.portfolioAccounts ?? []), ...result.accounts];
  });
  return result;
}

export function returnQuarantined(workspaceId: WorkspaceId, portfolioId?: string): number {
  let count = 0;
  mutate((db) => {
    for (const account of db.portfolioAccounts ?? []) {
      if (account.workspaceId !== workspaceId || account.status !== "quarantined") continue;
      if (portfolioId && account.portfolioId !== portfolioId) continue;
      account.status = "returned";
      account.returnedAt = new Date().toISOString();
      count += 1;
    }
  });
  return count;
}

export function recordConsent(workspaceId: WorkspaceId, accountId: string, channel: ConsumerConsent["channel"], source: string): ConsumerConsent {
  const consent: ConsumerConsent = {
    id: nextId("cons"),
    workspaceId,
    accountId,
    channel,
    source,
    at: new Date().toISOString(),
  };
  mutate((db) => {
    db.consents = [...(db.consents ?? []), consent];
  });
  return consent;
}

function logEvent(workspaceId: WorkspaceId, channel: CollectionChannel, accountId: string | null, allowed: boolean, reason: string): void {
  mutate((db) => {
    db.complianceEvents = [
      { id: nextId("ce"), workspaceId, at: new Date().toISOString(), channel, accountId, allowed, reason },
      ...(db.complianceEvents ?? []),
    ].slice(0, 500);
  });
}

function gateFor(workspaceId: WorkspaceId, account: PortfolioAccount | null, channel: CollectionChannel, voicemailBody?: string) {
  const db = loadDb();
  const now = new Date();
  const recent = (db.voiceCalls ?? []).filter((call) => call.workspaceId === workspaceId && call.accountId === account?.id);
  const outboundCallsIn7Days = recent.filter((call) => {
    if (call.direction !== "outbound" || call.blockedReason) return false;
    return now.getTime() - new Date(call.createdAt).getTime() < WEEK_MS;
  }).length;
  const conversations = recent.filter((call) => call.disposition && call.disposition !== "blocked" && !call.blockedReason);
  const lastConversationAt = conversations[0]?.updatedAt ?? null;
  const sentToday = (db.channelMessages ?? []).filter((message) => message.workspaceId === workspaceId && message.status === "sandbox_queued" && message.at.slice(0, 10) === now.toISOString().slice(0, 10)).length
    + recent.filter((call) => call.direction === "outbound" && !call.blockedReason && call.createdAt.slice(0, 10) === now.toISOString().slice(0, 10)).length;
  const settings = db.voiceSettings!;
  const ctx: GateContext = {
    now,
    settings,
    eligibility: db.stateEligibility ?? [],
    account,
    consents: (db.consents ?? []).filter((row) => row.workspaceId === workspaceId),
    dnc: (db.dncEntries ?? []).filter((row) => row.workspaceId === workspaceId),
    outboundCallsIn7Days,
    lastConversationAt,
    reassigned: settings.rndSandboxClear ? "ok" : "unknown",
    channel,
    voicemailBody,
    campaignSentToday: sentToday,
  };
  return evaluateGate(ctx);
}

function seal(transcript: CallTranscript): string {
  return encryptSecret(JSON.stringify(transcript), masterSecret());
}

function open(ciphertext: string): CallTranscript {
  return JSON.parse(decryptSecret(ciphertext, masterSecret())) as CallTranscript;
}

export function startVoice(input: {
  workspaceId: WorkspaceId;
  direction: "inbound" | "outbound";
  accountId?: string;
  campaignId?: string;
}): VoiceCall & { say: string; transcript: CallTranscript } {
  const account = input.accountId ? accounts(input.workspaceId).find((item) => item.id === input.accountId) ?? null : null;
  const channel: CollectionChannel = input.direction === "inbound" ? "voice_inbound" : "voice_outbound";
  const decision = gateFor(input.workspaceId, account, channel);
  logEvent(input.workspaceId, channel, account?.id ?? null, decision.allowed, decision.reason);
  const now = new Date().toISOString();
  const agency = workspaceOf(input.workspaceId).legalName;
  const allParty = account ? requiresAllPartyRecording(account.state) : true;
  const transcript = emptyTranscript(agency, allParty, now);
  if (!decision.allowed) {
    const blocked: VoiceCall = {
      id: nextId("call"),
      workspaceId: input.workspaceId,
      accountId: account?.id ?? null,
      direction: input.direction,
      phase: "ended",
      disposition: "blocked",
      summary: rulesSummary("blocked", []),
      summarySource: "rules",
      qaFlags: [],
      transcriptCiphertext: seal({ ...transcript, phase: "ended", turns: [{ role: "system", text: decision.reason, at: now }] }),
      campaignId: input.campaignId || "sandbox",
      blockedReason: decision.reason,
      createdAt: now,
      updatedAt: now,
      provider: "sandbox",
      providerId: null,
      transferred: false,
    };
    mutate((db) => {
      db.voiceCalls = [blocked, ...(db.voiceCalls ?? [])].slice(0, 400);
    });
    return { ...blocked, say: decision.reason, transcript: open(blocked.transcriptCiphertext) };
  }
  const call: VoiceCall = {
    id: nextId("call"),
    workspaceId: input.workspaceId,
    accountId: account?.id ?? null,
    direction: input.direction,
    phase: transcript.phase,
    disposition: null,
    summary: rulesSummary(null, []),
    summarySource: "rules",
    qaFlags: [],
    transcriptCiphertext: seal(transcript),
    campaignId: input.campaignId || "sandbox",
    blockedReason: null,
    createdAt: now,
    updatedAt: now,
    provider: "sandbox",
    providerId: `sandbox_${nextId("prov")}`,
    transferred: false,
  };
  mutate((db) => {
    db.voiceCalls = [call, ...(db.voiceCalls ?? [])].slice(0, 400);
  });
  return { ...call, say: transcript.turns[0]?.text ?? "", transcript };
}

export function turnVoice(workspaceId: WorkspaceId, callId: string, turn: ConsumerTurn): VoiceCall & { say: string; transcript: CallTranscript; paymentUrl: string | null } {
  const db = loadDb();
  const call = (db.voiceCalls ?? []).find((item) => item.id === callId && item.workspaceId === workspaceId);
  if (!call) throw new Error("Call not found");
  if (call.blockedReason) throw new Error(call.blockedReason);
  const account = call.accountId ? accounts(workspaceId).find((item) => item.id === call.accountId) ?? null : null;
  const transcript = open(call.transcriptCiphertext);
  const token = nextId("pay");
  const paymentUrl = `${publicBaseUrl()}/pay/sandbox/${token}`;
  const stepped = stepCall({
    transcript,
    turn,
    account,
    settings: db.voiceSettings!,
    at: new Date().toISOString(),
    paymentUrl,
    agency: workspaceOf(workspaceId).legalName,
  });
  const updated: VoiceCall = {
    ...call,
    phase: stepped.transcript.phase,
    disposition: stepped.disposition ?? call.disposition,
    summary: rulesSummary(stepped.disposition ?? call.disposition, stepped.qaFlags),
    qaFlags: stepped.qaFlags,
    transcriptCiphertext: seal(stepped.transcript),
    updatedAt: new Date().toISOString(),
    transferred: call.transferred || stepped.transferred,
    accountId: account?.id ?? call.accountId,
  };
  mutate((state) => {
    state.voiceCalls = (state.voiceCalls ?? []).map((item) => (item.id === call.id ? updated : item));
    if (account && Object.keys(stepped.accountPatch).length > 0) {
      state.portfolioAccounts = (state.portfolioAccounts ?? []).map((item) =>
        item.id === account.id ? { ...item, ...stepped.accountPatch } : item,
      );
    }
    if (stepped.disposition === "cease" && account) {
      state.dncEntries = [
        ...(state.dncEntries ?? []),
        { id: nextId("dnc"), workspaceId, accountId: account.id, phoneLast4: account.phoneLast4, reason: "cease on call", at: new Date().toISOString() },
      ];
    }
  });
  return { ...updated, say: stepped.say, transcript: stepped.transcript, paymentUrl: stepped.paymentUrl };
}

export function sendChannel(input: {
  workspaceId: WorkspaceId;
  accountId: string;
  channel: CollectionChannel;
  body: string;
  templateId?: string;
}): ChannelMessage {
  const account = accounts(input.workspaceId).find((item) => item.id === input.accountId) ?? null;
  const template = (loadDb().collectionTemplates ?? []).find((item) => item.id === input.templateId);
  if (template && !template.counselReviewed) {
    const blocked = storeMessage(input, "blocked", "Template has not been marked counsel-reviewed.", null);
    logEvent(input.workspaceId, input.channel, input.accountId, false, blocked.reason ?? "template");
    return blocked;
  }
  const decision = gateFor(input.workspaceId, account, input.channel, input.channel === "voicemail_drop" ? input.body : undefined);
  logEvent(input.workspaceId, input.channel, input.accountId, decision.allowed, decision.reason);
  if (!decision.allowed) return storeMessage(input, "blocked", decision.reason, null);
  if (process.env.MERIDIAN_CHANNEL_DELIVER === "live") {
    throw new Error("Live email, SMS, voice, and mail delivery is disabled. Use sandbox mode.");
  }
  return storeMessage(input, "sandbox_queued", decision.reason, `sandbox_${nextId("msg")}`);
}

function storeMessage(
  input: { workspaceId: WorkspaceId; accountId: string; channel: CollectionChannel; templateId?: string },
  status: ChannelMessage["status"],
  reason: string,
  providerId: string | null,
): ChannelMessage {
  const message: ChannelMessage = {
    id: nextId("ch"),
    workspaceId: input.workspaceId,
    accountId: input.accountId,
    channel: input.channel,
    status,
    reason,
    templateId: input.templateId ?? null,
    provider: "sandbox",
    providerId,
    at: new Date().toISOString(),
  };
  mutate((db) => {
    db.channelMessages = [message, ...(db.channelMessages ?? [])].slice(0, 400);
  });
  return message;
}

export function syncCollectionTemplates(): CollectionTemplate[] {
  if (!existsSync(TEMPLATE_DIR)) return loadDb().collectionTemplates ?? [];
  const files = readdirSync(TEMPLATE_DIR).filter((name) => name.endsWith(".md") && name.toLowerCase() !== "readme.md");
  const loaded: CollectionTemplate[] = files.map((name) => {
    const raw = readFileSync(path.join(TEMPLATE_DIR, name), "utf8");
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const meta = Object.fromEntries(
      (match?.[1] ?? "")
        .split("\n")
        .map((line) => line.split(":").map((part) => part.trim()))
        .filter((pair) => pair[0] && pair[1])
        .map(([key, value]) => [key, value]),
    );
    const channel = (meta.channel ?? "letter") as CollectionTemplate["channel"];
    return {
      id: meta.id || name.replace(/\.md$/, ""),
      channel,
      name: meta.name || name,
      body: (match?.[2] ?? raw).trim(),
      sourceFile: name,
      counselReviewed: meta.counselReviewed === "true",
      limitedContent: meta.limitedContent === "true",
      loadedAt: new Date().toISOString(),
    };
  });
  return mutate((db) => {
    const manual = (db.collectionTemplates ?? []).filter((item) => !item.sourceFile);
    db.collectionTemplates = [...loaded, ...manual];
    return db.collectionTemplates;
  });
}
