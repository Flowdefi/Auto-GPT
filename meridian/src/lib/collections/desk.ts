import type { WorkspaceId } from "@/lib/types";

export type PresenceStatus = "available" | "on_call" | "wrap" | "away";

export interface AgentPresence {
  email: string;
  workspaceId: WorkspaceId;
  status: PresenceStatus;
  updatedAt: string;
}

export const WRAP_DISPOSITIONS = [
  "connected",
  "no_answer",
  "busy",
  "wrong_party",
  "promise",
  "callback",
  "dispute",
  "cease",
  "refused",
] as const;

export type WrapDisposition = (typeof WRAP_DISPOSITIONS)[number];

export interface DialCampaign {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  status: "draft" | "running" | "paused" | "done";
  maxConcurrent: number;
  queue: string[];
  createdAt: string;
}

export interface DialAttempt {
  id: string;
  workspaceId: WorkspaceId;
  campaignId: string;
  accountId: string;
  at: string;
  result: "queued" | "blocked" | "placed";
  reasonCode: string;
}

export interface MailJob {
  id: string;
  workspaceId: WorkspaceId;
  accountId: string;
  templateId: string;
  status: "queued" | "sandbox_filed" | "provider_accepted" | "returned" | "paused";
  provider: string;
  providerId: string | null;
  reason: string | null;
  pdfBase64: string;
  createdAt: string;
}

export interface TrainingPass {
  email: string;
  workspaceId: WorkspaceId;
  passedAt: string | null;
  score: number;
  attempts: number;
}

export interface ComplianceDigest {
  id: string;
  workspaceId: WorkspaceId;
  at: string;
  summary: string;
  delivery: "sandbox" | "live_sent" | "live_unconfigured";
  recipientRole: "compliance";
  recipientCount: number;
}

export function isWrapDisposition(value: string): value is WrapDisposition {
  return (WRAP_DISPOSITIONS as readonly string[]).includes(value);
}
