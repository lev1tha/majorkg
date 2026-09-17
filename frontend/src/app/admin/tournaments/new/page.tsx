"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Crosshair, Layers, Loader2, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, Input, Select, Textarea } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { AdminPageTitle } from "@/components/admin/admin-shell"
import { cn, formatNumber, plural } from "@/lib/utils"

/** Активный пул карт CS2 — то же значение по умолчанию, что и на бэкенде. */
const ACTIVE_MAP_POOL = ["Mirage", "Inferno", "Ancient", "Nuke", "Anubis", "Dust II", "Train"]

const SLOT_OPTIONS = [20, 40, 60, 80, 120]
const TEAM_SIZES = [
  { value: 5, label: "5v5 — классический CS2" },
  { value: 2, label: "2v2 — Wingman" },
  { value: 1, label: "1v1 — дуэли" },
]

/**
 * Раскладка верхней сетки. Слоты считаются в игроках: число составов —
 * это слоты, поделенные на размер состава, округленные вверх до степени
 * двойки (недостающие места становятся byes).
 */
function planRounds(slots: number, teamSize: number) {
  const lineups = Math.max(2, Math.floor(slots / Math.max(1, teamSize)))
  const size = 2 ** Math.ceil(Math.log2(lineups))

  const rounds: { name: string; matches: number }[] = []
  let remaining = size
  while (remaining > 1) {
    const matches = remaining / 2
    const name =
      remaining === 2 ? "Финал" : remaining === 4 ? "Полуфинал" : `1/${remaining / 2}`
    rounds.push({ name, matches })
    remaining = matches
  }
  return { rounds, lineups: size }
}

