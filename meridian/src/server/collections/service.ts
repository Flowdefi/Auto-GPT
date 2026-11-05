import { composeConsumerDraft } from "@/lib/collections/drafting";
import { buildMetro2 } from "@/lib/collections/metro2";
import { defaultRecordingTable, requiresAllPartyRecording, type RecordingRule } from "@/lib/collections/recording";
import { emptyTranscript, rulesSummary, stepCall, type ConsumerTurn } from "@/lib/collections/voice";
import { evaluateGate, type GateContext } from "@/lib/collections/gate";
import { filterVoiceUtterance, loadVoiceGuardrails } from "@/lib/collections/guardrails";
import { disputeDeadline, validationNotice } from "@/lib/collections/notice";
import {
  clearMatrixDefaults,
  validateSettlementMatrix,
  loadSettlementMatrix,
  loadTemplateFiles,
  mergeContext,
  sendRuleBlocks,
  templateSendChannel,
  type SettlementMatrix,
} from "@/lib/collections/template-library";
import { missingInterpolations, renderMustache } from "@/lib/collections/mustache";
import { parsePortfolioCsv, publicAccount, type ColumnMapping, type WidthField } from "@/lib/collections/portfolio";
import type {
  AccountStatus,
  CallTranscript,
  ChannelMessage,
  CollectionChannel,
  CollectionTemplate,
  CollectionsRole,
  OperatorRole,
  ConsumerConsent,
  ConsumerPayment,
  DraftReply,
  PortfolioAccount,
  StateEligibility,
  VoiceCall,
  VoiceSettings,
} from "@/lib/collections/types";
import type { WorkspaceId } from "@/lib/types";
import { modelFormPdf } from "@/lib/collections/model-form-pdf";
import { defaultSolTable, type SolRule } from "@/lib/collections/sol";
import { validationEndDate } from "@/lib/collections/validation-period";
import { decryptSecret, encryptSecret, sha256Hex } from "@/server/auth-crypto";
import { brandFor } from "@/server/brand";
import { loadDb, mutate, nextId } from "@/server/db";
import { logEvent as logLine } from "@/server/log";
import { scanUpload, scanXlsx } from "@/server/security";
import { masterSecret } from "@/server/secrets";
import { completeFast } from "@/server/ai/complete";
import { publicBaseUrl } from "@/server/mailer";
import { sqliteAll, sqliteGet } from "@/server/sqlite";
import { createStripeCheckout, deliverAllowedChannel, type FetchLike } from "@/server/collections/providers";
import { checkReassignedNumber, checkScraStatus } from "@/server/collections/scrub";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function accounts(workspaceId: WorkspaceId): PortfolioAccount[] {
  return (loadDb().portfolioAccounts ?? []).filter((account) => account.workspaceId === workspaceId);
}

