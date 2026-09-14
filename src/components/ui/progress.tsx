"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number
  tone?: "accent" | "prize" | "success" | "neutral"
  size?: "sm" | "md"
}

const TONE: Record<NonNullable<ProgressProps["tone"]>, string> = {
  accent: "bg-accent",
  prize: "bg-prize",
  success: "bg-success",
  neutral: "bg-white/55",
}

export function Progress({ value, tone = "neutral", size = "sm", className, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-white/[0.07]",
        size === "sm" ? "h-1" : "h-1.5",
        className,
      )}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", TONE[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
