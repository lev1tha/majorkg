/**
 * Наполнение базы демо-данными.
 *
 * Запуск: npm run seed [-- --reset]
 * Идемпотентен: повторный запуск не плодит дубликаты, с --reset полностью
 * пересоздает содержимое.
 *
 * Данные отражают модель платформы: дисциплина одна (CS2), игроки
 * заявляются поодиночке, составы собирает жеребьевка, сетка — верхняя.
 */

import { randomBytes } from "node:crypto"

import { db, migrate, tx } from "./index.js"

import { env } from "../env.js"
import { countAdmins, createAdmin } from "../services/admins.js"
import { createFaq, listFaq } from "../services/faq.js"

import { drawLineups } from "../services/lineups.js"
import { generateBracket } from "../services/bracket.js"
import { scoreMatch } from "../services/matches.js"
import { ACTIVE_MAP_POOL, DEFAULT_ENTRY_FEE, DEFAULT_RULES } from "../services/tournaments.js"

const reset = process.argv.includes("--reset")
/**
 * Боевой запуск: только то, без чего платформа не работает — учетка
 * организатора и FAQ. Демо-игроков и демо-турниры на живой сайт лить
 * нельзя, их потом руками не вычистишь.
 */
const minimal = process.argv.includes("--minimal")

interface SeedPlayer {
  nickname: string
  faceit: string
  role: string
  elo: number
  matches: number
  winRate: number
  hltvRating: number
  kd: number
  headshots: number
  city: string
}