export function collectionSnapshot(workspaceId: WorkspaceId) {
  const db = loadDb();
  const rows = accounts(workspaceId);
  return {
    settings: voiceSettingsFor(workspaceId),
    eligibility: (db.stateEligibility ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    accounts: rows.slice(0, 200).map(publicAccount),
    accountCount: rows.length,
    quarantineCount: rows.filter((account) => account.status === "quarantined" || account.status === "returned").length,
    tasks: (db.collectorTasks ?? []).filter((task) => task.workspaceId === workspaceId && task.status === "open"),
    drafts: (db.draftReplies ?? []).filter((draft) => draft.workspaceId === workspaceId),
    payments: (db.consumerPayments ?? []).filter((payment) => payment.workspaceId === workspaceId),
    calls: (db.voiceCalls ?? []).filter((call) => call.workspaceId === workspaceId).slice(0, 30),
    messages: (db.channelMessages ?? []).filter((message) => message.workspaceId === workspaceId).slice(0, 30),
    templates: syncCollectionTemplates(),
    settlementMatrix: ensureSettlementMatrix(workspaceId),
    events: (db.complianceEvents ?? []).filter((event) => event.workspaceId === workspaceId).slice(0, 40),
    sequences: (db.sequences ?? []).filter((item) => item.workspaceId === workspaceId),
    jobs: (db.jobs ?? []).filter((job) => job.workspaceId === workspaceId).slice(0, 40),
    solRules: ensureSolTable(workspaceId),
    recordingRules: ensureRecordingTable(workspaceId),
    metro2: metro2Status(),
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

export function voiceSettingsFor(workspaceId: WorkspaceId): VoiceSettings {
  const db = loadDb();
  const base = db.voiceSettings!;
  const frozen = (db.frozenWorkspaces ?? []).includes(workspaceId);
  return { ...base, killSwitch: Boolean(base.killSwitch) || frozen };
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

export function importPortfolio(input: {
  workspaceId: WorkspaceId;
  csv?: string;
  xlsxBase64?: string;
  fixedWidth?: string;
  widths?: WidthField[];
  mapping?: ColumnMapping;
  portfolioId?: string;
  /** When set, every row must belong to this seller. */
  sellerLock?: string;
}) {
  if (input.csv) scanUpload(input.csv);
  if (input.xlsxBase64) scanXlsx(Uint8Array.from(Buffer.from(input.xlsxBase64, "base64")));
  const db = loadDb();
  const portfolioId = input.portfolioId || nextId("pf");
  const existing = new Set(accounts(input.workspaceId).map((account) => account.accountRef.toLowerCase()));
  const result = parsePortfolioCsv({
    csv: input.csv,
    xlsxBase64: input.xlsxBase64,
    fixedWidth: input.fixedWidth,
    widths: input.widths,
    mapping: input.mapping,
    workspaceId: input.workspaceId,
    portfolioId,
    eligibility: db.stateEligibility ?? [],
    solRules: ensureSolTable(input.workspaceId),
    existingRefs: existing,
    now: new Date().toISOString(),
    id: () => nextId("acct"),
  });
  if (input.sellerLock) {
    const lock = input.sellerLock.trim();
    for (const account of result.accounts) {
      if (account.sellerName && account.sellerName !== "Unknown seller" && account.sellerName !== lock) {
        throw new Error("A client can place only its own accounts.");
      }
      account.sellerName = lock;
    }
  }
  const stored = result.accounts.map(sealAccount);
  const tasks = stored
    .filter((account) => account.status === "workable")
    .map((account) => ({
      id: nextId("task"),
      workspaceId: input.workspaceId,
      accountId: account.id,
      title: "Send Reg F validation notice",
      queue: "collector" as const,
      status: "open" as const,
      createdAt: account.importedAt,
    }));
  mutate((state) => {
    state.portfolioAccounts = [...(state.portfolioAccounts ?? []), ...stored];
    if (tasks.length > 0) state.collectorTasks = [...tasks, ...(state.collectorTasks ?? [])];
    state.importAudits = [
      {
        id: nextId("aud"),
        workspaceId: input.workspaceId,
        portfolioId,
        at: new Date().toISOString(),
        created: result.created,
        quarantined: result.quarantined,
        skipped: result.skipped.length,
      },
      ...(state.importAudits ?? []),
    ].slice(0, 200);
  });
  logLine("portfolio_import", { workspaceId: input.workspaceId, portfolioId, created: result.created, quarantined: result.quarantined });
  return { ...result, portfolioId, accounts: stored.slice(0, 100).map(publicAccount), accountCount: stored.length };
}

function sealAccount(account: PortfolioAccount): PortfolioAccount {
  const secret = masterSecret();
  const next = { ...account };
  if (next.sensitive?.ssn) next.ssnCiphertext = encryptSecret(next.sensitive.ssn, secret);
  if (next.sensitive?.dob) next.dobCiphertext = encryptSecret(next.sensitive.dob, secret);
  if (next.sensitive?.accountNumber) next.accountNumberCiphertext = encryptSecret(next.sensitive.accountNumber, secret);
  delete next.sensitive;
  return next;
}

export function setOperatorRole(email: string, role: CollectionsRole, workspaceId?: WorkspaceId | null): CollectionsRole {
  const normalized = email.toLowerCase();
  mutate((db) => {
    const rest = (db.operatorRoles ?? []).filter((row) => row.email !== normalized);
    const next: OperatorRole = { email: normalized, role };
    if (workspaceId) next.workspaceId = workspaceId;
    db.operatorRoles = [...rest, next];
  });
  return role;
}

export function collectionsRole(email: string, accountRole: "owner" | "member"): CollectionsRole {
  const override = (loadDb().operatorRoles ?? []).find((row) => row.email === email.toLowerCase());
  if (override) return override.role;
  return accountRole === "owner" ? "admin" : "collector";
}

export function revealAccount(workspaceId: WorkspaceId, accountId: string, role: CollectionsRole, actor: string) {
  if (role !== "admin" && role !== "compliance") {
    throw new Error("Only admin or compliance can reveal stored identifiers");
  }
  const account = accounts(workspaceId).find((item) => item.id === accountId);
  if (!account) throw new Error("Account not found");
  const secret = masterSecret();
  logEvent(workspaceId, "portal_chat", accountId, true, `Identifier reveal by ${actor}`);
  return {
    ssn: account.ssnCiphertext ? decryptSecret(account.ssnCiphertext, secret) : "",
    dob: account.dobCiphertext ? decryptSecret(account.dobCiphertext, secret) : "",
    accountNumber: account.accountNumberCiphertext ? decryptSecret(account.accountNumberCiphertext, secret) : "",
  };
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

export function gateFor(
  workspaceId: WorkspaceId,
  account: PortfolioAccount | null,
  channel: CollectionChannel,
  voicemailBody?: string,
  statusResponse?: AccountStatus | null,
) {
  const db = loadDb();
  const now = new Date();
  const recent = (db.voiceCalls ?? []).filter((call) => call.workspaceId === workspaceId && call.accountId === account?.id);
  const outboundCallsIn7Days = recent.filter((call) => {
    if (call.direction !== "outbound" || call.blockedReason) return false;
    return now.getTime() - new Date(call.createdAt).getTime() < WEEK_MS;
  }).length;
  const conversations = recent.filter((call) => call.disposition && call.disposition !== "blocked" && !call.blockedReason);
  const lastConversationAt = conversations[0]?.updatedAt ?? null;
  const sentToday = (db.channelMessages ?? []).filter((message) => message.workspaceId === workspaceId && message.status !== "blocked" && message.at.slice(0, 10) === now.toISOString().slice(0, 10)).length
    + recent.filter((call) => call.direction === "outbound" && !call.blockedReason && call.createdAt.slice(0, 10) === now.toISOString().slice(0, 10)).length;
  const settings = {
    ...db.voiceSettings!,
    killSwitch: Boolean(db.voiceSettings?.killSwitch) || (db.frozenWorkspaces ?? []).includes(workspaceId),
  };
  const ctx: GateContext = {
    now,
    settings,
    eligibility: db.stateEligibility ?? [],
    account,
    consents: (db.consents ?? []).filter((row) => row.workspaceId === workspaceId),
    dnc: (db.dncEntries ?? []).filter((row) => row.workspaceId === workspaceId),
    outboundCallsIn7Days,
    lastConversationAt,
    reassigned: settings.rndSandboxClear ? "ok" : account?.rndStatus ?? "unknown",
    scra: account?.scraStatus ?? "unknown",
    channel,
    voicemailBody,
    campaignSentToday: sentToday,
    statusResponse,
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
  const agency = brandFor(input.workspaceId).name;
  const allParty = account ? requiresAllPartyRecording(account.state, ensureRecordingTable(input.workspaceId)) : true;
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
  let stepped = stepCall({
    transcript,
    turn,
    account,
    settings: db.voiceSettings!,
    at: new Date().toISOString(),
    paymentUrl,
    agency: brandFor(workspaceId).name,
  });
  const guardrail = filterVoiceUtterance(stepped.say, loadVoiceGuardrails());
  if (guardrail.blocked) {
    stepped = {
      ...stepped,
      say: guardrail.text,
      qaFlags: [...stepped.qaFlags, { code: "guardrail", detail: guardrail.reason ?? "Voice guardrail" }],
      transcript: {
        ...stepped.transcript,
        turns: stepped.transcript.turns.map((turn, index, turns) =>
          index === turns.length - 1 && turn.role === "agent" ? { ...turn, text: guardrail.text } : turn,
        ),
      },
    };
  }
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
    if (account && (stepped.transferred || stepped.disposition === "hardship")) {
      const title = stepped.transferred ? "Warm transfer from sandbox voice call" : "Review hardship noted on a call";
      const already = (state.collectorTasks ?? []).some((task) => task.accountId === account.id && task.title === title && task.status === "open");
      if (!already) {
        state.collectorTasks = [
          { id: nextId("task"), workspaceId, accountId: account.id, title, queue: "collector", status: "open", createdAt: new Date().toISOString() },
          ...(state.collectorTasks ?? []),
        ];
      }
    }
  });
  return { ...updated, say: stepped.say, transcript: stepped.transcript, paymentUrl: stepped.paymentUrl };
}

function statusResponseFor(templateId: string | undefined): AccountStatus | null {
  switch (templateId) {
    case "LTR-040":
    case "LTR-041":
    case "LTR-042":
    case "LTR-043":
      return "disputed";
    case "LTR-050":
      return "ceased";
    case "LTR-070":
      return "bankruptcy";
    case "LTR-071":
      return "deceased";
    case "LTR-072":
      return "military";
    case "LTR-074":
      return "attorney";
    default:
      return null;
  }
}

export async function sendChannel(input: {
  workspaceId: WorkspaceId;
  accountId: string;
  channel: CollectionChannel;
  body: string;
  templateId?: string;
  destination?: string;
  fetchImpl?: FetchLike;
}): Promise<ChannelMessage> {
  const account = accounts(input.workspaceId).find((item) => item.id === input.accountId) ?? null;
  if (account?.addressStatus === "returned" && input.channel === "letter") {
    const blocked = storeMessage(input, "blocked", "Returned mail is on file. Letter sequences stay paused until the address is reviewed.", null);
    logEvent(input.workspaceId, input.channel, input.accountId, false, blocked.reason ?? "returned mail");
    return blocked;
  }
  const template = (loadDb().collectionTemplates ?? []).find((item) => item.id === input.templateId);
  if (template && !template.ownerApproved) {
    const blocked = storeMessage(input, "blocked", "Template stays disabled until an owner approves it for sending.", null);
    logEvent(input.workspaceId, input.channel, input.accountId, false, blocked.reason ?? "template");
    return blocked;
  }
  if (template?.id === "CALL-009") {
    const blocked = storeMessage(input, "blocked", "Voice guardrails are a filter, not a message that can be sent.", null);
    logEvent(input.workspaceId, input.channel, input.accountId, false, blocked.reason ?? "template");
    return blocked;
  }
  let rendered = input.body;
  if (template && account) {
    const matrix = ensureSettlementMatrix(account.workspaceId);
    const context = mergeContext({ account, agencyName: brandFor(account.workspaceId).name, domain: brandFor(account.workspaceId).domain, matrix });
    const missing = missingInterpolations(`${template.subject}\n${template.body}`, context.values);
    if (missing.length > 0) {
      const blocked = storeMessage(input, "blocked", `Required merge fields are empty: ${missing.join(", ")}.`, null);
      logEvent(input.workspaceId, input.channel, input.accountId, false, blocked.reason ?? "merge");
      return blocked;
    }
    const rules = sendRuleBlocks({
      templateId: template.id,
      rules: template.sendRules,
      account,
      channel: templateSendChannel(template.channel),
      now: new Date(),
      values: { ...context.values, subject_preview: renderMustache(template.subject, context.values) },
      offer: context.offer,
      priorLetterAt: (loadDb().channelMessages ?? []).find((row) => row.accountId === account.id && row.channel === "letter" && row.status !== "blocked")?.at ?? null,
      smsConsent: (loadDb().consents ?? []).some((row) => row.accountId === account.id && row.channel === "sms"),
      emailConsent: (loadDb().consents ?? []).some((row) => row.accountId === account.id && row.channel === "email"),
      reassigned: loadDb().voiceSettings?.rndSandboxClear ? "ok" : "unknown",
    });
    if (rules.length > 0) {
      const blocked = storeMessage(input, "blocked", rules[0] ?? "Send rule blocked this template.", null);
      logEvent(input.workspaceId, input.channel, input.accountId, false, rules.join(" "));
      return blocked;
    }
    rendered = [renderMustache(template.subject, context.values), renderMustache(template.body, context.values)].filter(Boolean).join("\n\n");
  }
  const decision = gateFor(
    input.workspaceId,
    account,
    input.channel,
    input.channel === "voicemail_drop" ? rendered : undefined,
    statusResponseFor(template?.id),
  );
  logEvent(input.workspaceId, input.channel, input.accountId, decision.allowed, decision.reason);
  if (!decision.allowed) return storeMessage(input, "blocked", decision.reason, null);
  const delivered = await deliverAllowedChannel(
    {
      channel: input.channel,
      to: input.destination ?? "",
      subject: "Account notice",
      body: rendered,
      toName: account?.consumerName ?? "Consumer",
    },
    input.fetchImpl,
  );
  if (delivered) {
    return storeMessage({ ...input, body: rendered }, "provider_accepted", decision.reason, delivered.providerId, delivered.provider);
  }
  return storeMessage({ ...input, body: rendered }, "sandbox_queued", decision.reason, `sandbox_${nextId("msg")}`);
}

function storeMessage(
  input: { workspaceId: WorkspaceId; accountId: string; channel: CollectionChannel; templateId?: string; body?: string },
  status: ChannelMessage["status"],
  reason: string,
  providerId: string | null,
  provider = "sandbox",
): ChannelMessage {
  const message: ChannelMessage = {
    id: nextId("ch"),
    workspaceId: input.workspaceId,
    accountId: input.accountId,
    channel: input.channel,
    status,
    reason,
    templateId: input.templateId ?? null,
    provider,
    providerId,
    at: new Date().toISOString(),
    bodyPreview: input.body?.slice(0, 500) ?? null,
  };
  mutate((db) => {
    db.channelMessages = [message, ...(db.channelMessages ?? [])].slice(0, 400);
  });
  return message;
}

export function ensureSettlementMatrix(workspaceId: WorkspaceId = "triton"): SettlementMatrix {
  const db = loadDb();
  const scoped = db.settlementMatrices?.[workspaceId];
  if (scoped?.customized) return scoped;
  if (!scoped && workspaceId === "triton" && db.settlementMatrix?.customized) return db.settlementMatrix;
  return loadSettlementMatrix();
}

export function saveSettlementMatrix(matrix: SettlementMatrix, role: CollectionsRole, workspaceId: WorkspaceId): SettlementMatrix {
  if (role !== "admin" && role !== "compliance") throw new Error("Only admin or compliance can edit settlement authority");
  validateSettlementMatrix(matrix);
  const saved = clearMatrixDefaults(matrix);
  saved.needs_counsel_review = true;
  mutate((db) => {
    db.settlementMatrices = { ...(db.settlementMatrices ?? {}), [workspaceId]: saved };
    if (workspaceId === "triton") db.settlementMatrix = saved;
  });
  return saved;
}

export function setTemplateApproval(
  id: string,
  patch: { ownerApproved?: boolean; counselReviewed?: boolean },
  role: CollectionsRole,
): CollectionTemplate {
  if (role !== "admin" && role !== "compliance") throw new Error("Only admin or compliance can approve a template");
  let updated: CollectionTemplate | undefined;
  mutate((db) => {
    db.collectionTemplates = (db.collectionTemplates ?? []).map((item) => {
      if (item.id !== id) return item;
      updated = {
        ...item,
        ownerApproved: patch.ownerApproved ?? item.ownerApproved,
        counselReviewed: patch.counselReviewed ?? item.counselReviewed,
        needsCounselReview: patch.counselReviewed ? false : item.needsCounselReview,
      };
      return updated;
    });
  });
  if (!updated) throw new Error("Template not found");
  return updated;
}

export function renderTemplatePreview(workspaceId: WorkspaceId, templateId: string, accountId: string) {
  const template = (loadDb().collectionTemplates ?? []).find((item) => item.id === templateId);
  const account = accounts(workspaceId).find((item) => item.id === accountId);
  if (!template || !account) throw new Error("Template and account are required");
  const context = mergeContext({ account, agencyName: brandFor(account.workspaceId).name, domain: brandFor(account.workspaceId).domain, matrix: ensureSettlementMatrix(account.workspaceId) });
  return {
    subject: renderMustache(template.subject, context.values),
    body: renderMustache(template.body, context.values),
    missing: missingInterpolations(`${template.subject}\n${template.body}`, context.values),
    needsCounselReview: template.needsCounselReview,
    ownerApproved: template.ownerApproved,
    offer: context.offer,
  };
}

export function syncCollectionTemplates(): CollectionTemplate[] {
  const files = loadTemplateFiles();
  const loadedAt = new Date().toISOString();
  return mutate((db) => {
    const previous = new Map((db.collectionTemplates ?? []).map((item) => [item.id, item]));
    const loaded: CollectionTemplate[] = files.map((file) => {
      const prior = previous.get(file.id);
      return {
        ...file,
        counselReviewed: prior?.counselReviewed ?? false,
        ownerApproved: prior?.ownerApproved ?? false,
        needsCounselReview: prior?.counselReviewed ? false : file.needsCounselReview,
        loadedAt,
      };
    });
    const guardrail = previous.get("CALL-009");
    if (!loaded.some((item) => item.id === "CALL-009")) {
      loaded.push({
        id: "CALL-009",
        channel: "voice_ai",
        name: "Voice AI runtime guardrails",
        subject: "",
        body: "Runtime filter. Not a consumer script.",
        sourceFile: "call-scripts/voice-ai-guardrails.json",
        counselReviewed: guardrail?.counselReviewed ?? false,
        ownerApproved: false,
        needsCounselReview: true,
        limitedContent: false,
        purpose: "Output filter that runs apart from the voice model.",
        mergeFields: [],
        requiredDisclosures: [],
        sendRules: ["Not a consumer message"],
        legalCitations: [],
        loadedAt,
      });
    }
    const manual = (db.collectionTemplates ?? []).filter((item) => !item.sourceFile && !loaded.some((row) => row.id === item.id));
    db.collectionTemplates = [...loaded, ...manual];
    return db.collectionTemplates;
  });
}

export function issueValidation(workspaceId: WorkspaceId, accountId: string): PortfolioAccount {
  const account = accounts(workspaceId).find((item) => item.id === accountId);
  if (!account) throw new Error("Account not found");
  const decision = gateFor(workspaceId, account, "letter");
  logEvent(workspaceId, "letter", accountId, decision.allowed, decision.reason);
  if (!decision.allowed) throw new Error(decision.reason);
  const mailedAt = new Date().toISOString();
  const notice = validationNotice(account, brandFor(workspaceId).name);
  const updated: PortfolioAccount = {
    ...account,
    validationMailedAt: mailedAt,
    disputeDeadline: disputeDeadline(mailedAt),
    validationNotice: notice.body,
  };
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === accountId ? updated : item));
    db.collectorTasks = (db.collectorTasks ?? []).map((task) =>
      task.accountId === accountId && task.title.startsWith("Send Reg F") ? { ...task, status: "done" } : task,
    );
  });
  return publicAccount(updated);
}

