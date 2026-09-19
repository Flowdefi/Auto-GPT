"use client";

import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { Metric, PageHeader } from "@/components/ui";
import { money } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function ForecastPage() {
  const { workspaceId, data } = useActiveWorkspace();
  const groups = ["omit", "pipeline", "best_case", "commit", "closed"] as const;
  return (
    <div>
      <PageHeader eyebrow="Sales Hub" title="Forecast" subtitle="Commit vs best case vs pipeline — same categories as HubSpot Sales Hub Enterprise." />
      <Subnav
        current={`/w/${workspaceId}/sales/forecast`}
        items={[
          { href: `/w/${workspaceId}/sales/deals`, label: "Pipeline" },
          { href: `/w/${workspaceId}/sales/forecast`, label: "Forecast" },
          { href: `/w/${workspaceId}/sales/sequences`, label: "Sequences" },
        ]}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {(["pipeline", "best_case", "commit"] as const).map((key) => (
          <Metric
            key={key}
            label={key.replace("_", " ")}
            value={money(
              data.deals
                .filter((deal) =>
                  key === "pipeline"
                    ? deal.forecast !== "omit"
                    : key === "best_case"
                      ? deal.forecast === "best_case" || deal.forecast === "commit"
                      : deal.forecast === "commit",
                )
                .reduce((sum, deal) => sum + deal.amount, 0),
            )}
          />
        ))}
      </div>
      <DataTable
        headers={["Category", "Deals", "Amount"]}
        rows={groups.map((group) => {
          const deals = data.deals.filter((deal) => deal.forecast === group);
          return {
            key: group,
            cells: [group.replace("_", " "), String(deals.length), money(deals.reduce((sum, deal) => sum + deal.amount, 0))],
          };
        })}
      />
    </div>
  );
}
