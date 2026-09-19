"use client";

import { Subnav } from "@/components/subnav";
import { Card, PageHeader } from "@/components/ui";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function EmailsPage() {
  const { workspaceId, data } = useActiveWorkspace();
  return (
    <div>
      <PageHeader eyebrow="Marketing Hub" title="Marketing email" subtitle="Templates with industry-safe copy — no consumer collection language." />
      <Subnav
        current={`/w/${workspaceId}/marketing/emails`}
        items={[
          { href: `/w/${workspaceId}/marketing/campaigns`, label: "Campaigns" },
          { href: `/w/${workspaceId}/marketing/emails`, label: "Emails" },
          { href: `/w/${workspaceId}/marketing/bulk`, label: "Bulk send" },
          { href: `/w/${workspaceId}/marketing/lists`, label: "Lists & forms" },
        ]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {data.emails.map((email) => (
          <Card key={email.id} className="p-5">
            <div className="text-xs uppercase text-ink-400">{email.status}</div>
            <div className="mt-1 text-lg font-semibold">{email.name}</div>
            <div className="mt-1 text-sm text-ink-600">{email.subject}</div>
            <p className="mt-3 text-sm text-ink-500">{email.preview}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
