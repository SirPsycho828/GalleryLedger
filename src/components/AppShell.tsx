import { Outlet, useLocation, useNavigate } from 'react-router'
import { Image, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OfflineBanner } from '@/components/OfflineBanner'
import { motion } from 'framer-motion'
import { useScrollDirection } from '@/hooks/useScrollDirection'

const tabs = [
  { path: '/works', icon: Image, label: 'Works' },
  { path: '/consignors', icon: Users, label: 'Consignors' },
  { path: '/settings', icon: Settings, label: 'Settings' },
] as const

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const navHidden = useScrollDirection()

  function isActive(path: string) {
    if (path === '/works') return location.pathname === '/works' || location.pathname.startsWith('/works/')
    return location.pathname.startsWith(path)
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop/Tablet sidebar (>= 768px) */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-[72px] flex-col items-center border-r border-border/50 bg-background/95 backdrop-blur-xl py-6">
        {/* GL Monogram */}
        <button
          onClick={() => navigate('/works')}
          className="mb-8 font-heading text-lg font-medium text-gold tracking-tight"
        >
          GL
        </button>

        {/* Nav items */}
        <div className="flex flex-1 flex-col items-center gap-1">
          {tabs.map((tab) => {
            const active = isActive(tab.path)
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 py-3 px-2 w-full transition-colors',
                  active ? 'text-gold' : 'text-muted-foreground hover:text-foreground/70'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-2 bottom-2 w-0.5 bg-gold"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <tab.icon className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-[9px] font-medium uppercase tracking-wider">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 md:ml-[72px]">
        <OfflineBanner />
        <main className="flex-1 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav (< 768px) */}
      <motion.nav
        initial={false}
        animate={{ y: navHidden ? 80 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
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
      </motion.nav>
    </div>
  )
}
