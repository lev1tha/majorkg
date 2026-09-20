"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Gavel,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Plus,
  ServerCog,
  Settings,
  Shuffle,
  Swords,
  Trophy,
  Users,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/layout/logo"
import { adminLogout } from "@/lib/api-client"
import type { AdminDto } from "@/lib/types"
import { cn, initials } from "@/lib/utils"

const NAV = [
  { label: "Обзор", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Турниры", href: "/admin/tournaments", icon: Trophy },
  { label: "Сетка", href: "/admin/bracket", icon: Network },
  { label: "Матчи", href: "/admin/matches", icon: Swords },
  { label: "Жеребьевка", href: "/admin/mix", icon: Shuffle },
  { label: "Серверы", href: "/admin/servers", icon: ServerCog },
  { label: "Апелляции", href: "/admin/appeals", icon: Gavel },
  { label: "Игроки", href: "/admin/players", icon: Users },
  { label: "FAQ", href: "/admin/faq", icon: HelpCircle },
  { label: "Учетка", href: "/admin/settings", icon: Settings },
]

export function AdminShell({ admin, children }: { admin: AdminDto; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)

  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  const signOut = async () => {
    setLeaving(true)
    try {
      await adminLogout()
      router.refresh()
    } finally {
      setLeaving(false)
    }
  }

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[13.5px] font-medium transition-colors",
              active
                ? "bg-white/[0.07] text-white"
                : "text-white/45 hover:bg-white/[0.04] hover:text-white/85",
            )}
          >
            <item.icon size={16} strokeWidth={1.5} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-dvh bg-base">
      {/* Боковая панель */}
      <aside className="hidden w-[228px] shrink-0 flex-col border-r border-white/[0.07] bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.07] px-5">
          <LogoMark className="size-7 rounded-[8px] text-[12px]" />
          <span className="font-display text-[13px] font-extrabold tracking-[-0.02em] text-white">
            MAJOR
            <span className="ml-1.5 text-[9.5px] font-bold tracking-[0.2em] text-white/35">ADMIN</span>
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-6 p-3">
          {nav}
          <div className="mt-auto flex flex-col gap-2 border-t border-white/[0.07] pt-3">
            <Button variant="primary" size="sm" asChild>
              <Link href="/admin/tournaments/new">
                <Plus strokeWidth={1.5} />
                Новый турнир
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft strokeWidth={1.5} />
                На сайт
              </Link>
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Верхняя панель */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-white/[0.07] bg-surface/90 px-5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Меню"
            className="flex size-9 items-center justify-center rounded-[9px] border border-white/[0.08] text-white/60 lg:hidden"
          >
            {open ? <X size={17} strokeWidth={1.5} /> : <Menu size={17} strokeWidth={1.5} />}
          </button>

          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-2.5 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5">
              <span className="flex size-6 items-center justify-center rounded-[7px] bg-accent/15 font-display text-[10px] font-bold text-accent-soft">
                {initials(admin.name || admin.login)}
              </span>
              <span className="hidden flex-col items-start leading-none sm:flex">
                <span className="text-[12.5px] text-white/80">{admin.name}</span>
                <span className="mono mt-0.5 text-[10.5px] text-white/35">{admin.login}</span>
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Выйти из админки"
              onClick={() => void signOut()}
              disabled={leaving}
            >
              <LogOut strokeWidth={1.5} />
            </Button>
          </div>
        </header>

        {open && (
          <div className="border-b border-white/[0.07] bg-surface p-3 lg:hidden">{nav}</div>
        )}

        <main className="min-w-0 flex-1 p-5 sm:p-7">{children}</main>
      </div>
    </div>
  )
}

export function AdminPageTitle({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-white">
          {title}
        </h1>
        {description ? <p className="text-[13px] text-white/40">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
