import { db } from "../db/index.js"
import { queryServer, type ServerInfo } from "../lib/a2s.js"
import { ApiError } from "../lib/http.js"
import { rconExec, RconError } from "../lib/rcon.js"
import { findMatchRow } from "./bracket.js"
import { getVeto } from "./veto.js"

/**
 * Реестр игровых серверов.
 *
 * Состояние спрашивается у самого сервера по A2S — тем же способом, каким
 * это делает браузер Steam. Значит, в интерфейсе видно не то, что кто-то
 * когда-то вписал руками, а что на сервере происходит сейчас.
 *
 * Пароль RCON в ответы API не попадает никогда: наружу уходит только
 * признак, настроен он или нет.
 */

export interface ServerDto {
  id: number
  name: string
  host: string
  port: number
  location: string
  public: boolean
  active: boolean
  note: string
  /** Есть ли пароль RCON. Сам пароль наружу не отдается. */
  rconConfigured: boolean
  /** Строка для консоли игрока. */
  connect: string
  status: ServerStatusDto
}

export interface ServerStatusDto {
  online: boolean
  map: string | null
  players: number
  maxPlayers: number
  ping: number | null
  checkedAt: string
}

interface ServerRow {
  id: number
  name: string
  host: string
  port: number
  rcon_password: string | null
  location: string
  public: number
  active: number
  note: string
}

/**
 * Кэш состояния.
 *
 * A2S идет по UDP и может ждать таймаут. Опрашивать сервера на каждый
 * запрос страницы значит подвесить её на секунды, когда сервер лежит —
 * а лежит он как раз тогда, когда на страницу и смотрят.
 */
const STATUS_TTL_MS = 15_000
const statusCache = new Map<number, { status: ServerStatusDto; at: number }>()

function offline(): ServerStatusDto {
  return {
    online: false,
    map: null,
    players: 0,
    maxPlayers: 0,
    ping: null,
    checkedAt: new Date().toISOString(),
  }
}

function toStatus(info: ServerInfo | null): ServerStatusDto {
  if (!info) return offline()
  return {
    online: true,
    map: info.map,
    // Боты не игроки: в счетчике на сайте они только путают.
    players: Math.max(0, info.players - info.bots),
    maxPlayers: info.maxPlayers,
    ping: info.ping,
    checkedAt: new Date().toISOString(),
  }
}

async function statusOf(row: ServerRow): Promise<ServerStatusDto> {
  const cached = statusCache.get(row.id)
  if (cached && Date.now() - cached.at < STATUS_TTL_MS) return cached.status

  const status = toStatus(await queryServer(row.host, row.port))
  statusCache.set(row.id, { status, at: Date.now() })
  return status
}

function toDto(row: ServerRow, status: ServerStatusDto): ServerDto {
  return {
    id: row.id,
    name: row.name,
    host: row.host,
    port: row.port,
    location: row.location,
    public: row.public === 1,
    active: row.active === 1,
    note: row.note,
    rconConfigured: Boolean(row.rcon_password),
    connect: `connect ${row.host}:${row.port}`,
    status,
  }
}

const SELECT = `SELECT id, name, host, port, rcon_password, location, public, active, note FROM servers`

/** Сервера опрашиваются параллельно: ждать их последовательно незачем. */
async function withStatus(rows: ServerRow[]): Promise<ServerDto[]> {
  const statuses = await Promise.all(rows.map((row) => statusOf(row)))
  return rows.map((row, index) => toDto(row, statuses[index] ?? offline()))
}

export function listServerRows(options: { onlyPublic?: boolean } = {}): ServerRow[] {
  const clause = options.onlyPublic ? `WHERE active = 1 AND public = 1` : ``
  return db.prepare(`${SELECT} ${clause} ORDER BY active DESC, name`).all() as ServerRow[]
}

export function listServers(options: { onlyPublic?: boolean } = {}) {
  return withStatus(listServerRows(options))
}

function requireRow(id: number): ServerRow {
  const row = db.prepare(`${SELECT} WHERE id = ?`).get(id) as ServerRow | undefined
  if (!row) throw ApiError.notFound("Сервер не найден")
  return row
}

export async function getServer(id: number): Promise<ServerDto> {
  const row = requireRow(id)
  return toDto(row, await statusOf(row))
}

export interface ServerInput {
  name: string
  host: string
  port?: number
  rconPassword?: string | null
  location?: string
  public?: boolean
  active?: boolean
  note?: string
}

