import type { Database } from "better-sqlite3"

/**
 * Догоняющие миграции для уже существующей базы.
 *
 * schema.sql состоит из `CREATE TABLE IF NOT EXISTS`: на пустой базе он
 * создает всё, но на работающей молча пропускает таблицы целиком — новые
 * колонки не появятся. Для боевой базы этого мало: одна выкатка с новым
 * полем, и запросы начинают падать на «no such column».
 *
 * Поэтому после schema.sql идет этот шаг: он сверяет фактические колонки
 * с ожидаемыми и добавляет недостающие. Операции идемпотентны — повторный
 * запуск ничего не делает.
 *
 * SQLite умеет ADD COLUMN, но не DROP COLUMN на старых версиях, поэтому
 * лишние колонки просто остаются: они никому не мешают.
 */

interface ColumnPatch {
  table: string
  column: string
  /** Полное определение для ALTER TABLE ADD COLUMN. */
  definition: string
  /** Чем заполнить колонку у существующих строк, если DEFAULT не подходит. */
  backfill?: string
}

const COLUMNS: ColumnPatch[] = [
  // Организационный взнос и редактируемый регламент турнира.
  { table: "tournaments", column: "entry_fee", definition: "INTEGER NOT NULL DEFAULT 500" },
  { table: "tournaments", column: "rules", definition: "TEXT NOT NULL DEFAULT '[]'" },
  // Аватар из Steam.
  { table: "players", column: "avatar", definition: "TEXT" },
  // Привязка к FACEIT по SteamID64 и аватар оттуда.
  { table: "players", column: "faceit_id", definition: "TEXT" },
  { table: "players", column: "faceit_avatar", definition: "TEXT" },
]

function columnsOf(db: Database, table: string): Set<string> {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
    return new Set(rows.map((row) => row.name))
  } catch {
    return new Set()
  }
}

function tableExists(db: Database, table: string): boolean {
  return Boolean(
    db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(table),
  )
}

/** Возвращает список применённых изменений — их печатает старт сервера. */
export function applyColumnPatches(db: Database): string[] {
  const applied: string[] = []

  for (const patch of COLUMNS) {
    if (!tableExists(db, patch.table)) continue
    if (columnsOf(db, patch.table).has(patch.column)) continue

    db.exec(`ALTER TABLE ${patch.table} ADD COLUMN ${patch.column} ${patch.definition}`)
    if (patch.backfill) db.exec(patch.backfill)
    applied.push(`${patch.table}.${patch.column}`)
  }

  return applied
}
