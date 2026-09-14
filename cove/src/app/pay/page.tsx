"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCove } from "@/lib/store";

export default function PortalEntryPage() {
  const router = useRouter();
  const accounts = useCove((state) => state.accounts);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open() {
    const trimmed = code.trim().toUpperCase();
    const match = accounts.find((account) => account.portalCode.toUpperCase() === trimmed);
    if (!match) {
      setError("We could not find an account for that code. Check the letter or text message you received.");
      return;
    }
    router.push(`/pay/${match.portalCode}`);
  }

  const samples = accounts.filter((account) => account.balance > 0).slice(0, 3);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Pay your account</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-tfr-ink/70">
        Enter the reference code from your letter or text message. You can pay in full, make a partial payment, or set
        up a plan you can actually keep.
      </p>

      <div className="mt-6 rounded-2xl border border-tfr-line bg-white p-6 shadow-sm">
        <label htmlFor="code" className="text-sm font-medium">
          Reference code
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="code"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") open();
            }}
            placeholder="TFR-XXXX-XXXX"
            autoCapitalize="characters"
            className="min-h-12 flex-1 rounded-xl border border-tfr-line bg-tfr-mist px-4 font-mono text-base uppercase tracking-wide outline-none focus:border-tfr-blue focus:ring-2 focus:ring-tfr-blueSoft"
          />
          <button
            type="button"
            onClick={open}
            className="min-h-12 rounded-xl bg-tfr-navy px-6 text-sm font-semibold text-white transition active:scale-[0.99]"
          >
            Continue
          </button>
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 border-t border-tfr-line pt-4 text-xs text-tfr-ink/60">
          <div className="font-medium text-tfr-ink">Demo codes</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {samples.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setCode(account.portalCode)}
                className="rounded-lg bg-tfr-blueSoft px-2 py-1 font-mono text-[11px] text-tfr-blue"
              >
                {account.portalCode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { title: "Pay any amount", body: "Pay in full, pay part of it, or start with whatever you can today." },
          { title: "Set your own plan", body: "Pick weekly, every other week, or monthly and anchor it to payday." },
          { title: "No pressure", body: "Nothing here expires. You can stop, change, or cancel a plan at any time." },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-tfr-line bg-white p-4">
            <div className="text-sm font-semibold">{item.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-tfr-ink/70">{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
