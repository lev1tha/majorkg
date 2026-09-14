import { levelFromElo } from "@/lib/faceit"
import type { Player } from "@/lib/data/players"

/**
 * MIX-подбор: игрок заходит один, система собирает вокруг него состав.
 *
 * Идея баланса — в каждой команде должен быть один игрок из каждого
 * рейтингового пояса. Тогда состав с игроком на 3000 ELO обязательно
 * получает партнеров уровнем ниже, и суммарная сила команд сходится.
 */

export interface MixBand {
  id: string
  label: string
  hint: string
  min: number
  max: number
}

export const MIX_BANDS: MixBand[] = [
  { id: "s", label: "Пояс 1", hint: "2001+ ELO · уровень 10", min: 2001, max: Number.MAX_SAFE_INTEGER },
  { id: "a", label: "Пояс 2", hint: "до 2000 ELO · уровень 9", min: 1751, max: 2000 },
  { id: "b", label: "Пояс 3", hint: "до 1750 ELO · уровень 7–8", min: 1351, max: 1750 },
  { id: "c", label: "Пояс 4", hint: "до 1350 ELO · уровень 5–6", min: 1051, max: 1350 },
  { id: "d", label: "Пояс 5", hint: "до 1050 ELO · уровень 1–4", min: 0, max: 1050 },
]

export interface MixPlayer extends Player {
  band: string
  level: number
}

export interface MixTeam {
  id: string
  name: string
  tag: string
  players: MixPlayer[]
  totalElo: number
  avgElo: number
  avgLevel: number
}

export interface MixResult {
  teams: MixTeam[]
  benched: MixPlayer[]
  /** Разброс между самой сильной и самой слабой командой по среднему ELO. */
  spread: number
}

const NAMES = [
  ["ALPHA", "ALP"],
  ["BRAVO", "BRV"],
  ["DELTA", "DLT"],
  ["ECHO", "ECH"],
  ["FOXTROT", "FOX"],
  ["GOLF", "GLF"],
  ["HOTEL", "HTL"],
  ["INDIA", "IND"],
]

/** Детерминированный PRNG — один и тот же seed дает один и тот же состав. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function bandOf(elo: number): MixBand {
  return MIX_BANDS.find((band) => elo >= band.min && elo <= band.max) ?? MIX_BANDS[MIX_BANDS.length - 1]
}

export function toMixPlayer(player: Player): MixPlayer {
  return { ...player, band: bandOf(player.elo).id, level: levelFromElo(player.elo) }
}

/**
 * Формирует команды из пула.
 * @param teamSize сколько игроков в команде (обычно 5 — по числу поясов)
 * @param seed     фиксирует результат: одинаковый seed — одинаковые команды
 */
export function buildMixTeams(pool: Player[], teamSize = 5, seed = 1): MixResult {
  const random = mulberry32(seed)
  const players = pool.map(toMixPlayer)

  const teamCount = Math.floor(players.length / teamSize)
  if (teamCount < 1) {
    return { teams: [], benched: players, spread: 0 }
  }

  // Пояса, сколько их нужно на команду — равно размеру состава.
  const bandOrder = MIX_BANDS.slice(0, Math.min(teamSize, MIX_BANDS.length))
  const buckets = new Map<string, MixPlayer[]>()
  for (const band of MIX_BANDS) {
    buckets.set(
      band.id,
      shuffle(
        players.filter((player) => player.band === band.id),
        random,
      ).sort((a, b) => b.elo - a.elo),
    )
  }

  const teams: MixTeam[] = Array.from({ length: teamCount }, (_, index) => ({
    id: `mix-${index + 1}`,
    name: NAMES[index % NAMES.length][0],
    tag: NAMES[index % NAMES.length][1],
    players: [],
    totalElo: 0,
    avgElo: 0,
    avgLevel: 0,
  }))

  /** Берет игрока из пояса, при нехватке — из ближайшего непустого. */
  const take = (bandId: string): MixPlayer | undefined => {
    const primary = buckets.get(bandId)
    if (primary?.length) return primary.shift()

    const index = MIX_BANDS.findIndex((band) => band.id === bandId)
    for (let distance = 1; distance < MIX_BANDS.length; distance += 1) {
      for (const neighbour of [index - distance, index + distance]) {
        const list = MIX_BANDS[neighbour] && buckets.get(MIX_BANDS[neighbour].id)
        if (list?.length) return list.shift()
      }
    }
    return undefined
  }

  // Змейка по поясам: сильнейший из пояса уходит в команду, которая
  // на этом шаге слабее — суммарная сила выравнивается.
  bandOrder.forEach((band, roundIndex) => {
    const order = roundIndex % 2 === 0 ? teams : [...teams].reverse()
    for (const team of order) {
      const player = take(band.id)
      if (player) team.players.push(player)
    }
  })

  for (const team of teams) {
    team.players.sort((a, b) => b.elo - a.elo)
    team.totalElo = team.players.reduce((sum, player) => sum + player.elo, 0)
    team.avgElo = team.players.length ? Math.round(team.totalElo / team.players.length) : 0
    team.avgLevel = team.players.length
      ? Math.round((team.players.reduce((sum, player) => sum + player.level, 0) / team.players.length) * 10) / 10
      : 0
  }

  const used = new Set(teams.flatMap((team) => team.players.map((player) => player.id)))
  const benched = players.filter((player) => !used.has(player.id)).sort((a, b) => b.elo - a.elo)

  const averages = teams.map((team) => team.avgElo)
  const spread = averages.length ? Math.max(...averages) - Math.min(...averages) : 0

  return { teams, benched, spread }
}
