import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatCurrency, formatDate } from '@/lib/services'
import type { Work, TimelineEvent, Consignor, Photo } from '@/types'
import { EVENT_TYPE_LABELS, STATUS_LABELS } from '@/types'
import type { IntakeDetails, SaleDetails, PayoutDetails, LocationChangeDetails, ConditionUpdateDetails, StatusChangeDetails, DocumentAttachDetails } from '@/types'

// Colors matching PRD
const TEXT_COLOR = '#111827'
const SECONDARY_COLOR = '#6B7280'
const DIVIDER_COLOR = '#E5E7EB'
const ACCENT_COLOR = '#1D4ED8'

// Page dimensions (A4 portrait, mm)
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 20
const CONTENT_W = PAGE_W - MARGIN * 2

interface PdfData {
  work: Work
  events: TimelineEvent[]
  photos: Photo[]
  consignor: Consignor | null
  galleryName: string
}

type ProgressCallback = (msg: string) => void

// Download an image and return base64 data URL, scaled to max 1200px
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const blob = await resp.blob()
    return await downscaleImage(blob, 1200)
  } catch {
    return null
  }
}

function downscaleImage(blob: Blob, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        const scale = maxPx / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Image load failed'))
    }
    img.src = URL.createObjectURL(blob)
  })
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function addPageFooter(doc: jsPDF, galleryName: string) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W / 2, PAGE_H - 10, { align: 'center' })
    if (i === 1) {
      doc.text(`${galleryName}`, MARGIN, PAGE_H - 10)
    }
  }
}

function drawDivider(doc: jsPDF, y: number): number {
  doc.setDrawColor(...hexToRgb(DIVIDER_COLOR))
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y)
  return y + 4
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN - 12) {
    doc.addPage()
    return MARGIN
  }
  return y
}

// Add image to PDF, returning the height used. Fits within maxW x maxH mm.
function addImage(doc: jsPDF, dataUrl: string, x: number, y: number, maxW: number, maxH: number): number {
  const props = doc.getImageProperties(dataUrl)
  let w = maxW
  let h = (props.height / props.width) * w
  if (h > maxH) {
    h = maxH
    w = (props.width / props.height) * h
  }
  doc.addImage(dataUrl, 'JPEG', x, y, w, h)
  return h
}

function addPhotoPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(...hexToRgb(DIVIDER_COLOR))
  doc.setFillColor(249, 250, 251)
  doc.rect(x, y, w, h, 'FD')
  doc.setFontSize(8)
  doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
  doc.text('Photo unavailable', x + w / 2, y + h / 2, { align: 'center' })
}

