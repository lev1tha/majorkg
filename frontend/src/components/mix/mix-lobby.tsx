"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Check, Dices, Loader2, Lock, MessagesSquare, Shuffle, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { TeamMark } from "@/components/ui/misc"
import { FaceitLevel } from "@/components/player/faceit-level"
import { JoinButton } from "@/components/join/join-button"
import { CountdownInline } from "@/components/tournament/countdown"
import { MIX_BANDS, bandOf } from "@/lib/mix"
import { EXTERNAL, LINKS } from "@/lib/links"
import type { LineupDto, ParticipantDto, TournamentDto, ViewerDto } from "@/lib/types"
import { cn, formatNumber, plural } from "@/lib/utils"

/**
 * Лобби MIX: до жеребьевки видно только распределение по поясам, после —
 * готовые составы. Саму жеребьевку проводит бэкенд, здесь ее только
 * запускает организатор.
 */
export function MixLobby({
  tournament,
  participants,
  lineups,
  viewer,
  admin = false,
}: {
  tournament: TournamentDto
  participants: ParticipantDto[]
  lineups: LineupDto[]
  viewer: ViewerDto | null
  admin?: boolean
}) {
  const router = useRouter()
  const [drawing, setDrawing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const drawAt = Math.max(0, tournament.startsInMinutes - tournament.drawBeforeMinutes)
  const drawn = lineups.length > 0
  const joined =
    tournament.viewerRegistration !== null &&
    ["pending", "confirmed", "checked_in"].includes(tournament.viewerRegistration)

  const distribution = MIX_BANDS.map((band) => ({
    band,
    count: participants.filter((item) => bandOf(item.player.elo).id === band.id).length,
  }))

  const draw = async () => {
    setDrawing(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/tournaments/${tournament.slug}/draw`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Не удалось провести жеребьевку")
      }
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось провести жеребьевку")
    } finally {
      setDrawing(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Статус лобби */}
      <div className="glass flex flex-wrap items-center justify-between gap-6 rounded-xl p-6">
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
            {drawn ? "Составы собраны" : "До жеребьевки"}
          </span>
          {drawn ? (
            <span className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-white">
              {lineups.length} {plural(lineups.length, ["состав", "состава", "составов"])} готовы
            </span>
          ) : (
            <CountdownInline
              minutes={drawAt}
              className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-white"
              expiredLabel="Жеребьевка вот-вот начнется"
            />
          )}
          <span className="text-[12.5px] text-white/35">
            Жеребьевка за {tournament.drawBeforeMinutes} минут до старта · заявка индивидуальная
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[12.5px] text-white/45">
            <Users size={14} strokeWidth={1.5} />
            Записалось {participants.length} из {tournament.slots}
          </div>
          <Progress
            value={(participants.length / Math.max(1, tournament.slots)) * 100}
            tone="accent"
            size="md"
            className="w-52"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          {joined ? (
            <Button variant="primary" size="lg" disabled>
              <Check strokeWidth={1.5} />
              Вы в лобби
            </Button>
          ) : (
            <JoinButton tournament={tournament} variant="primary" size="lg">
              Заявиться одному
            </JoinButton>
          )}

          {admin && (
            <Button variant="outline" size="lg" onClick={() => void draw()} disabled={drawing}>
              {drawing ? (
                <Loader2 strokeWidth={1.5} className="animate-spin" />
              ) : drawn ? (
                <Shuffle strokeWidth={1.5} />
              ) : (
                <Dices strokeWidth={1.5} />
              )}
              {drawn ? "Пересобрать составы" : "Провести жеребьевку"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-[10px] border border-accent/25 bg-accent/[0.07] p-3 text-[12.5px] text-accent-soft">
          {error}
        </p>
      )}

      {/* Распределение по поясам */}
      <section className="glass rounded-xl p-6">
        <h2 className="font-display text-[16px] font-bold text-white">Рейтинговые пояса</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/40">
          В каждом составе — по одному игроку из каждого пояса. Поэтому рядом с игроком на 3000 ELO
          гарантированно окажутся партнеры уровнем ниже, а сила составов сходится.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {distribution.map(({ band, count }) => (
            <li
              key={band.id}
              className="rounded-[12px] border border-white/[0.07] bg-white/[0.02] p-4"
            >
              <p className="text-[12.5px] font-medium text-white">{band.label}</p>
              <p className="mt-1 text-[11.5px] text-white/35">{band.hint}</p>
              <p className="mono mt-3 text-[20px] font-medium text-white">{count}</p>
            </li>
          ))}
        </ul>
      </section>

      {/*
        Без AnimatePresence: жеребьевка заканчивается router.refresh(), а он
        обрывает exit-анимацию на середине и оставляет уходящий блок на
        экране. Анимируем только появление.
      */}
      {drawn ? (
        <motion.section
          key="lineups"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-[18px] font-bold text-white">Составы</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/tournaments/${tournament.slug}#bracket`}>Открыть сетку</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {lineups.map((lineup) => (
              <article key={lineup.id} className="glass flex flex-col overflow-hidden rounded-xl">
                <header className="flex items-center gap-3 border-b border-white/[0.06] p-4">
                  <TeamMark
                    tag={lineup.tag}
                    size="md"
                    tone={lineup.seed === 1 ? "prize" : "steel"}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-[15px] font-bold text-white">
                      {lineup.name}
                    </h3>
                    <p className="mono text-[11.5px] text-white/35">
                      Посев #{lineup.seed} · {formatNumber(lineup.avgElo)} ELO
                    </p>
                  </div>
                </header>
                <ul className="divide-y divide-white/[0.05]">
                  {lineup.members.map((member) => {
                    const me = viewer?.id === member.playerId
                    return (
                      <li
                        key={member.playerId}
                        className={cn(
                          "flex items-center gap-2.5 px-4 py-2.5",
                          me && "bg-accent/[0.07]",
                        )}
                      >
                        <FaceitLevel elo={member.elo} size="sm" />
                        <Link
                          href={`/players/${member.nickname}`}
                          className="min-w-0 flex-1 truncate text-[12.5px] text-white/80 transition-colors hover:text-accent-soft"
                        >
                          {me ? `${member.nickname} · вы` : member.nickname}
                        </Link>
                        <span className="mono shrink-0 text-[11.5px] text-white/40">
                          {member.elo}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </article>
            ))}
          </div>

          <a
            href={LINKS.discord}
            {...EXTERNAL}
            className="inline-flex items-center gap-2 self-start rounded-[10px] border border-accent/25 bg-accent/[0.07] px-3.5 py-2.5 text-[12.5px] text-accent-soft transition-colors hover:bg-accent/12"
          >
            <MessagesSquare size={14} strokeWidth={1.5} />
            Связь с составом и судьей — в Discord
          </a>
        </motion.section>
      ) : (
        <motion.section
          key="lobby"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-4"
        >
          <h2 className="font-display text-[18px] font-bold text-white">В лобби</h2>
          {participants.length === 0 ? (
            <div className="glass rounded-xl py-16 text-center text-[13px] text-white/30">
              Заявок пока нет — будьте первым.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {participants.map((item, index) => {
                const me = viewer?.id === item.player.id
                const band = bandOf(item.player.elo)
                return (
                  <div
                    key={item.registrationId}
                    className={cn(
                      "flex items-center gap-3 rounded-[11px] border px-3.5 py-2.5",
                      me
                        ? "border-accent/40 bg-accent/[0.06]"
                        : "border-white/[0.07] bg-white/[0.02]",
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
                        {/* До жеребьевки соперники обезличены — виден только пояс */}
                        {me || admin
                          ? item.player.nickname
                          : `Игрок #${String(index + 1).padStart(2, "0")}`}
                      </span>
                      <span className="block truncate text-[11px] text-white/30">{band.label}</span>
                    </span>
                    {me ? (
                      <Badge variant="accent" size="sm">
                        Вы
                      </Badge>
                    ) : (
                      <Lock size={13} strokeWidth={1.5} className="shrink-0 text-white/15" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </motion.section>
      )}
    </div>
  )
}
