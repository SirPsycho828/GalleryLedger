## Overview

The timeline is the audit trail at the heart of GalleryLedger's value proposition. Every meaningful thing that happens to a work -- intake, movement, condition change, sale, payout -- is recorded as an immutable event. The timeline is append-only with a 15-minute edit grace period for correcting typos immediately after entry. After that window closes, events are permanent. This integrity model is what makes the record "dispute-proof."

## Dependencies

- `02_Database_Schema.md` -- `events` subcollection schema, type-specific `details` map
- `03_Security_Rules.md` -- Append-only enforcement, `editableUntil` grace period rules
- `10_Timeline_Events.md` -- Definitions for each event type
- `12_Work_Detail_View.md` -- Timeline display in the work detail screen

## Core Principles

### Append-Only

Events cannot be deleted. Ever. Not by the user, not by the app. Firestore security rules deny all delete operations on the `events` subcollection. This is the foundation of dispute-proof credibility -- if events could be deleted, the record has no integrity.

**Corrections are new events.** If an operator logs the wrong location, they add a new `location_change` event with the correct location. The incorrect event remains in the timeline with its original timestamp. This creates a transparent correction trail.

### 15-Minute Edit Grace Period

After creating an event, the operator has 15 minutes to edit its content. This handles the common case of typos, selecting the wrong condition rating, or forgetting to add a note.

**What can be edited during the grace period:**
- `description` field
- `details` map contents
- `photoUrls` array (add or remove photos)

**What can never be edited, even during the grace period:**
- `type` -- the event type is permanent
- `createdAt` -- the original timestamp is permanent
- `editableUntil` -- the grace period deadline is permanent

**After 15 minutes:** The event is fully locked. Security rules reject any update where `request.time > resource.data.editableUntil`. The client UI hides the edit button once the grace period expires.

### Server Timestamps

All event `createdAt` fields use Firestore server timestamps (`serverTimestamp()`), not client-generated dates. This prevents timestamp manipulation and ensures chronological accuracy even when the device clock is wrong.

The `editableUntil` field is set client-side to `createdAt + 15 minutes`. Security rules validate that this value is approximately 15 minutes after `request.time` at creation (see `03_Security_Rules.md`).

## Event Lifecycle

```
User triggers action (e.g., "Change location")
     │
     ▼
App builds event document
     │
     ▼
Firestore write (with server timestamp)
     │
     ▼
Event appears in timeline ◄── Grace period begins
     │
     ├── User edits within 15 min ──▶ Update allowed
     │
     └── 15 minutes elapse ──▶ Event locked permanently
```

## Event Structure

Every event follows the same base schema regardless of type. See `02_Database_Schema.md` for field-level detail.

| Field | Purpose |
|-------|---------|
| `type` | Categorizes the event. Determines which `details` fields are relevant. |
| `description` | Human-readable summary shown in the timeline. Auto-generated or user-entered. |
| `details` | Type-specific structured data (map). Schema varies by type. |
| `photoUrls` | Download URLs of photos attached to this specific event. |
| `createdAt` | Server timestamp. The canonical "when did this happen" field. |
| `updatedAt` | Set only if edited within grace period. Null otherwise. |
| `editableUntil` | `createdAt` + 15 minutes. After this, the document is immutable. |

## Auto-Generated Descriptions

When an event is created, the app generates a default `description` based on the event type and details. The user can override this during the grace period.

| Type | Auto-Description Pattern |
|------|--------------------------|
| `intake` | "Work received -- condition: {conditionSummary}" |
| `condition_update` | "Condition updated to {conditionSummary}" |
| `location_change` | "Moved from {from} to {to}" |
| `status_change` | "Status changed from {from} to {to}" |
| `sale` | "Sold for {formatted salePrice}" |
| `payout` | "Payout of {formatted amount} -- {method}" |
| `note` | (No auto-generation -- user writes the full note) |
| `document_attach` | "Document attached: {fileName}" |

Format currency values client-side using `Intl.NumberFormat` with the work's `currency` field.