export function fileDispute(workspaceId: WorkspaceId, accountId: string, text: string): PortfolioAccount {
  const account = accounts(workspaceId).find((item) => item.id === accountId);
  if (!account) throw new Error("Account not found");
  const updated: PortfolioAccount = {
    ...account,
    status: "disputed",
    quarantineReason: text.slice(0, 500),
  };
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === accountId ? updated : item));
    db.collectorTasks = [
      {
        id: nextId("task"),
        workspaceId,
        accountId,
        title: "Review consumer dispute",
        queue: "compliance",
        status: "open",
        createdAt: new Date().toISOString(),
      },
      ...(db.collectorTasks ?? []),
    ];
  });
  logEvent(workspaceId, "portal_chat", accountId, true, "Dispute recorded. Outreach is stopped.");
  return publicAccount(updated);
}

export async function proposeDraft(workspaceId: WorkspaceId, accountId: string, inbound: string): Promise<DraftReply> {
  const account = accounts(workspaceId).find((item) => item.id === accountId);
  if (!account) throw new Error("Account not found");
  const agency = brandFor(workspaceId).name;
  const firstName = account.consumerName.split(" ")[0] ?? "";
  let modelText: string | null = null;
  let model: string | null = null;
  try {
    const completed = await completeFast([
      {
        role: "system",
        content:
          "Classify one consumer collections message and draft a reply. Return JSON only: {\"classification\":\"dispute|cease|hardship|promise|bankruptcy|attorney|other\",\"draft\":\"...\"}. Do not threaten. Include that you are a debt collector. Do not include a Social Security number or a card number. The draft is not sent.",
      },
      { role: "user", content: inbound.slice(0, 2000) },
    ]);
    modelText = completed?.text ?? null;
    model = completed?.model ?? null;
  } catch {
    modelText = null;
  }
  const composed = composeConsumerDraft({ inbound, firstName, agency, modelText, model });
  const decision = gateFor(workspaceId, account, "email");
  const row: DraftReply = {
    id: nextId("draft"),
    workspaceId,
    accountId,
    inbound: inbound.slice(0, 2000),
    classification: composed.classification,
    draft: composed.draft,
    status: "pending_approval",
    gateAllowed: decision.allowed,
    gateReason: decision.reason,
    createdAt: new Date().toISOString(),
    draftSource: composed.source,
    guardNote: composed.guardNote,
    model: composed.model,
  };
  mutate((db) => {
    db.draftReplies = [row, ...(db.draftReplies ?? [])].slice(0, 200);
  });
  return row;
}

