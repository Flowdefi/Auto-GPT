import type { WorkspaceId } from "@/lib/types";
import type { ComplianceEvent, ConsumerPayment } from "@/lib/collections/types";
import { loadDb, mutate, nextId } from "@/server/db";
import { logEvent } from "@/server/log";
import { createStripeCheckout } from "./providers";
import { gateFor, refusePastLimitations, sendChannel } from "./service";

const ACCOUNT_NUMBER = /\d{8,}/;

const DRAFT_DISCLOSURE =
  "This is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector. This sentence is a draft for counsel review.";

function withDisclosure(body: string): string {
  return `${DRAFT_DISCLOSURE} ${body}`;
}

export function achProvider(): "sandbox" | "stripe" {
  return process.env.MERIDIAN_ACH_PROVIDER === "stripe" ? "stripe" : "sandbox";
}

function authorizationCopy(input: { amountCents: number; recurring: boolean }): string {
  const amount = (input.amountCents / 100).toFixed(2);
  const cadence = input.recurring
    ? `I authorize ${amount} USD to be debited from my bank account each month until the balance is paid or I revoke this authorization.`
    : `I authorize a one-time debit of ${amount} USD from my bank account.`;
  return `${cadence} I can revoke this authorization by calling the number on the notice, at least three business days before a scheduled debit. This is a draft authorization for counsel review under 12 CFR § 1005.10(b). No bank account number is stored here.`;
}

export async function postAchPayment(input: {
  workspaceId: WorkspaceId;
  accountId: string;
  amountCents: number;
  recurring: boolean;
  accepted: boolean;
}): Promise<ConsumerPayment> {
  if (!input.accepted) throw new Error("A preauthorized debit needs the consumer's authorization.");
  if (!Number.isInteger(input.amountCents) || input.amountCents < 100) throw new Error("Amount must be at least one dollar.");
  const account = (loadDb().portfolioAccounts ?? []).find((item) => item.id === input.accountId && item.workspaceId === input.workspaceId);
  if (!account) throw new Error("Account not found");
  refusePastLimitations(account);
  const decision = gateFor(input.workspaceId, account, "payment_portal");
  if (!decision.allowed) throw new Error(decision.reason);
  if (input.amountCents > account.balanceCents) throw new Error("Amount cannot exceed the balance");
  const text = authorizationCopy(input);
  if (ACCOUNT_NUMBER.test(text)) throw new Error("Authorization text must not contain a bank account number.");
  const stripe = process.env.MERIDIAN_CHANNEL_DELIVER === "live" && achProvider() === "stripe";
  const checkout = stripe ? await createStripeCheckout({ amountCents: input.amountCents, reference: account.accountRef }) : null;
  const now = new Date().toISOString();
  const payment: ConsumerPayment = {
    id: nextId("pmt"),
    workspaceId: input.workspaceId,
    accountId: input.accountId,
    amountCents: input.amountCents,
    status: checkout ? "pending" : "succeeded",
    provider: checkout?.provider ?? "sandbox",
    providerId: checkout?.providerId ?? `sandbox_${nextId("ach")}`,
    method: "ach",
    at: now,
    checkoutUrl: checkout?.url,
    authorization: { text, acceptedAt: now, proofId: nextId("auth"), copyProvidedAt: now, recurring: input.recurring },
  };
  mutate((db) => {
    db.consumerPayments = [payment, ...(db.consumerPayments ?? [])];
    if (payment.status === "succeeded") {
      db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) =>
        item.id === input.accountId ? { ...item, balanceCents: item.balanceCents - input.amountCents } : item,
      );
    }
    const posted: ComplianceEvent = {
      id: nextId("ce"),
      workspaceId: input.workspaceId,
      at: now,
      channel: "payment_portal",
      accountId: input.accountId,
      allowed: true,
      reason: `Posted ACH ${input.amountCents} cents. Recurring ${input.recurring}. Proof ${payment.authorization?.proofId}. No bank account number stored. 12 CFR § 1005.10(b), counsel review.`,
    };
    db.complianceEvents = [posted, ...(db.complianceEvents ?? [])].slice(0, 500);
  });
  logEvent("ach_posted", { workspaceId: input.workspaceId, accountId: input.accountId, amountCents: input.amountCents, recurring: input.recurring });
  const receipt = await sendChannel({
    workspaceId: input.workspaceId,
    accountId: input.accountId,
    channel: "email",
    body: withDisclosure(`Receipt ${payment.id} for ${(input.amountCents / 100).toFixed(2)} USD. ${text}`),
  });
  if (receipt.status === "blocked") {
    logEvent("receipt_blocked", { accountId: input.accountId, reason: receipt.reason ?? "blocked" });
  }
  return payment;
}

function returnNotice(paymentId: string, reason: "reversed" | "nsf"): string {
  const what = reason === "nsf" ? "The bank returned the debit" : "The posted debit was undone";
  return `${what} and the balance was restored. Reference ${paymentId}. This is a draft notice for counsel review. No bank account number is stored.`;
}

export async function reversePayment(workspaceId: WorkspaceId, paymentId: string, reason: "reversed" | "nsf"): Promise<ConsumerPayment> {
  const payment = (loadDb().consumerPayments ?? []).find((item) => item.id === paymentId && item.workspaceId === workspaceId);
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "reversed" || payment.status === "nsf") return payment;
  const now = new Date().toISOString();
  const next = { ...payment, status: reason };
  mutate((db) => {
    db.consumerPayments = (db.consumerPayments ?? []).map((item) => (item.id === paymentId ? next : item));
    if (payment.status === "succeeded") {
      db.portfolioAccounts = (db.portfolioAccounts ?? []).map((account) =>
        account.id === payment.accountId ? { ...account, balanceCents: account.balanceCents + payment.amountCents } : account,
      );
    }
    const event: ComplianceEvent = {
      id: nextId("ce"),
      workspaceId,
      at: now,
      channel: "payment_portal",
      accountId: payment.accountId,
      allowed: true,
      reason: reason === "nsf" ? "NSF returned the debit and the balance was restored. No bank account number stored." : "Payment reversal restored the balance. No bank account number stored.",
    };
    db.complianceEvents = [event, ...(db.complianceEvents ?? [])].slice(0, 500);
  });
  logEvent("payment_reversed", { workspaceId, paymentId, reason });
  const notice = await sendChannel({
    workspaceId,
    accountId: payment.accountId,
    channel: "email",
    body: withDisclosure(returnNotice(payment.id, reason)),
  });
  if (notice.status === "blocked") {
    logEvent("return_notice_blocked", { accountId: payment.accountId, reason: notice.reason ?? "blocked" });
  }
  return next;
}
