"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Check,
  CircleAlert,
  Dices,
  Gamepad2,
  Loader2,
  MessagesSquare,
  ShieldCheck,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { CountdownInline } from "@/components/tournament/countdown"
import { FaceitLevel } from "@/components/player/faceit-level"
import { ApiError, joinTournament } from "@/lib/api-client"
import { EXTERNAL, LINKS } from "@/lib/links"
import type { TournamentDto, ViewerDto } from "@/lib/types"
import { pct } from "@/lib/utils"

interface JoinDialogProps {
  tournament: TournamentDto | null
  viewer: ViewerDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Заявка в два клика: регистрация индивидуальная, подтверждать состав не
 * нужно — его соберет жеребьевка. Остается принять регламент и нажать
 * кнопку.
 */
export function JoinDialog({ tournament, viewer, open, onOpenChange }: JoinDialogProps) {
  const router = useRouter()
  const [agreed, setAgreed] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) return
    const id = window.setTimeout(() => {
      setAgreed(true)
      setSubmitting(false)
      setDone(false)
      setError(null)
    }, 220)
    return () => window.clearTimeout(id)
  }, [open])

  if (!tournament) return <Dialog open={open} onOpenChange={onOpenChange} />

  const filled = pct(tournament.registered, tournament.slots)
  const full = tournament.registered >= tournament.slots
  const already =
    tournament.viewerRegistration !== null &&
    ["pending", "confirmed", "checked_in"].includes(tournament.viewerRegistration)
  const drawIn = Math.max(0, tournament.startsInMinutes - tournament.drawBeforeMinutes)

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await joinTournament(tournament.slug)
      setDone(true)
      // Счетчик слотов и статус заявки живут на сервере — обновляем страницу.
      router.refresh()
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Не удалось отправить заявку")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] p-0">
        <div className="flex items-start gap-4 px-6 pb-5 pt-6">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.03] text-white/70">
            <Users size={20} strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-[19px]">{tournament.title}</DialogTitle>
            <DialogDescription className="mt-1">
              CS2 · {tournament.teamSizeLabel} · старт через{" "}
              <CountdownInline minutes={tournament.startsInMinutes} className="text-white/70" />
            </DialogDescription>
          </div>
          <Badge variant="info" size="sm" className="shrink-0">
            Без команды
          </Badge>
        </div>

        <div className="px-6 pb-5">
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-white/40">
              <Users size={13} strokeWidth={1.5} />
              Игроков заявлено
            </span>
            <span className="mono text-white/70">
              {tournament.registered} / {tournament.slots}
            </span>
          </div>
          <Progress value={filled} tone={filled >= 85 ? "accent" : "neutral"} />
        </div>

        <div className="h-px bg-white/[0.07]" />

        {/*
          Ветки переключаются без AnimatePresence: exit-анимация не переживает
          router.refresh() — обновление серверного дерева обрывает ее на
          середине, и уходящий экран залипает. Анимируем только появление.
        */}
        {done || already ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4 px-6 py-9 text-center"
          >
            <span className="flex size-14 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success">
              <Check size={26} strokeWidth={1.75} />
            </span>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-display text-[19px] font-bold text-white">Вы в списке</h3>
              <p className="max-w-[360px] text-[13px] leading-relaxed text-white/45">
                Заявка принята. Жеребьевка соберет состав за {tournament.drawBeforeMinutes} минут до
                старта — партнеры и соперники придут автоматически.
              </p>
            </div>
            <a
              href={LINKS.discord}
              {...EXTERNAL}
              className="inline-flex items-center gap-2 rounded-[10px] border border-accent/25 bg-accent/[0.07] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-accent-soft transition-colors hover:bg-accent/12"
            >
              <MessagesSquare size={14} strokeWidth={1.5} className="shrink-0" />
              Зайдите в Discord — там чат матча и связь с судьей
            </a>

            <div className="flex w-full flex-col gap-2.5 pt-1 sm:flex-row">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Закрыть
              </Button>
              <Button variant="primary" size="lg" className="flex-1" asChild>
                <Link href={`/tournaments/${tournament.slug}`} onClick={() => onOpenChange(false)}>
                  Страница турнира
                  <ArrowRight strokeWidth={1.5} />
                </Link>
              </Button>
            </div>
          </motion.div>
        ) : !viewer ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 px-6 py-9 text-center"
          >
            <span className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/50">
              <Gamepad2 size={24} strokeWidth={1.5} />
            </span>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-display text-[18px] font-bold text-white">
                Нужен вход через Steam
              </h3>
              <p className="max-w-[360px] text-[13px] leading-relaxed text-white/45">
                Заявка привязывается к вашему Steam ID — по нему судья сверяет состав на карте.
              </p>
            </div>
            <Button variant="primary" size="lg" className="w-full" asChild>
              <a href="/api/auth/steam" rel="nofollow">
                <Gamepad2 strokeWidth={1.5} />
                Войти через Steam
              </a>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4 px-6 py-5"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/30">
              Заявка
            </span>

            <div className="flex items-center gap-3 rounded-[12px] border border-accent/40 bg-accent/[0.06] px-4 py-3">
              <FaceitLevel elo={viewer.elo} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-white">
                  {viewer.nickname}
                </span>
                <span className="block truncate text-[12px] text-white/35">
                  Заявка от своего имени · {viewer.elo} ELO
                </span>
              </span>
              <Badge variant="success" size="sm">
                Готов
              </Badge>
            </div>

            <p className="flex items-start gap-2.5 rounded-[10px] border border-white/[0.07] bg-white/[0.02] p-3 text-[12.5px] leading-relaxed text-white/50">
              <Dices size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-white/30" />
              Состав соберет жеребьевка через{" "}
              <CountdownInline minutes={drawIn} className="text-white/70" expiredLabel="скоро" />:
              игроки раскладываются по рейтинговым поясам, поэтому команды получаются равными.
            </p>

            {full && (
              <p className="flex items-start gap-2 rounded-[10px] border border-prize/20 bg-prize/[0.06] p-3 text-[12px] leading-relaxed text-prize/85">
                <CircleAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                Слоты закончились. Заявку примем в лист ожидания — место освободится, если кто-то не
                пройдет check-in.
              </p>
            )}

            {error && (
              <p className="flex items-start gap-2 rounded-[10px] border border-accent/25 bg-accent/[0.07] p-3 text-[12px] leading-relaxed text-accent-soft">
                <CircleAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <label className="flex cursor-pointer items-start gap-3 pt-1">
              <Checkbox
                checked={agreed}
                onCheckedChange={(value) => setAgreed(value === true)}
                className="mt-0.5"
              />
              <span className="text-[12.5px] leading-relaxed text-white/55">
                Принимаю регламент, античит-правила и подтверждаю check-in за 30 минут до старта
              </span>
            </label>

            <Button
              variant="primary"
              size="xl"
              className="mt-1 w-full"
              disabled={!agreed || submitting}
              onClick={() => void submit()}
            >
              {submitting ? (
                <>
                  <Loader2 strokeWidth={1.5} className="animate-spin" />
                  Отправляем
                </>
              ) : (
                <>
                  <ShieldCheck strokeWidth={1.5} />
                  Участвовать
                </>
              )}
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}
