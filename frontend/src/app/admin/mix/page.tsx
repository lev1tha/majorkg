import { AdminPageTitle } from "@/components/admin/admin-shell"
import { MixLobby } from "@/components/mix/mix-lobby"
import { TournamentPicker } from "@/components/admin/tournament-picker"
import { getAdminTournaments, getLineups, getParticipants, getViewer } from "@/lib/api"

/**
 * Жеребьевка любого турнира, а не одного захардкоженного.
 *
 * Раньше страница была намертво привязана к слагу `mix-arena` и на базе
 * без него отдавала 404 — на живом сайте это выглядело как «раздел не
 * работает». Турнир теперь выбирается, а пустая база дает понятный экран.
 */
export default async function AdminMixPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string }>
}) {
  const { tournament: requested } = await searchParams
  const { items } = await getAdminTournaments()

  const active =
    items.find((item) => item.slug === requested) ??
    items.find((item) => item.status === "checkin") ??
    items.find((item) => item.status === "registration") ??
    items[0] ??
    null

  const [participants, lineups, viewer] = active
    ? await Promise.all([getParticipants(active.slug), getLineups(active.slug), getViewer()])
    : [[], [], null]

  return (
    <>
      <AdminPageTitle
        title="Жеребьевка составов"
        description="Ручной запуск и пересбор составов до построения сетки. Подбор детерминирован: один seed — один расклад."
      />

      <TournamentPicker
        tournaments={items}
        active={active}
        basePath="/admin/mix"
        empty="Турниров еще нет. Создайте первый — жеребьевка появится здесь."
      />

      {active && (
        <div className="mt-5">
          <MixLobby
            tournament={active}
            participants={participants}
            lineups={lineups}
            viewer={viewer}
            admin
          />
        </div>
      )}
    </>
  )
}
