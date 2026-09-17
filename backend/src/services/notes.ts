import { db } from "../db/index.js"
import { ApiError } from "../lib/http.js"
import type { ScoutNoteDto } from "../types.js"

/**
 * Скаут-заметки: личная разведка перед матчем, а не публичный комментарий.
 * Чужие заметки не отдаются никогда — в том числе администратору.
 */

const MAX_BODY = 600

export function listNotes(authorId: number, subject: string): ScoutNoteDto[] {
  return db
    .prepare(
      `SELECT id, subject, body, created_at AS createdAt
         FROM scout_notes
        WHERE author_id = ? AND subject = ?
        ORDER BY created_at DESC`,
    )
    .all(authorId, subject) as ScoutNoteDto[]
}

export function addNote(authorId: number, subject: string, body: string): ScoutNoteDto {
  const text = body.trim().slice(0, MAX_BODY)
  if (!text) throw ApiError.badRequest("Заметка не может быть пустой")

  const info = db
    .prepare(`INSERT INTO scout_notes (author_id, subject, body) VALUES (?, ?, ?)`)
    .run(authorId, subject, text)

  return db
    .prepare(`SELECT id, subject, body, created_at AS createdAt FROM scout_notes WHERE id = ?`)
    .get(Number(info.lastInsertRowid)) as ScoutNoteDto
}

export function deleteNote(authorId: number, id: number) {
  const result = db.prepare(`DELETE FROM scout_notes WHERE id = ? AND author_id = ?`).run(id, authorId)
  if (result.changes === 0) throw ApiError.notFound("Заметка не найдена")
}
