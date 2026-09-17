import { AdminPageTitle } from "@/components/admin/admin-shell"
import { MatchQueue } from "@/components/admin/match-queue"
import { getAdminTournaments, getMatches } from "@/lib/api"

export default async function AdminMatchesPage() {
  const [{ items: tournaments }, matches] = await Promise.all([
    getAdminTournaments(),
    getMatches({ limit: 100 }),
  ])

  // Пул карт для подсказок в протоколе — из активного турнира.
  const active = tournaments.find((item) => item.status === "live") ?? tournaments[0]

  return (
    <>
      <AdminPageTitle
        title="Матчи и сетка"
        description="Ввод счета по картам, тех. поражения и протоколы. Победитель сразу проходит в следующий раунд верхней сетки."
      />
      <MatchQueue matches={matches} mapPool={active?.maps ?? []} />
    </>
  )
}
