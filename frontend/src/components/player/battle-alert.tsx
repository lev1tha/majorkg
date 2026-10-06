"use client"

import * as React from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Swords, Volume2, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  type BattleSound,
  playBattleSound,
  setSoundEnabled,
  soundEnabled,
  unlockAudio,
} from "@/lib/battle-sound"
import type { BattleAlertDto } from "@/lib/types"

/** Как часто спрашивать сервер. Сигнал — не чат, 15 секунд достаточно. */
const POLL_MS = 15_000
const SEEN_KEY = "mkg:battle-seen"
/** Матч важнее начала турнира, начало — важнее сбора. */
const PRIORITY: Record<BattleAlertDto["kind"], number> = { match: 0, live: 1, rally: 2 }

function readSeen(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as unknown
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : []
  } catch {
    return []
  }
}

function writeSeen(keys: string[]) {
  try {
    // Хвост из полусотни ключей: старые события уже не вернутся.
    localStorage.setItem(SEEN_KEY, JSON.stringify(keys.slice(-50)))
  } catch {
    // Без хранилища сигнал может повториться после перезагрузки — не страшно.
  }
}

/**
 * Сигнал к бою для подтвержденных участников.
 *
 * Пока сайт открыт (хоть в фоновой вкладке), он раз в 15 секунд спрашивает
 * сервер, нет ли нового события: организатор созвал участников, турнир
 * начался или пошел матч игрока. Новое событие — боевой рог и окно на
 * весь экран. Что уже протрубили, браузер помнит и второй раз не трубит.
 *
 * Звук браузер разрешает только после жеста, поэтому первый клик по сайту
 * разблокирует его заранее. Не успел — в окне есть кнопка «Включить звук».
 */
