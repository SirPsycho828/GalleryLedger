import type { Timestamp } from 'firebase/firestore'

// Work status enum
export const WORK_STATUSES = ['intake', 'in_storage', 'on_display', 'on_loan', 'shipped', 'sold', 'returned'] as const
export type WorkStatus = typeof WORK_STATUSES[number]

// Event type enum
export const EVENT_TYPES = ['intake', 'condition_update', 'location_change', 'status_change', 'sale', 'payout', 'note', 'document_attach'] as const
export type EventType = typeof EVENT_TYPES[number]

// Condition summary enum
export const CONDITION_RATINGS = ['excellent', 'good', 'fair', 'poor'] as const
export type ConditionRating = typeof CONDITION_RATINGS[number]

// Status display labels
export const STATUS_LABELS: Record<WorkStatus, string> = {
  intake: 'Intake',
  in_storage: 'In Storage',
  on_display: 'On Display',
  on_loan: 'On Loan',
  shipped: 'Shipped',
  sold: 'Sold',
  returned: 'Returned',
}

// Event type display labels
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  intake: 'Intake',
  condition_update: 'Condition Update',
  location_change: 'Location Change',
  status_change: 'Status Change',
  sale: 'Sale',
  payout: 'Payout',
  note: 'Note',
  document_attach: 'Document',
}

// Condition checklist items
export const CONDITION_CHECKLIST_ITEMS = [
  'Scratches',
  'Dents',
  'Tears',
  'Staining',
  'Foxing',
  'Fading',
  'Frame damage',
  'Glass damage',
  'Loose hardware',
  'Surface dirt',
  'Previous repairs',
  'Missing parts',
] as const

// Zero-decimal currencies (stored as whole units, not cents)
export const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'VND'] as const

// Common currencies for the sale form dropdown
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'HKD'] as const

// Gallery document
export interface Gallery {
  id: string
  ownerId: string
  name: string
  createdAt: Timestamp
}

// Work document
export interface Work {
  id: string
  artist: string
  title: string
  medium: string
  dimensions: string
  year: string
  consignorId: string | null
  status: WorkStatus
  coverPhotoUrl: string | null
  intakeDate: Timestamp
  notes: string
  salePrice: number | null
  currency: string
  commissionRate: number | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Intake event details
export interface IntakeDetails {
  conditionSummary: ConditionRating
  conditionNotes: string
  checklist: Record<string, string>
  signatureUrl: string | null
}

// Condition update details
export interface ConditionUpdateDetails {
  conditionSummary: ConditionRating
  conditionNotes: string
}

// Location change details
export interface LocationChangeDetails {
  from: string
  to: string
}

// Status change details
export interface StatusChangeDetails {
  from: WorkStatus
  to: WorkStatus
}

// Sale details
export interface SaleDetails {
  salePrice: number
  currency: string
  buyerName: string
  commissionRate: number
}

// Payout details
export interface PayoutDetails {
  amount: number
  currency: string
  method: string
  reference: string
}

// Document attach details
export interface DocumentAttachDetails {
  fileName: string
  fileUrl: string
  fileType: string
}

// Union of all event details
export type EventDetails =
  | IntakeDetails
  | ConditionUpdateDetails
  | LocationChangeDetails
  | StatusChangeDetails
  | SaleDetails
  | PayoutDetails
  | DocumentAttachDetails
  | Record<string, never>

// Timeline event
export interface TimelineEvent {
  id: string
  type: EventType
  description: string
  details: EventDetails
  photoUrls: string[]
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  editableUntil: Timestamp
}

// Photo metadata
export interface Photo {
  id: string
  storageUrl: string
  storagePath: string
  fileName: string
  takenAt: Timestamp
  eventId: string | null
  sortOrder: number
  createdAt: Timestamp
}

// Consignor
export interface Consignor {
  id: string
  name: string
  email: string
  phone: string
  address: string
  notes: string
  workCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
