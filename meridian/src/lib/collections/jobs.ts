import type { WorkspaceId } from "@/lib/types";
import type { PortfolioAccount } from "./types";

export type JobKind = "sequence_step" | "scheduled_send" | "retention_purge";

export interface CollectionJob {
  id: string;
  workspaceId: WorkspaceId;
  kind: JobKind;
  runAt: string;
  status: "pending" | "done" | "blocked" | "failed";
  payload: Record<string, string>;
  result?: string;
  createdAt: string;
}

export interface SequenceStep {
  id: string;
  channel: "email" | "sms" | "letter" | "voice_outbound";
  templateId: string;
  /** Days after the previous step. The first step uses days after enrollment. */
  delayDays: number;
  /** Used only for a live provider send. Sandbox runs do not need it. */
  destination?: string;
}

export interface CollectionSequence {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  steps: SequenceStep[];
  enabled: boolean;
}

/** 12 CFR § 1006.100 requires keeping records for three years. Counsel should confirm this clock. */
export const DEFAULT_RETENTION_DAYS = 1095;

export function retentionDays(raw = process.env.MERIDIAN_PII_RETENTION_DAYS): number {
  const parsed = Number(raw ?? DEFAULT_RETENTION_DAYS);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_RETENTION_DAYS;
  return Math.floor(parsed);
}

export function retentionDue(importedAt: string, now: Date, days: number): boolean {
  const start = Date.parse(importedAt);
  if (Number.isNaN(start)) return false;
  return now.getTime() - start >= days * 24 * 60 * 60 * 1000;
}

export function accountsReadyToPurge(accounts: PortfolioAccount[], now: Date, days: number): PortfolioAccount[] {
  return accounts.filter((account) => {
    const hasSecret = Boolean(account.ssnCiphertext || account.dobCiphertext || account.accountNumberCiphertext);
    if (!hasSecret) return false;
    return retentionDue(account.returnedAt || account.importedAt, now, days);
  });
}

/** Floor of 15 seconds so a worker cannot spin. Default is one minute. */
export function jobIntervalSeconds(raw = process.env.MERIDIAN_JOB_INTERVAL_SECONDS): number {
  const parsed = Number(raw ?? 60);
  if (!Number.isFinite(parsed) || parsed < 15) return 60;
  return Math.floor(parsed);
}

export function scheduleSteps(steps: SequenceStep[], start: Date): Array<{ step: SequenceStep; runAt: string }> {
  let cursor = start.getTime();
  return steps.map((step) => {
    const delay = Number.isFinite(step.delayDays) && step.delayDays > 0 ? step.delayDays : 0;
    cursor += delay * 24 * 60 * 60 * 1000;
    return { step, runAt: new Date(cursor).toISOString() };
  });
}
