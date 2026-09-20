"use client"

import * as React from "react"
import { Ban, Check, CircleAlert, Loader2, RotateCcw, ServerCog, Swords } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TeamMark } from "@/components/ui/misc"
import { ApiError, adminVetoMap, getVeto, resetVeto, vetoMap } from "@/lib/api-client"
import type { VetoStateDto } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Вето карт перед серией.
 *
 * Обе стороны видят одну и ту же доску: что забанено, что выбрано и чей
 * сейчас ход. Первым ходит лучший посев — это не жребий, посев уже
 * заработан средним рейтингом состава.
 *
 * Пока вето идет, организатор знает, какие карты готовить на сервере;
 * когда закончилось — порядок серии сразу уходит в протокол матча.
 */
export function MapVeto({
  matchId,
  admin = false,
  onFinished,
}: {
  matchId: number
  /** Организатор ходит за любую сторону и может сбросить вето. */
  admin?: boolean
  onFinished?: () => void
}) {
  const [state, setState] = React.useState<VetoStateDto | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    try {
      const data = await getVeto(matchId)
      setState(data.veto)
    } catch {
      setError("Не удалось загрузить вето")
    } finally {
      setLoading(false)
    }
  }, [matchId])

  React.useEffect(() => {
    void load()
  }, [load])

  // Пока ходит соперник, доска обновляется сама: перезагружать страницу
  // посреди вето никто не станет.
  React.useEffect(() => {
    if (!state || state.finished) return
    const waiting = admin || state.viewerSide !== state.turn?.side
    if (!waiting) return

    const id = window.setInterval(() => void load(), 5000)
    return () => window.clearInterval(id)
  }, [state, admin, load])

  const pick = async (map: string) => {
    setBusy(map)
    setError(null)
    try {
      const data = admin ? await adminVetoMap(matchId, map) : await vetoMap(matchId, map)
      setState(data.veto)
      if (data.veto.finished) onFinished?.()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Ход не принят")
      void load()
    } finally {
      setBusy(null)
    }
  }

  const reset = async () => {
    setBusy("reset")
    setError(null)
    try {
      const data = await resetVeto(matchId)
      setState(data.veto)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось сбросить вето")
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-[12.5px] text-white/30">
        <Loader2 size={14} strokeWidth={1.5} className="animate-spin" />
        Загружаем вето
      </p>
    )
  }

  if (!state) return <p className="py-6 text-center text-[12.5px] text-white/30">{error}</p>

  if (!state.sides.a || !state.sides.b) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-center text-[12.5px] text-white/30">
        <CircleAlert size={14} strokeWidth={1.5} />
        Вето откроется, когда определятся обе стороны
      </p>
    )
  }

  if (state.pool.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-center text-[12.5px] text-white/30">
        <CircleAlert size={14} strokeWidth={1.5} />
        У турнира не задан пул карт — заполните его в карточке турнира
      </p>
    )
  }

  const myTurn = admin || (state.viewerSide !== null && state.viewerSide === state.turn?.side)
  const turnSide = state.turn ? state.sides[state.turn.side] : null

  return (
    <div className="flex flex-col gap-4">
      {/* Кто ходит */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Swords size={15} strokeWidth={1.5} className="text-white/40" />
          <span className="text-[13px] font-medium text-white">Вето карт</span>
          <Badge variant="outline" size="sm">
            {state.format}
          </Badge>
        </div>

        {state.finished ? (
          <Badge variant="success" size="sm">
            <Check strokeWidth={1.5} />
            Завершено
          </Badge>
        ) : (
          <span className="flex items-center gap-2 text-[12.5px] text-white/45">
            <TeamMark tag={turnSide?.tag ?? "—"} size="sm" tone={myTurn ? "accent" : "steel"} />
            {myTurn ? "Ваш ход" : `Ходит ${turnSide?.name ?? "соперник"}`}:{" "}
            <span className={state.turn?.action === "ban" ? "text-accent-soft" : "text-success"}>
              {state.turn?.action === "ban" ? "бан" : "пик"}
            </span>
          </span>
        )}
      </div>

      {/* Карты */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {state.pool.map((map) => {
          const step = state.steps.find((item) => item.map === map)
          const banned = step?.action === "ban"
          const picked = step?.action === "pick"
          const isDecider = state.decider === map
          const selectable = !step && !state.finished && myTurn && busy === null

          return (
            <button
              key={map}
              type="button"
              disabled={!selectable}
              onClick={() => void pick(map)}
              className={cn(
                "flex items-center gap-3 rounded-[11px] border px-4 py-3 text-left transition-all duration-200",
                banned && "border-white/[0.06] bg-white/[0.01] opacity-40",
                picked && "border-success/40 bg-success/[0.07]",
                isDecider && "border-prize/40 bg-prize/[0.07]",
                !step && !isDecider && selectable && "border-white/[0.08] bg-white/[0.02] hover:border-accent/45 hover:bg-accent/[0.06]",
                !step && !isDecider && !selectable && "border-white/[0.06] bg-white/[0.02]",
              )}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-[13.5px] font-medium",
                    banned ? "text-white/40 line-through" : "text-white",
                  )}
                >
                  {map}
                </span>
                {step && (
                  <span className="block text-[11px] text-white/35">
                    {step.action === "ban" ? "забанил" : "выбрал"} {state.sides[step.side]?.tag}
                  </span>
                )}
                {isDecider && <span className="block text-[11px] text-prize/80">решающая</span>}
              </span>

              {busy === map ? (
                <Loader2 size={14} strokeWidth={1.5} className="animate-spin text-white/50" />
              ) : banned ? (
                <Ban size={14} strokeWidth={1.5} className="shrink-0 text-white/25" />
              ) : picked || isDecider ? (
                <Check size={14} strokeWidth={2} className="shrink-0 text-success" />
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Итог */}
      {state.finished && state.maps.length > 0 && (
        <div className="rounded-[11px] border border-white/[0.08] bg-white/[0.02] p-4">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/30">
            <ServerCog size={13} strokeWidth={1.5} />
            Порядок серии
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {state.maps.map((map, index) => (
              <React.Fragment key={map}>
                {index > 0 && <span className="text-white/20">→</span>}
                <span className="mono rounded-[8px] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[12.5px] text-white">
                  {index + 1}. {map}
                </span>
              </React.Fragment>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-white/30">
            Карты записаны в протокол матча — судье не нужно вводить их заново.
          </p>
        </div>
      )}

      {!myTurn && !state.finished && (
        <p className="text-[11.5px] text-white/30">
          {state.viewerSide
            ? "Доска обновляется сама — дождитесь хода соперника."
            : "Ходы делают участники матча."}
        </p>
      )}

      {error && <p className="text-[12px] text-accent-soft">{error}</p>}

      {admin && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          disabled={busy !== null}
          onClick={() => void reset()}
        >
          {busy === "reset" ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <RotateCcw strokeWidth={1.5} />
          )}
          Сбросить вето
        </Button>
      )}
    </div>
  )
}
