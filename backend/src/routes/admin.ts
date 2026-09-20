import { Router } from "express"
import { z } from "zod"

import { db } from "../db/index.js"
import { ApiError, handler, parsePage, str, param } from "../lib/http.js"
import { requireAdmin } from "../middleware/auth.js"
import { generateBracket } from "../services/bracket.js"
import { drawLineups } from "../services/lineups.js"
import { createFaq, deleteFaq, listFaq, updateFaq } from "../services/faq.js"
import {
  declareWinner,
  listAppeals,
  resolveAppeal,
  scheduleMatch,
  scoreMatch,
  setMatchState,
} from "../services/matches.js"
import { syncAllPlayers } from "../services/faceit-sync.js"
import { listPlayers, refreshPlayer, setPlayerStatus } from "../services/players.js"
import { listAllRegistrations, listPending, moderate } from "../services/registrations.js"
import {
  createTournament,
  deleteTournament,
  getTournament,
  listTournaments,
  updateTournament,
} from "../services/tournaments.js"
import { makeVetoMove, resetVeto, serverQueue } from "../services/veto.js"
import type { AdminOverviewDto } from "../types.js"

export const adminRouter = Router()

adminRouter.use(requireAdmin)

// ───────────────────────────── Обзор ─────────────────────────────────

adminRouter.get(
  "/overview",
  handler((_req, res) => {
    const count = (sql: string, ...params: unknown[]) =>
      (db.prepare(sql).get(...params) as { n: number }).n

    const expectedFees = (
      db
        .prepare(
          `SELECT COALESCE(SUM(t.entry_fee), 0) AS n
             FROM registrations r
             JOIN tournaments t ON t.id = r.tournament_id
            WHERE r.status IN ('confirmed', 'checked_in')
              AND t.status IN ('registration', 'checkin', 'live')`,
        )
        .get() as { n: number }
    ).n

    const overview: AdminOverviewDto = {
      expectedFees,
      activeTournaments: count(
        `SELECT COUNT(*) AS n FROM tournaments WHERE status IN ('registration', 'checkin', 'live')`,
      ),
      registeredPlayers: count(
        `SELECT COUNT(DISTINCT player_id) AS n FROM registrations
          WHERE status IN ('pending', 'confirmed', 'checked_in')`,
      ),
      pendingRegistrations: count(`SELECT COUNT(*) AS n FROM registrations WHERE status = 'pending'`),
      liveMatches: count(`SELECT COUNT(*) AS n FROM matches WHERE state = 'live'`),
      openAppeals: count(`SELECT COUNT(*) AS n FROM appeals WHERE status = 'open'`),
      playersTotal: count(`SELECT COUNT(*) AS n FROM players`),
      matchesTotal: count(`SELECT COUNT(*) AS n FROM matches WHERE state = 'done'`),
    }
    res.json({ overview })
  }),
)

// ───────────────────────────── Турниры ────────────────────────────────

const tournamentSchema = z.object({
  title: z.string().min(3, "Название минимум 3 символа").max(120),
  edition: z.string().max(120).optional(),
  summary: z.string().max(2000).optional(),
  teamSize: z.number().int().min(1).max(5).optional(),
  status: z.enum(["draft", "registration", "checkin", "live", "finished"]).optional(),
  slots: z.number().int().min(2).max(512).optional(),
  startsAt: z.string().min(1, "Укажите дату старта"),
  region: z.string().max(120).optional(),
  organizer: z.string().max(120).optional(),
  tier: z.enum(["S", "A", "B"]).optional(),
  ruleset: z.string().max(200).optional(),
  server: z.string().max(200).optional(),
  maps: z.array(z.string().min(1).max(40)).min(1).max(16).optional(),
  entryFee: z.number().int().min(0).max(1_000_000).optional(),
  rules: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        items: z.array(z.string().min(1).max(400)).max(20),
      }),
    )
    .max(10)
    .optional(),
  featured: z.boolean().optional(),
  drawBeforeMinutes: z.number().int().min(0).max(1440).optional(),
})

