"use client"

import * as React from "react"
import { Loader2, Megaphone } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ApiError, rallyTournament } from "@/lib/api-client"

/**
 * «Созвать участников» — боевой рог у всех подтвержденных игроков,
 * у кого открыт сайт. Перед стартом, когда лобби готово.
 */
export function RallyButton({ slug, confirmed }: { slug: string; confirmed: number }) {
  const [pending, setPending] = React.useState(false)
  const [note, setNote] = React.useState<string | null>(null)

  const rally = async () => {
    if (pending) return
    if (!window.confirm(`Протрубить сбор ${confirmed} подтвержденным участникам?`)) return

    setPending(true)
    setNote(null)
    try {
      const result = await rallyTournament(slug)
      setNote(`Сигнал отправлен: ${result.recipients} уч. услышат его в течение 15 секунд`)
    } catch (cause) {
      setNote(cause instanceof ApiError ? cause.message : "Не удалось отправить сигнал")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        size="md"
        disabled={pending || confirmed === 0}
        onClick={() => void rally()}
        title="Боевой рог и окно «К бою!» у подтвержденных участников с открытым сайтом"
      >
        {pending ? <Loader2 strokeWidth={1.5} className="animate-spin" /> : <Megaphone strokeWidth={1.5} />}
        Созвать участников
      </Button>
      {note && <span className="max-w-[260px] text-right text-[11.5px] text-white/45">{note}</span>}
    </div>
  )
}
