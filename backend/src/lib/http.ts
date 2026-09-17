import type { NextFunction, Request, RequestHandler, Response } from "express"

/** Ошибка с HTTP-кодом: единственный способ вернуть не-200 из сервиса. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "error",
    readonly details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, "bad_request", details)
  }
  static unauthorized(message = "Требуется вход через Steam") {
    return new ApiError(401, message, "unauthorized")
  }
  static forbidden(message = "Недостаточно прав") {
    return new ApiError(403, message, "forbidden")
  }
  static notFound(message = "Не найдено") {
    return new ApiError(404, message, "not_found")
  }
  static conflict(message: string) {
    return new ApiError(409, message, "conflict")
  }
}

/** Пробрасывает reject асинхронного хендлера в express-обработчик ошибок. */
export function handler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown | Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export interface Page {
  limit: number
  offset: number
}

export function parsePage(query: Request["query"], defaultLimit = 50, maxLimit = 200): Page {
  const rawLimit = Number(query.limit)
  const rawOffset = Number(query.offset)
  const limit = Number.isFinite(rawLimit) ? Math.min(maxLimit, Math.max(1, Math.trunc(rawLimit))) : defaultLimit
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0
  return { limit, offset }
}

export function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

/**
 * Параметр маршрута как строка. В типах Express 5 req.params[name] —
 * string | string[] | undefined, поэтому сужение делается один раз здесь.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name]
  if (typeof value !== "string" || !value) {
    throw ApiError.badRequest(`Не указан параметр ${name}`)
  }
  return value
}
