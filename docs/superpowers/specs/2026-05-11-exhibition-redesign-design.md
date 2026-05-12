# GalleryLedger "The Exhibition" Redesign

Complete visual and UX redesign of GalleryLedger. Not a reskin — a reimagination of layout, interactions, navigation, and the addition of a cinematic public landing page.

**Design North Star:** "Walking into a world-class gallery" meets "Linear-level product craft." The art dominates, the UI recedes, and every interaction feels intentional.

## 1. Landing Page

The public-facing page at `/`. Authenticated users bypass it and go straight to the works list.

### Hero (full viewport)

- Deep charcoal background with a large static artwork image (bundled in `public/images/hero.jpg` — a royalty-free gallery/art photograph) positioned off-center (right on desktop, centered on mobile) at ~40% opacity
- Ken Burns effect: image zooms slowly from 1.0x to 1.05x over 20 seconds via CSS animation
- Centered content:
  - "Gallery**Ledger**" wordmark — serif, 48px mobile / 64px desktop
  - Thin gold horizontal divider (48px wide)
  - Tagline: "Provenance tracking for the modern gallery" — sans, muted
  - Single gold CTA button: "Get Started" — uppercase, tracking-widest
- Scroll indicator at bottom: animated chevron, gentle pulse

### Feature Sections (3 blocks, scroll-triggered)

Each block fades + slides up as it enters the viewport using Intersection Observer + Framer Motion `whileInView`.

1. **"Track Every Detail"** — intake and provenance workflow
2. **"Document Condition"** — condition assessment with signature capture
3. **"Manage Consignors"** — financial tracking and payout management

Each block has:
- Short heading (serif)
- 1-2 sentences of body copy (sans, muted)
- Abstract icon or line illustration on the opposite side
- Desktop: alternating left/right layout
- Mobile: stacked, centered

### Closing CTA

- Gold gradient line at top of section
- Wordmark repeated
- Copy: "Start managing your collection"
- Two buttons: "Sign In" (outline, gold border) and "Create Account" (filled gold)

### Footer

- Single line: "© 2026 GalleryLedger" in muted small caps

### Routing

- Landing page lives at `/`
- `PublicRoute` wraps it — authenticated users redirect to works list
- Sign-in stays at `/signin`, sign-up at `/signup`

## 2. Works List — Art Grid

The core screen. Must feel like browsing a curated collection, not scrolling a database.

### Responsive Grid Layout

- **Mobile (< 640px):** 2-column grid, 2px gap
- **Tablet (640px–1024px):** 3-column grid
- **Desktop (> 1024px):** 4-column grid with generous gaps

### Card Design

- Image fills entire card, 4:5 aspect ratio (portrait, like gallery art)
- Bottom overlay: gradient from transparent to black/85, containing:
  - Artist name — serif, 12.5px, medium weight
  - Title — sans, 11px, italic, muted
- Status dot: top-right corner of image, colored by status
- No-photo placeholder: dark card with minimal line-art frame icon, same 4:5 ratio
- Desktop hover: image scales 1.03x, overlay darkens slightly, thin gold border fades in

### Shared-Element Anchor

Each card image gets `layoutId={`work-image-${work.id}`}` — this is the anchor for the transition to WorkDetail.

### Filter Bar

- Horizontally scrollable chips above the grid
- Same gold-accent chip style (gold border/bg when active)
- Floats over grid content area

### Empty State

- Full-width centered area
- Large outlined frame icon, serif heading "Your Collection Awaits", gold CTA button

### Load Animation

- Cards stagger in (0.05s per card), fading up from below
- On re-filter: `AnimatePresence` handles exit/enter with layout shift

## 3. Page Transitions & WorkDetail

The transition from grid to detail should feel like walking up to a painting on a gallery wall.

### Shared-Element Transition

- Tap a work card → artwork image animates from grid position to full-width hero at top of detail page
- Framer Motion `layoutId={`work-image-${work.id}`}` on both grid card image and detail hero image
- Detail page content fades in from below (staggered, 0.2s delay) as image settles
- Back navigation: image animates back to grid position
- Requires wrapping route area in Framer Motion `<LayoutGroup>`

### WorkDetail Layout — "The Provenance Record"

#### Hero Section

- Full-bleed artwork image on pure black, no padding
- ~50vh on mobile, ~40vh on desktop
- Multiple photos: horizontal swipeable carousel (Embla) with dot indicators. First image is the `layoutId` anchor.
- Below image: artist name (serif, 24px), title (italic sans), medium/dimensions (muted). Generous whitespace.

#### Content Sections

Each section is a card with gold uppercase heading label and subtle top border. Sections fade in on scroll.

