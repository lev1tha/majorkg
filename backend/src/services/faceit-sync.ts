import { db } from "../db/index.js"
import { env } from "../env.js"
import { fetchFaceitSnapshot, levelFromElo } from "../lib/faceit.js"
import { fetchSteamProfile } from "../lib/steam.js"

/**
 * Синхронизация игрока с внешними источниками.
 *
 * Steam дает ник и аватар, FACEIT — рейтинг и пожизненную статистику.
 * Оба привязаны к одному ключу — SteamID64, поэтому игроку не нужно
 * ничего вводить руками.
 *
 * Обе выгрузки необязательные: нет ключа или профиля — остаются прежние
 * значения, интерфейс честно помечает данные как снимок.
 */

/** Как часто имеет смысл ходить в FACEIT за одним и тем же игроком. */
const TTL_MINUTES = 60

interface SyncRow {
  id: number
  steam_id: string
  nickname: string
  faceit: string | null
  faceit_id: string | null
  elo_synced_at: string | null
}

export interface SyncResult {
  steam: boolean
  faceit: boolean
  /** Ключ не настроен — отличаем от «сходили и не нашли». */
  skipped: "steam" | "faceit" | "both" | null
}

function isFresh(syncedAt: string | null): boolean {
  if (!syncedAt) return false
  const ms = Date.parse(syncedAt)
  return Number.isFinite(ms) && Date.now() - ms < TTL_MINUTES * 60_000
}

/** Свободный ник: FACEIT-ник может совпасть с чужим ником на платформе. */
function freeNickname(desired: string, ownerId: number): string {
  let candidate = desired
  let attempt = 2
  while (
    db
      .prepare(`SELECT id FROM players WHERE nickname = ? COLLATE NOCASE AND id IS NOT ?`)
      .get(candidate, ownerId)
  ) {
    candidate = `${desired}-${attempt++}`
  }
  return candidate
}

/**
 * Подтягивает Steam и FACEIT для одного игрока.
 * @param force игнорировать TTL — ручное обновление из профиля или админки.
 */
export async function syncPlayer(playerId: number, { force = false } = {}): Promise<SyncResult> {
  const row = db
    .prepare(`SELECT id, steam_id, nickname, faceit, faceit_id, elo_synced_at FROM players WHERE id = ?`)
    .get(playerId) as SyncRow | undefined

  if (!row) return { steam: false, faceit: false, skipped: null }

  const skipped =
    !env.steamApiKey && !env.faceitApiKey
      ? "both"
      : !env.steamApiKey
        ? "steam"
        : !env.faceitApiKey
          ? "faceit"
          : null

  if (!force && isFresh(row.elo_synced_at)) {
    return { steam: false, faceit: false, skipped }
  }

  // Steam: ник и аватар.
  let steamUpdated = false
  if (env.steamApiKey) {
    const profile = await fetchSteamProfile(row.steam_id, env.steamApiKey)
    if (profile.avatar || profile.nickname) {
      db.prepare(`UPDATE players SET nickname = ?, avatar = COALESCE(?, avatar) WHERE id = ?`).run(
        freeNickname(profile.nickname, row.id),
        profile.avatar,
        row.id,
      )
      steamUpdated = true
    }
  }

  // FACEIT: рейтинг, уровень и пожизненная статистика.
  let faceitUpdated = false
  if (env.faceitApiKey) {
    const snapshot = await fetchFaceitSnapshot(
      { steamId: row.steam_id, faceitId: row.faceit_id, nickname: row.faceit },
      env.faceitApiKey,
    )

    if (snapshot) {
      const lifetime = snapshot.lifetime
      db.prepare(
        `UPDATE players
            SET faceit        = ?,
                faceit_id     = ?,
                faceit_avatar = COALESCE(?, faceit_avatar),
                elo           = ?,
                matches       = COALESCE(NULLIF(?, 0), matches),
                win_rate      = COALESCE(NULLIF(?, 0), win_rate),
                kd            = COALESCE(NULLIF(?, 0), kd),
                headshots     = COALESCE(NULLIF(?, 0), headshots),
                elo_synced_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
          WHERE id = ?`,
      ).run(
        snapshot.nickname,
        snapshot.faceitId,
        snapshot.avatar,
        snapshot.elo,
        lifetime?.matches ?? 0,
        lifetime?.winRate ?? 0,
        lifetime?.kd ?? 0,
        lifetime?.headshots ?? 0,
        row.id,
      )
      faceitUpdated = true
    }
  }

  return { steam: steamUpdated, faceit: faceitUpdated, skipped }
}

/**
 * Пакетное обновление — кнопка в админке.
 * Идет последовательно: у FACEIT есть лимит запросов, и обогнать его
 * параллельными вызовами значит получить 429 на половине списка.
 */
export async function syncAllPlayers(limit = 100): Promise<{ processed: number; faceit: number }> {
  const rows = db
    .prepare(`SELECT id FROM players ORDER BY COALESCE(elo_synced_at, '') ASC LIMIT ?`)
    .all(limit) as { id: number }[]

  let faceit = 0
  for (const row of rows) {
    const result = await syncPlayer(row.id, { force: true })
    if (result.faceit) faceit += 1
  }

  return { processed: rows.length, faceit }
}

/** Уровень FACEIT по текущему ELO — для ответов без похода в API. */
export { levelFromElo }
