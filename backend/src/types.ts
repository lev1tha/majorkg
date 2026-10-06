/**
 * Контракт API. Фронтенд повторяет эти типы у себя (frontend/src/lib/types.ts) —
 * менять их нужно синхронно.
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
  /** Привязан ли профиль FACEIT (ищется по SteamID64 при входе). */
  faceitLinked: boolean
  /** false — ссылку на Steam ввели вручную, через Steam игрок не входил. */
  steamVerified: boolean
  syncedAt: string | null
}

/** Игрок в админке: плюс контакты, которые публично не показываются. */
export interface AdminPlayerDto extends PlayerDto {
  telegram: string | null
  discord: string | null
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

/** Заявка в админке: плюс отметка оплаты, которую видит только организатор. */
export interface AdminParticipantDto extends ParticipantDto {
  /** Когда организатор отметил взнос оплаченным. null — не оплачен. */
  paidAt: string | null
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
  /** Аватар из Steam. null — Steam еще ни разу не ответил. */
  avatar: string | null
  status: PlayerStatus
  elo: number
  level: number
  /** true — ник и аватар подтянуты из Steam, false — заглушка steam_XXXXXX. */
  steamSynced: boolean
  /** Привязан ли профиль FACEIT — ищется по SteamID64 при входе. */
  faceitLinked: boolean
  /** false — аккаунт заведен по нику и паролю, Steam указан вручную. */
  steamVerified: boolean
  /** Можно ли войти по нику и паролю. */
  hasPassword: boolean
  role: string
  city: string | null
  telegram: string | null
  discord: string | null
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

// ──────────────────────── Игровые серверы ─────────────────────────────

export interface ServerStatusDto {
  online: boolean
  map: string | null
  players: number
  maxPlayers: number
  ping: number | null
  checkedAt: string
}

export interface ServerDto {
  id: number
  name: string
  host: string
  port: number
  location: string
  public: boolean
  active: boolean
  note: string
  /** Есть ли пароль RCON. Сам пароль наружу не отдается. */
  rconConfigured: boolean
  connect: string
  status: ServerStatusDto
}

export interface MatchConfigDto {
  matchId: number
  server: { id: number; name: string; connect: string } | null
  maps: string[]
  password: string
  commands: string[]
  script: string
}

// ───────────────────────────── Вето карт ──────────────────────────────

export type VetoAction = "ban" | "pick"
export type VetoSide = "a" | "b"

export interface VetoStepDto {
  ordinal: number
  action: VetoAction
  side: VetoSide
  /** Заполнен, когда ход сделан. */
  map: string | null
}

export interface VetoStateDto {
  matchId: number
  format: string
  pool: string[]
  available: string[]
  steps: VetoStepDto[]
  turn: VetoStepDto | null
  finished: boolean
  /** Итоговый порядок карт серии — то, что готовится на сервере. */
  maps: string[]
  decider: string | null
  /** Сторона текущего зрителя, если он играет в этом матче. */
  viewerSide: VetoSide | null
  sides: {
    a: { lineupId: number; tag: string; name: string; seed: number } | null
    b: { lineupId: number; tag: string; name: string; seed: number } | null
  }
}

export interface ServerQueueItemDto {
  matchId: number
  format: string
  state: string
  a: { tag: string; name: string }
  b: { tag: string; name: string }
  finished: boolean
  maps: string[]
  waitingFor: VetoSide | null
}

export interface AdminOverviewDto {
  /** Сумма ожидаемых взносов по активным турнирам, сом. */
  expectedFees: number
  /** Сколько из них уже отмечено оплаченным, сом. */
  collectedFees: number
  activeTournaments: number
  registeredPlayers: number
  pendingRegistrations: number
  liveMatches: number
  openAppeals: number
  playersTotal: number
  matchesTotal: number
}

/**
 * Сигнал к бою для участника: на сайте играет боевой рог и всплывает окно.
 * key уникален для события — по нему браузер помнит, что уже протрубил.
 */
export interface BattleAlertDto {
  key: string
  /** rally — организатор созвал участников, live — турнир начался, match — ваш матч в эфире. */
  kind: "rally" | "live" | "match"
  title: string
  text: string
  href: string
}
