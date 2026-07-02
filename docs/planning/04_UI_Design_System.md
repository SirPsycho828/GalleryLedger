▸ Extended thinking (741 chars)

## Overview

Design system for GalleryLedger built on Tailwind CSS 4 and shadcn/ui. The visual language is clean, restrained, and gallery-appropriate -- the UI should feel like a professional tool for the art world, not a tech startup dashboard. DM Sans as the primary typeface. 6-8px border radius throughout. Mobile-first, single-column layouts for all primary workflows.

## Dependencies

- `05_App_Shell_And_Navigation.md` -- Layout structure that uses these tokens
- All feature files reference this document for component patterns

## Typography

**Primary font**: DM Sans (Google Fonts). Load weights 400, 500, and 700.

**Scale** (mobile-first, rem-based):

| Token         | Size            | Weight | Use                                  |
| ------------- | --------------- | ------ | ------------------------------------ |
| `heading-lg`  | 1.5rem / 24px   | 700    | Screen titles                        |
| `heading-md`  | 1.25rem / 20px  | 700    | Section headers                      |
| `heading-sm`  | 1.125rem / 18px | 600    | Card titles, work names              |
| `body`        | 1rem / 16px     | 400    | Default text                         |
| `body-medium` | 1rem / 16px     | 500    | Emphasized body text, labels         |
| `small`       | 0.875rem / 14px | 400    | Secondary info, timestamps, metadata |
| `caption`     | 0.75rem / 12px  | 500    | Badges, overlines, status labels     |

No serif font at MVP. DM Sans handles everything.

## Color Palette

Neutral-forward with a single accent color. The palette avoids competing with artwork photography -- the UI should recede and let the art be the visual focus.

### Semantic Tokens

| Token            | Light Mode              | Purpose                                   |
| ---------------- | ----------------------- | ----------------------------------------- |
| `background`     | `#FFFFFF`               | Page background                           |
| `surface`        | `#F9FAFB` (gray-50)     | Card backgrounds, input fills             |
| `surface-raised` | `#FFFFFF`               | Elevated cards, modals                    |
| `border`         | `#E5E7EB` (gray-200)    | Dividers, card borders, input borders     |
| `border-strong`  | `#D1D5DB` (gray-300)    | Active input borders, emphasized dividers |
| `text-primary`   | `#111827` (gray-900)    | Headings, primary content                 |
| `text-secondary` | `#6B7280` (gray-500)    | Metadata, timestamps, helper text         |
| `text-tertiary`  | `#9CA3AF` (gray-400)    | Placeholder text, disabled labels         |
| `accent`         | `#1D4ED8` (blue-700)    | Primary buttons, links, active states     |
| `accent-hover`   | `#1E40AF` (blue-800)    | Button hover                              |
| `accent-subtle`  | `#EFF6FF` (blue-50)     | Selected states, accent backgrounds       |
| `success`        | `#059669` (emerald-600) | Sale recorded, payout complete            |
| `warning`        | `#D97706` (amber-600)   | Condition concerns, pending items         |
| `destructive`    | `#DC2626` (red-600)     | Error states, destructive actions         |

No dark mode at MVP. Single light theme only.

### Status Colors

Work status badges use these background/text pairs:

| Status       | Background | Text        |
| ------------ | ---------- | ----------- |
| `intake`     | blue-50    | blue-700    |
| `in_storage` | gray-100   | gray-700    |
| `on_display` | emerald-50 | emerald-700 |
| `on_loan`    | amber-50   | amber-700   |
| `shipped`    | purple-50  | purple-700  |
| `sold`       | emerald-50 | emerald-700 |
| `returned`   | gray-100   | gray-600    |

## Spacing and Layout

**Base unit**: 4px (Tailwind default). Use Tailwind spacing scale throughout.

**Border radius**: `6px` as the global default. Apply to cards, inputs, buttons, badges, modals. Configure in the shadcn/ui theme as the base radius.

**Page padding**: `16px` horizontal (mobile), `24px` (tablet+).

**Card padding**: `16px` all sides.

**Section spacing**: `24px` between major content sections. `16px` between related items.

**Max content width**: `640px` centered. This keeps content readable on tablets and desktop without stretching to full viewport width.

## Component Patterns

Built on shadcn/ui primitives. Only document non-obvious customizations below.

### Buttons

Three variants, all with 6px radius and DM Sans 500 weight:

| Variant   | Style                                 | Use                                            |
| --------- | ------------------------------------- | ---------------------------------------------- |
| Primary   | Solid `accent` background, white text | Main actions: "Save", "Add Work", "Export PDF" |
| Secondary | `border` outline, `text-primary` text | Alternate actions: "Cancel", "Skip"            |
| Ghost     | No border, `text-secondary` text      | Tertiary actions, navigation links             |

