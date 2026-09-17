import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-[9px] bg-accent font-display text-[13px] font-extrabold tracking-[-0.04em] text-white",
        className,
      )}
      aria-hidden
    >
      M
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[16px] font-extrabold leading-none tracking-[-0.03em] text-white">
        MAJOR
        <span className="ml-1.5 align-middle text-[10px] font-bold tracking-[0.24em] text-white/35">
          KG
        </span>
      </span>
    </span>
  )
}
