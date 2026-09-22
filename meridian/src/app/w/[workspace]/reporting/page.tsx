"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Metric, PageHeader } from "@/components/meridian/legacy";
import { money } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface AnalyticsPayload {
  leadsByStatus: Record<string, number>;
  leadsBySide: Record<string, number>;
  slaBreaches: number;
  openTasks: number;
  portfolios: number;
  faceValue: number;
  sellerPrice: number;
  email: { campaigns: number; intended: number; delivered: number; failed: number; skipped: number };
  formSubmissions: number;
  seoHealth: number | null;
  seoHost: string | null;
  firstPartyPageviews: number;
  recentPaths: Array<{ path: string; at: string; forwarded: boolean }>;
  ga: { measurementId: string | null; publicSnippet: boolean; measurementProtocol: boolean; propertyId: string | null; hint: string };
}

export default function ReportingPage() {
  const { workspaceId } = useActiveWorkspace();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/analytics?workspace=${workspaceId}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Analytics failed");
        setData(payload);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Analytics failed"));
  }, [workspaceId]);

  const statusEntries = Object.entries(data?.leadsByStatus ?? {});
  const sideEntries = Object.entries(data?.leadsBySide ?? {});

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Reporting"
        title="Analytics"
        subtitle="Live server counts. Google numbers appear only after Measurement Protocol is configured, and this page never fabricates them."
      />
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold">Google Analytics 4</div>
          <Badge tone={data?.ga.measurementProtocol ? "good" : "warn"}>
            {data?.ga.measurementProtocol ? "forwarding" : "not forwarding"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{data?.ga.hint ?? "Loading analytics status…"}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Snippet {data?.ga.publicSnippet ? "on" : "off"}
          {data?.ga.measurementId ? ` · ${data.ga.measurementId}` : ""}
          {data?.ga.propertyId ? ` · property ${data.ga.propertyId}` : ""}
        </p>
      </Card>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="SLA breaches" value={String(data?.slaBreaches ?? "—")} />
        <Metric label="Open tasks" value={String(data?.openTasks ?? "—")} />
        <Metric label="Form submissions" value={String(data?.formSubmissions ?? "—")} />
        <Metric label="First-party page views" value={String(data?.firstPartyPageviews ?? "—")} hint="Stored in Meridian" />
        <Metric label="Portfolio face" value={data ? money(data.faceValue) : "—"} hint={`${data?.portfolios ?? 0} books`} />
        <Metric label="Seller price" value={data ? money(data.sellerPrice) : "—"} />
        <Metric
          label="Email delivered"
          value={data ? `${data.email.delivered}/${data.email.intended}` : "—"}
          hint={`${data?.email.campaigns ?? 0} campaigns · ${data?.email.failed ?? 0} failed`}
        />
        <Metric
          label="SEO health"
          value={data?.seoHealth === null || data?.seoHealth === undefined ? "—" : String(data.seoHealth)}
          hint={data?.seoHost ?? "No completed crawl"}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 font-semibold">Leads by status</div>
          {statusEntries.length === 0 ? <p className="text-sm text-muted-foreground">No leads on the server yet.</p> : null}
          <ul className="space-y-2 text-sm">
            {statusEntries.map(([status, count]) => (
              <li key={status} className="flex justify-between gap-3">
                <span>{status}</span>
                <span className="tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="mb-3 font-semibold">Leads by side</div>
          {sideEntries.length === 0 ? <p className="text-sm text-muted-foreground">No leads on the server yet.</p> : null}
          <ul className="space-y-2 text-sm">
            {sideEntries.map(([side, count]) => (
              <li key={side} className="flex justify-between gap-3">
                <span>{side}</span>
                <span className="tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 font-semibold">Recent first-party paths</div>
          {(data?.recentPaths.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Browse the app to record page views. This list is Meridian’s own log.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data?.recentPaths.map((event) => (
                <li key={`${event.at}-${event.path}`} className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{event.path}</span>
                  <span className="text-muted-foreground">
                    {event.forwarded ? "forwarded to GA4" : "first-party only"} · {event.at.slice(11, 19)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
