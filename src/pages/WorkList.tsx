import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search, Plus, ImagePlus, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToWorks } from '@/lib/services'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import type { Work, WorkStatus } from '@/types'
import { WORK_STATUSES, STATUS_LABELS } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<WorkStatus, { bg: string; text: string; dot: string }> = {
  intake: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400' },
  in_storage: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400' },
  on_display: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  on_loan: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
  shipped: { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-400' },
  sold: { bg: 'bg-gold/10', text: 'text-gold', dot: 'bg-gold' },
  returned: { bg: 'bg-zinc-500/10', text: 'text-zinc-500', dot: 'bg-zinc-500' },
}

export function StatusBadge({ status }: { status: WorkStatus }) {
  const colors = STATUS_COLORS[status]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
      colors.bg, colors.text
    )}>
      <span className={cn('h-1 w-1 rounded-full', colors.dot)} />
      {STATUS_LABELS[status]}
    </span>
  )
}

function WorkCard({ work, onClick, index }: { work: Work; onClick: () => void; index: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={onClick}
      className="group flex w-full items-start gap-4 border-b border-border/50 bg-transparent p-4 text-left transition-colors hover:bg-card"
    >
      {work.coverPhotoUrl ? (
        <img
          src={work.coverPhotoUrl}
          alt=""
          className="h-[80px] w-[80px] flex-shrink-0 object-cover transition-transform group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex h-[80px] w-[80px] flex-shrink-0 items-center justify-center bg-secondary">
          <ImagePlus className="h-5 w-5 text-muted-foreground" strokeWidth={1} />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1 py-0.5">
        <p className="truncate text-sm font-medium text-foreground">{work.artist}</p>
        <p className="truncate text-sm italic text-muted-foreground">{work.title}</p>
        {(work.medium || work.dimensions) && (
          <p className="truncate text-xs text-muted-foreground/70">
            {[work.medium, work.dimensions].filter(Boolean).join(' \u2014 ')}
          </p>
        )}
        <StatusBadge status={work.status} />
      </div>
    </motion.button>
  )
}

function WorkListSkeleton() {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-4">
          <Skeleton className="h-[80px] w-[80px]" />
          <div className="flex-1 space-y-2 py-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
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

  useEffect(() => {
    if (!gallery) return
    const unsub = subscribeToWorks(gallery.id, (data) => {
      setWorks(data)
      setLoading(false)
    })
    return unsub
  }, [gallery])

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
                  className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-gold transition-colors"
                >
                  <Search className="h-5 w-5" strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={() => navigate('/works/new')}
                className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-gold transition-colors"
              >
                <Plus className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </>
          )
        }
      />

      <div className="mx-auto max-w-[640px]">
        {loading ? (
          <WorkListSkeleton />
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

            {/* Work list */}
            {filteredWorks.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? `No works matching "${searchQuery}"` :
                   statusFilter !== 'all' ? `No works with status "${STATUS_LABELS[statusFilter]}"` :
                   'No matching works'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredWorks.map((work, i) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    onClick={() => navigate(`/works/${work.id}`)}
                    index={i}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
