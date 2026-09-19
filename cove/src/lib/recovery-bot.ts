import { outreachBlock } from "./compliance";
import type { Account, AppData, BotAction, TimelineEvent } from "./types";

function eventsFor(data: AppData, accountId: string): TimelineEvent[] {
  return data.timeline.filter((event) => event.accountId === accountId);
}

export function planAccount(account: Account, data: AppData): BotAction[] {
  const events = eventsFor(data, account.id);
  const actions: BotAction[] = [];

  if (account.cease || account.status === "dispute") {
    actions.push({
      id: `${account.id}_hold`,
      accountId: account.id,
      kind: "hold",
      title: "Keep hold — no recovery outreach",
      reason: account.cease ? "Cease on file." : "Open dispute / itemization request.",
      allowed: true,
    });
    return actions;
  }

  if (!account.validationSent) {
    const block = outreachBlock(account, "email") ?? outreachBlock(account, "sms");
    actions.push({
      id: `${account.id}_val`,
      accountId: account.id,
      kind: "validate",
      title: "Send validation / itemization",
      reason: "FDCPA validation has not gone out. No demand until it does.",
      allowed: !block,
      blockedReason: block ?? undefined,
    });
    return actions;
  }

  const noContacts = events.filter((event) => event.outcome === "no_contact").length;
  if (noContacts >= 2 && account.skipHits.length === 0) {
    actions.push({
      id: `${account.id}_skip`,
      accountId: account.id,
      kind: "skip",
      title: "Run skip trace",
      reason: `${noContacts} no-contacts. Refresh phones before more dials.`,
      allowed: true,
    });
  }

  if (account.status === "ptp" || account.status === "plan") {
    actions.push({
      id: `${account.id}_cb`,
      accountId: account.id,
      kind: "callback",
      title: "Reminder before due date",
      reason: "Honor the promise. Authenticated SMS/email only.",
      allowed: !outreachBlock(account, "sms") || !outreachBlock(account, "email"),
      blockedReason: outreachBlock(account, "sms") ?? undefined,
    });
    return actions;
  }

  const rpc = events.filter((event) => event.outcome?.includes("RPC")).length;
  if (rpc >= 1 && account.status === "working") {
    actions.push({
      id: `${account.id}_plan`,
      accountId: account.id,
      kind: "plan",
      title: "Offer Friday payday plan",
      reason: "Right-party already talked money. Convert to a written plan.",
      allowed: true,
    });
  }

  const callBlock = outreachBlock(account, "call");
  actions.push({
    id: `${account.id}_call`,
    accountId: account.id,
    kind: "call",
    title: "Queue for AI / live dial",
    reason: callBlock ? "Call blocked — see reason." : "Next compliant attempt.",
    allowed: !callBlock,
    blockedReason: callBlock ?? undefined,
  });

  const smsBlock = outreachBlock(account, "sms");
  if (!smsBlock) {
    actions.push({
      id: `${account.id}_sms`,
      accountId: account.id,
      kind: "sms",
      title: "Authenticated SMS",
      reason: "Low-friction follow-up with STOP and mini-Miranda.",
      allowed: true,
    });
  }

  return actions;
}

export function planFloor(data: AppData): BotAction[] {
  return data.accounts.flatMap((account) => planAccount(account, data));
}
