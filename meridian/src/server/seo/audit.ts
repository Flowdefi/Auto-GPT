import type { WorkspaceId } from "@/lib/types";
import { nextId } from "../db";
import type { SeoIssue, SeoPage } from "../models";

/**
 * Issue rules follow the Lighthouse/SEOnaut convention: each finding carries a
 * category, a severity, and a weight so site health is a single number.
 */
interface Rule {
  code: string;
  category: SeoIssue["category"];
  severity: SeoIssue["severity"];
  weight: number;
  title: string;
  test: (page: SeoPage) => boolean;
  detail: (page: SeoPage) => string;
  recommendation: string;
}

const PAGE_RULES: Rule[] = [
  {
    code: "status-5xx",
    category: "crawlability",
    severity: "error",
    weight: 10,
    title: "Server error",
    test: (page) => page.status >= 500,
    detail: (page) => `Returned HTTP ${page.status}.`,
    recommendation: "Fix the server error. Search engines drop pages that keep failing.",
  },
  {
    code: "status-4xx",
    category: "crawlability",
    severity: "error",
    weight: 8,
    title: "Broken page",
    test: (page) => page.status >= 400 && page.status < 500,
    detail: (page) => `Returned HTTP ${page.status}.`,
    recommendation: "Restore the page or redirect it to the closest equivalent.",
  },
  {
    code: "unreachable",
    category: "crawlability",
    severity: "error",
    weight: 9,
    title: "Page did not respond",
    test: (page) => page.status === 0,
    detail: () => "The request timed out or the connection failed.",
    recommendation: "Check DNS, TLS, and firewall rules for bot traffic.",
  },
  {
    code: "title-missing",
    category: "meta",
    severity: "error",
    weight: 7,
    title: "Missing title tag",
    test: (page) => page.status === 200 && page.titleLength === 0,
    detail: () => "No <title> element was found.",
    recommendation: "Add a unique 50–60 character title with the primary term near the front.",
  },
  {
    code: "title-length",
    category: "meta",
    severity: "warning",
    weight: 3,
    title: "Title length outside the display range",
    test: (page) => page.titleLength > 0 && (page.titleLength < 30 || page.titleLength > 65),
    detail: (page) => `Title is ${page.titleLength} characters.`,
    recommendation: "Keep titles between 30 and 65 characters so they are not truncated.",
  },
  {
    code: "meta-missing",
    category: "meta",
    severity: "warning",
    weight: 4,
    title: "Missing meta description",
    test: (page) => page.status === 200 && page.metaLength === 0,
    detail: () => "No meta description was found.",
    recommendation: "Write a 140–160 character description that states the offer and a next step.",
  },
  {
    code: "meta-length",
    category: "meta",
    severity: "notice",
    weight: 2,
    title: "Meta description length",
    test: (page) => page.metaLength > 0 && (page.metaLength < 70 || page.metaLength > 165),
    detail: (page) => `Description is ${page.metaLength} characters.`,
    recommendation: "Target 140–160 characters.",
  },
  {
    code: "h1-missing",
    category: "structure",
    severity: "warning",
    weight: 4,
    title: "Missing H1",
    test: (page) => page.status === 200 && page.h1.length === 0,
    detail: () => "No H1 heading was found.",
    recommendation: "Give every page exactly one H1 that matches search intent.",
  },
  {
    code: "h1-multiple",
    category: "structure",
    severity: "notice",
    weight: 2,
    title: "Multiple H1 headings",
    test: (page) => page.h1.length > 1,
    detail: (page) => `${page.h1.length} H1 elements found.`,
    recommendation: "Demote the extras to H2 so the page has one clear topic.",
  },
  {
    code: "thin-content",
    category: "content",
    severity: "warning",
    weight: 5,
    title: "Thin content",
    test: (page) => page.status === 200 && page.wordCount < 250,
    detail: (page) => `Only ${page.wordCount} words of visible copy.`,
    recommendation: "Expand to at least 600 words, or consolidate into a stronger page.",
  },
  {
    code: "hard-to-read",
    category: "content",
    severity: "notice",
    weight: 2,
    title: "Reading level is heavy",
    test: (page) => page.wordCount > 200 && page.readability < 35,
    detail: (page) => `Flesch reading ease is ${page.readability}.`,
    recommendation: "Shorten sentences. Institutional does not have to mean unreadable.",
  },
  {
    code: "img-alt",
    category: "content",
    severity: "warning",
    weight: 3,
    title: "Images missing alt text",
    test: (page) => page.imagesMissingAlt > 0,
    detail: (page) => `${page.imagesMissingAlt} of ${page.images} images have no alt attribute.`,
    recommendation: "Describe each image. This is an accessibility requirement as well as an SEO one.",
  },
  {
    code: "canonical-missing",
    category: "meta",
    severity: "notice",
    weight: 2,
    title: "No canonical link",
    test: (page) => page.status === 200 && !page.canonical,
    detail: () => "No rel=canonical was declared.",
    recommendation: "Declare a self-referencing canonical to absorb duplicate URLs.",
  },
  {
    code: "noindex",
    category: "crawlability",
    severity: "error",
    weight: 8,
    title: "Page is set to noindex",
    test: (page) => /noindex/i.test(page.robots),
    detail: (page) => `Robots meta is "${page.robots}".`,
    recommendation: "Remove noindex if this page should rank.",
  },
  {
    code: "no-schema",
    category: "schema",
    severity: "notice",
    weight: 2,
    title: "No structured data",
    test: (page) => page.status === 200 && !page.hasSchema,
    detail: () => "No JSON-LD was found.",
    recommendation: "Add Organization, FAQ, or Article schema so answer engines can cite the page.",
  },
  {
    code: "no-opengraph",
    category: "meta",
    severity: "notice",
    weight: 1,
    title: "No Open Graph tags",
    test: (page) => page.status === 200 && !page.hasOpenGraph,
    detail: () => "No og: tags were found.",
    recommendation: "Add og:title, og:description, and og:image so shared links render.",
  },
  {
    code: "slow-response",
    category: "performance",
    severity: "warning",
    weight: 4,
    title: "Slow server response",
    test: (page) => page.responseMs > 1200 && page.status === 200,
    detail: (page) => `Responded in ${page.responseMs}ms.`,
    recommendation: "Target under 600ms. Cache at the edge or precompute the page.",
  },
  {
    code: "heavy-page",
    category: "performance",
    severity: "notice",
    weight: 2,
    title: "Large HTML payload",
    test: (page) => page.bytes > 300_000,
    detail: (page) => `HTML is ${Math.round(page.bytes / 1024)}KB before assets.`,
    recommendation: "Trim inline scripts and defer non-critical markup.",
  },
  {
    code: "orphan-risk",
    category: "links",
    severity: "notice",
    weight: 2,
    title: "Few internal links out",
    test: (page) => page.status === 200 && page.internalLinks < 3,
    detail: (page) => `Only ${page.internalLinks} internal links.`,
    recommendation: "Link to related pages so authority and crawlers can flow through.",
  },
];

