import { db } from "../db/index.js"
import { levelFromElo } from "../lib/faceit.js"
import type { LeaderboardRowDto } from "../types.js"

/**
 * Лидерборд — только игроки. Командного рейтинга на платформе нет:
 * составы живут в пределах одного турнира и собираются жеребьевкой,
 * поэтому очки сезона принадлежат человеку, а не составу.
 */
export function getLeaderboard(limit: number, offset: number): {
  items: LeaderboardRowDto[]
  total: number
} {
  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM players WHERE status = 'active'`).get() as { n: number }
  ).n

  const rows = db
    .prepare(
      `SELECT id, nickname, role, elo, points, maps_played, win_rate, hltv_rating, trend
         FROM players
        WHERE status = 'active'
        ORDER BY points DESC, elo DESC, nickname ASC
        LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as {
    id: number
    nickname: string
    role: string
    elo: number
    points: number
    maps_played: number
    win_rate: number
    hltv_rating: number
    trend: "up" | "down" | "flat"
  }[]

  return {
    total,
    items: rows.map((row, index) => ({
      place: offset + index + 1,
      playerId: row.id,
      nickname: row.nickname,
      role: row.role,
      elo: row.elo,
      level: levelFromElo(row.elo),
      points: row.points,
      mapsPlayed: row.maps_played,
      winRate: row.win_rate,
      hltvRating: row.hltv_rating,
      trend: row.trend,
    })),
  }
}
