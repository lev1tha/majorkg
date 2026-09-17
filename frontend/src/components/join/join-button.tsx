"use client"

import { Button, type ButtonProps } from "@/components/ui/button"
import { useJoin } from "./join-provider"
import type { TournamentDto } from "@/lib/types"

interface JoinButtonProps extends Omit<ButtonProps, "onClick"> {
  tournament: TournamentDto
}

export function JoinButton({ tournament, children, ...props }: JoinButtonProps) {
  const { openJoin } = useJoin()
  return (
    <Button onClick={() => openJoin(tournament)} {...props}>
      {children}
    </Button>
  )
}
