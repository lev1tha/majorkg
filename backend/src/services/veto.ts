import { db } from "../db/index.js"
import { ApiError } from "../lib/http.js"
import { findMatchRow } from "./bracket.js"
import { requireTournamentRow } from "./tournaments.js"

/**
 * Вето карт — ban/pick перед серией.
 *
 * Зачем на платформе: до вето организатор не знает, какие карты готовить
 * на сервере, а команды — во что играют. Раньше это решалось перепиской;
 * здесь порядок задан правилом и виден обеим сторонам.
 *
 * В базе лежат только сделанные ходы. План — кто банит, кто пикает и в
 * каком порядке — выводится из формата серии и размера пула: правило
 * однозначное, дублировать его в таблице незачем.
 *
 * Первым ходит сторона с лучшим посевом. Это не жребий: посев уже
 * заработан средним рейтингом состава, и право первого бана — его
 * естественное следствие.
 */

export type VetoAction = "ban" | "pick"
export type VetoSide = "a" | "b"

export interface VetoStep {
  ordinal: number
  action: VetoAction
  side: VetoSide
  /** Заполнен, когда ход сделан. */
  map: string | null
}

export interface VetoStateDto {
  matchId: number
  format: string
  pool: string[]
  /** Карты, которые еще можно выбрать. */
  available: string[]
  steps: VetoStep[]
  /** Текущий ход или null, если вето закончено. */
  turn: VetoStep | null
  finished: boolean
  /** Итоговый порядок карт серии — то, что готовится на сервере. */
  maps: string[]
  /** Последняя оставшаяся карта: она же решающая. */
  decider: string | null
  /** Может ли текущий зритель сделать ход. */
  viewerSide: VetoSide | null
  sides: {
    a: { lineupId: number; tag: string; name: string; seed: number } | null
    b: { lineupId: number; tag: string; name: string; seed: number } | null
  }
}

/** Сколько карт играется в серии этого формата. */
function seriesLength(format: string): number {
  const match = /BO\s*(\d+)/i.exec(format)
  const n = match?.[1] ? Number(match[1]) : 1
  return Number.isFinite(n) && n > 0 ? n : 1
}

/**
 * План вето.
 *
 * Пул сокращается банами до нужного числа карт, пики расставляют порядок.
 * Классическая схема CS2: для BO1 — банят до последней карты; для BO3 —
 * ban-ban-pick-pick-ban-ban и решающая; для BO5 — ban-ban, затем четыре
 * пика и решающая.
 *
 * @param first сторона, которая ходит первой (лучший посев)
 */
export function vetoPlan(
  format: string,
  poolSize: number,
  first: VetoSide = "a",
): { action: VetoAction; side: VetoSide }[] {
  const series = Math.min(seriesLength(format), Math.max(1, poolSize))
  // Пиков ровно на одну меньше длины серии: последняя карта — решающая.
  const picks = Math.max(0, series - 1)
  const bans = Math.max(0, poolSize - series)

  const other = (side: VetoSide): VetoSide => (side === "a" ? "b" : "a")
  const steps: { action: VetoAction; side: VetoSide }[] = []
  let side = first

  // Первая пара банов идет всегда: она отсекает заведомо чужие карты.
  const openingBans = picks > 0 ? Math.min(2, bans) : bans
  for (let i = 0; i < openingBans; i += 1) {
    steps.push({ action: "ban", side })
    side = other(side)
  }

  for (let i = 0; i < picks; i += 1) {
    steps.push({ action: "pick", side })
    side = other(side)
  }

  for (let i = 0; i < bans - openingBans; i += 1) {
    steps.push({ action: "ban", side })
    side = other(side)
  }

  return steps
}

interface VetoRow {
  ordinal: number
  action: VetoAction
  side: VetoSide
  map: string
}

interface SideInfo {
  lineupId: number
  tag: string
  name: string
  seed: number
}

function sideInfo(lineupId: number | null): SideInfo | null {
  if (!lineupId) return null
  const row = db
    .prepare(`SELECT id, tag, name, seed FROM lineups WHERE id = ?`)
    .get(lineupId) as { id: number; tag: string; name: string; seed: number } | undefined
  return row ? { lineupId: row.id, tag: row.tag, name: row.name, seed: row.seed } : null
}

/** Состав, в котором играет игрок, — по нему определяется право хода. */
function sideOfPlayer(
  playerId: number | undefined,
  a: SideInfo | null,
  b: SideInfo | null,
): VetoSide | null {
  if (!playerId) return null

  const inLineup = (lineupId: number) =>
    Boolean(
      db
        .prepare(`SELECT 1 FROM lineup_members WHERE lineup_id = ? AND player_id = ?`)
        .get(lineupId, playerId),
    )

  if (a && inLineup(a.lineupId)) return "a"
  if (b && inLineup(b.lineupId)) return "b"
  return null
}

