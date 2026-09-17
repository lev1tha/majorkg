import { Router } from "express"

import { adminRouter } from "./admin.js"
import { adminAuthRouter } from "./admin-auth.js"
import { authRouter } from "./auth.js"
import { faqRouter } from "./faq.js"
import { leaderboardRouter } from "./leaderboard.js"
import { matchesRouter } from "./matches.js"
import { notesRouter } from "./notes.js"
import { playersRouter } from "./players.js"
import { tournamentsRouter } from "./tournaments.js"

export const api = Router()

api.get("/health", (_req, res) => {
  res.json({ ok: true, service: "majorkg-api", time: new Date().toISOString() })
})

api.use("/auth", authRouter)
// Вход организатора живет до requireAdmin: иначе войти было бы нечем.
api.use("/admin/auth", adminAuthRouter)
api.use("/faq", faqRouter)
api.use("/tournaments", tournamentsRouter)
api.use("/players", playersRouter)
api.use("/leaderboard", leaderboardRouter)
api.use("/matches", matchesRouter)
api.use("/notes", notesRouter)
api.use("/admin", adminRouter)
