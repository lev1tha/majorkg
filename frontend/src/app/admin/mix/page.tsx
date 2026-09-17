import { notFound } from "next/navigation"

import { AdminPageTitle } from "@/components/admin/admin-shell"
import { MixLobby } from "@/components/mix/mix-lobby"
import { getLineups, getParticipants, getTournament, getViewer } from "@/lib/api"

const MIX_SLUG = "mix-arena"

export default async function AdminMixPage() {
  const tournament = await getTournament(MIX_SLUG)
  if (!tournament) notFound()

  const [participants, lineups, viewer] = await Promise.all([
    getParticipants(MIX_SLUG),
    getLineups(MIX_SLUG),
    getViewer(),
  ])

  return (
    <>
      <AdminPageTitle
        title="Жеребьевка составов"
        description="Ручной запуск жеребьевки и пересбор составов до построения сетки. Подбор детерминирован: один seed — один расклад."
      />
      <MixLobby
        tournament={tournament}
        participants={participants}
        lineups={lineups}
        viewer={viewer}
        admin
      />
    </>
  )
}
