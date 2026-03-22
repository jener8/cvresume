"use client"
import { useRef, useState, useEffect } from "react"
import { Button } from "@mui/material"
import type { ResumeVersion } from "@/types/resume"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx"
import { toast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Loader2, Download, FileText, HelpCircle, Briefcase } from "lucide-react"

interface ResumePreviewProps {
  version: ResumeVersion
  onEdit?: () => void
  onCreateCoverLetter?: () => void
}

interface Section {
  id: string
  title: string
  content: string[]
}

interface EditedResumeData {
  sections: Section[]
  contactInfo: {
    email: string
    linkedin: string
    phone: string
    address: string
    citizenship: string
    portfolio: string
    showPortfolio: boolean
    professionalTitle: string // Added professionalTitle field
    name: string // Added name field
    language: "en" | "de" // Added language field
    targetCompany: string // Added targetCompany field
    targetRole: string // Added targetRole field
    website: string // Added website field
  }
}

const convertOklchToHex = (oklchColor: string): string => {
  try {
    const match = oklchColor.match(/oklch\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)\s*\)/)
    if (!match) {
      console.error("[v0] Invalid OKLCH format:", oklchColor)
      return "#3b82f6" // Default blue color
    }

    const lightnessStr = match[1]
    let l = Number.parseFloat(lightnessStr)
    const c = Number.parseFloat(match[2])
    const h = Number.parseFloat(match[3])

    // Convert percentage to decimal if the string includes %
    if (lightnessStr.includes("%")) {
      l = l / 100
    }

    // Convert OKLCH to linear RGB
    const a = c * Math.cos((h * Math.PI) / 180)
    const b = c * Math.sin((h * Math.PI) / 180)

    let lr = l + 0.3963377774 * a + 0.2158037573 * b
    let lg = l - 0.1055613458 * a - 0.0638541728 * b
    let lb = l - 0.0894841775 * a - 1.291485548 * b

    lr = Math.pow(lr, 3)
    lg = Math.pow(lg, 3)
    lb = Math.pow(lb, 3)

    // Convert linear RGB to sRGB
    const toSRGB = (c: number) => {
      if (c <= 0.0031308) {
        return 12.92 * c
      }
      return 1.055 * Math.pow(c, 1 / 2.4) - 0.055
    }

    let r = toSRGB(3.2404542 * lr - 1.5371385 * lg - 0.4985314 * lb)
    let g = toSRGB(-0.969266 * lr + 1.8760108 * lg + 0.041556 * lb)
    let blu = toSRGB(0.0556434 * lr - 0.2040259 * lg + 1.0572252 * lb)

    // Clamp to 0-1 range
    r = Math.max(0, Math.min(1, r))
    g = Math.max(0, Math.min(1, g))
    blu = Math.min(1, blu)

    // Convert to hex
    const toHex = (n: number) =>
      Math.round(n * 255)
        .toString(16)
        .padStart(2, "0")

    const hexColor = `#${toHex(r)}${toHex(g)}${toHex(blu)}`
    console.log("[v0] Converted OKLCH to hex:", hexColor)
    return hexColor
  } catch (error) {
    console.error("[v0] Error converting oklch to hex:", error)
    return "#3b82f6" // Default blue color
  }
}

const convertColorToRGB = (element: HTMLElement, colorProperty: string): string => {
  const computed = window.getComputedStyle(element)
  const value = computed.getPropertyValue(colorProperty)

  // Browser returns rgb() or rgba() format even if source was oklch()
  if (value.startsWith("rgb")) {
    return value
  }

  // Fallback for edge cases
  const tempDiv = document.createElement("div")
  tempDiv.style.color = value
  document.body.appendChild(tempDiv)
  const computedColor = window.getComputedStyle(tempDiv).color
  document.body.removeChild(tempDiv)
  return computedColor || "rgb(0, 0, 0)"
}

const convertAllColorsToRGB = (element: HTMLElement, accentHexColor: string) => {
  // Convert accent color hex to RGB for comparison
  const tempDiv = document.createElement("div")
  tempDiv.style.color = accentHexColor
  document.body.appendChild(tempDiv)
  const accentRGB = window.getComputedStyle(tempDiv).color
  document.body.removeChild(tempDiv)

  // Recursively process all elements
  const processElement = (el: HTMLElement) => {
    const computed = window.getComputedStyle(el)

    // Convert color properties to RGB
    const colorValue = computed.color
    if (colorValue && colorValue !== "rgb(0, 0, 0)") {
      el.style.color = convertColorToRGB(el, "color")
    }

    const bgColor = computed.backgroundColor
    if (bgColor && bgColor !== "rgba(0, 0, 0, 0)") {
      el.style.backgroundColor = convertColorToRGB(el, "background-color")
    }

    const borderColor = computed.borderColor
    if (borderColor && borderColor !== "rgb(0, 0, 0)") {
      el.style.borderColor = convertColorToRGB(el, "border-color")
    }

    const outlineColor = computed.outlineColor
    if (outlineColor && outlineColor !== "rgb(0, 0, 0)") {
      el.style.outlineColor = convertColorToRGB(el, "outline-color")
    }

    // Check for accent color usage via CSS variables or classes
    const classList = Array.from(el.classList)
    const usesAccent = classList.some(
      (cls) => cls.includes("accent") || cls.includes("border-[") || cls.includes("bg-[") || cls.includes("text-["),
    )

    if (usesAccent) {
      // Apply the accent color as RGB
      if (el.style.borderColor) el.style.borderColor = accentRGB
      if (el.style.backgroundColor) el.style.backgroundColor = accentRGB
      if (el.style.color && colorValue !== "rgb(0, 0, 0)") el.style.color = accentRGB
    }

    // Process children
    Array.from(el.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        processElement(child)
      }
    })
  }

  processElement(element)
}

const convertColorToRgb = (color: string): string => {
  const temp = document.createElement("div")
  temp.style.color = color
  document.body.appendChild(temp)
  const computedColor = window.getComputedStyle(temp).color
  document.body.removeChild(temp)
  return computedColor // Returns "rgb(r, g, b)"
}

const ensureRGBColor = (color: string): string => {
  // If it's already a hex color, return it
  if (color.startsWith("#")) {
    return color
  }

  // If it contains OKLCH, convert it
  if (color.includes("oklch")) {
    return convertOklchToHex(color)
  }

  // For any other format, use browser to convert to RGB
  const tempDiv = document.createElement("div")
  tempDiv.style.color = color
  document.body.appendChild(tempDiv)
  const computedColor = window.getComputedStyle(tempDiv).color
  document.body.removeChild(tempDiv)

  // Convert rgb(r, g, b) to hex
  if (computedColor.startsWith("rgb")) {
    const match = computedColor.match(/\d+/g)
    if (match && match.length >= 3) {
      const r = Number.parseInt(match[0])
      const g = Number.parseInt(match[1])
      const b = Number.parseInt(match[2])
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    }
  }

  return "#3b82f6" // Default blue color
}

type ViewMode = "human" | "ats-styled" | "ats-text"
type HumanFormatStyle = "current" | "executive-compact" | "modern-spacious"

