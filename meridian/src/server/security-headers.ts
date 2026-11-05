/** Shared by next.config and middleware. No Node-only imports. */

export const ROBOTS_TAG = "noindex, nofollow, noarchive, nosnippet";

export const SECURITY_HEADERS: Array<{ key: string; value: string }> = [
  { key: "X-Robots-Tag", value: ROBOTS_TAG },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.polar.sh https://sandbox-api.polar.sh",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

export const NO_STORE = "private, no-store";

export function noStorePath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/w/") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/billing" ||
    pathname === "/pricing"
  );
}
