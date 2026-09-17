import type { NextFunction, Request, Response } from "express"

import { db } from "../db/index.js"
import { ApiError } from "../lib/http.js"
import { SESSION_COOKIE, readSession } from "../lib/session.js"
import { ADMIN_COOKIE, readAdminSession, type AdminDto } from "../services/admins.js"

/**
 * На платформе две независимые роли и две cookie.
 *
 *   viewer — игрок, входит через Steam;
 *   admin  — организатор, входит по логину и паролю.
 *
 * Организатор не обязан быть игроком, а игрок не получает прав судьи,
 * сколько бы турниров ни выиграл.
 */

export interface Viewer {
  id: number
  steamId: string
  nickname: string
  status: "active" | "review" | "banned"
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      viewer?: Viewer
      admin?: AdminDto
    }
  }
}

/** Мягкая аутентификация: заполняет req.viewer и req.admin, ничего не требуя. */
export function attachViewer(req: Request, _res: Response, next: NextFunction) {
  const session = readSession(req.cookies?.[SESSION_COOKIE])
  if (session) {
    const row = db
      .prepare(`SELECT id, steam_id, nickname, status FROM players WHERE id = ?`)
      .get(session.playerId) as
      | { id: number; steam_id: string; nickname: string; status: Viewer["status"] }
      | undefined

    if (row) {
      req.viewer = {
        id: row.id,
        steamId: row.steam_id,
        nickname: row.nickname,
        status: row.status,
      }
    }
  }

  const admin = readAdminSession(req.cookies?.[ADMIN_COOKIE])
  if (admin) req.admin = admin

  next()
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.viewer) return next(ApiError.unauthorized())
  if (req.viewer.status === "banned") {
    return next(ApiError.forbidden("Аккаунт заблокирован судейской коллегией"))
  }
  next()
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.admin) return next(ApiError.unauthorized("Войдите в админку по логину и паролю"))
  next()
}

/** Гарантирует наличие viewer после requireAuth — снимает ! в хендлерах. */
export function viewerOf(req: Request): Viewer {
  if (!req.viewer) throw ApiError.unauthorized()
  return req.viewer
}

export function adminOf(req: Request): AdminDto {
  if (!req.admin) throw ApiError.unauthorized()
  return req.admin
}
