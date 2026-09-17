import { db, tx } from "../db/index.js"
import { levelFromElo } from "../lib/faceit.js"
import { ApiError } from "../lib/http.js"
import type { LineupDto, LineupMemberDto } from "../types.js"
import { requireTournamentRow } from "./tournaments.js"

/**
 * Жеребьевка составов.
 *
 * Регистрация индивидуальная, поэтому состав — не то, что приносит
 * капитан, а то, что собирает система. Баланс держится на поясах: в
 * каждой команде по одному игроку из каждого рейтингового пояса FACEIT.
 * Тогда рядом с игроком на 3000 ELO гарантированно окажутся партнеры
 * уровнем ниже, и суммарная сила команд сходится.
 *
 * Подбор детерминирован: одинаковый seed — одинаковые составы.
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

export function bandOf(elo: number): MixBand {
  return MIX_BANDS.find((band) => elo >= band.min && elo <= band.max) ?? MIX_BANDS[MIX_BANDS.length - 1]!
}

const NAMES: [string, string][] = [
  ["ALPHA", "ALP"], ["BRAVO", "BRV"], ["DELTA", "DLT"], ["ECHO", "ECH"],
  ["FOXTROT", "FOX"], ["GOLF", "GLF"], ["HOTEL", "HTL"], ["INDIA", "IND"],
  ["JULIET", "JLT"], ["KILO", "KLO"], ["LIMA", "LMA"], ["MIKE", "MKE"],
  ["NOVEMBER", "NVB"], ["OSCAR", "OSC"], ["PAPA", "PPA"], ["QUEBEC", "QBC"],
]

/** Детерминированный PRNG — один seed дает один и тот же расклад. */
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
    const a = copy[i]!
    const b = copy[j]!
    copy[i] = b
    copy[j] = a
  }
  return copy
}

interface Candidate {
  id: number
  nickname: string
  role: string
  elo: number
  hltv_rating: number
  kd: number
  band: string
}

export interface DrawResult {
  lineups: LineupDto[]
  /** Игроки, которым не хватило места в полном составе. */
  benched: LineupMemberDto[]
  /** Разброс среднего ELO между сильнейшим и слабейшим составом. */
  spread: number
}

function toMember(candidate: Candidate, slot: number): LineupMemberDto & { slot: number } {
  return {
    playerId: candidate.id,
    nickname: candidate.nickname,
    role: candidate.role,
    elo: candidate.elo,
    level: levelFromElo(candidate.elo),
    hltvRating: candidate.hltv_rating,
    kd: candidate.kd,
    slot,
  }
}

/**
 * Собирает составы из подтвержденных заявок и сохраняет их.
 * Перезапуск жеребьевки полностью заменяет предыдущий расклад, поэтому
 * сначала нужно снести сетку — иначе матчи останутся без сторон.
 */
