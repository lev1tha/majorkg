import { cookies } from "next/headers"

import type {
  AdminDto,
  AdminOverviewDto,
  AppealDto,
  FaqItemDto,
  BracketRoundDto,
  LeaderboardRowDto,
  LineupDto,
  MatchDto,
  MatchState,
  ParticipantDto,
  PlayerDto,
  PlayerPerformanceDto,
  RegistrationStatus,
  TournamentDto,
  TournamentStatus,
  ServerQueueItemDto,
  ViewerDto,
} from "./types"

/**
 * Серверный клиент API.
 *
 * Server Components ходят в бэкенд напрямую по внутреннему адресу, минуя
 * прокси Next.js — на один сетевой хоп меньше. Cookie сессии
 * пробрасывается вручную: fetch на сервере её сам не подхватывает.
 */

const BASE = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "")

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

interface RequestOptions {
  /** Секунды кэша. 0 — всегда свежий ответ (списки с живым счетом). */
  revalidate?: number
  /** Пробросить cookie текущего пользователя — для персональных данных. */
  withSession?: boolean
  tags?: string[]
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }

  if (options.withSession) {
    const store = await cookies()
    const jar = store.getAll()
    if (jar.length > 0) {
      headers.Cookie = jar.map((item) => `${item.name}=${item.value}`).join("; ")
    }
  }

  const response = await fetch(`${BASE}/api${path}`, {
    headers,
    // Персональные ответы кэшировать нельзя — они зависят от cookie.
    ...(options.withSession || options.revalidate === 0
      ? { cache: "no-store" as const }
      : { next: { revalidate: options.revalidate ?? 30, tags: options.tags } }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string; code?: string }
      | null
    throw new ApiError(
      response.status,
      body?.error ?? `Запрос ${path} завершился с кодом ${response.status}`,
      body?.code,
    )
  }

  return (await response.json()) as T
}

/**
 * Служебные исключения Next.js (bailout на динамический рендер, redirect,
 * notFound) переносят управление, а не сообщают об ошибке — их нельзя
 * глотать, иначе страница молча отрендерится пустой.
 */
function isControlFlow(error: unknown): boolean {
  return typeof (error as { digest?: unknown } | null)?.digest === "string"
}

/** Ответ по умолчанию, если бэкенд недоступен — страница не должна падать. */
async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch (error) {
    if (isControlFlow(error)) throw error
    if (error instanceof ApiError && error.status === 404) throw error
    console.error("[api]", error)
    return fallback
  }
}

function query(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const string = search.toString()
  return string ? `?${string}` : ""
}

// ─────────────────────────────── Турниры ──────────────────────────────

export interface TournamentQuery {
  status?: TournamentStatus | "open"
  q?: string
  sort?: "start" | "slots" | "title"
  limit?: number
  offset?: number
}

export function getTournaments(params: TournamentQuery = {}) {
  return safe(
    request<{ items: TournamentDto[]; total: number }>(`/tournaments${query({ ...params })}`, {
      withSession: true,
    }),
    { items: [], total: 0 },
  )
}

export async function getTournament(slug: string): Promise<TournamentDto | null> {
  try {
    const data = await request<{ tournament: TournamentDto }>(`/tournaments/${slug}`, {
      withSession: true,
    })
    return data.tournament
  } catch (error) {
    if (isControlFlow(error)) throw error
    if (error instanceof ApiError && error.status === 404) return null
    console.error("[api]", error)
    return null
  }
}

export async function getFeaturedTournament(): Promise<TournamentDto | null> {
  const data = await safe(
    request<{ tournament: TournamentDto | null }>(`/tournaments/featured`, { withSession: true }),
    { tournament: null },
  )
  return data.tournament
}

export async function getParticipants(slug: string, status?: RegistrationStatus) {
  const data = await safe(
    request<{ items: ParticipantDto[] }>(`/tournaments/${slug}/participants${query({ status })}`, {
      revalidate: 0,
    }),
    { items: [] },
  )
  return data.items
}

export async function getLineups(slug: string) {
  const data = await safe(
    request<{ items: LineupDto[] }>(`/tournaments/${slug}/lineups`, { revalidate: 0 }),
    { items: [] },
  )
  return data.items
}

export async function getBracket(slug: string) {
  const data = await safe(
    request<{ rounds: BracketRoundDto[] }>(`/tournaments/${slug}/bracket`, { revalidate: 0 }),
    { rounds: [] },
  )
  return data.rounds
}

// ─────────────────────────────── Игроки ───────────────────────────────

export interface PlayerQuery {
  q?: string
  sort?: "elo" | "rating" | "kd" | "matches" | "points"
  limit?: number
  offset?: number
}

export function getPlayers(params: PlayerQuery = {}) {
  return safe(request<{ items: PlayerDto[]; total: number }>(`/players${query({ ...params })}`), {
    items: [],
    total: 0,
  })
}

export async function getPlayer(nickname: string): Promise<PlayerDto | null> {
  try {
    const data = await request<{ player: PlayerDto }>(`/players/${encodeURIComponent(nickname)}`)
    return data.player
  } catch (error) {
    if (isControlFlow(error)) throw error
    if (error instanceof ApiError && error.status === 404) return null
    console.error("[api]", error)
    return null
  }
}

