import type { Metadata } from "next"
import { ServerCog } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ServerCard } from "@/components/server/server-card"
import { JsonLd } from "@/components/seo/json-ld"
import { getServers } from "@/lib/api"
import { breadcrumbLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Игровые серверы CS2 в Кыргызстане",
  description:
    "Сервера MAJOR KG для CS2: адреса, текущая карта и сколько человек играет прямо сейчас. Подключение в один клик, низкий пинг для игроков из Бишкека и Центральной Азии.",
  alternates: { canonical: "/servers" },
}

// Состояние серверов живое: кэшировать страницу нечего.
export const revalidate = 0

export default async function ServersPage() {
  const servers = await getServers()
  const online = servers.filter((item) => item.status.online).length

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: "Главная", path: "/" },
          { name: "Серверы", path: "/servers" },
        ])}
      />
      <PageHeader
        crumbs={[{ label: "Главная", href: "/" }, { label: "Серверы" }]}
        title="Серверы"
        description={
          servers.length > 0
            ? `${online} из ${servers.length} серверов онлайн. Состояние опрашивается напрямую у сервера, как в браузере Steam.`
            : "Сервера появятся здесь, как только организатор их добавит."
        }
      />

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
        {servers.length === 0 ? (
          <div className="glass flex flex-col items-center gap-3 rounded-xl py-20 text-center">
            <ServerCog size={24} strokeWidth={1.5} className="text-white/20" />
            <p className="text-[13px] text-white/30">Список серверов пока пуст.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {servers.map((server) => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
