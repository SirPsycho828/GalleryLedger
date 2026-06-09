import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { TourOverlay, type TourStop } from '@/components/tour/TourOverlay'

export const STORAGE_KEY = 'gl-tour-completed'

interface TourContextValue {
  isTourActive: boolean
  startTour: () => void
  endTour: () => void
  resumeAtStep: (step: number) => void
  currentStep: number
  totalSteps: number
  pendingStep: number | null
  firstWorkId: string | null
  setFirstWorkId: (id: string | null) => void
}

const TourContext = createContext<TourContextValue | null>(null)

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within TourProvider')
  return ctx
}

const BASE_STOPS: TourStop[] = [
  {
    target: 'nav-works',
    title: 'Your Collection',
    content: 'All artwork in your gallery lives here. Filter by status and tap any piece to see its full provenance.',
  },
  {
    target: 'add-work',
    title: 'Intake a Work',
    content: 'Tap here to document a new artwork \u2014 photos, details, condition assessment, and consignor signature.',
  },
  {
    target: 'nav-consignors',
    title: 'Consignors',
    content: 'Track the artists and owners who entrust works to your gallery. See their linked works and financial summary.',
  },
  {
    target: 'nav-settings',
    title: 'Settings',
    content: 'Manage your gallery name, account, and replay this tour anytime.',
  },
]

const DETAIL_STOPS: TourStop[] = [
  {
    target: 'fab-add-event',
    title: 'Build Provenance',
    content: 'Every condition change, location move, sale, and payout is logged here. This timeline is your dispute-proof record.',
  },
  {
    target: 'export-provenance',
    title: 'Export a Provenance Pack',
    content: 'Generate a PDF report with the full timeline, photos, and financials \u2014 ready for buyers, insurers, or legal.',
  },
]

export function TourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [active, setActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [pendingStep, setPendingStep] = useState<number | null>(null)
  const [firstWorkId, setFirstWorkId] = useState<string | null>(null)

  const stops = useMemo(
    () => (firstWorkId ? [...BASE_STOPS, ...DETAIL_STOPS] : BASE_STOPS),
    [firstWorkId],
  )

  const endTour = useCallback(() => {
    setActive(false)
    setCurrentStep(0)
    setPendingStep(null)
    localStorage.setItem(STORAGE_KEY, 'true')
  }, [])

  const startTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setCurrentStep(0)
    setPendingStep(null)
    setActive(true)
  }, [])

  const handleNext = useCallback(() => {
    const nextStep = currentStep + 1

    if (nextStep === BASE_STOPS.length && firstWorkId) {
      setPendingStep(nextStep)
      setActive(false)
      navigate(`/works/${firstWorkId}`)
      return
    }

    if (nextStep >= stops.length) {
      endTour()
      if (location.pathname.startsWith('/works/') && location.pathname !== '/works/new') {
        navigate('/works')
      }
      return
    }

    setCurrentStep(nextStep)
  }, [currentStep, stops.length, firstWorkId, endTour, navigate, location.pathname])

  const resumeAtStep = useCallback((step: number) => {
    setCurrentStep(step)
    setPendingStep(null)
    setActive(true)
  }, [])

  useEffect(() => {
    if (!active) return
    const isOnWorksPage = location.pathname === '/works'
    const isOnWorkDetail = location.pathname.startsWith('/works/') && location.pathname !== '/works/new'
    const isDetailStep = currentStep >= BASE_STOPS.length

    if (isDetailStep && !isOnWorkDetail) {
      setActive(false)
      setCurrentStep(0)
    } else if (!isDetailStep && !isOnWorksPage) {
      setActive(false)
      setCurrentStep(0)
    }
  }, [location.pathname, active, currentStep])

  return (
    <TourContext.Provider
      value={{
        isTourActive: active,
        startTour,
        endTour,
        resumeAtStep,
        currentStep,
        totalSteps: stops.length,
        pendingStep,
        firstWorkId,
        setFirstWorkId,
      }}
    >
      {children}
      {active && (
        <TourOverlay
          stops={stops}
          currentStep={currentStep}
          onNext={handleNext}
          onSkip={endTour}
        />
      )}
    </TourContext.Provider>
  )
}

export function isTourCompleted(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}
