import { Dices, ListChecks, MousePointerClick, Network } from "lucide-react"

import { SectionHeading } from "@/components/ui/misc"

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Заявка в два клика",
    text: "Выбираете турнир и нажимаете «Участвовать». Команда не нужна — вы заявляетесь от своего имени.",
  },
  {
    icon: ListChecks,
    title: "Check-in",
    text: "За 30 минут до старта открывается подтверждение готовности. Состав сверяется по Steam ID.",
  },
  {
    icon: Dices,
    title: "Жеребьевка составов",
    text: "Участники раскладываются по рейтинговым поясам FACEIT, в каждой команде — по одному из каждого пояса.",
  },
  {
    icon: Network,
    title: "Верхняя сетка",
    text: "Сетка строится автоматически, проигравший выбывает. Результат карты подтверждается скриншотом и GOTV-демо.",
  },
]

export function HowItWorks() {
  return (
    <section className="border-y border-white/[0.06] bg-surface/40 py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
        <SectionHeading
          overline="Процесс"
          title="Как это работает"
          description="Платформа закрывает весь цикл турнира — от индивидуальной заявки до финала."
          className="mb-10"
        />

        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="glass group flex flex-col gap-4 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-[11px] border border-white/[0.08] bg-white/[0.03] text-white/70 transition-colors group-hover:border-accent/35 group-hover:text-accent-soft">
                  <step.icon size={18} strokeWidth={1.5} />
                </span>
                <span className="mono text-[22px] font-medium leading-none text-white/[0.08]">
                  0{index + 1}
                </span>
              </div>
              <h3 className="font-display text-[15.5px] font-bold tracking-tight text-white">
                {step.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-white/45">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
