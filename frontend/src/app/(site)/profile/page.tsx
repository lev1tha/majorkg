import type { Metadata } from "next"
import Link from "next/link"
import { Gamepad2, LogOut } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { FaceitLevel } from "@/components/player/faceit-level"
import { PlayerAvatar } from "@/components/player/avatar"
import { FaceitSync } from "@/components/player/faceit-sync"
import { getPlayer, getViewer, getViewerRegistrations } from "@/lib/api"
import { formatDateTime, formatNumber } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Профиль",
  robots: { index: false, follow: false },
}

const REGISTRATION_LABEL: Record<string, string> = {
  pending: "На модерации",
  confirmed: "Подтверждена",
  checked_in: "Check-in пройден",
  rejected: "Отклонена",
  withdrawn: "Снята",
}

export default async function ProfilePage() {
  const viewer = await getViewer()
  const [player, registrations] = await Promise.all([
    viewer ? getPlayer(viewer.nickname) : Promise.resolve(null),
    viewer ? getViewerRegistrations() : Promise.resolve([]),
  ])

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "Профиль" }]}
        title="Профиль"
        description={
          viewer
            ? "Steam подключен. FACEIT-рейтинг обновляется автоматически."
            : "Войдите через Steam, чтобы подавать заявки от своего аккаунта и вести скаут-заметки."
        }
        action={
          viewer ? (
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

      <section className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-12 sm:px-8">
        <div className="glass max-w-2xl rounded-xl p-6">
          <div className="flex items-center gap-4">
            {viewer ? (
              <PlayerAvatar nickname={viewer.nickname} avatar={viewer.avatar} size="lg" />
            ) : (
              <FaceitLevel elo={1000} size="lg" />
            )}
            <div className="min-w-0">
              <p className="font-display text-[18px] font-bold text-white">
                {viewer?.nickname ?? "Гость"}
              </p>
              <p className="mono text-[12.5px] text-white/40">
                {viewer ? viewer.steamId : "Steam не подключен"}
              </p>
            </div>
            <Badge variant={viewer ? "success" : "outline"} size="sm" className="ml-auto">
              {viewer ? "Подключен" : "Гостевой режим"}
            </Badge>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/[0.07] pt-5 sm:grid-cols-4">
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">ELO</dt>
              <dd className="mono mt-1 text-[16px] text-white">
                {formatNumber(viewer?.elo ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
                Уровень
              </dt>
              <dd className="mono mt-1 text-[16px] text-white">{viewer?.level ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
                Очки сезона
              </dt>
              <dd className="mono mt-1 text-[16px] text-prize">
                {player ? formatNumber(player.points) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/30">
                Карты
              </dt>
              <dd className="mono mt-1 text-[16px] text-white">
                {player ? formatNumber(player.mapsPlayed) : "—"}
              </dd>
            </div>
          </dl>

          {viewer && (
            <div className="mt-6 flex flex-wrap gap-2.5 border-t border-white/[0.07] pt-5">
              <Button variant="outline" size="md" asChild>
                <Link href={`/players/${viewer.nickname}`}>Публичный профиль</Link>
              </Button>
            </div>
          )}
        </div>

        {viewer && player && (
          <div className="max-w-2xl">
            <FaceitSync player={player} steamSynced={viewer.steamSynced} />
          </div>
        )}

        {viewer && (
          <section id="registrations" className="flex max-w-3xl scroll-mt-24 flex-col gap-4">
            <h2 className="font-display text-[18px] font-bold text-white">Мои заявки</h2>
            {registrations.length === 0 ? (
              <div className="glass rounded-xl py-12 text-center text-[13px] text-white/30">
                Заявок пока нет.{" "}
                <Link href="/tournaments" className="text-accent-soft hover:underline">
                  Выбрать турнир
                </Link>
              </div>
            ) : (
              <ul className="glass divide-y divide-white/[0.05] overflow-hidden rounded-xl">
                {registrations.map((item) => (
                  <li key={item.slug} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <Link
                      href={`/tournaments/${item.slug}`}
                      className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-white transition-colors hover:text-accent-soft"
                    >
                      {item.title}
                    </Link>
                    <span className="mono shrink-0 text-[11.5px] text-white/30">
                      {formatDateTime(item.starts_at)}
                    </span>
                    <Badge
                      variant={
                        item.status === "checked_in" || item.status === "confirmed"
                          ? "success"
                          : item.status === "pending"
                            ? "prize"
                            : "outline"
                      }
                      size="sm"
                    >
                      {REGISTRATION_LABEL[item.status] ?? item.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </section>
    </>
  )
}
