"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Gavel, Loader2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/input"
import { ApiError, resolveAppeal } from "@/lib/api-client"
import type { AppealDto } from "@/lib/types"
import { cn, formatDate, formatTime } from "@/lib/utils"

const SEVERITY = {
  high: { label: "Высокий", variant: "live" as const },
  medium: { label: "Средний", variant: "prize" as const },
  low: { label: "Низкий", variant: "outline" as const },
}

const STATUS = {
  open: { label: "Открыта", variant: "prize" as const },
  resolved: { label: "Удовлетворена", variant: "success" as const },
  declined: { label: "Отклонена", variant: "outline" as const },
}

/**
 * Разбор апелляций.
 *
 * Апелляция переводит матч в состояние «на разборе», поэтому решение судьи
 * — не пометка в списке, а то, что размораживает турнир. Резолюция пишется
 * текстом: через месяц никто не вспомнит, почему счет переписали.
 */
export function AppealsBoard({ appeals }: { appeals: AppealDto[] }) {
  const router = useRouter()
  const [filter, setFilter] = React.useState<"open" | "all">("open")
  const [notes, setNotes] = React.useState<Record<number, string>>({})
  const [busyId, setBusyId] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const list = appeals.filter((item) => (filter === "open" ? item.status === "open" : true))
  const openCount = appeals.filter((item) => item.status === "open").length

  const decide = async (id: number, status: "resolved" | "declined") => {
    setBusyId(id)
    setError(null)
    try {
      await resolveAppeal(id, status, notes[id]?.trim() || undefined)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось сохранить решение")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-[12px] border border-white/[0.07] bg-white/[0.02] p-1">
          {(
            [
              { id: "open", label: "Открытые", count: openCount },
              { id: "all", label: "Все", count: appeals.length },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-[9px] px-3.5 text-[13px] font-medium transition-colors",
                filter === item.id ? "bg-white/[0.09] text-white" : "text-white/45 hover:text-white/80",
              )}
            >
              {item.label}
              <span className="mono text-[11px] text-white/30">{item.count}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-[12.5px] text-accent-soft">{error}</p>}

      {list.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 rounded-xl py-16 text-center">
          <Gavel size={22} strokeWidth={1.5} className="text-white/20" />
          <p className="text-[13px] text-white/30">
            {filter === "open" ? "Открытых апелляций нет" : "Апелляций пока не было"}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((appeal) => {
            const severity = SEVERITY[appeal.severity]
            const status = STATUS[appeal.status]
            const busy = busyId === appeal.id
            const open = appeal.status === "open"

            return (
              <li key={appeal.id} className="panel flex flex-col gap-3 rounded-xl p-5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="mono text-[11.5px] text-white/35">APL-{appeal.id}</span>
                  <Badge variant={severity.variant} size="sm">
                    {severity.label}
                  </Badge>
                  <Badge variant={status.variant} size="sm">
                    {status.label}
                  </Badge>
                  <span className="mono ml-auto text-[11.5px] text-white/25">
                    {formatDate(appeal.createdAt)} · {formatTime(appeal.createdAt)}
                  </span>
                </div>

                <div>
                  <p className="text-[13.5px] font-medium text-white">{appeal.match}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/45">{appeal.reason}</p>
                  <p className="mono mt-2 text-[11.5px] text-white/30">
                    Подал: {appeal.claimant ?? "аноним"} · матч M-{appeal.matchId}
                  </p>
                </div>

                {open && (
                  <>
                    <Textarea
                      value={notes[appeal.id] ?? ""}
                      onChange={(event) =>
                        setNotes((prev) => ({ ...prev, [appeal.id]: event.target.value }))
                      }
                      placeholder="Решение судьи: что проверили и почему так. Останется в протоколе."
                      className="min-h-[72px] text-[13px]"
                      maxLength={1000}
                      aria-label="Решение судьи"
                    />
                    <div className="flex flex-wrap gap-2.5">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busy}
                        onClick={() => void decide(appeal.id, "resolved")}
                      >
                        {busy ? (
                          <Loader2 strokeWidth={1.5} className="animate-spin" />
                        ) : (
                          <Check strokeWidth={1.5} />
                        )}
                        Удовлетворить
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void decide(appeal.id, "declined")}
                      >
                        <X strokeWidth={1.5} />
                        Отклонить
                      </Button>
                      <span className="self-center text-[11.5px] text-white/25">
                        Счет матча правится отдельно, в протоколе
                      </span>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
