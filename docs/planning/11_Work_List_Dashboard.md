## Overview

The work list dashboard is the home screen of GalleryLedger -- the first thing an operator sees after signing in. It shows every work in the gallery as a visual list with cover photos, key details, and status badges. The primary actions are searching/filtering to find a specific work and tapping through to the work detail view. A prominent "Add work" button provides the entry point to the intake flow.

## Dependencies

- `02_Database_Schema.md` -- `works` collection fields, composite indexes for filtering
- `04_UI_Design_System.md` -- Card patterns, status badges, empty states, typography, touch targets
- `05_App_Shell_And_Navigation.md` -- Works tab root, top bar actions, bottom tabs
- `06_Work_Intake.md` -- "Add work" navigates to `/works/new`
- `12_Work_Detail_View.md` -- Tapping a work card navigates to `/works/:workId`

## Screen Layout

```
┌──────────────────────────────┐
│  Works              🔍  ＋   │  ← Top bar: title, search toggle, add button
├──────────────────────────────┤
│  [Filter chips row]          │  ← Horizontal scroll, optional
├──────────────────────────────┤
│  ┌────────────────────────┐  │
│  │ 🖼 Artist Name         │  │
│  │    Work Title           │  │
│  │    Medium • Dimensions  │  │
│  │    [Status Badge]       │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │ 🖼 Artist Name         │  │
│  │    ...                  │  │
│  └────────────────────────┘  │
│           ...                │
├──────────────────────────────┤
│  [Works]  [Consignors]  [⚙] │  ← Bottom tabs
└──────────────────────────────┘
```

## Top Bar

- **Title**: "Works" in `heading-md`
- **Search icon** (Lucide `search`, right side): toggles the search bar open/closed
- **Add icon** (Lucide `plus`, right side): navigates to `/works/new` (intake flow)

When search is toggled open, the title row is replaced by a text input with auto-focus and a cancel button to close. See the Search section below.

## Work Cards

Each work displays as a horizontal card with the cover photo on the left and details on the right.

### Card Layout

```
┌──────┬──────────────────────┐
│      │ Artist Name           │  ← heading-sm, text-primary
│ Photo│ Work Title            │  ← body, text-primary
│ 72x72│ Oil on canvas • 24x36│  ← small, text-secondary
│      │ [On Display]          │  ← status badge
└──────┴──────────────────────┘
```

- **Photo**: 72x72px square, `object-fit: cover`, 6px radius. Shows `coverPhotoUrl`. If null, show the placeholder (gray background with Lucide `image` icon).
- **Artist**: `heading-sm` weight, single line, truncate with ellipsis
- **Title**: `body` weight, single line, truncate with ellipsis
- **Metadata line**: Medium and dimensions joined with " -- ". If both are empty, hide the line. `small` size, `text-secondary`.
- **Status badge**: Pill badge per `04_UI_Design_System.md` status color table

### Card Interaction

- Entire card is tappable (minimum 72px height for touch target)
- Tap navigates to `/works/:workId` (work detail view)
- No swipe actions, no long-press menus at MVP

### Card Spacing

- 12px gap between cards
- Cards are full-width (minus page padding)

## Sorting

Default sort: `updatedAt` descending (most recently modified first). This surfaces works with recent activity at the top.

No user-selectable sort options at MVP. The default sort handles the primary use case: "which works have I been dealing with recently?"

**Query**: `galleries/{galleryId}/works` ordered by `updatedAt` DESC. Uses the composite index on `status` + `updatedAt` when a filter is active.

## Filtering

### Status Filter Chips

A horizontal scrollable row of filter chips below the top bar. One chip per status plus an "All" chip.

| Chip       | Filter                                |
| ---------- | ------------------------------------- |
| All        | No filter (default, selected on load) |
| Intake     | `status == "intake"`                  |
| In Storage | `status == "in_storage"`              |
| On Display | `status == "on_display"`              |
| On Loan    | `status == "on_loan"`                 |
| Shipped    | `status == "shipped"`                 |
| Sold       | `status == "sold"`                    |
| Returned   | `status == "returned"`                |

**Chip styling**: Unselected chips use `surface` background with `border`. Selected chip uses `accent-subtle` background with `accent` text. `caption` font size.

