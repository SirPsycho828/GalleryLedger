import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp,
  increment,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import type { Work, TimelineEvent, Photo, Consignor, WorkStatus, EventType, EventDetails } from '@/types'

// --- Collection references ---

function worksCol(galleryId: string) {
  return collection(db, 'galleries', galleryId, 'works')
}

function eventsCol(galleryId: string, workId: string) {
  return collection(db, 'galleries', galleryId, 'works', workId, 'events')
}

function photosCol(galleryId: string, workId: string) {
  return collection(db, 'galleries', galleryId, 'works', workId, 'photos')
}

function consignorsCol(galleryId: string) {
  return collection(db, 'galleries', galleryId, 'consignors')
}

// --- Works ---

export function subscribeToWorks(
  galleryId: string,
  callback: (works: Work[]) => void
): Unsubscribe {
  const q = query(worksCol(galleryId), orderBy('updatedAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const works = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Work))
    callback(works)
  })
}

export async function createWork(
  galleryId: string,
  data: {
    artist: string
    title: string
    medium: string
    dimensions: string
    year: string
    consignorId: string | null
    notes: string
    coverPhotoUrl: string | null
  }
): Promise<string> {
  const docRef = await addDoc(worksCol(galleryId), {
    ...data,
    status: 'intake' as WorkStatus,
    intakeDate: serverTimestamp(),
    salePrice: null,
    currency: 'USD',
    commissionRate: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWork(
  galleryId: string,
  workId: string,
  data: Partial<Omit<Work, 'id' | 'createdAt'>>
) {
  const workRef = doc(db, 'galleries', galleryId, 'works', workId)
  await updateDoc(workRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWork(galleryId: string, workId: string) {
  // Delete all events
  const eventsSnapshot = await getDocs(eventsCol(galleryId, workId))
  const batch = writeBatch(db)
  eventsSnapshot.docs.forEach((d) => batch.delete(d.ref))

  // Delete all photo docs
  const photosSnapshot = await getDocs(photosCol(galleryId, workId))
  photosSnapshot.docs.forEach((d) => batch.delete(d.ref))

  // Delete the work doc
  batch.delete(doc(db, 'galleries', galleryId, 'works', workId))
  await batch.commit()

  // Delete storage files (best effort, don't fail the operation)
  for (const photoDoc of photosSnapshot.docs) {
    const data = photoDoc.data()
    if (data.storagePath) {
      try {
        await deleteObject(ref(storage, data.storagePath))
      } catch {
        // Orphaned file, acceptable at MVP
      }
    }
  }
}

export function subscribeToWork(
  galleryId: string,
  workId: string,
  callback: (work: Work | null) => void
): Unsubscribe {
  const workRef = doc(db, 'galleries', galleryId, 'works', workId)
  return onSnapshot(workRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Work)
    } else {
      callback(null)
    }
  })
}

// --- Timeline Events ---

export function subscribeToEvents(
  galleryId: string,
  workId: string,
  callback: (events: TimelineEvent[]) => void
): Unsubscribe {
  const q = query(eventsCol(galleryId, workId), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TimelineEvent))
    callback(events)
  })
}

export async function createEvent(
  galleryId: string,
  workId: string,
  type: EventType,
  description: string,
  details: EventDetails,
  photoUrls: string[] = []
): Promise<string> {
  const now = Timestamp.now()
  const editableUntil = Timestamp.fromMillis(now.toMillis() + 15 * 60 * 1000)

  const docRef = await addDoc(eventsCol(galleryId, workId), {
    type,
    description,
    details,
    photoUrls,
    createdAt: serverTimestamp(),
    updatedAt: null,
    editableUntil,
  })

  // Update work's updatedAt
  await updateDoc(doc(db, 'galleries', galleryId, 'works', workId), {
    updatedAt: serverTimestamp(),
  })

  return docRef.id
}

export async function updateEvent(
  galleryId: string,
  workId: string,
  eventId: string,
  data: { description?: string; details?: EventDetails; photoUrls?: string[] }
) {
  const eventRef = doc(db, 'galleries', galleryId, 'works', workId, 'events', eventId)
  await updateDoc(eventRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// Create event with side effects (batched writes)
export async function createSaleEvent(
  galleryId: string,
  workId: string,
  details: { salePrice: number; currency: string; buyerName: string; commissionRate: number },
  description: string
) {
  const batch = writeBatch(db)
  const now = Timestamp.now()
  const editableUntil = Timestamp.fromMillis(now.toMillis() + 15 * 60 * 1000)

  // Create event
  const eventRef = doc(eventsCol(galleryId, workId))
  batch.set(eventRef, {
    type: 'sale',
    description,
    details,
    photoUrls: [],
    createdAt: serverTimestamp(),
    updatedAt: null,
    editableUntil,
  })

  // Update work
  const workRef = doc(db, 'galleries', galleryId, 'works', workId)
  batch.update(workRef, {
    salePrice: details.salePrice,
    currency: details.currency,
    commissionRate: details.commissionRate,
    status: 'sold',
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
  return eventRef.id
}

export async function createStatusChangeEvent(
  galleryId: string,
  workId: string,
  from: WorkStatus,
  to: WorkStatus,
  description: string
) {
  const batch = writeBatch(db)
  const now = Timestamp.now()
  const editableUntil = Timestamp.fromMillis(now.toMillis() + 15 * 60 * 1000)

  const eventRef = doc(eventsCol(galleryId, workId))
  batch.set(eventRef, {
    type: 'status_change',
    description,
    details: { from, to },
    photoUrls: [],
    createdAt: serverTimestamp(),
    updatedAt: null,
    editableUntil,
  })

  const workRef = doc(db, 'galleries', galleryId, 'works', workId)
  batch.update(workRef, {
    status: to,
    updatedAt: serverTimestamp(),
  })

  await batch.commit()
  return eventRef.id
}

// --- Photos ---

export function subscribeToPhotos(
  galleryId: string,
  workId: string,
  callback: (photos: Photo[]) => void
): Unsubscribe {
  const q = query(photosCol(galleryId, workId), orderBy('sortOrder', 'asc'))
  return onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Photo))
    callback(photos)
  })
}

