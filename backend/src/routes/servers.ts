import { Router } from "express"

import { handler } from "../lib/http.js"
import { listServers } from "../services/servers.js"

/** Публичный список серверов: адрес, карта и сколько человек играет. */
export const serversRouter = Router()

serversRouter.get(
  "/",
  handler(async (_req, res) => {
    res.json({ items: await listServers({ onlyPublic: true }) })
  }),
)
