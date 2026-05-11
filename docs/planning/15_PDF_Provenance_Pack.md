▸ Extended thinking (512 chars)  
## Overview

The provenance pack is a PDF document that bundles a work's complete record into a single shareable file: photos, details, condition history, timeline events, and signatures. It is the deliverable that makes GalleryLedger's documentation useful outside the app -- for consignors, buyers, insurers, and the gallery's own files. Generated entirely client-side using a JavaScript PDF library. Works offline.

## Dependencies

- `02_Database_Schema.md` -- All work fields, events, photos, consignor data
- `04_UI_Design_System.md` -- DM Sans font, color tokens for PDF styling
- `07_Photo_Capture_And_Storage.md` -- Photo download URLs, full-resolution images
- `08_Signature_Capture.md` -- Signature image display in PDF
- `09_Timeline_Architecture.md` -- Event ordering, derived state
- `12_Work_Detail_View.md` -- Export button in top bar

## Library Choice

Use `jsPDF` with the `jspdf-autotable` plugin for table layouts. Alternatives (`pdf-lib`, `pdfmake`) also work, but `jsPDF` has the broadest community support for client-side generation with image embedding.

**Font embedding**: Embed DM Sans (regular and bold weights) as a base64-encoded TTF in the build. This ensures the PDF matches the app's typography regardless of the viewer's installed fonts. Total font bundle: approximately 150-200 KB.

## Export Entry Points

1. **Work detail top bar**: the share/export icon (Lucide `share`). See `12_Work_Detail_View.md`.
2. No bulk export across multiple works at MVP.

Tapping the export icon opens a bottom sheet with export options before generating the PDF.

## Export Options

The bottom sheet presents two choices:

### Full Timeline Export

Includes everything: cover photo, work details, all timeline events with photos and notes in chronological order, condition history, and signatures.

**When to use**: comprehensive record for gallery files, insurance, or legal reference.

### Selective Export

Lets the operator choose which timeline events to include. Useful for sharing only relevant information with a specific audience (buyer sees sale info but not internal notes, consignor sees condition history but not buyer details).

**Selection UI**:
- List of all timeline events as checkboxes, each showing date and description
- "Select all" / "Deselect all" toggle at the top
- Work details and cover photo are always included (not toggleable)
- "Generate PDF" button at the bottom, disabled until at least one event is selected

## PDF Layout

### Page Setup

| Property | Value |
|----------|-------|
| Page size | A4 (210 x 297 mm) |
| Orientation | Portrait |
| Margins | 20 mm all sides |
| Content width | 170 mm |
| Font | DM Sans Regular (body), DM Sans Bold (headings) |
| Body font size | 10pt |
| Heading font size | 14pt |
| Sub-heading font size | 11pt |
| Color -- text | #111827 (gray-900) |
| Color -- secondary text | #6B7280 (gray-500) |
| Color -- dividers | #E5E7EB (gray-200) |
| Color -- accent | #1D4ED8 (blue-700) |

### Page 1: Cover Page

```
┌─────────────────────────────────┐
│                                 │
│  [Cover Photo]                  │  ← Largest intake photo, centered
│  (max 140mm wide, aspect fit)   │
│                                 │
│  Artist Name                    │  ← 18pt bold
│  Work Title                     │  ← 14pt italic
│  Medium, Dimensions, Year       │  ← 10pt secondary
│                                 │
│  ─────────────────────────────  │
│  Status: On Display             │
│  Consignor: Jane Doe            │
│  Intake Date: May 1, 2025       │
│                                 │
│  ─────────────────────────────  │
│  Gallery Name                   │  ← 10pt, bottom of page
│  Generated: May 11, 2026        │
│                                 │
└─────────────────────────────────┘
```

**Cover photo**: The first photo by `sortOrder`. Scaled to fit within 140mm width and 120mm height, maintaining aspect ratio. If no photos exist, omit the image and move text up.

**Generation timestamp**: "Generated {date} via GalleryLedger" at the bottom of the cover page. This establishes when the document was produced.