adminRouter.get(
  "/tournaments",
  handler((req, res) => {
    const { limit, offset } = parsePage(req.query, 50)
    res.json(listTournaments({ limit, offset, includeDrafts: true, q: str(req.query.q) }))
  }),
)

/** Один турнир, включая черновики — карточка редактирования. */
adminRouter.get(
  "/tournaments/:slug",
  handler((req, res) => {
    res.json({ tournament: getTournament(param(req, "slug")) })
  }),
)

/** Все заявки турнира, включая отклоненные и снятые. */
adminRouter.get(
  "/tournaments/:slug/registrations",
  handler((req, res) => {
    res.json({ items: listAllRegistrations(param(req, "slug")) })
  }),
)

adminRouter.post(
  "/tournaments",
  handler((req, res) => {
    res.status(201).json({ tournament: createTournament(tournamentSchema.parse(req.body)) })
  }),
)

adminRouter.patch(
  "/tournaments/:slug",
  handler((req, res) => {
    res.json({ tournament: updateTournament(param(req, "slug"), tournamentSchema.partial().parse(req.body)) })
  }),
)

adminRouter.delete(
  "/tournaments/:slug",
  handler((req, res) => {
    deleteTournament(param(req, "slug"))
    res.status(204).end()
  }),
)

/** Жеребьевка: из подтвержденных индивидуальных заявок собираются составы. */
adminRouter.post(
  "/tournaments/:slug/draw",
  handler((req, res) => {
    const seed = z.number().int().min(0).max(1_000_000).optional().parse(req.body?.seed)
    res.json(drawLineups(param(req, "slug"), seed ?? Math.floor(Math.random() * 100_000)))
  }),
)

/** Построение верхней сетки по посеву составов. */
adminRouter.post(
  "/tournaments/:slug/bracket",
  handler((req, res) => {
    res.json({ rounds: generateBracket(param(req, "slug")) })
  }),
)

// ──────────────────── Модерация индивидуальных заявок ─────────────────

adminRouter.get(
  "/registrations",
  handler((req, res) => {
    const { limit, offset } = parsePage(req.query, 50)
    res.json({ items: listPending(limit, offset) })
  }),
)

adminRouter.patch(
  "/registrations/:id",
  handler((req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор заявки")

    const { status } = z
      .object({ status: z.enum(["pending", "confirmed", "checked_in", "rejected", "withdrawn"]) })
      .parse(req.body)

    res.json({ registration: moderate(id, status) })
  }),
)

// ───────────────────────────── Матчи ──────────────────────────────────

const scoreSchema = z.object({
  maps: z
    .array(
      z.object({
        map: z.string().min(1).max(40),
        scoreA: z.number().int().min(0).max(99),
        scoreB: z.number().int().min(0).max(99),
      }),
    )
    .max(7),
  state: z.enum(["pending", "live", "review", "done"]).optional(),
  proof: z.boolean().optional(),
  note: z.string().max(400).optional(),
  awardTo: z.enum(["a", "b"]).optional(),
})

function matchId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор матча")
  return id
}

adminRouter.patch(
  "/matches/:id/score",
  handler((req, res) => {
    res.json({ match: scoreMatch(matchId(param(req, "id")), scoreSchema.parse(req.body)) })
  }),
)

/**
 * Объявить победителя одним действием — то, что судья делает, глядя в сетку.
 * Счет по картам при этом не обязателен: серия закрывается 1:0.
 */
adminRouter.patch(
  "/matches/:id/winner",
  handler((req, res) => {
    const { winner, note } = z
      .object({ winner: z.enum(["a", "b"]), note: z.string().max(400).optional() })
      .parse(req.body)
    res.json({ match: declareWinner(matchId(param(req, "id")), winner, note) })
  }),
)

