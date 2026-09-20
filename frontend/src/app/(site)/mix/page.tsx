import type { Metadata } from "next"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/layout/page-header"
import { MixLobby } from "@/components/mix/mix-lobby"
import { JsonLd } from "@/components/seo/json-ld"
import Link from "next/link"

import { getLineups, getParticipants, getTournaments, getViewer } from "@/lib/api"
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

/**
 * Ближайший турнир, а не фиксированный слаг.
 *
 * Все турниры платформы устроены как MIX: заявка индивидуальная, состав
 * собирает жеребьевка. Привязка к одному слагу означала 404 на базе, где
 * его нет, — теперь берется ближайший подходящий.
 */
export default async function MixPage() {
  const { items } = await getTournaments({ status: "open", limit: 20 })
  const tournament =
    items.find((item) => item.status === "checkin") ?? items[0] ?? null

  const [participants, lineups, viewer] = tournament
    ? await Promise.all([
        getParticipants(tournament.slug),
        getLineups(tournament.slug),
        getViewer(),
      ])
    : [[], [], null]

  if (!tournament) {
    return (
      <>
        <PageHeader
          crumbs={[{ label: "Главная", href: "/" }, { label: "MIX" }]}
          title="MIX"
          description="Заявка соло: жеребьевка соберет состав по рейтинговым поясам FACEIT."
        />
        <section className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8">
          <p className="glass rounded-xl py-16 text-center text-[13px] text-white/30">
            Открытых турниров сейчас нет. Загляните в{" "}
            <Link href="/tournaments" className="text-accent-soft hover:underline">
              календарь
            </Link>
            .
          </p>
        </section>
      </>
    )
  }

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
