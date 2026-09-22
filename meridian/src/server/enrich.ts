import { createHash } from "node:crypto";
import { promises as dns } from "dns";
import type { WorkspaceId } from "@/lib/types";
import { domainOf, isFreeMailDomain } from "./crm";
import { loadDb, mutate } from "./db";
import { assertPublicHostname, parsePublicHttpUrl } from "./http-guard";

export interface EnrichmentResult {
  domain: string;
  resolved: boolean;
  title?: string;
  description?: string;
  logo?: string;
  canonicalUrl?: string;
  schemaTypes: string[];
  socials: Record<string, string>;
  technologies: string[];
  mxProvider?: string;
  mxHosts: string[];
  hasSpf: boolean;
  hasDmarc: boolean;
  phones: string[];
  addresses: string[];
  emailPattern?: string;
  sitemapUrl?: string;
  fetchedAt: string;
  notes: string[];
}

const UA = "MeridianCRM/1.0 (+https://debtmarket.net; enrichment)";
const TIMEOUT_MS = 8000;

async function fetchText(url: string): Promise<{ ok: boolean; body: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const safe = parsePublicHttpUrl(url);
    const response = await fetch(safe.toString(), {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    return { ok: response.ok, body: body.slice(0, 400_000), finalUrl: response.url };
  } catch {
    return { ok: false, body: "", finalUrl: url };
  } finally {
    clearTimeout(timer);
  }
}

function meta(html: string, names: string[]): string | undefined {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["']`,
      "i",
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:name|property)=["']${name}["']`,
      "i",
    );
    const hit = html.match(pattern) ?? html.match(alt);
    if (hit?.[1]) return decodeEntities(hit[1].trim());
  }
  return undefined;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'");
}

const TECH_FINGERPRINTS: Array<{ name: string; test: RegExp }> = [
  { name: "WordPress", test: /wp-content|wp-includes/i },
  { name: "HubSpot", test: /hs-scripts\.com|hubspot/i },
  { name: "Salesforce", test: /salesforce|pardot/i },
  { name: "Marketo", test: /marketo/i },
  { name: "Webflow", test: /webflow/i },
  { name: "Shopify", test: /cdn\.shopify/i },
  { name: "Next.js", test: /__NEXT_DATA__|\/_next\//i },
  { name: "React", test: /react(-dom)?(\.production)?\.min\.js/i },
  { name: "Google Analytics", test: /googletagmanager|gtag\(|google-analytics/i },
  { name: "Cloudflare", test: /cloudflare|cf-ray/i },
  { name: "Drupal", test: /drupal/i },
  { name: "Squarespace", test: /squarespace/i },
  { name: "Intercom", test: /intercom/i },
  { name: "Drift", test: /drift\.com|driftt/i },
];

const MX_PROVIDERS: Array<{ name: string; test: RegExp }> = [
  { name: "Microsoft 365", test: /outlook\.com|protection\.outlook|office365/i },
  { name: "Google Workspace", test: /google\.com|googlemail/i },
  { name: "Proofpoint", test: /pphosted|proofpoint/i },
  { name: "Mimecast", test: /mimecast/i },
  { name: "Barracuda", test: /barracuda/i },
  { name: "Cisco", test: /iphmx|cisco/i },
  { name: "Zoho", test: /zoho/i },
  { name: "Fastmail", test: /fastmail|messagingengine/i },
];

function socialLinks(html: string): Record<string, string> {
  const socials: Record<string, string> = {};
  const patterns: Array<[string, RegExp]> = [
    ["linkedin", /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_\-%.]+/i],
    ["x", /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_]+/i],
    ["facebook", /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.\-]+/i],
    ["youtube", /https?:\/\/(?:www\.)?youtube\.com\/(?:c|channel|@)[A-Za-z0-9_\-/]+/i],
    ["crunchbase", /https?:\/\/(?:www\.)?crunchbase\.com\/organization\/[A-Za-z0-9_\-]+/i],
    ["github", /https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_\-]+/i],
  ];
  for (const [key, pattern] of patterns) {
    const hit = html.match(pattern);
    if (hit?.[0]) socials[key] = hit[0];
  }
  return socials;
}

function schemaTypes(html: string): string[] {
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const types = new Set<string>();
  for (const block of blocks) {
    const inner = block.replace(/<[^>]+>/g, "");
    for (const hit of inner.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) {
      if (hit[1]) types.add(hit[1]);
    }
  }
  return [...types];
}