export async function approveDraft(workspaceId: WorkspaceId, draftId: string, approve: boolean): Promise<DraftReply> {
  const db = loadDb();
  const draft = (db.draftReplies ?? []).find((item) => item.id === draftId && item.workspaceId === workspaceId);
  if (!draft) throw new Error("Draft not found");
  if (!approve) {
    const rejected = { ...draft, status: "rejected" as const };
    mutate((state) => {
      state.draftReplies = (state.draftReplies ?? []).map((item) => (item.id === draftId ? rejected : item));
    });
    return rejected;
  }
  const account = accounts(workspaceId).find((item) => item.id === draft.accountId);
  const decision = gateFor(workspaceId, account ?? null, "email");
  if (!decision.allowed) throw new Error(decision.reason);
  await sendChannel({ workspaceId, accountId: draft.accountId, channel: "email", body: draft.draft });
  const approved = { ...draft, status: "approved" as const, gateAllowed: true, gateReason: decision.reason };
  mutate((state) => {
    state.draftReplies = (state.draftReplies ?? []).map((item) => (item.id === draftId ? approved : item));
  });
  return approved;
}

export function setupPaymentPlan(workspaceId: WorkspaceId, accountId: string, months: number, installmentCents: number): PortfolioAccount {
  const account = accounts(workspaceId).find((item) => item.id === accountId);
  if (!account) throw new Error("Account not found");
  const decision = gateFor(workspaceId, account, "payment_portal");
  logEvent(workspaceId, "payment_portal", accountId, decision.allowed, decision.reason);
  if (!decision.allowed) throw new Error(decision.reason);
  const maxMonths = loadDb().voiceSettings?.maxPlanMonths ?? 12;
  if (!Number.isInteger(months) || months < 1 || months > maxMonths) {
    throw new Error(`A plan must be 1 to ${maxMonths} months.`);
  }
  if (!Number.isInteger(installmentCents) || installmentCents < 100) {
    throw new Error("Each installment must be at least $1.00.");
  }
  if (installmentCents * months > account.balanceCents) {
    throw new Error("The plan total cannot exceed the current balance.");
  }
  const updated: PortfolioAccount = {
    ...account,
    paymentPlan: { months, installmentCents, createdAt: new Date().toISOString(), provider: "sandbox" },
  };
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === accountId ? updated : item));
  });
  return publicAccount(updated);
}

