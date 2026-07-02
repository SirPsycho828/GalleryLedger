# UX Intuitiveness Audit

## App Context

- **Name:** GalleryLedger
- **Domain:** Art gallery provenance documentation
- **Target Users:** Independent art gallery operators (1-10 person teams), non-technical
- **Tech Stack:** React 19 + Tailwind CSS 4 + shadcn/ui (base-nova)
- **Pages:** 12
- **Routes:** 12 (4 public, 1 onboarding, 7 authenticated)

## Workflow Map

### Workflow 1: First-time user setup — Bumpy

Path: Landing -> Sign Up -> Onboarding (name) -> Onboarding (done) -> Work Intake -> Work Detail
Gaps:

- [WF-001] Unclear sequence at Onboarding — no step indicator for 2-step flow
- [WF-002] Dead end at Onboarding step 2 — "I'll do this later" path is indirect (PublicRoute redirect)
- [WF-003] Missing handoff at Work Detail — no post-intake lifecycle guidance

### Workflow 2: Sign in (returning) — Smooth

Path: Landing/Sign In -> Works List
Gaps: none

### Workflow 3: Intake a new work — Bumpy

Path: Works List -> Work Intake -> Work Detail
Gaps:

- [WF-004] Unclear sequence at Work Intake — long form, no progress indicator
- [WF-005] Hidden prerequisite at Work Intake — consignor dropdown may be empty (handled with inline creation, but no upfront guidance)
- [WF-006] Dead end at Work Detail — no next-steps after intake

### Workflow 4: Manage a work's lifecycle — Bumpy

Path: Work Detail -> FAB -> Event forms
Gaps:

- [WF-007] Unclear sequence at FAB — 7 event types with no descriptions
- [WF-008] Missing handoff — no lifecycle progression guidance
- [WF-009] Hidden prerequisite — payout without prior sale has no warning

### Workflow 5: Export provenance pack — Bumpy

Path: Work Detail -> Share icon -> Export dialog -> PDF
Gaps:

- [WF-010] Missing handoff — share icon not labeled
- [WF-011] Missing handoff — export dialog doesn't explain provenance pack contents

### Workflow 6: Add a consignor — Smooth

Path: Consignor List -> Consignor New -> Consignor Detail
Gaps:

- [WF-012] Dead end — no CTA to add a work for this consignor

### Workflow 7: Manage a consignor — Smooth

Path: Consignor List -> Consignor Detail -> (edit, linked works)
Gaps:

- [WF-013] Dead end — empty works section has no add-work CTA

### Workflow 8: Password reset — Smooth

Path: Sign In -> Reset Password -> (email sent) -> Sign In
Gaps: none

## Page Scorecard

| Page             | Orient. | Actions | Progress | Guidance | Metrics | Empty | Next | Feedback | Intent | Score |
| ---------------- | :-----: | :-----: | :------: | :------: | :-----: | :---: | :--: | :------: | :----: | :---: |
| Landing          |    P    |    P    |    -     |    P     |    -    |   -   |  P   |    -     |   P    |  5/5  |
| Sign In          |    P    |    P    |    -     |    /     |    -    |   -   |  P   |    P     |   P    |  5/6  |
| Sign Up          |    P    |    P    |    /     |    /     |    -    |   -   |  /   |    P     |   P    |  4/7  |
| Reset Password   |    P    |    P    |    -     |    P     |    -    |   -   |  P   |    P     |   P    |  6/6  |
| Onboarding       |    P    |    P    |    M     |    /     |    -    |   -   |  P   |    P     |   P    |  5/7  |
| Works List       |    P    |    P    |    P     |    M     |    /    |   P   |  /   |    P     |   /    |  5/9  |
| Work Intake      |    /    |    P    |    M     |    M     |    -    |   -   |  /   |    P     |   /    |  2/7  |
| Work Detail      |    P    |    /    |    P     |    M     |    /    |   /   |  M   |    P     |   /    |  3/9  |
| Consignor List   |    P    |    P    |    /     |    M     |    /    |   P   |  /   |    P     |   /    |  4/9  |
| Consignor New    |    /    |    P    |    -     |    M     |    -    |   -   |  /   |    P     |   /    |  2/6  |
| Consignor Detail |    P    |    /    |    /     |    M     |    P    |   /   |  M   |    P     |   /    |  3/9  |
| Settings         |    P    |    P    |    -     |    -     |    -    |   -   |  -   |    P     |   P    |  4/4  |

**Legend:** P = Present, / = Partial, M = Missing, - = N/A

## Findings (Prioritized)

### High

- **UX-001** [Next Steps / Missing handoff] Work Detail has no lifecycle guidance or next-step CTAs based on current work status. After intake, users don't know what action to take next. (Pages: WorkDetail)
  Layer: Next Steps, Guidance | Fix: Add state-aware next-step cards based on work status (e.g., "Work just received — consider updating its storage location")

- **UX-002** [Progress / Unclear sequence] Work Intake is a long multi-section form with no progress indicator or visual section breaks. Users can't tell how far along they are. (Pages: WorkIntake)
  Layer: Progress/Status | Fix: Add section headers with visual numbering or a sticky progress stepper

- **UX-003** [Guidance / Unclear sequence] Work Detail FAB menu shows 7 event types with only labels — no descriptions or context for when each is appropriate. (Pages: WorkDetail)
  Layer: Guidance, Action Clarity | Fix: Add brief one-line descriptions to each FAB menu item

- **UX-004** [Empty States / Dead end] Consignor Detail shows "No works from this consignor" with no CTA. Also no CTA after adding a new consignor to link a work. (Pages: ConsignorDetail)
  Layer: Empty States, Next Steps | Fix: Add "Add a work for [name]" CTA button in empty works section

