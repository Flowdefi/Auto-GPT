const CLOSED_PAGES = ["/signup", "/pricing", "/billing"];
const CLOSED_APIS = ["/api/auth/signup", "/api/billing"];

/** Pages and APIs that disappear on a self-hosted owner desk. */
export function selfHostClosure(pathname: string): "page" | "api" | null {
  if (CLOSED_APIS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return "api";
  if (CLOSED_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return "page";
  return null;
}

/** Only same-origin paths. Marketing and auth endpoints are not return targets. */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/w/triton/home";
  }
  const path = value.split("?")[0] ?? value;
  if (
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/signup" ||
    path.startsWith("/signup/") ||
    path === "/pricing" ||
    path.startsWith("/pricing/") ||
    path === "/billing" ||
    path.startsWith("/billing/") ||
    path.startsWith("/api/auth/access")
  ) {
    return "/w/triton/home";
  }
  return value;
}
