export interface Metric {
  id: string
  label: string
  value: number
  suffix?: string
  delta: number
  deltaLabel: string
  /** Normalized 0..1 series for the inline sparkline. */
  series: number[]
}

export const METRICS: Metric[] = [
  {
    id: "tournaments",
    label: "Всего турниров",
    value: 128,
    delta: 12,
    deltaLabel: "за 30 дней",
    series: [0.32, 0.38, 0.35, 0.48, 0.52, 0.49, 0.61, 0.68, 0.64, 0.78, 0.86, 0.94],
  },
  {
    id: "players",
    label: "Активные игроки",
    value: 8_942,
    delta: 8.4,
    deltaLabel: "неделя к неделе",
    series: [0.42, 0.45, 0.52, 0.5, 0.58, 0.63, 0.6, 0.69, 0.74, 0.72, 0.81, 0.88],
  },
  {
    id: "teams",
    label: "Активные команды",
    value: 1_264,
    delta: 34,
    deltaLabel: "новых за неделю",
    series: [0.55, 0.51, 0.58, 0.62, 0.6, 0.67, 0.71, 0.69, 0.74, 0.79, 0.83, 0.9],
  },
  {
    id: "matches",
    label: "Проведенные матчи",
    value: 21_480,
    delta: -2.1,
    deltaLabel: "к прошлой неделе",
    series: [0.68, 0.72, 0.7, 0.75, 0.8, 0.77, 0.83, 0.79, 0.74, 0.7, 0.66, 0.63],
  },
]

export type RequestKind = "application" | "roster" | "payout"

export interface AdminRequest {
  id: string
  kind: RequestKind
  team: string
  tag: string
  tournament: string
  detail: string
  age: string
  priority: "normal" | "high"
}

export const REQUEST_FEED: AdminRequest[] = [
  {
    id: "REQ-2841",
    kind: "application",
    team: "Steppe Wolves",
    tag: "STW",
    tournament: "MAJOR KG OPEN · CS2",
    detail: "Заявка на слот · состав 4/5",
    age: "2 мин",
    priority: "high",
  },
  {
    id: "REQ-2840",
    kind: "roster",
    team: "Osh Riot",
    tag: "OSH",
    tournament: "BISHKEK CLASH · CS2",
    detail: "Замена игрока: temir → bekzat (AWP)",
    age: "11 мин",
    priority: "normal",
  },
  {
    id: "REQ-2839",
    kind: "payout",
    team: "Nomad Five",
    tag: "NMD",
    tournament: "NIGHT LADDER · Week 11",
    detail: "Выплата призовых 60 000 KGS",
    age: "34 мин",
    priority: "high",
  },
  {
    id: "REQ-2838",
    kind: "application",
    team: "Naryn Core",
    tag: "NRN",
    tournament: "ALA-TOO LEAGUE · CS2",
    detail: "Заявка на слот · состав 5/5",
    age: "48 мин",
    priority: "normal",
  },
  {
    id: "REQ-2837",
    kind: "application",
    team: "Batken Fury",
    tag: "BTK",
    tournament: "RETAKE ARENA · CS2",
    detail: "Заявка на слот · Wingman 2/2",
    age: "1 ч",
    priority: "normal",
  },
]

export interface Appeal {
  id: string
  match: string
  claimant: string
  reason: string
  severity: "low" | "medium" | "high"
  age: string
}

export const APPEALS: Appeal[] = [
  {
    id: "APL-114",
    match: "NMD vs PMR · UB 1/4 #1 · Ancient",
    claimant: "Pamir Line",
    reason: "Оспаривание результата: скриншот счета не совпадает с GOTV-демо",
    severity: "high",
    age: "6 мин",
  },
  {
    id: "APL-113",
    match: "ALT vs TKM · UB 1/4 #2 · Nuke",
    claimant: "Tokmok Elite",
    reason: "Задержка старта карты более 15 минут со стороны соперника",
    severity: "medium",
    age: "27 мин",
  },
  {
    id: "APL-112",
    match: "MNS vs TSH · UB 1/4 #3 · Mirage",
    claimant: "Tian Shan",
    reason: "Незаявленный игрок в составе, несовпадение Steam ID с заявкой",
    severity: "high",
    age: "52 мин",
  },
]

export interface AdminTournamentRow {
  id: string
  title: string
  game: string
  format: string
  status: "draft" | "registration" | "live" | "finished"
  slots: string
  prize: string
  starts: string
}

export const ADMIN_TOURNAMENTS: AdminTournamentRow[] = [
  { id: "T-128", title: "MAJOR KG OPEN", game: "CS2", format: "Double Elim · 5v5 · MR12", status: "registration", slots: "12 / 16", prize: "1 000 000 KGS", starts: "24.09 · 19:00" },
  { id: "T-127", title: "BISHKEK CLASH", game: "CS2", format: "Double Elim · 5v5 · MR12", status: "live", slots: "32 / 32", prize: "250 000 KGS", starts: "Сегодня · 21:00" },
  { id: "T-126", title: "ALA-TOO LEAGUE", game: "CS2", format: "Группы BO2 · 5v5", status: "registration", slots: "14 / 16", prize: "180 000 KGS", starts: "Сегодня · 22:30" },
  { id: "T-125", title: "RETAKE ARENA", game: "CS2", format: "Wingman · 2v2 · MR8", status: "registration", slots: "40 / 64", prize: "40 000 KGS", starts: "Сегодня · 23:00" },
  { id: "T-124", title: "NIGHT LADDER · W12", game: "CS2", format: "Swiss · BO1 · MR12", status: "live", slots: "51 / 64", prize: "60 000 KGS", starts: "Идет сейчас" },
  { id: "T-123", title: "WINTER INVITE", game: "CS2", format: "Double Elim · 5v5 · MR12", status: "draft", slots: "0 / 8", prize: "300 000 KGS", starts: "Не назначено" },
  { id: "T-122", title: "NOMAD SPLIT", game: "Valorant", format: "Single Elim · 5v5", status: "registration", slots: "6 / 8", prize: "$3 000", starts: "25.09 · 17:00" },
  { id: "T-121", title: "NIGHT LADDER · W11", game: "CS2", format: "Swiss · BO1 · MR12", status: "finished", slots: "64 / 64", prize: "60 000 KGS", starts: "07.09 · 20:00" },
]

