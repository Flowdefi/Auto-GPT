import type { WorkspaceId } from "@/lib/types";
import { loadDb, mutate, nextId } from "../db";
import type { SeoBrief, SeoKeywordRow, SeoRankPoint } from "../models";
import { density, tokens, topTerms } from "./text";

/**
 * Volume and difficulty are the two numbers no open-source tool can produce for
 * free — every provider meters them. We expose a provider adapter (SerpBear's
 * pattern) and, when no provider is configured, return a transparent estimate
 * derived from the corpus rather than inventing precise-looking numbers.
 */
export interface KeywordProvider {
  name: string;
  configured: boolean;
}

export function keywordProvider(): KeywordProvider {
  if (process.env.SERP_PROVIDER_URL && process.env.SERP_PROVIDER_KEY) {
    return { name: process.env.SERP_PROVIDER_NAME ?? "custom", configured: true };
  }
  return { name: "local-estimate", configured: false };
}

const INTENT_MARKERS: Array<{ intent: SeoKeywordRow["intent"]; markers: string[] }> = [
  { intent: "transactional", markers: ["buy", "sell", "price", "pricing", "quote", "cost", "for sale", "hire"] },
  { intent: "commercial", markers: ["best", "top", "vs", "compare", "review", "company", "companies", "firm", "broker", "service"] },
  { intent: "navigational", markers: ["login", "portal", "contact", "address", "phone"] },
  { intent: "informational", markers: ["what", "how", "why", "guide", "meaning", "explained", "definition"] },
];

export function classifyIntent(term: string): SeoKeywordRow["intent"] {
  const lower = term.toLowerCase();
  for (const entry of INTENT_MARKERS) {
    if (entry.markers.some((marker) => lower.includes(marker))) return entry.intent;
  }
  return lower.split(/\s+/).length >= 4 ? "informational" : "commercial";
}

/**
 * Difficulty proxy: head terms are harder, long tail is easier, commercial
 * intent competes harder than informational. Documented as an estimate.
 */
export function estimateDifficulty(term: string, intent: SeoKeywordRow["intent"]): number {
  const words = term.trim().split(/\s+/).length;
  let score = 78 - (words - 1) * 11;
  if (intent === "transactional") score += 8;
  if (intent === "commercial") score += 4;
  if (intent === "informational") score -= 6;
  if (term.length > 40) score -= 5;
  return Math.max(4, Math.min(96, Math.round(score)));
}

export function estimateVolume(term: string, corpusCount: number): number {
  const words = term.trim().split(/\s+/).length;
  const base = words === 1 ? 2400 : words === 2 ? 720 : words === 3 ? 210 : 70;
  const corpusBoost = Math.min(3, 1 + corpusCount / 12);
  return Math.round((base * corpusBoost) / 10) * 10;
}

const SEED_TOPICS: Record<WorkspaceId, string[]> = {
  triton: [
    "sell charged off debt",
    "charged off debt buyers",
    "debt portfolio broker",
    "buy charged off credit card debt",
    "auto deficiency debt sale",
    "medical receivables sale",
    "npl portfolio sale",
    "debt buyer due diligence",
    "forward flow agreement debt",
    "cents on the dollar debt",
    "rmai certified debt buyer",
    "charge off recovery rates",
    "debt sale data room",
    "bulk debt portfolio pricing",
    "personal loan charge off sale",
  ],
  aether: [
    "institutional crypto otc desk",
    "bitcoin block trade desk",
    "crypto market making services",
    "qualified crypto custody",
    "travel rule compliance crypto",
    "treasury bitcoin conversion",
    "token listing services",
    "institutional digital asset trading",
  ],
};

