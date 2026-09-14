"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Dices,
  EyeOff,
  Lock,
  MessagesSquare,
  RotateCcw,
  Shuffle,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { TeamMark } from "@/components/ui/misc"
import { FaceitLevel } from "@/components/player/faceit-level"
import { CountdownInline } from "@/components/tournament/countdown"
import { useCountdown } from "@/hooks/use-countdown"
import { MIX_POOL } from "@/lib/data/players"
import { MIX_BANDS, bandOf, buildMixTeams, toMixPlayer, type MixPlayer, type MixResult } from "@/lib/mix"
import type { Tournament } from "@/lib/data/tournaments"
import { EXTERNAL, LINKS } from "@/lib/links"
import { cn, formatNumber, plural } from "@/lib/utils"

const ME = MIX_POOL[0]

type Phase = "lobby" | "drawing" | "teams"

/** Позиция игрока в лобби — до жеребьевки видно только пояс. */
function LobbyChip({ player, index }: { player: MixPlayer; index: number }) {
  const me = player.id === ME.id
  const band = MIX_BANDS.find((item) => item.id === player.band)

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[11px] border px-3.5 py-2.5",
        me ? "border-accent/40 bg-accent/[0.06]" : "border-white/[0.07] bg-white/[0.02]",
      )}
    >
      <span
        className={cn(
          "mono flex size-7 shrink-0 items-center justify-center rounded-[8px] text-[11px]",
          me ? "bg-accent/15 text-accent-soft" : "bg-white/[0.05] text-white/45",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-white">
          {me ? "Вы" : `Игрок #${String(index + 1).padStart(2, "0")}`}
        </span>
        <span className="block truncate text-[11px] text-white/30">{band?.label}</span>
      </span>
      {me ? (
        <Badge variant="accent" size="sm">
          В лобби
        </Badge>
      ) : (
        <Lock size={13} strokeWidth={1.5} className="shrink-0 text-white/15" />
      )}
    </div>
  )
}

