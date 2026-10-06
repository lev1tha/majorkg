import { Router } from "express"
import { z } from "zod"

import { db } from "../db/index.js"
import { env } from "../env.js"
import { levelFromElo } from "../lib/faceit.js"
import { ApiError, handler } from "../lib/http.js"
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  destroyOtherSessions,
  destroySession,
} from "../lib/session.js"
import { buildSteamAuthUrl, fetchSteamProfile, verifySteamAssertion } from "../lib/steam.js"
import { requireAuth, viewerOf } from "../middleware/auth.js"
import { rateLimit } from "../middleware/rate-limit.js"
import { listAlerts } from "../services/alerts.js"
import { NICKNAME, ROLES, loginWithPassword, registerAccount, setPassword, updateProfile } from "../services/accounts.js"
import { syncPlayer } from "../services/faceit-sync.js"
import { findPlayerRowById } from "../services/players.js"
import { listPlayerRegistrations } from "../services/registrations.js"
import type { ViewerDto } from "../types.js"

export const authRouter = Router()

const RETURN_TO = `${env.apiUrl}/api/auth/steam/callback`

/** Шаг 1: уводим игрока в Steam. */
authRouter.get(
  "/steam",
  rateLimit({ max: 20 }),
  handler((_req, res) => {
    res.redirect(buildSteamAuthUrl(RETURN_TO, `${env.apiUrl}/`))
  }),
)

/**
 * Шаг 2: Steam возвращает утверждение, проверяем его повторным запросом
 * check_authentication, затем заводим или обновляем игрока.
 *
 * Ник и аватар синхронизируются при каждом входе: игрок сменил их в Steam —
 * платформа подхватывает. Ник на платформе при этом остается уникальным,
 * поэтому при коллизии к нему добавляется суффикс. Ник, заданный на сайте
 * руками, Steam не трогает.
 *
 * Если аккаунт с этим SteamID заводили вручную (ник + пароль + ссылка),
 * вход через Steam его подтверждает. Пароль и прежние сессии при этом
 * сбрасываются: до этой минуты владение Steam не было доказано, и
 * аккаунт мог завести кто угодно.
 */
authRouter.get(
  "/steam/callback",
  rateLimit({ max: 20 }),
  handler(async (req, res) => {
    const search = new URLSearchParams(req.originalUrl.split("?")[1] ?? "")
    const steamId = await verifySteamAssertion(search)

    if (!steamId) {
      res.redirect(`${env.siteUrl}/login?error=steam`)
      return
    }

    const profile = await fetchSteamProfile(steamId, env.steamApiKey)
    const existing = db
      .prepare(`SELECT id, nickname, nickname_custom, steam_verified FROM players WHERE steam_id = ?`)
      .get(steamId) as
      | { id: number; nickname: string; nickname_custom: number; steam_verified: number }
      | undefined

    /** Свободный вариант ника: `bob`, затем `bob-2`, `bob-3`… */
    const freeNickname = (desired: string, ownerId?: number) => {
      let candidate = desired
      let attempt = 2
      while (
        db
          .prepare(`SELECT id FROM players WHERE nickname = ? COLLATE NOCASE AND id IS NOT ?`)
          .get(candidate, ownerId ?? null)
      ) {
        candidate = `${desired}-${attempt++}`
      }
      return candidate
    }

    const syncedAt = profile.resolved ? new Date().toISOString() : null

    let playerId: number
    if (existing) {
      playerId = existing.id
      // Steam не ответил — не затираем прежний ник заглушкой steam_XXXXXX.
      const nickname =
        profile.resolved && !existing.nickname_custom
          ? freeNickname(profile.nickname, existing.id)
          : existing.nickname
      db.prepare(
        `UPDATE players
            SET nickname = ?, avatar = COALESCE(?, avatar), steam_synced_at = COALESCE(?, steam_synced_at)
          WHERE id = ?`,
      ).run(nickname, profile.avatar, syncedAt, playerId)

      if (!existing.steam_verified) {
        db.prepare(`UPDATE players SET steam_verified = 1, password_hash = NULL WHERE id = ?`).run(playerId)
        db.prepare(`DELETE FROM sessions WHERE player_id = ?`).run(playerId)
      }
    } else {
      const info = db
        .prepare(`INSERT INTO players (steam_id, nickname, avatar, steam_synced_at) VALUES (?, ?, ?, ?)`)
        .run(steamId, freeNickname(profile.nickname), profile.avatar, syncedAt)
      playerId = Number(info.lastInsertRowid)
    }

    // FACEIT подтягивается в фоне: игрок не должен ждать еще одного
    // внешнего API на редиректе после входа.
    void syncPlayer(playerId, { force: true, steam: false }).catch((error: unknown) => {
      console.error("[auth] синхронизация после входа не удалась", error)
    })

    res.cookie(SESSION_COOKIE, createSession(playerId), cookieOptions)
    res.redirect(`${env.siteUrl}/profile`)
  }),
)

authRouter.post(
  "/logout",
  handler((req, res) => {
    destroySession(req.cookies?.[SESSION_COOKIE])
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined })
    res.status(204).end()
  }),
)

