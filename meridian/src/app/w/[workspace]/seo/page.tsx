"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/tables";
import { Badge, Button, Card, Field, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface RankPlan {
  crawled: boolean;
  note: string;
  items: Array<{ keywordId: string; term: string; position: number | null; label: string; measured: boolean; suggestions: string[] }>;
}

interface SeoState {
  latest?: { health: number; pagesCrawled: number; host: string; status: string };
  issues: Array<{ code: string; title: string; severity: string; count: number; recommendation: string; urls: string[] }>;
  keywords: Array<{ id: string; term: string; volume: number; difficulty: number; intent: string; tracked: boolean; targetUrl?: string }>;
  briefs: Array<{ id: string; keyword: string; title: string; wordTarget: number }>;
  provider: { name: string; configured: boolean };
  pages: Array<{ url: string; title: string; wordCount: number; pageRank: number }>;
  rankPlan?: RankPlan;
}

export default function SeoPage() {
  const { workspaceId, config } = useActiveWorkspace();
  const [state, setState] = useState<SeoState | null>(null);
  const [seed, setSeed] = useState("");
  const [briefKw, setBriefKw] = useState(workspaceId === "triton" ? "sell charged-off debt" : "institutional OTC crypto");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/seo?workspace=${workspaceId}`);
    setState(await response.json());
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function run(action: string, extra: Record<string, string | number | boolean> = {}) {
    setBusy(action);
    setNotice(null);
    const response = await fetch("/api/seo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, action, ...extra }),
    });
    const payload = await response.json();
    setBusy(null);
    if (!response.ok) {
      setNotice(payload.error ?? "SEO action failed");
      return;
    }
    setNotice(
      action === "crawl"
        ? `Crawled ${payload.crawl?.pagesCrawled ?? 0} pages · health ${payload.crawl?.health ?? "—"} · ${payload.issues} issues`
        : action === "brief"
          ? `Brief ready: ${payload.brief?.title}`
          : action === "ranks"
            ? payload.note ?? "Rank refresh finished."
            : action === "track"
              ? "Tracking updated. Position stays unmeasured until a rank point is stored."
              : "Done.",
    );
    await refresh();
  }

  return (
    <div>
      <PageHeader
        eyebrow="SEO + AEO"
        title="Site intelligence"
        subtitle={`SEMrush-class crawl, audit, keywords, and briefs for ${config.domain}. Ranks stay empty until a SERP provider is configured — we do not invent positions.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy !== null} onClick={() => void run("crawl", { maxPages: 20 })}>
              {busy === "crawl" ? "Crawling…" : "Crawl site"}
            </Button>
            <Button tone="soft" disabled={busy !== null} onClick={() => void run("research", { seed })}>
              {busy === "research" ? "Researching…" : "Research keywords"}
            </Button>
            <Button tone="soft" disabled={busy !== null} onClick={() => void run("ranks")}>
              {busy === "ranks" ? "Checking…" : "Refresh ranks"}
            </Button>
          </div>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Site health</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{state?.latest?.health ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            {state?.latest ? `${state.latest.pagesCrawled} pages on ${state.latest.host}` : "No crawl yet"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Issues</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{state?.issues.length ?? 0}</div>
          <div className="text-xs text-muted-foreground">Grouped by rule</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground">Keyword provider</div>
          <div className="mt-1 text-lg font-semibold">{state?.provider.name ?? "local-estimate"}</div>
          <div className="text-xs text-muted-foreground">
            {state?.provider.configured ? "Live volume/difficulty" : "Corpus estimates only"}
          </div>
        </Card>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Field placeholder="Seed topic" value={seed} onChange={(event) => setSeed(event.target.value)} />
        <div className="flex gap-2">
          <Field value={briefKw} onChange={(event) => setBriefKw(event.target.value)} />
          <Button tone="soft" disabled={busy !== null} onClick={() => void run("brief", { keyword: briefKw })}>
            Brief
          </Button>
        </div>
      </div>
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Card className="mb-6 space-y-4 p-5">
        <div className="font-semibold">Path to #1</div>
        <p className="text-sm text-muted-foreground">{state?.rankPlan?.note ?? "Load keywords to see on-page suggestions. Positions are unmeasured until a rank point exists."}</p>
        {(state?.rankPlan?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Track a keyword below. If you have not crawled, crawl first so suggestions can use real titles, metas, and links.</p>
        ) : (
          state?.rankPlan?.items.map((item) => (
            <div key={item.term + item.keywordId} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium">{item.term}</div>
                <Badge tone={item.measured ? "good" : "neutral"}>{item.label}</Badge>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {item.suggestions.slice(0, 6).map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Card>
      <div className="mb-6 space-y-3">
        {(state?.issues ?? []).slice(0, 12).map((issue) => (
          <Card key={issue.code} className="p-4">
            <div className="flex items-center gap-2">
              <Badge tone={issue.severity === "error" ? "bad" : issue.severity === "warning" ? "warn" : "neutral"}>
                {issue.severity} · {issue.count}
              </Badge>
              <div className="font-medium">{issue.title}</div>
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{issue.recommendation}</div>
            <div className="mt-1 text-xs text-muted-foreground">{issue.urls[0]}</div>
          </Card>
        ))}
      </div>
      <DataTable
        headers={["Keyword", "Volume", "Difficulty", "Intent", "Position", "Track"]}
        rows={(state?.keywords ?? []).map((keyword) => {
          const plan = state?.rankPlan?.items.find((item) => item.keywordId === keyword.id);
          return {
            key: keyword.id,
            cells: [
              keyword.term,
              keyword.volume.toLocaleString(),
              String(keyword.difficulty),
              keyword.intent,
              keyword.tracked ? plan?.label ?? "unmeasured" : "—",
              <Button key={keyword.id} tone="soft" disabled={busy !== null} onClick={() => void run("track", { keywordId: keyword.id, tracked: !keyword.tracked })}>
                {keyword.tracked ? "Stop tracking" : "Track"}
              </Button>,
            ],
          };
        })}
      />
      {(state?.briefs ?? []).length > 0 ? (
        <div className="mt-6 space-y-2">
          <div className="text-sm font-semibold">Content briefs</div>
          {state?.briefs.map((brief) => (
            <Card key={brief.id} className="p-4 text-sm">
              <div className="font-medium">{brief.title}</div>
              <div className="text-muted-foreground">
                {brief.keyword} · {brief.wordTarget} words
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