function phones(html: string): string[] {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const found = new Set<string>();
  for (const hit of text.matchAll(/(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g)) {
    if (hit[0]) found.add(hit[0].trim());
  }
  return [...found].slice(0, 5);
}

function addresses(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const found = new Set<string>();
  const pattern =
    /\d{1,6}\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,4}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Suite|Ste|Lane|Ln|Parkway|Pkwy|Way|Court|Ct)\b[^.]{0,60}/g;
  for (const hit of text.matchAll(pattern)) {
    if (hit[0]) found.add(hit[0].trim());
  }
  return [...found].slice(0, 3);
}

/** Common corporate local-part conventions, inferred from a known address. */
export function inferEmailPattern(email: string, firstName: string, lastName: string): string | undefined {
  const local = email.split("@")[0]?.toLowerCase();
  if (!local) return undefined;
  const first = firstName.toLowerCase();
  const last = lastName.toLowerCase();
  if (!first || !last) return undefined;
  if (local === `${first}.${last}`) return "{first}.{last}";
  if (local === `${first}${last}`) return "{first}{last}";
  if (local === `${first[0]}${last}`) return "{f}{last}";
  if (local === `${first}_${last}`) return "{first}_{last}";
  if (local === `${last}${first[0]}`) return "{last}{f}";
  if (local === first) return "{first}";
  return undefined;
}

async function dnsFacts(domain: string): Promise<{
  mxHosts: string[];
  mxProvider?: string;
  hasSpf: boolean;
  hasDmarc: boolean;
}> {
  const mxHosts: string[] = [];
  let mxProvider: string | undefined;
  let hasSpf = false;
  let hasDmarc = false;

  try {
    const records = await dns.resolveMx(domain);
    for (const record of records.sort((a, b) => a.priority - b.priority).slice(0, 5)) {
      mxHosts.push(record.exchange);
    }
    const joined = mxHosts.join(" ");
    mxProvider = MX_PROVIDERS.find((provider) => provider.test.test(joined))?.name;
  } catch {
    /* no MX is itself a signal */
  }

  try {
    const txt = await dns.resolveTxt(domain);
    hasSpf = txt.some((chunks) => chunks.join("").toLowerCase().startsWith("v=spf1"));
  } catch {
    /* ignore */
  }

  try {
    const txt = await dns.resolveTxt(`_dmarc.${domain}`);
    hasDmarc = txt.some((chunks) => chunks.join("").toLowerCase().includes("v=dmarc1"));
  } catch {
    /* ignore */
  }

  return { mxHosts, mxProvider, hasSpf, hasDmarc };
}

/**
 * Enrichment from sources that are public and free: the company's own site,
 * its structured data, and its DNS records. No third-party data broker.
 */
export async function enrichDomain(domain: string): Promise<EnrichmentResult> {
  let clean: string;
  try {
    clean = assertPublicHostname(domain);
  } catch {
    return {
      domain,
      resolved: false,
      schemaTypes: [],
      socials: {},
      technologies: [],
      mxHosts: [],
      hasSpf: false,
      hasDmarc: false,
      phones: [],
      addresses: [],
      fetchedAt: new Date().toISOString(),
      notes: ["Domain is not a public hostname."],
    };
  }
  const notes: string[] = [];
  const result: EnrichmentResult = {
    domain: clean,
    resolved: false,
    schemaTypes: [],
    socials: {},
    technologies: [],
    mxHosts: [],
    hasSpf: false,
    hasDmarc: false,
    phones: [],
    addresses: [],
    fetchedAt: new Date().toISOString(),
    notes,
  };

  if (!clean || isFreeMailDomain(clean)) {
    notes.push("Free or missing mail domain — no company site to enrich from.");
    return result;
  }

  const dnsResult = await dnsFacts(clean);
  result.mxHosts = dnsResult.mxHosts;
  result.mxProvider = dnsResult.mxProvider;
  result.hasSpf = dnsResult.hasSpf;
  result.hasDmarc = dnsResult.hasDmarc;
  if (dnsResult.mxProvider) notes.push(`Mail runs on ${dnsResult.mxProvider}.`);

  let page = await fetchText(`https://${clean}/`);
  if (!page.ok || !page.body) {
    page = await fetchText(`https://www.${clean}/`);
  }

  if (!page.ok || !page.body) {
    notes.push("Site did not respond to an anonymous request.");
    return result;
  }

  result.resolved = true;
  result.canonicalUrl = page.finalUrl;
  result.title =
    meta(page.body, ["og:site_name", "og:title"]) ??
    decodeEntities(page.body.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "");
  result.description = meta(page.body, ["description", "og:description"]);
  result.logo = meta(page.body, ["og:image", "twitter:image"]);
  result.schemaTypes = schemaTypes(page.body);
  result.socials = socialLinks(page.body);
  result.technologies = TECH_FINGERPRINTS.filter((tech) => tech.test.test(page.body)).map((tech) => tech.name);
  result.phones = phones(page.body);
  result.addresses = addresses(page.body);

  const sitemap = await fetchText(`https://${clean}/sitemap.xml`);
  if (sitemap.ok && sitemap.body.includes("<urlset")) {
    result.sitemapUrl = `https://${clean}/sitemap.xml`;
  }

  if (result.technologies.length) notes.push(`Stack: ${result.technologies.join(", ")}.`);
  if (result.schemaTypes.length) notes.push(`Structured data: ${result.schemaTypes.join(", ")}.`);
  if (!result.hasDmarc) notes.push("No DMARC record — outbound to them may be filtered harder.");

  return result;
}

