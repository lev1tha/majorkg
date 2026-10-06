import { AdminPageTitle } from "@/components/admin/admin-shell"
import { ServerQueue } from "@/components/admin/server-queue"
import { ServerRegistry } from "@/components/admin/server-registry"
import { TournamentPicker } from "@/components/admin/tournament-picker"
import { getAdminServers, getAdminTournaments, getServerQueue } from "@/lib/api"

/**
 * Серверы: свои машины и что на них готовить.
 *
 * Сверху реестр с живым состоянием по A2S, снизу — очередь матчей с
 * картами после вето. Вместе это отвечает на вопрос «что ставить прямо
 * сейчас и куда».
 */
export default async function AdminServersPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string }>
}) {
  const { tournament: requested } = await searchParams
  const [servers, { items }] = await Promise.all([getAdminServers(), getAdminTournaments()])

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
        description="Свои машины и карты предстоящих матчей после вето. Состояние спрашивается у сервера напрямую."
      />

      <ServerRegistry servers={servers} />

      <div className="mt-10 flex flex-col gap-4">
        <h2 className="font-display text-[17px] font-bold text-white">Что готовить</h2>
        <TournamentPicker
          tournaments={items}
          active={active}
          basePath="/admin/servers"
          empty="Турниров еще нет — готовить пока нечего."
        />
        {active && <ServerQueue items={queue} server={active.server} slug={active.slug} />}
      </div>
    </>
  )
}
