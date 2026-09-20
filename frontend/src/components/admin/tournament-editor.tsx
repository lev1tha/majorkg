"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Check,
  Dices,
  Loader2,
  Network,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, Input, Select, Textarea } from "@/components/ui/input"
import {
  ApiError,
  buildBracket,
  deleteTournament,
  drawLineups,
  updateTournament,
  type TournamentPatch,
} from "@/lib/api-client"
import type { RuleBlockDto, TournamentDto, TournamentStatus } from "@/lib/types"
import { cn, formatNumber } from "@/lib/utils"

/** Активный пул карт CS2 — то же значение по умолчанию, что и на бэкенде. */
const MAP_POOL = ["Mirage", "Inferno", "Ancient", "Nuke", "Anubis", "Dust II", "Train", "Overpass", "Vertigo"]

/**
 * Статусы — это не подпись, а рубильник: они открывают регистрацию,
 * check-in и закрывают турнир. Поэтому порядок здесь тот же, что в жизни.
 */
const STATUS_FLOW: { id: TournamentStatus; label: string; hint: string }[] = [
  { id: "draft", label: "Черновик", hint: "Не виден на сайте, заявки закрыты" },
  { id: "registration", label: "Регистрация", hint: "Открыт прием заявок" },
  { id: "checkin", label: "Check-in", hint: "Заявки закрыты, идет подтверждение готовности" },
  { id: "live", label: "Идет", hint: "Матчи играются, новых заявок нет" },
  { id: "finished", label: "Завершен", hint: "Итоги зафиксированы" },
]

/** Дата и время формы ↔ ISO. Турниры живут в таймзоне Бишкека (UTC+6). */
function toLocalParts(iso: string) {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return { date: "", time: "19:00" }
  const shifted = new Date(ms + 6 * 60 * 60_000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  }
}

