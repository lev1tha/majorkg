import * as React from "react"

import { cn } from "@/lib/utils"

export function Separator({
  className,
  orientation = "horizontal",
}: {
  className?: string
  orientation?: "horizontal" | "vertical"
}) {
  return (
    <div
      role="separator"
      className={cn(
        "shrink-0 bg-white/[0.08]",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  )
}

/** Монограмма команды — без аватарок и картинок, только типографика. */
export function TeamMark({
  tag,
  size = "md",
  tone = "steel",
  className,
}: {
  tag: string
  size?: "sm" | "md" | "lg"
  tone?: "steel" | "accent" | "prize"
  className?: string
}) {
  const sizes = {
    sm: "size-8 text-[10px] rounded-[8px]",
    md: "size-10 text-[11px] rounded-[10px]",
    lg: "size-14 text-[14px] rounded-[12px]",
  }
  const tones = {
    steel: "border-white/[0.1] bg-white/[0.05] text-white/70",
    accent: "border-accent/25 bg-accent/10 text-accent-soft",
    prize: "border-prize/25 bg-prize/10 text-prize",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center border font-display font-semibold tracking-[0.08em] tabular",
        sizes[size],
        tones[tone],
        className,
      )}
    >
      {tag}
    </span>
  )
}

/** Метка-значение для плотных информационных блоков. */
export function DataPoint({
  label,
  value,
  accent,
  className,
}: {
  label: string
  value: React.ReactNode
  accent?: "accent" | "prize" | "success"
  className?: string
}) {
  const accents = {
    accent: "text-accent",
    prize: "text-prize",
    success: "text-success",
  }
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-white/30">
        {label}
      </span>
      <span
        className={cn(
          "font-display text-[15px] font-semibold tracking-tight tabular",
          accent ? accents[accent] : "text-white",
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function SectionHeading({
  overline,
  title,
  description,
  action,
  className,
}: {
  overline?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6", className)}>
      <div className="flex max-w-2xl flex-col gap-3">
        {overline ? (
          <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">
            <span className="h-[3px] w-[3px] rounded-full bg-accent" />
            {overline}
          </span>
        ) : null}
        <h2 className="font-display text-[28px] font-semibold leading-[1.12] tracking-[-0.03em] text-white sm:text-[34px]">
          {title}
        </h2>
        {description ? (
          <p className="text-[14px] leading-relaxed text-white/45 balance">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
