"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  Check,
  CircleAlert,
  Loader2,
  MessagesSquare,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { TeamMark } from "@/components/ui/misc"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { CountdownInline } from "@/components/tournament/countdown"
import { GAMES } from "@/lib/data/games"
import { MY_TEAMS, type Team } from "@/lib/data/teams"
import { MIX_POOL } from "@/lib/data/players"
import { FaceitLevel } from "@/components/player/faceit-level"
import { BRACKET_LABEL, type Tournament } from "@/lib/data/tournaments"
import { EXTERNAL, LINKS } from "@/lib/links"
import { cn, formatNumber, pct } from "@/lib/utils"

interface JoinDialogProps {
  tournament: Tournament | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Один экран вместо мастера: состав выбран заранее, галочка регламента
 * и подтверждение. От кнопки на витрине до поданной заявки — два клика.
 */
export function JoinDialog({ tournament, open, onOpenChange }: JoinDialogProps) {
  const [teamId, setTeamId] = React.useState<string | null>(null)
  const [createdTeam, setCreatedTeam] = React.useState<Team | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [draft, setDraft] = React.useState({ name: "", tag: "" })
  const [agreed, setAgreed] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)

  const isMix = Boolean(tournament?.mix)
  const eligible = React.useMemo(
    () => (tournament && !tournament.mix ? MY_TEAMS.filter((team) => team.game === tournament.game) : []),
    [tournament],
  )

  // Первый подходящий состав выбирается сам — пользователю остается подтвердить.
  React.useEffect(() => {
    if (!open || !tournament) return
    // MIX — заявка без команды: подтверждать нечего, кроме себя самого.
    setTeamId(tournament.mix ? "__solo__" : (eligible[0]?.id ?? null))
  }, [open, tournament, eligible])

  React.useEffect(() => {
    if (open) return
    const id = window.setTimeout(() => {
      setCreatedTeam(null)
      setCreating(false)
      setDraft({ name: "", tag: "" })
      setAgreed(true)
      setSubmitting(false)
      setDone(false)
    }, 220)
    return () => window.clearTimeout(id)
  }, [open])

  if (!tournament) return <Dialog open={open} onOpenChange={onOpenChange} />

  const game = GAMES[tournament.game]
  const GameIcon = game.icon
  const solo = isMix || tournament.teamSize === "1v1"
  const pool = createdTeam ? [createdTeam, ...eligible] : eligible
  const selected = pool.find((team) => team.id === teamId) ?? null
  const soloSelected = solo && teamId === "__solo__"
  const rosterGap = selected ? Math.max(0, selected.requiredSize - selected.roster.length) : 0
  const filled = pct(tournament.registered, tournament.slots)
  const canSubmit = (Boolean(selected) || soloSelected) && agreed && !submitting

  const submit = () => {
    setSubmitting(true)
    window.setTimeout(() => {
      setSubmitting(false)
      setDone(true)
    }, 750)
  }

  const createTeam = () => {
    const name = draft.name.trim()
    const tag = draft.tag.trim().toUpperCase()
    if (name.length < 2 || tag.length < 2) return
    const team: Team = {
      id: "draft-team",
      name,
      tag,
      game: tournament.game,
      role: "captain",
      requiredSize: solo ? 1 : tournament.teamSize === "2v2" ? 2 : 5,
      rating: 1000,
      winRate: 0,
      roster: [{ nickname: "вы", role: "Captain", verified: true }],
    }
    setCreatedTeam(team)
    setTeamId(team.id)
    setCreating(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] p-0">
        <div className="flex items-start gap-4 px-6 pb-5 pt-6">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.03] text-white/70">
            <GameIcon size={20} strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-[19px]">{tournament.title}</DialogTitle>
            <DialogDescription className="mt-1">
              {tournament.teamSize} · {BRACKET_LABEL[tournament.bracket]} · старт через{" "}
              <CountdownInline minutes={tournament.startsInMinutes} className="text-white/70" />
            </DialogDescription>
          </div>
          <Badge variant="prize" size="sm" className="shrink-0">
            {formatNumber(tournament.prizePool)} {tournament.currency}
          </Badge>
        </div>

        <div className="px-6 pb-5">
          <div className="mb-2 flex items-center justify-between text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-white/40">
              <Users size={13} strokeWidth={1.5} />
              Слоты
            </span>
            <span className="mono text-white/70">
              {tournament.registered} / {tournament.slots}
            </span>
          </div>
          <Progress value={filled} tone={filled >= 85 ? "accent" : "neutral"} />
        </div>

        <div className="h-px bg-white/[0.07]" />