// Style configurations for each Human format style
const formatStyles = {
  current: {
    lineHeight: 1.6,
    sectionSpacing: 24,
    baseFontSize: 14,
    headerStyle: "uppercase" as const,
    headerWeight: "bold",
    bulletIndent: 20,
    dividerWidth: 2,
    containerPadding: 48,
    sectionHeaderMargin: "24px 0 12px 0",
    bulletMargin: 8,
    titleDateLayout: "stacked" as const,
  },
  "executive-compact": {
    lineHeight: 1.4,
    sectionSpacing: 12,
    baseFontSize: 10,
    headerStyle: "uppercase" as const,
    headerWeight: "bold",
    bulletIndent: 12,
    dividerWidth: 1,
    containerPadding: 32,
    sectionHeaderMargin: "16px 0 8px 0",
    bulletMargin: 4,
    titleDateLayout: "inline" as const,
  },
  "modern-spacious": {
    lineHeight: 1.8,
    sectionSpacing: 32,
    baseFontSize: 12,
    headerStyle: "lowercase" as const,
    headerWeight: "300",
    bulletIndent: 24,
    dividerWidth: 3,
    containerPadding: 56,
    sectionHeaderMargin: "32px 0 16px 0",
    bulletMargin: 12,
    titleDateLayout: "stacked" as const,
  },
}

