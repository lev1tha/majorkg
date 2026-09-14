"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, ServerCog, ShieldCheck, Ticket, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { JoinButton } from "@/components/join/join-button"
import { Countdown } from "@/components/tournament/countdown"
import { GAMES } from "@/lib/data/games"
import { BRACKET_LABEL, FEATURED_TOURNAMENT } from "@/lib/data/tournaments"
import { formatNumber, pct } from "@/lib/utils"

const ease = [0.16, 1, 0.3, 1] as const

export function Hero() {
  const tournament = FEATURED_TOURNAMENT
  const game = GAMES[tournament.game]
  const filled = pct(tournament.registered, tournament.slots)
  const left = tournament.slots - tournament.registered
  // Регистрация закрывается за 30 минут до старта.
  const registrationMinutes = Math.max(0, tournament.startsInMinutes - 30)

  return (
    <section className="relative pb-14 pt-8 sm:pt-10">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="edge relative overflow-hidden rounded-2xl border border-white/[0.08]"
        >
          {/* Затемнённая подложка карточки */}
          <div aria-hidden className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[linear-gradient(115deg,#12141c_0%,#0c0e14_46%,#0a0b10_100%)]" />
            <div
              className="absolute -right-[8%] -top-[40%] size-[680px] rounded-full opacity-70 blur-[120px]"
              style={{ background: "radial-gradient(circle, rgba(255,70,85,0.16), transparent 65%)" }}
            />
            <div className="mesh absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(9,10,15,0.75))]" />
          </div>

          <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-14 lg:p-14">
            {/* Смысловой блок */}
            <div className="flex flex-col justify-center gap-7">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="live" size="md">
                  <span className="size-1.5 rounded-full bg-accent pulse-live" />
                  Регистрация открыта
                </Badge>
                <Badge variant="outline" size="md">
                  {game.name}
                </Badge>
                <Badge variant="outline" size="md">
                  {tournament.teamSize} · {BRACKET_LABEL[tournament.bracket]}
                </Badge>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-white/35">
                  Главный турнир · {tournament.edition}
                </p>
                <h1 className="font-display text-[40px] font-extrabold leading-[0.95] tracking-[-0.035em] text-white sm:text-[58px] lg:text-[66px]">
                  {tournament.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                    Призовой фонд
                  </span>
                  <span className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] text-prize sm:text-[40px]">
                    {formatNumber(tournament.prizePool)}
                    <span className="ml-2 text-[17px] font-bold tracking-normal text-prize/60">
                      {tournament.currency}
                    </span>
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                    Взнос
                  </span>
                  <span className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-success">
                    Бесплатно
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                    Регламент
                  </span>
                  <span className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-white">
                    MR12
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <JoinButton tournament={tournament} variant="primary" size="xl">
                  Зарегистрировать команду
                  <ArrowRight strokeWidth={1.5} />
                </JoinButton>
                <Button variant="outline" size="xl" asChild>
                  <Link href={`/tournaments/${tournament.slug}`}>Страница турнира</Link>
                </Button>
              </div>
            </div>

            {/* Операционная панель */}
            <aside className="glass flex h-fit flex-col gap-6 rounded-xl p-6">
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                  До конца регистрации
                </span>
                <Countdown minutes={registrationMinutes} size="lg" expiredLabel="Регистрация закрыта" />
              </div>

              <div className="flex flex-col gap-2.5 border-t border-white/[0.07] pt-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-[12.5px] text-white/45">
                    <Users size={13} strokeWidth={1.5} />
                    Команд заявлено
                  </span>
                  <span className="mono text-[13px] font-medium text-white">
                    {tournament.registered} / {tournament.slots}
                  </span>
                </div>
                <Progress value={filled} tone={filled >= 85 ? "accent" : "neutral"} size="md" />
                <p className="text-[12px] text-white/30">
                  {left > 0 ? `Осталось ${left} слота из ${tournament.slots}` : "Слоты закрыты"}
                </p>
              </div>

              <ul className="flex flex-col gap-2.5 border-t border-white/[0.07] pt-5 text-[12.5px] text-white/45">
                <li className="flex items-center gap-2.5">
                  <Ticket size={13} strokeWidth={1.5} className="shrink-0 text-white/30" />
                  Старт: {tournament.startLabel}
                </li>
                <li className="flex items-center gap-2.5">
                  <ServerCog size={13} strokeWidth={1.5} className="shrink-0 text-white/30" />
                  {tournament.server}
                </li>
                <li className="flex items-center gap-2.5">
                  <ShieldCheck size={13} strokeWidth={1.5} className="shrink-0 text-white/30" />
                  Античит и проверка Steam ID
                </li>
              </ul>
            </aside>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
