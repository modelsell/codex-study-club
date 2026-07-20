import type { MetadataRoute } from "next";
import { cases, updates } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const staticRoutes = ["", "/learn/getting-started", "/cases", "/community", "/community/updates"];

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route}`,
      lastModified: new Date("2026-07-20"),
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.8,
    })),
    ...cases.map((item) => ({
      url: `${base}/cases/${item.slug}`,
      lastModified: new Date(item.checkedAt || "2026-07-20"),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...updates.map((item) => ({
      url: `${base}/community/updates/${item.slug}`,
      lastModified: new Date(item.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
