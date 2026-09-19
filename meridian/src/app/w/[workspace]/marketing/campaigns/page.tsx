"use client";

import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { Badge, Metric, PageHeader } from "@/components/ui";
import { pct } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function CampaignsPage() {
  const { workspaceId, data } = useActiveWorkspace();
  const sent = data.campaigns.reduce((sum, campaign) => sum + campaign.sent, 0);
  const opened = data.campaigns.reduce((sum, campaign) => sum + campaign.opened, 0);
  return (
    <div>
      <PageHeader eyebrow="Marketing Hub" title="Campaigns" subtitle="Email, ads, social, events, and sequences on one object — HubSpot Marketing Hub pattern." />
      <Subnav
        current={`/w/${workspaceId}/marketing/campaigns`}
        items={[
          { href: `/w/${workspaceId}/marketing/campaigns`, label: "Campaigns" },
          { href: `/w/${workspaceId}/marketing/emails`, label: "Emails" },
          { href: `/w/${workspaceId}/marketing/bulk`, label: "Bulk send" },
          { href: `/w/${workspaceId}/marketing/lists`, label: "Lists & forms" },
        ]}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Sends" value={sent.toLocaleString()} />
        <Metric label="Open rate" value={sent ? pct((opened / sent) * 100) : "—"} />
        <Metric label="Replies" value={String(data.campaigns.reduce((sum, campaign) => sum + campaign.replies, 0))} />
      </div>
      <DataTable
        headers={["Campaign", "Type", "Status", "Audience", "Sent", "Opened", "Clicked"]}
        rows={data.campaigns.map((campaign) => ({
          key: campaign.id,
          cells: [
            campaign.name,
            campaign.type,
            <Badge key="s" tone={campaign.status === "running" ? "good" : "neutral"}>{campaign.status}</Badge>,
            campaign.audience,
            String(campaign.sent),
            String(campaign.opened),
            String(campaign.clicked),
          ],
        }))}
      />
    </div>
  );
}
