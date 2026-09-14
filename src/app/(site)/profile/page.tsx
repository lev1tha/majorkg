import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { Gamepad2, LogOut } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { FaceitLevel } from "@/components/player/faceit-level"
import { PLAYERS } from "@/lib/data/players"
import { SESSION_COOKIE, fetchSteamProfile, readSession } from "@/lib/steam"
import { formatNumber } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Профиль",
  robots: { index: false, follow: false },
}

export default async function ProfilePage() {
  const store = await cookies()
  const session = readSession(store.get(SESSION_COOKIE)?.value)
  const steam = session ? await fetchSteamProfile(session.steamId) : null
  const demo = PLAYERS[0]

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "Профиль" }]}
        title="Профиль"
        description={
          session
            ? "Steam подключен. FACEIT-данные обновляются автоматически."
            : "Войдите через Steam, чтобы привязать FACEIT-рейтинг и подавать заявки от своего аккаунта."
        }
        action={
          session ? (
            <form action="/api/auth/logout" method="post">
              <Button variant="outline" size="md" type="submit">
                <LogOut strokeWidth={1.5} />
                Выйти
              </Button>
            </form>
          ) : (
            <Button variant="primary" size="md" asChild>
              <a href="/api/auth/steam" rel="nofollow">
                <Gamepad2 strokeWidth={1.5} />
                Войти через Steam
              </a>
            </Button>
          )
        }
      />

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
        <div className="glass max-w-2xl rounded-xl p-6">
          <div className="flex items-center gap-4">
            <FaceitLevel elo={demo.elo} size="lg" />
            <div className="min-w-0">
              <p className="font-display text-[18px] font-bold text-white">
                {steam?.nickname ?? demo.nickname}
              </p>
              <p className="mono text-[12.5px] text-white/40">
                {session ? session.steamId : "Steam не подключен"}
              </p>
            </div>
            <Badge variant={session ? "success" : "outline"} size="sm" className="ml-auto">
              {session ? "Подключен" : "Гостевой режим"}
            </Badge>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/[0.07] pt-5 sm:grid-cols-4">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">ELO</dt>
              <dd className="mono mt-1 text-[16px] text-white">{formatNumber(demo.elo)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
                Команда
              </dt>
              <dd className="mt-1 text-[14px] text-white">{demo.team ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">Роль</dt>
              <dd className="mt-1 text-[14px] text-white">{demo.role}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
                Карты
              </dt>
              <dd className="mono mt-1 text-[16px] text-white">{formatNumber(demo.matches)}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2.5 border-t border-white/[0.07] pt-5">
            <Button variant="outline" size="md" asChild>
              <Link href={`/players/${demo.nickname}`}>Публичный профиль</Link>
            </Button>
            <Button variant="ghost" size="md" asChild>
              <Link href="/teams">Мои команды</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
