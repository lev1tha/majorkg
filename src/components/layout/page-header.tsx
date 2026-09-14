import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export interface Crumb {
  label: string
  href?: string
}

export function PageHeader({
  crumbs,
  title,
  description,
  action,
  className,
}: {
  crumbs?: Crumb[]
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("border-b border-white/[0.07]", className)}>
      <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:py-14">
        {crumbs?.length ? (
          <nav aria-label="Хлебные крошки" className="mb-5 flex flex-wrap items-center gap-1.5">
            {crumbs.map((crumb, index) => (
              <span key={crumb.label} className="inline-flex items-center gap-1.5">
                {index > 0 && <ChevronRight size={13} strokeWidth={1.5} className="text-white/20" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-[12.5px] text-white/40 transition-colors hover:text-white"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[12.5px] text-white/70">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex max-w-2xl flex-col gap-3">
            <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-[42px]">
              {title}
            </h1>
            {description ? (
              <p className="text-[14px] leading-relaxed text-white/45 balance">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      </div>
    </div>
  )
}
