"use client"

import { useLayoutEffect, useRef, useState } from "react"
import type { ResumeVersion } from "@/lib/types"
import {
  autoPaginateResumeInnerHtml,
  isPdfBulletLine,
  PDF_MANUAL_PAGE_BREAK_PREFERENCE_HTML,
  pdfPageLabelHtml,
  splitContentIntoSegments,
  splitEntryLinesIntoPdfChunks,
  splitExperienceLinesIntoJobs,
} from "@/lib/pdf-auto-pagination"
import { isPdfDebugEnabled } from "@/lib/pdf-debug"
import {
  parseTwoColumnSectionItems,
  renderCVColumnListItemHtml,
  resolveSectionColumnCount,
  sectionHasStructuredEntries,
  splitSectionIntoEntryBlocks,
  type ColumnListBulletStyle,
} from "@/lib/cv-two-column-section"

type PdfViewParts = { columnStyle: string; markedInner: string }

const formatStyle = {
  lineHeight: 1.6,
  sectionSpacing: 24,
  baseFontSize: 14,
  headerWeight: "bold",
  bulletIndent: 20,
  sectionHeaderMargin: "24px 0 12px 0",
  bulletMargin: 8,
  containerPadding: 0,
}

function ensureRGBColor(color: string): string {
  if (color.startsWith("#")) return color
  if (typeof document === "undefined") return "#3b82f6"
  const tempDiv = document.createElement("div")
  tempDiv.style.color = color
  document.body.appendChild(tempDiv)
  const computedColor = window.getComputedStyle(tempDiv).color
  document.body.removeChild(tempDiv)
  if (computedColor.startsWith("rgb")) {
    const match = computedColor.match(/\d+/g)
    if (match && match.length >= 3) {
      const r = Number.parseInt(match[0], 10)
      const g = Number.parseInt(match[1], 10)
      const b = Number.parseInt(match[2], 10)
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    }
  }
  return "#3b82f6"
}

function parseResumeText(text: string): Array<{ title: string; content: string[] }> {
  const normalizedText = text
    .replace(/[\uFF03\u2317\u266F\uFE5F]/g, "#")
    .replace(/[\u00A0\u2003\u2002\u2009\u200B\u202F\uFEFF]/g, " ")
    .replace(/[–—―‐‑‒−]/g, "-")

  const lines = normalizedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l)
  const sections: Array<{ title: string; content: string[] }> = []
  let currentSection: { title: string; content: string[] } | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isMarkdownFormatted = line.startsWith("#")
    const isBulletPoint = line.startsWith("-") || line.startsWith("•")
    const hasLetters = /[A-Za-z]/.test(line)
    const isAllUppercase = line === line.toUpperCase() && hasLetters
    const isHeader = isAllUppercase && line.length > 2 && line.length < 50 && !isMarkdownFormatted && !isBulletPoint
    const commonSections = [
      "EXPERIENCE",
      "EDUCATION",
      "SKILLS",
      "PROJECTS",
      "CERTIFICATIONS",
      "SUMMARY",
      "ABOUT",
      "PROFIL",
      "PROFILE",
      "FÄHIGKEITEN",
      "FAEHIGKEITEN",
      "AUSBILDUNG",
      "BERUFSERFAHRUNG",
    ]
    const isSectionHeader =
      (isHeader || commonSections.some((s) => line.toUpperCase().includes(s))) &&
      !isMarkdownFormatted &&
      !isBulletPoint
    const isProfileHeader = line.toUpperCase().includes("PROFIL") || line.toUpperCase().includes("PROFILE")
    const shouldCreateSection = isSectionHeader && (isProfileHeader || i > 3)

    if (shouldCreateSection) {
      if (currentSection) sections.push(currentSection)
      currentSection = { title: line, content: [] }
    } else if (currentSection) {
      currentSection.content.push(line)
    }
  }

  if (currentSection) sections.push(currentSection)
  return sections
}

function isProfileSection(title: string) {
  const normalized = title.toUpperCase().trim()
  return (
    normalized.includes("PROFILE") ||
    normalized.includes("PROFIL") ||
    normalized.includes("SUMMARY") ||
    normalized.includes("ABOUT")
  )
}

function isExperienceSection(title: string): boolean {
  const normalized = title.toUpperCase()
  return (
    normalized.includes("EXPERIENCE") ||
    normalized.includes("ERFAHRUNG") ||
    normalized.includes("BERUFSSTATIONEN") ||
    normalized.includes("EIGENPROJEKT") ||
    normalized.includes("FORSCHUNG") ||
    normalized.includes("PROJECT")
  )
}

