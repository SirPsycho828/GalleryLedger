## Overview

Features explicitly deferred from MVP scope. Each item was identified during PRD development and intentionally excluded to keep the MVP focused on the core value proposition: dispute-proof documentation for consigned works. Items are grouped by theme and rated by complexity to inform post-MVP planning. Nothing here should be built at MVP -- this file exists to capture decisions and prevent scope creep.

## Dependencies

This file references gaps flagged across all other files:

- `01_Auth_And_Onboarding.md` -- Auth enhancements
- `02_Database_Schema.md` -- Schema extensions
- `04_UI_Design_System.md` -- Theming
- `06_Work_Intake.md` -- Intake enhancements
- `07_Photo_Capture_And_Storage.md` -- Photo tooling
- `10_Timeline_Events.md` -- Event types
- `11_Work_List_Dashboard.md` -- List features
- `13_Consignor_Management.md` -- Consignor access
- `14_Sales_And_Payouts.md` -- Financial features
- `15_PDF_Provenance_Pack.md` -- Export enhancements

## Authentication and Access

### Multi-User / Staff Access

**What**: Multiple staff members per gallery with role-based permissions (owner, staff, read-only).
**Why deferred**: MVP is single-operator. Adds significant complexity to security rules, data model (roles subcollection on gallery), and every query.
**Complexity**: High
**Schema impact**: Add `galleries/{galleryId}/members/{userId}` subcollection with role field. Rewrite all security rules from `ownerId == auth.uid` to role-based checks.
**Flagged in**: `01_Auth_And_Onboarding.md`, `03_Security_Rules.md`

### Multi-Gallery Support

**What**: A single user manages multiple galleries (dealer with two locations, advisor working with several galleries).
**Why deferred**: Changes the core data model from one-user-one-gallery to many-to-many. Affects navigation, gallery switching UI, and every query.
**Complexity**: Medium
**Flagged in**: PRD Step 6

### Account Deletion

**What**: User can delete their account and all associated data (gallery, works, photos, events).
**Why deferred**: Requires cascading delete across Firestore subcollections and Storage files. Likely needs a Cloud Function. May be legally required (GDPR) before public launch in the EU.
**Complexity**: Medium
**Flagged in**: `01_Auth_And_Onboarding.md`

### Email Verification

**What**: Verify email address after signup before granting full access.
**Why deferred**: Adds friction to the first-value moment. Low abuse risk for a single-user app.
**Complexity**: Low
**Flagged in**: `01_Auth_And_Onboarding.md`

## Intake and Documentation

### Barcode / QR Scanning

**What**: Scan inventory labels during intake to auto-populate or link records.
**Why deferred**: Requires camera integration beyond simple photo capture. Niche use case -- not all galleries use labels.
**Complexity**: Medium
**Flagged in**: `06_Work_Intake.md`

### Batch Intake

**What**: Log multiple works in one session (e.g., receiving a shipment of 15 works for a fair).
**Why deferred**: Significant UX complexity. The one-at-a-time flow is simpler and more reliable. Batch intake risks incomplete records.
**Complexity**: High
**Flagged in**: `06_Work_Intake.md`

### Medium-Specific Condition Checklists

**What**: Show different checklist items based on the work's medium (painting vs. sculpture vs. works on paper).
**Why deferred**: Requires defining medium categories and mapping checklist items to each. The universal checklist covers most cases.
**Complexity**: Low
**Flagged in**: `06_Work_Intake.md`

### Draft Auto-Save

**What**: Auto-save incomplete intake forms to local storage so they survive navigation or app closure.
**Why deferred**: The intake form is designed to complete in under 3 minutes. Interruptions are uncommon. Adds state management complexity.
**Complexity**: Medium
**Flagged in**: `06_Work_Intake.md`

### Event Backdating