export function ensureValidationNotice(workspaceId: WorkspaceId, accountId: string): PortfolioAccount {
  const account = accounts(workspaceId).find((item) => item.id === accountId);
  if (!account) throw new Error("Account not found");
  if (account.validationNotice) return publicAccount(account);
  return issueValidation(workspaceId, accountId);
}

export function completeTask(workspaceId: WorkspaceId, taskId: string, actor = "collector"): void {
  mutate((db) => {
    db.collectorTasks = (db.collectorTasks ?? []).map((task) =>
      task.workspaceId === workspaceId && task.id === taskId ? { ...task, status: "done", completedBy: actor } : task,
    );
  });
}

function savedSol(workspaceId: WorkspaceId): SolRule[] {
  const db = loadDb();
  const scoped = db.solTables?.[workspaceId];
  if (scoped && scoped.length > 0) return scoped;
  if (workspaceId === "triton" && db.solRules?.length) return db.solRules;
  return [];
}

export function ensureSolTable(workspaceId: WorkspaceId = "triton"): SolRule[] {
  const saved = savedSol(workspaceId);
  const byCode = new Map(saved.map((rule) => [rule.code, rule]));
  const placeholder = (rule: SolRule | undefined) => !rule || (rule.years == null && rule.citation.startsWith("No reviewed limitations period"));
  const table = defaultSolTable().map((rule) => (placeholder(byCode.get(rule.code)) ? rule : byCode.get(rule.code)!));
  const changed = table.some((rule) => {
    const prior = byCode.get(rule.code);
    return !prior || prior.years !== rule.years || prior.citation !== rule.citation;
  });
  if (saved.length === 0 || changed) {
    mutate((db) => {
      db.solTables = { ...(db.solTables ?? {}), [workspaceId]: table };
      if (workspaceId === "triton") db.solRules = table;
    });
  }
  return table;
}

