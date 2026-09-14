export interface RosterEntry {
  nickname: string
  role: string
  elo: number
  rating: number
  kd: number
  /** Ссылка на профиль, если игрок есть в общей базе. */
  profile?: string
}

/** Составы команд турнира — используются в сетке и скаутинге. */
export const ROSTERS: Record<string, RosterEntry[]> = {
  NMD: [
    { nickname: "aibek", role: "IGL", elo: 3042, rating: 1.14, kd: 1.18, profile: "aibek" },
    { nickname: "turan", role: "AWP", elo: 2614, rating: 1.21, kd: 1.26, profile: "turan" },
    { nickname: "mirbek", role: "Entry", elo: 2105, rating: 1.09, kd: 1.11, profile: "mirbek" },
    { nickname: "elmar", role: "Support", elo: 1802, rating: 0.99, kd: 0.97, profile: "elmar" },
    { nickname: "kanat", role: "Lurk", elo: 1590, rating: 0.96, kd: 0.94, profile: "kanat" },
  ],
  ALT: [
    { nickname: "sardar", role: "IGL", elo: 2288, rating: 1.05, kd: 1.02, profile: "sardar" },
    { nickname: "nurs", role: "AWP", elo: 1964, rating: 1.12, kd: 1.15, profile: "nurs" },
    { nickname: "temir", role: "Entry", elo: 1741, rating: 1.02, kd: 1.04, profile: "temir" },
    { nickname: "aman", role: "Support", elo: 1402, rating: 0.94, kd: 0.92, profile: "aman" },
    { nickname: "bek", role: "Lurk", elo: 1244, rating: 0.91, kd: 0.9, profile: "bek" },
  ],
  STW: [
    { nickname: "arsen", role: "IGL", elo: 1658, rating: 0.98, kd: 0.96, profile: "arsen" },
    { nickname: "dastan", role: "AWP", elo: 1877, rating: 1.07, kd: 1.08, profile: "dastan" },
    { nickname: "ilim", role: "Entry", elo: 1488, rating: 1.01, kd: 1.03, profile: "ilim" },
    { nickname: "ruslan", role: "Support", elo: 1327, rating: 0.95, kd: 0.93, profile: "ruslan" },
    { nickname: "azamat", role: "Lurk", elo: 1163, rating: 0.89, kd: 0.88 },
  ],
  SLK: [
    { nickname: "murat", role: "IGL", elo: 2410, rating: 1.08, kd: 1.06 },
    { nickname: "askar", role: "AWP", elo: 2202, rating: 1.17, kd: 1.2 },
    { nickname: "beksultan", role: "Entry", elo: 1893, rating: 1.04, kd: 1.07 },
    { nickname: "daniyar", role: "Support", elo: 1655, rating: 0.97, kd: 0.95 },
    { nickname: "chyngyz", role: "Lurk", elo: 1512, rating: 1.0, kd: 0.99 },
  ],
  TSH: [
    { nickname: "ermek", role: "IGL", elo: 2255, rating: 1.03, kd: 1.01 },
    { nickname: "baurzhan", role: "AWP", elo: 2088, rating: 1.13, kd: 1.16 },
    { nickname: "nurbek", role: "Entry", elo: 1801, rating: 1.06, kd: 1.09 },
    { nickname: "samat", role: "Support", elo: 1604, rating: 0.93, kd: 0.91 },
    { nickname: "adilet", role: "Lurk", elo: 1476, rating: 0.98, kd: 0.97 },
  ],
  MNS: [
    { nickname: "zhanybek", role: "IGL", elo: 2166, rating: 1.02, kd: 1.0 },
    { nickname: "akylbek", role: "AWP", elo: 1998, rating: 1.15, kd: 1.18 },
    { nickname: "maksat", role: "Entry", elo: 1742, rating: 1.05, kd: 1.08 },
    { nickname: "talant", role: "Support", elo: 1533, rating: 0.92, kd: 0.9 },
    { nickname: "kubat", role: "Lurk", elo: 1401, rating: 0.96, kd: 0.95 },
  ],
  OSH: [
    { nickname: "sherzod", role: "IGL", elo: 2044, rating: 1.0, kd: 0.98 },
    { nickname: "jamshid", role: "AWP", elo: 1912, rating: 1.11, kd: 1.14 },
    { nickname: "bakyt", role: "Entry", elo: 1688, rating: 1.03, kd: 1.05 },
    { nickname: "erkin", role: "Support", elo: 1455, rating: 0.9, kd: 0.89 },
    { nickname: "ilyas", role: "Lurk", elo: 1322, rating: 0.94, kd: 0.93 },
  ],
  TKM: [
    { nickname: "azat", role: "IGL", elo: 1955, rating: 0.99, kd: 0.97 },
    { nickname: "marat", role: "AWP", elo: 1823, rating: 1.09, kd: 1.12 },
    { nickname: "syimyk", role: "Entry", elo: 1611, rating: 1.01, kd: 1.03 },
    { nickname: "zhenish", role: "Support", elo: 1388, rating: 0.89, kd: 0.87 },
    { nickname: "rustam", role: "Lurk", elo: 1255, rating: 0.92, kd: 0.91 },
  ],
  PMR: [
    { nickname: "farrukh", role: "IGL", elo: 1877, rating: 0.97, kd: 0.95 },
    { nickname: "sanjar", role: "AWP", elo: 1744, rating: 1.06, kd: 1.09 },
    { nickname: "umed", role: "Entry", elo: 1532, rating: 0.99, kd: 1.0 },
    { nickname: "parviz", role: "Support", elo: 1301, rating: 0.87, kd: 0.85 },
    { nickname: "shohruh", role: "Lurk", elo: 1188, rating: 0.9, kd: 0.89 },
  ],
}

export function rosterFor(tag: string | undefined | null): RosterEntry[] {
  if (!tag) return []
  return ROSTERS[tag] ?? []
}
