import { db, tx } from "../db/index.js"
import { ApiError } from "../lib/http.js"
import type { BracketRoundDto, MatchDto, MatchSideDto, MatchState } from "../types.js"
import { requireTournamentRow, type TournamentRow } from "./tournaments.js"

/**
 * Сетка только верхняя — single elimination. Нижней сетки и гранд-финала
 * в системе нет: проигравший выбывает сразу.
 *
 * Раунды нумеруются от 0 (первый раунд) до финала. Матч раунда r,
 * позиции p принимает победителей матчей (r-1, 2p) и (r-1, 2p+1) —
 * связь неявная, по индексам, отдельных ссылок в схеме не требуется.
 */

interface MatchRow {
  id: number
  tournament_id: number
  round: number
  position: number
  lineup_a_id: number | null
  lineup_b_id: number | null
  score_a: number | null
  score_b: number | null
  winner: "a" | "b" | null
  state: MatchState
  format: string
  scheduled_at: string | null
  note: string
  proof: number
  tournament_slug?: string
  tournament_title?: string
  tag_a?: string | null
  name_a?: string | null
  seed_a?: number | null
  tag_b?: string | null
  name_b?: string | null
  seed_b?: number | null
}

const MATCH_SELECT = `
  SELECT m.*,
         t.slug  AS tournament_slug,
         t.title AS tournament_title,
         la.tag  AS tag_a, la.name AS name_a, la.seed AS seed_a,
         lb.tag  AS tag_b, lb.name AS name_b, lb.seed AS seed_b
    FROM matches m
    JOIN tournaments t  ON t.id = m.tournament_id
    LEFT JOIN lineups la ON la.id = m.lineup_a_id
    LEFT JOIN lineups lb ON lb.id = m.lineup_b_id`

/** Имя раунда считается от конца: финал, 1/2, 1/4, 1/8… */
export function roundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round
  if (fromEnd === 1) return "Финал"
  if (fromEnd === 2) return "Полуфинал"
  const share = 2 ** (fromEnd - 1)
  return `1/${share}`
}

function side(
  lineupId: number | null,
  tag: string | null | undefined,
  name: string | null | undefined,
  seed: number | null | undefined,
  score: number | null,
): MatchSideDto | null {
  if (!lineupId || !tag || !name) return null
  return { lineupId, tag, name, seed: seed ?? 0, score }
}

export function toMatchDto(row: MatchRow, totalRounds: number, maps: MatchDto["maps"] = []): MatchDto {
  return {
    id: row.id,
    tournamentSlug: row.tournament_slug ?? "",
    tournamentTitle: row.tournament_title ?? "",
    round: row.round,
    position: row.position,
    roundName: roundName(row.round, totalRounds),
    a: side(row.lineup_a_id, row.tag_a, row.name_a, row.seed_a, row.score_a),
    b: side(row.lineup_b_id, row.tag_b, row.name_b, row.seed_b, row.score_b),
    winner: row.winner,
    state: row.state,
    format: row.format,
    scheduledAt: row.scheduled_at,
    note: row.note,
    proof: row.proof === 1,
    maps,
  }
}

function loadMaps(matchIds: number[]): Map<number, MatchDto["maps"]> {
  const grouped = new Map<number, MatchDto["maps"]>()
  if (matchIds.length === 0) return grouped

  const rows = db
    .prepare(
      `SELECT match_id, map, score_a, score_b FROM match_maps
        WHERE match_id IN (${matchIds.map(() => "?").join(", ")})
        ORDER BY ordinal`,
    )
    .all(...matchIds) as { match_id: number; map: string; score_a: number; score_b: number }[]

  for (const row of rows) {
    const list = grouped.get(row.match_id) ?? []
    list.push({ map: row.map, scoreA: row.score_a, scoreB: row.score_b })
    grouped.set(row.match_id, list)
  }
  return grouped
}

function totalRoundsOf(tournamentId: number): number {
  const row = db
    .prepare(`SELECT MAX(round) AS max_round FROM matches WHERE tournament_id = ?`)
    .get(tournamentId) as { max_round: number | null }
  return (row.max_round ?? -1) + 1
}

/** Верхняя сетка целиком, сгруппированная по раундам. */
export function getBracket(slug: string): BracketRoundDto[] {
  const tournament = requireTournamentRow(slug)
  const rows = db
    .prepare(`${MATCH_SELECT} WHERE m.tournament_id = ? ORDER BY m.round, m.position`)
    .all(tournament.id) as MatchRow[]

  if (rows.length === 0) return []

  const totalRounds = totalRoundsOf(tournament.id)
  const maps = loadMaps(rows.map((row) => row.id))

  const rounds = new Map<number, BracketRoundDto>()
  for (const row of rows) {
    const key = row.round
    const bucket = rounds.get(key) ?? {
      id: `ub-r${key + 1}`,
      name: roundName(key, totalRounds),
      matches: [],
    }
    bucket.matches.push(toMatchDto(row, totalRounds, maps.get(row.id) ?? []))
    rounds.set(key, bucket)
  }

  return [...rounds.entries()].sort(([a], [b]) => a - b).map(([, round]) => round)
}

function seriesFormat(round: number, totalRounds: number) {
  const fromEnd = totalRounds - round
  // Финал и полуфинал — BO3, ранние раунды — BO1.
  return fromEnd <= 2 ? "BO3" : "BO1"
}

