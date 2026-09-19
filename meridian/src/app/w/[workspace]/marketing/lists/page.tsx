"use client";

import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { PageHeader } from "@/components/ui";
import { pct } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function ListsPage() {
  const { workspaceId, data } = useActiveWorkspace();
  return (
    <div>
      <PageHeader eyebrow="Marketing Hub" title="Lists & forms" subtitle="Active lists (segments) and conversion forms on DebtMarket / Aether pages." />
      <Subnav
        current={`/w/${workspaceId}/marketing/lists`}
        items={[
          { href: `/w/${workspaceId}/marketing/campaigns`, label: "Campaigns" },
          { href: `/w/${workspaceId}/marketing/emails`, label: "Emails" },
          { href: `/w/${workspaceId}/marketing/bulk`, label: "Bulk send" },
          { href: `/w/${workspaceId}/marketing/lists`, label: "Lists & forms" },
        ]}
      />
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-400">Segments</h2>
      <DataTable
        headers={["List", "Count", "Definition"]}
        rows={data.segments.map((segment) => ({
          key: segment.id,
          cells: [segment.name, String(segment.count), segment.definition],
        }))}
      />
      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-ink-400">Forms</h2>
      <DataTable
        headers={["Form", "Page", "Submissions", "Conversion"]}
        rows={data.forms.map((form) => ({
          key: form.id,
          cells: [form.name, form.page, String(form.submissions), pct(form.conversion)],
        }))}
      />
    </div>
  );
}
