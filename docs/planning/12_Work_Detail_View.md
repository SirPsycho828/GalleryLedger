## Overview

The work detail view is the primary screen for interacting with an individual work. It combines a header card showing key information and photos with a vertical chronological timeline of all events below. This is where the operator goes to answer "what's the full story of this work?" and where they add new timeline events. The top bar is sticky on this screen to keep the FAB spatially anchored.

## Dependencies

- `02_Database_Schema.md` -- `works` fields, `events` subcollection, `photos` subcollection
- `04_UI_Design_System.md` -- Cards, badges, typography, FAB sizing, touch targets
- `07_Photo_Capture_And_Storage.md` -- Photo display, full-screen viewer
- `09_Timeline_Architecture.md` -- Event ordering, grace period, derived state
- `10_Timeline_Events.md` -- Event types, FAB menu order, form definitions

## Screen Structure

```
┌──────────────────────────────┐
│  ←  Work Title      ⋮  📤   │  ← Sticky top bar: back, title, menu, export
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │   [Photo Carousel]     │  │  ← Swipeable photos
│  └────────────────────────┘  │
│  Artist Name                 │
│  Medium • Dimensions • Year  │
│  Consignor: Jane Doe         │
│  [On Display]                │
│  ──────────────────────────  │
│  Current Location: Main Room │
│  Condition: Good             │
│  ──────────────────────────  │
│                              │
│  TIMELINE                    │
│  ● May 1 — Work received    │
│  │  condition: Excellent     │
│  │                           │
│  ● May 5 — Moved to Main    │
│  │                           │
│  ● May 8 — Condition updated │
│  │  [photo thumbnails]       │
│  │                           │
│                    [+ FAB]   │
├──────────────────────────────┤
│  [Works]  [Consignors]  [⚙] │
└──────────────────────────────┘
```

## Top Bar

Sticky position on this screen (exception to the general scroll-away pattern noted in `05_App_Shell_And_Navigation.md`).

- **Back arrow** (left): returns to the work list
- **Title** (center): work title, truncated with ellipsis. `heading-md`.
- **Export icon** (right, Lucide `share`): triggers PDF provenance pack export. See `15_PDF_Provenance_Pack.md`.
- **Overflow menu** (right, Lucide `more-vertical`): contains "Edit work details" and "Delete work"

## Header Section

Sits at the top of the scrollable content area, above the timeline.

### Photo Carousel

- Full content width, 4:3 aspect ratio container
- Swipeable left/right through all photos in `sortOrder`
- Dot indicators below the carousel showing position (standard pagination dots)
- If no photos: show the placeholder (gray `surface` background, Lucide `image` icon centered, `text-tertiary`)
- Tapping any photo opens the full-screen photo viewer (see `07_Photo_Capture_And_Storage.md`)
- Lazy load: display the visible photo, preload one ahead in each direction

### Work Details

Below the carousel, plain text layout:

| Element | Style | Content |
|---------|-------|---------|
| Artist | `heading-md`, `text-primary` | `work.artist` |
| Title | `body`, `text-primary`, italic | `work.title` |
| Metadata | `small`, `text-secondary` | Medium, dimensions, year joined with " -- ". Omit empty fields. |
| Consignor | `small`, `text-secondary` | "Consignor: {name}" -- tappable, navigates to consignor detail. Hidden if no consignor linked. |
| Status badge | Status pill per design system | `work.status` |

### Derived State Summary

A subtle divider separates work details from derived state. This section shows values computed from timeline events (see `09_Timeline_Architecture.md`).

| Field | Source | Display |
|-------|--------|---------|
| Current location | Latest `location_change` event `details.to` | "Location: {value}" or "Location: Not recorded" |
| Current condition | Latest `condition_update` or intake event | "Condition: {conditionSummary}" |
| Notes | `work.notes` | Shown only if non-empty. Truncated to 3 lines with "Show more" toggle. |

Style: `small` / `text-secondary` for labels, `body` / `text-primary` for values.

### Financial Summary

Shown only when `work.salePrice` is not null (work has been sold).

```
Sale: $12,000
Gallery commission (50%): $6,000
Consignor share: $6,000
Paid out: $4,000
Remaining: $2,000
```

- Format currency with `Intl.NumberFormat` using `work.currency`
- "Paid out" is the sum of all `payout` event amounts
- "Remaining" is consignor share minus paid out. If negative (overpaid), show in `destructive` color.
- Entire block styled as a subtle card: `surface` background, 1px `border`, 6px radius, 12px padding
- Hidden entirely if no sale event exists

## Timeline Section

### Section Header

"Timeline" label in `heading-sm`, with a count: "Timeline (8 events)". Separated from the header section by 24px spacing.

### Event Cards

Events display as a vertical timeline with a connecting line on the left.

```
●  May 1, 2025 · 2:34 PM              [Edit]
│  Work received — condition: Excellent
│  ┌──────┬──────┬──────┐
│  │ 📷   │ 📷   │ 📷   │  ← photo thumbnails
│  └──────┴──────┴──────┘
│  Consignor signature captured
│
●  May 5, 2025 · 11:15 AM
│  Moved from Back storage to Main gallery
│
●  May 8, 2025 · 3:20 PM
│  Condition updated to Good
│  Minor scuff on lower right corner
│  ┌──────┐
│  │ 📷   │
│  └──────┘
```

