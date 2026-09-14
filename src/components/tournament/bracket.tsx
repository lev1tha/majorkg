"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import type { BracketMatch, BracketRound, BracketSide } from "@/lib/data/bracket"

interface BracketContextValue {
  focus: string | null
  setFocus: (tag: string | null) => void
  openMatch: (match: BracketMatch) => void
}

const BracketContext = React.createContext<BracketContextValue | null>(null)

function Side({
  side,
  won,
  lost,
  live,
}: {
  side: BracketSide | null
  won: boolean
  lost: boolean
  live: boolean
}) {
  const ctx = React.useContext(BracketContext)

  if (!side) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-[7px]">
        <span className="mono w-4 shrink-0 text-[10px] text-white/15">—</span>
        <span className="flex-1 truncate text-[12.5px] text-white/20">Ожидается</span>
        <span className="mono text-[12.5px] text-white/15">–</span>
      </div>
    )
  }

  const focused = ctx?.focus === side.tag
  const dimmed = Boolean(ctx?.focus) && !focused

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        ctx?.setFocus(focused ? null : side.tag)
      }}
      className={cn(
        "relative flex w-full items-center gap-2.5 px-3 py-[7px] text-left transition-all duration-200",
        won && "bg-white/[0.05]",
        lost && "opacity-40",
        focused && "bg-accent/[0.1]",
        dimmed && "opacity-25",
        "hover:bg-white/[0.07]",
      )}
    >
      {won && <span className="absolute inset-y-0 left-0 w-[2px] bg-success" />}
      {focused && <span className="absolute inset-y-0 left-0 w-[2px] bg-accent" />}
      <span className="mono w-4 shrink-0 text-[10px] text-white/25">{side.seed ?? ""}</span>
      <span
        className={cn(
          "mono w-9 shrink-0 text-[11px] font-medium",
          won ? "text-white" : "text-white/50",
        )}
      >
        {side.tag}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[12.5px]",
          won ? "font-medium text-white" : "text-white/60",
        )}
      >
        {side.name}
      </span>
      <span
        className={cn(
          "mono text-[13px] font-medium tabular",
          won ? "text-success" : live ? "text-white/85" : "text-white/40",
        )}
      >
        {side.score ?? "–"}
      </span>
    </button>
  )
}

export function MatchCard({ match, compact }: { match: BracketMatch; compact?: boolean }) {
  const ctx = React.useContext(BracketContext)
  const live = match.state === "live"
  const done = match.state === "done"
  const onPath = Boolean(
    ctx?.focus && (match.a?.tag === ctx.focus || match.b?.tag === ctx.focus),
  )

  return (
    <article
      onClick={() => ctx?.openMatch(match)}
      className={cn(
        "w-full cursor-pointer overflow-hidden rounded-[10px] border bg-surface transition-all duration-200",
        live ? "border-accent/40" : "border-white/[0.08] hover:border-white/25",
        onPath && "border-accent/60 shadow-[0_0_0_1px_rgba(255,70,85,0.25)]",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-3 py-1">
        <span className="mono text-[9.5px] uppercase tracking-[0.12em] text-white/25">
          {match.format}
        </span>
        {live ? (
          <span className="inline-flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-accent">
            <span className="size-1.5 rounded-full bg-accent pulse-live" />
            Live
          </span>
        ) : (
          <span className="text-[9.5px] uppercase tracking-[0.12em] text-white/25">
            {done ? "Завершен" : "Ожидает"}
          </span>
        )}
      </header>

      <div className="divide-y divide-white/[0.05]">
        <Side side={match.a} won={match.winner === "a"} lost={match.winner === "b"} live={live} />
        <Side side={match.b} won={match.winner === "b"} lost={match.winner === "a"} live={live} />
      </div>

      {!compact && (
        <footer className="truncate border-t border-white/[0.06] px-3 py-1 text-[10px] text-white/25">
          {match.maps?.length ? match.maps.join(" · ") : match.meta}
        </footer>
      )}
    </article>
  )
}

/**
 * Сетка на чистом CSS: каждый раунд — колонка с равными flex-слотами,
 * поэтому центры матчей следующего раунда попадают ровно в середину пары
 * предыдущего. Соединители — псевдоэлементы, без пересчета координат в JS.
 */
export function Bracket({
  rounds,
  className,
  minHeight = 560,
}: {
  rounds: BracketRound[]
  className?: string
  minHeight?: number
}) {
  const ctx = React.useContext(BracketContext)

  if (!rounds.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 py-16 text-center text-[13px] text-white/30">
        Сетка появится после закрытия слотов.
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <div className="-mx-5 overflow-x-auto px-5 pb-3 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-12" style={{ minHeight }}>
          {rounds.map((round, roundIndex) => {
            const next = rounds[roundIndex + 1]
            const last = !next
            // В нижней сетке есть раунды «без слияния» — соединитель прямой.
            const merging = Boolean(next && next.matches.length < round.matches.length)

            return (
              <section key={round.id} className="flex w-[252px] shrink-0 flex-col">
                <h4 className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
                  {round.name}
                </h4>

                <div className="flex flex-1 flex-col">
                  {round.matches.map((match, matchIndex) => {
                    const down = matchIndex % 2 === 0
                    const onPath = Boolean(
                      ctx?.focus && (match.a?.tag === ctx.focus || match.b?.tag === ctx.focus),
                    )
                    const line = onPath
                      ? "bg-accent/50"
                      : match.winner
                        ? "bg-white/20"
                        : "bg-white/[0.1]"

                    return (
                      <div key={match.id} className="relative flex flex-1 items-center">
                        {roundIndex > 0 && (
                          <span
                            aria-hidden
                            className={cn("absolute right-full top-1/2 h-px w-6", line)}
                          />
                        )}

                        <MatchCard match={match} />

                        {!last && (
                          <>
                            <span
                              aria-hidden
                              className={cn("absolute left-full top-1/2 h-px w-6", line)}
                            />
                            {merging ? (
                              <span
                                aria-hidden
                                className={cn(
                                  "absolute left-[calc(100%+24px)] w-px",
                                  line,
                                  down ? "top-1/2 h-1/2" : "bottom-1/2 h-1/2",
                                )}
                              />
                            ) : (
                              <span
                                aria-hidden
                                className={cn("absolute left-[calc(100%+24px)] top-1/2 h-px w-6", line)}
                              />
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { BracketContext }
