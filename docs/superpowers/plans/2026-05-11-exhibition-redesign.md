# Exhibition Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform GalleryLedger from a reskinned generic app into a cinematic, gallery-first experience with art-forward layouts, shared-element transitions, responsive navigation, and a public landing page.

**Architecture:** This is a frontend-only redesign — no backend changes. All work is in React components, CSS, and Framer Motion animations. The routing structure changes (landing page at `/`, works list at `/works`), the navigation becomes responsive (bottom nav on mobile, sidebar on desktop), and the works list transforms from a flat list to an art-forward grid with shared-element transitions to the detail page.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Framer Motion, Embla Carousel, Vite

**Spec:** `docs/superpowers/specs/2026-05-11-exhibition-redesign-design.md`

**Verification:** This project has no test suite. Verify each task with:
1. `npx tsc --noEmit` — must pass with no errors
2. Visual verification via Playwright MCP screenshots against the running dev server

---

## File Structure

**New files:**
- `src/pages/LandingPage.tsx` — public cinematic landing page (hero + features + CTA)
- `src/hooks/useScrollDirection.ts` — hook for detecting scroll up/down (bottom nav auto-hide)
- `public/images/hero.jpg` — static hero image for landing page (royalty-free gallery photograph)

**Major rewrites (preserve all business logic, change layout/presentation):**
- `src/pages/WorkList.tsx` — art grid layout, 4:5 cards, shared-element anchors, responsive grid
- `src/pages/WorkDetail.tsx` — full-bleed hero, visual timeline, desktop two-column layout
- `src/components/AppShell.tsx` — responsive nav: bottom nav (mobile) + left sidebar (desktop), auto-hide

**Moderate changes:**
- `src/App.tsx` — add landing page route, update works route to `/works`, wrap in LayoutGroup
- `src/components/AuthGuard.tsx` — update PublicRoute redirect from `/` to `/works`
- `src/components/TopBar.tsx` — scroll-linked border opacity, responsive sidebar awareness

**Minor changes (micro-interactions):**
- `src/index.css` — shimmer keyframe animation, Ken Burns keyframe
- `src/components/ui/skeleton.tsx` — shimmer animation class
- `src/components/ui/button.tsx` — (optional) whileTap via per-component usage

---

### Task 1: CSS Foundations — Shimmer & Ken Burns Keyframes

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/ui/skeleton.tsx`

- [ ] **Step 1: Add keyframe animations to index.css**

Add these keyframes inside the `@layer base` block in `src/index.css`, after the scrollbar styles:

```css
/* Shimmer animation for loading skeletons */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Ken Burns slow zoom for landing hero */
@keyframes ken-burns {
  0% { transform: scale(1); }
  100% { transform: scale(1.05); }
}
```

- [ ] **Step 2: Update Skeleton component with shimmer**

Replace the Skeleton component in `src/components/ui/skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/components/ui/skeleton.tsx
git commit -m "feat: add shimmer and Ken Burns CSS keyframes"
```

---

### Task 2: Scroll Direction Hook

**Files:**
- Create: `src/hooks/useScrollDirection.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useScrollDirection.ts`:

```ts
import { useState, useEffect, useRef } from 'react'

