import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink, MapPin, Shield, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TeamMark } from "@/components/ui/misc"
import { PageHeader } from "@/components/layout/page-header"
import { FaceitLevel } from "@/components/player/faceit-level"
import { FaceitSourceNote } from "@/components/player/faceit-note"
import { JsonLd } from "@/components/seo/json-ld"
import { PLAYERS, findPlayer } from "@/lib/data/players"
import { performanceFor } from "@/lib/data/matches"
import { eloToNextLevel, levelFromElo } from "@/lib/faceit"
import { breadcrumbLd, canonical } from "@/lib/seo"
import { cn, formatNumber } from "@/lib/utils"

export function generateStaticParams() {
  return PLAYERS.map((player) => ({ nickname: player.nickname }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ nickname: string }>
}): Promise<Metadata> {
  const { nickname } = await params
  const player = findPlayer(nickname)
  if (!player) return { title: "Игрок не найден" }

  const level = levelFromElo(player.elo)
  const title = `${player.nickname} — CS2 статистика, ${formatNumber(player.elo)} ELO, уровень ${level}`
  const description = `Профиль игрока ${player.nickname}${player.team ? ` (${player.team})` : ""}: FACEIT уровень ${level}, ${formatNumber(player.elo)} ELO, рейтинг ${player.hltvRating.toFixed(2)}, K/D ${player.kd.toFixed(2)}, ${formatNumber(player.matches)} сыгранных карт.`

  return {
    title,
    description,
    alternates: { canonical: `/players/${player.nickname}` },
    openGraph: { title, description, url: `/players/${player.nickname}`, type: "profile" },
  }
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="glass rounded-[12px] px-4 py-3.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">{label}</p>
      <p className={cn("mono mt-1.5 text-[19px] font-medium text-white", tone)}>{value}</p>
    </div>
  )
}

