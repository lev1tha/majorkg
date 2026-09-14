import Link from "next/link"
import { ArrowUpRight, CirclePlay, MessagesSquare, MonitorPlay, Send } from "lucide-react"

import { Logo } from "@/components/layout/logo"
import { Separator } from "@/components/ui/misc"
import { EXTERNAL, LINKS } from "@/lib/links"

const COLUMNS = [
  {
    title: "Платформа",
    links: [
      { label: "Все турниры", href: "/tournaments" },
      { label: "Лидерборд", href: "/leaderboard" },
      { label: "Турнирная сетка", href: "/bracket" },
      { label: "MIX-турниры", href: "/mix" },
    ],
  },
  {
    title: "Участникам",
    links: [
      { label: "Правила и FAQ", href: "/faq" },
      { label: "Мои команды", href: "/teams" },
      { label: "Игроки и рейтинг", href: "/players" },
      { label: "Вход через Steam", href: "/login" },
      { label: "Discord сообщества", href: LINKS.discord, external: true },
    ],
  },
  {
    title: "Организаторам",
    links: [
      { label: "Админ-панель", href: "/admin" },
      { label: "Конструктор турниров", href: "/admin/tournaments/new" },
      { label: "Судейство матчей", href: "/admin/matches" },
      { label: "Модерация команд", href: "/admin/teams" },
    ],
  },
]

const SOCIALS = [
  { label: "Discord", href: LINKS.discord, icon: MessagesSquare, primary: true },
  { label: "Telegram", href: LINKS.telegram, icon: Send },
  { label: "Twitch", href: LINKS.twitch, icon: MonitorPlay },
  { label: "YouTube", href: LINKS.youtube, icon: CirclePlay },
]

export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/[0.07] bg-[#0b0d11]">
      <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="flex max-w-sm flex-col gap-5">
            <Logo />
            <p className="text-[13.5px] leading-relaxed text-white/40">
              Турнирная инфраструктура для CS2-сцены Кыргызстана и Центральной Азии: заявка в два
              клика, автоматические сетки, судейский протокол и прозрачные выплаты.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  {...EXTERNAL}
                  aria-label={social.label}
                  title={social.label}
                  className={
                    social.primary
                      ? "inline-flex h-9 items-center gap-2 rounded-[10px] border border-accent/30 bg-accent/[0.08] px-3 text-[12.5px] font-medium text-accent-soft transition-colors hover:bg-accent/15"
                      : "flex size-9 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.02] text-white/45 transition-colors hover:border-white/20 hover:text-white"
                  }
                >
                  <social.icon size={16} strokeWidth={1.5} />
                  {social.primary ? social.label : null}
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-4">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">
                {column.title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => {
                  const className =
                    "group inline-flex items-center gap-1 text-[13.5px] text-white/55 transition-colors hover:text-white"
                  const arrow = (
                    <ArrowUpRight
                      size={13}
                      strokeWidth={1.5}
                      className="opacity-0 transition-opacity group-hover:opacity-60"
                    />
                  )
                  return (
                    <li key={link.label}>
                      {"external" in link && link.external ? (
                        <a href={link.href} {...EXTERNAL} className={className}>
                          {link.label}
                          {arrow}
                        </a>
                      ) : (
                        <Link href={link.href} className={className}>
                          {link.label}
                          {arrow}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col items-start justify-between gap-4 text-[12.5px] text-white/30 sm:flex-row sm:items-center">
          <p>© 2026 MAJOR KG. Платформа не аффилирована с Valve Corporation.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="transition-colors hover:text-white/60">
              Публичная оферта
            </Link>
            <Link href="#" className="transition-colors hover:text-white/60">
              Политика данных
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
