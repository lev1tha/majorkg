import { db } from "../db/index.js"
import { env } from "../env.js"
import { levelFromElo } from "../lib/faceit.js"
import { ApiError } from "../lib/http.js"
import type { PlayerDto, PlayerPerformanceDto, PlayerStatus } from "../types.js"

export interface PlayerRow {
  id: number
  steam_id: string
  nickname: string
  faceit: string | null
  faceit_id: string | null
  avatar: string | null
  faceit_avatar: string | null
  role: string
  country: string
  city: string | null
  elo: number
  matches: number
  win_rate: number
  hltv_rating: number
  kd: number
  headshots: number
  adr: number
  kast: number
  opening_win_rate: number
  points: number
  maps_played: number
  trend: "up" | "down" | "flat"
  status: PlayerStatus
  elo_synced_at: string | null
}

const COLUMNS = `id, steam_id, nickname, faceit, faceit_id, avatar, faceit_avatar, role, country, city, elo, matches,
  win_rate, hltv_rating, kd, headshots, adr, kast, opening_win_rate, points, maps_played,
  trend, status, elo_synced_at`

export function toPlayerDto(row: PlayerRow, eloLive = false): PlayerDto {
  return {
    id: row.id,
    nickname: row.nickname,
    faceit: row.faceit,
    steamId: row.steam_id,
    // Аватар Steam приоритетнее: игрок узнает себя по нему.
    avatar: row.avatar ?? row.faceit_avatar,
    faceitLinked: Boolean(row.faceit_id),
    role: row.role,
    country: row.country,
    city: row.city,
    elo: row.elo,
    level: levelFromElo(row.elo),
    matches: row.matches,
    winRate: row.win_rate,
    hltvRating: row.hltv_rating,
    kd: row.kd,
    headshots: row.headshots,
    points: row.points,
    mapsPlayed: row.maps_played,
    trend: row.trend,
    status: row.status,
    eloLive,
    syncedAt: row.elo_synced_at,
  }
}

export type PlayerSort = "elo" | "rating" | "kd" | "matches" | "points"

const ORDER: Record<PlayerSort, string> = {
  elo: "elo DESC",
  rating: "hltv_rating DESC",
  kd: "kd DESC",
  matches: "matches DESC",
  points: "points DESC",
}

export function listPlayers(options: {
  q?: string
  sort?: PlayerSort
  limit: number
  offset: number
  /** Админке нужны и заблокированные — публичным спискам нет. */
  includeBanned?: boolean
}): { items: PlayerDto[]; total: number } {
  const sort = options.sort && options.sort in ORDER ? options.sort : "elo"
  const where: string[] = options.includeBanned ? ["1 = 1"] : ["status != 'banned'"]
  const params: unknown[] = []

  if (options.q) {
    where.push("(nickname LIKE ? OR faceit LIKE ?)")
    const needle = `%${options.q}%`
    params.push(needle, needle)
  }

  const clause = `WHERE ${where.join(" AND ")}`
  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM players ${clause}`).get(...params) as { n: number }
  ).n

  const rows = db
    .prepare(
      `SELECT ${COLUMNS} FROM players ${clause} ORDER BY ${ORDER[sort]}, nickname ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, options.limit, options.offset) as PlayerRow[]

  return { items: rows.map((row) => toPlayerDto(row)), total }
}

export function findPlayerRowByNickname(nickname: string): PlayerRow | undefined {
  return db.prepare(`SELECT ${COLUMNS} FROM players WHERE nickname = ? COLLATE NOCASE`).get(nickname) as
    | PlayerRow
    | undefined
}

export function findPlayerRowById(id: number): PlayerRow | undefined {
  return db.prepare(`SELECT ${COLUMNS} FROM players WHERE id = ?`).get(id) as PlayerRow | undefined
}

/**
 * Профиль игрока.
 *
 * Данные освежаются не чаще раза в час (TTL в faceit-sync): открытие
 * профиля не должно бить в FACEIT на каждый просмотр — там лимит
 * запросов, и упереться в него значит потерять данные для всех.
 */
export async function getPlayer(nickname: string): Promise<PlayerDto> {
  const row = findPlayerRowByNickname(nickname)
  if (!row) throw ApiError.notFound("Игрок не найден")

  if (!env.faceitApiKey) return toPlayerDto(row)

  const { syncPlayer } = await import("./faceit-sync.js")
  const result = await syncPlayer(row.id)

  const fresh = findPlayerRowById(row.id) ?? row
  return toPlayerDto(fresh, result.faceit)
}

