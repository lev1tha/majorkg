import { Router } from "express"
import { z } from "zod"

import { ApiError, handler, parsePage, str, param } from "../lib/http.js"
import { requireAuth, viewerOf } from "../middleware/auth.js"
import { rateLimit } from "../middleware/rate-limit.js"
import { getMatch, listMatches } from "../services/bracket.js"
import { createAppeal } from "../services/matches.js"
import { getVeto, makeVetoMove } from "../services/veto.js"
import type { MatchState } from "../types.js"

export const matchesRouter = Router()

const stateSchema = z.enum(["pending", "live", "review", "done"]).optional()

matchesRouter.get(
  "/",
  handler((req, res) => {
    const { limit, offset } = parsePage(req.query, 30)
    res.json({
      items: listMatches({
        slug: str(req.query.tournament),
        state: stateSchema.parse(str(req.query.state)) as MatchState | undefined,
        limit,
        offset,
      }),
    })
  }),
)

matchesRouter.get(
  "/:id",
  handler((req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор матча")
    res.json({ match: getMatch(id) })
  }),
)

/** Состояние вето: видно всем, ходить могут участники матча. */
matchesRouter.get(
  "/:id/veto",
  handler((req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор матча")
    res.json({ veto: getVeto(id, req.viewer?.id) })
  }),
)

matchesRouter.post(
  "/:id/veto",
  requireAuth,
  rateLimit({ max: 40 }),
  handler((req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор матча")

    const { map } = z.object({ map: z.string().min(1).max(40) }).parse(req.body)
    res.json({ veto: makeVetoMove({ matchId: id, map, playerId: viewerOf(req).id }) })
  }),
)

const appealSchema = z.object({
  reason: z.string().min(10, "Опишите причину подробнее").max(1000),
  severity: z.enum(["low", "medium", "high"]).optional(),
})

/** Апелляция на результат — подает участник матча. */
matchesRouter.post(
  "/:id/appeals",
  requireAuth,
  rateLimit({ max: 10 }),
  handler((req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор матча")

    const body = appealSchema.parse(req.body)
    res.status(201).json({
      appeal: createAppeal({
        matchId: id,
        claimantId: viewerOf(req).id,
        reason: body.reason,
        severity: body.severity,
      }),
    })
  }),
)
