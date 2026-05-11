## Overview

The app shell is a mobile-first PWA layout with bottom tab navigation as the primary navigation pattern. Three main tabs cover the entire MVP surface area: Works, Consignors, and Settings. All authenticated screens render inside the shell. Auth screens (sign in, sign up, password reset) and onboarding screens render outside it.

## Dependencies

- `01_Auth_And_Onboarding.md` -- Auth state routing, protected route logic
- `04_UI_Design_System.md` -- Colors, typography, spacing, touch targets, responsive breakpoints

## PWA Configuration

**Manifest fields that matter**:

| Field | Value | Notes |
|-------|-------|-------|
| `display` | `standalone` | Removes browser chrome, feels native |
| `orientation` | `portrait` | Primary use is one-handed vertical; do not lock -- allow landscape for photo review |
| `theme_color` | `#FFFFFF` | Matches light theme background |
| `background_color` | `#FFFFFF` | Splash screen background |
| `start_url` | `/` | App root |
| `name` | `GalleryLedger` | Install prompt and app launcher |
| `short_name` | `GalleryLedger` | Home screen label |

**Service worker**: Use Vite PWA plugin (`vite-plugin-pwa`) with workbox for precaching the app shell. Cache strategy:

- App shell (HTML, JS, CSS): precache, update in background
- Firestore data: handled by Firestore SDK offline persistence, not the service worker
- Photos from Storage: cache-first with network fallback (photos are immutable once uploaded)

No custom offline fallback page. The app works offline via Firestore persistence and cached assets. See `16_Offline_Architecture.md`.

## Layout Structure

```
┌──────────────────────────────┐
│         Status Bar           │  ← OS-controlled
├──────────────────────────────┤
│         Top Bar              │  ← Screen title + actions
├──────────────────────────────┤
│                              │
│                              │
│       Content Area           │  ← Scrollable, full height
│                              │
│                              │
├──────────────────────────────┤
│       Bottom Tabs            │  ← Fixed navigation
└──────────────────────────────┘
```

### Top Bar

- Height: 56px
- Left: back arrow (when navigated into a sub-screen) or nothing (on tab root screens)
- Center: screen title in `heading-md`
- Right: contextual action icons (e.g., search icon on work list, export on work detail)
- Background: `background` (white)
- Bottom border: 1px `border`
- The top bar scrolls away on long content -- use a standard (non-sticky) position. This maximizes viewport for content on small screens. Exception: the work detail screen keeps the top bar sticky since the FAB and timeline need consistent spatial reference.

### Content Area

- Scrollable container, fills all space between top bar and bottom tabs
- Horizontal padding: 16px
- Top padding: 16px
- Bottom padding: 80px (ensures content is not hidden behind bottom tabs; extra space for FAB clearance on screens that have one)

### Bottom Tabs

- Fixed to viewport bottom
- Height: 64px (includes safe area padding for notched devices)
- Background: `background` (white)
- Top border: 1px `border`
- Safe area: add `env(safe-area-inset-bottom)` padding for iOS home indicator

## Tab Structure

Three tabs at MVP. Each tab is an independent navigation stack.

| Tab | Icon | Label | Root Screen | Notes |
|-----|------|-------|-------------|-------|
| Works | Lucide `image` | Works | Work list dashboard | Primary tab. See `11_Work_List_Dashboard.md` |
| Consignors | Lucide `users` | Consignors | Consignor list | See `13_Consignor_Management.md` |
| Settings | Lucide `settings` | Settings | Settings screen | Profile, gallery name, sign out |

**Active tab indicator**: `accent` color on icon and label. Inactive tabs use `text-tertiary`.

**Tab icon size**: 24px. Label in `caption` size (12px) directly below icon.

## Navigation Patterns

### Tab-Level Navigation

Each tab maintains its own navigation stack. Switching tabs preserves the stack state of the previous tab (user returns to where they left off, not the tab root).

### Push Navigation (Within a Tab)

