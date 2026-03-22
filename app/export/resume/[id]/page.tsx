import { notFound } from "next/navigation"
import { verifyPdfToken } from "@/lib/pdf-token"
import { supabase } from "@/lib/supabase/client"
import { ResumePreview } from "@/components/resume-preview"
import type { ResumeVersion } from "@/lib/types"
import sharp from "sharp"

// Compress image to reduce PDF size - VERY aggressive compression
async function compressImage(imageData: string | null, maxWidth: number = 150): Promise<string | null> {
  if (!imageData) return null
  
  try {
    // Extract base64 data from data URL
    const matches = imageData.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/)
    if (!matches) {
      console.log("[v0] Image is not a data URL, skipping compression")
      return imageData
    }
    
    const base64Data = matches[2]
    const originalSize = base64Data.length
    console.log(`[v0] Original image size: ${Math.round(originalSize / 1024)}KB`)
    
    const buffer = Buffer.from(base64Data, "base64")
    
    // Very aggressive compression with sharp
    const compressed = await sharp(buffer)
      .resize(maxWidth, maxWidth, { 
        fit: "inside", 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 50,  // Lower quality for smaller size
        progressive: true,
        mozjpeg: true  // Better compression
      })
      .toBuffer()
    
    const compressedBase64 = compressed.toString("base64")
    console.log(`[v0] Compressed image size: ${Math.round(compressedBase64.length / 1024)}KB (${Math.round((1 - compressedBase64.length / originalSize) * 100)}% reduction)`)
    
    return `data:image/jpeg;base64,${compressedBase64}`
  } catch (error) {
    console.error("[v0] Image compression error:", error)
    // Return null to skip the image entirely if compression fails
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
  // Verify token
  if (!searchParams.token) {
    return notFound()
  }

  const tokenPayload = await verifyPdfToken(searchParams.token)
  if (!tokenPayload || tokenPayload.resumeId !== params.id) {
    return notFound()
  }

  // Load resume from database
  const { data: resumeData, error } = await supabase.from("resume_versions").select("*").eq("id", params.id).single()

  if (error || !resumeData) {
    return notFound()
  }

  // Compress images for smaller PDF - very small sizes
  const [compressedProfileImage, compressedCompanyLogo] = await Promise.all([
    compressImage(resumeData.profile_image, 120), // 120px max for profile photo
    compressImage(resumeData.company_logo, 150),  // 150px max for logo
  ])
  
  console.log("[v0] Profile image compressed:", compressedProfileImage ? "yes" : "no")
  console.log("[v0] Company logo compressed:", compressedCompanyLogo ? "yes" : "no")

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

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          #resume-root {
            width: 794px;
            margin: 0 auto;
          }
        `}</style>
      </head>
      <body>
        <div id="resume-root">
          <ResumePreview version={version} />
        </div>
      </body>
    </html>
  )
}
