import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"

import { env } from "./env.js"
import { attachViewer } from "./middleware/auth.js"
import { errorHandler, notFound } from "./middleware/error.js"
import { api } from "./routes/index.js"

export function createApp() {
  const app = express()

  // Доверяем одному прокси впереди (nginx / платформа) — нужно для req.ip.
  app.set("trust proxy", 1)
  app.disable("x-powered-by")

  app.use(
    cors({
      origin: env.corsOrigins,
      // Сессия живет в httpOnly-cookie, поэтому credentials обязательны.
      credentials: true,
    }),
  )
  app.use(express.json({ limit: "256kb" }))
  app.use(cookieParser())
  app.use(attachViewer)

  app.use("/api", api)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
