import type { WorkspaceId } from "@/lib/types";
import type { PortfolioBook } from "@/lib/collections/launch";
import { MODEL_LABEL, annualIrr, cashOnCash, expectedMonthlyCents } from "@/lib/collections/economics";
import { loadDb, mutate } from "@/server/db";

function collectedFor(workspaceId: WorkspaceId, portfolioId: string): number {
  const db = loadDb();
  const ids = new Set((db.portfolioAccounts ?? []).filter((account) => account.workspaceId === workspaceId && account.portfolioId === portfolioId).map((account) => account.id));
  return (db.consumerPayments ?? [])
    .filter((payment) => payment.workspaceId === workspaceId && payment.status === "succeeded" && ids.has(payment.accountId))
    .reduce((sum, payment) => sum + payment.amountCents, 0);
}

function faceFor(workspaceId: WorkspaceId, portfolioId: string): number {
  return (loadDb().portfolioAccounts ?? [])
    .filter((account) => account.workspaceId === workspaceId && account.portfolioId === portfolioId)
    .reduce((sum, account) => sum + (account.chargeOffBalanceCents || account.balanceCents), 0);
}

export function savePortfolioCost(workspaceId: WorkspaceId, portfolioId: string, costCents: number, sellerName: string): PortfolioBook {
  if (!Number.isInteger(costCents) || costCents < 0) throw new Error("Cost must be zero or a positive number of cents");
  const owns = (loadDb().portfolioAccounts ?? []).some((account) => account.workspaceId === workspaceId && account.portfolioId === portfolioId);
  if (!owns) throw new Error("Portfolio not found in this workspace");
  const book: PortfolioBook = {
    portfolioId,
    workspaceId,
    sellerName: sellerName.trim().slice(0, 120) || "Unknown seller",
    costCents,
    closedAt: null,
  };
  mutate((db) => {
    const prior = (db.portfolioBooks ?? []).find((item) => item.workspaceId === workspaceId && item.portfolioId === portfolioId);
    db.portfolioBooks = [
      { ...book, closedAt: prior?.closedAt ?? null },
      ...(db.portfolioBooks ?? []).filter((item) => !(item.workspaceId === workspaceId && item.portfolioId === portfolioId)),
    ];
  });
  return book;
}

export function portfolioEconomics(workspaceId: WorkspaceId) {
  const ids = new Set((loadDb().portfolioAccounts ?? []).filter((account) => account.workspaceId === workspaceId).map((account) => account.portfolioId));
  for (const book of loadDb().portfolioBooks ?? []) {
    if (book.workspaceId === workspaceId) ids.add(book.portfolioId);
  }
  return [...ids].map((portfolioId) => {
    const book = (loadDb().portfolioBooks ?? []).find((item) => item.workspaceId === workspaceId && item.portfolioId === portfolioId);
    const faceCents = faceFor(workspaceId, portfolioId);
    const collectedCents = collectedFor(workspaceId, portfolioId);
    const expected = expectedMonthlyCents(faceCents);
    const flows = book && book.costCents > 0 ? [-book.costCents, ...expected] : [];
    return {
      portfolioId,
      sellerName: book?.sellerName ?? (loadDb().portfolioAccounts ?? []).find((account) => account.portfolioId === portfolioId)?.sellerName ?? "",
      costCents: book?.costCents ?? 0,
      faceCents,
      collectedCents,
      cashOnCash: cashOnCash(collectedCents, book?.costCents ?? 0),
      expectedMonthlyCents: expected,
      irrAnnual: flows.length ? annualIrr(flows) : null,
      closedAt: book?.closedAt ?? null,
      label: MODEL_LABEL,
    };
  });
}

export function sellerScorecards(workspaceId: WorkspaceId) {
  const rows = portfolioEconomics(workspaceId);
  const bySeller = new Map<string, { accounts: number; faceCents: number; collectedCents: number; costCents: number }>();
  const accounts = (loadDb().portfolioAccounts ?? []).filter((account) => account.workspaceId === workspaceId);
  for (const row of rows) {
    const bucket = bySeller.get(row.sellerName) ?? { accounts: 0, faceCents: 0, collectedCents: 0, costCents: 0 };
    bucket.accounts += accounts.filter((account) => account.portfolioId === row.portfolioId).length;
    bucket.faceCents += row.faceCents;
    bucket.collectedCents += row.collectedCents;
    bucket.costCents += row.costCents;
    bySeller.set(row.sellerName, bucket);
  }
  return [...bySeller.entries()].map(([sellerName, bucket]) => ({
    sellerName,
    ...bucket,
    cashOnCash: cashOnCash(bucket.collectedCents, bucket.costCents),
    label: MODEL_LABEL,
  }));
}

export function closePortfolio(workspaceId: WorkspaceId, portfolioId: string) {
  const row = portfolioEconomics(workspaceId).find((item) => item.portfolioId === portfolioId);
  if (!row) throw new Error("Portfolio not found in this workspace");
  const feePercent = Number(process.env.MERIDIAN_AGENCY_FEE_PERCENT ?? "0");
  const feeCents = Math.round(row.collectedCents * (Number.isFinite(feePercent) ? feePercent : 0) / 100);
  const closedAt = new Date().toISOString();
  mutate((db) => {
    const existing = (db.portfolioBooks ?? []).find((item) => item.workspaceId === workspaceId && item.portfolioId === portfolioId);
    const book: PortfolioBook = {
      portfolioId,
      workspaceId,
      sellerName: row.sellerName,
      costCents: existing?.costCents ?? row.costCents,
      closedAt,
    };
    db.portfolioBooks = [book, ...(db.portfolioBooks ?? []).filter((item) => !(item.workspaceId === workspaceId && item.portfolioId === portfolioId))];
  });
  return {
    ...row,
    closedAt,
    feeCents,
    remittanceCents: row.collectedCents - feeCents,
    final: true,
    label: MODEL_LABEL,
  };
}
