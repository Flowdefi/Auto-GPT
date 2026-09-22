import { createHash } from "crypto";
import type { WorkspaceId } from "@/lib/types";
import { mutate, nextId } from "../db";
import { assertWorkspaceSite, parsePublicHttpUrl } from "../http-guard";
import type { SeoPage } from "../models";
import { auditPage, auditSite } from "./audit";
import { topTerms } from "./text";

const UA = "MeridianBot/1.0 (+https://debtmarket.net/bot; SEO audit)";
const TIMEOUT_MS = 10_000;

export interface CrawlOptions {
  workspaceId: WorkspaceId;
  startUrl: string;
  maxPages?: number;
  maxDepth?: number;
  respectRobots?: boolean;
}

interface FetchedPage {
  url: string;
  status: number;
  html: string;
  responseMs: number;
  bytes: number;
  redirectedTo?: string;
  contentType: string;
}

async function fetchPage(url: string): Promise<FetchedPage> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const safe = parsePublicHttpUrl(url);
    const response = await fetch(safe.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const html = contentType.includes("text/html") ? await response.text() : "";
    return {
      url,
      status: response.status,
      html: html.slice(0, 600_000),
      responseMs: Date.now() - started,
      bytes: html.length,
      redirectedTo: response.url !== url ? response.url : undefined,
      contentType,
    };
  } catch {
    return { url, status: 0, html: "", responseMs: Date.now() - started, bytes: 0, contentType: "" };
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function metaContent(html: string, names: string[]): string {
  for (const name of names) {
    const a = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i");
    const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "i");
    const hit = html.match(a) ?? html.match(b);
    if (hit?.[1] !== undefined) return decodeEntities(hit[1].trim());
  }
  return "";
}

function headings(html: string, tag: string): string[] {
  const found: string[] = [];
  for (const hit of html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))) {
    const text = decodeEntities((hit[1] ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (text) found.push(text);
  }
  return found;
}

export function visibleText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.hash = "";
    // Tracking params create duplicate URLs that are not distinct pages.
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"]) {
      url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "") || url.origin;
  } catch {
    return null;
  }
}

function linksFrom(html: string, base: string, host: string): { internal: string[]; external: number } {
  const internal = new Set<string>();
  let external = 0;
  for (const hit of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
    const raw = hit[1];
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) continue;
    const normalized = normalizeUrl(raw, base);
    if (!normalized) continue;
    try {
      const parsed = new URL(normalized);
      if (parsed.host.replace(/^www\./, "") === host.replace(/^www\./, "")) {
        internal.add(normalized);
      } else {
        external += 1;
      }
    } catch {
      /* skip malformed */
    }
  }
  return { internal: [...internal], external };
}

function schemaTypes(html: string): string[] {
  const types = new Set<string>();
  for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const hit of (block[1] ?? "").matchAll(/"@type"\s*:\s*"([^"]+)"/g)) {
      if (hit[1]) types.add(hit[1]);
    }
  }
  return [...types];
}

/** Flesch reading ease, rounded. Higher is easier to read. */
export function readability(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim().length > 0);
  if (words.length === 0 || sentences.length === 0) return 0;
  const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const score =
    206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  return Math.round(Math.max(0, Math.min(100, score)));
}

function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length <= 3) return 1;
  const groups = clean
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

async function robotsRules(origin: string): Promise<{ found: boolean; disallow: string[]; sitemaps: string[] }> {
  const page = await fetchPage(`${origin}/robots.txt`);
  if (page.status !== 200) return { found: false, disallow: [], sitemaps: [] };
  const body = page.html || "";
  const disallow: string[] = [];
  const sitemaps: string[] = [];
  let appliesToUs = true;
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    const [rawKey, ...rest] = trimmed.split(":");
    const key = rawKey?.toLowerCase().trim();
    const value = rest.join(":").trim();
    if (key === "user-agent") appliesToUs = value === "*" || value.toLowerCase().includes("meridian");
    if (key === "disallow" && appliesToUs && value) disallow.push(value);
    if (key === "sitemap" && value) sitemaps.push(value);
  }
  return { found: true, disallow, sitemaps };
}