export interface MatchMapScore {
  map: string
  a: number
  b: number
}

export interface MatchRow {
  id: string
  round: string
  a: string
  b: string
  scoreA: number | null
  scoreB: number | null
  state: "live" | "pending" | "review" | "done"
  format: string
  time: string
  proof: boolean
  maps: MatchMapScore[]
}

export const MATCH_QUEUE: MatchRow[] = [
  {
    id: "M-4412",
    round: "UB 1/4 #4",
    a: "Silk Road",
    b: "Osh Riot",
    scoreA: 1,
    scoreB: 1,
    state: "live",
    format: "BO3",
    time: "идет карта 3 · Inferno",
    proof: false,
    maps: [
      { map: "Ancient", a: 13, b: 10 },
      { map: "Nuke", a: 11, b: 13 },
      { map: "Inferno", a: 7, b: 6 },
    ],
  },
  {
    id: "M-4411",
    round: "UB 1/2 #1",
    a: "Nomad Five",
    b: "Ala-Too Esports",
    scoreA: 1,
    scoreB: 0,
    state: "live",
    format: "BO3",
    time: "идет карта 2 · Anubis",
    proof: false,
    maps: [
      { map: "Mirage", a: 13, b: 6 },
      { map: "Anubis", a: 4, b: 2 },
    ],
  },
  {
    id: "M-4410",
    round: "UB 1/4 #1",
    a: "Nomad Five",
    b: "Pamir Line",
    scoreA: 2,
    scoreB: 0,
    state: "review",
    format: "BO3",
    time: "апелляция APL-114",
    proof: true,
    maps: [
      { map: "Mirage", a: 13, b: 7 },
      { map: "Ancient", a: 13, b: 9 },
    ],
  },
  {
    id: "M-4409",
    round: "UB 1/4 #2",
    a: "Ala-Too Esports",
    b: "Tokmok Elite",
    scoreA: 2,
    scoreB: 1,
    state: "done",
    format: "BO3",
    time: "18:00",
    proof: true,
    maps: [
      { map: "Inferno", a: 13, b: 11 },
      { map: "Nuke", a: 8, b: 13 },
      { map: "Anubis", a: 13, b: 10 },
    ],
  },
  {
    id: "M-4408",
    round: "UB 1/4 #3",
    a: "Tian Shan",
    b: "Manas GG",
    scoreA: 1,
    scoreB: 2,
    state: "done",
    format: "BO3",
    time: "19:30",
    proof: true,
    maps: [
      { map: "Dust II", a: 13, b: 16 },
      { map: "Mirage", a: 13, b: 8 },
      { map: "Train", a: 9, b: 13 },
    ],
  },
  {
    id: "M-4407",
    round: "LB R2 #1",
    a: "Tokmok Elite",
    b: "TBD",
    scoreA: null,
    scoreB: null,
    state: "pending",
    format: "BO3",
    time: "21:30",
    proof: false,
    maps: [],
  },
]

export interface AdminUser {
  id: string
  nickname: string
  fullName: string
  team: string
  role: string
  matches: number
  status: "active" | "banned" | "review"
  joined: string
}

export const ADMIN_USERS: AdminUser[] = [
  { id: "U-9021", nickname: "aibek", fullName: "Айбек Т.", team: "Nomad Five", role: "IGL", matches: 214, status: "active", joined: "12.03.2025" },
  { id: "U-9020", nickname: "sardar", fullName: "Сардар К.", team: "Ala-Too Esports", role: "IGL", matches: 187, status: "active", joined: "04.05.2025" },
  { id: "U-9019", nickname: "bek", fullName: "Бекзат М.", team: "Ala-Too Esports", role: "Lurk", matches: 96, status: "review", joined: "19.07.2026" },
  { id: "U-9018", nickname: "zhyrgal", fullName: "Жыргал А.", team: "Steppe Wolves", role: "AWP", matches: 41, status: "banned", joined: "22.01.2026" },
  { id: "U-9017", nickname: "dastan", fullName: "Дастан О.", team: "Steppe Wolves", role: "AWP", matches: 133, status: "active", joined: "08.11.2025" },
]

export interface AdminTeamRow {
  id: string
  name: string
  tag: string
  game: string
  roster: string
  status: "verified" | "incomplete" | "blocked"
  pendingPayout: number
}

export const ADMIN_TEAMS: AdminTeamRow[] = [
  { id: "TM-441", name: "Nomad Five", tag: "NMD", game: "CS2", roster: "5 / 5", status: "verified", pendingPayout: 60_000 },
  { id: "TM-440", name: "Ala-Too Esports", tag: "ALT", game: "CS2", roster: "5 / 5", status: "verified", pendingPayout: 0 },
  { id: "TM-439", name: "Steppe Wolves", tag: "STW", game: "CS2", roster: "4 / 5", status: "incomplete", pendingPayout: 0 },
  { id: "TM-438", name: "Osh Riot", tag: "OSH", game: "CS2", roster: "5 / 5", status: "verified", pendingPayout: 25_000 },
  { id: "TM-437", name: "Batken Fury", tag: "BTK", game: "CS2", roster: "2 / 2", status: "blocked", pendingPayout: 0 },
]
