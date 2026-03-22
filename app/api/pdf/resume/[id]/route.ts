import { type NextRequest, NextResponse } from "next/server"
import { chromium } from "playwright"
import { generatePdfToken } from "@/lib/pdf-token"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const resumeId = params.id

    // Generate a signed token for server-side access
    const userId = "authenticated-user"
    const token = await generatePdfToken(resumeId, userId)

    // Get the base URL
    const baseUrl = process.env.NEXT_PUBLIC_URL || request.nextUrl.origin
    const exportUrl = `${baseUrl}/export/resume/${resumeId}?token=${token}`

    console.log("[v0] Launching Playwright to generate PDF with selectable text")

    // Launch Playwright with minimal resources
    const browser = await chromium.launch({
      headless: true,
    })

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    })

    const page = await context.newPage()

    // Navigate to export page
    await page.goto(exportUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    })

    // Wait for resume root
    await page.waitForSelector("#resume-root", { timeout: 10000 })

    // CRITICAL: Replace web fonts with system fonts and compress images
    await page.evaluate(async () => {
      // Replace all fonts with system fonts to avoid embedding large font files
      const style = document.createElement("style")
      style.textContent = `
        * {
          font-family: Arial, Helvetica, sans-serif !important;
        }
        h1, h2, h3, h4, h5, h6, .font-bold, [class*="font-semibold"], [class*="font-medium"] {
          font-family: Arial, Helvetica, sans-serif !important;
          font-weight: bold !important;
        }
      `
      document.head.appendChild(style)
      
      // Wait a moment for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Aggressively compress all images
      const images = Array.from(document.querySelectorAll("img"))
      
      for (const img of images) {
        try {
          // Wait for image to load if needed
          if (!img.complete) {
            await new Promise((resolve) => {
              img.onload = resolve
              img.onerror = resolve
              setTimeout(resolve, 1000)
            })
          }
          
          if (img.naturalWidth === 0) continue
          
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) continue
          
          // Very aggressive size reduction - max 100px
          const maxSize = 100
          let width = img.naturalWidth
          let height = img.naturalHeight
          
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width)
              width = maxSize
            } else {
              width = Math.round((width * maxSize) / height)
              height = maxSize
            }
          }
          
          canvas.width = width
          canvas.height = height
          
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)
          
          // Very low quality JPEG
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.4)
          img.src = compressedDataUrl
          
        } catch (e) {
          // Remove image if compression fails
          img.remove()
        }
      }
    })

    // Wait for changes to apply
    await page.waitForTimeout(300)

    // Get dimensions
    const dims = await page.evaluate(() => {
      const el = document.getElementById("resume-root")
      if (!el) return null
      return {
        width: Math.ceil(el.scrollWidth),
        height: Math.ceil(el.scrollHeight),
      }
    })

    if (!dims) {
      throw new Error("Could not measure resume dimensions")
    }

    // Convert px to inches (96px = 1 inch)
    const widthIn = dims.width / 96
    const heightIn = dims.height / 96

    console.log("[v0] Generating PDF:", { widthIn, heightIn })

    // Generate PDF with Playwright - text will be selectable
    const pdf = await page.pdf({
      printBackground: true,
      width: `${widthIn}in`,
      height: `${heightIn}in`,
      pageRanges: "1",
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })

    await browser.close()

    const pdfSizeKB = Math.round(pdf.length / 1024)
    const pdfSizeMB = (pdf.length / (1024 * 1024)).toFixed(2)
    console.log("[v0] PDF generated, size:", pdfSizeKB, "KB (", pdfSizeMB, "MB)")

    return new NextResponse(pdf, {
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
  }
}