export async function createServer(input: ServerInput): Promise<ServerDto> {
  const port = input.port ?? 27015
  if (db.prepare(`SELECT 1 FROM servers WHERE host = ? AND port = ?`).get(input.host, port)) {
    throw ApiError.conflict("Такой адрес уже добавлен")
  }

  const info = db
    .prepare(
      `INSERT INTO servers (name, host, port, rcon_password, location, public, active, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name.trim(),
      input.host.trim(),
      port,
      input.rconPassword?.trim() || null,
      input.location?.trim() || "Бишкек",
      input.public === false ? 0 : 1,
      input.active === false ? 0 : 1,
      input.note?.trim() ?? "",
    )

  return getServer(Number(info.lastInsertRowid))
}

export async function updateServer(id: number, patch: Partial<ServerInput>): Promise<ServerDto> {
  requireRow(id)

  const fields: string[] = []
  const params: unknown[] = []
  const set = (column: string, value: unknown) => {
    fields.push(`${column} = ?`)
    params.push(value)
  }

  if (patch.name !== undefined) set("name", patch.name.trim())
  if (patch.host !== undefined) set("host", patch.host.trim())
  if (patch.port !== undefined) set("port", patch.port)
  if (patch.location !== undefined) set("location", patch.location.trim())
  if (patch.public !== undefined) set("public", patch.public ? 1 : 0)
  if (patch.active !== undefined) set("active", patch.active ? 1 : 0)
  if (patch.note !== undefined) set("note", patch.note.trim())
  // Пустая строка означает «убрать пароль», undefined — «не трогать».
  if (patch.rconPassword !== undefined) {
    set("rcon_password", patch.rconPassword?.trim() || null)
  }

  if (fields.length > 0) {
    params.push(id)
    db.prepare(`UPDATE servers SET ${fields.join(", ")} WHERE id = ?`).run(...params)
    statusCache.delete(id)
  }

  return getServer(id)
}

export function deleteServer(id: number) {
  const result = db.prepare(`DELETE FROM servers WHERE id = ?`).run(id)
  if (result.changes === 0) throw ApiError.notFound("Сервер не найден")
  statusCache.delete(id)
}

/** Принудительная проверка — кнопка «проверить» в админке. */
export async function refreshServer(id: number): Promise<ServerDto> {
  statusCache.delete(id)
  return getServer(id)
}

// ─────────────────────── Подготовка матча ────────────────────────────

export function assignServer(matchId: number, serverId: number | null) {
  const match = findMatchRow(matchId)
  if (!match) throw ApiError.notFound("Матч не найден")
  if (serverId !== null) requireRow(serverId)

  db.prepare(
    `UPDATE matches SET server_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
  ).run(serverId, matchId)
}

/** Пароль лобби: короткий, читается вслух в голосовом чате без ошибок. */
function lobbyPassword(matchId: number): string {
  return `mkg${String(matchId).padStart(3, "0")}`
}

export interface MatchConfig {
  matchId: number
  server: { id: number; name: string; connect: string } | null
  maps: string[]
  password: string
  /** Команды, которые уйдут на сервер по RCON. */
  commands: string[]
  /** То же самое для ручной вставки в консоль сервера. */
  script: string
}

/**
 * Конфиг матча из результата вето.
 *
 * Первая карта ставится сразу, остальные остаются в подсказке судье:
 * переключать их по ходу серии все равно вручную, зато видно, что дальше.
 */
export function buildMatchConfig(matchId: number): MatchConfig {
  const match = findMatchRow(matchId)
  if (!match) throw ApiError.notFound("Матч не найден")

  const veto = getVeto(matchId)
  if (!veto.finished || veto.maps.length === 0) {
    throw ApiError.conflict("Вето еще не завершено — карты неизвестны")
  }

  const password = lobbyPassword(matchId)
  const first = veto.maps[0]!

  const commands = [
    `sv_password ${password}`,
    `game_mode 1`,
    `game_type 0`,
    `mp_maxrounds 24`,
    `mp_overtime_enable 1`,
    `mp_overtime_maxrounds 6`,
    `mp_match_end_restart 1`,
    `changelevel ${first}`,
  ]

  const row = match.server_id
    ? (db.prepare(`${SELECT} WHERE id = ?`).get(match.server_id) as ServerRow | undefined)
    : undefined

  return {
    matchId,
    server: row ? { id: row.id, name: row.name, connect: `connect ${row.host}:${row.port}` } : null,
    maps: veto.maps,
    password,
    commands,
    script: commands.join("\n"),
  }
}

export interface PushResult {
  sent: string[]
  output: string[]
}

/** Выкатить конфиг на назначенный сервер по RCON. */
export async function pushMatchConfig(matchId: number): Promise<PushResult> {
  const config = buildMatchConfig(matchId)
  const match = findMatchRow(matchId)

  if (!match?.server_id) throw ApiError.conflict("Матчу не назначен сервер")
  const row = requireRow(match.server_id)

  if (!row.rcon_password) {
    throw ApiError.conflict(`У сервера «${row.name}» не задан пароль RCON`)
  }

  try {
    const output = await rconExec(row.host, row.port, row.rcon_password, config.commands)
    return { sent: config.commands, output }
  } catch (error) {
    if (error instanceof RconError) throw ApiError.conflict(error.message)
    throw error
  }
}
