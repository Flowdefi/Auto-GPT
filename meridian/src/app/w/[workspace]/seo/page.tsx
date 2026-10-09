"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/tables";
import { Badge, Button, Card, Field, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface SeoState {
  latest?: { health: number; pagesCrawled: number; host: string; status: string };
  issues: Array<{ code: string; title: string; severity: string; count: number; recommendation: string; urls: string[] }>;
  keywords: Array<{ id: string; term: string; volume: number; difficulty: number; intent: string; tracked: boolean }>;
  briefs: Array<{ id: string; keyword: string; title: string; wordTarget: number }>;
  provider: { name: string; configured: boolean };
  pages: Array<{ url: string; title: string; wordCount: number; pageRank: number }>;
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
        headers={["Keyword", "Volume", "Difficulty", "Intent", "Tracked"]}
        rows={(state?.keywords ?? []).map((keyword) => ({
          key: keyword.id,
          cells: [
            keyword.term,
            keyword.volume.toLocaleString(),
            String(keyword.difficulty),
            keyword.intent,
            keyword.tracked ? "yes" : "no",
          ],
        }))}
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
