"use client"

import type {
  AdminDto,
  AppealDto,
  MatchDto,
  ParticipantDto,
  PlayerDto,
  RuleBlockDto,
  ScoutNoteDto,
  TournamentDto,
  TournamentStatus,
  VetoStateDto,
} from "./types"

/**
 * Браузерный клиент API.
 *
 * Запросы идут на относительный `/api/...` — Next.js проксирует их в
 * бэкенд (см. rewrites в next.config.mjs). Благодаря этому cookie сессии
 * остается same-origin и не требует настройки CORS в проде.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "error",
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  })

  if (response.status === 204) return undefined as T

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (body?.error as string) ?? "Не удалось выполнить запрос",
      (body?.code as string) ?? "error",
    )
  }

  return body as T
}

// ───────────────────── Индивидуальная регистрация ─────────────────────

/** Заявка на турнир от своего имени. Команда не нужна. */
export function joinTournament(slug: string) {
  return request<{ registration: ParticipantDto }>(`/tournaments/${slug}/register`, {
    method: "POST",
  })
}

export function leaveTournament(slug: string) {
  return request<void>(`/tournaments/${slug}/register`, { method: "DELETE" })
}

export function checkIn(slug: string) {
  return request<{ registration: ParticipantDto }>(`/tournaments/${slug}/checkin`, {
    method: "POST",
  })
}

// ───────────────────────────── Вето карт ──────────────────────────────

export function getVeto(matchId: number) {
  return request<{ veto: VetoStateDto }>(`/matches/${matchId}/veto`)
}

/** Ход участника матча. */
export function vetoMap(matchId: number, map: string) {
  return request<{ veto: VetoStateDto }>(`/matches/${matchId}/veto`, {
    method: "POST",
    body: JSON.stringify({ map }),
  })
}

/** Ход за сторону от лица организатора. */
export function adminVetoMap(matchId: number, map: string) {
  return request<{ veto: VetoStateDto }>(`/admin/matches/${matchId}/veto`, {
    method: "POST",
    body: JSON.stringify({ map }),
  })
}

export function resetVeto(matchId: number) {
  return request<{ veto: VetoStateDto }>(`/admin/matches/${matchId}/veto`, { method: "DELETE" })
}

// ─────────────────────────── Скаут-заметки ────────────────────────────

export function listNotes(subject: string) {
  return request<{ items: ScoutNoteDto[] }>(`/notes/${encodeURIComponent(subject)}`)
}

export function addNote(subject: string, body: string) {
  return request<{ note: ScoutNoteDto }>(`/notes/${encodeURIComponent(subject)}`, {
    method: "POST",
    body: JSON.stringify({ body }),
  })
}

export function deleteNote(id: number) {
  return request<void>(`/notes/entry/${id}`, { method: "DELETE" })
}

// ──────────────────────────── Пользователь ────────────────────────────

export function logout() {
  return request<void>(`/auth/logout`, { method: "POST" })
}

/** Подтянуть Steam и FACEIT для себя — когда ключи настроили после входа. */
export function syncMyProfile() {
  return request<{ player: PlayerDto; steamKey: boolean; faceitKey: boolean }>(`/auth/me/sync`, {
    method: "POST",
  })
}

export function syncPlayerData(id: number) {
  return request<{ player: PlayerDto }>(`/admin/players/${id}/sync`, { method: "POST" })
}

export function syncAllPlayers() {
  return request<{ processed: number; faceit: number }>(`/admin/players/sync`, { method: "POST" })
}

// ──────────────────────────── Админка ─────────────────────────────────

export function adminLogin(login: string, password: string) {
  return request<{ admin: AdminDto }>(`/admin/auth/login`, {
    method: "POST",
    body: JSON.stringify({ login, password }),
  })
}

export function adminLogout() {
  return request<void>(`/admin/auth/logout`, { method: "POST" })
}

/**
 * Объявить победителя матча — то, что судья делает, глядя в сетку.
 * Счет по картам не обязателен: серия закрывается 1:0.
 */
export function declareWinner(matchId: number, winner: "a" | "b") {
  return request<{ match: MatchDto }>(`/admin/matches/${matchId}/winner`, {
    method: "PATCH",
    body: JSON.stringify({ winner }),
  })
}

export interface MapScoreInput {
  map: string
  scoreA: number
  scoreB: number
}

export interface TournamentPatch {
  title?: string
  edition?: string
  summary?: string
  teamSize?: number
  status?: TournamentStatus
  slots?: number
  startsAt?: string
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

export function updateTournament(slug: string, patch: TournamentPatch) {
  return request<{ tournament: TournamentDto }>(`/admin/tournaments/${slug}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  })
}

export function deleteTournament(slug: string) {
  return request<void>(`/admin/tournaments/${slug}`, { method: "DELETE" })
}

export function drawLineups(slug: string) {
  return request<{ lineups: unknown[]; spread: number }>(`/admin/tournaments/${slug}/draw`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export function buildBracket(slug: string) {
  return request<{ rounds: unknown[] }>(`/admin/tournaments/${slug}/bracket`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

/** Модерация индивидуальной заявки: подтвердить, отклонить, вернуть. */
export function moderateRegistration(
  id: number,
  status: ParticipantDto["status"],
) {
  return request<{ registration: ParticipantDto }>(`/admin/registrations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export function resolveAppeal(id: number, status: "resolved" | "declined", resolution?: string) {
  return request<{ appeal: AppealDto }>(`/admin/appeals/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, resolution }),
  })
}

export function changeAdminPassword(current: string, next: string) {
  return request<void>(`/admin/auth/password`, {
    method: "POST",
    body: JSON.stringify({ current, next }),
  })
}

export function createAdminAccount(input: { login: string; password: string; name?: string }) {
  return request<{ admin: AdminDto }>(`/admin/auth/accounts`, {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function scheduleMatch(matchId: number, scheduledAt: string | null) {
  return request<{ match: MatchDto }>(`/admin/matches/${matchId}/schedule`, {
    method: "PATCH",
    body: JSON.stringify({ scheduledAt }),
  })
}

export function saveMatchScore(
  matchId: number,
  payload: { maps: MapScoreInput[]; state?: string; proof?: boolean; note?: string; awardTo?: "a" | "b" },
) {
  return request<{ match: MatchDto }>(`/admin/matches/${matchId}/score`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}
