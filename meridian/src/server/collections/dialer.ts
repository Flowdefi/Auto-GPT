import type { WorkspaceId } from "@/lib/types";
import { isWrapDisposition, type AgentPresence, type DialAttempt, type DialCampaign, type PresenceStatus, type WrapDisposition } from "@/lib/collections/desk";
import { reasonCode } from "@/lib/collections/reason-code";
import { encryptSecret } from "@/server/auth-crypto";
import { redactIdentifiers } from "@/server/log";
import { loadDb, mutate, nextId } from "@/server/db";
import { masterSecret } from "@/server/secrets";
import { setPromise } from "./floor";
import { gateFor, startVoice } from "./service";
import { attachLiveDial, voiceLiveEnabled } from "./voice-live";

const PRESENCE: PresenceStatus[] = ["available", "on_call", "wrap", "away"];

export function previewOutbound(workspaceId: WorkspaceId, accountId: string) {
  const db = loadDb();
  const account = (db.portfolioAccounts ?? []).find((item) => item.id === accountId && item.workspaceId === workspaceId);
  if (!account) throw new Error("Account not found");
  const decision = gateFor(workspaceId, account, "voice_outbound");
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const attemptsIn7Days = (db.voiceCalls ?? []).filter((call) => {
    if (call.accountId !== accountId || call.direction !== "outbound" || call.blockedReason) return false;
    return Date.parse(call.createdAt) >= weekAgo;
  }).length;
  return {
    allowed: decision.allowed,
    reason: decision.reason,
    citation: decision.citation,
    reasonCode: reasonCode(decision.reason),
    state: account.state,
    phoneLast4: account.phoneLast4,
    attemptsIn7Days,
    mode: voiceLiveEnabled() ? "live" as const : "sandbox" as const,
    liveWillDial: voiceLiveEnabled() && Boolean(account.phoneCiphertext),
  };
}

export function setPresence(workspaceId: WorkspaceId, email: string, status: string): AgentPresence {
  const next = PRESENCE.includes(status as PresenceStatus) ? (status as PresenceStatus) : "available";
  const row: AgentPresence = { email: email.toLowerCase(), workspaceId, status: next, updatedAt: new Date().toISOString() };
  mutate((db) => {
    const rest = (db.agentPresence ?? []).filter((item) => !(item.email === row.email && item.workspaceId === workspaceId));
    db.agentPresence = [row, ...rest].slice(0, 200);
  });
  return row;
}

export function presenceBoard(workspaceId: WorkspaceId, now = Date.now()): AgentPresence[] {
  const fresh = now - 120_000;
  return (loadDb().agentPresence ?? [])
    .filter((row) => row.workspaceId === workspaceId)
    .map((row) => (Date.parse(row.updatedAt) >= fresh ? row : { ...row, status: "away" as const }));
}

export function wrapCall(input: {
  workspaceId: WorkspaceId;
  callId: string;
  disposition: string;
  notes: string;
  operator: string;
  callbackAt?: string;
  promiseCents?: number;
  promiseDue?: string;
}): { disposition: WrapDisposition } {
  if (!isWrapDisposition(input.disposition)) throw new Error("Disposition is not recognized");
  const disposition = input.disposition;
  const call = (loadDb().voiceCalls ?? []).find((item) => item.id === input.callId && item.workspaceId === input.workspaceId);
  if (!call) throw new Error("Call not found");
  const notes = redactIdentifiers(input.notes).replace(/\s+/g, " ").trim().slice(0, 500);
  const callbackAt = input.callbackAt && /^\d{4}-\d{2}-\d{2}$/.test(input.callbackAt) ? input.callbackAt : null;
  mutate((db) => {
    db.voiceCalls = (db.voiceCalls ?? []).map((item) =>
      item.id === call.id
        ? {
            ...item,
            phase: "ended" as const,
            disposition,
            operatorEmail: input.operator.toLowerCase(),
            callbackAt,
            notesCiphertext: notes ? encryptSecret(notes, masterSecret()) : null,
            updatedAt: new Date().toISOString(),
          }
        : item,
    );
    if (call.accountId && (disposition === "dispute" || disposition === "cease")) {
      const status = disposition === "dispute" ? "disputed" as const : "ceased" as const;
      db.portfolioAccounts = (db.portfolioAccounts ?? []).map((account) =>
        account.id === call.accountId ? { ...account, status } : account,
      );
      if (disposition === "cease") {
        const account = (db.portfolioAccounts ?? []).find((item) => item.id === call.accountId);
        db.dncEntries = [
          ...(db.dncEntries ?? []),
          {
            id: nextId("dnc"),
            workspaceId: input.workspaceId,
            accountId: call.accountId,
            phoneLast4: account?.phoneLast4 ?? "",
            reason: "cease on after-call wrap",
            at: new Date().toISOString(),
          },
        ];
      }
    }
    if (call.accountId && callbackAt) {
      db.collectorTasks = [
        {
          id: nextId("task"),
          workspaceId: input.workspaceId,
          accountId: call.accountId,
          title: "Scheduled callback",
          queue: "collector" as const,
          status: "open" as const,
          createdAt: new Date().toISOString(),
        },
        ...(db.collectorTasks ?? []),
      ].slice(0, 2000);
    }
  });
  if (call.accountId && disposition === "promise" && input.promiseCents && input.promiseDue) {
    setPromise(input.workspaceId, call.accountId, input.promiseCents, input.promiseDue);
  }
  setPresence(input.workspaceId, input.operator, "wrap");
  return { disposition };
}

