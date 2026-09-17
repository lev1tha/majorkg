import { db, tx } from "../db/index.js"
import { ApiError } from "../lib/http.js"
import type { AppealDto, MatchDto, MatchState } from "../types.js"
import { findMatchRow, getMatch, propagateWinner } from "./bracket.js"
import { requireTournamentRow, type TournamentRow } from "./tournaments.js"

export interface MapScoreInput {
  map: string
  scoreA: number
  scoreB: number
}

export interface MatchScoreInput {
  maps: MapScoreInput[]
  state?: MatchState
  proof?: boolean
  note?: string
  /** Присудить победу стороне без счета по картам: тех. поражение или проход. */
  awardTo?: "a" | "b"
}

/** Очки сезона за карту и за выигранную серию — основа лидерборда игроков. */
const POINTS_PER_MAP_WIN = 25
const POINTS_PER_SERIES_WIN = 100

function lineupMembers(lineupId: number | null): number[] {
  if (!lineupId) return []
  return (
    db.prepare(`SELECT player_id FROM lineup_members WHERE lineup_id = ?`).all(lineupId) as {
      player_id: number
    }[]
  ).map((row) => row.player_id)
}

/**
 * Записывает протокол матча: карты, счет серии, победителя.
 * Победитель сразу проводится в следующий раунд верхней сетки, а игрокам
 * начисляются очки сезона.
 */
export function scoreMatch(matchId: number, input: MatchScoreInput): MatchDto {
  const row = findMatchRow(matchId)
  if (!row) throw ApiError.notFound("Матч не найден")
  if (!row.lineup_a_id || !row.lineup_b_id) {
    throw ApiError.conflict("В матче еще нет обеих сторон")
  }

  const tournament = db
    .prepare(`SELECT * FROM tournaments WHERE id = ?`)
    .get(row.tournament_id) as TournamentRow

  for (const map of input.maps) {
    if (!Number.isInteger(map.scoreA) || !Number.isInteger(map.scoreB)) {
      throw ApiError.badRequest("Счет карты должен быть целым числом")
    }
    if (map.scoreA < 0 || map.scoreB < 0) {
      throw ApiError.badRequest("Счет карты не может быть отрицательным")
    }
  }

  let scoreA = input.maps.filter((map) => map.scoreA > map.scoreB).length
  let scoreB = input.maps.filter((map) => map.scoreB > map.scoreA).length

  if (input.awardTo) {
    // Присуждение без карт: серия закрывается счетом 1:0.
    scoreA = input.awardTo === "a" ? 1 : 0
    scoreB = input.awardTo === "b" ? 1 : 0
  }

  const state: MatchState = input.state ?? (scoreA === scoreB ? "live" : "done")
  const winner = state === "done" && scoreA !== scoreB ? (scoreA > scoreB ? "a" : "b") : null

  // Протокол можно переписать после апелляции — прежние очки снимаем,
  // иначе повторный ввод счета начислит награду дважды.
  const previousMaps = db
    .prepare(`SELECT map, score_a AS scoreA, score_b AS scoreB FROM match_maps WHERE match_id = ? ORDER BY ordinal`)
    .all(matchId) as MapScoreInput[]
  const previousWinner = row.winner

  return tx(() => {
    db.prepare(
      `UPDATE matches
          SET score_a = ?, score_b = ?, winner = ?, state = ?, proof = ?, note = ?,
              updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE id = ?`,
    ).run(
      scoreA,
      scoreB,
      winner,
      state,
      input.proof ? 1 : row.proof,
      input.note ?? row.note,
      matchId,
    )

    db.prepare(`DELETE FROM match_maps WHERE match_id = ?`).run(matchId)
    const insertMap = db.prepare(
      `INSERT INTO match_maps (match_id, ordinal, map, score_a, score_b) VALUES (?, ?, ?, ?, ?)`,
    )
    input.maps.forEach((map, index) => {
      insertMap.run(matchId, index, map.map, map.scoreA, map.scoreB)
    })

    if (previousWinner) {
      applyPoints(row.lineup_a_id!, row.lineup_b_id!, previousMaps, previousWinner, -1)
    }
    if (winner) {
      const updated = findMatchRow(matchId)
      if (updated) propagateWinner(tournament, updated)
      applyPoints(row.lineup_a_id!, row.lineup_b_id!, input.maps, winner, 1)
    }

    return getMatch(matchId)
  })
}

