import { useEffect, useState, useMemo, useRef, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  ArrowLeft, Share, MoreVertical, Plus, ImagePlus, PenTool,
  CheckCircle, MapPin, RefreshCw, FileText, DollarSign, CreditCard, Paperclip, MessageSquare, Camera
} from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToWork, subscribeToEvents, subscribeToPhotos,
  updateWork, deleteWork, createEvent, createSaleEvent, createStatusChangeEvent,
  formatCurrency, formatDate, isEventEditable, getConsignor,
  uploadPhoto, generateFileName, createPhotoDoc, uploadDocument,
  incrementConsignorWorkCount, subscribeToConsignors,
} from '@/lib/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/pages/WorkList'
import type { Work, TimelineEvent, Photo, Consignor, EventType, WorkStatus, ConditionRating } from '@/types'
import { WORK_STATUSES, STATUS_LABELS, CONDITION_RATINGS, EVENT_TYPE_LABELS, CURRENCIES } from '@/types'

// Event type icons
const EVENT_ICONS: Record<EventType, typeof Plus> = {
  intake: ImagePlus,
  condition_update: RefreshCw,
  location_change: MapPin,
  status_change: RefreshCw,
  sale: DollarSign,
  payout: CreditCard,
  note: MessageSquare,
  document_attach: Paperclip,
}

// FAB menu items (intake excluded - never created manually)
const FAB_MENU: { type: EventType; label: string; icon: typeof Plus }[] = [
  { type: 'condition_update', label: 'Condition Update', icon: RefreshCw },
  { type: 'location_change', label: 'Location Change', icon: MapPin },
  { type: 'status_change', label: 'Status Change', icon: RefreshCw },
  { type: 'note', label: 'Note', icon: MessageSquare },
  { type: 'sale', label: 'Sale', icon: DollarSign },
  { type: 'payout', label: 'Payout', icon: CreditCard },
  { type: 'document_attach', label: 'Attach Document', icon: Paperclip },
]

const CONDITION_LABELS: Record<ConditionRating, string> = {
  excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor',
}

