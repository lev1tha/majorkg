import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/layout/page-header"
import { MixLobby } from "@/components/mix/mix-lobby"
import { JsonLd } from "@/components/seo/json-ld"
import { getLineups, getParticipants, getTournament, getViewer } from "@/lib/api"
import { breadcrumbLd, tournamentLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "MIX-турнир по CS2 — заявка без команды",
  description:
    "MIX ARENA: заявка соло, без команды. За 20 минут до старта жеребьевка раскладывает игроков по рейтинговым поясам FACEIT и собирает равные составы, которые сразу попадают в верхнюю сетку.",
  alternates: { canonical: "/mix" },
  openGraph: {
    title: "MIX-турнир по CS2 — заявка без команды | MAJOR KG",
    description: "Заходите один — состав соберет жеребьевка за 20 минут до старта.",
    url: "/mix",
  },
}

const MIX_SLUG = "mix-arena"

export default async function MixPage() {
  const tournament = await getTournament(MIX_SLUG)
  if (!tournament) notFound()

  const [participants, lineups, viewer] = await Promise.all([
    getParticipants(MIX_SLUG),
    getLineups(MIX_SLUG),
    getViewer(),
  ])

  return (
    <>
      <JsonLd
        data={[
          tournamentLd(tournament),
          breadcrumbLd([
            { name: "Главная", path: "/" },
            { name: "MIX", path: "/mix" },
          ]),
        ]}
      />
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "MIX ARENA" }]}
        title={tournament.title}
        description={tournament.summary}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" size="md">
              Заявка без команды
            </Badge>
            <Badge variant="outline" size="md">
              {tournament.ruleset}
            </Badge>
          </div>
        }
      />
      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
        <MixLobby
          tournament={tournament}
          participants={participants}
          lineups={lineups}
          viewer={viewer}
        />
      </section>
    </>
  )
}