/**
 * Начисление очков сезона игрокам обеих сторон.
 * @param sign 1 — начислить, -1 — снять (пересчет протокола после апелляции).
 */
function applyPoints(
  lineupA: number,
  lineupB: number,
  maps: MapScoreInput[],
  winner: "a" | "b",
  sign: 1 | -1,
) {
  const mapWinsA = maps.filter((map) => map.scoreA > map.scoreB).length
  const mapWinsB = maps.filter((map) => map.scoreB > map.scoreA).length
  const played = maps.length

  const bump = db.prepare(
    `UPDATE players
        SET points      = MAX(0, points + ?),
            maps_played = MAX(0, maps_played + ?),
            matches     = MAX(0, matches + ?),
            trend       = ?
      WHERE id = ?`,
  )

  const sides = [
    { members: lineupMembers(lineupA), mapWins: mapWinsA, won: winner === "a" },
    { members: lineupMembers(lineupB), mapWins: mapWinsB, won: winner === "b" },
  ]

  for (const side of sides) {
    const delta = side.mapWins * POINTS_PER_MAP_WIN + (side.won ? POINTS_PER_SERIES_WIN : 0)
    for (const id of side.members) {
      bump.run(sign * delta, sign * played, sign, side.won ? "up" : "down", id)
    }
  }
}

/**
 * Объявить победителя матча одним действием.
 *
 * Судья смотрит в сетку и отмечает, кто прошел дальше: счет по картам при
 * этом не обязателен — серия закрывается 1:0. Если протокол по картам уже
 * введен, он сохраняется, а пересчитывается только победитель.
 */
export function declareWinner(matchId: number, winner: "a" | "b", note?: string): MatchDto {
  const row = findMatchRow(matchId)
  if (!row) throw ApiError.notFound("Матч не найден")

  const existing = db
    .prepare(
      `SELECT map, score_a AS scoreA, score_b AS scoreB FROM match_maps
        WHERE match_id = ? ORDER BY ordinal`,
    )
    .all(matchId) as MapScoreInput[]

  // Карты уже введены и сходятся с решением судьи — оставляем протокол как есть.
  const mapsAgree =
    existing.length > 0 &&
    (winner === "a"
      ? existing.filter((map) => map.scoreA > map.scoreB).length >
        existing.filter((map) => map.scoreB > map.scoreA).length
      : existing.filter((map) => map.scoreB > map.scoreA).length >
        existing.filter((map) => map.scoreA > map.scoreB).length)

  return scoreMatch(matchId, {
    maps: mapsAgree ? existing : [],
    awardTo: mapsAgree ? undefined : winner,
    state: "done",
    note: note ?? row.note,
  })
}

export function setMatchState(matchId: number, state: MatchState, note?: string): MatchDto {
  const result = db
    .prepare(
      `UPDATE matches SET state = ?, note = COALESCE(?, note), updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE id = ?`,
    )
    .run(state, note ?? null, matchId)
  if (result.changes === 0) throw ApiError.notFound("Матч не найден")
  return getMatch(matchId)
}

