import type { Metadata } from "next"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { TeamMark } from "@/components/ui/misc"
import { PageHeader } from "@/components/layout/page-header"
import { BracketBoard } from "@/components/tournament/bracket-board"
import { JsonLd } from "@/components/seo/json-ld"
import { GRAND_FINAL, LOWER_BRACKET, UPPER_BRACKET } from "@/lib/data/bracket"
import { MATCH_HISTORY } from "@/lib/data/matches"
import { FEATURED_TOURNAMENT, TOURNAMENTS } from "@/lib/data/tournaments"
import { breadcrumbLd } from "@/lib/seo"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Турнирная сетка и расписание матчей CS2",
  description:
    "Интерактивная турнирная сетка Double Elimination: путь команды от четвертьфинала до гранд-финала, счет по картам, расписание ближайших матчей и результаты прошедших серий.",
  alternates: { canonical: "/bracket" },
}

export default function BracketPage() {
  const live = TOURNAMENTS.filter((item) => item.status === "live" || item.status === "checkin")

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Главная", path: "/" },
          { name: "Сетка и расписание", path: "/bracket" },
        ])}
      />
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "Сетка и расписание" }]}
        title="Сетка и расписание"
        description="Кликните по команде — подсветится ее путь по сетке. Клик по матчу открывает составы, статистику игроков и ваши скаут-заметки."
        action={
          <Link
            href={`/tournaments/${FEATURED_TOURNAMENT.slug}`}
            className="text-[13px] text-white/50 transition-colors hover:text-white"
          >
            {FEATURED_TOURNAMENT.title} →
          </Link>
        }
      />

      <section className="mx-auto flex max-w-[1440px] flex-col gap-12 px-5 py-12 sm:px-8">
        {live.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {live.map((item) => (
              <Link
                key={item.slug}
                href={`/tournaments/${item.slug}#bracket`}
                className="inline-flex items-center gap-2 rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-3.5 py-2 text-[12.5px] text-white/60 transition-colors hover:border-white/20 hover:text-white"
              >
                {item.status === "live" && (
                  <span className="size-1.5 rounded-full bg-accent pulse-live" />
                )}
                {item.title}
              </Link>
            ))}
          </div>
        )}

        <BracketBoard upper={UPPER_BRACKET} lower={LOWER_BRACKET} grandFinal={GRAND_FINAL} />

        {/* Результаты серий */}
        <section className="flex flex-col gap-5">
          <h2 className="font-display text-[20px] font-bold text-white">Результаты матчей</h2>
          <div className="glass overflow-hidden rounded-xl">
            <ul className="divide-y divide-white/[0.05]">
              {MATCH_HISTORY.map((match) => {
                const aWon = match.winner === "a"
                return (
                  <li
                    key={match.id}
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-white/[0.025] lg:flex-row lg:items-center lg:gap-6"
                  >
                    <div className="flex min-w-0 items-center gap-3 lg:w-56">
                      <span className="mono text-[11.5px] text-white/30">{match.date}</span>
                      <Badge variant="outline" size="sm">
                        {match.stage}
                      </Badge>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
                        <span
                          className={cn(
                            "truncate text-[13.5px]",
                            aWon ? "font-medium text-white" : "text-white/45",
                          )}
                        >
                          {match.teamA}
                        </span>
                        <TeamMark tag={match.tagA} size="sm" tone={aWon ? "accent" : "steel"} />
                      </div>

                      <span className="mono shrink-0 rounded-[8px] border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-[13px] text-white">
                        {match.maps.filter((map) => map.scoreA > map.scoreB).length}
                        <span className="mx-1.5 text-white/25">:</span>
                        {match.maps.filter((map) => map.scoreB > map.scoreA).length}
                      </span>

                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <TeamMark tag={match.tagB} size="sm" tone={!aWon ? "accent" : "steel"} />
                        <span
                          className={cn(
                            "truncate text-[13.5px]",
                            !aWon ? "font-medium text-white" : "text-white/45",
                          )}
                        >
                          {match.teamB}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 lg:w-80 lg:justify-end">
                      {match.maps.map((map) => (
                        <span
                          key={map.map}
                          className="mono rounded-[7px] border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[11px] text-white/45"
                        >
                          {map.map} {map.scoreA}:{map.scoreB}
                        </span>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </section>
    </>
  )
}
