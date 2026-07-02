## Overview

Defines the eight timeline event types, their input forms, business logic, and side effects. Each event type has a specific purpose in the work's lifecycle. The intake event is created automatically during work intake (see `06_Work_Intake.md`). All other events are created manually by the operator from the work detail view's FAB menu (see `12_Work_Detail_View.md`).

## Dependencies

- `02_Database_Schema.md` -- Event schema, type-specific `details` map structures
- `09_Timeline_Architecture.md` -- Append-only rules, grace period, auto-descriptions, event lifecycle
- `07_Photo_Capture_And_Storage.md` -- Photo attachment for condition updates
- `14_Sales_And_Payouts.md` -- Sale and payout business logic

## Event Type Summary

| Type               | Created By              | Photos   | Side Effects                                                   |
| ------------------ | ----------------------- | -------- | -------------------------------------------------------------- |
| `intake`           | Automatic (intake flow) | Yes      | Creates work record                                            |
| `condition_update` | Manual                  | Yes      | None                                                           |
| `location_change`  | Manual                  | No       | None                                                           |
| `status_change`    | Manual                  | No       | Updates `work.status`                                          |
| `sale`             | Manual                  | No       | Updates `work.salePrice`, `work.commissionRate`, `work.status` |
| `payout`           | Manual                  | No       | None                                                           |
| `note`             | Manual                  | Optional | None                                                           |
| `document_attach`  | Manual                  | No       | None (file attached)                                           |

## Event Type Details

### `intake`

**Purpose**: Records the moment a work enters the gallery's custody. First event in every work's timeline.

**Not user-created from the FAB.** This event is generated automatically when the intake form is saved. See `06_Work_Intake.md` for the full intake flow.

**Form fields**: None (handled by the intake form).

**Details map**: `conditionSummary`, `conditionNotes`, `checklist`, `signatureUrl`. See `02_Database_Schema.md`.

**Photos**: Intake photos are attached to this event via `photoUrls`.

---

### `condition_update`

**Purpose**: Records a change in the work's physical condition after intake. Critical for dispute resolution -- proves when damage occurred relative to other events.

**Form fields**:

| Field             | Type                 | Required | Notes                                                 |
| ----------------- | -------------------- | -------- | ----------------------------------------------------- |
| Overall condition | Chip select          | Yes      | `excellent`, `good`, `fair`, `poor` -- same as intake |
| Condition notes   | Multiline text       | Yes      | Describe what changed and why. Max 2000 chars.        |
| Photos            | Photo capture/picker | No       | Strongly encouraged. Same capture flow as intake.     |

**Details map**: `conditionSummary`, `conditionNotes`.

**Side effects**: None. Current condition is derived by reading the latest condition event (see `09_Timeline_Architecture.md`).

**When to use**: After discovering new damage, after conservation work, after return from loan, before shipping. The app does not prompt for condition updates -- the operator decides when one is warranted.

---

### `location_change`

**Purpose**: Tracks where the work physically is. Builds a movement history that proves chain of custody.

**Form fields**:

| Field | Type       | Required | Notes                                                                                                                |
| ----- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| From  | Text input | Yes      | Previous location. Pre-filled with the current location (from the latest `location_change` event, or empty if none). |
| To    | Text input | Yes      | New location. Free text.                                                                                             |

**Location values are free text**, not a predefined list. Galleries use their own naming conventions: "Main gallery," "Back storage room," "Smith residence (loan)," "Art Basel booth 412." Autocomplete from previous location values in this gallery's events is a helpful optimization.

**Location autocomplete**: Query all `location_change` events across works in this gallery, extract distinct `details.to` values. Cache client-side. This helps operators reuse consistent location names.

**Details map**: `from`, `to`.

**Side effects**: None. No `location` field on the work document.

---

### `status_change`

**Purpose**: Records a change in the work's administrative status.

**Form fields**:

| Field      | Type           | Required | Notes                                     |
| ---------- | -------------- | -------- | ----------------------------------------- |
| New status | Chip select    | Yes      | Shows all statuses except the current one |
| Note       | Multiline text | No       | Optional context. Max 500 chars.          |

**Available statuses**: `intake`, `in_storage`, `on_display`, `on_loan`, `shipped`, `sold`, `returned`.

**The "from" value is read automatically** from `work.status`. The user only selects the "to" value.

**Details map**: `from` (auto-filled), `to` (user-selected).

**Side effects**: Updates `work.status` to `details.to`. Batched write with the event creation.

**Special case -- `sold`**: Selecting "sold" as the new status shows a prompt suggesting the operator use the dedicated Sale event type instead, which captures price and commission. If they proceed with a plain status change to "sold," no financial data is recorded. This is allowed but discouraged.

---

### `sale`

**Purpose**: Records the sale of a work with financial details. The primary financial event.

**Form fields**:

| Field           | Type           | Required | Notes                                                                         |
| --------------- | -------------- | -------- | ----------------------------------------------------------------------------- |
| Sale price      | Number input   | Yes      | Displayed with currency symbol. Stored in cents.                              |
| Currency        | Select         | No       | Defaults to `USD`. Dropdown of common currencies.                             |
| Commission rate | Number input   | Yes      | Percentage (0-100). Displayed as "Gallery commission: X%". Stored as decimal. |
| Buyer name      | Text input     | No       | Optional. Free text.                                                          |
| Note            | Multiline text | No       | Optional context. Max 500 chars.                                              |

**Details map**: `salePrice`, `currency`, `buyerName`, `commissionRate`.

**Side effects** (batched write):

- `work.salePrice` set to the entered value (in cents)
- `work.currency` set to the entered currency
- `work.commissionRate` set to the entered decimal value
- `work.status` set to `sold`
- A `status_change` event is NOT auto-created. The `sale` event itself serves as the status change record.

**Validation**: Commission rate must be between 0 and 100 (inclusive). Sale price must be greater than 0.

**Multiple sales**: Not prevented. If a sale falls through, the operator can add a `status_change` event back to a non-sold status, then later record a new `sale` event. The timeline shows the full history.

See `14_Sales_And_Payouts.md` for financial reconciliation logic.

---

### `payout`

**Purpose**: Records a payment made to the consignor for their share of a sale.

**Form fields**:

| Field     | Type           | Required | Notes                                                   |
| --------- | -------------- | -------- | ------------------------------------------------------- |
| Amount    | Number input   | Yes      | In the work's currency. Stored in cents.                |
| Method    | Text input     | Yes      | Free text: "Check #1234", "Wire transfer", "Cash", etc. |
| Reference | Text input     | No       | Transaction ID, check number, or other identifier.      |
| Note      | Multiline text | No       | Optional. Max 500 chars.                                |

**Details map**: `amount`, `currency`, `method`, `reference`.

**Contextual info displayed on the form** (read-only, not editable):

- Sale price (from `work.salePrice`)
- Gallery commission (from `work.commissionRate`)
- Consignor share (calculated: `salePrice * (1 - commissionRate)`)
- Previously paid out (sum of all prior `payout` events)
- Remaining balance (consignor share minus previously paid)

**Validation**: Amount must be greater than 0. No validation that amount does not exceed remaining balance -- overpayments are the operator's responsibility. Show a warning if the entered amount exceeds the remaining balance but do not block submission.

**Side effects**: None on the work document. Payout totals are derived from events.

**Prerequisite**: A `sale` event should exist before recording payouts. If no sale exists, display a warning: "No sale has been recorded for this work." Allow the payout anyway -- some galleries may pay consignors before formally logging the sale.

---

### `note`

**Purpose**: A free-form note that does not fit other event types. Catch-all for observations, reminders, communications.

**Form fields**:

| Field  | Type                 | Required | Notes                       |
| ------ | -------------------- | -------- | --------------------------- |
| Note   | Multiline text       | Yes      | Max 2000 chars.             |
| Photos | Photo capture/picker | No       | Optional supporting images. |

**Details map**: None. The `description` field holds the note text.

**Side effects**: None.

---

### `document_attach`

**Purpose**: Attaches a file (PDF, image) to the work's timeline. Used for shipping receipts, loan agreements, insurance certificates, appraisals, or any external document.

**Form fields**:

| Field | Type           | Required | Notes                                 |
| ----- | -------------- | -------- | ------------------------------------- |
| File  | File picker    | Yes      | Accepts PDF, JPEG, PNG. Max 10 MB.    |
| Note  | Multiline text | No       | Describe the document. Max 500 chars. |

**Details map**: `fileName`, `fileUrl`, `fileType`.

**Upload path**: `galleries/{galleryId}/works/{workId}/documents/{timestamp}_{randomId}.{ext}`

**Upload behavior**: Same as photo uploads. If offline, queue in IndexedDB. See `07_Photo_Capture_And_Storage.md`.

**Display in timeline**: Show the filename as a tappable link. PDFs open in a new browser tab. Images open in the photo viewer.

**Side effects**: None.

## FAB Menu Order

The FAB on the work detail view (see `12_Work_Detail_View.md`) opens a menu listing event types in this order, optimized by frequency of use:

1. Condition Update
2. Location Change
3. Status Change
4. Note
5. Sale
6. Payout
7. Attach Document

`intake` is excluded -- it is never created manually.

## Gaps and Assumptions

| Item                | Default             | Notes                                                                                                                                                     |
| ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loan event type     | Not separate        | Loans are tracked as a `status_change` to `on_loan` plus a `location_change`. No dedicated loan event with borrower details. See `17_Future_Features.md`. |
| Return event type   | Not separate        | Returns are a `status_change` to `returned` plus optional `location_change` and `condition_update`.                                                       |
| Event templates     | Not supported       | No saved templates for frequently repeated events (e.g., "moved to storage"). Post-MVP.                                                                   |
| Bulk events         | Not supported       | Cannot apply the same event to multiple works at once (e.g., "moved all 10 works to fair booth"). Post-MVP.                                               |
| Currency on payouts | Inherited from work | Payout currency matches the work's sale currency. No cross-currency payouts at MVP.                                                                       |
| Document preview    | External only       | PDFs open in a browser tab. No in-app PDF viewer.                                                                                                         |
