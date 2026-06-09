import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TourTooltip } from './TourTooltip'

export interface TourStop {
  target: string
  title: string
  content: string
}

interface TourOverlayProps {
  stops: TourStop[]
  currentStep: number
  onNext: () => void
  onSkip: () => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 6
const TOOLTIP_GAP = 12

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function computePlacement(rect: Rect): 'top' | 'bottom' | 'left' | 'right' {
  const viewH = window.innerHeight
  if (rect.left < 80 && rect.width < 80) return 'right'
  if (rect.top > viewH - 100) return 'top'
  const spaceBelow = viewH - (rect.top + rect.height)
  if (spaceBelow > 160) return 'bottom'
  if (rect.top > 160) return 'top'
  return 'bottom'
}

function computeTooltipPosition(
  rect: Rect,
  placement: 'top' | 'bottom' | 'left' | 'right',
): { top: number; left: number } {
  const tooltipWidth = Math.min(320, window.innerWidth - 32)

  switch (placement) {
    case 'bottom':
      return {
        top: rect.top + rect.height + TOOLTIP_GAP,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - tooltipWidth - 16)),
      }
    case 'top':
      return {
        top: rect.top - TOOLTIP_GAP - 170, // approximate: title + 2-line content + dots/buttons + padding
        left: Math.max(16, Math.min(rect.left, window.innerWidth - tooltipWidth - 16)),
      }
    case 'right':
      return {
        top: Math.max(16, rect.top - 8),
        left: rect.left + rect.width + TOOLTIP_GAP,
      }
    case 'left':
      return {
        top: Math.max(16, rect.top - 8),
        left: rect.left - tooltipWidth - TOOLTIP_GAP,
      }
  }
}

export function TourOverlay({ stops, currentStep, onNext, onSkip }: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const stop = stops[currentStep]

  const updateRect = useCallback(() => {
    if (!stop) return
    const rect = getTargetRect(stop.target)
    if (rect) {
      setTargetRect(rect)
    }
    // Don't call onNext here — only the mount effect handles missing targets.
    // The resize handler should silently ignore a disappeared element.
  }, [stop])

  useEffect(() => {
    if (!stop) return

    const el = document.querySelector(`[data-tour="${stop.target}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const timer = setTimeout(() => {
        requestAnimationFrame(updateRect)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      onNext()
    }
  }, [stop, updateRect, onNext])

  // Recalculate on resize
  useEffect(() => {
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [updateRect])

  // Escape key dismisses the tour
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onSkip()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSkip])

  if (!stop || !targetRect) return null

  const placement = computePlacement(targetRect)
  const tooltipPos = computeTooltipPosition(targetRect, placement)

  const cutout = {
    top: targetRect.top - PADDING,
    left: targetRect.left - PADDING,
    width: targetRect.width + PADDING * 2,
    height: targetRect.height + PADDING * 2,
  }

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[10000]"
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            clipPath: `polygon(
              0% 0%, 0% 100%, ${cutout.left}px 100%,
              ${cutout.left}px ${cutout.top}px,
              ${cutout.left + cutout.width}px ${cutout.top}px,
              ${cutout.left + cutout.width}px ${cutout.top + cutout.height}px,
              ${cutout.left}px ${cutout.top + cutout.height}px,
              ${cutout.left}px 100%, 100% 100%, 100% 0%
            )`,
          }}
          onClick={onSkip}
        />

        <motion.div
          className="absolute border border-gold/20"
          animate={{
            top: cutout.top,
            left: cutout.left,
            width: cutout.width,
            height: cutout.height,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ pointerEvents: 'none' }}
        />

        <TourTooltip
          title={stop.title}
          content={stop.content}
          currentStep={currentStep}
          totalSteps={stops.length}
          onNext={onNext}
          onSkip={onSkip}
          position={tooltipPos}
          placement={placement}
        />
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
