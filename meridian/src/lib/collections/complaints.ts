import type { WorkspaceId } from "@/lib/types";

export type ComplaintChannel = "portal" | "phone" | "email" | "letter" | "cfpb" | "web" | "other";
export type ComplaintCause = "validation" | "communication" | "payment" | "credit_reporting" | "identity" | "other";
export type ComplaintStatus = "open" | "responded" | "closed";

export interface Complaint {
  id: string;
  workspaceId: WorkspaceId;
  channel: ComplaintChannel;
  /** Reference only. Not a full account number. */
  accountRef: string;
  summary: string;
  cfpbId: string | null;
  rootCause: ComplaintCause;
  status: ComplaintStatus;
  receivedAt: string;
  /** Operational date. Not a substitute for counsel confirming the current CFPB portal rule. */
  responseDueAt: string;
  closedAt: string | null;
}

const CHANNELS = new Set<ComplaintChannel>(["portal", "phone", "email", "letter", "cfpb", "web", "other"]);
const CAUSES = new Set<ComplaintCause>(["validation", "communication", "payment", "credit_reporting", "identity", "other"]);

/**
 * The CFPB company portal asks a company to respond within 15 calendar days
 * and allows more time when the company is still investigating. Confirm the
 * current portal instruction with counsel before treating this as a legal deadline.
 */
export function responseDue(receivedAt: string): string {
  const start = new Date(receivedAt);
  if (Number.isNaN(start.getTime())) return new Date().toISOString();
  start.setUTCDate(start.getUTCDate() + 15);
  return start.toISOString();
}

export function parseComplaintInput(input: {
  channel?: string;
  accountRef?: string;
  summary?: string;
  cfpbId?: string;
  rootCause?: string;
}): { channel: ComplaintChannel; accountRef: string; summary: string; cfpbId: string | null; rootCause: ComplaintCause } {
  const summary = (input.summary ?? "").trim();
  if (summary.length < 5 || summary.length > 2000) throw new Error("Describe the complaint in 5 to 2000 characters.");
  const channel = CHANNELS.has(input.channel as ComplaintChannel) ? (input.channel as ComplaintChannel) : "other";
  const rootCause = CAUSES.has(input.rootCause as ComplaintCause) ? (input.rootCause as ComplaintCause) : "other";
  const accountRef = (input.accountRef ?? "").trim().slice(0, 40);
  const cfpbId = (input.cfpbId ?? "").trim().slice(0, 40) || null;
  return { channel, accountRef, summary, cfpbId, rootCause };
}
