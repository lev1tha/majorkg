import { mkdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import Database from "better-sqlite3"

import { env } from "../env.js"

const here = dirname(fileURLToPath(import.meta.url))

function open(): Database.Database {
  const file = resolve(process.cwd(), env.databaseUrl)
  mkdirSync(dirname(file), { recursive: true })

  const connection = new Database(file)
  connection.pragma("journal_mode = WAL")
  connection.pragma("foreign_keys = ON")
  return connection
}

export const db = open()

/**
 * Схема идемпотентна (CREATE TABLE IF NOT EXISTS), поэтому применяется
 * на каждом старте — отдельный шаг миграции не нужен.
 */
export function migrate() {
  // В dist/ рядом с JS лежит копия schema.sql; в dev читаем из src/.
  const candidates = [join(here, "schema.sql"), join(here, "../../src/db/schema.sql")]
  for (const candidate of candidates) {
    try {
      db.exec(readFileSync(candidate, "utf8"))
      return
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
  }
  throw new Error("schema.sql не найден")
}

/** Оборачивает набор записей в одну транзакцию. */
export function tx<T>(fn: () => T): T {
  return db.transaction(fn)()
}
