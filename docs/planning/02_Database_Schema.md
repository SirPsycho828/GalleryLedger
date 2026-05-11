## Overview

Firestore database schema for GalleryLedger. Gallery-scoped hierarchy with works, timeline events, photo metadata, and consignors as the core collections. Designed for a single-owner gallery model with 20-100 works typical inventory size.

All timestamps use Firestore `Timestamp` type. All document IDs are auto-generated unless noted otherwise.

## Dependencies

- `01_Auth_And_Onboarding.md` -- Gallery auto-creation on signup, `ownerId` linkage
- `03_Security_Rules.md` -- Rules enforce ownership via `ownerId` field
- `07_Photo_Capture_And_Storage.md` -- Storage paths for photo and signature files

## Collection Hierarchy

```
galleries/{galleryId}
  ├── works/{workId}
  │     ├── events/{eventId}
  │     └── photos/{photoId}
  └── consignors/{consignorId}
```

All data is scoped under a gallery document. No root-level collections exist besides `galleries`.

## Collections

### `galleries`

**Purpose**: Top-level container for a single gallery operation. One per user at MVP.

| Field | Type | Notes |
|-------|------|-------|
| `ownerId` | `string` | Firebase Auth UID. Indexed. The sole access control field. |
| `name` | `string` | Gallery display name. Max 100 chars. Empty until onboarding completes. |
| `createdAt` | `Timestamp` | Server timestamp at creation |

**Indexes**: Single-field index on `ownerId` (auto-created by Firestore for equality queries).

---

### `galleries/{galleryId}/works`

**Purpose**: A consigned artwork or object being tracked by the gallery.

| Field | Type | Notes |
|-------|------|-------|
| `artist` | `string` | Artist name. Required. |
| `title` | `string` | Work title. Required. |
| `medium` | `string` | e.g., "Oil on canvas". Optional. |
| `dimensions` | `string` | Free-text, e.g., "24 x 36 in". Optional. |
| `year` | `string` | Creation year. String to allow "c. 1920" or "undated". Optional. |
| `consignorId` | `string \| null` | Reference to `consignors/{consignorId}`. Null if no consignor linked. |
| `status` | `string` | Enum: `intake`, `in_storage`, `on_display`, `on_loan`, `shipped`, `sold`, `returned`. Default: `intake`. |
| `coverPhotoUrl` | `string \| null` | Download URL of the primary photo. Set to the first uploaded photo. |
| `intakeDate` | `Timestamp` | When the work was received. Defaults to creation time. |
| `notes` | `string` | Free-text general notes. Optional. |
| `salePrice` | `number \| null` | Sale price in cents. Null until sold. See `14_Sales_And_Payouts.md`. |
| `currency` | `string` | ISO 4217 code. Default: `USD`. |
| `commissionRate` | `number \| null` | Gallery commission as decimal (0.0 to 1.0). e.g., 0.5 for 50%. |
| `createdAt` | `Timestamp` | Server timestamp |
| `updatedAt` | `Timestamp` | Server timestamp, updated on any field change |

**Status transitions**: No enforced state machine. Any status can transition to any other status. The timeline event records what changed and when. See `10_Timeline_Events.md`.

**Indexes**:
- Composite: `status` + `updatedAt` DESC (work list filtering by status, sorted by recent activity)
- Composite: `consignorId` + `createdAt` DESC (works by consignor)

---

### `galleries/{galleryId}/works/{workId}/events`

**Purpose**: Append-only timeline of everything that happens to a work. The core audit trail. See `09_Timeline_Architecture.md` for integrity rules.

| Field | Type | Notes |
|-------|------|-------|
| `type` | `string` | Enum: `intake`, `condition_update`, `location_change`, `status_change`, `sale`, `payout`, `note`, `document_attach` |
| `description` | `string` | Human-readable summary. Auto-generated or user-entered depending on type. |
| `details` | `map` | Type-specific structured data. See below. |
| `photoUrls` | `string[]` | Download URLs of photos attached to this event. Empty array if none. |
| `createdAt` | `Timestamp` | Server timestamp. Immutable. |
| `updatedAt` | `Timestamp \| null` | Set only if edited within the 15-min grace period. Null otherwise. |
| `editableUntil` | `Timestamp` | `createdAt` + 15 minutes. After this, the event is locked. |

**Type-specific `details` map**:

**`intake`**:
| Field | Type | Notes |
|-------|------|-------|
| `conditionSummary` | `string` | Overall condition: `excellent`, `good`, `fair`, `poor` |
| `conditionNotes` | `string` | Free-text condition description |
| `checklist` | `map` | Key-value pairs from condition checklist. See `06_Work_Intake.md`. |
| `signatureUrl` | `string \| null` | Download URL of consignor signature image |

**`condition_update`**:
| Field | Type | Notes |
|-------|------|-------|
| `conditionSummary` | `string` | Same enum as intake |
| `conditionNotes` | `string` | What changed and why |

