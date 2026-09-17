"use client"

import * as React from "react"

import { JoinDialog } from "./join-dialog"
import type { TournamentDto, ViewerDto } from "@/lib/types"

interface JoinContextValue {
  openJoin: (tournament: TournamentDto) => void
  viewer: ViewerDto | null
}

const JoinContext = React.createContext<JoinContextValue | null>(null)

export function useJoin() {
  const ctx = React.useContext(JoinContext)
  if (!ctx) throw new Error("useJoin должен вызываться внутри <JoinProvider>")
  return ctx
}

/**
 * Единая точка входа в заявку: любая кнопка «Участвовать» на любой
 * странице открывает один и тот же модал — состояние живет здесь.
 * Текущий пользователь приходит с сервера, чтобы модал сразу знал,
 * нужен ли вход через Steam.
 */
export function JoinProvider({
  viewer,
  children,
}: {
  viewer: ViewerDto | null
  children: React.ReactNode
}) {
  const [tournament, setTournament] = React.useState<TournamentDto | null>(null)
  const [open, setOpen] = React.useState(false)

  const value = React.useMemo<JoinContextValue>(
    () => ({
      viewer,
      openJoin: (next: TournamentDto) => {
        setTournament(next)
        setOpen(true)
      },
    }),
    [viewer],
  )

  return (
    <JoinContext.Provider value={value}>
      {children}
      <JoinDialog tournament={tournament} viewer={viewer} open={open} onOpenChange={setOpen} />
    </JoinContext.Provider>
  )
}
