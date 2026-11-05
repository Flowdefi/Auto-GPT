import type { WorkspaceId } from "@/lib/types";
import type { PortfolioAccount } from "@/lib/collections/types";
import { loadDb, mutate, nextId } from "@/server/db";
import { publicAccount } from "@/lib/collections/portfolio";

export function setPromise(workspaceId: WorkspaceId, accountId: string, amountCents: number, dueOn: string): PortfolioAccount {
  if (!Number.isInteger(amountCents) || amountCents < 100) throw new Error("Promise amount must be at least one dollar");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) throw new Error("Promise date must be YYYY-MM-DD");
  let updated: PortfolioAccount | null = null;
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((account) => {
      if (account.id !== accountId || account.workspaceId !== workspaceId) return account;
      updated = { ...account, promise: { amountCents, dueOn, status: "open", createdAt: new Date().toISOString() } };
      return updated;
    });
  });
  if (!updated) throw new Error("Account not found");
  return publicAccount(updated);
}

export function markPromiseKept(workspaceId: WorkspaceId, accountId: string): void {
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((account) =>
      account.id === accountId && account.workspaceId === workspaceId && account.promise
        ? { ...account, promise: { ...account.promise, status: "kept" } }
        : account,
    );
  });
}

export function sweepBrokenPromises(now = new Date()): number {
  const today = now.toISOString().slice(0, 10);
  let count = 0;
  mutate((db) => {
    const tasks = db.collectorTasks ?? [];
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((account) => {
      if (!account.promise || account.promise.status !== "open" || account.promise.dueOn >= today) return account;
      count += 1;
      tasks.unshift({
        id: nextId("task"),
        workspaceId: account.workspaceId,
        accountId: account.id,
        title: "Broken promise to pay",
        queue: "collector",
        status: "open",
        createdAt: now.toISOString(),
      });
      return { ...account, promise: { ...account.promise, status: "broken" } };
    });
    db.collectorTasks = tasks.slice(0, 2000);
  });
  return count;
}

export function account360(workspaceId: WorkspaceId, accountId: string) {
  const db = loadDb();
  const account = (db.portfolioAccounts ?? []).find((item) => item.id === accountId && item.workspaceId === workspaceId);
  if (!account) throw new Error("Account not found");
  const timeline = [
    ...(db.complianceEvents ?? []).filter((event) => event.accountId === accountId).map((event) => ({ at: event.at, kind: "compliance", label: event.reason, allowed: event.allowed })),
    ...(db.channelMessages ?? []).filter((message) => message.accountId === accountId).map((message) => ({ at: message.at, kind: message.channel, label: message.reason ?? message.status, allowed: message.status !== "blocked" })),
    ...(db.consumerPayments ?? []).filter((payment) => payment.accountId === accountId).map((payment) => ({ at: payment.at, kind: "payment", label: `${payment.status} ${(payment.amountCents / 100).toFixed(2)} ${payment.method ?? payment.provider}`, allowed: payment.status === "succeeded" })),
    ...(db.voiceCalls ?? []).filter((call) => call.accountId === accountId).map((call) => ({ at: call.createdAt, kind: "call", label: call.disposition ?? call.phase, allowed: !call.blockedReason })),
    ...(db.complaints ?? []).filter((complaint) => complaint.workspaceId === workspaceId && complaint.accountRef === account.accountRef).map((complaint) => ({ at: complaint.receivedAt, kind: "complaint", label: complaint.summary, allowed: false })),
    ...(db.collectorTasks ?? []).filter((task) => task.accountId === accountId).map((task) => ({ at: task.createdAt, kind: "task", label: task.title, allowed: task.status === "done" })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 80);
  return { account: publicAccount(account), timeline };
}

export function dailyScorecard(workspaceId: WorkspaceId, day = new Date().toISOString().slice(0, 10)) {
  const db = loadDb();
  const accounts = (db.portfolioAccounts ?? []).filter((account) => account.workspaceId === workspaceId);
  const names = new Set<string>();
  for (const task of db.collectorTasks ?? []) if (task.workspaceId === workspaceId && task.completedBy) names.add(task.completedBy);
  return {
    day,
    calls: (db.voiceCalls ?? []).filter((call) => call.workspaceId === workspaceId && call.createdAt.slice(0, 10) === day && !call.blockedReason).length,
    paymentsPosted: (db.consumerPayments ?? []).filter((payment) => payment.workspaceId === workspaceId && payment.status === "succeeded" && payment.at.slice(0, 10) === day).length,
    promisesOpen: accounts.filter((account) => account.promise?.status === "open").length,
    promisesBroken: accounts.filter((account) => account.promise?.status === "broken").length,
    promisesKept: accounts.filter((account) => account.promise?.status === "kept").length,
    collectors: [...names].map((name) => ({
      name,
      tasksClosed: (db.collectorTasks ?? []).filter((task) => task.workspaceId === workspaceId && task.status === "done" && task.completedBy === name && task.createdAt.slice(0, 10) === day).length,
    })),
  };
}
