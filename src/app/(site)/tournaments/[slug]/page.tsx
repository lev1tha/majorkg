import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MessagesSquare, Trophy, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { JoinButton } from "@/components/join/join-button"
import { Countdown } from "@/components/tournament/countdown"
import { TournamentTabs } from "@/components/tournament/tournament-tabs"
import { StatusBadge } from "@/components/marketing/tournament-card"
import { JsonLd } from "@/components/seo/json-ld"
import { GAMES } from "@/lib/data/games"
import { BRACKET_LABEL, TOURNAMENTS, getTournament } from "@/lib/data/tournaments"
import { EXTERNAL, LINKS } from "@/lib/links"
import { breadcrumbLd, tournamentLd } from "@/lib/seo"
import { formatNumber, pct } from "@/lib/utils"

export function generateStaticParams() {
  return TOURNAMENTS.map((tournament) => ({ slug: tournament.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tournament = getTournament(slug)
  if (!tournament) return { title: "Турнир не найден" }

  const game = GAMES[tournament.game].name
  const title = `${tournament.title} — турнир по ${game}, призовой ${formatNumber(tournament.prizePool)} ${tournament.currency}`
  const description = `${tournament.summary} Формат ${tournament.teamSize}, ${BRACKET_LABEL[tournament.bracket]}. Старт ${tournament.startLabel}. Свободных слотов: ${Math.max(0, tournament.slots - tournament.registered)}. Регистрация бесплатная.`

  return {
    title,
    description,
    alternates: { canonical: `/tournaments/${tournament.slug}` },
    openGraph: {
      title,
      description,
      url: `/tournaments/${tournament.slug}`,
      type: "website",
    },
  }
}

export default async function TournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tournament = getTournament(slug)
  if (!tournament) notFound()

  const game = GAMES[tournament.game]
  const GameIcon = game.icon
  const filled = pct(tournament.registered, tournament.slots)
  const left = Math.max(0, tournament.slots - tournament.registered)
  const registrationMinutes = Math.max(0, tournament.startsInMinutes - 30)

  return (
    <>
      <JsonLd
        data={[
          tournamentLd(tournament),
          breadcrumbLd([
            { name: "Главная", path: "/" },
            { name: "Турниры", path: "/tournaments" },
            { name: tournament.title, path: `/tournaments/${tournament.slug}` },
          ]),
        ]}
      />

      {/* Шапка турнира */}
      <div className="relative overflow-hidden border-b border-white/[0.07]">
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(115deg,#11131a,#0a0b10)]" />
          <div
            className="absolute -right-[6%] -top-[45%] size-[560px] rounded-full opacity-60 blur-[110px]"
            style={{ background: "radial-gradient(circle, rgba(255,70,85,0.14), transparent 65%)" }}
          />
          <div className="mesh absolute inset-0" />
        </div>

        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={tournament.status} />
                <Badge variant="outline" size="sm">
                  <GameIcon strokeWidth={1.5} />
                  {game.name}
                </Badge>
                <Badge variant="outline" size="sm">
                  {tournament.teamSize} · {BRACKET_LABEL[tournament.bracket]}
                </Badge>
                <Badge variant="outline" size="sm">
                  {tournament.tier}-tier
                </Badge>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-white/35">
                  {tournament.edition} · {tournament.region}
                </p>
                <h1 className="font-display text-[34px] font-extrabold leading-[1.02] tracking-[-0.035em] text-white sm:text-[50px]">
                  {tournament.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
                    Призовой фонд
                  </span>
                  <span className="inline-flex items-center gap-2 font-display text-[28px] font-extrabold leading-none tracking-[-0.03em] text-prize">
                    <Trophy size={20} strokeWidth={1.5} />
                    {formatNumber(tournament.prizePool)}
                    <span className="text-[15px] font-bold text-prize/60">{tournament.currency}</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
                    Старт
                  </span>
                  <time
                    dateTime={tournament.startDateISO}
                    className="font-display text-[17px] font-bold leading-none text-white"
                  >
                    {tournament.startLabel}
                  </time>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
                    Взнос
                  </span>
                  <span className="font-display text-[17px] font-bold leading-none text-success">
                    Бесплатно
                  </span>
                </div>
              </div>
            </div>

            <aside className="glass flex h-fit flex-col gap-5 rounded-xl p-6">
              <div className="flex flex-col gap-3">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
                  До конца регистрации
                </span>
                <Countdown minutes={registrationMinutes} size="md" expiredLabel="Регистрация закрыта" />
              </div>

              <div className="flex flex-col gap-2 border-t border-white/[0.07] pt-4">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="inline-flex items-center gap-2 text-white/45">
                    <Users size={13} strokeWidth={1.5} />
                    Команд
                  </span>
                  <span className="mono text-white">
                    {tournament.registered} / {tournament.slots}
                  </span>
                </div>
                <Progress value={filled} tone={filled >= 85 ? "accent" : "neutral"} size="md" />
                <p className="text-[12px] text-white/30">
                  {left > 0 ? `Свободно ${left} слота` : "Слоты закрыты"}
                </p>
              </div>

              <JoinButton
                tournament={tournament}
                variant="primary"
                size="xl"
                className="w-full"
                disabled={tournament.status === "finished"}
              >
                {tournament.status === "finished" ? "Турнир завершен" : "Зарегистрировать команду"}
              </JoinButton>

              <a
                href={LINKS.discord}
                {...EXTERNAL}
                className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-[12.5px] text-white/55 transition-colors hover:border-white/20 hover:text-white"
              >
                <MessagesSquare size={14} strokeWidth={1.5} />
                Discord турнира · чат матчей и судья
              </a>
            </aside>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8">
        <TournamentTabs tournament={tournament} />
      </section>
    </>
  )
}