/** Текущий игрок. 200 с null вместо 401 — фронтенду так удобнее. */
authRouter.get(
  "/me",
  handler((req, res) => {
    if (!req.viewer) {
      res.json({ viewer: null })
      return
    }
    const row = findPlayerRowById(req.viewer.id)
    if (!row) {
      res.json({ viewer: null })
      return
    }

    const viewer: ViewerDto = {
      id: row.id,
      nickname: row.nickname,
      steamId: row.steam_id,
      avatar: row.avatar,
      status: row.status,
      elo: row.elo,
      level: levelFromElo(row.elo),
      steamSynced: Boolean(row.steam_synced_at),
      faceitLinked: Boolean(row.faceit_id),
      steamVerified: Boolean(row.steam_verified),
      hasPassword: Boolean(row.password_hash),
      role: row.role,
      city: row.city,
      telegram: row.telegram,
      discord: row.discord,
    }
    res.json({ viewer })
  }),
)

// ─────────────────── Вход по нику и паролю, без Steam ──────────────────

const nicknameField = z
  .string()
  .trim()
  .regex(NICKNAME, "Ник: 2–24 символа, буквы, цифры, точка, дефис и _ — без пробелов")
const passwordField = z.string().min(8, "Пароль минимум 8 символов").max(128, "Пароль до 128 символов")
const steamField = z.string().trim().min(2, "Вставьте ссылку на профиль Steam").max(200, "Ссылка слишком длинная")

/**
 * Разбор тела для форм игрока: первая ошибка уходит текстом, который
 * форма показывает как есть, — общее «некорректные данные» ничего не говорит.
 */
function parseForm<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body)
  if (!result.success) throw ApiError.badRequest(result.error.issues[0]?.message ?? "Проверьте поля формы")
  return result.data
}

/** После входа FACEIT подтягиваем в фоне — как и после Steam. */
function startSession(res: import("express").Response, playerId: number) {
  void syncPlayer(playerId, { force: true, steam: false }).catch((error: unknown) => {
    console.error("[auth] синхронизация после входа не удалась", error)
  })
  res.cookie(SESSION_COOKIE, createSession(playerId), cookieOptions)
}

authRouter.post(
  "/register",
  // Регистрация ходит в Steam и считает scrypt — не даем ее молотить.
  rateLimit({ windowMs: 10 * 60_000, max: 5 }),
  handler(async (req, res) => {
    const body = parseForm(
      z.object({ nickname: nicknameField, password: passwordField, steam: steamField }),
      req.body,
    )
    startSession(res, await registerAccount(body))
    res.status(201).json({ ok: true })
  }),
)

authRouter.post(
  "/login",
  // Подбор пароля упирается в лимит: 10 попыток в минуту с адреса.
  rateLimit({ windowMs: 60_000, max: 10 }),
  handler(async (req, res) => {
    const body = parseForm(
      z.object({
        nickname: z.string().min(1, "Введите ник").max(64),
        password: z.string().min(1, "Введите пароль").max(128),
      }),
      req.body,
    )
    startSession(res, await loginWithPassword(body.nickname, body.password))
    res.json({ ok: true })
  }),
)

/** Игрок заполняет профиль сам: ник, Steam (пока не подтвержден), контакты. */
authRouter.patch(
  "/me",
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 10 }),
  handler(async (req, res) => {
    const body = parseForm(
      z.object({
        nickname: nicknameField.optional(),
        steam: z.string().max(200, "Ссылка на Steam слишком длинная").optional(),
        telegram: z.string().max(80, "Telegram слишком длинный").optional(),
        discord: z.string().max(40, "Discord слишком длинный").optional(),
        city: z.string().max(40, "Город — до 40 символов").optional(),
        role: z.enum(ROLES, { message: "Выберите роль из списка" }).optional(),
      }),
      req.body,
    )

    const playerId = viewerOf(req).id
    const { relinked } = await updateProfile(playerId, body)
    // Сменился Steam — FACEIT ищем заново, уже по новому SteamID.
    if (relinked) {
      void syncPlayer(playerId, { force: true, steam: false }).catch(() => undefined)
    }
    res.json({ ok: true })
  }),
)

/** Задать или сменить пароль для входа без Steam. */
authRouter.post(
  "/me/password",
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 5 }),
  handler(async (req, res) => {
    const body = parseForm(
      z.object({ current: z.string().max(128).optional(), next: passwordField }),
      req.body,
    )
    const playerId = viewerOf(req).id
    await setPassword(playerId, body.current, body.next)
    destroyOtherSessions(playerId, req.cookies?.[SESSION_COOKIE])
    res.status(204).end()
  }),
)

/**
 * Подтянуть Steam и FACEIT прямо сейчас — кнопка «Обновить» в профиле.
 * steamSynced: false значит, что Steam не ответил ни разу.
 */
authRouter.post(
  "/me/sync",
  requireAuth,
  rateLimit({ windowMs: 60_000, max: 5 }),
  handler(async (req, res) => {
    const { refreshPlayer } = await import("../services/players.js")
    const player = await refreshPlayer(viewerOf(req).id)
    res.json({
      player,
      steamSynced: Boolean(findPlayerRowById(player.id)?.steam_synced_at),
      faceitKey: Boolean(env.faceitApiKey),
    })
  }),
)

/**
 * Сигналы к бою — сайт опрашивает их, пока открыт. Гостю — пустой список,
 * а не 401: опрос живет в общем лэйауте и не должен сыпать ошибками.
 */
authRouter.get(
  "/me/alerts",
  handler((req, res) => {
    res.json({ items: req.viewer ? listAlerts(req.viewer.id) : [] })
  }),
)

/** Заявки текущего игрока. */
authRouter.get(
  "/me/registrations",
  requireAuth,
  handler((req, res) => {
    res.json({ items: listPlayerRegistrations(viewerOf(req).id) })
  }),
)