export function scheduleMatch(matchId: number, scheduledAt: string | null): MatchDto {
  const result = db
    .prepare(`UPDATE matches SET scheduled_at = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
    .run(scheduledAt, matchId)
  if (result.changes === 0) throw ApiError.notFound("Матч не найден")
  return getMatch(matchId)
}

// ───────────────────────────── Апелляции ─────────────────────────────

interface AppealRow {
  id: number
  match_id: number
  reason: string
  severity: "low" | "medium" | "high"
  status: "open" | "resolved" | "declined"
  created_at: string
  claimant: string | null
  name_a: string | null
  name_b: string | null
  tournament_title: string
}

const APPEAL_SELECT = `
  SELECT a.id, a.match_id, a.reason, a.severity, a.status, a.created_at,
         p.nickname  AS claimant,
         la.name     AS name_a,
         lb.name     AS name_b,
         t.title     AS tournament_title
    FROM appeals a
    JOIN matches m        ON m.id = a.match_id
    JOIN tournaments t    ON t.id = m.tournament_id
    LEFT JOIN players p   ON p.id = a.claimant_id
    LEFT JOIN lineups la  ON la.id = m.lineup_a_id
    LEFT JOIN lineups lb  ON lb.id = m.lineup_b_id`

function toAppealDto(row: AppealRow): AppealDto {
  return {
    id: row.id,
    matchId: row.match_id,
    match: `${row.name_a ?? "TBD"} — ${row.name_b ?? "TBD"} · ${row.tournament_title}`,
    claimant: row.claimant,
    reason: row.reason,
    severity: row.severity,
    status: row.status,
    createdAt: row.created_at,
  }
}

export function listAppeals(status: AppealDto["status"] | "all" = "open"): AppealDto[] {
  const clause = status === "all" ? "" : "WHERE a.status = ?"
  const params = status === "all" ? [] : [status]
  const rows = db
    .prepare(`${APPEAL_SELECT} ${clause} ORDER BY a.created_at DESC`)
    .all(...params) as AppealRow[]
  return rows.map(toAppealDto)
}

export function createAppeal(input: {
  matchId: number
  claimantId: number
  reason: string
  severity?: AppealDto["severity"]
}): AppealDto {
  const match = findMatchRow(input.matchId)
  if (!match) throw ApiError.notFound("Матч не найден")

  // Апеллировать может только участник матча.
  const participants = new Set([
    ...lineupMembers(match.lineup_a_id),
    ...lineupMembers(match.lineup_b_id),
  ])
  if (!participants.has(input.claimantId)) {
    throw ApiError.forbidden("Апелляцию подает только участник матча")
  }

  const info = db
    .prepare(`INSERT INTO appeals (match_id, claimant_id, reason, severity) VALUES (?, ?, ?, ?)`)
    .run(input.matchId, input.claimantId, input.reason, input.severity ?? "medium")

  // Матч уходит на разбор судьи.
  db.prepare(`UPDATE matches SET state = 'review', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`).run(
    input.matchId,
  )

  const row = db
    .prepare(`${APPEAL_SELECT} WHERE a.id = ?`)
    .get(Number(info.lastInsertRowid)) as AppealRow
  return toAppealDto(row)
}

export function resolveAppeal(
  id: number,
  status: "resolved" | "declined",
  resolution?: string,
): AppealDto {
  const result = db
    .prepare(
      `UPDATE appeals SET status = ?, resolution = ?, resolved_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
    )
    .run(status, resolution ?? null, id)
  if (result.changes === 0) throw ApiError.notFound("Апелляция не найдена")

  const row = db.prepare(`${APPEAL_SELECT} WHERE a.id = ?`).get(id) as AppealRow
  return toAppealDto(row)
}

/** Матчи турнира, ожидающие ввода счета — рабочая очередь судьи. */
export function matchQueue(slug?: string) {
  if (slug) requireTournamentRow(slug)
  return slug
    ? db
        .prepare(
          `SELECT m.id FROM matches m JOIN tournaments t ON t.id = m.tournament_id
            WHERE t.slug = ? AND m.state != 'done' ORDER BY m.round, m.position`,
        )
        .all(slug)
    : db.prepare(`SELECT id FROM matches WHERE state != 'done' ORDER BY round, position`).all()
}
