import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Docker uses standalone. OpenNext builds a Workers bundle instead.
  output: process.env.OPENNEXT ? undefined : "standalone",
};

export default nextConfig;
