"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  Loader2,
  Plus,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/input"
import {
  ApiError,
  checkServer,
  createServer,
  deleteServer,
  updateServer,
  type ServerInput,
} from "@/lib/api-client"
import type { ServerDto } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Реестр своих серверов.
 *
 * Состояние здесь не декларативное: платформа спрашивает сам сервер по
 * A2S. Поэтому «оффлайн» означает, что сервер действительно не ответил —
 * это диагностика, а не пометка.
 *
 * Пароль RCON уходит на бэкенд и обратно не возвращается: в ответе API
 * есть только признак, настроен он или нет.
 */
export function ServerRegistry({ servers }: { servers: ServerDto[] }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState<number | "new" | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [draft, setDraft] = React.useState<ServerInput>({
    name: "",
    host: "",
    port: 27015,
    rconPassword: "",
    location: "Бишкек",
  })

  const run = async (key: number | "new", task: () => Promise<unknown>, after?: () => void) => {
    setBusy(key)
    setError(null)
    try {
      await task()
      after?.()
      router.refresh()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Операция не удалась")
    } finally {
      setBusy(null)
    }
  }

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    await run("new", () => createServer(draft), () => {
      setDraft({ name: "", host: "", port: 27015, rconPassword: "", location: "Бишкек" })
      setAdding(false)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[17px] font-bold text-white">
          Мои серверы
          <span className="mono ml-2 text-[13px] font-normal text-white/30">{servers.length}</span>
        </h2>
        <Button variant="primary" size="md" onClick={() => setAdding((prev) => !prev)}>
          <Plus strokeWidth={1.5} />
          Добавить сервер
        </Button>
      </div>

      {error && (
        <p className="rounded-[10px] border border-accent/25 bg-accent/[0.07] p-3 text-[12.5px] text-accent-soft">
          {error}
        </p>
      )}

      {adding && (
        <form onSubmit={add} className="panel grid gap-4 rounded-xl p-6 sm:grid-cols-2">
          <Field label="Название">
            <Input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder="MAJOR KG #1"
              required
              minLength={2}
            />
          </Field>
          <Field label="Где стоит" hint="Видно игроку — от этого зависит пинг">
            <Input
              value={draft.location ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))}
              placeholder="Бишкек"
            />
          </Field>
          <Field label="Адрес или IP">
            <Input
              value={draft.host}
              onChange={(e) => setDraft((p) => ({ ...p, host: e.target.value }))}
              placeholder="play.major.kg"
              required
            />
          </Field>
          <Field label="Порт">
            <Input
              type="number"
              value={draft.port ?? 27015}
              onChange={(e) => setDraft((p) => ({ ...p, port: Number(e.target.value) }))}
              min={1}
              max={65535}
            />
          </Field>
          <Field
            label="Пароль RCON"
            hint="Нужен, чтобы выкатывать карту после вето. Наружу не отдается"
            className="sm:col-span-2"
          >
            <Input
              type="password"
              autoComplete="off"
              value={draft.rconPassword ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, rconPassword: e.target.value }))}
              placeholder="можно оставить пустым"
            />
          </Field>
          <div className="flex gap-2.5 sm:col-span-2">
            <Button type="submit" variant="primary" size="md" disabled={busy !== null}>
              {busy === "new" ? (
                <Loader2 strokeWidth={1.5} className="animate-spin" />
              ) : (
                <Check strokeWidth={1.5} />
              )}
              Добавить
            </Button>
            <Button type="button" variant="ghost" size="md" onClick={() => setAdding(false)}>
              Отмена
            </Button>
          </div>
        </form>
      )}

      {servers.length === 0 && !adding ? (
        <div className="panel flex flex-col items-center gap-3 rounded-xl py-14 text-center">
          <ServerCog size={22} strokeWidth={1.5} className="text-white/20" />
          <p className="max-w-sm text-[13px] leading-relaxed text-white/35">
            Серверов пока нет. Добавьте адрес — платформа сама спросит у него карту и число
            игроков, а после вето сможет выкатить конфиг матча.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {servers.map((server) => (
            <li
              key={server.id}
              className={cn("panel flex flex-wrap items-center gap-4 rounded-xl p-5", !server.active && "opacity-55")}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  server.status.online ? "bg-success" : "bg-white/20",
                )}
                aria-hidden
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-white">{server.name}</p>
                <p className="mono truncate text-[11.5px] text-white/30">
                  {server.host}:{server.port} · {server.location}
                </p>
              </div>

              {server.status.online ? (
                <div className="flex items-center gap-4 text-[12.5px] text-white/45">
                  <span>{server.status.map}</span>
                  <span className="mono inline-flex items-center gap-1.5">
                    <Users size={12} strokeWidth={1.5} />
                    {server.status.players}/{server.status.maxPlayers}
                  </span>
                  {server.status.ping !== null && (
                    <span className="mono text-white/30">{server.status.ping} ms</span>
                  )}
                </div>
              ) : (
                <span className="text-[12.5px] text-white/25">не отвечает</span>
              )}

              <Badge variant={server.rconConfigured ? "success" : "outline"} size="sm">
                {server.rconConfigured ? (
                  <ShieldCheck strokeWidth={1.5} />
                ) : (
                  <ShieldOff strokeWidth={1.5} />
                )}
                RCON
              </Badge>

              {!server.public && (
                <Badge variant="outline" size="sm">
                  Скрыт с сайта
                </Badge>
              )}

              <div className="flex shrink-0 gap-1.5">
                <Button
                  variant="ghost"
                  size="xs"
                  aria-label="Проверить сервер"
                  title="Спросить состояние прямо сейчас"
                  disabled={busy !== null}
                  onClick={() => void run(server.id, () => checkServer(server.id))}
                >
                  {busy === server.id ? (
                    <Loader2 strokeWidth={1.5} className="animate-spin" />
                  ) : (
                    <RefreshCw strokeWidth={1.5} />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={busy !== null}
                  onClick={() =>
                    void run(server.id, () => updateServer(server.id, { active: !server.active }))
                  }
                >
                  {server.active ? "Выключить" : "Включить"}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  aria-label="Удалить сервер"
                  disabled={busy !== null}
                  onClick={() => void run(server.id, () => deleteServer(server.id))}
                >
                  <Trash2 strokeWidth={1.5} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