Tapping a work card pushes the work detail screen onto the Works tab stack. Tapping a consignor pushes the consignor detail. The top bar shows a back arrow to pop back.

### Screen Map

```
Works Tab
  ├── Work List (root)
  │     ├── Work Detail
  │     │     ├── Add Event (modal/sheet)
  │     │     └── Photo Viewer (full screen)
  │     └── New Work Intake
  │           └── Signature Capture (full screen)

Consignors Tab
  ├── Consignor List (root)
  │     ├── Consignor Detail (shows linked works)
  │     └── New Consignor

Settings Tab
  ├── Settings (root)
        ├── Edit Gallery Name
        └── (future: account, export, etc.)
```

### Modal / Bottom Sheet Usage

Use bottom sheets (not full-page navigations) for:

- Adding a timeline event (event type picker, then event form)
- Quick filters on the work list
- Confirmation dialogs (e.g., "Mark as sold?")

Bottom sheets use shadcn/ui Sheet component, anchored to bottom, with `surface-raised` background and 6px top radius. Drag handle visible at top. Sheet max height: 85vh to always show some of the screen behind it.

### Full-Screen Overlays

Used only for:

- Photo viewer (swipe through full-resolution photos, dark background)
- Signature capture canvas (needs full screen for drawing area)

These hide the bottom tabs and top bar entirely.

## Settings Screen

Minimal at MVP. Single scrollable list of options:

| Item | Action |
|------|--------|
| Gallery Name | Tap to edit (inline or push to edit screen) |
| Email | Display only (from Firebase Auth) |
| Sign Out | Tap to sign out with confirmation dialog |
| App Version | Display only, shown at bottom |

No account deletion, no notification settings, no data export at MVP. See `17_Future_Features.md`.

## Offline Indicator

When the app detects it is offline (via browser `navigator.onLine` and/or Firestore snapshot metadata):

- Show a subtle, non-blocking banner below the top bar: "You're offline. Changes will sync when you reconnect."
- Background: `warning` at 10% opacity. Text: `warning` color. `small` font size.
- Height: 32px. Does not push content down permanently -- it overlays.
- Disappears automatically when connectivity is restored.

Do not block any functionality while offline. All reads come from Firestore cache, all writes queue locally. See `16_Offline_Architecture.md`.

## Route Definitions

| Path | Screen | Auth | Tab |
|------|--------|------|-----|
| `/signin` | Sign In | Public | None |
| `/signup` | Sign Up | Public | None |
| `/reset-password` | Password Reset | Public | None |
| `/onboarding` | Gallery Name + First Work | Auth | None |
| `/` | Work List | Auth | Works |
| `/works/new` | New Work Intake | Auth | Works |
| `/works/:workId` | Work Detail | Auth | Works |
| `/consignors` | Consignor List | Auth | Consignors |
| `/consignors/new` | New Consignor | Auth | Consignors |
| `/consignors/:consignorId` | Consignor Detail | Auth | Consignors |
| `/settings` | Settings | Auth | Settings |

Use React Router. Auth guard wraps all authenticated routes (see `01_Auth_And_Onboarding.md`). Public routes redirect to `/` if already authenticated.

## Gaps and Assumptions

| Item | Default | Notes |
|------|---------|-------|
| Router library | React Router v7 | Not specified in PRD. Most mature option for React SPAs with nested routes. |
| Tab state persistence | In-memory | Tab stacks reset on full page reload. Acceptable for PWA where reloads are rare. |
| Deep linking | Supported via route paths | PWA deep links work naturally with the route table above. No special handling needed. |
| Splash screen | PWA default from manifest | No custom animated splash. The manifest `background_color` and icon display during app load. |
| App update prompt | Deferred | When a new service worker is available, no prompt is shown at MVP. Updates apply on next full app load. |
| Landscape support | Not optimized | App renders in landscape but layouts are not tuned for it. Portrait is the expected usage. |
| Tablet layout | Basic `md` breakpoint | Work list gets 2-column grid at 768px+. No sidebar navigation at MVP. |  
