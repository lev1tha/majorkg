import type { Metadata } from "next"

import { AdminLoginForm } from "@/components/admin/admin-login-form"
import { AdminShell } from "@/components/admin/admin-shell"
import { getAdmin } from "@/lib/api"

export const metadata: Metadata = {
  title: "Админ-панель",
  robots: { index: false, follow: false },
}

/**
 * Вход организатора не отдельный маршрут, а состояние самой админки: без
 * сессии любой /admin/* показывает форму. Так нет ни редирект-петли между
 * страницей входа и проверкой, ни потери адреса, на который человек шел.
 *
 * Это только навигация — доступ к данным закрывает бэкенд на каждом запросе.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin()
  if (!admin) return <AdminLoginForm />

  return <AdminShell admin={admin}>{children}</AdminShell>
}
