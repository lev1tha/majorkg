import Link from "next/link"
import { Pencil, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminPageTitle } from "@/components/admin/admin-shell"
import { ADMIN_TOURNAMENTS } from "@/lib/data/admin"

const STATUS = {
  draft: { label: "Черновик", variant: "outline" as const },
  registration: { label: "Регистрация", variant: "success" as const },
  live: { label: "Идет", variant: "live" as const },
  finished: { label: "Завершен", variant: "default" as const },
}

export default function AdminTournamentsPage() {
  return (
    <>
      <AdminPageTitle
        title="Турниры"
        description={`${ADMIN_TOURNAMENTS.length} турниров в системе`}
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
        <div className="hidden grid-cols-[80px_minmax(0,1.4fr)_120px_minmax(0,1fr)_110px_120px_140px_44px] items-center gap-4 border-b border-white/[0.07] px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/30 xl:grid">
          <span>ID</span>
          <span>Название</span>
          <span>Игра</span>
          <span>Формат</span>
          <span>Слоты</span>
          <span>Статус</span>
          <span className="text-right">Призовой</span>
          <span />
        </div>

        <ul className="divide-y divide-white/[0.05]">
          {ADMIN_TOURNAMENTS.map((row) => {
            const status = STATUS[row.status]
            return (
              <li
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02] xl:grid-cols-[80px_minmax(0,1.4fr)_120px_minmax(0,1fr)_110px_120px_140px_44px]"
              >
                <span className="mono hidden text-[12px] text-white/30 xl:block">{row.id}</span>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-white">{row.title}</p>
                  <p className="truncate text-[11.5px] text-white/30 xl:hidden">
                    {row.game} · {row.slots} · {row.prize}
                  </p>
                  <p className="mono hidden text-[11.5px] text-white/30 xl:block">{row.starts}</p>
                </div>
                <span className="hidden text-[12.5px] text-white/55 xl:block">{row.game}</span>
                <span className="hidden truncate text-[12.5px] text-white/45 xl:block">
                  {row.format}
                </span>
                <span className="mono hidden text-[12.5px] text-white/70 xl:block">{row.slots}</span>
                <span className="hidden xl:block">
                  <Badge variant={status.variant} size="sm">
                    {status.label}
                  </Badge>
                </span>
                <span className="mono hidden text-right text-[12.5px] text-prize xl:block">
                  {row.prize}
                </span>
                <Button variant="ghost" size="icon-sm" aria-label="Редактировать">
                  <Pencil strokeWidth={1.5} />
                </Button>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
