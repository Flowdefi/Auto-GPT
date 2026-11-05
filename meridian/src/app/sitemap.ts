import type { MetadataRoute } from "next";
import { agencyPages } from "@/lib/agency/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.MERIDIAN_PUBLIC_URL || "http://localhost:3000";
  return [
    { url: `${base}/agency`, changeFrequency: "monthly", priority: 0.8 },
    ...agencyPages().map((page) => ({ url: `${base}/agency/${page.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
