export type MatchState = "done" | "live" | "pending"

export interface BracketSide {
  tag: string
  name: string
  /** Счет по картам в серии. */
  score: number | null
  seed?: number
}

export interface BracketMatch {
  id: string
  a: BracketSide | null
  b: BracketSide | null
  winner: "a" | "b" | null
  state: MatchState
  format: string
  /** Раскладка серии по картам — CS2-специфика. */
  maps?: string[]
  meta: string
}

export interface BracketRound {
  id: string
  name: string
  matches: BracketMatch[]
}

const side = (tag: string, name: string, score: number | null, seed?: number): BracketSide => ({
  tag,
  name,
  score,
  seed,
})

const TBD = null

export const UPPER_BRACKET: BracketRound[] = [
  {
    id: "ub-qf",
    name: "Верхняя · 1/4",
    matches: [
      {
        id: "ub-qf-1",
        a: side("NMD", "Nomad Five", 2, 1),
        b: side("PMR", "Pamir Line", 0, 8),
        winner: "a",
        state: "done",
        format: "BO3",
        maps: ["Mirage 13:7", "Ancient 13:9"],
        meta: "18:00 · завершен",
      },
      {
        id: "ub-qf-2",
        a: side("ALT", "Ala-Too Esports", 2, 4),
        b: side("TKM", "Tokmok Elite", 1, 5),
        winner: "a",
        state: "done",
        format: "BO3",
        maps: ["Inferno 13:11", "Nuke 8:13", "Anubis 13:10"],
        meta: "18:00 · завершен",
      },
      {
        id: "ub-qf-3",
        a: side("TSH", "Tian Shan", 1, 3),
        b: side("MNS", "Manas GG", 2, 6),
        winner: "b",
        state: "done",
        format: "BO3",
        maps: ["Dust II 13:16", "Mirage 13:8", "Train 9:13"],
        meta: "19:30 · овертайм на первой",
      },
      {
        id: "ub-qf-4",
        a: side("SLK", "Silk Road", 1, 2),
        b: side("OSH", "Osh Riot", 1, 7),
        winner: null,
        state: "live",
        format: "BO3",
        maps: ["Ancient 13:10", "Nuke 11:13", "Inferno 7:6"],
        meta: "идет карта 3 · Inferno",
      },
    ],
  },
  {
    id: "ub-sf",
    name: "Верхняя · 1/2",
    matches: [
      {
        id: "ub-sf-1",
        a: side("NMD", "Nomad Five", 1),
        b: side("ALT", "Ala-Too Esports", 0),
        winner: null,
        state: "live",
        format: "BO3",
        maps: ["Mirage 13:6", "Anubis 4:2"],
        meta: "идет карта 2 · Anubis",
      },
      {
        id: "ub-sf-2",
        a: side("MNS", "Manas GG", null),
        b: TBD,
        winner: null,
        state: "pending",
        format: "BO3",
        meta: "21:00 · ожидает победителя 1/4 #4",
      },
    ],
  },
  {
    id: "ub-f",
    name: "Финал верхней",
    matches: [
      {
        id: "ub-f-1",
        a: TBD,
        b: TBD,
        winner: null,
        state: "pending",
        format: "BO3",
        meta: "22:15 · победитель идет в гранд-финал",
      },
    ],
  },
]

export const LOWER_BRACKET: BracketRound[] = [
  {
    id: "lb-r1",
    name: "Нижняя · Раунд 1",
    matches: [
      {
        id: "lb-r1-1",
        a: side("PMR", "Pamir Line", 0),
        b: side("TKM", "Tokmok Elite", 1),
        winner: "b",
        state: "done",
        format: "BO1",
        maps: ["Mirage 10:13"],
        meta: "19:40 · выбывание",
      },
      {
        id: "lb-r1-2",
        a: side("TSH", "Tian Shan", null),
        b: TBD,
        winner: null,
        state: "pending",
        format: "BO1",
        meta: "20:30 · ожидает проигравшего 1/4 #4",
      },
    ],
  },
  {
    id: "lb-r2",
    name: "Нижняя · Раунд 2",
    matches: [
      {
        id: "lb-r2-1",
        a: side("TKM", "Tokmok Elite", null),
        b: TBD,
        winner: null,
        state: "pending",
        format: "BO3",
        meta: "21:30",
      },
      {
        id: "lb-r2-2",
        a: TBD,
        b: TBD,
        winner: null,
        state: "pending",
        format: "BO3",
        meta: "21:30",
      },
    ],
  },
  {
    id: "lb-f",
    name: "Финал нижней",
    matches: [
      {
        id: "lb-f-1",
        a: TBD,
        b: TBD,
        winner: null,
        state: "pending",
        format: "BO3",
        meta: "23:00",
      },
    ],
  },
]

export const GRAND_FINAL: BracketMatch = {
  id: "gf",
  a: TBD,
  b: TBD,
  winner: null,
  state: "pending",
  format: "BO5",
  meta: "00:00 · преимущество карты у верхней сетки",
}
