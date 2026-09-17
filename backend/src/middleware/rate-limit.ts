import type { NextFunction, Request, Response } from "express"

import { ApiError } from "../lib/http.js"

interface Bucket {
  count: number
  resetAt: number
}

/**
 * Лимитер в памяти процесса: защищает запись от случайного залипания
 * кнопки и от простого перебора. Для нескольких инстансов нужен общий
 * стор — интерфейс менять не придется.
 */
export function rateLimit({ windowMs = 60_000, max = 30 } = {}) {
  const buckets = new Map<string, Bucket>()

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now()
    const key = `${req.viewer?.id ?? req.ip ?? "anon"}:${req.baseUrl}`

    const bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
    } else if (bucket.count >= max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000))
      return next(new ApiError(429, "Слишком много запросов, попробуйте позже", "rate_limited"))
    } else {
      bucket.count += 1
    }

    // Ленивая уборка, чтобы карта не росла бесконечно.
    if (buckets.size > 10_000) {
      for (const [entry, value] of buckets) if (value.resetAt <= now) buckets.delete(entry)
    }
    next()
  }
}