export default async function PlayerPage({ params }: { params: Promise<{ nickname: string }> }) {
  const { nickname } = await params
  const player = findPlayer(nickname)
  if (!player) notFound()

  const level = levelFromElo(player.elo)
  const toNext = eloToNextLevel(player.elo)
  const perf = performanceFor(player.nickname, player)
  const maxForm = Math.max(...perf.form, 1.5)

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Главная", path: "/" },
            { name: "Игроки", path: "/players" },
            { name: player.nickname, path: `/players/${player.nickname}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: player.nickname,
            url: canonical(`/players/${player.nickname}`),
            nationality: "KG",
            memberOf: player.team ? { "@type": "SportsTeam", name: player.team } : undefined,
          },
        ]}
      />

      <PageHeader
        crumbs={[
          { label: "Главная", href: "/" },
          { label: "Игроки", href: "/players" },
          { label: player.nickname },
        ]}
        title={player.nickname}
        description={`${player.role} · ${player.city}, Кыргызстан`}
        action={
          <div className="flex items-center gap-3">
            <FaceitLevel elo={player.elo} size="lg" />
            <div className="flex flex-col">
              <span className="mono text-[19px] font-medium text-white">
                {formatNumber(player.elo)}
              </span>
              <span className="text-[11.5px] text-white/35">
                FACEIT ELO {toNext ? `· до ${level + 1} уровня ${toNext}` : "· максимальный уровень"}
              </span>
            </div>
          </div>
        }
      />

      <section className="mx-auto flex max-w-[1440px] flex-col gap-10 px-5 py-12 sm:px-8">
        {/* Карточка игрока */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass flex items-center gap-4 rounded-xl p-5">
            {player.teamTag ? (
              <>
                <TeamMark tag={player.teamTag} size="lg" />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
                    Команда
                  </p>
                  <p className="truncate font-display text-[15px] font-bold text-white">
                    {player.team}
                  </p>
                  <p className="text-[11.5px] text-white/35">{player.role}</p>
                </div>
              </>
            ) : (
              <>
                <span className="flex size-14 items-center justify-center rounded-[12px] border border-white/[0.08] text-white/30">
                  <Users size={20} strokeWidth={1.5} />
                </span>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
                    Команда
                  </p>
                  <p className="font-display text-[15px] font-bold text-white">Свободный агент</p>
                </div>
              </>
            )}
          </div>

          <StatTile label="Рейтинг" value={perf.rating.toFixed(2)} tone={perf.rating >= 1.1 ? "text-success" : undefined} />
          <StatTile label="K/D" value={perf.kd.toFixed(2)} />
          <StatTile label="Карт сыграно" value={formatNumber(player.matches)} />
        </div>

        {/* Расширенная статистика */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile label="ADR" value={perf.adr.toFixed(1)} />
          <StatTile label="KAST" value={`${perf.kast.toFixed(1)}%`} />
          <StatTile label="Хедшоты" value={`${perf.headshots}%`} />
          <StatTile label="Первые фраги" value={`${perf.openingWinRate}%`} />
          <StatTile label="Клатчи" value={perf.clutches} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Форма и матчи */}
          <div className="flex flex-col gap-6">
            <section className="glass rounded-xl p-6">
              <h2 className="font-display text-[16px] font-bold text-white">
                Форма за последние 10 карт
              </h2>
              <div className="mt-6 flex h-32 items-stretch gap-2">
                {perf.form.map((value, index) => (
                  <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span
                      className={cn(
                        "w-full rounded-[3px]",
                        value >= 1.1 ? "bg-success/70" : value >= 1 ? "bg-white/35" : "bg-accent/55",
                      )}
                      style={{ height: `${Math.max(8, (value / maxForm) * 100)}%` }}
                      title={`Рейтинг ${value.toFixed(2)}`}
                    />
                    <span className="mono text-[10px] text-white/30">{value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </section>

            {perf.recent.length > 0 && (
              <section className="glass overflow-hidden rounded-xl">
                <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                  <h2 className="font-display text-[16px] font-bold text-white">История карт</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/bracket">Все матчи</Link>
                  </Button>
                </header>
                <div className="hidden grid-cols-[minmax(0,1fr)_110px_90px_110px_80px] gap-4 border-b border-white/[0.06] px-5 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/30 sm:grid">
                  <span>Соперник</span>
                  <span>Карта</span>
                  <span>Счет</span>
                  <span className="text-right">K / D / A</span>
                  <span className="text-right">Рейтинг</span>
                </div>
                <ul className="divide-y divide-white/[0.05]">
                  {perf.recent.map((row, index) => (
                    <li
                      key={`${row.matchId}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_110px_90px_110px_80px]"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "h-4 w-[3px] rounded-full",
                            row.won ? "bg-success" : "bg-accent",
                          )}
                        />
                        <span className="truncate text-[13.5px] text-white">{row.opponent}</span>
                      </span>
                      <span className="hidden text-[13px] text-white/50 sm:block">{row.map}</span>
                      <span className="mono hidden text-[13px] text-white/70 sm:block">{row.score}</span>
                      <span className="mono hidden text-right text-[13px] text-white/60 sm:block">
                        {row.kills} / {row.deaths} / {row.assists}
                      </span>
                      <span
                        className={cn(
                          "mono text-right text-[13px] font-medium",
                          row.rating >= 1.1 ? "text-success" : row.rating >= 1 ? "text-white" : "text-white/45",
                        )}
                      >
                        {row.rating.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Карты и профиль */}
          <aside className="flex flex-col gap-6">
            {perf.mapStats.length > 0 && (
              <section className="glass rounded-xl p-6">
                <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-white">
                  <MapPin size={16} strokeWidth={1.5} className="text-white/40" />
                  Статистика по картам
                </h2>
                <ul className="mt-5 flex flex-col gap-3.5">
                  {perf.mapStats.map((map) => (
                    <li key={map.map} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[12.5px]">
                        <span className="text-white/70">{map.map}</span>
                        <span className="mono text-white/40">
                          {map.maps} карт · {map.winRate}%
                        </span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
                        <div
                          className={cn("h-full rounded-full", map.winRate >= 60 ? "bg-success" : "bg-white/40")}
                          style={{ width: `${map.winRate}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="glass flex flex-col gap-4 rounded-xl p-6">
              <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-white">
                <Shield size={16} strokeWidth={1.5} className="text-white/40" />
                Аккаунты
              </h2>
              <div className="flex flex-col gap-3 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/40">Steam ID</span>
                  <span className="mono truncate text-white/70">{player.steamId}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/40">FACEIT</span>
                  <a
                    href={`https://www.faceit.com/ru/players/${player.faceit}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 text-white/80 transition-colors hover:text-accent-soft"
                  >
                    {player.faceit}
                    <ExternalLink size={12} strokeWidth={1.5} />
                  </a>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/40">Синхронизация</span>
                  <Badge variant="outline" size="sm">
                    {player.synced}
                  </Badge>
                </div>
              </div>
              <FaceitSourceNote live={Boolean(process.env.FACEIT_API_KEY)} />
            </section>
          </aside>
        </div>
      </section>
    </>
  )
}
