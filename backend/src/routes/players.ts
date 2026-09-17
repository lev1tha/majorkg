import { Router } from "express"
import { z } from "zod"

import { handler, parsePage, str, param } from "../lib/http.js"
import { getPlayer, getPlayerPerformance, listPlayers, type PlayerSort } from "../services/players.js"

export const playersRouter = Router()

const sortSchema = z.enum(["elo", "rating", "kd", "matches", "points"]).optional()

playersRouter.get(
  "/",
  handler((req, res) => {
    const { limit, offset } = parsePage(req.query, 50)
    res.json(
      listPlayers({
        q: str(req.query.q),
        sort: sortSchema.parse(str(req.query.sort)) as PlayerSort | undefined,
        limit,
        offset,
      }),
    )
  }),
)

playersRouter.get(
  "/:nickname",
  handler(async (req, res) => {
    res.json({ player: await getPlayer(param(req, "nickname")) })
  }),
)

playersRouter.get(
  "/:nickname/performance",
  handler((req, res) => {
    res.json({ performance: getPlayerPerformance(param(req, "nickname")) })
  }),
)
