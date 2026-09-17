import { randomBytes } from "node:crypto"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

// .env читается до первого обращения к process.env — без внешних зависимостей.
const envFile = resolve(process.cwd(), process.env.ENV_FILE ?? ".env")
if (existsSync(envFile)) process.loadEnvFile(envFile)

function optional(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : undefined
}

function required(name: string, fallback: string): string {
  const value = optional(name)
  if (value) return value
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Переменная окружения ${name} обязательна в production`)
  }
  return fallback
}

const devSecret = randomBytes(32).toString("hex")

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT ?? 4000),

  /** Публичный origin фронтенда — сюда возвращается Steam после входа. */
  siteUrl: (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  /** Собственный публичный origin API — для openid.return_to. */
  apiUrl: (process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, ""),

  /** Источники, которым разрешен доступ с cookie. */
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),

  databaseUrl: process.env.DATABASE_URL ?? "./data/majorkg.db",

  /** Подпись сессионной cookie. В production обязателен. */
  sessionSecret: required("SESSION_SECRET", devSecret),
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 30),
  /** Сессия организатора живет заметно меньше игровой — это рабочий доступ. */
  adminSessionTtlHours: Number(process.env.ADMIN_SESSION_TTL_HOURS ?? 12),

  steamApiKey: optional("STEAM_API_KEY"),
  faceitApiKey: optional("FACEIT_API_KEY"),

  /** Первая учетка организатора — создается сидом, если админов еще нет. */
  adminLogin: process.env.ADMIN_LOGIN ?? "admin",
  adminPassword: optional("ADMIN_PASSWORD"),
} as const

if (!env.isProd && !optional("SESSION_SECRET")) {
  console.warn(
    "[env] SESSION_SECRET не задан — сгенерирован временный ключ, сессии не переживут перезапуск.",
  )
}
