import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"

import { db } from "../db/index.js"
import { env } from "../env.js"

export const SESSION_COOKIE = "mkg_session"

function sign(id: string) {
  return createHmac("sha256", env.sessionSecret).update(id).digest("base64url")
}

/** Формат cookie: <id>.<hmac>. Подпись отсекает подбор чужих id. */
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

export function createSession(playerId: number): string {
  const id = randomBytes(24).toString("base64url")
  db.prepare(
    `INSERT INTO sessions (id, player_id, expires_at)
     VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now', ?))`,
  ).run(id, playerId, `+${env.sessionTtlDays} days`)
  return pack(id)
}

export function readSession(cookie: string | undefined): { playerId: number } | null {
  const id = unpack(cookie)
  if (!id) return null

  const row = db
    .prepare(`SELECT player_id FROM sessions WHERE id = ? AND expires_at > strftime('%Y-%m-%dT%H:%M:%SZ','now')`)
    .get(id) as { player_id: number } | undefined

  return row ? { playerId: row.player_id } : null
}

export function destroySession(cookie: string | undefined) {
  const id = unpack(cookie)
  if (id) db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id)
}

/** Периодическая уборка протухших сессий. */
export function pruneSessions() {
  db.prepare(`DELETE FROM sessions WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now')`).run()
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProd,
  path: "/",
  maxAge: env.sessionTtlDays * 24 * 60 * 60 * 1000,
}
