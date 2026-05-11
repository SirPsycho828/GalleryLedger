import { useRef, useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface SignatureCaptureProps {
  open: boolean
  onClose: () => void
  onComplete: (blob: Blob) => void
}

export function SignatureCapture({ open, onClose, onComplete }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)

  // Set up canvas with high-DPI scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    if (open) {
      setHasStrokes(false)
      // Delay to allow DOM to render
      requestAnimationFrame(() => {
        setupCanvas()
      })
    }
  }, [open, setupCanvas])

  // Handle resize
  useEffect(() => {
    if (!open) return
    const handleResize = () => setupCanvas()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [open, setupCanvas])

  function getCanvasCoords(e: React.PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    setHasStrokes(true)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCanvasCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)

    // Capture pointer for reliable tracking
    canvas.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCanvasCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function handlePointerUp() {
    setIsDrawing(false)
  }

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    setHasStrokes(false)
  }

  function handleDone() {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (blob) {
        onComplete(blob)
      }
    }, 'image/png')
  }

  function handleClose() {
    if (hasStrokes) {
      setShowDiscard(true)
    } else {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Toolbar */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <button onClick={handleClose} className="flex h-11 w-11 items-center justify-center">
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
          <Button size="sm" onClick={handleDone} disabled={!hasStrokes}>
            Done
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 p-4">
        <canvas
          ref={canvasRef}
          className="h-full w-full rounded-md border border-border bg-white cursor-crosshair"
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {/* Instruction text */}
      <div className="pb-4 text-center">
        <p className="text-sm text-muted-foreground">
          Sign above to acknowledge condition at intake
        </p>
      </div>

      {/* Discard confirmation */}
      <Dialog open={showDiscard} onOpenChange={setShowDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard signature?</DialogTitle>
            <DialogDescription>Your signature will not be saved.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscard(false)}>Keep</Button>
            <Button variant="destructive" onClick={() => { setShowDiscard(false); onClose() }}>Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
