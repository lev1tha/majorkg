import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AdminPageTitle } from "@/components/admin/admin-shell"
import { RegistrationTable } from "@/components/admin/registration-table"
import { TournamentEditor, TournamentSummary } from "@/components/admin/tournament-editor"
import { StatusBadge } from "@/components/marketing/tournament-card"
import { getAdminRegistrations, getAdminTournament } from "@/lib/api"
import { formatDateTime } from "@/lib/utils"

export default async function AdminTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const tournament = await getAdminTournament(slug)
  if (!tournament) notFound()

  const registrations = await getAdminRegistrations(slug)

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-[12.5px] text-white/35">
        <Link
          href="/admin/tournaments"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          Все турниры
        </Link>
      </div>

      <AdminPageTitle
        title={tournament.title}
        description={`${tournament.edition || "CS2"} · старт ${formatDateTime(tournament.startsAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge status={tournament.status} />
            <Button variant="outline" size="md" asChild>
              <Link href={`/tournaments/${tournament.slug}`} target="_blank">
                Открыть на сайте
                <ExternalLink strokeWidth={1.5} />
              </Link>
            </Button>
          </div>
        }
      />

      <TournamentSummary tournament={tournament} />

      <section className="mb-5 flex flex-col gap-4">
        <h2 className="font-display text-[17px] font-bold text-white">
          Заявки
          <span className="mono ml-2 text-[13px] font-normal text-white/30">
            {registrations.length}
          </span>
        </h2>
        <RegistrationTable slug={tournament.slug} items={registrations} />
      </section>

      <TournamentEditor tournament={tournament} />
    </>
  )
}
