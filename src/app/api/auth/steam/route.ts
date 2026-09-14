import { NextResponse } from "next/server"

import { buildSteamAuthUrl } from "@/lib/steam"

export const dynamic = "force-dynamic"

export function GET(request: Request) {
  const origin = new URL(request.url).origin
  return NextResponse.redirect(buildSteamAuthUrl(origin))
}
