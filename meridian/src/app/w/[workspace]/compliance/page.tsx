"use client";

import { Badge, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function CompliancePage() {
  const { config, data } = useActiveWorkspace();
  const openCompliance = data.tickets.filter((ticket) => ticket.pipeline === "Compliance" && ticket.status !== "resolved");

  return (
    <div>
      <PageHeader
        eyebrow="Governance"
        title="Compliance"
        subtitle={
          config.id === "triton"
            ? "Institutional-only desk. FDCPA-aware. RMAI-aligned. No consumer contact. HIPAA BAA before medical tapes."
            : "Institutional-only desk. KYC/AML. Travel Rule. Qualified custody. Recorded firms."
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {config.complianceBadges.map((badge) => (
          <Badge key={badge} tone="accent">
            {badge}
          </Badge>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="font-semibold">Playbook</div>
          {config.id === "triton" ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-600">
              <li>Triton buys and brokers charged-off receivables. It is not a consumer collection agency.</li>
              <li>Never discuss an individual consumer debt. Redirect consumers to the current collector.</li>
              <li>NDA before any tape. BAA before any medical extract.</li>
              <li>Buyer bids require a current license pack (state coverage).</li>
              <li>Document chain-of-title, put-backs, and media completeness on every award.</li>
            </ul>
          ) : (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-600">
              <li>No retail onboarding from this desk.</li>
              <li>Travel Rule (IVMS-101) on transfers ≥ $3,000.</li>
              <li>Prefer qualified custody rails for settlement.</li>
              <li>Firm quotes are held for a stated window on a recorded line.</li>
              <li>Listing packs need unlock schedules and MM wallet whitelist.</li>
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <div className="font-semibold">Open compliance tickets</div>
          <div className="mt-3 space-y-3">
            {openCompliance.length === 0 ? <div className="text-sm text-ink-500">Clear.</div> : null}
            {openCompliance.map((ticket) => (
              <div key={ticket.id}>
                <div className="text-sm font-medium">{ticket.subject}</div>
                <div className="text-xs text-ink-500">{ticket.preview}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
