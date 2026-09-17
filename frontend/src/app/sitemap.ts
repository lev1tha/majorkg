import type { MetadataRoute } from "next"

import { getTournaments } from "@/lib/api"
import { SITE_URL } from "@/lib/seo"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updated = new Date()
  const { items } = await getTournaments({ limit: 200 })

  const staticPages = ["/", "/tournaments", "/bracket", "/players", "/leaderboard", "/mix", "/faq"]

  return [
    ...staticPages.map((path) => ({
      url: `${SITE_URL}${path === "/" ? "" : path}`,
      lastModified: updated,
      changeFrequency: (path === "/" ? "hourly" : "daily") as "hourly" | "daily",
      priority: path === "/" ? 1 : 0.8,
    })),
    ...items.map((tournament) => ({
      url: `${SITE_URL}/tournaments/${tournament.slug}`,
      lastModified: updated,
      changeFrequency: "daily" as const,
      priority: tournament.featured ? 0.9 : 0.7,
    })),
  ]
}
