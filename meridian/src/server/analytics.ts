import type { WorkspaceId } from "@/lib/types";
import { isWorkspaceId } from "@/lib/workspace-id";
import { loadDb, mutate, nextId } from "./db";
import { gaStatus, sendGaPageView } from "./ga";
import { sweepSla, sweepStalePortfolios } from "./workflow";

export interface AnalyticsSnapshot {
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
  ga: ReturnType<typeof gaStatus>;
  stalePortfoliosAlerted: number;
}

export function analyticsSnapshot(workspaceId: WorkspaceId): AnalyticsSnapshot {
  sweepSla(workspaceId);
  const stale = sweepStalePortfolios(workspaceId);
  const db = loadDb();
  const leads = db.leads.filter((row) => row.workspaceId === workspaceId);
  const leadsByStatus: Record<string, number> = {};
  const leadsBySide: Record<string, number> = {};
  for (const lead of leads) {
    leadsByStatus[lead.status] = (leadsByStatus[lead.status] ?? 0) + 1;
    leadsBySide[lead.side] = (leadsBySide[lead.side] ?? 0) + 1;
  }
  const portfolios = db.portfolios.filter((row) => row.workspaceId === workspaceId);
  const campaigns = db.campaigns.filter((row) => row.workspaceId === workspaceId);
  const crawl = db.crawls.find((row) => row.workspaceId === workspaceId && row.status === "complete");
  const events = db.analyticsEvents.filter((row) => row.workspaceId === workspaceId && row.name === "page_view");
  return {
    leadsByStatus,
    leadsBySide,
    slaBreaches: leads.filter((lead) => lead.slaBreached).length,
    openTasks: db.tasks.filter((task) => task.workspaceId === workspaceId && task.status === "open").length,
    portfolios: portfolios.length,
    faceValue: portfolios.reduce((sum, row) => sum + row.faceValue, 0),
    sellerPrice: portfolios.reduce((sum, row) => sum + row.sellerPrice, 0),
    email: {
      campaigns: campaigns.length,
      intended: campaigns.reduce((sum, row) => sum + row.intended, 0),
      delivered: campaigns.reduce((sum, row) => sum + row.delivered, 0),
      failed: campaigns.reduce((sum, row) => sum + row.failed, 0),
      skipped: campaigns.reduce((sum, row) => sum + row.skipped, 0),
    },
    formSubmissions: db.submissions.filter((row) => row.workspaceId === workspaceId).length,
    seoHealth: crawl?.health ?? null,
    seoHost: crawl?.host ?? null,
    firstPartyPageviews: events.length,
    recentPaths: events.slice(0, 12).map((event) => ({ path: event.path, at: event.at, forwarded: event.forwarded })),
    ga: gaStatus(),
    stalePortfoliosAlerted: stale.alerted,
  };
}

export async function recordPageView(input: {
  path: string;
  workspaceId?: string;
}): Promise<{ id: string; forwarded: boolean; forwardError?: string }> {
  const path = input.path.slice(0, 300);
  const workspaceId = isWorkspaceId(input.workspaceId) ? input.workspaceId : undefined;
  const forward = await sendGaPageView(path);
  const event = mutate((db) => {
    const row = {
      id: nextId("ae"),
      workspaceId,
      name: "page_view",
      path,
      at: new Date().toISOString(),
      source: "first-party" as const,
      forwarded: forward.sent,
      forwardError: forward.sent ? undefined : forward.error,
    };
    db.analyticsEvents.unshift(row);
    if (db.analyticsEvents.length > 2000) db.analyticsEvents.length = 2000;
    return row;
  });
  return { id: event.id, forwarded: event.forwarded, forwardError: event.forwardError };
}
