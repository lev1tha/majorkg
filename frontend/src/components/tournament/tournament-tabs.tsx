"use client"

import * as React from "react"
import Link from "next/link"
import { BookText, Dices, Info, Network, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { TeamMark } from "@/components/ui/misc"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FaceitLevel } from "@/components/player/faceit-level"
import { BracketBoard } from "@/components/tournament/bracket-board"
import type {
  BracketRoundDto,
  LineupDto,
  ParticipantDto,
  TournamentDto,
} from "@/lib/types"
import { formatNumber } from "@/lib/utils"

const TABS = [
  { id: "overview", label: "Обзор", icon: Info },
  { id: "participants", label: "Участники", icon: Users },
  { id: "lineups", label: "Составы", icon: Dices },
  { id: "bracket", label: "Сетка", icon: Network },
  { id: "rules", label: "Правила", icon: BookText },
] as const

type TabId = (typeof TABS)[number]["id"]

const STATUS_BADGE: Record<ParticipantDto["status"], React.ReactNode> = {
  confirmed: <Badge variant="success" size="sm">Подтверждена</Badge>,
  checked_in: <Badge variant="success" size="sm">Check-in пройден</Badge>,
  pending: <Badge variant="outline" size="sm">На модерации</Badge>,
  rejected: <Badge variant="live" size="sm">Отклонена</Badge>,
  withdrawn: <Badge variant="outline" size="sm">Снята</Badge>,
}

