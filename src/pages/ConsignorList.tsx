import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search, Plus, Users, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { subscribeToConsignors } from '@/lib/services'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Consignor } from '@/types'

function ConsignorCard({ consignor, onClick }: { consignor: Consignor; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col gap-0.5 rounded-lg border border-border bg-card p-4 text-left shadow-sm hover:bg-muted/50 transition-colors"
    >
      <p className="text-sm font-semibold">{consignor.name}</p>
      {consignor.email && (
        <p className="text-xs text-muted-foreground">{consignor.email}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {consignor.workCount === 0 ? 'No works' : `${consignor.workCount} work${consignor.workCount !== 1 ? 's' : ''}`}
      </p>
    </button>
  )
}

export default function ConsignorList() {
  const { gallery } = useAuth()
  const navigate = useNavigate()
  const [consignors, setConsignors] = useState<Consignor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!gallery) return
    const unsub = subscribeToConsignors(gallery.id, (data) => {
      setConsignors(data)
      setLoading(false)
    })
    return unsub
  }, [gallery])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return consignors
    const q = searchQuery.toLowerCase()
    return consignors.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    )
  }, [consignors, searchQuery])

  return (
    <div>
      <TopBar
        title={searchOpen ? '' : 'Consignors'}
        actions={
          searchOpen ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search consignors"
                autoFocus
                className="h-9"
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery('') }} className="flex h-11 w-11 items-center justify-center">
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <>
              {consignors.length > 0 && (
                <button onClick={() => setSearchOpen(true)} className="flex h-11 w-11 items-center justify-center">
                  <Search className="h-5 w-5" strokeWidth={1.5} />
                </button>
              )}
              <button onClick={() => navigate('/consignors/new')} className="flex h-11 w-11 items-center justify-center">
                <Plus className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </>
          )
        }
      />

      <div className="mx-auto max-w-4xl px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ))}
          </div>
        ) : consignors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center border border-border/50 bg-secondary">
              <Users className="h-8 w-8 text-muted-foreground" strokeWidth={1} />
            </div>
            <h2 className="font-heading text-xl font-medium">No Consignors Yet</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
              Consignors will appear here when you add them
            </p>
            <Button className="mt-8 h-11 bg-gold px-8 text-sm font-medium uppercase tracking-widest text-gold-foreground hover:bg-gold/90" onClick={() => navigate('/consignors/new')}>
              Add a Consignor
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No matching consignors</p>
            ) : (
              filtered.map((c) => (
                <ConsignorCard key={c.id} consignor={c} onClick={() => navigate(`/consignors/${c.id}`)} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