function blockedByRobots(url: string, disallow: string[]): boolean {
  try {
    const path = new URL(url).pathname;
    return disallow.some((rule) => rule !== "/" && path.startsWith(rule));
  } catch {
    return false;
  }
}

async function sitemapUrls(sitemapUrl: string): Promise<string[]> {
  const page = await fetchPage(sitemapUrl);
  const body = page.html || "";
  const urls: string[] = [];
  for (const hit of body.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    if (hit[1]) urls.push(hit[1].trim());
  }
  return urls;
}

/**
 * Iterative PageRank over the internal link graph, the same signal Screaming
 * Frog and Scouter expose for finding under-linked pages.
 */
function pageRank(graph: Map<string, string[]>, iterations = 20, damping = 0.85): Map<string, number> {
  const nodes = [...graph.keys()];
  const count = nodes.length || 1;
  let ranks = new Map(nodes.map((node) => [node, 1 / count]));

  const inbound = new Map<string, string[]>();
  for (const node of nodes) inbound.set(node, []);
  for (const [from, targets] of graph.entries()) {
    for (const target of targets) {
      if (inbound.has(target)) inbound.get(target)!.push(from);
    }
  }

  for (let i = 0; i < iterations; i += 1) {
    const next = new Map<string, number>();
    for (const node of nodes) {
      let sum = 0;
      for (const source of inbound.get(node) ?? []) {
        const outDegree = graph.get(source)?.length || 1;
        sum += (ranks.get(source) ?? 0) / outDegree;
      }
      next.set(node, (1 - damping) / count + damping * sum);
    }
    ranks = next;
  }
  return ranks;
}

