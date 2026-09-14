"use client"

import * as React from "react"

import { JoinDialog } from "./join-dialog"
import type { Tournament } from "@/lib/data/tournaments"

interface JoinContextValue {
  openJoin: (tournament: Tournament) => void
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
 */
export function JoinProvider({ children }: { children: React.ReactNode }) {
  const [tournament, setTournament] = React.useState<Tournament | null>(null)
  const [open, setOpen] = React.useState(false)

  const value = React.useMemo<JoinContextValue>(
    () => ({
      openJoin: (next: Tournament) => {
        setTournament(next)
        setOpen(true)
      },
    }),
    [],
  )

  return (
    <JoinContext.Provider value={value}>
      {children}
      <JoinDialog tournament={tournament} open={open} onOpenChange={setOpen} />
    </JoinContext.Provider>
  )
}
