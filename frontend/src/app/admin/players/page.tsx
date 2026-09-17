import { AdminPageTitle } from "@/components/admin/admin-shell"
import { PlayerModeration } from "@/components/admin/player-moderation"
import { getAdminPlayers } from "@/lib/api"

export default async function AdminPlayersPage() {
  const { items, total } = await getAdminPlayers({ limit: 200 })
  const review = items.filter((player) => player.status === "review").length

  return (
    <>
      <AdminPageTitle
        title="Игроки"
        description={`${total} игроков в базе · ${review} на проверке. Команд в модерации нет: заявка индивидуальная, составы собирает жеребьевка.`}
      />
      <PlayerModeration players={items} />
    </>
  )
}