export async function createPhotoDoc(
  galleryId: string,
  workId: string,
  data: {
    storageUrl: string
    storagePath: string
    fileName: string
    takenAt: Timestamp
    eventId: string | null
    sortOrder: number
  }
): Promise<string> {
  const docRef = await addDoc(photosCol(galleryId, workId), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function deletePhoto(galleryId: string, workId: string, photoId: string, storagePath: string) {
  await deleteDoc(doc(db, 'galleries', galleryId, 'works', workId, 'photos', photoId))
  try {
    await deleteObject(ref(storage, storagePath))
  } catch {
    // Orphaned file, acceptable
  }
}

// Upload photo to Firebase Storage
export function uploadPhoto(
  galleryId: string,
  workId: string,
  file: File | Blob,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; path: string }> {
  const storagePath = `galleries/${galleryId}/works/${workId}/photos/${fileName}`
  const storageRef = ref(storage, storagePath)
  const uploadTask = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.(progress)
      },
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref)
        resolve({ url, path: storagePath })
      }
    )
  })
}

// Upload signature
export function uploadSignature(
  galleryId: string,
  workId: string,
  blob: Blob,
  fileName: string
): Promise<{ url: string; path: string }> {
  const storagePath = `galleries/${galleryId}/works/${workId}/signatures/${fileName}`
  const storageRef = ref(storage, storagePath)
  const uploadTask = uploadBytesResumable(storageRef, blob)

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed', null, reject, async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref)
      resolve({ url, path: storagePath })
    })
  })
}

// Upload document attachment
export function uploadDocument(
  galleryId: string,
  workId: string,
  file: File,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; path: string }> {
  const storagePath = `galleries/${galleryId}/works/${workId}/documents/${fileName}`
  const storageRef = ref(storage, storagePath)
  const uploadTask = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.(progress)
      },
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref)
        resolve({ url, path: storagePath })
      }
    )
  })
}

// --- Consignors ---

export function subscribeToConsignors(
  galleryId: string,
  callback: (consignors: Consignor[]) => void
): Unsubscribe {
  const q = query(consignorsCol(galleryId), orderBy('name', 'asc'))
  return onSnapshot(q, (snapshot) => {
    const consignors = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Consignor))
    callback(consignors)
  })
}

export async function createConsignor(
  galleryId: string,
  data: { name: string; email: string; phone: string; address: string; notes: string }
): Promise<string> {
  const docRef = await addDoc(consignorsCol(galleryId), {
    ...data,
    workCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateConsignor(
  galleryId: string,
  consignorId: string,
  data: Partial<Omit<Consignor, 'id' | 'createdAt' | 'workCount'>>
) {
  const consignorRef = doc(db, 'galleries', galleryId, 'consignors', consignorId)
  await updateDoc(consignorRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteConsignor(galleryId: string, consignorId: string) {
  await deleteDoc(doc(db, 'galleries', galleryId, 'consignors', consignorId))
}

export async function getConsignor(galleryId: string, consignorId: string): Promise<Consignor | null> {
  const docSnap = await getDoc(doc(db, 'galleries', galleryId, 'consignors', consignorId))
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Consignor
}

export async function incrementConsignorWorkCount(galleryId: string, consignorId: string, delta: number) {
  const consignorRef = doc(db, 'galleries', galleryId, 'consignors', consignorId)
  await updateDoc(consignorRef, {
    workCount: increment(delta),
    updatedAt: serverTimestamp(),
  })
}

// --- Utility ---

export function generateFileName(ext: string): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 10)
  return `${timestamp}_${randomId}.${ext}`
}

export function formatCurrency(cents: number, currency: string): string {
  const ZERO_DECIMAL = ['JPY', 'KRW', 'VND']
  const value = ZERO_DECIMAL.includes(currency) ? cents : cents / 100
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
}

export function formatDate(timestamp: Timestamp | null): string {
  if (!timestamp) return 'Just now'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp.toDate())
}

export function isEventEditable(event: TimelineEvent): boolean {
  if (!event.editableUntil) return false
  return Date.now() < event.editableUntil.toMillis()
}
