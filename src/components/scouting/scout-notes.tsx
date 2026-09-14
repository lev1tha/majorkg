"use client"

import * as React from "react"
import { MessageSquare, Send, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface ScoutNote {
  id: string
  author: string
  text: string
  createdAt: string
}

const STORAGE_KEY = "mkg:scout-notes"
const AUTHOR = "aibek"

type Store = Record<string, ScoutNote[]>

function readStore(): Store {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* приватный режим или переполнение — молча пропускаем */
  }
}

/**
 * Скаутинг-заметки на игрока прямо в сетке.
 *
 * Хранятся локально в браузере автора: заметка — это личная разведка перед
 * матчем, а не публичный комментарий. Форма готова к переносу на API —
 * достаточно заменить readStore/writeStore на запросы.
 */
export function ScoutNotes({ subjectId, subjectName }: { subjectId: string; subjectName: string }) {
  const [notes, setNotes] = React.useState<ScoutNote[]>([])
  const [text, setText] = React.useState("")
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    setNotes(readStore()[subjectId] ?? [])
    setReady(true)
  }, [subjectId])

  const persist = (next: ScoutNote[]) => {
    setNotes(next)
    const store = readStore()
    store[subjectId] = next
    writeStore(store)
  }

  const add = () => {
    const value = text.trim()
    if (!value) return
    const note: ScoutNote = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      author: AUTHOR,
      text: value.slice(0, 600),
      createdAt: new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    }
    persist([note, ...notes])
    setText("")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/30">
        <MessageSquare size={13} strokeWidth={1.5} />
        Заметки на {subjectName}
        {ready && notes.length > 0 && <span className="mono text-white/50">{notes.length}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) add()
          }}
          placeholder="Играет от AWP на B, часто выходит первым на Mirage…"
          className="min-h-[76px] text-[13px]"
          maxLength={600}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-white/25">
            Видно только вам · Ctrl+Enter чтобы сохранить
          </span>
          <Button variant="subtle" size="sm" onClick={add} disabled={!text.trim()}>
            <Send strokeWidth={1.5} />
            Сохранить
          </Button>
        </div>
      </div>

      {ready && notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className={cn(
                "group flex gap-3 rounded-[10px] border border-white/[0.07] bg-white/[0.02] p-3",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-white/70">
                  {note.text}
                </p>
                <p className="mono mt-1.5 text-[10.5px] text-white/25">{note.createdAt}</p>
              </div>
              <button
                type="button"
                aria-label="Удалить заметку"
                onClick={() => persist(notes.filter((item) => item.id !== note.id))}
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
