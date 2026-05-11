## Overview

Offline capability is essential, not optional. Gallery operators receive works in warehouses with poor signal, document condition at art fairs with overloaded Wi-Fi, and work in basement storage rooms with no connectivity. GalleryLedger must function fully offline for reads and writes, then sync transparently when connectivity returns. The architecture relies on Firestore's built-in offline persistence for data and a custom IndexedDB queue for photo/file uploads.

## Dependencies

- `02_Database_Schema.md` -- All Firestore collections affected by offline reads and writes
- `03_Security_Rules.md` -- Security rules evaluate server-side on sync, not at write time when offline
- `05_App_Shell_And_Navigation.md` -- PWA service worker configuration, offline indicator banner
- `07_Photo_Capture_And_Storage.md` -- Photo upload queue in IndexedDB

## Two-Layer Strategy

| Layer | Technology | Handles | Automatic |
|-------|-----------|---------|-----------|
| Data | Firestore offline persistence | All Firestore reads and writes | Yes |
| Files | Custom IndexedDB queue | Photo, signature, and document uploads to Firebase Storage | No (custom implementation) |

These two layers operate independently. Firestore handles its own sync. The file upload queue handles its own sync. They converge when a photo document in Firestore references a Storage URL -- the URL is populated after the file upload completes.

## Layer 1: Firestore Offline Persistence

### Setup

Enable offline persistence at Firestore initialization:

```
enableMultiTabIndexedDbPersistence (default in Firebase v9+ modular SDK)
```

This is a single configuration call. Once enabled, Firestore automatically:
- Caches all documents read from the server in IndexedDB
- Serves reads from cache when offline
- Queues all writes locally when offline
- Syncs queued writes when connectivity returns
- Fires real-time listeners with cached data (with `fromCache: true` metadata flag)

### Read Behavior When Offline

All Firestore queries and document reads work identically offline. The data comes from the local IndexedDB cache instead of the server. The app does not need to check connectivity before reading -- Firestore handles the routing transparently.

**Limitation**: the cache only contains documents the user has previously loaded. If the user has never viewed a particular work's detail screen, that work's events will not be in the cache. This is rarely a problem in practice -- the operator typically works with works they have recently viewed.

### Write Behavior When Offline

All Firestore writes (set, update, delete, batch) execute against the local cache immediately and queue for server sync. From the app's perspective, the write "succeeds" instantly. The `onSnapshot` listener fires with the locally written data.

**Server timestamp behavior**: `serverTimestamp()` resolves to `null` in the local cache until the write syncs to the server. After sync, the listener fires again with the resolved timestamp. Handle this in the UI by showing "Just now" or the local device time when `createdAt` is null, then updating when the real timestamp arrives.

**Write queue ordering**: Firestore syncs queued writes in the order they were made. This preserves timeline event ordering even when multiple events are created offline.

### Conflict Handling

Firestore uses a last-write-wins strategy. Since GalleryLedger is a single-user-per-gallery system, true conflicts (two users editing the same document) do not occur at MVP. The only conflict scenario is the same user on two devices editing the same document while both are offline. Last write to reach the server wins.

For append-only timeline events, there are no conflicts -- each event is a new document. Two events created on different devices will both sync successfully with their respective server timestamps.

## Layer 2: File Upload Queue

Firebase Storage does not have built-in offline support. Uploads to Storage fail immediately when offline. The app must queue files locally and upload them when connectivity returns.

### Queue Implementation

See `07_Photo_Capture_And_Storage.md` for the full IndexedDB queue schema. Summary:

- Files (photos, signatures, documents) are stored as Blobs in IndexedDB
- Each queue entry tracks: gallery ID, work ID, event ID, blob, filename, status, retry count
- Queue is processed sequentially when online
- Failed uploads retry up to 5 times with exponential backoff

### Sync Coordination

When a file upload completes, the corresponding Firestore document must be updated with the download URL:

1. **Photo**: update the `photos/{photoId}` document's `storageUrl` field. If the photo document was created with a placeholder URL while offline, update it now.
2. **Signature**: update the intake event's `details.signatureUrl` field. This requires updating the event document (only possible if still within the 15-minute grace period -- if not, the signature URL stays as a placeholder and the upload completes but the Firestore reference is stale).
3. **Document attachment**: update the event's `details.fileUrl` field. Same grace period consideration.

**Handling stale references**: if a file uploads after the event's grace period has expired, the Firestore document cannot be updated. The file exists in Storage but is not linked. Mitigation approaches:
- Set `editableUntil` generously for the `signatureUrl` and `fileUrl` fields specifically (not practical -- the grace period applies to the entire event)
- Accept that this edge case (file queued for more than 15 minutes while offline) results in an orphaned Storage file. The URL can be reconstructed from the known Storage path pattern.
- Recommended approach: write the photo/file document (in the `photos` subcollection) separately from the event. Photo documents are not subject to the event grace period. Events reference photos via `photoUrls` array, which is set at event creation with the expected download URL. If the URL is not yet valid (file still uploading), the timeline displays a placeholder. Once the upload completes and the Firestore photo document is updated, the URL resolves.

