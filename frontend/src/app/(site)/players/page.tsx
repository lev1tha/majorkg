import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { PlayerTable } from "@/components/player/player-table"
import { FaceitSourceNote } from "@/components/player/faceit-note"
import { JsonLd } from "@/components/seo/json-ld"
import { getPlayers } from "@/lib/api"
import { breadcrumbLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Игроки CS2 Кыргызстана — рейтинг, FACEIT ELO и статистика",
  description:
    "Таблица игроков CS2 из Кыргызстана: FACEIT уровень и ELO, очки сезона, рейтинг, K/D, процент хедшотов и сыгранные карты. Поиск игрока и переход в профиль со статистикой матчей.",
  alternates: { canonical: "/players" },
}

export default async function PlayersPage() {
  const { items, total } = await getPlayers({ limit: 200 })

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
        description={`В базе ${total} игроков. ELO и уровень FACEIT привязываются к аккаунту при входе через Steam и обновляются автоматически.`}
      />
      <section className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-12 sm:px-8">
        <FaceitSourceNote live={process.env.NEXT_PUBLIC_FACEIT_LIVE === "true"} />
        <PlayerTable rows={items} />
      </section>
    </>
  )
}
