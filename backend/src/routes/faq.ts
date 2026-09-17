import { Router } from "express"

import { handler } from "../lib/http.js"
import { listFaq } from "../services/faq.js"

/** Публичный FAQ: только опубликованные вопросы, в порядке организатора. */
export const faqRouter = Router()

faqRouter.get(
  "/",
  handler((_req, res) => {
    res.json({ items: listFaq() })
  }),
)
