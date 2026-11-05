import type { NextConfig } from "next";
import { NO_STORE, SECURITY_HEADERS } from "./src/server/security-headers";

const noStore = [{ key: "Cache-Control", value: NO_STORE }];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: [],
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/api/:path*", headers: noStore },
      { source: "/w/:path*", headers: noStore },
      { source: "/login", headers: noStore },
      { source: "/signup", headers: noStore },
      { source: "/billing", headers: noStore },
      { source: "/pricing", headers: noStore },
    ];
  },
};

export default nextConfig;