function logAttempt(attempt: DialAttempt): void {
  mutate((db) => {
    db.dialAttempts = [attempt, ...(db.dialAttempts ?? [])].slice(0, 2000);
  });
}

export function createDialCampaign(workspaceId: WorkspaceId, name: string, maxConcurrent: number): DialCampaign {
  const limit = Math.max(1, Math.min(5, Math.floor(maxConcurrent) || 1));
  const accounts = (loadDb().portfolioAccounts ?? []).filter((account) => account.workspaceId === workspaceId && account.status === "workable").slice(0, 200);
  const queue: string[] = [];
  const campaignId = nextId("camp");
  const now = new Date().toISOString();
  for (const account of accounts) {
    const decision = gateFor(workspaceId, account, "voice_outbound");
    logAttempt({
      id: nextId("att"),
      workspaceId,
      campaignId,
      accountId: account.id,
      at: now,
      result: decision.allowed ? "queued" : "blocked",
      reasonCode: reasonCode(decision.reason),
    });
    if (decision.allowed) queue.push(account.id);
  }
  const campaign: DialCampaign = {
    id: campaignId,
    workspaceId,
    name: name.trim().slice(0, 80) || "Campaign",
    status: "draft",
    maxConcurrent: limit,
    queue: queue.slice(0, 500),
    createdAt: now,
  };
  mutate((db) => {
    db.dialCampaigns = [campaign, ...(db.dialCampaigns ?? [])].slice(0, 100);
  });
  return campaign;
}

export function listDialCampaigns(workspaceId: WorkspaceId): Array<DialCampaign & { attempts: number }> {
  const attempts = loadDb().dialAttempts ?? [];
  return (loadDb().dialCampaigns ?? [])
    .filter((campaign) => campaign.workspaceId === workspaceId)
    .map((campaign) => ({ ...campaign, attempts: attempts.filter((row) => row.campaignId === campaign.id).length }));
}

export function campaignAttempts(workspaceId: WorkspaceId, campaignId: string): DialAttempt[] {
  return (loadDb().dialAttempts ?? []).filter((row) => row.workspaceId === workspaceId && row.campaignId === campaignId).slice(0, 100);
}

export function setCampaignRunning(workspaceId: WorkspaceId, campaignId: string, running: boolean): DialCampaign {
  let updated: DialCampaign | null = null;
  mutate((db) => {
    db.dialCampaigns = (db.dialCampaigns ?? []).map((campaign) => {
      if (campaign.id !== campaignId || campaign.workspaceId !== workspaceId) return campaign;
      updated = { ...campaign, status: running ? "running" : "paused" };
      return updated;
    });
    if (running) {
      db.jobs = [
        ...(db.jobs ?? []),
        {
          id: nextId("job"),
          workspaceId,
          kind: "campaign_tick",
          runAt: new Date().toISOString(),
          status: "pending",
          payload: { campaignId },
          createdAt: new Date().toISOString(),
        },
      ];
    }
  });
  if (!updated) throw new Error("Campaign not found");
  return updated;
}

export async function tickCampaign(workspaceId: WorkspaceId, campaignId: string): Promise<number> {
  const campaign = (loadDb().dialCampaigns ?? []).find((item) => item.id === campaignId && item.workspaceId === workspaceId);
  if (!campaign || campaign.status !== "running") return 0;
  const active = (loadDb().voiceCalls ?? []).filter((call) => call.campaignId === campaignId && call.phase !== "ended" && !call.blockedReason).length;
  const slots = Math.max(0, campaign.maxConcurrent - active);
  const nextIds = campaign.queue.slice(0, slots);
  const rest = campaign.queue.slice(slots);
  let placed = 0;
  for (const accountId of nextIds) {
    const account = (loadDb().portfolioAccounts ?? []).find((item) => item.id === accountId);
    const decision = account ? gateFor(workspaceId, account, "voice_outbound") : { allowed: false, reason: "No account is attached to this action." };
    if (!decision.allowed) {
      logAttempt({
        id: nextId("att"),
        workspaceId,
        campaignId,
        accountId,
        at: new Date().toISOString(),
        result: "blocked",
        reasonCode: reasonCode(decision.reason),
      });
      continue;
    }
    const started = startVoice({ workspaceId, direction: "outbound", accountId, campaignId });
    if (!started.blockedReason) await attachLiveDial(started.id);
    logAttempt({
      id: nextId("att"),
      workspaceId,
      campaignId,
      accountId,
      at: new Date().toISOString(),
      result: started.blockedReason ? "blocked" : "placed",
      reasonCode: started.blockedReason ? reasonCode(started.blockedReason) : "placed",
    });
    if (!started.blockedReason) placed += 1;
  }
  const remaining = rest;
  mutate((db) => {
    db.dialCampaigns = (db.dialCampaigns ?? []).map((item) => {
      if (item.id !== campaignId) return item;
      const stillActive = (db.voiceCalls ?? []).some((call) => call.campaignId === campaignId && call.phase !== "ended" && !call.blockedReason);
      const status = remaining.length === 0 && !stillActive ? "done" : item.status;
      return { ...item, queue: remaining, status };
    });
  });
  return placed;
}
