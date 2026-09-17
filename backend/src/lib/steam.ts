/**
 * Вход через Steam по OpenID 2.0 — официальный механизм Valve, API-ключ
 * для самого входа не нужен. STEAM_API_KEY используется только чтобы
 * подтянуть ник и аватар после успешной проверки.
 */

const STEAM_OPENID = "https://steamcommunity.com/openid/login"
const CLAIMED_ID = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/

export function buildSteamAuthUrl(returnTo: string, realm: string) {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  })
  return `${STEAM_OPENID}?${params.toString()}`
}

/**
 * claimed_id из запроса — это всего лишь утверждение клиента. Проверяем
 * его, отправляя всю связку обратно в Steam с mode=check_authentication.
 */
export async function verifySteamAssertion(search: URLSearchParams): Promise<string | null> {
  const claimed = search.get("openid.claimed_id")
  if (!claimed) return null

  const match = CLAIMED_ID.exec(claimed)
  if (!match?.[1]) return null

  const body = new URLSearchParams(search)
  body.set("openid.mode", "check_authentication")

  try {
    const response = await fetch(STEAM_OPENID, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null
    const text = await response.text()
    return /is_valid\s*:\s*true/i.test(text) ? match[1] : null
  } catch {
    return null
  }
}

export interface SteamProfile {
  steamId: string
  nickname: string
  avatar: string | null
}

export async function fetchSteamProfile(
  steamId: string,
  apiKey: string | undefined,
): Promise<SteamProfile> {
  const fallback: SteamProfile = {
    steamId,
    nickname: `steam_${steamId.slice(-6)}`,
    avatar: null,
  }
  if (!apiKey) return fallback

  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`,
      { signal: AbortSignal.timeout(6000) },
    )
    if (!response.ok) return fallback

    const data = (await response.json()) as {
      response?: { players?: { personaname?: string; avatarfull?: string }[] }
    }
    const player = data.response?.players?.[0]
    if (!player) return fallback

    return {
      steamId,
      nickname: player.personaname?.trim() || fallback.nickname,
      avatar: player.avatarfull ?? null,
    }
  } catch {
    return fallback
  }
}
