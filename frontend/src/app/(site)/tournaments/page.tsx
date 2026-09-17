import type { Metadata } from "next"

import { PageHeader } from "@/components/layout/page-header"
import { TournamentGrid } from "@/components/marketing/tournament-grid"
import { JsonLd } from "@/components/seo/json-ld"
import { getTournaments } from "@/lib/api"
import { breadcrumbLd, tournamentListLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Онлайн турниры по CS2 — расписание и регистрация",
  description:
    "Календарь онлайн турниров по CS2 в Кыргызстане. Фильтр по статусу, свободные слоты, организационный взнос и индивидуальная регистрация за два клика — команда не нужна.",
  alternates: { canonical: "/tournaments" },
  openGraph: {
    title: "Онлайн турниры по CS2 в Кыргызстане — MAJOR KG",
    description: "Календарь турниров и свободные слоты. Регистрация индивидуальная, за два клика.",
    url: "/tournaments",
  },
}

export default async function TournamentsPage() {
  const { items } = await getTournaments({ limit: 100 })
  const open = items.filter((item) => item.status !== "finished").length

  return (
    <>
      <JsonLd
        data={[
          tournamentListLd(items),
          breadcrumbLd([
            { name: "Главная", path: "/" },
            { name: "Турниры", path: "/tournaments" },
          ]),
        ]}
      />
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "Турниры" }]}
        title="Турниры"
        description={`Открытых турниров сейчас: ${open}. Заявка индивидуальная, сетка формируется автоматически после жеребьевки.`}
      />
      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
        <TournamentGrid source={items} />
      </section>
    </>
  )
}
