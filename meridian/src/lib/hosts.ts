export interface HostSplit {
  publicHost: string;
  adminHost: string;
  publicOrigin: string;
  adminOrigin: string;
}

export function hostSplit(env: NodeJS.ProcessEnv = process.env): HostSplit | null {
  const publicOrigin = (env.MERIDIAN_PUBLIC_URL ?? "").replace(/\/$/, "");
  const adminOrigin = (env.MERIDIAN_ADMIN_URL ?? "").replace(/\/$/, "");
  if (!publicOrigin.startsWith("http") || !adminOrigin.startsWith("http")) return null;
  try {
    const publicHost = new URL(publicOrigin).host.toLowerCase();
    const adminHost = new URL(adminOrigin).host.toLowerCase();
    if (!publicHost || !adminHost || publicHost === adminHost) return null;
    return { publicHost, adminHost, publicOrigin, adminOrigin };
  } catch {
    return null;
  }
}

export function requestHostname(headers: { get(name: string): string | null }): string {
  const raw = headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
  return raw.split(",")[0]?.trim().toLowerCase().replace(/:\d+$/, "") ?? "";
}

export function isConsumerPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/agency" || pathname.startsWith("/agency/")) return true;
  if (pathname === "/collect" || pathname.startsWith("/collect/")) return true;
  if (pathname.startsWith("/pay/")) return true;
  if (pathname.startsWith("/u/")) return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  if (pathname === "/api/brand" || pathname.startsWith("/api/agency") || pathname.startsWith("/api/portal")) return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/api/email/track/") || pathname === "/api/email/unsubscribe") return true;
  return false;
}

export function isSharedPath(pathname: string): boolean {
  if (pathname === "/api/health") return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico" || pathname === "/manifest.json") return true;
  return /\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|webmanifest|css|js|map)$/i.test(pathname);
}

export type HostDecision = { kind: "next" } | { kind: "redirect"; url: string } | { kind: "wrong-host" };

/** Split crm (admin) from collect (public). Localhost is unchanged when the split is unset. */
export function hostDecision(hostname: string, pathname: string, search: string, split: HostSplit | null): HostDecision {
  if (!split) return { kind: "next" };
  const host = hostname.toLowerCase();
  if (isSharedPath(pathname)) return { kind: "next" };
  const query = search && !search.startsWith("?") ? `?${search}` : search;
  if (host === split.publicHost) {
    if (pathname === "/") return { kind: "redirect", url: `${split.publicOrigin}/agency` };
    if (isConsumerPath(pathname)) return { kind: "next" };
    if (pathname.startsWith("/api/")) return { kind: "wrong-host" };
    return { kind: "redirect", url: `${split.adminOrigin}${pathname}${query}` };
  }
  if (host === split.adminHost && isConsumerPath(pathname) && pathname !== "/") {
    return { kind: "redirect", url: `${split.publicOrigin}${pathname}${query}` };
  }
  return { kind: "next" };
}