### Page 2+: Work Details and Condition at Intake

```
┌─────────────────────────────────┐
│  Work Details                   │  ← Section heading
│  ─────────────────────────────  │
│  Artist:      Jane Smith        │
│  Title:       Untitled No. 7    │
│  Medium:      Oil on canvas     │
│  Dimensions:  24 x 36 in       │
│  Year:        2023              │
│  Consignor:   John Collector    │
│  Notes:       Acquired from...  │
│                                 │
│  Condition at Intake            │  ← Section heading
│  ─────────────────────────────  │
│  Date: May 1, 2025             │
│  Overall: Good                  │
│  Notes: Minor wear on frame...  │
│  Issues: Scratches, Frame dmg   │
│                                 │
│  [Intake Photo 1] [Photo 2]    │  ← Grid of intake photos
│  [Photo 3]        [Photo 4]    │
│                                 │
│  [Signature Image]              │  ← If captured
│  Consignor signature            │
│                                 │
└─────────────────────────────────┘
```

**Condition checklist**: List only the items that were checked (issues present). Format as a comma-separated list or short table depending on count.

**Intake photos**: Arranged in a 2-column grid. Each photo scaled to fit within 80mm x 60mm. Maximum 6 photos per page. If more than 6 intake photos, overflow to the next page.

**Signature**: Displayed at approximately 60mm width, proportional height. Labeled "Consignor signature -- {date}".

### Remaining Pages: Timeline Events

Each event renders as a block:

```
┌─────────────────────────────────┐
│  Timeline                       │  ← Section heading (first page only)
│  ─────────────────────────────  │
│                                 │
│  ● May 5, 2025 · Location      │  ← Date + event type label
│    Moved from Back storage      │  ← Description
│    to Main gallery              │
│                                 │
│  ● May 8, 2025 · Condition     │
│    Condition updated to Good    │
│    Minor scuff on lower right   │
│    [Photo]  [Photo]             │  ← Event photos if any
│                                 │
│  ● May 15, 2025 · Sale         │
│    Sold for $12,000.00          │
│    Commission: 50% ($6,000)     │
│    Buyer: Sarah Patron          │
│                                 │
│  ● May 20, 2025 · Payout       │
│    Payout of $6,000.00          │
│    Method: Wire transfer        │
│    Ref: TXN-2025-0520          │
│                                 │
└─────────────────────────────────┘
```

**Event type labels**: Displayed next to the date in `accent` color. Mapped from internal type codes to display names:

| Type | Label |
|------|-------|
| `intake` | Intake |
| `condition_update` | Condition Update |
| `location_change` | Location Change |
| `status_change` | Status Change |
| `sale` | Sale |
| `payout` | Payout |
| `note` | Note |
| `document_attach` | Document |

**Event photos**: 2-column grid, same sizing as intake photos. Maximum 4 photos per event in the PDF (if more exist, show first 4 with a note "(+N more photos in app)").

**Financial events**: Sale and payout events include formatted monetary values. Use the same `Intl.NumberFormat` approach as the app display, but format to a string for PDF insertion.

**Document attachments**: Show the filename. PDFs and images cannot be embedded inside the provenance PDF. Note: "See attached document: {filename}".

### Final Page: Financial Summary

Included only if the work has a sale event.

```
┌─────────────────────────────────┐
│  Financial Summary              │
│  ─────────────────────────────  │
│                                 │
│  Sale Price:        $12,000.00  │
│  Commission (50%):  -$6,000.00  │
│  Consignor Share:    $6,000.00  │
│                                 │
│  Payouts:                       │
│  May 20 — Wire — $4,000.00     │
│  Jun 15 — Check #1234 — $2,000 │
│  ─────────────────────────────  │
│  Total Paid:         $6,000.00  │
│  Remaining:              $0.00  │
│  Status: Fully Paid ✓          │
│                                 │
└─────────────────────────────────┘
```

## Generation Process

