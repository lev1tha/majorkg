import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-white/[0.08] bg-white/[0.04] text-white/65",
        accent: "border-accent/25 bg-accent/10 text-accent-soft",
        live: "border-accent/30 bg-accent/12 text-accent-soft",
        prize: "border-prize/25 bg-prize/10 text-prize",
        success: "border-success/25 bg-success/10 text-success",
        info: "border-info/25 bg-info/10 text-info",
        outline: "border-white/10 bg-transparent text-white/55",
      },
      size: {
        sm: "h-6 px-2.5 text-[11px] [&_svg]:size-3",
        md: "h-7 px-3 text-[12px] [&_svg]:size-3.5",
        lg: "h-9 px-4 text-[13px] [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "default", size: "sm" },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { badgeVariants }
