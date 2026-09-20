"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { CalendarPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/input"
import { STATUS_LABEL } from "@/components/marketing/tournament-card"
import type { TournamentDto } from "@/lib/types"

/** Выбор турнира для страниц админки, работающих «поверх» одного турнира. */
export function TournamentPicker({
  tournaments,
  active,
  basePath,
  empty,
}: {
  tournaments: TournamentDto[]
  active: TournamentDto | null
  basePath: string
  empty: string
}) {
  const router = useRouter()

  if (tournaments.length === 0) {
    return (
      <div className="panel flex flex-col items-center gap-4 rounded-xl py-14 text-center">
        <CalendarPlus size={22} strokeWidth={1.5} className="text-white/20" />
        <p className="max-w-sm text-[13px] leading-relaxed text-white/35">{empty}</p>
        <Button variant="primary" size="md" asChild>
          <Link href="/admin/tournaments/new">Создать турнир</Link>
        </Button>
      </div>
    )
  }

  return (
    <Select
      value={active?.slug ?? ""}
      onChange={(event) => router.push(`${basePath}?tournament=${event.target.value}`)}
      aria-label="Турнир"
      className="h-10 sm:w-80"
    >
      {tournaments.map((item) => (
        <option key={item.slug} value={item.slug}>
          {item.title} · {STATUS_LABEL[item.status]}
        </option>
      ))}
    </Select>
  )
}
