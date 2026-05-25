import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface ConnectivityContextType {
  isOnline: boolean
  lastOnlineAt: string | null
}

const ConnectivityContext = createContext<ConnectivityContextType>({
  isOnline: navigator.onLine,
  lastOnlineAt: null
})

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'
const HEARTBEAT_INTERVAL = 15_000 // 15 seconds — faster reconnect detection
const HEARTBEAT_OFFLINE_INTERVAL = 8_000 // 8 seconds when offline — quicker reconnect

export function ConnectivityProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastOnlineAt, setLastOnlineAt] = useState<string | null>(null)
  const isOnlineRef = React.useRef(isOnline)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      isOnlineRef.current = true
      setLastOnlineAt(new Date().toISOString())
    }
    const handleOffline = () => {
      setIsOnline(false)
      isOnlineRef.current = false
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Heartbeat: verify actual API connectivity (not just network)
    // Uses shorter interval when offline for faster reconnect detection
    let heartbeat: ReturnType<typeof setInterval>

    // Run an immediate check on mount so isOnline reflects reality quickly
    const checkOnce = async (): Promise<void> => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 4000)
        const resp = await fetch(`${API_BASE}/health`, {
          signal: controller.signal,
          method: 'HEAD',
          cache: 'no-store'
        })
        clearTimeout(timeout)
        // Any HTTP response (even 4xx) means we reached the server → online
        if (resp.status < 600) {
          if (!isOnlineRef.current) {
            setIsOnline(true)
            isOnlineRef.current = true
          }
          setLastOnlineAt(new Date().toISOString())
        }
      } catch {
        // On error, fall back to navigator.onLine — don't blindly declare offline
        // (could be a CORS issue or transient failure, not a real network outage)
        const navOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
        if (!navOnline && isOnlineRef.current) {
          setIsOnline(false)
          isOnlineRef.current = false
        }
      }
    }

    // Run immediately then start interval
    checkOnce()

    const startHeartbeat = () => {
      clearInterval(heartbeat)
      const interval = isOnlineRef.current ? HEARTBEAT_INTERVAL : HEARTBEAT_OFFLINE_INTERVAL
      heartbeat = setInterval(async () => {
        try {
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 4000)
          const resp = await fetch(`${API_BASE}/health`, {
            signal: controller.signal,
            method: 'HEAD',
            cache: 'no-store'
          })
          clearTimeout(timeout)
          if (resp.status < 600) {
            if (!isOnlineRef.current) {
              setIsOnline(true)
              isOnlineRef.current = true
              setLastOnlineAt(new Date().toISOString())
              startHeartbeat()
            } else {
              setLastOnlineAt(new Date().toISOString())
            }
          }
        } catch {
          // Only mark offline if navigator also reports offline
          // Prevents false-offline from CORS errors or transient failures
          const navOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
          if (!navOnline && isOnlineRef.current) {
            setIsOnline(false)
            isOnlineRef.current = false
            startHeartbeat()
          }
        }
      }, interval)
    }

    startHeartbeat()

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