export function useScrollDirection(threshold = 10) {
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    function onScroll() {
      const currentY = window.scrollY
      const diff = currentY - lastScrollY.current

      if (Math.abs(diff) < threshold) return

      setHidden(diff > 0 && currentY > 50)
      lastScrollY.current = currentY
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return hidden
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useScrollDirection.ts
git commit -m "feat: add useScrollDirection hook for nav auto-hide"
```

---

### Task 3: Responsive AppShell — Sidebar + Bottom Nav

**Files:**
- Modify: `src/components/AppShell.tsx`

This is a full rewrite of AppShell. The bottom nav stays for mobile but auto-hides on scroll down. On tablet/desktop (>= 768px), a slim left sidebar replaces the bottom nav.

- [ ] **Step 1: Rewrite AppShell.tsx**

Replace the entire contents of `src/components/AppShell.tsx`:

```tsx
import { Outlet, useLocation, useNavigate } from 'react-router'
import { Image, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OfflineBanner } from '@/components/OfflineBanner'
import { motion, AnimatePresence } from 'framer-motion'
import { useScrollDirection } from '@/hooks/useScrollDirection'

const tabs = [
  { path: '/works', icon: Image, label: 'Works' },
  { path: '/consignors', icon: Users, label: 'Consignors' },
  { path: '/settings', icon: Settings, label: 'Settings' },
] as const

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const navHidden = useScrollDirection()

  function isActive(path: string) {
    if (path === '/works') return location.pathname === '/works' || location.pathname.startsWith('/works/')
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop/Tablet sidebar (>= 768px) */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-[72px] flex-col items-center border-r border-border/50 bg-background/95 backdrop-blur-xl py-6">
        {/* GL Monogram */}
        <button
          onClick={() => navigate('/works')}
          className="mb-8 font-heading text-lg font-medium text-gold tracking-tight"
        >
          GL
        </button>

        {/* Nav items */}
        <div className="flex flex-1 flex-col items-center gap-1">
          {tabs.map((tab) => {
            const active = isActive(tab.path)
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 py-3 px-2 w-full transition-colors',
                  active ? 'text-gold' : 'text-muted-foreground hover:text-foreground/70'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-2 bottom-2 w-0.5 bg-gold"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[9px] font-medium uppercase tracking-wider">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 md:ml-[72px]">
        <OfflineBanner />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav (< 768px) */}
      <motion.nav
        initial={false}
        animate={{ y: navHidden ? 80 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
          {tabs.map((tab) => {
            const active = isActive(tab.path)
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 py-2 px-5 min-w-[72px] transition-colors',
                  active ? 'text-gold' : 'text-muted-foreground hover:text-foreground/70'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-px left-3 right-3 h-px bg-gold"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </motion.nav>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: responsive AppShell with sidebar and auto-hide bottom nav"
```

---

### Task 4: Routing Changes — Landing Page Route & Works Path

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/AuthGuard.tsx`
- Create: `src/pages/LandingPage.tsx` (placeholder for now — full implementation in Task 6)

The works list moves from `/` to `/works`. The landing page takes over `/`. Authenticated users redirect to `/works`.

- [ ] **Step 1: Create placeholder LandingPage**

Create `src/pages/LandingPage.tsx`:

```tsx
import { Link } from 'react-router'

export default function LandingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="font-heading text-4xl font-medium">
          Gallery<span className="text-gold">Ledger</span>
        </h1>
        <p className="mt-4 text-muted-foreground">Coming soon</p>
        <Link to="/signin" className="mt-8 inline-block text-gold underline">Sign In</Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update App.tsx routing**

Replace the entire contents of `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { AuthGuard, PublicRoute } from '@/components/AuthGuard'
import { AppShell } from '@/components/AppShell'
import LandingPage from '@/pages/LandingPage'
import SignIn from '@/pages/SignIn'
import SignUp from '@/pages/SignUp'
import ResetPassword from '@/pages/ResetPassword'
import Onboarding from '@/pages/Onboarding'
import SettingsPage from '@/pages/SettingsPage'
import WorkList from '@/pages/WorkList'
import WorkIntake from '@/pages/WorkIntake'
import WorkDetail from '@/pages/WorkDetail'
import ConsignorList from '@/pages/ConsignorList'
import ConsignorNew from '@/pages/ConsignorNew'
import ConsignorDetail from '@/pages/ConsignorDetail'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<AuthGuard><Onboarding /></AuthGuard>} />

          {/* Authenticated routes with app shell */}
          <Route element={<AuthGuard><AppShell /></AuthGuard>}>
            <Route path="works" element={<WorkList />} />
            <Route path="works/new" element={<WorkIntake />} />
            <Route path="works/:workId" element={<WorkDetail />} />
            <Route path="consignors" element={<ConsignorList />} />
            <Route path="consignors/new" element={<ConsignorNew />} />
            <Route path="consignors/:consignorId" element={<ConsignorDetail />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="bottom-center" />
      </AuthProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Update AuthGuard redirect**

In `src/components/AuthGuard.tsx`, update `PublicRoute` to redirect authenticated users to `/works` instead of `/`:

Change line 44 from:
```tsx
    return <Navigate to="/" replace />
```
to:
```tsx
    return <Navigate to="/works" replace />
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Visual verification**

Start dev server and verify:
1. Unauthenticated: `/` shows landing page placeholder
2. `/signin` still shows sign-in form
3. Authenticated: redirects to `/works` and shows works list
4. Bottom nav links work (now pointing to `/works`, `/consignors`, `/settings`)

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/AuthGuard.tsx src/pages/LandingPage.tsx
git commit -m "feat: add landing page route, move works list to /works"
```

---

### Task 5: TopBar — Scroll-Linked Border & Responsive Awareness

**Files:**
- Modify: `src/components/TopBar.tsx`

- [ ] **Step 1: Rewrite TopBar with scroll-linked border and responsive layout**

Replace the entire contents of `src/components/TopBar.tsx`:

```tsx
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  sticky?: boolean
  actions?: React.ReactNode
}

export function TopBar({ title, showBack, onBack, sticky = true, actions }: TopBarProps) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!sticky) return
    function onScroll() {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sticky])

  function handleBack() {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <header
      className={cn(
        'flex h-14 items-center px-4 transition-colors duration-200',
        sticky && 'sticky top-0 z-40',
        // Mobile: always blur. Desktop with sidebar: simpler header
        'bg-background/95 backdrop-blur-xl md:bg-background md:backdrop-blur-none',
        scrolled ? 'border-b border-border/60' : 'border-b border-border/30'
      )}
    >
      {showBack && (
        <button
          onClick={handleBack}
          className="mr-2 flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
      )}
      <h1 className="flex-1 truncate font-heading text-lg font-medium tracking-tight">{title}</h1>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/TopBar.tsx
git commit -m "feat: TopBar with scroll-linked border and responsive awareness"
```

---

### Task 6: Landing Page — Full Cinematic Implementation

**Files:**
- Modify: `src/pages/LandingPage.tsx` (replace placeholder)
- Create: `public/images/hero.jpg` (download a royalty-free gallery image)

- [ ] **Step 1: Download hero image**

Download a royalty-free gallery/art photograph and save it to `public/images/hero.jpg`. Use a dark, atmospheric gallery interior or abstract art image. Run:

```bash
mkdir -p public/images
curl -L -o public/images/hero.jpg "https://images.unsplash.com/photo-1594732832278-abd644401426?w=1920&q=80"
```

This is a dark gallery interior image from Unsplash (royalty-free). If the URL doesn't work, any dark gallery/art photograph at ~1920px wide will do.

- [ ] **Step 2: Implement full LandingPage**

Replace `src/pages/LandingPage.tsx` with the full implementation:

```tsx
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ChevronDown, ClipboardCheck, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: ClipboardCheck,
    title: 'Track Every Detail',
    description: 'Document intake, provenance, and location history for every work in your collection. Full timeline from arrival to sale.',
  },
  {
    icon: Shield,
    title: 'Document Condition',
    description: 'Detailed condition assessments with photo evidence, checklists, and digital signature capture at intake.',
  },
  {
    icon: Users,
    title: 'Manage Consignors',
    description: 'Track consignor relationships, commission structures, payouts, and outstanding balances in one place.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
}

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero — full viewport */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background image with Ken Burns */}
        <div className="absolute inset-0">
          <img
            src="/images/hero.jpg"
            alt=""
            className="h-full w-full object-cover opacity-40 animate-[ken-burns_20s_ease-in-out_infinite_alternate]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background" />
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 px-4 text-center"
        >
          <h1 className="font-heading text-5xl font-medium tracking-tight md:text-7xl">
            Gallery<span className="text-gold">Ledger</span>
          </h1>
          <div className="mx-auto mt-4 h-px w-12 bg-gold/50" />
          <p className="mx-auto mt-6 max-w-md text-base text-muted-foreground md:text-lg">
            Provenance tracking for the modern gallery
          </p>
          <Link to="/signup">
            <Button className="mt-10 h-12 px-10 bg-gold text-sm font-medium uppercase tracking-widest text-gold-foreground hover:bg-gold/90 hover:shadow-[0_0_30px_rgba(201,169,110,0.2)]">
              Get Started
            </Button>
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-6 w-6 text-muted-foreground/50" strokeWidth={1} />
          </motion.div>
        </motion.div>
      </section>

      {/* Feature sections */}
      <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <div className="space-y-24 md:space-y-32">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className={`flex flex-col items-center gap-8 text-center md:flex-row md:text-left md:gap-16 ${
                i % 2 === 1 ? 'md:flex-row-reverse' : ''
              }`}
            >
              {/* Icon */}
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center border border-border/50 bg-card">
                <feature.icon className="h-8 w-8 text-gold" strokeWidth={1} />
              </div>

              {/* Text */}
              <div className="max-w-md">
                <h2 className="font-heading text-2xl font-medium md:text-3xl">{feature.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative border-t border-border/30 py-24 text-center">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="px-4"
        >
          <h2 className="font-heading text-3xl font-medium md:text-4xl">
            Gallery<span className="text-gold">Ledger</span>
          </h2>
          <p className="mt-4 text-muted-foreground">Start managing your collection</p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link to="/signin">
              <Button variant="outline" className="h-11 px-8 border-gold/30 text-gold hover:bg-gold/10 text-sm font-medium uppercase tracking-widest">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="h-11 px-8 bg-gold text-sm font-medium uppercase tracking-widest text-gold-foreground hover:bg-gold/90">
                Create Account
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40">
          &copy; 2026 GalleryLedger
        </p>
      </footer>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Visual verification**

Navigate to `http://localhost:<port>/` (unauthenticated) and take screenshots:
1. Hero section — full viewport, Ken Burns image, wordmark, CTA
2. Scroll down — feature sections animate in
3. Bottom — closing CTA with two buttons

- [ ] **Step 5: Commit**

```bash
git add src/pages/LandingPage.tsx public/images/hero.jpg
git commit -m "feat: cinematic landing page with hero, features, and CTA"
```

---

### Task 7: Works List — Art Grid with Responsive Layout

**Files:**
- Modify: `src/pages/WorkList.tsx`

This is a major rewrite. The flat list becomes a responsive art-forward grid. Each card is an image-dominant 4:5 card with text overlay. All business logic (filtering, search, subscriptions) stays identical.

- [ ] **Step 1: Rewrite WorkList.tsx**

Replace the entire contents of `src/pages/WorkList.tsx`. Preserve all imports, state, effects, and filter logic. Replace only the rendering:

```tsx
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search, Plus, ImagePlus, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToWorks } from '@/lib/services'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import type { Work, WorkStatus } from '@/types'
import { WORK_STATUSES, STATUS_LABELS } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<WorkStatus, string> = {
  intake: 'bg-blue-400',
  in_storage: 'bg-zinc-400',
  on_display: 'bg-emerald-400',
  on_loan: 'bg-amber-400',
  shipped: 'bg-purple-400',
  sold: 'bg-gold',
  returned: 'bg-zinc-500',
}

export function StatusBadge({ status }: { status: WorkStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-black/40 backdrop-blur-sm">
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_COLORS[status])} />
      {STATUS_LABELS[status]}
    </span>
  )
}

function ArtCard({ work, onClick, index }: { work: Work; onClick: () => void; index: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className="group relative aspect-[4/5] w-full overflow-hidden bg-card text-left"
    >
      {work.coverPhotoUrl ? (
        <motion.img
          layoutId={`work-image-${work.id}`}
          src={work.coverPhotoUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary">
          <ImagePlus className="h-8 w-8 text-muted-foreground/30" strokeWidth={1} />
        </div>
      )}

      {/* Status dot */}
      <div className="absolute top-2.5 right-2.5">
        <span className={cn('block h-2 w-2 rounded-full', STATUS_COLORS[work.status])} />
      </div>

      {/* Text overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-10">
        <p className="truncate font-heading text-[13px] font-medium leading-tight text-white">
          {work.artist}
        </p>
        <p className="mt-0.5 truncate text-[11px] italic text-white/65">
          {work.title}
        </p>
      </div>

      {/* Hover border (desktop) */}
      <div className="pointer-events-none absolute inset-0 border border-transparent transition-colors duration-200 group-hover:border-gold/40" />
    </motion.button>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-[shimmer_1.5s_ease-in-out_infinite] rounded-none bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]" />
      ))}
    </div>
  )
}

export default function WorkList() {
  const { gallery } = useAuth()
  const navigate = useNavigate()
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all')

  useEffect(() => {
    if (!gallery) return
    const unsub = subscribeToWorks(gallery.id, (data) => {
      setWorks(data)
      setLoading(false)
    })
    return unsub
  }, [gallery])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: works.length }
    for (const s of WORK_STATUSES) counts[s] = 0
    for (const w of works) counts[w.status] = (counts[w.status] || 0) + 1
    return counts
  }, [works])

  const filteredWorks = useMemo(() => {
    let result = works
    if (statusFilter !== 'all') {
      result = result.filter((w) => w.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((w) =>
        w.artist.toLowerCase().includes(q) ||
        w.title.toLowerCase().includes(q) ||
        w.medium.toLowerCase().includes(q) ||
        w.notes.toLowerCase().includes(q)
      )
    }
    return result
  }, [works, statusFilter, searchQuery])

  const hasWorks = works.length > 0

  return (
    <div>
      <TopBar
        title={searchOpen ? '' : 'Works'}
        actions={
          searchOpen ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by artist, title, or medium"
                autoFocus
                className="h-9 border-border/60 bg-card"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <>
              {hasWorks && (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-gold transition-colors"
                >
                  <Search className="h-5 w-5" strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={() => navigate('/works/new')}
                className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-gold transition-colors"
              >
                <Plus className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </>
          )
        }
      />

      <div className="mx-auto max-w-6xl">
        {loading ? (
          <div className="px-0.5 pt-2 lg:px-4">
            <GridSkeleton />
          </div>
        ) : !hasWorks ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center px-4"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center border border-border/50 bg-secondary">
              <ImagePlus className="h-8 w-8 text-muted-foreground" strokeWidth={1} />
            </div>
            <h2 className="font-heading text-xl font-medium">Your Collection Awaits</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
              Begin documenting your gallery's works with full provenance tracking
            </p>
            <Button
              className="mt-8 h-11 bg-gold px-8 text-sm font-medium uppercase tracking-widest text-gold-foreground hover:bg-gold/90"
              onClick={() => navigate('/works/new')}
            >
              Add First Work
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Status filter chips */}
            <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider border transition-colors',
                  statusFilter === 'all'
                    ? 'border-gold/30 bg-gold/10 text-gold'
                    : 'border-border/50 bg-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                All ({statusCounts.all})
              </button>
              {WORK_STATUSES.map((s) => (
                statusCounts[s] > 0 && (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'flex-shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider border transition-colors',
                      statusFilter === s
                        ? 'border-gold/30 bg-gold/10 text-gold'
                        : 'border-border/50 bg-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    )}
                  >
                    {STATUS_LABELS[s]} ({statusCounts[s]})
                  </button>
                )
              ))}
            </div>

            {/* Art grid */}
            {filteredWorks.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? `No works matching "${searchQuery}"` :
                   statusFilter !== 'all' ? `No works with status "${STATUS_LABELS[statusFilter]}"` :
                   'No matching works'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-0.5 px-0.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-1 lg:px-4">
                <AnimatePresence mode="popLayout">
                  {filteredWorks.map((work, i) => (
                    <ArtCard
                      key={work.id}
                      work={work}
                      onClick={() => navigate(`/works/${work.id}`)}
                      index={i}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Visual verification**

Navigate to the works list and take screenshots at:
1. Mobile (390px) — 2-column grid with art cards
2. Desktop (1280px) — 4-column grid with hover effects visible

- [ ] **Step 4: Commit**

```bash
git add src/pages/WorkList.tsx
git commit -m "feat: art-forward responsive grid for works list"
```

---

### Task 8: WorkDetail — Full-Bleed Hero, Visual Timeline, Desktop Layout

**Files:**
- Modify: `src/pages/WorkDetail.tsx`

This is the largest task. The WorkDetail page is ~600 lines with extensive business logic (event forms, sale recording, payout, delete, edit, export). We preserve ALL business logic and only change the layout/presentation layer.

The key changes:
1. Full-bleed hero image with `layoutId` for shared-element transition
2. Visual vertical timeline with gold line + dots
3. Desktop: two-column layout (sticky image left, content right)
4. Content sections with fade-in-on-scroll
5. FAB with gold glow and spring animation

- [ ] **Step 1: Read the full current WorkDetail.tsx**

Read the entire file to understand all the business logic, state, and event handling that must be preserved. The file is ~600 lines — read it in full before making changes.

- [ ] **Step 2: Rewrite the layout/render portions**

The changes are in the JSX return block and some component extractions. Keep all imports, state, effects, and handler functions identical. Modify only the rendered output.

Key JSX changes:

**Hero section** — replace the current photo carousel with:
```tsx
{/* Full-bleed hero */}
<div className="relative bg-black lg:sticky lg:top-0 lg:h-screen lg:w-1/2">
  {photos.length > 0 ? (
    <div className="relative h-[50vh] lg:h-full">
      <motion.img
        layoutId={`work-image-${workId}`}
        src={photos[carouselIndex]?.storageUrl ?? work.coverPhotoUrl}
        alt=""
        className="h-full w-full object-contain"
      />
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          {photos.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCarouselIndex(idx)}
              className={cn(
                'h-1.5 w-1.5 rounded-full transition-colors',
                idx === carouselIndex ? 'bg-gold' : 'bg-white/40'
              )}
            />
          ))}
        </div>
      )}
    </div>
  ) : (
    <div className="flex h-[50vh] items-center justify-center lg:h-full">
      <ImagePlus className="h-12 w-12 text-muted-foreground/20" strokeWidth={1} />
    </div>
  )}
</div>
```

**Desktop two-column wrapper** — wrap the entire return in:
```tsx
<div className="lg:flex">
  {/* Hero section (left on desktop) */}
  ...
  {/* Content section (right on desktop, scrollable) */}
  <div className="lg:w-1/2 lg:min-h-screen">
    ...
  </div>
</div>
```

**Artist info block** — below the hero:
```tsx
<div className="px-4 py-6 lg:px-8">
  <h1 className="font-heading text-2xl font-medium">{work.artist}</h1>
  <p className="mt-1 text-base italic text-muted-foreground">{work.title}</p>
  {(work.medium || work.dimensions) && (
    <p className="mt-2 text-sm text-muted-foreground/70">
      {[work.medium, work.dimensions].filter(Boolean).join(' — ')}
    </p>
  )}
  <div className="mt-3"><StatusBadge status={work.status} /></div>
</div>
```

**Timeline section** — replace the flat event list with a visual timeline:
```tsx
<div className="px-4 py-6 lg:px-8">
  <h3 className="text-[10px] font-medium uppercase tracking-wider text-gold mb-6">Timeline</h3>
  <div className="relative pl-6">
    {/* Vertical gold line */}
    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gold/30" />

    {events.map((event) => {
      const Icon = EVENT_ICONS[event.type]
      return (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="relative mb-6 last:mb-0"
        >
          {/* Gold dot */}
          <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-gold bg-background" />

          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                {event.createdAt ? formatDate(event.createdAt) : ''}
              </p>
              <p className="mt-0.5 text-sm">{event.description}</p>
              {event.type === 'payout' && (event.details as any)?.amount && (
                <p className="mt-1 text-sm font-medium text-gold">
                  {formatCurrency((event.details as any).amount, (event.details as any).currency ?? 'USD')}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )
    })}
  </div>
</div>
```

**FAB** — update with gold glow and spring:
```tsx
<motion.button
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
  onClick={() => setFabOpen(!fabOpen)}
  className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center bg-gold text-gold-foreground shadow-[0_0_20px_rgba(201,169,110,0.3)] md:bottom-8 md:right-8"
>
  <Plus className={cn('h-6 w-6 transition-transform', fabOpen && 'rotate-45')} strokeWidth={1.5} />
</motion.button>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Visual verification**

Navigate to a work detail page and take screenshots at:
1. Mobile (390px) — full-bleed hero, artist info, timeline with gold line
2. Desktop (1280px) — two-column layout, sticky image on left

- [ ] **Step 5: Commit**

```bash
git add src/pages/WorkDetail.tsx
git commit -m "feat: WorkDetail with full-bleed hero, visual timeline, desktop layout"
```

---

### Task 9: Shared-Element Transition — LayoutGroup Wrapper

**Files:**
- Modify: `src/App.tsx`

Wrap the authenticated route area in Framer Motion's `LayoutGroup` so `layoutId` animations work across WorkList ↔ WorkDetail navigation.

- [ ] **Step 1: Add LayoutGroup to App.tsx**

Add the import at the top of `src/App.tsx`:
```tsx
import { LayoutGroup } from 'framer-motion'
```

Wrap the `<AppShell />` element in the authenticated route:

Change:
```tsx
<Route element={<AuthGuard><AppShell /></AuthGuard>}>
```
to:
```tsx
<Route element={<AuthGuard><LayoutGroup><AppShell /></LayoutGroup></AuthGuard>}>
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Visual verification**

Navigate from works list to a work detail and back. Verify:
1. The artwork image animates from its grid position to the full-bleed hero
2. On back navigation, the image animates back to the grid

Note: If `LayoutGroup` across routes causes issues with React Router, an alternative is to use `AnimatePresence` with `mode="wait"` on the route outlet. Test and adjust.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add LayoutGroup for shared-element transitions"
```

---

### Task 10: Consignor Pages — Responsive Improvements

**Files:**
- Modify: `src/pages/ConsignorList.tsx`
- Modify: `src/pages/ConsignorDetail.tsx`

Light-touch improvements to make consignor pages responsive. ConsignorList gets a grid layout on wider screens. ConsignorDetail gets a wider max-width on desktop.

- [ ] **Step 1: Update ConsignorList for responsive grid**

In `src/pages/ConsignorList.tsx`, change the container from:
```tsx
<div className="mx-auto max-w-[640px] px-4 pt-4">
```
to:
```tsx
<div className="mx-auto max-w-4xl px-4 pt-4">
```

And change the cards container from:
```tsx
<div className="space-y-3">
```
to:
```tsx
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
```

- [ ] **Step 2: Update ConsignorDetail max-width**

In `src/pages/ConsignorDetail.tsx`, change:
```tsx
<div className="mx-auto max-w-[640px] px-4 pt-4 space-y-6">
```
to:
```tsx
<div className="mx-auto max-w-3xl px-4 pt-4 space-y-6">
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/ConsignorList.tsx src/pages/ConsignorDetail.tsx
git commit -m "feat: responsive improvements for consignor pages"
```

---

### Task 11: Final Polish — Micro-interactions & Cleanup

**Files:**
- Modify: `src/index.css` (if any missed keyframes)
- Delete: any leftover mockup/temp files

- [ ] **Step 1: Clean up temporary files**

```bash
rm -f mockup-grid.html mockup-mobile-grid.png
```

- [ ] **Step 2: Full build verification**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Full visual walkthrough via Playwright**

Take screenshots of every major screen at mobile (390px) and desktop (1280px):
1. Landing page `/` (unauthenticated)
2. Sign in page `/signin`
3. Works list `/works` (authenticated)
4. Work detail `/works/:id`
5. Consignors `/consignors`
6. Settings `/settings`

Review each screenshot for visual consistency.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final polish and cleanup for Exhibition redesign"
```

- [ ] **Step 5: Deploy**

```bash
npm run build && npx firebase deploy --only hosting
```