### Step 1: Gather Data

Before generating the PDF, load all required data:

1. Work document fields
2. All events (or selected events if selective export), ordered by `createdAt` ASC
3. All photo URLs referenced in the work and selected events
4. Consignor name (if linked)
5. Gallery name (from gallery document)

### Step 2: Download Images

Photos must be fetched as image data (base64 or ArrayBuffer) before embedding in the PDF. Firebase Storage download URLs are cross-origin, so fetch them via the standard `fetch` API (Firebase Storage URLs include auth tokens and allow CORS).

**Performance concern**: downloading 10-20 full-resolution photos is slow and memory-intensive. Mitigation:
- Show a progress indicator: "Generating PDF... (loading photos)"
- Download photos sequentially, not in parallel, to avoid memory spikes
- Scale photos down to 1200px on the longest side before embedding. This is sufficient for print quality at the sizes used in the PDF (approximately 150 DPI). Use Canvas API for client-side downscaling.
- If a photo fails to download (e.g., offline and not cached), insert a placeholder box with "Photo unavailable" text

### Step 3: Build PDF

Construct the PDF page by page using `jsPDF`:
- Add the cover page
- Add work details and intake condition
- Add timeline events, tracking vertical position and inserting page breaks when content would overflow
- Add financial summary if applicable
- Set document metadata: title = "{artist} - {title}", author = gallery name

### Step 4: Deliver

Two delivery options presented after generation:

1. **Download**: trigger a browser download with filename `{artist}_{title}_provenance.pdf`
2. **Share** (mobile): use the Web Share API (`navigator.share`) if available, passing the PDF blob as a file. This opens the native share sheet for sending via email, messaging, AirDrop, etc.

If Web Share API is not available (desktop browsers, older devices), show only the download option.

## Progress and Error Handling

### Progress Indicator

Full-screen overlay with a centered spinner and status text:
- "Preparing document..."
- "Loading photos (3 of 12)..."
- "Generating PDF..."
- "Done"

Overlay prevents interaction during generation. Dismiss automatically on completion or error.

### Error States

| Error | Handling |
|-------|---------|
| Photo download fails | Skip the photo, insert placeholder. Continue generation. Show toast after: "Some photos could not be loaded." |
| PDF generation fails | Show error toast: "PDF generation failed. Please try again." Log error for debugging. |
| Insufficient memory | Possible with many large photos. Mitigated by downscaling. If it still fails, suggest selective export with fewer events. |

## Offline Behavior

PDF generation works offline if:
- Work and event data are available from Firestore offline cache (they will be if the user has viewed the work recently)
- Photos are available from the service worker cache or browser cache

Photos that are not cached will fail to download and be replaced with placeholders. The PDF is still generated with available data. A note at the bottom: "Some content may be missing. Regenerate while online for a complete document."

## Gaps and Assumptions

| Item | Default | Notes |
|------|---------|-------|
| PDF library | jsPDF + jspdf-autotable | Not specified in PRD. jsPDF is the most common client-side option. Could substitute pdf-lib or pdfmake. |
| Photo resolution in PDF | 1200px longest side | Full-resolution photos are too large for PDF embedding. Downscale client-side before inserting. |
| PDF file size | Estimated 2-15 MB | Depends on photo count and resolution. 10 photos at 1200px JPEG quality 80 is approximately 5-8 MB total. |
| Watermarking | Not included | No gallery logo watermark on photos. Post-MVP if galleries want branded exports. |
| PDF password protection | Not included | No encryption or access control on generated PDFs. |
| Batch export | Not supported | One PDF per work. Exporting all works at once deferred. See `17_Future_Features.md`. |
| Custom PDF templates | Not supported | Fixed layout. Custom branding (logo, colors, footer text) deferred. |
| Page numbers | Included | "Page X of Y" in footer, 8pt, centered, `text-secondary` color. |
| Document attached files | Not embedded | Files attached via `document_attach` events are referenced by name but not included in the PDF. |  
