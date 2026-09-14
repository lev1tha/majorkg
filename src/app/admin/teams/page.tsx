import { Ban, CheckCheck, Wallet } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TeamMark } from "@/components/ui/misc"
import { AdminPageTitle } from "@/components/admin/admin-shell"
import { FaceitLevel } from "@/components/player/faceit-level"
import { ADMIN_TEAMS, ADMIN_USERS } from "@/lib/data/admin"
import { PLAYERS } from "@/lib/data/players"
import { formatNumber } from "@/lib/utils"

const TEAM_STATUS = {
  verified: { label: "Проверена", variant: "success" as const },
  incomplete: { label: "Неполный состав", variant: "prize" as const },
  blocked: { label: "Заблокирована", variant: "live" as const },
}

const USER_STATUS = {
  active: { label: "Активен", variant: "success" as const },
  review: { label: "Проверка", variant: "prize" as const },
  banned: { label: "Бан", variant: "live" as const },
}

export default function AdminTeamsPage() {
  const payouts = ADMIN_TEAMS.filter((team) => team.pendingPayout > 0)

  return (
    <>
      <AdminPageTitle
        title="Команды и игроки"
        description={`${ADMIN_TEAMS.length} команд · ${ADMIN_USERS.length} игроков в модерации · ${payouts.length} выплаты ожидают подтверждения`}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel overflow-hidden rounded-xl">
          <header className="border-b border-white/[0.07] px-5 py-4">
            <h2 className="font-display text-[15px] font-bold text-white">Команды</h2>
          </header>
          <ul className="divide-y divide-white/[0.05]">
            {ADMIN_TEAMS.map((team) => {
              const status = TEAM_STATUS[team.status]
              return (
                <li key={team.id} className="flex items-center gap-3.5 px-5 py-3.5">
                  <TeamMark tag={team.tag} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-white">{team.name}</p>
                    <p className="mono text-[11.5px] text-white/30">
                      {team.game} · состав {team.roster}
                    </p>
                  </div>
                  {team.pendingPayout > 0 && (
                    <span className="mono hidden text-[12px] text-prize sm:block">
                      {formatNumber(team.pendingPayout)} KGS
                    </span>
                  )}
                  <Badge variant={status.variant} size="sm">
                    {status.label}
                  </Badge>
                  <div className="flex gap-1.5">
                    {team.pendingPayout > 0 && (
                      <Button variant="subtle" size="icon-sm" aria-label="Подтвердить выплату">
                        <Wallet strokeWidth={1.5} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" aria-label="Заблокировать">
                      <Ban strokeWidth={1.5} />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="panel overflow-hidden rounded-xl">
          <header className="border-b border-white/[0.07] px-5 py-4">
            <h2 className="font-display text-[15px] font-bold text-white">Игроки</h2>
          </header>
          <ul className="divide-y divide-white/[0.05]">
            {ADMIN_USERS.map((user) => {
              const status = USER_STATUS[user.status]
              const player = PLAYERS.find((item) => item.nickname === user.nickname)
              return (
                <li key={user.id} className="flex items-center gap-3.5 px-5 py-3.5">
                  {player ? (
                    <FaceitLevel elo={player.elo} size="sm" />
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-[6px] border border-white/10 text-[10px] text-white/25">
                      —
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-white">{user.nickname}</p>
                    <p className="truncate text-[11.5px] text-white/30">
                      {user.fullName} · {user.team} · {user.role}
                    </p>
                  </div>
                  <span className="mono hidden text-[12px] text-white/35 sm:block">
                    {user.matches}
                  </span>
                  <Badge variant={status.variant} size="sm">
                    {status.label}
                  </Badge>
                  <div className="flex gap-1.5">
                    <Button variant="subtle" size="icon-sm" aria-label="Подтвердить">
                      <CheckCheck strokeWidth={1.5} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Забанить">
                      <Ban strokeWidth={1.5} />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </>
  )
}
