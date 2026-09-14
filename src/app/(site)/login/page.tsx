import type { Metadata } from "next"
import Link from "next/link"
import { CircleAlert, Gamepad2, Lock, ShieldCheck, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { JsonLd } from "@/components/seo/json-ld"
import { breadcrumbLd } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Вход через Steam",
  description:
    "Авторизация на MAJOR KG только через Steam. После входа FACEIT ELO и уровень подтягиваются автоматически, а Steam ID сверяется с заявкой на турнир.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
}

const POINTS = [
  {
    icon: ShieldCheck,
    title: "Только Steam",
    text: "Пароль остается у Valve — платформа получает лишь ваш SteamID64.",
  },
  {
    icon: Zap,
    title: "FACEIT автоматически",
    text: "ELO, уровень и статистика подтягиваются к профилю без ручного ввода.",
  },
  {
    icon: Gamepad2,
    title: "Сверка состава",
    text: "Судья видит, что на карте те же Steam ID, что были в заявке.",
  },
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Главная", path: "/" }, { name: "Вход", path: "/login" }])} />
      <section className="mx-auto flex max-w-[1440px] items-center px-5 py-20 sm:px-8">
        <div className="mx-auto grid w-full max-w-4xl gap-10 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-[42px]">
              Вход через Steam
            </h1>
            <p className="text-[14px] leading-relaxed text-white/45">
              Один аккаунт на всю платформу: заявки на турниры, MIX-подбор, рейтинг и выплаты
              привязаны к вашему Steam ID. Отдельная регистрация не нужна.
            </p>

            <ul className="flex flex-col gap-4">
              {POINTS.map((point) => (
                <li key={point.title} className="flex gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03] text-white/60">
                    <point.icon size={16} strokeWidth={1.5} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[13.5px] font-medium text-white">{point.title}</span>
                    <span className="text-[12.5px] leading-relaxed text-white/40">{point.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass flex flex-col gap-5 rounded-2xl p-8">
            {error === "steam" && (
              <p className="flex items-start gap-2.5 rounded-[10px] border border-accent/25 bg-accent/[0.07] p-3.5 text-[12.5px] leading-relaxed text-accent-soft">
                <CircleAlert size={15} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                Steam не подтвердил вход. Попробуйте еще раз — если ошибка повторяется, проверьте,
                что профиль не скрыт.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <h2 className="font-display text-[18px] font-bold text-white">Продолжить</h2>
              <p className="text-[13px] leading-relaxed text-white/40">
                Вы будете перенаправлены на steamcommunity.com и вернетесь обратно после
                подтверждения.
              </p>
            </div>

            <Button variant="primary" size="xl" className="w-full" asChild>
              <a href="/api/auth/steam" rel="nofollow">
                <Gamepad2 strokeWidth={1.5} />
                Войти через Steam
              </a>
            </Button>

            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-white/30">
              <Lock size={13} strokeWidth={1.5} className="mt-0.5 shrink-0" />
              Используется OpenID 2.0 — официальный механизм Valve. Платформа не видит и не хранит
              ваш пароль.
            </p>

            <p className="border-t border-white/[0.07] pt-4 text-[12px] leading-relaxed text-white/30">
              Продолжая, вы принимаете{" "}
              <Link href="/faq" className="text-white/55 underline-offset-2 hover:underline">
                регламент платформы
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
