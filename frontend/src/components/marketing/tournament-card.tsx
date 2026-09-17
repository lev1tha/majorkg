"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowUpRight, Check, Crosshair } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { JoinButton } from "@/components/join/join-button"
import { CountdownInline } from "@/components/tournament/countdown"
import type { TournamentDto, TournamentStatus } from "@/lib/types"
import { cn, formatNumber, pct } from "@/lib/utils"

const STATUS_BAR: Record<TournamentStatus, string> = {
  draft: "bg-white/10",
  registration: "bg-success",
  checkin: "bg-prize",
  live: "bg-accent",
  finished: "bg-white/15",
}

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: "Черновик",
  registration: "Идет регистрация",
  checkin: "Check-in открыт",
  live: "Матчи идут",
  finished: "Завершен",
}

export function StatusBadge({ status }: { status: TournamentStatus }) {
  const label = STATUS_LABEL[status]
  if (status === "live") {
    return (
      <Badge variant="live" size="sm">
        <span className="size-1.5 rounded-full bg-accent pulse-live" />
        {label}
      </Badge>
    )
  }
  if (status === "checkin") return <Badge variant="prize" size="sm">{label}</Badge>
  if (status === "finished" || status === "draft") {
    return <Badge variant="outline" size="sm">{label}</Badge>
  }
  return <Badge variant="success" size="sm">{label}</Badge>
}

/**
 * `static` отключает layout-анимации: при больших списках дешевле отрисовать
 * обычный article с CSS-hover, чем держать motion-узел на каждую карточку.
 */
export function TournamentCard({
  tournament,
  static: isStatic = false,
}: {
  tournament: TournamentDto
  static?: boolean
}) {
  const filled = pct(tournament.registered, tournament.slots)
  const almostFull = filled >= 85
  const finished = tournament.status === "finished"
  const joined =
    tournament.viewerRegistration !== null &&
    ["pending", "confirmed", "checked_in"].includes(tournament.viewerRegistration)
  const href = `/tournaments/${tournament.slug}`

  const Wrapper = isStatic ? "article" : motion.article
  const motionProps = isStatic
    ? {}
    : {
        layout: true,
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
      }

  return (
    <Wrapper
      {...motionProps}
      className="glass group relative flex flex-col overflow-hidden rounded-xl transition-[border-color,transform] duration-300 hover:-translate-y-1 hover:border-white/[0.16]"
    >
      <span className={cn("absolute inset-x-0 top-0 h-[2px]", STATUS_BAR[tournament.status])} />

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-[8px] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-white/60">
            <Crosshair size={13} strokeWidth={1.5} />
            CS2
          </span>
          <div className="flex items-center gap-2">
            {joined && (
              <Badge variant="success" size="sm">
                <Check strokeWidth={1.5} />
                Вы заявлены
              </Badge>
            )}
            <StatusBadge status={tournament.status} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Link href={href} className="group/title">
            <h3 className="font-display text-[18px] font-bold leading-tight tracking-[-0.025em] text-white transition-colors group-hover/title:text-accent-soft">
              {tournament.title}
            </h3>
          </Link>
          <p className="truncate text-[12.5px] text-white/35">
            {tournament.edition} · {tournament.teamSizeLabel} · верхняя сетка
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 border-y border-white/[0.06] py-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
              Взнос
            </span>
            <span className="mono text-[15px] font-medium text-prize">
              {tournament.entryFee > 0 ? `${formatNumber(tournament.entryFee)} сом` : "Бесплатно"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
              {finished ? "Статус" : "До старта"}
            </span>
            <span className="mono text-[15px] font-medium text-white">
              {finished ? "Завершен" : <CountdownInline minutes={tournament.startsInMinutes} />}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-white/40">Слоты</span>
            <span className={cn("mono font-medium", almostFull ? "text-accent-soft" : "text-white/70")}>
              {tournament.registered} / {tournament.slots} игроков
            </span>
          </div>
          <Progress value={filled} tone={almostFull ? "accent" : "neutral"} />
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <JoinButton
            tournament={tournament}
            variant={finished ? "outline" : "subtle"}
            size="md"
            className="flex-1 hover:bg-accent hover:text-white"
            disabled={finished}
          >
            {finished ? "Турнир завершен" : joined ? "Вы в списке" : "Участвовать"}
          </JoinButton>
          <Button variant="outline" size="icon" asChild aria-label={`Открыть ${tournament.title}`}>
            <Link href={href}>
              <ArrowUpRight strokeWidth={1.5} />
            </Link>
          </Button>
        </div>
      </div>
    </Wrapper>
  )
}
