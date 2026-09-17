/**
 * FACEIT: лестница уровней CS2 и адаптер к официальному Data API v4.
 *
 * Без FACEIT_API_KEY адаптер молча возвращает null — ELO остается тем,
 * что лежит в базе, и интерфейс честно помечает данные как снимок.
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

export interface FaceitSnapshot {
  nickname: string
  elo: number
  level: number
}

export async function fetchFaceitStats(
  nickname: string,
  apiKey: string | undefined,
): Promise<FaceitSnapshot | null> {
  if (!apiKey) return null

  try {
    const response = await fetch(
      `${FACEIT_API}/players?nickname=${encodeURIComponent(nickname)}&game=cs2`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(6000) },
    )
    if (!response.ok) return null

    const data = (await response.json()) as {
      nickname?: string
      games?: { cs2?: { faceit_elo?: number; skill_level?: number } }
    }
    const elo = data.games?.cs2?.faceit_elo
    if (typeof elo !== "number") return null

    return {
      nickname: data.nickname ?? nickname,
      elo,
      level: data.games?.cs2?.skill_level ?? levelFromElo(elo),
    }
  } catch {
    // Сеть, таймаут или лимит API — рейтинг просто не обновится.
    return null
  }
}
