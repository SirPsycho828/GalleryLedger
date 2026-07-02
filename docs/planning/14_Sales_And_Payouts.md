## Overview

Sales and payouts track the financial lifecycle of a consigned work: the gallery sells it, takes a commission, and pays the consignor their share. GalleryLedger is not an accounting system -- it records what happened and computes what's owed so the operator can see outstanding balances at a glance. All financial data lives in timeline events and denormalized work fields. There are no separate financial tables or ledger entries.

## Dependencies

- `02_Database_Schema.md` -- `works` fields (`salePrice`, `currency`, `commissionRate`), `events` schema for `sale` and `payout` types
- `09_Timeline_Architecture.md` -- Append-only events, grace period, batched writes
- `10_Timeline_Events.md` -- Sale and payout event form fields, validation, side effects
- `12_Work_Detail_View.md` -- Financial summary display on work detail
- `13_Consignor_Management.md` -- Consignor-level financial aggregation

## Financial Model

A work's financial state is derived from two sources:

1. **Work document fields** -- `salePrice`, `currency`, `commissionRate` (set when a `sale` event is created)
2. **Payout events** -- Each `payout` event records an amount paid to the consignor

There is no separate financial collection. The timeline IS the ledger.

### Core Calculations

All monetary values stored in cents (integers) to avoid floating-point precision issues.

| Calculation               | Formula                                                        |
| ------------------------- | -------------------------------------------------------------- |
| Gallery commission amount | `salePrice * commissionRate`                                   |
| Consignor share           | `salePrice * (1 - commissionRate)`                             |
| Total paid out            | Sum of `details.amount` from all `payout` events for this work |
| Outstanding balance       | Consignor share - total paid out                               |

**Rounding**: Apply `Math.round()` after multiplication. For a $10,000 sale at 50% commission, the consignor share is exactly $5,000 (500000 cents). For odd splits like 40% on $10,001, round to the nearest cent. Rounding happens at display time only -- stored values are the raw cents.

## Sale Flow

### Recording a Sale

The operator creates a `sale` event from the work detail FAB menu. See `10_Timeline_Events.md` for form fields.

**Batched write** (atomic):

1. Create the `sale` event in `works/{workId}/events`
2. Update the work document: set `salePrice`, `currency`, `commissionRate`, `status` to `sold`
3. Update `work.updatedAt`

### Pre-Sale Validation (Client-Side)

Before showing the sale form, check if the work already has a `sale` event:

- **No prior sale**: show the form normally
- **Prior sale exists**: show a warning at the top of the form: "This work already has a sale recorded on {date}. Recording a new sale will update the work's financial details." Allow the user to proceed. The new sale event overwrites the work's `salePrice`, `currency`, and `commissionRate` fields. Both sale events remain in the timeline for audit purposes.

### Commission Presets

The commission rate input defaults to empty (no gallery-wide default at MVP). The operator enters the rate for each sale.

Post-MVP enhancement: store a default commission rate on the gallery document and pre-fill it. See `17_Future_Features.md`.

## Payout Flow

### Recording a Payout

The operator creates a `payout` event from the work detail FAB menu. See `10_Timeline_Events.md` for form fields.

**Contextual financial info displayed on the form** (read-only):

```
Sale price:           $12,000.00
Gallery commission (50%): -$6,000.00
Consignor share:       $6,000.00
Previously paid:      -$2,000.00
─────────────────────────────────
Remaining balance:     $4,000.00
```

This block appears at the top of the payout form, above the amount input, providing context for how much to pay.

### Payout Validation

- Amount must be greater than 0
- **No upper limit enforcement**: the operator can record a payout exceeding the remaining balance. This handles legitimate scenarios (corrections, advances, rounding adjustments).
- **Overpayment warning**: if the entered amount would make total payouts exceed the consignor share, show a non-blocking warning: "This payout exceeds the remaining balance."
- **No sale warning**: if `work.salePrice` is null, show: "No sale has been recorded for this work." Allow the payout regardless.

### Payout Without a Sale

Allowed. Some galleries may pay consignors before formally logging the sale, or may return a work with an associated payment. The payout event records the amount and method regardless of sale state. The financial summary shows payouts even without a sale price to compute against (the "outstanding balance" line is hidden if no sale exists).

### Multiple Payouts

A work can have unlimited payout events. Common pattern: a gallery sells a work and pays the consignor in two installments. Each installment is a separate payout event.

## Financial Display

### Work Detail View

The financial summary card on the work detail screen (see `12_Work_Detail_View.md`) shows:

