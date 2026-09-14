"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import {
  ChevronDown,
  LogOut,
  Menu,
  Plus,
  Receipt,
  Settings,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/layout/logo"
import { cn, formatNumber } from "@/lib/utils"

const NAV = [
  { label: "Турниры", href: "/tournaments" },
  { label: "MIX", href: "/mix" },
  { label: "Сетка", href: "/bracket" },
  { label: "Игроки", href: "/players" },
  { label: "Лидерборд", href: "/leaderboard" },
  { label: "FAQ", href: "/faq" },
]

const PROFILE = {
  nickname: "aibek",
  team: "Nomad Five",
  balance: 2_400,
}

const ONLINE = 2_450

function OnlineBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5",
        className,
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inset-0 rounded-full bg-success pulse-live" />
        <span className="relative size-1.5 rounded-full bg-success" />
      </span>
      <span className="mono text-[11.5px] text-white/60">{formatNumber(ONLINE)}</span>
      <span className="text-[11.5px] text-white/35">игроков онлайн</span>
    </span>
  )
}

function ProfileMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-[11px] border border-white/[0.08] bg-white/[0.03] py-1.5 pl-1.5 pr-3 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
        >
          <span className="flex size-7 items-center justify-center rounded-[8px] bg-accent/15 font-display text-[11px] font-bold text-accent-soft">
            AI
          </span>
          <span className="hidden flex-col items-start leading-none sm:flex">
            <span className="text-[12.5px] font-medium text-white">{PROFILE.nickname}</span>
            <span className="mono mt-0.5 text-[10.5px] text-prize">
              {formatNumber(PROFILE.balance)} KGS
            </span>
          </span>
          <ChevronDown size={14} strokeWidth={1.5} className="text-white/30" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="glass-strong z-[60] w-60 overflow-hidden rounded-[14px] border border-white/[0.1] p-1.5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
        >
          <div className="flex items-center gap-3 px-3 py-3">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-accent/15 font-display text-[13px] font-bold text-accent-soft">
              AI
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-white">{PROFILE.nickname}</p>
              <p className="truncate text-[11.5px] text-white/35">{PROFILE.team}</p>
            </div>
          </div>

          <div className="mx-1.5 mb-1.5 flex items-center justify-between rounded-[10px] border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
            <span className="inline-flex items-center gap-2 text-[12px] text-white/45">
              <Wallet size={13} strokeWidth={1.5} />
              Баланс
            </span>
            <span className="mono text-[12.5px] font-medium text-prize">
              {formatNumber(PROFILE.balance)} KGS
            </span>
          </div>

          {[
            { label: "Профиль", icon: UserRound, href: "/profile" },
            { label: "Мои команды", icon: Users, href: "/teams" },
            { label: "Мои заявки", icon: Receipt, href: "/profile" },
            { label: "Настройки", icon: Settings, href: "/profile" },
          ].map((item) => (
            <DropdownMenu.Item key={item.label} asChild>
              <Link
                href={item.href}
                className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2 text-[13px] text-white/60 outline-none transition-colors data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-white"
              >
                <item.icon size={14} strokeWidth={1.5} />
                {item.label}
              </Link>
            </DropdownMenu.Item>
          ))}

          <div className="my-1.5 h-px bg-white/[0.07]" />

          <DropdownMenu.Item className="flex cursor-pointer items-center gap-2.5 rounded-[9px] px-3 py-2 text-[13px] text-white/50 outline-none transition-colors data-[highlighted]:bg-accent/10 data-[highlighted]:text-accent-soft">
            <LogOut size={14} strokeWidth={1.5} />
            Выйти
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-colors duration-300",
        scrolled ? "glass-strong border-white/[0.07]" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="MAJOR KG — на главную" className="shrink-0">
          <Logo />
        </Link>

        <OnlineBadge className="hidden xl:inline-flex" />

        <nav className="ml-auto hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-[9px] px-3.5 py-2 text-[13.5px] font-medium transition-colors duration-200",
                  active ? "text-white" : "text-white/50 hover:text-white",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3.5 -bottom-[1px] h-[2px] rounded-full bg-accent" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 lg:ml-0">
          <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild>
            <Link href="/teams">
              <Plus strokeWidth={1.5} />
              Создать команду
            </Link>
          </Button>
          <ProfileMenu />
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={open}
            className="flex size-10 items-center justify-center rounded-[10px] border border-white/[0.08] text-white/60 transition-colors hover:text-white lg:hidden"
          >
            {open ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="glass-strong border-t border-white/[0.07] lg:hidden">
          <div className="flex flex-col gap-1 px-5 py-4">
            <OnlineBadge className="mb-2 self-start" />
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[10px] px-3 py-3 text-[15px] font-medium text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <Button variant="primary" size="lg" className="mt-2" asChild>
              <Link href="/teams">
                <Plus strokeWidth={1.5} />
                Создать команду
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
