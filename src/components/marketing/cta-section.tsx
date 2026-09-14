"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { JoinButton } from "@/components/join/join-button"
import { FEATURED_TOURNAMENT } from "@/lib/data/tournaments"

export function CtaSection() {
  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
        <div className="edge relative overflow-hidden rounded-2xl border border-white/[0.08] px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(140deg,#13151d,#0b0d12)]"
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-0 -z-10 h-[320px] w-[680px] -translate-x-1/2 opacity-70 blur-[110px]"
            style={{ background: "radial-gradient(circle, rgba(255,70,85,0.14), transparent 66%)" }}
          />

          <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
            <h2 className="font-display text-[30px] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-[40px] balance">
              Соберите состав и заявляйтесь
            </h2>
            <p className="text-[14.5px] leading-relaxed text-white/45 balance">
              Ближайший турнир стартует уже сегодня. Регистрация бесплатная и занимает меньше минуты.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <JoinButton tournament={FEATURED_TOURNAMENT} variant="primary" size="xl">
                Зарегистрировать команду
                <ArrowRight strokeWidth={1.5} />
              </JoinButton>
              <Button variant="outline" size="xl" asChild>
                <Link href="/tournaments">Смотреть календарь</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
