import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

import { db } from "../db/index.js"
import { env } from "../env.js"
import { ApiError } from "../lib/http.js"
import { hashPassword, verifyPassword } from "../lib/password.js"

/**
 * Учетные записи организаторов.
 *
 * Админка не связана со Steam: организатор — это не обязательно игрок,
 * ему нужен вход, который не зависит от стороннего сервиса. Поэтому
 * отдельная таблица, отдельная cookie и отдельный срок жизни сессии.
 */

export const ADMIN_COOKIE = "mkg_admin"

export interface AdminDto {
  id: number
  login: string
  name: string
  lastLoginAt: string | null
}

interface AdminRow {
  id: number
  login: string
  password_hash: string
  name: string
  last_login_at: string | null
}

function toDto(row: AdminRow): AdminDto {
  return { id: row.id, login: row.login, name: row.name, lastLoginAt: row.last_login_at }
}

// ─────────────────────────────── Сессии ───────────────────────────────

function sign(id: string) {
  return createHmac("sha256", env.sessionSecret).update(`admin:${id}`).digest("base64url")
}

function pack(id: string) {
  return `${id}.${sign(id)}`
}

function unpack(value: string | undefined): string | null {
  if (!value) return null
  const dot = value.lastIndexOf(".")
  if (dot <= 0) return null

  const id = value.slice(0, dot)
  const given = Buffer.from(value.slice(dot + 1))
  const expected = Buffer.from(sign(id))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  return id
}

function createSession(adminId: number): string {
  const id = randomBytes(24).toString("base64url")
  db.prepare(
    `INSERT INTO admin_sessions (id, admin_id, expires_at)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now', ?))`,
  ).run(id, adminId, `+${env.adminSessionTtlHours} hours`)
  return pack(id)
}

export function readAdminSession(cookie: string | undefined): AdminDto | null {
  const id = unpack(cookie)
  if (!id) return null

  const row = db
    .prepare(
      `SELECT a.id, a.login, a.password_hash, a.name, a.last_login_at
         FROM admin_sessions s
         JOIN admins a ON a.id = s.admin_id
        WHERE s.id = ? AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
    )
    .get(id) as AdminRow | undefined

  return row ? toDto(row) : null
}

export function destroyAdminSession(cookie: string | undefined) {
  const id = unpack(cookie)
  if (id) db.prepare(`DELETE FROM admin_sessions WHERE id = ?`).run(id)
}

export function pruneAdminSessions() {
  db.prepare(
    `DELETE FROM admin_sessions WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now')`,
  ).run()
}

// ──────────────────────────────── Вход ────────────────────────────────

export interface LoginResult {
  admin: AdminDto
  cookie: string
}

export async function login(loginName: string, password: string): Promise<LoginResult> {
  const row = db
    .prepare(`SELECT id, login, password_hash, name, last_login_at FROM admins WHERE login = ? COLLATE NOCASE`)
    .get(loginName) as AdminRow | undefined

  // Один и тот же ответ на неизвестный логин и на неверный пароль —
  // иначе форма подсказывает, какие логины существуют.
  const ok = row ? await verifyPassword(password, row.password_hash) : false
  if (!row || !ok) throw ApiError.unauthorized("Неверный логин или пароль")

  db.prepare(
    `UPDATE admins SET last_login_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`,
  ).run(row.id)

  return { admin: toDto(row), cookie: createSession(row.id) }
}

export async function createAdmin(input: {
  login: string
  password: string
  name?: string
}): Promise<AdminDto> {
  const login = input.login.trim().toLowerCase()
  if (login.length < 3) throw ApiError.badRequest("Логин минимум 3 символа")
  if (input.password.length < 8) throw ApiError.badRequest("Пароль минимум 8 символов")

  if (db.prepare(`SELECT 1 FROM admins WHERE login = ? COLLATE NOCASE`).get(login)) {
    throw ApiError.conflict("Такой логин уже занят")
  }

  const info = db
    .prepare(`INSERT INTO admins (login, password_hash, name) VALUES (?, ?, ?)`)
    .run(login, await hashPassword(input.password), input.name?.trim() || "Организатор")

  const row = db
    .prepare(`SELECT id, login, password_hash, name, last_login_at FROM admins WHERE id = ?`)
    .get(Number(info.lastInsertRowid)) as AdminRow
  return toDto(row)
}

export async function changePassword(adminId: number, current: string, next: string) {
  const row = db
    .prepare(`SELECT id, login, password_hash, name, last_login_at FROM admins WHERE id = ?`)
    .get(adminId) as AdminRow | undefined
  if (!row) throw ApiError.notFound("Учетная запись не найдена")

  if (!(await verifyPassword(current, row.password_hash))) {
    throw ApiError.unauthorized("Текущий пароль неверен")
  }
  if (next.length < 8) throw ApiError.badRequest("Новый пароль минимум 8 символов")

  db.prepare(`UPDATE admins SET password_hash = ? WHERE id = ?`).run(await hashPassword(next), adminId)
  // Смена пароля разлогинивает остальные устройства.
  db.prepare(`DELETE FROM admin_sessions WHERE admin_id = ?`).run(adminId)
}

export function listAdmins(): AdminDto[] {
  const rows = db
    .prepare(`SELECT id, login, password_hash, name, last_login_at FROM admins ORDER BY login`)
    .all() as AdminRow[]
  return rows.map(toDto)
}

export function countAdmins(): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM admins`).get() as { n: number }).n
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProd,
  path: "/",
  maxAge: env.adminSessionTtlHours * 60 * 60 * 1000,
}