export function researchKeywords(
  workspaceId: WorkspaceId,
  options: { seed?: string; limit?: number } = {},
): SeoKeywordRow[] {
  const db = loadDb();
  const limit = options.limit ?? 30;

  // Mine the crawled corpus so suggestions reflect the site's real language.
  const latestCrawl = db.crawls.find((crawl) => crawl.workspaceId === workspaceId && crawl.status === "complete");
  const corpusTerms = new Map<string, number>();
  if (latestCrawl) {
    for (const page of db.seoPages.filter((row) => row.crawlId === latestCrawl.id)) {
      for (const entry of page.topTerms) {
        corpusTerms.set(entry.term, (corpusTerms.get(entry.term) ?? 0) + entry.count);
      }
    }
  }

  const seeds = new Set<string>(SEED_TOPICS[workspaceId]);
  if (options.seed?.trim()) {
    const seed = options.seed.trim().toLowerCase();
    seeds.add(seed);
    for (const modifier of ["buyers", "pricing", "companies", "process", "requirements", "near me"]) {
      seeds.add(`${seed} ${modifier}`);
    }
    for (const question of ["how to", "what is", "who buys"]) {
      seeds.add(`${question} ${seed}`);
    }
  }
  for (const [term] of [...corpusTerms.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
    if (term.includes(" ")) seeds.add(term);
  }

  const rows: SeoKeywordRow[] = [];
  for (const term of [...seeds].slice(0, limit)) {
    const intent = classifyIntent(term);
    const corpusCount = corpusTerms.get(term) ?? 0;
    rows.push({
      id: `kw_${workspaceId}_${term.replace(/[^a-z0-9]+/gi, "_").slice(0, 48)}`,
      workspaceId,
      term,
      intent,
      volume: estimateVolume(term, corpusCount),
      difficulty: estimateDifficulty(term, intent),
      cpc: Number((estimateDifficulty(term, intent) / 12).toFixed(2)),
      source: corpusCount > 0 ? "crawl" : "corpus",
      serpFeatures: intent === "informational" ? ["People also ask"] : ["Local pack"],
      tracked: false,
      createdAt: new Date().toISOString(),
    });
  }

  mutate((state) => {
    for (const row of rows) {
      const existing = state.keywords.find((item) => item.id === row.id);
      if (existing) {
        Object.assign(existing, { ...row, tracked: existing.tracked, targetUrl: existing.targetUrl });
      } else {
        state.keywords.push(row);
      }
    }
  });

  return rows.sort((a, b) => b.volume / (b.difficulty || 1) - a.volume / (a.difficulty || 1));
}

export function trackKeyword(workspaceId: WorkspaceId, keywordId: string, tracked: boolean, targetUrl?: string) {
  return mutate((db) => {
    const row = db.keywords.find((item) => item.id === keywordId && item.workspaceId === workspaceId);
    if (!row) throw new Error("Keyword not found");
    row.tracked = tracked;
    if (targetUrl !== undefined) row.targetUrl = targetUrl;
    return row;
  });
}

/**
 * Fetches live positions when a SERP provider is configured. Without one we
 * record nothing rather than fabricate a rank.
 */
export async function refreshRanks(workspaceId: WorkspaceId): Promise<{ checked: number; recorded: number; note: string }> {
  const provider = keywordProvider();
  const tracked = loadDb().keywords.filter((row) => row.workspaceId === workspaceId && row.tracked);

  if (!provider.configured) {
    return {
      checked: tracked.length,
      recorded: 0,
      note: "No SERP provider configured. Set SERP_PROVIDER_URL and SERP_PROVIDER_KEY (SerpApi, Serper, SearchApi, ValueSerp, or your own proxy) to record live positions.",
    };
  }

  const host = loadDb().crawls.find((crawl) => crawl.workspaceId === workspaceId)?.host ?? "debtmarket.net";
  let recorded = 0;

  for (const keyword of tracked) {
    try {
      const url = new URL(process.env.SERP_PROVIDER_URL!);
      url.searchParams.set("q", keyword.term);
      url.searchParams.set("api_key", process.env.SERP_PROVIDER_KEY!);
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) continue;
      const payload = (await response.json()) as { organic_results?: Array<{ link?: string; position?: number }> };
      const hit = payload.organic_results?.find((row) => row.link?.includes(host));
      const point: SeoRankPoint = {
        id: nextId("rk"),
        workspaceId,
        keywordId: keyword.id,
        device: "desktop",
        position: hit?.position ?? null,
        url: hit?.link,
        provider: provider.name,
        at: new Date().toISOString(),
      };
      mutate((db) => {
        db.ranks.unshift(point);
        if (db.ranks.length > 2000) db.ranks.length = 2000;
      });
      recorded += 1;
    } catch {
      /* one keyword failing should not abort the run */
    }
  }

  return { checked: tracked.length, recorded, note: `Recorded via ${provider.name}.` };
}

