-- MAJOR KG — схема данных.
--
-- Ключевые решения предметной области:
--   * дисциплина одна — CS2, поэтому колонки game в схеме нет;
--   * регистрация индивидуальная: в турнир заявляется игрок, а не команда;
--   * составы (lineups) собирает жеребьевка из подтвержденных заявок;
--   * сетка только верхняя (single elimination), нижней и гранд-финала нет;
--   * призовых и балансов в системе нет вообще.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────── Игроки ───────────────────────────────

CREATE TABLE IF NOT EXISTS players (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_id      TEXT    NOT NULL UNIQUE,
  nickname      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  faceit        TEXT,
  avatar        TEXT,
  role          TEXT    NOT NULL DEFAULT 'Rifler',
  country       TEXT    NOT NULL DEFAULT 'KG',
  city          TEXT,

  elo           INTEGER NOT NULL DEFAULT 1000,
  matches       INTEGER NOT NULL DEFAULT 0,
  win_rate      REAL    NOT NULL DEFAULT 0,
  hltv_rating   REAL    NOT NULL DEFAULT 1.0,
  kd            REAL    NOT NULL DEFAULT 1.0,
  headshots     INTEGER NOT NULL DEFAULT 0,
  adr           REAL    NOT NULL DEFAULT 0,
  kast          REAL    NOT NULL DEFAULT 0,
  opening_win_rate REAL NOT NULL DEFAULT 0,

  -- Очки сезона — единственный рейтинг лидерборда (команд в нем нет).
  points        INTEGER NOT NULL DEFAULT 0,
  maps_played   INTEGER NOT NULL DEFAULT 0,
  trend         TEXT    NOT NULL DEFAULT 'flat' CHECK (trend IN ('up', 'down', 'flat')),

  status        TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'review', 'banned')),
  elo_synced_at TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_players_elo    ON players (elo DESC);
CREATE INDEX IF NOT EXISTS idx_players_points ON players (points DESC);

-- ────────────────────────────── Турниры ───────────────────────────────

CREATE TABLE IF NOT EXISTS tournaments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,
  title         TEXT    NOT NULL,
  edition       TEXT    NOT NULL DEFAULT '',
  summary       TEXT    NOT NULL DEFAULT '',

  -- Размер состава: 5 — обычный CS2, 2 — Wingman, 1 — соло-форматы.
  team_size     INTEGER NOT NULL DEFAULT 5 CHECK (team_size BETWEEN 1 AND 5),
  -- Сетка только верхняя: single elimination.
  bracket       TEXT    NOT NULL DEFAULT 'single' CHECK (bracket = 'single'),
  status        TEXT    NOT NULL DEFAULT 'registration'
                  CHECK (status IN ('draft', 'registration', 'checkin', 'live', 'finished')),

  -- Слоты считаются в игроках: регистрация индивидуальная.
  slots         INTEGER NOT NULL DEFAULT 40,
  starts_at     TEXT    NOT NULL,
  region        TEXT    NOT NULL DEFAULT 'Кыргызстан',
  organizer     TEXT    NOT NULL DEFAULT 'MAJOR KG',
  tier          TEXT    NOT NULL DEFAULT 'B' CHECK (tier IN ('S', 'A', 'B')),
  ruleset       TEXT    NOT NULL DEFAULT 'MR12 · OT MR3 · 128 tick',
  server        TEXT    NOT NULL DEFAULT 'Bishkek · 128 tick',
  maps          TEXT    NOT NULL DEFAULT '[]',   -- JSON-массив названий карт
  -- Организационный взнос за участие, сом. 0 — бесплатный турнир.
  entry_fee     INTEGER NOT NULL DEFAULT 500 CHECK (entry_fee >= 0),
  -- Регламент турнира: JSON [{ title, items: [] }]. Редактируется в админке.
  rules         TEXT    NOT NULL DEFAULT '[]',
  featured      INTEGER NOT NULL DEFAULT 0,
  -- За сколько минут до старта запускается жеребьевка составов.
  draw_before_minutes INTEGER NOT NULL DEFAULT 20,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments (status, starts_at);

-- ─────────────────── Индивидуальные заявки на турнир ──────────────────

