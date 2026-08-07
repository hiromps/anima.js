import type { MetadataRoute } from "next";
import { registry } from "@/registry";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    ...registry.map((entry) => ({
      url: `${siteUrl}/playground/${entry.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
