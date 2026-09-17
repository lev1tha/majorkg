import { AdminPageTitle } from "@/components/admin/admin-shell"
import { AdminBracket } from "@/components/admin/admin-bracket"
import { getAdminTournaments, getBracket } from "@/lib/api"

export default async function AdminBracketPage({
  searchParams,
}: {
  searchParams: Promise<{ tournament?: string }>
}) {
  const { tournament } = await searchParams
  const { items } = await getAdminTournaments()

  // По умолчанию открываем то, что идет прямо сейчас.
  const active =
    items.find((item) => item.slug === tournament) ??
    items.find((item) => item.status === "live") ??
    items.find((item) => item.status === "checkin") ??
    items[0] ??
    null

  const rounds = active ? await getBracket(active.slug) : []

  return (
    <>
      <AdminPageTitle
        title="Сетка"
        description="Верхняя сетка турнира. Отмечайте победителя матча — он сразу встает в следующий раунд, а игрокам начисляются очки сезона."
      />
      <AdminBracket tournaments={items} active={active} rounds={rounds} />
    </>
  )
}
