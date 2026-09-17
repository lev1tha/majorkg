import { db } from "../db/index.js"
import { ApiError } from "../lib/http.js"
import type {
  RegistrationStatus,
  RuleBlockDto,
  TournamentDto,
  TournamentStatus,
} from "../types.js"

export interface TournamentRow {
  id: number
  slug: string
  title: string
  edition: string
  summary: string
  team_size: number
  bracket: "single"
  status: TournamentStatus
  slots: number
  starts_at: string
  region: string
  organizer: string
  tier: "S" | "A" | "B"
  ruleset: string
  server: string
  maps: string
  entry_fee: number
  rules: string
  featured: number
  draw_before_minutes: number
  registered?: number
}

/** Взнос по умолчанию для новых турниров, сом. */
export const DEFAULT_ENTRY_FEE = 500

/** Регламент по умолчанию — стартовая заготовка, дальше правится в админке. */
export const DEFAULT_RULES: RuleBlockDto[] = [
  {
    title: "Формат и регламент",
    items: [
      "Матчи по регламенту MR12, овертайм MR3 до победы.",
      "Верхняя сетка на выбывание: проигравший матч покидает турнир.",
      "Ранние раунды — BO1, полуфинал и финал — BO3.",
      "Вето карт проводится через платформу за 10 минут до старта серии.",
    ],
  },
  {
    title: "Заявка и check-in",
    items: [
      "Регистрация индивидуальная: команда не нужна и создавать ее не надо.",
      "Организационный взнос оплачивается до закрытия регистрации.",
      "Check-in открывается за 30 минут до старта и закрывается за 10 минут.",
      "Неявка через 15 минут после старта — техническое поражение.",
    ],
  },
  {
    title: "Честная игра",
    items: [
      "Обязателен клиент античита, запуск проверяется судьей.",
      "Запрещены сторонние оверлеи, скрипты и изменение игровых файлов.",
      "Каждая карта пишется в GOTV, демо хранится 30 дней.",
      "Апелляция подается в течение 30 минут после карты со скриншотом счета.",
    ],
  },
]

/** Активный пул карт CS2 — значение по умолчанию для новых турниров. */
export const ACTIVE_MAP_POOL = [
  "Mirage",
  "Inferno",
  "Ancient",
  "Nuke",
  "Anubis",
  "Dust II",
  "Train",
]

const SELECT = `
  SELECT t.*,
         (SELECT COUNT(*) FROM registrations r
           WHERE r.tournament_id = t.id
             AND r.status IN ('pending', 'confirmed', 'checked_in')) AS registered
    FROM tournaments t`

function parseMaps(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

/** Регламент хранится JSON-строкой: битые данные не должны ронять страницу. */
function parseRules(value: string): RuleBlockDto[] {
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((block): block is RuleBlockDto => Boolean(block) && typeof block.title === "string")
      .map((block) => ({
        title: block.title,
        items: Array.isArray(block.items)
          ? block.items.filter((item): item is string => typeof item === "string")
          : [],
      }))
  } catch {
    return []
  }
}

export function teamSizeLabel(size: number) {
  return size === 1 ? "1v1" : `${size}v${size}`
}

export function minutesUntil(iso: string) {
  const target = Date.parse(iso)
  if (!Number.isFinite(target)) return 0
  return Math.max(0, Math.round((target - Date.now()) / 60_000))
}

export function toTournamentDto(
  row: TournamentRow,
  viewerRegistration: RegistrationStatus | null = null,
): TournamentDto {
  return {
    slug: row.slug,
    title: row.title,
    edition: row.edition,
    summary: row.summary,
    teamSize: row.team_size,
    teamSizeLabel: teamSizeLabel(row.team_size),
    bracket: "single",
    status: row.status,
    slots: row.slots,
    registered: row.registered ?? 0,
    startsAt: row.starts_at,
    startsInMinutes: minutesUntil(row.starts_at),
    region: row.region,
    organizer: row.organizer,
    tier: row.tier,
    ruleset: row.ruleset,
    server: row.server,
    maps: parseMaps(row.maps),
    entryFee: row.entry_fee,
    rules: parseRules(row.rules),
    featured: row.featured === 1,
    drawBeforeMinutes: row.draw_before_minutes,
    viewerRegistration,
  }
}

