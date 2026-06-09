# Design Overhaul State

## Current Phase: Complete
## Completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

## Project
- **Name:** GalleryLedger
- **Domain:** Art gallery management / provenance tracking
- **Framework:** React 19 + React Router 7
- **CSS:** Tailwind CSS 4
- **Component Library:** shadcn/ui (base-nova style)
- **Build Tool:** Vite 8
- **Package Manager:** npm
- **Animation:** Framer Motion
- **Icons:** Lucide React
- **Backend:** Firebase (Auth, Firestore, Storage)
- **PWA:** vite-plugin-pwa with Workbox

## Current Design
- **Fonts:** Cormorant Garamond Variable (headings) + Outfit Variable (body)
- **Colors:** Deep warm black (#0B0A09) bg, warm ivory (#EDE8E0) text, antique gold (#B8956A) accent
- **Radius:** 0.25rem (sharp)
- **Dark mode:** Dark only

## Page Inventory
| Page | Route | File | Status |
|------|-------|------|--------|
| Landing | / | src/pages/LandingPage.tsx | done |
| Sign In | /signin | src/pages/SignIn.tsx | done |
| Sign Up | /signup | src/pages/SignUp.tsx | done |
| Reset Password | /reset-password | src/pages/ResetPassword.tsx | done |
| Onboarding | /onboarding | src/pages/Onboarding.tsx | done |
| Works List | /works | src/pages/WorkList.tsx | done |
| Work Intake | /works/new | src/pages/WorkIntake.tsx | done |
| Work Detail | /works/:workId | src/pages/WorkDetail.tsx | done |
| Consignor List | /consignors | src/pages/ConsignorList.tsx | done |
| Consignor New | /consignors/new | src/pages/ConsignorNew.tsx | done |
| Consignor Detail | /consignors/:consignorId | src/pages/ConsignorDetail.tsx | done |
| Settings | /settings | src/pages/SettingsPage.tsx | done |

## Design Direction
**Chosen:** The Vault — Ultra-refined archive elegance
**Typography:** Cormorant Garamond (heading) + Outfit (body)
**Primary:** #B8956A (antique gold)
**Accent:** #8B7355 (patina copper)
**Background:** #0B0A09 (deep warm black)
**Surface:** #151413 (elevated dark)
**Foreground:** #EDE8E0 (warm ivory)
**Parchment:** #F7F3ED (light accent text)
**Signature:** Spotlight reveal animations — radial light bloom on entry, gold luminance on hover

## Design System
docs/design-system.md
