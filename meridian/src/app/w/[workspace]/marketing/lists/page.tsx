"use client";

import { useEffect, useState } from "react";
import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { PageHeader } from "@/components/meridian/legacy";
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
  const [submissions, setSubmissions] = useState<Array<{ id: string; formId: string; status: string; at: string; pageUrl: string }>>([]);
  const [snippet, setSnippet] = useState("");

  useEffect(() => {
    void fetch(`/api/segments?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((payload) => setServerSegments(payload.segments ?? []));
    void fetch(`/api/forms/submit?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((payload) => setSubmissions(payload.submissions ?? []));
    void fetch(`/api/platform?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((payload) => setSnippet(payload.forms?.snippet ?? ""));
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
      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-ink-400">Website submissions</h2>
      <DataTable
        headers={["When", "Form", "Status", "Page"]}
        rows={submissions.map((submission) => ({
          key: submission.id,
          cells: [submission.at, submission.formId, submission.status, submission.pageUrl || "—"],
        }))}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        Install this on www.debtmarket.net. Submissions create a scored lead in this workspace.
      </p>
      {snippet ? <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-3 text-xs">{snippet}</pre> : null}
    </div>
  );
}
