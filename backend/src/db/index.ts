import { mkdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import Database from "better-sqlite3"

import { env } from "../env.js"
import { applyColumnPatches } from "./migrate.js"

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
 * Приводит базу к текущей схеме.
 *
 * Два шага. Первый — schema.sql: он идемпотентен и создает то, чего еще
 * нет. Второй — догоняющие миграции: на работающей базе `CREATE TABLE IF
 * NOT EXISTS` пропускает таблицу целиком, поэтому новые колонки
 * добавляются отдельно (см. migrate.ts).
 */
export function migrate() {
  // В dist/ рядом с JS лежит копия schema.sql; в dev читаем из src/.
  const candidates = [join(here, "schema.sql"), join(here, "../../src/db/schema.sql")]

  let applied = false
  for (const candidate of candidates) {
    try {
      db.exec(readFileSync(candidate, "utf8"))
      applied = true
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    }
  }
  if (!applied) throw new Error("schema.sql не найден")

  const patches = applyColumnPatches(db)
  if (patches.length > 0) {
    console.log(`[db] добавлены колонки: ${patches.join(", ")}`)
  }
}

/** Оборачивает набор записей в одну транзакцию. */
export function tx<T>(fn: () => T): T {
  return db.transaction(fn)()
}
