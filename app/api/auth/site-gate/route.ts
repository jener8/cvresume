import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Server-side site gate. Password must be set as SITE_ACCESS_PASSWORD
 * (Production + Preview). There is intentionally no hardcoded fallback.
 */
export async function POST(request: Request) {
  const expected = process.env.SITE_ACCESS_PASSWORD?.trim()
  if (!expected) {
    return NextResponse.json(
      { error: "Site access password is not configured." },
      { status: 503 },
    )
  }

  try {
    const body = (await request.json()) as { password?: string }
    const password = body.password?.trim() ?? ""
    if (!password || password !== expected) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