export default function WorkDetail() {
  const { workId } = useParams<{ workId: string }>()
  const { gallery } = useAuth()
  const navigate = useNavigate()

  const [work, setWork] = useState<Work | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [consignorName, setConsignorName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // UI state
  const [fabOpen, setFabOpen] = useState(false)
  const [eventFormType, setEventFormType] = useState<EventType | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Export state
  const [exportOpen, setExportOpen] = useState(false)
  const [exportMode, setExportMode] = useState<'full' | 'selective' | null>(null)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [exportProgress, setExportProgress] = useState<string | null>(null)

  // Subscribe to work, events, photos
  useEffect(() => {
    if (!gallery || !workId) return
    const unsub1 = subscribeToWork(gallery.id, workId, (w) => { setWork(w); setLoading(false) })
    const unsub2 = subscribeToEvents(gallery.id, workId, setEvents)
    const unsub3 = subscribeToPhotos(gallery.id, workId, setPhotos)
    return () => { unsub1(); unsub2(); unsub3() }
  }, [gallery, workId])

  // Load consignor name
  useEffect(() => {
    if (!gallery || !work?.consignorId) { setConsignorName(null); return }
    getConsignor(gallery.id, work.consignorId).then((c) => setConsignorName(c?.name ?? 'Unknown'))
  }, [gallery, work?.consignorId])

  // Derived state from events
  const currentLocation = useMemo(() => {
    const locationEvents = events.filter((e) => e.type === 'location_change')
    if (locationEvents.length === 0) return null
    return (locationEvents[locationEvents.length - 1].details as any)?.to ?? null
  }, [events])

  const currentCondition = useMemo(() => {
    const conditionEvents = events.filter((e) => e.type === 'condition_update' || e.type === 'intake')
    if (conditionEvents.length === 0) return null
    const latest = conditionEvents[conditionEvents.length - 1]
    return (latest.details as any)?.conditionSummary ?? null
  }, [events])

  // Financial derived state
  const totalPayouts = useMemo(() => {
    return events
      .filter((e) => e.type === 'payout')
      .reduce((sum, e) => sum + ((e.details as any)?.amount ?? 0), 0)
  }, [events])

  const consignorShare = work?.salePrice != null && work?.commissionRate != null
    ? Math.round(work.salePrice * (1 - work.commissionRate))
    : 0
  const remainingBalance = consignorShare - totalPayouts

  // Handle carousel scroll
  function handleCarouselScroll() {
    if (!carouselRef.current) return
    const el = carouselRef.current
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setCarouselIndex(index)
  }

  // Delete work
  async function handleDelete() {
    if (!gallery || !workId || !work) return
    try {
      if (work.consignorId) {
        await incrementConsignorWorkCount(gallery.id, work.consignorId, -1)
      }
      await deleteWork(gallery.id, workId)
      toast.success('Work deleted')
      navigate('/', { replace: true })
    } catch {
      toast.error('Failed to delete work')
    }
  }

  async function handleExport(mode: 'full' | 'selective') {
    if (!gallery || !work) return
    setExportProgress('Preparing document...')
    try {
      const { generateProvenancePdf, downloadBlob, sharePdf } = await import('@/lib/pdf')
      const consignorData = work.consignorId
        ? await getConsignor(gallery.id, work.consignorId)
        : null
      const eventIds = mode === 'selective' ? [...selectedEventIds] : null
      const blob = await generateProvenancePdf(
        { work, events, photos, consignor: consignorData, galleryName: gallery.name },
        eventIds,
        setExportProgress,
      )
      const filename = `${work.artist}_${work.title}_provenance.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_')

      // Try native share first (mobile), fallback to download
      const shared = await sharePdf(blob, filename)
      if (!shared) downloadBlob(blob, filename)

      setExportOpen(false)
      setExportMode(null)
      toast.success('PDF exported')
    } catch (err) {
      console.error('PDF generation failed:', err)
      toast.error('PDF generation failed. Please try again.')
    } finally {
      setExportProgress(null)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background px-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="mx-auto max-w-[640px] px-4 pt-4 space-y-4">
          <Skeleton className="w-full aspect-[4/3] rounded-lg" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!work) {
    return (
      <div>
        <div className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background px-4">
          <button onClick={() => navigate(-1)} className="mr-2 flex h-11 w-11 items-center justify-center">
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <span className="text-xl font-bold">Not Found</span>
        </div>
        <div className="mx-auto max-w-[640px] px-4 pt-8 text-center">
          <p className="text-muted-foreground">This work doesn't exist or was deleted.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background px-4">
        <button onClick={() => navigate(-1)} className="mr-2 flex h-11 w-11 items-center justify-center">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <h1 className="flex-1 truncate text-xl font-bold">{work.title}</h1>
        <button onClick={() => setExportOpen(true)} className="flex h-11 w-11 items-center justify-center">
          <Share className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-11 w-11 items-center justify-center">
              <MoreVertical className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit work details</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>Delete work</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-auto max-w-[640px] pb-24">
        {/* Photo carousel */}
        <div className="relative">
          {photos.length > 0 ? (
            <>
              <div
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
              >
                {photos.map((photo) => (
                  <div key={photo.id} className="w-full flex-shrink-0 snap-center">
                    <div className="aspect-[4/3]">
                      <img
                        src={photo.storageUrl}
                        alt=""
                        className="h-full w-full object-contain bg-muted"
                        onClick={() => window.open(photo.storageUrl, '_blank')}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {photos.length > 1 && (
                <div className="flex justify-center gap-1.5 py-2">
                  {photos.map((_, i) => (
                    <div key={i} className={cn('h-1.5 w-1.5 rounded-full', i === carouselIndex ? 'bg-primary' : 'bg-border')} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center bg-muted">
              <ImagePlus className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Work details */}
        <div className="px-4 pt-4 space-y-1">
          <h2 className="text-xl font-bold">{work.artist}</h2>
          <p className="italic">{work.title}</p>
          {(work.medium || work.dimensions || work.year) && (
            <p className="text-sm text-muted-foreground">
              {[work.medium, work.dimensions, work.year].filter(Boolean).join(' \u2014 ')}
            </p>
          )}
          {consignorName && (
            <button
              onClick={() => navigate(`/consignors/${work.consignorId}`)}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Consignor: {consignorName}
            </button>
          )}
          <div className="pt-1">
            <StatusBadge status={work.status} />
          </div>
        </div>

        {/* Derived state */}
        <div className="px-4 pt-4">
          <Separator className="mb-3" />
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground">Location:</span>
              <span>{currentLocation || 'Not recorded'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">Condition:</span>
              <span>{currentCondition ? CONDITION_LABELS[currentCondition as ConditionRating] || currentCondition : 'Not recorded'}</span>
            </div>
          </div>
          {work.notes && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{work.notes}</p>
          )}
        </div>

        {/* Financial summary */}
        {work.salePrice != null && (
          <div className="mx-4 mt-4 rounded-lg border border-border bg-muted/50 p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sale</span>
              <span>{formatCurrency(work.salePrice, work.currency)}</span>
            </div>
            {work.commissionRate != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gallery commission ({Math.round(work.commissionRate * 100)}%)</span>
                <span>{formatCurrency(Math.round(work.salePrice * work.commissionRate), work.currency)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Consignor share</span>
              <span>{formatCurrency(consignorShare, work.currency)}</span>
            </div>
            {totalPayouts > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid out</span>
                <span>{formatCurrency(totalPayouts, work.currency)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Remaining</span>
              <span className={cn(
                remainingBalance < 0 && 'text-destructive',
                remainingBalance === 0 && 'text-emerald-600'
              )}>
                {remainingBalance === 0 ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Fully paid
                  </span>
                ) : formatCurrency(Math.round(remainingBalance), work.currency)}
              </span>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="px-4 pt-6">
          <h3 className="text-base font-semibold mb-4">Timeline ({events.length} event{events.length !== 1 ? 's' : ''})</h3>

          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet</p>
          ) : (
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-border" />

              <div className="space-y-4">
                {events.map((event, idx) => {
                  const Icon = EVENT_ICONS[event.type] || MessageSquare
                  const isLast = idx === events.length - 1
                  const editable = isEventEditable(event)
                  const details = event.details as any

                  return (
                    <div key={event.id} className="relative pl-6">
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute left-0 top-1 h-3 w-3 rounded-full border-2',
                        isLast ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                      )} />

                      {/* Event content */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(event.createdAt)} <span className="text-primary">{EVENT_TYPE_LABELS[event.type]}</span>
                          </span>
                          {editable && (
                            <button
                              onClick={() => toast.info('Event editing coming soon')}
                              className="text-xs text-primary hover:underline"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        <p className="text-sm">{event.description}</p>

                        {/* Type-specific details */}
                        {event.type === 'condition_update' && details?.conditionNotes && (
                          <p className="text-xs text-muted-foreground">{details.conditionNotes}</p>
                        )}
                        {event.type === 'intake' && details?.conditionNotes && (
                          <p className="text-xs text-muted-foreground">{details.conditionNotes}</p>
                        )}
                        {event.type === 'sale' && details?.salePrice && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(details.salePrice, details.currency || 'USD')}
                            {details.commissionRate != null && ` (${Math.round(details.commissionRate * 100)}% commission)`}
                            {details.buyerName && ` \u2014 Buyer: ${details.buyerName}`}
                          </p>
                        )}
                        {event.type === 'payout' && details?.amount && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(details.amount, details.currency || 'USD')} via {details.method}
                            {details.reference && ` (${details.reference})`}
                          </p>
                        )}
                        {event.type === 'document_attach' && details?.fileName && (
                          <a href={details.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                            {details.fileName}
                          </a>
                        )}

                        {/* Event photos */}
                        {event.photoUrls.length > 0 && (
                          <div className="flex gap-1.5 pt-1 overflow-x-auto">
                            {event.photoUrls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt=""
                                className="h-14 w-14 flex-shrink-0 rounded object-cover cursor-pointer"
                                onClick={() => window.open(url, '_blank')}
                              />
                            ))}
                          </div>
                        )}

                        {/* Signature indicator */}
                        {event.type === 'intake' && details?.signatureUrl && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                            <PenTool className="h-3 w-3" />
                            <span>Consignor signature captured</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setFabOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* FAB menu bottom sheet */}
      <Sheet open={fabOpen} onOpenChange={setFabOpen}>
        <SheetContent side="bottom" className="max-h-[85vh]">
          <SheetHeader><SheetTitle>Add Event</SheetTitle></SheetHeader>
          <div className="space-y-1 pt-2">
            {FAB_MENU.map((item) => (
              <button
                key={item.type}
                onClick={() => { setFabOpen(false); setEventFormType(item.type) }}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted transition-colors"
              >
                <item.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Event creation form sheet */}
      <EventFormSheet
        type={eventFormType}
        work={work}
        events={events}
        galleryId={gallery!.id}
        onClose={() => setEventFormType(null)}
      />

      {/* Edit work sheet */}
      <EditWorkSheet
        work={work}
        galleryId={gallery!.id}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this work?</DialogTitle>
            <DialogDescription>
              This will permanently remove the work and its entire timeline. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export sheet */}
      <Sheet open={exportOpen} onOpenChange={(o) => { if (!o) { setExportOpen(false); setExportMode(null) } }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Export Provenance Pack</SheetTitle></SheetHeader>
          {!exportMode ? (
            <div className="space-y-2 pt-4">
              <button
                onClick={() => handleExport('full')}
                className="flex w-full flex-col rounded-lg border border-border p-4 text-left hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">Full Timeline Export</span>
                <span className="text-xs text-muted-foreground mt-1">All events, photos, condition history, and financials</span>
              </button>
              <button
                onClick={() => {
                  setExportMode('selective')
                  setSelectedEventIds(new Set(events.map((e) => e.id)))
                }}
                className="flex w-full flex-col rounded-lg border border-border p-4 text-left hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">Selective Export</span>
                <span className="text-xs text-muted-foreground mt-1">Choose which events to include</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    if (selectedEventIds.size === events.length) {
                      setSelectedEventIds(new Set())
                    } else {
                      setSelectedEventIds(new Set(events.map((e) => e.id)))
                    }
                  }}
                  className="text-xs font-medium text-primary"
                >
                  {selectedEventIds.size === events.length ? 'Deselect all' : 'Select all'}
                </button>
                <span className="text-xs text-muted-foreground">{selectedEventIds.size} of {events.length} selected</span>
              </div>
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {events.map((ev) => (
                  <label key={ev.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEventIds.has(ev.id)}
                      onChange={(e) => {
                        const next = new Set(selectedEventIds)
                        if (e.target.checked) next.add(ev.id)
                        else next.delete(ev.id)
                        setSelectedEventIds(next)
                      }}
                      className="h-4 w-4 rounded border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">{formatDate(ev.createdAt)}</span>
                      <span className="mx-1 text-xs text-muted-foreground">&middot;</span>
                      <span className="text-xs font-medium">{EVENT_TYPE_LABELS[ev.type]}</span>
                      <p className="text-xs text-muted-foreground truncate">{ev.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              <Button
                onClick={() => handleExport('selective')}
                className="w-full h-11"
                disabled={selectedEventIds.size === 0}
              >
                Generate PDF
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Export progress overlay */}
      {exportProgress && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">{exportProgress}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Event Form Sheet ---

function EventFormSheet({ type, work, events, galleryId, onClose }: {
  type: EventType | null
  work: Work
  events: TimelineEvent[]
  galleryId: string
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)

  // Condition update state
  const [condRating, setCondRating] = useState<ConditionRating | null>(null)
  const [condNotes, setCondNotes] = useState('')

  // Location change state
  const currentLoc = useMemo(() => {
    const locs = events.filter((e) => e.type === 'location_change')
    return locs.length > 0 ? (locs[locs.length - 1].details as any)?.to ?? '' : ''
  }, [events])
  const [locFrom, setLocFrom] = useState(currentLoc)
  const [locTo, setLocTo] = useState('')

  // Status change state
  const [newStatus, setNewStatus] = useState<WorkStatus | ''>('')
  const [statusNote, setStatusNote] = useState('')

  // Note state
  const [noteText, setNoteText] = useState('')

  // Sale state
  const [salePriceStr, setSalePriceStr] = useState('')
  const [saleCurrency, setSaleCurrency] = useState('USD')
  const [commissionStr, setCommissionStr] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [saleNote, setSaleNote] = useState('')

  // Payout state
  const [payoutAmtStr, setPayoutAmtStr] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('')
  const [payoutRef, setPayoutRef] = useState('')
  const [payoutNote, setPayoutNote] = useState('')

  // Document state
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docNote, setDocNote] = useState('')

  // Reset form when type changes
  useEffect(() => {
    setCondRating(null); setCondNotes('')
    setLocFrom(currentLoc); setLocTo('')
    setNewStatus(''); setStatusNote('')
    setNoteText('')
    setSalePriceStr(''); setSaleCurrency('USD'); setCommissionStr(''); setBuyerName(''); setSaleNote('')
    setPayoutAmtStr(''); setPayoutMethod(''); setPayoutRef(''); setPayoutNote('')
    setDocFile(null); setDocNote('')
    setSaving(false)
  }, [type, currentLoc])

  // Financial context for payouts
  const payoutTotal = events.filter((e) => e.type === 'payout').reduce((s, e) => s + ((e.details as any)?.amount ?? 0), 0)
  const consShare = work.salePrice != null && work.commissionRate != null
    ? Math.round(work.salePrice * (1 - work.commissionRate)) : 0
  const remaining = consShare - payoutTotal

  async function handleSave() {
    if (!type) return
    setSaving(true)
    try {
      switch (type) {
        case 'condition_update': {
          if (!condRating) { toast.error('Select a condition rating'); setSaving(false); return }
          const desc = `Condition updated to ${CONDITION_LABELS[condRating]}`
          await createEvent(galleryId, work.id, 'condition_update', desc, {
            conditionSummary: condRating, conditionNotes: condNotes.trim(),
          })
          break
        }
        case 'location_change': {
          if (!locTo.trim()) { toast.error('Enter the new location'); setSaving(false); return }
          const desc = `Moved from ${locFrom || '(unknown)'} to ${locTo.trim()}`
          await createEvent(galleryId, work.id, 'location_change', desc, {
            from: locFrom, to: locTo.trim(),
          })
          break
        }
        case 'status_change': {
          if (!newStatus) { toast.error('Select a status'); setSaving(false); return }
          if (newStatus === 'sold') {
            toast.info('Consider using the Sale event instead to capture financial details')
          }
          const desc = `Status changed from ${STATUS_LABELS[work.status]} to ${STATUS_LABELS[newStatus as WorkStatus]}`
          await createStatusChangeEvent(galleryId, work.id, work.status, newStatus as WorkStatus, desc)
          break
        }
        case 'note': {
          if (!noteText.trim()) { toast.error('Enter a note'); setSaving(false); return }
          await createEvent(galleryId, work.id, 'note', noteText.trim(), {})
          break
        }
        case 'sale': {
          const priceNum = parseFloat(salePriceStr)
          const commNum = parseFloat(commissionStr)
          if (!priceNum || priceNum <= 0) { toast.error('Enter a valid sale price'); setSaving(false); return }
          if (isNaN(commNum) || commNum < 0 || commNum > 100) { toast.error('Enter commission rate (0-100)'); setSaving(false); return }
          const priceCents = Math.round(priceNum * 100)
          const commRate = commNum / 100
          const desc = `Sold for ${formatCurrency(priceCents, saleCurrency)}`
          await createSaleEvent(galleryId, work.id, {
            salePrice: priceCents, currency: saleCurrency, buyerName: buyerName.trim(), commissionRate: commRate,
          }, desc)
          break
        }
        case 'payout': {
          const amtNum = parseFloat(payoutAmtStr)
          if (!amtNum || amtNum <= 0) { toast.error('Enter a valid amount'); setSaving(false); return }
          if (!payoutMethod.trim()) { toast.error('Enter payment method'); setSaving(false); return }
          const amtCents = Math.round(amtNum * 100)
          const desc = `Payout of ${formatCurrency(amtCents, work.currency)} \u2014 ${payoutMethod.trim()}`
          await createEvent(galleryId, work.id, 'payout', desc, {
            amount: amtCents, currency: work.currency, method: payoutMethod.trim(), reference: payoutRef.trim(),
          })
          break
        }
        case 'document_attach': {
          if (!docFile) { toast.error('Select a file'); setSaving(false); return }
          const ext = docFile.name.split('.').pop() || 'pdf'
          const fileName = generateFileName(ext)
          const { url } = await uploadDocument(galleryId, work.id, docFile, fileName)
          const desc = `Document attached: ${docFile.name}`
          await createEvent(galleryId, work.id, 'document_attach', desc, {
            fileName: docFile.name, fileUrl: url, fileType: docFile.type,
          })
          break
        }
      }
      toast.success(`${EVENT_TYPE_LABELS[type]} added`)
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={!!type} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{type ? EVENT_TYPE_LABELS[type] : ''}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pt-4">
          {/* Condition Update form */}
          {type === 'condition_update' && (
            <>
              <div>
                <Label className="mb-2 block">Overall Condition *</Label>
                <div className="flex gap-2 flex-wrap">
                  {CONDITION_RATINGS.map((r) => (
                    <button key={r} type="button" onClick={() => setCondRating(r)}
                      className={cn('rounded-full px-4 py-2 text-sm font-medium border transition-colors',
                        condRating === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border'
                      )}
                    >{CONDITION_LABELS[r]}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Condition Notes *</Label>
                <Textarea value={condNotes} onChange={(e) => setCondNotes(e.target.value)} maxLength={2000} rows={3} placeholder="Describe what changed" />
              </div>
            </>
          )}

          {/* Location Change form */}
          {type === 'location_change' && (
            <>
              <div className="space-y-2">
                <Label>From</Label>
                <Input value={locFrom} onChange={(e) => setLocFrom(e.target.value)} className="h-11" placeholder="Previous location" />
              </div>
              <div className="space-y-2">
                <Label>To *</Label>
                <Input value={locTo} onChange={(e) => setLocTo(e.target.value)} className="h-11" placeholder="New location" autoFocus />
              </div>
            </>
          )}

          {/* Status Change form */}
          {type === 'status_change' && (
            <>
              <div>
                <Label className="mb-2 block">New Status *</Label>
                <div className="flex gap-2 flex-wrap">
                  {WORK_STATUSES.filter((s) => s !== work.status).map((s) => (
                    <button key={s} type="button" onClick={() => setNewStatus(s)}
                      className={cn('rounded-full px-3 py-1.5 text-sm font-medium border transition-colors',
                        newStatus === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border'
                      )}
                    >{STATUS_LABELS[s]}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={500} rows={2} />
              </div>
            </>
          )}

          {/* Note form */}
          {type === 'note' && (
            <div className="space-y-2">
              <Label>Note *</Label>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={2000} rows={4} autoFocus />
            </div>
          )}

          {/* Sale form */}
          {type === 'sale' && (
            <>
              {events.some((e) => e.type === 'sale') && (
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  This work already has a sale recorded. A new sale will update the financial details.
                </div>
              )}
              <div className="space-y-2">
                <Label>Sale Price *</Label>
                <Input type="number" step="0.01" min="0.01" value={salePriceStr} onChange={(e) => setSalePriceStr(e.target.value)} className="h-11" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={saleCurrency} onValueChange={setSaleCurrency}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gallery Commission (%) *</Label>
                <Input type="number" min="0" max="100" value={commissionStr} onChange={(e) => setCommissionStr(e.target.value)} className="h-11" placeholder="50" />
              </div>
              <div className="space-y-2">
                <Label>Buyer Name</Label>
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="h-11" />
              </div>
            </>
          )}

          {/* Payout form */}
          {type === 'payout' && (
            <>
              {work.salePrice != null ? (
                <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Sale price</span><span>{formatCurrency(work.salePrice, work.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Commission ({work.commissionRate != null ? Math.round(work.commissionRate * 100) : 0}%)</span><span>-{formatCurrency(Math.round((work.salePrice) * (work.commissionRate ?? 0)), work.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Consignor share</span><span>{formatCurrency(consShare, work.currency)}</span></div>
                  {payoutTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Previously paid</span><span>-{formatCurrency(payoutTotal, work.currency)}</span></div>}
                  <Separator />
                  <div className="flex justify-between font-medium"><span>Remaining</span><span>{formatCurrency(Math.round(remaining), work.currency)}</span></div>
                </div>
              ) : (
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  No sale has been recorded for this work.
                </div>
              )}
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" min="0.01" value={payoutAmtStr} onChange={(e) => setPayoutAmtStr(e.target.value)} className="h-11" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Input value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} className="h-11" placeholder='Check, wire, cash, etc.' />
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} className="h-11" placeholder="Check #, transaction ID" />
              </div>
            </>
          )}

          {/* Document Attach form */}
          {type === 'document_attach' && (
            <>
              <div className="space-y-2">
                <Label>File *</Label>
                <Input type="file" accept=".pdf,image/jpeg,image/png" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} className="h-11" />
                {docFile && <p className="text-xs text-muted-foreground">{docFile.name} ({(docFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea value={docNote} onChange={(e) => setDocNote(e.target.value)} maxLength={500} rows={2} placeholder="Describe this document" />
              </div>
            </>
          )}

          <Button onClick={handleSave} className="w-full h-11" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// --- Edit Work Sheet ---

function EditWorkSheet({ work, galleryId, open, onClose }: {
  work: Work; galleryId: string; open: boolean; onClose: () => void
}) {
  const [artist, setArtist] = useState(work.artist)
  const [title, setTitle] = useState(work.title)
  const [medium, setMedium] = useState(work.medium)
  const [dimensions, setDimensions] = useState(work.dimensions)
  const [year, setYear] = useState(work.year)
  const [notes, setNotes] = useState(work.notes)
  const [consignors, setConsignors] = useState<Consignor[]>([])
  const [consignorId, setConsignorId] = useState(work.consignorId || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setArtist(work.artist); setTitle(work.title); setMedium(work.medium)
      setDimensions(work.dimensions); setYear(work.year); setNotes(work.notes)
      setConsignorId(work.consignorId || '')
      subscribeToConsignors(galleryId, setConsignors)
    }
  }, [open, work, galleryId])

  async function handleSave() {
    if (!artist.trim() || !title.trim()) { toast.error('Artist and title are required'); return }
    setSaving(true)
    try {
      const oldConsignorId = work.consignorId
      const newConsignorId = consignorId || null
      await updateWork(galleryId, work.id, {
        artist: artist.trim(), title: title.trim(), medium: medium.trim(),
        dimensions: dimensions.trim(), year: year.trim(), notes: notes.trim(),
        consignorId: newConsignorId,
      })
      // Update consignor work counts if changed
      if (oldConsignorId !== newConsignorId) {
        if (oldConsignorId) await incrementConsignorWorkCount(galleryId, oldConsignorId, -1)
        if (newConsignorId) await incrementConsignorWorkCount(galleryId, newConsignorId, 1)
      }
      toast.success('Work updated')
      onClose()
    } catch {
      toast.error('Failed to update work')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader><SheetTitle>Edit Work Details</SheetTitle></SheetHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Artist *</Label>
            <Input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={200} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Medium</Label>
            <Input value={medium} onChange={(e) => setMedium(e.target.value)} maxLength={200} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Dimensions</Label>
            <Input value={dimensions} onChange={(e) => setDimensions(e.target.value)} maxLength={100} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} maxLength={20} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Consignor</Label>
            <Select value={consignorId} onValueChange={setConsignorId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {consignors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} />
          </div>
          <Button onClick={handleSave} className="w-full h-11" disabled={!artist.trim() || !title.trim() || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
