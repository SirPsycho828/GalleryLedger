import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  sticky?: boolean
  actions?: React.ReactNode
}

export function TopBar({ title, showBack, onBack, sticky = true, actions }: TopBarProps) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!sticky) return
    function onScroll() {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sticky])

  function handleBack() {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <header
      className={cn(
        'flex h-14 items-center px-4 transition-colors duration-200',
        sticky && 'sticky top-0 z-40',
        'bg-background/95 backdrop-blur-xl md:bg-background md:backdrop-blur-none',
        scrolled ? 'border-b border-border/60' : 'border-b border-border/30'
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
