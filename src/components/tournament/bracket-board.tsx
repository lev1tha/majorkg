"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink, MousePointerClick, Route, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TeamMark } from "@/components/ui/misc"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { FaceitLevel } from "@/components/player/faceit-level"
import { ScoutNotes } from "@/components/scouting/scout-notes"
import { Bracket, BracketContext, MatchCard } from "@/components/tournament/bracket"
import { rosterFor, type RosterEntry } from "@/lib/data/rosters"
import type { BracketMatch, BracketRound } from "@/lib/data/bracket"
import { cn, formatNumber } from "@/lib/utils"

function RosterColumn({
  tag,
  name,
  selected,
  onSelect,
}: {
  tag: string | undefined
  name: string
  selected: string | null
  onSelect: (nickname: string) => void
}) {
  const roster = rosterFor(tag)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <TeamMark tag={tag ?? "TBD"} size="sm" />
        <span className="truncate text-[13px] font-medium text-white">{name}</span>
      </div>

      {roster.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-white/10 px-3 py-4 text-center text-[12px] text-white/25">
          Состав не заявлен
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {roster.map((player) => (
            <li key={player.nickname}>
              <button
                type="button"
                onClick={() => onSelect(player.nickname)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[9px] border px-2.5 py-2 text-left transition-colors",
                  selected === player.nickname
                    ? "border-accent/45 bg-accent/[0.08]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/20",
                )}
              >
                <FaceitLevel elo={player.elo} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-medium text-white">
                    {player.nickname}
                  </span>
                  <span className="block truncate text-[11px] text-white/30">{player.role}</span>
                </span>
                <span className="mono shrink-0 text-[11.5px] text-white/45">
                  {player.rating.toFixed(2)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MatchPanel({
  match,
  onClose,
}: {
  match: BracketMatch | null
  onClose: () => void
}) {
  const [player, setPlayer] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (match) setPlayer(null)
  }, [match])

  const entry: RosterEntry | undefined = React.useMemo(() => {
    if (!player) return undefined
    return [...rosterFor(match?.a?.tag), ...rosterFor(match?.b?.tag)].find(
      (item) => item.nickname === player,
    )
  }, [player, match])

  return (
    <Dialog open={Boolean(match)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-[680px] p-0">
        {match && (
          <>
            <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
              <div className="min-w-0">
                <DialogTitle className="truncate text-[18px]">
                  {match.a?.name ?? "TBD"} — {match.b?.name ?? "TBD"}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {match.format} · {match.meta}
                </DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {match.state === "live" && (
                  <Badge variant="live" size="sm">
                    <span className="size-1.5 rounded-full bg-accent pulse-live" />
                    Live
                  </Badge>
                )}
                <span className="mono text-[20px] font-medium text-white">
                  {match.a?.score ?? "–"} : {match.b?.score ?? "–"}
                </span>
              </div>
            </div>

            {match.maps?.length ? (
              <div className="flex flex-wrap gap-2 px-6 pb-5">
                {match.maps.map((map) => (
                  <span
                    key={map}
                    className="mono rounded-[8px] border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-white/60"
                  >
                    {map}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="h-px bg-white/[0.07]" />

            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <RosterColumn
                tag={match.a?.tag}
                name={match.a?.name ?? "Ожидается"}
                selected={player}
                onSelect={setPlayer}
              />
              <RosterColumn
                tag={match.b?.tag}
                name={match.b?.name ?? "Ожидается"}
                selected={player}
                onSelect={setPlayer}
              />
            </div>

            <div className="border-t border-white/[0.07] p-6">
              {entry ? (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FaceitLevel elo={entry.elo} showElo />
                      <div>
                        <p className="text-[14px] font-medium text-white">{entry.nickname}</p>
                        <p className="mono text-[11.5px] text-white/35">
                          {entry.role} · рейтинг {entry.rating.toFixed(2)} · K/D {entry.kd.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {entry.profile && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/players/${entry.profile}`}>
                          Профиль
                          <ExternalLink strokeWidth={1.5} />
                        </Link>
                      </Button>
                    )}
                  </div>

                  <ScoutNotes
                    subjectId={`player:${entry.nickname}`}
                    subjectName={entry.nickname}
                  />
                </div>
              ) : (
                <p className="flex items-center justify-center gap-2 py-6 text-center text-[12.5px] text-white/30">
                  <MousePointerClick size={14} strokeWidth={1.5} />
                  Выберите игрока, чтобы посмотреть статистику и оставить скаут-заметку
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Интерактивная оболочка сетки: подсветка пути команды по клику и панель
 * матча со составами, статистикой и заметками на игроков.
 */
export function BracketBoard({
  upper,
  lower,
  grandFinal,
}: {
  upper: BracketRound[]
  lower?: BracketRound[]
  grandFinal?: BracketMatch
}) {
  const [focus, setFocus] = React.useState<string | null>(null)
  const [match, setMatch] = React.useState<BracketMatch | null>(null)

  const value = React.useMemo<React.ContextType<typeof BracketContext>>(
    () => ({ focus, setFocus, openMatch: setMatch }),
    [focus],
  )

  return (
    <BracketContext.Provider value={value}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-[12.5px] text-white/35">
            <Route size={14} strokeWidth={1.5} />
            Клик по команде подсвечивает ее путь, клик по матчу открывает составы и заметки
          </p>
          {focus && (
            <Button variant="ghost" size="sm" onClick={() => setFocus(null)}>
              <X strokeWidth={1.5} />
              Снять подсветку · {focus}
            </Button>
          )}
        </div>

        <section>
          <h3 className="mb-4 font-display text-[16px] font-bold text-white">Верхняя сетка</h3>
          <Bracket rounds={upper} minHeight={560} />
        </section>

        {lower?.length ? (
          <section>
            <h3 className="mb-4 font-display text-[16px] font-bold text-white">Нижняя сетка</h3>
            <Bracket rounds={lower} minHeight={340} />
          </section>
        ) : null}

        {grandFinal ? (
          <section>
            <h3 className="mb-4 font-display text-[16px] font-bold text-white">Гранд-финал</h3>
            <div className="max-w-[300px]">
              <MatchCard match={grandFinal} />
            </div>
          </section>
        ) : null}
      </div>

      <MatchPanel match={match} onClose={() => setMatch(null)} />
    </BracketContext.Provider>
  )
}
