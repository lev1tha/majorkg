/**
 * Контракт API — зеркало backend/src/types.ts. Менять оба файла синхронно.
 *
 * Дисциплина всегда одна (CS2), поэтому поля game нет. Призовых, балансов
 * и трансляций в контракте тоже нет — платформа их не считает. Деньги
 * фигурируют ровно в одном месте: организационный взнос за участие.
 */

export type TournamentStatus = "draft" | "registration" | "checkin" | "live" | "finished"
export type RegistrationStatus = "pending" | "confirmed" | "checked_in" | "rejected" | "withdrawn"
export type MatchState = "pending" | "live" | "review" | "done"
export type PlayerStatus = "active" | "review" | "banned"

export interface PlayerDto {
  id: number
  nickname: string
  faceit: string | null
  steamId: string
  avatar: string | null
  role: string
  country: string
  city: string | null
  elo: number
  level: number
  matches: number
  winRate: number
  hltvRating: number
  kd: number
  headshots: number
  points: number
  mapsPlayed: number
  trend: "up" | "down" | "flat"
  status: PlayerStatus
  /** true — ELO пришло из FACEIT Data API, false — снимок из базы. */
  eloLive: boolean
  syncedAt: string | null
}

export interface PlayerPerformanceDto {
  nickname: string
  rating: number
  kd: number
  adr: number
  kast: number
  headshots: number
  openingWinRate: number
  mapStats: { map: string; maps: number; winRate: number; rating: number }[]
  recent: {
    matchId: number
    tournament: string
    opponent: string
    map: string
    score: string
    won: boolean
  }[]
}

export interface TournamentDto {
  slug: string
  title: string
  edition: string
  summary: string
  teamSize: number
  /** Формат подписи: 5v5, 2v2, 1v1. */
  teamSizeLabel: string
  bracket: "single"
  status: TournamentStatus
  slots: number
  /** Сколько игроков заявлено — регистрация индивидуальная. */
  registered: number
  startsAt: string
  startsInMinutes: number
  region: string
  organizer: string
  tier: "S" | "A" | "B"
  ruleset: string
  server: string
  maps: string[]
  /** Организационный взнос за участие, сом. 0 — бесплатный турнир. */
  entryFee: number
  /** Регламент турнира: редактируется организатором, не зашит в код. */
  rules: RuleBlockDto[]
  featured: boolean
  drawBeforeMinutes: number
  /** Заявлен ли текущий зритель и в каком статусе. */
  viewerRegistration: RegistrationStatus | null
}

export interface RuleBlockDto {
  title: string
  items: string[]
}

export interface ParticipantDto {
  registrationId: number
  seed: number | null
  status: RegistrationStatus
  player: Pick<PlayerDto, "id" | "nickname" | "elo" | "level" | "role" | "city" | "hltvRating" | "kd">
  createdAt: string
}

export interface LineupMemberDto {
  playerId: number
  nickname: string
  role: string
  elo: number
  level: number
  hltvRating: number
  kd: number
}

export interface LineupDto {
  id: number
  name: string
  tag: string
  seed: number
  avgElo: number
  members: LineupMemberDto[]
}

export interface MatchSideDto {
  lineupId: number
  tag: string
  name: string
  seed: number
  score: number | null
}

export interface MatchDto {
  id: number
  tournamentSlug: string
  tournamentTitle: string
  round: number
  position: number
  roundName: string
  a: MatchSideDto | null
  b: MatchSideDto | null
  winner: "a" | "b" | null
  state: MatchState
  format: string
  scheduledAt: string | null
  note: string
  proof: boolean
  maps: { map: string; scoreA: number; scoreB: number }[]
}

/** Верхняя сетка — единственная сетка турнира. */
export interface BracketRoundDto {
  id: string
  name: string
  matches: MatchDto[]
}

export interface LeaderboardRowDto {
  place: number
  playerId: number
  nickname: string
  role: string
  elo: number
  level: number
  points: number
  mapsPlayed: number
  winRate: number
  hltvRating: number
  trend: "up" | "down" | "flat"
}

export interface ScoutNoteDto {
  id: number
  subject: string
  body: string
  createdAt: string
}

export interface AppealDto {
  id: number
  matchId: number
  match: string
  claimant: string | null
  reason: string
  severity: "low" | "medium" | "high"
  status: "open" | "resolved" | "declined"
  createdAt: string
}

export interface ViewerDto {
  id: number
  nickname: string
  steamId: string
  /** Аватар из Steam. null — ключ STEAM_API_KEY не настроен. */
  avatar: string | null
  status: PlayerStatus
  elo: number
  level: number
  /** true — ник и аватар подтянуты из Steam, false — заглушка steam_XXXXXX. */
  steamSynced: boolean
}

/** Организатор: отдельная учетка со входом по логину и паролю. */
export interface AdminDto {
  id: number
  login: string
  name: string
  lastLoginAt: string | null
}

export interface FaqItemDto {
  id: number
  question: string
  answer: string
  position: number
  published: boolean
}

export interface AdminOverviewDto {
  /** Сумма ожидаемых взносов по активным турнирам, сом. */
  expectedFees: number
  activeTournaments: number
  registeredPlayers: number
  pendingRegistrations: number
  liveMatches: number
  openAppeals: number
  playersTotal: number
  matchesTotal: number
}
