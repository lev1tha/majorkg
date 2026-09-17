"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, Input, Textarea } from "@/components/ui/input"
import type { FaqItemDto } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Редактор FAQ. Вопросы лежат в базе, потому что попадают в разметку
 * FAQPage — менять их пересборкой фронтенда было бы странно.
 */
export function FaqEditor({ items }: { items: FaqItemDto[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = React.useState<number | "new" | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState({ question: "", answer: "" })

  const call = async (id: number | "new", path: string, init: RequestInit) => {
    setPendingId(id)
    setError(null)
    try {
      const response = await fetch(path, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...init,
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Не удалось сохранить")
      }
      router.refresh()
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить")
      return false
    } finally {
      setPendingId(null)
    }
  }

  const add = async () => {
    if (draft.question.trim().length < 5 || draft.answer.trim().length < 5) {
      setError("Вопрос и ответ — минимум по 5 символов")
      return
    }
    const ok = await call("new", "/api/admin/faq", {
      method: "POST",
      body: JSON.stringify(draft),
    })
    if (ok) setDraft({ question: "", answer: "" })
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p className="rounded-[10px] border border-accent/25 bg-accent/[0.07] p-3 text-[12.5px] text-accent-soft">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <FaqRow
            key={item.id}
            item={item}
            busy={pendingId === item.id}
            onSave={(patch) =>
              call(item.id, `/api/admin/faq/${item.id}`, {
                method: "PATCH",
                body: JSON.stringify(patch),
              })
            }
            onDelete={() => call(item.id, `/api/admin/faq/${item.id}`, { method: "DELETE" })}
          />
        ))}
      </ul>

      {items.length === 0 && (
        <p className="panel rounded-xl py-12 text-center text-[13px] text-white/25">
          Вопросов пока нет — добавьте первый.
        </p>
      )}

      <section className="panel flex flex-col gap-4 rounded-xl p-6">
        <h2 className="font-display text-[15px] font-bold text-white">Новый вопрос</h2>
        <Field label="Вопрос">
          <Input
            value={draft.question}
            onChange={(event) => setDraft((prev) => ({ ...prev, question: event.target.value }))}
            placeholder="Сколько стоит участие в турнирах КГ?"
          />
        </Field>
        <Field label="Ответ">
          <Textarea
            value={draft.answer}
            onChange={(event) => setDraft((prev) => ({ ...prev, answer: event.target.value }))}
            placeholder="Организационный взнос — 500 сом за турнир…"
            className="min-h-[92px]"
            maxLength={2000}
          />
        </Field>
        <Button
          variant="primary"
          size="md"
          className="self-start"
          onClick={() => void add()}
          disabled={pendingId !== null}
        >
          {pendingId === "new" ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Plus strokeWidth={1.5} />
          )}
          Добавить
        </Button>
      </section>
    </div>
  )
}

function FaqRow({
  item,
  busy,
  onSave,
  onDelete,
}: {
  item: FaqItemDto
  busy: boolean
  onSave: (patch: Partial<FaqItemDto>) => Promise<boolean>
  onDelete: () => Promise<boolean>
}) {
  const [question, setQuestion] = React.useState(item.question)
  const [answer, setAnswer] = React.useState(item.answer)
  const [confirming, setConfirming] = React.useState(false)

  // Сервер — источник правды: после сохранения подтягиваем его значения.
  React.useEffect(() => {
    setQuestion(item.question)
    setAnswer(item.answer)
  }, [item.question, item.answer])

  const dirty = question !== item.question || answer !== item.answer

  return (
    <li className={cn("panel flex flex-col gap-3 rounded-xl p-5", !item.published && "opacity-60")}>
      <div className="flex items-start gap-3">
        <span className="mono mt-2.5 shrink-0 text-[11.5px] text-white/25">{item.position}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            aria-label="Вопрос"
            className="font-medium"
          />
          <Textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            aria-label="Ответ"
            className="min-h-[80px] text-[13px]"
            maxLength={2000}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-7">
        {!item.published && (
          <Badge variant="outline" size="sm">
            Скрыт
          </Badge>
        )}

        <Button
          variant="ghost"
          size="xs"
          disabled={busy}
          onClick={() => void onSave({ published: !item.published })}
        >
          {item.published ? <EyeOff strokeWidth={1.5} /> : <Eye strokeWidth={1.5} />}
          {item.published ? "Скрыть" : "Показать"}
        </Button>

        {confirming ? (
          <>
            <Button variant="danger" size="xs" disabled={busy} onClick={() => void onDelete()}>
              Удалить навсегда
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setConfirming(false)}>
              Отмена
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="xs" disabled={busy} onClick={() => setConfirming(true)}>
            <Trash2 strokeWidth={1.5} />
            Удалить
          </Button>
        )}

        <Button
          variant={dirty ? "primary" : "outline"}
          size="xs"
          className="ml-auto"
          disabled={!dirty || busy}
          onClick={() => void onSave({ question, answer })}
        >
          {busy ? <Loader2 strokeWidth={1.5} className="animate-spin" /> : <Check strokeWidth={1.5} />}
          Сохранить
        </Button>
      </div>
    </li>
  )
}
