"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { Input, Select } from "@/components/ui/input"
import { TeamMark } from "@/components/ui/misc"
import { FaceitLevel } from "@/components/player/faceit-level"
import { PLAYERS, type Player } from "@/lib/data/players"
import { cn, formatNumber } from "@/lib/utils"

type Sort = "elo" | "rating" | "kd" | "matches"

const SORTS: { id: Sort; label: string }[] = [
  { id: "elo", label: "По FACEIT ELO" },
  { id: "rating", label: "По рейтингу" },
  { id: "kd", label: "По K/D" },
  { id: "matches", label: "По числу матчей" },
]

function ratingTone(rating: number) {
  if (rating >= 1.1) return "text-success"
  if (rating >= 1.0) return "text-white"
  return "text-white/50"
}

export function PlayerTable({
  rows = PLAYERS,
  limit,
  controls = true,
}: {
  rows?: Player[]
  limit?: number
  controls?: boolean
}) {
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<Sort>("elo")
  const deferred = React.useDeferredValue(query)

  const list = React.useMemo(() => {
    const needle = deferred.trim().toLowerCase()
    const filtered = rows.filter((player) =>
      needle
        ? `${player.nickname} ${player.faceit} ${player.team ?? ""}`.toLowerCase().includes(needle)
        : true,
    )
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "rating") return b.hltvRating - a.hltvRating
      if (sort === "kd") return b.kd - a.kd
      if (sort === "matches") return b.matches - a.matches
      return b.elo - a.elo
    })
    return limit ? sorted.slice(0, limit) : sorted
  }, [rows, deferred, sort, limit])

  return (
    <div className="flex flex-col gap-4">
      {controls && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end">
          <div className="relative sm:w-60">
            <Search
              size={15}
              strokeWidth={1.5}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Игрок или команда"
              aria-label="Поиск игрока"
              className="h-11 pl-9"
            />
          </div>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            aria-label="Сортировка игроков"
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

      <div className="glass overflow-hidden rounded-xl">
        <div className="hidden grid-cols-[44px_minmax(0,1.6fr)_minmax(0,1fr)_120px_90px_90px_80px_80px] items-center gap-4 border-b border-white/[0.07] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/30 lg:grid">
          <span>#</span>
          <span>Игрок</span>
          <span>Команда</span>
          <span>FACEIT</span>
          <span className="text-right">Рейтинг</span>
          <span className="text-right">K/D</span>
          <span className="text-right">HS%</span>
          <span className="text-right">Карты</span>
        </div>

        <ul className="divide-y divide-white/[0.05]">
          {list.map((player, index) => (
            <li key={player.id}>
              <Link
                href={`/players/${player.nickname}`}
                className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03] sm:px-5 lg:grid-cols-[44px_minmax(0,1.6fr)_minmax(0,1fr)_120px_90px_90px_80px_80px]"
              >
                <span className="mono text-[13px] text-white/30">{index + 1}</span>

                <div className="flex min-w-0 items-center gap-3">
                  <FaceitLevel elo={player.elo} size="sm" className="lg:hidden" />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-white">{player.nickname}</p>
                    <p className="truncate text-[11.5px] text-white/30">
                      {player.role} · {player.city}
                    </p>
                  </div>
                </div>

                <div className="hidden min-w-0 items-center gap-2.5 lg:flex">
                  {player.teamTag ? (
                    <>
                      <TeamMark tag={player.teamTag} size="sm" />
                      <span className="truncate text-[13px] text-white/60">{player.team}</span>
                    </>
                  ) : (
                    <span className="text-[13px] text-white/25">Свободный агент</span>
                  )}
                </div>

                <span className="hidden lg:block">
                  <FaceitLevel elo={player.elo} showElo />
                </span>

                <span
                  className={cn(
                    "mono text-right text-[13.5px] font-medium",
                    ratingTone(player.hltvRating),
                  )}
                >
                  {player.hltvRating.toFixed(2)}
                </span>
                <span className="mono hidden text-right text-[13.5px] text-white/60 lg:block">
                  {player.kd.toFixed(2)}
                </span>
                <span className="mono hidden text-right text-[13.5px] text-white/60 lg:block">
                  {player.headshots}%
                </span>
                <span className="mono hidden text-right text-[13.5px] text-white/40 lg:block">
                  {formatNumber(player.matches)}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {list.length === 0 && (
          <p className="py-16 text-center text-[13px] text-white/30">Игроки не найдены</p>
        )}
      </div>
    </div>
  )
}
