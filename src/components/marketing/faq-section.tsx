import { ChevronDown, MessagesSquare } from "lucide-react"

import { SectionHeading } from "@/components/ui/misc"
import { EXTERNAL, LINKS } from "@/lib/links"
import { FAQ } from "@/lib/seo"

/**
 * Нативный details/summary: работает без JS, корректно читается
 * скринридерами и индексируется поисковыми роботами вместе с FAQ-разметкой.
 */
export function FaqSection() {
  return (
    <section id="faq" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-20">
          <div className="flex flex-col gap-8">
            <SectionHeading
              overline="Вопросы"
              title="Коротко о турнирах КГ"
              description="Все, что нужно знать до первой заявки."
            />

            <div className="panel rounded-xl border border-white/[0.08] p-6">
              <h3 className="font-display text-[15px] font-semibold text-white">
                Онлайн турниры по CS2 в Кыргызстане
              </h3>
              <div className="mt-3 flex flex-col gap-3 text-[13px] leading-relaxed text-white/45">
                <p>
                  MAJOR KG — турнирная платформа для киберспорта Кыргызстана: открытые кубки по
                  Counter-Strike 2, еженедельные лиги и квалификации для команд из Бишкека, Оша и всей
                  Центральной Азии. Календарь обновляется каждый день, участие в большинстве турниров
                  бесплатное.
                </p>
                <p>
                  Платформа берет на себя рутину организатора: заявки команд, check-in, автоматическую
                  турнирную сетку, протоколы матчей и выплату призового фонда. Игрокам остается
                  выбрать турнир и выйти на сервер.
                </p>
              </div>
            </div>

            <a
              href={LINKS.discord}
              {...EXTERNAL}
              className="group flex items-center gap-3.5 rounded-xl border border-accent/25 bg-accent/[0.06] p-5 transition-colors hover:bg-accent/10"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] border border-accent/30 bg-accent/10 text-accent-soft">
                <MessagesSquare size={18} strokeWidth={1.5} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13.5px] font-medium text-white">Не нашли ответ — спросите в Discord</span>
                <span className="text-[12.5px] text-white/45">
                  Судьи и организаторы отвечают там же, где идут матчи
                </span>
              </span>
            </a>
          </div>

          <div className="flex flex-col gap-2.5">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group panel rounded-[14px] border border-white/[0.08] transition-colors hover:border-white/[0.16] [&[open]]:border-accent/25"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 [&::-webkit-details-marker]:hidden">
                  <h3 className="font-display text-[15px] font-semibold tracking-tight text-white/90 group-open:text-white">
                    {item.q}
                  </h3>
                  <ChevronDown
                    size={17}
                    strokeWidth={1.5}
                    className="shrink-0 text-white/30 transition-transform duration-300 group-open:rotate-180 group-open:text-accent-soft"
                  />
                </summary>
                <p className="border-t border-white/[0.06] px-5 py-4 text-[13.5px] leading-relaxed text-white/45">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
