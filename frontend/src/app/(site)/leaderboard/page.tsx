import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { LeaderboardTable } from "@/components/marketing/leaderboard-section"
import { FaceitSourceNote } from "@/components/player/faceit-note"
import { JsonLd } from "@/components/seo/json-ld"
import { getLeaderboard } from "@/lib/api"
import { breadcrumbLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Лидерборд игроков CS2 Кыргызстана",
  description:
    "Рейтинг киберспортсменов Кыргызстана: очки сезона, FACEIT ELO и уровень, сыгранные карты и процент побед.",
  alternates: { canonical: "/leaderboard" },
}

export default async function LeaderboardPage() {
  const { items, total } = await getLeaderboard(100)

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Главная", path: "/" },
          { name: "Лидерборд", path: "/leaderboard" },
        ])}
      />
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "Лидерборд" }]}
        title="Лидерборд игроков"
        description={`В рейтинге ${total} игроков. Очки начисляются за выигранные карты и серии, а рейтинг определяет пояс при жеребьевке составов.`}
      />

      <section className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-12 sm:px-8">
        <FaceitSourceNote live={process.env.NEXT_PUBLIC_FACEIT_LIVE === "true"} />
        <LeaderboardTable rows={items} />
      </section>
    </>
  )
}
