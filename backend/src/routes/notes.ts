import { Router } from "express"
import { z } from "zod"

import { ApiError, handler, param } from "../lib/http.js"
import { requireAuth, viewerOf } from "../middleware/auth.js"
import { rateLimit } from "../middleware/rate-limit.js"
import { addNote, deleteNote, listNotes } from "../services/notes.js"

export const notesRouter = Router()

/** Заметки видит только автор — отдельной проверки владения не нужно. */
notesRouter.use(requireAuth)

const subjectSchema = z.string().min(1).max(120)
const bodySchema = z.object({ body: z.string().min(1).max(600) })

notesRouter.get(
  "/:subject",
  handler((req, res) => {
    res.json({ items: listNotes(viewerOf(req).id, subjectSchema.parse(param(req, "subject"))) })
  }),
)

notesRouter.post(
  "/:subject",
  rateLimit({ max: 60 }),
  handler((req, res) => {
    const subject = subjectSchema.parse(param(req, "subject"))
    const { body } = bodySchema.parse(req.body)
    res.status(201).json({ note: addNote(viewerOf(req).id, subject, body) })
  }),
)

notesRouter.delete(
  "/entry/:id",
  handler((req, res) => {
    const id = Number(param(req, "id"))
    if (!Number.isInteger(id)) throw ApiError.badRequest("Некорректный идентификатор заметки")
    deleteNote(viewerOf(req).id, id)
    res.status(204).end()
  }),
)
