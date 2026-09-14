import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { PlayerTable } from "@/components/player/player-table"
import { FaceitSourceNote } from "@/components/player/faceit-note"
import { JsonLd } from "@/components/seo/json-ld"
import { PLAYERS } from "@/lib/data/players"
import { breadcrumbLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Игроки CS2 Кыргызстана — рейтинг, FACEIT ELO и статистика",
  description:
    "Таблица игроков CS2 из Кыргызстана: FACEIT уровень и ELO, рейтинг, K/D, процент хедшотов, команда и сыгранные карты. Поиск игрока и переход в профиль со статистикой матчей.",
  alternates: { canonical: "/players" },
}

export default function PlayersPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Главная", path: "/" },
          { name: "Игроки", path: "/players" },
        ])}
      />
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "Игроки" }]}
        title="Игроки"
        description={`В базе ${PLAYERS.length} игроков. ELO и уровень FACEIT привязываются к аккаунту при входе через Steam и обновляются автоматически.`}
      />
      <section className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-12 sm:px-8">
        <FaceitSourceNote live={Boolean(process.env.FACEIT_API_KEY)} />
        <PlayerTable />
      </section>
    </>
  )
}