**What**: Optional "occurred at" date field on timeline events, separate from the `createdAt` timestamp, to record when something actually happened versus when it was logged.
**Why deferred**: Complicates the timeline display (which date to sort by?) and weakens the timestamp integrity argument. Needs careful UX.
**Complexity**: Low
**Schema impact**: Add optional `occurredAt` Timestamp field to events. Display logic chooses which date to show.
**Flagged in**: `09_Timeline_Architecture.md`

## Photos and Media

### Photo Editing / Annotation

**What**: Crop, rotate, or draw markup on photos within the app. Useful for circling damage areas on condition photos.
**Why deferred**: Significant UI complexity. Canvas-based image editing is a feature unto itself. Users can annotate with native phone tools before importing.
**Complexity**: High
**Flagged in**: `07_Photo_Capture_And_Storage.md`

### Video Capture

**What**: Record short video clips as part of condition documentation.
**Why deferred**: Large file sizes increase storage costs and upload times significantly. Adds video player component. Complicates PDF export.
**Complexity**: High
**Flagged in**: `07_Photo_Capture_And_Storage.md`

### Server-Side Image Thumbnails

**What**: Generate optimized thumbnails via Cloud Functions or Firebase Extensions on upload, reducing bandwidth for list views.
**Why deferred**: Client-side thumbnail generation and Firebase CDN caching handle MVP scale (20-100 works). Adds Cloud Function dependency.
**Complexity**: Medium
**Flagged in**: `07_Photo_Capture_And_Storage.md`

### Photo Reordering

**What**: Drag-to-reorder photos on a work to change the cover photo or display sequence.
**Why deferred**: Requires drag-and-drop UI and batch `sortOrder` updates. First-photo-as-cover is sufficient for MVP.
**Complexity**: Low
**Flagged in**: `12_Work_Detail_View.md`

## Timeline and Events

### Dedicated Loan Event Type

**What**: A `loan` event type capturing borrower name, loan dates, insurance requirements, and return date tracking.
**Why deferred**: Loans are tracked at MVP via `status_change` to `on_loan` plus `location_change`. A dedicated type adds structured fields but is not essential.
**Complexity**: Medium
**Schema impact**: New event type with `details` map: `borrowerName`, `loanStartDate`, `expectedReturnDate`, `insuranceRef`.
**Flagged in**: `10_Timeline_Events.md`

### Event Templates

**What**: Save frequently used event configurations (e.g., "moved to storage room A") as templates for quick reuse.
**Why deferred**: Adds template management UI. Location autocomplete partially solves this for location changes.
**Complexity**: Medium
**Flagged in**: `10_Timeline_Events.md`

### Bulk Events

**What**: Apply the same event (location change, status change) to multiple works at once.
**Why deferred**: Requires multi-select UI on the work list, batch write logic, and event creation for each work. Significant UX and technical scope.
**Complexity**: High
**Flagged in**: `10_Timeline_Events.md`

### Pressure-Sensitive Signatures

**What**: Variable stroke width based on stylus/finger pressure during signature capture.
**Why deferred**: Requires Pointer Events pressure data integration and more complex canvas rendering. Fixed stroke width looks fine.
**Complexity**: Low
**Flagged in**: `08_Signature_Capture.md`

## Financial

### Default Commission Rate

**What**: Store a gallery-wide default commission rate that pre-fills the sale form.
**Why deferred**: Requires a new field on the gallery document and a settings UI to manage it. Operators enter the rate per sale at MVP.
**Complexity**: Low
**Schema impact**: Add `defaultCommissionRate` to `galleries` collection.
**Flagged in**: `14_Sales_And_Payouts.md`

### Invoice / Receipt Generation

**What**: Generate invoice or receipt PDFs for sales and payouts, separate from the provenance pack.
**Why deferred**: Invoices have legal/tax requirements that vary by jurisdiction. Out of scope for a documentation tool.
**Complexity**: Medium
**Flagged in**: `14_Sales_And_Payouts.md`

### Financial Reports / CSV Export