export async function crawlSite(options: CrawlOptions): Promise<{ crawlId: string }> {
  const maxPages = Math.min(options.maxPages ?? 40, 120);
  const maxDepth = options.maxDepth ?? 3;
  const start = assertWorkspaceSite(options.workspaceId, options.startUrl);
  const host = start.host;
  const origin = start.origin;

  const robots = options.respectRobots === false ? { found: false, disallow: [], sitemaps: [] } : await robotsRules(origin);

  let sitemapCount = 0;
  const seeds: string[] = [normalizeUrl(start.toString(), origin) ?? origin];
  const sitemapCandidates = robots.sitemaps.length ? robots.sitemaps : [`${origin}/sitemap.xml`];
  for (const candidate of sitemapCandidates.slice(0, 2)) {
    const urls = await sitemapUrls(candidate);
    sitemapCount += urls.length;
    for (const url of urls.slice(0, maxPages)) {
      const normalized = normalizeUrl(url, origin);
      if (normalized && !seeds.includes(normalized)) seeds.push(normalized);
    }
  }

  const crawl = mutate((db) => {
    const entry = {
      id: nextId("cr"),
      workspaceId: options.workspaceId,
      startUrl: start.toString(),
      host,
      status: "running" as const,
      pagesCrawled: 0,
      maxPages,
      startedAt: new Date().toISOString(),
      health: 0,
      robotsFound: robots.found,
      sitemapFound: sitemapCount > 0,
      sitemapUrls: sitemapCount,
    };
    db.crawls.unshift(entry);
    if (db.crawls.length > 20) {
      const dropped = db.crawls.splice(20).map((row) => row.id);
      db.seoPages = db.seoPages.filter((page) => !dropped.includes(page.crawlId));
      db.seoIssues = db.seoIssues.filter((issue) => !dropped.includes(issue.crawlId));
    }
    return entry;
  });

  const queue: Array<{ url: string; depth: number }> = seeds.map((url) => ({ url, depth: 0 }));
  const seen = new Set<string>(seeds);
  const pages: SeoPage[] = [];
  const graph = new Map<string, string[]>();
  const linkedTo = new Set<string>();

  try {
    while (queue.length > 0 && pages.length < maxPages) {
      const item = queue.shift();
      if (!item) break;
      if (blockedByRobots(item.url, robots.disallow)) continue;

      const fetched = await fetchPage(item.url);
      const text = visibleText(fetched.html);
      const { internal, external } = linksFrom(fetched.html, item.url, host);
      graph.set(item.url, internal);
      for (const link of internal) linkedTo.add(link);

      const title = decodeEntities(fetched.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
      const description = metaContent(fetched.html, ["description"]);
      const h1 = headings(fetched.html, "h1");
      const images = [...fetched.html.matchAll(/<img\b[^>]*>/gi)].map((hit) => hit[0]);
      const types = schemaTypes(fetched.html);

      const page: SeoPage = {
        id: nextId("pg"),
        crawlId: crawl.id,
        workspaceId: options.workspaceId,
        url: item.url,
        status: fetched.status,
        depth: item.depth,
        title,
        titleLength: title.length,
        metaDescription: description,
        metaLength: description.length,
        h1,
        h2Count: headings(fetched.html, "h2").length,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        readability: readability(text),
        canonical: fetched.html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? "",
        robots: metaContent(fetched.html, ["robots"]),
        internalLinks: internal.length,
        externalLinks: external,
        images: images.length,
        imagesMissingAlt: images.filter((tag) => !/\balt\s*=/.test(tag)).length,
        hasSchema: types.length > 0,
        schemaTypes: types,
        hasOpenGraph: /property=["']og:/i.test(fetched.html),
        responseMs: fetched.responseMs,
        bytes: fetched.bytes,
        contentHash: createHash("sha1").update(text.slice(0, 20_000)).digest("hex").slice(0, 16),
        pageRank: 0,
        topTerms: topTerms(text, 12),
      };

      pages.push(page);

      if (item.depth < maxDepth) {
        for (const link of internal) {
          if (seen.has(link) || seen.size >= maxPages * 3) continue;
          seen.add(link);
          queue.push({ url: link, depth: item.depth + 1 });
        }
      }
    }

    const ranks = pageRank(graph);
    const maxRank = Math.max(...[...ranks.values()], 1e-9);
    for (const page of pages) {
      page.pageRank = Number((((ranks.get(page.url) ?? 0) / maxRank) * 100).toFixed(1));
    }

    const orphans = pages.filter((page) => page.depth > 0 && !linkedTo.has(page.url)).map((page) => page.url);
    const issues = [
      ...pages.flatMap((page) => auditPage(page, crawl.id, options.workspaceId)),
      ...auditSite(pages, crawl.id, options.workspaceId, {
        robotsFound: robots.found,
        sitemapFound: sitemapCount > 0,
        orphans,
      }),
    ];

    const weight = issues.reduce((sum, issue) => sum + issue.weight, 0);
    const health = Math.max(0, Math.round(100 - Math.min(100, (weight / Math.max(pages.length, 1)) * 6)));

    mutate((db) => {
      db.seoPages = db.seoPages.filter((page) => page.crawlId !== crawl.id).concat(pages);
      db.seoIssues = db.seoIssues.filter((issue) => issue.crawlId !== crawl.id).concat(issues);
      const row = db.crawls.find((item) => item.id === crawl.id);
      if (row) {
        row.status = "complete";
        row.pagesCrawled = pages.length;
        row.finishedAt = new Date().toISOString();
        row.health = health;
      }
    });
  } catch (error) {
    mutate((db) => {
      const row = db.crawls.find((item) => item.id === crawl.id);
      if (row) {
        row.status = "failed";
        row.error = error instanceof Error ? error.message : "crawl failed";
        row.finishedAt = new Date().toISOString();
      }
    });
  }

  return { crawlId: crawl.id };
}
