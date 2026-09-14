"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium tracking-[-0.01em] select-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out",
    "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "cta-glow bg-accent text-white hover:bg-accent-soft",
        solid: "bg-white text-base hover:bg-white/90",
        outline:
          "border border-white/10 bg-white/[0.03] text-white/90 hover:bg-white/[0.06] hover:border-white/20",
        ghost: "text-white/60 hover:text-white hover:bg-white/[0.05]",
        subtle: "bg-white/[0.06] text-white/90 hover:bg-white/[0.1]",
        danger: "bg-accent/10 text-accent border border-accent/25 hover:bg-accent/16",
        link: "text-accent hover:text-accent-soft underline-offset-4 hover:underline px-0",
      },
      size: {
        xs: "h-8 rounded-[8px] px-3 text-[12px] [&_svg]:size-3.5",
        sm: "h-9 rounded-[9px] px-3.5 text-[13px] [&_svg]:size-4",
        md: "h-10 rounded-[10px] px-4 text-[13.5px] [&_svg]:size-4",
        lg: "h-11 rounded-[11px] px-5 text-[14px] [&_svg]:size-[17px]",
        xl: "h-14 rounded-[13px] px-8 text-[15px] font-semibold [&_svg]:size-[18px]",
        icon: "h-10 w-10 rounded-[10px] [&_svg]:size-[18px]",
        "icon-sm": "h-8 w-8 rounded-[8px] [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "outline", size: "md" },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