export function ResumePreview({ version, onEdit, onCreateCoverLetter }: ResumePreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<EditedResumeData | null>(null)
  const [draggedSection, setDraggedSection] = useState<number | null>(null)
  const [draggedOver, setDraggedOver] = useState<number | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false) // Renamed from isDownloadingPDF for clarity
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false) // New state for PDF download
  const [viewMode, setViewMode] = useState<ViewMode>("human")
  const [humanFormatStyle, setHumanFormatStyle] = useState<HumanFormatStyle>("current")
  const [savedJobDescription, setSavedJobDescription] = useState<string>("")
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Load job description from sessionStorage on mount
  useEffect(() => {
    const storedJobDescription = sessionStorage.getItem("pendingJobDescription")
    if (storedJobDescription) {
      setSavedJobDescription(storedJobDescription)
    }
  }, [])

  const accentColor = version.accentColor || "oklch(74% 0.10 81)"
  const hexAccentColor = ensureRGBColor(version.accentColorHex || accentColor)

  console.log("[v0] Accent color prop changed:", accentColor)
  console.log("[v0] Hex accent color for PDF:", hexAccentColor)

  const parseResumeForEditing = () => {
    const lines = version.resumeText.split("\n")
    const processedContent: Section[] = []
    const headers: string[] = []
    let currentSection: Section | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (!line) {
        if (currentSection) {
          processedContent.push({ ...currentSection })
          currentSection = null
        }
        continue
      }

      const isHeader = line === line.toUpperCase() && line.length > 2 && line.length < 50
      const commonSections = ["EXPERIENCE", "EDUCATION", "SKILLS", "PROJECTS", "CERTIFICATIONS", "SUMMARY", "ABOUT"]
      const isSectionHeader = isHeader || commonSections.some((s) => line.toUpperCase().includes(s))

      if (isSectionHeader && i > 3) {
        if (currentSection) {
          processedContent.push({ ...currentSection })
        }
        currentSection = { id: Date.now().toString() + Math.random(), title: line, content: [] }
      } else if (currentSection) {
        currentSection.content.push(line)
      } else {
        headers.push(line)
      }
    }

    if (currentSection) {
      processedContent.push(currentSection)
    }

    setEditedData({ sections: processedContent, contactInfo: version.contactInfo })
    setIsEditing(true)
  }

  const saveEditedContent = () => {
    if (!editedData) return

    const sections: string[] = []

    editedData.sections.forEach((section) => {
      const lines: string[] = [section.title, ...section.content]
      sections.push(lines.join("\n"))
    })

    version.onResumeTextChange?.(sections.join("\n\n"))
    version.onContactInfoChange?.(editedData.contactInfo)
    setIsEditing(false)
  }

  const handleDownloadPDF = async () => {
    console.log("[v0] Download PDF clicked - Generating image")

    if (!contentRef.current) {
      console.error("[v0] Preview ref not found")
      alert("Preview not found. Please ensure the resume is visible.")
      return
    }

    const originalElement = contentRef.current

    const tempContainer = document.createElement("div")
    tempContainer.style.position = "fixed"
    tempContainer.style.left = "-9999px"
    tempContainer.style.top = "0"
    tempContainer.style.width = "816px"
    tempContainer.style.backgroundColor = "#ffffff"
    tempContainer.style.padding = "0"
    tempContainer.style.margin = "0"
    document.body.appendChild(tempContainer)

    const clonedElement = originalElement.cloneNode(true) as HTMLElement
    clonedElement.style.width = "816px"
    clonedElement.style.maxWidth = "816px"
    clonedElement.style.minWidth = "816px"
    clonedElement.style.padding = "0"
    clonedElement.style.margin = "0"
    clonedElement.style.border = "none"
    clonedElement.style.boxSizing = "border-box"
    tempContainer.appendChild(clonedElement)

    try {
      setIsGeneratingPDF(true)

      await new Promise((resolve) => setTimeout(resolve, 100))

      console.log("[v0] Loading html2canvas library")
      console.log("[v0] html2canvas loaded successfully")

      console.log("[v0] Generating canvas from element")
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: true,
        width: clonedElement.scrollWidth,
        height: clonedElement.scrollHeight,
        windowWidth: 816,
        x: 0,
        y: 0,
      })

      console.log("[v0] Canvas created:", canvas.width, "x", canvas.height)

      document.body.removeChild(tempContainer)

      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("[v0] Failed to create blob from canvas")
          alert("Failed to create image blob. Please try again.")
          setIsGeneratingPDF(false)
          return
        }

        console.log("[v0] Blob created, size:", blob.size, "bytes")

        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "resume.png"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setTimeout(() => {
          URL.revokeObjectURL(url)
        }, 100)

        console.log("[v0] Image downloaded successfully")
        setIsGeneratingPDF(false)
      }, "image/png")
    } catch (error) {
      console.error("[v0] Error generating image:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      alert(`Failed to generate image: ${errorMessage}. Please try again or check your browser console for details.`)
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer)
      }
      setIsGeneratingPDF(false)
    }
  }

  const downloadPDF = async () => {
    try {
      setIsDownloadingPDF(true)

      const element = contentRef.current
      if (!element) {
        throw new Error("Resume preview element not found")
      }

      // Convert accent color to hex for PDF compatibility
      const rgbAccentColor = hexAccentColor.startsWith("#") ? hexAccentColor : "#C9975B"

      // Create a new window for printing
      const printWindow = window.open("", "_blank", "width=800,height=600")
      if (!printWindow) {
        throw new Error("Could not open print window. Please allow popups.")
      }

      // Clone and process the content
      const clone = element.cloneNode(true) as HTMLElement
      
      // Replace OKLCH colors
      const walkAndReplaceColors = (el: HTMLElement) => {
        const style = el.getAttribute("style") || ""
        if (style.includes("oklch")) {
          el.setAttribute("style", style.replace(/oklch\([^)]+\)/gi, rgbAccentColor))
        }
        Array.from(el.children).forEach((child) => {
          if (child instanceof HTMLElement) {
            walkAndReplaceColors(child)
          }
        })
      }
      walkAndReplaceColors(clone)

      // Build the print document - measure content first, then set exact page size
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${version.name || "Resume"}</title>
          <style id="page-style">
            /* Initial page style - will be updated after measuring */
            @page {
              size: 8.5in 11in;
              margin: 0;
            }
            
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            html {
              margin: 0;
              padding: 0;
              width: 8.5in;
              background: white;
            }
            
            body {
              margin: 0;
              padding: 40px;
              width: 8.5in;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
              font-size: 11px;
              line-height: 1.4;
              color: #000;
              background: white;
            }
            
            .resume-container {
              width: 100%;
              background: white;
            }
            
            a {
              color: ${rgbAccentColor};
              text-decoration: underline;
            }
            
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="resume-container">
            ${clone.innerHTML}
          </div>
          <script>
            window.onload = function() {
              // Measure actual content height after rendering
              setTimeout(function() {
                const body = document.body;
                const contentHeight = body.scrollHeight;
                
                // Add small padding (40px) and convert to inches (96 DPI)
                const pageHeightPx = contentHeight + 40;
                const pageHeightIn = (pageHeightPx / 96).toFixed(2);
                
                // Update @page rule with exact content height
                const styleEl = document.getElementById('page-style');
                styleEl.textContent = styleEl.textContent.replace(
                  /size: 8\\.5in 11in;/,
                  'size: 8.5in ' + pageHeightIn + 'in;'
                );
                
                // Also add print media query with same size
                const printStyle = document.createElement('style');
                printStyle.textContent = '@media print { @page { size: 8.5in ' + pageHeightIn + 'in; margin: 0; } }';
                document.head.appendChild(printStyle);
                
                // Trigger print after style update
                setTimeout(function() {
                  window.print();
                }, 100);
              }, 300);
            };
          </script>
        </body>
        </html>
      `

      printWindow.document.write(printContent)
      printWindow.document.close()

      toast({
        title: "Print Dialog Opened",
        description: "Select 'Save as PDF' in the print dialog to download your ATS-friendly PDF with selectable text and clickable links.",
      })
    } catch (error) {
      console.error("[v0] PDF generation error:", error)
      toast({
        title: "PDF Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  const downloadWord = async () => {
    try {
      console.log("[v0] Generating Word document")

      const sections: any[] = []

      sections.push(
        new Paragraph({
          text: version.contactInfo.name || "Your Name",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
      )

      if (version.contactInfo.professionalTitle) {
        sections.push(
          new Paragraph({
            text: version.contactInfo.professionalTitle,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
        )
      }

      const contactParts = []
      if (version.contactInfo.email) contactParts.push(version.contactInfo.email)
      if (version.contactInfo.phone) contactParts.push(version.contactInfo.phone)
      if (version.contactInfo.address) contactParts.push(version.contactInfo.address)
      if (version.contactInfo.linkedin) contactParts.push(version.contactInfo.linkedin)

      if (contactParts.length > 0) {
        sections.push(
          new Paragraph({
            text: contactParts.join(" | "),
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
        )
      }

      const lines = version.resumeText.split("\n")

      for (const line of lines) {
        if (!line.trim()) {
          sections.push(new Paragraph({ text: "" }))
          continue
        }

        if (line.startsWith("##")) {
          sections.push(
            new Paragraph({
              text: line.replace("##", "").trim(),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
          )
        } else if (line === line.toUpperCase() && line.length > 3) {
          sections.push(
            new Paragraph({
              text: line,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
            }),
          )
        } else if (line.startsWith("- ") || line.startsWith("• ")) {
          sections.push(
            new Paragraph({
              text: line.replace(/^[-•]\s*/, ""),
              bullet: { level: 0 },
              spacing: { after: 100 },
            }),
          )
        } else if (line.includes("**") || line.includes("*")) {
          const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g)
          const textRuns = parts.map((part) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return new TextRun({ text: part.replace(/\*\*/g, ""), bold: true })
            } else if (part.startsWith("*") && part.endsWith("*")) {
              return new TextRun({ text: part.replace(/\*/g, ""), italics: true })
            }
            return new TextRun({ text: part })
          })

          sections.push(
            new Paragraph({
              children: textRuns,
              spacing: { after: 100 },
            }),
          )
        } else {
          sections.push(
            new Paragraph({
              text: line,
              spacing: { after: 100 },
            }),
          )
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: sections,
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${version.contactInfo.name || "resume"}_CV.docx`
      link.click()
      window.URL.revokeObjectURL(url)

      console.log("[v0] Word document generated successfully")
    } catch (error) {
      console.error("[v0] Error generating Word document:", error)
    }
  }

  const viewSections = parseResumeText(version.resumeText)

  const isProfileSection = (title: string) => {
    const normalized = title.toUpperCase().trim()
    return (
      normalized.includes("PROFILE") ||
      normalized.includes("PROFIL") ||
      normalized.includes("SUMMARY") ||
      normalized.includes("ABOUT")
    )
  }

  const isSubsectionHeader = (
    line: string,
    sectionTitle: string,
    previousLine?: string,
    nextLine?: string,
  ): { type: "company" | "location" | "date" | "position" | "degree" | "institution" | "bullet" } => {
    const normalized = sectionTitle.toUpperCase().trim()

    if (
      normalized.includes("EXPERIENCE") ||
      normalized.includes("ERFAHRUNG") ||
      normalized.includes("BERUFSSTATIONEN") ||
      normalized.includes("BERUF") ||
      normalized.includes("DESIGNER") ||
      normalized.includes("CONSULTANT") ||
      normalized.includes("STRATEGIST") ||
      normalized.includes("SPECIALIST") ||
      normalized.includes("MANAGER") ||
      normalized.includes("DEVELOPER") ||
      normalized.includes("ENGINEER")
    ) {
      if (
        /^[\w\s]+ \d{4}\s*[–—-]\s*[\w\s\d]+$/i.test(line) ||
        /^\d{4}\s*[–—-]\s*\d{4}$/i.test(line) ||
        /^(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/i.test(
          line,
        )
      ) {
        return { type: "date" }
      }

      if (line.includes(",") && line.split(",").length === 2 && line.length < 50 && !/\d{4}/.test(line)) {
        return { type: "location" }
      }

      if (line === line.toUpperCase() && line.length > 15 && line.length < 100 && !line.includes(",")) {
        return { type: "position" }
      }

      if (
        /^[A-ZÄÖÜ]/.test(line) &&
        line !== line.toUpperCase() &&
        line.length > 3 &&
        !line.includes(",") &&
        !line.includes("–") &&
        !line.includes("•")
      ) {
        return { type: "company" }
      }
    }

    if (
      normalized.includes("EDUCATION") ||
      normalized.includes("AUSBILDUNG") ||
      normalized.includes("STUDIEN") ||
      normalized.includes("MASTER") ||
      normalized.includes("BACHELOR")
    ) {
      if (/^[A-ZÄÖÜ]/.test(line) && line.length > 3 && !line.includes(",") && !line.includes("–")) {
        return { type: "institution" }
      }

      if (
        /^[A-ZÄÖÜ]/.test(line) &&
        line.length > 3 &&
        (line.includes("Bachelor") || line.includes("Master") || line.includes("Diplom") || line.includes("PhD"))
      ) {
        return { type: "degree" }
      }
    }

    if (line.startsWith("•") || line.startsWith("-") || (line.length > 30 && line.includes(" "))) {
      return { type: "bullet" }
    }

    return { type: "default" }
  }

  const renderUniversalMarkdown = (lines: string[]): string => {
    const style = formatStyles[humanFormatStyle]
    // Use hexAccentColor directly for consistent color rendering
    // hexAccentColor is already computed and validated at the component level
    const accentColorForHTML = hexAccentColor

    let html = ""
    let inBulletList = false

    for (const line of lines) {
      // Normalize the line - replace any unicode hash-like characters with standard ASCII #
      const normalizedLine = line
        .replace(/[\uFF03\u2317\u266F\uFE5F]/g, "#")
        .replace(/[\u00A0\u2003\u2002\u2009\u200B\u202F\uFEFF]/g, " ")
        .replace(/[–—―‐‑‒−]/g, "-")

      const trimmedLine = normalizedLine.trim()

      if (trimmedLine.startsWith("###")) {
        if (inBulletList) {
          html += "</ul>"
          inBulletList = false
        }
        const text = trimmedLine.slice(3).trim()
        const dateFontSize = style.baseFontSize
        html += `<p style="font-size: ${dateFontSize}px; font-weight: 400; margin: ${style.bulletMargin}px 0; color: #666666; font-style: italic; line-height: ${style.lineHeight};">${text}</p>`
        continue
      }

      if (trimmedLine.startsWith("##") && !trimmedLine.startsWith("###")) {
        if (inBulletList) {
          html += "</ul>"
          inBulletList = false
        }
        const text = trimmedLine.slice(2).trim()
        const companyFontSize = style.baseFontSize + 2
        html += `<p style="font-size: ${companyFontSize}px; font-weight: 700; margin: ${style.bulletMargin}px 0; color: #000000; line-height: ${style.lineHeight};">${text}</p>`
        continue
      }

      if (trimmedLine.startsWith("#") && !trimmedLine.startsWith("##")) {
        if (inBulletList) {
          html += "</ul>"
          inBulletList = false
        }
        const text = trimmedLine.slice(1).trim()
        const titleFontSize = style.baseFontSize + 4
        const textTransform = style.headerStyle === "uppercase" ? "uppercase" : "none"
        html += `<p style="font-size: ${titleFontSize}px; font-weight: ${style.headerWeight}; margin: ${style.sectionSpacing / 2}px 0 ${style.bulletMargin}px 0; color: ${accentColorForHTML}; text-transform: ${textTransform}; line-height: ${style.lineHeight};">${text}</p>`
        continue
      }

      if (trimmedLine.startsWith("-") || trimmedLine.startsWith("•")) {
        const text = trimmedLine.slice(1).trim()
        if (!inBulletList) {
          html += `<ul style="margin: ${style.bulletMargin}px 0; padding-left: 0; list-style-type: none;">`
          inBulletList = true
        }
        
        // Different bullet styles per format:
        // Current Design: standard bullet
        // Executive Compact: small circle
        // Modern Spacious: colored square
        let bulletSymbol = "•"
        let bulletColor = "#000000"
        let bulletSize = "1em"
        
        if (humanFormatStyle === "executive-compact") {
          bulletSymbol = "○"
          bulletColor = "#666666"
          bulletSize = "0.7em"
        } else if (humanFormatStyle === "modern-spacious") {
          bulletSymbol = "■"
          bulletColor = accentColorForHTML
          bulletSize = "0.6em"
        }
        
html += `<li style="margin: ${style.bulletMargin / 2}px 0; padding-left: ${style.bulletIndent}px; line-height: ${style.lineHeight}; position: relative;">`
html += `<span style="position: absolute; left: 0; top: 0; line-height: ${style.lineHeight}; font-size: ${bulletSize}; color: ${bulletColor};">${bulletSymbol}</span>`
        html += text
        html += `</li>`
        continue
      }

      if (inBulletList) {
        html += "</ul>"
        inBulletList = false
      }
      html += `<p style="font-size: ${style.baseFontSize}px; margin: ${style.bulletMargin}px 0; line-height: ${style.lineHeight}; color: #000000;">${normalizedLine}</p>`
    }

    if (inBulletList) {
      html += "</ul>"
    }

    return html
  }

  const renderDefaultHTML = (lines: string[]): string => {
    return renderUniversalMarkdown(lines)
  }

  const renderExperienceHTML = (lines: string[]): string => {
    // Debug: log lines containing ### to see what's being passed
    const dateLines = lines.filter(l => l.includes("###") || l.includes("# "))
    if (dateLines.length > 0) {
      console.log("[v0] renderExperienceHTML - lines with markup:", dateLines.map(l => JSON.stringify(l.substring(0, 40))))
    }
    return renderUniversalMarkdown(lines)
  }

  const renderEducationHTML = (lines: string[]): string => {
    return renderUniversalMarkdown(lines)
  }

  const renderProfileHTML = (lines: string[]): string => {
    return renderUniversalMarkdown(lines)
  }

  const renderFullResumeHTML = (): string => {
    const style = formatStyles[humanFormatStyle]
    const name = version.contactInfo.name || "Your Name"
    const professionalTitle = version.contactInfo.professionalTitle || ""
    
    const labels =
      version.contactInfo.language === "de"
        ? {
            email: "E-Mail",
            linkedin: "LinkedIn",
            phone: "Telefon",
            citizenship: "Staatsangehörigkeit",
            portfolio: "Portfolio",
            location: "Wohnort",
          }
        : {
            email: "Email",
            linkedin: "LinkedIn",
            phone: "Phone",
            citizenship: "Citizenship",
            portfolio: "Portfolio",
            location: "Location",
          }

    // ====== FORMAT 1: CURRENT DESIGN (default) ======
    if (humanFormatStyle === "current") {
      const profileImageSize = 124
      const nameFontSize = 32
      const contactFontSize = 13
      const titleFontSize = 16
      const sectionHeaderSize = 16
      
      const showPhotoBorder = version.profilePhotoBorder !== false
      const profileImageHTML = version.profileImage
        ? `<img src="${version.profileImage}" alt="Profile" crossorigin="anonymous" style="width: ${profileImageSize}px; height: ${profileImageSize}px; border-radius: 50%; object-fit: cover;${showPhotoBorder ? ` border: 1.5px solid ${hexAccentColor};` : ""}" />`
        : ""
      
      const companyLogoHTML = version.companyLogo
        ? `<img src="${version.companyLogo}" alt="Company Logo" crossorigin="anonymous" style="max-width: 250px; max-height: 100px; object-fit: contain; opacity: 0.9;" />`
        : ""
      
      const headerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: ${style.sectionSpacing}px;">
          <div style="display: flex; gap: 24px; align-items: center;">
            ${profileImageHTML}
            <div>
              <h1 style="font-size: ${nameFontSize}px; font-weight: bold; margin: 0 0 8px 0; color: #000000; line-height: ${style.lineHeight};">${name}</h1>
              ${professionalTitle ? `<p style="font-size: ${titleFontSize}px; font-weight: 600; margin: 0 0 16px 0; color: ${hexAccentColor}; line-height: ${style.lineHeight};">${professionalTitle}</p>` : ""}
              ${version.contactInfo.address ? `<p style="font-size: ${contactFontSize}px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.location}: ${version.contactInfo.address}</p>` : ""}
              ${version.contactInfo.email ? `<p style="font-size: ${contactFontSize}px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.email}: ${version.contactInfo.email}</p>` : ""}
              ${version.contactInfo.linkedin ? `<p style="font-size: ${contactFontSize}px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.linkedin}: <a href="${version.contactInfo.linkedin.startsWith("http") ? version.contactInfo.linkedin : `https://${version.contactInfo.linkedin}`}" target="_blank" style="color: ${hexAccentColor}; text-decoration: underline;">${version.contactInfo.linkedin}</a></p>` : ""}
              ${version.contactInfo.phone ? `<p style="font-size: ${contactFontSize}px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.phone}: ${version.contactInfo.phone}</p>` : ""}
              ${version.contactInfo.citizenship ? `<p style="font-size: ${contactFontSize}px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.citizenship}: ${version.contactInfo.citizenship}</p>` : ""}
              ${version.contactInfo.showPortfolio && version.contactInfo.portfolio ? `<p style="font-size: ${contactFontSize}px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.portfolio}: <a href="${version.contactInfo.portfolio.startsWith("http") ? version.contactInfo.portfolio : `https://${version.contactInfo.portfolio}`}" target="_blank" style="color: ${hexAccentColor}; text-decoration: underline;">${version.contactInfo.portfolio}</a></p>` : ""}
            </div>
          </div>
        </div>
      `
      
      const targetBgColor = version.targetBoxBgColor || "#f8f9fa"
      const targetBorderColor = version.targetBoxBorderColor || hexAccentColor
      
      const applicationTargetHTML =
        version.contactInfo.targetCompany || version.contactInfo.targetRole
          ? `
        <div style="margin-bottom: ${style.sectionSpacing}px; padding: 16px; background-color: ${targetBgColor}; border-left: 4px solid ${targetBorderColor}; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="flex: 1; min-width: 0;">
            ${version.contactInfo.targetCompany ? `<p style="font-size: 18px; font-weight: bold; margin: 0 0 4px 0; color: #000000;">${version.contactInfo.targetCompany}</p>` : ""}
            ${version.contactInfo.targetRole ? `<p style="font-size: ${titleFontSize}px; font-weight: 600; margin: 0; color: ${hexAccentColor};">${version.contactInfo.targetRole.replace(/\n/g, "<br>")}</p>` : ""}
          </div>
          ${companyLogoHTML ? `<div style="flex-shrink: 0; max-width: 80px;">${companyLogoHTML.replace('max-width: 250px; max-height: 100px', 'max-width: 80px; max-height: 60px')}</div>` : ""}
        </div>
      `
          : ""
      
      const sectionsHTML = viewSections
        .filter((section) => section.title !== "")
        .map((section) => {
          const sectionTitleHTML = section.title
            ? `<h2 style="font-size: ${sectionHeaderSize}px; font-weight: bold; text-transform: uppercase; margin: ${style.sectionHeaderMargin}; padding-bottom: 8px; border-bottom: 2px solid ${hexAccentColor}; color: #000000;">${section.title}</h2>`
            : ""
          
          let sectionContentHTML = ""
          if (isProfileSection(section.title)) {
            sectionContentHTML = renderProfileHTML(section.content)
          } else if (isExperienceSection(section.title)) {
            sectionContentHTML = renderExperienceHTML(section.content)
          } else if (isEducationSection(section.title)) {
            sectionContentHTML = renderEducationHTML(section.content)
          } else {
            sectionContentHTML = renderDefaultHTML(section.content)
          }
          
          return `<div style="margin-bottom: ${style.sectionSpacing}px;">${sectionTitleHTML}${sectionContentHTML}</div>`
        })
        .join("")
      
      return `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: ${style.baseFontSize}px; line-height: ${style.lineHeight}; color: #000000; background: white; padding: ${style.containerPadding}px;">
          ${headerHTML}
          ${applicationTargetHTML}
          ${sectionsHTML}
        </div>
      `
    }
    
    // ====== FORMAT 2: EXECUTIVE COMPACT ======
    if (humanFormatStyle === "executive-compact") {
      // Avatar: Small (60px), square with rounded corners, LEFT of name
      // Company logo: Small (40px), inline next to company name in job sections
      // Name: Large, bold, ALL CAPS
      // Job title tagline: Centered below name, italic, colored
      // Contact info: Horizontal row with icons, below everything
      // Section headers: Uppercase, no underline, colored background bar
      // Bullet points: Small circles
      
    const showPhotoBorder = version.profilePhotoBorder !== false
    const profileImageHTML = version.profileImage
    ? `<img src="${version.profileImage}" alt="Profile" crossorigin="anonymous" style="width: 60px; height: 60px; border-radius: 8px; object-fit: cover;${showPhotoBorder ? ` border: 2px solid ${hexAccentColor};` : ""}" />`
    : ""
      
      // Build contact items for horizontal row
      const contactItems: string[] = []
      if (version.contactInfo.email) contactItems.push(`<span style="display: inline-flex; align-items: center; gap: 4px;">&#9993; ${version.contactInfo.email}</span>`)
      if (version.contactInfo.phone) contactItems.push(`<span style="display: inline-flex; align-items: center; gap: 4px;">&#9742; ${version.contactInfo.phone}</span>`)
      if (version.contactInfo.address) contactItems.push(`<span style="display: inline-flex; align-items: center; gap: 4px;">&#9906; ${version.contactInfo.address}</span>`)
      if (version.contactInfo.linkedin) contactItems.push(`<span style="display: inline-flex; align-items: center; gap: 4px;">&#128279; <a href="${version.contactInfo.linkedin.startsWith("http") ? version.contactInfo.linkedin : `https://${version.contactInfo.linkedin}`}" target="_blank" style="color: ${hexAccentColor}; text-decoration: none;">LinkedIn</a></span>`)
      if (version.contactInfo.showPortfolio && version.contactInfo.portfolio) contactItems.push(`<span style="display: inline-flex; align-items: center; gap: 4px;">&#127760; <a href="${version.contactInfo.portfolio.startsWith("http") ? version.contactInfo.portfolio : `https://${version.contactInfo.portfolio}`}" target="_blank" style="color: ${hexAccentColor}; text-decoration: none;">${version.contactInfo.portfolio}</a></span>`)
      
      const headerHTML = `
        <div style="margin-bottom: 16px;">
          <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 8px;">
            ${profileImageHTML}
            <div>
              <h1 style="font-size: 28px; font-weight: 800; margin: 0; color: #000000; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">${name}</h1>
            </div>
          </div>
          ${professionalTitle ? `<p style="font-size: 14px; font-weight: 500; margin: 8px 0; color: ${hexAccentColor}; font-style: italic; text-align: center; line-height: 1.4;">${professionalTitle}</p>` : ""}
          ${contactItems.length > 0 ? `<div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; font-size: 10px; color: #444444; margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">${contactItems.join("")}</div>` : ""}
        </div>
      `
      
      const applicationTargetHTML =
        version.contactInfo.targetCompany || version.contactInfo.targetRole
          ? `
        <div style="margin-bottom: 12px; padding: 8px 12px; background-color: ${hexAccentColor}15; border-radius: 4px;">
          ${version.contactInfo.targetCompany ? `<span style="font-size: 12px; font-weight: bold; color: #000000;">${version.contactInfo.targetCompany}</span>` : ""}
          ${version.contactInfo.targetCompany && version.contactInfo.targetRole ? ` - ` : ""}
          ${version.contactInfo.targetRole ? `<span style="font-size: 12px; font-weight: 600; color: ${hexAccentColor};">${version.contactInfo.targetRole.replace(/\n/g, "<br>")}</span>` : ""}
        </div>
      `
          : ""
      
      const sectionsHTML = viewSections
        .filter((section) => section.title !== "")
        .map((section) => {
          // Section headers: Uppercase, no underline, colored background bar
          const sectionTitleHTML = section.title
            ? `<h2 style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin: 12px 0 8px 0; padding: 4px 8px; background-color: ${hexAccentColor}20; color: #000000; border-left: 3px solid ${hexAccentColor};">${section.title}</h2>`
            : ""
          
          let sectionContentHTML = ""
          if (isProfileSection(section.title)) {
            sectionContentHTML = renderProfileHTML(section.content)
          } else if (isExperienceSection(section.title)) {
            sectionContentHTML = renderExperienceHTML(section.content)
          } else if (isEducationSection(section.title)) {
            sectionContentHTML = renderEducationHTML(section.content)
          } else {
            sectionContentHTML = renderDefaultHTML(section.content)
          }
          
          return `<div style="margin-bottom: 12px;">${sectionTitleHTML}${sectionContentHTML}</div>`
        })
        .join("")
      
      return `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: ${style.baseFontSize}px; line-height: ${style.lineHeight}; color: #000000; background: white; padding: ${style.containerPadding}px;">
          ${headerHTML}
          ${applicationTargetHTML}
          ${sectionsHTML}
        </div>
      `
    }
    
    // ====== FORMAT 3: MODERN SPACIOUS ======
    // Avatar: Large (120px), circular, centered above name
    // Company logo: Not shown in header (only in job sections)
    // Name: Extra large, thin weight, lowercase
    // Job title tagline: Left-aligned below name, bold, black
    // Contact info: Vertical list on right side of header, no icons
    // Section headers: Lowercase, thick colored underline below
    // Bullet points: Colored squares
    
    const showPhotoBorder = version.profilePhotoBorder !== false
    const profileImageHTML = version.profileImage
    ? `<img src="${version.profileImage}" alt="Profile" crossorigin="anonymous" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover;${showPhotoBorder ? ` border: 2px solid ${hexAccentColor};` : ""}" />`
    : ""
    
    // Build contact items for vertical list (no icons)
    const contactItems: string[] = []
    if (version.contactInfo.email) contactItems.push(`<p style="margin: 6px 0; font-size: 12px; color: #333333;">${version.contactInfo.email}</p>`)
    if (version.contactInfo.phone) contactItems.push(`<p style="margin: 6px 0; font-size: 12px; color: #333333;">${version.contactInfo.phone}</p>`)
    if (version.contactInfo.address) contactItems.push(`<p style="margin: 6px 0; font-size: 12px; color: #333333;">${version.contactInfo.address}</p>`)
    if (version.contactInfo.linkedin) contactItems.push(`<p style="margin: 6px 0; font-size: 12px;"><a href="${version.contactInfo.linkedin.startsWith("http") ? version.contactInfo.linkedin : `https://${version.contactInfo.linkedin}`}" target="_blank" style="color: ${hexAccentColor}; text-decoration: none;">${version.contactInfo.linkedin}</a></p>`)
    if (version.contactInfo.showPortfolio && version.contactInfo.portfolio) contactItems.push(`<p style="margin: 6px 0; font-size: 12px;"><a href="${version.contactInfo.portfolio.startsWith("http") ? version.contactInfo.portfolio : `https://${version.contactInfo.portfolio}`}" target="_blank" style="color: ${hexAccentColor}; text-decoration: none;">${version.contactInfo.portfolio}</a></p>`)
    
    const headerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: ${style.sectionSpacing}px; padding-bottom: ${style.sectionSpacing}px; border-bottom: 4px solid ${hexAccentColor};">
        <div style="display: flex; flex-direction: column; align-items: flex-start;">
          <div style="text-align: center; margin-bottom: 16px;">
            ${profileImageHTML}
          </div>
          <h1 style="font-size: 42px; font-weight: 300; margin: 0 0 8px 0; color: #000000; line-height: 1.1;">${name.toLowerCase()}</h1>
          ${professionalTitle ? `<p style="font-size: 18px; font-weight: 700; margin: 0; color: #000000; line-height: 1.4;">${professionalTitle}</p>` : ""}
        </div>
        ${contactItems.length > 0 ? `<div style="text-align: right; padding-left: 32px;">${contactItems.join("")}</div>` : ""}
      </div>
    `
    
    const targetBgColor = version.targetBoxBgColor || "#fafafa"
    const targetBorderColor = version.targetBoxBorderColor || hexAccentColor
    
    const applicationTargetHTML =
      version.contactInfo.targetCompany || version.contactInfo.targetRole
        ? `
      <div style="margin-bottom: ${style.sectionSpacing}px; padding: 20px; background-color: ${targetBgColor}; border-left: 4px solid ${targetBorderColor};">
        ${version.contactInfo.targetCompany ? `<p style="font-size: 20px; font-weight: 300; margin: 0 0 4px 0; color: #000000;">${version.contactInfo.targetCompany}</p>` : ""}
        ${version.contactInfo.targetRole ? `<p style="font-size: 16px; font-weight: 700; margin: 0; color: #000000;">${version.contactInfo.targetRole.replace(/\n/g, "<br>")}</p>` : ""}
      </div>
    `
        : ""
    
    const sectionsHTML = viewSections
      .filter((section) => section.title !== "")
      .map((section) => {
        // Section headers: Lowercase, thick colored underline below
        const sectionTitleHTML = section.title
          ? `<h2 style="font-size: 14px; font-weight: 300; text-transform: lowercase; margin: 24px 0 16px 0; padding-bottom: 8px; border-bottom: 4px solid ${hexAccentColor}; color: #000000; display: inline-block;">${section.title.toLowerCase()}</h2>`
          : ""
        
        let sectionContentHTML = ""
        if (isProfileSection(section.title)) {
          sectionContentHTML = renderProfileHTML(section.content)
        } else if (isExperienceSection(section.title)) {
          sectionContentHTML = renderExperienceHTML(section.content)
        } else if (isEducationSection(section.title)) {
          sectionContentHTML = renderEducationHTML(section.content)
        } else {
          sectionContentHTML = renderDefaultHTML(section.content)
        }
        
        return `<div style="margin-bottom: ${style.sectionSpacing}px;">${sectionTitleHTML}<div style="clear: both;">${sectionContentHTML}</div></div>`
      })
      .join("")
    
    return `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: ${style.baseFontSize}px; line-height: ${style.lineHeight}; color: #000000; background: white; padding: ${style.containerPadding}px;">
        ${headerHTML}
        ${applicationTargetHTML}
        ${sectionsHTML}
      </div>
    `
  }
  
  // Helper functions for section type detection
  const isExperienceSection = (title: string): boolean => {
    const normalized = title.toUpperCase()
    return (
      normalized.includes("EXPERIENCE") ||
      normalized.includes("ERFAHRUNG") ||
      normalized.includes("BERUFSSTATIONEN") ||
      normalized.includes("EIGENPROJEKT") ||
      normalized.includes("FORSCHUNG") ||
      normalized.includes("PROJECT") ||
      normalized.includes("DESIGNER") ||
      normalized.includes("CONSULTANT") ||
      normalized.includes("STRATEGIST") ||
      normalized.includes("SPECIALIST") ||
      normalized.includes("MANAGER") ||
      normalized.includes("DEVELOPER") ||
      normalized.includes("ENGINEER")
    )
  }
  
  const isEducationSection = (title: string): boolean => {
    const normalized = title.toUpperCase()
    return (
      normalized.includes("EDUCATION") ||
      normalized.includes("AUSBILDUNG") ||
      normalized.includes("STUDIEN") ||
      normalized.includes("MASTER") ||
      normalized.includes("BACHELOR")
    )
  }

  // ATS-Friendly (Styled) mode - single column, no backgrounds, accent only for headings
  const renderATSStyledHTML = (): string => {
    const name = version.contactInfo.name || "Your Name"
    const professionalTitle = version.contactInfo.professionalTitle || ""

    const labels =
      version.contactInfo.language === "de"
        ? { email: "E-Mail", linkedin: "LinkedIn", phone: "Telefon", citizenship: "Staatsangehörigkeit", portfolio: "Portfolio", location: "Wohnort" }
        : { email: "Email", linkedin: "LinkedIn", phone: "Phone", citizenship: "Citizenship", portfolio: "Portfolio", location: "Location" }

    // No photo, plain text contact info
    const headerHTML = `
      <div style="margin-bottom: 24px; border-bottom: 2px solid ${hexAccentColor}; padding-bottom: 16px;">
        <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 4px 0; color: #000000;">${name}</h1>
        ${professionalTitle ? `<p style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: ${hexAccentColor};">${professionalTitle}</p>` : ""}
        <div style="font-size: 12px; color: #333333; line-height: 1.6;">
          ${version.contactInfo.address ? `${labels.location}: ${version.contactInfo.address} | ` : ""}
          ${version.contactInfo.email ? `${labels.email}: ${version.contactInfo.email} | ` : ""}
          ${version.contactInfo.phone ? `${labels.phone}: ${version.contactInfo.phone}` : ""}
          ${version.contactInfo.linkedin ? `<br/>${labels.linkedin}: <a href="${version.contactInfo.linkedin.startsWith("http") ? version.contactInfo.linkedin : `https://${version.contactInfo.linkedin}`}" target="_blank" style="color: ${hexAccentColor}; text-decoration: underline;">${version.contactInfo.linkedin}</a>` : ""}
          ${version.contactInfo.showPortfolio && version.contactInfo.portfolio ? ` | ${labels.portfolio}: <a href="${version.contactInfo.portfolio.startsWith("http") ? version.contactInfo.portfolio : `https://${version.contactInfo.portfolio}`}" target="_blank" style="color: ${hexAccentColor}; text-decoration: underline;">${version.contactInfo.portfolio}</a>` : ""}
        </div>
      </div>
    `

    // Target company/role without background
    const applicationTargetHTML =
      version.contactInfo.targetCompany || version.contactInfo.targetRole
        ? `
      <div style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e0e0e0;">
        ${version.contactInfo.targetCompany ? `<p style="font-size: 14px; font-weight: bold; margin: 0 0 2px 0; color: #000000;">Target: ${version.contactInfo.targetCompany}</p>` : ""}
        ${version.contactInfo.targetRole ? `<p style="font-size: 13px; margin: 0; color: #333333;">${version.contactInfo.targetRole.replace(/\n/g, "<br>")}</p>` : ""}
      </div>
    `
        : ""

    const renderATSMarkdown = (lines: string[]): string => {
      let html = ""
      let inBulletList = false

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // Date/period (###)
        if (trimmedLine.startsWith("###")) {
          if (inBulletList) { html += "</ul>"; inBulletList = false }
          const text = trimmedLine.slice(3).trim()
          html += `<p style="font-size: 12px; color: #666666; margin: 2px 0; font-style: italic;">${text}</p>`
          continue
        }

        // Company/institution (##)
        if (trimmedLine.startsWith("##") && !trimmedLine.startsWith("###")) {
          if (inBulletList) { html += "</ul>"; inBulletList = false }
          const text = trimmedLine.slice(2).trim()
          html += `<p style="font-size: 14px; font-weight: 700; margin: 8px 0 4px 0; color: #000000;">${text}</p>`
          continue
        }

        // Job title (#)
        if (trimmedLine.startsWith("#") && !trimmedLine.startsWith("##")) {
          if (inBulletList) { html += "</ul>"; inBulletList = false }
          const text = trimmedLine.slice(1).trim()
          html += `<p style="font-size: 13px; font-weight: 600; margin: 12px 0 4px 0; color: #333333;">${text}</p>`
          continue
        }

        // Bullet points - plain text bullets
        if (trimmedLine.startsWith("-") || trimmedLine.startsWith("•")) {
          const text = trimmedLine.slice(1).trim()
          if (!inBulletList) { html += '<ul style="margin: 4px 0; padding-left: 20px;">'; inBulletList = true }
          html += `<li style="margin: 2px 0; font-size: 13px; line-height: 1.5; color: #000000;">${text}</li>`
          continue
        }

        if (inBulletList) { html += "</ul>"; inBulletList = false }
        html += `<p style="font-size: 13px; margin: 4px 0; line-height: 1.5; color: #000000;">${trimmedLine}</p>`
      }

      if (inBulletList) html += "</ul>"
      return html
    }

    const sectionsHTML = viewSections
      .filter((section) => section.title !== "")
      .map((section) => {
        const sectionTitleHTML = section.title
          ? `<h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid ${hexAccentColor}; color: ${hexAccentColor};">${section.title}</h2>`
          : ""

        return `
          <div style="margin-bottom: 16px;">
            ${sectionTitleHTML}
            ${renderATSMarkdown(section.content)}
          </div>
        `
      })
      .join("")

    return `
      <div style="background: white; padding: 40px; max-width: 800px; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; color: #000000;">
        ${headerHTML}
        ${applicationTargetHTML}
        ${sectionsHTML}
      </div>
    `
  }

  // Full ATS (Text-only) mode - plain text, no colors, no formatting
  const renderATSTextHTML = (): string => {
    const name = version.contactInfo.name || "Your Name"
    const professionalTitle = version.contactInfo.professionalTitle || ""

    const labels =
      version.contactInfo.language === "de"
        ? { email: "E-Mail", linkedin: "LinkedIn", phone: "Telefon", citizenship: "Staatsangehörigkeit", portfolio: "Portfolio", location: "Wohnort" }
        : { email: "Email", linkedin: "LinkedIn", phone: "Phone", citizenship: "Citizenship", portfolio: "Portfolio", location: "Location" }

    // Plain text header
    const headerHTML = `
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px 0; color: #000000;">${name}</h1>
        ${professionalTitle ? `<p style="font-size: 14px; margin: 0 0 8px 0; color: #000000;">${professionalTitle}</p>` : ""}
        <p style="font-size: 12px; color: #000000; margin: 2px 0;">
          ${version.contactInfo.address ? `${version.contactInfo.address}` : ""}
        </p>
        <p style="font-size: 12px; color: #000000; margin: 2px 0;">
          ${version.contactInfo.email ? `${version.contactInfo.email}` : ""}
          ${version.contactInfo.phone ? ` | ${version.contactInfo.phone}` : ""}
        </p>
        <p style="font-size: 12px; color: #000000; margin: 2px 0;">
          ${version.contactInfo.linkedin ? `<a href="${version.contactInfo.linkedin.startsWith("http") ? version.contactInfo.linkedin : `https://${version.contactInfo.linkedin}`}" target="_blank" style="color: #000000; text-decoration: underline;">${version.contactInfo.linkedin}</a>` : ""}
          ${version.contactInfo.showPortfolio && version.contactInfo.portfolio ? ` | <a href="${version.contactInfo.portfolio.startsWith("http") ? version.contactInfo.portfolio : `https://${version.contactInfo.portfolio}`}" target="_blank" style="color: #000000; text-decoration: underline;">${version.contactInfo.portfolio}</a>` : ""}
        </p>
      </div>
    `

    const renderPlainText = (lines: string[]): string => {
      let html = ""

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // Remove all markdown markers and render as plain text
        let text = trimmedLine
        if (text.startsWith("###")) text = text.slice(3).trim()
        else if (text.startsWith("##")) text = text.slice(2).trim()
        else if (text.startsWith("#")) text = text.slice(1).trim()
        else if (text.startsWith("-") || text.startsWith("•")) text = "- " + text.slice(1).trim()

        html += `<p style="font-size: 12px; margin: 3px 0; line-height: 1.4; color: #000000;">${text}</p>`
      }

      return html
    }

    const sectionsHTML = viewSections
      .filter((section) => section.title !== "")
      .map((section) => {
        const sectionTitleHTML = section.title
          ? `<h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; margin: 16px 0 8px 0; color: #000000;">${section.title}</h2>`
          : ""

        return `
          <div style="margin-bottom: 12px;">
            ${sectionTitleHTML}
            ${renderPlainText(section.content)}
          </div>
        `
      })
      .join("")

    return `
      <div style="background: white; padding: 32px; max-width: 800px; margin: 0 auto; font-family: Arial, Helvetica, sans-serif; color: #000000;">
        ${headerHTML}
        ${sectionsHTML}
      </div>
    `
  }

  // Get the appropriate HTML based on view mode
  const getCurrentViewHTML = (): string => {
    switch (viewMode) {
      case "ats-styled":
        return renderATSStyledHTML()
      case "ats-text":
        return renderATSTextHTML()
      default:
        return renderFullResumeHTML()
    }
  }

  return (
    <div className="flex flex-col w-full">
      <div className="space-y-6 w-full pb-8">
        <div className="flex flex-col gap-4 pt-8 border-t-2 border-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-2xl font-bold">Resume Preview</h2>
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm text-muted-foreground">
                {viewSections.length} section{viewSections.length !== 1 ? "s" : ""} found
              </span>
              {savedJobDescription && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Briefcase className="h-4 w-4" />
                      See Job Description
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] max-h-[400px] overflow-y-auto" align="start" side="bottom" sideOffset={8}>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-base">Job Description</h4>
                      <p className="text-xs text-muted-foreground">
                        This is the job description you entered in the Getting Started guide.
                      </p>
                      <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap max-h-[280px] overflow-y-auto">
                        {savedJobDescription}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {onCreateCoverLetter && (
                <Button variant="outline" size="sm" onClick={onCreateCoverLetter} className="gap-2 bg-transparent">
                  <FileText className="h-4 w-4" />
                  Cover Letter
                </Button>
              )}
              <Button onClick={downloadPDF} disabled={isDownloadingPDF} className="gap-2">
                {isDownloadingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    DOWNLOAD PDF (ATS)
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadWord} className="bg-transparent">
                DOWNLOAD WORD
              </Button>
            </div>
            <p className="text-xs text-muted-foreground italic">Use Chrome in order to export 1-page PDFs</p>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">View Mode:</span>
            <div className="inline-flex rounded-lg border border-border bg-muted p-1">
              <button
                type="button"
                onClick={() => setViewMode("human")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "human"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Human (Visual)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("ats-styled")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "ats-styled"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ATS-Friendly
              </button>
              <button
                type="button"
                onClick={() => setViewMode("ats-text")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "ats-text"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Full ATS
              </button>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                  Which format should I choose?
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-4" align="start" side="bottom" sideOffset={8}>
                <div className="space-y-4">
                  <h4 className="font-semibold text-base">Which format should I choose?</h4>
                  <p className="text-sm text-muted-foreground">
                    Different applications benefit from different resume formats. All formats use the same content — only the layout and styling change.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-sm">Human (Visual)</h5>
                      <p className="text-sm text-muted-foreground">
                        Best when a person is likely to review your resume. Uses visual layout, color, and design to improve readability and make your profile stand out.
                      </p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-sm">ATS-Friendly (Styled)</h5>
                      <p className="text-sm text-muted-foreground">
                        A safe default for most online applications. Uses a simple, single-column layout that works well with applicant tracking systems while remaining easy for humans to read.
                      </p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-sm">Full ATS (Text-only)</h5>
                      <p className="text-sm text-muted-foreground">
                        Best for very strict or legacy systems. Uses plain text formatting to maximize compatibility with automated screening tools.
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground border-t pt-3">
                    You can switch formats at any time. What you see is what you download.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* CV Format Style Selector - Only shows for Human (Visual) mode */}
          {viewMode === "human" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">CV Style:</span>
              <div className="inline-flex rounded-lg border border-border bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setHumanFormatStyle("current")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    humanFormatStyle === "current"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Current Design
                </button>
                <button
                  type="button"
                  onClick={() => setHumanFormatStyle("executive-compact")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    humanFormatStyle === "executive-compact"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Executive Compact
                </button>
                <button
                  type="button"
                  onClick={() => setHumanFormatStyle("modern-spacious")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    humanFormatStyle === "modern-spacious"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Modern Spacious
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          ref={contentRef}
          className="bg-white text-black p-8 rounded-lg shadow-sm border"
          style={{
            maxWidth: "816px",
            margin: "0 auto",
            fontFamily: "Arial, sans-serif",
            minHeight: "auto",
          }}
          dangerouslySetInnerHTML={{ __html: getCurrentViewHTML() }}
        />
      </div>
    </div>
  )
}

const parseResumeText = (text: string): Array<{ title: string; content: string[] }> => {
  // Normalize the entire text first - convert various Unicode characters to ASCII equivalents
  // NOTE: Do NOT include \u0023 which is already the standard ASCII #
  const normalizedText = text
    .replace(/[\uFF03\u2317\u266F\uFE5F]/g, "#") // Various hash/number sign characters (NOT \u0023)
    .replace(/[\u00A0\u2003\u2002\u2009\u200B\u202F\uFEFF]/g, " ") // Various space characters
    .replace(/[–—―‐‑‒−]/g, "-") // Various dash characters to standard hyphen
  
  // Debug: Log lines that contain ### to verify they're being parsed correctly
  const debugLines = normalizedText.split("\n").filter(l => l.trim().startsWith("###"))
  if (debugLines.length > 0) {
    console.log("[v0] parseResumeText - lines starting with ###:", debugLines.map(l => JSON.stringify(l.trim().substring(0, 40))))
  }
  
  const lines = normalizedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l)
  const sections: Array<{ title: string; content: string[] }> = []
  let currentSection: { title: string; content: string[] } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Lines starting with #, ##, or ### are CONTENT formatting markers, NOT section headers
    const isMarkdownFormatted = line.startsWith("#")
    // Lines starting with - or • are bullet points, NOT section headers
    const isBulletPoint = line.startsWith("-") || line.startsWith("•")
    
    // A header must be uppercase letters AND contain at least some actual letters (not just numbers/symbols)
    const hasLetters = /[A-Za-z]/.test(line)
    const isAllUppercase = line === line.toUpperCase() && hasLetters
    const isHeader = isAllUppercase && line.length > 2 && line.length < 50 && !isMarkdownFormatted && !isBulletPoint
    
    const commonSections = ["EXPERIENCE", "EDUCATION", "SKILLS", "PROJECTS", "CERTIFICATIONS", "SUMMARY", "ABOUT", "PROFIL", "PROFILE"]
    const isSectionHeader = (isHeader || commonSections.some((s) => line.toUpperCase().includes(s))) && !isMarkdownFormatted && !isBulletPoint
    
    // Allow PROFIL/PROFILE section to be detected at the start (i >= 0)
    // Other sections still require i > 3 to avoid false positives in header area
    const isProfileHeader = line.toUpperCase().includes("PROFIL") || line.toUpperCase().includes("PROFILE")
    const shouldCreateSection = isSectionHeader && (isProfileHeader || i > 3)

    if (shouldCreateSection) {
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = { title: line, content: [] }
    } else if (currentSection) {
      currentSection.content.push(line)
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}

const escapeHtml = (text: string): string => {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}
