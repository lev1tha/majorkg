import type { GameId } from "./games"

export type TournamentStatus = "registration" | "checkin" | "live" | "finished"
export type BracketType = "single" | "double" | "swiss" | "groups"

export interface Tournament {
  slug: string
  title: string
  edition: string
  game: GameId
  teamSize: string
  bracket: BracketType
  status: TournamentStatus
  prizePool: number
  currency: "KGS" | "USD"
  slots: number
  registered: number
  /** Evergreen countdown anchor — minutes from the moment the page mounts. */
  startsInMinutes: number
  /** Pre-formatted, timezone-stable label. */
  startLabel: string
  /** Абсолютная дата старта — для <time> и Event-разметки. */
  startDateISO: string
  region: string
  entryFee: number
  organizer: string
  tier: "S" | "A" | "B"
  featured?: boolean
  summary: string
  /** MIX: игроки заявляются соло, составы собираются жеребьевкой. */
  mix?: boolean
  /** За сколько минут до старта запускается жеребьевка. */
  drawBeforeMinutes?: number
  /** CS2-специфика: регламент раундов, пул карт, сервера. */
  ruleset?: string
  maps?: string[]
  server?: string
}

export const ACTIVE_MAP_POOL = ["Mirage", "Inferno", "Ancient", "Nuke", "Anubis", "Dust II", "Train"]

export const BRACKET_LABEL: Record<BracketType, string> = {
  single: "Single Elimination",
  double: "Double Elimination",
  swiss: "Swiss System",
  groups: "Группы + Playoff",
}

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  registration: "Идет регистрация",
  checkin: "Check-in открыт",
  live: "Матчи идут",
  finished: "Завершен",
}

