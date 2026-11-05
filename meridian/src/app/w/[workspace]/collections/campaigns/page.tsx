"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { CollectorChrome } from "@/components/collections/collector-chrome";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Campaign {
  id: string;
  name: string;
  status: string;
  maxConcurrent: number;
  queue: string[];
  attempts: number;
}

interface Attempt {
  id: string;
  result: string;
  reasonCode: string;
  at: string;
}

export default function CampaignsPage() {
  const { workspaceId } = useActiveWorkspace();
  const [name, setName] = useState("Morning desk");
  const [concurrent, setConcurrent] = useState(1);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...payload }),
    });
    const body = (await response.json()) as { error?: string; campaigns?: Campaign[]; attempts?: Attempt[] };
    setNotice(body.error ?? null);
    if (body.campaigns) setCampaigns(body.campaigns);
    if (body.attempts) setAttempts(body.attempts);
  }

  useEffect(() => {
    void post({ op: "campaign_list" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  return (
    <div>
      <CollectorChrome shortcuts={[{ key: "b", label: "Build the campaign", run: () => void post({ op: "campaign_create", campaignName: name, maxConcurrent: concurrent }) }]} />
      <PageHeader eyebrow="Collector" title="Campaign dialer" subtitle="Builds a list from workable accounts, runs each one through the compliance gate, and paces live or sandbox calls by the concurrent cap. Every attempt is logged with a reason code. The 7-in-7 cap is the gate, not a separate counter." />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Card className="mb-4 grid gap-3 p-4 text-sm sm:grid-cols-2">
        <label className="grid gap-1">Name
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={name} onChange={(event) => setName(event.target.value)} aria-label="Campaign name" />
        </label>
        <label className="grid gap-1">Concurrent calls
          <input className="min-h-11 rounded-xl border bg-transparent px-3" type="number" min={1} max={5} value={concurrent} onChange={(event) => setConcurrent(Number(event.target.value))} aria-label="Concurrent calls" />
        </label>
        <Button onClick={() => void post({ op: "campaign_create", campaignName: name, maxConcurrent: concurrent }).then(() => post({ op: "campaign_list" }))}>Build campaign</Button>
      </Card>
      <div className="grid gap-3">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{campaign.name}</span>
              <Badge>{campaign.status}</Badge>
              <span>{campaign.queue.length} waiting · {campaign.maxConcurrent} at a time · {campaign.attempts} logged</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button tone="soft" onClick={() => void post({ op: "campaign_start", campaignId: campaign.id, running: true })}>Start</Button>
              <Button tone="soft" onClick={() => void post({ op: "campaign_start", campaignId: campaign.id, running: false })}>Pause</Button>
              <Button tone="soft" onClick={() => void post({ op: "campaign_attempts", campaignId: campaign.id })}>Attempts</Button>
            </div>
          </Card>
        ))}
        {attempts.length > 0 ? (
          <Card className="p-4 text-sm">
            {attempts.slice(0, 12).map((attempt) => (
              <p key={attempt.id}>{attempt.result} · {attempt.reasonCode}</p>
            ))}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
