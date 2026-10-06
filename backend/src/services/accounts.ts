import { db } from "../db/index.js"
import { env } from "../env.js"
import { ApiError } from "../lib/http.js"
import { hashPassword, verifyPassword } from "../lib/password.js"
import { fetchSteamProfile, parseSteamInput, resolveVanity } from "../lib/steam.js"

/**
 * Аккаунт без Steam-входа: ник, пароль и ссылка на Steam, введенные руками.
 *
 * Steam остается главным путем — он доказывает, что SteamID принадлежит
 * игроку. Ручная ссылка ничего не доказывает, поэтому такой аккаунт
 * помечен steam_verified = 0, и судья видит это в админке. Стоит игроку
 * один раз войти через Steam — аккаунт подтверждается (см. routes/auth).
 */

export const ROLES = ["IGL", "AWP", "Entry", "Lurk", "Rifler", "Support"] as const
export type Role = (typeof ROLES)[number]

/** Ник, которым входят и который стоит в адресе профиля: без пробелов. */
export const NICKNAME = /^[\p{L}\p{N}_.-]{2,24}$/u

function nicknameTaken(nickname: string, exceptId: number | null = null): boolean {
  return Boolean(
    db.prepare(`SELECT 1 FROM players WHERE nickname = ? COLLATE NOCASE AND id IS NOT ?`).get(nickname, exceptId),
  )
}

function steamTaken(steamId: string, exceptId: number | null = null): boolean {
  return Boolean(db.prepare(`SELECT 1 FROM players WHERE steam_id = ? AND id IS NOT ?`).get(steamId, exceptId))
}

/** Ссылка из поля «Steam» → SteamID64. Короткое имя профиля спрашиваем у Steam. */
async function resolveSteamId(raw: string): Promise<string> {
  const parsed = parseSteamInput(raw)
  if (!parsed) {
    throw ApiError.badRequest("Не похоже на ссылку Steam. Пример: steamcommunity.com/profiles/76561198…")
  }
  if ("steamId" in parsed) return parsed.steamId

  let steamId: string | null
  try {
    steamId = await resolveVanity(parsed.vanity)
  } catch {
    throw new ApiError(
      502,
      "Steam не ответил. Вставьте ссылку вида steamcommunity.com/profiles/76561198… — ее можно проверить без Steam",
      "steam_unreachable",
    )
  }
  if (!steamId) throw ApiError.badRequest("Профиль Steam по этой ссылке не найден")
  return steamId
}

/** Telegram: принимаем @name, t.me/name и ссылку целиком, храним только имя. */
function normalizeTelegram(raw: string): string | null {
  const value = raw.trim().replace(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\//i, "").replace(/^@/, "")
  if (!value) return null
  if (!/^[A-Za-z0-9_]{4,32}$/.test(value)) throw ApiError.badRequest("Telegram: латиница, цифры и _, от 4 символов")
  return value
}

function normalizeDiscord(raw: string): string | null {
  const value = raw.trim().replace(/^@/, "")
  if (!value) return null
  if (!/^\S{2,37}$/.test(value)) throw ApiError.badRequest("Discord: имя пользователя без пробелов")
  return value
}

export async function registerAccount(input: {
  nickname: string
  password: string
  steam: string
}): Promise<number> {
  const nickname = input.nickname.trim()
  if (nicknameTaken(nickname)) throw ApiError.conflict("Этот ник уже занят — выберите другой")

  const steamId = await resolveSteamId(input.steam)
  if (steamTaken(steamId)) {
    throw ApiError.conflict("Этот Steam уже привязан к аккаунту. Если он ваш — войдите через Steam")
  }

  // Ник игрок выбрал сам, из Steam берем только аватар.
  const profile = await fetchSteamProfile(steamId, env.steamApiKey)
  const passwordHash = await hashPassword(input.password)

  try {
    const info = db
      .prepare(
        `INSERT INTO players (steam_id, nickname, avatar, password_hash, steam_verified, nickname_custom, steam_synced_at)
         VALUES (?, ?, ?, ?, 0, 1, ?)`,
      )
      .run(steamId, nickname, profile.avatar, passwordHash, profile.resolved ? new Date().toISOString() : null)
    return Number(info.lastInsertRowid)
  } catch (error) {
    // Пока ждали Steam и scrypt, ник или Steam мог занять кто-то еще.
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      throw ApiError.conflict("Ник или Steam только что заняли — попробуйте еще раз")
    }
    throw error
  }
}

