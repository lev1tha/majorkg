export interface MapResult {
  map: string
  scoreA: number
  scoreB: number
}

export interface MatchHistoryItem {
  id: string
  date: string
  tournament: string
  tournamentSlug: string
  stage: string
  teamA: string
  tagA: string
  teamB: string
  tagB: string
  maps: MapResult[]
  /** Победитель серии. */
  winner: "a" | "b"
  format: string
}

export const MATCH_HISTORY: MatchHistoryItem[] = [
  {
    id: "m-4409",
    date: "13.09.2026",
    tournament: "MAJOR KG OPEN",
    tournamentSlug: "major-kg-open",
    stage: "UB 1/4",
    teamA: "Ala-Too Esports",
    tagA: "ALT",
    teamB: "Tokmok Elite",
    tagB: "TKM",
    maps: [
      { map: "Inferno", scoreA: 13, scoreB: 11 },
      { map: "Nuke", scoreA: 8, scoreB: 13 },
      { map: "Anubis", scoreA: 13, scoreB: 10 },
    ],
    winner: "a",
    format: "BO3",
  },
  {
    id: "m-4408",
    date: "13.09.2026",
    tournament: "MAJOR KG OPEN",
    tournamentSlug: "major-kg-open",
    stage: "UB 1/4",
    teamA: "Tian Shan",
    tagA: "TSH",
    teamB: "Manas GG",
    tagB: "MNS",
    maps: [
      { map: "Dust II", scoreA: 13, scoreB: 16 },
      { map: "Mirage", scoreA: 13, scoreB: 8 },
      { map: "Train", scoreA: 9, scoreB: 13 },
    ],
    winner: "b",
    format: "BO3",
  },
  {
    id: "m-4402",
    date: "07.09.2026",
    tournament: "NIGHT LADDER · W11",
    tournamentSlug: "night-ladder",
    stage: "Финал",
    teamA: "Nomad Five",
    tagA: "NMD",
    teamB: "Silk Road",
    tagB: "SLK",
    maps: [{ map: "Mirage", scoreA: 13, scoreB: 9 }],
    winner: "a",
    format: "BO1",
  },
  {
    id: "m-4398",
    date: "05.09.2026",
    tournament: "ALA-TOO LEAGUE",
    tournamentSlug: "ala-too-league",
    stage: "Группа A",
    teamA: "Nomad Five",
    tagA: "NMD",
    teamB: "Osh Riot",
    tagB: "OSH",
    maps: [
      { map: "Ancient", scoreA: 13, scoreB: 7 },
      { map: "Inferno", scoreA: 10, scoreB: 13 },
    ],
    winner: "a",
    format: "BO2",
  },
  {
    id: "m-4391",
    date: "01.09.2026",
    tournament: "BISHKEK CLASH",
    tournamentSlug: "bishkek-clash",
    stage: "LB R3",
    teamA: "Steppe Wolves",
    tagA: "STW",
    teamB: "Nomad Five",
    tagB: "NMD",
    maps: [
      { map: "Nuke", scoreA: 11, scoreB: 13 },
      { map: "Mirage", scoreA: 6, scoreB: 13 },
    ],
    winner: "b",
    format: "BO3",
  },
]

export interface PlayerMapStat {
  map: string
  maps: number
  winRate: number
  rating: number
}

export interface PlayerPerformance {
  nickname: string
  rating: number
  kd: number
  adr: number
  kast: number
  headshots: number
  openingWinRate: number
  clutches: string
  /** Форма по последним 10 картам: рейтинг за карту. */
  form: number[]
  mapStats: PlayerMapStat[]
  recent: {
    matchId: string
    opponent: string
    map: string
    score: string
    kills: number
    deaths: number
    assists: number
    rating: number
    won: boolean
  }[]
}

export const PERFORMANCE: Record<string, PlayerPerformance> = {
  aibek: {
    nickname: "aibek",
    rating: 1.14,
    kd: 1.18,
    adr: 82.4,
    kast: 73.1,
    headshots: 51,
    openingWinRate: 58,
    clutches: "24 / 61",
    form: [1.21, 0.98, 1.34, 1.06, 1.18, 0.91, 1.27, 1.42, 1.09, 1.16],
    mapStats: [
      { map: "Mirage", maps: 62, winRate: 71, rating: 1.22 },
      { map: "Ancient", maps: 48, winRate: 65, rating: 1.15 },
      { map: "Inferno", maps: 44, winRate: 59, rating: 1.08 },
      { map: "Nuke", maps: 31, winRate: 52, rating: 1.02 },
      { map: "Anubis", maps: 27, winRate: 63, rating: 1.19 },
    ],
    recent: [
      { matchId: "m-4402", opponent: "Silk Road", map: "Mirage", score: "13:9", kills: 24, deaths: 15, assists: 6, rating: 1.31, won: true },
      { matchId: "m-4398", opponent: "Osh Riot", map: "Ancient", score: "13:7", kills: 21, deaths: 12, assists: 4, rating: 1.38, won: true },
      { matchId: "m-4398", opponent: "Osh Riot", map: "Inferno", score: "10:13", kills: 18, deaths: 20, assists: 5, rating: 0.94, won: false },
      { matchId: "m-4391", opponent: "Steppe Wolves", map: "Nuke", score: "13:11", kills: 22, deaths: 17, assists: 7, rating: 1.16, won: true },
      { matchId: "m-4391", opponent: "Steppe Wolves", map: "Mirage", score: "13:6", kills: 20, deaths: 10, assists: 3, rating: 1.45, won: true },
    ],
  },
}

/** Универсальный профиль производительности для игроков без снимка. */
export function performanceFor(nickname: string, fallback: { hltvRating: number; kd: number; headshots: number }): PlayerPerformance {
  const existing = PERFORMANCE[nickname]
  if (existing) return existing

  const base = fallback.hltvRating
  return {
    nickname,
    rating: base,
    kd: fallback.kd,
    adr: Math.round((base * 72 + 6) * 10) / 10,
    kast: Math.round((base * 62 + 5) * 10) / 10,
    headshots: fallback.headshots,
    openingWinRate: Math.round(base * 48 + 4),
    clutches: "—",
    form: [base, base - 0.12, base + 0.09, base - 0.05, base + 0.14, base - 0.18, base + 0.04, base, base + 0.11, base - 0.07].map(
      (value) => Math.round(Math.max(0.4, value) * 100) / 100,
    ),
    mapStats: [],
    recent: [],
  }
}
