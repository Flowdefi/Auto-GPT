"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { LIFETIME_PRICE_USD } from "@/lib/commerce";

interface BillingPayload {
  account: { email: string; name: string; licensed: boolean };
  billing: {
    licensed: boolean;
    polar: boolean;
    licenses: Array<{ id: string; prefix: string; kind: string; redeemedAt?: string }>;
    reserved: { hint: string } | null;
  };
}

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  revoked: boolean;
}

function BillingInner() {
  const router = useRouter();
  const checkoutId = useSearchParams().get("checkout_id");
  const [data, setData] = useState<BillingPayload | null>(null);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [licenseKey, setLicenseKey] = useState("");
  const [keyName, setKeyName] = useState("CLI");
  const [minted, setMinted] = useState<string | null>(null);
  const [secretName, setSecretName] = useState("OPENAI_API_KEY");
  const [secretValue, setSecretValue] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const me = await fetch("/api/auth/me");
    const identity = (await me.json()) as { account: { email: string } | null };
    if (!identity.account) {
      router.push("/login?next=/billing");
      return;
    }
    const status = await fetch("/api/billing/status");
    if (!status.ok) {
      router.push("/login?next=/billing");
      return;
    }
    const payload = (await status.json()) as BillingPayload;
    setData(payload);
    if (payload.billing.licensed) {
      const listed = await fetch("/api/keys");
      if (listed.ok) {
        const body = (await listed.json()) as { keys: KeyRow[] };
        setKeys(body.keys);
      }
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutId]);

  async function checkout() {
    setBusy("checkout");
    setError(null);
    const response = await fetch("/api/billing/checkout", { method: "POST" });
    const payload = (await response.json()) as { url?: string; error?: string; alreadyLicensed?: boolean };
    setBusy(null);
    if (payload.alreadyLicensed && payload.url) {
      router.push(payload.url);
      return;
    }
    if (!response.ok || !payload.url) {
      setError(payload.error ?? "Checkout is unavailable. Redeem a minted mdl_ key instead.");
      return;
    }
    window.location.href = payload.url;
  }

  async function redeem(event: FormEvent) {
    event.preventDefault();
    setBusy("redeem");
    setError(null);
    const response = await fetch("/api/billing/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: licenseKey }),
    });
    const payload = (await response.json()) as { error?: string; next?: string };
    setBusy(null);
    if (!response.ok) {
      setError(payload.error ?? "Could not redeem");
      return;
    }
    setNotice("Lifetime seat unlocked.");
    router.push(payload.next ?? "/w/triton/home");
  }

  async function mintKey(event: FormEvent) {
    event.preventDefault();
    setBusy("key");
    setError(null);
    const response = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName }),
    });
    const payload = (await response.json()) as { key?: string; error?: string };
    setBusy(null);
    if (!response.ok || !payload.key) {
      setError(payload.error ?? "Could not create API key");
      return;
    }
    setMinted(payload.key);
    await refresh();
  }

  async function saveSecret(event: FormEvent) {
    event.preventDefault();
    setBusy("secret");
    setError(null);
    const response = await fetch("/api/secrets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: "triton", name: secretName, value: secretValue }),
    });
    const payload = (await response.json()) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setError(payload.error ?? "Could not store secret");
      return;
    }
    setSecretValue("");
    setNotice("Encrypted provider key stored for this seat.");
  }

  return (
    <MarketingShell
      action={
        <Link href="/pricing" className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/40">
          Pricing
        </Link>
      }
    >
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Billing</p>
        <h1 className="mt-3 text-3xl font-semibold">
          {data?.billing.licensed ? "Your lifetime seat" : `Unlock Meridian · $${LIFETIME_PRICE_USD}`}
        </h1>
        <p className="mt-2 text-sm text-ink-400">
          {data?.account.email ?? "Signed in"} — Polar checkout or a minted <code>mdl_</code> license.
        </p>
        {checkoutId ? (
          <p className="mt-3 text-sm text-emerald-300">
            Polar returned checkout {checkoutId}. If the webhook is configured the seat activates automatically;
            otherwise paste the license Polar emailed, or wait a moment and refresh.
          </p>
        ) : null}
        {data?.billing.reserved ? (
          <p className="mt-3 text-sm text-emerald-300">{data.billing.reserved.hint}</p>
        ) : null}
        {notice ? <p className="mt-3 text-sm text-emerald-300">{notice}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

        {!data?.billing.licensed ? (
          <div className="mt-8 grid gap-4">
            <button
              type="button"
              onClick={() => void checkout()}
              disabled={busy === "checkout"}
              className="flex h-12 items-center justify-center rounded-xl bg-white text-sm font-semibold text-ink-950 disabled:opacity-60"
            >
              {busy === "checkout" ? "Opening Polar…" : `Pay $${LIFETIME_PRICE_USD} once with Polar`}
            </button>
            <form onSubmit={(event) => void redeem(event)} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-medium">Redeem a minted license</div>
              <p className="mt-1 text-xs text-ink-400">
                Self-host: <code>npm run license:mint -- you@example.com</code>
              </p>
              <input
                value={licenseKey}
                onChange={(event) => setLicenseKey(event.target.value)}
                placeholder="mdl_…"
                className="mt-3 h-11 w-full rounded-xl border border-white/15 bg-ink-950 px-3 font-mono text-sm outline-none focus:border-white/40"
              />
              <button
                type="submit"
                disabled={busy === "redeem"}
                className="mt-3 h-10 rounded-xl border border-white/20 px-4 text-sm"
              >
                Redeem
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            <Link
              href="/w/triton/home"
              className="flex h-12 items-center justify-center rounded-xl bg-white text-sm font-semibold text-ink-950"
            >
              Open Triton workspace
            </Link>
            <form onSubmit={(event) => void mintKey(event)} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-medium">Meridian API keys</div>
              <p className="mt-1 text-xs text-ink-400">
                Send <code>Authorization: Bearer mk_live_…</code> on /api/* after you buy a seat.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  className="h-11 flex-1 rounded-xl border border-white/15 bg-ink-950 px-3 text-sm outline-none"
                />
                <button type="submit" className="h-11 rounded-xl border border-white/20 px-4 text-sm">
                  Create
                </button>
              </div>
              {minted ? (
                <p className="mt-3 break-all font-mono text-xs text-emerald-300">
                  Copy now: {minted}
                </p>
              ) : null}
              <ul className="mt-3 space-y-1 text-xs text-ink-400">
                {keys.map((key) => (
                  <li key={key.id}>
                    {key.name} · {key.prefix}… {key.revoked ? "(revoked)" : ""}
                  </li>
                ))}
              </ul>
            </form>
            <form onSubmit={(event) => void saveSecret(event)} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-medium">Bring-your-own provider keys</div>
              <p className="mt-1 text-xs text-ink-400">
                Encrypted at rest. OpenAI-compatible, Resend, AgentMail, SERP, or Graph. Env vars still win.
              </p>
              <select
                value={secretName}
                onChange={(event) => setSecretName(event.target.value)}
                className="mt-3 h-11 w-full rounded-xl border border-white/15 bg-ink-950 px-3 text-sm"
              >
                {[
                  "OPENAI_API_KEY",
                  "OPENAI_BASE_URL",
                  "RESEND_API_KEY",
                  "AGENTMAIL_API_KEY",
                  "SERP_PROVIDER_KEY",
                  "MS_CLIENT_SECRET",
                ].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="password"
                value={secretValue}
                onChange={(event) => setSecretValue(event.target.value)}
                placeholder="Paste key"
                className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-ink-950 px-3 text-sm outline-none"
              />
              <button type="submit" className="mt-3 h-10 rounded-xl border border-white/20 px-4 text-sm">
                Store encrypted
              </button>
            </form>
          </div>
        )}
      </div>
    </MarketingShell>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingInner />
    </Suspense>
  );
}