/** Вход по нику и паролю. Один ответ на «нет ника» и «не тот пароль». */
export async function loginWithPassword(nickname: string, password: string): Promise<number> {
  const row = db
    .prepare(`SELECT id, password_hash, status FROM players WHERE nickname = ? COLLATE NOCASE`)
    .get(nickname.trim()) as { id: number; password_hash: string | null; status: string } | undefined

  const ok = row?.password_hash ? await verifyPassword(password, row.password_hash) : false
  if (!row || !ok) throw ApiError.unauthorized("Неверный ник или пароль")
  if (row.status === "banned") throw ApiError.forbidden("Аккаунт заблокирован судейской коллегией")
  return row.id
}

export interface ProfileInput {
  nickname?: string
  steam?: string
  telegram?: string
  discord?: string
  city?: string
  role?: Role
}

/**
 * Правка профиля самим игроком.
 * Пустая строка в контактах и городе — стереть значение.
 */
export async function updateProfile(playerId: number, input: ProfileInput): Promise<{ relinked: boolean }> {
  const row = db
    .prepare(`SELECT nickname, steam_id, steam_verified FROM players WHERE id = ?`)
    .get(playerId) as { nickname: string; steam_id: string; steam_verified: number } | undefined
  if (!row) throw ApiError.notFound("Игрок не найден")

  const sets: string[] = []
  const params: unknown[] = []
  const set = (sql: string, ...values: unknown[]) => {
    sets.push(sql)
    params.push(...values)
  }

  const nickname = input.nickname?.trim()
  if (nickname && nickname !== row.nickname) {
    if (nicknameTaken(nickname, playerId)) throw ApiError.conflict("Этот ник уже занят — выберите другой")
    // Ник задан руками — Steam его больше не перезаписывает.
    set(`nickname = ?, nickname_custom = 1`, nickname)
  }

  let relinked = false
  if (input.steam !== undefined && input.steam.trim()) {
    const steamId = await resolveSteamId(input.steam)
    if (steamId !== row.steam_id) {
      if (row.steam_verified) throw ApiError.conflict("Steam подтвержден входом — сменить его нельзя")
      if (steamTaken(steamId, playerId)) throw ApiError.conflict("Этот Steam уже привязан к другому аккаунту")

      const profile = await fetchSteamProfile(steamId, env.steamApiKey)
      // FACEIT ищется по SteamID — старая привязка относилась к другому аккаунту.
      set(
        `steam_id = ?, avatar = ?, steam_synced_at = ?,
         faceit = NULL, faceit_id = NULL, faceit_avatar = NULL, elo_synced_at = NULL`,
        steamId,
        profile.avatar,
        profile.resolved ? new Date().toISOString() : null,
      )
      relinked = true
    }
  }

  if (input.telegram !== undefined) set(`telegram = ?`, normalizeTelegram(input.telegram))
  if (input.discord !== undefined) set(`discord = ?`, normalizeDiscord(input.discord))
  if (input.city !== undefined) set(`city = ?`, input.city.trim() || null)
  if (input.role !== undefined) set(`role = ?`, input.role)

  if (sets.length > 0) {
    db.prepare(`UPDATE players SET ${sets.join(", ")} WHERE id = ?`).run(...params, playerId)
  }
  return { relinked }
}

/**
 * Задать или сменить пароль. Если пароль уже есть, нужен текущий.
 * Ник при этом фиксируется: им входят, и Steam не должен его переименовать.
 */
export async function setPassword(playerId: number, current: string | undefined, next: string): Promise<void> {
  const row = db.prepare(`SELECT password_hash FROM players WHERE id = ?`).get(playerId) as
    | { password_hash: string | null }
    | undefined
  if (!row) throw ApiError.notFound("Игрок не найден")

  if (row.password_hash && !(current && (await verifyPassword(current, row.password_hash)))) {
    throw ApiError.badRequest("Текущий пароль неверен")
  }

  db.prepare(`UPDATE players SET password_hash = ?, nickname_custom = 1 WHERE id = ?`).run(
    await hashPassword(next),
    playerId,
  )
}
