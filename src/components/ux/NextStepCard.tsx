import { useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NextStepCardProps {
  title: string
  description: string
  to: string
  actionLabel?: string
  icon?: React.ReactNode
  className?: string
}

export function NextStepCard({
  title,
  description,
  to,
  actionLabel,
  icon,
  className,
}: NextStepCardProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(to)}
      className={cn(
        'flex w-full items-center gap-4 border-l-2 border-l-gold/50 bg-card px-4 py-3.5 text-left transition-colors hover:bg-secondary',
        className
      )}
    >
      {icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold/20 bg-gold/5 text-gold">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-gold/70">
        <span className="hidden sm:inline">{actionLabel ?? title}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </button>
  )
}
