"use client"

import * as React from "react"
import { BookText, Info, MonitorPlay, Network, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TeamMark } from "@/components/ui/misc"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BracketBoard } from "@/components/tournament/bracket-board"
import { GRAND_FINAL, LOWER_BRACKET, UPPER_BRACKET } from "@/lib/data/bracket"
import { PARTICIPANTS, STREAMS } from "@/lib/data/teams"
import { BRACKET_LABEL, type Tournament } from "@/lib/data/tournaments"
import { cn, formatNumber } from "@/lib/utils"

const TABS = [
  { id: "overview", label: "Обзор и призы", icon: Info },
  { id: "participants", label: "Участники", icon: Users },
  { id: "bracket", label: "Сетка", icon: Network },
  { id: "rules", label: "Правила", icon: BookText },
  { id: "streams", label: "Трансляция", icon: MonitorPlay },
] as const

type TabId = (typeof TABS)[number]["id"]

const PRIZE_SPLIT = [
  { place: "1 место", share: 0.5 },
  { place: "2 место", share: 0.25 },
  { place: "3 место", share: 0.15 },
  { place: "4 место", share: 0.1 },
]

const RULES = [
  {
    title: "Формат и регламент",
    items: [
      "Матчи по регламенту MR12, овертайм MR3 до победы.",
      "Стадии до четвертьфинала — BO1, плейофф — BO3, гранд-финал — BO5.",
      "Вето карт проводится через платформу за 10 минут до старта серии.",
      "Технические паузы — не более 10 минут суммарно на команду за карту.",
    ],
  },
  {
    title: "Состав и check-in",
    items: [
      "Check-in открывается за 30 минут до старта и закрывается за 10 минут.",
      "Состав на карте сверяется с заявкой по Steam ID.",
      "Допускается один игрок замены, заявленный до закрытия слотов.",
      "Неявка через 15 минут после старта — техническое поражение.",
    ],
  },
  {
    title: "Честная игра",
    items: [
      "Обязателен клиент античита, запуск проверяется судьей.",
      "Запрещены сторонние оверлеи, скрипты и изменение игровых файлов.",
      "Каждая карта пишется в GOTV, демо хранится 30 дней.",
      "Апелляция подается в течение 30 минут после карты со скриншотом счета.",
    ],
  },
]

export function TournamentTabs({ tournament }: { tournament: Tournament }) {
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
                  ["Формат", tournament.teamSize],
                  ["Сетка", BRACKET_LABEL[tournament.bracket]],
                  ["Регламент", tournament.ruleset ?? "MR12"],
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

            {tournament.maps?.length ? (
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
            ) : null}
          </div>

          <aside className="glass h-fit rounded-xl p-6">
            <h2 className="font-display text-[17px] font-bold text-white">Распределение призовых</h2>
            <ul className="mt-4 flex flex-col">
              {PRIZE_SPLIT.map((row, index) => (
                <li
                  key={row.place}
                  className={cn(
                    "flex items-center justify-between gap-4 py-3",
                    index < PRIZE_SPLIT.length - 1 && "border-b border-white/[0.06]",
                  )}
                >
                  <span className="text-[13px] text-white/55">{row.place}</span>
                  <span
                    className={cn(
                      "mono text-[13.5px] font-medium",
                      index === 0 ? "text-prize" : "text-white/75",
                    )}
                  >
                    {formatNumber(Math.round(tournament.prizePool * row.share))} {tournament.currency}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-white/[0.07] pt-4 text-[12.5px] leading-relaxed text-white/35">
              Выплата после закрытия апелляций гранд-финала, до пяти рабочих дней. Участие бесплатное.
            </p>
          </aside>
        </div>
      </TabsContent>

      <TabsContent value="participants" forceMount className="mt-8 data-[state=inactive]:hidden">
        <div className="glass overflow-hidden rounded-xl">
          <div className="hidden grid-cols-[64px_minmax(0,1fr)_140px_110px_110px] items-center gap-4 border-b border-white/[0.07] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/30 md:grid">
            <span>Посев</span>
            <span>Команда</span>
            <span>Статус</span>
            <span className="text-right">Состав</span>
            <span className="text-right">Рейтинг</span>
          </div>
          <ul className="divide-y divide-white/[0.05]">
            {PARTICIPANTS.map((team) => (
              <li
                key={team.tag}
                className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.025] sm:px-5 md:grid-cols-[64px_minmax(0,1fr)_140px_110px_110px]"
              >
                <span className="mono text-[13px] text-white/30">#{team.seed}</span>
                <div className="flex min-w-0 items-center gap-3">
                  <TeamMark tag={team.tag} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-white">{team.name}</p>
                    <p className="truncate text-[11.5px] text-white/30">
                      Сигнатурная карта: {team.signature}
                    </p>
                  </div>
                </div>
                <span className="justify-self-end md:justify-self-start">
                  {team.status === "confirmed" && <Badge variant="success" size="sm">Подтверждена</Badge>}
                  {team.status === "checkin" && <Badge variant="prize" size="sm">Ждет check-in</Badge>}
                  {team.status === "pending" && <Badge variant="outline" size="sm">На модерации</Badge>}
                </span>
                <span className="mono hidden text-right text-[13px] text-white/50 md:block">
                  {team.players} / 5
                </span>
                <span className="mono hidden text-right text-[13px] text-white/75 md:block">
                  {formatNumber(team.rating)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </TabsContent>

      <TabsContent value="bracket" forceMount className="mt-8 data-[state=inactive]:hidden">
        <BracketBoard upper={UPPER_BRACKET} lower={LOWER_BRACKET} grandFinal={GRAND_FINAL} />
      </TabsContent>

      <TabsContent value="rules" forceMount className="mt-8 data-[state=inactive]:hidden">
        <div className="grid gap-4 lg:grid-cols-3">
          {RULES.map((block) => (
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

      <TabsContent value="streams" forceMount className="mt-8 data-[state=inactive]:hidden">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STREAMS.map((stream) => (
            <article key={stream.id} className="glass flex flex-col overflow-hidden rounded-xl">
              <div className="relative flex h-24 items-center justify-center border-b border-white/[0.06] bg-[linear-gradient(140deg,#14171f,#0d0f15)]">
                <MonitorPlay size={24} strokeWidth={1.5} className="text-white/25" />
                {stream.live && (
                  <Badge variant="live" size="sm" className="absolute left-3 top-3">
                    <span className="size-1.5 rounded-full bg-accent pulse-live" />
                    Live
                  </Badge>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="text-[13.5px] font-medium leading-snug text-white">{stream.title}</h3>
                <p className="text-[12px] text-white/35">
                  {stream.platform} · {stream.channel} · {stream.language}
                </p>
                <p className="mono text-[12px] text-white/45">
                  {stream.live ? `${formatNumber(stream.viewers)} зрителей · ${stream.note}` : stream.note}
                </p>
                <Button variant="outline" size="sm" className="mt-auto w-full">
                  {stream.live ? "Смотреть" : "Напомнить"}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}
