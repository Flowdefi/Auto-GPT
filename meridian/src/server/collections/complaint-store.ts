import type { WorkspaceId } from "@/lib/types";
import { parseComplaintInput, responseDue, type Complaint, type ComplaintStatus } from "@/lib/collections/complaints";
import { loadDb, mutate, nextId } from "@/server/db";
import { logEvent } from "@/server/log";

export function fileComplaint(workspaceId: WorkspaceId, input: Parameters<typeof parseComplaintInput>[0]): Complaint {
  const parsed = parseComplaintInput(input);
  const receivedAt = new Date().toISOString();
  const complaint: Complaint = {
    id: nextId("cmp"),
    workspaceId,
    ...parsed,
    status: "open",
    receivedAt,
    responseDueAt: responseDue(receivedAt),
    closedAt: null,
  };
  mutate((db) => {
    db.complaints = [complaint, ...(db.complaints ?? [])].slice(0, 500);
  });
  logEvent("complaint_opened", { workspaceId, channel: complaint.channel, rootCause: complaint.rootCause, cfpb: Boolean(complaint.cfpbId) });
  return complaint;
}

export function setComplaintStatus(workspaceId: WorkspaceId, id: string, status: ComplaintStatus): Complaint {
  const current = (loadDb().complaints ?? []).find((item) => item.id === id && item.workspaceId === workspaceId);
  if (!current) throw new Error("Complaint not found");
  const next = { ...current, status, closedAt: status === "closed" ? new Date().toISOString() : current.closedAt };
  mutate((db) => {
    db.complaints = (db.complaints ?? []).map((item) => (item.id === id ? next : item));
  });
  return next;
}

export function complaintReport(workspaceId: WorkspaceId) {
  const rows = (loadDb().complaints ?? []).filter((item) => item.workspaceId === workspaceId);
  const now = Date.now();
  const byCause: Record<string, number> = {};
  for (const row of rows) byCause[row.rootCause] = (byCause[row.rootCause] ?? 0) + 1;
  return {
    total: rows.length,
    open: rows.filter((row) => row.status === "open").length,
    overdue: rows.filter((row) => row.status === "open" && Date.parse(row.responseDueAt) < now).length,
    cfpb: rows.filter((row) => row.channel === "cfpb" || row.cfpbId).length,
    byCause,
    needsCounselReview: true,
    citation: "CFPB company portal response window is an operational 15 calendar days. Confirm the current instruction with counsel. 12 CFR § 1006 is not a complaint-deadline rule.",
    rows: rows.slice(0, 100),
  };
}
