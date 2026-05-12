import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Camera, X, Plus, PenTool } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import {
  createWork,
  createEvent,
  createPhotoDoc,
  uploadPhoto,
  generateFileName,
  subscribeToConsignors,
  subscribeToWorks,
  incrementConsignorWorkCount,
  uploadSignature,
} from '@/lib/services'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SignatureCapture } from '@/components/SignatureCapture'
import type { Consignor, ConditionRating, Work } from '@/types'
import { CONDITION_RATINGS, CONDITION_CHECKLIST_ITEMS } from '@/types'

const CONDITION_LABELS: Record<ConditionRating, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

interface PhotoFile {
  file: File
  preview: string
}

export default function WorkIntake() {
  const { gallery } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [photos, setPhotos] = useState<PhotoFile[]>([])
  const [artist, setArtist] = useState('')
  const [title, setTitle] = useState('')
  const [medium, setMedium] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [year, setYear] = useState('')
  const [consignorId, setConsignorId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [condition, setCondition] = useState<ConditionRating | null>(null)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [checklistNotes, setChecklistNotes] = useState<Record<string, string>>({})
  const [conditionNotes, setConditionNotes] = useState('')

  // UI state
  const [consignors, setConsignors] = useState<Consignor[]>([])
  const [existingWorks, setExistingWorks] = useState<Work[]>([])
  const [saving, setSaving] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const [showNewConsignor, setShowNewConsignor] = useState(false)
  const [newConsignorName, setNewConsignorName] = useState('')
  const [newConsignorEmail, setNewConsignorEmail] = useState('')
  const [newConsignorPhone, setNewConsignorPhone] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Signature state
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const [showSignature, setShowSignature] = useState(false)

  // Load consignors and existing works for autocomplete
  useEffect(() => {
    if (!gallery) return
    const unsub1 = subscribeToConsignors(gallery.id, setConsignors)
    const unsub2 = subscribeToWorks(gallery.id, setExistingWorks)
    return () => { unsub1(); unsub2() }
  }, [gallery])

  // Artist autocomplete suggestions
  const artistSuggestions = [...new Set(existingWorks.map((w) => w.artist))].filter(Boolean)

  const isModified = artist || title || medium || dimensions || year || notes || condition || photos.length > 0 || consignorId || signatureBlob

  function handleBack() {
    if (isModified) {
      setShowDiscard(true)
    } else {
      navigate(-1)
    }
  }

  function handlePhotos(files: FileList | null) {
    if (!files) return
    const remaining = 20 - photos.length
    const newFiles = Array.from(files).slice(0, remaining)
    const newPhotos = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...newPhotos])
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!artist.trim()) newErrors.artist = 'Artist name is required'
    if (!title.trim()) newErrors.title = 'Title is required'
    if (!condition) newErrors.condition = 'Select a condition rating'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      // Scroll to first error
      const firstErrorEl = document.querySelector('[data-error]')
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    if (!gallery) return
    setSaving(true)

    try {
      // Create the work document first (cover photo set after upload)
      const workId = await createWork(gallery.id, {
        artist: artist.trim(),
        title: title.trim(),
        medium: medium.trim(),
        dimensions: dimensions.trim(),
        year: year.trim(),
        consignorId,
        notes: notes.trim(),
        coverPhotoUrl: null,
      })

      // Upload photos and create photo docs
      const photoUrls: string[] = []
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        const ext = photo.file.name.split('.').pop() || 'jpg'
        const fileName = generateFileName(ext)
        try {
          const { url, path } = await uploadPhoto(gallery.id, workId, photo.file, fileName)
          await createPhotoDoc(gallery.id, workId, {
            storageUrl: url,
            storagePath: path,
            fileName,
            takenAt: Timestamp.now(),
            eventId: null,
            sortOrder: i,
          })
          photoUrls.push(url)

          // Set cover photo to first uploaded photo
          if (i === 0) {
            const { updateWork } = await import('@/lib/services')
            await updateWork(gallery.id, workId, { coverPhotoUrl: url })
          }
        } catch {
          // Photo upload failed - continue with others
          toast.error(`Failed to upload photo ${i + 1}`)
        }
      }

      // Build condition checklist data
      const checklistData: Record<string, string> = {}
      for (const [item, checked] of Object.entries(checklist)) {
        if (checked) {
          checklistData[item] = checklistNotes[item] || ''
        }
      }

      // Upload signature if captured
      let signatureUrl: string | null = null
      if (signatureBlob) {
        try {
          const sigResult = await uploadSignature(gallery.id, workId, signatureBlob)
          signatureUrl = sigResult.url
        } catch {
          toast.error('Failed to upload signature')
        }
      }

      // Create intake event
      const description = `Work received \u2014 condition: ${CONDITION_LABELS[condition!]}`
      await createEvent(gallery.id, workId, 'intake', description, {
        conditionSummary: condition!,
        conditionNotes: conditionNotes.trim(),
        checklist: checklistData,
        signatureUrl,
      }, photoUrls)

      // Update consignor work count
      if (consignorId) {
        await incrementConsignorWorkCount(gallery.id, consignorId, 1)
      }

      toast.success('Work added')
      navigate(`/works/${workId}`, { replace: true })
    } catch (err) {
      console.error('Failed to save work:', err)
      toast.error('Failed to save work')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateConsignor() {
    if (!gallery || !newConsignorName.trim()) return
    try {
      const { createConsignor } = await import('@/lib/services')
      const id = await createConsignor(gallery.id, {
        name: newConsignorName.trim(),
        email: newConsignorEmail.trim(),
        phone: newConsignorPhone.trim(),
        address: '',
        notes: '',
      })
      setConsignorId(id)
      setShowNewConsignor(false)
      setNewConsignorName('')
      setNewConsignorEmail('')
      setNewConsignorPhone('')
      toast.success('Consignor added')
    } catch {
      toast.error('Failed to create consignor')
    }
  }

  return (
    <div>
      <TopBar title="New Work" showBack onBack={handleBack} />

      <form onSubmit={handleSubmit} className="mx-auto max-w-[640px] px-4 pt-4 pb-8 space-y-6">
        {/* Section 1: Photos */}
        <div>
          <h2 className="font-heading text-base font-medium mb-3">Photos</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((photo, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={photo.preview} alt="" className="h-20 w-20 object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background text-foreground text-xs border border-border"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 20 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-20 w-20 flex-shrink-0 items-center justify-center border-2 border-dashed border-border/50 hover:border-gold/50 transition-colors"
              >
                <Camera className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handlePhotos(e.target.files)}
          />
        </div>

        {/* Section 2: Work Details */}
        <div className="space-y-4">
          <h2 className="font-heading text-base font-medium">Work Details</h2>

          <div className="space-y-2" data-error={errors.artist ? '' : undefined}>
            <Label htmlFor="artist">Artist *</Label>
            <Input
              id="artist"
              value={artist}
              onChange={(e) => { setArtist(e.target.value); setErrors((prev) => ({ ...prev, artist: '' })) }}
              maxLength={200}
              list="artist-suggestions"
              className="h-11"
            />
            <datalist id="artist-suggestions">
              {artistSuggestions.map((a) => <option key={a} value={a} />)}
            </datalist>
            {errors.artist && <p className="text-xs text-destructive">{errors.artist}</p>}
          </div>

          <div className="space-y-2" data-error={errors.title ? '' : undefined}>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => { setTitle(e.target.value); setErrors((prev) => ({ ...prev, title: '' })) }} maxLength={200} className="h-11" />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="medium">Medium</Label>
            <Input id="medium" value={medium} onChange={(e) => setMedium(e.target.value)} maxLength={200} placeholder="Oil on canvas" className="h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input id="dimensions" value={dimensions} onChange={(e) => setDimensions(e.target.value)} maxLength={100} placeholder="24 x 36 in" className="h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input id="year" value={year} onChange={(e) => setYear(e.target.value)} maxLength={20} placeholder="2024" className="h-11" />
          </div>

          <div className="space-y-2">
            <Label>Consignor</Label>
            <Select value={consignorId || ''} onValueChange={(val) => {
              if (val === '__new__') {
                setShowNewConsignor(true)
              } else {
                setConsignorId(val || null)
              }
            }}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select consignor" />
              </SelectTrigger>
              <SelectContent>
                {consignors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                <SelectItem value="__new__">
                  <span className="flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add new consignor
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} rows={4} />
          </div>
        </div>

        {/* Section 3: Condition Assessment */}
        <div className="space-y-4">
          <h2 className="font-heading text-base font-medium">Condition Assessment</h2>

          <div data-error={errors.condition ? '' : undefined}>
            <Label className="mb-2 block">Overall Condition *</Label>
            <div className="flex gap-2 flex-wrap">
              {CONDITION_RATINGS.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => { setCondition(rating); setErrors((prev) => ({ ...prev, condition: '' })) }}
                  className={cn(
                    'px-4 py-2 text-sm font-medium border transition-colors',
                    condition === rating
                      ? 'bg-gold/10 text-gold border-gold/30'
                      : 'bg-secondary text-foreground border-border/50 hover:border-border'
                  )}
                >
                  {CONDITION_LABELS[rating]}
                </button>
              ))}
            </div>
            {errors.condition && <p className="text-xs text-destructive mt-1">{errors.condition}</p>}
          </div>

          <div>
            <Label className="mb-2 block">Condition Checklist</Label>
            <div className="space-y-2">
              {CONDITION_CHECKLIST_ITEMS.map((item) => (
                <div key={item}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`check-${item}`}
                      checked={checklist[item] || false}
                      onCheckedChange={(checked) => setChecklist((prev) => ({ ...prev, [item]: !!checked }))}
                    />
                    <label htmlFor={`check-${item}`} className="text-sm cursor-pointer">{item}</label>
                  </div>
                  {checklist[item] && (
                    <Input
                      value={checklistNotes[item] || ''}
                      onChange={(e) => setChecklistNotes((prev) => ({ ...prev, [item]: e.target.value }))}
                      placeholder={`Describe ${item.toLowerCase()}`}
                      maxLength={500}
                      className="mt-1 ml-6 h-9 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conditionNotes">Additional Condition Notes</Label>
            <Textarea
              id="conditionNotes"
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Any other condition observations..."
            />
          </div>
        </div>

        {/* Section 4: Signature */}
        <div>
          <h2 className="font-heading text-base font-medium mb-2">Signature</h2>
          <p className="text-xs text-muted-foreground mb-2">Optional — confirms consignor acknowledgment of condition at intake</p>
          {signaturePreview ? (
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-border bg-white p-2">
                <img src={signaturePreview} alt="Signature" className="h-16 w-auto" />
              </div>
              <div className="flex flex-col gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowSignature(true)}>
                  Redo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (signaturePreview) URL.revokeObjectURL(signaturePreview)
                    setSignatureBlob(null)
                    setSignaturePreview(null)
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="h-11" onClick={() => setShowSignature(true)}>
              <PenTool className="mr-2 h-4 w-4" />
              Capture consignor signature
            </Button>
          )}
        </div>

        {showSignature && (
          <SignatureCapture
            onDone={(blob) => {
              if (signaturePreview) URL.revokeObjectURL(signaturePreview)
              setSignatureBlob(blob)
              setSignaturePreview(URL.createObjectURL(blob))
              setShowSignature(false)
            }}
            onClose={() => setShowSignature(false)}
          />
        )}

        {/* Save button */}
        <Button type="submit" className="w-full h-11 bg-gold text-sm font-medium uppercase tracking-widest text-gold-foreground hover:bg-gold/90" disabled={saving}>
          {saving ? 'Saving...' : 'Save Work'}
        </Button>
      </form>

      {/* Discard confirmation */}
      <Dialog open={showDiscard} onOpenChange={setShowDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard this work?</DialogTitle>
            <DialogDescription>Your changes will be lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscard(false)}>Keep editing</Button>
            <Button variant="destructive" onClick={() => navigate(-1)}>Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New consignor sheet */}
      <Sheet open={showNewConsignor} onOpenChange={setShowNewConsignor}>
        <SheetContent side="bottom" className="max-h-[85vh]">
          <SheetHeader><SheetTitle>New Consignor</SheetTitle></SheetHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={newConsignorName} onChange={(e) => setNewConsignorName(e.target.value)} maxLength={200} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={newConsignorEmail} onChange={(e) => setNewConsignorEmail(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" value={newConsignorPhone} onChange={(e) => setNewConsignorPhone(e.target.value)} className="h-11" />
            </div>
            <Button onClick={handleCreateConsignor} className="w-full h-11" disabled={!newConsignorName.trim()}>
              Add Consignor
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
