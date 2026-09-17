/**
 * FACEIT: лестница уровней CS2 для интерфейса.
 *
 * Сами запросы к Data API делает бэкенд — ключ не должен появляться
 * рядом с клиентским кодом. Здесь остается только чистая математика
 * уровней и цветовая шкала.
 */

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
  return LADDER.find((band) => safe >= band.min && safe <= band.max)?.level ?? 1
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
