"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Loader2, RotateCcw, Search, UserCheck, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FaceitLevel } from "@/components/player/faceit-level"
import { ApiError, moderateRegistration } from "@/lib/api-client"
import type { ParticipantDto, RegistrationStatus } from "@/lib/types"
import { cn, formatNumber } from "@/lib/utils"

const STATUS: Record<
  RegistrationStatus,
  { label: string; variant: "success" | "prize" | "outline" | "live" }
> = {
  pending: { label: "На модерации", variant: "prize" },
  confirmed: { label: "Подтверждена", variant: "success" },
  checked_in: { label: "Check-in пройден", variant: "success" },
  rejected: { label: "Отклонена", variant: "live" },
  withdrawn: { label: "Снята игроком", variant: "outline" },
}

const FILTERS: { id: RegistrationStatus | "all" | "active"; label: string }[] = [
  { id: "active", label: "Активные" },
  { id: "pending", label: "На модерации" },
  { id: "confirmed", label: "Подтвержденные" },
  { id: "checked_in", label: "Прошли check-in" },
  { id: "all", label: "Все" },
]

const ACTIVE: RegistrationStatus[] = ["pending", "confirmed", "checked_in"]

/**
 * Заявки турнира с модерацией.
 *
 * Жеребьевка берет только подтвержденные и прошедших check-in, поэтому
 * подтверждение здесь — не формальность: неподтвержденный игрок просто не
 * попадет в составы.
 */
