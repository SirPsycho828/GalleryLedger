import { openDB, type IDBPDatabase } from 'idb'
import { uploadPhoto, createPhotoDoc, uploadSignature, uploadDocument } from '@/lib/services'
import { Timestamp } from 'firebase/firestore'

export type QueueEntryType = 'photo' | 'signature' | 'document'
export type QueueEntryStatus = 'pending' | 'uploading' | 'failed'

export interface QueueEntry {
  id?: number
  type: QueueEntryType
  galleryId: string
  workId: string
  eventId: string | null
  blob: Blob
  fileName: string
  sortOrder: number
  status: QueueEntryStatus
  retryCount: number
  createdAt: number
}

const DB_NAME = 'gallery-ledger-uploads'
const DB_VERSION = 1
const STORE_NAME = 'queue'
const MAX_RETRIES = 5

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
          store.createIndex('status', 'status')
          store.createIndex('workId', 'workId')
        }
      },
    })
  }
  return dbPromise
}

export async function addToQueue(entry: Omit<QueueEntry, 'id' | 'status' | 'retryCount' | 'createdAt'>): Promise<number> {
  const db = await getDb()
  const id = await db.add(STORE_NAME, {
    ...entry,
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
  })
  // Trigger processing
  processQueue()
  return id as number
}

export async function getQueueEntries(): Promise<QueueEntry[]> {
  const db = await getDb()
  return db.getAll(STORE_NAME)
}

export async function getQueueCountForWork(workId: string): Promise<number> {
  const db = await getDb()
  const all = await db.getAllFromIndex(STORE_NAME, 'workId', workId)
  return all.filter((e) => e.status === 'pending' || e.status === 'uploading').length
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb()
  const all = await db.getAll(STORE_NAME)
  return all.filter((e) => e.status === 'pending' || e.status === 'uploading' || e.status === 'failed').length
}

export async function retryFailed(): Promise<void> {
  const db = await getDb()
  const all = await db.getAll(STORE_NAME)
  for (const entry of all) {
    if (entry.status === 'failed' && entry.retryCount < MAX_RETRIES) {
      entry.status = 'pending'
      await db.put(STORE_NAME, entry)
    }
  }
  processQueue()
}

let processing = false

export async function processQueue(): Promise<void> {
  if (processing || !navigator.onLine) return
  processing = true

  try {
    const db = await getDb()
    const all = await db.getAll(STORE_NAME)
    const pending = all.filter((e) => e.status === 'pending').sort((a, b) => a.createdAt - b.createdAt)

    for (const entry of pending) {
      if (!navigator.onLine) break

      // Mark uploading
      entry.status = 'uploading'
      await db.put(STORE_NAME, entry)

      try {
        switch (entry.type) {
          case 'photo': {
            const { url, path } = await uploadPhoto(entry.galleryId, entry.workId, entry.blob, entry.fileName)
            await createPhotoDoc(entry.galleryId, entry.workId, {
              storageUrl: url,
              storagePath: path,
              fileName: entry.fileName,
              takenAt: Timestamp.fromMillis(entry.createdAt),
              eventId: entry.eventId,
              sortOrder: entry.sortOrder,
            })
            break
          }
          case 'signature': {
            await uploadSignature(entry.galleryId, entry.workId, entry.blob)
            break
          }
          case 'document': {
            await uploadDocument(entry.galleryId, entry.workId, entry.blob, entry.fileName)
            break
          }
        }

        // Success — remove from queue
        await db.delete(STORE_NAME, entry.id!)
        notifyListeners()
      } catch {
        // Failed — increment retry count
        entry.retryCount += 1
        entry.status = entry.retryCount >= MAX_RETRIES ? 'failed' : 'pending'
        await db.put(STORE_NAME, entry)
        notifyListeners()
      }
    }
  } finally {
    processing = false
  }
}

// Listen for connectivity changes to process queue
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => processQueue())
}

// Simple listener system for UI reactivity
type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeToQueueChanges(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notifyListeners() {
  for (const fn of listeners) fn()
}
