import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { TournamentGrid } from "@/components/marketing/tournament-grid"
import { JsonLd } from "@/components/seo/json-ld"
import { TOURNAMENTS } from "@/lib/data/tournaments"
import { breadcrumbLd, tournamentListLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Онлайн турниры по CS2 — расписание и регистрация",
  description:
    "Календарь онлайн турниров Кыргызстана: CS2, Valorant и другие дисциплины. Фильтр по статусу и игре, призовой фонд, свободные слоты и регистрация команды за два клика.",
  alternates: { canonical: "/tournaments" },
  openGraph: {
    title: "Онлайн турниры по CS2 в Кыргызстане — MAJOR KG",
    description: "Календарь турниров, призовые фонды и свободные слоты. Регистрация команды за два клика.",
    url: "/tournaments",
  },
}

export default function TournamentsPage() {
  const open = TOURNAMENTS.filter((item) => item.status !== "finished").length

  return (
    <>
      <JsonLd
        data={[
          tournamentListLd(),
          breadcrumbLd([
            { name: "Главная", path: "/" },
            { name: "Турниры", path: "/tournaments" },
          ]),
        ]}
      />
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "Турниры" }]}
        title="Турниры"
        description={`Открытых турниров сейчас: ${open}. Участие бесплатное, сетка формируется автоматически после закрытия слотов.`}
      />
      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
        <TournamentGrid />
      </section>
    </>
  )
}
