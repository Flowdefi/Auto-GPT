"use client";

import { useEffect, useState } from "react";
import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { Badge, Metric, PageHeader } from "@/components/meridian/legacy";
import { pct } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface ServerCampaign {
  id: string;
  name: string;
  status: string;
  subject: string;
  intended: number;
  delivered: number;
  opened?: number;
  clicked?: number;
  failed: number;
}

export default function CampaignsPage() {
  const { workspaceId } = useActiveWorkspace();
  const [campaigns, setCampaigns] = useState<ServerCampaign[]>([]);

  useEffect(() => {
    void fetch("/api/email/campaigns")
      .then((response) => response.json())
      .then((payload) => {
        const rows = (payload.campaigns ?? []) as Array<ServerCampaign & { workspaceId: string }>;
        setCampaigns(rows.filter((row) => row.workspaceId === workspaceId));
      });
  }, [workspaceId]);

  const sent = campaigns.reduce((sum, campaign) => sum + (campaign.delivered || campaign.intended || 0), 0);
  const opened = campaigns.reduce((sum, campaign) => sum + (campaign.opened ?? 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Marketing Hub"
        title="Campaigns"
        subtitle="Live sends from the blast tool — opens and clicks come from the tracking pixel, not demo seed."
      />
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
        <Metric label="Delivered" value={sent.toLocaleString()} />
        <Metric label="Open rate" value={sent ? pct((opened / sent) * 100) : "—"} />
        <Metric label="Campaigns" value={String(campaigns.length)} />
      </div>
      <DataTable
        headers={["Campaign", "Status", "Subject", "Intended", "Delivered", "Opened", "Clicked"]}
        rows={campaigns.map((campaign) => ({
          key: campaign.id,
          cells: [
            campaign.name,
            <Badge key="s" tone={campaign.status === "sent" ? "good" : "neutral"}>{campaign.status}</Badge>,
            campaign.subject,
            String(campaign.intended),
            String(campaign.delivered),
            String(campaign.opened ?? 0),
            String(campaign.clicked ?? 0),
          ],
        }))}
      />
    </div>
  );
}
