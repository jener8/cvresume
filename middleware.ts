import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Edge middleware — does NOT enforce passwords (PasswordGate is client-side on `/app` only).
 *
 * Matcher is restricted so `/`, crawlers (facebookexternalhit), robots.txt, OG images, `/_next/*`,
 * and other static assets never run through this file. Only `/app` routes match.
 *
 * If you still see 403 in Facebook Debugger for `/`, that response is almost always from
 * Vercel Deployment Protection (project Settings → Deployment Protection), not Next.js.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/app", "/app/:path*"],
}
