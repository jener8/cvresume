import { type NextRequest, NextResponse } from "next/server"
import { chromium } from "playwright"
import { generatePdfToken } from "@/lib/pdf-token"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null
  try {
    const resumeId = params.id

    // Generate a signed token for server-side access to the export page
    const userId = "authenticated-user"
    const token = await generatePdfToken(resumeId, userId)

    const baseUrl = process.env.NEXT_PUBLIC_URL || request.nextUrl.origin
    const exportUrl = `${baseUrl}/export/resume/${resumeId}?token=${token}`

    console.log("[v0] Launching Playwright to generate PDF with selectable text")

    browser = await chromium.launch({
      headless: true,
    })

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    })

    const page = await context.newPage()
    await page.setViewportSize({ width: 820, height: 1200 })

    await page.goto(exportUrl, {
      waitUntil: "networkidle",
      timeout: 60000,
    })

    await page.waitForSelector("#resume-root", { timeout: 10000 })

    await page.waitForSelector("#resume-root [data-pdf-pagination-ready='true']", {
      timeout: 20000,
    })

    // Match on-screen typography/layout (no font substitution, no image resizing)
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all(
        Array.from(document.images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve()
                return
              }
              img.onload = () => resolve()
              img.onerror = () => resolve()
              setTimeout(() => resolve(), 5000)
            }),
        ),
      )
    })

    // A4 from @page / CSS; one printed sheet per .pdf-page
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    })

    const pdfSizeKB = Math.round(pdf.length / 1024)
    const pdfSizeMB = (pdf.length / (1024 * 1024)).toFixed(2)
    console.log("[v0] PDF generated, size:", pdfSizeKB, "KB (", pdfSizeMB, "MB)")

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume-${resumeId}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] PDF generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}
