import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { LeaderboardTable } from "@/components/marketing/leaderboard-section"
import { PlayerTable } from "@/components/player/player-table"
import { FaceitSourceNote } from "@/components/player/faceit-note"
import { JsonLd } from "@/components/seo/json-ld"
import { breadcrumbLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Лидерборд команд и игроков CS2 Кыргызстана",
  description:
    "Рейтинг киберспортивных команд и игроков Кыргызстана: очки сезона, FACEIT ELO и уровень, K/D, процент побед и заработанные призовые.",
  alternates: { canonical: "/leaderboard" },
}

export default function LeaderboardPage() {
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
        title="Лидерборд"
        description="Очки сезона начисляются за места в турнирах и выигранные карты. Рейтинг определяет посев в сетке и приглашения в закрытые дивизионы."
      />

      <section className="mx-auto flex max-w-[1440px] flex-col gap-14 px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-5">
          <h2 className="font-display text-[20px] font-bold text-white">Команды</h2>
          <LeaderboardTable />
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-[20px] font-bold text-white">Игроки</h2>
            <FaceitSourceNote live={Boolean(process.env.FACEIT_API_KEY)} />
          </div>
          <PlayerTable />
        </div>
      </section>
    </>
  )
}