export function auditPage(page: SeoPage, crawlId: string, workspaceId: WorkspaceId): SeoIssue[] {
  return PAGE_RULES.filter((rule) => rule.test(page)).map((rule) => ({
    id: nextId("is"),
    crawlId,
    workspaceId,
    url: page.url,
    code: rule.code,
    category: rule.category,
    severity: rule.severity,
    weight: rule.weight,
    title: rule.title,
    detail: rule.detail(page),
    recommendation: rule.recommendation,
  }));
}

export function auditSite(
  pages: SeoPage[],
  crawlId: string,
  workspaceId: WorkspaceId,
  context: { robotsFound: boolean; sitemapFound: boolean; orphans: string[] },
): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const add = (issue: Omit<SeoIssue, "id" | "crawlId" | "workspaceId">) => {
    issues.push({ id: nextId("is"), crawlId, workspaceId, ...issue });
  };

  if (!context.robotsFound) {
    add({
      url: "/robots.txt",
      code: "robots-missing",
      category: "crawlability",
      severity: "warning",
      weight: 4,
      title: "No robots.txt",
      detail: "The crawler could not read /robots.txt.",
      recommendation: "Publish robots.txt and reference the sitemap from it.",
    });
  }

  if (!context.sitemapFound) {
    add({
      url: "/sitemap.xml",
      code: "sitemap-missing",
      category: "crawlability",
      severity: "warning",
      weight: 5,
      title: "No XML sitemap",
      detail: "No sitemap was found at the usual locations.",
      recommendation: "Publish sitemap.xml and submit it in Search Console.",
    });
  }

  // Duplicate titles and bodies split ranking signals across URLs.
  const byTitle = new Map<string, string[]>();
  const byHash = new Map<string, string[]>();
  for (const page of pages) {
    if (page.status !== 200) continue;
    if (page.title) {
      byTitle.set(page.title, [...(byTitle.get(page.title) ?? []), page.url]);
    }
    byHash.set(page.contentHash, [...(byHash.get(page.contentHash) ?? []), page.url]);
  }

  for (const [title, urls] of byTitle.entries()) {
    if (urls.length > 1) {
      add({
        url: urls[0]!,
        code: "duplicate-title",
        category: "meta",
        severity: "warning",
        weight: 4,
        title: "Duplicate title tag",
        detail: `"${title}" is used on ${urls.length} pages: ${urls.slice(0, 4).join(", ")}`,
        recommendation: "Give each page a distinct title, or canonicalize the duplicates.",
      });
    }
  }

  for (const [, urls] of byHash.entries()) {
    if (urls.length > 1) {
      add({
        url: urls[0]!,
        code: "duplicate-content",
        category: "content",
        severity: "warning",
        weight: 5,
        title: "Near-duplicate content",
        detail: `${urls.length} pages share the same body text: ${urls.slice(0, 4).join(", ")}`,
        recommendation: "Consolidate into one page and redirect the rest.",
      });
    }
  }

  for (const url of context.orphans.slice(0, 20)) {
    add({
      url,
      code: "orphan-page",
      category: "links",
      severity: "warning",
      weight: 3,
      title: "Orphan page",
      detail: "No internal page links to this URL.",
      recommendation: "Link to it from a relevant hub page or drop it from the sitemap.",
    });
  }

  return issues;
}
