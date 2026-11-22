"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/tables";
import { Card, PageHeader } from "@/components/meridian/legacy";
import { activityLabel } from "@/lib/desk-activity";
import { when } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";
import type { DeskActivity } from "@/server/models";

export default function ActivitiesPage() {
  const { workspaceId } = useActiveWorkspace();
  const [rows, setRows] = useState<DeskActivity[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/activities?workspace=${workspaceId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load activities");
        return (await response.json()) as { activities?: DeskActivity[] };
      })
      .then((body) => {
        if (!cancelled) setRows(body.activities ?? []);
      })
      .catch((error: unknown) => {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "Could not load activities");
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Activities"
        subtitle="Email, drafts, NDAs, and notes logged by the desk or the email bot."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      {rows === null ? <Card className="p-5 text-sm text-muted-foreground">Loading activities…</Card> : null}
      {rows && rows.length === 0 ? <Card className="p-5 text-sm text-muted-foreground">No activities yet.</Card> : null}
      {rows && rows.length > 0 ? (
        <DataTable
          headers={["When", "Kind", "Subject", "Source", "Contact"]}
          rows={rows.map((activity) => ({
            key: activity.id,
            href: activity.contactId ? `/w/${workspaceId}/crm/contacts/${activity.contactId}` : undefined,
            cells: [
              when(activity.at),
              activityLabel(activity.type),
              activity.subject,
              activity.source || "—",
              activity.contactId ? "Open" : "—",
            ],
          }))}
        />
      ) : null}
    </div>
  );
}
