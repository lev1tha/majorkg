"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Здесь подключается внешний мониторинг (Sentry и т.п.).
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <span className="mono text-[13px] uppercase tracking-[0.2em] text-accent">Сбой</span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-white">
            Что-то пошло не так
          </h1>
          <p className="text-[13.5px] leading-relaxed text-white/45">
            Раздел временно недоступен. Попробуйте обновить — данные турниров не пострадали.
          </p>
          {error.digest && (
            <p className="mono mt-2 text-[11.5px] text-white/25">Код: {error.digest}</p>
          )}
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-[11px] bg-accent px-5 text-[14px] font-medium text-white transition-colors hover:bg-accent-soft"
        >
          Обновить
        </button>
      </div>
    </main>
  )
}
