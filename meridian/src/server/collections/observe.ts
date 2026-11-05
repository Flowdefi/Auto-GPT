import type { WorkspaceId } from "@/lib/types";
import type { ComplianceDigest } from "@/lib/collections/desk";
import { reasonCode } from "@/lib/collections/reason-code";
import { loadDb, mutate, nextId } from "@/server/db";
import { voiceSettingsFor } from "@/server/collections/service";
import { emitCounter } from "@/server/otel";
import { liveFromAddress } from "@/server/collections/providers";

export function deskMetrics(workspaceId: WorkspaceId) {
  const db = loadDb();
  const blockedByReason: Record<string, number> = {};
  for (const event of db.complianceEvents ?? []) {
    if (event.workspaceId !== workspaceId || event.allowed) continue;
    const code = reasonCode(event.reason);
    blockedByReason[code] = (blockedByReason[code] ?? 0) + 1;
  }
  const placed = (db.voiceCalls ?? []).filter((call) => call.workspaceId === workspaceId && call.direction === "outbound" && !call.blockedReason);
  const connected = placed.filter((call) => call.disposition === "connected" || call.disposition === "promise");
  const recovery = new Map<string, { collectedCents: number; balanceCents: number }>();
  for (const account of db.portfolioAccounts ?? []) {
    if (account.workspaceId !== workspaceId) continue;
    const row = recovery.get(account.portfolioId) ?? { collectedCents: 0, balanceCents: 0 };
    row.balanceCents += account.balanceCents;
    recovery.set(account.portfolioId, row);
  }
  for (const payment of db.consumerPayments ?? []) {
    if (payment.workspaceId !== workspaceId || payment.status !== "succeeded") continue;
    const account = (db.portfolioAccounts ?? []).find((item) => item.id === payment.accountId && item.workspaceId === workspaceId);
    if (!account) continue;
    const row = recovery.get(account.portfolioId) ?? { collectedCents: 0, balanceCents: 0 };
    row.collectedCents += payment.amountCents;
    recovery.set(account.portfolioId, row);
  }
  const now = Date.now();
  const pending = (db.jobs ?? []).filter((job) => job.workspaceId === workspaceId && job.status === "pending" && Date.parse(job.runAt) <= now);
  const jobLagSeconds = pending.reduce((max, job) => Math.max(max, Math.floor((now - Date.parse(job.runAt)) / 1000)), 0);
  const finished = (db.jobs ?? []).filter((job) => job.workspaceId === workspaceId && job.status !== "pending");
  const failed = finished.filter((job) => job.status === "failed").length;
  const limits = voiceSettingsFor(workspaceId);
  return {
    blockedByReason,
    callConnectRate: placed.length ? Number((connected.length / placed.length).toFixed(2)) : null,
    recoveryByPortfolio: [...recovery.entries()].map(([portfolioId, row]) => ({ portfolioId, ...row })),
    jobLagSeconds,
    errorRate: finished.length ? Number((failed / finished.length).toFixed(2)) : 0,
    dailyOutboundCap: limits.dailyOutboundCap,
    blockInbound: limits.blockInbound,
    maxDiscountPercent: limits.maxDiscountPercent,
    maxPlanMonths: limits.maxPlanMonths,
  };
}

export async function emitDeskMetrics(workspaceId: WorkspaceId): Promise<void> {
  const metrics = deskMetrics(workspaceId);
  const blocked = Object.values(metrics.blockedByReason).reduce((sum, count) => sum + count, 0);
  await emitCounter("meridian.sends.blocked", blocked, { workspace: workspaceId });
  await emitCounter("meridian.jobs.lag_seconds", metrics.jobLagSeconds, { workspace: workspaceId });
  await emitCounter("meridian.jobs.error_rate_bps", Math.round(metrics.errorRate * 10000), { workspace: workspaceId });
}

export function digestSubject(workspaceId: WorkspaceId): string {
  return `Weekly compliance digest for ${workspaceId}`;
}

/** Compliance seats with no workspace are counted everywhere. A seat limited to one workspace is not counted on the other. */
export function digestRecipients(workspaceId: WorkspaceId): string[] {
  return (loadDb().operatorRoles ?? [])
    .filter((row) => row.role === "compliance" && (!row.workspaceId || row.workspaceId === workspaceId))
    .map((row) => row.email);
}

export async function writeComplianceDigest(
  workspaceId: WorkspaceId,
  now = new Date(),
  fetchImpl: (url: string, init?: RequestInit) => Promise<{ ok: boolean }> = fetch,
): Promise<ComplianceDigest> {
  const metrics = deskMetrics(workspaceId);
  const recipients = digestRecipients(workspaceId);
  const limits = `Daily cap ${metrics.dailyOutboundCap}. Inbound block ${metrics.blockInbound ? "on" : "off"}. Discount ${metrics.maxDiscountPercent} percent. Plan length ${metrics.maxPlanMonths} months.`;
  const blocked = Object.entries(metrics.blockedByReason).map(([code, count]) => `${code}=${count}`).join(", ") || "none";
  const connect = metrics.callConnectRate === null ? "no placed calls" : String(metrics.callConnectRate);
  const summary = `Weekly compliance digest for ${workspaceId}. Blocked sends by reason: ${blocked}. Call connect rate: ${connect}. Job lag seconds: ${metrics.jobLagSeconds}. Error rate: ${metrics.errorRate}. Portfolios in the recovery rollup: ${metrics.recoveryByPortfolio.length}. Compliance seats on file: ${recipients.length}. ${limits} No consumer name, phone, or account number is included.`;
  const liveRequested = process.env.MERIDIAN_COMPLIANCE_DIGEST === "enabled" && process.env.MERIDIAN_CHANNEL_DELIVER === "live";
  let from = "";
  if (liveRequested) {
    try {
      from = liveFromAddress(process.env.SENDGRID_FROM, "Digest from address");
    } catch {
      from = "";
    }
  }
  let delivery: ComplianceDigest["delivery"] = "sandbox";
  if (liveRequested && process.env.RESEND_API_KEY && recipients.length > 0 && from) {
    try {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: recipients,
          subject: digestSubject(workspaceId),
          text: summary,
        }),
      });
      delivery = response.ok ? "live_sent" : "live_unconfigured";
    } catch {
      delivery = "live_unconfigured";
    }
  } else if (liveRequested) {
    delivery = "live_unconfigured";
  }
  const digest: ComplianceDigest = {
    id: nextId("dig"),
    workspaceId,
    at: now.toISOString(),
    summary,
    delivery,
    recipientRole: "compliance",
    recipientCount: recipients.length,
  };
  mutate((db) => {
    db.complianceDigests = [digest, ...(db.complianceDigests ?? [])].slice(0, 52);
  });
  return digest;
}

export function listDigests(workspaceId: WorkspaceId): ComplianceDigest[] {
  return (loadDb().complianceDigests ?? []).filter((row) => row.workspaceId === workspaceId).slice(0, 8);
}

export function ensureDigestJobs(now = new Date()): void {
  mutate((db) => {
    db.jobs = db.jobs ?? [];
    for (const workspaceId of ["triton", "aether"] as const) {
      const pending = db.jobs.some((job) => job.workspaceId === workspaceId && job.kind === "compliance_digest" && job.status === "pending");
      if (pending) continue;
      db.jobs.push({
        id: nextId("job"),
        workspaceId,
        kind: "compliance_digest",
        runAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        payload: {},
        createdAt: now.toISOString(),
      });
    }
  });
}
