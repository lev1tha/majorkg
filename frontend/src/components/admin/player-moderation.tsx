"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Ban, CheckCheck, Loader2, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FaceitLevel } from "@/components/player/faceit-level"
import type { PlayerDto, PlayerStatus } from "@/lib/types"
import { formatNumber } from "@/lib/utils"

const STATUS: Record<PlayerStatus, { label: string; variant: "success" | "prize" | "live" }> = {
  active: { label: "Активен", variant: "success" },
  review: { label: "Проверка", variant: "prize" },
  banned: { label: "Заблокирован", variant: "live" },
}

export function PlayerModeration({ players }: { players: PlayerDto[] }) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [pendingId, setPendingId] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const deferred = React.useDeferredValue(query)

  const list = React.useMemo(() => {
    const needle = deferred.trim().toLowerCase()
    if (!needle) return players
    return players.filter((player) =>
      `${player.nickname} ${player.steamId} ${player.faceit ?? ""}`.toLowerCase().includes(needle),
    )
  }, [players, deferred])

  const setStatus = async (id: number, status: PlayerStatus) => {
    setPendingId(id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/players/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Не удалось обновить статус")
      }
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить статус")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative sm:w-72">
        <Search
          size={15}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ник, Steam ID или FACEIT"
          aria-label="Поиск игрока"
          className="h-10 pl-9"
        />
      </div>

      {error && <p className="text-[12px] text-accent-soft">{error}</p>}

      <div className="panel overflow-hidden rounded-xl">
        <div className="hidden grid-cols-[minmax(0,1fr)_160px_110px_100px_130px_180px] items-center gap-4 border-b border-white/[0.07] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/30 xl:grid">
          <span>Игрок</span>
          <span>Steam ID</span>
          <span className="text-right">ELO</span>
          <span className="text-right">Карты</span>
          <span>Статус</span>
          <span className="text-right">Действие</span>
        </div>

        <ul className="divide-y divide-white/[0.05]">
          {list.map((player) => {
            const status = STATUS[player.status]
            const busy = pendingId === player.id
            return (
              <li
                key={player.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02] xl:grid-cols-[minmax(0,1fr)_160px_110px_100px_130px_180px]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FaceitLevel elo={player.elo} size="sm" />
                  <div className="min-w-0">
                    <Link
                      href={`/players/${player.nickname}`}
                      className="truncate text-[13.5px] font-medium text-white transition-colors hover:text-accent-soft"
                    >
                      {player.nickname}
                    </Link>
                    <p className="truncate text-[11.5px] text-white/30">
                      {player.role}
                      {player.city ? ` · ${player.city}` : ""}
                    </p>
                  </div>
                </div>

                <span className="mono hidden truncate text-[11.5px] text-white/35 xl:block">
                  {player.steamId}
                </span>
                <span className="mono hidden text-right text-[12.5px] text-white/70 xl:block">
                  {formatNumber(player.elo)}
                </span>
                <span className="mono hidden text-right text-[12.5px] text-white/45 xl:block">
                  {player.mapsPlayed}
                </span>
                <span className="hidden xl:block">
                  <Badge variant={status.variant} size="sm">
                    {status.label}
                  </Badge>
                </span>

                <div className="flex shrink-0 justify-end gap-1.5">
                  {player.status !== "active" && (
                    <Button
                      variant="subtle"
                      size="xs"
                      disabled={busy}
                      onClick={() => void setStatus(player.id, "active")}
                    >
                      {busy ? (
                        <Loader2 strokeWidth={1.5} className="animate-spin" />
                      ) : (
                        <CheckCheck strokeWidth={1.5} />
                      )}
                      Разблокировать
                    </Button>
                  )}
                  {player.status !== "banned" && (
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={busy}
                      onClick={() => void setStatus(player.id, "banned")}
                    >
                      <Ban strokeWidth={1.5} />
                      Забанить
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {list.length === 0 && (
          <p className="py-14 text-center text-[13px] text-white/25">Игроки не найдены</p>
        )}
      </div>
    </div>
  )
}
