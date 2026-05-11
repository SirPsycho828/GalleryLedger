import { Outlet, useLocation, useNavigate } from 'react-router'
import { Image, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OfflineBanner } from '@/components/OfflineBanner'
import { motion } from 'framer-motion'

const tabs = [
  { path: '/', icon: Image, label: 'Works' },
  { path: '/consignors', icon: Users, label: 'Consignors' },
  { path: '/settings', icon: Settings, label: 'Settings' },
] as const

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()

  function isActive(path: string) {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/works')
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation — dark glass with gold accents */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-16 max-w-[640px] items-center justify-around">
          {tabs.map((tab) => {
            const active = isActive(tab.path)
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 py-2 px-5 min-w-[72px] transition-colors',
                  active ? 'text-gold' : 'text-muted-foreground hover:text-foreground/70'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-px left-3 right-3 h-px bg-gold"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
