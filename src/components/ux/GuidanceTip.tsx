import { useState } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GuidanceTipProps {
  id: string
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function GuidanceTip({ id, children, icon, className }: GuidanceTipProps) {
  const storageKey = `ux-tip-${id}`
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(storageKey) === 'true')

  if (dismissed) return null

  function handleDismiss() {
    localStorage.setItem(storageKey, 'true')
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'flex items-start gap-3 border border-gold/15 bg-gold/[0.04] px-3.5 py-3 text-sm',
            className
          )}
        >
          <span className="mt-0.5 shrink-0 text-gold/60">
            {icon ?? <Lightbulb className="h-3.5 w-3.5" />}
          </span>
          <p className="flex-1 text-muted-foreground leading-relaxed">{children}</p>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-muted-foreground/50 transition-colors hover:text-foreground"
            aria-label="Dismiss tip"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
