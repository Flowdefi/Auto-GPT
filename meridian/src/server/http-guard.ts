import type { WorkspaceId } from "@/lib/types";
import { workspaceOf } from "@/lib/workspaces";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "0.0.0.0",
  "[::1]",
  "::1",
  "metadata.google.internal",
]);

function isBlockedHostname(host: string): boolean {
  const hostname = host.replace(/^\[|]$/g, "").toLowerCase();
  if (BLOCKED_HOSTS.has(hostname)) return true;
  if (hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return true;
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    return true;
  }
  if (hostname.includes(":")) {
    return true;
  }
  return false;
}

/** Parse an outbound URL and reject private, local, and credentialed targets. */
export function parsePublicHttpUrl(raw: string): URL {
  const candidate = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("Credentials in URLs are not allowed");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error("That host is not allowed");
  }
  return url;
}

/** SEO crawls may only start on the workspace's own public site. */
export function assertWorkspaceSite(workspaceId: WorkspaceId, raw: string): URL {
  const url = parsePublicHttpUrl(raw);
  const allowed = workspaceOf(workspaceId).domain.toLowerCase();
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== allowed && !host.endsWith(`.${allowed}`)) {
    throw new Error(`Crawl start must stay on ${allowed}`);
  }
  return url;
}

/** Company enrichment only fetches registrable public hostnames, never IPs. */
export function assertPublicHostname(hostname: string): string {
  const clean = hostname
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
  if (!clean || clean.includes("/") || isBlockedHostname(clean) || !clean.includes(".")) {
    throw new Error("That domain is not allowed");
  }
  return clean;
}