        <AnimatePresence mode="wait" initial={false}>
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-4 px-6 py-9 text-center"
            >
              <span className="flex size-14 items-center justify-center rounded-full border border-success/30 bg-success/10 text-success">
                <Check size={26} strokeWidth={1.75} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display text-[19px] font-bold text-white">Заявка принята</h3>
                <p className="max-w-[360px] text-[13px] leading-relaxed text-white/45">
                  {isMix
                    ? `Вы в лобби MIX ARENA. Жеребьевка — за ${tournament.drawBeforeMinutes ?? 20} минут до старта, состав придет автоматически.`
                    : `${soloSelected ? "Вы" : (selected?.name ?? "Команда")} в списке участников. Слот №${tournament.registered + 1}. Check-in откроется за 30 минут до старта.`}
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
                <Button variant="outline" size="lg" className="flex-1" onClick={() => onOpenChange(false)}>
                  Закрыть
                </Button>
                <Button variant="primary" size="lg" className="flex-1" asChild>
                  <Link href={isMix ? "/mix" : `/tournaments/${tournament.slug}`} onClick={() => onOpenChange(false)}>
                    {isMix ? "Открыть лобби" : "Страница турнира"}
                    <ArrowRight strokeWidth={1.5} />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4 px-6 py-5"
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/30">
                {isMix ? "Заявка" : "Состав"}
              </span>

              <div className="flex flex-col gap-2">
                {isMix ? (
                  <div className="flex items-center gap-3 rounded-[12px] border border-accent/40 bg-accent/[0.06] px-4 py-3">
                    <FaceitLevel elo={MIX_POOL[0].elo} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-white">
                        {MIX_POOL[0].nickname} · соло-заявка
                      </span>
                      <span className="block truncate text-[12px] text-white/35">
                        Состав соберет жеребьевка за {tournament.drawBeforeMinutes ?? 20} минут до старта
                      </span>
                    </span>
                    <Badge variant="success" size="sm">
                      Готов
                    </Badge>
                  </div>
                ) : (
                  solo && (
                    <OptionRow
                      active={soloSelected}
                      onClick={() => setTeamId("__solo__")}
                      mark={<TeamMark tag="SOLO" tone="accent" />}
                      title="Соло-заявка"
                      subtitle="Формат 1v1 — команда не нужна"
                    />
                  )
                )}

                {!isMix && pool.map((team) => {
                  const gap = Math.max(0, team.requiredSize - team.roster.length)
                  return (
                    <OptionRow
                      key={team.id}
                      active={teamId === team.id}
                      onClick={() => setTeamId(team.id)}
                      mark={<TeamMark tag={team.tag} tone={teamId === team.id ? "accent" : "steel"} />}
                      title={team.name}
                      subtitle={`${team.roster.length}/${team.requiredSize} игроков · рейтинг ${team.rating}`}
                      right={
                        gap > 0 ? (
                          <Badge variant="prize" size="sm">
                            <CircleAlert strokeWidth={1.5} />−{gap}
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            <ShieldCheck strokeWidth={1.5} />
                            Готова
                          </Badge>
                        )
                      }
                    />
                  )
                })}

                {!isMix && (!creating ? (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-3 rounded-[12px] border border-dashed border-white/10 px-4 py-3 text-left transition-colors hover:border-accent/35 hover:bg-white/[0.02]"
                  >
                    <span className="flex size-10 items-center justify-center rounded-[10px] border border-white/[0.08] text-white/40">
                      <Plus size={16} strokeWidth={1.5} />
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-white">Создать команду</span>
                      <span className="text-[12px] text-white/35">Состав можно добрать до check-in</span>
                    </span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 rounded-[12px] border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="grid grid-cols-[1fr_104px] gap-2.5">
                      <Input
                        autoFocus
                        placeholder="Название команды"
                        value={draft.name}
                        onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                      />
                      <Input
                        placeholder="ТЕГ"
                        maxLength={4}
                        value={draft.tag}
                        onChange={(event) => setDraft((prev) => ({ ...prev, tag: event.target.value }))}
                        className="uppercase"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" onClick={createTeam}>
                        Создать и выбрать
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {rosterGap > 0 && (
                <p className="flex items-start gap-2 rounded-[10px] border border-prize/20 bg-prize/[0.06] p-3 text-[12px] leading-relaxed text-prize/85">
                  <CircleAlert size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                  Не хватает {rosterGap} игрока. Заявку примем, но к check-in состав должен быть полным.
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
                disabled={!canSubmit}
                onClick={submit}
              >
                {submitting ? (
                  <>
                    <Loader2 strokeWidth={1.5} className="animate-spin" />
                    Отправляем
                  </>
                ) : (
                  <>
                    Подтвердить заявку
                    <ArrowRight strokeWidth={1.5} />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

function OptionRow({
  active,
  onClick,
  mark,
  title,
  subtitle,
  right,
}: {
  active: boolean
  onClick: () => void
  mark: React.ReactNode
  title: string
  subtitle: string
  right?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-all duration-200",
        active
          ? "border-accent/45 bg-accent/[0.06]"
          : "border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
      )}
    >
      {mark}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-white">{title}</span>
        <span className="block truncate text-[12px] text-white/35">{subtitle}</span>
      </span>
      {right}
      <span
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
          active ? "border-accent bg-accent text-white" : "border-white/20",
        )}
      >
        {active && <Check size={11} strokeWidth={3} />}
      </span>
    </button>
  )
}
