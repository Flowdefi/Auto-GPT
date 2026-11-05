"use client";

import { useState, type FormEvent } from "react";
import { usePortalCopy } from "@/components/collect/portal-frame";

export default function CollectLookupPage() {
  const copy = usePortalCopy();
  const [accountRef, setAccountRef] = useState("");
  const [last4, setLast4] = useState("");
  const [zip, setZip] = useState("");
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
      setError(body.error ?? copy.error);
      return;
    }
    window.location.href = "/collect/account";
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide">{copy.lookupEyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold">{copy.lookupTitle}</h1>
      <p className="mt-3 text-sm leading-6">{copy.lookupBody}</p>
      <form onSubmit={(event) => void lookup(event)} className="mt-8 grid gap-4" aria-describedby="portal-disclosure">
        <label className="grid gap-1 text-sm" htmlFor="account-ref">
          {copy.reference}
          <input id="account-ref" className="min-h-11 rounded-xl border border-[#1c2430] px-3" autoComplete="off" value={accountRef} onChange={(event) => setAccountRef(event.target.value)} required aria-invalid={error ? true : undefined} />
        </label>
        <label className="grid gap-1 text-sm" htmlFor="last-four">
          {copy.last4}
          <input id="last-four" className="min-h-11 rounded-xl border border-[#1c2430] px-3" inputMode="numeric" autoComplete="off" value={last4} onChange={(event) => setLast4(event.target.value)} required />
        </label>
        <label className="grid gap-1 text-sm" htmlFor="zip-code">
          {copy.zip}
          <input id="zip-code" className="min-h-11 rounded-xl border border-[#1c2430] px-3" inputMode="numeric" autoComplete="postal-code" value={zip} onChange={(event) => setZip(event.target.value)} required />
        </label>
        {error ? <p className="text-sm text-[#7f1d1d]" role="alert">{copy.error}: {error}</p> : null}
        <button className="min-h-11 rounded-xl bg-[#1c2430] px-4 text-white" type="submit">
          {copy.continue}
        </button>
      </form>
      <p id="portal-disclosure" className="mt-6 text-sm leading-6">
        {copy.disclosure}{" "}
        <a className="underline" href="/collect/privacy">
          {copy.privacy}
        </a>
      </p>
    </main>
  );
}