export async function enrichCompanyRecord(
  workspaceId: WorkspaceId,
  companyId: string,
): Promise<{ ok: boolean; result?: EnrichmentResult; error?: string }> {
  const db = loadDb();
  const company = db.companies.find((row) => row.id === companyId && row.workspaceId === workspaceId);
  if (!company) return { ok: false, error: "Company not found" };

  let domain = company.domain;
  if (!domain) {
    const contact = db.contacts.find((row) => row.companyId === companyId);
    domain = contact ? domainOf(contact.email) : "";
  }
  if (!domain || isFreeMailDomain(domain)) {
    return { ok: false, error: "No corporate domain on this record" };
  }

  const result = await enrichDomain(domain);

  mutate((state) => {
    const row = state.companies.find((item) => item.id === companyId);
    if (!row) return;
    row.domain = row.domain || result.domain;
    row.enrichedAt = result.fetchedAt;
    row.enrichment = result as unknown as Record<string, unknown>;
    if (!row.industry && result.description) {
      row.industry = result.description.slice(0, 80);
    }
    if (!row.notes || row.notes === "Created from inbound capture.") {
      row.notes = result.notes.join(" ") || row.notes;
    }

    // Infer the email convention from any known contact so reps can guess addresses.
    const contact = state.contacts.find((item) => item.companyId === companyId && item.email);
    if (contact) {
      const pattern = inferEmailPattern(contact.email, contact.firstName, contact.lastName);
      if (pattern) {
        row.enrichment = { ...(row.enrichment ?? {}), emailPattern: pattern };
      }
    }
  });

  return { ok: true, result };
}

export interface ContactEnrichment {
  avatarUrl?: string;
  gravatarChecked: boolean;
  wikidata?: {
    id?: string;
    label?: string;
    description?: string;
    website?: string;
    headquarters?: string;
    query: string;
  };
  company?: { ok: boolean; error?: string };
  notes: string[];
  fetchedAt: string;
}

interface WikiSearchResponse {
  search?: Array<{ id?: string; label?: string; description?: string }>;
}

interface WikiClaim {
  mainsnak?: { datavalue?: { value?: string | { id?: string } } };
}

interface WikiEntity {
  labels?: Record<string, { value?: string }>;
  descriptions?: Record<string, { value?: string }>;
  claims?: Record<string, WikiClaim[]>;
}

interface WikiEntityResponse {
  entities?: Record<string, WikiEntity>;
}

