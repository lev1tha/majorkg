/**
 * Внешние ссылки платформы — одно место на весь проект.
 * Значения переопределяются через env при деплое, чтобы не пересобирать
 * код ради смены инвайта.
 */
export const LINKS = {
  discord: process.env.NEXT_PUBLIC_DISCORD_URL ?? "https://discord.gg/majorkg",
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/majorkg",
} as const

/** Внешние ссылки открываем в новой вкладке и без передачи реферера. */
export const EXTERNAL = {
  target: "_blank",
  rel: "noreferrer noopener",
} as const
