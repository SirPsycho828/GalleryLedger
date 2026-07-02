# UX Intuitiveness State

## Current Phase: 7 (Verify & Deploy)

## Completed: [1, 2, 3, 4, 5, 6]

## Phase 1 (Discovery) — Complete

- [x] Step 1: Read project identity
- [x] Step 2: Detect tech stack
- [x] Step 3: Inventory all pages
- [x] Step 4: Map navigation structure
- [x] Step 5: Identify existing UX patterns
- [x] Step 6: Check for design system
- [x] Step 7: Output discovery summary
- [x] Step 8: Write state file

## Project

- **Name:** GalleryLedger
- **Domain:** Art gallery provenance documentation
- **Target Users:** Independent art gallery operators (1-10 person teams), non-technical
- **Framework:** React 19 + TypeScript 6 + Vite 8
- **CSS:** Tailwind CSS 4
- **Component Library:** shadcn/ui (base-nova style)
- **Router:** React Router 7
- **State Management:** React Context (AuthContext)
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Toast:** Sonner
- **Package Manager:** npm

## Page Inventory

| Page             | Route                      | File                            | Type     | Score   |
| ---------------- | -------------------------- | ------------------------------- | -------- | ------- |
| Landing          | `/`                        | `src/pages/LandingPage.tsx`     | landing  | pending |
| Sign In          | `/signin`                  | `src/pages/SignIn.tsx`          | auth     | pending |
| Sign Up          | `/signup`                  | `src/pages/SignUp.tsx`          | auth     | pending |
| Reset Password   | `/reset-password`          | `src/pages/ResetPassword.tsx`   | auth     | pending |
| Onboarding       | `/onboarding`              | `src/pages/Onboarding.tsx`      | form     | pending |
| Works List       | `/works`                   | `src/pages/WorkList.tsx`        | list     | pending |
| Work Intake      | `/works/new`               | `src/pages/WorkIntake.tsx`      | form     | pending |
| Work Detail      | `/works/:workId`           | `src/pages/WorkDetail.tsx`      | detail   | pending |
| Consignor List   | `/consignors`              | `src/pages/ConsignorList.tsx`   | list     | pending |
| Consignor New    | `/consignors/new`          | `src/pages/ConsignorNew.tsx`    | form     | pending |
| Consignor Detail | `/consignors/:consignorId` | `src/pages/ConsignorDetail.tsx` | detail   | pending |
| Settings         | `/settings`                | `src/pages/SettingsPage.tsx`    | settings | pending |

## Navigation Structure

- **Desktop:** Fixed left sidebar (72px) — GL monogram + Works, Consignors, Settings
- **Mobile:** Bottom tab bar (auto-hides on scroll) — Works, Consignors, Settings
- **TopBar:** Sticky header with optional back button + action icons (search, add)
- **No:** breadcrumbs, tabs within pages, footer nav

## Existing UX Patterns

- **Empty states:** WorkList ("Your Collection Awaits" + CTA), ConsignorList ("No Consignors Yet" + CTA). Good patterns with icons, descriptive text, and actionable buttons.
- **Loading states:** Shimmer grid skeleton (WorkList), Skeleton components (ConsignorList, ConsignorDetail). Well-implemented.
- **Error states:** Inline error banner (SignIn), toast.error on CRUD failures. Minimal — no 404 pages, no error boundaries visible.
- **Help text:** Minimal. Label text and placeholders only. No tooltips, inline hints, or contextual help.
- **Metrics:** Financial calculations on ConsignorDetail (total sales, consignor share, outstanding balance). WorkDetail has payout tracking. No dashboard-level KPIs.
- **Progress:** Onboarding has 2 steps but no visible step indicator. WorkIntake is a long form with no progress indication.
- **Toasts:** Sonner for success/error on all CRUD operations.
- **Confirmations:** Delete consignor, sign out, discard unsaved work intake changes.
- **Offline:** OfflineBanner for offline state + upload queue count.

## Design System

