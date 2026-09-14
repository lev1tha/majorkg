import Link from "next/link"
import { ArrowUpRight, Check, Gavel, Plus, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TeamMark } from "@/components/ui/misc"
import { AdminPageTitle } from "@/components/admin/admin-shell"
import { MetricCard } from "@/components/admin/metric-card"
import { APPEALS, MATCH_QUEUE, METRICS, REQUEST_FEED } from "@/lib/data/admin"
import { TOURNAMENTS } from "@/lib/data/tournaments"
import { cn, formatCompact, formatNumber, plural } from "@/lib/utils"

const SEVERITY = {
  high: { label: "Высокий", variant: "live" as const },
  medium: { label: "Средний", variant: "prize" as const },
  low: { label: "Низкий", variant: "outline" as const },
}

export default function AdminDashboard() {
  const activeTournaments = TOURNAMENTS.filter((item) => item.status !== "finished").length
  const totalPrize = TOURNAMENTS.reduce(
    (sum, item) => sum + (item.currency === "USD" ? item.prizePool * 89 : item.prizePool),
    0,
  )
  const liveMatches = MATCH_QUEUE.filter((match) => match.state === "live").length

  const tiles = [
    { ...METRICS[0], label: "Активные турниры", value: formatNumber(activeTournaments) },
    { ...METRICS[1], label: "Общий призовой фонд", value: formatCompact(totalPrize), suffix: "KGS" },
    { ...METRICS[2], label: "Команд в базе", value: formatNumber(METRICS[2].value) },
    {
      ...METRICS[3],
      label: "Открытые споры",
      value: formatNumber(APPEALS.length),
      delta: APPEALS.length,
      deltaLabel: "ждут решения судьи",
    },
  ]

  return (
    <>
      <AdminPageTitle
        title="Обзор"
        description={`${liveMatches} ${plural(liveMatches, ["матч идет", "матча идут", "матчей идут"])} прямо сейчас · ${REQUEST_FEED.length} ${plural(REQUEST_FEED.length, ["заявка", "заявки", "заявок"])} в очереди`}
        action={
          <Button variant="primary" size="md" asChild>
            <Link href="/admin/tournaments/new">
              <Plus strokeWidth={1.5} />
              Создать турнир
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <MetricCard
            key={tile.id}
            label={tile.label}
            value={tile.value}
            suffix={tile.suffix}
            delta={tile.delta}
            deltaLabel={tile.deltaLabel}
            series={tile.series}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Лента заявок */}
        <section className="panel overflow-hidden rounded-xl">
          <header className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <h2 className="font-display text-[15px] font-bold text-white">Очередь заявок</h2>
            <Badge variant="outline" size="sm">
              {REQUEST_FEED.length} в работе
            </Badge>
          </header>

          <ul className="divide-y divide-white/[0.05]">
            {REQUEST_FEED.map((request) => (
              <li key={request.id} className="flex items-center gap-4 px-5 py-3.5">
                <TeamMark tag={request.tag} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-[13.5px] font-medium text-white">
                    {request.team}
                    {request.priority === "high" && (
                      <span className="size-1.5 shrink-0 rounded-full bg-accent" />
                    )}
                  </p>
                  <p className="truncate text-[12px] text-white/35">
                    {request.detail} · {request.tournament}
                  </p>
                </div>
                <span className="mono hidden shrink-0 text-[11.5px] text-white/25 sm:block">
                  {request.age}
                </span>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="subtle" size="icon-sm" aria-label="Принять заявку">
                    <Check strokeWidth={1.5} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Отклонить заявку">
                    <X strokeWidth={1.5} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Апелляции */}
        <section className="panel overflow-hidden rounded-xl">
          <header className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-white">
              <Gavel size={15} strokeWidth={1.5} className="text-white/40" />
              Апелляции
            </h2>
            <Link
              href="/admin/matches"
              className="inline-flex items-center gap-1 text-[12px] text-white/40 transition-colors hover:text-white"
            >
              Все
              <ArrowUpRight size={12} strokeWidth={1.5} />
            </Link>
          </header>

          <ul className="divide-y divide-white/[0.05]">
            {APPEALS.map((appeal) => {
              const severity = SEVERITY[appeal.severity]
              return (
                <li key={appeal.id} className="flex flex-col gap-2 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="mono text-[11.5px] text-white/35">{appeal.id}</span>
                    <Badge variant={severity.variant} size="sm">
                      {severity.label}
                    </Badge>
                  </div>
                  <p className="text-[13px] font-medium text-white">{appeal.match}</p>
                  <p className="text-[12px] leading-relaxed text-white/40">{appeal.reason}</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="mono text-[11.5px] text-white/25">
                      {appeal.claimant} · {appeal.age}
                    </span>
                    <Button variant="outline" size="xs" asChild>
                      <Link href="/admin/matches">Разобрать</Link>
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
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
        <ul className="divide-y divide-white/[0.05]">
          {MATCH_QUEUE.filter((match) => match.state !== "done").map((match) => (
            <li key={match.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
              <span className="mono w-20 shrink-0 text-[11.5px] text-white/30">{match.id}</span>
              <span className="w-24 shrink-0 text-[12px] text-white/45">{match.round}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">
                {match.a} — {match.b}
              </span>
              <span className="mono shrink-0 text-[13px] text-white">
                {match.scoreA ?? "–"} : {match.scoreB ?? "–"}
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
                {match.time}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
