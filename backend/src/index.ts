import { createApp } from "./app.js"
import { migrate } from "./db/index.js"
import { env } from "./env.js"
import { pruneSessions } from "./lib/session.js"
import { pruneAdminSessions } from "./services/admins.js"

migrate()

const prune = () => {
  pruneSessions()
  pruneAdminSessions()
}
prune()

// Раз в сутки подчищаем протухшие сессии; unref, чтобы не держать процесс.
setInterval(prune, 24 * 60 * 60 * 1000).unref()

const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`[api] MAJOR KG слушает http://localhost:${env.port}/api`)
  console.log(`[api] CORS: ${env.corsOrigins.join(", ")}`)
})

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[api] ${signal} — останавливаемся`)
    server.close(() => process.exit(0))
  })
}