- **Details** — Medium, dimensions, year, location. Two-column grid on desktop, stacked on mobile. Muted labels, bright values.
- **Financial Summary** — Sale price, commission, consignor share, outstanding. Gold/green/red status colors.
- **Timeline** — Visual vertical timeline:
  - Thin vertical gold line on left side
  - Each event: gold dot on the line, date and description to the right
  - Payout events show amounts inline
  - Line grows/animates as you scroll past events
  - "Add event" button at bottom, gold outline style

#### Desktop Layout (> 1024px)

- Two-column: hero image on left (sticky, stays visible while scrolling), content on right
- Always viewing the art while reading its provenance

#### FAB

- Gold FAB for quick actions (record sale, add event, change status)
- Subtle gold shadow glow (`box-shadow: 0 0 20px rgba(201,169,110,0.2)`)
- Appear animation: scale spring 0.8 → 1.0

## 4. Responsive Navigation

### Mobile (< 768px) — Bottom Nav

- Current bottom nav pattern (works well, native-feeling)
- Enhancement: auto-hide on scroll down, reappear on scroll up. Gives art grid more breathing room.
- Gold `layoutId` indicator bar stays

### Tablet/Desktop (>= 768px) — Left Sidebar

- Slim sidebar, 72px wide, fixed left edge
- Top: "GL" monogram in serif gold, acts as home link
- Below: 3 nav icons stacked vertically with uppercase labels underneath
- Active indicator: 2px gold bar on left edge of active item
- `bg-background/95 backdrop-blur-xl` with right border — same glass treatment
- Main content shifts right by 72px, no longer constrained to 640px

### TopBar Adjustments

- Desktop with sidebar: simpler inline header, no backdrop blur needed
- Mobile: stays as-is (sticky, blurred)

## 5. Micro-interactions

These details separate "nice" from "world-class."

### Buttons
- All buttons: `whileTap={{ scale: 0.97 }}` for tactile press feedback

### Cards (desktop)
- Artwork cards: image scales 1.03x, overlay darkens, thin gold border fades in (0.2s ease)

### Sheets & Dialogs
- Content slides up with spring animation (stiffness: 300, damping: 25) instead of linear slide

### Toast Notifications
- Slide up from bottom with slight bounce

### Loading Skeletons
- Shimmer animation (gradient sweep left-to-right) instead of static gray

### Gold FAB
- Appear: scale spring 0.8 → 1.0
- Persistent subtle gold glow shadow

### Form Inputs
- On focus: border transitions to gold with subtle glow ring (`ring-gold/20`)

### TopBar Scroll Enhancement
- Border-bottom opacity increases as user scrolls past 50px (scroll-linked)

## 6. Technical Approach

### Key Dependencies (already installed)
- `framer-motion` — all animations, shared-element transitions, `AnimatePresence`, `LayoutGroup`
- `embla-carousel-react` — photo carousel on WorkDetail
- Tailwind CSS 4 — responsive breakpoints, utility classes

### No New Dependencies Required
Everything can be achieved with the current stack.

### Files to Modify

**New files:**
- `src/pages/LandingPage.tsx` — public landing page

**Major rewrites:**
- `src/pages/WorkList.tsx` — art grid layout, card redesign, stagger animations
- `src/pages/WorkDetail.tsx` — full-bleed hero, visual timeline, desktop two-column, shared-element
- `src/components/AppShell.tsx` — responsive nav (bottom on mobile, sidebar on desktop), auto-hide
- `src/App.tsx` — add landing page route, wrap in LayoutGroup

**Moderate changes:**
- `src/components/TopBar.tsx` — scroll-linked border opacity, responsive adjustments
- `src/pages/ConsignorList.tsx` — responsive grid if applicable
- `src/pages/ConsignorDetail.tsx` — desktop layout improvements

**Minor changes (micro-interactions):**
- `src/components/ui/sheet.tsx` — spring animation
- `src/components/ui/dialog.tsx` — spring animation
- `src/components/ui/skeleton.tsx` — shimmer animation
- `src/components/ui/button.tsx` — whileTap scale (or applied per-component)
- `src/index.css` — shimmer keyframe, any new utility classes

### Responsive Breakpoints
- `< 640px` — mobile (2-col grid, bottom nav)
- `640px–767px` — large mobile (3-col grid, bottom nav)
- `768px–1023px` — tablet (3-col grid, sidebar nav)
- `>= 1024px` — desktop (4-col grid, sidebar nav, two-column detail)

### Routing Changes
- `/` — LandingPage (public, redirects authenticated users to works)
- Works list moves to `/works` as default authenticated route
- All other routes unchanged
