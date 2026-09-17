"use client"

import * as React from "react"
import { AnimatePresence } from "framer-motion"
import { Search, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input, Select } from "@/components/ui/input"
import { TournamentCard } from "@/components/marketing/tournament-card"
import type { TournamentDto, TournamentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

type StatusFilter = TournamentStatus | "all"
type Sort = "start" | "slots"

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Все статусы" },
  { id: "registration", label: "Регистрация" },
  { id: "checkin", label: "Check-in" },
  { id: "live", label: "Идет сейчас" },
]

const SORTS: { id: Sort; label: string }[] = [
  { id: "start", label: "Сначала ближайшие" },
  { id: "slots", label: "Заканчиваются слоты" },
]

const PAGE_SIZE = 9
const MOTION_LIMIT = 24

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-[12px] border border-white/[0.07] bg-white/[0.02] p-1">
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-[9px] px-3.5 text-[13px] font-medium transition-colors duration-200",
              active
                ? "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                : "text-white/45 hover:text-white/80",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface TournamentGridProps {
  /** Список приходит с сервера — фильтрация идет на клиенте, без запроса. */
  source: TournamentDto[]
  /** Ограничение для витрины на главной. */
  limit?: number
  showFilters?: boolean
  showSearch?: boolean
}

/**
 * Дисциплина на платформе одна — CS2, поэтому фильтра по игре нет:
 * остались статус, поиск и сортировка.
 */
export function TournamentGrid({
  source,
  limit,
  showFilters = true,
  showSearch = true,
}: TournamentGridProps) {
  const [status, setStatus] = React.useState<StatusFilter>("all")
  const [sort, setSort] = React.useState<Sort>("start")
  const [query, setQuery] = React.useState("")
  const [visible, setVisible] = React.useState(PAGE_SIZE)

  const deferredQuery = React.useDeferredValue(query)

  const filtered = React.useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    const list = source.filter((tournament) => {
      if (status !== "all" && tournament.status !== status) return false
      if (
        needle &&
        !`${tournament.title} ${tournament.edition} ${tournament.organizer}`.toLowerCase().includes(needle)
      )
        return false
      return true
    })

    return [...list].sort((a, b) => {
      if (sort === "slots") return b.registered / b.slots - a.registered / a.slots
      return a.startsInMinutes - b.startsInMinutes
    })
  }, [source, status, sort, deferredQuery])

  React.useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [status, sort, deferredQuery])

  const capped = limit ? filtered.slice(0, limit) : filtered.slice(0, visible)
  const animate = capped.length <= MOTION_LIMIT
  const dirty = status !== "all" || query !== ""

  const reset = () => {
    setStatus("all")
    setQuery("")
  }

  return (
    <div className="flex flex-col gap-7">
      {showFilters && (
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Segmented
            value={status}
            onChange={(id) => setStatus(id as StatusFilter)}
            options={STATUS_FILTERS}
          />

          {showSearch && (
            <div className="flex gap-2.5">
              <div className="relative flex-1 sm:w-48">
                <Search
                  size={15}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск"
                  aria-label="Поиск турнира"
                  className="h-11 pl-9"
                />
              </div>
              <Select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                aria-label="Сортировка"
                className="h-11 sm:w-52"
              >
                {SORTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {animate ? (
          <AnimatePresence mode="popLayout" initial={false}>
            {capped.map((tournament) => (
              <TournamentCard key={tournament.slug} tournament={tournament} />
            ))}
          </AnimatePresence>
        ) : (
          capped.map((tournament) => (
            <TournamentCard key={tournament.slug} tournament={tournament} static />
          ))
        )}
      </div>

      {!limit && filtered.length > capped.length && (
        <div className="flex flex-col items-center gap-3">
          <Button variant="outline" size="lg" onClick={() => setVisible((prev) => prev + PAGE_SIZE)}>
            Показать еще {Math.min(PAGE_SIZE, filtered.length - capped.length)}
          </Button>
          <span className="mono text-[12px] text-white/25">
            {capped.length} из {filtered.length}
          </span>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-white/10 py-20 text-center">
          <SlidersHorizontal size={22} strokeWidth={1.5} className="text-white/25" />
          <div className="flex flex-col gap-1.5">
            <p className="font-display text-[17px] font-semibold text-white">Ничего не найдено</p>
            <p className="text-[13px] text-white/35">Смягчите фильтры — турниры появляются каждый день.</p>
          </div>
          {dirty && (
            <Button variant="outline" size="sm" onClick={reset}>
              Сбросить фильтры
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
