import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: [],
  // Docker uses standalone. OpenNext builds a Workers bundle instead.
  output: process.env.OPENNEXT ? undefined : "standalone",
};

export default nextConfig;
