import Link from "next/link";
import { WORKSPACES } from "@/lib/workspaces";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-ink-950 text-white">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-10">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-wide">MERIDIAN</div>
          <div className="text-xs text-ink-300">Enterprise · iOS + Web · Integrated AI</div>
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
            — two fully themed workspaces. Triton first. Crypto desk ready to rebrand.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {Object.values(WORKSPACES).map((workspace) => (
              <Link
                key={workspace.id}
                href={`/w/${workspace.id}/home`}
                className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-white/25 hover:bg-white/10"
              >
                <div
                  className="mb-6 h-28 rounded-2xl"
                  style={{ background: workspace.theme.hero }}
                />
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
                <div className="mt-6 text-sm font-medium" style={{ color: workspace.theme.accent }}>
                  Open workspace →
                </div>
              </Link>
            ))}
          </div>
        </div>
        <p className="text-xs text-ink-500">
          Demo data only. Triton does not contact consumers. Aether is institutional crypto — replace
          branding when the second firm is named. Consumer collections live in{" "}
          <a className="underline" href="http://localhost:3001">
            Cove
          </a>{" "}
          (unlicensed-state floor).
        </p>
      </div>
    </div>
  );
}