## Timeline Ordering

Events display in **chronological order** (oldest first, newest at bottom). This matches a natural reading flow: the story of the work starts at intake and builds forward.

**Query**: `events` subcollection ordered by `createdAt` ascending.

**No pagination at MVP.** A typical work will have 5-30 events over its lifecycle. Load all events in a single query. If a work somehow accumulates hundreds of events, add cursor-based pagination post-MVP.

## Concurrent Events

Two events can share the same `createdAt` timestamp if created in rapid succession (e.g., a status change and a location change logged together). This is fine. Display order for same-timestamp events is non-deterministic but inconsequential -- both happened "at the same time" from the user's perspective.

## Relationship to Work Fields

Some events update fields on the parent work document in addition to creating the event record:

| Event Type | Work Field Updated |
|------------|-------------------|
| `status_change` | `work.status` set to `details.to` |
| `sale` | `work.salePrice`, `work.commissionRate`, `work.status` set to `sold` |
| `location_change` | None (location is tracked only in events, not as a work field) |
| `condition_update` | None (current condition is the latest condition event) |
| `payout` | None (payout status derived from event queries) |

These dual writes (event creation + work field update) should use a Firestore batched write for atomicity.

## Deriving Current State

The timeline is the source of truth. Some "current state" questions are answered by reading the latest event of a given type rather than a field on the work document:

| Question | How to Answer |
|----------|--------------|
| Current location | Latest `location_change` event's `details.to`, or "Not set" if no location events |
| Current condition | Latest `condition_update` event's `details.conditionSummary`, or intake event's condition |
| Total payouts | Sum `details.amount` across all `payout` events for the work |
| Outstanding balance | `work.salePrice * (1 - work.commissionRate)` minus total payouts |

The work detail view computes these derived values client-side from the loaded events. No denormalized fields for these at MVP.

## Timeline Integrity Considerations

### No Backdating

Events always use server timestamps. An operator cannot create an event with a past date. If they received a work yesterday but are logging it today, the event timestamp reflects today. The operator can note the actual date in the `description` or `details` fields.

Post-MVP consideration: add an optional "event date" field distinct from `createdAt` to allow recording the real-world date of an event that is logged after the fact. See `17_Future_Features.md`.

### No Reordering

Events cannot be reordered. Their position in the timeline is fixed by `createdAt`. This is a natural consequence of server timestamps and append-only design.

### Sold Works

A `sale` event does not lock the timeline. Events can continue to be added after a sale -- this supports post-sale condition documentation before handoff to the buyer. The timeline remains open indefinitely regardless of work status.

### Work Deletion

If a work is deleted (hard delete at MVP), all subcollection documents including events are orphaned in Firestore. Firestore does not cascade deletes on subcollections. The client must explicitly delete all events and photos before deleting the work document. This is the only scenario where event documents are removed, and it destroys the entire work record, not selective events.

## Gaps and Assumptions

| Item | Default | Notes |
|------|---------|-------|
| Event backdating | Not supported | All events stamped at creation time. Real-world date can go in description. Post-MVP enhancement to add optional `occurredAt` field. |
| Audit log of edits | Not tracked | Edits during the grace period overwrite the previous values silently. No edit history within an event. Acceptable for MVP since the window is only 15 minutes. |
| Event count per work | Unlimited | No cap. Typical lifecycle produces 5-30 events. No pagination needed at MVP scale. |
| Multi-device event conflict | Last write wins | If the same user creates events on two devices for the same work while offline, both events sync independently. No deduplication. Both appear in the timeline, which is acceptable -- append-only means no data loss. |
| Grace period UX | Countdown or "editable" badge | Show an "Edit" button on the event card that disappears after 15 minutes. No visible countdown timer -- just the presence or absence of the edit affordance. Client checks `editableUntil` against local time. |
| Bulk event creation | Not supported | No way to log multiple events at once (e.g., "moved and condition updated"). User creates them individually. They will have near-identical timestamps. |  
