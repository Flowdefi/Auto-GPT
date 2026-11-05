import type { ComplianceEvent } from "@/lib/collections/types";
import { accountsReadyToPurge, retentionDays, scheduleSteps, type CollectionJob, type CollectionSequence, type SequenceStep } from "@/lib/collections/jobs";
import type { WorkspaceId } from "@/lib/types";
import { loadDb, mutate, nextId } from "@/server/db";
import { tickCampaign } from "./dialer";
import { sweepBrokenPromises } from "./floor";
import { runMailQueue } from "./letters";
import { emitDeskMetrics, ensureDigestJobs, writeComplianceDigest } from "./observe";
import { sendChannel } from "./service";

function workspaces(): WorkspaceId[] {
  return ["triton", "aether"];
}

export function ensureRetentionJobs(now = new Date()): void {
  mutate((db) => {
    db.jobs = db.jobs ?? [];
    for (const workspaceId of workspaces()) {
      const pending = db.jobs.some((job) => job.workspaceId === workspaceId && job.kind === "retention_purge" && job.status === "pending");
      if (pending) continue;
      db.jobs.push({
        id: nextId("job"),
        workspaceId,
        kind: "retention_purge",
        runAt: now.toISOString(),
        status: "pending",
        payload: {},
        createdAt: now.toISOString(),
      });
    }
  });
}

export function purgeExpiredIdentifiers(workspaceId: WorkspaceId, now = new Date()): number {
  const days = retentionDays();
  let count = 0;
  mutate((db) => {
    const ready = new Set(accountsReadyToPurge(db.portfolioAccounts ?? [], now, days).filter((account) => account.workspaceId === workspaceId).map((account) => account.id));
    for (const account of db.portfolioAccounts ?? []) {
      if (!ready.has(account.id)) continue;
      account.ssnCiphertext = null;
      account.dobCiphertext = null;
      account.accountNumberCiphertext = null;
      count += 1;
    }
    const event: ComplianceEvent = {
      id: nextId("ce"),
      workspaceId,
      at: now.toISOString(),
      channel: "portal_chat",
      accountId: null,
      allowed: true,
      reason: `Retention clock purged stored identifiers for ${count} accounts. Values were not logged. Window is ${days} days and needs counsel review.`,
    };
    db.complianceEvents = [event, ...(db.complianceEvents ?? [])].slice(0, 500);
  });
  return count;
}

export function saveSequence(input: CollectionSequence): CollectionSequence {
  const sequence: CollectionSequence = {
    ...input,
    name: input.name.trim().slice(0, 80) || "Sequence",
    steps: input.steps.slice(0, 12).map((step) => ({
      id: step.id || nextId("step"),
      channel: step.channel,
      templateId: step.templateId,
      delayDays: Math.max(0, Math.min(365, Math.floor(step.delayDays) || 0)),
      ...(step.destination ? { destination: step.destination.slice(0, 160) } : {}),
    })),
  };
  mutate((db) => {
    const rest = (db.sequences ?? []).filter((item) => item.id !== sequence.id);
    db.sequences = [sequence, ...rest];
  });
  return sequence;
}

export function enrollSequence(workspaceId: WorkspaceId, sequenceId: string, accountId: string, start = new Date()): number {
  const sequence = (loadDb().sequences ?? []).find((item) => item.id === sequenceId && item.workspaceId === workspaceId);
  if (!sequence || !sequence.enabled) throw new Error("Sequence is not enabled");
  const planned = scheduleSteps(sequence.steps, start);
  mutate((db) => {
    db.jobs = db.jobs ?? [];
    for (const item of planned) {
      db.jobs.push({
        id: nextId("job"),
        workspaceId,
        kind: "sequence_step",
        runAt: item.runAt,
        status: "pending",
        payload: {
          accountId,
          channel: item.step.channel,
          templateId: item.step.templateId,
          stepId: item.step.id,
          ...(item.step.destination ? { destination: item.step.destination } : {}),
        },
        createdAt: start.toISOString(),
      });
    }
  });
  return planned.length;
}

function finish(job: CollectionJob, status: CollectionJob["status"], result: string): void {
  mutate((db) => {
    db.jobs = (db.jobs ?? []).map((item) => (item.id === job.id ? { ...item, status, result } : item));
  });
}

function scheduleNext(job: CollectionJob, kind: CollectionJob["kind"], runAt: string, payload: Record<string, string>): void {
  mutate((db) => {
    db.jobs = [
      ...(db.jobs ?? []),
      { id: nextId("job"), workspaceId: job.workspaceId, kind, runAt, status: "pending", payload, createdAt: new Date().toISOString() },
    ];
  });
}

export async function runDueJobs(now = new Date()): Promise<Array<{ id: string; status: string; result: string }>> {
  sweepBrokenPromises(now);
  ensureRetentionJobs(now);
  ensureDigestJobs(now);
  await runMailQueue();
  const due = (loadDb().jobs ?? []).filter((job) => job.status === "pending" && job.runAt <= now.toISOString());
  const results: Array<{ id: string; status: string; result: string }> = [];
  const seen = new Set<string>();
  for (const job of due) {
    if (seen.has(job.workspaceId)) continue;
    seen.add(job.workspaceId);
    await emitDeskMetrics(job.workspaceId);
  }
  for (const job of due) {
    try {
      let result = "done";
      switch (job.kind) {
        case "retention_purge": {
          const count = purgeExpiredIdentifiers(job.workspaceId, now);
          result = `purged ${count}`;
          scheduleNext(job, "retention_purge", new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), {});
          break;
        }
        case "campaign_tick": {
          const campaignId = job.payload.campaignId;
          if (!campaignId) throw new Error("Campaign tick is missing an id");
          const placed = await tickCampaign(job.workspaceId, campaignId);
          result = `placed ${placed}`;
          const campaign = (loadDb().dialCampaigns ?? []).find((item) => item.id === campaignId);
          if (campaign?.status === "running") {
            scheduleNext(job, "campaign_tick", new Date(now.getTime() + 60 * 1000).toISOString(), { campaignId });
          }
          break;
        }
        case "compliance_digest": {
          const digest = await writeComplianceDigest(job.workspaceId, now);
          result = digest.delivery;
          scheduleNext(job, "compliance_digest", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), {});
          break;
        }
        case "sequence_step":
        case "scheduled_send": {
          const channel = job.payload.channel;
          const accountId = job.payload.accountId;
          const templateId = job.payload.templateId;
          if (!accountId || (channel !== "email" && channel !== "sms" && channel !== "letter" && channel !== "voice_outbound")) {
            throw new Error("Job payload is incomplete");
          }
          const message = await sendChannel({
            workspaceId: job.workspaceId,
            accountId,
            channel,
            body: "",
            templateId,
            destination: job.payload.destination,
          });
          if (message.status === "blocked") {
            finish(job, "blocked", message.reason ?? "blocked");
            results.push({ id: job.id, status: "blocked", result: message.reason ?? "blocked" });
            continue;
          }
          result = message.providerId ?? "queued";
          break;
        }
        default: {
          const neverKind: never = job.kind;
          throw new Error(`Unknown job kind ${neverKind}`);
        }
      }
      finish(job, "done", result);
      results.push({ id: job.id, status: "done", result });
    } catch (error) {
      const result = error instanceof Error ? error.message : "failed";
      finish(job, "failed", result);
      results.push({ id: job.id, status: "failed", result });
    }
  }
  return results;
}

export function listSequences(workspaceId: WorkspaceId): CollectionSequence[] {
  return (loadDb().sequences ?? []).filter((item) => item.workspaceId === workspaceId);
}

export type { SequenceStep };
