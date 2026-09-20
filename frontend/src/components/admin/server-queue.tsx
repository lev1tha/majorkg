"use client"

import * as React from "react"
import Link from "next/link"
import { Check, Clock, Copy, ServerCog } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TeamMark } from "@/components/ui/misc"
import type { ServerQueueItemDto } from "@/lib/types"

/**
 * Очередь серверов: матч → карты после вето.
 *
 * Кнопка копирует готовую строку конфига, чтобы не переписывать названия
 * карт руками — там легко ошибиться на Dust II и Anubis.
 */
export function ServerQueue({
  items,
  server,
  slug,
}: {
  items: ServerQueueItemDto[]
  server: string
  slug: string
}) {
  const [copied, setCopied] = React.useState<number | null>(null)

  const copy = async (item: ServerQueueItemDto) => {
    const line = `${item.a.tag} vs ${item.b.tag} · ${item.format} · ${item.maps.join(", ")}`
    try {
      await navigator.clipboard.writeText(line)
      setCopied(item.matchId)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      /* буфер недоступен — строка все равно видна на экране */
    }
  }

  if (items.length === 0) {
    return (
      <div className="panel flex flex-col items-center gap-3 rounded-xl py-16 text-center">
        <ServerCog size={22} strokeWidth={1.5} className="text-white/20" />
        <p className="text-[13px] text-white/30">
          Предстоящих матчей нет. Постройте сетку — очередь появится здесь.
        </p>
      </div>
    )
  }

  const ready = items.filter((item) => item.finished).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={ready === items.length ? "success" : "prize"} size="md">
          {ready} из {items.length} матчей с готовыми картами
        </Badge>
        <span className="text-[12.5px] text-white/35">{server}</span>
      </div>

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.matchId} className="panel flex flex-col gap-3 rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="mono text-[11.5px] text-white/30">M-{item.matchId}</span>
              <div className="flex items-center gap-2">
                <TeamMark tag={item.a.tag} size="sm" />
                <span className="text-[13.5px] text-white">{item.a.name}</span>
              </div>
              <span className="text-white/25">—</span>
              <div className="flex items-center gap-2">
                <TeamMark tag={item.b.tag} size="sm" />
                <span className="text-[13.5px] text-white">{item.b.name}</span>
              </div>
              <Badge variant="outline" size="sm">
                {item.format}
              </Badge>
              {item.state === "live" && (
                <Badge variant="live" size="sm">
                  <span className="size-1.5 rounded-full bg-accent pulse-live" />
                  Идет
                </Badge>
              )}
            </div>

            {item.finished ? (
              <div className="flex flex-wrap items-center gap-2">
                {item.maps.map((map, index) => (
                  <span
                    key={map}
                    className="mono rounded-[8px] border border-success/25 bg-success/[0.07] px-2.5 py-1.5 text-[12.5px] text-white"
                  >
                    {index + 1}. {map}
                  </span>
                ))}
                <Button
                  variant="ghost"
                  size="xs"
                  className="ml-auto"
                  onClick={() => void copy(item)}
                >
                  {copied === item.matchId ? (
                    <Check strokeWidth={1.5} />
                  ) : (
                    <Copy strokeWidth={1.5} />
                  )}
                  {copied === item.matchId ? "Скопировано" : "Копировать"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 text-[12.5px] text-white/40">
                  <Clock size={13} strokeWidth={1.5} />
                  {item.waitingFor
                    ? `Ждем ход: ${item.waitingFor === "a" ? item.a.name : item.b.name}`
                    : "Вето не начато"}
                </span>
                <Button variant="outline" size="xs" asChild className="ml-auto">
                  <Link href={`/admin/bracket?tournament=${slug}`}>Открыть в сетке</Link>
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
