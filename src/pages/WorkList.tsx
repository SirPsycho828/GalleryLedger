import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search, Plus, ImagePlus, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToWorks } from '@/lib/services'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion'
import type { Work, WorkStatus } from '@/types'
import { WORK_STATUSES, STATUS_LABELS } from '@/types'
import { cn } from '@/lib/utils'
import { GuidanceTip } from '@/components/ux/GuidanceTip'
import { useTour, isTourCompleted } from '@/contexts/TourContext'

const STATUS_COLORS: Record<WorkStatus, string> = {
  intake: 'bg-blue-400',
  in_storage: 'bg-zinc-400',
  on_display: 'bg-emerald-400',
  on_loan: 'bg-amber-400',
  shipped: 'bg-purple-400',
  sold: 'bg-gold',
  returned: 'bg-zinc-500',
}

export function StatusBadge({ status }: { status: WorkStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-black/40 backdrop-blur-sm">
      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_COLORS[status])} />
      {STATUS_LABELS[status]}
    </span>
  )
}

function ArtCard({ work, onClick, index }: { work: Work; onClick: () => void; index: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className="group relative aspect-[4/5] w-full overflow-hidden bg-card text-left"
    >
      {work.coverPhotoUrl ? (
        <motion.img
          layoutId={`work-image-${work.id}`}
          src={work.coverPhotoUrl}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary">
          <ImagePlus className="h-8 w-8 text-muted-foreground/30" strokeWidth={1} />
        </div>
      )}

      {/* Status dot */}
      <div className="absolute top-2.5 right-2.5">
        <span className={cn('block h-2 w-2 rounded-full', STATUS_COLORS[work.status])} />
      </div>

      {/* Text overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-10">
        <p className="truncate font-heading text-[13px] font-medium leading-tight text-white">
          {work.artist}
        </p>
        <p className="mt-0.5 truncate text-[11px] italic text-white/65">
          {work.title}
        </p>
      </div>

      {/* Hover border (desktop) */}
      <div className="pointer-events-none absolute inset-0 border border-transparent transition-colors duration-200 group-hover:border-gold/40" />
    </motion.button>
  )
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-[shimmer_1.5s_ease-in-out_infinite] rounded-none bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%]" />
      ))}
    </div>
  )
}

export default function WorkList() {
  const { gallery } = useAuth()
  const navigate = useNavigate()
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<WorkStatus | 'all'>('all')
  const tour = useTour()

  useEffect(() => {
    if (!gallery) return
    const unsub = subscribeToWorks(gallery.id, (data) => {
      setWorks(data)
      setLoading(false)
    })
    return unsub
  }, [gallery])

  // Auto-start tour on first visit
  useEffect(() => {
    if (loading || isTourCompleted()) return
    // Give DOM time to render targets
    const timer = setTimeout(() => {
      tour.setFirstWorkId(works.length > 0 ? works[0].id : null)
      tour.startTour()
    }, 600)
    return () => clearTimeout(timer)
    // Intentionally depends only on `loading` — we want this to fire exactly once
    // when works finish loading. `works` and `tour` are captured at that moment.
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: works.length }
    for (const s of WORK_STATUSES) counts[s] = 0
    for (const w of works) counts[w.status] = (counts[w.status] || 0) + 1
    return counts
  }, [works])

  const filteredWorks = useMemo(() => {
    let result = works
    if (statusFilter !== 'all') {
      result = result.filter((w) => w.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((w) =>
        w.artist.toLowerCase().includes(q) ||
        w.title.toLowerCase().includes(q) ||
        w.medium.toLowerCase().includes(q) ||
        w.notes.toLowerCase().includes(q)
      )
    }
    return result
  }, [works, statusFilter, searchQuery])

  const hasWorks = works.length > 0
  const allIntake = hasWorks && works.every((w) => w.status === 'intake')

  return (
    <div>
      <TopBar
        title={searchOpen ? '' : 'Works'}
        actions={
          searchOpen ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by artist, title, or medium"
                autoFocus
                className="h-9 border-border/60 bg-card"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <>
              {hasWorks && (
                <button
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search works"
                  className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-gold transition-colors"
                >
                  <Search className="h-5 w-5" strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={() => navigate('/works/new')}
                aria-label="Add new work"
                data-tour="add-work"
                className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-gold transition-colors"
              >
                <Plus className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </>
          )
        }
      />

      <div className="mx-auto max-w-6xl">
        {loading ? (
          <div className="px-0.5 pt-2 lg:px-4">
            <GridSkeleton />
          </div>
        ) : !hasWorks ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center px-4"
          >
            <div className="mb-6 flex h-20 w-20 items-center justify-center border border-border/50 bg-secondary">
              <ImagePlus className="h-8 w-8 text-muted-foreground" strokeWidth={1} />
            </div>
            <h2 className="font-heading text-xl font-medium">Your Collection Awaits</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
              Begin documenting your gallery's works with full provenance tracking
            </p>
            <Button
              className="mt-8 h-11 bg-gold px-8 text-sm font-medium uppercase tracking-widest text-gold-foreground hover:bg-gold/90"
              onClick={() => navigate('/works/new')}
            >
              Add First Work
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Metrics summary */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs text-muted-foreground">
                {works.length} {works.length === 1 ? 'work' : 'works'}
                {statusCounts['on_display'] > 0 && ` — ${statusCounts['on_display']} on display`}
                {statusCounts['sold'] > 0 && ` — ${statusCounts['sold']} sold`}
              </p>
            </div>

            {/* Guidance tip */}
            <div className="px-4 pb-1">
              <GuidanceTip id="works-list-guide">
                Filter by status to find works quickly. Tap any work to view its full provenance history.
              </GuidanceTip>
              {allIntake && (
                <GuidanceTip id="works-all-intake" className="mt-1">
                  All your works are in intake status. Tap a work and use the + button to log a location change or status update.
                </GuidanceTip>
              )}
            </div>

            {/* Status filter chips */}
            <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider border transition-colors',
                  statusFilter === 'all'
                    ? 'border-gold/30 bg-gold/10 text-gold'
                    : 'border-border/50 bg-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                All ({statusCounts.all})
              </button>
              {WORK_STATUSES.map((s) => (
                statusCounts[s] > 0 && (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'flex-shrink-0 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider border transition-colors',
                      statusFilter === s
                        ? 'border-gold/30 bg-gold/10 text-gold'
                        : 'border-border/50 bg-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    )}
                  >
                    {STATUS_LABELS[s]} ({statusCounts[s]})
                  </button>
                )
              ))}
            </div>

            {/* Art grid */}
            {filteredWorks.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? `No works matching "${searchQuery}"` :
                   statusFilter !== 'all' ? `No works with status "${STATUS_LABELS[statusFilter]}"` :
                   'No matching works'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-0.5 px-0.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-1 lg:px-4">
                <AnimatePresence mode="popLayout">
                  {filteredWorks.map((work, i) => (
                    <ArtCard
                      key={work.id}
                      work={work}
                      onClick={() => navigate(`/works/${work.id}`)}
                      index={i}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
