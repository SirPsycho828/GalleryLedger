## Overview

Firestore and Firebase Storage security rules enforce the one-user-one-gallery ownership model. Every read and write gates on a single check: the authenticated user's UID matches the `ownerId` field on the gallery document. No roles, no sharing, no public access at MVP.

Security rules are the only server-side access control. There are no Cloud Functions, no backend API, no middleware. If the rules are wrong, data is exposed or unprotected.

## Dependencies

- `01_Auth_And_Onboarding.md` -- Auth model, gallery auto-creation flow
- `02_Database_Schema.md` -- Collection hierarchy, field names, data types
- `09_Timeline_Architecture.md` -- Append-only event integrity, 15-min edit grace period

## Core Principle

Every rule follows the same pattern:

1. User must be authenticated
2. User must own the gallery (their UID matches `galleries/{galleryId}.ownerId`)
3. Data validation ensures required fields and correct types on writes

The ownership check requires reading the gallery document. Firestore caches this read within a single rules evaluation, so nested subcollection rules do not incur multiple reads per request.

## Firestore Rules

### Helper Functions

Define these at the top of the rules file to avoid repetition:

**`isSignedIn()`** -- Returns true if the request has a valid auth token.

**`isGalleryOwner(galleryId)`** -- Reads `galleries/{galleryId}` and returns true if `resource.data.ownerId == request.auth.uid`. This is the single gate for all gallery-scoped access.

**`isValidTimestamp(field)`** -- Returns true if the field is a Firestore server timestamp (`request.time`). Used to enforce server timestamps on `createdAt` fields.

### Rules by Collection

#### `galleries`

**Create**: Authenticated user only. The `ownerId` field must equal `request.auth.uid`. This prevents a user from creating a gallery owned by someone else. Required fields: `ownerId`, `name`, `createdAt`.

**Read**: Authenticated user where `resource.data.ownerId == request.auth.uid`. Users can only read their own gallery.

**Update**: Gallery owner only. The `ownerId` field cannot be changed (the incoming data must match the existing value). `createdAt` cannot be changed.

**Delete**: Denied. Galleries cannot be deleted through client-side operations at MVP.

**List queries**: Allow listing where `ownerId == request.auth.uid`. This supports the gallery lookup query on app load (see `01_Auth_And_Onboarding.md`). Deny any list query that does not filter on `ownerId` to prevent enumeration.

#### `galleries/{galleryId}/works`

**Create**: Gallery owner. Required fields: `artist`, `title`, `status`, `createdAt`, `updatedAt`. Validate `status` is one of the allowed enum values.

**Read**: Gallery owner.

**Update**: Gallery owner. `createdAt` cannot be changed. `updatedAt` must be a server timestamp. Validate `status` enum on change.

**Delete**: Gallery owner. No restrictions at MVP (see Gaps).

**List**: Gallery owner. No additional query constraints required beyond ownership.

#### `galleries/{galleryId}/works/{workId}/events`

**Create**: Gallery owner. Required fields: `type`, `description`, `createdAt`, `editableUntil`. Validate `type` is one of the allowed enum values. `editableUntil` must equal `createdAt` + 15 minutes (enforced approximately -- see Implementation Notes).

**Read**: Gallery owner.

**Update**: Gallery owner, with additional constraint: `request.time <= resource.data.editableUntil`. This enforces the 15-minute edit grace period. After `editableUntil` passes, the event is immutable. `createdAt`, `editableUntil`, and `type` cannot be changed on update.

**Delete**: Denied. Events are append-only. No event can ever be deleted through client-side operations.

**List**: Gallery owner.

#### `galleries/{galleryId}/works/{workId}/photos`

**Create**: Gallery owner. Required fields: `storageUrl`, `storagePath`, `fileName`, `sortOrder`, `createdAt`.

**Read**: Gallery owner.

**Update**: Gallery owner. Only `sortOrder` and `eventId` can be changed. Other fields are immutable after creation.

**Delete**: Gallery owner. Deleting photo metadata is allowed (user may remove a photo from a work). The actual Storage file cleanup is the client's responsibility.

**List**: Gallery owner.

#### `galleries/{galleryId}/consignors`

**Create**: Gallery owner. Required field: `name` (non-empty string), `createdAt`, `updatedAt`.

**Read**: Gallery owner.

**Update**: Gallery owner. `createdAt` cannot be changed. `updatedAt` must be a server timestamp.

**Delete**: Gallery owner. No cascade to works -- the `consignorId` field on works becomes an orphaned reference. Acceptable at MVP.

