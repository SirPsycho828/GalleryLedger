# App Tour Design — GalleryLedger

## Overview

A lightweight, custom-built app tour that introduces new users to GalleryLedger's key sections and actions on their first visit. No external tour library — uses Framer Motion (already a dependency) for animations and a simple overlay+spotlight approach for highlighting targets.

## Trigger

- Auto-starts on first visit to the Works list page (the main dashboard), with a 600ms delay to let the DOM settle
- State stored in localStorage: `gl-tour-completed` (boolean)
- If `gl-tour-completed` is `true`, the tour never auto-starts
- Re-runnable from Settings via "Replay App Tour" button (clears the flag and navigates to `/works`)

## Tour Stops

6 stops maximum. Stops 5-6 are conditional on the user having existing works.

| # | Target | `data-tour` attribute | Title | Content | Page |
|---|--------|-----------------------|-------|---------|------|
| 1 | Works nav tab (sidebar on desktop, bottom bar on mobile) | `nav-works` | Your Collection | All artwork in your gallery lives here. Filter by status and tap any piece to see its full provenance. | `/works` |
| 2 | + button in TopBar (add work) | `add-work` | Intake a Work | Tap here to document a new artwork — photos, details, condition assessment, and consignor signature. | `/works` |
| 3 | Consignors nav tab | `nav-consignors` | Consignors | Track the artists and owners who entrust works to your gallery. See their linked works and financial summary. | `/works` |
| 4 | Settings nav tab | `nav-settings` | Settings | Manage your gallery name, account, and replay this tour anytime. | `/works` |
| 5 | FAB (+ event button) on WorkDetail | `fab-add-event` | Build Provenance | Every condition change, location move, sale, and payout is logged here. This timeline is your dispute-proof record. | `/works/:id` (first work) |
| 6 | Export button in WorkDetail top bar | `export-provenance` | Export a Provenance Pack | Generate a PDF report with the full timeline, photos, and financials — ready for buyers, insurers, or legal. | `/works/:id` |

### Conditional logic

- After stop 4, check if the user has any works in the works list
- If yes: programmatically navigate to the first work's detail page, wait for render (500ms), then show stops 5-6
- If no: end the tour after stop 4 with the completion screen

## Architecture

### Files

| File | Purpose |
|------|---------|
| `src/contexts/TourContext.tsx` | `TourProvider` + `useTour()` hook. Manages tour state, step progression, localStorage persistence |
| `src/components/tour/TourOverlay.tsx` | Full-screen overlay with spotlight cutout + positioned tooltip. Rendered at app root level |
| `src/components/tour/TourTooltip.tsx` | The styled tooltip component (title, content, navigation buttons, step dots) |

### TourContext API

```tsx
interface TourContextValue {
  isTourActive: boolean
  startTour: () => void   // called from Settings "Replay" or auto-start
  endTour: () => void     // called on skip or completion
  currentStep: number
  totalSteps: number
}
```

### Provider placement

`TourProvider` wraps the `AppShell` in `App.tsx` (inside `AuthGuard`, outside `LayoutGroup`). The overlay renders via a portal to `document.body` so it sits above everything.

### Positioning logic

1. Find target element: `document.querySelector('[data-tour="<stop>"]')`
2. Call `element.scrollIntoView({ behavior: 'smooth', block: 'center' })` if not in viewport
3. Get `getBoundingClientRect()` after scroll settles (requestAnimationFrame)
4. Position tooltip relative to target: prefer bottom placement, fall back to top if near viewport bottom, left/right for edge targets (sidebar nav items)
5. On window resize: recalculate position

### Spotlight

- Full-screen fixed overlay: `bg-black/70` with `pointer-events: auto`
- Spotlight cutout around the target element using CSS `clip-path` with `inset()` or a simple box-shadow trick: `box-shadow: 0 0 0 9999px rgba(0,0,0,0.7)` on the highlight element
- Target element area remains clickable (no pointer-events on the cutout zone)

### Cross-page navigation (stops 5-6)

- TourContext holds a `pendingStep` state
- After stop 4 completes, if works exist, call `navigate('/works/<firstWorkId>')` and set `pendingStep = 5`
- WorkDetail page checks `pendingStep` on mount via `useTour()` and resumes the tour after a 500ms delay
- On tour end (or if user navigates away), clear `pendingStep`

### Mobile handling

- On mobile (< 768px), the nav targets are in the bottom bar instead of sidebar — same `data-tour` attributes, positioning just changes
- Tooltip width capped at `min(320px, calc(100vw - 32px))`
- If a `data-tour` target doesn't exist in the DOM (e.g., sidebar hidden on mobile), skip that stop silently

## Tooltip Design (The Vault)

Matches the existing design system exactly:

- **Background:** `bg-card` (`#151413`) with `border border-gold/20`
- **Title:** `font-heading text-base font-medium text-foreground` (Cormorant Garamond)
- **Content:** `text-sm text-muted-foreground` (Outfit)
- **Step dots:** row of small dots, active = `bg-gold`, inactive = `bg-gold/30`
- **Buttons:** "Skip" as `text-xs text-muted-foreground hover:text-foreground`, "Next" as small gold button (`bg-gold text-gold-foreground`), final step shows "Done" instead of "Next"
- **Arrow:** CSS triangle pointing toward the target element, colored `border-card`
- **Animation:** `framer-motion` — tooltip fades/slides in (`opacity: 0, y: 8 -> 1, 0`), spotlight cutout animates position between stops

## Settings Integration

Add to `SettingsPage.tsx` between the Email row and Sign Out button:

```
[Separator]
Replay App Tour
Re-run the guided walkthrough of GalleryLedger's features
[Separator]
```

Clicking it: clears `gl-tour-completed` from localStorage, navigates to `/works`, tour auto-starts on mount.

## data-tour Attributes to Add

| Component | File | Element | Attribute |
|-----------|------|---------|-----------|
| AppShell | `AppShell.tsx` | Works nav button (both sidebar + mobile) | `data-tour="nav-works"` |
| AppShell | `AppShell.tsx` | Consignors nav button (both sidebar + mobile) | `data-tour="nav-consignors"` |
| AppShell | `AppShell.tsx` | Settings nav button (both sidebar + mobile) | `data-tour="nav-settings"` |
| WorkList TopBar | `WorkList.tsx` | + (add work) button | `data-tour="add-work"` |
| WorkDetail | `WorkDetail.tsx` | FAB button | `data-tour="fab-add-event"` |
| WorkDetail | `WorkDetail.tsx` | Export button in top bar | `data-tour="export-provenance"` |

## State Management

- **localStorage key:** `gl-tour-completed`
- **Values:** `"true"` = tour has been completed or skipped. Absent = tour has never run.
- No database persistence needed — this is a UI preference, not business data
- "Replay App Tour" in Settings deletes the key and navigates to `/works`

## Edge Cases

1. **User has no works:** Tour ends after stop 4 (nav overview). Stops 5-6 skipped.
2. **Target missing from DOM:** Skip the stop silently, advance to next.
3. **User navigates away mid-tour:** `endTour()` fires on unmount/route change outside the expected flow. Tour marked incomplete (localStorage NOT set), so it will auto-trigger again next visit to Works.
4. **Window resize during tour:** Recalculate tooltip position via ResizeObserver or resize event listener.
5. **Mobile bottom nav vs desktop sidebar:** Same `data-tour` attributes on both; positioning logic reads whichever is visible.