export function RegistrationTable({
  slug,
  items,
}: {
  slug: string
  items: ParticipantDto[]
}) {
  const router = useRouter()
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["id"]>("active")
  const [query, setQuery] = React.useState("")
  const [busyId, setBusyId] = React.useState<number | null>(null)
  const [bulk, setBulk] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const deferred = React.useDeferredValue(query)

  const counts = React.useMemo(() => {
    const map = { pending: 0, confirmed: 0, checked_in: 0, rejected: 0, withdrawn: 0 }
    for (const item of items) map[item.status] += 1
    return map
  }, [items])

  const list = React.useMemo(() => {
    const needle = deferred.trim().toLowerCase()
    return items.filter((item) => {
      if (filter === "active" && !ACTIVE.includes(item.status)) return false
      if (filter !== "all" && filter !== "active" && item.status !== filter) return false
      if (needle && !item.player.nickname.toLowerCase().includes(needle)) return false
      return true
    })
  }, [items, filter, deferred])

  const moderate = async (id: number, status: RegistrationStatus) => {
    setBusyId(id)
    setError(null)
    try {
      await moderateRegistration(id, status)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось обновить заявку")
    } finally {
      setBusyId(null)
    }
  }

  /** Подтвердить всю очередь разом — обычный шаг перед жеребьевкой. */
  const confirmAll = async () => {
    const queue = items.filter((item) => item.status === "pending")
    if (queue.length === 0) return

    setBulk(true)
    setError(null)
    try {
      for (const item of queue) {
        await moderateRegistration(item.registrationId, "confirmed")
      }
      router.refresh()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось подтвердить все заявки")
    } finally {
      setBulk(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-[12px] border border-white/[0.07] bg-white/[0.02] p-1">
          {FILTERS.map((item) => {
            const active = filter === item.id
            const count =
              item.id === "all"
                ? items.length
                : item.id === "active"
                  ? counts.pending + counts.confirmed + counts.checked_in
                  : counts[item.id]
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-[9px] px-3.5 text-[13px] font-medium transition-colors",
                  active ? "bg-white/[0.09] text-white" : "text-white/45 hover:text-white/80",
                )}
              >
                {item.label}
                <span className="mono text-[11px] text-white/30">{count}</span>
              </button>
            )
          })}
        </div>

        <div className="relative sm:w-56">
          <Search
            size={15}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ник игрока"
            aria-label="Поиск по заявкам"
            className="h-10 pl-9"
          />
        </div>

        {counts.pending > 0 && (
          <Button
            variant="primary"
            size="md"
            className="ml-auto"
            disabled={bulk}
            onClick={() => void confirmAll()}
          >
            {bulk ? (
              <Loader2 strokeWidth={1.5} className="animate-spin" />
            ) : (
              <UserCheck strokeWidth={1.5} />
            )}
            Подтвердить все ({counts.pending})
          </Button>
        )}
      </div>

      {error && <p className="text-[12.5px] text-accent-soft">{error}</p>}

      <div className="panel overflow-hidden rounded-xl">
        <div className="hidden grid-cols-[48px_minmax(0,1fr)_110px_150px_200px] items-center gap-4 border-b border-white/[0.07] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/30 lg:grid">
          <span>Посев</span>
          <span>Игрок</span>
          <span className="text-right">ELO</span>
          <span>Статус</span>
          <span className="text-right">Действие</span>
        </div>

        <ul className="divide-y divide-white/[0.05]">
          {list.map((item) => {
            const status = STATUS[item.status]
            const busy = busyId === item.registrationId
            return (
              <li
                key={item.registrationId}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02] lg:grid-cols-[48px_minmax(0,1fr)_110px_150px_200px]"
              >
                <span className="mono hidden text-[12px] text-white/25 lg:block">
                  {item.seed ?? "—"}
                </span>

                <div className="flex min-w-0 items-center gap-3">
                  <FaceitLevel elo={item.player.elo} size="sm" />
                  <div className="min-w-0">
                    <Link
                      href={`/players/${item.player.nickname}`}
                      className="truncate text-[13.5px] font-medium text-white transition-colors hover:text-accent-soft"
                    >
                      {item.player.nickname}
                    </Link>
                    <p className="truncate text-[11.5px] text-white/30">
                      {item.player.role}
                      {item.player.city ? ` · ${item.player.city}` : ""}
                    </p>
                  </div>
                </div>

                <span className="mono hidden text-right text-[13px] text-white/60 lg:block">
                  {formatNumber(item.player.elo)}
                </span>

                <span className="hidden lg:block">
                  <Badge variant={status.variant} size="sm">
                    {status.label}
                  </Badge>
                </span>

                <div className="flex shrink-0 justify-end gap-1.5">
                  {item.status === "pending" && (
                    <>
                      <Button
                        variant="subtle"
                        size="xs"
                        disabled={busy}
                        onClick={() => void moderate(item.registrationId, "confirmed")}
                      >
                        {busy ? (
                          <Loader2 strokeWidth={1.5} className="animate-spin" />
                        ) : (
                          <Check strokeWidth={1.5} />
                        )}
                        Принять
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={busy}
                        onClick={() => void moderate(item.registrationId, "rejected")}
                      >
                        <X strokeWidth={1.5} />
                      </Button>
                    </>
                  )}

                  {item.status === "confirmed" && (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={busy}
                      onClick={() => void moderate(item.registrationId, "checked_in")}
                    >
                      {busy ? (
                        <Loader2 strokeWidth={1.5} className="animate-spin" />
                      ) : (
                        <UserCheck strokeWidth={1.5} />
                      )}
                      Check-in
                    </Button>
                  )}

                  {(item.status === "rejected" || item.status === "withdrawn") && (
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={busy}
                      onClick={() => void moderate(item.registrationId, "confirmed")}
                    >
                      {busy ? (
                        <Loader2 strokeWidth={1.5} className="animate-spin" />
                      ) : (
                        <RotateCcw strokeWidth={1.5} />
                      )}
                      Вернуть
                    </Button>
                  )}

                  {item.status === "checked_in" && (
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={busy}
                      onClick={() => void moderate(item.registrationId, "rejected")}
                    >
                      <X strokeWidth={1.5} />
                      Снять
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {list.length === 0 && (
          <p className="py-14 text-center text-[13px] text-white/25">
            {items.length === 0 ? "Заявок пока нет" : "В этом фильтре пусто"}
          </p>
        )}
      </div>
    </div>
  )
}
