import { db } from "../db/index.js"
import { ApiError } from "../lib/http.js"
import type { FaqItemDto } from "../types.js"

/**
 * FAQ хранится в базе, а не в коде: организатор правит ответы сам, и те же
 * тексты уходят в разметку FAQPage — значит, они должны меняться без
 * пересборки фронтенда.
 */

interface FaqRow {
  id: number
  question: string
  answer: string
  position: number
  published: number
}

function toDto(row: FaqRow): FaqItemDto {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    position: row.position,
    published: row.published === 1,
  }
}

export function listFaq(includeHidden = false): FaqItemDto[] {
  const clause = includeHidden ? "" : "WHERE published = 1"
  const rows = db
    .prepare(`SELECT id, question, answer, position, published FROM faq ${clause} ORDER BY position, id`)
    .all() as FaqRow[]
  return rows.map(toDto)
}

export interface FaqInput {
  question: string
  answer: string
  position?: number
  published?: boolean
}

export function createFaq(input: FaqInput): FaqItemDto {
  // Новый вопрос встает в конец списка, если позиция не указана явно.
  const next =
    input.position ??
    ((db.prepare(`SELECT COALESCE(MAX(position), 0) AS n FROM faq`).get() as { n: number }).n + 1)

  const info = db
    .prepare(`INSERT INTO faq (question, answer, position, published) VALUES (?, ?, ?, ?)`)
    .run(input.question.trim(), input.answer.trim(), next, input.published === false ? 0 : 1)

  return requireFaq(Number(info.lastInsertRowid))
}

export function updateFaq(id: number, patch: Partial<FaqInput>): FaqItemDto {
  const fields: string[] = []
  const params: unknown[] = []

  if (patch.question !== undefined) {
    fields.push("question = ?")
    params.push(patch.question.trim())
  }
  if (patch.answer !== undefined) {
    fields.push("answer = ?")
    params.push(patch.answer.trim())
  }
  if (patch.position !== undefined) {
    fields.push("position = ?")
    params.push(patch.position)
  }
  if (patch.published !== undefined) {
    fields.push("published = ?")
    params.push(patch.published ? 1 : 0)
  }

  if (fields.length === 0) return requireFaq(id)

  params.push(id)
  const result = db.prepare(`UPDATE faq SET ${fields.join(", ")} WHERE id = ?`).run(...params)
  if (result.changes === 0) throw ApiError.notFound("Вопрос не найден")
  return requireFaq(id)
}

export function deleteFaq(id: number) {
  const result = db.prepare(`DELETE FROM faq WHERE id = ?`).run(id)
  if (result.changes === 0) throw ApiError.notFound("Вопрос не найден")
}

function requireFaq(id: number): FaqItemDto {
  const row = db
    .prepare(`SELECT id, question, answer, position, published FROM faq WHERE id = ?`)
    .get(id) as FaqRow | undefined
  if (!row) throw ApiError.notFound("Вопрос не найден")
  return toDto(row)
}
