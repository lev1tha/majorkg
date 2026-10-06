"use client"

import * as React from "react"
import { Check, Copy, MapPin, ServerCog, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { ServerDto } from "@/lib/types"
import { cn, pct } from "@/lib/utils"

/**
 * Карточка сервера.
 *
 * Состояние спрашивается у самого сервера по A2S — тем же способом, каким
 * это делает браузер Steam. Поэтому «онлайн» здесь означает, что сервер
 * действительно ответил, а не что кто-то отметил галочку в админке.
 */
export function ServerCard({ server }: { server: ServerDto }) {
  const [copied, setCopied] = React.useState(false)
  const filled = pct(server.status.players, Math.max(1, server.status.maxPlayers))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(server.connect)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* буфер недоступен — адрес всё равно виден на экране */
    }
  }

  return (
    <article className="glass flex flex-col gap-4 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[16px] font-bold text-white">{server.name}</h3>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-white/35">
            <MapPin size={12} strokeWidth={1.5} />
            {server.location}
          </p>
        </div>

        {server.status.online ? (
          <Badge variant="success" size="sm">
            <span className="size-1.5 rounded-full bg-success" />
            Онлайн
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            Оффлайн
          </Badge>
        )}
      </div>

      {server.status.online ? (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="inline-flex items-center gap-1.5 text-white/45">
              <ServerCog size={13} strokeWidth={1.5} />
              {server.status.map ?? "—"}
            </span>
            <span className="mono inline-flex items-center gap-1.5 text-white/70">
              <Users size={13} strokeWidth={1.5} />
              {server.status.players} / {server.status.maxPlayers}
            </span>
          </div>
          <Progress value={filled} tone={filled >= 85 ? "accent" : "neutral"} />
        </div>
      ) : (
        <p className="rounded-[10px] border border-dashed border-white/10 py-4 text-center text-[12px] text-white/25">
          Сервер не отвечает
        </p>
      )}

      {server.note && <p className="text-[12.5px] leading-relaxed text-white/40">{server.note}</p>}

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button
          variant="subtle"
          size="md"
          className="flex-1 hover:bg-accent hover:text-white"
          asChild
        >
          {/* steam://connect открывает игру и подключает в один клик */}
          <a href={`steam://connect/${server.host}:${server.port}`}>Подключиться</a>
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Скопировать адрес"
          title={server.connect}
          onClick={() => void copy()}
        >
          {copied ? <Check strokeWidth={1.5} /> : <Copy strokeWidth={1.5} />}
        </Button>
      </div>

      <p className={cn("mono text-center text-[11px]", copied ? "text-success" : "text-white/25")}>
        {copied ? "адрес скопирован" : `${server.host}:${server.port}`}
      </p>
    </article>
  )
}
