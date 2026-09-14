import type { Account, Disposition, PaymentPlan, Portfolio } from "./types";

export interface DispositionSlice {
  key: Disposition;
  label: string;
  count: number;
  share: number;
  dollars: number;
}

export interface Liquidation {
  portfolio: Portfolio;
  accounts: number;
  faceValue: number;
  /** Face value still on the books across live accounts. */
  openBalance: number;
  cost: number;
  costBasis: number;
  collected: number;
  /** Collected / face value. The number a seller asks about. */
  liquidationPct: number;
  /** Collected / cost. Above 1.0 means the paper is in the black. */
  netMultiple: number;
  profit: number;
  breakEvenPct: number;
  pendingPlanDollars: number;
  pendingPlanCount: number;
  scheduled30: number;
  dispositions: DispositionSlice[];
  workable: number;
  contactable: number;
}

const LABELS: Record<Disposition, string> = {
  active: "Active",
  paid: "Paid in full",
  settled: "Settled",
  bankrupt: "Bankrupt",
  deceased: "Deceased",
  refusal: "Refusal",
  unable_to_locate: "Unable to locate",
  disputed: "Disputed",
  recalled: "Recalled / putback",
};

const ORDER: Disposition[] = [
  "active",
  "paid",
  "settled",
  "bankrupt",
  "deceased",
  "refusal",
  "unable_to_locate",
  "disputed",
  "recalled",
];

export function dispositionLabel(key: Disposition): string {
  return LABELS[key];
}

/** Dollars still owed to us on an open plan. */
export function planExposure(plan: PaymentPlan): number {
  return plan.status === "active" ? plan.installment * plan.remaining : 0;
}

function cadenceHitsIn30(plan: PaymentPlan): number {
  if (plan.status !== "active") return 0;
  if (plan.cadence === "weekly") return Math.min(plan.remaining, 4);
  if (plan.cadence === "biweekly") return Math.min(plan.remaining, 2);
  return Math.min(plan.remaining, 1);
}

export function liquidationFor(
  portfolio: Portfolio,
  allAccounts: Account[],
  allPlans: PaymentPlan[],
): Liquidation {
  const accounts = allAccounts.filter((account) => account.portfolioId === portfolio.id);
  const ids = new Set(accounts.map((account) => account.id));
  const plans = allPlans.filter((plan) => ids.has(plan.accountId));

  const collected = accounts.reduce((sum, account) => sum + account.collected, 0);
  const openBalance = accounts
    .filter((account) => account.disposition === "active" || account.disposition === "disputed")
    .reduce((sum, account) => sum + account.balance, 0);

  // Prefer the seller's stated face/count so a partially imported file still
  // reports against the tape it was bought on.
  const faceValue = portfolio.faceValue || accounts.reduce((sum, account) => sum + account.original, 0);
  const count = portfolio.accountCount || accounts.length;

  const dispositions = ORDER.map((key) => {
    const slice = accounts.filter((account) => account.disposition === key);
    return {
      key,
      label: LABELS[key],
      count: slice.length,
      share: accounts.length ? slice.length / accounts.length : 0,
      dollars: slice.reduce((sum, account) => sum + account.balance, 0),
    };
  }).filter((slice) => slice.count > 0);

  const activePlans = plans.filter((plan) => plan.status === "active");

  return {
    portfolio,
    accounts: count,
    faceValue,
    openBalance,
    cost: portfolio.purchasePrice,
    costBasis: faceValue ? portfolio.purchasePrice / faceValue : 0,
    collected,
    liquidationPct: faceValue ? collected / faceValue : 0,
    netMultiple: portfolio.purchasePrice ? collected / portfolio.purchasePrice : 0,
    profit: collected - portfolio.purchasePrice,
    breakEvenPct: faceValue ? portfolio.purchasePrice / faceValue : 0,
    pendingPlanDollars: activePlans.reduce((sum, plan) => sum + planExposure(plan), 0),
    pendingPlanCount: activePlans.length,
    scheduled30: activePlans.reduce((sum, plan) => sum + plan.installment * cadenceHitsIn30(plan), 0),
    dispositions,
    workable: accounts.filter((account) => account.disposition === "active").length,
    contactable: accounts.filter(
      (account) => account.disposition === "active" && !account.dnc && !account.cease,
    ).length,
  };
}

export function rollUp(
  portfolios: Portfolio[],
  accounts: Account[],
  plans: PaymentPlan[],
): Liquidation[] {
  return portfolios.map((portfolio) => liquidationFor(portfolio, accounts, plans));
}

export function totals(rows: Liquidation[]): Liquidation | null {
  if (rows.length === 0) return null;
  const faceValue = rows.reduce((sum, row) => sum + row.faceValue, 0);
  const cost = rows.reduce((sum, row) => sum + row.cost, 0);
  const collected = rows.reduce((sum, row) => sum + row.collected, 0);
  const merged = new Map<Disposition, DispositionSlice>();
  for (const row of rows) {
    for (const slice of row.dispositions) {
      const prior = merged.get(slice.key);
      merged.set(slice.key, {
        ...slice,
        count: (prior?.count ?? 0) + slice.count,
        dollars: (prior?.dollars ?? 0) + slice.dollars,
        share: 0,
      });
    }
  }
  const totalAccounts = rows.reduce((sum, row) => sum + row.accounts, 0);
  const dispositions = ORDER.flatMap((key) => {
    const slice = merged.get(key);
    if (!slice) return [];
    return [{ ...slice, share: totalAccounts ? slice.count / totalAccounts : 0 }];
  });

  return {
    portfolio: {
      id: "all",
      name: "All portfolios",
      seller: "—",
      assetClass: "blended",
      purchasedAt: "—",
      faceValue,
      purchasePrice: cost,
      accountCount: totalAccounts,
      putbackUntil: "—",
      mediaComplete: rows.every((row) => row.portfolio.mediaComplete),
      notes: "",
    },
    accounts: totalAccounts,
    faceValue,
    openBalance: rows.reduce((sum, row) => sum + row.openBalance, 0),
    cost,
    costBasis: faceValue ? cost / faceValue : 0,
    collected,
    liquidationPct: faceValue ? collected / faceValue : 0,
    netMultiple: cost ? collected / cost : 0,
    profit: collected - cost,
    breakEvenPct: faceValue ? cost / faceValue : 0,
    pendingPlanDollars: rows.reduce((sum, row) => sum + row.pendingPlanDollars, 0),
    pendingPlanCount: rows.reduce((sum, row) => sum + row.pendingPlanCount, 0),
    scheduled30: rows.reduce((sum, row) => sum + row.scheduled30, 0),
    dispositions,
    workable: rows.reduce((sum, row) => sum + row.workable, 0),
    contactable: rows.reduce((sum, row) => sum + row.contactable, 0),
  };
}
