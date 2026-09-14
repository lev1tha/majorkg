import type { Metadata } from "next"
import Link from "next/link"
import { Plus, ShieldCheck, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TeamMark } from "@/components/ui/misc"
import { PageHeader } from "@/components/layout/page-header"
import { FaceitLevel } from "@/components/player/faceit-level"
import { JsonLd } from "@/components/seo/json-ld"
import { GAMES } from "@/lib/data/games"
import { MY_TEAMS } from "@/lib/data/teams"
import { rosterFor } from "@/lib/data/rosters"
import { breadcrumbLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Команды — состав, рейтинг и заявки",
  description:
    "Управление составами: создание команды, добор игроков до check-in, рейтинг и статистика. Состав сверяется по Steam ID при выходе на карту.",
  alternates: { canonical: "/teams" },
}

export default function TeamsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Главная", path: "/" },
          { name: "Команды", path: "/teams" },
        ])}
      />
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "Команды" }]}
        title="Мои команды"
        description="Состав можно добрать до check-in. Игроки подтверждаются по Steam ID, рейтинг FACEIT подтягивается автоматически."
        action={
          <Button variant="primary" size="md">
            <Plus strokeWidth={1.5} />
            Создать команду
          </Button>
        }
      />

      <section className="mx-auto grid max-w-[1440px] gap-4 px-5 py-12 sm:px-8 lg:grid-cols-2">
        {MY_TEAMS.map((team) => {
          const game = GAMES[team.game]
          const roster = rosterFor(team.tag)
          const gap = Math.max(0, team.requiredSize - team.roster.length)

          return (
            <article key={team.id} className="glass flex flex-col overflow-hidden rounded-xl">
              <header className="flex items-center gap-4 border-b border-white/[0.06] p-5">
                <TeamMark tag={team.tag} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-[17px] font-bold text-white">
                    {team.name}
                  </h2>
                  <p className="text-[12.5px] text-white/35">
                    {game.name} · рейтинг {team.rating} · {team.winRate}% побед
                  </p>
                </div>
                {gap > 0 ? (
                  <Badge variant="prize" size="sm">
                    Нужно еще {gap}
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">
                    <ShieldCheck strokeWidth={1.5} />
                    Готова
                  </Badge>
                )}
              </header>

              <ul className="divide-y divide-white/[0.05]">
                {team.roster.map((player) => {
                  const stats = roster.find((item) => item.nickname === player.nickname)
                  return (
                    <li key={player.nickname} className="flex items-center gap-3 px-5 py-3">
                      {stats ? (
                        <FaceitLevel elo={stats.elo} size="sm" />
                      ) : (
                        <span className="flex size-6 items-center justify-center rounded-[6px] border border-white/10 text-[10px] text-white/25">
                          —
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-white">
                          {player.nickname}
                        </span>
                        <span className="block text-[11.5px] text-white/30">{player.role}</span>
                      </span>
                      {!player.verified && (
                        <Badge variant="outline" size="sm">
                          Не подтвержден
                        </Badge>
                      )}
                      {stats && (
                        <span className="mono text-[12px] text-white/45">
                          {stats.rating.toFixed(2)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>

              <footer className="mt-auto flex items-center gap-2 border-t border-white/[0.06] p-4">
                <Button variant="outline" size="sm" className="flex-1">
                  <Users strokeWidth={1.5} />
                  Управлять составом
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/tournaments">К турнирам</Link>
                </Button>
              </footer>
            </article>
          )
        })}
      </section>
    </>
  )
}