| Line               | Value                                  | Visibility                |
| ------------------ | -------------------------------------- | ------------------------- |
| Sale price         | Formatted `work.salePrice`             | Only if sale exists       |
| Gallery commission | Rate as percentage, amount in currency | Only if sale exists       |
| Consignor share    | Calculated amount                      | Only if sale exists       |
| Paid out           | Sum of payout amounts                  | Only if any payouts exist |
| Remaining          | Consignor share minus paid out         | Only if sale exists       |

**Remaining balance styling**:

- Positive (money owed): `text-primary`, normal weight
- Zero (fully paid): `success` color, with a Lucide `check-circle` icon
- Negative (overpaid): `destructive` color, with the amount shown as negative

### Consignor Detail View

Aggregated financial summary across all works linked to the consignor. See `13_Consignor_Management.md` for display details.

### Work List Dashboard

No financial info shown on the work list cards. Financial details are only visible on the work detail and consignor detail screens.

## Payout Status Derivation

There is no `payoutStatus` field stored on the work document. Status is derived client-side:

| Condition                              | Derived Status    | Display                                   |
| -------------------------------------- | ----------------- | ----------------------------------------- |
| No sale event                          | No financial data | Financial section hidden                  |
| Sale exists, no payouts                | Unpaid            | "No payouts recorded" in `text-secondary` |
| Sale exists, payouts < consignor share | Partially paid    | Remaining balance shown                   |
| Sale exists, payouts = consignor share | Fully paid        | "Fully paid" badge in `success` color     |
| Sale exists, payouts > consignor share | Overpaid          | Negative remaining in `destructive` color |

## Currency Handling

### MVP Scope

- Single currency per work, stored in `work.currency` (ISO 4217 code)
- Default: `USD`
- Currency selector on the sale form: dropdown with common codes (USD, EUR, GBP, CHF, JPY, CAD, AUD, HKD)
- All payouts for a work use the same currency as the sale
- No exchange rate conversion

### Display Formatting

Use `Intl.NumberFormat` with the work's currency code:

```
Intl.NumberFormat('en-US', { style: 'currency', currency: work.currency })
```

This handles symbol placement, decimal separators, and grouping for each currency automatically. The locale is always `en-US` at MVP (no locale switching).

**Cents to display**: divide stored cents by 100 before formatting. For zero-decimal currencies (JPY), store the whole unit value and skip division. Detect zero-decimal currencies from a hardcoded list: `JPY`, `KRW`, `VND`.

## Edge Cases

### Sale Reversal

If a sale falls through, the operator:

1. Creates a `status_change` event moving the work back to a non-sold status (e.g., `on_display`)
2. The `salePrice` and `commissionRate` fields on the work document remain set (historical data)
3. The financial summary still displays because `salePrice` is non-null
4. If payouts were already recorded, they remain in the timeline

There is no "void sale" event type. The timeline tells the full story: sold, then status changed back. The operator can add a `note` event explaining the reversal.

### Work With No Consignor

A work can be sold without a linked consignor (gallery-owned inventory). The financial summary still shows sale price and commission, but "Consignor share" and payout tracking are less meaningful. Display them regardless -- the operator may use payouts to track payments to other parties (artists, estates).

### Editing Sale Details During Grace Period

If the operator edits a `sale` event during the 15-minute grace period (see `09_Timeline_Architecture.md`), the work document fields (`salePrice`, `commissionRate`) must also be updated to match. This is a batched write: update the event and update the work.

## Gaps and Assumptions

| Item                             | Default           | Notes                                                                                                                         |
| -------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Tax handling                     | Not included      | No sales tax, VAT, or tax reporting. Galleries handle tax outside the app.                                                    |
| Invoice generation               | Not included      | No invoice or receipt PDFs for sales. The PDF provenance pack covers documentation, not billing. See `17_Future_Features.md`. |
| Commission rate per gallery      | Not stored        | No default commission rate. Entered per sale. Post-MVP: store default on gallery document.                                    |
| Payment method tracking          | Free text only    | No integration with payment processors. The `method` field on payouts is descriptive text.                                    |
| Multi-currency consignor summary | Not handled       | If a consignor has works in different currencies, the consignor financial summary sums them incorrectly. Acceptable at MVP.   |
| Partial sale (edition prints)    | Not supported     | No concept of selling one print from an edition. One work, one sale.                                                          |
| Refunds                          | Not modeled       | No refund event type. Use a `note` event and a negative payout if needed.                                                     |
| Financial reports/export         | Not in MVP        | No CSV export of sales or payout data. See `17_Future_Features.md`.                                                           |
| Audit trail for financial edits  | Grace period only | Edits to sale events during the 15-minute window are silent. No edit history beyond the timeline itself.                      |
