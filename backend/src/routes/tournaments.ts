import { Router } from "express"
import { z } from "zod"

import { handler, parsePage, str, param } from "../lib/http.js"
import { requireAuth, viewerOf } from "../middleware/auth.js"
import { rateLimit } from "../middleware/rate-limit.js"
import { getBracket } from "../services/bracket.js"
import { listLineups } from "../services/lineups.js"
import { checkIn, listParticipants, register, withdraw } from "../services/registrations.js"
import { getFeatured, getTournament, listTournaments } from "../services/tournaments.js"
import type { TournamentStatus } from "../types.js"

export const tournamentsRouter = Router()

const STATUSES = ["draft", "registration", "checkin", "live", "finished"] as const
const statusSchema = z.enum([...STATUSES, "open"]).optional()
const sortSchema = z.enum(["start", "slots", "title"]).optional()

tournamentsRouter.get(
  "/",
  handler((req, res) => {
    const { limit, offset } = parsePage(req.query, 24)
    const status = statusSchema.parse(str(req.query.status))
    const sort = sortSchema.parse(str(req.query.sort))

    res.json(
      listTournaments({
        status: status as TournamentStatus | "open" | undefined,
        q: str(req.query.q),
        sort,
        limit,
        offset,
        viewerId: req.viewer?.id,
      }),
    )
  }),
)

/** Центральный турнир витрины. */
tournamentsRouter.get(
  "/featured",
  handler((req, res) => {
    res.json({ tournament: getFeatured(req.viewer?.id) })
  }),
)

tournamentsRouter.get(
  "/:slug",
  handler((req, res) => {
    res.json({ tournament: getTournament(param(req, "slug"), req.viewer?.id) })
  }),
)

/** Участники — список игроков, а не команд: регистрация индивидуальная. */
tournamentsRouter.get(
  "/:slug/participants",
  handler((req, res) => {
    const status = z
      .enum(["pending", "confirmed", "checked_in", "rejected", "withdrawn"])
      .optional()
      .parse(str(req.query.status))
    res.json({ items: listParticipants(param(req, "slug"), status) })
  }),
)

/** Составы, собранные жеребьевкой. */
tournamentsRouter.get(
  "/:slug/lineups",
  handler((req, res) => {
    res.json({ items: listLineups(param(req, "slug")) })
  }),
)

/** Верхняя сетка — единственная сетка турнира. */
tournamentsRouter.get(
  "/:slug/bracket",
  handler((req, res) => {
    res.json({ rounds: getBracket(param(req, "slug")) })
  }),
)

tournamentsRouter.post(
  "/:slug/register",
  requireAuth,
  rateLimit({ max: 20 }),
  handler((req, res) => {
    res.status(201).json({ registration: register(param(req, "slug"), viewerOf(req).id) })
  }),
)

tournamentsRouter.delete(
  "/:slug/register",
  requireAuth,
  rateLimit({ max: 20 }),
  handler((req, res) => {
    withdraw(param(req, "slug"), viewerOf(req).id)
    res.status(204).end()
  }),
)

tournamentsRouter.post(
  "/:slug/checkin",
  requireAuth,
  rateLimit({ max: 30 }),
  handler((req, res) => {
    res.json({ registration: checkIn(param(req, "slug"), viewerOf(req).id) })
  }),
)