export async function generateProvenancePdf(
  data: PdfData,
  selectedEventIds: string[] | null, // null = all events
  onProgress?: ProgressCallback,
): Promise<Blob> {
  const { work, events, photos, consignor, galleryName } = data
  const selectedEvents = selectedEventIds
    ? events.filter((e) => selectedEventIds.includes(e.id))
    : events

  onProgress?.('Preparing document...')

  // Gather all unique photo URLs to download
  const urlSet = new Set<string>()
  if (work.coverPhotoUrl) urlSet.add(work.coverPhotoUrl)
  for (const p of photos) urlSet.add(p.storageUrl)
  for (const ev of selectedEvents) {
    for (const url of ev.photoUrls) urlSet.add(url)
  }
  // Also check intake signature
  const intakeEvent = selectedEvents.find((e) => e.type === 'intake')
  const intakeDetails = intakeEvent?.details as IntakeDetails | undefined
  if (intakeDetails?.signatureUrl) urlSet.add(intakeDetails.signatureUrl)

  // Download images sequentially
  const imageCache = new Map<string, string | null>()
  const urls = [...urlSet]
  let failedPhotos = false
  for (let i = 0; i < urls.length; i++) {
    onProgress?.(`Loading photos (${i + 1} of ${urls.length})...`)
    const dataUrl = await fetchImageAsDataUrl(urls[i])
    if (!dataUrl) failedPhotos = true
    imageCache.set(urls[i], dataUrl)
  }

  onProgress?.('Generating PDF...')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  doc.setProperties({
    title: `${work.artist} - ${work.title}`,
    author: galleryName,
  })

  // === PAGE 1: COVER ===
  let y = MARGIN

  // Cover photo
  const coverUrl = work.coverPhotoUrl
  const coverData = coverUrl ? imageCache.get(coverUrl) : null
  if (coverData) {
    const imgH = addImage(doc, coverData, MARGIN, y, 140, 120)
    y += imgH + 8
  }

  // Artist name (18pt bold)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...hexToRgb(TEXT_COLOR))
  doc.text(work.artist, MARGIN, y)
  y += 7

  // Title (14pt italic)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'italic')
  doc.text(work.title, MARGIN, y)
  y += 6

  // Medium, Dimensions, Year (10pt secondary)
  const metaParts = [work.medium, work.dimensions, work.year].filter(Boolean)
  if (metaParts.length > 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
    doc.text(metaParts.join(', '), MARGIN, y)
    y += 6
  }

  y = drawDivider(doc, y + 2)

  // Status, Consignor, Intake date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...hexToRgb(TEXT_COLOR))
  doc.text(`Status: ${STATUS_LABELS[work.status]}`, MARGIN, y)
  y += 5
  if (consignor) {
    doc.text(`Consignor: ${consignor.name}`, MARGIN, y)
    y += 5
  }
  doc.text(`Intake Date: ${formatDate(work.intakeDate)}`, MARGIN, y)
  y += 8

  y = drawDivider(doc, y)

  // Gallery name and generation date at bottom
  doc.setFontSize(10)
  doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
  const genDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
  doc.text(galleryName, MARGIN, PAGE_H - MARGIN - 8)
  doc.text(`Generated: ${genDate} via GalleryLedger`, MARGIN, PAGE_H - MARGIN - 3)

  // === PAGE 2+: WORK DETAILS & CONDITION ===
  doc.addPage()
  y = MARGIN

  // Section: Work Details
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...hexToRgb(TEXT_COLOR))
  doc.text('Work Details', MARGIN, y)
  y += 2
  y = drawDivider(doc, y + 2)

  const details: [string, string][] = [
    ['Artist', work.artist],
    ['Title', work.title],
    ['Medium', work.medium],
    ['Dimensions', work.dimensions],
    ['Year', work.year],
    ['Consignor', consignor?.name || '—'],
  ]
  if (work.notes) details.push(['Notes', work.notes])

  doc.setFontSize(10)
  for (const [label, value] of details) {
    if (!value) continue
    y = ensureSpace(doc, y, 6)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
    doc.text(`${label}:`, MARGIN, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...hexToRgb(TEXT_COLOR))
    // Wrap long values
    const lines = doc.splitTextToSize(value, CONTENT_W - 40)
    doc.text(lines, MARGIN + 38, y)
    y += Math.max(lines.length, 1) * 5 + 1
  }

  // Condition at Intake
  if (intakeEvent && intakeDetails) {
    y += 4
    y = ensureSpace(doc, y, 30)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...hexToRgb(TEXT_COLOR))
    doc.text('Condition at Intake', MARGIN, y)
    y += 2
    y = drawDivider(doc, y + 2)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...hexToRgb(TEXT_COLOR))
    doc.text(`Date: ${formatDate(intakeEvent.createdAt)}`, MARGIN, y)
    y += 5
    doc.text(`Overall: ${intakeDetails.conditionSummary.charAt(0).toUpperCase() + intakeDetails.conditionSummary.slice(1)}`, MARGIN, y)
    y += 5

    if (intakeDetails.conditionNotes) {
      const noteLines = doc.splitTextToSize(`Notes: ${intakeDetails.conditionNotes}`, CONTENT_W)
      y = ensureSpace(doc, y, noteLines.length * 5)
      doc.text(noteLines, MARGIN, y)
      y += noteLines.length * 5 + 1
    }

    // Checklist issues
    const issues = Object.entries(intakeDetails.checklist)
    if (issues.length > 0) {
      const issueNames = issues.map(([item, note]) => note ? `${item} (${note})` : item)
      const issueText = `Issues: ${issueNames.join(', ')}`
      const issueLines = doc.splitTextToSize(issueText, CONTENT_W)
      y = ensureSpace(doc, y, issueLines.length * 5)
      doc.text(issueLines, MARGIN, y)
      y += issueLines.length * 5 + 2
    }

    // Intake photos (from photos collection, first 6)
    const intakePhotos = photos.slice(0, 6)
    if (intakePhotos.length > 0) {
      y += 2
      const colW = (CONTENT_W - 4) / 2
      const photoH = 45
      for (let i = 0; i < intakePhotos.length; i++) {
        if (i % 2 === 0) {
          y = ensureSpace(doc, y, photoH + 4)
        }
        const col = i % 2
        const x = MARGIN + col * (colW + 4)
        const imgData = imageCache.get(intakePhotos[i].storageUrl)
        if (imgData) {
          addImage(doc, imgData, x, y, colW, photoH)
        } else {
          addPhotoPlaceholder(doc, x, y, colW, photoH)
        }
        if (col === 1 || i === intakePhotos.length - 1) {
          y += photoH + 4
        }
      }
    }

    // Signature
    if (intakeDetails.signatureUrl) {
      const sigData = imageCache.get(intakeDetails.signatureUrl)
      if (sigData) {
        y = ensureSpace(doc, y, 30)
        y += 2
        addImage(doc, sigData, MARGIN, y, 60, 25)
        y += 27
        doc.setFontSize(8)
        doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
        doc.text(`Consignor signature — ${formatDate(intakeEvent.createdAt)}`, MARGIN, y)
        y += 6
      }
    }
  }

  // === TIMELINE EVENTS ===
  const timelineEvents = selectedEvents.filter((e) => e.type !== 'intake')
  if (timelineEvents.length > 0) {
    doc.addPage()
    y = MARGIN

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...hexToRgb(TEXT_COLOR))
    doc.text('Timeline', MARGIN, y)
    y += 2
    y = drawDivider(doc, y + 2)

    for (const ev of timelineEvents) {
      y = ensureSpace(doc, y, 20)

      // Bullet + date + type label
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...hexToRgb(ACCENT_COLOR))
      const dateStr = formatDate(ev.createdAt)
      const typeLabel = EVENT_TYPE_LABELS[ev.type]
      doc.text(`\u2022  ${dateStr}  \u00B7  ${typeLabel}`, MARGIN, y)
      y += 5

      // Description
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...hexToRgb(TEXT_COLOR))
      const descLines = doc.splitTextToSize(ev.description, CONTENT_W - 6)
      y = ensureSpace(doc, y, descLines.length * 5)
      doc.text(descLines, MARGIN + 6, y)
      y += descLines.length * 5 + 1

      // Event-specific details
      switch (ev.type) {
        case 'location_change': {
          const d = ev.details as LocationChangeDetails
          if (d.from && d.to) {
            doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
            doc.text(`From: ${d.from}  →  To: ${d.to}`, MARGIN + 6, y)
            y += 5
          }
          break
        }
        case 'condition_update': {
          const d = ev.details as ConditionUpdateDetails
          doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
          doc.text(`Condition: ${d.conditionSummary}`, MARGIN + 6, y)
          y += 5
          if (d.conditionNotes) {
            const nl = doc.splitTextToSize(d.conditionNotes, CONTENT_W - 10)
            y = ensureSpace(doc, y, nl.length * 5)
            doc.text(nl, MARGIN + 6, y)
            y += nl.length * 5 + 1
          }
          break
        }
        case 'status_change': {
          const d = ev.details as StatusChangeDetails
          doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
          doc.text(`${STATUS_LABELS[d.from]} → ${STATUS_LABELS[d.to]}`, MARGIN + 6, y)
          y += 5
          break
        }
        case 'sale': {
          const d = ev.details as SaleDetails
          doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
          doc.text(`Sale price: ${formatCurrency(d.salePrice, d.currency)}`, MARGIN + 6, y)
          y += 5
          doc.text(`Commission: ${d.commissionRate}%`, MARGIN + 6, y)
          y += 5
          if (d.buyerName) {
            doc.text(`Buyer: ${d.buyerName}`, MARGIN + 6, y)
            y += 5
          }
          break
        }
        case 'payout': {
          const d = ev.details as PayoutDetails
          doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
          doc.text(`Amount: ${formatCurrency(d.amount, d.currency)}`, MARGIN + 6, y)
          y += 5
          if (d.method) {
            doc.text(`Method: ${d.method}`, MARGIN + 6, y)
            y += 5
          }
          if (d.reference) {
            doc.text(`Ref: ${d.reference}`, MARGIN + 6, y)
            y += 5
          }
          break
        }
        case 'document_attach': {
          const d = ev.details as DocumentAttachDetails
          doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
          doc.text(`See attached document: ${d.fileName}`, MARGIN + 6, y)
          y += 5
          break
        }
      }

      // Event photos (max 4)
      const evPhotos = ev.photoUrls.slice(0, 4)
      if (evPhotos.length > 0) {
        const colW = (CONTENT_W - 4) / 2
        const photoH = 40
        for (let i = 0; i < evPhotos.length; i++) {
          if (i % 2 === 0) y = ensureSpace(doc, y, photoH + 4)
          const col = i % 2
          const x = MARGIN + col * (colW + 4)
          const imgData = imageCache.get(evPhotos[i])
          if (imgData) {
            addImage(doc, imgData, x, y, colW, photoH)
          } else {
            addPhotoPlaceholder(doc, x, y, colW, photoH)
          }
          if (col === 1 || i === evPhotos.length - 1) y += photoH + 4
        }
        if (ev.photoUrls.length > 4) {
          doc.setFontSize(8)
          doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
          doc.text(`(+${ev.photoUrls.length - 4} more photos in app)`, MARGIN + 6, y)
          y += 4
        }
      }

      y += 4
    }
  }

  // === FINANCIAL SUMMARY ===
  const saleEvent = selectedEvents.find((e) => e.type === 'sale')
  if (saleEvent) {
    const saleDetails = saleEvent.details as SaleDetails
    const payoutEvents = selectedEvents.filter((e) => e.type === 'payout')

    y = ensureSpace(doc, y, 60)
    if (y > MARGIN + 10) {
      // If we have content on the current page, check if there's room; otherwise new page
      if (y > PAGE_H - MARGIN - 60) {
        doc.addPage()
        y = MARGIN
      }
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...hexToRgb(TEXT_COLOR))
    doc.text('Financial Summary', MARGIN, y)
    y += 2
    y = drawDivider(doc, y + 2)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const currency = saleDetails.currency
    const salePrice = saleDetails.salePrice
    const commRate = saleDetails.commissionRate
    const commission = Math.round(salePrice * commRate / 100)
    const consignorShare = salePrice - commission

    const financialLines: [string, string][] = [
      ['Sale Price:', formatCurrency(salePrice, currency)],
      [`Commission (${commRate}%):`, `-${formatCurrency(commission, currency)}`],
      ['Consignor Share:', formatCurrency(consignorShare, currency)],
    ]

    for (const [label, value] of financialLines) {
      doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
      doc.text(label, MARGIN, y)
      doc.setTextColor(...hexToRgb(TEXT_COLOR))
      doc.text(value, MARGIN + CONTENT_W, y, { align: 'right' })
      y += 6
    }

    // Payouts
    if (payoutEvents.length > 0) {
      y += 2
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...hexToRgb(TEXT_COLOR))
      doc.text('Payouts:', MARGIN, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      let totalPaid = 0
      for (const pe of payoutEvents) {
        const pd = pe.details as PayoutDetails
        totalPaid += pd.amount
        const dateStr = formatDate(pe.createdAt)
        const methodStr = pd.method ? ` — ${pd.method}` : ''
        const refStr = pd.reference ? ` — ${pd.reference}` : ''
        doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
        doc.text(`${dateStr}${methodStr}${refStr}`, MARGIN + 4, y)
        doc.setTextColor(...hexToRgb(TEXT_COLOR))
        doc.text(formatCurrency(pd.amount, pd.currency), MARGIN + CONTENT_W, y, { align: 'right' })
        y += 5
      }

      y += 1
      y = drawDivider(doc, y)

      doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
      doc.text('Total Paid:', MARGIN, y)
      doc.setTextColor(...hexToRgb(TEXT_COLOR))
      doc.text(formatCurrency(totalPaid, currency), MARGIN + CONTENT_W, y, { align: 'right' })
      y += 6

      const remaining = consignorShare - totalPaid
      doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
      doc.text('Remaining:', MARGIN, y)
      doc.setTextColor(...hexToRgb(TEXT_COLOR))
      doc.text(formatCurrency(remaining, currency), MARGIN + CONTENT_W, y, { align: 'right' })
      y += 6

      if (remaining <= 0) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...hexToRgb('#059669'))
        doc.text('Status: Fully Paid \u2713', MARGIN, y)
      }
    }
  }

  // Offline notice
  if (failedPhotos) {
    doc.addPage()
    y = MARGIN
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...hexToRgb(SECONDARY_COLOR))
    doc.text('Some content may be missing. Regenerate while online for a complete document.', MARGIN, y)
  }

  // Add page numbers
  addPageFooter(doc, galleryName)

  onProgress?.('Done')
  return doc.output('blob')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function sharePdf(blob: Blob, filename: string): Promise<boolean> {
  if (!navigator.canShare?.({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
    return false
  }
  try {
    await navigator.share({
      files: [new File([blob], filename, { type: 'application/pdf' })],
      title: filename.replace('.pdf', ''),
    })
    return true
  } catch {
    return false
  }
}
