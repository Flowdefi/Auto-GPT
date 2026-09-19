"use client";

import { Card, Metric, PageHeader } from "@/components/ui";
import { money } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function ReportingPage() {
  const { data } = useActiveWorkspace();
  const revenue = data.deals
    .filter((deal) => deal.forecast === "closed" || deal.stage.toLowerCase().includes("close") || deal.stage.toLowerCase().includes("post"))
    .reduce((sum, deal) => sum + deal.amount, 0);
  return (
    <div>
      <PageHeader eyebrow="Reporting" title="Dashboards" subtitle="Cross-hub insights — sales, marketing, and marketplace coverage." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Closed / post-trade" value={money(revenue)} />
        <Metric label="Campaign replies" value={String(data.campaigns.reduce((sum, campaign) => sum + campaign.replies, 0))} />
        <Metric label="Open tickets" value={String(data.tickets.filter((ticket) => ticket.status !== "resolved").length)} />
      </div>
      <div className="grid gap-3">
        {data.reports.map((report) => (
          <Card key={report.id} className="p-5">
            <div className="text-xs uppercase text-ink-400">{report.hub}</div>
            <div className="mt-1 font-semibold">{report.name}</div>
            <p className="mt-2 text-sm text-ink-600">{report.insight}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
