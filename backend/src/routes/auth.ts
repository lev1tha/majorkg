import { Router } from "express"

import { db } from "../db/index.js"
import { env } from "../env.js"
import { levelFromElo } from "../lib/faceit.js"
import { handler } from "../lib/http.js"
import { SESSION_COOKIE, cookieOptions, createSession, destroySession } from "../lib/session.js"
import { buildSteamAuthUrl, fetchSteamProfile, verifySteamAssertion } from "../lib/steam.js"
import { requireAuth, viewerOf } from "../middleware/auth.js"
import { rateLimit } from "../middleware/rate-limit.js"
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
 * поэтому при коллизии к нему добавляется суффикс.
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
    const existing = db.prepare(`SELECT id, nickname FROM players WHERE steam_id = ?`).get(steamId) as
      | { id: number; nickname: string }
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

    let playerId: number
    if (existing) {
      playerId = existing.id
      // Ник из Steam мог быть занят другим игроком — тогда оставляем текущий.
      const nickname = env.steamApiKey ? freeNickname(profile.nickname, existing.id) : existing.nickname
      db.prepare(
        `UPDATE players SET nickname = ?, avatar = COALESCE(?, avatar) WHERE id = ?`,
      ).run(nickname, profile.avatar, playerId)
    } else {
      const info = db
        .prepare(`INSERT INTO players (steam_id, nickname, avatar) VALUES (?, ?, ?)`)
        .run(steamId, freeNickname(profile.nickname), profile.avatar)
      playerId = Number(info.lastInsertRowid)
    }

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
      /** Без ключа Steam ник и аватар подтянуть неоткуда — говорим об этом честно. */
      steamSynced: Boolean(env.steamApiKey),
    }
    res.json({ viewer })
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