/** Статусы заявок текущего зрителя одним запросом — без N+1. */
function viewerRegistrations(viewerId: number | undefined, ids: number[]) {
  const map = new Map<number, RegistrationStatus>()
  if (!viewerId || ids.length === 0) return map

  const placeholders = ids.map(() => "?").join(", ")
  const rows = db
    .prepare(
      `SELECT tournament_id, status FROM registrations
        WHERE player_id = ? AND tournament_id IN (${placeholders})`,
    )
    .all(viewerId, ...ids) as { tournament_id: number; status: RegistrationStatus }[]

  for (const row of rows) map.set(row.tournament_id, row.status)
  return map
}

export type TournamentSort = "start" | "slots" | "title"

export function listTournaments(options: {
  status?: TournamentStatus | "open"
  q?: string
  sort?: TournamentSort
  limit: number
  offset: number
  viewerId?: number
  includeDrafts?: boolean
}): { items: TournamentDto[]; total: number } {
  const where: string[] = []
  const params: unknown[] = []

  if (!options.includeDrafts) where.push("t.status != 'draft'")

  if (options.status === "open") {
    where.push("t.status IN ('registration', 'checkin')")
  } else if (options.status) {
    where.push("t.status = ?")
    params.push(options.status)
  }

  if (options.q) {
    where.push("(t.title LIKE ? OR t.edition LIKE ? OR t.organizer LIKE ?)")
    const needle = `%${options.q}%`
    params.push(needle, needle, needle)
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM tournaments t ${clause}`).get(...params) as { n: number }
  ).n

  const order =
    options.sort === "slots"
      ? "registered * 1.0 / MAX(t.slots, 1) DESC"
      : options.sort === "title"
        ? "t.title ASC"
        : "t.starts_at ASC"

  const rows = db
    .prepare(`${SELECT} ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...params, options.limit, options.offset) as TournamentRow[]

  const mine = viewerRegistrations(
    options.viewerId,
    rows.map((row) => row.id),
  )

  return {
    items: rows.map((row) => toTournamentDto(row, mine.get(row.id) ?? null)),
    total,
  }
}

export function findTournamentRow(slug: string): TournamentRow | undefined {
  return db.prepare(`${SELECT} WHERE t.slug = ?`).get(slug) as TournamentRow | undefined
}

export function requireTournamentRow(slug: string): TournamentRow {
  const row = findTournamentRow(slug)
  if (!row) throw ApiError.notFound("Турнир не найден")
  return row
}

export function getTournament(slug: string, viewerId?: number): TournamentDto {
  const row = requireTournamentRow(slug)
  const mine = viewerRegistrations(viewerId, [row.id])
  return toTournamentDto(row, mine.get(row.id) ?? null)
}

export function getFeatured(viewerId?: number): TournamentDto | null {
  const row = (db
    .prepare(
      `${SELECT} WHERE t.status IN ('registration', 'checkin', 'live')
        ORDER BY t.featured DESC, t.starts_at ASC LIMIT 1`,
    )
    .get() ?? null) as TournamentRow | null

  if (!row) return null
  const mine = viewerRegistrations(viewerId, [row.id])
  return toTournamentDto(row, mine.get(row.id) ?? null)
}

export interface TournamentInput {
  title: string
  edition?: string
  summary?: string
  teamSize?: number
  status?: TournamentStatus
  slots?: number
  startsAt: string
  region?: string
  organizer?: string
  tier?: "S" | "A" | "B"
  ruleset?: string
  server?: string
  maps?: string[]
  entryFee?: number
  rules?: RuleBlockDto[]
  featured?: boolean
  drawBeforeMinutes?: number
}

