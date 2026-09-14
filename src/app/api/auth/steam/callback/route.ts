import { NextResponse } from "next/server"

import { SESSION_COOKIE, signSession, verifySteamAssertion } from "@/lib/steam"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const steamId = await verifySteamAssertion(url.searchParams)

  if (!steamId) {
    return NextResponse.redirect(new URL("/login?error=steam", url.origin))
  }

  const response = NextResponse.redirect(new URL("/profile", url.origin))
  response.cookies.set(SESSION_COOKIE, signSession(steamId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  })
  return response
}
