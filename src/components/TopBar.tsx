import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  sticky?: boolean
  actions?: React.ReactNode
}

export function TopBar({ title, showBack, onBack, sticky, actions }: TopBarProps) {
  const navigate = useNavigate()

  function handleBack() {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <header
      className={cn(
        'flex h-14 items-center border-b border-border/50 bg-background/95 backdrop-blur-xl px-4',
        sticky && 'sticky top-0 z-40'
      )}
    >
      {showBack && (
        <button
          onClick={handleBack}
          className="mr-2 flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>
      )}
      <h1 className="flex-1 truncate font-heading text-lg font-medium tracking-tight">{title}</h1>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </header>
  )
}
