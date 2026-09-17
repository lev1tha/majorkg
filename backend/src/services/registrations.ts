import { db, tx } from "../db/index.js"
import { levelFromElo } from "../lib/faceit.js"
import { ApiError } from "../lib/http.js"
import type { ParticipantDto, RegistrationStatus } from "../types.js"
import { requireTournamentRow } from "./tournaments.js"

/**
 * Регистрация индивидуальная: в турнир заявляется игрок.
 * Команд на этом шаге нет — составы соберет жеребьевка (services/lineups).
 */

interface ParticipantRow {
  registration_id: number
  seed: number | null
  status: RegistrationStatus
  created_at: string
  player_id: number
  nickname: string
  elo: number
  role: string
  city: string | null
  hltv_rating: number
  kd: number
}

const PARTICIPANT_SELECT = `
  SELECT r.id           AS registration_id,
         r.seed         AS seed,
         r.status       AS status,
         r.created_at   AS created_at,
         p.id           AS player_id,
         p.nickname     AS nickname,
         p.elo          AS elo,
         p.role         AS role,
         p.city         AS city,
         p.hltv_rating  AS hltv_rating,
         p.kd           AS kd
    FROM registrations r
    JOIN players p ON p.id = r.player_id`

function toParticipantDto(row: ParticipantRow): ParticipantDto {
  return {
    registrationId: row.registration_id,
    seed: row.seed,
    status: row.status,
    createdAt: row.created_at,
    player: {
      id: row.player_id,
      nickname: row.nickname,
      elo: row.elo,
      level: levelFromElo(row.elo),
      role: row.role,
      city: row.city,
      hltvRating: row.hltv_rating,
      kd: row.kd,
    },
  }
}

/** Статусы, которые занимают слот. */
const ACTIVE: RegistrationStatus[] = ["pending", "confirmed", "checked_in"]

export function listParticipants(slug: string, status?: RegistrationStatus): ParticipantDto[] {
  const tournament = requireTournamentRow(slug)

  const where = status ? `r.status = ?` : `r.status IN ('pending', 'confirmed', 'checked_in')`
  const params: unknown[] = status ? [tournament.id, status] : [tournament.id]

  const rows = db
    .prepare(
      `${PARTICIPANT_SELECT}
        WHERE r.tournament_id = ? AND ${where}
        ORDER BY COALESCE(r.seed, 9999) ASC, p.elo DESC`,
    )
    .all(...params) as ParticipantRow[]

  return rows.map(toParticipantDto)
}

