"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FaceitLevel } from "@/components/player/faceit-level"
import type { PendingRegistration } from "@/lib/api"

/**
 * Очередь индивидуальных заявок. Команд в модерации нет: организатор
 * подтверждает конкретного игрока, а составы позже соберет жеребьевка.
 */
export function RegistrationQueue({ items }: { items: PendingRegistration[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = React.useState<number | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const moderate = async (id: number, status: "confirmed" | "rejected") => {
    setPendingId(id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/registrations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Не удалось обновить заявку")
      }
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить заявку")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section className="panel overflow-hidden rounded-xl">
      <header className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
        <h2 className="font-display text-[15px] font-bold text-white">Очередь заявок</h2>
        <Badge variant="outline" size="sm">
          {items.length} в работе
        </Badge>
      </header>

      {error && <p className="px-5 py-3 text-[12px] text-accent-soft">{error}</p>}

      {items.length === 0 ? (
        <p className="px-5 py-12 text-center text-[13px] text-white/25">Очередь пуста</p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {items.map((item) => {
            const busy = pendingId === item.registrationId
            return (
              <li key={item.registrationId} className="flex items-center gap-4 px-5 py-3.5">
                <FaceitLevel elo={item.player.elo} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-white">
                    {item.player.nickname}
                  </p>
                  <p className="truncate text-[12px] text-white/35">
                    {item.player.role} · {item.player.elo} ELO · {item.tournamentTitle}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="subtle"
                    size="icon-sm"
                    aria-label="Принять заявку"
                    disabled={busy}
                    onClick={() => void moderate(item.registrationId, "confirmed")}
                  >
                    {busy ? (
                      <Loader2 strokeWidth={1.5} className="animate-spin" />
                    ) : (
                      <Check strokeWidth={1.5} />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Отклонить заявку"
                    disabled={busy}
                    onClick={() => void moderate(item.registrationId, "rejected")}
                  >
                    <X strokeWidth={1.5} />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
