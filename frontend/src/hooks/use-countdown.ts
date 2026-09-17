"use client"

import { useEffect, useState } from "react"

export interface Countdown {
  ready: boolean
  expired: boolean
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
}

const IDLE: Countdown = {
  ready: false,
  expired: false,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  totalMs: 0,
}

/**
 * Отсчет привязан к моменту монтирования, а не к абсолютной дате: сервер
 * отдает остаток в минутах, клиент досчитывает от него. Так серверная и
 * клиентская разметка совпадают и гидрация не расходится.
 */
export function useCountdown(minutesFromNow: number): Countdown {
  const [state, setState] = useState<Countdown>(IDLE)

  useEffect(() => {
    const target = Date.now() + minutesFromNow * 60_000

    const tick = () => {
      const totalMs = Math.max(0, target - Date.now())
      const totalSeconds = Math.floor(totalMs / 1000)
      setState({
        ready: true,
        expired: totalMs <= 0,
        days: Math.floor(totalSeconds / 86_400),
        hours: Math.floor((totalSeconds % 86_400) / 3_600),
        minutes: Math.floor((totalSeconds % 3_600) / 60),
        seconds: totalSeconds % 60,
        totalMs,
      })
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [minutesFromNow])

  return state
}
