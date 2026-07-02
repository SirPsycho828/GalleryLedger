## Overview

Consignors are the people or entities who entrust artworks to the gallery. Managing consignor records is secondary to managing works -- consignors exist primarily so that works can be linked to their owner and payouts can be tracked against a named party. The consignor experience is a simple list/detail CRUD interface on the second tab of the app. The most important view is the consignor detail screen, which shows all works linked to that consignor and their payout status.

## Dependencies

- `02_Database_Schema.md` -- `consignors` collection schema, `works.consignorId` field, `workCount` denormalization
- `04_UI_Design_System.md` -- Card patterns, empty states, form inputs, touch targets
- `05_App_Shell_And_Navigation.md` -- Consignors tab root, navigation stack
- `06_Work_Intake.md` -- Inline consignor creation from the intake form
- `14_Sales_And_Payouts.md` -- Payout summary per consignor

## Consignor List Screen

Root screen of the Consignors tab. Shows all consignors in the gallery.

### Top Bar

- **Title**: "Consignors" in `heading-md`
- **Add icon** (Lucide `plus`, right side): navigates to the new consignor form

### List Layout

Each consignor displays as a card:

```
┌──────────────────────────────┐
│  Jane Doe                    │  ← heading-sm, text-primary
│  jane@example.com            │  ← small, text-secondary
│  4 works                     │  ← small, text-secondary
└──────────────────────────────┘
```

- **Name**: `heading-sm`, single line, truncate with ellipsis
- **Email**: `small`, `text-secondary`. Hidden if empty.
- **Work count**: `small`, `text-secondary`. Uses the denormalized `workCount` field. Displays as "{n} works" or "No works".
- **Card**: full-width, same card styling as work list cards (see `04_UI_Design_System.md`). No photo/avatar.
- **Tap**: navigates to `/consignors/:consignorId`

### Sorting

Default sort: `name` ascending (alphabetical). No user-selectable sort options at MVP.

**Query**: `galleries/{galleryId}/consignors` ordered by `name` ASC.

### Search

- Search icon in the top bar toggles a search input (same pattern as work list, see `11_Work_List_Dashboard.md`)
- Client-side substring match against `name`, `email`, `phone`
- Case-insensitive

### Empty State

When no consignors exist:

- Lucide `users` icon (48px, `text-tertiary`)
- "No consignors yet" in `heading-sm`
- "Consignors will appear here when you add them" in `body` / `text-secondary`
- Primary button: "Add a consignor"

## New Consignor Form

Accessible from:

1. The "+" icon on the consignor list top bar (navigates to `/consignors/new`)
2. The "Add new" option in the consignor dropdown during work intake (opens as bottom sheet, see `06_Work_Intake.md`)

### Form Fields

| Field   | Type           | Required | Notes                                               |
| ------- | -------------- | -------- | --------------------------------------------------- |
| Name    | Text input     | Yes      | Max 200 chars                                       |
| Email   | Email input    | No       | Standard email validation if provided               |
| Phone   | Tel input      | No       | No format validation -- international numbers vary  |
| Address | Multiline text | No       | Free-text mailing address. Max 500 chars.           |
| Notes   | Multiline text | No       | Private notes about this consignor. Max 2000 chars. |

### Save Behavior

- Creates the consignor document in `galleries/{galleryId}/consignors`
- Sets `workCount: 0`, `createdAt`, `updatedAt`
- Navigates to the consignor detail screen (if created from the list) or returns the new consignor ID to the intake form (if created inline)
- Toast: "Consignor added"

### Inline Creation (From Intake)

When creating a consignor from the work intake form's bottom sheet:

- Show only Name (required), Email, and Phone fields. Omit Address and Notes to keep it fast.
- On save: create the document, auto-select the new consignor in the intake form's dropdown, close the sheet
- The operator can add full details later from the consignor detail screen

## Consignor Detail Screen

The primary view for understanding a consignor's relationship with the gallery. Shows contact info, linked works, and a financial summary.

### Top Bar

- **Back arrow**: returns to consignor list
- **Title**: consignor name, truncated. `heading-md`.
- **Overflow menu** (Lucide `more-vertical`): "Edit" and "Delete"

### Contact Info Section

Displays the consignor's contact fields. Only shows fields that have values.

```
┌──────────────────────────────┐
│  📧  jane@example.com        │
│  📞  +1 (555) 123-4567       │
│  📍  123 Gallery Lane        │
│      New York, NY 10001      │
└──────────────────────────────┘
```

- Icons: Lucide `mail`, `phone`, `map-pin` in `text-secondary`
- Values: `body` / `text-primary`
- Tapping email opens the device mail client (`mailto:`)
- Tapping phone opens the device dialer (`tel:`)
- If all contact fields are empty: show "No contact info" in `text-tertiary` with an "Edit" link

### Notes Section

