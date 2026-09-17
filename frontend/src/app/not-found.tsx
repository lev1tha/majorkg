import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <span className="mono text-[64px] font-medium leading-none text-white/[0.09]">404</span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-white">
            Страница не найдена
          </h1>
          <p className="text-[13.5px] leading-relaxed text-white/45">
            Возможно, турнир завершен и архивирован, либо ссылка устарела.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-[11px] bg-accent px-5 text-[14px] font-medium text-white transition-colors hover:bg-accent-soft"
          >
            На главную
          </Link>
          <Link
            href="/tournaments"
            className="inline-flex h-11 items-center rounded-[11px] border border-white/10 bg-white/[0.03] px-5 text-[14px] font-medium text-white/85 transition-colors hover:bg-white/[0.07]"
          >
            К турнирам
          </Link>
        </div>
      </div>
    </main>
  )
}
