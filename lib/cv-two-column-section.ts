import { isManualPageBreakLine } from "@/lib/resume-page-breaks"

export const TWO_COLUMN_MIN_ITEMS = 6

const TWO_COLUMN_LINE_SPLIT = /\s{2,}|\t/

export type ColumnListBulletStyle = {
  symbol: string
  color: string
  size: string
  bulletMargin: number
  bulletIndent: number
  lineHeight: number | string
  fontSize: number
  linkColor: string
}

export type SectionColumnInput = {
  title: string
  content: string[]
  columns?: 1 | 2 | 3
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Section titles that may use a two-column skills/tools layout. */
export function isTwoColumnSectionTitle(title: string): boolean {
  const stripped = title.trim().toUpperCase()
  if (stripped === "TOOLS" || stripped.startsWith("TOOLS ")) return true
  if (/\bTOOLS\b/.test(stripped) && stripped.length <= 40) return true
  if (stripped === "SKILLS" || stripped.includes("SKILLS") || stripped.includes("FÄHIGKEITEN") || stripped.includes("FAEHIGKEITEN")) {
    return true
  }
  return false
}

export function shouldUseTwoColumnLayout(items: string[]): boolean {
  return items.length >= TWO_COLUMN_MIN_ITEMS
}

export function resolveSectionColumnCount(input: SectionColumnInput): 1 | 2 | 3 {
  if (input.columns && input.columns > 1) return input.columns
  if (input.columns === 1) return 1
  if (isTwoColumnSectionTitle(input.title)) {
    const items = parseTwoColumnSectionItems(input.content)
    if (shouldUseTwoColumnLayout(items)) return 2
  }
  return 1
}

/** Parse plain lines, bullets, or tab/multi-space paired rows into a flat item list. */
export function parseTwoColumnSectionItems(lines: string[]): string[] {
  const items: string[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || isManualPageBreakLine(line)) continue
    if (/^#{1,3}\s/.test(line)) continue

    let text = line.replace(/^[•-]\s*/, "").trim()
    if (!text) continue

    const parts = text
      .split(TWO_COLUMN_LINE_SPLIT)
      .map((part) => part.trim())
      .filter(Boolean)

    if (parts.length >= 2) {
      items.push(...parts)
    } else {
      items.push(text)
    }
  }

  return items
}

/**
 * Multi-column bullet list using a table (not CSS column-count / grid).
 * Do NOT mark the whole grid as keep-together — that forced skills onto a late
 * page and left large blank regions.
 */
export function renderCVColumnListHtml(
  items: string[],
  columns: 2 | 3,
  bullet: ColumnListBulletStyle,
): string {
  if (items.length === 0) return ""

  const renderItem = (item: string) =>
    `<div class="cv-column-list__item" style="margin: ${bullet.bulletMargin / 2}px 0; padding-left: ${bullet.bulletIndent}px; line-height: ${bullet.lineHeight}; position: relative; font-size: ${bullet.fontSize}px; color: #000000;"><span style="position: absolute; left: 0; top: 0; line-height: ${bullet.lineHeight}; font-size: ${bullet.size}; color: ${bullet.color};">${bullet.symbol}</span>${escapeHtml(item)}</div>`

  const colBuckets: string[][] = Array.from({ length: columns }, () => [])
  items.forEach((item, index) => {
    colBuckets[index % columns].push(item)
  })

  const widthPct = (100 / columns).toFixed(4)
  const cells = colBuckets
    .map((bucket) => {
      const body = bucket.map(renderItem).join("")
      return `<td class="cv-column-list__col" style="width: ${widthPct}%; vertical-align: top; padding: 0; padding-right: 12px;">${body}</td>`
    })
    .join("")

  return `<table class="cv-column-list cv-column-list--cols-${columns}" style="width: 100%; border-collapse: collapse; table-layout: fixed; margin: ${bullet.bulletMargin}px 0; padding: 0; font-size: ${bullet.fontSize}px; line-height: ${bullet.lineHeight};"><tbody><tr>${cells}</tr></tbody></table>`
}

/** One skill/tool item as a standalone HTML fragment (for per-item PDF blocks). */
export function renderCVColumnListItemHtml(
  item: string,
  bullet: ColumnListBulletStyle,
): string {
  return `<div class="cv-column-list__item" style="margin: ${bullet.bulletMargin / 2}px 0; padding-left: ${bullet.bulletIndent}px; line-height: ${bullet.lineHeight}; position: relative; font-size: ${bullet.fontSize}px; color: #000000;"><span style="position: absolute; left: 0; top: 0; line-height: ${bullet.lineHeight}; font-size: ${bullet.size}; color: ${bullet.color};">${bullet.symbol}</span>${escapeHtml(item)}</div>`
}

/**
 * Split a section into entry blocks. A new block starts at `# title` or `## company`
 * (not ### dates).
 */
export function splitSectionIntoEntryBlocks(lines: string[]): string[][] {
  const blocks: string[][] = []
  let current: string[] = []

  for (const line of lines) {
    const t = line.trim()
    if (isManualPageBreakLine(t)) {
      if (current.length > 0) {
        blocks.push(current)
        current = []
      }
      continue
    }

    const isJobOrDegreeTitle = /^#\s+/.test(t) && !/^##/.test(t)
    const isCompanyOrCertTitle = /^##\s+/.test(t) && !/^###/.test(t)
    if ((isJobOrDegreeTitle || isCompanyOrCertTitle) && current.length > 0) {
      blocks.push(current)
      current = []
    }
    current.push(line)
  }

  if (current.length > 0) blocks.push(current)
  return blocks.length > 0 ? blocks : [lines]
}

/** True when the section looks like structured entries (certs/education/jobs), not a flat skill list. */
export function sectionHasStructuredEntries(lines: string[]): boolean {
  return lines.some((line) => {
    const t = line.trim()
    return (/^#\s+/.test(t) && !/^##/.test(t)) || (/^##\s+/.test(t) && !/^###/.test(t))
  })
}