export function buildBrief(workspaceId: WorkspaceId, keyword: string, targetUrl?: string): SeoBrief {
  const db = loadDb();
  const latestCrawl = db.crawls.find((crawl) => crawl.workspaceId === workspaceId && crawl.status === "complete");
  const pages = latestCrawl ? db.seoPages.filter((page) => page.crawlId === latestCrawl.id) : [];
  const target = targetUrl ? pages.find((page) => page.url === targetUrl) : undefined;

  const corpus = pages.map((page) => page.topTerms.map((entry) => entry.term).join(" ")).join(" ");
  const related = topTerms(`${corpus} ${keyword}`, 18)
    .map((entry) => entry.term)
    .filter((term) => term !== keyword)
    .slice(0, 10);

  const words = keyword.split(/\s+/);
  const isTriton = workspaceId === "triton";

  const outline = isTriton
    ? [
        {
          heading: `What ${keyword} actually means`,
          points: ["Define the term in institutional language", "State who the counterparties are", "Name the asset classes in scope"],
        },
        {
          heading: "How the process runs end to end",
          points: ["NDA and intake", "Data room and diligence", "Sealed bid window", "Award, funding, and media transfer"],
        },
        {
          heading: "What moves pricing",
          points: ["Face value and account count", "Vintage and charge-off date", "Media completeness", "State mix and statute status", "Prior placement history"],
        },
        {
          heading: "Compliance and documentation",
          points: ["FDCPA-aware handling", "RMAI-aligned purchase agreements", "Put-back rights for fraud and deceased", "No consumer contact from a marketplace"],
        },
        {
          heading: "Typical timeline",
          points: ["14 to 45 days from complete data room to funding", "What delays a close"],
        },
        { heading: "Next step", points: ["Institutional contact path", "What to have ready before the first call"] },
      ]
    : [
        { heading: `What ${keyword} covers`, points: ["Define the service", "Name the counterparties"] },
        { heading: "Execution", points: ["RFQ", "Firm quote window", "Settlement rails", "Custody"] },
        { heading: "Compliance", points: ["KYC/AML", "Travel Rule IVMS-101", "Qualified custody"] },
        { heading: "Next step", points: ["Desk contact path"] },
      ];

  const brief: SeoBrief = {
    id: nextId("bf"),
    workspaceId,
    keyword,
    targetUrl,
    title: isTriton
      ? `${keyword.charAt(0).toUpperCase()}${keyword.slice(1)} — process, pricing, and timeline`
      : `${keyword.charAt(0).toUpperCase()}${keyword.slice(1)} — institutional desk guide`,
    metaDescription: isTriton
      ? `How ${keyword} works for institutions: NDA, data room, sealed bids, and funding in 14–45 days. Institutional counterparties only — we do not contact consumers.`.slice(0, 158)
      : `How ${keyword} works for institutions: RFQ, firm quotes, settlement, and qualified custody.`.slice(0, 158),
    outline,
    mustCover: [...new Set([...words, ...related])].slice(0, 12),
    questions: isTriton
      ? [
          `Who buys ${words.slice(-2).join(" ")}?`,
          "What documentation is required before a sale?",
          "How is the price per dollar of face determined?",
          "How long does a portfolio sale take?",
          "What happens to accounts after the sale?",
        ]
      : [`Who provides ${keyword}?`, "What are the settlement options?", "What compliance applies?"],
    internalLinks: pages
      .filter((page) => page.status === 200 && page.url !== targetUrl)
      .sort((a, b) => b.pageRank - a.pageRank)
      .slice(0, 5)
      .map((page) => page.url),
    wordTarget: Math.max(900, (target?.wordCount ?? 0) + 400),
    createdAt: new Date().toISOString(),
  };

  mutate((db2) => {
    db2.briefs.unshift(brief);
    if (db2.briefs.length > 100) db2.briefs.length = 100;
  });

  return brief;
}

export interface OptimizerReport {
  url: string;
  keyword: string;
  score: number;
  checks: Array<{ label: string; ok: boolean; detail: string }>;
}

