"use client";

import { DataTable } from "@/components/tables";
import { Badge, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function SeoPage() {
  const { config, data } = useActiveWorkspace();
  return (
    <div>
      <PageHeader
        eyebrow="SEO + AEO"
        title="Recommendations & keywords"
        subtitle={`Content Hub SEO for ${config.domain} — ranks, intent, and audit items.`}
      />
      <div className="mb-6 grid gap-3">
        {data.audits.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center gap-2">
              <Badge tone={item.severity === "high" ? "bad" : item.severity === "medium" ? "warn" : "neutral"}>
                {item.severity}
              </Badge>
              <div className="font-medium">{item.title}</div>
            </div>
            <div className="mt-1 text-sm text-ink-600">{item.recommendation}</div>
            <div className="mt-1 text-xs text-ink-400">{item.page}</div>
          </Card>
        ))}
      </div>
      <DataTable
        headers={["Keyword", "Volume", "Position", "Difficulty", "Intent", "URL"]}
        rows={data.keywords.map((keyword) => ({
          key: keyword.id,
          cells: [
            keyword.term,
            keyword.volume.toLocaleString(),
            String(keyword.position),
            String(keyword.difficulty),
            keyword.intent,
            keyword.url,
          ],
        }))}
      />
    </div>
  );
}
