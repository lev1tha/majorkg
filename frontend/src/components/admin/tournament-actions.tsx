"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Dices, Loader2, Network } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { TournamentStatus } from "@/lib/types"

type Action = "draw" | "bracket"

/**
 * Порядок операций организатора: жеребьевка собирает составы из
 * подтвержденных индивидуальных заявок, затем по их посеву строится
 * верхняя сетка.
 */
export function TournamentActions({
  slug,
  status,
}: {
  slug: string
  status: TournamentStatus
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState<Action | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const run = async (action: Action) => {
    setPending(action)
    setError(null)
    try {
      const path =
        action === "draw"
          ? `/api/admin/tournaments/${slug}/draw`
          : `/api/admin/tournaments/${slug}/bracket`

      const response = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Операция не удалась")
      }
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Операция не удалась")
    } finally {
      setPending(null)
    }
  }

  const disabled = status === "draft" || Boolean(pending)

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="xs"
          disabled={disabled}
          onClick={() => void run("draw")}
          title="Собрать составы из подтвержденных заявок"
        >
          {pending === "draw" ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Dices strokeWidth={1.5} />
          )}
          Жеребьевка
        </Button>
        <Button
          variant="outline"
          size="xs"
          disabled={disabled}
          onClick={() => void run("bracket")}
          title="Построить верхнюю сетку по посеву составов"
        >
          {pending === "bracket" ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Network strokeWidth={1.5} />
          )}
          Сетка
        </Button>
      </div>
      {error && <span className="max-w-[220px] text-right text-[11px] text-accent-soft">{error}</span>}
    </div>
  )
}