export function MixLobby({ tournament, admin = false }: { tournament: Tournament; admin?: boolean }) {
  const drawAt = Math.max(0, tournament.startsInMinutes - (tournament.drawBeforeMinutes ?? 20))
  const countdown = useCountdown(drawAt)

  const pool = React.useMemo(() => MIX_POOL.map(toMixPlayer), [])
  const [phase, setPhase] = React.useState<Phase>("lobby")
  const [seed, setSeed] = React.useState(7)
  const [result, setResult] = React.useState<MixResult | null>(null)
  const [swap, setSwap] = React.useState<{ team: string; id: string } | null>(null)

  const draw = React.useCallback(
    (nextSeed: number) => {
      setPhase("drawing")
      window.setTimeout(() => {
        setSeed(nextSeed)
        setResult(buildMixTeams(MIX_POOL, 5, nextSeed))
        setSwap(null)
        setPhase("teams")
      }, 700)
    },
    [],
  )

  // Жеребьевка стартует сама, когда истекает таймер.
  React.useEffect(() => {
    if (countdown.ready && countdown.expired && phase === "lobby") draw(seed)
  }, [countdown.ready, countdown.expired, phase, seed, draw])

  /** Обмен игроков между составами — ручная правка судьи. */
  const applySwap = (teamId: string, playerId: string) => {
    if (!result) return
    if (!swap) {
      setSwap({ team: teamId, id: playerId })
      return
    }
    if (swap.id === playerId) {
      setSwap(null)
      return
    }
    if (swap.team === teamId) {
      setSwap({ team: teamId, id: playerId })
      return
    }

    const teams = result.teams.map((team) => ({ ...team, players: [...team.players] }))
    const from = teams.find((team) => team.id === swap.team)
    const to = teams.find((team) => team.id === teamId)
    if (!from || !to) return

    const fromIndex = from.players.findIndex((player) => player.id === swap.id)
    const toIndex = to.players.findIndex((player) => player.id === playerId)
    if (fromIndex < 0 || toIndex < 0) return

    const moved = from.players[fromIndex]
    from.players[fromIndex] = to.players[toIndex]
    to.players[toIndex] = moved

    for (const team of teams) {
      team.players.sort((a, b) => b.elo - a.elo)
      team.totalElo = team.players.reduce((sum, player) => sum + player.elo, 0)
      team.avgElo = Math.round(team.totalElo / Math.max(1, team.players.length))
      team.avgLevel =
        Math.round(
          (team.players.reduce((sum, player) => sum + player.level, 0) /
            Math.max(1, team.players.length)) *
            10,
        ) / 10
    }

    const averages = teams.map((team) => team.avgElo)
    setResult({ ...result, teams, spread: Math.max(...averages) - Math.min(...averages) })
    setSwap(null)
  }

  const distribution = MIX_BANDS.map((band) => ({
    band,
    count: pool.filter((player) => player.band === band.id).length,
  }))

  return (
    <div className="flex flex-col gap-6">
      {/* Статус лобби */}
      <div className="glass flex flex-wrap items-center justify-between gap-6 rounded-xl p-6">
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
            {phase === "teams" ? "Составы собраны" : "До жеребьевки"}
          </span>
          {phase === "teams" ? (
            <span className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-white">
              {result?.teams.length}{" "}
              {plural(result?.teams.length ?? 0, ["команда", "команды", "команд"])} готовы
            </span>
          ) : (
            <CountdownInline
              minutes={drawAt}
              className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-white"
              expiredLabel="Идет жеребьевка"
            />
          )}
          <span className="text-[12.5px] text-white/35">
            Старт турнира: {tournament.startLabel} · жеребьевка за{" "}
            {tournament.drawBeforeMinutes ?? 20} минут
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[12.5px] text-white/45">
            <Users size={14} strokeWidth={1.5} />
            Записалось {pool.length} из {tournament.slots}
          </div>
          <Progress
            value={(pool.length / tournament.slots) * 100}
            tone="accent"
            size="md"
            className="w-52"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          {phase === "lobby" && (
            <>
              <Button variant="primary" size="lg" disabled>
                <Check strokeWidth={1.5} />
                Вы в лобби
              </Button>
              {admin && (
                <Button variant="outline" size="lg" onClick={() => draw(seed)}>
                  <Dices strokeWidth={1.5} />
                  Провести жеребьевку
                </Button>
              )}
            </>
          )}

          {phase === "teams" && (
            <>
              {admin && (
                <>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => draw(seed + 1 + Math.floor(Math.random() * 997))}
                  >
                    <Shuffle strokeWidth={1.5} />
                    Пересобрать
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => {
                      setResult(null)
                      setSwap(null)
                      setPhase("lobby")
                    }}
                  >
                    <RotateCcw strokeWidth={1.5} />
                    Вернуть в лобби
                  </Button>
                </>
              )}
              <Button variant="outline" size="lg" asChild>
                <a href={LINKS.discord} {...EXTERNAL}>
                  <MessagesSquare strokeWidth={1.5} />
                  Голосовая в Discord
                </a>
              </Button>
              <Button variant="primary" size="lg" asChild>
                <Link href="/bracket">
                  Открыть сетку
                  <ArrowRight strokeWidth={1.5} />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase !== "teams" ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "drawing" ? 0.35 : 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-5"
          >
            {/* Почему ники скрыты */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
              <p className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-white/45">
                <EyeOff size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-white/30" />
                Ники и рейтинги закрыты до жеребьевки — видно только рейтинговый пояс. Так никто не
                отказывается от игры, увидев в лобби фаворитов.
              </p>
              <div className="flex flex-wrap gap-2">
                {distribution.map(({ band, count }) => (
                  <span
                    key={band.id}
                    className="mono rounded-[8px] border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[11.5px] text-white/50"
                  >
                    {band.label}: {count}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {pool.map((player, index) => (
                <LobbyChip key={player.id} player={player} index={index} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`teams-${seed}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5"
          >
            {admin && (
              <p className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-3.5 text-[12.5px] text-white/45">
                <ArrowLeftRight size={14} strokeWidth={1.5} className="shrink-0 text-white/30" />
                {swap
                  ? "Выберите игрока в другой команде — они поменяются местами"
                  : "Режим судьи: кликните игрока, затем игрока другой команды, чтобы обменять их"}
                <span className="mono ml-auto shrink-0 text-white/35">
                  разброс среднего ELO: {result?.spread}
                </span>
              </p>
            )}

            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              {result?.teams.map((team) => {
                const mine = team.players.some((player) => player.id === ME.id)
                return (
                  <article
                    key={team.id}
                    className={cn("glass flex flex-col overflow-hidden rounded-xl", mine && "border-accent/40")}
                  >
                    <header className="flex items-center gap-3 border-b border-white/[0.06] p-4">
                      <TeamMark tag={team.tag} tone={mine ? "accent" : "steel"} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[15px] font-bold text-white">
                          TEAM {team.name}
                        </p>
                        <p className="mono text-[11.5px] text-white/35">
                          {formatNumber(team.avgElo)} ELO · уровень {team.avgLevel}
                        </p>
                      </div>
                      {mine && (
                        <Badge variant="accent" size="sm">
                          Вы здесь
                        </Badge>
                      )}
                    </header>

                    <ul className="divide-y divide-white/[0.05]">
                      {team.players.map((player) => {
                        const picked = swap?.id === player.id
                        const content = (
                          <>
                            <FaceitLevel elo={player.elo} level={player.level} size="sm" />
                            <span className="min-w-0 flex-1 truncate text-[13px] text-white/85">
                              {player.nickname}
                            </span>
                            <span className="hidden text-[11px] text-white/25 sm:block">
                              {player.role}
                            </span>
                            <span className="mono text-[12.5px] text-white/50">
                              {formatNumber(player.elo)}
                            </span>
                          </>
                        )

                        return (
                          <li key={player.id}>
                            {admin ? (
                              <button
                                type="button"
                                onClick={() => applySwap(team.id, player.id)}
                                className={cn(
                                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                                  picked ? "bg-accent/[0.12]" : "hover:bg-white/[0.04]",
                                )}
                              >
                                {content}
                              </button>
                            ) : (
                              <Link
                                href={`/players/${player.nickname}`}
                                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                              >
                                {content}
                              </Link>
                            )}
                          </li>
                        )
                      })}
                    </ul>

                    <footer className="mt-auto flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
                      <span className="text-[11.5px] text-white/30">Суммарно</span>
                      <span className="mono text-[13px] font-medium text-white">
                        {formatNumber(team.totalElo)} ELO
                      </span>
                    </footer>
                  </article>
                )
              })}
            </div>

            {result && result.benched.length > 0 && (
              <div className="glass rounded-xl p-5">
                <p className="mb-3 text-[12px] text-white/40">
                  В резерве — выйдут в следующем миксе или заменят неявку
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.benched.map((player) => (
                    <span
                      key={player.id}
                      className="inline-flex items-center gap-2 rounded-[9px] border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5"
                    >
                      <FaceitLevel elo={player.elo} level={player.level} size="sm" />
                      <span className="text-[12.5px] text-white/60">{player.nickname}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Правило подбора */}
      <div className="glass rounded-xl p-6">
        <h2 className="font-display text-[15px] font-bold text-white">Как собираются составы</h2>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-white/45">
          Пул делится на пять рейтинговых поясов, и каждая команда получает ровно по одному игроку
          из каждого. Поэтому рядом с игроком на {formatNumber(bandOf(3000).min)}+ ELO обязательно
          окажутся партнеры уровнем ниже, а средняя сила команд остается сопоставимой.
        </p>
        <ol className="mt-5 grid gap-2 border-t border-white/[0.07] pt-5 sm:grid-cols-2 xl:grid-cols-5">
          {MIX_BANDS.map((band, index) => (
            <li
              key={band.id}
              className="flex items-center gap-3 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              <span className="mono flex size-6 items-center justify-center rounded-[6px] bg-white/[0.06] text-[11px] text-white/60">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-col leading-none">
                <span className="truncate text-[12.5px] font-medium text-white">{band.label}</span>
                <span className="mt-1 truncate text-[11px] text-white/35">{band.hint}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
