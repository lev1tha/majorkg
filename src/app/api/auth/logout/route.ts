import { NextResponse } from "next/server"

import { SESSION_COOKIE } from "@/lib/steam"

export const dynamic = "force-dynamic"

export function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", new URL(request.url).origin))
  response.cookies.delete(SESSION_COOKIE)
  return response
}
