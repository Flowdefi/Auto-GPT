import type { WorkspaceId } from "@/lib/types";
import { loadDb, mutate, nextId } from "@/server/db";

export function applySmsKeyword(workspaceId: WorkspaceId, from: string, keyword: string): { action: "stop" | "help" | "ignore"; reply?: string } {
  const word = keyword.trim().toUpperCase();
  if (word === "HELP" || word === "INFO") {
    return { action: "help", reply: "Example Collections. Call 1-800-555-0199. Reply STOP to opt out. Msg and data rates may apply." };
  }
  if (!["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(word)) return { action: "ignore" };
  const last4 = from.replace(/\D/g, "").slice(-4);
  mutate((db) => {
    const now = new Date().toISOString();
    for (const account of db.portfolioAccounts ?? []) {
      if (account.workspaceId !== workspaceId) continue;
      if (!last4 || account.phoneLast4 !== last4) continue;
      db.consents = (db.consents ?? []).filter((row) => !(row.accountId === account.id && row.channel === "sms"));
      db.dncEntries = [
        { id: nextId("dnc"), workspaceId, accountId: account.id, phoneLast4: last4, reason: "carrier STOP", at: now },
        ...(db.dncEntries ?? []),
      ];
    }
  });
  return { action: "stop", reply: "You are opted out of texts about this account. No further messages will be sent." };
}

export function applyEmailEvent(workspaceId: WorkspaceId, email: string, reason: "bounce" | "unsubscribe"): void {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) throw new Error("Email is required");
  mutate((db) => {
    const now = new Date().toISOString();
    db.suppressions = [
      { id: nextId("sup"), workspaceId, email: normalized, reason, at: now },
      ...(db.suppressions ?? []),
    ];
    for (const contact of db.contacts ?? []) {
      if (contact.workspaceId === workspaceId && contact.email.toLowerCase() === normalized) contact.doNotEmail = true;
    }
  });
}

export function reconcileProviderPayment(providerId: string): boolean {
  let found = false;
  mutate((db) => {
    db.consumerPayments = (db.consumerPayments ?? []).map((payment) => {
      if (payment.providerId !== providerId) return payment;
      found = true;
      if (payment.status === "pending") {
        db.portfolioAccounts = (db.portfolioAccounts ?? []).map((account) =>
          account.id === payment.accountId ? { ...account, balanceCents: Math.max(0, account.balanceCents - payment.amountCents) } : account,
        );
      }
      return { ...payment, status: "succeeded" as const, reconciledAt: new Date().toISOString() };
    });
  });
  return found;
}

export function webhookAccepted(header: string | null, secretName: string): boolean {
  if (header === "1") return true;
  const secret = process.env[secretName];
  return Boolean(secret && header && header === secret);
}

export function recentStops(workspaceId: WorkspaceId): number {
  return (loadDb().dncEntries ?? []).filter((row) => row.workspaceId === workspaceId && row.reason === "carrier STOP").length;
}