**List**: Gallery owner.

## Status Enum Validation

Validate the `status` field on works against an allowed list within security rules:

Allowed values: `intake`, `in_storage`, `on_display`, `on_loan`, `shipped`, `sold`, `returned`

## Event Type Enum Validation

Validate the `type` field on events:

Allowed values: `intake`, `condition_update`, `location_change`, `status_change`, `sale`, `payout`, `note`, `document_attach`

## Firebase Storage Rules

Storage rules follow the same ownership pattern but require a slightly different approach since Storage rules cannot directly read Firestore documents in all Firebase plans.

### Approach: Path-Based Convention with Auth

Storage paths encode the gallery ID: `galleries/{galleryId}/...`

Since Storage rules cannot efficiently read Firestore to verify gallery ownership on every request, use a two-layer approach:

**Layer 1 (Storage rules)**: Require authentication. Enforce that the upload path starts with a gallery ID segment. Enforce file size limits and content type restrictions.

**Layer 2 (Client-side)**: The app only constructs Storage paths using the authenticated user's gallery ID. Security rules on Firestore (where the download URLs are stored) prevent any user from reading URLs belonging to another gallery's works.

### Storage Rule Details

**Path**: `galleries/{galleryId}/works/{workId}/photos/{fileName}`

- **Read**: Authenticated users only. At MVP, photo URLs are not guessable (they contain auth tokens), and Firestore rules prevent reading another gallery's photo metadata. This is acceptable security for MVP.
- **Write**: Authenticated users only. File size limit: 25 MB. Allowed content types: `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `image/webp`.

**Path**: `galleries/{galleryId}/works/{workId}/signatures/{fileName}`

- **Read**: Authenticated users only.
- **Write**: Authenticated users only. File size limit: 5 MB. Allowed content types: `image/png`.

**Path**: `galleries/{galleryId}/works/{workId}/documents/{fileName}`

- **Read**: Authenticated users only.
- **Write**: Authenticated users only. File size limit: 10 MB. Allowed content types: `application/pdf`, `image/jpeg`, `image/png`.

**All other paths**: Denied.

## Implementation Notes

**15-minute grace period enforcement**: Firestore security rules can compare `request.time` against a stored timestamp. The client sets `editableUntil` to `createdAt + 15 minutes` at event creation. The rule for event updates checks `request.time <= resource.data.editableUntil`. Minor clock skew (seconds) between client and server is acceptable for this use case.

**Enum validation in rules**: Firestore rules support `in` operators for list membership checks. Define the allowed values directly in the rules -- do not reference external configurations.

**`ownerId` immutability**: The update rule for galleries must explicitly check that `request.resource.data.ownerId == resource.data.ownerId`. This prevents an authenticated user from reassigning gallery ownership.

**Write batches and transactions**: Security rules evaluate each document operation independently, even within a batch. No special rules needed for batched writes -- each document write must independently satisfy its rules.

## Gaps and Assumptions

| Item                         | Default                  | Notes                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage cross-gallery access | URL-token based security | Firebase Storage download URLs contain an access token. Without the URL, files are inaccessible. Firestore rules prevent reading another gallery's URLs. Acceptable for MVP but not bulletproof -- a leaked URL grants access.                                                                                 |
| Rate limiting                | Firebase defaults        | No custom rate limiting in security rules. Firebase has built-in abuse protection. Monitor if the app grows.                                                                                                                                                                                                   |
| Gallery deletion cascade     | Not implemented          | Galleries cannot be deleted. If added post-MVP, subcollection and Storage cleanup requires a Cloud Function.                                                                                                                                                                                                   |
| Orphaned Storage files       | Client-managed           | When a photo document is deleted from Firestore, the client should also delete the Storage file. No server-side cleanup exists. Orphaned files waste storage budget.                                                                                                                                           |
| `editableUntil` tampering    | Client sets the value    | A malicious client could set `editableUntil` far in the future. To fully prevent this, the create rule should validate that `editableUntil` is within a reasonable range of `request.time` (e.g., 14-16 minutes). Worth implementing but not critical for a single-user app where the "attacker" is the owner. |
| Document size limits         | Firestore default (1 MB) | No custom document size validation in rules. Firestore's 1 MB limit per document is sufficient.                                                                                                                                                                                                                |
| Consignor deletion orphans   | Accepted                 | Deleting a consignor does not update `consignorId` on linked works. Client should warn the user but no server enforcement.                                                                                                                                                                                     |
