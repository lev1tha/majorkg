"use client"

import type { AdminDto, MatchDto, ParticipantDto, ScoutNoteDto } from "./types"

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

export function saveMatchScore(
  matchId: number,
  payload: { maps: MapScoreInput[]; state?: string; proof?: boolean; note?: string; awardTo?: "a" | "b" },
) {
  return request<{ match: MatchDto }>(`/admin/matches/${matchId}/score`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}
