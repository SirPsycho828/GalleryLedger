import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface TourTooltipProps {
  title: string
  content: string
  currentStep: number
  totalSteps: number
  onNext: () => void
  onSkip: () => void
  position: { top: number; left: number }
  placement: 'top' | 'bottom' | 'left' | 'right'
}

export function TourTooltip({
  title,
  content,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  position,
  placement,
}: TourTooltipProps) {
  const isLast = currentStep === totalSteps - 1

  return (
    <motion.div
      role="dialog"
      aria-label={`Tour step ${currentStep + 1} of ${totalSteps}: ${title}`}
      initial={{ opacity: 0, y: placement === 'top' ? -8 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: placement === 'top' ? -8 : 8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="fixed z-[10001] w-[min(320px,calc(100vw-32px))]"
      style={{ top: position.top, left: position.left }}
    >
      {/* Arrow */}
      <div
        className={cn(
          'absolute h-2.5 w-2.5 rotate-45 border-card bg-card',
          placement === 'bottom' && '-top-[5px] left-6 border-l border-t border-gold/20',
          placement === 'top' && '-bottom-[5px] left-6 border-r border-b border-gold/20',
          placement === 'left' && '-right-[5px] top-4 border-r border-t border-gold/20',
          placement === 'right' && '-left-[5px] top-4 border-l border-b border-gold/20'
        )}
      />

      <div className="border border-gold/20 bg-card p-4 shadow-lg shadow-black/40">
        <h3 className="font-heading text-base font-medium text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{content}</p>

        {/* Step dots + buttons */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  i === currentStep ? 'bg-gold' : 'bg-gold/30'
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSkip}
              aria-label="Skip tour"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip
            </button>
            <button
              onClick={onNext}
              aria-label={isLast ? 'Finish tour' : 'Next step'}
              autoFocus
              className="bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground transition-colors hover:bg-gold/90"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
