"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { MarketingShell } from "@/components/marketing-shell";
import { useSelfHosted } from "@/components/self-host";
import { PASSWORD_MIN } from "@/lib/commerce";

function safeDest(value: string, privateDesk: boolean): string | null {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  const path = value.split("?")[0] ?? value;
  if (privateDesk && (path === "/signup" || path === "/pricing" || path.startsWith("/billing"))) return "/w/triton/home";
  return value;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const privateDesk = useSelfHosted();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const denied = params.get("error");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = (await response.json()) as { error?: string; next?: string };
    setBusy(false);
    if (!response.ok) {
      setError(payload.error ?? "Could not sign in");
      return;
    }
    router.push(safeDest(next, privateDesk) || payload.next || "/w/triton/home");
    router.refresh();
  }

  return (
    <MarketingShell
      commercial={!privateDesk}
      action={
        privateDesk ? undefined : (
          <Link href="/signup" className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/40">
            Create account
          </Link>
        )
      }
    >
      <form onSubmit={(event) => void submit(event)} className="mx-auto w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Sign in</p>
        <h1 className="mt-3 text-3xl font-semibold">{privateDesk ? "Owner sign-in" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-ink-400">
          {privateDesk ? "Private desk. Email and password for an owner account." : "A lifetime seat is required to open a workspace."}
        </p>
        {denied === "denied" ? <p className="mt-3 text-sm text-red-300">That email is not an owner of this desk.</p> : null}
        {denied === "access" ? (
          <p className="mt-3 text-sm text-ink-400">Cloudflare Access did not open an owner session. Use the owner password.</p>
        ) : null}
        <label className="mt-8 block text-xs uppercase tracking-wide text-ink-400">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none focus:border-white/40"
        />
        <label className="mt-4 block text-xs uppercase tracking-wide text-ink-400">Password</label>
        <input
          type="password"
          required
          minLength={PASSWORD_MIN}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-sm outline-none focus:border-white/40"
        />
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-white text-sm font-semibold text-ink-950 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </MarketingShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
