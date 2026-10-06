import { notFound } from "next/navigation"
import { verifyPdfToken } from "@/lib/pdf-token"
import { supabase } from "@/lib/supabase/client"
import { ResumePdfExport } from "@/components/resume-pdf-export"
import type { ResumeVersion } from "@/lib/types"
import sharp from "sharp"

// Compress image to reduce PDF size - VERY aggressive compression
async function compressImage(imageData: string | null, maxWidth: number = 150): Promise<string | null> {
  if (!imageData) return null

  try {
    const matches = imageData.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/)
    if (!matches) {
      console.log("[v0] Image is not a data URL, skipping compression")
      return imageData
    }

    const base64Data = matches[2]
    const originalSize = base64Data.length
    console.log(`[v0] Original image size: ${Math.round(originalSize / 1024)}KB`)

    const buffer = Buffer.from(base64Data, "base64")

    const compressed = await sharp(buffer)
      .resize(maxWidth, maxWidth, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 50,
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer()

    const compressedBase64 = compressed.toString("base64")
    console.log(
      `[v0] Compressed image size: ${Math.round(compressedBase64.length / 1024)}KB (${Math.round((1 - compressedBase64.length / originalSize) * 100)}% reduction)`,
    )

    return `data:image/jpeg;base64,${compressedBase64}`
  } catch (error) {
    console.error("[v0] Image compression error:", error)
    return null
  }
}

export default async function ExportResumePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { token?: string }
}) {
  if (!searchParams.token) {
    return notFound()
  }

  const tokenPayload = await verifyPdfToken(searchParams.token)
  if (!tokenPayload || tokenPayload.resumeId !== params.id) {
    return notFound()
  }

  const { data: resumeData, error } = await supabase.from("resume_versions").select("*").eq("id", params.id).single()

  if (error || !resumeData) {
    return notFound()
  }

  const [compressedProfileImage, compressedCompanyLogo] = await Promise.all([
    compressImage(resumeData.profile_image, 120),
    compressImage(resumeData.company_logo, 150),
  ])

  const version: ResumeVersion = {
    id: resumeData.id,
    name: resumeData.name,
    resumeText: resumeData.resume_text,
    profileImage: compressedProfileImage,
    companyLogo: compressedCompanyLogo,
    timestamp: new Date(resumeData.created_at).getTime(),
    contactInfo: resumeData.contact_info,
    accentColor: resumeData.accent_color,
    accentColorHex: resumeData.accent_color_hex,
    folderId: resumeData.folder_id,
  }

  // Measure-based A4 pages live in ResumePdfExport (.pdf-page). Do not force a
  // fixed px width here — Playwright uses preferCSSPageSize + @page 15mm.
  return (
    <>
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body > * { background: #ffffff; }
      `}</style>
      <div id="resume-root">
        <ResumePdfExport version={version} />
      </div>
    </>
  )
}