export async function getPlayerPerformance(nickname: string): Promise<PlayerPerformanceDto | null> {
  try {
    const data = await request<{ performance: PlayerPerformanceDto }>(
      `/players/${encodeURIComponent(nickname)}/performance`,
    )
    return data.performance
  } catch (error) {
    if (isControlFlow(error)) throw error
    return null
  }
}

// ────────────────────────────── Лидерборд ─────────────────────────────

/** Только игроки: командного рейтинга на платформе нет. */
export function getLeaderboard(limit = 50, offset = 0) {
  return safe(
    request<{ items: LeaderboardRowDto[]; total: number }>(`/leaderboard${query({ limit, offset })}`),
    { items: [], total: 0 },
  )
}

// ─────────────────────────────── Матчи ────────────────────────────────

export async function getMatches(params: { tournament?: string; state?: MatchState; limit?: number } = {}) {
  const data = await safe(
    request<{ items: MatchDto[] }>(`/matches${query({ ...params })}`, { revalidate: 0 }),
    { items: [] },
  )
  return data.items
}

// ───────────────────────────── Пользователь ───────────────────────────

export async function getViewer(): Promise<ViewerDto | null> {
  const data = await safe(
    request<{ viewer: ViewerDto | null }>(`/auth/me`, { withSession: true }),
    { viewer: null },
  )
  return data.viewer
}

export interface ViewerRegistration {
  slug: string
  title: string
  starts_at: string
  tournament_status: string
  status: RegistrationStatus
  seed: number | null
}

export async function getViewerRegistrations() {
  const data = await safe(
    request<{ items: ViewerRegistration[] }>(`/auth/me/registrations`, { withSession: true }),
    { items: [] },
  )
  return data.items
}

// ─────────────────────────────── FAQ ──────────────────────────────────

/** FAQ редактируется организатором, поэтому приходит из API, а не из кода. */
export async function getFaq() {
  const data = await safe(request<{ items: FaqItemDto[] }>(`/faq`, { revalidate: 300 }), {
    items: [],
  })
  return data.items
}

// ─────────────────────────────── Админка ──────────────────────────────

/**
 * Текущий организатор. Отдельная сессия: Steam к админке отношения не имеет.
 * Отсутствие входа — обычное состояние, а не сбой, поэтому в лог не пишем.
 */
export async function getAdmin(): Promise<AdminDto | null> {
  try {
    const data = await request<{ admin: AdminDto | null }>(`/admin/auth/me`, { withSession: true })
    return data.admin
  } catch (error) {
    if (isControlFlow(error)) throw error
    if (!(error instanceof ApiError && error.status === 401)) console.error("[api]", error)
    return null
  }
}

/** Очередь серверов: карты предстоящих матчей после вето. */
export async function getServerQueue(slug: string) {
  const data = await safe(
    request<{ items: ServerQueueItemDto[] }>(`/admin/tournaments/${slug}/servers`, {
      withSession: true,
    }),
    { items: [] },
  )
  return data.items
}

export async function getAdminAccounts() {
  const data = await safe(
    request<{ items: AdminDto[] }>(`/admin/auth/accounts`, { withSession: true }),
    { items: [] },
  )
  return data.items
}

export async function getAdminFaq() {
  const data = await safe(
    request<{ items: FaqItemDto[] }>(`/admin/faq`, { withSession: true }),
    { items: [] },
  )
  return data.items
}

export async function getAdminOverview(): Promise<AdminOverviewDto | null> {
  const data = await safe(
    request<{ overview: AdminOverviewDto }>(`/admin/overview`, { withSession: true }),
    { overview: null as unknown as AdminOverviewDto },
  )
  return data.overview ?? null
}

export interface PendingRegistration extends ParticipantDto {
  tournamentSlug: string
  tournamentTitle: string
}

export async function getPendingRegistrations() {
  const data = await safe(
    request<{ items: PendingRegistration[] }>(`/admin/registrations`, { withSession: true }),
    { items: [] },
  )
  return data.items
}

export async function getAppeals(status: "open" | "resolved" | "declined" | "all" = "open") {
  const data = await safe(
    request<{ items: AppealDto[] }>(`/admin/appeals${query({ status })}`, { withSession: true }),
    { items: [] },
  )
  return data.items
}

export function getAdminTournaments() {
  return safe(
    request<{ items: TournamentDto[]; total: number }>(`/admin/tournaments`, { withSession: true }),
    { items: [], total: 0 },
  )
}

export async function getAdminTournament(slug: string): Promise<TournamentDto | null> {
  try {
    const data = await request<{ tournament: TournamentDto }>(`/admin/tournaments/${slug}`, {
      withSession: true,
    })
    return data.tournament
  } catch (error) {
    if (isControlFlow(error)) throw error
    if (error instanceof ApiError && error.status === 404) return null
    console.error("[api]", error)
    return null
  }
}

/** Все заявки турнира, включая отклоненные и снятые. */
export async function getAdminRegistrations(slug: string) {
  const data = await safe(
    request<{ items: ParticipantDto[] }>(`/admin/tournaments/${slug}/registrations`, {
      withSession: true,
    }),
    { items: [] },
  )
  return data.items
}

export function getAdminPlayers(params: PlayerQuery = {}) {
  return safe(
    request<{ items: PlayerDto[]; total: number }>(`/admin/players${query({ ...params })}`, {
      withSession: true,
    }),
    { items: [], total: 0 },
  )
}
