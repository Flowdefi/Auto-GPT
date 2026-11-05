"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePortalCopy } from "@/components/collect/portal-frame";
import { limitationsDatePassed } from "@/lib/collections/sol";
import type { ConsumerPayment, PortfolioAccount } from "@/lib/collections/types";

function money(cents: number | undefined): string {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

export default function CollectAccountPage() {
  const copy = usePortalCopy();
  const [account, setAccount] = useState<PortfolioAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ConsumerPayment | null>(null);
  const [dispute, setDispute] = useState("");
  const [months, setMonths] = useState("4");
  const [installment, setInstallment] = useState("25");
  const [authorized, setAuthorized] = useState(false);
  const [proof, setProof] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    void fetch("/api/portal")
      .then(async (response) => {
        const body = (await response.json()) as { account?: PortfolioAccount; error?: string };
        if (!response.ok || !body.account) {
          setError(body.error ?? copy.loading);
          return;
        }
        setAccount(body.account);
      })
      .catch(() => setError(copy.loading));
  }, [copy.loading]);

  async function payAch() {
    if (!account || !authorized) return;
    setError(null);
    const response = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "ach", amountCents: Math.min(account.balanceCents, 2500), recurring: false, accepted: true }),
    });
    const body = (await response.json()) as { error?: string; payment?: ConsumerPayment; account?: PortfolioAccount };
    if (!response.ok || !body.payment) {
      setError(body.error ?? copy.error);
      return;
    }
    setReceipt(body.payment);
    setProof(body.payment.authorization?.proofId ?? null);
    if (body.account) setAccount(body.account);
  }

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
      setError(body.error ?? copy.error);
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
      setError(body.error ?? copy.error);
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
    const body = (await response.json()) as { error?: string; account?: PortfolioAccount; pdfBase64?: string };
    if (!response.ok || !body.pdfBase64) {
      setError(body.error ?? copy.error);
      return;
    }
    if (body.account) setAccount(body.account);
    const bytes = Uint8Array.from(atob(body.pdfBase64), (char) => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "validation-notice.pdf";
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
      setError(body.error ?? copy.error);
      return;
    }
    setAccount(body.account);
  }

  if (!account) {
    return (
      <main className="mx-auto max-w-lg px-6 py-10">
        <h1 className="text-2xl font-semibold">{copy.accountTitle}</h1>
        <p className="mt-3 text-sm" role="status">{error ?? copy.loading}</p>
        <a className="mt-4 inline-flex min-h-11 items-center underline" href="/collect">
          {copy.back}
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide">{copy.reference} {account.accountRef}</p>
      <h1 className="mt-2 text-3xl font-semibold">{money(account.balanceCents)}</h1>
      <p className="mt-2 text-sm">{copy.balanceLabel}. {copy.ending} {account.last4 || copy.notSupplied}.</p>
      <section className="mt-8 grid gap-2 text-sm" aria-labelledby="itemization-heading">
        <h2 id="itemization-heading" className="font-semibold">{copy.itemization}</h2>
        <p>{copy.creditor}: {account.originalCreditor || copy.notSupplied}</p>
        <p>{copy.itemDate}: {account.itemizationDate || copy.notSupplied}</p>
        <p>{copy.amountThen}: {money(account.itemizationAmountCents)}</p>
        <p>{copy.payments}: {money(account.paymentsSinceItemizationCents)}</p>
        <p>{copy.credits}: {money(account.creditsSinceItemizationCents)}</p>
        <p>{copy.fees}: {money(account.feesSinceItemizationCents)}</p>
        <p>{copy.chain}: {account.chainOfTitle || copy.notSupplied}</p>
        <p>{copy.limitations}: {account.solExpiresOn || copy.notCalculated} {account.solNeedsCounselReview ? `(${copy.counselShort})` : ""}</p>
      </section>
      <button className="mt-4 min-h-11 underline" type="button" onClick={() => void downloadNotice()}>
        {copy.download}
      </button>
      {account.disputeDeadline ? <p className="text-sm">{copy.periodEnds} {account.disputeDeadline}.</p> : null}
      {limitationsDatePassed(account.solExpiresOn, new Date().toISOString()) ? (
        <p className="mt-6 text-sm leading-6">{copy.timeBarredHold} {copy.counsel}</p>
      ) : (
      <>
      <form onSubmit={(event) => void savePlan(event)} className="mt-6 grid gap-2">
        <h2 className="font-semibold">{copy.planTitle}</h2>
        <p className="text-sm">{copy.planBody}</p>
        {account.paymentPlan ? (
          <p className="text-sm">
            {copy.currentPlan}: {account.paymentPlan.months} {copy.paymentsOf} {money(account.paymentPlan.installmentCents)}.
          </p>
        ) : null}
        <label className="grid gap-1 text-sm" htmlFor="plan-months">
          {copy.months}
          <input id="plan-months" className="min-h-11 rounded-xl border border-[#1c2430] px-3" inputMode="numeric" value={months} onChange={(event) => setMonths(event.target.value)} />
        </label>
        <label className="grid gap-1 text-sm" htmlFor="plan-amount">
          {copy.eachPayment}
          <input id="plan-amount" className="min-h-11 rounded-xl border border-[#1c2430] px-3" inputMode="decimal" value={installment} onChange={(event) => setInstallment(event.target.value)} />
        </label>
        <button className="min-h-11 rounded-xl border border-[#1c2430] px-4" type="submit">
          {copy.savePlan}
        </button>
      </form>
      <button className="mt-6 min-h-11 rounded-xl bg-[#1c2430] px-4 text-white" type="button" onClick={() => void pay()}>
        {copy.pay}
      </button>
      <form className="mt-6 grid gap-2 text-sm" onSubmit={(event) => { event.preventDefault(); void payAch(); }}>
        <h2 className="font-semibold">{copy.bankTitle}</h2>
        <p>{copy.bankBody}</p>
        <label className="flex min-h-11 items-start gap-2" htmlFor="ach-auth">
          <input id="ach-auth" type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} />
          <span>{copy.bankConsent}</span>
        </label>
        <button className="min-h-11 rounded-xl border border-[#1c2430] px-4" type="submit" disabled={!authorized}>{copy.bankSubmit}</button>
        {proof ? <p role="status">{copy.bankProof} {proof}</p> : null}
      </form>
      </>
      )}
      {receipt ? <p className="mt-3 text-sm" role="status">{copy.receipt} {receipt.providerId} {money(receipt.amountCents)}. {copy.noCard}</p> : null}
      <form onSubmit={(event) => void sendDispute(event)} className="mt-8 grid gap-2">
        <label className="grid gap-1 text-sm" htmlFor="dispute-text">
          {copy.dispute}
          <textarea id="dispute-text" className="min-h-24 rounded-xl border border-[#1c2430] p-3" value={dispute} onChange={(event) => setDispute(event.target.value)} />
        </label>
        <button className="min-h-11 rounded-xl border border-[#1c2430] px-4" type="submit">
          {copy.submitDispute}
        </button>
      </form>
      {error ? <p id="account-error" ref={errorRef} tabIndex={-1} className="mt-3 text-sm text-[#7f1d1d]" role="alert">{copy.error}: {error}</p> : null}
      <p className="mt-8 text-sm leading-6">
        {copy.disclosure} {copy.status}: {account.status}.
      </p>
    </main>
  );
}
