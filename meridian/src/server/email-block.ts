import type { WorkspaceId } from "@/lib/types";
import { doNotEmailAddresses } from "./crm-store";
import { loadDb } from "./db";

export type EmailBlockReason = "suppressed" | "do_not_email";

/** Addresses that must never receive bulk or test mail in this workspace. */
export function blockedEmailMap(workspaceId: WorkspaceId): Map<string, EmailBlockReason> {
  const blocked = new Map<string, EmailBlockReason>();
  for (const row of loadDb().suppressions) {
    if (row.workspaceId !== workspaceId) continue;
    const email = row.email.trim().toLowerCase();
    if (email) blocked.set(email, "suppressed");
  }
  for (const email of doNotEmailAddresses(workspaceId)) {
    if (!blocked.has(email)) blocked.set(email, "do_not_email");
  }
  return blocked;
}

export function emailBlockReason(workspaceId: WorkspaceId, email: string): EmailBlockReason | null {
  const target = email.trim().toLowerCase();
  if (!target || !target.includes("@")) return "suppressed";
  return blockedEmailMap(workspaceId).get(target) ?? null;
}
