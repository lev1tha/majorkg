import Link from "next/link"
import { Gavel, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminPageTitle } from "@/components/admin/admin-shell"
import { MetricCard } from "@/components/admin/metric-card"
import { RegistrationQueue } from "@/components/admin/registration-queue"
import { getAdminOverview, getAppeals, getMatches, getPendingRegistrations } from "@/lib/api"
import { cn, formatNumber, plural } from "@/lib/utils"

const SEVERITY = {
  high: { label: "Высокий", variant: "live" as const },
  medium: { label: "Средний", variant: "prize" as const },
  low: { label: "Низкий", variant: "outline" as const },
}

export default async function AdminDashboard() {
  const [overview, pending, appeals, matches] = await Promise.all([
    getAdminOverview(),
    getPendingRegistrations(),
    getAppeals("open"),
    getMatches({ limit: 30 }),
  ])

  const liveMatches = matches.filter((match) => match.state !== "done")

  const tiles = [
    {
      id: "tournaments",
      label: "Активные турниры",
      value: formatNumber(overview?.activeTournaments ?? 0),
      delta: 0,
      deltaLabel: "в регистрации, check-in и эфире",
    },
    {
      id: "players",
      label: "Игроков заявлено",
      value: formatNumber(overview?.registeredPlayers ?? 0),
      delta: overview?.pendingRegistrations ?? 0,
      deltaLabel: "ждут модерации",
    },
    {
      id: "matches",
      label: "Матчей сыграно",
      value: formatNumber(overview?.matchesTotal ?? 0),
      delta: liveMatches.length,
      deltaLabel: "идут прямо сейчас",
    },
    {
      id: "fees",
      label: "Ожидаемые взносы",
      value: `${formatNumber(overview?.expectedFees ?? 0)} сом`,
      delta: 0,
      deltaLabel: "по подтвержденным заявкам",
    },
    {
      id: "appeals",
      label: "Открытые споры",
      value: formatNumber(overview?.openAppeals ?? 0),
      delta: appeals.length,
      deltaLabel: "ждут решения судьи",
    },
  ]

  return (
    <>
      <AdminPageTitle
        title="Обзор"
        description={`${liveMatches.length} ${plural(liveMatches.length, ["матч идет", "матча идут", "матчей идут"])} прямо сейчас · ${pending.length} ${plural(pending.length, ["заявка", "заявки", "заявок"])} в очереди`}
        action={
          <Button variant="primary" size="md" asChild>
            <Link href="/admin/tournaments/new">
              <Plus strokeWidth={1.5} />
              Создать турнир
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile) => (
          <MetricCard
            key={tile.id}
            label={tile.label}
            value={tile.value}
            delta={tile.delta}
            deltaLabel={tile.deltaLabel}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Очередь индивидуальных заявок */}
        <RegistrationQueue items={pending} />

        {/* Апелляции */}
        <section className="panel overflow-hidden rounded-xl">
          <header className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-white">
              <Gavel size={15} strokeWidth={1.5} className="text-white/40" />
              Апелляции
            </h2>
            <Link
              href="/admin/appeals"
              className="text-[12px] text-white/40 transition-colors hover:text-white"
            >
              Все
            </Link>
          </header>

          {appeals.length === 0 ? (
            <p className="px-5 py-12 text-center text-[13px] text-white/25">Открытых споров нет</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {appeals.map((appeal) => {
                const severity = SEVERITY[appeal.severity]
                return (
                  <li key={appeal.id} className="flex flex-col gap-2 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="mono text-[11.5px] text-white/35">APL-{appeal.id}</span>
                      <Badge variant={severity.variant} size="sm">
                        {severity.label}
                      </Badge>
                    </div>
                    <p className="text-[13px] font-medium text-white">{appeal.match}</p>
                    <p className="text-[12px] leading-relaxed text-white/40">{appeal.reason}</p>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="mono text-[11.5px] text-white/25">
                        {appeal.claimant ?? "аноним"}
                      </span>
                      <Button variant="outline" size="xs" asChild>
                        <Link href="/admin/appeals">Разобрать</Link>
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Матчи в эфире */}
      <section className="panel mt-5 overflow-hidden rounded-xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-white">Матчи в эфире</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/matches">Управление матчами</Link>
          </Button>
        </header>
        {liveMatches.length === 0 ? (
          <p className="px-5 py-12 text-center text-[13px] text-white/25">Активных матчей нет</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {liveMatches.map((match) => (
              <li key={match.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                <span className="mono w-20 shrink-0 text-[11.5px] text-white/30">M-{match.id}</span>
                <span className="w-24 shrink-0 text-[12px] text-white/45">{match.roundName}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">
                  {match.a?.name ?? "TBD"} — {match.b?.name ?? "TBD"}
                </span>
                <span className="mono shrink-0 text-[13px] text-white">
                  {match.a?.score ?? "–"} : {match.b?.score ?? "–"}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[12px]",
                    match.state === "live"
                      ? "text-accent"
                      : match.state === "review"
                        ? "text-prize"
                        : "text-white/30",
                  )}
                >
                  {match.note || match.state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