function slugify(title: string) {
  const translit: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e",
    ю: "yu", я: "ya", ь: "", ъ: "",
  }
  const base = title
    .toLowerCase()
    .split("")
    .map((char) => translit[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  return base || `tournament-${Date.now()}`
}

function uniqueSlug(title: string) {
  const base = slugify(title)
  let candidate = base
  let n = 2
  while (db.prepare(`SELECT 1 FROM tournaments WHERE slug = ?`).get(candidate)) {
    candidate = `${base}-${n++}`
  }
  return candidate
}

export function createTournament(input: TournamentInput): TournamentDto {
  const slug = uniqueSlug(input.title)
  db.prepare(
    `INSERT INTO tournaments
       (slug, title, edition, summary, team_size, bracket, status, slots, starts_at,
        region, organizer, tier, ruleset, server, maps, entry_fee, rules, featured,
        draw_before_minutes)
     VALUES (?, ?, ?, ?, ?, 'single', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    slug,
    input.title,
    input.edition ?? "",
    input.summary ?? "",
    input.teamSize ?? 5,
    input.status ?? "draft",
    input.slots ?? 40,
    input.startsAt,
    input.region ?? "Кыргызстан",
    input.organizer ?? "MAJOR KG",
    input.tier ?? "B",
    input.ruleset ?? "MR12 · OT MR3 · 128 tick",
    input.server ?? "Bishkek · 128 tick",
    JSON.stringify(input.maps?.length ? input.maps : ACTIVE_MAP_POOL),
    input.entryFee ?? DEFAULT_ENTRY_FEE,
    JSON.stringify(input.rules?.length ? input.rules : DEFAULT_RULES),
    input.featured ? 1 : 0,
    input.drawBeforeMinutes ?? 20,
  )
  return getTournament(slug)
}

export function updateTournament(slug: string, patch: Partial<TournamentInput>): TournamentDto {
  const row = requireTournamentRow(slug)

  const fields: string[] = []
  const params: unknown[] = []
  const set = (column: string, value: unknown) => {
    fields.push(`${column} = ?`)
    params.push(value)
  }

  if (patch.title !== undefined) set("title", patch.title)
  if (patch.edition !== undefined) set("edition", patch.edition)
  if (patch.summary !== undefined) set("summary", patch.summary)
  if (patch.teamSize !== undefined) set("team_size", patch.teamSize)
  if (patch.status !== undefined) set("status", patch.status)
  if (patch.slots !== undefined) set("slots", patch.slots)
  if (patch.startsAt !== undefined) set("starts_at", patch.startsAt)
  if (patch.region !== undefined) set("region", patch.region)
  if (patch.organizer !== undefined) set("organizer", patch.organizer)
  if (patch.tier !== undefined) set("tier", patch.tier)
  if (patch.ruleset !== undefined) set("ruleset", patch.ruleset)
  if (patch.server !== undefined) set("server", patch.server)
  if (patch.maps !== undefined) set("maps", JSON.stringify(patch.maps))
  if (patch.entryFee !== undefined) set("entry_fee", patch.entryFee)
  if (patch.rules !== undefined) set("rules", JSON.stringify(patch.rules))
  if (patch.featured !== undefined) set("featured", patch.featured ? 1 : 0)
  if (patch.drawBeforeMinutes !== undefined) set("draw_before_minutes", patch.drawBeforeMinutes)

  if (fields.length === 0) return getTournament(slug)

  params.push(row.id)
  db.prepare(`UPDATE tournaments SET ${fields.join(", ")} WHERE id = ?`).run(...params)
  return getTournament(slug)
}

export function deleteTournament(slug: string) {
  const result = db.prepare(`DELETE FROM tournaments WHERE slug = ?`).run(slug)
  if (result.changes === 0) throw ApiError.notFound("Турнир не найден")
}
