import type { MetadataRoute } from "next"

import { TOURNAMENTS } from "@/lib/data/tournaments"
import { SITE_URL } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-09-14T00:00:00+06:00")

  return [
    {
      url: SITE_URL,
      lastModified: updated,
      changeFrequency: "hourly",
      priority: 1,
    },
    ...TOURNAMENTS.map((tournament) => ({
      url: `${SITE_URL}/tournaments/${tournament.slug}`,
      lastModified: updated,
      changeFrequency: "daily" as const,
      priority: tournament.featured ? 0.9 : 0.7,
    })),
  ]
}
