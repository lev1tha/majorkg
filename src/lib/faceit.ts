/**
 * FACEIT: уровни, ELO и адаптер к официальному Data API.
 *
 * Реальные данные тянутся сервером через FACEIT Data API v4
 * (нужен ключ в FACEIT_API_KEY). Без ключа адаптер отдает локальный
 * снимок — интерфейс не ломается, но данные помечаются как демо.
 */

export interface FaceitStats {
  nickname: string
  elo: number
  level: number
  matches: number
  winRate: number
  hltvRating: number
  /** true — данные пришли из API, false — демо-снимок. */
  live: boolean
}

/** Официальная лестница уровней FACEIT для CS2. */
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
  const band = LADDER.find((item) => safe >= item.min && safe <= item.max)
  return band?.level ?? 1
}

export function eloToNextLevel(elo: number): number | null {
  const level = levelFromElo(elo)
  if (level >= 10) return null
  const band = LADDER.find((item) => item.level === level)
  return band ? band.max + 1 - elo : null
}

/** Цветовая шкала уровней — от серого к акценту, без «радуги». */
export function levelTone(level: number) {
  if (level >= 10) return { text: "text-accent", bg: "bg-accent/12", border: "border-accent/30" }
  if (level >= 8) return { text: "text-prize", bg: "bg-prize/12", border: "border-prize/30" }
  if (level >= 5) return { text: "text-white", bg: "bg-white/[0.07]", border: "border-white/15" }
  return { text: "text-white/55", bg: "bg-white/[0.04]", border: "border-white/10" }
}

export const FACEIT_API = "https://open.faceit.com/data/v4"

/**
 * Запрос профиля игрока. Вызывать только на сервере: ключ не должен
 * попадать в клиентский бандл.
 */
export async function fetchFaceitStats(nickname: string): Promise<FaceitStats | null> {
  const key = process.env.FACEIT_API_KEY
  if (!key) return null

  try {
    const response = await fetch(
      `${FACEIT_API}/players?nickname=${encodeURIComponent(nickname)}&game=cs2`,
      {
        headers: { Authorization: `Bearer ${key}` },
        // Профиль меняется нечасто — час кэша снимает нагрузку и лимиты API.
        next: { revalidate: 3600 },
      },
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
      matches: 0,
      winRate: 0,
      hltvRating: 0,
      live: true,
    }
  } catch {
    // Сеть или лимит API — интерфейс должен продолжать работать.
    return null
  }
}
