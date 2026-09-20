import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { LIFETIME_PRICE_USD } from "@/lib/commerce";

const INCLUDED = [
  "One named operator seat — forever, no renewal",
  "Triton and Aether workspaces after checkout",
  "Meridian API keys (mk_live_…) for your own automations",
  "Bring your own open-source keys: Ollama, vLLM, Resend, AgentMail, Polar",
  "Outlook sync, website forms, RAG graph, and the AI CTO",
  "Self-host with a minted mdl_ license if you do not use Polar",
];

export default function PricingPage() {
  return (
    <MarketingShell
      action={
        <Link href="/login" className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/40">
          Sign in
        </Link>
      }
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Pricing</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
        One operator. One payment. ${LIFETIME_PRICE_USD}.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-ink-300">
        Meridian is sold as a lifetime seat, not a subscription. Extra teammates each buy their own page.
        Polar is the open-source merchant of record. Self-hosters mint HMAC license keys.
      </p>
      <div className="mt-10 max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8">
        <div className="text-xs uppercase tracking-wide text-ink-400">Lifetime seat</div>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-5xl font-semibold">${LIFETIME_PRICE_USD}</span>
          <span className="pb-1 text-sm text-ink-400">USD · once</span>
        </div>
        <ul className="mt-6 space-y-2 text-sm text-ink-200">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/signup"
          className="mt-8 flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-ink-950"
        >
          Create account and buy
        </Link>
        <p className="mt-3 text-center text-xs text-ink-500">
          Already paid? <Link href="/login" className="underline">Sign in</Link> and redeem your mdl_ key.
        </p>
      </div>
    </MarketingShell>
  );
}
