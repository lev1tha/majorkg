import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SectionHeading } from "@/components/ui/misc"
import { CtaSection } from "@/components/marketing/cta-section"
import { Hero } from "@/components/marketing/hero"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { LeaderboardSection } from "@/components/marketing/leaderboard-section"
import { TournamentGrid } from "@/components/marketing/tournament-grid"
import { JsonLd } from "@/components/seo/json-ld"
import { getFaq, getFeaturedTournament, getTournaments } from "@/lib/api"
import { SITE, breadcrumbLd, faqLd, tournamentListLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: SITE.title,
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE.title,
    description: SITE.description,
    url: "/",
    type: "website",
  },
}

export default async function HomePage() {
  const [featured, { items }, faq] = await Promise.all([
    getFeaturedTournament(),
    getTournaments({ limit: 12 }),
    getFaq(),
  ])

  return (
    <>
      <JsonLd data={[tournamentListLd(items), faqLd(faq), breadcrumbLd([{ name: "Главная", path: "/" }])]} />

      {featured && <Hero tournament={featured} />}

      <section id="tournaments" className="scroll-mt-24 py-14">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <SectionHeading
            overline="Календарь"
            title="Ближайшие турниры"
            description="Заявка индивидуальная: команда не нужна. Выбирайте турнир, оплачивайте взнос — состав соберет жеребьевка."
            action={
              <Button variant="outline" size="md" asChild>
                <Link href="/tournaments">
                  Все турниры
                  <ArrowRight strokeWidth={1.5} />
                </Link>
              </Button>
            }
            className="mb-8"
          />
          <TournamentGrid source={items} limit={6} showFilters={false} showSearch={false} />
        </div>
      </section>

      <HowItWorks />

      <LeaderboardSection compact />

      <CtaSection tournament={featured} />
    </>
  )
}
