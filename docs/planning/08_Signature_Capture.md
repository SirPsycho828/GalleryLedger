## Overview

Touch-drawn signature capture allows gallery operators to record a consignor's acknowledgment of condition at intake. The signature is captured on a full-screen canvas, saved as a PNG image, and uploaded to Firebase Storage. This is not a legally binding e-signature system -- it is a visual record that the consignor was present and saw the condition documentation. Signatures are optional at intake and cannot be added to other timeline events.

## Dependencies

- `02_Database_Schema.md` -- Signature stored in Storage, URL referenced in intake event `details.signatureUrl`
- `03_Security_Rules.md` -- Storage rules for `signatures/` path, 5 MB limit, PNG only
- `06_Work_Intake.md` -- Signature section in the intake form, save behavior
- `07_Photo_Capture_And_Storage.md` -- Same offline queue pattern for upload

## When Signatures Are Used

Only during work intake. The signature captures the consignor's acknowledgment that they have seen the intake condition assessment. It is attached to the intake timeline event.

Signatures do not appear on:

- Condition updates
- Location changes
- Sales or payouts
- Any other timeline event type

If a gallery needs signatures for other events (loan agreements, sale confirmations), those are handled by attaching scanned/photographed documents to timeline events. See `10_Timeline_Events.md` for the `document_attach` event type.

## Capture Screen

Full-screen overlay that hides the bottom tabs and top bar. Landscape orientation is encouraged but not forced -- the screen works in both orientations.

### Layout

```
┌──────────────────────────────────────────┐
│  ✕ Close                    Clear  Done  │  ← Toolbar
├──────────────────────────────────────────┤
│                                          │
│                                          │
│           [Canvas Area]                  │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│  Sign above to acknowledge condition     │  ← Instruction text
└──────────────────────────────────────────┘
```

### Toolbar

- **Close (X icon)**: Returns to the intake form without saving. If the canvas has strokes, show a confirmation dialog: "Discard signature?"
- **Clear**: Resets the canvas to blank. No confirmation needed.
- **Done**: Saves the signature and returns to the intake form. Disabled until at least one stroke is drawn.

Toolbar height: 48px. Buttons meet 44px touch target minimum. `text-primary` icons/text on `background` (white).

### Canvas Area

- Fills all available space between toolbar and instruction text
- White background (`#FFFFFF`)
- Border: 1px `border` (gray-200)
- Drawing color: `#111827` (gray-900) -- dark enough for clear reproduction in PDFs
- Stroke width: 2.5px -- balances legibility with natural pen feel
- Stroke rendering: use `lineCap: "round"` and `lineJoin: "round"` for smooth lines
- Touch response must feel immediate -- no perceptible latency between finger movement and stroke appearance

### Instruction Text

Single line below the canvas: "Sign above to acknowledge condition at intake"

Font: `small` (14px), `text-secondary` color. Centered.

## Canvas Implementation

Use the HTML5 Canvas API with touch event handling. No third-party signature library needed -- the implementation is straightforward.

### Touch/Pointer Events

Use Pointer Events API (unified touch, mouse, and stylus support):

- `pointerdown`: Begin a new stroke path. Record starting point.
- `pointermove`: Draw line segments to current position. Only while pointer is pressed.
- `pointerup` / `pointerleave`: End the current stroke.

Set `touch-action: none` on the canvas element to prevent scroll/zoom interference.

### Drawing Logic

- On `pointerdown`: call `beginPath()`, `moveTo(x, y)`
- On `pointermove`: call `lineTo(x, y)`, `stroke()`
- Coordinate translation: use `getBoundingClientRect()` to convert page coordinates to canvas coordinates. Account for device pixel ratio for sharp rendering on high-DPI screens.

### High-DPI Rendering

Canvas must render crisply on retina displays:

- Set the canvas element's `width`/`height` attributes to `clientWidth * devicePixelRatio` and `clientHeight * devicePixelRatio`
- Scale the rendering context: `ctx.scale(devicePixelRatio, devicePixelRatio)`
- Set CSS `width`/`height` to fill the container (CSS pixels, not canvas pixels)
- This ensures strokes appear sharp on 2x and 3x displays

### Empty Detection

Track whether any stroke has been drawn (a simple boolean flag set on first `pointerdown`). "Done" button is disabled when the canvas is empty. "Clear" resets this flag.

## Export and Storage

### Export Format

When the user taps "Done":

1. Export the canvas as PNG: `canvas.toDataURL("image/png")`
2. Convert the data URL to a Blob
3. Typical file size: 10-50 KB for a signature on white background (well under the 5 MB Storage limit)

PNG chosen over JPEG because:

- Signatures are line art on a solid background -- PNG compresses this more efficiently
- No compression artifacts on sharp lines
- Transparent background possible if needed in future (though MVP uses white)

### Upload

**Storage path**: `galleries/{galleryId}/works/{workId}/signatures/{timestamp}_{randomId}.png`

Same upload pattern as photos (see `07_Photo_Capture_And_Storage.md`):

- If online: upload immediately, get download URL
- If offline: queue in IndexedDB alongside photo queue, upload when connectivity returns

### Firestore Reference

The signature URL is stored in the intake event's `details.signatureUrl` field. It is not stored as a separate document in the `photos` subcollection -- signatures are not gallery photos and should not appear in the photo viewer or photo count.

## Display

### In the Intake Form (Before Save)

After capture, show a thumbnail preview in the signature section of the form:

- Image dimensions: full form width, max 80px height
- Border: 1px `border`
- Radius: 6px
- Below the image: "Tap to recapture" hint text in `small` / `text-tertiary`
- Tapping the preview reopens the signature capture screen (discard and recapture)

### In the Timeline (After Save)

On the intake event in the work's timeline:

- Show a "Consignor signature" label with the signature image
- Image displayed at reduced size: max 200px width, proportional height
- Tapping the image opens it in the full-screen photo viewer (same viewer used for photos)

### In the PDF Provenance Pack

The signature image is embedded in the intake section of the exported PDF. See `15_PDF_Provenance_Pack.md` for layout details.

## One Signature Per Intake

Each work's intake event has at most one signature. Recapturing replaces the previous signature (before saving the intake form). After the intake form is saved, the signature is part of the intake event and subject to the 15-minute edit grace period (see `09_Timeline_Architecture.md`). After the grace period, the signature is permanent.

There is no way to add a signature to an existing work after the initial intake event has been saved and the grace period has elapsed. If the consignor was not present at intake, the signature field remains null. This is by design -- the signature specifically attests to presence at intake.

## Gaps and Assumptions

| Item                               | Default                      | Notes                                                                                                                                                                 |
| ---------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legal validity                     | Not a legal e-signature      | No ESIGN/UETA compliance. The signature is a visual record, not a binding contract. If legal signatures are needed, the gallery uses their existing paper process.    |
| Typed name with signature          | Not captured                 | No typed name field accompanies the drawn signature. The consignor's identity is established by the `consignorId` on the work record.                                 |
| Date/time stamp on signature image | Not embedded                 | The timestamp comes from the intake event's `createdAt` field, not from text burned into the signature image.                                                         |
| Stylus support                     | Supported via Pointer Events | Pointer Events API handles stylus pressure natively, but stroke width is fixed at 2.5px (no pressure sensitivity). Pressure-variable width is a post-MVP enhancement. |
| Signature pad orientation          | Both portrait and landscape  | No forced orientation. Landscape gives more signing space but is not required.                                                                                        |
| Undo last stroke                   | Not implemented              | Only "Clear all" is available. Single-stroke undo adds complexity for minimal value -- most signatures are drawn in one continuous motion.                            |
| Accessibility                      | Limited                      | Signature capture is inherently visual and touch-dependent. No alternative input method at MVP.                                                                       |
