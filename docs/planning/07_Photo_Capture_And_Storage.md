## Overview

Photos are the evidentiary backbone of GalleryLedger. Every photo is stored at full resolution -- no lossy compression, no downscaling. The system must handle capture, upload, and display gracefully on spotty gallery/warehouse Wi-Fi and at art fairs with poor connectivity. Photos upload in the background immediately after capture, queuing locally when offline and syncing when connectivity returns.

## Dependencies

- `02_Database_Schema.md` -- `photos` subcollection fields, Storage path structure
- `03_Security_Rules.md` -- Storage rules, file size limits, allowed content types
- `04_UI_Design_System.md` -- Photo thumbnail styling, aspect ratios
- `06_Work_Intake.md` -- Photo capture during intake flow
- `16_Offline_Architecture.md` -- Offline queue strategy

## Capture Methods

Two entry points, both using the standard HTML file input with `accept="image/*"`:

1. **Camera capture**: `capture="environment"` attribute opens the device camera directly. This is the primary path during intake -- the operator is standing in front of the work.

2. **Photo picker**: Omit the `capture` attribute to open the device gallery/file picker. Used for importing existing photos from the camera roll (works already in the gallery before adopting GalleryLedger).

Both methods return File/Blob objects that enter the same upload pipeline.

### Camera Considerations

- Do not build a custom camera UI. The native device camera provides better quality, familiar controls, and handles permissions natively.
- Allow multiple selection when using the photo picker (`multiple` attribute).
- Camera capture returns one photo at a time. After each capture, return to the form so the user can review and capture another. Do not auto-open the camera again.

## Photo Processing Pipeline

```
Capture/Select
     │
     ▼
  Validate (type, size)
     │
     ▼
  Generate thumbnail (client-side)
     │
     ▼
  Display thumbnail immediately
     │
     ├── Online ──▶ Upload to Storage
     │                    │
     │                    ▼
     │              Get download URL
     │                    │
     │                    ▼
     │              Create/update Firestore photo doc
     │
     └── Offline ──▶ Queue in IndexedDB
                          │
                     (on reconnect)
                          │
                          ▼
                     Upload to Storage ──▶ Firestore photo doc
```

### Step 1: Validation

Before any processing:

| Check       | Limit                       | Action on Failure                                    |
| ----------- | --------------------------- | ---------------------------------------------------- |
| File type   | JPEG, PNG, HEIC, HEIF, WebP | Show toast: "Unsupported image format" and reject    |
| File size   | 25 MB max                   | Show toast: "Photo too large (25 MB max)" and reject |
| Photo count | 20 per work                 | Show toast: "Maximum 20 photos per work" and reject  |

### Step 2: Client-Side Thumbnail

Generate a thumbnail immediately for display in the form, before upload begins:

- Use Canvas API or OffscreenCanvas to resize
- Thumbnail dimensions: 400px on the longest side
- Format: JPEG at 80% quality
- Store the thumbnail as a blob URL for immediate display
- Thumbnails are transient (not uploaded to Storage). They exist only for instant UI feedback.

### Step 3: Upload to Firebase Storage

**Storage path**: `galleries/{galleryId}/works/{workId}/photos/{timestamp}_{randomId}.{ext}`

- `timestamp`: Unix milliseconds at capture time
- `randomId`: 8-character random alphanumeric string
- `ext`: Original file extension (jpg, png, heic)
- This naming scheme avoids collisions and provides natural chronological ordering in Storage

**Upload behavior**:

- Use Firebase Storage `uploadBytesResumable()` for resumable uploads
- Upload the original file at full resolution. No server-side or client-side compression of the original.
- Track upload progress per photo for UI display

**HEIC handling**: iOS devices capture in HEIC by default. Firebase Storage accepts HEIC files. Do not convert client-side -- store the original. Display relies on browser support (Safari supports HEIC natively; Chrome added support in 2023). If a browser cannot display HEIC, the thumbnail (generated as JPEG) serves as fallback.

### Step 4: Firestore Photo Document

After upload completes, create or update the photo document in `works/{workId}/photos`:

| Field         | Value                                                  |
| ------------- | ------------------------------------------------------ |
| `storageUrl`  | Download URL from `getDownloadURL()`                   |
| `storagePath` | Full Storage path (for deletion)                       |
| `fileName`    | Generated filename                                     |
| `takenAt`     | EXIF date if extractable, otherwise upload timestamp   |
| `eventId`     | Associated event ID, or null for standalone photos     |
| `sortOrder`   | Sequential integer (0, 1, 2...) based on capture order |
| `createdAt`   | Server timestamp                                       |

## Offline Upload Queue