function parsePool(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

export function getVeto(matchId: number, viewerId?: number): VetoStateDto {
  const match = findMatchRow(matchId)
  if (!match) throw ApiError.notFound("Матч не найден")

  const tournament = db
    .prepare(`SELECT maps FROM tournaments WHERE id = ?`)
    .get(match.tournament_id) as { maps: string } | undefined

  const pool = parsePool(tournament?.maps ?? "[]")
  const a = sideInfo(match.lineup_a_id)
  const b = sideInfo(match.lineup_b_id)

  // Первым ходит лучший посев: меньший номер сильнее.
  const first: VetoSide = a && b && b.seed < a.seed ? "b" : "a"
  const plan = vetoPlan(match.format, pool.length, first)

  const moves = db
    .prepare(`SELECT ordinal, action, side, map FROM match_veto WHERE match_id = ? ORDER BY ordinal`)
    .all(matchId) as VetoRow[]

  const steps: VetoStep[] = plan.map((step, index) => ({
    ordinal: index,
    action: step.action,
    side: step.side,
    map: moves.find((move) => move.ordinal === index)?.map ?? null,
  }))

  const used = new Set(moves.map((move) => move.map))
  const available = pool.filter((map) => !used.has(map))
  const turn = steps.find((step) => step.map === null) ?? null
  const finished = turn === null && pool.length > 0

  // Порядок серии: пики в порядке выбора, решающая — оставшаяся карта.
  const picked = steps.filter((step) => step.action === "pick" && step.map).map((step) => step.map!)
  const decider = finished ? (available[0] ?? null) : null

  return {
    matchId,
    format: match.format,
    pool,
    available,
    steps,
    turn,
    finished,
    maps: decider ? [...picked, decider] : picked,
    decider,
    viewerSide: sideOfPlayer(viewerId, a, b),
    sides: { a, b },
  }
}

export interface VetoMoveInput {
  matchId: number
  map: string
  /** Игрок, делающий ход. Не указан — значит ходит организатор. */
  playerId?: number
  /** Организатор может сходить за сторону, если состав не выходит на связь. */
  asAdmin?: boolean
}

export function makeVetoMove(input: VetoMoveInput): VetoStateDto {
  const state = getVeto(input.matchId, input.playerId)

  if (!state.sides.a || !state.sides.b) {
    throw ApiError.conflict("В матче еще нет обеих сторон")
  }
  if (state.pool.length === 0) {
    throw ApiError.conflict("У турнира не задан пул карт")
  }
  if (state.finished || !state.turn) {
    throw ApiError.conflict("Вето уже завершено")
  }
  if (!state.available.includes(input.map)) {
    throw ApiError.badRequest("Эта карта недоступна: её уже выбрали или её нет в пуле")
  }

  // Право хода: участник стороны, чей сейчас ход. Организатор — всегда.
  if (!input.asAdmin) {
    if (!state.viewerSide) throw ApiError.forbidden("Вето делают участники матча")
    if (state.viewerSide !== state.turn.side) throw ApiError.conflict("Сейчас ход соперника")
  }

  db.prepare(
    `INSERT INTO match_veto (match_id, ordinal, action, side, map, by_player_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    input.matchId,
    state.turn.ordinal,
    state.turn.action,
    state.turn.side,
    input.map,
    input.playerId ?? null,
  )

  const next = getVeto(input.matchId, input.playerId)

  // Вето закончилось — фиксируем карты в протоколе, чтобы судье не
  // пришлось вбивать их руками.
  if (next.finished && next.maps.length > 0) {
    const existing = db
      .prepare(`SELECT COUNT(*) AS n FROM match_maps WHERE match_id = ?`)
      .get(input.matchId) as { n: number }

    if (existing.n === 0) {
      const insert = db.prepare(
        `INSERT INTO match_maps (match_id, ordinal, map, score_a, score_b) VALUES (?, ?, ?, 0, 0)`,
      )
      next.maps.forEach((map, index) => insert.run(input.matchId, index, map))
    }
  }

  return next
}

/** Сброс вето — если стороны ошиблись или состав заменили. */
export function resetVeto(matchId: number): VetoStateDto {
  const match = findMatchRow(matchId)
  if (!match) throw ApiError.notFound("Матч не найден")
  if (match.state === "done") throw ApiError.conflict("Матч уже сыгран")

  db.prepare(`DELETE FROM match_veto WHERE match_id = ?`).run(matchId)
  // Незаполненный протокол по картам тоже уходит: он был следствием вето.
  db.prepare(
    `DELETE FROM match_maps WHERE match_id = ? AND score_a = 0 AND score_b = 0`,
  ).run(matchId)

  return getVeto(matchId)
}

/** Готовность серверов: что готовить организатору прямо сейчас. */
export function serverQueue(slug: string) {
  const tournament = requireTournamentRow(slug)

  const rows = db
    .prepare(
      `SELECT m.id, m.round, m.position, m.format, m.state,
              la.tag AS tag_a, la.name AS name_a,
              lb.tag AS tag_b, lb.name AS name_b
         FROM matches m
         LEFT JOIN lineups la ON la.id = m.lineup_a_id
         LEFT JOIN lineups lb ON lb.id = m.lineup_b_id
        WHERE m.tournament_id = ?
          AND m.state IN ('pending', 'live')
          AND m.lineup_a_id IS NOT NULL
          AND m.lineup_b_id IS NOT NULL
        ORDER BY m.round, m.position`,
    )
    .all(tournament.id) as {
    id: number
    round: number
    position: number
    format: string
    state: string
    tag_a: string
    name_a: string
    tag_b: string
    name_b: string
  }[]

  return rows.map((row) => {
    const veto = getVeto(row.id)
    return {
      matchId: row.id,
      format: row.format,
      state: row.state,
      a: { tag: row.tag_a, name: row.name_a },
      b: { tag: row.tag_b, name: row.name_b },
      finished: veto.finished,
      maps: veto.maps,
      waitingFor: veto.turn ? veto.turn.side : null,
    }
  })
}
