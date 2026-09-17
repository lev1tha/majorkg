import { cn } from "@/lib/utils"

/**
 * Плитка метрики. Спарклайна нет намеренно: исторического ряда бэкенд
 * не хранит, а рисовать декоративную кривую поверх реальной цифры —
 * вводить организатора в заблуждение.
 */
export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  suffix,
}: {
  label: string
  value: string
  delta: number
  deltaLabel: string
  suffix?: string
}) {
  return (
    <div className="panel rounded-xl p-5">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">{label}</p>
      <p className="mono mt-2 text-[26px] font-medium leading-none text-white">
        {value}
        {suffix ? <span className="ml-1.5 text-[14px] text-white/35">{suffix}</span> : null}
      </p>
      <p
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 text-[12px]",
          delta > 0 ? "text-prize" : "text-white/40",
        )}
      >
        {delta > 0 ? <span className="mono">{delta}</span> : null}
        <span className="text-white/30">{deltaLabel}</span>
      </p>
    </div>
  )
}
