import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search, Plus, ImagePlus, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToWorks } from '@/lib/services'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Work, WorkStatus } from '@/types'
import { WORK_STATUSES, STATUS_LABELS } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<WorkStatus, { bg: string; text: string }> = {
  intake: { bg: 'bg-blue-50', text: 'text-blue-700' },
  in_storage: { bg: 'bg-gray-100', text: 'text-gray-700' },
  on_display: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  on_loan: { bg: 'bg-amber-50', text: 'text-amber-700' },
  shipped: { bg: 'bg-purple-50', text: 'text-purple-700' },
  sold: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  returned: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

export function StatusBadge({ status }: { status: WorkStatus }) {
  const colors = STATUS_COLORS[status]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase', colors.bg, colors.text)}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function WorkCard({ work, onClick }: { work: Work; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-sm hover:bg-muted/50 transition-colors min-h-[72px]"
    >
      {work.coverPhotoUrl ? (
        <img
          src={work.coverPhotoUrl}
          alt=""
          className="h-[72px] w-[72px] flex-shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-md bg-muted">
          <ImagePlus className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold">{work.artist}</p>
        <p className="truncate text-sm">{work.title}</p>
        {(work.medium || work.dimensions) && (
          <p className="truncate text-xs text-muted-foreground">
            {[work.medium, work.dimensions].filter(Boolean).join(' \u2014 ')}
          </p>
        )}
        <StatusBadge status={work.status} />
      </div>
    </button>
  )
}

function WorkListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
          <Skeleton className="h-[72px] w-[72px] rounded-md" />
          <div className="flex-1 space-y-2">
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

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: works.length }
    for (const s of WORK_STATUSES) counts[s] = 0
    for (const w of works) counts[w.status] = (counts[w.status] || 0) + 1
    return counts
  }, [works])

  // Filtered works
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
                className="h-9"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                className="flex h-11 w-11 items-center justify-center"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <>
              {hasWorks && (
                <button onClick={() => setSearchOpen(true)} className="flex h-11 w-11 items-center justify-center">
                  <Search className="h-5 w-5" strokeWidth={1.5} />
                </button>
              )}
              <button onClick={() => navigate('/works/new')} className="flex h-11 w-11 items-center justify-center">
                <Plus className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </>
          )
        }
      />

      <div className="mx-auto max-w-[640px] px-4 pt-4">
        {loading ? (
          <WorkListSkeleton />
        ) : !hasWorks ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ImagePlus className="h-12 w-12 text-muted-foreground mb-4" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold">No works yet</h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Add your first work to start building your gallery's records
            </p>
            <Button className="mt-6" onClick={() => navigate('/works/new')}>
              Add a work
            </Button>
          </div>
        ) : (
          <>
            {/* Status filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                  statusFilter === 'all'
                    ? 'bg-accent text-accent-foreground border-primary/20'
                    : 'bg-muted text-muted-foreground border-border'
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
                      'flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                      statusFilter === s
                        ? 'bg-accent text-accent-foreground border-primary/20'
                        : 'bg-muted text-muted-foreground border-border'
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredWorks.map((work) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    onClick={() => navigate(`/works/${work.id}`)}
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
