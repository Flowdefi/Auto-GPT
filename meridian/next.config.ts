import type { NextConfig } from "next";
import { NO_STORE, ROBOTS_NOINDEX, SECURITY_HEADERS } from "./src/server/security-headers";

const noStore = [{ key: "Cache-Control", value: NO_STORE }];
const privatePage = [...ROBOTS_NOINDEX, ...noStore];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Cache Components and `use cache` are intentionally off. Do not enable them
  // without re-reading the current Next.js security advisories.
  images: { dangerouslyAllowSVG: false },
  serverExternalPackages: [],
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/api/:path*", headers: privatePage },
      { source: "/w/:path*", headers: privatePage },
      { source: "/collect/:path*", headers: privatePage },
      { source: "/pay/:path*", headers: privatePage },
      { source: "/login", headers: privatePage },
      { source: "/signup", headers: privatePage },
      { source: "/billing", headers: privatePage },
      { source: "/pricing", headers: privatePage },
    ];
  },
};

export default nextConfig;
