"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ConsumerPayment, PortfolioAccount } from "@/lib/collections/types";

function money(cents: number | undefined): string {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

export default function CollectAccountPage() {
  const [account, setAccount] = useState<PortfolioAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ConsumerPayment | null>(null);
  const [dispute, setDispute] = useState("I dispute this debt.");
  const [months, setMonths] = useState("4");
  const [installment, setInstallment] = useState("25");

  useEffect(() => {
    void fetch("/api/portal")
      .then(async (response) => {
        const body = (await response.json()) as { account?: PortfolioAccount; error?: string };
        if (!response.ok || !body.account) {
          setError(body.error ?? "Lookup required");
          return;
        }
        setAccount(body.account);
      })
      .catch(() => setError("Lookup required"));
  }, []);

  async function pay() {
    if (!account) return;
    setError(null);
    const response = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "pay", amountCents: Math.min(account.balanceCents, 2500) }),
    });
    const body = (await response.json()) as { error?: string; payment?: ConsumerPayment; account?: PortfolioAccount };
    if (!response.ok || !body.payment) {
      setError(body.error ?? "Payment was not accepted");
      return;
    }
    setReceipt(body.payment);
    if (body.account) setAccount(body.account);
  }

  async function savePlan(event: FormEvent) {
    event.preventDefault();
    if (!account) return;
    setError(null);
    const response = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "plan", months: Number(months), amountCents: Math.round(Number(installment) * 100) }),
    });
    const body = (await response.json()) as { error?: string; account?: PortfolioAccount };
    if (!response.ok || !body.account) {
      setError(body.error ?? "Plan was not saved");
      return;
    }
    setAccount(body.account);
  }

  async function downloadNotice() {
    setError(null);
    const response = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "notice" }),
    });
    const body = (await response.json()) as { error?: string; account?: PortfolioAccount };
    if (!response.ok || !body.account?.validationNotice) {
      setError(body.error ?? "Validation notice was not issued");
      return;
    }
    setAccount(body.account);
    const blob = new Blob([body.account.validationNotice], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "validation-notice.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function sendDispute(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "dispute", text: dispute }),
    });
    const body = (await response.json()) as { error?: string; account?: PortfolioAccount };
    if (!response.ok || !body.account) {
      setError(body.error ?? "Dispute was not saved");
      return;
    }
    setAccount(body.account);
  }

  if (!account) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="mt-3 text-sm">{error ?? "Loading…"}</p>
        <a className="mt-4 inline-block underline" href="/collect">
          Back to lookup
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide">Reference {account.accountRef}</p>
      <h1 className="mt-2 text-3xl font-semibold">{money(account.balanceCents)}</h1>
      <p className="mt-2 text-sm">Current balance. Account ending {account.last4 || "not supplied"}.</p>
      <section className="mt-8 grid gap-2 text-sm">
        <h2 className="font-semibold">Itemization</h2>
        <p>Original creditor: {account.originalCreditor || "not supplied"}</p>
        <p>Itemization date: {account.itemizationDate || "not supplied"}</p>
        <p>Amount then: {money(account.itemizationAmountCents)}</p>
        <p>Payments since: {money(account.paymentsSinceItemizationCents)}</p>
        <p>Credits since: {money(account.creditsSinceItemizationCents)}</p>
        <p>Fees since: {money(account.feesSinceItemizationCents)}</p>
        <p>Chain of title: {account.chainOfTitle || "not supplied"}</p>
        <p>Limitations date on file: {account.solExpiresOn || "not calculated"} {account.solNeedsCounselReview ? "(counsel review)" : ""}</p>
      </section>
      <button className="mt-4 min-h-11 underline" type="button" onClick={() => void downloadNotice()}>
        Download validation notice
      </button>
      {account.disputeDeadline ? <p className="text-sm">Validation period ends {account.disputeDeadline}.</p> : null}
      <form onSubmit={(event) => void savePlan(event)} className="mt-6 grid gap-2">
        <h2 className="font-semibold">Payment plan</h2>
        <p className="text-sm">Test mode only. The plan total cannot exceed the balance, and no card is stored.</p>
        {account.paymentPlan ? (
          <p className="text-sm">
            Current plan: {account.paymentPlan.months} payments of {money(account.paymentPlan.installmentCents)}.
          </p>
        ) : null}
        <label className="grid gap-1 text-sm">
          Months
          <input className="min-h-11 rounded-xl border px-3" inputMode="numeric" value={months} onChange={(event) => setMonths(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          Each payment in dollars
          <input className="min-h-11 rounded-xl border px-3" inputMode="decimal" value={installment} onChange={(event) => setInstallment(event.target.value)} />
        </label>
        <button className="min-h-11 rounded-xl border px-4" type="submit">
          Save test-mode plan
        </button>
      </form>
      <button className="mt-6 min-h-11 rounded-xl bg-black px-4 text-white" type="button" onClick={() => void pay()}>
        Pay $25.00 in test mode
      </button>
      {receipt ? <p className="mt-3 text-sm">Test payment {receipt.providerId} succeeded for {money(receipt.amountCents)}. No card was collected.</p> : null}
      <form onSubmit={(event) => void sendDispute(event)} className="mt-8 grid gap-2">
        <label className="grid gap-1 text-sm">
          Dispute
          <textarea className="min-h-24 rounded-xl border p-3" value={dispute} onChange={(event) => setDispute(event.target.value)} />
        </label>
        <button className="min-h-11 rounded-xl border px-4" type="submit">
          Submit dispute
        </button>
      </form>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <p className="mt-8 text-sm leading-6">
        This is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.
        Status: {account.status}.
      </p>
    </main>
  );
}
