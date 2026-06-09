import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'

export default function Onboarding() {
  const { gallery, updateGalleryName } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(gallery?.name ? 2 : 1)
  const [galleryName, setGalleryName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleNameSubmit(e: FormEvent) {
    e.preventDefault()
    if (!galleryName.trim()) return
    setLoading(true)
    try {
      await updateGalleryName(galleryName.trim())
      setStep(2)
    } catch {
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.04] blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm"
        >
          <div className="mb-12 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">Welcome to</p>
            <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">
              Gallery<span className="text-gold">Ledger</span>
            </h1>
            <div className="mx-auto mt-4 h-px w-12 bg-gold/40" />
            <p className="mt-4 text-sm text-muted-foreground">
              What's your gallery called?
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            <div className={`h-1.5 w-1.5 rounded-full ${step === 1 ? 'bg-gold' : 'bg-gold/30'}`} />
            <div className={`h-1.5 w-1.5 rounded-full ${step === 2 ? 'bg-gold' : 'bg-gold/30'}`} />
          </div>

          <form onSubmit={handleNameSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="galleryName" className="text-xs uppercase tracking-widest text-muted-foreground">
                Gallery Name
              </Label>
              <Input
                id="galleryName"
                value={galleryName}
                onChange={(e) => setGalleryName(e.target.value)}
                maxLength={100}
                required
                autoFocus
                placeholder="e.g. Pace Gallery"
                className="h-12 border-border/60 bg-card px-4 text-foreground transition-colors placeholder:text-muted-foreground/40 focus-visible:border-gold focus-visible:ring-gold/30"
              />
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-gold text-[13px] font-medium uppercase tracking-[0.08em] text-gold-foreground transition-all hover:bg-gold/90"
              disabled={!galleryName.trim() || loading}
            >
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </form>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/[0.04] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm text-center"
      >
        <div className="flex justify-center gap-2 mb-6">
          <div className={`h-1.5 w-1.5 rounded-full ${step === 1 ? 'bg-gold' : 'bg-gold/30'}`} />
          <div className={`h-1.5 w-1.5 rounded-full ${step === 2 ? 'bg-gold' : 'bg-gold/30'}`} />
        </div>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-gold/20 bg-gold/5">
          <svg className="h-7 w-7 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="font-heading text-3xl font-medium tracking-tight">You're All Set</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Add your first work to begin building your collection's provenance
        </p>

        <div className="mt-8 space-y-3">
          <Button
            className="h-12 w-full bg-gold text-[13px] font-medium uppercase tracking-[0.08em] text-gold-foreground transition-all hover:bg-gold/90"
            onClick={() => navigate('/works/new')}
          >
            Add Your First Work
          </Button>
          <Button
            variant="ghost"
            className="h-12 w-full text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/')}
          >
            I'll do this later
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