export function TournamentEditor({ tournament }: { tournament: TournamentDto }) {
  const router = useRouter()
  const parts = toLocalParts(tournament.startsAt)

  const [form, setForm] = React.useState({
    title: tournament.title,
    edition: tournament.edition,
    summary: tournament.summary,
    teamSize: tournament.teamSize,
    slots: tournament.slots,
    entryFee: tournament.entryFee,
    drawBeforeMinutes: tournament.drawBeforeMinutes,
    region: tournament.region,
    organizer: tournament.organizer,
    tier: tournament.tier,
    ruleset: tournament.ruleset,
    server: tournament.server,
    date: parts.date,
    time: parts.time,
  })
  const [maps, setMaps] = React.useState<string[]>(tournament.maps)
  const [rules, setRules] = React.useState<RuleBlockDto[]>(tournament.rules)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const run = async (key: string, task: () => Promise<unknown>, onDone?: () => void) => {
    setBusy(key)
    setError(null)
    try {
      await task()
      onDone?.()
      router.refresh()
      return true
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Операция не удалась")
      return false
    } finally {
      setBusy(null)
    }
  }

  const patch = (changes: TournamentPatch, key = "save") =>
    run(key, () => updateTournament(tournament.slug, changes))

  const save = async () => {
    const startsAt = new Date(`${form.date}T${form.time}:00+06:00`).toISOString()
    const ok = await patch(
      {
        title: form.title.trim(),
        edition: form.edition.trim(),
        summary: form.summary.trim(),
        teamSize: form.teamSize,
        slots: form.slots,
        entryFee: form.entryFee,
        drawBeforeMinutes: form.drawBeforeMinutes,
        region: form.region.trim(),
        organizer: form.organizer.trim(),
        tier: form.tier,
        ruleset: form.ruleset.trim(),
        server: form.server.trim(),
        maps,
        rules: rules
          .map((block) => ({
            title: block.title.trim(),
            items: block.items.map((item) => item.trim()).filter(Boolean),
          }))
          .filter((block) => block.title),
        startsAt,
      },
      "save",
    )
    if (ok) setSaved(true)
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p className="flex items-start gap-2 rounded-[10px] border border-accent/25 bg-accent/[0.07] p-3 text-[12.5px] text-accent-soft">
          <AlertTriangle size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {/* Статус — главный рубильник турнира */}
      <section className="panel rounded-xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[15px] font-bold text-white">Статус</h2>
            <p className="mt-1 text-[12.5px] text-white/35">
              Определяет, открыты ли заявки и виден ли турнир на сайте.
            </p>
          </div>
          <Button
            variant={tournament.featured ? "primary" : "outline"}
            size="sm"
            disabled={busy !== null}
            onClick={() => void patch({ featured: !tournament.featured }, "featured")}
          >
            {busy === "featured" ? (
              <Loader2 strokeWidth={1.5} className="animate-spin" />
            ) : (
              <Star strokeWidth={1.5} />
            )}
            {tournament.featured ? "Главный на витрине" : "Сделать главным"}
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {STATUS_FLOW.map((item) => {
            const active = tournament.status === item.id
            return (
              <button
                key={item.id}
                type="button"
                disabled={busy !== null || active}
                onClick={() => void patch({ status: item.id }, `status-${item.id}`)}
                className={cn(
                  "flex flex-col gap-1 rounded-[11px] border px-3.5 py-3 text-left transition-colors disabled:cursor-default",
                  active
                    ? "border-accent/45 bg-accent/[0.08]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/25 disabled:opacity-50",
                )}
              >
                <span className="flex items-center gap-1.5 text-[13px] font-medium text-white">
                  {busy === `status-${item.id}` && (
                    <Loader2 size={12} strokeWidth={1.5} className="animate-spin" />
                  )}
                  {item.label}
                  {active && <Check size={12} strokeWidth={2} className="text-accent-soft" />}
                </span>
                <span className="text-[11px] leading-snug text-white/35">{item.hint}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Жеребьевка и сетка */}
      <section className="panel flex flex-wrap items-center gap-3 rounded-xl p-6">
        <div className="mr-auto">
          <h2 className="font-display text-[15px] font-bold text-white">Жеребьевка и сетка</h2>
          <p className="mt-1 text-[12.5px] text-white/35">
            Сначала составы из подтвержденных заявок, затем сетка по их посеву.
            Повторная жеребьевка стирает текущую сетку.
          </p>
        </div>
        <Button
          variant="outline"
          size="md"
          disabled={busy !== null}
          onClick={() => void run("draw", () => drawLineups(tournament.slug))}
        >
          {busy === "draw" ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Dices strokeWidth={1.5} />
          )}
          Жеребьевка
        </Button>
        <Button
          variant="outline"
          size="md"
          disabled={busy !== null}
          onClick={() => void run("bracket", () => buildBracket(tournament.slug))}
        >
          {busy === "bracket" ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Network strokeWidth={1.5} />
          )}
          Построить сетку
        </Button>
      </section>

      {/* Основные поля */}
      <section className="panel rounded-xl p-6">
        <h2 className="mb-5 font-display text-[15px] font-bold text-white">Основное</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Название" className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Подзаголовок">
            <Input value={form.edition} onChange={(e) => set("edition", e.target.value)} />
          </Field>
          <Field label="Организатор">
            <Input value={form.organizer} onChange={(e) => set("organizer", e.target.value)} />
          </Field>
          <Field label="Дата старта">
            <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </Field>
          <Field label="Время (GMT+6)">
            <Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
          </Field>
          <Field label="Формат состава">
            <Select
              value={String(form.teamSize)}
              onChange={(e) => set("teamSize", Number(e.target.value))}
            >
              <option value="5">5v5 — классический CS2</option>
              <option value="2">2v2 — Wingman</option>
              <option value="1">1v1 — дуэли</option>
            </Select>
          </Field>
          <Field label="Уровень">
            <Select
              value={form.tier}
              onChange={(e) => set("tier", e.target.value as "S" | "A" | "B")}
            >
              <option value="S">S — главный турнир сезона</option>
              <option value="A">A — крупный кубок</option>
              <option value="B">B — регулярный</option>
            </Select>
          </Field>
          <Field label="Слоты (игроков)">
            <Input
              type="number"
              min={2}
              value={form.slots}
              onChange={(e) => set("slots", Number(e.target.value))}
            />
          </Field>
          <Field label="Взнос, сом" hint="0 — участие бесплатное">
            <Input
              type="number"
              min={0}
              step={50}
              value={form.entryFee}
              onChange={(e) => set("entryFee", Number(e.target.value))}
            />
          </Field>
          <Field label="Жеребьевка, минут до старта">
            <Input
              type="number"
              min={0}
              max={240}
              value={form.drawBeforeMinutes}
              onChange={(e) => set("drawBeforeMinutes", Number(e.target.value))}
            />
          </Field>
          <Field label="Регион">
            <Input value={form.region} onChange={(e) => set("region", e.target.value)} />
          </Field>
          <Field label="Регламент">
            <Input value={form.ruleset} onChange={(e) => set("ruleset", e.target.value)} />
          </Field>
          <Field label="Сервер">
            <Input value={form.server} onChange={(e) => set("server", e.target.value)} />
          </Field>
          <Field label="Описание" className="sm:col-span-2">
            <Textarea
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              className="min-h-[96px]"
              maxLength={2000}
            />
          </Field>
        </div>
      </section>

      {/* Карты */}
      <section className="panel rounded-xl p-6">
        <h2 className="mb-1 font-display text-[15px] font-bold text-white">Пул карт</h2>
        <p className="mb-4 text-[12.5px] text-white/35">Выбрано: {maps.length}.</p>
        <div className="flex flex-wrap gap-2">
          {MAP_POOL.map((map) => {
            const active = maps.includes(map)
            return (
              <button
                key={map}
                type="button"
                onClick={() => {
                  setMaps((prev) =>
                    prev.includes(map) ? prev.filter((item) => item !== map) : [...prev, map],
                  )
                  setSaved(false)
                }}
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

      {/* Регламент */}
      <RulesEditor rules={rules} onChange={(next) => { setRules(next); setSaved(false) }} />

      {/* Сохранение */}
      <div className="panel sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-xl p-4">
        <span className="mr-auto text-[12.5px] text-white/35">
          {saved ? "Изменения сохранены" : "Не забудьте сохранить изменения полей"}
        </span>
        <Button variant="primary" size="md" disabled={busy !== null} onClick={() => void save()}>
          {busy === "save" ? (
            <Loader2 strokeWidth={1.5} className="animate-spin" />
          ) : (
            <Check strokeWidth={1.5} />
          )}
          Сохранить
        </Button>
      </div>

      {/* Удаление */}
      <section className="rounded-xl border border-accent/20 bg-accent/[0.04] p-6">
        <h2 className="font-display text-[15px] font-bold text-white">Удалить турнир</h2>
        <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-white/40">
          Вместе с турниром удалятся заявки, составы, сетка и протоколы матчей.
          Начисленные игрокам очки сезона останутся. Отменить нельзя.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {confirmDelete ? (
            <>
              <Button
                variant="danger"
                size="md"
                disabled={busy !== null}
                onClick={() =>
                  void run("delete", () => deleteTournament(tournament.slug), () =>
                    router.push("/admin/tournaments"),
                  )
                }
              >
                {busy === "delete" ? (
                  <Loader2 strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <Trash2 strokeWidth={1.5} />
                )}
                Да, удалить «{tournament.title}»
              </Button>
              <Button variant="ghost" size="md" onClick={() => setConfirmDelete(false)}>
                Отмена
              </Button>
            </>
          ) : (
            <Button variant="outline" size="md" onClick={() => setConfirmDelete(true)}>
              <Trash2 strokeWidth={1.5} />
              Удалить турнир
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}

function RulesEditor({
  rules,
  onChange,
}: {
  rules: RuleBlockDto[]
  onChange: (next: RuleBlockDto[]) => void
}) {
  const patchBlock = (index: number, changes: Partial<RuleBlockDto>) =>
    onChange(rules.map((block, i) => (i === index ? { ...block, ...changes } : block)))

  return (
    <section className="panel rounded-xl p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-bold text-white">Регламент</h2>
          <p className="mt-1 text-[12.5px] text-white/35">
            Показывается на вкладке «Правила». Каждый пункт — с новой строки.
          </p>
        </div>
        <Badge variant="outline" size="sm">
          {rules.length} {rules.length === 1 ? "блок" : "блока"}
        </Badge>
      </div>

      <div className="flex flex-col gap-4">
        {rules.map((block, index) => (
          <div key={index} className="rounded-[12px] border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2.5">
              <Input
                value={block.title}
                onChange={(e) => patchBlock(index, { title: e.target.value })}
                placeholder="Заголовок блока"
                aria-label="Заголовок блока"
                className="font-medium"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Убрать блок"
                onClick={() => onChange(rules.filter((_, i) => i !== index))}
              >
                <X strokeWidth={1.5} />
              </Button>
            </div>
            <Textarea
              value={block.items.join("\n")}
              onChange={(e) => patchBlock(index, { items: e.target.value.split("\n") })}
              placeholder={"Матчи по регламенту MR12\nCheck-in за 30 минут до старта"}
              aria-label="Пункты регламента"
              className="mt-2.5 min-h-[92px] text-[13px]"
            />
          </div>
        ))}

        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...rules, { title: "", items: [] }])}
        >
          <Plus strokeWidth={1.5} />
          Добавить блок
        </Button>
      </div>
    </section>
  )
}

/** Компактная сводка турнира над редактором. */
export function TournamentSummary({ tournament }: { tournament: TournamentDto }) {
  const items: [string, string][] = [
    ["Заявлено", `${tournament.registered} / ${tournament.slots}`],
    ["Взнос", tournament.entryFee > 0 ? `${formatNumber(tournament.entryFee)} сом` : "Бесплатно"],
    ["Формат", tournament.teamSizeLabel],
    ["Ожидаемо взносов", `${formatNumber(tournament.registered * tournament.entryFee)} сом`],
  ]

  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="panel rounded-xl px-5 py-4">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
            {label}
          </p>
          <p className="mono mt-1.5 text-[18px] font-medium text-white">{value}</p>
        </div>
      ))}
    </div>
  )
}
