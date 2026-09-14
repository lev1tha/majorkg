import { Info } from "lucide-react"

/**
 * Честная пометка об источнике данных: без ключа FACEIT_API_KEY
 * в интерфейсе показывается локальный снимок, а не живое ELO.
 */
export function FaceitSourceNote({ live }: { live: boolean }) {
  return (
    <p className="inline-flex items-start gap-2 text-[12px] leading-relaxed text-white/30">
      <Info size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      {live
        ? "ELO и уровень подтягиваются из FACEIT Data API при входе через Steam."
        : "Показан локальный снимок рейтингов. Живое ELO включается после настройки FACEIT_API_KEY."}
    </p>
  )
}
