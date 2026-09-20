/**
 * FACEIT: лестница уровней CS2 и адаптер к официальному Data API v4.
 *
 * Профиль ищется по SteamID64, а не по нику. Ник на FACEIT и ник в Steam
 * — разные строки, и просить игрока вводить свой FACEIT-ник руками
 * незачем: SteamID64 у нас уже есть после входа, а FACEIT хранит его в
 * `games.cs2.game_player_id`. Поэтому привязка выходит автоматической и
 * без единого поля в форме.
 *
 * Без FACEIT_API_KEY все функции возвращают null — интерфейс показывает
 * снимок из базы и честно об этом пишет.
 */

const LADDER: { level: number; min: number; max: number }[] = [
  { level: 1, min: 100, max: 500 },
  { level: 2, min: 501, max: 750 },
  { level: 3, min: 751, max: 900 },
  { level: 4, min: 901, max: 1050 },
  { level: 5, min: 1051, max: 1200 },
  { level: 6, min: 1201, max: 1350 },
  { level: 7, min: 1351, max: 1530 },
  { level: 8, min: 1531, max: 1750 },
  { level: 9, min: 1751, max: 2000 },
  { level: 10, min: 2001, max: Number.MAX_SAFE_INTEGER },
]

export function levelFromElo(elo: number): number {
  const safe = Number.isFinite(elo) ? elo : 0
  return LADDER.find((band) => safe >= band.min && safe <= band.max)?.level ?? 1
}

const FACEIT_API = "https://open.faceit.com/data/v4"
const TIMEOUT_MS = 6000

async function faceitGet<T>(path: string, apiKey: string): Promise<T | null> {
  try {
    const response = await fetch(`${FACEIT_API}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    // Сеть, таймаут или лимит API — данные просто не обновятся.
    return null
  }
}

export interface FaceitProfile {
  faceitId: string
  nickname: string
  elo: number
  level: number
  avatar: string | null
  country: string | null
}

interface FaceitPlayerResponse {
  player_id?: string
  nickname?: string
  avatar?: string
  country?: string
  games?: { cs2?: { faceit_elo?: number; skill_level?: number } }
}

function toProfile(data: FaceitPlayerResponse | null): FaceitProfile | null {
  if (!data?.player_id || !data.nickname) return null

  const elo = data.games?.cs2?.faceit_elo
  if (typeof elo !== "number") return null

  return {
    faceitId: data.player_id,
    nickname: data.nickname,
    elo,
    level: data.games?.cs2?.skill_level ?? levelFromElo(elo),
    avatar: data.avatar?.trim() || null,
    country: data.country?.toUpperCase() || null,
  }
}

/** Профиль по SteamID64 — основной способ привязки. */
export function fetchFaceitBySteamId(steamId: string, apiKey: string | undefined) {
  if (!apiKey) return Promise.resolve(null)
  return faceitGet<FaceitPlayerResponse>(
    `/players?game=cs2&game_player_id=${encodeURIComponent(steamId)}`,
    apiKey,
  ).then(toProfile)
}

/** Профиль по нику — запасной путь, если игрок указал ник вручную. */
export function fetchFaceitByNickname(nickname: string, apiKey: string | undefined) {
  if (!apiKey) return Promise.resolve(null)
  return faceitGet<FaceitPlayerResponse>(
    `/players?game=cs2&nickname=${encodeURIComponent(nickname)}`,
    apiKey,
  ).then(toProfile)
}

export interface FaceitLifetime {
  matches: number
  winRate: number
  kd: number
  headshots: number
}

/**
 * Пожизненная статистика. FACEIT отдает её строками в словаре с
 * человекочитаемыми ключами, причем набор ключей со временем менялся —
 * поэтому каждый показатель ищется по нескольким вариантам названия.
 */
export async function fetchFaceitLifetime(
  faceitId: string,
  apiKey: string | undefined,
): Promise<FaceitLifetime | null> {
  if (!apiKey) return null

  const data = await faceitGet<{ lifetime?: Record<string, string> }>(
    `/players/${encodeURIComponent(faceitId)}/stats/cs2`,
    apiKey,
  )
  const lifetime = data?.lifetime
  if (!lifetime) return null

  const num = (...keys: string[]): number => {
    for (const key of keys) {
      const raw = lifetime[key]
      if (raw === undefined) continue
      const value = Number.parseFloat(raw)
      if (Number.isFinite(value)) return value
    }
    return 0
  }

  return {
    matches: Math.round(num("Matches", "Total Matches")),
    winRate: Math.round(num("Win Rate %", "Win Rate")),
    kd: Math.round(num("Average K/D Ratio", "K/D Ratio") * 100) / 100,
    headshots: Math.round(num("Average Headshots %", "Total Headshots %")),
  }
}

export interface FaceitSnapshot extends FaceitProfile {
  lifetime: FaceitLifetime | null
}

/**
 * Полный снимок игрока: профиль + пожизненная статистика.
 * Вызывается при входе через Steam и при ручном обновлении.
 */
export async function fetchFaceitSnapshot(
  input: { steamId: string; faceitId?: string | null; nickname?: string | null },
  apiKey: string | undefined,
): Promise<FaceitSnapshot | null> {
  if (!apiKey) return null

  // Известный faceitId экономит запрос, но профиль все равно нужен: ELO меняется.
  const profile =
    (await fetchFaceitBySteamId(input.steamId, apiKey)) ??
    (input.nickname ? await fetchFaceitByNickname(input.nickname, apiKey) : null)

  if (!profile) return null

  return { ...profile, lifetime: await fetchFaceitLifetime(profile.faceitId, apiKey) }
}
