<div align="center">

# GalleryLedger

**Dispute-proof artwork documentation for independent galleries**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Offline_Ready-5A0FC8?logo=pwa&logoColor=white)

</div>

## Overview

GalleryLedger is a mobile-first Progressive Web App that helps independent art galleries manage consigned artworks with complete, timestamped documentation. Every intake, condition change, location move, sale, and payout is recorded in an append-only timeline -- creating an unalterable provenance record that protects galleries, consignors, and buyers.

## Features

<table>
<tr>
<td width="50%">

**Work Intake & Documentation**
Photograph artworks, assess condition with a 12-point checklist, capture consignor signatures, and create a complete intake record in one flow.

</td>
<td width="50%">

**Append-Only Timeline**
Every event (condition update, location change, status change, sale, payout, note) is permanently recorded with timestamps and optional photos.

</td>
</tr>
<tr>
<td width="50%">

**PDF Provenance Pack**
Export a comprehensive PDF with cover photo, work details, condition history, timeline events, financial summary, and signatures. Share via native share sheet or download.

</td>
<td width="50%">

**Offline-First Architecture**
Full read/write functionality offline. Firestore handles data sync. A custom IndexedDB queue ensures photos upload when connectivity returns.

</td>
</tr>
<tr>
<td width="50%">

**Consignor Management**
Track consignor contact info, linked works, and financial summaries with running payout balances.

</td>
<td width="50%">

**Sales & Payouts**
Record sales with commission rates, track consignor payouts, and see real-time remaining balances.

</td>
</tr>
</table>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 with SWC |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Auth | Firebase Authentication (email/password) |
| Database | Cloud Firestore with offline persistence |
| Storage | Firebase Storage (photos, signatures, documents) |
| PDF | jsPDF + jspdf-autotable (client-side generation) |
| Offline | Firestore cache + IndexedDB upload queue |
| PWA | vite-plugin-pwa with Workbox |
| Font | DM Sans (variable) |
| Icons | Lucide React |

## Project Structure

```
src/
  App.tsx                    # Router and route definitions
  main.tsx                   # Entry point, queue initialization
  index.css                  # Tailwind config, design tokens
  types/index.ts             # All TypeScript types and constants
  env.d.ts                   # Vite environment variable types
  lib/
    firebase.ts              # Firebase app, auth, db, storage init
    services.ts              # Firestore CRUD, Storage uploads, utilities
    pdf.ts                   # PDF provenance pack generation
    uploadQueue.ts           # IndexedDB offline upload queue
    utils.ts                 # cn() helper
  contexts/
    AuthContext.tsx           # Auth state, gallery management
  components/
    AppShell.tsx              # Bottom tab navigation, layout
    AuthGuard.tsx             # Route protection, onboarding redirect
    OfflineBanner.tsx         # Connectivity + queue status indicator
    TopBar.tsx                # Reusable sticky top bar
    SignatureCapture.tsx      # Full-screen canvas signature pad
    ui/                      # shadcn/ui components
  pages/
    SignIn.tsx                # Email/password sign in
    SignUp.tsx                # Registration
    ResetPassword.tsx         # Password reset
    Onboarding.tsx            # Gallery name setup
    SettingsPage.tsx          # Gallery settings, sign out
    WorkList.tsx              # Dashboard with filters and search
    WorkIntake.tsx            # 4-section intake form
    WorkDetail.tsx            # Photo carousel, timeline, FAB, export
    ConsignorList.tsx         # Consignor directory
    ConsignorNew.tsx          # New consignor form
    ConsignorDetail.tsx       # Consignor profile, linked works
```

## Getting Started

### Prerequisites

- Node.js 22+
- npm 10+
- A Firebase project with Authentication, Firestore, and Storage enabled

### Install

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in your Firebase config:

```bash
cp .env.example .env
```

Required variables:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Deploy Security Rules

```bash
firebase deploy --only firestore:rules,storage
```

### Development

```bash
npm run dev
```

### Build & Preview

```bash
npm run build
npm run preview
```

### Deploy

```bash
firebase deploy --only hosting
```

## Security Model

- **One gallery per user** -- each user owns exactly one gallery
- **Owner-only access** -- Firestore rules enforce that only the gallery owner can read/write their data
- **Append-only timeline** -- events can only be edited within a 15-minute grace period
- **File validation** -- Storage rules enforce size limits (25MB photos, 5MB signatures, 10MB documents) and content types
- **No server** -- all logic runs client-side; security is enforced by Firebase rules