**Behavior**: Tapping a chip filters the list to that status. Tapping "All" clears the filter. Only one filter active at a time.

**Count badges**: Each chip shows the count of works in that status, e.g., "On Display (4)". Counts are computed client-side from the full work list (already loaded for a 20-100 work gallery).

### Consignor Filter

Not available on this screen at MVP. Users navigate to the Consignors tab and tap a consignor to see their works. See `13_Consignor_Management.md`.

## Search

### Search Bar

Toggled open by the search icon in the top bar. Replaces the title with a text input.

- Placeholder: "Search by artist, title, or medium"
- Auto-focus on open
- Cancel button to close and clear
- Search executes on each keystroke (client-side filtering, no debounce needed for 20-100 works)

### Search Logic

Client-side text matching against loaded works. Case-insensitive substring match across these fields:

- `artist`
- `title`
- `medium`
- `notes`

A work matches if any of these fields contain the search string. Results replace the main list in real time.

Search and status filters combine: if a status filter is active and the user searches, results are filtered by both status AND search text.

### No Results

When search or filter yields zero results, show a centered message:

- If searching: "No works matching '{query}'"
- If filtering: "No works with status '{status}'"
- If both: "No matching works"

No illustration. Just the text in `body` / `text-secondary`.

## Empty State

When the gallery has zero works (fresh account after onboarding):

- Centered Lucide `image-plus` icon (48px, `text-tertiary`)
- Heading: "No works yet" in `heading-sm`
- Body: "Add your first work to start building your gallery's records" in `body` / `text-secondary`
- Primary button: "Add a work" (navigates to `/works/new`)

No filter chips or search icon shown when the gallery has zero works. They appear once the first work is created.

## Data Loading

### Initial Load

On mount, subscribe to the `works` collection with a real-time listener (`onSnapshot`):

- Query: `galleries/{galleryId}/works` ordered by `updatedAt` DESC
- Real-time listener ensures the list updates when data changes on another device or after an offline sync
- Show skeleton cards (3-4 placeholder cards per `04_UI_Design_System.md`) while the first snapshot loads

### Offline Behavior

Firestore's offline persistence serves the cached work list when offline. The real-time listener fires with cached data immediately, then updates when connectivity returns. No special handling needed -- the list renders the same regardless of online/offline state.

The offline indicator banner (see `05_App_Shell_And_Navigation.md`) appears above the list when offline.

## Pull-to-Refresh

Not implemented at MVP. The real-time Firestore listener keeps data current. Pull-to-refresh is a pattern for REST APIs with manual fetching -- unnecessary with real-time subscriptions.

## Performance

With a target inventory of 20-100 works, the entire collection fits in a single Firestore query response. No pagination, virtualization, or infinite scroll needed at MVP.

If performance becomes a concern post-MVP (galleries with 500+ works), add cursor-based pagination and list virtualization. See `17_Future_Features.md`.

## Responsive Behavior

| Breakpoint        | Layout                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Default (< 768px) | Single-column list of horizontal cards                                                      |
| `md` (768px+)     | 2-column grid of cards. Cards retain the same horizontal layout but arrange in two columns. |

At `md` breakpoint, the top bar and filter chips remain full-width. Only the card grid changes.

## Gaps and Assumptions

| Item                 | Default               | Notes                                                                                                     |
| -------------------- | --------------------- | --------------------------------------------------------------------------------------------------------- |
| Sort options         | `updatedAt` DESC only | No user-selectable sorting. Covers 90% of the use case. Post-MVP: add sort by artist, title, intake date. |
| Multi-status filter  | Not supported         | Single status filter only. Multi-select (e.g., "show On Display and On Loan") deferred.                   |
| Work count display   | Not shown             | Total work count is not displayed in the top bar. Could be added easily but not specified.                |
| Bulk actions         | Not supported         | No multi-select, no bulk status change, no bulk delete. Post-MVP.                                         |
| List vs. grid toggle | Not offered           | Single list layout. A grid/thumbnail view could be added post-MVP for visual browsing.                    |
| Fuzzy search         | Not implemented       | Exact substring matching only. Typo tolerance or fuzzy matching deferred.                                 |
| Recently viewed      | Not tracked           | No "recently viewed" section or sort. `updatedAt` sort serves a similar purpose.                          |