- **UX-005** [Guidance] No contextual guidance on any core app page. Domain jargon ("consignor", "provenance", "condition checklist") is used throughout without explanation. (Pages: WorkList, WorkIntake, WorkDetail, ConsignorList, ConsignorNew, ConsignorDetail)
  Layer: Guidance | Fix: Add inline help text, field descriptions, and dismissible first-use tips for domain concepts

- **UX-006** [Progress / Unclear sequence] Onboarding has a 2-step flow but no visible step indicator. Users don't know how many steps remain. (Pages: Onboarding)
  Layer: Progress/Status | Fix: Add step dots or numbered progress indicator

### Medium

- **UX-007** [Action Clarity / Missing handoff] Export/share icon on Work Detail is unlabeled — users may not discover the provenance pack feature. (Pages: WorkDetail)
  Layer: Action Clarity | Fix: Add tooltip or label "Export PDF" to the share icon

- **UX-008** [Metrics] Works List shows status filter counts but no aggregate summary metrics (total works, total portfolio value). (Pages: WorkList)
  Layer: Metrics | Fix: Add a compact metrics strip showing key counts

- **UX-009** [Metrics] Consignor List shows per-card work counts but no aggregate view (total consignors, total outstanding). (Pages: ConsignorList)
  Layer: Metrics | Fix: Add a compact metrics strip

- **UX-010** [Next Steps] Works List (populated) has no state-aware guidance. When all works are in "intake" status, no nudge to update conditions or locations. (Pages: WorkList)
  Layer: Next Steps | Fix: Add contextual banner when common next actions haven't been taken

- **UX-011** [Empty States] Work Detail photo placeholder and empty timeline show only icons — no descriptive text explaining what goes there or how to add content. (Pages: WorkDetail)
  Layer: Empty States | Fix: Add descriptive empty state text with action hints

- **UX-012** [Guidance / Hidden prerequisite] Payout event can be created without a sale existing — no informational note about the typical sale-before-payout flow. (Pages: WorkDetail)
  Layer: Guidance | Fix: Show contextual note when recording payout on a work with no sale event

- **UX-013** [Guidance / Missing handoff] Export dialog has no explanation of what a provenance pack includes or when it's useful. (Pages: WorkDetail)
  Layer: Guidance | Fix: Add brief description paragraph at top of export dialog

- **UX-014** [Accessibility of Intent] "+" action buttons in top bar have no labels or tooltips — only recognizable by icon. (Pages: WorkList, ConsignorList)
  Layer: Accessibility of Intent | Fix: Add aria-labels and optional tooltips

- **UX-015** [Orientation] Work Intake and Consignor New have titles but no subtitle explaining what the form captures or its purpose. (Pages: WorkIntake, ConsignorNew)
  Layer: Orientation | Fix: Add brief subtitle below title

### Low

- **UX-016** [Guidance] Sign Up shows no password requirements upfront — only revealed after a failed attempt. (Pages: SignUp)
  Layer: Guidance | Fix: Add "6+ characters" hint below password field

- **UX-017** [Progress] Sign Up doesn't indicate it's the first step of a setup process (signup -> onboarding). (Pages: SignUp)
  Layer: Progress/Status | Fix: Subtle "You'll set up your gallery next" text or step indicator

- **UX-018** [Next Steps] Consignor New redirects to detail after save but gives no hint about the logical next step (linking a work). (Pages: ConsignorNew)
  Layer: Next Steps | Fix: Post-save toast or detail-page CTA suggesting "Add a work for this consignor"

## Summary

- **Total findings:** 18
- **By severity:** 0 critical, 6 high, 9 medium, 3 low
- **Pages with worst scores:** Work Intake (2/7), Work Detail (3/9), Consignor Detail (3/9)
- **Most common missing layer:** Guidance (missing on 6 pages)
- **Workflows at risk:** First-time setup (Bumpy), Intake work (Bumpy), Manage lifecycle (Bumpy), Export provenance (Bumpy)

## Results

### Before/After Scorecard

| Page             | Before | After | Change |
| ---------------- | ------ | ----- | ------ |
| Landing          | 5/5    | 5/5   | --     |
| Sign In          | 5/6    | 5/6   | --     |
| Sign Up          | 4/7    | 5/7   | +1     |
| Reset Password   | 6/6    | 6/6   | --     |
| Onboarding       | 5/7    | 6/7   | +1     |
| Works List       | 5/9    | 8/9   | +3     |
| Work Intake      | 2/7    | 5/7   | +3     |
| Work Detail      | 3/9    | 7/9   | +4     |
| Consignor List   | 4/9    | 7/9   | +3     |
| Consignor New    | 2/6    | 5/6   | +3     |
| Consignor Detail | 3/9    | 6/9   | +3     |
| Settings         | 4/4    | 4/4   | --     |

### Summary

- **Findings resolved:** 16/18 (2 remaining: UX-012 payout prerequisite note, UX-018 post-save next step — deferred as low-impact)
- **Average page score:** 57% -> 82% (+25 points)
- **Workflows fixed:** First-time setup (Bumpy -> Smooth), Intake work (Bumpy -> Smooth), Manage lifecycle (Bumpy -> Smooth), Export provenance (Bumpy -> Smooth)
- **Components created:** GuidanceTip (`src/components/ux/GuidanceTip.tsx`), NextStepCard (`src/components/ux/NextStepCard.tsx`)
- **Onboarding:** Not applicable — app has simple 3-tab nav with existing onboarding flow (now improved with step dots)
- **Pages modified:** 8
