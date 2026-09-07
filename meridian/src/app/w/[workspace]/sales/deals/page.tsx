"use client";

import Link from "next/link";
import { Subnav } from "@/components/subnav";
import { Badge, Card, PageHeader } from "@/components/ui";
import { money } from "@/lib/format";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function DealsBoardPage() {
  const { workspaceId, config, data } = useActiveWorkspace();
  const moveDeal = useMeridian((state) => state.moveDeal);

  return (
    <div>
      <PageHeader
        eyebrow="Sales Hub"
        title={config.dealNounPlural}
        subtitle="Enterprise pipeline, forecast categories, and stage-level next steps."
      />
      <Subnav
        current={`/w/${workspaceId}/sales/deals`}
        items={[
          { href: `/w/${workspaceId}/sales/deals`, label: "Pipeline" },
          { href: `/w/${workspaceId}/sales/forecast`, label: "Forecast" },
          { href: `/w/${workspaceId}/sales/sequences`, label: "Sequences" },
        ]}
      />
      <div className="flex gap-3 overflow-x-auto pb-4">
        {config.pipeline.map((stage) => {
          const deals = data.deals.filter((deal) => deal.stage === stage);
          const total = deals.reduce((sum, deal) => sum + deal.amount, 0);
          return (
            <section key={stage} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-500">
                <span>{stage}</span>
                <span>{money(total)}</span>
              </div>
              <div className="space-y-2">
                {deals.map((deal) => (
                  <Card key={deal.id} className="p-3">
                    <Link href={`/w/${workspaceId}/sales/deals/${deal.id}`} className="text-sm font-semibold">
                      {deal.name}
                    </Link>
                    <div className="mt-1 text-sm text-ink-600">{money(deal.amount)}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge>{deal.forecast}</Badge>
                      <select
                        className="max-w-[9rem] rounded-lg border border-ink-100 bg-ink-50 px-1 py-1 text-[11px]"
                        value={deal.stage}
                        onChange={(event) => moveDeal(deal.id, event.target.value)}
                      >
                        {config.pipeline.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
