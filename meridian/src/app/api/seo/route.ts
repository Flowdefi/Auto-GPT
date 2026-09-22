import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { loadDb } from "@/server/db";
import { crawlSite } from "@/server/seo/crawler";
import {
  buildBrief,
  keywordProvider,
  optimizePage,
  refreshRanks,
  researchKeywords,
  seoRankPlan,
  trackKeyword,
} from "@/server/seo/keywords";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export function GET(request: Request) {
  const url = new URL(request.url);
  const workspace = url.searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }

  const db = loadDb();
  const crawls = db.crawls.filter((crawl) => crawl.workspaceId === workspace);
  const latest = crawls[0];
  const pages = latest ? db.seoPages.filter((page) => page.crawlId === latest.id) : [];
  const issues = latest ? db.seoIssues.filter((issue) => issue.crawlId === latest.id) : [];

  const byCategory: Record<string, { errors: number; warnings: number; notices: number }> = {};
  for (const issue of issues) {
    const bucket = (byCategory[issue.category] ??= { errors: 0, warnings: 0, notices: 0 });
    if (issue.severity === "error") bucket.errors += 1;
    else if (issue.severity === "warning") bucket.warnings += 1;
    else bucket.notices += 1;
  }

  const grouped = Object.values(
    issues.reduce<Record<string, { code: string; title: string; severity: string; category: string; recommendation: string; count: number; urls: string[] }>>(
      (acc, issue) => {
        const entry = (acc[issue.code] ??= {
          code: issue.code,
          title: issue.title,
          severity: issue.severity,
          category: issue.category,
          recommendation: issue.recommendation,
          count: 0,
          urls: [],
        });
        entry.count += 1;
        if (entry.urls.length < 8) entry.urls.push(issue.url);
        return acc;
      },
      {},
    ),
  ).sort((a, b) => {
    const rank = { error: 0, warning: 1, notice: 2 } as Record<string, number>;
    return (rank[a.severity]! - rank[b.severity]!) || b.count - a.count;
  });

  return NextResponse.json({
    crawls: crawls.slice(0, 10),
    latest,
    pages: pages
      .slice()
      .sort((a, b) => b.pageRank - a.pageRank)
      .slice(0, 60),
    issues: grouped,
    byCategory,
    keywords: db.keywords.filter((row) => row.workspaceId === workspace),
    tracked: db.keywords.filter((row) => row.workspaceId === workspace && row.tracked),
    ranks: db.ranks.filter((row) => row.workspaceId === workspace).slice(0, 200),
    briefs: db.briefs.filter((row) => row.workspaceId === workspace).slice(0, 10),
    provider: keywordProvider(),
    rankPlan: seoRankPlan(workspace),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    action?: string;
    url?: string;
    maxPages?: number;
    seed?: string;
    keyword?: string;
    keywordId?: string;
    tracked?: boolean;
    targetUrl?: string;
  };

  if (!isWorkspaceId(body.workspaceId)) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }
  const workspaceId = body.workspaceId;

  try {
    switch (body.action) {
      case "crawl": {
        const start = body.url?.trim() || (workspaceId === "triton" ? "https://www.debtmarket.net" : "https://aethermarkets.io");
        const result = await crawlSite({
          workspaceId,
          startUrl: start,
          maxPages: body.maxPages ?? 30,
        });
        const db = loadDb();
        return NextResponse.json({
          crawl: db.crawls.find((crawl) => crawl.id === result.crawlId),
          issues: db.seoIssues.filter((issue) => issue.crawlId === result.crawlId).length,
        });
      }

      case "research":
        return NextResponse.json({ keywords: researchKeywords(workspaceId, { seed: body.seed }) });

      case "track": {
        if (!body.keywordId) return NextResponse.json({ error: "keywordId required" }, { status: 400 });
        return NextResponse.json({
          keyword: trackKeyword(workspaceId, body.keywordId, body.tracked ?? true, body.targetUrl),
        });
      }

      case "ranks":
        return NextResponse.json(await refreshRanks(workspaceId));

      case "brief": {
        if (!body.keyword) return NextResponse.json({ error: "keyword required" }, { status: 400 });
        return NextResponse.json({ brief: buildBrief(workspaceId, body.keyword, body.targetUrl) });
      }

      case "rank-plan":
        return NextResponse.json(seoRankPlan(workspaceId, body.keyword));

      case "optimize": {
        if (!body.url || !body.keyword) {
          return NextResponse.json({ error: "url and keyword required" }, { status: 400 });
        }
        const report = optimizePage(workspaceId, body.url, body.keyword);
        if (!report) return NextResponse.json({ error: "Crawl that URL first" }, { status: 404 });
        return NextResponse.json({ report });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "SEO action failed" },
      { status: 500 },
    );
  }
}