- **Theme:** "The Vault" — dark refined archive aesthetic
- **Colors:** Deep warm black (#0B0A09) bg, warm ivory (#EDE8E0) text, antique gold (#B8956A) primary, patina copper (#8B7355)
- **Fonts:** Cormorant Garamond Variable (headings), Outfit Variable (body)
- **Radius:** Sharp (0.25rem base)
- **Animations:** spotlight-reveal, shimmer, ken-burns. Framer Motion for page transitions.
- **Accessibility:** Respects prefers-reduced-motion

## Phase 2 (Workflow Audit) — Complete

- [x] Step 1: Load references (workflow-gap-types.md)
- [x] Step 2: Discover workflows
- [x] Step 3: Walk each workflow
- [x] Step 4: Identify cross-workflow dependencies
- [x] Step 5: Rate workflow health
- [x] Step 6: Output workflow map
- [x] Step 7: Update state
- [x] Step 8: Load Phase 3

## Workflow Map

### Workflow 1: First-time user setup — Bumpy

Path: Landing -> Sign Up -> Onboarding (step 1: name) -> Onboarding (step 2: done) -> Work Intake -> Work Detail
Dependencies: none
Gaps:

- WF-001 Unclear sequence at Onboarding — 2-step flow has no visible step indicator or progress bar
- WF-002 Dead end at Onboarding step 2 — "I'll do this later" navigates to `/` (PublicRoute redirect), indirect path
- WF-003 Missing handoff at Work Detail — after first intake, no guidance on what to do next (add events, track condition, etc.)

### Workflow 2: Sign in (returning) — Smooth

Path: Landing/Sign In -> Works List
Dependencies: none
Gaps: none

### Workflow 3: Intake a new work — Bumpy

Path: Works List -> Work Intake -> Work Detail
Dependencies: none (consignors can be created inline)
Gaps:

- WF-004 Unclear sequence at Work Intake — long multi-section form with no progress indicator or section headers explaining the flow
- WF-005 Hidden prerequisite at Work Intake — consignor dropdown may be empty for new users; handled with inline creation but no upfront guidance
- WF-006 Dead end at Work Detail (post-intake) — lands on detail page after intake with toast, but no "next steps" guidance (e.g., "now update location" or "add to display")

### Workflow 4: Manage a work's lifecycle — Bumpy

Path: Work Detail -> FAB -> Event forms (condition, location, status, sale, payout, note, document)
Dependencies: requires Workflow 3
Gaps:

- WF-007 Unclear sequence at Work Detail FAB — 7 event types shown with no descriptions or hints about when to use each
- WF-008 Missing handoff at Work Detail — no guidance on typical lifecycle progression (intake -> storage -> display -> sale -> payout -> return)
- WF-009 Hidden prerequisite at Payout — payout event makes sense only after a sale, but no validation or warning if no sale recorded

### Workflow 5: Export provenance pack — Bumpy

Path: Work Detail -> Share icon -> Export dialog -> PDF download/share
Dependencies: requires Workflow 3
Gaps:

- WF-010 Missing handoff at Work Detail — share icon (export) not labeled; users may not discover it
- WF-011 Missing handoff at Export dialog — no explanation of what a provenance pack includes or when to use it

### Workflow 6: Add a consignor — Smooth

Path: Consignor List -> Consignor New -> Consignor Detail
Dependencies: none
Gaps:

- WF-012 Dead end at Consignor Detail — after adding consignor, no CTA to "Add a work for this consignor"

### Workflow 7: Manage a consignor — Smooth

Path: Consignor List -> Consignor Detail -> (edit, delete, view linked works)
Dependencies: none
Gaps:

- WF-013 Dead end at Consignor Detail (no works) — empty works section says "No works from this consignor" with no CTA to add one

### Workflow 8: Password reset — Smooth

Path: Sign In -> Reset Password -> (email sent) -> Sign In
Dependencies: none
Gaps: none

### Cross-Workflow Dependencies

- Consignors can be created inline during Work Intake — no hard dependency
- Events require a Work to exist — naturally enforced by navigation
- Payout logically follows Sale — not enforced in UI, no warning
- Export requires at least some data on the work — works with any state but more useful after events

## Workflow Gap Summary

| ID     | Gap Type            | Workflow         | Location          | Description                                |
| ------ | ------------------- | ---------------- | ----------------- | ------------------------------------------ |
| WF-001 | Unclear sequence    | First-time setup | Onboarding        | No step indicator for 2-step flow          |
| WF-002 | Dead end            | First-time setup | Onboarding step 2 | "I'll do this later" path is indirect      |
| WF-003 | Missing handoff     | First-time setup | Work Detail       | No post-intake guidance                    |
| WF-004 | Unclear sequence    | Intake work      | Work Intake       | Long form, no progress/sections            |
| WF-005 | Hidden prerequisite | Intake work      | Work Intake       | Empty consignor dropdown for new users     |
| WF-006 | Dead end            | Intake work      | Work Detail       | No next-steps after intake                 |
| WF-007 | Unclear sequence    | Manage lifecycle | Work Detail FAB   | 7 event types with no descriptions         |
| WF-008 | Missing handoff     | Manage lifecycle | Work Detail       | No lifecycle progression guidance          |
| WF-009 | Hidden prerequisite | Manage lifecycle | Payout event      | No warning if no sale recorded             |
| WF-010 | Missing handoff     | Export           | Work Detail       | Share icon not labeled                     |
| WF-011 | Missing handoff     | Export           | Export dialog     | No explanation of provenance pack contents |
| WF-012 | Dead end            | Add consignor    | Consignor Detail  | No CTA to add a work for this consignor    |
| WF-013 | Dead end            | Manage consignor | Consignor Detail  | Empty works list has no add-work CTA       |

## Phase 3 (Page Scorecard) — Complete

- [x] Step 1: Load references (ux-layers.md)
- [x] Step 2: Score each page
- [x] Step 3: Cross-reference with workflow gaps
- [x] Step 4: Generate findings
- [x] Step 5: Write audit report (docs/ux-audit-report.md)
- [x] Step 6: Present summary
- [x] Step 7: Update state
- [x] Step 8: Load Phase 4

## Findings

| ID     | Severity | Status   | Pages                                                                          |
| ------ | -------- | -------- | ------------------------------------------------------------------------------ |
| UX-001 | high     | resolved | WorkDetail                                                                     |
| UX-002 | high     | resolved | WorkIntake                                                                     |
| UX-003 | high     | resolved | WorkDetail                                                                     |
| UX-004 | high     | resolved | ConsignorDetail                                                                |
| UX-005 | high     | resolved | WorkList, WorkIntake, WorkDetail, ConsignorList, ConsignorNew, ConsignorDetail |
| UX-006 | high     | resolved | Onboarding                                                                     |
| UX-007 | medium   | resolved | WorkDetail                                                                     |
| UX-008 | medium   | resolved | WorkList                                                                       |
| UX-009 | medium   | resolved | ConsignorList                                                                  |
| UX-010 | medium   | resolved | WorkList                                                                       |
| UX-011 | medium   | resolved | WorkDetail                                                                     |
| UX-012 | medium   | open     | WorkDetail                                                                     |
| UX-013 | medium   | resolved | WorkDetail                                                                     |
| UX-014 | medium   | resolved | WorkList, ConsignorList                                                        |
| UX-015 | medium   | resolved | WorkIntake, ConsignorNew                                                       |
| UX-016 | low      | resolved | SignUp                                                                         |
| UX-017 | low      | resolved | SignUp                                                                         |
| UX-018 | low      | open     | ConsignorNew                                                                   |

## Phase 4 (Components) — Complete

- [x] Step 1: Load references (component-catalog.md, anti-patterns.md)
- [x] Step 2: Analyze findings for patterns (GuidanceTip 8+ usages, NextStepCard 4+ usages)
- [x] Step 3: Determine component directory (src/components/ux/)
- [x] Step 4: Fetch library documentation (shadcn/ui via Context7)
- [x] Step 5: Build each component
- [x] Step 6: Verify build (tsc --noEmit passes)
- [x] Step 7: Update state
- [x] Step 8: Load Phase 5

## Components Created

- `src/components/ux/GuidanceTip.tsx` — Dismissible contextual tips with localStorage persistence
- `src/components/ux/NextStepCard.tsx` — State-aware next-step navigation cards

## Phase 5 (Implementation) — Complete

- [x] Step 1: Load references (anti-patterns.md)
- [x] Step 2: Sort findings by priority
- [ ] Step 3: Set up Playwright verification — skipped: dev server not running, will verify in Phase 7
- [x] Step 4: Implement fixes page by page (8 pages modified via parallel subagents)
- [x] Step 5: Handle edge cases (responsive, dark mode native)
- [x] Step 6: Final build check (tsc --noEmit passes)
- [x] Step 7: Update state
- [x] Step 8: Load Phase 6

## Pages Modified

- `src/pages/WorkDetail.tsx` — UX-001, UX-003, UX-005, UX-007, UX-011, UX-013
- `src/pages/WorkIntake.tsx` — UX-002, UX-005, UX-015
- `src/pages/WorkList.tsx` — UX-005, UX-008, UX-010, UX-014
- `src/pages/ConsignorList.tsx` — UX-005, UX-009, UX-014
- `src/pages/ConsignorDetail.tsx` — UX-004, UX-005
- `src/pages/ConsignorNew.tsx` — UX-005, UX-015
- `src/pages/Onboarding.tsx` — UX-006
- `src/pages/SignUp.tsx` — UX-016, UX-017

## Phase 6 (Onboarding) — Complete (Skipped)

- [x] Step 1: Assess need
- [ ] Steps 2-8: Skipped — neither Setup Wizard nor App Tour warranted
- [x] Step 9: Update state

**Why onboarding was skipped:**

- Setup Wizard: App requires only a gallery name before core workflow (existing Onboarding page handles this, now with step indicator). No 3+ entity prerequisite.
- App Tour: Only 3 top-level nav items. Phase 5 GuidanceTips provide contextual first-use guidance. A formal tour would over-engineer a simple navigation structure.
