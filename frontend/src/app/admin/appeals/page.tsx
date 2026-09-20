import { AdminPageTitle } from "@/components/admin/admin-shell"
import { AppealsBoard } from "@/components/admin/appeals-board"
import { getAppeals } from "@/lib/api"

export default async function AdminAppealsPage() {
  const appeals = await getAppeals("all")

  return (
    <>
      <AdminPageTitle
        title="Апелляции"
        description="Спорные результаты. Апелляция переводит матч в состояние «на разборе» — решение судьи размораживает турнир."
      />
      <AppealsBoard appeals={appeals} />
    </>
  )
}