export const TOURNAMENTS: Tournament[] = [
  {
    slug: "major-kg-open",
    title: "MAJOR KG OPEN",
    edition: "Season 4 · CS2",
    game: "cs2",
    teamSize: "5v5",
    bracket: "double",
    status: "registration",
    prizePool: 50_000,
    currency: "KGS",
    slots: 16,
    registered: 12,
    startsInMinutes: 214,
    startLabel: "24 сентября, 19:00 (GMT+6)",
    startDateISO: "2026-09-24T19:00:00+06:00",
    region: "Кыргызстан",
    entryFee: 0,
    organizer: "MAJOR KG",
    tier: "S",
    featured: true,
    ruleset: "MR12 · OT MR3 · 128 tick",
    maps: ACTIVE_MAP_POOL,
    server: "Bishkek / Almaty · 128 tick",
    summary:
      "Главный открытый CS2-турнир сезона. Double Elimination, BO3 от четвертьфинала, студийная трансляция и прямой слот в региональную квалификацию для чемпиона.",
  },
  {
    slug: "mix-arena",
    title: "MIX ARENA",
    edition: "Daily · CS2",
    game: "cs2",
    teamSize: "MIX 5v5",
    bracket: "single",
    status: "registration",
    prizePool: 6_000,
    currency: "KGS",
    slots: 25,
    registered: 20,
    startsInMinutes: 74,
    startLabel: "Сегодня, 21:30 (GMT+6)",
    startDateISO: "2026-09-14T21:30:00+06:00",
    region: "Кыргызстан",
    entryFee: 0,
    organizer: "MAJOR KG",
    tier: "B",
    mix: true,
    drawBeforeMinutes: 20,
    ruleset: "MR12 · BO1 до финала",
    maps: ["Mirage", "Inferno", "Ancient", "Dust II"],
    server: "Bishkek · 128 tick",
    summary:
      "Ежедневный микс: заходите один, за 20 минут до старта жеребьевка разложит всех по рейтинговым поясам и соберет равные составы. Готовые команды сразу попадают в сетку.",
  },
  {
    slug: "bishkek-clash",
    title: "BISHKEK CLASH",
    edition: "Autumn · CS2",
    game: "cs2",
    teamSize: "5v5",
    bracket: "double",
    status: "checkin",
    prizePool: 25_000,
    currency: "KGS",
    slots: 32,
    registered: 32,
    startsInMinutes: 41,
    startLabel: "Сегодня, 21:00 (GMT+6)",
    startDateISO: "2026-09-14T21:00:00+06:00",
    region: "Центральная Азия",
    entryFee: 0,
    organizer: "MAJOR KG",
    tier: "A",
    ruleset: "MR12 · OT MR3 · 128 tick",
    maps: ACTIVE_MAP_POOL,
    server: "Bishkek · 128 tick",
    summary:
      "Слоты закрыты — идет check-in. Vetos через платформу, обязательный античит-клиент и GOTV-запись каждой карты.",
  },
  {
    slug: "night-ladder",
    title: "NIGHT LADDER",
    edition: "Week 12 · CS2",
    game: "cs2",
    teamSize: "5v5",
    bracket: "swiss",
    status: "live",
    prizePool: 5_000,
    currency: "KGS",
    slots: 64,
    registered: 51,
    startsInMinutes: 0,
    startLabel: "Идет сейчас",
    startDateISO: "2026-09-14T20:00:00+06:00",
    region: "Кыргызстан",
    entryFee: 0,
    organizer: "MAJOR KG",
    tier: "B",
    ruleset: "MR12 · BO1 до 3 побед",
    maps: ["Mirage", "Inferno", "Ancient", "Dust II"],
    server: "Bishkek · 128 tick",
    summary:
      "Еженедельная швейцарка на 5 раундов. Три победы — прямой слот в плейофф ближайшего Clash без отбора.",
  },
  {
    slug: "ala-too-league",
    title: "ALA-TOO LEAGUE",
    edition: "Division 1 · CS2",
    game: "cs2",
    teamSize: "5v5",
    bracket: "groups",
    status: "registration",
    prizePool: 20_000,
    currency: "KGS",
    slots: 16,
    registered: 14,
    startsInMinutes: 96,
    startLabel: "Сегодня, 22:30 (GMT+6)",
    startDateISO: "2026-09-14T22:30:00+06:00",
    region: "Кыргызстан",
    entryFee: 0,
    organizer: "MAJOR KG",
    tier: "A",
    ruleset: "MR12 · круговая группа BO2",
    maps: ACTIVE_MAP_POOL,
    server: "Bishkek · 128 tick",
    summary:
      "Сезонная лига: две группы по 8, круговой этап BO2, плейофф BO3. Таблица и статистика игроков обновляются после каждой карты.",
  },
  {
    slug: "retake-arena",
    title: "RETAKE ARENA",
    edition: "Fast Cup · CS2",
    game: "cs2",
    teamSize: "2v2",
    bracket: "double",
    status: "registration",
    prizePool: 8_000,
    currency: "KGS",
    slots: 64,
    registered: 40,
    startsInMinutes: 320,
    startLabel: "Сегодня, 23:00 (GMT+6)",
    startDateISO: "2026-09-14T23:00:00+06:00",
    region: "Кыргызстан",
    entryFee: 0,
    organizer: "MAJOR KG",
    tier: "B",
    ruleset: "Wingman · MR8",
    maps: ["Overpass", "Nuke", "Vertigo", "Inferno"],
    server: "Bishkek · 128 tick",
    summary:
      "Wingman-формат на двоих: заявка без полного состава, матчи по 15 минут, автоматическая сетка сразу после закрытия слотов.",
  },
  {
    slug: "academy-league",
    title: "ACADEMY LEAGUE",
    edition: "Division 2 · CS2",
    game: "cs2",
    teamSize: "5v5",
    bracket: "groups",
    status: "registration",
    prizePool: 10_000,
    currency: "KGS",
    slots: 12,
    registered: 9,
    startsInMinutes: 2_880,
    startLabel: "27 сентября, 19:00 (GMT+6)",
    startDateISO: "2026-09-27T19:00:00+06:00",
    region: "Кыргызстан",
    entryFee: 0,
    organizer: "MAJOR KG Academy",
    tier: "B",
    ruleset: "MR12 · демо-разбор после тура",
    maps: ["Mirage", "Inferno", "Ancient", "Anubis"],
    server: "Bishkek · 128 tick",
    summary:
      "Лига для новых составов: два круга в группе, разбор демок от аналитиков и переход победителя в основной дивизион.",
  },
  {
    slug: "nomad-split",
    title: "NOMAD SPLIT",
    edition: "Open #7 · Valorant",
    game: "valorant",
    teamSize: "5v5",
    bracket: "single",
    status: "registration",
    prizePool: 300,
    currency: "USD",
    slots: 8,
    registered: 6,
    startsInMinutes: 640,
    startLabel: "25 сентября, 17:00 (GMT+6)",
    startDateISO: "2026-09-25T17:00:00+06:00",
    region: "CIS",
    entryFee: 0,
    organizer: "Nomad League",
    tier: "A",
    summary: "Международный открытый сплит с призовым фондом в долларах и выплатой в течение 5 рабочих дней.",
  },
  {
    slug: "highlands-cup",
    title: "HIGHLANDS CUP",
    edition: "Qualifier 2 · MLBB",
    game: "mlbb",
    teamSize: "5v5",
    bracket: "single",
    status: "registration",
    prizePool: 12_000,
    currency: "KGS",
    slots: 16,
    registered: 11,
    startsInMinutes: 1_430,
    startLabel: "26 сентября, 18:00 (GMT+6)",
    startDateISO: "2026-09-26T18:00:00+06:00",
    region: "Центральная Азия",
    entryFee: 0,
    organizer: "Highlands",
    tier: "B",
    summary: "Мобильная дисциплина в общем календаре: BO1 до полуфинала, BO5 в гранд-финале.",
  },
]

export const FEATURED_TOURNAMENT = TOURNAMENTS.find((t) => t.featured) ?? TOURNAMENTS[0]

export function getTournament(slug: string) {
  return TOURNAMENTS.find((tournament) => tournament.slug === slug)
}

/** Cards shown in the hero strip — the closest starts, always actionable. */
export const STARTING_SOON = [...TOURNAMENTS]
  .filter((t) => t.status !== "finished")
  .sort((a, b) => a.startsInMinutes - b.startsInMinutes)
  .slice(0, 3)