function isEducationSection(title: string): boolean {
  const normalized = title.toUpperCase()
  return (
    normalized.includes("EDUCATION") ||
    normalized.includes("AUSBILDUNG") ||
    normalized.includes("STUDIEN") ||
    normalized.includes("MASTER") ||
    normalized.includes("BACHELOR")
  )
}

interface ResumePdfExportProps {
  version: ResumeVersion
}

export function ResumePdfExport({ version }: ResumePdfExportProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [pdfSurfaceHtml, setPdfSurfaceHtml] = useState<string | null>(null)
  const [pdfPaginationReady, setPdfPaginationReady] = useState(false)
  const [pdfPaginationHadOverflow, setPdfPaginationHadOverflow] = useState(false)

  const hexAccentColor = ensureRGBColor(version.accentColorHex || version.accentColor || "#3b82f6")
  const viewSections = parseResumeText(version.resumeText)
  const pdfDebugEnabled = isPdfDebugEnabled()

  const renderUniversalMarkdown = (lines: string[]): string => {
    const style = formatStyle
    const accentColorForHTML = hexAccentColor
    let html = ""
    let inBulletList = false

    for (const line of lines) {
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
        html += `<p style="font-size: ${style.baseFontSize}px; font-weight: 400; margin: ${style.bulletMargin}px 0; color: #666666; font-style: italic; line-height: ${style.lineHeight};">${text}</p>`
        continue
      }

      if (trimmedLine.startsWith("##") && !trimmedLine.startsWith("###")) {
        if (inBulletList) {
          html += "</ul>"
          inBulletList = false
        }
        const text = trimmedLine.slice(2).trim()
        html += `<p style="font-size: ${style.baseFontSize + 2}px; font-weight: 700; margin: ${style.bulletMargin}px 0; color: #000000; line-height: ${style.lineHeight};">${text}</p>`
        continue
      }

      if (trimmedLine.startsWith("#") && !trimmedLine.startsWith("##")) {
        if (inBulletList) {
          html += "</ul>"
          inBulletList = false
        }
        const text = trimmedLine.slice(1).trim()
        html += `<p style="font-size: ${style.baseFontSize + 4}px; font-weight: ${style.headerWeight}; margin: ${style.sectionSpacing / 2}px 0 ${style.bulletMargin}px 0; color: ${accentColorForHTML}; text-transform: uppercase; line-height: ${style.lineHeight};">${text}</p>`
        continue
      }

      if (trimmedLine.startsWith("-") || trimmedLine.startsWith("•")) {
        const text = trimmedLine.slice(1).trim()
        if (!inBulletList) {
          html += `<ul style="margin: ${style.bulletMargin}px 0; padding-left: 0; list-style-type: none;">`
          inBulletList = true
        }
        html += `<li style="margin: ${style.bulletMargin / 2}px 0; padding-left: ${style.bulletIndent}px; line-height: ${style.lineHeight}; position: relative;">`
        html += `<span style="position: absolute; left: 0; top: 0; line-height: ${style.lineHeight}; font-size: 1em; color: #000000;">•</span>`
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

    if (inBulletList) html += "</ul>"
    return html
  }

  /** Only small units — never whole sections, skills grids, or experience lists. */
  const PDF_KEEP_TOGETHER_BLOCKS = new Set(["job-head", "skill-item", "education-entry"])

  const wrapPdfBlock = (kind: string, html: string, continuation = false) => {
    const keepClass = PDF_KEEP_TOGETHER_BLOCKS.has(kind) ? " pdf-block-keep-together" : ""
    const contClass = continuation ? " pdf-job-continuation" : ""
    return `<div data-pdf-block="${kind}" class="pdf-resume-block${keepClass}${contClass}">${html}</div>`
  }

  const pushEntryPdfChunks = (
    parts: string[],
    entryLines: string[],
    renderEntry: (lines: string[]) => string,
    wrapBody: (body: string) => string,
    options?: { entryKind?: "job-head" | "education-entry" },
  ): number => {
    const chunks = splitEntryLinesIntoPdfChunks(entryLines)
    const headKind = options?.entryKind ?? "job-head"
    let pushed = 0
    for (const chunk of chunks) {
      const body = wrapBody(renderEntry(chunk.lines))
      if (!body.trim()) continue
      const kind = chunk.kind === "job-head" ? headKind : chunk.kind
      parts.push(wrapPdfBlock(kind, body, chunk.continuation))
      pushed += 1
    }
    return pushed
  }

  const getColumnBulletStyle = (): ColumnListBulletStyle => ({
    symbol: "•",
    color: "#000000",
    size: "1em",
    bulletMargin: formatStyle.bulletMargin,
    bulletIndent: formatStyle.bulletIndent,
    lineHeight: formatStyle.lineHeight,
    fontSize: formatStyle.baseFontSize,
    linkColor: hexAccentColor,
  })

  /** Skills / tools: one PDF block per item so the grid never moves as one slab. */
  const renderSkillItemsPdfBlocks = (
    sectionTitleHTML: string,
    items: string[],
    sectionMargin: string,
    wrapBody?: (body: string) => string,
  ): string => {
    const wrap = wrapBody ?? ((body: string) => body)
    const bullet = getColumnBulletStyle()
    const parts: string[] = []
    if (sectionTitleHTML) {
      parts.push(wrapPdfBlock("section-title", sectionTitleHTML))
    }
    for (const item of items) {
      const html = wrap(renderCVColumnListItemHtml(item, bullet))
      if (!html.trim()) continue
      parts.push(wrapPdfBlock("skill-item", html))
    }
    return `<div class="resume-section-block" style="margin-bottom: ${sectionMargin};">${parts.join("")}</div>`
  }

  const renderExperiencePdfBlocks = (
    sectionTitleHTML: string,
    content: string[],
    renderJob: (lines: string[]) => string,
    sectionMargin: string,
  ): string => {
    const segments = splitContentIntoSegments(content)
    const parts: string[] = []
    let sectionTitlePlaced = false

    for (const seg of segments) {
      if (seg.type === "manual-page-break") {
        parts.push(wrapPdfBlock("manual-page-break-preference", PDF_MANUAL_PAGE_BREAK_PREFERENCE_HTML))
        continue
      }
      const jobs = splitExperienceLinesIntoJobs(seg.lines)
      for (const jobLines of jobs) {
        const staging: string[] = []
        const count = pushEntryPdfChunks(staging, jobLines, renderJob, (body) => body)
        if (count === 0) continue
        if (!sectionTitlePlaced && sectionTitleHTML) {
          parts.push(wrapPdfBlock("section-title", sectionTitleHTML))
          sectionTitlePlaced = true
        }
        parts.push(...staging)
      }
    }

    if (!sectionTitlePlaced && sectionTitleHTML) {
      parts.push(wrapPdfBlock("section-title", sectionTitleHTML))
    }

    return `<div class="resume-section-block" style="margin-bottom: ${sectionMargin};">${parts.join("")}</div>`
  }

  const renderSectionPdfBlocks = (
    sectionTitleHTML: string,
    content: string[],
    renderLines: (lines: string[]) => string,
    sectionMargin: string,
    options?: { allowBulletSplit?: boolean },
  ): string => {
    const allowBulletSplit = options?.allowBulletSplit !== false
    const segments = splitContentIntoSegments(content)
    const parts: string[] = []
    let sectionTitlePlaced = false

    for (const seg of segments) {
      if (seg.type === "manual-page-break") {
        parts.push(wrapPdfBlock("manual-page-break-preference", PDF_MANUAL_PAGE_BREAK_PREFERENCE_HTML))
        continue
      }

      const useSplit =
        allowBulletSplit &&
        (sectionHasStructuredEntries(seg.lines) || seg.lines.filter(isPdfBulletLine).length > 4)

      if (useSplit) {
        const entries = sectionHasStructuredEntries(seg.lines)
          ? splitSectionIntoEntryBlocks(seg.lines)
          : [seg.lines]
        const asEducation = sectionHasStructuredEntries(seg.lines)
        for (const entryLines of entries) {
          const staging: string[] = []
          const count = pushEntryPdfChunks(staging, entryLines, renderLines, (body) => body, {
            entryKind: asEducation ? "education-entry" : "job-head",
          })
          if (count === 0) continue
          if (!sectionTitlePlaced && sectionTitleHTML) {
            parts.push(wrapPdfBlock("section-title", sectionTitleHTML))
            sectionTitlePlaced = true
          }
          parts.push(...staging)
        }
        continue
      }

      if (!sectionTitlePlaced && sectionTitleHTML) {
        parts.push(wrapPdfBlock("section-title", sectionTitleHTML))
        sectionTitlePlaced = true
      }
      const body = renderLines(seg.lines)
      if (!body.trim()) continue
      parts.push(wrapPdfBlock("section", body))
    }

    if (parts.length === 0 && sectionTitleHTML) {
      parts.push(wrapPdfBlock("section-start", sectionTitleHTML))
    }

    return `<div class="resume-section-block" style="margin-bottom: ${sectionMargin};">${parts.join("")}</div>`
  }

  const renderNonExperiencePdfSection = (
    section: { title: string; content: string[] },
    sectionTitleHTML: string,
    sectionMargin: string,
  ): string => {
    const columnCount = resolveSectionColumnCount(section)
    if (columnCount > 1 && !sectionHasStructuredEntries(section.content)) {
      const items = parseTwoColumnSectionItems(section.content)
      if (items.length > 0) {
        return renderSkillItemsPdfBlocks(sectionTitleHTML, items, sectionMargin)
      }
    }
    return renderSectionPdfBlocks(sectionTitleHTML, section.content, renderUniversalMarkdown, sectionMargin, {
      allowBulletSplit: true,
    })
  }

  const buildPdfViewParts = (): PdfViewParts => {
    const style = formatStyle
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

    const profileImageSize = 124
    const showPhotoBorder = version.profilePhotoBorder !== false
    const profileImageHTML = version.profileImage
      ? `<img src="${version.profileImage}" alt="Profile" crossorigin="anonymous" style="width: ${profileImageSize}px; height: ${profileImageSize}px; border-radius: 50%; object-fit: cover;${showPhotoBorder ? ` border: 1.5px solid ${hexAccentColor};` : ""}" />`
      : ""
    const companyLogoHTML = version.companyLogo
      ? `<img src="${version.companyLogo}" alt="Company Logo" crossorigin="anonymous" style="max-width: 80px; max-height: 60px; object-fit: contain; opacity: 0.9;" />`
      : ""

    const headerHTML = `
      <div data-pdf-block="header" class="pdf-resume-block" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: ${style.sectionSpacing}px;">
        <div style="display: flex; gap: 24px; align-items: center;">
          ${profileImageHTML}
          <div>
            <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 8px 0; color: #000000; line-height: ${style.lineHeight};">${name}</h1>
            ${professionalTitle ? `<p style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0; color: ${hexAccentColor}; line-height: ${style.lineHeight};">${professionalTitle}</p>` : ""}
            ${version.contactInfo.address ? `<p style="font-size: 13px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.location}: ${version.contactInfo.address}</p>` : ""}
            ${version.contactInfo.email ? `<p style="font-size: 13px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.email}: ${version.contactInfo.email}</p>` : ""}
            ${version.contactInfo.linkedin ? `<p style="font-size: 13px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.linkedin}: <a href="${version.contactInfo.linkedin.startsWith("http") ? version.contactInfo.linkedin : `https://${version.contactInfo.linkedin}`}" target="_blank" style="color: ${hexAccentColor}; text-decoration: underline;">${version.contactInfo.linkedin}</a></p>` : ""}
            ${version.contactInfo.phone ? `<p style="font-size: 13px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.phone}: ${version.contactInfo.phone}</p>` : ""}
            ${version.contactInfo.citizenship ? `<p style="font-size: 13px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.citizenship}: ${version.contactInfo.citizenship}</p>` : ""}
            ${version.contactInfo.showPortfolio && version.contactInfo.portfolio ? `<p style="font-size: 13px; margin: 4px 0; color: #000000; line-height: ${style.lineHeight};">${labels.portfolio}: <a href="${version.contactInfo.portfolio.startsWith("http") ? version.contactInfo.portfolio : `https://${version.contactInfo.portfolio}`}" target="_blank" style="color: ${hexAccentColor}; text-decoration: underline;">${version.contactInfo.portfolio}</a></p>` : ""}
          </div>
        </div>
      </div>
    `

    const targetBgColor = version.targetBoxBgColor || "#f8f9fa"
    const targetBorderColor = version.targetBoxBorderColor || hexAccentColor
    const applicationTargetHTML =
      version.contactInfo.targetCompany || version.contactInfo.targetRole
        ? `<div data-pdf-block="target" class="pdf-resume-block" style="margin-bottom: ${style.sectionSpacing}px; padding: 16px; background-color: ${targetBgColor}; border-left: 4px solid ${targetBorderColor}; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
            <div style="flex: 1; min-width: 0;">
              ${version.contactInfo.targetCompany ? `<p style="font-size: 18px; font-weight: bold; margin: 0 0 4px 0; color: #000000;">${version.contactInfo.targetCompany}</p>` : ""}
              ${version.contactInfo.targetRole ? `<p style="font-size: 16px; font-weight: 600; margin: 0; color: ${hexAccentColor};">${version.contactInfo.targetRole.replace(/\n/g, "<br>")}</p>` : ""}
            </div>
            ${companyLogoHTML ? `<div style="flex-shrink: 0;">${companyLogoHTML}</div>` : ""}
          </div>`
        : ""

    const sectionMargin = `${style.sectionSpacing}px`
    const sectionsHTML = viewSections
      .filter((section) => section.title !== "")
      .map((section) => {
        const sectionTitleHTML = section.title
          ? `<h2 style="font-size: 16px; font-weight: bold; text-transform: uppercase; margin: ${style.sectionHeaderMargin}; padding-bottom: 8px; border-bottom: 2px solid ${hexAccentColor}; color: #000000;">${section.title}</h2>`
          : ""

        if (isProfileSection(section.title)) {
          return renderSectionPdfBlocks(sectionTitleHTML, section.content, renderUniversalMarkdown, sectionMargin, {
            allowBulletSplit: false,
          })
        }
        if (isExperienceSection(section.title)) {
          return renderExperiencePdfBlocks(sectionTitleHTML, section.content, renderUniversalMarkdown, sectionMargin)
        }
        if (isEducationSection(section.title)) {
          return renderSectionPdfBlocks(sectionTitleHTML, section.content, renderUniversalMarkdown, sectionMargin)
        }
        return renderNonExperiencePdfSection(section, sectionTitleHTML, sectionMargin)
      })
      .join("")

    const markedInner = `${headerHTML}${applicationTargetHTML}${sectionsHTML}`
    const columnStyle = `font-family: Arial, Helvetica, sans-serif; font-size: ${style.baseFontSize}px; line-height: ${style.lineHeight}; color: #000000; background: white; padding: 0; margin: 0; box-sizing: border-box;`
    return { columnStyle, markedInner }
  }

  const buildFallbackSurfaceHtml = (): string => {
    const p = buildPdfViewParts()
    const label = pdfDebugEnabled ? pdfPageLabelHtml(1) : ""
    return `<section class="pdf-page pdf-page--auto">${label}<div style="${p.columnStyle};width:100%;margin:0;padding:0;box-sizing:border-box;">${p.markedInner}</div></section>`
  }

  useLayoutEffect(() => {
    let cancelled = false

    const runPagination = () => {
      try {
        const p = buildPdfViewParts()
        const r = autoPaginateResumeInnerHtml(document, p.markedInner, p.columnStyle, {
          debugMode: pdfDebugEnabled,
        })
        if (!cancelled) {
          setPdfSurfaceHtml(r.html)
          setPdfPaginationHadOverflow(r.hadOverflow)
          setPdfPaginationReady(true)
        }
      } catch (error) {
        console.error("[resume-pdf-export] Pagination failed:", error)
        if (!cancelled) {
          setPdfPaginationReady(true)
        }
      }
    }

    const waitImages = () =>
      Promise.all(
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

    const timer = window.setTimeout(() => {
      void Promise.all([document.fonts.ready, waitImages()]).then(() => {
        if (cancelled) return
        runPagination()
      })
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild when resume payload changes
  }, [
    pdfDebugEnabled,
    version.resumeText,
    version.profileImage,
    version.companyLogo,
    version.accentColor,
    version.accentColorHex,
    version.profilePhotoBorder,
    version.targetBoxBgColor,
    version.targetBoxBorderColor,
    JSON.stringify(version.contactInfo),
  ])

  const displayHtml = pdfSurfaceHtml ?? buildFallbackSurfaceHtml()

  return (
    <div
      ref={contentRef}
      data-pdf-pagination-ready={pdfPaginationReady ? "true" : "false"}
      data-pdf-pagination-overflow={pdfPaginationHadOverflow ? "true" : "false"}
      className={`w-full min-w-0 resume-print-surface${pdfDebugEnabled ? " pdf-debug" : ""}`}
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  )
}
