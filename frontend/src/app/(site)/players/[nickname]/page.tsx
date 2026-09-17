import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink, MapPin, Shield } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { FaceitLevel } from "@/components/player/faceit-level"
import { PlayerAvatar } from "@/components/player/avatar"
import { FaceitSourceNote } from "@/components/player/faceit-note"
import { JsonLd } from "@/components/seo/json-ld"
import { getPlayer, getPlayerPerformance } from "@/lib/api"
import { eloToNextLevel } from "@/lib/faceit"
import { breadcrumbLd, canonical } from "@/lib/seo"
import { cn, formatDate, formatNumber } from "@/lib/utils"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ nickname: string }>
}): Promise<Metadata> {
  const { nickname } = await params
  const player = await getPlayer(nickname)
  if (!player) return { title: "Игрок не найден" }

  const title = `${player.nickname} — CS2 статистика, ${formatNumber(player.elo)} ELO, уровень ${player.level}`
  const description = `Профиль игрока ${player.nickname}: FACEIT уровень ${player.level}, ${formatNumber(player.elo)} ELO, рейтинг ${player.hltvRating.toFixed(2)}, K/D ${player.kd.toFixed(2)}, ${formatNumber(player.matches)} сыгранных карт.`

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
  const player = await getPlayer(nickname)
  if (!player) notFound()

  const perf = await getPlayerPerformance(player.nickname)
  const toNext = eloToNextLevel(player.elo)

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
        description={`${player.role}${player.city ? ` · ${player.city}, Кыргызстан` : ""}`}
        action={
          <div className="flex items-center gap-3">
            <PlayerAvatar nickname={player.nickname} avatar={player.avatar} size="lg" />
            <FaceitLevel elo={player.elo} size="lg" />
            <div className="flex flex-col">
              <span className="mono text-[19px] font-medium text-white">
                {formatNumber(player.elo)}
              </span>
              <span className="text-[11.5px] text-white/35">
                FACEIT ELO{" "}
                {toNext ? `· до ${player.level + 1} уровня ${toNext}` : "· максимальный уровень"}
              </span>
            </div>
          </div>
        }
      />

      <section className="mx-auto flex max-w-[1440px] flex-col gap-10 px-5 py-12 sm:px-8">
        {/* Основные показатели */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Очки сезона" value={formatNumber(player.points)} tone="text-prize" />
          <StatTile
            label="Рейтинг"
            value={player.hltvRating.toFixed(2)}
            tone={player.hltvRating >= 1.1 ? "text-success" : undefined}
          />
          <StatTile label="K/D" value={player.kd.toFixed(2)} />
          <StatTile label="Карт сыграно" value={formatNumber(player.mapsPlayed)} />
        </div>

        {perf && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="ADR" value={perf.adr.toFixed(1)} />
            <StatTile label="KAST" value={`${perf.kast.toFixed(1)}%`} />
            <StatTile label="Хедшоты" value={`${perf.headshots}%`} />
            <StatTile label="Первые фраги" value={`${perf.openingWinRate}%`} />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-6">
            {perf && perf.recent.length > 0 ? (
              <section className="glass overflow-hidden rounded-xl">
                <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                  <h2 className="font-display text-[16px] font-bold text-white">История карт</h2>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/bracket">Все матчи</Link>
                  </Button>
                </header>
                <div className="hidden grid-cols-[minmax(0,1fr)_130px_110px_90px] gap-4 border-b border-white/[0.06] px-5 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/30 sm:grid">
                  <span>Соперник</span>
                  <span>Турнир</span>
                  <span>Карта</span>
                  <span className="text-right">Счет</span>
                </div>
                <ul className="divide-y divide-white/[0.05]">
                  {perf.recent.map((row, index) => (
                    <li
                      key={`${row.matchId}-${index}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_130px_110px_90px]"
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
                      <span className="hidden truncate text-[12.5px] text-white/40 sm:block">
                        {row.tournament}
                      </span>
                      <span className="hidden text-[13px] text-white/50 sm:block">{row.map}</span>
                      <span className="mono text-right text-[13px] text-white/70">{row.score}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="glass rounded-xl py-16 text-center text-[13px] text-white/30">
                Сыгранных карт пока нет — статистика появится после первого матча.
              </section>
            )}
          </div>

          <aside className="flex flex-col gap-6">
            {perf && perf.mapStats.length > 0 && (
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
                          className={cn(
                            "h-full rounded-full",
                            map.winRate >= 60 ? "bg-success" : "bg-white/40",
                          )}
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
                {player.faceit && (
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
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/40">Синхронизация</span>
                  <Badge variant="outline" size="sm">
                    {player.syncedAt ? formatDate(player.syncedAt) : "—"}
                  </Badge>
                </div>
              </div>
              <FaceitSourceNote live={player.eloLive} />
            </section>
          </aside>
        </div>
      </section>
    </>
  )
}
