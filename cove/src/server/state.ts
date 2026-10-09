import { id, nowIso } from "@/lib/format";
import { seedCove } from "@/lib/seed";
import { AGENCY_NAME } from "@/lib/templates";
import type { AppData, Payment, PaymentPlan, PortalView } from "@/lib/types";
import { getPool, projectCove, readSnapshot, writeAudit, writeSnapshot } from "./postgres";

let cache: AppData | null = null;
let version = 1;
let boot: Promise<AppData> | null = null;
let writeChain: Promise<void> = Promise.resolve();

export function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<AppData>;
  return Array.isArray(data.accounts) && Array.isArray(data.payments) && Array.isArray(data.portfolios);
}

export function mergeState(base: AppData, incoming: AppData): AppData {
  const payments = new Map(base.payments.map((item) => [item.id, item]));
  for (const item of incoming.payments) payments.set(item.id, item);

  const plans = new Map(base.plans.map((item) => [item.id, item]));
  for (const item of incoming.plans) plans.set(item.id, item);

  const accounts = new Map(base.accounts.map((item) => [item.id, item]));
  for (const item of incoming.accounts) {
    const previous = accounts.get(item.id);
    if (!previous || item.collected >= previous.collected) {
      accounts.set(item.id, item);
    }
  }

  return {
    ...incoming,
    accounts: [...accounts.values()],
    payments: [...payments.values()].sort((left, right) => right.at.localeCompare(left.at)),
    plans: [...plans.values()],
  };
}

async function persist(state: AppData): Promise<void> {
  cache = state;
  version += 1;
  const nextVersion = version;
  writeChain = writeChain.then(async () => {
    await writeSnapshot(state, nextVersion);
    await projectCove(state);
  });
  await writeChain;
}

export async function ready(): Promise<AppData> {
  if (cache) return cache;
  if (!boot) {
    boot = (async () => {
      if (getPool()) {
        try {
          const remote = await readSnapshot();
          if (remote?.payload && isAppData(remote.payload) && remote.payload.accounts.length > 0) {
            version = remote.version || 1;
            cache = remote.payload;
            return cache;
          }
          const seeded = seedCove();
          cache = seeded;
          await writeSnapshot(seeded, version);
          await projectCove(seeded);
          await writeAudit("seed", {
            accounts: seeded.accounts.length,
            portfolios: seeded.portfolios.length,
          });
          return seeded;
        } catch (error) {
          console.error("Cove postgres boot failed:", error instanceof Error ? error.message : error);
        }
      }
      cache = seedCove();
      return cache;
    })();
  }
  return boot;
}

export async function getState(): Promise<{ payload: AppData; version: number }> {
  const payload = await ready();
  return { payload, version };
}

export async function putState(incoming: AppData): Promise<{ payload: AppData; version: number }> {
  const current = await ready();
  const merged = mergeState(current, incoming);
  await persist(merged);
  return { payload: merged, version };
}

export function toPortalView(state: AppData, portalCode: string): PortalView | null {
  const account = state.accounts.find(
    (item) => item.portalCode.toUpperCase() === portalCode.trim().toUpperCase(),
  );
  if (!account) return null;
  const plan = state.plans.find((item) => item.accountId === account.id && item.status === "active") ?? null;
  return {
    portalCode: account.portalCode,
    firstName: account.firstName,
    last4: account.last4,
    originalCreditor: account.originalCreditor,
    product: account.product,
    balance: account.balance,
    payments: state.payments
      .filter((item) => item.accountId === account.id)
      .map((item) => ({
        id: item.id,
        amount: item.amount,
        method: item.method,
        last4: item.last4,
        at: item.at,
        status: item.status,
      })),
    plan: plan
      ? {
          installment: plan.installment,
          cadence: plan.cadence,
          remaining: plan.remaining,
          nextDue: plan.nextDue,
        }
      : null,
  };
}

