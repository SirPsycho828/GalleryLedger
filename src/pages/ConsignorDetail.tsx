import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Mail, Phone, MapPin, MoreVertical, ImagePlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getConsignor, updateConsignor, deleteConsignor, subscribeToWorks, subscribeToEvents, formatCurrency } from '@/lib/services'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'
import type { Consignor, Work, TimelineEvent } from '@/types'
import { StatusBadge } from '@/pages/WorkList'
import { GuidanceTip } from '@/components/ux/GuidanceTip'

export default function ConsignorDetail() {
  const { consignorId } = useParams<{ consignorId: string }>()
  const { gallery } = useAuth()
  const navigate = useNavigate()
  const [consignor, setConsignor] = useState<Consignor | null>(null)
  const [linkedWorks, setLinkedWorks] = useState<Work[]>([])
  const [payoutTotals, setPayoutTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    if (!gallery || !consignorId) return
    getConsignor(gallery.id, consignorId).then((c) => {
      setConsignor(c)
      setLoading(false)
    })
  }, [gallery, consignorId])

  // Load linked works
  useEffect(() => {
    if (!gallery) return
    const unsub = subscribeToWorks(gallery.id, (works) => {
      const linked = works.filter((w) => w.consignorId === consignorId)
      setLinkedWorks(linked)

      // Load payout events for sold works
      const soldWorks = linked.filter((w) => w.salePrice !== null)
      const totals: Record<string, number> = {}
      let pending = soldWorks.length
      if (pending === 0) { setPayoutTotals({}); return }

      soldWorks.forEach((work) => {
        const unsubEvents = subscribeToEvents(gallery.id, work.id, (events) => {
          const payoutSum = events
            .filter((e) => e.type === 'payout')
            .reduce((sum, e) => sum + ((e.details as any)?.amount ?? 0), 0)
          totals[work.id] = payoutSum
          pending--
          if (pending <= 0) setPayoutTotals({ ...totals })
        })
        // Note: not cleaning up inner subscriptions for simplicity at MVP
      })
    })
    return unsub
  }, [gallery, consignorId])

  function openEdit() {
    if (!consignor) return
    setEditName(consignor.name)
    setEditEmail(consignor.email)
    setEditPhone(consignor.phone)
    setEditAddress(consignor.address)
    setEditNotes(consignor.notes)
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    if (!gallery || !consignorId || !editName.trim()) return
    try {
      await updateConsignor(gallery.id, consignorId, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim(),
        notes: editNotes.trim(),
      })
      setConsignor((prev) => prev ? { ...prev, name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim(), address: editAddress.trim(), notes: editNotes.trim() } : prev)
      setEditOpen(false)
      toast.success('Consignor updated')
    } catch {
      toast.error('Failed to update consignor')
    }
  }

  async function handleDelete() {
    if (!gallery || !consignorId) return
    try {
      await deleteConsignor(gallery.id, consignorId)
      toast.success('Consignor deleted')
      navigate('/consignors', { replace: true })
    } catch {
      toast.error('Failed to delete consignor')
    }
  }

  // Financial calculations
  const soldWorks = linkedWorks.filter((w) => w.salePrice !== null)
  const totalSales = soldWorks.reduce((sum, w) => sum + (w.salePrice ?? 0), 0)
  const totalConsignorShare = soldWorks.reduce((sum, w) => {
    const share = (w.salePrice ?? 0) * (1 - (w.commissionRate ?? 0))
    return sum + share
  }, 0)
  const totalPaidOut = Object.values(payoutTotals).reduce((sum, v) => sum + v, 0)
  const outstanding = totalConsignorShare - totalPaidOut

  if (loading) {
    return (
      <div>
        <TopBar title="..." showBack />
        <div className="mx-auto max-w-3xl px-4 pt-4 space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!consignor) {
    return (
      <div>
        <TopBar title="Not Found" showBack />
        <div className="mx-auto max-w-3xl px-4 pt-8 text-center">
          <p className="text-muted-foreground">Consignor not found</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        title={consignor.name}
        showBack
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-gold transition-colors">
                <MoreVertical className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="mx-auto max-w-3xl px-4 pt-4 space-y-6">
        <GuidanceTip id="consignor-detail-guide">
          This consignor's linked works and financial summary update automatically as you record sales and payouts on individual works.
        </GuidanceTip>

        {/* Contact info */}
        <div className="space-y-2">
          {consignor.email && (
            <a href={`mailto:${consignor.email}`} className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gold/70" strokeWidth={1.5} />
              {consignor.email}
            </a>
          )}
          {consignor.phone && (
            <a href={`tel:${consignor.phone}`} className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gold/70" strokeWidth={1.5} />
              {consignor.phone}
            </a>
          )}
          {consignor.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 text-gold/70" strokeWidth={1.5} />
              <span className="whitespace-pre-line">{consignor.address}</span>
            </div>
          )}
          {!consignor.email && !consignor.phone && !consignor.address && (
            <p className="text-sm text-muted-foreground">No contact info. <button onClick={openEdit} className="text-gold underline">Edit</button></p>
          )}
        </div>

        {/* Notes */}
        {consignor.notes && (
          <div className="border border-border/50 bg-card p-3">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{consignor.notes}</p>
          </div>
        )}

        {/* Financial summary */}
        {linkedWorks.length > 0 && (
          <div className="border border-border/50 bg-card p-4 space-y-2">
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-gold mb-3">Financial Summary</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Works sold</span><span>{soldWorks.length} of {linkedWorks.length}</span></div>
              {soldWorks.length > 0 && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total sales</span><span>{formatCurrency(totalSales, 'USD')}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Consignor share</span><span>{formatCurrency(Math.round(totalConsignorShare), 'USD')}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Paid out</span><span>{formatCurrency(totalPaidOut, 'USD')}</span></div>
                  <div className="flex justify-between font-medium border-t border-border/50 pt-1 mt-1">
                    <span>Outstanding</span>
                    <span className={outstanding < 0 ? 'text-destructive' : outstanding === 0 ? 'text-success' : ''}>
                      {formatCurrency(Math.round(outstanding), 'USD')}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Linked works */}
        <div>
          <h3 className="text-[10px] font-medium uppercase tracking-wider text-gold mb-3">Works ({linkedWorks.length})</h3>
          {linkedWorks.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No works from this consignor</p>
              <Button
                onClick={() => navigate('/works/new')}
                className="h-11 bg-gold px-8 text-sm font-medium uppercase tracking-widest text-gold-foreground hover:bg-gold/90"
              >
                Add a Work
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedWorks.map((work) => (
                <button
                  key={work.id}
                  onClick={() => navigate(`/works/${work.id}`)}
                  className="flex w-full items-start gap-3 border border-border/50 bg-card p-3 text-left hover:bg-secondary transition-colors"
                >
                  {work.coverPhotoUrl ? (
                    <img src={work.coverPhotoUrl} alt="" className="h-[56px] w-[56px] object-cover" />
                  ) : (
                    <div className="flex h-[56px] w-[56px] items-center justify-center bg-secondary">
                      <ImagePlus className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-semibold">{work.artist}</p>
                    <p className="truncate text-sm">{work.title}</p>
                    <StatusBadge status={work.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader><SheetTitle>Edit Consignor</SheetTitle></SheetHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={200} className="h-11 bg-card border-border/60" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-11 bg-card border-border/60" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="h-11 bg-card border-border/60" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={editAddress} onChange={(e) => setEditAddress(e.target.value)} maxLength={500} rows={3} className="bg-card border-border/60" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} maxLength={2000} rows={3} className="bg-card border-border/60" />
            </div>
            <Button onClick={handleSaveEdit} className="w-full h-11 bg-gold text-gold-foreground hover:bg-gold/90" disabled={!editName.trim()}>Save</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this consignor?</DialogTitle>
            <DialogDescription>
              Their works will not be deleted, but they will no longer be linked to a consignor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