/** Ручное обновление: кнопка в профиле и в админке. */
export async function refreshPlayer(id: number): Promise<PlayerDto> {
  const { syncPlayer } = await import("./faceit-sync.js")
  const result = await syncPlayer(id, { force: true })

  const row = findPlayerRowById(id)
  if (!row) throw ApiError.notFound("Игрок не найден")
  return toPlayerDto(row, result.faceit)
}

/**
 * Статистика по картам и последние серии игрока. Считается из
 * протоколов матчей: отдельной таблицы агрегатов нет.
 */
export function getPlayerPerformance(nickname: string): PlayerPerformanceDto {
  const row = findPlayerRowByNickname(nickname)
  if (!row) throw ApiError.notFound("Игрок не найден")

  const mapRows = db
    .prepare(
      `SELECT mm.map                                                   AS map,
              COUNT(*)                                                 AS maps,
              SUM(CASE WHEN (lm.lineup_id = m.lineup_a_id AND mm.score_a > mm.score_b)
                         OR (lm.lineup_id = m.lineup_b_id AND mm.score_b > mm.score_a)
                       THEN 1 ELSE 0 END)                              AS wins
         FROM match_maps mm
         JOIN matches m        ON m.id = mm.match_id
         JOIN lineup_members lm ON lm.lineup_id IN (m.lineup_a_id, m.lineup_b_id)
        WHERE lm.player_id = ? AND m.state = 'done'
        GROUP BY mm.map
        ORDER BY maps DESC`,
    )
    .all(row.id) as { map: string; maps: number; wins: number }[]

  const recentRows = db
    .prepare(
      `SELECT m.id                AS match_id,
              t.title             AS tournament,
              mm.map              AS map,
              mm.score_a          AS score_a,
              mm.score_b          AS score_b,
              lm.lineup_id        AS own_lineup,
              m.lineup_a_id       AS lineup_a,
              la.name             AS name_a,
              lb.name             AS name_b
         FROM match_maps mm
         JOIN matches m         ON m.id = mm.match_id
         JOIN tournaments t     ON t.id = m.tournament_id
         JOIN lineup_members lm ON lm.lineup_id IN (m.lineup_a_id, m.lineup_b_id)
         LEFT JOIN lineups la   ON la.id = m.lineup_a_id
         LEFT JOIN lineups lb   ON lb.id = m.lineup_b_id
        WHERE lm.player_id = ? AND m.state = 'done'
        ORDER BY m.updated_at DESC, mm.ordinal DESC
        LIMIT 10`,
    )
    .all(row.id) as {
    match_id: number
    tournament: string
    map: string
    score_a: number
    score_b: number
    own_lineup: number
    lineup_a: number | null
    name_a: string | null
    name_b: string | null
  }[]

  return {
    nickname: row.nickname,
    rating: row.hltv_rating,
    kd: row.kd,
    adr: row.adr,
    kast: row.kast,
    headshots: row.headshots,
    openingWinRate: row.opening_win_rate,
    mapStats: mapRows.map((item) => ({
      map: item.map,
      maps: item.maps,
      winRate: item.maps ? Math.round((item.wins / item.maps) * 100) : 0,
      rating: row.hltv_rating,
    })),
    recent: recentRows.map((item) => {
      const isA = item.own_lineup === item.lineup_a
      return {
        matchId: item.match_id,
        tournament: item.tournament,
        opponent: (isA ? item.name_b : item.name_a) ?? "TBD",
        map: item.map,
        score: isA ? `${item.score_a}:${item.score_b}` : `${item.score_b}:${item.score_a}`,
        won: isA ? item.score_a > item.score_b : item.score_b > item.score_a,
      }
    }),
  }
}

export function setPlayerStatus(id: number, status: PlayerStatus): PlayerDto {
  const result = db.prepare(`UPDATE players SET status = ? WHERE id = ?`).run(status, id)
  if (result.changes === 0) throw ApiError.notFound("Игрок не найден")
  // Бан обрывает активные сессии.
  if (status === "banned") db.prepare(`DELETE FROM sessions WHERE player_id = ?`).run(id)

  const row = findPlayerRowById(id)
  if (!row) throw ApiError.notFound("Игрок не найден")
  return toPlayerDto(row)
}
