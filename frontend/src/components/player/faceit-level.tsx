import { levelFromElo, levelTone } from "@/lib/faceit"
import { cn, formatNumber } from "@/lib/utils"

/** Квадрат уровня FACEIT — компактный, без «радужных» градиентов. */
export function FaceitLevel({
  elo,
  level,
  size = "md",
  showElo = false,
  className,
}: {
  elo: number
  level?: number
  size?: "sm" | "md" | "lg"
  showElo?: boolean
  className?: string
}) {
  const value = level ?? levelFromElo(elo)
  const tone = levelTone(value)
  const sizes = {
    sm: "size-6 text-[11px] rounded-[6px]",
    md: "size-8 text-[13px] rounded-[8px]",
    lg: "size-11 text-[17px] rounded-[10px]",
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        title={`FACEIT уровень ${value}`}
        className={cn(
          "mono inline-flex shrink-0 items-center justify-center border font-medium",
          sizes[size],
          tone.bg,
          tone.border,
          tone.text,
        )}
      >
        {value}
      </span>
      {showElo && (
        <span className="mono text-[13px] text-white/60">{formatNumber(elo)}</span>
      )}
    </span>
  )
}