CREATE TABLE IF NOT EXISTS registrations (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  player_id     INTEGER NOT NULL REFERENCES players (id)     ON DELETE CASCADE,
  status        TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'checked_in', 'rejected', 'withdrawn')),
  -- Посев внутри турнира, проставляется при жеребьевке.
  seed          INTEGER,
  note          TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (tournament_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_tournament ON registrations (tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_registrations_player     ON registrations (player_id);

-- ──────────── Составы, собранные жеребьевкой из заявок ────────────────

CREATE TABLE IF NOT EXISTS lineups (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  name          TEXT    NOT NULL,
  tag           TEXT    NOT NULL,
  seed          INTEGER NOT NULL DEFAULT 0,
  avg_elo       INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (tournament_id, tag)
);

CREATE TABLE IF NOT EXISTS lineup_members (
  lineup_id     INTEGER NOT NULL REFERENCES lineups (id) ON DELETE CASCADE,
  player_id     INTEGER NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  slot          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (lineup_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_lineups_tournament ON lineups (tournament_id, seed);

-- ──────────────── Верхняя сетка: раунды и матчи ───────────────────────

CREATE TABLE IF NOT EXISTS matches (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  -- round 0 — первый раунд верхней сетки, дальше по возрастанию до финала.
  round         INTEGER NOT NULL,
  position      INTEGER NOT NULL,
  lineup_a_id   INTEGER REFERENCES lineups (id) ON DELETE SET NULL,
  lineup_b_id   INTEGER REFERENCES lineups (id) ON DELETE SET NULL,
  score_a       INTEGER,
  score_b       INTEGER,
  winner        TEXT    CHECK (winner IN ('a', 'b')),
  state         TEXT    NOT NULL DEFAULT 'pending'
                  CHECK (state IN ('pending', 'live', 'review', 'done')),
  format        TEXT    NOT NULL DEFAULT 'BO1',
  scheduled_at  TEXT,
  note          TEXT    NOT NULL DEFAULT '',
  proof         INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (tournament_id, round, position)
);

CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches (tournament_id, round, position);
CREATE INDEX IF NOT EXISTS idx_matches_state      ON matches (state);

CREATE TABLE IF NOT EXISTS match_maps (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id      INTEGER NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  ordinal       INTEGER NOT NULL,
  map           TEXT    NOT NULL,
  score_a       INTEGER NOT NULL DEFAULT 0,
  score_b       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (match_id, ordinal)
);

-- ───────────────────────────── Апелляции ──────────────────────────────

CREATE TABLE IF NOT EXISTS appeals (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id      INTEGER NOT NULL REFERENCES matches (id)  ON DELETE CASCADE,
  claimant_id   INTEGER          REFERENCES players (id)  ON DELETE SET NULL,
  reason        TEXT    NOT NULL,
  severity      TEXT    NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status        TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'declined')),
  resolution    TEXT,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  resolved_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals (status, created_at DESC);

-- ─────────────────────── Личные скаут-заметки ─────────────────────────
-- Заметка видна только автору: это разведка перед матчем, не публичный
-- комментарий.

CREATE TABLE IF NOT EXISTS scout_notes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id     INTEGER NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  subject       TEXT    NOT NULL,
  body          TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_author ON scout_notes (author_id, subject, created_at DESC);

-- ────────────────────── Учетные записи организаторов ──────────────────
-- Админка живет отдельно от игроков: вход по логину и паролю, без Steam.
-- Пароль хранится как scrypt-хеш вместе с солью.

CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  login         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  name          TEXT    NOT NULL DEFAULT 'Организатор',
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id            TEXT    PRIMARY KEY,
  admin_id      INTEGER NOT NULL REFERENCES admins (id) ON DELETE CASCADE,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  expires_at    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions (admin_id);

-- ──────────────────────── Вопросы и ответы ────────────────────────────
-- FAQ редактируется организатором, поэтому живет в базе, а не в коде:
-- те же тексты уходят в разметку FAQPage для поиска.

CREATE TABLE IF NOT EXISTS faq (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  question      TEXT    NOT NULL,
  answer        TEXT    NOT NULL,
  position      INTEGER NOT NULL DEFAULT 0,
  published     INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_faq_position ON faq (published, position);

-- ───────────────────────────── Сессии ─────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT    PRIMARY KEY,
  player_id     INTEGER NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  expires_at    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_player ON sessions (player_id);
