import type { NextFunction, Request, Response } from "express"
import { ZodError } from "zod"

import { ApiError } from "../lib/http.js"
import { env } from "../env.js"

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound("Маршрут не найден"))
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Некорректные данные запроса",
      code: "validation_error",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    })
    return
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: error.message,
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
    })
    return
  }

  // Неожиданная ошибка: наружу — нейтральный текст, в лог — всё.
  console.error("[api] unhandled", error)
  res.status(500).json({
    error: "Внутренняя ошибка сервера",
    code: "internal_error",
    ...(env.isProd ? {} : { details: String(error) }),
  })
}
