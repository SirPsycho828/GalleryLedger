## Overview

Work intake is the core onboarding moment for every artwork entering the gallery. A single scrollable form captures photos, basic details, condition assessment, and an optional consignor signature. Target completion time: under 3 minutes on a phone while standing in front of the work. This is the flow that replaces "take photos on phone camera and email them to myself."

## Dependencies

- `02_Database_Schema.md` -- `works` collection fields, `events` collection (intake event), `photos` subcollection
- `04_UI_Design_System.md` -- Form inputs, buttons, card patterns, touch targets
- `07_Photo_Capture_And_Storage.md` -- Camera capture, upload queuing, thumbnail display
- `08_Signature_Capture.md` -- Consignor signature canvas
- `09_Timeline_Architecture.md` -- Intake event creation as the first timeline entry

## Entry Points

1. **"Add a work" button** on the work list dashboard (see `11_Work_List_Dashboard.md`)
2. **Onboarding Screen 2** "Add your first work" button (see `01_Auth_And_Onboarding.md`)

Both navigate to `/works/new`.

## Form Structure

Single scrollable page. No multi-step wizard, no tabs. Sections are visually separated by headings. All fields are visible at once so the operator can fill in whatever order makes sense in the moment.

### Section 1: Photos

Position: top of form, most prominent. This is the first and most critical action.

- Large tap target to open camera or photo picker
- Accepts: camera capture (preferred) or gallery selection
- Multiple photos in one session (up to 20 per work)
- Photos display as a horizontal scrollable row of square thumbnails (80x80px) as they are added
- First photo automatically becomes the cover photo
- Tap a thumbnail to view full-size or remove it
- Upload begins immediately in the background. See `07_Photo_Capture_And_Storage.md` for queuing behavior.

**Minimum photos**: 0 (not enforced, but the UI should encourage at least one). No hard validation because some workflows may start with details and add photos later.

### Section 2: Work Details

| Field | Input Type | Required | Notes |
|-------|-----------|----------|-------|
| Artist | Text input | Yes | Autocomplete from previous entries in this gallery. Query existing works' `artist` field. |
| Title | Text input | Yes | Free text |
| Medium | Text input | No | Autocomplete from previous entries. e.g., "Oil on canvas", "Bronze" |
| Dimensions | Text input | No | Free text. Placeholder: "24 x 36 in" |
| Year | Text input | No | Free text to allow "c. 1920", "undated", "2024" |
| Consignor | Select / create | No | Dropdown of existing consignors + "Add new consignor" option. See below. |
| Notes | Multiline text | No | General notes about the work. 4-line visible height. |

**Artist autocomplete**: Query distinct artist names from existing works in this gallery. Client-side filtering over the cached work list (20-100 works). No dedicated search index needed.

**Consignor selection**: A dropdown listing consignors by name (see `13_Consignor_Management.md`). Includes an "Add new" option that opens an inline form or bottom sheet to create a consignor without leaving the intake flow. After creation, the new consignor is auto-selected.

### Section 3: Condition Assessment

A quick structured assessment of the work's condition at the moment of intake. This creates the baseline that all future condition disputes reference.

**Overall condition**: Required. Single select from four options displayed as tappable chips (not a dropdown):

| Value | Label | When to Use |
|-------|-------|-------------|
| `excellent` | Excellent | No visible issues |
| `good` | Good | Minor wear consistent with age |
| `fair` | Fair | Noticeable issues present |
| `poor` | Poor | Significant damage or deterioration |

**Condition checklist**: A set of toggle items. Each is either checked (issue present) or unchecked (no issue). Only checked items are stored.

| Checklist Item | Applies To |
|---------------|-----------|
| Scratches | All media |
| Dents | Sculpture, frames |
| Tears | Canvas, works on paper |
| Staining | All media |
| Foxing | Works on paper |
| Fading | All media |
| Frame damage | Framed works |
| Glass damage | Framed works with glass |
| Loose hardware | Framed works, sculpture |
| Surface dirt | All media |
| Previous repairs | All media |
| Missing parts | Sculpture, mixed media |