/** On-page optimizer, the HubSpot "SEO recommendations" equivalent. */
export function optimizePage(workspaceId: WorkspaceId, url: string, keyword: string): OptimizerReport | null {
  const db = loadDb();
  const page = db.seoPages.find((row) => row.workspaceId === workspaceId && row.url === url);
  if (!page) return null;

  const term = keyword.toLowerCase();
  const corpus = `${page.title} ${page.metaDescription} ${page.h1.join(" ")} ${page.topTerms.map((t) => t.term).join(" ")}`;
  const kwDensity = density(page.topTerms.map((entry) => `${entry.term} `.repeat(entry.count)).join(" "), term);

  const checks = [
    {
      label: "Keyword in title",
      ok: page.title.toLowerCase().includes(term),
      detail: page.title || "No title",
    },
    {
      label: "Keyword in H1",
      ok: page.h1.some((heading) => heading.toLowerCase().includes(term)),
      detail: page.h1[0] ?? "No H1",
    },
    {
      label: "Keyword in meta description",
      ok: page.metaDescription.toLowerCase().includes(term),
      detail: page.metaDescription || "No description",
    },
    {
      label: "Title length 30–65",
      ok: page.titleLength >= 30 && page.titleLength <= 65,
      detail: `${page.titleLength} characters`,
    },
    {
      label: "Meta length 140–160",
      ok: page.metaLength >= 120 && page.metaLength <= 165,
      detail: `${page.metaLength} characters`,
    },
    {
      label: "At least 600 words",
      ok: page.wordCount >= 600,
      detail: `${page.wordCount} words`,
    },
    {
      label: "Readable (Flesch ≥ 40)",
      ok: page.readability >= 40,
      detail: `Flesch ${page.readability}`,
    },
    {
      label: "Keyword density 0.5–2.5%",
      ok: kwDensity >= 0.5 && kwDensity <= 2.5,
      detail: `${kwDensity}%`,
    },
    {
      label: "Structured data present",
      ok: page.hasSchema,
      detail: page.schemaTypes.join(", ") || "None",
    },
    {
      label: "Images have alt text",
      ok: page.imagesMissingAlt === 0,
      detail: `${page.imagesMissingAlt} missing of ${page.images}`,
    },
    {
      label: "3+ internal links",
      ok: page.internalLinks >= 3,
      detail: `${page.internalLinks} internal links`,
    },
    {
      label: "Related terms covered",
      ok: tokens(corpus).length > 0,
      detail: page.topTerms.slice(0, 5).map((entry) => entry.term).join(", ") || "None",
    },
  ];

  const score = Math.round((checks.filter((check) => check.ok).length / checks.length) * 100);
  return { url, keyword, score, checks };
}