## Connectivity Detection

### Primary Signal

`navigator.onLine` property and the `online`/`offline` events. These detect network interface availability (Wi-Fi connected, cellular available) but not actual internet reachability.

### Secondary Signal

Firestore snapshot metadata includes `fromCache: boolean`. When snapshots consistently come from cache despite `navigator.onLine` being true, the app is likely on a network without internet access (captive portal, dead Wi-Fi).

### Offline Indicator Logic

Show the offline banner (see `05_App_Shell_And_Navigation.md`) when:
- `navigator.onLine` is `false`, OR
- Firestore snapshots have been `fromCache: true` for more than 10 seconds while `navigator.onLine` is `true`

Hide the banner when:
- A Firestore snapshot arrives with `fromCache: false`

No polling, no manual health checks. Let the existing signals drive the indicator.

## Service Worker and Asset Caching

Handled by `vite-plugin-pwa` with Workbox. See `05_App_Shell_And_Navigation.md` for PWA configuration.

### Cache Strategies by Asset Type

| Asset Type | Strategy | Notes |
|-----------|----------|-------|
| App shell (HTML, JS, CSS) | Precache | Updated on new deployment. Entire app works offline. |
| DM Sans font files | Precache | Bundled with the app build. |
| Firebase SDK | Precache | Bundled via npm, included in JS build. |
| Photos from Storage | Cache-first, network fallback | Photos are immutable once uploaded. Safe to cache aggressively. |
| Firestore data | Managed by Firestore SDK | Not handled by service worker. |

### Photo Caching

Firebase Storage download URLs contain an auth token and are served from a CDN. The service worker can cache these responses with a cache-first strategy:

- Runtime caching rule: match URLs from `firebasestorage.googleapis.com`
- Strategy: CacheFirst with a maximum cache size (200 entries) and max age (30 days)
- This means photos viewed once are available offline for subsequent views
- Cache eviction follows LRU when the 200-entry limit is reached

## Data Freshness

### Real-Time Listeners

All list screens (work list, consignor list) and the work detail screen use Firestore `onSnapshot` real-time listeners. When the app comes back online:

1. Firestore reconnects automatically
2. Queued writes sync to the server
3. Real-time listeners receive updated snapshots (server data merged with any remote changes)
4. The UI updates automatically via the snapshot callback

No manual refresh, no pull-to-refresh, no "sync" button needed.

### Stale Data Indicators

At MVP, do not show "last synced" timestamps or per-document staleness indicators. The offline banner is sufficient to communicate that data may not be current. When the banner disappears, data is fresh.

## Testing Offline Scenarios

Key scenarios to verify during development:

| Scenario | Expected Behavior |
|----------|-------------------|
| Create a work while offline | Work appears in list immediately. Syncs when online. |
| Add photos while offline | Thumbnails display from local blobs. Uploads queue. Sync when online. |
| Add timeline events while offline | Events appear in timeline immediately with "Just now" timestamp. Real timestamps after sync. |
| Navigate between screens offline | All previously viewed data loads from cache. |
| App killed while offline with queued writes | Firestore writes persist in IndexedDB, sync on next app open. Photo queue entries persist. |
| Generate PDF while offline | Works with cached data and cached photos. Uncached photos show placeholder. |
| Lose connectivity mid-upload | Resumable upload resumes on reconnect if the session is still valid. Otherwise, re-queues. |

## Gaps and Assumptions

| Item | Default | Notes |
|------|---------|-------|
| IndexedDB storage quota | Browser-managed | Most browsers grant PWAs at least 50 MB, often much more. 20 queued photos at 10 MB each = 200 MB, which may approach limits on some devices. Monitor queue size and warn if approaching 100 MB. |
| Multi-tab support | Firestore handles it | Firestore's multi-tab IndexedDB persistence allows the app to work in multiple tabs. Not a common use case but supported. |
| Background sync API | Not used | The Background Sync API could retry uploads when the browser regains connectivity, even if the app is closed. Browser support is inconsistent. Rely on in-app queue processing instead. |
| Offline duration | No limit | The app can function offline indefinitely. Firestore cache and IndexedDB queue persist across app restarts. Extended offline periods (days) are fine for data, but photo queue memory usage grows. |
| Forced online operations | None | No feature requires online connectivity to function. Even PDF generation works offline with cached data. |
| Cache invalidation | Handled by Firestore | Firestore's cache is invalidated by the SDK on reconnection. No manual cache busting needed. |  
