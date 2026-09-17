import Link from "next/link"
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/misc"
import { FaceitLevel } from "@/components/player/faceit-level"
import { getLeaderboard } from "@/lib/api"
import type { LeaderboardRowDto } from "@/lib/types"
import { cn, formatNumber } from "@/lib/utils"

const TREND = {
  up: { icon: TrendingUp, className: "text-success" },
  down: { icon: TrendingDown, className: "text-accent" },
  flat: { icon: Minus, className: "text-white/25" },
}

/**
 * Лидерборд игроков. Командного рейтинга на платформе нет: составы живут
 * в пределах одного турнира и собираются жеребьевкой, поэтому очки сезона
 * принадлежат человеку.
 */
export function LeaderboardTable({ rows }: { rows: LeaderboardRowDto[] }) {
  if (rows.length === 0) {
    return (
      <div className="glass rounded-xl py-16 text-center text-[13px] text-white/30">
        Рейтинг появится после первых сыгранных матчей.
      </div>
    )
  }

  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="hidden grid-cols-[56px_minmax(0,1fr)_120px_110px_100px_110px] items-center gap-4 border-b border-white/[0.07] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30 lg:grid">
        <span>#</span>
        <span>Игрок</span>
        <span>FACEIT</span>
        <span className="text-right">Очки</span>
        <span className="text-right">Карты</span>
        <span className="text-right">Winrate</span>
      </div>

      <ul className="divide-y divide-white/[0.05]">
        {rows.map((row) => {
          const trend = TREND[row.trend]
          const TrendIcon = trend.icon
          return (
            <li key={row.playerId}>
              <Link
                href={`/players/${row.nickname}`}
                className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.025] sm:px-5 lg:grid-cols-[56px_minmax(0,1fr)_120px_110px_100px_110px]"
              >
                <span
                  className={cn(
                    "mono text-[14px] font-medium",
                    row.place === 1 ? "text-prize" : row.place <= 3 ? "text-white" : "text-white/35",
                  )}
                >
                  {row.place}
                </span>

                <div className="flex min-w-0 items-center gap-3">
                  <FaceitLevel elo={row.elo} size="sm" className="lg:hidden" />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-white">{row.nickname}</p>
                    <p className="mono truncate text-[11.5px] text-white/30">
                      {row.role}
                      <span className="lg:hidden"> · {formatNumber(row.points)} очк</span>
                    </p>
                  </div>
                  <TrendIcon size={13} strokeWidth={1.5} className={cn("shrink-0", trend.className)} />
                </div>

                <span className="hidden lg:block">
                  <FaceitLevel elo={row.elo} showElo />
                </span>

                <span className="mono hidden text-right text-[13.5px] font-medium text-white lg:block">
                  {formatNumber(row.points)}
                </span>
                <span className="mono hidden text-right text-[13.5px] text-white/50 lg:block">
                  {row.mapsPlayed}
                </span>
                <span className="mono text-right text-[13.5px] text-white/50">{row.winRate}%</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export async function LeaderboardSection({ compact = false }: { compact?: boolean }) {
  const { items } = await getLeaderboard(compact ? 5 : 50)

  return (
    <section id="leaderboard" className="scroll-mt-24 py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
        <SectionHeading
          overline="Рейтинг сезона"
          title="Лидерборд игроков"
          description="Очки начисляются за выигранные карты и серии. Рейтинг определяет пояс при жеребьевке составов."
          action={
            compact ? (
              <Button variant="outline" size="md" asChild>
                <Link href="/leaderboard">
                  Вся таблица
                  <ArrowRight strokeWidth={1.5} />
                </Link>
              </Button>
            ) : undefined
          }
          className="mb-8"
        />
        <LeaderboardTable rows={items} />
      </div>
    </section>
  )
}