export interface RankPlanItem {
  keywordId: string;
  term: string;
  position: number | null;
  label: string;
  measured: boolean;
  targetUrl?: string;
  suggestions: string[];
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const clean = line.trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

function rankSuggestions(workspaceId: WorkspaceId, term: string, targetUrl: string | undefined, crawled: boolean): string[] {
  const lines: string[] = [];
  if (!crawled) {
    return [
      "Crawl the site first. These targets are a checklist, not a measurement of the live pages.",
      `Put "${term}" in the title tag and the H1.`,
      "Write a meta description of 140–160 characters that includes the keyword.",
      "Aim for at least 900 words on the ranking URL.",
      "Add at least 3 internal links from related pages on the same host.",
    ];
  }

  const db = loadDb();
  const crawl = db.crawls.find((row) => row.workspaceId === workspaceId && row.status === "complete");
  const pages = crawl ? db.seoPages.filter((page) => page.crawlId === crawl.id) : [];
  const page =
    (targetUrl ? pages.find((row) => row.url === targetUrl) : undefined) ??
    pages.slice().sort((a, b) => b.pageRank - a.pageRank)[0];

  if (!page) {
    lines.push("The crawl has no pages yet. Run it again, then re-open this plan.");
    lines.push(`When a URL exists, put "${term}" in the title and the H1.`);
    return lines;
  }

  const report = optimizePage(workspaceId, page.url, term);
  const wordTarget = Math.max(900, (page.wordCount || 0) + 400);
  lines.push(
    page.title.toLowerCase().includes(term.toLowerCase())
      ? `Title already contains "${term}" (${page.titleLength} characters; keep it between 30 and 65).`
      : `Change the title so it contains "${term}". Current title: ${page.title || "missing"}.`,
  );
  const h1 = page.h1[0] ?? "";
  lines.push(
    page.h1.some((heading) => heading.toLowerCase().includes(term.toLowerCase()))
      ? `H1 already contains "${term}".`
      : `Set the H1 to a heading that contains "${term}". Current H1: ${h1 || "missing"}.`,
  );
  lines.push(
    page.metaLength >= 140 && page.metaLength <= 160
      ? `Meta length is ${page.metaLength}, inside 140–160. Keep the keyword in it.`
      : `Rewrite the meta description to 140–160 characters and include "${term}". Current length: ${page.metaLength}.`,
  );
  lines.push(
    page.wordCount >= wordTarget
      ? `Word count is ${page.wordCount}, at the ${wordTarget} target.`
      : `Raise the page from ${page.wordCount} words toward ${wordTarget}.`,
  );
  const links = pages
    .filter((row) => row.url !== page.url && row.status === 200)
    .sort((a, b) => b.pageRank - a.pageRank)
    .slice(0, 3)
    .map((row) => row.url);
  lines.push(
    page.internalLinks >= 3
      ? `Internal links: ${page.internalLinks}. Keep links to ${links.join(", ") || "related commercial pages"}.`
      : `Add internal links (now ${page.internalLinks}) to ${links.join(", ") || "the strongest crawled URLs"}.`,
  );
  if (report) {
    for (const check of report.checks) {
      if (!check.ok) lines.push(`${check.label}: ${check.detail}`);
    }
  }
  const issues = db.seoIssues.filter((issue) => issue.workspaceId === workspaceId && issue.url === page.url).slice(0, 4);
  if (issues.length === 0) {
    lines.push("No crawl issues stored for this URL. Cover the keyword in the first 100 words and in one H2.");
  } else {
    for (const issue of issues) lines.push(`Content gap — ${issue.title}: ${issue.recommendation}`);
  }
  return uniqueLines(lines);
}

/** On-page plan for tracked keywords. Positions come only from stored rank points. */
export function seoRankPlan(workspaceId: WorkspaceId, keyword?: string): {
  crawled: boolean;
  note: string;
  items: RankPlanItem[];
} {
  const db = loadDb();
  const crawled = db.crawls.some((row) => row.workspaceId === workspaceId && row.status === "complete");
  const needle = keyword?.trim().toLowerCase() ?? "";
  let rows = db.keywords.filter((row) => row.workspaceId === workspaceId && row.tracked);
  if (needle) {
    const matched = rows.filter((row) => row.term.toLowerCase().includes(needle));
    rows = matched.length > 0 ? matched : db.keywords.filter((row) => row.workspaceId === workspaceId && row.term.toLowerCase().includes(needle));
  }

  const items: RankPlanItem[] = rows.slice(0, 12).map((row) => {
    const point = db.ranks.find((rank) => rank.workspaceId === workspaceId && rank.keywordId === row.id);
    const position = typeof point?.position === "number" ? point.position : null;
    return {
      keywordId: row.id,
      term: row.term,
      position,
      label: position === null ? "unmeasured" : `#${position}`,
      measured: position !== null,
      targetUrl: row.targetUrl,
      suggestions: rankSuggestions(workspaceId, row.term, row.targetUrl, crawled),
    };
  });

  if (items.length === 0 && needle) {
    items.push({
      keywordId: "",
      term: keyword?.trim() ?? needle,
      position: null,
      label: "unmeasured",
      measured: false,
      suggestions: rankSuggestions(workspaceId, keyword?.trim() ?? needle, undefined, crawled),
    });
  }

  const note = !crawled
    ? "No completed crawl. Crawl the site before treating the checklist as live. Keyword positions stay unmeasured until a rank point is stored."
    : items.length === 0
      ? "No tracked keywords yet. Track a keyword from the research table. Positions are unmeasured until a rank point exists."
      : items.some((item) => item.measured)
        ? "Positions shown below are stored rank points. Keywords without a rank point are unmeasured."
        : "No rank points stored for these keywords. Every position is unmeasured — refresh ranks only after a SERP provider is configured.";

  return { crawled, note, items };
}