export function saveSolRules(rules: SolRule[], role: CollectionsRole, workspaceId: WorkspaceId = "triton"): SolRule[] {
  if (role !== "admin" && role !== "compliance") throw new Error("Only admin or compliance can edit limitations");
  const allowed = new Set(defaultSolTable().map((rule) => rule.code));
  const clean = rules
    .filter((rule) => allowed.has(rule.code))
    .map((rule) => ({
      code: rule.code,
      years: rule.years == null || Number.isNaN(Number(rule.years)) ? null : Math.max(0, Math.floor(Number(rule.years))),
      citation: String(rule.citation || "No reviewed limitations period for this state. Do not calculate a date.").slice(0, 500),
      needsCounselReview: true,
    }));
  const table = defaultSolTable().map((rule) => clean.find((item) => item.code === rule.code) ?? rule);
  mutate((db) => {
    db.solTables = { ...(db.solTables ?? {}), [workspaceId]: table };
    if (workspaceId === "triton") db.solRules = table;
  });
  return ensureSolTable(workspaceId);
}

function savedRecording(workspaceId: WorkspaceId): RecordingRule[] {
  const db = loadDb();
  const scoped = db.recordingTables?.[workspaceId];
  if (scoped && scoped.length > 0) return scoped;
  if (workspaceId === "triton" && db.recordingRules?.length) return db.recordingRules;
  return [];
}

export function ensureRecordingTable(workspaceId: WorkspaceId = "triton"): RecordingRule[] {
  const saved = savedRecording(workspaceId);
  const byCode = new Map(saved.map((rule) => [rule.code, rule]));
  const table = defaultRecordingTable().map((rule) => byCode.get(rule.code) ?? rule);
  if (saved.length === 0) {
    mutate((db) => {
      if ((db.recordingTables?.[workspaceId]?.length ?? 0) > 0) return;
      db.recordingTables = { ...(db.recordingTables ?? {}), [workspaceId]: table };
      if (workspaceId === "triton" && !db.recordingRules?.length) db.recordingRules = table;
    });
  }
  return table;
}

export function saveRecordingRules(rules: RecordingRule[], role: CollectionsRole, workspaceId: WorkspaceId = "triton"): RecordingRule[] {
  if (role !== "admin" && role !== "compliance") throw new Error("Only admin or compliance can edit recording consent");
  const allowed = new Set(defaultRecordingTable().map((rule) => rule.code));
  const parties = new Set(["all", "one", "uncertain"]);
  const clean = rules
    .filter((rule) => allowed.has(rule.code) && parties.has(rule.party))
    .map((rule) => ({
      code: rule.code,
      party: rule.party,
      citation: String(rule.citation || "Counsel must confirm this state's recording rule.").slice(0, 500),
      needsCounselReview: true as const,
    }));
  const table = defaultRecordingTable().map((rule) => clean.find((item) => item.code === rule.code) ?? rule);
  mutate((db) => {
    db.recordingTables = { ...(db.recordingTables ?? {}), [workspaceId]: table };
    if (workspaceId === "triton") db.recordingRules = table;
  });
  return ensureRecordingTable(workspaceId);
}

export async function scrubAccount(workspaceId: WorkspaceId, accountId: string): Promise<PortfolioAccount> {
  const account = accounts(workspaceId).find((item) => item.id === accountId);
  if (!account) throw new Error("Account not found");
  const consent = (loadDb().consents ?? []).find((row) => row.accountId === accountId && row.channel === "voice_cell");
  const rnd = await checkReassignedNumber({ phoneLast4: account.phoneLast4, consentDate: consent?.at ?? null });
  const scra = await checkScraStatus({
    lastName: account.consumerName.split(" ").slice(-1)[0] ?? account.consumerName,
    activeDutyDate: new Date().toISOString().slice(0, 10),
  });
  const updated: PortfolioAccount = { ...account, rndStatus: rnd.result, scraStatus: scra.result };
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === accountId ? updated : item));
  });
  logEvent(
    workspaceId,
    "voice_outbound",
    accountId,
    rnd.result !== "reassigned" && scra.result !== "active",
    `RND ${rnd.result}${rnd.sandbox ? " (sandbox)" : ""}. SCRA ${scra.result}${scra.sandbox ? " (sandbox)" : ""}. Unknown is not a clearance.`,
  );
  return publicAccount(updated);
}