export function TournamentTabs({
  tournament,
  participants,
  lineups,
  rounds,
  canWriteNotes,
}: {
  tournament: TournamentDto
  participants: ParticipantDto[]
  lineups: LineupDto[]
  rounds: BracketRoundDto[]
  canWriteNotes: boolean
}) {
  const [tab, setTab] = React.useState<TabId>("overview")

  // Глубокие ссылки вида /tournaments/slug#bracket открывают нужную вкладку.
  React.useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace("#", "")
      if (TABS.some((item) => item.id === hash)) setTab(hash as TabId)
    }
    apply()
    window.addEventListener("hashchange", apply)
    return () => window.removeEventListener("hashchange", apply)
  }, [])

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)} className="w-full">
      <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <TabsList className="w-max">
          {TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id} id={item.id} className="scroll-mt-32">
              <item.icon strokeWidth={1.5} />
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* forceMount: весь текст остается в HTML и индексируется */}
      <TabsContent value="overview" forceMount className="mt-8 data-[state=inactive]:hidden">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-5">
            <section className="glass rounded-xl p-6">
              <h2 className="font-display text-[17px] font-bold text-white">О турнире</h2>
              <p className="mt-3 text-[14px] leading-relaxed text-white/50">{tournament.summary}</p>

              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/[0.07] pt-6 sm:grid-cols-4">
                {[
                  ["Формат", tournament.teamSizeLabel],
                  ["Сетка", "Верхняя · на выбывание"],
                  ["Регламент", tournament.ruleset],
                  ["Организатор", tournament.organizer],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
                      {label}
                    </dt>
                    <dd className="mt-1.5 text-[14px] font-medium text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {tournament.maps.length > 0 && (
              <section className="glass rounded-xl p-6">
                <h2 className="font-display text-[17px] font-bold text-white">Активный пул карт</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tournament.maps.map((map) => (
                    <span
                      key={map}
                      className="inline-flex h-9 items-center rounded-[9px] border border-white/[0.08] bg-white/[0.02] px-3.5 text-[13px] text-white/70"
                    >
                      {map}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-[12.5px] leading-relaxed text-white/35">
                  Вето по схеме ban-ban-pick-pick-ban-ban-decider. Сервер: {tournament.server}.
                </p>
              </section>
            )}
          </div>

          <aside className="glass h-fit rounded-xl p-6">
            <h2 className="font-display text-[17px] font-bold text-white">Как проходит турнир</h2>
            <ol className="mt-4 flex flex-col">
              {[
                [
                  "Регистрация",
                  tournament.entryFee > 0
                    ? `Заявка индивидуальная, взнос ${formatNumber(tournament.entryFee)} сом`
                    : "Заявка индивидуальная, участие бесплатное",
                ],
                ["Check-in", "За 30 минут до старта подтверждаете готовность"],
                [
                  "Жеребьевка",
                  `За ${tournament.drawBeforeMinutes} минут до старта собираются составы`,
                ],
                ["Верхняя сетка", "Проигравший выбывает, победитель идет дальше"],
              ].map(([title, text], index, list) => (
                <li
                  key={title}
                  className={
                    index < list.length - 1
                      ? "flex gap-3 border-b border-white/[0.06] py-3"
                      : "flex gap-3 py-3"
                  }
                >
                  <span className="mono mt-0.5 text-[11px] text-white/25">0{index + 1}</span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13.5px] font-medium text-white">{title}</span>
                    <span className="text-[12px] leading-relaxed text-white/40">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </TabsContent>

      {/* Участники — список игроков: регистрация индивидуальная */}
      <TabsContent value="participants" forceMount className="mt-8 data-[state=inactive]:hidden">
        {participants.length === 0 ? (
          <div className="glass rounded-xl py-16 text-center text-[13px] text-white/30">
            Заявок пока нет — будьте первым.
          </div>
        ) : (
          <div className="glass overflow-hidden rounded-xl">
            <div className="hidden grid-cols-[64px_minmax(0,1fr)_140px_120px_100px] items-center gap-4 border-b border-white/[0.07] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/30 md:grid">
              <span>#</span>
              <span>Игрок</span>
              <span>Статус</span>
              <span className="text-right">FACEIT</span>
              <span className="text-right">Рейтинг</span>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {participants.map((item, index) => (
                <li
                  key={item.registrationId}
                  className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.025] sm:px-5 md:grid-cols-[64px_minmax(0,1fr)_140px_120px_100px]"
                >
                  <span className="mono text-[13px] text-white/30">{item.seed ?? index + 1}</span>
                  <div className="flex min-w-0 items-center gap-3">
                    <FaceitLevel elo={item.player.elo} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/players/${item.player.nickname}`}
                        className="truncate text-[13.5px] font-medium text-white transition-colors hover:text-accent-soft"
                      >
                        {item.player.nickname}
                      </Link>
                      <p className="truncate text-[11.5px] text-white/30">
                        {item.player.role}
                        {item.player.city ? ` · ${item.player.city}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="justify-self-end md:justify-self-start">
                    {STATUS_BADGE[item.status]}
                  </span>
                  <span className="mono hidden text-right text-[13px] text-white/50 md:block">
                    {formatNumber(item.player.elo)}
                  </span>
                  <span className="mono hidden text-right text-[13px] text-white/75 md:block">
                    {item.player.hltvRating.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </TabsContent>

      {/* Составы, собранные жеребьевкой */}
      <TabsContent value="lineups" forceMount className="mt-8 data-[state=inactive]:hidden">
        {lineups.length === 0 ? (
          <div className="glass rounded-xl py-16 text-center text-[13px] text-white/30">
            Составы появятся после жеребьевки — за {tournament.drawBeforeMinutes} минут до старта.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {lineups.map((lineup) => (
              <article key={lineup.id} className="glass flex flex-col overflow-hidden rounded-xl">
                <header className="flex items-center gap-3 border-b border-white/[0.06] p-4">
                  <TeamMark tag={lineup.tag} size="md" tone={lineup.seed === 1 ? "prize" : "steel"} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-[15px] font-bold text-white">
                      {lineup.name}
                    </h3>
                    <p className="mono text-[11.5px] text-white/35">
                      Посев #{lineup.seed} · {formatNumber(lineup.avgElo)} ELO
                    </p>
                  </div>
                </header>
                <ul className="divide-y divide-white/[0.05]">
                  {lineup.members.map((member) => (
                    <li key={member.playerId} className="flex items-center gap-2.5 px-4 py-2.5">
                      <FaceitLevel elo={member.elo} size="sm" />
                      <Link
                        href={`/players/${member.nickname}`}
                        className="min-w-0 flex-1 truncate text-[12.5px] text-white/80 transition-colors hover:text-accent-soft"
                      >
                        {member.nickname}
                      </Link>
                      <span className="mono shrink-0 text-[11.5px] text-white/40">
                        {member.hltvRating.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="bracket" forceMount className="mt-8 data-[state=inactive]:hidden">
        <BracketBoard rounds={rounds} lineups={lineups} canWriteNotes={canWriteNotes} />
      </TabsContent>

      <TabsContent value="rules" forceMount className="mt-8 data-[state=inactive]:hidden">
        {tournament.rules.length === 0 && (
          <p className="glass rounded-xl py-16 text-center text-[13px] text-white/30">
            Регламент еще не опубликован.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-3">
          {tournament.rules.map((block) => (
            <section key={block.title} className="glass rounded-xl p-6">
              <h2 className="font-display text-[15.5px] font-bold text-white">{block.title}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-[13px] leading-relaxed text-white/50">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-accent/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}