export function drawLineups(slug: string, seed = 1): DrawResult {
  const tournament = requireTournamentRow(slug)
  const teamSize = tournament.team_size

  const candidates = db
    .prepare(
      `SELECT p.id, p.nickname, p.role, p.elo, p.hltv_rating, p.kd
         FROM registrations r
         JOIN players p ON p.id = r.player_id
        WHERE r.tournament_id = ?
          AND r.status IN ('confirmed', 'checked_in')
          AND p.status = 'active'
        ORDER BY p.elo DESC`,
    )
    .all(tournament.id)
    .map((row) => {
      const player = row as Omit<Candidate, "band">
      return { ...player, band: bandOf(player.elo).id }
    }) as Candidate[]

  const lineupCount = Math.floor(candidates.length / teamSize)
  if (lineupCount < 2) {
    throw ApiError.conflict(
      `Для жеребьевки нужно минимум ${teamSize * 2} подтвержденных заявок, сейчас ${candidates.length}`,
    )
  }

  const random = mulberry32(seed)

  // Пояса: внутри пояса порядок перемешан, но сильные уходят первыми.
  const buckets = new Map<string, Candidate[]>()
  for (const band of MIX_BANDS) {
    buckets.set(
      band.id,
      shuffle(candidates.filter((player) => player.band === band.id), random).sort(
        (a, b) => b.elo - a.elo,
      ),
    )
  }

  /** Берет игрока из пояса, при нехватке — из ближайшего непустого. */
  const take = (bandId: string): Candidate | undefined => {
    const primary = buckets.get(bandId)
    if (primary?.length) return primary.shift()

    const index = MIX_BANDS.findIndex((band) => band.id === bandId)
    for (let distance = 1; distance < MIX_BANDS.length; distance += 1) {
      for (const neighbour of [index - distance, index + distance]) {
        const band = MIX_BANDS[neighbour]
        const list = band && buckets.get(band.id)
        if (list?.length) return list.shift()
      }
    }
    return undefined
  }

  const drafts = Array.from({ length: lineupCount }, (_, index) => {
    const name = NAMES[index % NAMES.length]!
    return {
      name: name[0],
      tag: lineupCount > NAMES.length ? `${name[1]}${Math.floor(index / NAMES.length) + 1}` : name[1],
      members: [] as (LineupMemberDto & { slot: number })[],
    }
  })

  // Змейка по поясам: на четных проходах идем слева направо, на нечетных —
  // справа налево, чтобы сумма по составам выравнивалась.
  const bandOrder = MIX_BANDS.slice(0, Math.min(teamSize, MIX_BANDS.length))
  bandOrder.forEach((band, roundIndex) => {
    const order = roundIndex % 2 === 0 ? drafts : [...drafts].reverse()
    for (const draft of order) {
      const player = take(band.id)
      if (player) draft.members.push(toMember(player, draft.members.length))
    }
  })

  // Если состав больше числа поясов — добираем остатками.
  for (const draft of drafts) {
    while (draft.members.length < teamSize) {
      const extra = MIX_BANDS.map((band) => take(band.id)).find(Boolean)
      if (!extra) break
      draft.members.push(toMember(extra, draft.members.length))
    }
  }

  const used = new Set(drafts.flatMap((draft) => draft.members.map((member) => member.playerId)))
  const benched = candidates
    .filter((player) => !used.has(player.id))
    .sort((a, b) => b.elo - a.elo)
    .map((player, index) => toMember(player, index))

  // Посев — по среднему ELO: сильнейший состав получает первый номер.
  const ranked = drafts
    .map((draft) => ({
      ...draft,
      avgElo: Math.round(
        draft.members.reduce((sum, member) => sum + member.elo, 0) / Math.max(1, draft.members.length),
      ),
    }))
    .sort((a, b) => b.avgElo - a.avgElo)

  const saved = tx(() => {
    db.prepare(`DELETE FROM lineups WHERE tournament_id = ?`).run(tournament.id)

    const insertLineup = db.prepare(
      `INSERT INTO lineups (tournament_id, name, tag, seed, avg_elo) VALUES (?, ?, ?, ?, ?)`,
    )
    const insertMember = db.prepare(
      `INSERT INTO lineup_members (lineup_id, player_id, slot) VALUES (?, ?, ?)`,
    )
    const setSeed = db.prepare(
      `UPDATE registrations SET seed = ? WHERE tournament_id = ? AND player_id = ?`,
    )

    return ranked.map((draft, index) => {
      const seedNumber = index + 1
      const info = insertLineup.run(tournament.id, draft.name, draft.tag, seedNumber, draft.avgElo)
      const lineupId = Number(info.lastInsertRowid)

      for (const member of draft.members) {
        insertMember.run(lineupId, member.playerId, member.slot)
        setSeed.run(seedNumber, tournament.id, member.playerId)
      }

      const dto: LineupDto = {
        id: lineupId,
        name: draft.name,
        tag: draft.tag,
        seed: seedNumber,
        avgElo: draft.avgElo,
        members: draft.members.map(({ slot: _slot, ...member }) => member),
      }
      return dto
    })
  })

  const averages = saved.map((lineup) => lineup.avgElo)
  return {
    lineups: saved,
    benched: benched.map(({ slot: _slot, ...member }) => member),
    spread: averages.length ? Math.max(...averages) - Math.min(...averages) : 0,
  }
}

export function listLineups(slug: string): LineupDto[] {
  const tournament = requireTournamentRow(slug)

  const lineups = db
    .prepare(`SELECT id, name, tag, seed, avg_elo FROM lineups WHERE tournament_id = ? ORDER BY seed`)
    .all(tournament.id) as { id: number; name: string; tag: string; seed: number; avg_elo: number }[]

  if (lineups.length === 0) return []

  const members = db
    .prepare(
      `SELECT lm.lineup_id, p.id AS player_id, p.nickname, p.role, p.elo, p.hltv_rating, p.kd
         FROM lineup_members lm
         JOIN players p ON p.id = lm.player_id
        WHERE lm.lineup_id IN (${lineups.map(() => "?").join(", ")})
        ORDER BY lm.slot`,
    )
    .all(...lineups.map((lineup) => lineup.id)) as {
    lineup_id: number
    player_id: number
    nickname: string
    role: string
    elo: number
    hltv_rating: number
    kd: number
  }[]

  const grouped = new Map<number, LineupMemberDto[]>()
  for (const member of members) {
    const list = grouped.get(member.lineup_id) ?? []
    list.push({
      playerId: member.player_id,
      nickname: member.nickname,
      role: member.role,
      elo: member.elo,
      level: levelFromElo(member.elo),
      hltvRating: member.hltv_rating,
      kd: member.kd,
    })
    grouped.set(member.lineup_id, list)
  }

  return lineups.map((lineup) => ({
    id: lineup.id,
    name: lineup.name,
    tag: lineup.tag,
    seed: lineup.seed,
    avgElo: lineup.avg_elo,
    members: grouped.get(lineup.id) ?? [],
  }))
}

/** Состав по тегу — используется скаутингом в сетке. */
export function lineupByTag(slug: string, tag: string): LineupDto | null {
  return listLineups(slug).find((lineup) => lineup.tag === tag) ?? null
}
