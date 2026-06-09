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
import { motion } from 'framer-motion'
import { StatusBadge } from '@/pages/WorkList'
import type { Work, TimelineEvent, Photo, Consignor, EventType, WorkStatus, ConditionRating } from '@/types'
import { WORK_STATUSES, STATUS_LABELS, CONDITION_RATINGS, EVENT_TYPE_LABELS, CURRENCIES } from '@/types'
import { GuidanceTip } from '@/components/ux/GuidanceTip'
import { useTour } from '@/contexts/TourContext'

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

const FAB_MENU: { type: EventType; label: string; icon: typeof Plus; description: string }[] = [
  { type: 'condition_update', label: 'Condition Update', icon: RefreshCw, description: "Record changes to the artwork's physical condition" },
  { type: 'location_change', label: 'Location Change', icon: MapPin, description: 'Log where the work has been moved to' },
  { type: 'status_change', label: 'Status Change', icon: RefreshCw, description: 'Update intake, display, storage, or sold status' },
  { type: 'note', label: 'Note', icon: MessageSquare, description: 'Add a freeform observation or memo' },
  { type: 'sale', label: 'Sale', icon: DollarSign, description: 'Record sale price and commission details' },
  { type: 'payout', label: 'Payout', icon: CreditCard, description: 'Log a payment made to the consignor' },
  { type: 'document_attach', label: 'Attach Document', icon: Paperclip, description: 'Attach a contract, receipt, or certificate' },
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

  const [fabOpen, setFabOpen] = useState(false)
  const [eventFormType, setEventFormType] = useState<EventType | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  const [exportOpen, setExportOpen] = useState(false)
  const [exportMode, setExportMode] = useState<'full' | 'selective' | null>(null)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set())
  const [exportProgress, setExportProgress] = useState<string | null>(null)
  const tour = useTour()

  useEffect(() => {
    if (!gallery || !workId) return
    const unsub1 = subscribeToWork(gallery.id, workId, (w) => { setWork(w); setLoading(false) })
    const unsub2 = subscribeToEvents(gallery.id, workId, setEvents)
    const unsub3 = subscribeToPhotos(gallery.id, workId, setPhotos)
    return () => { unsub1(); unsub2(); unsub3() }
  }, [gallery, workId])

  useEffect(() => {
    if (!gallery || !work?.consignorId) { setConsignorName(null); return }
    getConsignor(gallery.id, work.consignorId).then((c) => setConsignorName(c?.name ?? 'Unknown'))
  }, [gallery, work?.consignorId])

  // Resume tour for stops 5-6 (cross-page navigation from stop 4)
  useEffect(() => {
    if (tour.pendingStep !== null && !loading) {
      const step = tour.pendingStep
      const timer = setTimeout(() => {
        tour.resumeAtStep(step)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [tour.pendingStep, loading]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const totalPayouts = useMemo(() => {
    return events
      .filter((e) => e.type === 'payout')
      .reduce((sum, e) => sum + ((e.details as any)?.amount ?? 0), 0)
  }, [events])

  const consignorShare = work?.salePrice != null && work?.commissionRate != null
    ? Math.round(work.salePrice * (1 - work.commissionRate))
    : 0
  const remainingBalance = consignorShare - totalPayouts

  function handleCarouselScroll() {
    if (!carouselRef.current) return
    const el = carouselRef.current
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setCarouselIndex(index)
  }

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
        <div className="sticky top-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/95 backdrop-blur-xl px-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="lg:flex">
          <div className="h-[50vh] bg-black lg:w-1/2 lg:h-screen" />
          <div className="px-4 pt-6 space-y-4 lg:w-1/2 lg:px-8">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!work) {
    return (
      <div>
        <div className="sticky top-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/95 backdrop-blur-xl px-4">
          <button onClick={() => navigate(-1)} className="mr-2 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-gold">
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <span className="font-heading text-lg font-medium">Not Found</span>
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
      <div className="sticky top-0 z-40 flex h-14 items-center border-b border-border/50 bg-background/95 backdrop-blur-xl px-4">
        <button onClick={() => navigate(-1)} className="mr-2 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-gold transition-colors">
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <h1 className="flex-1 truncate font-heading text-lg font-medium">{work.title}</h1>
        <button onClick={() => setExportOpen(true)} aria-label="Export provenance PDF" data-tour="export-provenance" className="flex h-11 items-center justify-center gap-1.5 px-2 text-muted-foreground hover:text-gold transition-colors">
          <Share className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-xs font-medium">Export</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-gold transition-colors">
              <MoreVertical className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit work details</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>Delete work</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="lg:flex">
        {/* Hero section — left on desktop, full-width on mobile */}
        <div className="relative bg-black lg:sticky lg:top-0 lg:h-screen lg:w-1/2">
          {photos.length > 0 ? (
            <div className="relative h-[50vh] lg:h-full">
              <div
                ref={carouselRef}
                onScroll={handleCarouselScroll}
                className="flex h-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
              >
                {photos.map((photo, idx) => (
                  <div key={photo.id} className="h-full w-full flex-shrink-0 snap-center">
                    <motion.img
                      {...(idx === 0 ? { layoutId: `work-image-${workId}` } : {})}
                      src={photo.storageUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                ))}
              </div>
              {photos.length > 1 && (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {photos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCarouselIndex(idx)}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full transition-colors',
                        idx === carouselIndex ? 'bg-gold' : 'bg-white/40'
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-[50vh] items-center justify-center lg:h-full">
              <ImagePlus className="h-12 w-12 text-muted-foreground/20" strokeWidth={1} />
            </div>
          )}
        </div>

        {/* Content section — right on desktop, below hero on mobile */}
        <div className="lg:w-1/2 lg:min-h-screen lg:overflow-y-auto pb-24">
          {/* Artist info */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="px-4 py-6 lg:px-8"
          >
            <h1 className="font-heading text-2xl font-medium">{work.artist}</h1>
            <p className="mt-1 text-base italic text-muted-foreground">{work.title}</p>
            {(work.medium || work.dimensions || work.year) && (
              <p className="mt-2 text-sm text-muted-foreground/70">
                {[work.medium, work.dimensions, work.year].filter(Boolean).join(' — ')}
              </p>
            )}
            {consignorName && (
              <button
                onClick={() => navigate(`/consignors/${work.consignorId}`)}
                className="mt-2 block text-sm text-gold/80 transition-colors hover:text-gold"
              >
                Consignor: {consignorName}
              </button>
            )}
            <div className="mt-3"><StatusBadge status={work.status} /></div>
          </motion.div>

          {/* Details section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="border-t border-border/30 px-4 py-6 lg:px-8"
          >
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-gold mb-4">Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {work.medium && (
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Medium</span>
                  <p className="mt-0.5 text-foreground">{work.medium}</p>
                </div>
              )}
              {work.dimensions && (
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dimensions</span>
                  <p className="mt-0.5 text-foreground">{work.dimensions}</p>
                </div>
              )}
              {work.year && (
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Year</span>
                  <p className="mt-0.5 text-foreground">{work.year}</p>
                </div>
              )}
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Location</span>
                <p className="mt-0.5 text-foreground">{currentLocation || 'Not recorded'}</p>
              </div>
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Condition</span>
                <p className="mt-0.5 text-foreground">{currentCondition ? CONDITION_LABELS[currentCondition as ConditionRating] || currentCondition : 'Not recorded'}</p>
              </div>
            </div>
            {work.notes && (
              <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{work.notes}</p>
            )}
          </motion.div>

          {/* UX-005: Guidance tip — timeline orientation */}
          <div className="px-4 lg:px-8 pb-2">
            <GuidanceTip id="work-detail-timeline">
              Every change to this work is recorded in the timeline below. Use the + button to log condition updates, location moves, sales, and more.
            </GuidanceTip>
          </div>

          {/* UX-001: State-aware next-step card */}
          {(() => {
            const hasLocationEvents = events.some((e) => e.type === 'location_change')
            const hasPayoutEvents = events.some((e) => e.type === 'payout')
            const nonIntakeEvents = events.filter((e) => e.type !== 'intake')
            if (work.status === 'intake' && !hasLocationEvents) {
              return (
                <div className="px-4 lg:px-8 pb-4">
                  <button
                    onClick={() => { setFabOpen(true) }}
                    className="flex w-full items-center gap-4 border-l-2 border-l-gold/50 bg-card px-4 py-3.5 text-left transition-colors hover:bg-secondary"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold/20 bg-gold/5 text-gold">
                      <MapPin className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Log storage location</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Record where this work is currently stored</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-gold/70">Add</span>
                  </button>
                </div>
              )
            }
            if (work.status === 'sold' && !hasPayoutEvents) {
              return (
                <div className="px-4 lg:px-8 pb-4">
                  <button
                    onClick={() => { setFabOpen(true) }}
                    className="flex w-full items-center gap-4 border-l-2 border-l-gold/50 bg-card px-4 py-3.5 text-left transition-colors hover:bg-secondary"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold/20 bg-gold/5 text-gold">
                      <CreditCard className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Record consignor payout</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Log the payment made to the consignor for this sale</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-gold/70">Add</span>
                  </button>
                </div>
              )
            }
            if (nonIntakeEvents.length === 0) {
              return (
                <div className="px-4 lg:px-8 pb-4">
                  <button
                    onClick={() => { setFabOpen(true) }}
                    className="flex w-full items-center gap-4 border-l-2 border-l-gold/50 bg-card px-4 py-3.5 text-left transition-colors hover:bg-secondary"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold/20 bg-gold/5 text-gold">
                      <Plus className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Start building provenance</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Log a condition update or location change to begin the record</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-gold/70">Add</span>
                  </button>
                </div>
              )
            }
            return null
          })()}

          {/* Financial summary */}
          {work.salePrice != null && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border-t border-border/30 px-4 py-6 lg:px-8"
            >
              <h3 className="text-[10px] font-medium uppercase tracking-wider text-gold mb-4">Financial Summary</h3>
              <div className="space-y-2 text-sm">
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
                <div className="h-px bg-border/50 my-1" />
                <div className="flex justify-between font-medium">
                  <span>Remaining</span>
                  <span className={cn(
                    remainingBalance < 0 && 'text-destructive',
                    remainingBalance === 0 && 'text-success'
                  )}>
                    {remainingBalance === 0 ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Fully paid
                      </span>
                    ) : formatCurrency(Math.round(remainingBalance), work.currency)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="border-t border-border/30 px-4 py-6 lg:px-8"
          >
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-gold mb-6">
              Timeline ({events.length} event{events.length !== 1 ? 's' : ''})
            </h3>

            {events.filter((e) => e.type !== 'intake').length === 0 && (
              <p className="text-sm text-muted-foreground mb-4">No events recorded yet. Use the + button below to start building this work's provenance trail.</p>
            )}
            {events.length === 0 ? null : (
              <div className="relative pl-6">
                {/* Vertical gold line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gold/30" />

                {events.map((event, idx) => {
                  const Icon = EVENT_ICONS[event.type] || MessageSquare
                  const isLast = idx === events.length - 1
                  const editable = isEventEditable(event)
                  const details = event.details as any

                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="relative mb-6 last:mb-0"
                    >
                      {/* Gold dot */}
                      <div className={cn(
                        'absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-gold',
                        isLast ? 'bg-gold' : 'bg-background'
                      )} />

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(event.createdAt)} <span className="text-gold/80">{EVENT_TYPE_LABELS[event.type]}</span>
                          </span>
                          {editable && (
                            <button
                              onClick={() => toast.info('Event editing coming soon')}
                              className="text-xs text-gold/60 hover:text-gold transition-colors"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                        <p className="text-sm">{event.description}</p>

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
                            {details.buyerName && ` — Buyer: ${details.buyerName}`}
                          </p>
                        )}
                        {event.type === 'payout' && details?.amount && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(details.amount, details.currency || 'USD')} via {details.method}
                            {details.reference && ` (${details.reference})`}
                          </p>
                        )}
                        {event.type === 'document_attach' && details?.fileName && (
                          <a href={details.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:text-gold/80">
                            {details.fileName}
                          </a>
                        )}

                        {event.photoUrls.length > 0 && (
                          <div className="flex gap-1.5 pt-1 overflow-x-auto">
                            {event.photoUrls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt=""
                                className="h-14 w-14 flex-shrink-0 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(url, '_blank')}
                              />
                            ))}
                          </div>
                        )}

                        {event.type === 'intake' && details?.signatureUrl && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                            <PenTool className="h-3 w-3" />
                            <span>Consignor signature captured</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* FAB */}
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
        onClick={() => setFabOpen(true)}
        data-tour="fab-add-event"
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center bg-gold text-gold-foreground shadow-[0_0_20px_rgba(184,149,106,0.3)] md:bottom-8 md:right-8"
      >
        <Plus className="h-6 w-6" strokeWidth={1.5} />
      </motion.button>

      {/* FAB menu */}
      <Sheet open={fabOpen} onOpenChange={setFabOpen}>
        <SheetContent side="bottom" className="max-h-[85vh]">
          <SheetHeader><SheetTitle>Add Event</SheetTitle></SheetHeader>
          <div className="space-y-1 pt-2">
            {FAB_MENU.map((item) => (
              <button
                key={item.type}
                onClick={() => { setFabOpen(false); setEventFormType(item.type) }}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-secondary"
              >
                <item.icon className="h-5 w-5 shrink-0 text-gold/70" strokeWidth={1.5} />
                <div className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </div>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Event form */}
      <EventFormSheet
        type={eventFormType}
        work={work}
        events={events}
        galleryId={gallery!.id}
        onClose={() => setEventFormType(null)}
      />

      {/* Edit work */}
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
          <p className="mt-2 text-sm text-muted-foreground px-0">
            Generate a PDF provenance report with cover photo, condition history, timeline events, and financial summary. Choose full export or select specific events.
          </p>
          {!exportMode ? (
            <div className="space-y-2 pt-4">
              <button
                onClick={() => handleExport('full')}
                className="flex w-full flex-col border border-border/50 bg-card p-4 text-left transition-colors hover:bg-secondary"
              >
                <span className="text-sm font-medium">Full Timeline Export</span>
                <span className="text-xs text-muted-foreground mt-1">All events, photos, condition history, and financials</span>
              </button>
              <button
                onClick={() => {
                  setExportMode('selective')
                  setSelectedEventIds(new Set(events.map((e) => e.id)))
                }}
                className="flex w-full flex-col border border-border/50 bg-card p-4 text-left transition-colors hover:bg-secondary"
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
                  className="text-xs font-medium text-gold"
                >
                  {selectedEventIds.size === events.length ? 'Deselect all' : 'Select all'}
                </button>
                <span className="text-xs text-muted-foreground">{selectedEventIds.size} of {events.length} selected</span>
              </div>
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {events.map((ev) => (
                  <label key={ev.id} className="flex items-center gap-3 p-2 transition-colors hover:bg-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEventIds.has(ev.id)}
                      onChange={(e) => {
                        const next = new Set(selectedEventIds)
                        if (e.target.checked) next.add(ev.id)
                        else next.delete(ev.id)
                        setSelectedEventIds(next)
                      }}
                      className="h-4 w-4 rounded border-border accent-gold"
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
                className="w-full h-11 bg-gold text-gold-foreground hover:bg-gold/90"
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
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
  const [condRating, setCondRating] = useState<ConditionRating | null>(null)
  const [condNotes, setCondNotes] = useState('')
  const currentLoc = useMemo(() => {
    const locs = events.filter((e) => e.type === 'location_change')
    return locs.length > 0 ? (locs[locs.length - 1].details as any)?.to ?? '' : ''
  }, [events])
  const [locFrom, setLocFrom] = useState(currentLoc)
  const [locTo, setLocTo] = useState('')
  const [newStatus, setNewStatus] = useState<WorkStatus | ''>('')
  const [statusNote, setStatusNote] = useState('')
  const [noteText, setNoteText] = useState('')
  const [salePriceStr, setSalePriceStr] = useState('')
  const [saleCurrency, setSaleCurrency] = useState('USD')
  const [commissionStr, setCommissionStr] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [saleNote, setSaleNote] = useState('')
  const [payoutAmtStr, setPayoutAmtStr] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('')
  const [payoutRef, setPayoutRef] = useState('')
  const [payoutNote, setPayoutNote] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docNote, setDocNote] = useState('')

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
          {type === 'condition_update' && (
            <>
              <div>
                <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">Overall Condition *</Label>
                <div className="flex gap-2 flex-wrap">
                  {CONDITION_RATINGS.map((r) => (
                    <button key={r} type="button" onClick={() => setCondRating(r)}
                      className={cn('px-4 py-2 text-sm font-medium border transition-colors',
                        condRating === r ? 'bg-gold/10 text-gold border-gold/30' : 'bg-secondary text-foreground border-border/50 hover:border-border'
                      )}
                    >{CONDITION_LABELS[r]}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Condition Notes *</Label>
                <Textarea value={condNotes} onChange={(e) => setCondNotes(e.target.value)} maxLength={2000} rows={3} placeholder="Describe what changed" />
              </div>
            </>
          )}

          {type === 'location_change' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">From</Label>
                <Input value={locFrom} onChange={(e) => setLocFrom(e.target.value)} className="h-11 bg-card border-border/60" placeholder="Previous location" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">To *</Label>
                <Input value={locTo} onChange={(e) => setLocTo(e.target.value)} className="h-11 bg-card border-border/60" placeholder="New location" autoFocus />
              </div>
            </>
          )}

          {type === 'status_change' && (
            <>
              <div>
                <Label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground">New Status *</Label>
                <div className="flex gap-2 flex-wrap">
                  {WORK_STATUSES.filter((s) => s !== work.status).map((s) => (
                    <button key={s} type="button" onClick={() => setNewStatus(s)}
                      className={cn('px-3 py-1.5 text-sm font-medium border transition-colors',
                        newStatus === s ? 'bg-gold/10 text-gold border-gold/30' : 'bg-secondary text-foreground border-border/50 hover:border-border'
                      )}
                    >{STATUS_LABELS[s]}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Note</Label>
                <Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={500} rows={2} />
              </div>
            </>
          )}

          {type === 'note' && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Note *</Label>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={2000} rows={4} autoFocus />
            </div>
          )}

          {type === 'sale' && (
            <>
              {events.some((e) => e.type === 'sale') && (
                <div className="border border-warning/20 bg-warning/5 p-3 text-sm text-warning">
                  This work already has a sale recorded. A new sale will update the financial details.
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Sale Price *</Label>
                <Input type="number" step="0.01" min="0.01" value={salePriceStr} onChange={(e) => setSalePriceStr(e.target.value)} className="h-11 bg-card border-border/60" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Currency</Label>
                <Select value={saleCurrency} onValueChange={setSaleCurrency}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Gallery Commission (%) *</Label>
                <Input type="number" min="0" max="100" value={commissionStr} onChange={(e) => setCommissionStr(e.target.value)} className="h-11 bg-card border-border/60" placeholder="50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Buyer Name</Label>
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="h-11 bg-card border-border/60" />
              </div>
            </>
          )}

          {type === 'payout' && (
            <>
              {work.salePrice != null ? (
                <div className="border border-border/50 bg-card p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Sale price</span><span>{formatCurrency(work.salePrice, work.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Commission ({work.commissionRate != null ? Math.round(work.commissionRate * 100) : 0}%)</span><span>-{formatCurrency(Math.round((work.salePrice) * (work.commissionRate ?? 0)), work.currency)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Consignor share</span><span>{formatCurrency(consShare, work.currency)}</span></div>
                  {payoutTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Previously paid</span><span>-{formatCurrency(payoutTotal, work.currency)}</span></div>}
                  <div className="h-px bg-border/50 my-1" />
                  <div className="flex justify-between font-medium"><span>Remaining</span><span>{formatCurrency(Math.round(remaining), work.currency)}</span></div>
                </div>
              ) : (
                <div className="border border-warning/20 bg-warning/5 p-3 text-sm text-warning">
                  No sale has been recorded for this work.
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Amount *</Label>
                <Input type="number" step="0.01" min="0.01" value={payoutAmtStr} onChange={(e) => setPayoutAmtStr(e.target.value)} className="h-11 bg-card border-border/60" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Payment Method *</Label>
                <Input value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} className="h-11 bg-card border-border/60" placeholder='Check, wire, cash, etc.' />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Reference</Label>
                <Input value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} className="h-11 bg-card border-border/60" placeholder="Check #, transaction ID" />
              </div>
            </>
          )}

          {type === 'document_attach' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">File *</Label>
                <Input type="file" accept=".pdf,image/jpeg,image/png" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} className="h-11" />
                {docFile && <p className="text-xs text-muted-foreground">{docFile.name} ({(docFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Note</Label>
                <Textarea value={docNote} onChange={(e) => setDocNote(e.target.value)} maxLength={500} rows={2} placeholder="Describe this document" />
              </div>
            </>
          )}

          <Button onClick={handleSave} className="w-full h-11 bg-gold text-gold-foreground hover:bg-gold/90" disabled={saving}>
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
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Artist *</Label>
            <Input value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={200} className="h-11 bg-card border-border/60" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="h-11 bg-card border-border/60" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Medium</Label>
            <Input value={medium} onChange={(e) => setMedium(e.target.value)} maxLength={200} className="h-11 bg-card border-border/60" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Dimensions</Label>
            <Input value={dimensions} onChange={(e) => setDimensions(e.target.value)} maxLength={100} className="h-11 bg-card border-border/60" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Year</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} maxLength={20} className="h-11 bg-card border-border/60" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Consignor</Label>
            <Select value={consignorId} onValueChange={setConsignorId}>
              <SelectTrigger className="h-11"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {consignors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={3} />
          </div>
          <Button onClick={handleSave} className="w-full h-11 bg-gold text-gold-foreground hover:bg-gold/90" disabled={!artist.trim() || !title.trim() || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
