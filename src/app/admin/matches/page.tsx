"use client"

import * as React from "react"
import { Check, Gavel, ShieldX, Upload } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { AdminPageTitle } from "@/components/admin/admin-shell"
import { MATCH_QUEUE, type MatchRow } from "@/lib/data/admin"
import { cn, plural } from "@/lib/utils"

const STATE = {
  live: { label: "Идет", variant: "live" as const },
  review: { label: "Апелляция", variant: "prize" as const },
  pending: { label: "Ожидает", variant: "outline" as const },
  done: { label: "Завершен", variant: "success" as const },
}

function ResultDialog({ match, onClose }: { match: MatchRow | null; onClose: () => void }) {
  const [maps, setMaps] = React.useState<{ map: string; a: number; b: number }[]>([])
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    if (!match) return
    setMaps(match.maps.length ? match.maps.map((item) => ({ ...item })) : [{ map: "Mirage", a: 0, b: 0 }])
    setSaved(false)
  }, [match])

  const update = (index: number, key: "a" | "b", value: number) => {
    setMaps((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: Math.max(0, Math.min(30, value)) } : item)),
    )
  }

  const seriesA = maps.filter((item) => item.a > item.b).length
  const seriesB = maps.filter((item) => item.b > item.a).length

  return (
    <Dialog open={Boolean(match)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-[560px] p-0">
        {match && (
          <>
            <div className="px-6 pb-4 pt-6">
              <DialogTitle className="text-[18px]">
                {match.a} — {match.b}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {match.id} · {match.round} · {match.format}
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
                <div key={`${item.map}-${index}`} className="flex items-center gap-3">
                  <Input
                    value={item.map}
                    onChange={(event) =>
                      setMaps((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, map: event.target.value } : row)),
                      )
                    }
                    className="h-10 flex-1"
                    aria-label="Карта"
                  />
                  <Input
                    type="number"
                    value={item.a}
                    onChange={(event) => update(index, "a", Number(event.target.value))}
                    className="h-10 w-16 text-center"
                    aria-label={`Счет ${match.a}`}
                  />
                  <span className="text-white/25">:</span>
                  <Input
                    type="number"
                    value={item.b}
                    onChange={(event) => update(index, "b", Number(event.target.value))}
                    className="h-10 w-16 text-center"
                    aria-label={`Счет ${match.b}`}
                  />
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() => setMaps((prev) => [...prev, { map: "", a: 0, b: 0 }])}
              >
                Добавить карту
              </Button>

              <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-[10px] border border-dashed border-white/10 px-4 py-4 text-[12.5px] text-white/40 transition-colors hover:border-white/25">
                <Upload size={15} strokeWidth={1.5} />
                Загрузить скриншот счета или GOTV-демо
                <input type="file" className="hidden" accept="image/*,.dem" />
              </label>
            </div>

            <div className="h-px bg-white/[0.07]" />

            <div className="flex flex-wrap items-center gap-2.5 p-6">
              <Button variant="danger" size="md">
                <ShieldX strokeWidth={1.5} />
                Тех. поражение {match.a}
              </Button>
              <Button variant="danger" size="md">
                <ShieldX strokeWidth={1.5} />
                Тех. поражение {match.b}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="ml-auto"
                onClick={() => setSaved(true)}
                disabled={saved}
              >
                <Check strokeWidth={1.5} />
                {saved ? "Записано" : "Подтвердить результат"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function AdminMatchesPage() {
  const [match, setMatch] = React.useState<MatchRow | null>(null)
  const live = MATCH_QUEUE.filter((item) => item.state === "live").length
  const review = MATCH_QUEUE.filter((item) => item.state === "review").length

  return (
    <>
      <AdminPageTitle
        title="Матчи и сетка"
        description={`${live} ${plural(live, ["матч", "матча", "матчей"])} в эфире · ${review} на апелляции · результаты пишутся в сетку сразу после подтверждения`}
      />

      <div className="panel overflow-hidden rounded-xl">
        <div className="hidden grid-cols-[90px_110px_minmax(0,1fr)_110px_130px_minmax(0,1fr)_200px] items-center gap-4 border-b border-white/[0.07] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/30 xl:grid">
          <span>ID</span>
          <span>Стадия</span>
          <span>Матч</span>
          <span>Счет</span>
          <span>Статус</span>
          <span>Комментарий</span>
          <span className="text-right">Действия</span>
        </div>

        <ul className="divide-y divide-white/[0.05]">
          {MATCH_QUEUE.map((row) => {
            const state = STATE[row.state]
            return (
              <li
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02] xl:grid-cols-[90px_110px_minmax(0,1fr)_110px_130px_minmax(0,1fr)_200px]"
              >
                <span className="mono hidden text-[12px] text-white/30 xl:block">{row.id}</span>
                <span className="hidden text-[12.5px] text-white/50 xl:block">{row.round}</span>

                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-white">
                    {row.a} — {row.b}
                  </p>
                  <p className="truncate text-[11.5px] text-white/30 xl:hidden">
                    {row.round} · {row.time}
                  </p>
                </div>

                <span className="mono hidden text-[13px] text-white xl:block">
                  {row.scoreA ?? "–"} : {row.scoreB ?? "–"}
                </span>

                <span className="hidden xl:block">
                  <Badge variant={state.variant} size="sm">
                    {row.state === "live" && (
                      <span className="size-1.5 rounded-full bg-accent pulse-live" />
                    )}
                    {state.label}
                  </Badge>
                </span>

                <span
                  className={cn(
                    "hidden truncate text-[12px] xl:block",
                    row.state === "review" ? "text-prize" : "text-white/35",
                  )}
                >
                  {row.time}
                </span>

                <div className="flex shrink-0 justify-end gap-2">
                  {row.state === "review" && (
                    <Button variant="outline" size="sm" onClick={() => setMatch(row)}>
                      <Gavel strokeWidth={1.5} />
                      Разбор
                    </Button>
                  )}
                  <Button variant="subtle" size="sm" onClick={() => setMatch(row)}>
                    Ввести счет
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <ResultDialog match={match} onClose={() => setMatch(null)} />
    </>
  )
}