const PLAYERS: SeedPlayer[] = [
  { nickname: "aibek", faceit: "aibek-kg", role: "IGL", elo: 3042, matches: 184, winRate: 62, hltvRating: 1.14, kd: 1.18, headshots: 51, city: "Бишкек" },
  { nickname: "turan", faceit: "turan_awp", role: "AWP", elo: 2614, matches: 150, winRate: 59, hltvRating: 1.21, kd: 1.26, headshots: 38, city: "Бишкек" },
  { nickname: "sardar", faceit: "sardar-alt", role: "IGL", elo: 2288, matches: 210, winRate: 56, hltvRating: 1.05, kd: 1.02, headshots: 47, city: "Ош" },
  { nickname: "mirbek", faceit: "mirbek", role: "Entry", elo: 2105, matches: 132, winRate: 57, hltvRating: 1.09, kd: 1.11, headshots: 58, city: "Бишкек" },
  { nickname: "nurs", faceit: "nurs1k", role: "AWP", elo: 1964, matches: 98, winRate: 55, hltvRating: 1.12, kd: 1.15, headshots: 34, city: "Бишкек" },
  { nickname: "dastan", faceit: "dastan-stw", role: "AWP", elo: 1877, matches: 144, winRate: 53, hltvRating: 1.07, kd: 1.08, headshots: 41, city: "Каракол" },
  { nickname: "elmar", faceit: "elmar_support", role: "Support", elo: 1802, matches: 119, winRate: 54, hltvRating: 0.99, kd: 0.97, headshots: 44, city: "Бишкек" },
  { nickname: "temir", faceit: "temir-entry", role: "Entry", elo: 1741, matches: 162, winRate: 52, hltvRating: 1.02, kd: 1.04, headshots: 55, city: "Ош" },
  { nickname: "arsen", faceit: "arsen-igl", role: "IGL", elo: 1658, matches: 107, winRate: 51, hltvRating: 0.98, kd: 0.96, headshots: 46, city: "Токмок" },
  { nickname: "kanat", faceit: "kanat_", role: "Lurk", elo: 1590, matches: 131, winRate: 53, hltvRating: 0.96, kd: 0.94, headshots: 49, city: "Бишкек" },
  { nickname: "ilim", faceit: "ilim-entry", role: "Entry", elo: 1488, matches: 75, winRate: 50, hltvRating: 1.01, kd: 1.03, headshots: 57, city: "Бишкек" },
  { nickname: "aman", faceit: "aman-sup", role: "Support", elo: 1402, matches: 118, winRate: 49, hltvRating: 0.94, kd: 0.92, headshots: 43, city: "Джалал-Абад" },
  { nickname: "ruslan", faceit: "ruslan-kg", role: "Rifler", elo: 1327, matches: 61, winRate: 48, hltvRating: 0.95, kd: 0.93, headshots: 52, city: "Бишкек" },
  { nickname: "bek", faceit: "bek-lurk", role: "Lurk", elo: 1244, matches: 49, winRate: 47, hltvRating: 0.91, kd: 0.9, headshots: 48, city: "Ош" },
  { nickname: "azamat", faceit: "azamat-kg", role: "Rifler", elo: 1163, matches: 40, winRate: 46, hltvRating: 0.89, kd: 0.88, headshots: 50, city: "Нарын" },
  { nickname: "islam", faceit: "islam-kg", role: "Support", elo: 1088, matches: 35, winRate: 45, hltvRating: 0.87, kd: 0.85, headshots: 42, city: "Бишкек" },
  { nickname: "erlan", faceit: "erlan-kg", role: "Rifler", elo: 994, matches: 28, winRate: 44, hltvRating: 0.85, kd: 0.84, headshots: 45, city: "Талас" },
  { nickname: "salim", faceit: "salim-kg", role: "Entry", elo: 932, matches: 21, winRate: 43, hltvRating: 0.84, kd: 0.82, headshots: 54, city: "Баткен" },
  { nickname: "timur", faceit: "timur-kg", role: "Support", elo: 861, matches: 17, winRate: 41, hltvRating: 0.8, kd: 0.79, headshots: 39, city: "Бишкек" },
  { nickname: "adil", faceit: "adil-kg", role: "Rifler", elo: 742, matches: 13, winRate: 39, hltvRating: 0.77, kd: 0.76, headshots: 47, city: "Кара-Балта" },
  { nickname: "murat", faceit: "murat-kg", role: "IGL", elo: 2410, matches: 176, winRate: 58, hltvRating: 1.08, kd: 1.06, headshots: 49, city: "Бишкек" },
  { nickname: "askar", faceit: "askar-awp", role: "AWP", elo: 2202, matches: 141, winRate: 57, hltvRating: 1.17, kd: 1.2, headshots: 36, city: "Бишкек" },
  { nickname: "beksultan", faceit: "beksultan", role: "Entry", elo: 1893, matches: 128, winRate: 54, hltvRating: 1.04, kd: 1.07, headshots: 56, city: "Ош" },
  { nickname: "daniyar", faceit: "daniyar-kg", role: "Support", elo: 1655, matches: 112, winRate: 52, hltvRating: 0.97, kd: 0.95, headshots: 43, city: "Бишкек" },
  { nickname: "chyngyz", faceit: "chyngyz", role: "Lurk", elo: 1512, matches: 96, winRate: 51, hltvRating: 1.0, kd: 0.99, headshots: 47, city: "Каракол" },
  { nickname: "ermek", faceit: "ermek-kg", role: "IGL", elo: 2255, matches: 168, winRate: 56, hltvRating: 1.03, kd: 1.01, headshots: 45, city: "Бишкек" },
  { nickname: "nurbek", faceit: "nurbek-kg", role: "Entry", elo: 1801, matches: 122, winRate: 53, hltvRating: 1.06, kd: 1.09, headshots: 58, city: "Ош" },
  { nickname: "samat", faceit: "samat-kg", role: "Support", elo: 1604, matches: 104, winRate: 50, hltvRating: 0.93, kd: 0.91, headshots: 41, city: "Талас" },
  { nickname: "adilet", faceit: "adilet-kg", role: "Lurk", elo: 1476, matches: 88, winRate: 49, hltvRating: 0.98, kd: 0.97, headshots: 46, city: "Бишкек" },
  { nickname: "zhanybek", faceit: "zhanybek", role: "IGL", elo: 2166, matches: 159, winRate: 55, hltvRating: 1.02, kd: 1.0, headshots: 44, city: "Нарын" },
  { nickname: "akylbek", faceit: "akylbek-awp", role: "AWP", elo: 1998, matches: 137, winRate: 54, hltvRating: 1.15, kd: 1.18, headshots: 35, city: "Бишкек" },
  { nickname: "maksat", faceit: "maksat-kg", role: "Entry", elo: 1742, matches: 118, winRate: 52, hltvRating: 1.05, kd: 1.08, headshots: 57, city: "Ош" },
  { nickname: "talant", faceit: "talant-kg", role: "Support", elo: 1533, matches: 99, winRate: 50, hltvRating: 0.92, kd: 0.9, headshots: 42, city: "Бишкек" },
  { nickname: "kubat", faceit: "kubat-kg", role: "Lurk", elo: 1401, matches: 84, winRate: 48, hltvRating: 0.96, kd: 0.95, headshots: 48, city: "Токмок" },
  { nickname: "sherzod", faceit: "sherzod-kg", role: "IGL", elo: 2044, matches: 148, winRate: 54, hltvRating: 1.0, kd: 0.98, headshots: 43, city: "Ош" },
  { nickname: "jamshid", faceit: "jamshid-kg", role: "AWP", elo: 1912, matches: 131, winRate: 53, hltvRating: 1.11, kd: 1.14, headshots: 37, city: "Ош" },
  { nickname: "bakyt", faceit: "bakyt-kg", role: "Entry", elo: 1688, matches: 109, winRate: 51, hltvRating: 1.03, kd: 1.05, headshots: 55, city: "Бишкек" },
  { nickname: "erkin", faceit: "erkin-kg", role: "Support", elo: 1455, matches: 91, winRate: 49, hltvRating: 0.9, kd: 0.89, headshots: 40, city: "Джалал-Абад" },
  { nickname: "ilyas", faceit: "ilyas-kg", role: "Lurk", elo: 1322, matches: 77, winRate: 47, hltvRating: 0.94, kd: 0.93, headshots: 46, city: "Бишкек" },
  { nickname: "azat", faceit: "azat-kg", role: "IGL", elo: 1955, matches: 139, winRate: 53, hltvRating: 0.99, kd: 0.97, headshots: 44, city: "Токмок" },
]