function metro2Status() {
  const approval = loadDb().metro2Approval;
  return {
    enabled: process.env.MERIDIAN_METRO2_EXPORT === "enabled",
    ownerApproved: Boolean(approval?.ownerApprovedAt),
    complianceApproved: Boolean(approval?.complianceApprovedAt),
    needsCounselReview: true as const,
  };
}

export function approveMetro2(role: CollectionsRole, actor: string): ReturnType<typeof metro2Status> {
  if (role !== "admin" && role !== "compliance") throw new Error("Owner and compliance must approve Metro 2");
  const now = new Date().toISOString();
  mutate((db) => {
    const current = db.metro2Approval ?? { ownerApprovedAt: null, ownerApprovedBy: null, complianceApprovedAt: null, complianceApprovedBy: null };
    if (role === "admin") db.metro2Approval = { ...current, ownerApprovedAt: now, ownerApprovedBy: actor };
    else db.metro2Approval = { ...current, complianceApprovedAt: now, complianceApprovedBy: actor };
  });
  return metro2Status();
}

export function exportMetro2(workspaceId: WorkspaceId): ReturnType<typeof buildMetro2> {
  if (process.env.MERIDIAN_METRO2_EXPORT !== "enabled") {
    throw new Error("Metro 2 export is disabled. Set MERIDIAN_METRO2_EXPORT=enabled only after owner and compliance approval.");
  }
  const approval = loadDb().metro2Approval;
  if (!approval?.ownerApprovedAt || !approval.complianceApprovedAt) {
    throw new Error("Owner and compliance must both approve Metro 2 before an export.");
  }
  return buildMetro2(accounts(workspaceId));
}

export function accessReview(): {
  generatedAt: string;
  citation: string;
  needsCounselReview: true;
  operators: Array<{ email: string; role: CollectionsRole; mfaEnabled: boolean; canRevealPii: boolean; status: string; lastLoginAt: string | null }>;
} {
  const rows = sqliteAll("SELECT id, email, role, status, last_login_at FROM accounts ORDER BY email");
  return {
    generatedAt: new Date().toISOString(),
    citation: "16 CFR § 314.4(c)(1), (c)(5), and (d). Access controls, MFA, and a review of who can see customer information. This is a draft control, not a completed Safeguards program.",
    needsCounselReview: true,
    operators: rows.map((row) => {
      const email = String(row.email);
      const accountRole = row.role === "member" ? "member" : "owner";
      const role = collectionsRole(email, accountRole);
      const mfa = sqliteGet("SELECT enabled FROM account_mfa WHERE account_id = ?", String(row.id));
      return {
        email,
        role,
        mfaEnabled: Number(mfa?.enabled) === 1,
        canRevealPii: role === "admin" || role === "compliance",
        status: String(row.status ?? ""),
        lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
      };
    }),
  };
}

export function validationPdfBase64(workspaceId: WorkspaceId, accountId: string): string {
  const account = ensureValidationNotice(workspaceId, accountId);
  const end = account.validationMailedAt ? validationEndDate(account.validationMailedAt) : account.disputeDeadline || "";
  const pdf = modelFormPdf({
    agencyName: brandFor(workspaceId).name,
    agencyAddress: "PO Box 100, Example City, OH 44101",
    agencyPhone: "1-800-555-0199",
    noticeDate: (account.validationMailedAt || new Date().toISOString()).slice(0, 10),
    consumerName: account.consumerName,
    consumerAddress: `${account.state} ${account.zip}`,
    accountRef: account.accountRef,
    accountType: "credit card",
    creditorOnItemizationDate: account.originalCreditor || "not supplied",
    accountLast4: account.last4 || "0000",
    itemizationDate: account.itemizationDate || "not supplied",
    amountOnItemizationDate: ((account.itemizationAmountCents ?? 0) / 100).toFixed(2),
    interestSince: "0.00",
    feesSince: ((account.feesSinceItemizationCents ?? 0) / 100).toFixed(2),
    paymentsCreditsSince: (((account.paymentsSinceItemizationCents ?? 0) + (account.creditsSinceItemizationCents ?? 0)) / 100).toFixed(2),
    currentBalance: (account.balanceCents / 100).toFixed(2),
    currentCreditor: account.sellerName,
    validationEndDate: end,
  });
  return Buffer.from(pdf).toString("base64");
}

export async function sandboxPayment(workspaceId: WorkspaceId, accountId: string, amountCents: number): Promise<ConsumerPayment> {
  const account = accounts(workspaceId).find((item) => item.id === accountId);
  if (!account) throw new Error("Account not found");
  const decision = gateFor(workspaceId, account, "payment_portal");
  logEvent(workspaceId, "payment_portal", accountId, decision.allowed, decision.reason);
  if (!decision.allowed) throw new Error(decision.reason);
  if (amountCents < 1 || amountCents > account.balanceCents) throw new Error("Amount must be between one cent and the balance");
  const stripe = process.env.MERIDIAN_CHANNEL_DELIVER === "live" && process.env.MERIDIAN_PAYMENTS_PROVIDER === "stripe";
  const checkout = stripe ? await createStripeCheckout({ amountCents, reference: account.accountRef }) : null;
  const payment: ConsumerPayment = {
    id: nextId("pmt"),
    workspaceId,
    accountId,
    amountCents,
    status: checkout ? "pending" : "succeeded",
    provider: checkout?.provider ?? "sandbox",
    providerId: checkout?.providerId ?? `sandbox_${nextId("pi")}`,
    at: new Date().toISOString(),
    checkoutUrl: checkout?.url,
  };
  mutate((db) => {
    db.consumerPayments = [payment, ...(db.consumerPayments ?? [])];
    if (payment.status === "succeeded") {
      db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) =>
        item.id === accountId ? { ...item, balanceCents: item.balanceCents - amountCents } : item,
      );
    }
  });
  return payment;
}