Each checked item can have an optional free-text note (collapsed by default, expands on check). For example, checking "Scratches" reveals a text input for "Describe location and severity."

**Condition notes**: Multiline free text for anything not covered by the checklist. Optional.

### Section 4: Signature (Optional)

- "Capture consignor signature" button
- Opens the signature capture screen (see `08_Signature_Capture.md`)
- After capture, displays a thumbnail preview of the signature in the form
- Can be skipped entirely. Many intakes happen without the consignor present.
- Label below the button: "Optional -- confirms consignor acknowledgment of condition at intake"

### Form Actions

Fixed at the bottom of the screen (above bottom tabs):

- **"Save Work"** primary button, full width
- Disabled until both required fields (Artist, Title) have values
- On tap: saves all data and navigates to the new work's detail view

## Save Behavior

Saving the intake form performs multiple writes. These should execute as a Firestore batch write to ensure atomicity:

1. **Create the work document** in `galleries/{galleryId}/works` with all Section 2 fields, `status: "intake"`, `intakeDate: serverTimestamp()`, cover photo URL (if photos were added)

2. **Create photo documents** in `works/{workId}/photos` for each captured photo. Download URLs from the upload queue. If uploads are still in progress (offline or slow connection), create photo documents with placeholder URLs and update them when uploads complete.

3. **Create the intake event** in `works/{workId}/events` with:
   - `type: "intake"`
   - `description`: Auto-generated, e.g., "Work received -- condition: Good"
   - `details`: condition summary, condition notes, checklist results, signature URL
   - `photoUrls`: same photos attached to the work
   - `editableUntil`: createdAt + 15 minutes

4. **Update consignor `workCount`** if a consignor was selected (increment by 1)

## Draft / Interruption Handling

No explicit draft saving at MVP. If the user navigates away from the form (back button, tab switch, app background), unsaved data is lost.

Mitigation:
- Show a confirmation dialog ("Discard this work?") if the user taps back and any field has been modified
- The form is designed to be fast enough (under 3 minutes) that interruption is uncommon
- Photo uploads that have already started continue in the background regardless of form state, but the photo documents and work record are not created until "Save Work" is tapped

Post-MVP consideration: auto-save drafts to local storage. See `17_Future_Features.md`.

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Artist | Non-empty, max 200 chars | "Artist name is required" |
| Title | Non-empty, max 200 chars | "Title is required" |
| Medium | Max 200 chars | (no error -- just truncate) |
| Dimensions | Max 100 chars | (no error -- just truncate) |
| Year | Max 20 chars | (no error -- just truncate) |
| Notes | Max 2000 chars | Character count indicator |
| Condition | One of four values selected | "Select a condition rating" |
| Checklist notes | Max 500 chars per item | Character count indicator |
| Condition notes | Max 2000 chars | Character count indicator |

Validation runs on submit, not on blur. Inline errors appear below the relevant field. Scroll to the first error.

## After Save

- Navigate to the newly created work's detail view (see `12_Work_Detail_View.md`)
- Show a success toast: "Work added"
- The work's timeline shows the intake event as the first (and only) entry
- The work appears in the work list on the Works tab

## Gaps and Assumptions

| Item | Default | Notes |
|------|---------|-------|
| Condition checklist items | 12 items defined above | These are a reasonable starting set based on common art handling concerns. May need refinement with gallery user feedback. |
| Medium-specific checklist filtering | Not implemented | All 12 checklist items show regardless of medium. Filtering by artwork type (painting vs. sculpture) deferred. |
| Import from camera roll | Supported via photo picker | The camera button opens both camera and gallery picker (standard mobile behavior). No dedicated "import existing photos" flow. |
| Barcode / QR scanning | Not in MVP | Some galleries use inventory labels. Deferred to `17_Future_Features.md`. |
| Intake without photos | Allowed | No hard requirement for photos. The UI encourages it by placing the photo section first and making it prominent. |
| Consignor inline creation | Bottom sheet | Creating a new consignor from the intake form uses a bottom sheet with name (required) and optional contact fields. |
| Batch intake (multiple works) | Not supported | One work at a time. Batch intake for fair shipments deferred. |  