Full-width buttons on mobile for primary actions (form submissions, major CTAs). Inline/auto-width for secondary actions and toolbar items.

### Cards

Used for work list items, timeline events, consignor entries.

- Background: `surface-raised`
- Border: 1px `border`
- Radius: 6px
- Shadow: `shadow-sm` (Tailwind default small shadow)
- Padding: 16px

### Form Inputs

- Height: 44px minimum (touch target)
- Border: 1px `border`, `border-strong` on focus
- Background: `surface`
- Radius: 6px
- Focus ring: 2px `accent` offset ring

### Status Badges

Pill-shaped indicators using the status color table above.

- Padding: 4px 10px
- Radius: full (rounded-full)
- Font: `caption` size, 500 weight, uppercase

### Empty States

When a list has no items (no works yet, no consignors, no timeline events):

- Centered illustration or icon (use Lucide icons from shadcn/ui, no custom illustrations)
- `heading-sm` text explaining the empty state
- `body` text with a brief suggestion
- Primary button CTA when applicable (e.g., "Add your first work")

### Photo Thumbnails

Work photos in list views and grids:

- Aspect ratio: 1:1 (square crop for consistency)
- Object-fit: `cover`
- Radius: 6px
- Placeholder: `surface` background with a Lucide image icon in `text-tertiary`

Full photo views (detail screen, lightbox): maintain original aspect ratio, no cropping.

## Mobile Touch Targets

All interactive elements must meet 44x44px minimum touch target size, per WCAG guidelines. This includes:

- Buttons (height already 44px)
- List items / tappable cards (minimum height 48px with padding)
- Icon buttons (44x44px hit area even if the icon is 20-24px)
- Timeline event cards (comfortable tap target for expansion)
- FAB (56x56px, see `12_Work_Detail_View.md`)

## Iconography

Use Lucide icons (bundled with shadcn/ui). Default size: 20px for inline, 24px for standalone buttons. Stroke width: 1.5px (Lucide default).

Do not use filled icons. Line icons throughout for consistency.

## Loading and Feedback

**Skeleton screens**: Use for initial data loads (work list, work detail). shadcn/ui Skeleton component with `surface` color animated pulse.

**Inline spinners**: Small spinner next to buttons during async actions (save, upload). Do not use full-screen loading overlays.

**Toast notifications**: shadcn/ui Toast for success/error feedback after actions (work saved, photo uploaded, export complete). Position: bottom-center on mobile. Auto-dismiss after 3 seconds for success, persist until dismissed for errors.

## Animation

Minimal. The app should feel fast and direct, not decorative.

- Page transitions: none (instant route changes)
- Card/list appearance: subtle fade-in (`opacity 0 to 1`, 150ms)
- Toast enter/exit: slide up from bottom, 200ms
- Timeline event expansion: height transition, 150ms
- Photo upload progress: determinate progress bar, no animation beyond the bar fill

## Responsive Breakpoints

Mobile-first. Use Tailwind's default breakpoints:

| Breakpoint | Width   | Layout Adaptation                                                         |
| ---------- | ------- | ------------------------------------------------------------------------- |
| Default    | < 640px | Single column. Full-width cards and buttons. Bottom navigation.           |
| `sm`       | 640px+  | Minimal changes. Slightly wider content padding.                          |
| `md`       | 768px+  | Work list can show 2-column grid. Content max-width kicks in.             |
| `lg`       | 1024px+ | Optional sidebar navigation instead of bottom tabs. Not required for MVP. |

MVP priority is the default (mobile) breakpoint. `md` breakpoint gets basic grid treatment. `lg` is stretch goal only.

## Gaps and Assumptions

| Item                     | Default                                               | Notes                                                                                                                    |
| ------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Brand logo / wordmark    | Text-only "GalleryLedger" in `heading-lg` DM Sans 700 | No logo designed. Text treatment sufficient for MVP.                                                                     |
| Dark mode                | Deferred                                              | Single light theme. Art photography displays most accurately on white/light backgrounds. See `17_Future_Features.md`.    |
| Illustration style       | Lucide icons only                                     | No custom illustrations for empty states or onboarding. Icons keep the visual language consistent.                       |
| Color palette validation | Not tested with art photography                       | The neutral palette should recede behind artwork photos, but real-world testing with various art styles is needed.       |
| Accessibility            | WCAG AA target                                        | Color contrast ratios meet AA at the specified values. Touch targets meet 44px minimum. Full audit deferred to post-MVP. |
| Print styles             | Not addressed                                         | PDF export handles printable output (see `15_PDF_Provenance_Pack.md`). No browser print stylesheet needed.               |