export function collectionReport(workspaceId: WorkspaceId) {
  const db = loadDb();
  const rows = accounts(workspaceId);
  const payments = (db.consumerPayments ?? []).filter((payment) => payment.workspaceId === workspaceId);
  const byPortfolio = new Map<string, { face: number; collected: number; accounts: number; quarantined: number }>();
  for (const account of rows) {
    const bucket = byPortfolio.get(account.portfolioId) ?? { face: 0, collected: 0, accounts: 0, quarantined: 0 };
    bucket.face += (account.chargeOffBalanceCents || account.balanceCents) + payments.filter((payment) => payment.accountId === account.id).reduce((sum, payment) => sum + payment.amountCents, 0);
    bucket.accounts += 1;
    if (account.status === "quarantined" || account.status === "returned") bucket.quarantined += 1;
    byPortfolio.set(account.portfolioId, bucket);
  }
  for (const payment of payments) {
    const account = rows.find((item) => item.id === payment.accountId);
    if (!account) continue;
    const bucket = byPortfolio.get(account.portfolioId);
    if (bucket) bucket.collected += payment.amountCents;
  }
  const disputes = rows.filter((account) => account.status === "disputed");
  return {
    portfolios: [...byPortfolio.entries()].map(([portfolioId, bucket]) => ({
      portfolioId,
      accounts: bucket.accounts,
      quarantined: bucket.quarantined,
      faceCents: bucket.face,
      collectedCents: bucket.collected,
      recoveryRate: bucket.face ? bucket.collected / bucket.face : 0,
    })),
    payments,
    disputes: disputes.map((account) => ({
      accountRef: account.accountRef,
      state: account.state,
      deadline: account.disputeDeadline ?? null,
    })),
    exceptions: (db.complianceEvents ?? []).filter((event) => event.workspaceId === workspaceId && !event.allowed).slice(0, 100),
    attempts: (db.complianceEvents ?? []).filter((event) => event.workspaceId === workspaceId).slice(0, 200),
    remittance: [...byPortfolio.entries()].map(([portfolioId, bucket]) => {
      const feePercent = Number(process.env.MERIDIAN_AGENCY_FEE_PERCENT ?? "0");
      const feeCents = Math.round(bucket.collected * (Number.isFinite(feePercent) ? feePercent : 0) / 100);
      const seller = rows.find((account) => account.portfolioId === portfolioId)?.sellerName ?? "";
      return {
        portfolioId,
        clientName: seller,
        collectedCents: bucket.collected,
        feeCents,
        remittanceCents: bucket.collected - feeCents,
        paymentCount: payments.filter((payment) => rows.find((account) => account.id === payment.accountId)?.portfolioId === portfolioId).length,
      };
    }),
    collectors: collectorRows(db, workspaceId),
  };
}

function collectorRows(db: ReturnType<typeof loadDb>, workspaceId: WorkspaceId) {
  const names = new Set<string>();
  for (const task of db.collectorTasks ?? []) if (task.workspaceId === workspaceId && task.completedBy) names.add(task.completedBy);
  for (const call of db.voiceCalls ?? []) if (call.workspaceId === workspaceId) names.add("sandbox desk");
  if (names.size === 0) names.add("sandbox desk");
  return [...names].map((name) => ({
    name,
    tasksCompleted: (db.collectorTasks ?? []).filter((task) => task.workspaceId === workspaceId && task.status === "done" && (task.completedBy ?? "sandbox desk") === name).length,
    calls: name === "sandbox desk" ? (db.voiceCalls ?? []).filter((call) => call.workspaceId === workspaceId && !call.blockedReason).length : 0,
    paymentsPosted: name === "sandbox desk" ? (db.consumerPayments ?? []).filter((payment) => payment.workspaceId === workspaceId).length : 0,
  }));
}

export function openPortal(workspaceId: WorkspaceId, accountRef: string, last4: string, zip: string): { token: string; account: PortfolioAccount } {
  const account = accounts(workspaceId).find(
    (item) =>
      item.accountRef.toLowerCase() === accountRef.trim().toLowerCase() &&
      item.last4 === last4.replace(/\D/g, "").slice(-4) &&
      item.zip.slice(0, 5) === zip.replace(/\D/g, "").slice(0, 5),
  );
  if (!account) throw new Error("No account matched that reference, last four, and ZIP");
  const token = nextId("portal");
  mutate((db) => {
    db.portalSessions = [
      { tokenHash: sha256Hex(token), workspaceId, accountId: account.id, expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() },
      ...(db.portalSessions ?? []),
    ].slice(0, 200);
  });
  return { token, account: publicAccount(account) };
}

export function portalAccount(token: string): PortfolioAccount | null {
  const session = (loadDb().portalSessions ?? []).find((item) => item.tokenHash === sha256Hex(token) && item.expiresAt > new Date().toISOString());
  if (!session) return null;
  const account = (loadDb().portfolioAccounts ?? []).find((item) => item.id === session.accountId);
  return account ? publicAccount(account) : null;
}

export function purgeReturnedPii(workspaceId: WorkspaceId): number {
  let count = 0;
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((account) => {
      if (account.workspaceId !== workspaceId || account.status !== "returned") return account;
      if (!account.ssnCiphertext && !account.dobCiphertext && !account.accountNumberCiphertext) return account;
      count += 1;
      return { ...account, ssnCiphertext: null, dobCiphertext: null, accountNumberCiphertext: null, ssnMasked: "" };
    });
  });
  logEvent(workspaceId, "portal_chat", null, true, `Purged stored identifiers on ${count} returned accounts`);
  return count;
}