adminRouter.patch(
  "/matches/:id/state",
  handler((req, res) => {
    const { state, note } = z
      .object({ state: z.enum(["pending", "live", "review", "done"]), note: z.string().max(400).optional() })
      .parse(req.body)
    res.json({ match: setMatchState(matchId(param(req, "id")), state, note) })
  }),
)

adminRouter.patch(
  "/matches/:id/schedule",
  handler((req, res) => {
    const { scheduledAt } = z.object({ scheduledAt: z.string().nullable() }).parse(req.body)
    res.json({ match: scheduleMatch(matchId(param(req, "id")), scheduledAt) })
  }),
)

// ─────────────────────────── Апелляции ────────────────────────────────

adminRouter.get(
  "/appeals",
  handler((req, res) => {
    const status = z.enum(["open", "resolved", "declined", "all"]).optional().parse(str(req.query.status))
    res.json({ items: listAppeals(status ?? "open") })
  }),
)

adminRouter.patch(
  "/appeals/:id",
  handler((req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор апелляции")

    const { status, resolution } = z
      .object({ status: z.enum(["resolved", "declined"]), resolution: z.string().max(1000).optional() })
      .parse(req.body)

    res.json({ appeal: resolveAppeal(id, status, resolution) })
  }),
)

// ──────────────────────────── Вето карт ──────────────────────────────

/** Ход за сторону — когда состав не выходит на связь. */
adminRouter.post(
  "/matches/:id/veto",
  handler((req, res) => {
    const { map } = z.object({ map: z.string().min(1).max(40) }).parse(req.body)
    res.json({ veto: makeVetoMove({ matchId: matchId(param(req, "id")), map, asAdmin: true }) })
  }),
)

adminRouter.delete(
  "/matches/:id/veto",
  handler((req, res) => {
    res.json({ veto: resetVeto(matchId(param(req, "id"))) })
  }),
)

/** Что готовить на серверах: карты по матчам, которым еще играть. */
adminRouter.get(
  "/tournaments/:slug/servers",
  handler((req, res) => {
    res.json({ items: serverQueue(param(req, "slug")) })
  }),
)

// ─────────────────────────────── FAQ ──────────────────────────────────

const faqSchema = z.object({
  question: z.string().min(5, "Вопрос минимум 5 символов").max(300),
  answer: z.string().min(5, "Ответ минимум 5 символов").max(2000),
  position: z.number().int().min(0).max(999).optional(),
  published: z.boolean().optional(),
})

adminRouter.get(
  "/faq",
  handler((_req, res) => {
    res.json({ items: listFaq(true) })
  }),
)

adminRouter.post(
  "/faq",
  handler((req, res) => {
    res.status(201).json({ item: createFaq(faqSchema.parse(req.body)) })
  }),
)

adminRouter.patch(
  "/faq/:id",
  handler((req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор вопроса")
    res.json({ item: updateFaq(id, faqSchema.partial().parse(req.body)) })
  }),
)

adminRouter.delete(
  "/faq/:id",
  handler((req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор вопроса")
    deleteFaq(id)
    res.status(204).end()
  }),
)

// ───────────────────────── Модерация игроков ──────────────────────────

adminRouter.get(
  "/players",
  handler((req, res) => {
    const { limit, offset } = parsePage(req.query, 50)
    res.json(listPlayers({ q: str(req.query.q), limit, offset, includeBanned: true }))
  }),
)

/** Подтянуть Steam и FACEIT для одного игрока. */
adminRouter.post(
  "/players/:id/sync",
  handler(async (req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор игрока")
    res.json({ player: await refreshPlayer(id) })
  }),
)

/** Пакетное обновление: идет последовательно из-за лимитов FACEIT. */
adminRouter.post(
  "/players/sync",
  handler(async (_req, res) => {
    res.json(await syncAllPlayers())
  }),
)

adminRouter.patch(
  "/players/:id",
  handler((req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор игрока")

    const { status } = z.object({ status: z.enum(["active", "review", "banned"]) }).parse(req.body)
    res.json({ player: setPlayerStatus(id, status) })
  }),
)
