import type { WorkspaceId } from "@/lib/types";
import { workspaceOf } from "@/lib/workspaces";
import { companiesOf } from "../crm";
import { loadDb, persist } from "../db";
import { checkDomainAuth } from "../deliverability";
import { reassociate } from "../outlook";
import { queryRag } from "../rag";
import { seedSegmentsInto } from "../segments";
import { researchKeywords } from "../seo/keywords";
import { sweepSla } from "../workflow";

export type ImprovementKind = "applied" | "proposed";

export interface Improvement {
  id: string;
  kind: ImprovementKind;
  area: "crm" | "inbox" | "seo" | "email" | "ai" | "automation";
  title: string;
  detail: string;
  action?: string;
}

export interface ImprovementRun {
  workspaceId: WorkspaceId;
  applied: Improvement[];
  proposed: Improvement[];
  grounded: string[];
}

/**
 * Safe auto-improvements plus a ranked proposal list. Applied actions never
 * send mail or change a lead's commercial status — they only keep the platform
 * healthy (SLA clocks, associations, keyword corpus, segments).
 */
export async function autoImprove(workspaceId: WorkspaceId): Promise<ImprovementRun> {
  const applied: Improvement[] = [];
  const proposed: Improvement[] = [];
  const db = loadDb();

  const sla = sweepSla(workspaceId);
  applied.push({
    id: "sla",
    kind: "applied",
    area: "automation",
    title: "Swept first-touch SLAs",
    detail: sla.breached === 0 ? "No open leads past SLA." : `${sla.breached} lead(s) escalated.`,
  });

  const associated = reassociate(workspaceId);
  applied.push({
    id: "inbox",
    kind: "applied",
    area: "inbox",
    title: "Re-associated unmatched mail",
    detail: associated.updated === 0 ? "Every stored message already mapped." : `Linked ${associated.updated} message(s) to CRM records.`,
  });

  seedSegmentsInto(db);
  persist(db);
  applied.push({
    id: "segments",
    kind: "applied",
    area: "email",
    title: "Ensured marketing segments exist",
    detail: `${db.segments.filter((row) => row.workspaceId === workspaceId).length} segments ready.`,
  });

  const keywords = db.keywords.filter((row) => row.workspaceId === workspaceId);
  if (keywords.length === 0) {
    const researched = researchKeywords(workspaceId, { limit: 16 });
    applied.push({
      id: "keywords",
      kind: "applied",
      area: "seo",
      title: "Seeded keyword research",
      detail: `Added ${researched.length} opportunity terms from the workspace corpus.`,
    });
  }

  const companies = companiesOf(workspaceId).filter((company) => company.domain && !company.enrichedAt);
  if (companies.length > 0) {
    proposed.push({
      id: "enrich",
      kind: "proposed",
      area: "crm",
      title: "Enrich companies from public sources",
      detail: `${companies.length} companies have a domain but no enrichment. Ask the CTO to enrich them.`,
      action: "enrich_company",
    });
  }

  const unmatched = db.inbox.filter(
    (row) => row.workspaceId === workspaceId && row.matchedBy === "none",
  ).length;
  if (unmatched > 0) {
    proposed.push({
      id: "unmatched-mail",
      kind: "proposed",
      area: "inbox",
      title: "Unmatched Office 365 threads",
      detail: `${unmatched} message(s) have no contact or company. Create the missing records or sync again.`,
      action: "sync_outlook",
    });
  }

  const latestCrawl = db.crawls.find((crawl) => crawl.workspaceId === workspaceId);
  if (!latestCrawl) {
    proposed.push({
      id: "crawl",
      kind: "proposed",
      area: "seo",
      title: "No site crawl yet",
      detail: `Crawl ${workspaceOf(workspaceId).domain} to produce a weighted technical audit.`,
      action: "seo_crawl",
    });
  } else {
    const errors = db.seoIssues.filter(
      (issue) => issue.crawlId === latestCrawl.id && issue.severity === "error",
    ).length;
    if (errors > 0) {
      proposed.push({
        id: "seo-errors",
        kind: "proposed",
        area: "seo",
        title: "Technical SEO errors on the latest crawl",
        detail: `${errors} error-level issue(s). Health ${latestCrawl.health}/100.`,
        action: "seo_crawl",
      });
    }
  }

  const hotUntouched = db.leads.filter(
    (lead) =>
      lead.workspaceId === workspaceId &&
      lead.band === "hot" &&
      !lead.firstTouchAt &&
      !["converted", "rejected", "nurture"].includes(lead.status),
  ).length;
  if (hotUntouched > 0) {
    proposed.push({
      id: "hot-leads",
      kind: "proposed",
      area: "crm",
      title: "Hot leads still waiting on first touch",
      detail: `${hotUntouched} hot lead(s) have no first-touch timestamp.`,
      action: "list_leads",
    });
  }

  try {
    const domain = workspaceId === "triton" ? "debtmarket.net" : "aethermarkets.io";
    const auth = await checkDomainAuth(domain);
    if (auth.verdict !== "ready") {
      proposed.push({
        id: "dns",
        kind: "proposed",
        area: "email",
        title: `Mail authentication for ${domain} is ${auth.verdict}`,
        detail: auth.summary,
      });
    }
  } catch {
    /* DNS failures are not actionable here */
  }

  const rag = queryRag(workspaceId, "pipeline health leads seo email deliverability", 4);

  return {
    workspaceId,
    applied,
    proposed,
    grounded: rag.map((hit) => `${hit.title} (${hit.kind})`),
  };
}
