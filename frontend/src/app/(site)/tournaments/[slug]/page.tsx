import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Crosshair, Dices, MessagesSquare, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { JoinButton } from "@/components/join/join-button"
import { Countdown } from "@/components/tournament/countdown"
import { TournamentTabs } from "@/components/tournament/tournament-tabs"
import { StatusBadge } from "@/components/marketing/tournament-card"
import { JsonLd } from "@/components/seo/json-ld"
import { getBracket, getLineups, getParticipants, getTournament, getViewer } from "@/lib/api"
import { EXTERNAL, LINKS } from "@/lib/links"
import { breadcrumbLd, tournamentLd } from "@/lib/seo"
import { formatDateTime, formatNumber, pct, plural } from "@/lib/utils"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tournament = await getTournament(slug)
  if (!tournament) return { title: "Турнир не найден" }

  const title = `${tournament.title} — турнир по CS2 в Кыргызстане`
  const description = `${tournament.summary} Формат ${tournament.teamSizeLabel}, верхняя сетка. Старт ${formatDateTime(tournament.startsAt)}. Свободных слотов: ${Math.max(0, tournament.slots - tournament.registered)}. Регистрация индивидуальная, взнос ${tournament.entryFee} сом.`

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
  const tournament = await getTournament(slug)
  if (!tournament) notFound()

  const [participants, lineups, rounds, viewer] = await Promise.all([
    getParticipants(slug),
    getLineups(slug),
    getBracket(slug),
    getViewer(),
  ])

  const filled = pct(tournament.registered, tournament.slots)
  const left = Math.max(0, tournament.slots - tournament.registered)
  const registrationMinutes = Math.max(0, tournament.startsInMinutes - 30)
  const joined =
    tournament.viewerRegistration !== null &&
    ["pending", "confirmed", "checked_in"].includes(tournament.viewerRegistration)

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
                  <Crosshair strokeWidth={1.5} />
                  CS2
                </Badge>
                <Badge variant="outline" size="sm">
                  {tournament.teamSizeLabel} · верхняя сетка
                </Badge>
                <Badge variant="outline" size="sm">
                  {tournament.tier}-tier
                </Badge>
                <Badge variant="info" size="sm">
                  Без команды
                </Badge>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-white/35">
                  {tournament.edition}
                </p>
                <h1 className="font-display text-[34px] font-extrabold leading-[1] tracking-[-0.035em] text-white sm:text-[46px]">
                  {tournament.title}
                </h1>
              </div>

              <p className="max-w-2xl text-[14.5px] leading-relaxed text-white/50">
                {tournament.summary}
              </p>

              <dl className="flex flex-wrap gap-x-10 gap-y-5 pt-2">
                <div className="flex flex-col gap-1.5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                    Заявка
                  </dt>
                  <dd className="font-display text-[20px] font-bold leading-none tracking-[-0.02em] text-success">
                    Индивидуальная
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                    Взнос
                  </dt>
                  <dd className="font-display text-[20px] font-bold leading-none tracking-[-0.02em] text-prize">
                    {tournament.entryFee > 0
                      ? `${formatNumber(tournament.entryFee)} сом`
                      : "Бесплатно"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                    Старт
                  </dt>
                  <dd className="text-[15px] font-medium text-white">
                    <time dateTime={tournament.startsAt}>{formatDateTime(tournament.startsAt)}</time>
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                    Регион
                  </dt>
                  <dd className="text-[15px] font-medium text-white">{tournament.region}</dd>
                </div>
                <div className="flex flex-col gap-1.5">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                    Регламент
                  </dt>
                  <dd className="text-[15px] font-medium text-white">{tournament.ruleset}</dd>
                </div>
              </dl>
            </div>

            {/* Панель заявки */}
            <aside className="glass flex h-fit flex-col gap-6 rounded-xl p-6">
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/35">
                  {tournament.status === "live" ? "Турнир идет" : "До конца регистрации"}
                </span>
                <Countdown
                  minutes={registrationMinutes}
                  size="lg"
                  expiredLabel="Регистрация закрыта"
                />
              </div>

              <div className="flex flex-col gap-2.5 border-t border-white/[0.07] pt-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-[12.5px] text-white/45">
                    <Users size={13} strokeWidth={1.5} />
                    Игроков заявлено
                  </span>
                  <span className="mono text-[13px] font-medium text-white">
                    {tournament.registered} / {tournament.slots}
                  </span>
                </div>
                <Progress value={filled} tone={filled >= 85 ? "accent" : "neutral"} size="md" />
                <p className="text-[12px] text-white/30">
                  {left > 0
                    ? `Осталось ${left} ${plural(left, ["слот", "слота", "слотов"])}`
                    : "Слоты закрыты"}
                </p>
              </div>

              <p className="flex items-start gap-2.5 border-t border-white/[0.07] pt-5 text-[12.5px] leading-relaxed text-white/40">
                <Dices size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-white/30" />
                Составы соберет жеребьевка за {tournament.drawBeforeMinutes} минут до старта — по
                одному игроку из каждого рейтингового пояса.
              </p>

              <div className="flex flex-col gap-2.5 border-t border-white/[0.07] pt-5">
                <JoinButton
                  tournament={tournament}
                  variant="primary"
                  size="xl"
                  className="w-full"
                  disabled={tournament.status === "finished"}
                >
                  {tournament.status === "finished"
                    ? "Турнир завершен"
                    : joined
                      ? "Вы заявлены"
                      : "Участвовать"}
                </JoinButton>
                <a
                  href={LINKS.discord}
                  {...EXTERNAL}
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-white/[0.08] px-4 py-2.5 text-[13px] text-white/55 transition-colors hover:border-white/20 hover:text-white"
                >
                  <MessagesSquare size={14} strokeWidth={1.5} />
                  Чат турнира в Discord
                </a>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8">
        <TournamentTabs
          tournament={tournament}
          participants={participants}
          lineups={lineups}
          rounds={rounds}
          canWriteNotes={Boolean(viewer)}
        />
      </section>
    </>
  )
}