### Event Card Anatomy

- **Timeline dot**: 12px circle, `accent` color for the most recent event, `border-strong` for all others
- **Connecting line**: 2px wide, `border` color, runs vertically between dots
- **Date/time**: `small` / `text-secondary`. Format: "May 1, 2025 -- 2:34 PM" using `Intl.DateTimeFormat`.
- **Edit button**: Appears only during the 15-minute grace period. `small` ghost button, right-aligned on the date line. Tapping opens the event's form pre-filled for editing. Hidden after `editableUntil` passes (compare against `Date.now()`).
- **Description**: `body` / `text-primary`. The event's `description` field.
- **Detail text**: Type-specific extra info rendered below the description. `small` / `text-secondary`.
  - Condition events: show the condition notes
  - Location changes: no extra detail (from/to is in the description)
  - Sales: show formatted price and commission
  - Payouts: show amount and method
  - Document attachments: show filename as tappable link
- **Photo thumbnails**: If `photoUrls` is non-empty, show a horizontal row of 56x56px square thumbnails. Tappable to open full-screen viewer.
- **Signature indicator**: For intake events with a signature, show "Consignor signature captured" as a small text note with a Lucide `pen-tool` icon. Tapping opens the signature image in the viewer.

### Event Card Expansion

Events are fully visible by default -- no collapsed/expanded state. Every event shows its full content at all times. This keeps the timeline scannable without requiring taps to reveal information.

Exception: if `conditionNotes` or a note description exceeds 4 lines, truncate with "Show more" toggle.

## Floating Action Button (FAB)

- Position: fixed, bottom-right, 16px from right edge, 80px from bottom (clears the bottom tabs)
- Size: 56x56px circle
- Color: `accent` background, white icon
- Icon: Lucide `plus`
- Shadow: `shadow-lg`

### FAB Menu

Tapping the FAB opens a bottom sheet listing event types to create. See `10_Timeline_Events.md` for the order:

1. Condition Update
2. Location Change
3. Status Change
4. Note
5. Sale
6. Payout
7. Attach Document

Each item shows a Lucide icon and the event type name. Tapping an item closes the sheet and opens the event creation form as a new bottom sheet or pushed screen.

### Event Creation Flow

1. User taps FAB
2. Selects event type from the menu
3. Event form opens (bottom sheet, max 85vh)
4. User fills fields and taps "Save"
5. Event is created in Firestore (batched write with any side effects)
6. Bottom sheet closes
7. New event appears at the bottom of the timeline
8. Success toast: "{Event type} added"

## Edit Work Details

Accessible from the overflow menu (three-dot icon) in the top bar. Opens a form (pushed screen or large bottom sheet) with the editable work fields:

- Artist, title, medium, dimensions, year, consignor, notes
- Same field layout as the intake form (see `06_Work_Intake.md`) minus photos and condition
- Save updates the work document directly
- This does not create a timeline event -- it edits the work's metadata, not its history

## Delete Work

Accessible from the overflow menu. Destructive action with confirmation.

- Confirmation dialog: "Delete this work? This will permanently remove the work and its entire timeline. This cannot be undone."
- Two buttons: "Cancel" (secondary) and "Delete" (destructive style)
- On confirm: delete all `events` documents, all `photos` documents, all Storage files (photos, signatures, documents), then the work document itself
- Navigate back to the work list after deletion
- Show toast: "Work deleted"
- If the work had a consignor, decrement the consignor's `workCount`

This is a multi-step client-side deletion. If it partially fails (e.g., offline), some orphaned data may remain. Acceptable at MVP.

## Data Loading

### Queries

Two real-time listeners on screen mount:

1. **Work document**: `galleries/{galleryId}/works/{workId}` -- single document listener
2. **Events**: `galleries/{galleryId}/works/{workId}/events` ordered by `createdAt` ASC -- collection listener

Photos are loaded via the work's `coverPhotoUrl` and event `photoUrls`. No separate photos collection listener needed unless the photo carousel needs to show all photos independent of events.

**Third optional listener**: `works/{workId}/photos` ordered by `sortOrder` ASC, for the header carousel. Only if photos exist that are not attached to any event (standalone gallery photos added after intake).

### Loading State

Show skeleton placeholder for the header section and 3 skeleton timeline cards while data loads.

## Gaps and Assumptions

| Item | Default | Notes |
|------|---------|-------|
| Timeline pagination | Not implemented | All events loaded in one query. Sufficient for 5-30 events typical. |
| Event type icons in timeline | Optional enhancement | Each event type could have a distinct icon on the timeline dot. Not specified, but would improve scannability. |
| Edit history | Not visible | Edits during the grace period are silent. No "edited" indicator on the event card. |
| Share single event | Not supported | Cannot share or link to a specific timeline event. Only full work export via PDF. |
| Reorder photos | Not supported at MVP | Photo carousel shows `sortOrder` from upload sequence. Manual reordering deferred. |
| Work archive vs delete | Delete only | No soft archive. Deleted works are gone. See `17_Future_Features.md` for archive feature. |
| Print timeline | Via PDF export only | No browser print styling for this screen. Use the PDF provenance pack. |  
