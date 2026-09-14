"use client"

import { Button, type ButtonProps } from "@/components/ui/button"
import { useJoin } from "./join-provider"
import type { Tournament } from "@/lib/data/tournaments"

interface JoinButtonProps extends Omit<ButtonProps, "onClick"> {
  tournament: Tournament
}

export function JoinButton({ tournament, children, ...props }: JoinButtonProps) {
  const { openJoin } = useJoin()
  return (
    <Button onClick={() => openJoin(tournament)} {...props}>
      {children}
    </Button>
  )
}
