"use client";

import { useEffect, useState } from "react";
import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { PageHeader } from "@/components/meridian/legacy";
import { pct } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface ServerSegment {
  id: string;
  name: string;
  description: string;
  size: number;
}

export default function ListsPage() {
  const { workspaceId, data } = useActiveWorkspace();
  const [serverSegments, setServerSegments] = useState<ServerSegment[]>([]);

  useEffect(() => {
    void fetch(`/api/segments?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((payload) => setServerSegments(payload.segments ?? []));
  }, [workspaceId]);

  const rows =
    serverSegments.length > 0
      ? serverSegments.map((segment) => ({
          key: segment.id,
          cells: [segment.name, String(segment.size), segment.description],
        }))
      : data.segments.map((segment) => ({
          key: segment.id,
          cells: [segment.name, String(segment.count), segment.definition],
        }));

  return (
    <div>
      <PageHeader
        eyebrow="Marketing Hub"
        title="Lists & forms"
        subtitle="Live CRM segments plus the website forms that create leads in Meridian."
      />
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
      <DataTable headers={["List", "Count", "Definition"]} rows={rows} />
      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-ink-400">Forms</h2>
      <DataTable
        headers={["Form", "Page", "Submissions", "Conversion"]}
        rows={data.forms.map((form) => ({
          key: form.id,
          cells: [form.name, form.page, String(form.submissions), pct(form.conversion)],
        }))}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Capture script: <code>/api/forms/embed.js</code> · POST <code>/api/forms/submit</code>
      </p>
    </div>
  );
}
