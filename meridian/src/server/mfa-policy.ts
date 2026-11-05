import type { CollectionsRole } from "@/lib/collections/types";
import { sqliteGet } from "./sqlite";

export function accountHasMfa(accountId: string): boolean {
  const row = sqliteGet("SELECT enabled FROM account_mfa WHERE account_id = ?", accountId);
  return Number(row?.enabled) === 1;
}

export function roleRequiresMfa(role: CollectionsRole): boolean {
  return role === "admin" || role === "compliance";
}

export function assertPrivilegedMfa(accountId: string, role: CollectionsRole): void {
  if (!roleRequiresMfa(role)) return;
  if (!accountHasMfa(accountId)) {
    throw new Error("MFA is required for admin and compliance. Enroll an authenticator before this action.");
  }
}
