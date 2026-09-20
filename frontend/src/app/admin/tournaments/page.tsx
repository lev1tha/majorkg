import Link from "next/link"
import { Pencil, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminPageTitle } from "@/components/admin/admin-shell"
import { TournamentActions } from "@/components/admin/tournament-actions"
import { StatusBadge } from "@/components/marketing/tournament-card"
import { getAdminTournaments } from "@/lib/api"
import { formatDateTime } from "@/lib/utils"

export default async function AdminTournamentsPage() {
  const { items, total } = await getAdminTournaments()

  return (
    <>
      <AdminPageTitle
        title="Турниры"
        description={`${total} турниров в системе. Все — по CS2, сетка верхняя.`}
        action={
          <Button variant="primary" size="md" asChild>
            <Link href="/admin/tournaments/new">
              <Plus strokeWidth={1.5} />
              Создать турнир
            </Link>
          </Button>
        }
      />

      <div className="panel overflow-hidden rounded-xl">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_130px_170px_220px] items-center gap-4 border-b border-white/[0.07] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/30 xl:grid">
          <span>Название</span>
          <span>Формат</span>
          <span>Слоты</span>
          <span>Статус</span>
          <span>Старт</span>
          <span className="text-right">Жеребьевка и сетка</span>
        </div>

        <ul className="divide-y divide-white/[0.05]">
          {items.map((row) => (
            <li
              key={row.slug}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02] xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_130px_170px_220px]"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/tournaments/${row.slug}`}
                  className="truncate text-[13.5px] font-medium text-white transition-colors hover:text-accent-soft"
                >
                  {row.title}
                </Link>
                <p className="truncate text-[11.5px] text-white/30">{row.edition}</p>
              </div>

              <span className="hidden truncate text-[12.5px] text-white/45 xl:block">
                CS2 · {row.teamSizeLabel} · {row.ruleset}
              </span>
              <span className="mono hidden text-[12.5px] text-white/70 xl:block">
                {row.registered} / {row.slots}
              </span>
              <span className="hidden xl:block">
                <StatusBadge status={row.status} />
              </span>
              <span className="mono hidden text-[11.5px] text-white/40 xl:block">
                {formatDateTime(row.startsAt)}
              </span>

              <div className="flex shrink-0 items-center justify-end gap-2">
                <TournamentActions slug={row.slug} status={row.status} />
                <Button variant="ghost" size="xs" asChild>
                  <Link href={`/admin/tournaments/${row.slug}`}>
                    <Pencil strokeWidth={1.5} />
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <p className="py-14 text-center text-[13px] text-white/25">
            Турниров пока нет.{" "}
            <Link href="/admin/tournaments/new" className="text-accent-soft hover:underline">
              Создать первый
            </Link>
          </p>
        )}
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-white/30">
        <Badge variant="outline" size="sm" className="mr-2">
          Порядок
        </Badge>
        Сначала жеребьевка собирает составы из подтвержденных заявок, затем строится верхняя сетка.
        Повторная жеребьевка стирает текущую сетку — постройте ее заново.
      </p>
    </>
  )
}
