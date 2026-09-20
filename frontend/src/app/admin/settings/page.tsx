import { redirect } from "next/navigation"

import { AdminPageTitle } from "@/components/admin/admin-shell"
import { AccountSettings } from "@/components/admin/account-settings"
import { getAdmin, getAdminAccounts } from "@/lib/api"

export default async function AdminSettingsPage() {
  const admin = await getAdmin()
  if (!admin) redirect("/admin")

  const accounts = await getAdminAccounts()

  return (
    <>
      <AdminPageTitle
        title="Учетная запись"
        description="Пароль организатора и доступ других судей. Steam здесь не участвует."
      />
      <AccountSettings admin={admin} accounts={accounts} />
    </>
  )
}