export function BattleAlert() {
  const [alert, setAlert] = React.useState<BattleAlertDto | null>(null)
  const [blocked, setBlocked] = React.useState(false)
  const [muted, setMuted] = React.useState(false)
  const sound = React.useRef<BattleSound | null>(null)

  React.useEffect(() => setMuted(!soundEnabled()), [])

  // Любой жест на сайте заранее разблокирует звук.
  React.useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener("pointerdown", unlock)
    window.addEventListener("keydown", unlock)
    return () => {
      window.removeEventListener("pointerdown", unlock)
      window.removeEventListener("keydown", unlock)
    }
  }, [])

  const trumpet = React.useCallback(() => {
    sound.current?.stop()
    sound.current = playBattleSound()
    setBlocked(sound.current === null)
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const response = await fetch("/api/auth/me/alerts", { credentials: "include" })
        if (!response.ok || cancelled) return
        const { items } = (await response.json()) as { items: BattleAlertDto[] }

        const seen = readSeen()
        const fresh = items.filter((item) => !seen.includes(item.key))
        if (fresh.length === 0) return

        // Помечаем сразу: вторая вкладка не должна трубить то же самое.
        writeSeen([...seen, ...fresh.map((item) => item.key)])
        const top = [...fresh].sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind])[0]!
        setAlert(top)

        if (soundEnabled()) trumpet()
        navigator.vibrate?.([400, 120, 400, 120, 800])
      } catch {
        // Сеть мигнула — спросим в следующий раз.
      }
    }

    void poll()
    const timer = window.setInterval(() => void poll(), POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [trumpet])

  // Пока окно открыто, а вкладка в фоне, заголовок мигает — видно в панели вкладок.
  React.useEffect(() => {
    if (!alert) return
    const original = document.title
    let on = false
    const timer = window.setInterval(() => {
      on = !on
      document.title = on && document.hidden ? "⚔ К БОЮ! · MAJOR KG" : original
    }, 900)
    return () => {
      window.clearInterval(timer)
      document.title = original
    }
  }, [alert])

  const dismiss = () => {
    sound.current?.stop()
    sound.current = null
    setAlert(null)
    setBlocked(false)
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    setSoundEnabled(!next)
    if (next) {
      sound.current?.stop()
      sound.current = null
    }
  }

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key={alert.key}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="battle-alert-title"
          aria-describedby="battle-alert-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-accent/40 bg-surface-2 p-7 text-center shadow-[0_0_80px_-10px] shadow-accent/60"
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,70,85,0.35),transparent_65%)]"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative flex flex-col items-center gap-4">
              <motion.span
                className="flex size-16 items-center justify-center rounded-full border border-accent/50 bg-accent/15 text-accent-soft"
                animate={{ scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
              >
                <Swords size={30} strokeWidth={1.6} />
              </motion.span>

              <div className="flex flex-col gap-2">
                <h2
                  id="battle-alert-title"
                  className="font-display text-[30px] font-extrabold uppercase leading-none tracking-[-0.02em] text-white"
                >
                  {alert.kind === "match" ? "Ваш матч!" : "К бою!"}
                </h2>
                <p id="battle-alert-text" className="text-[14px] leading-relaxed text-white/70">
                  {alert.text}
                </p>
                <p className="text-[13px] font-medium text-accent-soft">{alert.title}</p>
              </div>

              {blocked && !muted && (
                <Button variant="outline" size="md" onClick={trumpet}>
                  <Volume2 strokeWidth={1.5} />
                  Включить звук
                </Button>
              )}

              <div className="mt-1 flex w-full gap-2.5">
                <Button variant="primary" size="lg" className="flex-1" asChild>
                  <Link href={alert.href} onClick={dismiss}>
                    <Swords strokeWidth={1.5} />В бой
                  </Link>
                </Button>
                <Button variant="outline" size="lg" onClick={dismiss}>
                  Понял
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={toggleMute}
                  aria-label={muted ? "Включить сигнал" : "Выключить сигнал"}
                  title={muted ? "Включить сигнал" : "Выключить сигнал"}
                >
                  {muted ? <VolumeX strokeWidth={1.5} /> : <Volume2 strokeWidth={1.5} />}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Кнопка в профиле: услышать сигнал заранее и заодно разблокировать звук. */
export function BattleSoundTest() {
  const [playing, setPlaying] = React.useState(false)
  const [muted, setMuted] = React.useState(false)
  const current = React.useRef<BattleSound | null>(null)

  React.useEffect(() => {
    setMuted(!soundEnabled())
    return () => current.current?.stop()
  }, [])

  const toggle = () => {
    if (playing) {
      current.current?.stop()
      current.current = null
      setPlaying(false)
      return
    }
    unlockAudio()
    // resume() асинхронный — даем контексту проснуться.
    window.setTimeout(() => {
      current.current = playBattleSound()
      if (!current.current) return
      setPlaying(true)
      window.setTimeout(() => setPlaying(false), current.current.duration * 1000)
    }, 60)
  }

  const toggleMute = () => {
    setSoundEnabled(muted)
    setMuted(!muted)
  }

  return (
    <section className="glass flex flex-col gap-4 rounded-xl p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-white">
          <Swords size={16} strokeWidth={1.5} className="text-white/40" />
          Сигнал к бою
        </h2>
        <p className="text-[12.5px] leading-relaxed text-white/40">
          Когда организатор созывает участников, турнир начинается или стартует ваш матч, на сайте
          трубит боевой рог и всплывает окно. Работает, пока сайт открыт — хотя бы во вкладке на
          фоне.
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="outline" size="md" onClick={toggle}>
          <Volume2 strokeWidth={1.5} />
          {playing ? "Остановить" : "Проверить звук"}
        </Button>
        <Button variant="ghost" size="md" onClick={toggleMute}>
          {muted ? <VolumeX strokeWidth={1.5} /> : <Volume2 strokeWidth={1.5} />}
          {muted ? "Звук выключен" : "Звук включен"}
        </Button>
      </div>
    </section>
  )
}
