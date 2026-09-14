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

export default function HomePage() {
  return (
    <>
      <JsonLd data={[tournamentListLd(), faqLd(), breadcrumbLd([{ name: "Главная", path: "/" }])]} />

      <Hero />

      <section id="tournaments" className="scroll-mt-24 py-14">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <SectionHeading
            overline="Календарь"
            title="Ближайшие турниры"
            description="Участие бесплатное. Выбирайте турнир и заявляйтесь — состав можно добрать до check-in."
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
          <TournamentGrid limit={6} showSearch={false} />
        </div>
      </section>

      <HowItWorks />

      <LeaderboardSection compact />

      <CtaSection />
    </>
  )
}
