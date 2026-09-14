import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Вход через Steam по OpenID 2.0 — это официальный способ Valve и он не
 * требует API-ключа. Ключ STEAM_API_KEY нужен только для подтягивания
 * профиля (ник, аватар) после успешного входа.
 */

const STEAM_OPENID = "https://steamcommunity.com/openid/login"
const CLAIMED_ID = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/

export const SESSION_COOKIE = "mkg_session"

export function buildSteamAuthUrl(origin: string) {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${origin}/api/auth/steam/callback`,
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  })
  return `${STEAM_OPENID}?${params.toString()}`
}

/**
 * Проверка ответа Steam. Никогда не доверяем claimed_id из запроса —
 * отправляем всю связку обратно в Steam с mode=check_authentication.
 */
export async function verifySteamAssertion(search: URLSearchParams): Promise<string | null> {
  const claimed = search.get("openid.claimed_id")
  if (!claimed) return null

  const match = CLAIMED_ID.exec(claimed)
  if (!match) return null

  const body = new URLSearchParams(search)
  body.set("openid.mode", "check_authentication")

  try {
    const response = await fetch(STEAM_OPENID, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    })
    if (!response.ok) return null
    const text = await response.text()
    return /is_valid\s*:\s*true/i.test(text) ? match[1] : null
  } catch {
    return null
  }
}

function secret() {
  return process.env.SESSION_SECRET ?? "major-kg-dev-secret-change-me"
}

export function signSession(steamId: string) {
  const issued = String(Date.now())
  const payload = `${steamId}.${issued}`
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

export function readSession(value: string | undefined): { steamId: string; issuedAt: number } | null {
  if (!value) return null
  const parts = value.split(".")
  if (parts.length !== 3) return null

  const [steamId, issued, signature] = parts
  const expected = createHmac("sha256", secret()).update(`${steamId}.${issued}`).digest("base64url")

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const issuedAt = Number(issued)
  if (!Number.isFinite(issuedAt)) return null
  // Сессия живет 30 дней.
  if (Date.now() - issuedAt > 30 * 24 * 60 * 60 * 1000) return null

  return { steamId, issuedAt }
}

export interface SteamProfile {
  steamId: string
  nickname: string
  avatar: string | null
  profileUrl: string
}

/** Профиль из Steam Web API. Без ключа возвращает минимальный объект. */
export async function fetchSteamProfile(steamId: string): Promise<SteamProfile> {
  const key = process.env.STEAM_API_KEY
  const fallback: SteamProfile = {
    steamId,
    nickname: `steam_${steamId.slice(-6)}`,
    avatar: null,
    profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
  }
  if (!key) return fallback

  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`,
      { next: { revalidate: 600 } },
    )
    if (!response.ok) return fallback
    const data = (await response.json()) as {
      response?: { players?: { personaname?: string; avatarfull?: string; profileurl?: string }[] }
    }
    const player = data.response?.players?.[0]
    if (!player) return fallback

    return {
      steamId,
      nickname: player.personaname ?? fallback.nickname,
      avatar: player.avatarfull ?? null,
      profileUrl: player.profileurl ?? fallback.profileUrl,
    }
  } catch {
    return fallback
  }
}
