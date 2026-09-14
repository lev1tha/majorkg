import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/layout/page-header"
import { MixLobby } from "@/components/mix/mix-lobby"
import { JsonLd } from "@/components/seo/json-ld"
import { getTournament } from "@/lib/data/tournaments"
import { breadcrumbLd, tournamentLd } from "@/lib/seo"
import { formatNumber } from "@/lib/utils"

export const metadata: Metadata = {
  title: "MIX-турнир по CS2 — заявка без команды",
  description:
    "MIX ARENA: заявка соло, без команды. За 20 минут до старта жеребьевка раскладывает игроков по рейтинговым поясам FACEIT и собирает равные составы, которые сразу попадают в сетку.",
  alternates: { canonical: "/mix" },
  openGraph: {
    title: "MIX-турнир по CS2 — заявка без команды | MAJOR KG",
    description: "Заходите один — состав соберет жеребьевка за 20 минут до старта.",
    url: "/mix",
  },
}

export default function MixPage() {
  const tournament = getTournament("mix-arena")
  if (!tournament) notFound()

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
            <Badge variant="prize" size="md">
              {formatNumber(tournament.prizePool)} {tournament.currency}
            </Badge>
            <Badge variant="outline" size="md">
              {tournament.ruleset}
            </Badge>
          </div>
        }
      />
      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
        <MixLobby tournament={tournament} />
      </section>
    </>
  )
}
