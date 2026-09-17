import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Deterministic number formatting (thin-space groups).
 * Intl is intentionally avoided: Node and browser can disagree on the
 * grouping separator, which produces hydration mismatches.
 */
export function formatNumber(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

export function formatMoney(value: number, currency: "KGS" | "USD" = "KGS") {
  return currency === "USD" ? `$${formatNumber(value)}` : `${formatNumber(value)} KGS`
}

export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`
  return String(value)
}

export function pct(part: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)))
}

export function pad2(value: number) {
  return value < 10 ? `0${value}` : String(value)
}

export function initials(name: string) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

/** Русская плюрализация: plural(2, ["матч", "матча", "матчей"]). */
export function plural(count: number, forms: [string, string, string]) {
  const n = Math.abs(count) % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
}

/** Таймзона турниров — Бишкек, UTC+6. */
const TZ_OFFSET_MINUTES = 6 * 60

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
]

function inTournamentTz(iso: string): Date | null {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  return new Date(ms + TZ_OFFSET_MINUTES * 60_000)
}

/**
 * Форматирование дат без Intl.
 *
 * Intl намеренно не используется: Node и браузер расходятся в
 * разделителях и падежах, а расхождение ломает гидрацию. Сдвиг в UTC+6
 * делается вручную, поэтому результат одинаков на сервере и на клиенте.
 */
export function formatDateTime(iso: string) {
  const date = inTournamentTz(iso)
  if (!date) return "—"
  const day = date.getUTCDate()
  const month = MONTHS[date.getUTCMonth()]
  return `${day} ${month}, ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} (GMT+6)`
}

/** Короткая дата: 14.09.2026. */
export function formatDate(iso: string) {
  const date = inTournamentTz(iso)
  if (!date) return "—"
  return `${pad2(date.getUTCDate())}.${pad2(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`
}

/** Только время: 21:30. */
export function formatTime(iso: string) {
  const date = inTournamentTz(iso)
  if (!date) return "—"
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`
}