When the device is offline, photos cannot upload to Firebase Storage. The queue ensures no photos are lost.

### Queue Storage

Use IndexedDB (not localStorage -- binary data can be large). Store:

| Field        | Purpose                           |
| ------------ | --------------------------------- |
| `id`         | Auto-increment key                |
| `galleryId`  | Target gallery                    |
| `workId`     | Target work                       |
| `eventId`    | Associated event, if any          |
| `blob`       | The original photo file as a Blob |
| `fileName`   | Generated filename                |
| `takenAt`    | Capture timestamp                 |
| `sortOrder`  | Display order                     |
| `status`     | `pending`, `uploading`, `failed`  |
| `retryCount` | Number of failed attempts         |
| `createdAt`  | Queue entry timestamp             |

### Queue Processing

- Monitor connectivity with `navigator.onLine` and the `online` event
- When online, process queue entries sequentially (not in parallel -- conserve bandwidth)
- On successful upload: create the Firestore photo document, remove the entry from IndexedDB
- On failure: increment `retryCount`, set status to `failed`, move to next entry
- Max retries: 5. After 5 failures, the entry stays in the queue but stops auto-retrying. Show a persistent indicator that some uploads failed.
- Process queue on app startup if entries exist

### Queue UI Indicators

- During intake/event forms: show upload progress per photo (progress bar under each thumbnail)
- Queued (offline) photos: show a small cloud-with-arrow icon on the thumbnail
- Failed uploads: show a red warning icon on the thumbnail with a "retry" tap action
- Global indicator: if any uploads are queued, show a subtle badge on the Works tab icon

## Photo Display

### Thumbnails in Lists

- Work list cards: single cover photo, square crop, `object-fit: cover`
- Intake form / event form: horizontal scroll row of 80x80px square thumbnails
- Work detail header: swipeable horizontal carousel of larger thumbnails (full width, 4:3 aspect ratio)

### Full-Size Viewer

Tapping any photo thumbnail opens a full-screen photo viewer:

- Dark background (black)
- Swipe left/right to navigate between photos of the same work
- Pinch-to-zoom for detail inspection (critical for condition assessment)
- Tap to toggle: show/hide a top bar with close button and photo metadata (date taken, filename)
- No bottom tabs, no FAB -- fully immersive

### Lazy Loading

- Work list: load only cover photo thumbnails. Use the `storageUrl` directly -- Firebase Storage serves responsive images if accessed via the CDN.
- Work detail: load visible carousel photos. Preload one photo ahead in each direction.
- Do not load all 20 photos at once on the detail screen.

## Photo Deletion

- User can delete a photo from a work's photo list
- Confirmation dialog: "Delete this photo? This cannot be undone."
- On confirm: delete the Firestore photo document, then delete the Storage file via `deleteObject()`
- If this was the cover photo: update the work's `coverPhotoUrl` to the next photo in sort order, or null if no photos remain
- If the photo is referenced in a timeline event's `photoUrls` array: the URL becomes a broken reference. Display a "Photo removed" placeholder in the timeline event. Do not prevent deletion.

## EXIF Data

Extract the `DateTimeOriginal` EXIF tag from JPEG files to populate `takenAt`. Use a lightweight EXIF library (e.g., `exif-js` or `piexifjs`).

- HEIC EXIF extraction is unreliable in browser. Fall back to upload timestamp.
- PNG files do not have EXIF. Fall back to upload timestamp.
- Do not strip EXIF from uploaded files. The original metadata has evidentiary value (GPS location, camera model, timestamp).

## Gaps and Assumptions

| Item                      | Default                   | Notes                                                                                                                         |
| ------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Photo editing/annotation  | Not in MVP                | No cropping, rotation, or markup tools. Users photograph carefully. See `17_Future_Features.md`.                              |
| Video capture             | Not supported             | Still photos only. Video adds significant storage cost and complexity.                                                        |
| Thumbnail CDN/resize      | Not implemented           | Serve original files. Firebase Storage CDN handles caching. Image resize via Cloud Functions or Firebase Extensions deferred. |
| Storage cost at scale     | ~$0.026/GB/month          | 100 works x 10 photos x 10 MB average = ~10 GB. Roughly $0.26/month. Well within budget.                                      |
| IndexedDB storage limits  | Browser-dependent         | Most browsers allow several hundred MB in IndexedDB. Sufficient for queuing 20-50 photos temporarily.                         |
| Duplicate photo detection | None                      | No check for identical photos uploaded twice. User manages manually.                                                          |
| Cover photo selection     | First photo auto-selected | No explicit "set as cover" action at MVP. User controls order via `sortOrder` which could be reorderable post-MVP.            |
