import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * No auth at the edge — PasswordGate runs client-side on `/app` only.
 * Matcher must NOT include `/` so crawlers (Facebook/WhatsApp) never hit middleware for the homepage.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/app/:path*"],
}
