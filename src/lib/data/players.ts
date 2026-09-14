import { levelFromElo } from "@/lib/faceit"

export interface Player {
  id: string
  nickname: string
  /** FACEIT-ник для подтяжки ELO через Data API. */
  faceit: string
  /** SteamID64 — основной идентификатор входа. */
  steamId: string
  team: string | null
  teamTag: string | null
  role: string
  elo: number
  matches: number
  winRate: number
  hltvRating: number
  kd: number
  headshots: number
  country: string
  city: string
  /** Демо-снимок: обновляется из FACEIT при наличии ключа API. */
  synced: string
}

const raw: Omit<Player, "id">[] = [
  { nickname: "aibek", faceit: "aibek-kg", steamId: "76561198000000001", team: "Nomad Five", teamTag: "NMD", role: "IGL", elo: 3042, matches: 1840, winRate: 62, hltvRating: 1.14, kd: 1.18, headshots: 51, country: "KG", city: "Бишкек", synced: "12 минут назад" },
  { nickname: "turan", faceit: "turan_awp", steamId: "76561198000000002", team: "Nomad Five", teamTag: "NMD", role: "AWP", elo: 2614, matches: 1502, winRate: 59, hltvRating: 1.21, kd: 1.26, headshots: 38, country: "KG", city: "Бишкек", synced: "12 минут назад" },
  { nickname: "sardar", faceit: "sardar-alt", steamId: "76561198000000003", team: "Ala-Too Esports", teamTag: "ALT", role: "IGL", elo: 2288, matches: 2104, winRate: 56, hltvRating: 1.05, kd: 1.02, headshots: 47, country: "KG", city: "Ош", synced: "28 минут назад" },
  { nickname: "mirbek", faceit: "mirbek", steamId: "76561198000000004", team: "Nomad Five", teamTag: "NMD", role: "Entry", elo: 2105, matches: 1320, winRate: 57, hltvRating: 1.09, kd: 1.11, headshots: 58, country: "KG", city: "Бишкек", synced: "12 минут назад" },
  { nickname: "nurs", faceit: "nurs1k", steamId: "76561198000000005", team: "Ala-Too Esports", teamTag: "ALT", role: "AWP", elo: 1964, matches: 986, winRate: 55, hltvRating: 1.12, kd: 1.15, headshots: 34, country: "KG", city: "Бишкек", synced: "28 минут назад" },
  { nickname: "dastan", faceit: "dastan-stw", steamId: "76561198000000006", team: "Steppe Wolves", teamTag: "STW", role: "AWP", elo: 1877, matches: 1444, winRate: 53, hltvRating: 1.07, kd: 1.08, headshots: 41, country: "KG", city: "Каракол", synced: "1 час назад" },
  { nickname: "elmar", faceit: "elmar_support", steamId: "76561198000000007", team: "Nomad Five", teamTag: "NMD", role: "Support", elo: 1802, matches: 1190, winRate: 54, hltvRating: 0.99, kd: 0.97, headshots: 44, country: "KG", city: "Бишкек", synced: "12 минут назад" },
  { nickname: "temir", faceit: "temir-entry", steamId: "76561198000000008", team: "Ala-Too Esports", teamTag: "ALT", role: "Entry", elo: 1741, matches: 1622, winRate: 52, hltvRating: 1.02, kd: 1.04, headshots: 55, country: "KG", city: "Ош", synced: "28 минут назад" },
  { nickname: "arsen", faceit: "arsen-igl", steamId: "76561198000000009", team: "Steppe Wolves", teamTag: "STW", role: "IGL", elo: 1658, matches: 1070, winRate: 51, hltvRating: 0.98, kd: 0.96, headshots: 46, country: "KG", city: "Токмок", synced: "1 час назад" },
  { nickname: "kanat", faceit: "kanat_", steamId: "76561198000000010", team: "Nomad Five", teamTag: "NMD", role: "Lurk", elo: 1590, matches: 1310, winRate: 53, hltvRating: 0.96, kd: 0.94, headshots: 49, country: "KG", city: "Бишкек", synced: "12 минут назад" },
  { nickname: "ilim", faceit: "ilim-entry", steamId: "76561198000000011", team: "Steppe Wolves", teamTag: "STW", role: "Entry", elo: 1488, matches: 754, winRate: 50, hltvRating: 1.01, kd: 1.03, headshots: 57, country: "KG", city: "Бишкек", synced: "1 час назад" },
  { nickname: "aman", faceit: "aman-sup", steamId: "76561198000000012", team: "Ala-Too Esports", teamTag: "ALT", role: "Support", elo: 1402, matches: 1188, winRate: 49, hltvRating: 0.94, kd: 0.92, headshots: 43, country: "KG", city: "Джалал-Абад", synced: "28 минут назад" },
  { nickname: "ruslan", faceit: "ruslan-kg", steamId: "76561198000000013", team: null, teamTag: null, role: "Rifler", elo: 1327, matches: 612, winRate: 48, hltvRating: 0.95, kd: 0.93, headshots: 52, country: "KG", city: "Бишкек", synced: "3 часа назад" },
  { nickname: "bek", faceit: "bek-lurk", steamId: "76561198000000014", team: "Ala-Too Esports", teamTag: "ALT", role: "Lurk", elo: 1244, matches: 498, winRate: 47, hltvRating: 0.91, kd: 0.9, headshots: 48, country: "KG", city: "Ош", synced: "28 минут назад" },
  { nickname: "azamat", faceit: "azamat-kg", steamId: "76561198000000015", team: null, teamTag: null, role: "Rifler", elo: 1163, matches: 402, winRate: 46, hltvRating: 0.89, kd: 0.88, headshots: 50, country: "KG", city: "Нарын", synced: "5 часов назад" },
  { nickname: "islam", faceit: "islam-kg", steamId: "76561198000000016", team: null, teamTag: null, role: "Support", elo: 1088, matches: 356, winRate: 45, hltvRating: 0.87, kd: 0.85, headshots: 42, country: "KG", city: "Бишкек", synced: "5 часов назад" },
  { nickname: "erlan", faceit: "erlan-kg", steamId: "76561198000000017", team: null, teamTag: null, role: "Rifler", elo: 994, matches: 288, winRate: 44, hltvRating: 0.85, kd: 0.84, headshots: 45, country: "KG", city: "Талас", synced: "8 часов назад" },
  { nickname: "salim", faceit: "salim-kg", steamId: "76561198000000018", team: null, teamTag: null, role: "Entry", elo: 932, matches: 214, winRate: 43, hltvRating: 0.84, kd: 0.82, headshots: 54, country: "KG", city: "Баткен", synced: "8 часов назад" },
  { nickname: "timur", faceit: "timur-kg", steamId: "76561198000000019", team: null, teamTag: null, role: "Support", elo: 861, matches: 176, winRate: 41, hltvRating: 0.8, kd: 0.79, headshots: 39, country: "KG", city: "Бишкек", synced: "1 день назад" },
  { nickname: "adil", faceit: "adil-kg", steamId: "76561198000000020", team: null, teamTag: null, role: "Rifler", elo: 742, matches: 132, winRate: 39, hltvRating: 0.77, kd: 0.76, headshots: 47, country: "KG", city: "Кара-Балта", synced: "1 день назад" },
]

export const PLAYERS: Player[] = raw.map((player) => ({
  ...player,
  id: player.steamId,
}))

export function playerLevel(player: Player) {
  return levelFromElo(player.elo)
}

/** Свободный пул для MIX — игроки без команды плюс все желающие. */
export const MIX_POOL: Player[] = PLAYERS

export function findPlayer(nickname: string) {
  return PLAYERS.find((player) => player.nickname === nickname)
}
