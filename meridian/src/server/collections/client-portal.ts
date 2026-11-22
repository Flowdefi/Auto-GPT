import type { WorkspaceId } from "@/lib/types";
import type { ClientGrant, CollectionsRole, PortfolioAccount } from "@/lib/collections/types";
import { loadDb, mutate } from "@/server/db";
import { importPortfolio, returnQuarantined } from "./service";

export function clientGrant(email: string): ClientGrant | null {
  return (loadDb().clientGrants ?? []).find((grant) => grant.email === email.toLowerCase()) ?? null;
}

export function bindClient(email: string, sellerName: string, actorRole: CollectionsRole): ClientGrant {
  if (actorRole !== "admin") throw new Error("Only an admin can bind a client");
  const normalized = email.trim().toLowerCase();
  const seller = sellerName.trim().slice(0, 120);
  if (!normalized.includes("@") || !seller) throw new Error("Email and seller name are required");
  const grant = { email: normalized, sellerName: seller };
  mutate((db) => {
    db.operatorRoles = [...(db.operatorRoles ?? []).filter((row) => row.email !== normalized), { email: normalized, role: "client" }];
    db.clientGrants = [...(db.clientGrants ?? []).filter((row) => row.email !== normalized), grant];
  });
  return grant;
}

export function sellerFor(role: CollectionsRole, email: string, requested?: string): string | null {
  if (role === "client") return clientGrant(email)?.sellerName ?? null;
  return requested?.trim() || null;
}

export function accountsForSeller(workspaceId: WorkspaceId, sellerName: string): PortfolioAccount[] {
  return (loadDb().portfolioAccounts ?? []).filter((account) => account.workspaceId === workspaceId && account.sellerName === sellerName);
}

export function clientHome(workspaceId: WorkspaceId, role: CollectionsRole, email: string) {
  const db = loadDb();
  const forced = role === "client" ? clientGrant(email)?.sellerName : null;
  if (role === "client" && !forced) throw new Error("This login is not bound to a seller");
  const sellers = new Set<string>();
  for (const account of db.portfolioAccounts ?? []) {
    if (account.workspaceId !== workspaceId) continue;
    if (forced && account.sellerName !== forced) continue;
    if (account.sellerName) sellers.add(account.sellerName);
  }
  const payments = db.consumerPayments ?? [];
  return {
    seller: forced,
    clients: [...sellers].map((sellerName) => {
      const rows = accountsForSeller(workspaceId, sellerName);
      const collected = payments
        .filter((payment) => payment.status === "succeeded" && rows.some((account) => account.id === payment.accountId))
        .reduce((sum, payment) => sum + payment.amountCents, 0);
      return {
        sellerName,
        accounts: rows.length,
        workable: rows.filter((account) => account.status === "workable").length,
        quarantined: rows.filter((account) => account.status === "quarantined").length,
        returned: rows.filter((account) => account.status === "returned").length,
        faceCents: rows.reduce((sum, account) => sum + account.balanceCents, 0) + collected,
        collectedCents: collected,
        portfolios: [...new Set(rows.map((account) => account.portfolioId))],
      };
    }),
  };
}

export function placeForClient(workspaceId: WorkspaceId, role: CollectionsRole, email: string, csv: string) {
  const seller = sellerFor(role, email);
  if (role === "client" && !seller) throw new Error("This login is not bound to a seller");
  return importPortfolio({ workspaceId, csv, sellerLock: seller ?? undefined, portfolioId: undefined });
}

export function recallForClient(workspaceId: WorkspaceId, role: CollectionsRole, email: string, portfolioId?: string): number {
  const seller = sellerFor(role, email);
  if (role !== "client") return returnQuarantined(workspaceId, portfolioId);
  if (!seller) throw new Error("This login is not bound to a seller");
  let count = 0;
  mutate((db) => {
    for (const account of db.portfolioAccounts ?? []) {
      if (account.workspaceId !== workspaceId || account.sellerName !== seller || account.status !== "quarantined") continue;
      if (portfolioId && account.portfolioId !== portfolioId) continue;
      account.status = "returned";
      account.returnedAt = new Date().toISOString();
      count += 1;
    }
  });
  return count;
}
