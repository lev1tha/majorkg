import { db } from "../db/index.js"
import { ApiError } from "../lib/http.js"
import type { BattleAlertDto } from "../types.js"
import { requireTournamentRow } from "./tournaments.js"

/**
 * Сигналы к бою для подтвержденных участников.
 *
 * Сайт опрашивает их раз в несколько секунд и трубит в рог, когда
 * появляется новый: организатор созвал участников, турнир начался или
 * пошел матч игрока. Что уже протрубили, помнит браузер — по key.
 */

/** Сбор организатора актуален полчаса, потом это уже не новость. */
const RALLY_MINUTES = 30
/** Начало турнира — три часа: опоздавшему все еще полезно знать. */
const LIVE_MINUTES = 180

function minutesSince(iso: string): number {
  return (Date.now() - Date.parse(iso)) / 60_000
}

export function listAlerts(playerId: number): BattleAlertDto[] {
  const alerts: BattleAlertDto[] = []

  const tournaments = db
    .prepare(
      `SELECT t.id, t.slug, t.title, t.status, t.starts_at, t.rally_at
         FROM registrations r
         JOIN tournaments t ON t.id = r.tournament_id
        WHERE r.player_id = ?
          AND r.status IN ('confirmed', 'checked_in')
          AND t.status IN ('registration', 'checkin', 'live')`,
    )
    .all(playerId) as {
    id: number
    slug: string
    title: string
    status: string
    starts_at: string
    rally_at: string | null
  }[]

  for (const t of tournaments) {
    const href = `/tournaments/${t.slug}`
    if (t.rally_at && minutesSince(t.rally_at) < RALLY_MINUTES) {
      alerts.push({
        key: `rally:${t.id}:${t.rally_at}`,
        kind: "rally",
        title: t.title,
        text: "Организатор созывает участников — битва вот-вот начнется",
        href,
      })
    }
    if (t.status === "live" && minutesSince(t.starts_at) < LIVE_MINUTES) {
      alerts.push({
        key: `live:${t.id}`,
        kind: "live",
        title: t.title,
        text: "Турнир начался — занимайте места",
        href,
      })
    }
  }

  const matches = db
    .prepare(
      `SELECT DISTINCT m.id, t.slug, t.title AS tournament, la.name AS name_a, lb.name AS name_b
         FROM matches m
         JOIN tournaments t     ON t.id = m.tournament_id
         JOIN lineup_members lm ON lm.lineup_id IN (m.lineup_a_id, m.lineup_b_id)
         LEFT JOIN lineups la   ON la.id = m.lineup_a_id
         LEFT JOIN lineups lb   ON lb.id = m.lineup_b_id
        WHERE lm.player_id = ? AND m.state = 'live'`,
    )
    .all(playerId) as { id: number; slug: string; tournament: string; name_a: string | null; name_b: string | null }[]

  for (const m of matches) {
    alerts.push({
      key: `match:${m.id}`,
      kind: "match",
      title: `${m.name_a ?? "TBD"} vs ${m.name_b ?? "TBD"} · ${m.tournament}`,
      text: "Ваш матч начинается — сервер ждет",
      href: `/tournaments/${m.slug}`,
    })
  }

  return alerts
}

/** «Протрубить сбор»: всем подтвержденным участникам с открытым сайтом. */
export function rally(slug: string): { rallyAt: string; recipients: number } {
  const tournament = requireTournamentRow(slug)
  if (!["registration", "checkin", "live"].includes(tournament.status)) {
    throw ApiError.conflict("Созвать можно только участников активного турнира")
  }

  const rallyAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
  db.prepare(`UPDATE tournaments SET rally_at = ? WHERE id = ?`).run(rallyAt, tournament.id)

  const { n } = db
    .prepare(
      `SELECT COUNT(*) AS n FROM registrations
        WHERE tournament_id = ? AND status IN ('confirmed', 'checked_in')`,
    )
    .get(tournament.id) as { n: number }
  return { rallyAt, recipients: n }
}
