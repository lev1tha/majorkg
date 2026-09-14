import { notFound } from "next/navigation"

import { AdminPageTitle } from "@/components/admin/admin-shell"
import { MixLobby } from "@/components/mix/mix-lobby"
import { getTournament } from "@/lib/data/tournaments"

export default function AdminMixPage() {
  const tournament = getTournament("mix-arena")
  if (!tournament) notFound()

  return (
    <>
      <AdminPageTitle
        title="MIX-жеребьевка"
        description="Запуск жеребьевки вручную, пересбор составов и обмен игроками между командами до старта сетки."
      />
      <MixLobby tournament={tournament} admin />
    </>
  )
}
