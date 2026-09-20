"use client";

import { Badge, Card, PageHeader } from "@/components/meridian/legacy";
import { compact } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function CmsPage() {
  const { config, data } = useActiveWorkspace();
  return (
    <div>
      <PageHeader
        eyebrow="Content Hub / CMS"
        title="Pages & blog"
        subtitle={`Hosted content for ${config.domain} — website, landing, and blog objects.`}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {data.pages.map((page) => (
          <Card key={page.id} className="p-5">
            <div className="flex items-center justify-between">
              <Badge>{page.type}</Badge>
              <Badge tone={page.status === "published" ? "good" : "warn"}>{page.status}</Badge>
            </div>
            <div className="mt-2 text-lg font-semibold">{page.title}</div>
            <div className="text-sm text-ink-500">{page.slug}</div>
            <p className="mt-3 text-sm text-ink-600">{page.excerpt}</p>
            <div className="mt-3 text-xs text-ink-400">
              {compact(page.views)} views · updated {page.updatedAt}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
