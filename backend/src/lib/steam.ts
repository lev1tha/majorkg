/**
 * Вход через Steam по OpenID 2.0 — официальный механизм Valve, API-ключ
 * для самого входа не нужен. Ник и аватар после входа тоже берутся без
 * ключа — из публичного XML-профиля; STEAM_API_KEY лишь основной источник,
 * если он задан.
 */

const STEAM_OPENID = "https://steamcommunity.com/openid/login"
const CLAIMED_ID = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/

/** SteamID64 обычного аккаунта всегда начинается с 7656119. */
const STEAM_ID64 = /^7656119\d{10}$/
const PROFILE_URL = /^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/profiles\/(\d{17})(?:[/?#].*)?$/i
const VANITY_URL = /^(?:https?:\/\/)?(?:www\.)?steamcommunity\.com\/id\/([\w-]{2,32})(?:[/?#].*)?$/i
const VANITY = /^[\w-]{2,32}$/

export type SteamInput = { steamId: string } | { vanity: string }

/**
 * Что игрок вставил в поле «Steam»: ссылку /profiles/<id>, ссылку /id/<имя>,
 * голый SteamID64 или просто короткое имя профиля.
 */
export function parseSteamInput(raw: string): SteamInput | null {
  const value = raw.trim()
  if (STEAM_ID64.test(value)) return { steamId: value }

  const profile = PROFILE_URL.exec(value)?.[1]
  if (profile) return STEAM_ID64.test(profile) ? { steamId: profile } : null

  const vanity = VANITY_URL.exec(value)?.[1] ?? (VANITY.test(value) ? value : null)
  return vanity ? { vanity } : null
}

/** SteamID64 по короткому имени профиля — через тот же XML, без ключа. */
export async function resolveVanity(vanity: string): Promise<string | null> {
  const response = await fetch(`https://steamcommunity.com/id/${encodeURIComponent(vanity)}/?xml=1`, {
    signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) throw new Error(`steamcommunity ответил ${response.status}`)

  const steamId = xmlTag(await response.text(), "steamID64")
  return steamId && STEAM_ID64.test(steamId) ? steamId : null
}

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
  /** false — Steam не ответил, в nickname заглушка steam_XXXXXX. */
  resolved: boolean
}

/** Ник и аватар через Web API — нужен ключ. */
async function fromWebApi(steamId: string, apiKey: string) {
  const response = await fetch(
    `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`,
    { signal: AbortSignal.timeout(6000) },
  )
  if (!response.ok) throw new Error(`Web API ответил ${response.status}`)

  const data = (await response.json()) as {
    response?: { players?: { personaname?: string; avatarfull?: string }[] }
  }
  const player = data.response?.players?.[0]
  if (!player) return null
  return { nickname: player.personaname?.trim() ?? "", avatar: player.avatarfull ?? null }
}

/** Содержимое тега XML, с CDATA или без. */
function xmlTag(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`).exec(xml)
  return match?.[1]?.trim() || null
}

/**
 * Ник и аватар из публичного XML-профиля — ключ не нужен. Ник и аватар
 * Steam показывает даже у закрытых профилей, так что это работает для всех.
 */
async function fromCommunity(steamId: string) {
  const response = await fetch(`https://steamcommunity.com/profiles/${steamId}/?xml=1`, {
    signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) throw new Error(`steamcommunity ответил ${response.status}`)

  const xml = await response.text()
  // Несуществующий профиль приходит как <response><error>…</error></response>.
  if (xmlTag(xml, "steamID64") !== steamId) return null
  return { nickname: xmlTag(xml, "steamID") ?? "", avatar: xmlTag(xml, "avatarFull") }
}

export async function fetchSteamProfile(
  steamId: string,
  apiKey: string | undefined,
): Promise<SteamProfile> {
  const sources = apiKey
    ? [() => fromWebApi(steamId, apiKey), () => fromCommunity(steamId)]
    : [() => fromCommunity(steamId)]

  for (const source of sources) {
    try {
      const found = await source()
      if (found?.nickname) return { steamId, ...found, resolved: true }
    } catch (error) {
      console.warn(`[steam] профиль ${steamId} не получен:`, error instanceof Error ? error.message : error)
    }
  }

  return { steamId, nickname: `steam_${steamId.slice(-6)}`, avatar: null, resolved: false }
}