async function fetchJson<T>(url: URL): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function wikidataLookup(query: string): Promise<ContactEnrichment["wikidata"]> {
  const searchUrl = new URL("https://www.wikidata.org/w/api.php");
  searchUrl.searchParams.set("action", "wbsearchentities");
  searchUrl.searchParams.set("search", query);
  searchUrl.searchParams.set("language", "en");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("limit", "1");
  searchUrl.searchParams.set("origin", "*");
  const search = await fetchJson<WikiSearchResponse>(searchUrl);
  const hit = search?.search?.[0];
  if (!hit?.id) {
    return { query };
  }
  const entityUrl = new URL("https://www.wikidata.org/w/api.php");
  entityUrl.searchParams.set("action", "wbgetentities");
  entityUrl.searchParams.set("ids", hit.id);
  entityUrl.searchParams.set("props", "labels|descriptions|claims");
  entityUrl.searchParams.set("languages", "en");
  entityUrl.searchParams.set("format", "json");
  entityUrl.searchParams.set("origin", "*");
  const payload = await fetchJson<WikiEntityResponse>(entityUrl);
  const entity = payload?.entities?.[hit.id];
  const websiteClaim = entity?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
  const website = typeof websiteClaim === "string" ? websiteClaim : undefined;
  const hqClaim = entity?.claims?.P159?.[0]?.mainsnak?.datavalue?.value;
  const hqId = hqClaim && typeof hqClaim === "object" ? hqClaim.id : undefined;
  let headquarters: string | undefined;
  if (hqId) {
    const hqUrl = new URL("https://www.wikidata.org/w/api.php");
    hqUrl.searchParams.set("action", "wbgetentities");
    hqUrl.searchParams.set("ids", hqId);
    hqUrl.searchParams.set("props", "labels");
    hqUrl.searchParams.set("languages", "en");
    hqUrl.searchParams.set("format", "json");
    hqUrl.searchParams.set("origin", "*");
    const hqPayload = await fetchJson<WikiEntityResponse>(hqUrl);
    headquarters = hqPayload?.entities?.[hqId]?.labels?.en?.value;
  }
  return {
    id: hit.id,
    label: entity?.labels?.en?.value ?? hit.label,
    description: entity?.descriptions?.en?.value ?? hit.description,
    website,
    headquarters,
    query,
  };
}

export async function enrichContactRecord(
  workspaceId: WorkspaceId,
  contactId: string,
): Promise<{ ok: boolean; enrichment?: ContactEnrichment; error?: string }> {
  const db = loadDb();
  const contact = db.contacts.find((row) => row.id === contactId && row.workspaceId === workspaceId);
  if (!contact) return { ok: false, error: "Contact not found" };
  const company = db.companies.find((row) => row.id === contact.companyId);
  const notes: string[] = [];
  const enrichment: ContactEnrichment = {
    gravatarChecked: false,
    notes,
    fetchedAt: new Date().toISOString(),
  };

  if (contact.email.includes("@")) {
    const hash = createHash("md5").update(contact.email.trim().toLowerCase()).digest("hex");
    const probe = `https://www.gravatar.com/avatar/${hash}?d=404&s=160`;
    enrichment.gravatarChecked = true;
    try {
      const response = await fetch(probe, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) {
        enrichment.avatarUrl = `https://www.gravatar.com/avatar/${hash}?s=160`;
        notes.push("Gravatar avatar found.");
      } else {
        notes.push("No Gravatar for this email.");
      }
    } catch {
      notes.push("Gravatar did not respond.");
    }
  }

  const query = company?.name?.trim() || `${contact.firstName} ${contact.lastName}`.trim();
  if (query) {
    enrichment.wikidata = await wikidataLookup(query);
    if (enrichment.wikidata?.description) {
      notes.push(`Wikidata: ${enrichment.wikidata.description}`);
    } else if (!enrichment.wikidata?.id) {
      notes.push(`No Wikidata hit for "${query}".`);
    }
  }

  const domain = company?.domain || domainOf(contact.email);
  if (company && domain && !isFreeMailDomain(domain)) {
    const companyResult = await enrichCompanyRecord(workspaceId, company.id);
    enrichment.company = { ok: companyResult.ok, error: companyResult.error };
    if (companyResult.ok) notes.push("Company domain enrichment stored on the company record.");
    else if (companyResult.error) notes.push(companyResult.error);
  } else if (!domain || isFreeMailDomain(domain)) {
    notes.push("No corporate domain on this contact, so site enrichment was skipped.");
  }

  mutate((state) => {
    const row = state.contacts.find((item) => item.id === contactId);
    if (!row) return;
    row.enrichedAt = enrichment.fetchedAt;
    row.enrichment = { ...enrichment };
    row.lastActivityAt = enrichment.fetchedAt;
  });

  return { ok: true, enrichment };
}
