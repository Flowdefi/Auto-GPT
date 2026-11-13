import type { CollectionsRole } from "@/lib/collections/types";
import { sqliteGet } from "./sqlite";

export function accountHasMfa(accountId: string): boolean {
  const row = sqliteGet("SELECT enabled FROM account_mfa WHERE account_id = ?", accountId);
  return Number(row?.enabled) === 1;
}

export function roleRequiresMfa(role: CollectionsRole): boolean {
  return role === "admin" || role === "compliance";
}

/** Desk actions that change authority, identity, money, or the kill switch. */
export const PRIVILEGED_COLLECTION_OPS = [
  "reveal",
  "eligibility",
  "template_approval",
  "matrix",
  "role",
  "sol_save",
  "recording_save",
  "metro2_approve",
  "settlement_approve",
  "freeze_outbound",
  "freeze_drill",
  "settings",
  "purge_pii",
  "payment_reverse",
  "brand_save",
  "client_bind",
  "portfolio_close",
  "complaint_status",
] as const;

export function isPrivilegedCollectionOp(op: string): boolean {
  return (PRIVILEGED_COLLECTION_OPS as readonly string[]).includes(op);
}

export function assertPrivilegedMfa(accountId: string, role: CollectionsRole): void {
  if (!roleRequiresMfa(role)) return;
  if (!accountHasMfa(accountId)) {
    throw new Error("MFA is required for admin and compliance. Enroll an authenticator before this action.");
  }
}
