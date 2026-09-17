"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Gavel, Loader2, ShieldX } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { MatchDto, MatchState } from "@/lib/types"
import { cn, plural } from "@/lib/utils"

const STATE: Record<MatchState, { label: string; variant: "live" | "prize" | "outline" | "success" }> = {
  live: { label: "Идет", variant: "live" },
  review: { label: "Апелляция", variant: "prize" },
  pending: { label: "Ожидает", variant: "outline" },
  done: { label: "Завершен", variant: "success" },
}

interface MapRow {
  map: string
  scoreA: number
  scoreB: number
}

/**
 * Ввод протокола. Счет серии считает бэкенд из карт: победитель сразу
 * проходит в следующий раунд верхней сетки, а игрокам начисляются очки.
 */
function ResultDialog({
  match,
  maps: mapPool,
  onClose,
}: {
  match: MatchDto | null
  maps: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const [maps, setMaps] = React.useState<MapRow[]>([])
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!match) return
    setMaps(
      match.maps.length
        ? match.maps.map((item) => ({ ...item }))
        : [{ map: mapPool[0] ?? "Mirage", scoreA: 0, scoreB: 0 }],
    )
    setError(null)
  }, [match, mapPool])

  const update = (index: number, key: "scoreA" | "scoreB", value: number) => {
    setMaps((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [key]: Math.max(0, Math.min(30, Number.isFinite(value) ? value : 0)) } : item,
      ),
    )
  }

  const seriesA = maps.filter((item) => item.scoreA > item.scoreB).length
  const seriesB = maps.filter((item) => item.scoreB > item.scoreA).length

  const save = async (payload: Record<string, unknown>) => {
    if (!match) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/matches/${match.id}/score`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Не удалось сохранить протокол")
      }
      router.refresh()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить протокол")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(match)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-[560px] p-0">
        {match && (
          <>
            <div className="px-6 pb-4 pt-6">
              <DialogTitle className="text-[18px]">
                {match.a?.name ?? "TBD"} — {match.b?.name ?? "TBD"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                M-{match.id} · {match.roundName} · {match.format}
              </DialogDescription>
            </div>

            <div className="h-px bg-white/[0.07]" />

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
                  <Input
                    value={item.map}
                    onChange={(event) =>
                      setMaps((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, map: event.target.value } : row)),
                      )
                    }
                    className="h-10 flex-1"
                    aria-label="Карта"
                    list="map-pool"
                  />
                  <Input
                    type="number"
                    value={item.scoreA}
                    onChange={(event) => update(index, "scoreA", Number(event.target.value))}
                    className="h-10 w-16 text-center"
                    aria-label={`Счет ${match.a?.name ?? "A"}`}
                  />
                  <span className="text-white/25">:</span>
                  <Input
                    type="number"
                    value={item.scoreB}
                    onChange={(event) => update(index, "scoreB", Number(event.target.value))}
                    className="h-10 w-16 text-center"
                    aria-label={`Счет ${match.b?.name ?? "B"}`}
                  />
                </div>
              ))}

              <datalist id="map-pool">
                {mapPool.map((map) => (
                  <option key={map} value={map} />
                ))}
              </datalist>

              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() =>
                  setMaps((prev) => [...prev, { map: mapPool[prev.length] ?? "", scoreA: 0, scoreB: 0 }])
                }
              >
                Добавить карту
              </Button>

              {error && <p className="text-[12px] text-accent-soft">{error}</p>}
            </div>

            <div className="h-px bg-white/[0.07]" />

            <div className="flex flex-wrap items-center gap-2.5 p-6">
              <Button
                variant="danger"
                size="md"
                disabled={saving}
                onClick={() => void save({ maps: [], awardTo: "b", state: "done", note: "Тех. поражение" })}
              >
                <ShieldX strokeWidth={1.5} />
                Тех. поражение {match.a?.tag ?? "A"}
              </Button>
              <Button
                variant="danger"
                size="md"
                disabled={saving}
                onClick={() => void save({ maps: [], awardTo: "a", state: "done", note: "Тех. поражение" })}
              >
                <ShieldX strokeWidth={1.5} />
                Тех. поражение {match.b?.tag ?? "B"}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="ml-auto"
                disabled={saving}
                onClick={() =>
                  void save({
                    maps: maps.filter((item) => item.map.trim()),
                    state: "done",
                    proof: true,
                  })
                }
              >
                {saving ? (
                  <Loader2 strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <Check strokeWidth={1.5} />
                )}
                Подтвердить результат
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function MatchQueue({ matches, mapPool }: { matches: MatchDto[]; mapPool: string[] }) {
  const [active, setActive] = React.useState<MatchDto | null>(null)
  const open = matches.filter((match) => match.state !== "done").length

  return (
    <>
      <div className="panel overflow-hidden rounded-xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-white">Очередь матчей</h2>
          <span className="text-[12px] text-white/35">
            {open} {plural(open, ["матч ждет", "матча ждут", "матчей ждут"])} протокола
          </span>
        </header>

        {matches.length === 0 ? (
          <p className="px-5 py-14 text-center text-[13px] text-white/25">
            Матчей нет — постройте сетку в разделе «Турниры».
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {matches.map((match) => {
              const state = STATE[match.state]
              const ready = Boolean(match.a && match.b)
              return (
                <li
                  key={match.id}
                  className="flex flex-wrap items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                >
                  <span className="mono w-16 shrink-0 text-[11.5px] text-white/30">M-{match.id}</span>
                  <span className="w-28 shrink-0 truncate text-[12px] text-white/45">
                    {match.roundName}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">
                    {match.a?.name ?? "TBD"} — {match.b?.name ?? "TBD"}
                  </span>
                  <span className="mono shrink-0 text-[13px] text-white">
                    {match.a?.score ?? "–"} : {match.b?.score ?? "–"}
                  </span>
                  <Badge variant={state.variant} size="sm">
                    {state.label}
                  </Badge>
                  <span
                    className={cn(
                      "hidden w-40 shrink-0 truncate text-[12px] sm:block",
                      match.state === "review" ? "text-prize" : "text-white/35",
                    )}
                  >
                    {match.note}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!ready}
                    onClick={() => setActive(match)}
                  >
                    <Gavel strokeWidth={1.5} />
                    Протокол
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ResultDialog match={active} maps={mapPool} onClose={() => setActive(null)} />
    </>
  )
}
