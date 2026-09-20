import { AdminPageTitle } from "@/components/admin/admin-shell"
import { ServerQueue } from "@/components/admin/server-queue"
import { TournamentPicker } from "@/components/admin/tournament-picker"
import { getAdminTournaments, getServerQueue } from "@/lib/api"

/**
 * Что готовить на серверах.
 *
 * Вето закончилось — известен порядок карт; не закончилось — известно,
 * чьего хода ждем. Это и есть ответ на вопрос «какие карты ставить».
 */
export default async function AdminServersPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string }>
}) {
  const { tournament: requested } = await searchParams
  const { items } = await getAdminTournaments()

  const active =
    items.find((item) => item.slug === requested) ??
    items.find((item) => item.status === "live") ??
    items.find((item) => item.status === "checkin") ??
    items[0] ??
    null

  const queue = active ? await getServerQueue(active.slug) : []

  return (
    <>
      <AdminPageTitle
        title="Серверы"
        description="Карты предстоящих матчей после вето. Готовится ровно то, во что будут играть."
      />

      <TournamentPicker
        tournaments={items}
        active={active}
        basePath="/admin/servers"
        empty="Турниров еще нет — готовить пока нечего."
      />

      {active && (
        <div className="mt-5">
          <ServerQueue items={queue} server={active.server} slug={active.slug} />
        </div>
      )}
    </>
  )
}