export default function TournamentBuilderPage() {
  const router = useRouter()
  const [form, setForm] = React.useState({
    title: "",
    edition: "Season 5 · CS2",
    summary: "",
    teamSize: 5,
    slots: 40,
    date: "",
    time: "19:00",
    ruleset: "MR12 · OT MR3 · 128 tick",
    entryFee: 500,
    drawBeforeMinutes: 20,
  })
  const [maps, setMaps] = React.useState<string[]>(ACTIVE_MAP_POOL)
  const [saving, setSaving] = React.useState(false)
  const [created, setCreated] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const plan = React.useMemo(() => planRounds(form.slots, form.teamSize), [form.slots, form.teamSize])
  const totalMatches = plan.rounds.reduce((sum, round) => sum + round.matches, 0)

  const required = [form.title.trim().length >= 3, form.date.length > 0, maps.length >= 3]
  const ready = required.every(Boolean)
  const progress = (required.filter(Boolean).length / required.length) * 100

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      // Время вводится в таймзоне турниров (Бишкек, UTC+6).
      const startsAt = new Date(`${form.date}T${form.time}:00+06:00`).toISOString()

      const response = await fetch("/api/admin/tournaments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          edition: form.edition.trim(),
          summary: form.summary.trim(),
          teamSize: form.teamSize,
          slots: form.slots,
          entryFee: form.entryFee,
          startsAt,
          ruleset: form.ruleset,
          maps,
          drawBeforeMinutes: form.drawBeforeMinutes,
          status: "registration",
        }),
      })

      const body = (await response.json().catch(() => null)) as
        | { tournament?: { slug: string }; error?: string }
        | null

      if (!response.ok) throw new Error(body?.error ?? "Не удалось создать турнир")

      setCreated(body?.tournament?.slug ?? null)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать турнир")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminPageTitle
        title="Новый турнир"
        description="Дисциплина одна — CS2. Заполните пять полей: сетка и расписание сгенерируются автоматически."
        action={
          <Button
            variant="primary"
            size="md"
            onClick={() => void submit()}
            disabled={!ready || saving || Boolean(created)}
          >
            {saving ? (
              <>
                <Loader2 strokeWidth={1.5} className="animate-spin" />
                Сохраняем
              </>
            ) : created ? (
              <>
                <Check strokeWidth={1.5} />
                Создан
              </>
            ) : (
              <>
                <Sparkles strokeWidth={1.5} />
                Опубликовать
              </>
            )}
          </Button>
        }
      />

      <div className="mb-6 flex items-center gap-4">
        <Progress value={progress} tone={ready ? "success" : "accent"} className="max-w-xs" />
        <span className="mono text-[12px] text-white/35">
          {required.filter(Boolean).length} / {required.length} обязательных полей
        </span>
      </div>

      {error && (
        <p className="mb-5 rounded-[10px] border border-accent/25 bg-accent/[0.07] p-3 text-[12.5px] text-accent-soft">
          {error}
        </p>
      )}

      {created && (
        <p className="mb-5 rounded-[10px] border border-success/25 bg-success/[0.07] p-3 text-[12.5px] text-success">
          Турнир опубликован — регистрация открыта.{" "}
          <a href={`/tournaments/${created}`} className="underline">
            Открыть страницу
          </a>
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Форма */}
        <div className="flex flex-col gap-5">
          <section className="panel rounded-xl p-6">
            <h2 className="mb-5 font-display text-[15px] font-bold text-white">Основное</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Название" className="sm:col-span-2">
                <Input
                  value={form.title}
                  onChange={(event) => set("title", event.target.value)}
                  placeholder="MAJOR KG OPEN"
                />
              </Field>
              <Field label="Подзаголовок">
                <Input
                  value={form.edition}
                  onChange={(event) => set("edition", event.target.value)}
                  placeholder="Season 5 · CS2"
                />
              </Field>
              <Field label="Дисциплина" hint="Платформа работает только с CS2">
                <div className="flex h-11 items-center gap-2 rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-3.5 text-[13.5px] text-white/60">
                  <Crosshair size={15} strokeWidth={1.5} />
                  Counter-Strike 2
                </div>
              </Field>
              <Field label="Формат состава">
                <Select
                  value={String(form.teamSize)}
                  onChange={(event) => set("teamSize", Number(event.target.value))}
                >
                  {TEAM_SIZES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Регламент">
                <Input
                  value={form.ruleset}
                  onChange={(event) => set("ruleset", event.target.value)}
                />
              </Field>
              <Field label="Дата старта">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(event) => set("date", event.target.value)}
                />
              </Field>
              <Field label="Время (GMT+6)">
                <Input
                  type="time"
                  value={form.time}
                  onChange={(event) => set("time", event.target.value)}
                />
              </Field>
              <Field label="Описание" className="sm:col-span-2">
                <Textarea
                  value={form.summary}
                  onChange={(event) => set("summary", event.target.value)}
                  placeholder="Что за турнир и чем интересен участнику"
                  className="min-h-[88px]"
                  maxLength={2000}
                />
              </Field>
            </div>
          </section>

          <section className="panel rounded-xl p-6">
            <h2 className="mb-5 font-display text-[15px] font-bold text-white">Слоты и жеребьевка</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Слоты" hint="Считаются в игроках: регистрация индивидуальная">
                <div className="flex flex-wrap gap-2">
                  {SLOT_OPTIONS.map((slots) => (
                    <button
                      key={slots}
                      type="button"
                      onClick={() => set("slots", slots)}
                      className={cn(
                        "h-11 flex-1 rounded-[10px] border text-[13px] font-medium transition-colors",
                        form.slots === slots
                          ? "border-accent/45 bg-accent/[0.08] text-white"
                          : "border-white/[0.08] text-white/45 hover:border-white/20",
                      )}
                    >
                      {slots}
                    </button>
                  ))}
                </div>
              </Field>
              <Field
                label="Жеребьевка, минут до старта"
                hint="За это время до старта система соберет составы"
              >
                <Input
                  type="number"
                  min={0}
                  max={240}
                  value={form.drawBeforeMinutes}
                  onChange={(event) => set("drawBeforeMinutes", Number(event.target.value))}
                />
              </Field>
              <Field label="Организационный взнос, сом" hint="0 — участие бесплатное">
                <Input
                  type="number"
                  min={0}
                  step={50}
                  value={form.entryFee}
                  onChange={(event) => set("entryFee", Number(event.target.value))}
                />
              </Field>
            </div>
          </section>

          <section className="panel rounded-xl p-6">
            <h2 className="mb-1 font-display text-[15px] font-bold text-white">Пул карт</h2>
            <p className="mb-5 text-[12.5px] text-white/35">
              Минимум три карты. Выбрано: {maps.length}.
            </p>
            <div className="flex flex-wrap gap-2">
              {ACTIVE_MAP_POOL.map((map) => {
                const active = maps.includes(map)
                return (
                  <button
                    key={map}
                    type="button"
                    onClick={() =>
                      setMaps((prev) =>
                        prev.includes(map) ? prev.filter((item) => item !== map) : [...prev, map],
                      )
                    }
                    className={cn(
                      "h-10 rounded-[9px] border px-3.5 text-[13px] transition-colors",
                      active
                        ? "border-accent/45 bg-accent/[0.08] text-white"
                        : "border-white/[0.08] text-white/45 hover:border-white/20",
                    )}
                  >
                    {map}
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {/* Предпросмотр сетки */}
        <aside className="panel h-fit rounded-xl p-6">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-white">
            <Layers size={15} strokeWidth={1.5} className="text-white/40" />
            Верхняя сетка
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-white/40">
            Проигравший выбывает сразу — нижней сетки и гранд-финала нет.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4 border-y border-white/[0.07] py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">Составов</p>
              <p className="mono mt-1 text-[15px] text-white">{plan.lineups}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">Матчей</p>
              <p className="mono mt-1 text-[15px] text-white">{totalMatches}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">Взнос с игрока</p>
              <p className="mono mt-1 text-[15px] text-prize">
                {form.entryFee > 0 ? `${formatNumber(form.entryFee)} сом` : "Бесплатно"}
              </p>
            </div>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {plan.rounds.map((round) => (
              <li key={round.name} className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-white/60">{round.name}</span>
                <Badge variant="outline" size="sm">
                  {round.matches} {plural(round.matches, ["матч", "матча", "матчей"])}
                </Badge>
              </li>
            ))}
          </ul>

          <p className="mt-5 border-t border-white/[0.07] pt-4 text-[12px] leading-relaxed text-white/35">
            Посев идет по среднему рейтингу состава после жеребьевки. Если составов меньше степени
            двойки, недостающие места становятся проходом без игры.
          </p>
        </aside>
      </div>
    </>
  )
}