/**
 * Строит сетку из посеянных составов. Число слотов округляется вверх до
 * степени двойки; лишние слоты становятся byes — состав с высоким посевом
 * проходит дальше автоматически.
 */
export function generateBracket(slug: string): BracketRoundDto[] {
  const tournament = requireTournamentRow(slug)

  const lineups = db
    .prepare(`SELECT id, seed FROM lineups WHERE tournament_id = ? ORDER BY seed`)
    .all(tournament.id) as { id: number; seed: number }[]

  if (lineups.length < 2) {
    throw ApiError.conflict("Сначала проведите жеребьевку: нужно минимум два состава")
  }

  const size = 2 ** Math.ceil(Math.log2(lineups.length))
  const totalRounds = Math.log2(size)

  // Классический посев 1–N: 1 играет с последним, 2 — с предпоследним и т.д.
  const order = seedOrder(size)
  const slots: (number | null)[] = order.map((seed) => lineups[seed - 1]?.id ?? null)

  tx(() => {
    db.prepare(`DELETE FROM matches WHERE tournament_id = ?`).run(tournament.id)

    const insert = db.prepare(
      `INSERT INTO matches (tournament_id, round, position, lineup_a_id, lineup_b_id, state, format, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    // Первый раунд.
    const firstRound: { id: number; winner: number | null }[] = []
    for (let position = 0; position < size / 2; position += 1) {
      const a = slots[position * 2] ?? null
      const b = slots[position * 2 + 1] ?? null
      // Bye: если соперника нет, матч сразу закрыт.
      const bye = Boolean(a) !== Boolean(b)
      const info = insert.run(
        tournament.id,
        0,
        position,
        a,
        b,
        bye ? "done" : "pending",
        seriesFormat(0, totalRounds),
        bye ? "Проход без игры" : "",
      )
      const matchId = Number(info.lastInsertRowid)
      if (bye) {
        const winner = a ? "a" : "b"
        db.prepare(`UPDATE matches SET winner = ? WHERE id = ?`).run(winner, matchId)
      }
      firstRound.push({ id: matchId, winner: bye ? (a ?? b) : null })
    }

    // Последующие раунды: стороны подставляются по мере результатов.
    let previous = firstRound
    for (let round = 1; round < totalRounds; round += 1) {
      const current: { id: number; winner: number | null }[] = []
      for (let position = 0; position < size / 2 ** (round + 1); position += 1) {
        const a = previous[position * 2]?.winner ?? null
        const b = previous[position * 2 + 1]?.winner ?? null
        const info = insert.run(
          tournament.id,
          round,
          position,
          a,
          b,
          "pending",
          seriesFormat(round, totalRounds),
          "",
        )
        current.push({ id: Number(info.lastInsertRowid), winner: null })
      }
      previous = current
    }
  })

  return getBracket(slug)
}

/**
 * Порядок посева для сетки размера size: [1, 16, 8, 9, 5, 12, 4, 13, …].
 * Строится удвоением — на каждом шаге пара (n) дополняется до (size + 1).
 */
function seedOrder(size: number): number[] {
  let order = [1, 2]
  while (order.length < size) {
    const next: number[] = []
    const bound = order.length * 2 + 1
    for (const seed of order) {
      next.push(seed, bound - seed)
    }
    order = next
  }
  return order
}

/** Проводит победителя матча в следующий раунд. */
export function propagateWinner(tournament: TournamentRow, match: MatchRow) {
  if (!match.winner) return

  const winnerId = match.winner === "a" ? match.lineup_a_id : match.lineup_b_id
  if (!winnerId) return

  const nextRound = match.round + 1
  const nextPosition = Math.floor(match.position / 2)
  const column = match.position % 2 === 0 ? "lineup_a_id" : "lineup_b_id"

  const next = db
    .prepare(`SELECT id FROM matches WHERE tournament_id = ? AND round = ? AND position = ?`)
    .get(tournament.id, nextRound, nextPosition) as { id: number } | undefined

  if (!next) return
  db.prepare(`UPDATE matches SET ${column} = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`).run(
    winnerId,
    next.id,
  )
}

export function findMatchRow(id: number): MatchRow | undefined {
  return db.prepare(`${MATCH_SELECT} WHERE m.id = ?`).get(id) as MatchRow | undefined
}

export function getMatch(id: number): MatchDto {
  const row = findMatchRow(id)
  if (!row) throw ApiError.notFound("Матч не найден")
  const maps = loadMaps([row.id])
  return toMatchDto(row, totalRoundsOf(row.tournament_id), maps.get(row.id) ?? [])
}

export function listMatches(options: {
  slug?: string
  state?: MatchState
  limit: number
  offset: number
}): MatchDto[] {
  const where: string[] = []
  const params: unknown[] = []

  if (options.slug) {
    where.push("t.slug = ?")
    params.push(options.slug)
  }
  if (options.state) {
    where.push("m.state = ?")
    params.push(options.state)
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const rows = db
    .prepare(`${MATCH_SELECT} ${clause} ORDER BY m.updated_at DESC, m.round DESC LIMIT ? OFFSET ?`)
    .all(...params, options.limit, options.offset) as MatchRow[]

  const maps = loadMaps(rows.map((row) => row.id))
  const totals = new Map<number, number>()
  for (const row of rows) {
    if (!totals.has(row.tournament_id)) totals.set(row.tournament_id, totalRoundsOf(row.tournament_id))
  }

  return rows.map((row) =>
    toMatchDto(row, totals.get(row.tournament_id) ?? 1, maps.get(row.id) ?? []),
  )
}
