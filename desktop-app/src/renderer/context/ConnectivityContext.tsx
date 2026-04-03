import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface ConnectivityContextType {
  isOnline: boolean
  lastOnlineAt: string | null
}

const ConnectivityContext = createContext<ConnectivityContextType>({
  isOnline: navigator.onLine,
  lastOnlineAt: null
})

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'
const HEARTBEAT_INTERVAL = 30_000 // 30 seconds

export function ConnectivityProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastOnlineAt, setLastOnlineAt] = useState<string | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastOnlineAt(new Date().toISOString())
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Heartbeat: verify actual API connectivity (not just network)
    const heartbeat = setInterval(async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 5000)
        await fetch(`${API_BASE}/health`, { signal: controller.signal })
        clearTimeout(timeout)
        setIsOnline(true)
        setLastOnlineAt(new Date().toISOString())
      } catch {
        setIsOnline(false)
      }
    }, HEARTBEAT_INTERVAL)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(heartbeat)
    }
  }, [])

  return (
    <ConnectivityContext.Provider value={{ isOnline, lastOnlineAt }}>
      {children}
    </ConnectivityContext.Provider>
  )
}

export function useConnectivity(): ConnectivityContextType {
  return useContext(ConnectivityContext)
}
