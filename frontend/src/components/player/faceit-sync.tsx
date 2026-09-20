"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CircleAlert, ExternalLink, Link2, Loader2, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FaceitLevel } from "@/components/player/faceit-level"
import { ApiError, syncMyProfile } from "@/lib/api-client"
import type { PlayerDto } from "@/lib/types"
import { formatNumber } from "@/lib/utils"

/**
 * Блок FACEIT в своем профиле.
 *
 * Привязка автоматическая: FACEIT хранит SteamID64 игрока, поэтому по
 * нему и ищется профиль — вводить ник руками не нужно. Если профиля нет
 * или ключ не настроен, так и написано: молча показывать нули хуже, чем
 * сказать, почему их нет.
 */
export function FaceitSync({ player, steamSynced }: { player: PlayerDto; steamSynced: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [keys, setKeys] = React.useState<{ steam: boolean; faceit: boolean } | null>(null)

  const sync = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await syncMyProfile()
      setKeys({ steam: result.steamKey, faceit: result.faceitKey })
      router.refresh()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось обновить данные")
    } finally {
      setBusy(false)
    }
  }

  const stats: [string, string][] = [
    ["ELO", formatNumber(player.elo)],
    ["Уровень", String(player.level)],
    ["K/D", player.kd.toFixed(2)],
    ["Хедшоты", `${player.headshots}%`],
    ["Winrate", `${player.winRate}%`],
    ["Матчей", formatNumber(player.matches)],
  ]

  return (
    <section className="glass flex flex-col gap-4 rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-white">
          <Link2 size={16} strokeWidth={1.5} className="text-white/40" />
          FACEIT
        </h2>
        <div className="flex items-center gap-2">
          {player.faceitLinked ? (
            <Badge variant="success" size="sm">
              Привязан
            </Badge>
          ) : (
            <Badge variant="outline" size="sm">
              Не привязан
            </Badge>
          )}
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void sync()}>
            {busy ? (
              <Loader2 strokeWidth={1.5} className="animate-spin" />
            ) : (
              <RefreshCw strokeWidth={1.5} />
            )}
            Обновить
          </Button>
        </div>
      </div>

      {player.faceitLinked ? (
        <>
          <div className="flex items-center gap-3">
            <FaceitLevel elo={player.elo} size="lg" showElo />
            {player.faceit && (
              <a
                href={`https://www.faceit.com/ru/players/${player.faceit}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[13px] text-white/70 transition-colors hover:text-accent-soft"
              >
                {player.faceit}
                <ExternalLink size={12} strokeWidth={1.5} />
              </a>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/[0.07] pt-4 sm:grid-cols-3">
            {stats.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
                  {label}
                </dt>
                <dd className="mono mt-1 text-[16px] text-white">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="text-[11.5px] leading-relaxed text-white/30">
            {player.eloLive
              ? "Данные только что получены из FACEIT Data API."
              : "Показан последний снимок. Обновляется при входе и не чаще раза в час."}
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-white/45">
            <CircleAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-white/30" />
            Профиль FACEIT не найден. Искали по вашему SteamID64 —{" "}
            <span className="mono">{player.steamId}</span> — вводить ник вручную не нужно.
          </p>
          <ul className="flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-white/35">
            <li>· Привяжите Steam в настройках FACEIT — по нему и идет поиск.</li>
            <li>· Сыграйте хотя бы один матч в CS2 на FACEIT: без игр профиля по игре нет.</li>
            <li>· Затем нажмите «Обновить».</li>
          </ul>

          {keys && (!keys.faceit || !keys.steam) && (
            <p className="rounded-[10px] border border-prize/20 bg-prize/[0.06] p-3 text-[12px] leading-relaxed text-prize/85">
              На сервере не настроены ключи:{" "}
              {[!keys.steam && "STEAM_API_KEY", !keys.faceit && "FACEIT_API_KEY"]
                .filter(Boolean)
                .join(" и ")}
              . Без них платформа не может запросить данные — это настраивает организатор.
            </p>
          )}
        </div>
      )}

      {!steamSynced && (
        <p className="rounded-[10px] border border-white/[0.07] bg-white/[0.02] p-3 text-[12px] leading-relaxed text-white/35">
          Ник и аватар из Steam тоже не подтянуты: не задан STEAM_API_KEY.
        </p>
      )}

      {error && <p className="text-[12.5px] text-accent-soft">{error}</p>}
    </section>
  )
}