**`location_change`**:
| Field | Type | Notes |
|-------|------|-------|
| `from` | `string` | Previous location (free-text) |
| `to` | `string` | New location (free-text) |

**`status_change`**:
| Field | Type | Notes |
|-------|------|-------|
| `from` | `string` | Previous status enum value |
| `to` | `string` | New status enum value |

**`sale`**:
| Field | Type | Notes |
|-------|------|-------|
| `salePrice` | `number` | In cents |
| `currency` | `string` | ISO 4217 |
| `buyerName` | `string` | Optional |
| `commissionRate` | `number` | Decimal 0.0-1.0 |

**`payout`**:
| Field | Type | Notes |
|-------|------|-------|
| `amount` | `number` | In cents |
| `currency` | `string` | ISO 4217 |
| `method` | `string` | Free-text: "check", "wire", "cash", etc. |
| `reference` | `string` | Check number, transaction ID, etc. Optional. |

**`note`**: No structured details. `description` field holds the note text.

**`document_attach`**:
| Field | Type | Notes |
|-------|------|-------|
| `fileName` | `string` | Original filename |
| `fileUrl` | `string` | Download URL from Storage |
| `fileType` | `string` | MIME type |

**Indexes**:
- Composite: `createdAt` ASC (timeline display order within a work)

---

### `galleries/{galleryId}/works/{workId}/photos`

**Purpose**: Metadata for photos associated with a work. Actual files live in Firebase Storage.

| Field | Type | Notes |
|-------|------|-------|
| `storageUrl` | `string` | Firebase Storage download URL |
| `storagePath` | `string` | Full Storage path for deletion reference |
| `fileName` | `string` | Original or generated filename |
| `takenAt` | `Timestamp` | When the photo was captured (from EXIF if available, otherwise upload time) |
| `eventId` | `string \| null` | Associated timeline event. Null for standalone gallery photos. |
| `sortOrder` | `number` | Display ordering. First photo (lowest number) becomes cover photo. |
| `createdAt` | `Timestamp` | Server timestamp |

**Indexes**:
- Composite: `sortOrder` ASC (photo display ordering)

---

### `galleries/{galleryId}/consignors`

**Purpose**: People or entities who consign works to the gallery. See `13_Consignor_Management.md`.

| Field | Type | Notes |
|-------|------|-------|
| `name` | `string` | Full name or entity name. Required. |
| `email` | `string` | Contact email. Optional. |
| `phone` | `string` | Contact phone. Optional. |
| `address` | `string` | Free-text mailing address. Optional. |
| `notes` | `string` | Free-text notes about this consignor. Optional. |
| `workCount` | `number` | Denormalized count of works linked to this consignor. Updated on work create/update. |
| `createdAt` | `Timestamp` | Server timestamp |
| `updatedAt` | `Timestamp` | Server timestamp |

**Indexes**: Default single-field indexes are sufficient. `name` for search, `createdAt` for listing.

## Storage Paths

Firebase Storage structure mirrors Firestore hierarchy:

```
galleries/{galleryId}/
  works/{workId}/
    photos/{filename}          -- work photos (full resolution)
    signatures/{filename}      -- intake signature images (PNG)
    documents/{filename}       -- attached files (PDFs, etc.)
```

File naming: `{timestamp}_{randomId}.{ext}` to avoid collisions. See `07_Photo_Capture_And_Storage.md` for upload details.

## Denormalization Strategy

Minimal denormalization at MVP. Two exceptions:

1. **`coverPhotoUrl` on works** -- Avoids a subcollection query to display the work list. Updated when the first photo is added or when a user changes the cover photo.
2. **`workCount` on consignors** -- Avoids a collection group query to show work count in the consignor list. Incremented/decremented when a work's `consignorId` is set or changed.

Both are write-time denormalizations managed by the client. Firestore transactions are not required for MVP (acceptable to be eventually consistent for display counts).

## Gaps and Assumptions

| Item | Default | Notes |
|------|---------|-------|
| Condition checklist fields | Not defined | Domain-specific. Flagged for user input. See `06_Work_Intake.md`. |
| Currency support | USD default, single currency per work | Multi-currency conversion deferred to post-MVP |
| Monetary values in cents | Integer cents | Avoids floating-point precision issues. All display formatting happens client-side. |
| Photo limit per work | 20 photos | Not specified in PRD. Reasonable for mobile storage/bandwidth. |
| Document attachment size limit | 10 MB per file | Not specified. Firebase Storage default max is 5 GB but client-side limit is prudent. |
| Consignor deduplication | None | No duplicate detection at MVP. User manages manually. |
| Soft delete | Not implemented | Deleting a work or consignor is a hard delete at MVP. Timeline integrity concern flagged in `09_Timeline_Architecture.md`. |
| `workCount` drift | Accepted | No transaction or Cloud Function to guarantee accuracy. Acceptable for display purposes. |  