function countActive(tournamentId: number): number {
  return (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM registrations
          WHERE tournament_id = ? AND status IN ('pending', 'confirmed', 'checked_in')`,
      )
      .get(tournamentId) as { n: number }
  ).n
}

/** Заявка игрока на турнир. Повторный вызов возвращает текущую заявку. */
export function register(slug: string, playerId: number): ParticipantDto {
  const tournament = requireTournamentRow(slug)

  if (tournament.status === "draft") throw ApiError.conflict("Турнир еще не опубликован")
  if (tournament.status === "live") throw ApiError.conflict("Турнир уже идет — регистрация закрыта")
  if (tournament.status === "finished") throw ApiError.conflict("Турнир завершен")

  return tx(() => {
    const existing = db
      .prepare(`SELECT id, status FROM registrations WHERE tournament_id = ? AND player_id = ?`)
      .get(tournament.id, playerId) as { id: number; status: RegistrationStatus } | undefined

    if (existing && ACTIVE.includes(existing.status)) {
      throw ApiError.conflict("Вы уже заявлены на этот турнир")
    }

    if (countActive(tournament.id) >= tournament.slots) {
      throw ApiError.conflict("Свободных слотов не осталось")
    }

    if (existing) {
      db.prepare(
        `UPDATE registrations SET status = 'pending', seed = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
          WHERE id = ?`,
      ).run(existing.id)
    } else {
      db.prepare(
        `INSERT INTO registrations (tournament_id, player_id, status) VALUES (?, ?, 'pending')`,
      ).run(tournament.id, playerId)
    }

    return requireRegistration(tournament.id, playerId)
  })
}

export function withdraw(slug: string, playerId: number): void {
  const tournament = requireTournamentRow(slug)
  const result = db
    .prepare(
      `UPDATE registrations SET status = 'withdrawn', seed = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE tournament_id = ? AND player_id = ? AND status IN ('pending', 'confirmed', 'checked_in')`,
    )
    .run(tournament.id, playerId)

  if (result.changes === 0) throw ApiError.notFound("Активной заявки нет")
}

/** Check-in: подтверждение готовности перед стартом. */
export function checkIn(slug: string, playerId: number): ParticipantDto {
  const tournament = requireTournamentRow(slug)
  if (!["checkin", "live"].includes(tournament.status)) {
    throw ApiError.conflict("Check-in еще не открыт")
  }

  const result = db
    .prepare(
      `UPDATE registrations SET status = 'checked_in', updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
        WHERE tournament_id = ? AND player_id = ? AND status IN ('pending', 'confirmed')`,
    )
    .run(tournament.id, playerId)

  if (result.changes === 0) throw ApiError.conflict("Подтверждать нечего: заявка не активна")
  return requireRegistration(tournament.id, playerId)
}

export function moderate(registrationId: number, status: RegistrationStatus): ParticipantDto {
  const result = db
    .prepare(`UPDATE registrations SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
    .run(status, registrationId)
  if (result.changes === 0) throw ApiError.notFound("Заявка не найдена")

  const row = db
    .prepare(`${PARTICIPANT_SELECT} WHERE r.id = ?`)
    .get(registrationId) as ParticipantRow | undefined
  if (!row) throw ApiError.notFound("Заявка не найдена")
  return toParticipantDto(row)
}

function requireRegistration(tournamentId: number, playerId: number): ParticipantDto {
  const row = db
    .prepare(`${PARTICIPANT_SELECT} WHERE r.tournament_id = ? AND r.player_id = ?`)
    .get(tournamentId, playerId) as ParticipantRow | undefined
  if (!row) throw ApiError.notFound("Заявка не найдена")
  return toParticipantDto(row)
}

export interface PendingRegistration extends ParticipantDto {
  tournamentSlug: string
  tournamentTitle: string
}

/** Очередь модерации для админки. */
export function listPending(limit: number, offset: number): PendingRegistration[] {
  const rows = db
    .prepare(
      `SELECT r.id           AS registration_id,
              r.seed         AS seed,
              r.status       AS status,
              r.created_at   AS created_at,
              p.id           AS player_id,
              p.nickname     AS nickname,
              p.elo          AS elo,
              p.role         AS role,
              p.city         AS city,
              p.hltv_rating  AS hltv_rating,
              p.kd           AS kd,
              t.slug         AS tournament_slug,
              t.title        AS tournament_title
         FROM registrations r
         JOIN players p     ON p.id = r.player_id
         JOIN tournaments t ON t.id = r.tournament_id
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC
        LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as (ParticipantRow & { tournament_slug: string; tournament_title: string })[]

  return rows.map((row) => ({
    ...toParticipantDto(row),
    tournamentSlug: row.tournament_slug,
    tournamentTitle: row.tournament_title,
  }))
}

/** Турниры игрока — для страницы «Мои заявки». */
export function listPlayerRegistrations(playerId: number) {
  return db
    .prepare(
      `SELECT t.slug, t.title, t.starts_at, t.status AS tournament_status, r.status, r.seed
         FROM registrations r
         JOIN tournaments t ON t.id = r.tournament_id
        WHERE r.player_id = ?
        ORDER BY t.starts_at DESC`,
    )
    .all(playerId) as {
    slug: string
    title: string
    starts_at: string
    tournament_status: string
    status: RegistrationStatus
    seed: number | null
  }[]
}
