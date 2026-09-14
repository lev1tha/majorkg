"use client"

import { useCountdown } from "@/hooks/use-countdown"
import { cn, pad2 } from "@/lib/utils"

interface CountdownProps {
  minutes: number
  size?: "sm" | "md" | "lg"
  className?: string
  /** Текст, который заменяет таймер, когда время вышло. */
  expiredLabel?: string
}

const SIZES = {
  sm: { value: "text-[13px]", box: "px-1.5 py-1 min-w-[30px]", label: "text-[8.5px]", gap: "gap-1" },
  md: { value: "text-[17px]", box: "px-2 py-1.5 min-w-[40px]", label: "text-[9px]", gap: "gap-1.5" },
  lg: { value: "text-[26px]", box: "px-3 py-2.5 min-w-[62px]", label: "text-[10px]", gap: "gap-2" },
}

export function Countdown({ minutes, size = "md", className, expiredLabel = "Идет сейчас" }: CountdownProps) {
  const { ready, expired, days, hours, minutes: mins, seconds } = useCountdown(minutes)
  const s = SIZES[size]

  if (ready && expired) {
    return (
      <span className={cn("inline-flex items-center gap-2 text-accent", className)}>
        <span className="size-1.5 rounded-full bg-accent pulse-live" />
        <span className="text-[13px] font-medium uppercase tracking-[0.14em]">{expiredLabel}</span>
      </span>
    )
  }

  const units = [
    { value: days, label: "дн" },
    { value: hours, label: "час" },
    { value: mins, label: "мин" },
    { value: seconds, label: "сек" },
  ].filter((unit, index) => index > 0 || days > 0)

  return (
    <div className={cn("flex items-end", s.gap, className)} aria-live="off">
      {units.map((unit, index) => (
        <div key={unit.label} className={cn("flex items-end", s.gap)}>
          <div className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "mono rounded-[7px] border border-white/[0.08] bg-white/[0.04] text-center font-medium text-white",
                s.value,
                s.box,
              )}
            >
              {ready ? pad2(unit.value) : "--"}
            </span>
            <span className={cn("uppercase tracking-[0.16em] text-white/30", s.label)}>{unit.label}</span>
          </div>
          {index < units.length - 1 && (
            <span className={cn("mono pb-5 text-white/20", s.value)}>:</span>
          )}
        </div>
      ))}
    </div>
  )
}

/** Компактная строка «до старта 02:14:09» для плотных карточек. */
export function CountdownInline({
  minutes,
  className,
  expiredLabel = "LIVE",
}: {
  minutes: number
  className?: string
  expiredLabel?: string
}) {
  const { ready, expired, days, hours, minutes: mins, seconds } = useCountdown(minutes)

  if (ready && expired) {
    return (
      <span className={cn("mono inline-flex items-center gap-1.5 text-accent", className)}>
        <span className="size-1.5 rounded-full bg-accent pulse-live" />
        {expiredLabel}
      </span>
    )
  }

  return (
    <span className={cn("mono", className)}>
      {!ready ? "--:--:--" : days > 0 ? `${days}д ${pad2(hours)}:${pad2(mins)}` : `${pad2(hours)}:${pad2(mins)}:${pad2(seconds)}`}
    </span>
  )
}