function isoIn(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

interface SeedTournament {
  title: string
  edition: string
  summary: string
  teamSize: number
  status: "draft" | "registration" | "checkin" | "live" | "finished"
  slots: number
  startsInMinutes: number
  tier: "S" | "A" | "B"
  ruleset: string
  maps: string[]
  entryFee?: number
  featured?: boolean
  drawBeforeMinutes?: number
  region?: string
  organizer?: string
}

const TOURNAMENTS: SeedTournament[] = [
  {
    title: "MAJOR KG OPEN",
    edition: "Season 4 · CS2",
    summary:
      "Главный открытый CS2-турнир сезона. Заявка индивидуальная: заходите один, за 20 минут до старта жеребьевка соберет составы по рейтинговым поясам FACEIT. Верхняя сетка, BO3 от полуфинала, прямой слот в региональную квалификацию для чемпиона.",
    teamSize: 5,
    status: "registration",
    slots: 80,
    startsInMinutes: 214,
    tier: "S",
    ruleset: "MR12 · OT MR3 · 128 tick",
    maps: ACTIVE_MAP_POOL,
    featured: true,
  },
  {
    title: "MIX ARENA",
    edition: "Daily · CS2",
    summary:
      "Ежедневный микс. Заявка соло, жеребьевка за 20 минут до старта раскладывает игроков по поясам и собирает равные составы, которые сразу попадают в сетку.",
    teamSize: 5,
    status: "registration",
    slots: 50,
    startsInMinutes: 74,
    tier: "B",
    ruleset: "MR12 · BO1 до финала",
    maps: ["Mirage", "Inferno", "Ancient", "Dust II"],
    drawBeforeMinutes: 20,
  },
  {
    title: "BISHKEK CLASH",
    edition: "Autumn · CS2",
    summary:
      "Слоты закрыты — идет check-in. Вето через платформу, обязательный античит-клиент и GOTV-запись каждой карты.",
    teamSize: 5,
    status: "checkin",
    slots: 40,
    startsInMinutes: 41,
    tier: "A",
    ruleset: "MR12 · OT MR3 · 128 tick",
    maps: ACTIVE_MAP_POOL,
    region: "Центральная Азия",
  },
  {
    title: "NIGHT LADDER",
    edition: "Week 12 · CS2",
    summary:
      "Еженедельный вечерний кубок на верхней сетке. Проигравший выбывает, победитель получает прямой слот в плейофф ближайшего Clash.",
    teamSize: 5,
    status: "live",
    slots: 40,
    startsInMinutes: 0,
    tier: "B",
    ruleset: "MR12 · BO1 до полуфинала",
    maps: ["Mirage", "Inferno", "Ancient", "Dust II"],
  },
  {
    title: "RETAKE ARENA",
    edition: "Fast Cup · CS2",
    summary:
      "Wingman-формат на двоих: заявка индивидуальная, пару подбирает жеребьевка, матчи по 15 минут, сетка строится сразу после закрытия слотов.",
    teamSize: 2,
    status: "registration",
    slots: 32,
    startsInMinutes: 320,
    tier: "B",
    ruleset: "Wingman · MR8",
    maps: ["Overpass", "Nuke", "Vertigo", "Inferno"],
  },
  {
    title: "ACADEMY LEAGUE",
    edition: "Division 2 · CS2",
    summary:
      "Турнир для новичков: разбор демок от аналитиков после каждого тура и переход победителя в основной дивизион.",
    teamSize: 5,
    status: "registration",
    slots: 60,
    startsInMinutes: 2_880,
    tier: "B",
    ruleset: "MR12 · демо-разбор после тура",
    maps: ["Mirage", "Inferno", "Ancient", "Anubis"],
    organizer: "MAJOR KG Academy",
  },
  {
    title: "WINTER INVITE",
    edition: "Season 5 · CS2",
    summary: "Закрытый зимний кубок по приглашениям. Дата уточняется.",
    teamSize: 5,
    status: "draft",
    slots: 40,
    startsInMinutes: 20_000,
    tier: "A",
    ruleset: "MR12 · OT MR3 · 128 tick",
    maps: ACTIVE_MAP_POOL,
  },
]

function seedPlayers() {
  const stmt = db.prepare(
    `INSERT INTO players
       (steam_id, nickname, faceit, role, country, city, elo, matches, win_rate,
        hltv_rating, kd, headshots, adr, kast, opening_win_rate, points, maps_played,
        trend, elo_synced_at)
     VALUES (@steamId, @nickname, @faceit, @role, 'KG', @city, @elo, @matches, @winRate,
             @hltvRating, @kd, @headshots, @adr, @kast, @openingWinRate, @points, @mapsPlayed,
             @trend, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
     ON CONFLICT (steam_id) DO NOTHING`,
  )

  PLAYERS.forEach((player, index) => {
    stmt.run({
      steamId: `7656119800000${String(index + 1).padStart(4, "0")}`,
      nickname: player.nickname,
      faceit: player.faceit,
      role: player.role,
      city: player.city,
      elo: player.elo,
      matches: player.matches,
      winRate: player.winRate,
      hltvRating: player.hltvRating,
      kd: player.kd,
      headshots: player.headshots,
      adr: Math.round((player.hltvRating * 72 + 6) * 10) / 10,
      kast: Math.round((player.hltvRating * 62 + 5) * 10) / 10,
      openingWinRate: Math.round(player.hltvRating * 48 + 4),
      // Очки сезона — производная от результатов; стартовый снимок.
      points: Math.round(player.elo * 0.6 + player.matches * 4),
      mapsPlayed: player.matches * 2,
      trend: player.hltvRating >= 1.05 ? "up" : player.hltvRating >= 0.95 ? "flat" : "down",
    })
  })
}

function seedTournaments() {
  const stmt = db.prepare(
    `INSERT INTO tournaments
       (slug, title, edition, summary, team_size, bracket, status, slots, starts_at,
        region, organizer, tier, ruleset, server, maps, entry_fee, rules, featured,
        draw_before_minutes)
     VALUES (@slug, @title, @edition, @summary, @teamSize, 'single', @status, @slots, @startsAt,
             @region, @organizer, @tier, @ruleset, @server, @maps, @entryFee, @rules, @featured,
             @drawBefore)
     ON CONFLICT (slug) DO NOTHING`,
  )

  for (const tournament of TOURNAMENTS) {
    stmt.run({
      slug: tournament.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: tournament.title,
      edition: tournament.edition,
      summary: tournament.summary,
      teamSize: tournament.teamSize,
      status: tournament.status,
      slots: tournament.slots,
      startsAt: isoIn(tournament.startsInMinutes),
      region: tournament.region ?? "Кыргызстан",
      organizer: tournament.organizer ?? "MAJOR KG",
      tier: tournament.tier,
      ruleset: tournament.ruleset,
      server: "Bishkek · 128 tick",
      maps: JSON.stringify(tournament.maps),
      entryFee: tournament.entryFee ?? DEFAULT_ENTRY_FEE,
      rules: JSON.stringify(DEFAULT_RULES),
      featured: tournament.featured ? 1 : 0,
      drawBefore: tournament.drawBeforeMinutes ?? 20,
    })
  }
}

/** Заявки индивидуальные: раскладываем игроков по турнирам. */
function seedRegistrations() {
  const players = db.prepare(`SELECT id FROM players ORDER BY elo DESC`).all() as { id: number }[]
  const tournaments = db
    .prepare(`SELECT id, slug, status, slots FROM tournaments WHERE status != 'draft'`)
    .all() as { id: number; slug: string; status: string; slots: number }[]

  const stmt = db.prepare(
    `INSERT INTO registrations (tournament_id, player_id, status) VALUES (?, ?, ?)
     ON CONFLICT (tournament_id, player_id) DO NOTHING`,
  )

  for (const tournament of tournaments) {
    // Турниры в check-in и live укомплектованы, в регистрации — частично.
    const share =
      tournament.status === "live" || tournament.status === "checkin"
        ? players.length
        : Math.ceil(players.length * 0.65)

    players.slice(0, Math.min(share, tournament.slots)).forEach((player, index) => {
      const status =
        tournament.status === "registration"
          ? index % 7 === 0
            ? "pending"
            : "confirmed"
          : "checked_in"
      stmt.run(tournament.id, player.id, status)
    })
  }
}

/** Жеребьевка и сетка для турниров, которые уже стартовали. */
function seedBrackets() {
  const started = db
    .prepare(`SELECT slug FROM tournaments WHERE status IN ('live', 'checkin')`)
    .all() as { slug: string }[]

  for (const { slug } of started) {
    drawLineups(slug, 7)
    generateBracket(slug)
  }
}

/** Закрывает часть матчей live-турнира, чтобы сетка была не пустой. */
function seedResults() {
  const live = db.prepare(`SELECT id, slug FROM tournaments WHERE status = 'live'`).get() as
    | { id: number; slug: string }
    | undefined
  if (!live) return

  const first = db
    .prepare(
      `SELECT id FROM matches
        WHERE tournament_id = ? AND round = 0 AND lineup_a_id IS NOT NULL AND lineup_b_id IS NOT NULL
        ORDER BY position`,
    )
    .all(live.id) as { id: number }[]

  const pool = ["Mirage", "Inferno", "Ancient", "Nuke", "Anubis"]

  first.slice(0, Math.max(1, first.length - 1)).forEach((match, index) => {
    const aWins = index % 3 !== 2
    scoreMatch(match.id, {
      maps: [
        {
          map: pool[index % pool.length]!,
          scoreA: aWins ? 13 : 9,
          scoreB: aWins ? 9 : 13,
        },
      ],
      state: "done",
      proof: true,
    })
  })

  // Последний матч первого раунда оставляем в эфире.
  const lastMatch = first.at(-1)
  if (lastMatch && first.length > 1) {
    db.prepare(
      `UPDATE matches SET state = 'live', score_a = 0, score_b = 0, note = 'идет карта 1' WHERE id = ?`,
    ).run(lastMatch.id)
  }
}

/** Стартовые вопросы. Дальше организатор правит их в админке. */
const FAQ: { question: string; answer: string }[] = [
  {
    question: "Как попасть на онлайн турнир по CS2 в Кыргызстане?",
    answer:
      "Выберите турнир в календаре и нажмите «Участвовать». Регистрация индивидуальная: команда не нужна и создавать ее не надо — вы заявляетесь от своего имени, а состав соберет жеребьевка перед стартом.",
  },
  {
    question: "Нужна ли команда, чтобы играть?",
    answer:
      "Нет. Все турниры MAJOR KG идут с индивидуальной регистрацией. За 20 минут до старта жеребьевка раскладывает участников по рейтинговым поясам FACEIT и собирает равные составы — рядом с вами окажутся игроки сопоставимого уровня.",
  },
  {
    question: "Сколько стоит участие в турнирах КГ?",
    answer:
      "Организационный взнос — 500 сом за турнир. Он идет на сервера, судейство и призовой сезонный фонд. Точная сумма всегда указана на странице турнира до подтверждения заявки.",
  },
  {
    question: "Как формируется турнирная сетка?",
    answer:
      "Сетка строится автоматически после жеребьевки — верхняя сетка на выбывание (single elimination). Посев идет по среднему рейтингу состава, результаты матчей попадают в сетку сразу после подтверждения судьей.",
  },
  {
    question: "Что будет, если игрок не пришел на матч?",
    answer:
      "Действует регламент check-in: подтвердить готовность нужно за 30 минут до старта. При неявке или неполном составе назначается техническое поражение, а место передается игроку из листа ожидания.",
  },
]

function seedFaq() {
  if (listFaq(true).length > 0) return
  FAQ.forEach((item, index) => createFaq({ ...item, position: index + 1 }))
}

/**
 * Первая учетка организатора. Пароль берется из ADMIN_PASSWORD, а если его
 * нет — генерируется и печатается один раз: класть дефолтный пароль в
 * репозиторий нельзя.
 */
async function seedAdmin() {
  if (countAdmins() > 0) return

  const generated = randomBytes(9).toString("base64url")
  const password = env.adminPassword ?? generated

  await createAdmin({ login: env.adminLogin, password, name: "Главный организатор" })

  console.log(`[seed] создана учетка организатора: ${env.adminLogin}`)
  if (!env.adminPassword) {
    console.log(`[seed] пароль (показан один раз): ${password}`)
    console.log("[seed] задайте ADMIN_PASSWORD в backend/.env, чтобы выбрать свой")
  }
}

async function main() {
  migrate()

  if (reset) {
    tx(() => {
      for (const table of [
        "match_maps", "appeals", "matches", "lineup_members", "lineups",
        "registrations", "scout_notes", "sessions", "tournaments", "players",
        "faq", "admin_sessions", "admins",
      ]) {
        db.prepare(`DELETE FROM ${table}`).run()
      }
      db.prepare(`DELETE FROM sqlite_sequence`).run()
    })
    console.log("[seed] база очищена")
  }

  tx(() => {
    if (!minimal) {
      seedPlayers()
      seedTournaments()
      seedRegistrations()
    }
    seedFaq()
  })

  await seedAdmin()

  seedBrackets()
  seedResults()

  const stats = {
    players: (db.prepare(`SELECT COUNT(*) AS n FROM players`).get() as { n: number }).n,
    tournaments: (db.prepare(`SELECT COUNT(*) AS n FROM tournaments`).get() as { n: number }).n,
    registrations: (db.prepare(`SELECT COUNT(*) AS n FROM registrations`).get() as { n: number }).n,
    lineups: (db.prepare(`SELECT COUNT(*) AS n FROM lineups`).get() as { n: number }).n,
    matches: (db.prepare(`SELECT COUNT(*) AS n FROM matches`).get() as { n: number }).n,
  }
  console.log(minimal ? "[seed] боевой запуск, состояние базы:" : "[seed] готово:", stats)
  if (minimal) {
    console.log("[seed] демо-данные не создавались — турниры заводите через админку")
  }
}

await main()
