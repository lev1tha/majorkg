import { Router } from "express"

import { handler, parsePage } from "../lib/http.js"
import { getLeaderboard } from "../services/leaderboard.js"

export const leaderboardRouter = Router()

/** Лидерборд только по игрокам — командного рейтинга на платформе нет. */
leaderboardRouter.get(
  "/",
  handler((req, res) => {
    const { limit, offset } = parsePage(req.query, 50)
    res.json(getLeaderboard(limit, offset))
  }),
)
