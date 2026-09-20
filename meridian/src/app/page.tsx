import Link from "next/link";
import { WORKSPACES } from "@/lib/workspaces";
import { LIFETIME_PRICE_USD } from "@/lib/commerce";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-ink-950 text-white">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-10">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-wide">MERIDIAN</div>
          <div className="flex items-center gap-3 text-xs text-ink-300">
            <Link href="/pricing" className="hover:text-white">
              ${LIFETIME_PRICE_USD} lifetime
            </Link>
            <Link href="/login" className="rounded-full border border-white/15 px-3 py-1.5 hover:border-white/40">
              Sign in
            </Link>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
            Customer platform
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            HubSpot-class operations, purpose-built for specialized markets.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-300">
            Smart CRM, Sales, Marketing, Service, CMS, SEO, Automation, Reporting, and Meridian AI
            — two fully themed workspaces. One operator seat is ${LIFETIME_PRICE_USD} for life.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-ink-950"
            >
              Get lifetime access — ${LIFETIME_PRICE_USD}
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-5 text-sm"
            >
              Create account
            </Link>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {Object.values(WORKSPACES).map((workspace) => (
              <div key={workspace.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="mb-6 h-28 rounded-2xl" style={{ background: workspace.theme.hero }} />
                <div className="text-xs uppercase tracking-wide text-ink-400">
                  {workspace.id === "triton" ? "Full enterprise build" : "Thinner twin · rebrandable"}
                </div>
                <div className="mt-1 text-2xl font-semibold">{workspace.legalName}</div>
                <div className="text-sm text-ink-300">{workspace.product}</div>
                <p className="mt-3 text-sm text-ink-300">{workspace.tagline}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {workspace.complianceBadges.map((badge) => (
                    <span key={badge} className="rounded-full bg-white/10 px-2 py-1 text-[11px]">
                      {badge}
                    </span>
                  ))}
                </div>
                <p className="mt-6 text-sm text-ink-500">Included with a lifetime seat</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-ink-500">
          Workspaces stay locked until you buy or redeem a seat. Triton does not contact consumers. Aether is
          institutional crypto. Public website forms and unsubscribe links stay reachable without login.
        </p>
      </div>
    </div>
  );
}