If `notes` is non-empty, show in a subtle card below contact info. `small` / `text-secondary`. Truncated to 3 lines with "Show more" toggle.

### Financial Summary

Aggregated across all works linked to this consignor. Displayed as a summary card.

```
┌──────────────────────────────┐
│  Financial Summary            │
│  ───────────────────────────  │
│  Works sold: 2 of 6          │
│  Total sales: $28,000        │
│  Total consignor share: $14,000 │
│  Total paid out: $10,000     │
│  Outstanding: $4,000         │
└──────────────────────────────┘
```

- **Works sold**: count of linked works where `status == "sold"` out of total linked works
- **Total sales**: sum of `salePrice` across sold works
- **Total consignor share**: sum of `salePrice * (1 - commissionRate)` across sold works
- **Total paid out**: sum of all `payout` event amounts across all linked works
- **Outstanding**: total consignor share minus total paid out

All values formatted with `Intl.NumberFormat`. Currency assumes USD at MVP (all works use the same currency -- see Gaps).

**Calculation**: This requires loading all works for this consignor and all payout events for sold works. At MVP scale (a consignor has 1-20 works), this is fine as client-side computation.

Card styling: `surface` background, 1px `border`, 6px radius. Hidden entirely if the consignor has zero works.

### Linked Works Section

A list of all works where `consignorId` matches this consignor. Uses the same card format as the work list dashboard (see `11_Work_List_Dashboard.md`) -- cover photo, artist, title, metadata, status badge.

**Section header**: "Works ({count})" in `heading-sm`

**Query**: `galleries/{galleryId}/works` where `consignorId == consignorId` ordered by `createdAt` DESC.

**Empty state** (consignor has no works): "No works from this consignor" in `body` / `text-secondary`. No CTA button -- works are linked to consignors during intake, not from the consignor screen.

**Tap behavior**: navigates to the work detail view (`/works/:workId`). This crosses tab boundaries (from Consignors tab to Works tab context). Implement as a direct navigation push -- no tab switch animation.

## Edit Consignor

Accessible from the overflow menu on the consignor detail screen. Opens the same form as new consignor, pre-filled with current values. All fields editable.

- Save updates the consignor document (`updatedAt` refreshed)
- Toast: "Consignor updated"
- No timeline event is created for consignor edits (consignors do not have timelines)

## Delete Consignor

Accessible from the overflow menu. Destructive action.

- Confirmation dialog: "Delete this consignor? Their works will not be deleted, but they will no longer be linked to a consignor."
- On confirm:
  - Delete the consignor document
  - Do NOT update linked works (the `consignorId` field becomes an orphaned reference)
  - The work detail view should handle a missing consignor gracefully: show "Consignor: Unknown" or hide the consignor line
- Navigate back to the consignor list
- Toast: "Consignor deleted"

**Why not clear `consignorId` on linked works?** At MVP, this would require querying and updating all linked works in a batch. For a rarely-used destructive action, the orphaned reference is acceptable. The work list and detail views handle missing consignors with a fallback display.

## Data Loading

### Consignor List

Real-time listener on `galleries/{galleryId}/consignors` ordered by `name` ASC. Skeleton cards while loading.

### Consignor Detail

Three queries on mount:

1. **Consignor document**: single document listener on `consignors/{consignorId}`
2. **Linked works**: `works` where `consignorId == consignorId` ordered by `createdAt` DESC
3. **Payout events**: for each sold work in the linked works result, query `works/{workId}/events` where `type == "payout"`. At MVP scale this is a small number of queries.

The financial summary computes after queries 2 and 3 resolve.

## Gaps and Assumptions

| Item                       | Default               | Notes                                                                                                                                                                                                             |
| -------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-currency aggregation | Not handled           | Financial summary assumes all works use the same currency. If works have mixed currencies, the summary will incorrectly sum different denominations. Acceptable at MVP -- most galleries operate in one currency. |
| Consignor merge/dedup      | Not supported         | No way to merge two consignor records that represent the same person. Manual only.                                                                                                                                |
| Consignor import           | Not supported         | No CSV import of existing consignor lists. Manual entry only at MVP.                                                                                                                                              |
| Consignor photo/avatar     | Not included          | No profile image. Name initials could serve as avatar post-MVP.                                                                                                                                                   |
| Communication log          | Not tracked           | No record of emails or calls with the consignor. Notes field serves as a manual log.                                                                                                                              |
| Consignor-initiated access | Not supported         | Consignors cannot log in to see their works or statements. Gallery operator shares info manually or via PDF. See `17_Future_Features.md`.                                                                         |
| `workCount` accuracy       | Eventually consistent | Count may drift if writes fail partially. Display-only, no business logic depends on it.                                                                                                                          |
| Linked work updates        | No cascade            | Changing a work's consignor does not update the old consignor's `workCount`. Client must decrement the old and increment the new.                                                                                 |
