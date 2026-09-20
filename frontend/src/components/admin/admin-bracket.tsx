"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, CircleAlert, Loader2, Trophy, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"
import { TeamMark } from "@/components/ui/misc"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Bracket, BracketContext } from "@/components/tournament/bracket"
import { MapVeto } from "@/components/tournament/map-veto"
import {
  ApiError,
  declareWinner,
  saveMatchScore,
  type MapScoreInput,
} from "@/lib/api-client"
import type { BracketRoundDto, MatchDto, TournamentDto } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Судейская сетка.
 *
 * Обычная сетка турнира, но клик по матчу открывает не составы, а решение:
 * кто прошел дальше. Победитель сразу подставляется в следующий раунд —
 * именно так сетка и «дергается» по ходу турнира.
 */

function WinnerDialog({
  match,
  mapPool,
  onClose,
}: {
  match: MatchDto | null
  mapPool: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const [maps, setMaps] = React.useState<MapScoreInput[]>([])
  const [pending, setPending] = React.useState<"a" | "b" | "score" | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!match) return
    setMaps(match.maps.map((item) => ({ ...item })))
    setError(null)
  }, [match])

  if (!match) return <Dialog open={false} onOpenChange={onClose} />

  const ready = Boolean(match.a && match.b)

  const run = async (action: "a" | "b" | "score", task: () => Promise<unknown>) => {
    setPending(action)
    setError(null)
    try {
      await task()
      router.refresh()
      onClose()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось сохранить результат")
    } finally {
      setPending(null)
    }
  }

  const seriesA = maps.filter((item) => item.scoreA > item.scoreB).length
  const seriesB = maps.filter((item) => item.scoreB > item.scoreA).length

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-[560px] p-0">
        <div className="px-6 pb-4 pt-6">
          <DialogTitle className="text-[18px]">
            {match.a?.name ?? "TBD"} — {match.b?.name ?? "TBD"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            M-{match.id} · {match.roundName} · {match.format}
            {match.winner ? ` · победитель уже записан` : ""}
          </DialogDescription>
        </div>

        <div className="h-px bg-white/[0.07]" />

        {!ready ? (
          <p className="flex items-center justify-center gap-2 px-6 py-12 text-center text-[13px] text-white/35">
            <CircleAlert size={15} strokeWidth={1.5} />
            Матч ждет победителей предыдущего раунда
          </p>
        ) : (
          <>
            {/* Быстрое решение — то, ради чего судья открывает сетку */}
            <div className="flex flex-col gap-3 p-6">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/30">
                Кто прошел дальше
              </span>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {(["a", "b"] as const).map((side) => {
                  const entry = side === "a" ? match.a : match.b
                  const won = match.winner === side
                  return (
                    <button
                      key={side}
                      type="button"
                      disabled={pending !== null}
                      onClick={() => void run(side, () => declareWinner(match.id, side))}
                      className={cn(
                        "flex items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left transition-all duration-200 disabled:opacity-60",
                        won
                          ? "border-success/45 bg-success/[0.08]"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-accent/45 hover:bg-accent/[0.06]",
                      )}
                    >
                      <TeamMark tag={entry?.tag ?? "—"} size="sm" tone={won ? "accent" : "steel"} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-white">
                          {entry?.name ?? "TBD"}
                        </span>
                        <span className="block text-[11.5px] text-white/35">
                          посев #{entry?.seed ?? "—"}
                        </span>
                      </span>
                      {pending === side ? (
                        <Loader2 size={15} strokeWidth={1.5} className="animate-spin text-white/50" />
                      ) : won ? (
                        <Check size={15} strokeWidth={2} className="text-success" />
                      ) : (
                        <Trophy size={15} strokeWidth={1.5} className="text-white/25" />
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11.5px] leading-relaxed text-white/30">
                Победитель сразу встает в следующий раунд. Без счета по картам серия
                записывается как 1:0 — счет можно уточнить ниже в любой момент.
              </p>
            </div>

            <div className="h-px bg-white/[0.07]" />

            {/* Вето: организатор видит, что готовить на сервере */}
            <div className="p-6">
              <MapVeto matchId={match.id} admin />
            </div>

            <div className="h-px bg-white/[0.07]" />

            {/* Подробный протокол — когда нужен счет по картам */}
            <div className="flex flex-col gap-3 p-6">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/30">
                  Счет по картам
                </span>
                <span className="mono text-[15px] font-medium text-white">
                  {seriesA} : {seriesB}
                </span>
              </div>

              {maps.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Select
                    value={item.map}
                    onChange={(event) =>
                      setMaps((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, map: event.target.value } : row)),
                      )
                    }
                    className="h-10 flex-1"
                    aria-label="Карта"
                  >
                    {[item.map, ...mapPool.filter((map) => map !== item.map)]
                      .filter(Boolean)
                      .map((map) => (
                        <option key={map} value={map}>
                          {map}
                        </option>
                      ))}
                  </Select>
                  <Input
                    type="number"
                    value={item.scoreA}
                    onChange={(event) =>
                      setMaps((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, scoreA: Number(event.target.value) } : row,
                        ),
                      )
                    }
                    className="h-10 w-16 text-center"
                    aria-label={`Счет ${match.a?.name ?? "A"}`}
                  />
                  <span className="text-white/25">:</span>
                  <Input
                    type="number"
                    value={item.scoreB}
                    onChange={(event) =>
                      setMaps((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, scoreB: Number(event.target.value) } : row,
                        ),
                      )
                    }
                    className="h-10 w-16 text-center"
                    aria-label={`Счет ${match.b?.name ?? "B"}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Убрать карту"
                    onClick={() => setMaps((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <X strokeWidth={1.5} />
                  </Button>
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setMaps((prev) => [
                      ...prev,
                      { map: mapPool[prev.length % Math.max(1, mapPool.length)] ?? "Mirage", scoreA: 0, scoreB: 0 },
                    ])
                  }
                >
                  Добавить карту
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="ml-auto"
                  disabled={maps.length === 0 || pending !== null}
                  onClick={() =>
                    void run("score", () =>
                      saveMatchScore(match.id, { maps, state: "done", proof: true }),
                    )
                  }
                >
                  {pending === "score" ? (
                    <Loader2 strokeWidth={1.5} className="animate-spin" />
                  ) : (
                    <Check strokeWidth={1.5} />
                  )}
                  Сохранить протокол
                </Button>
              </div>

              {error && <p className="text-[12px] text-accent-soft">{error}</p>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function AdminBracket({
  tournaments,
  active,
  rounds,
}: {
  tournaments: TournamentDto[]
  active: TournamentDto | null
  rounds: BracketRoundDto[]
}) {
  const router = useRouter()
  const [focus, setFocus] = React.useState<string | null>(null)
  const [match, setMatch] = React.useState<MatchDto | null>(null)

  const value = React.useMemo<React.ContextType<typeof BracketContext>>(
    () => ({ focus, setFocus, openMatch: setMatch }),
    [focus],
  )

  const pending = rounds.flatMap((round) => round.matches).filter((item) => item.state !== "done")

  return (
    <BracketContext.Provider value={value}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Select
            value={active?.slug ?? ""}
            onChange={(event) => router.push(`/admin/bracket?tournament=${event.target.value}`)}
            aria-label="Турнир"
            className="h-10 sm:w-72"
          >
            {tournaments.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title} · {item.status}
              </option>
            ))}
          </Select>

          <Badge variant={pending.length > 0 ? "prize" : "success"} size="md">
            {pending.length > 0
              ? `${pending.length} матчей без результата`
              : "Все матчи сыграны"}
          </Badge>
        </div>

        {rounds.length === 0 ? (
          <div className="panel rounded-xl py-16 text-center text-[13px] text-white/30">
            Сетки еще нет. Проведите жеребьевку и постройте сетку в разделе «Турниры».
          </div>
        ) : (
          <>
            <p className="text-[12.5px] text-white/35">
              Клик по матчу — отметить, кто прошел дальше. Победитель сразу подставляется в
              следующий раунд.
            </p>
            <Bracket rounds={rounds} minHeight={560} />
          </>
        )}
      </div>

      <WinnerDialog match={match} mapPool={active?.maps ?? []} onClose={() => setMatch(null)} />
    </BracketContext.Provider>
  )
}