**What**: Export sales and payout data as CSV or generate summary financial reports (monthly sales, outstanding payouts across all works).
**Why deferred**: Reporting is a distinct feature set. The per-work and per-consignor financial summaries cover MVP needs.
**Complexity**: Medium
**Flagged in**: `14_Sales_And_Payouts.md`

### Multi-Currency Aggregation

**What**: Properly aggregate financial totals across works with different currencies, with optional exchange rate conversion.
**Why deferred**: Most small galleries operate in one currency. Multi-currency math with exchange rates is complex.
**Complexity**: High
**Flagged in**: `13_Consignor_Management.md`, `14_Sales_And_Payouts.md`

## Export and Sharing

### Batch PDF Export

**What**: Export provenance packs for all works (or a filtered set) in one action, as a ZIP file or combined PDF.
**Why deferred**: Memory-intensive. Generating 50 PDFs with photos client-side is impractical without server support.
**Complexity**: High
**Flagged in**: `15_PDF_Provenance_Pack.md`

### Custom PDF Branding

**What**: Gallery logo, custom colors, and footer text on exported PDFs.
**Why deferred**: Requires logo upload UI, storage, and PDF template customization. Text-only gallery name is sufficient for MVP.
**Complexity**: Medium
**Flagged in**: `15_PDF_Provenance_Pack.md`

### Consignor Portal

**What**: A read-only view where consignors can log in to see their works, condition history, and payout status.
**Why deferred**: Requires a separate auth flow, consignor-scoped security rules, and a new set of screens. Major feature.
**Complexity**: High
**Flagged in**: `13_Consignor_Management.md`

### CSV Data Export

**What**: Export the full works list and consignor list as CSV/spreadsheet files.
**Why deferred**: PDF provenance packs cover the primary export need. CSV export is useful for data portability but not critical at launch.
**Complexity**: Low
**Flagged in**: PRD Step 6

## UI and Experience

### Dark Mode

**What**: Dark color theme option.
**Why deferred**: Light theme is better for viewing artwork photography accurately. Adds theme management complexity.
**Complexity**: Medium
**Flagged in**: `04_UI_Design_System.md`

### Advanced Search and Sort

**What**: Sort by artist, title, intake date. Multi-status filtering. Fuzzy search with typo tolerance.
**Why deferred**: Client-side substring search over 20-100 works is sufficient for MVP.
**Complexity**: Low-Medium
**Flagged in**: `11_Work_List_Dashboard.md`

### Work Archive (Soft Delete)

**What**: Archive works instead of hard deleting them. Archived works are hidden from the main list but recoverable.
**Why deferred**: Adds an `archived` flag, filtered queries, and an archive management screen. Hard delete with confirmation is simpler.
**Complexity**: Low
**Schema impact**: Add `archived: boolean` to works. Filter default list query.
**Flagged in**: `12_Work_Detail_View.md`

### App Update Prompt

**What**: Notify the user when a new version of the PWA is available and prompt them to refresh.
**Why deferred**: Updates apply on next full app load. An in-app prompt improves the experience but is not critical.
**Complexity**: Low
**Flagged in**: `05_App_Shell_And_Navigation.md`

### Analytics / Usage Tracking

**What**: Track feature usage, screen views, and engagement metrics to inform product decisions.
**Why deferred**: Not needed for initial launch. Can be added incrementally via Firebase Analytics.
**Complexity**: Low
**Flagged in**: `00_README.md`

## Gaps and Assumptions

- Priority ordering within this list is not specified. Post-MVP prioritization should be driven by user feedback after launch.
- Complexity ratings are relative to MVP scope. "Low" means a few days of work; "Medium" means one to two weeks; "High" means a significant feature initiative.
- Schema impacts are noted where a deferred feature would require changes to the Firestore data model. Building with these in mind is not necessary at MVP -- the schema can be migrated later.
- Some features (account deletion, email verification) may become requirements rather than enhancements depending on launch jurisdiction and user base.
