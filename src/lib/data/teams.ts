import type { GameId } from "./games"

export interface RosterPlayer {
  nickname: string
  role: string
  verified: boolean
}

export interface Team {
  id: string
  name: string
  tag: string
  game: GameId
  /** Роль текущего пользователя в этой команде. */
  role: "captain" | "player"
  roster: RosterPlayer[]
  requiredSize: number
  rating: number
  winRate: number
}

/** Составы пользователя — то, чем он может заявиться в один клик. */
export const MY_TEAMS: Team[] = [
  {
    id: "nomad-five",
    name: "Nomad Five",
    tag: "NMD",
    game: "cs2",
    role: "captain",
    requiredSize: 5,
    rating: 1840,
    winRate: 68,
    roster: [
      { nickname: "aibek", role: "IGL", verified: true },
      { nickname: "turan", role: "AWP", verified: true },
      { nickname: "mirbek", role: "Entry", verified: true },
      { nickname: "elmar", role: "Support", verified: true },
      { nickname: "kanat", role: "Lurk", verified: true },
    ],
  },
  {
    id: "ala-too",
    name: "Ala-Too Esports",
    tag: "ALT",
    game: "cs2",
    role: "captain",
    requiredSize: 5,
    rating: 1620,
    winRate: 57,
    roster: [
      { nickname: "sardar", role: "IGL", verified: true },
      { nickname: "nurs", role: "AWP", verified: true },
      { nickname: "temir", role: "Entry", verified: true },
      { nickname: "aman", role: "Support", verified: true },
      { nickname: "bek", role: "Lurk", verified: false },
    ],
  },
  {
    id: "steppe-wolves",
    name: "Steppe Wolves",
    tag: "STW",
    game: "cs2",
    role: "player",
    requiredSize: 5,
    rating: 1410,
    winRate: 49,
    roster: [
      { nickname: "arsen", role: "IGL", verified: true },
      { nickname: "dastan", role: "AWP", verified: true },
      { nickname: "ilim", role: "Entry", verified: true },
      { nickname: "ruslan", role: "Support", verified: false },
    ],
  },
  {
    id: "silk-road",
    name: "Silk Road MLBB",
    tag: "SLK",
    game: "mlbb",
    role: "captain",
    requiredSize: 5,
    rating: 1290,
    winRate: 44,
    roster: [
      { nickname: "azamat", role: "Roam", verified: true },
      { nickname: "islam", role: "Jungle", verified: true },
      { nickname: "timur", role: "Mid", verified: true },
      { nickname: "erlan", role: "Gold", verified: true },
      { nickname: "salim", role: "EXP", verified: true },
    ],
  },
]

export interface Participant {
  seed: number
  name: string
  tag: string
  status: "confirmed" | "checkin" | "pending"
  players: number
  rating: number
  /** Карта, которую команда чаще всего пикает. */
  signature: string
}

export const PARTICIPANTS: Participant[] = [
  { seed: 1, name: "Nomad Five", tag: "NMD", status: "confirmed", players: 5, rating: 1840, signature: "Mirage" },
  { seed: 2, name: "Silk Road", tag: "SLK", status: "confirmed", players: 5, rating: 1795, signature: "Ancient" },
  { seed: 3, name: "Tian Shan", tag: "TSH", status: "confirmed", players: 5, rating: 1748, signature: "Nuke" },
  { seed: 4, name: "Ala-Too Esports", tag: "ALT", status: "confirmed", players: 5, rating: 1702, signature: "Inferno" },
  { seed: 5, name: "Tokmok Elite", tag: "TKM", status: "checkin", players: 5, rating: 1664, signature: "Anubis" },
  { seed: 6, name: "Manas GG", tag: "MNS", status: "confirmed", players: 5, rating: 1620, signature: "Mirage" },
  { seed: 7, name: "Osh Riot", tag: "OSH", status: "checkin", players: 5, rating: 1588, signature: "Dust II" },
  { seed: 8, name: "Pamir Line", tag: "PMR", status: "confirmed", players: 5, rating: 1544, signature: "Train" },
  { seed: 9, name: "Steppe Wolves", tag: "STW", status: "pending", players: 4, rating: 1502, signature: "Inferno" },
  { seed: 10, name: "Naryn Core", tag: "NRN", status: "confirmed", players: 5, rating: 1477, signature: "Ancient" },
  { seed: 11, name: "Kara Balta", tag: "KRB", status: "pending", players: 5, rating: 1440, signature: "Mirage" },
  { seed: 12, name: "Chuy Valley", tag: "CHV", status: "confirmed", players: 5, rating: 1398, signature: "Nuke" },
]

export interface Stream {
  id: string
  title: string
  channel: string
  platform: "Twitch" | "YouTube" | "Kick"
  language: string
  viewers: number
  live: boolean
  note: string
}

export const STREAMS: Stream[] = [
  { id: "s1", title: "Main Stage · основная трансляция", channel: "majorkg", platform: "Twitch", language: "RU", viewers: 4_820, live: true, note: "UB 1/2 · Mirage" },
  { id: "s2", title: "Кыргызская студия", channel: "majorkg_ky", platform: "YouTube", language: "KY", viewers: 1_340, live: true, note: "UB 1/4 · Inferno" },
  { id: "s3", title: "POV · aibek (IGL, Nomad Five)", channel: "aibek", platform: "Kick", language: "RU", viewers: 610, live: true, note: "First-person" },
  { id: "s4", title: "GOTV-разбор демок дня", channel: "majorkg", platform: "YouTube", language: "RU", viewers: 0, live: false, note: "Завтра, 13:00" },
]

export interface LeaderboardRow {
  place: number
  team: string
  tag: string
  points: number
  maps: number
  winRate: number
  prize: number
  trend: "up" | "down" | "flat"
}

export const LEADERBOARD: LeaderboardRow[] = [
  { place: 1, team: "Nomad Five", tag: "NMD", points: 4_820, maps: 38, winRate: 71, prize: 640_000, trend: "up" },
  { place: 2, team: "Silk Road", tag: "SLK", points: 4_390, maps: 41, winRate: 66, prize: 480_000, trend: "up" },
  { place: 3, team: "Tian Shan", tag: "TSH", points: 4_105, maps: 36, winRate: 63, prize: 355_000, trend: "down" },
  { place: 4, team: "Ala-Too Esports", tag: "ALT", points: 3_870, maps: 44, winRate: 59, prize: 290_000, trend: "flat" },
  { place: 5, team: "Manas GG", tag: "MNS", points: 3_612, maps: 33, winRate: 58, prize: 210_000, trend: "up" },
]
