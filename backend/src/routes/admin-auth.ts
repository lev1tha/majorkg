import { Router } from "express"
import { z } from "zod"

import { handler } from "../lib/http.js"
import { adminOf, requireAdmin } from "../middleware/auth.js"
import { rateLimit } from "../middleware/rate-limit.js"
import {
  ADMIN_COOKIE,
  adminCookieOptions,
  changePassword,
  createAdmin,
  destroyAdminSession,
  listAdmins,
  login,
} from "../services/admins.js"

/**
 * Вход в админку — по логину и паролю, без Steam. Организатор может не
 * играть в CS2, и привязывать его рабочий доступ к игровому аккаунту
 * незачем.
 */
export const adminAuthRouter = Router()

const credentials = z.object({
  login: z.string().min(3, "Логин минимум 3 символа").max(64),
  password: z.string().min(1, "Введите пароль").max(200),
})

adminAuthRouter.post(
  "/login",
  // Подбор пароля упирается в лимит: 10 попыток в минуту с адреса.
  rateLimit({ windowMs: 60_000, max: 10 }),
  handler(async (req, res) => {
    const body = credentials.parse(req.body)
    const result = await login(body.login, body.password)
    res.cookie(ADMIN_COOKIE, result.cookie, adminCookieOptions)
    res.json({ admin: result.admin })
  }),
)

adminAuthRouter.post(
  "/logout",
  handler((req, res) => {
    destroyAdminSession(req.cookies?.[ADMIN_COOKIE])
    res.clearCookie(ADMIN_COOKIE, { ...adminCookieOptions, maxAge: undefined })
    res.status(204).end()
  }),
)

/** Текущий организатор. 200 с null вместо 401 — фронтенду так удобнее. */
adminAuthRouter.get(
  "/me",
  handler((req, res) => {
    res.json({ admin: req.admin ?? null })
  }),
)

adminAuthRouter.get(
  "/accounts",
  requireAdmin,
  handler((_req, res) => {
    res.json({ items: listAdmins() })
  }),
)

adminAuthRouter.post(
  "/accounts",
  requireAdmin,
  handler(async (req, res) => {
    const body = z
      .object({
        login: z.string().min(3).max(64),
        password: z.string().min(8, "Пароль минимум 8 символов").max(200),
        name: z.string().max(120).optional(),
      })
      .parse(req.body)

    res.status(201).json({ admin: await createAdmin(body) })
  }),
)

adminAuthRouter.post(
  "/password",
  requireAdmin,
  rateLimit({ windowMs: 60_000, max: 10 }),
  handler(async (req, res) => {
    const body = z
      .object({
        current: z.string().min(1, "Введите текущий пароль"),
        next: z.string().min(8, "Новый пароль минимум 8 символов").max(200),
      })
      .parse(req.body)

    await changePassword(adminOf(req).id, body.current, body.next)
    // Смена пароля разлогинивает все устройства, включая текущее.
    res.clearCookie(ADMIN_COOKIE, { ...adminCookieOptions, maxAge: undefined })
    res.status(204).end()
  }),
)
