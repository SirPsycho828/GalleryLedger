import { Outlet, useLocation, useNavigate } from 'react-router'
import { Image, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OfflineBanner } from '@/components/OfflineBanner'

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

      {/* Bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-16 max-w-[640px] items-center justify-around">
          {tabs.map((tab) => {
            const active = isActive(tab.path)
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-[64px]',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <tab.icon className="h-6 w-6" strokeWidth={1.5} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
