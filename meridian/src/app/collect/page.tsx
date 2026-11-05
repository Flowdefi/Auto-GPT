"use client";

import { useState, type FormEvent } from "react";

export default function CollectLookupPage() {
  const [accountRef, setAccountRef] = useState("DEMO-TX-4242");
  const [last4, setLast4] = useState("4242");
  const [zip, setZip] = useState("75201");
  const [error, setError] = useState<string | null>(null);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "lookup", workspaceId: "triton", accountRef, last4, zip }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "No match");
      return;
    }
    window.location.href = "/collect/account";
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide">Consumer portal</p>
      <h1 className="mt-2 text-3xl font-semibold">Look up an account</h1>
      <p className="mt-3 text-sm leading-6">
        Use the reference number, the last four of the account, and the ZIP code. Do not put a Social Security number in this page or in the address bar.
      </p>
      <form onSubmit={(event) => void lookup(event)} className="mt-8 grid gap-4">
        <label className="grid gap-1 text-sm">
          Reference number
          <input className="min-h-11 rounded-xl border px-3" value={accountRef} onChange={(event) => setAccountRef(event.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          Last four
          <input className="min-h-11 rounded-xl border px-3" inputMode="numeric" value={last4} onChange={(event) => setLast4(event.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm">
          ZIP code
          <input className="min-h-11 rounded-xl border px-3" inputMode="numeric" value={zip} onChange={(event) => setZip(event.target.value)} required />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button className="min-h-11 rounded-xl bg-black px-4 text-white" type="submit">
          Continue
        </button>
      </form>
      <p className="mt-6 text-sm leading-6">
        This is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.{" "}
        <a className="underline" href="/collect/privacy">
          Privacy
        </a>
      </p>
    </main>
  );
}
