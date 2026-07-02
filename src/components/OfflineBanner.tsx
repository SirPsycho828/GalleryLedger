import { useEffect, useState } from 'react'
import { getPendingCount, subscribeToQueueChanges } from '@/lib/uploadQueue'

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [queueCount, setQueueCount] = useState(0)

  useEffect(() => {
    function handleOnline() {
      setOffline(false)
    }
    function handleOffline() {
      setOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    function refresh() {
      getPendingCount().then(setQueueCount)
    }
    refresh()
    const unsub = subscribeToQueueChanges(refresh)
    return unsub
  }, [])

  if (!offline && queueCount === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex h-8 items-center justify-center gap-2 border-b border-warning/20 bg-warning/10 text-sm text-warning">
      {offline
        ? 'You\u2019re offline. Changes will sync when you reconnect.'
        : `Uploading ${queueCount} file${queueCount !== 1 ? 's' : ''}...`}
    </div>
  )
}
