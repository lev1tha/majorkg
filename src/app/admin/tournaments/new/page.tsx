"use client"

import * as React from "react"
import { Check, Layers, Loader2, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, Input, Select } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { AdminPageTitle } from "@/components/admin/admin-shell"
import { GAME_LIST } from "@/lib/data/games"
import { ACTIVE_MAP_POOL, BRACKET_LABEL, type BracketType } from "@/lib/data/tournaments"
import { cn, formatNumber } from "@/lib/utils"

const SLOT_OPTIONS = [8, 16, 24, 32, 64]

/** Раскладка сетки по числу слотов — то, что увидит участник. */
function planRounds(slots: number, type: BracketType) {
  if (type === "swiss") {
    const rounds = Math.max(3, Math.ceil(Math.log2(slots)))
    return Array.from({ length: rounds }, (_, index) => ({
      name: `Раунд ${index + 1}`,
      matches: Math.floor(slots / 2),
    }))
  }

  const power = Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, slots))))
  const rounds: { name: string; matches: number }[] = []
  let teams = power

  while (teams > 1) {
    const matches = teams / 2
    const name =
      teams === 2 ? "Финал" : teams === 4 ? "Полуфинал" : teams === 8 ? "Четвертьфинал" : `1/${teams / 2}`
    rounds.push({ name, matches })
    teams = matches
  }

  if (type === "double") {
    rounds.push({ name: "Гранд-финал", matches: 1 })
  }
  return rounds
}

export default function TournamentBuilderPage() {
  const [form, setForm] = React.useState({
    title: "",
    game: "cs2",
    bracket: "double" as BracketType,
    teamSize: "5v5",
    slots: 16,
    prize: 25000,
    date: "",
    time: "19:00",
    ruleset: "MR12 · OT MR3 · 128 tick",
  })
  const [maps, setMaps] = React.useState<string[]>(ACTIVE_MAP_POOL.slice(0, 7))
  const [saving, setSaving] = React.useState(false)
  const [created, setCreated] = React.useState(false)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const rounds = React.useMemo(() => planRounds(form.slots, form.bracket), [form.slots, form.bracket])
  const totalMatches = rounds.reduce((sum, round) => sum + round.matches, 0)

  const required = [form.title.trim().length >= 3, form.date.length > 0, form.prize > 0, maps.length >= 3]
  const ready = required.every(Boolean)
  const progress = (required.filter(Boolean).length / required.length) * 100

  const submit = () => {
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      setCreated(true)
    }, 700)
  }

  return (
    <>
      <AdminPageTitle
        title="Новый турнир"
        description="Заполните шесть полей — сетка и расписание сгенерируются автоматически."
        action={
          <Button variant="primary" size="md" onClick={submit} disabled={!ready || saving || created}>
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
                  placeholder="MAJOR KG OPEN · Season 5"
                />
              </Field>
              <Field label="Дисциплина">
                <Select value={form.game} onChange={(event) => set("game", event.target.value)}>
                  {GAME_LIST.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Формат команд">
                <Select value={form.teamSize} onChange={(event) => set("teamSize", event.target.value)}>
                  {["5v5", "2v2", "1v1"].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
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
            </div>
          </section>

          <section className="panel rounded-xl p-6">
            <h2 className="mb-5 font-display text-[15px] font-bold text-white">Сетка и призовой</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Тип сетки">
                <Select
                  value={form.bracket}
                  onChange={(event) => set("bracket", event.target.value as BracketType)}
                >
                  {(Object.keys(BRACKET_LABEL) as BracketType[]).map((key) => (
                    <option key={key} value={key}>
                      {BRACKET_LABEL[key]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Квота слотов">
                <Select
                  value={String(form.slots)}
                  onChange={(event) => set("slots", Number(event.target.value))}
                >
                  {SLOT_OPTIONS.map((slots) => (
                    <option key={slots} value={slots}>
                      {slots} команд
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Призовой фонд, KGS" hint="0 — турнир без призовых">
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.prize}
                  onChange={(event) => set("prize", Number(event.target.value))}
                />
              </Field>
              <Field label="Регламент">
                <Input value={form.ruleset} onChange={(event) => set("ruleset", event.target.value)} />
              </Field>
            </div>

            <div className="mt-6 border-t border-white/[0.07] pt-5">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-white/30">
                Пул карт · выбрано {maps.length}
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
                        "inline-flex h-9 items-center gap-2 rounded-[9px] border px-3.5 text-[12.5px] transition-colors",
                        active
                          ? "border-accent/40 bg-accent/[0.08] text-white"
                          : "border-white/[0.08] bg-white/[0.02] text-white/45 hover:border-white/20",
                      )}
                    >
                      {active && <Check size={12} strokeWidth={2.5} />}
                      {map}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Превью */}
        <aside className="flex flex-col gap-5">
          <section className="panel rounded-xl p-6">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
              Превью карточки
            </p>
            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-[8px] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] text-white/60">
                  {GAME_LIST.find((game) => game.id === form.game)?.name}
                </span>
                <Badge variant="success" size="sm">
                  Регистрация
                </Badge>
              </div>
              <h3 className="mt-3 font-display text-[18px] font-bold leading-tight text-white">
                {form.title.trim() || "Название турнира"}
              </h3>
              <p className="mt-1 text-[12.5px] text-white/35">
                {form.teamSize} · {BRACKET_LABEL[form.bracket]}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">Призовой</p>
                  <p className="mono mt-1 text-[15px] text-prize">
                    {formatNumber(form.prize)} KGS
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">Слоты</p>
                  <p className="mono mt-1 text-[15px] text-white">0 / {form.slots}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="panel rounded-xl p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
                <Layers size={13} strokeWidth={1.5} />
                Сгенерированная сетка
              </p>
              <span className="mono text-[12px] text-white/45">{totalMatches} матчей</span>
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {rounds.map((round, index) => (
                <li
                  key={`${round.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-[9px] border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5"
                >
                  <span className="text-[12.5px] text-white/70">{round.name}</span>
                  <span className="mono text-[12px] text-white/35">{round.matches} матчей</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[12px] leading-relaxed text-white/30">
              Посев формируется по рейтингу команд после закрытия слотов. Сетка пересобирается
              автоматически, если квота изменится до старта.
            </p>
          </section>

          {created && (
            <div className="flex items-start gap-2.5 rounded-xl border border-success/25 bg-success/[0.06] p-4 text-[12.5px] leading-relaxed text-success">
              <Check size={15} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              Турнир создан и опубликован. Регистрация открыта, сетка ждет закрытия слотов.
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
