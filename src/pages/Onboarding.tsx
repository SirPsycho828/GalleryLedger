import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
      // Gallery name will sync when online
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Welcome to GalleryLedger</h1>
            <p className="mt-2 text-sm text-muted-foreground">What's your gallery called?</p>
          </div>

          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="galleryName">Gallery name</Label>
              <Input
                id="galleryName"
                value={galleryName}
                onChange={(e) => setGalleryName(e.target.value)}
                maxLength={100}
                required
                autoFocus
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={!galleryName.trim() || loading}>
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">You're all set</h1>
        <p className="text-sm text-muted-foreground">
          Add your first work to see GalleryLedger in action
        </p>

        <div className="space-y-3">
          <Button className="w-full h-11" onClick={() => navigate('/works/new')}>
            Add your first work
          </Button>
          <Button
            variant="ghost"
            className="w-full h-11 text-muted-foreground"
            onClick={() => navigate('/')}
          >
            I'll do this later
          </Button>
        </div>
      </div>
    </div>
  )
}
