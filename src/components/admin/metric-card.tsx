import { TrendingDown, TrendingUp } from "lucide-react"

import { Sparkline } from "@/components/ui/misc"
import { cn } from "@/lib/utils"

export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  series,
  suffix,
}: {
  label: string
  value: string
  delta: number
  deltaLabel: string
  series: number[]
  suffix?: string
}) {
  const positive = delta >= 0
  const Icon = positive ? TrendingUp : TrendingDown

  return (
    <div className="panel rounded-xl p-5">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="mono text-[26px] font-medium leading-none text-white">
          {value}
          {suffix ? <span className="ml-1.5 text-[14px] text-white/35">{suffix}</span> : null}
        </p>
        <Sparkline series={series} tone={positive ? "accent" : "neutral"} className="w-24" />
      </div>
      <p
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 text-[12px]",
          positive ? "text-success" : "text-accent",
        )}
      >
        <Icon size={13} strokeWidth={1.5} />
        {positive ? "+" : ""}
        {delta}
        <span className="text-white/30">· {deltaLabel}</span>
      </p>
    </div>
  )
}
