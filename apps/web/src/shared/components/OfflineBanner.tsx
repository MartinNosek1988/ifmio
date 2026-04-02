import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Shows a banner when the user is offline.
 * Auto-hides when connection is restored.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div style={{
      background: 'var(--warning, #f59e0b)',
      color: '#fff',
      padding: '6px 16px',
      fontSize: '0.82rem',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      <WifiOff size={14} />
      Offline — změny budou uloženy po obnovení připojení
    </div>
  )
}