export async function applyPortalPay(input: {
  portalCode: string;
  amount: number;
  method: "card" | "ach";
  last4: string;
}): Promise<{ ok: boolean; message: string; account: PortalView | null }> {
  const state = await ready();
  const account = state.accounts.find(
    (item) => item.portalCode.toUpperCase() === input.portalCode.trim().toUpperCase(),
  );
  if (!account) {
    return { ok: false, message: "We could not find an account for that code.", account: null };
  }
  if (!(input.amount > 0)) {
    return {
      ok: false,
      message: "Enter an amount greater than zero.",
      account: toPortalView(state, account.portalCode),
    };
  }
  if (input.amount > account.balance) {
    return {
      ok: false,
      message: `That is more than the balance of $${account.balance}.`,
      account: toPortalView(state, account.portalCode),
    };
  }
  const last4 = input.last4.replace(/\D/g, "").slice(-4);
  if (last4.length !== 4) {
    return {
      ok: false,
      message: "Card or account last four is required.",
      account: toPortalView(state, account.portalCode),
    };
  }

  const nextBalance = Math.max(0, account.balance - input.amount);
  const payment: Payment = {
    id: id("py"),
    accountId: account.id,
    amount: input.amount,
    method: input.method,
    at: nowIso(),
    last4,
    status: "approved",
    channel: "portal",
    descriptor: AGENCY_NAME.toUpperCase(),
    processorRef: id("rp"),
  };
  const next: AppData = {
    ...state,
    accounts: state.accounts.map((item) =>
      item.id === account.id
        ? {
            ...item,
            balance: nextBalance,
            collected: item.collected + input.amount,
            status: nextBalance === 0 ? "paid" : item.status,
            disposition: nextBalance === 0 ? "paid" : item.disposition,
            documents: [
              {
                id: id("doc"),
                accountId: item.id,
                kind: "payment_receipt",
                name: `Receipt ${input.method.toUpperCase()} $${input.amount} •${last4}`,
                addedAt: nowIso(),
                source: `${AGENCY_NAME} payments`,
                verified: true,
                sizeKb: 22,
              },
              ...item.documents,
            ],
          }
        : item,
    ),
    payments: [payment, ...state.payments],
    timeline: [
      {
        id: id("tl"),
        accountId: account.id,
        channel: "payment",
        title: `${input.method.toUpperCase()} payment ${input.amount}`,
        body: `${input.method} •${last4} authorized via portal. Descriptor ${AGENCY_NAME}. New balance ${nextBalance}.`,
        at: nowIso(),
        actor: "TF Recovery portal",
        outcome: "approved",
      },
      ...state.timeline,
    ],
  };
  await persist(next);
  await writeAudit("portal_pay", { accountId: account.id, amount: input.amount, method: input.method });
  return {
    ok: true,
    message: `Thank you. $${input.amount} was authorized. It appears on your statement as ${AGENCY_NAME.toUpperCase()}.`,
    account: toPortalView(next, account.portalCode),
  };
}

export async function applyPortalPlan(input: {
  portalCode: string;
  installment: number;
  cadence: PaymentPlan["cadence"];
}): Promise<{ ok: boolean; message: string; account: PortalView | null }> {
  const state = await ready();
  const account = state.accounts.find(
    (item) => item.portalCode.toUpperCase() === input.portalCode.trim().toUpperCase(),
  );
  if (!account || !(input.installment > 0)) {
    return {
      ok: false,
      message: "We could not open that plan.",
      account: account ? toPortalView(state, account.portalCode) : null,
    };
  }
  const plan: PaymentPlan = {
    id: id("pl"),
    accountId: account.id,
    installment: input.installment,
    remaining: Math.max(1, Math.ceil(account.balance / input.installment)),
    cadence: input.cadence,
    nextDue: "2026-09-21",
    method: "ach",
    status: "active",
  };
  const next: AppData = {
    ...state,
    accounts: state.accounts.map((item) => (item.id === account.id ? { ...item, status: "plan" } : item)),
    plans: [plan, ...state.plans],
    timeline: [
      {
        id: id("tl"),
        accountId: account.id,
        channel: "payment",
        title: "Payment plan opened",
        body: `${input.cadence} ${input.installment}`,
        at: nowIso(),
        actor: "TF Recovery portal",
        outcome: "plan",
      },
      ...state.timeline,
    ],
  };
  await persist(next);
  await writeAudit("portal_plan", {
    accountId: account.id,
    installment: input.installment,
    cadence: input.cadence,
  });
  return {
    ok: true,
    message: "Plan created.",
    account: toPortalView(next, account.portalCode),
  };
}

export async function listPortalSamples(): Promise<Array<{ portalCode: string; last4: string }>> {
  const state = await ready();
  return state.accounts
    .filter((item) => item.balance > 0)
    .slice(0, 3)
    .map((item) => ({ portalCode: item.portalCode, last4: item.last4 }));
}
