"use client"

import * as React from "react"
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/input"
import { addNote, deleteNote, listNotes } from "@/lib/api-client"
import type { ScoutNoteDto } from "@/lib/types"
import { formatDate, formatTime } from "@/lib/utils"

/**
 * Скаут-заметки на игрока прямо в сетке.
 *
 * Заметка — личная разведка перед матчем, а не публичный комментарий:
 * бэкенд отдает только записи автора (backend/src/services/notes.ts).
 */
export function ScoutNotes({
  subject,
  subjectName,
  enabled = true,
}: {
  subject: string
  subjectName: string
  enabled?: boolean
}) {
  const [notes, setNotes] = React.useState<ScoutNoteDto[]>([])
  const [text, setText] = React.useState("")
  const [loading, setLoading] = React.useState(enabled)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    listNotes(subject)
      .then((data) => {
        if (!cancelled) setNotes(data.items)
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось загрузить заметки")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [subject, enabled])

  const add = async () => {
    const value = text.trim()
    if (!value || saving) return

    setSaving(true)
    setError(null)
    try {
      const { note } = await addNote(subject, value)
      setNotes((prev) => [note, ...prev])
      setText("")
    } catch {
      setError("Не удалось сохранить заметку")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    const previous = notes
    setNotes((prev) => prev.filter((note) => note.id !== id))
    try {
      await deleteNote(id)
    } catch {
      setNotes(previous)
      setError("Не удалось удалить заметку")
    }
  }

  if (!enabled) {
    return (
      <p className="rounded-[10px] border border-dashed border-white/10 px-3 py-4 text-center text-[12px] leading-relaxed text-white/30">
        Войдите через Steam, чтобы вести личные скаут-заметки на игроков.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/30">
        <MessageSquare size={13} strokeWidth={1.5} />
        Заметки на {subjectName}
        {!loading && notes.length > 0 && <span className="mono text-white/50">{notes.length}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void add()
          }}
          placeholder="Играет от AWP на B, часто выходит первым на Mirage…"
          className="min-h-[76px] text-[13px]"
          maxLength={600}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-white/25">
            Видно только вам · Ctrl+Enter чтобы сохранить
          </span>
          <Button variant="subtle" size="sm" onClick={() => void add()} disabled={!text.trim() || saving}>
            {saving ? <Loader2 strokeWidth={1.5} className="animate-spin" /> : <Send strokeWidth={1.5} />}
            Сохранить
          </Button>
        </div>
      </div>

      {error && <p className="text-[11.5px] text-accent-soft">{error}</p>}

      {loading && (
        <p className="flex items-center gap-2 text-[11.5px] text-white/25">
          <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
          Загружаем заметки
        </p>
      )}

      {!loading && notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="group flex gap-3 rounded-[10px] border border-white/[0.07] bg-white/[0.02] p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-white/70">
                  {note.body}
                </p>
                <p className="mono mt-1.5 text-[10.5px] text-white/25">
                  {formatDate(note.createdAt)} · {formatTime(note.createdAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Удалить заметку"
                onClick={() => void remove(note.id)}
                className="h-fit rounded-[7px] p-1.5 text-white/20 opacity-0 transition-all hover:bg-white/[0.06] hover:text-accent group-hover:opacity-100"
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
