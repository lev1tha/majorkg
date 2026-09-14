import Link from "next/link"
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SectionHeading, TeamMark } from "@/components/ui/misc"
import { LEADERBOARD } from "@/lib/data/teams"
import { cn, formatNumber } from "@/lib/utils"

const TREND = {
  up: { icon: TrendingUp, className: "text-success" },
  down: { icon: TrendingDown, className: "text-accent" },
  flat: { icon: Minus, className: "text-white/25" },
}

export function LeaderboardTable({ rows = LEADERBOARD }: { rows?: typeof LEADERBOARD }) {
  return (
    <div className="glass overflow-hidden rounded-xl">
      <div className="hidden grid-cols-[56px_minmax(0,1fr)_110px_100px_110px_130px] items-center gap-4 border-b border-white/[0.07] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30 lg:grid">
        <span>#</span>
        <span>Команда</span>
        <span className="text-right">Очки</span>
        <span className="text-right">Карты</span>
        <span className="text-right">Winrate</span>
        <span className="text-right">Призовые</span>
      </div>

      <ul className="divide-y divide-white/[0.05]">
        {rows.map((row) => {
          const trend = TREND[row.trend]
          const TrendIcon = trend.icon
          return (
            <li
              key={row.tag}
              className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.025] sm:px-5 lg:grid-cols-[56px_minmax(0,1fr)_110px_100px_110px_130px]"
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
                <TeamMark tag={row.tag} size="sm" tone={row.place === 1 ? "prize" : "steel"} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-white">{row.team}</p>
                  <p className="mono text-[11.5px] text-white/30 lg:hidden">
                    {formatNumber(row.points)} очк · {row.winRate}%
                  </p>
                </div>
                <TrendIcon size={13} strokeWidth={1.5} className={cn("shrink-0", trend.className)} />
              </div>

              <span className="mono hidden text-right text-[13.5px] text-white lg:block">
                {formatNumber(row.points)}
              </span>
              <span className="mono hidden text-right text-[13.5px] text-white/50 lg:block">
                {row.maps}
              </span>
              <span className="mono hidden text-right text-[13.5px] text-white/50 lg:block">
                {row.winRate}%
              </span>
              <span className="mono text-right text-[13px] font-medium text-prize">
                {formatNumber(row.prize)} KGS
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function LeaderboardSection({ compact = false }: { compact?: boolean }) {
  const rows = compact ? LEADERBOARD.slice(0, 5) : LEADERBOARD

  return (
    <section id="leaderboard" className="scroll-mt-24 py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
        <SectionHeading
          overline="Рейтинг сезона"
          title="Лидерборд команд"
          description="Очки начисляются за места в турнирах и выигранные карты. Рейтинг определяет посев в сетке."
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
        <LeaderboardTable rows={rows} />
      </div>
    </section>
  )
}
