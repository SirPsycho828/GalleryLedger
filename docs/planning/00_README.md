▸ Extended thinking (1025 chars)  
## Overview

GalleryLedger is a mobile-first PWA for independent galleries, small dealers, and art advisors (1-10 person teams) who need dispute-proof documentation for consigned artworks. It replaces scattered camera rolls, spreadsheets, and email threads with a single timestamped record per work -- covering intake photos, condition notes, signatures, location history, and payout reconciliation.

The core value proposition is anxiety elimination: when a consignor disputes a condition claim, the gallery pulls up a complete, timestamped timeline in seconds instead of hours of searching.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React 19 + Vite | SPA with PWA capabilities |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS 4 + shadcn/ui | Mobile-first, DM Sans font |
| Auth | Firebase Auth | Email/password |
| Database | Cloud Firestore | Offline persistence enabled |
| Storage | Firebase Storage | Full-resolution photos |
| PDF | Client-side generation | No server dependency |
| Signatures | Canvas-based touch drawing | Saved as images to Storage |
| Hosting | Firebase Hosting | Single deployment target |

## Target User Profile

- Solo operator or tiny team (1-10 people) managing all gallery operations
- Price-sensitive: under $50/month ceiling
- Works on their feet -- intake, hanging, packing, client meetings
- No dedicated registrar or IT support
- High-trust consignor relationships where documentation failures are relationship failures

## Core Workflows

1. **Work Intake** -- Photograph a work on arrival, run through condition checklist, capture consignor signature. Total time: a few minutes. See `06_Work_Intake.md`.
2. **Timeline Accumulation** -- Every event (location change, condition update, loan, sale, payout) logs to the work's timeline automatically. See `09_Timeline_Architecture.md` and `10_Timeline_Events.md`.
3. **Evidence Retrieval** -- Pull up any work's complete history in seconds. See `12_Work_Detail_View.md`.
4. **Provenance Pack Export** -- Generate a PDF with photos, timeline, and condition history for consignors, buyers, or insurers. See `15_PDF_Provenance_Pack.md`.
5. **Payout Reconciliation** -- Track sale price, commission split, and consignor payouts per work. See `14_Sales_And_Payouts.md`.

## File Structure

| File | Description |
|------|-------------|
| `00_README.md` | This file -- project overview, tech stack, architecture |
| `01_Auth_And_Onboarding.md` | Email/password auth, gallery auto-creation on signup |
| `02_Database_Schema.md` | Firestore collections, field definitions, relationships |
| `03_Security_Rules.md` | Firestore and Storage rules, one-user-one-gallery ownership model |
| `04_UI_Design_System.md` | Colors, typography, spacing, component patterns |
| `05_App_Shell_And_Navigation.md` | PWA shell, bottom navigation, responsive layout |
| `06_Work_Intake.md` | New work creation flow with photos, condition, signature |
| `07_Photo_Capture_And_Storage.md` | Camera integration, full-res upload, offline queuing |
| `08_Signature_Capture.md` | Touch-drawn canvas signatures, storage, legal display |
| `09_Timeline_Architecture.md` | Append-only event model, 15-min edit grace period |
| `10_Timeline_Events.md` | Event type definitions: location, condition, sale, payout, note |
| `11_Work_List_Dashboard.md` | Gallery home screen, work grid/list, search, status filters |
| `12_Work_Detail_View.md` | Header card with photos, vertical timeline, event expansion |
| `13_Consignor_Management.md` | Consignor records, linking works, contact info |
| `14_Sales_And_Payouts.md` | Sale recording, commission splits, payout tracking |
| `15_PDF_Provenance_Pack.md` | Client-side PDF generation, full and selective export |
| `16_Offline_Architecture.md` | Firestore offline persistence, photo sync queue, conflict strategy |
| `17_Future_Features.md` | Post-MVP features: multi-gallery, CSV export, notifications, etc. |

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              React 19 PWA                    │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ shadcn  │ │ Camera   │ │ PDF Gen      │  │
│  │ UI      │ │ + Canvas │ │ (client-side)│  │
│  └─────────┘ └──────────┘ └──────────────┘  │
│  ┌─────────────────────────────────────────┐ │
│  │     Firestore SDK (offline-enabled)     │ │
│  └─────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │   Firebase Cloud   │
         │ ┌───────────────┐  │
         │ │  Auth          │  │
         │ │  Firestore     │  │
         │ │  Storage       │  │
         │ │  Hosting       │  │
         │ └───────────────┘  │
         └────────────────────┘
```

**No backend server.** The app talks directly to Firebase services. Security rules on Firestore and Storage enforce all access control. PDF generation happens entirely on the client. This eliminates server costs, simplifies deployment, and enables full offline functionality.

## Data Model Summary

The Firestore structure follows a gallery-scoped hierarchy. See `02_Database_Schema.md` for full field definitions.

```
galleries/{galleryId}
  ├── works/{workId}
  │     ├── events/{eventId}        (timeline events)
  │     └── photos/{photoId}        (photo metadata)
  └── consignors/{consignorId}
```

Storage paths mirror Firestore:
```
galleries/{galleryId}/works/{workId}/photos/{filename}
galleries/{galleryId}/works/{workId}/signatures/{filename}
```

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth model | One user = one gallery | Simplest path for MVP; gallery auto-created on signup. See `01_Auth_And_Onboarding.md` |
| Photo resolution | Full-resolution originals | Dispute-proof requires maximum detail; no lossy compression |
| Timeline integrity | Append-only, 15-min edit grace | Balances usability with audit credibility. See `09_Timeline_Architecture.md` |
| Sold work behavior | No restrictions | Works can receive events after sale (post-sale condition docs before buyer handoff) |
| PDF generation | Client-side only | No Cloud Functions needed; works offline |
| Signature method | Touch-drawn canvas | No third-party signature services; works offline |
| Offline strategy | Firestore built-in persistence + custom photo sync queue | See `16_Offline_Architecture.md` |

## Build Sequence

Implementation should follow file numbering order. The dependency chain:

1. **Foundation** (files 01-05): Auth, schema, security rules, design system, app shell
2. **Core intake** (files 06-08): Work creation, photo capture, signatures
3. **Timeline** (files 09-10): Event architecture and event types
4. **Views** (files 11-12): Work list and work detail screens
5. **Business logic** (files 13-15): Consignors, sales/payouts, PDF export
6. **Polish** (file 16): Offline reliability hardening

## Key Constraints

- **Budget**: Under $50/month operational cost target (Firebase free tier covers most MVP usage)
- **Users**: Single operator per gallery at MVP -- no multi-user roles or permissions
- **Inventory**: Designed for 20-100 works per gallery (typical small gallery)
- **Mobile-first**: Primary use is on-feet with a phone; desktop is secondary
- **No backend**: Zero Cloud Functions at MVP; all logic runs client-side or via security rules

## Gaps and Assumptions

| Gap | Default Applied |
|-----|----------------|
| Specific color palette not defined in PRD | Design system will define. See `04_UI_Design_System.md` |
| Maximum photo count per work not specified | Default: 20 photos per work |
| Data retention / archival policy not specified | All data retained indefinitely at MVP |
| Specific condition checklist items not defined | Will need domain research or user input. Flagged in `06_Work_Intake.md` |
| PWA install prompt strategy not specified | Standard browser install prompt; no custom prompt at MVP |
| Analytics / usage tracking not specified | None at MVP. Deferred to `17_Future_Features.md` |
| Terms of service / legal requirements for signatures | Flagged in `08_Signature_Capture.md`; not a software concern at MVP |
| Multi-device simultaneous use not addressed | Firestore handles this natively; no special logic needed |  
