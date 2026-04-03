import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import axios from 'axios'
import { useDesktopAuth } from './DesktopAuthContext'
import { useConnectivity } from './ConnectivityContext'

export interface LicenseInfo {
  isActivated: boolean
  isValid: boolean
  licenseKey: string | null
  licenseStatus: string | null   // PENDING | ACTIVE | SUSPENDED | REVOKED | EXPIRED | NOT_FOUND
  subscriptionStatus: string | null
  subscriptionExpiresAt: string | null
  gracePeriodUntil: string | null
  daysUntilExpiry: number | null
  machineId: string | null
  label: string | null
  lastHeartbeatAt: string | null
}

interface LicenseContextType extends LicenseInfo {
  isLoading: boolean
  activateLicense: (licenseKey: string) => Promise<void>
  recheck: () => Promise<void>
}

const LicenseContext = createContext<LicenseContextType | null>(null)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'

// Allow offline use for up to 30 days after last successful heartbeat
const OFFLINE_GRACE_DAYS = 30

const EMPTY_INFO: LicenseInfo = {
  isActivated: false,
  isValid: false,
  licenseKey: null,
  licenseStatus: null,
  subscriptionStatus: null,
  subscriptionExpiresAt: null,
  gracePeriodUntil: null,
  daysUntilExpiry: null,
  machineId: null,
  label: null,
  lastHeartbeatAt: null,
}

export function LicenseProvider({ children }: { children: ReactNode }): JSX.Element {
  const { user, accessToken } = useDesktopAuth()
  const { isOnline } = useConnectivity()
  const [isLoading, setIsLoading] = useState(true)
  const [info, setInfo] = useState<LicenseInfo>(EMPTY_INFO)

  // Load cached license info from SQLite on mount
  useEffect(() => {
    const loadCached = async (): Promise<void> => {
      try {
        const cached = await window.desktopApi.license.getInfo()
        if (cached && typeof cached === 'object') {
          setInfo({
            isActivated: Boolean(cached.isActivated),
            isValid: isOfflineValid(cached),
            licenseKey: (cached.licenseKey as string) || null,
            licenseStatus: (cached.licenseStatus as string) || null,
            subscriptionStatus: (cached.subscriptionStatus as string) || null,
            subscriptionExpiresAt: (cached.subscriptionExpiresAt as string) || null,
            gracePeriodUntil: (cached.gracePeriodUntil as string) || null,
            daysUntilExpiry: typeof cached.daysUntilExpiry === 'number' ? cached.daysUntilExpiry : null,
            machineId: (cached.machineId as string) || null,
            label: (cached.label as string) || null,
            lastHeartbeatAt: (cached.lastHeartbeatAt as string) || null,
          })
        }
      } catch {
        // No cached info — new installation
      } finally {
        setIsLoading(false)
      }
    }
    loadCached()
  }, [])

  // When going online + authenticated: send heartbeat
  useEffect(() => {
    if (!isOnline || !user || !accessToken) return
    sendHeartbeat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, user?.id])

  const sendHeartbeat = async (): Promise<void> => {
    try {
      const machineId = await window.desktopApi.license.getMachineId()
      const appVersion = await window.desktopApi.app.getVersion()

      const response = await axios.post(
        `${API_BASE}/api/v1/desktop-licenses/heartbeat`,
        { machineId, appVersion },
        { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 8000 }
      )

      if (response.data.success) {
        const { license, subscription } = response.data as {
          license: { id: string; status: string; label: string }
          subscription: {
            status: string
            expiresAt: string | null
            gracePeriodUntil: string | null
            isActive: boolean
            isExpired: boolean
            daysUntilExpiry: number | null
          }
        }

        const newInfo: LicenseInfo = {
          isActivated: true,
          isValid: subscription.isActive && license.status === 'ACTIVE',
          licenseKey: info.licenseKey,
          licenseStatus: license.status,
          subscriptionStatus: subscription.status,
          subscriptionExpiresAt: subscription.expiresAt,
          gracePeriodUntil: subscription.gracePeriodUntil,
          daysUntilExpiry: subscription.daysUntilExpiry,
          machineId,
          label: license.label,
          lastHeartbeatAt: new Date().toISOString(),
        }
        setInfo(newInfo)
        await window.desktopApi.license.storeInfo(newInfo as unknown as Record<string, unknown>)
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status

        // 404 — this machine has no license: requires activation
        if (status === 404 && err.response.data?.requiresActivation) {
          setInfo(prev => ({ ...prev, isActivated: false, isValid: false, licenseStatus: 'NOT_FOUND' }))
          return
        }

        // 403 — license revoked or suspended
        if (status === 403) {
          const licenseStatus = (err.response.data?.licenseStatus as string) || 'REVOKED'
          const updated = { ...info, licenseStatus, isValid: false }
          setInfo(updated)
          await window.desktopApi.license.storeInfo(updated as unknown as Record<string, unknown>)
          return
        }
      }
      // Network/server error — keep using cached info (offline tolerance)
    }
  }

  const activateLicense = useCallback(async (licenseKey: string): Promise<void> => {
    if (!accessToken) throw new Error('Non autenticato. Effettua il login prima di attivare la licenza.')

    const machineId = await window.desktopApi.license.getMachineId()
    const appVersion = await window.desktopApi.app.getVersion()
    const machineName = await window.desktopApi.license.getMachineName()

    const response = await axios.post(
      `${API_BASE}/api/v1/desktop-licenses/activate`,
      { licenseKey: licenseKey.trim().toUpperCase(), machineId, machineName, appVersion },
      { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 10000 }
    )

    if (!response.data.success) {
      throw new Error(response.data.error || 'Attivazione fallita')
    }

    const { data: license, subscription } = response.data as {
      data: { id: string; licenseKey: string; label: string; status: string; activatedAt: string; expiresAt: string | null }
      subscription: { status: string; expiresAt: string | null; gracePeriodUntil: string | null }
    }

    const newInfo: LicenseInfo = {
      isActivated: true,
      isValid: license.status === 'ACTIVE',
      licenseKey: license.licenseKey,
      licenseStatus: license.status,
      subscriptionStatus: subscription.status,
      subscriptionExpiresAt: subscription.expiresAt,
      gracePeriodUntil: subscription.gracePeriodUntil,
      daysUntilExpiry: subscription.expiresAt
        ? Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86_400_000)
        : null,
      machineId,
      label: license.label,
      lastHeartbeatAt: new Date().toISOString(),
    }
    setInfo(newInfo)
    await window.desktopApi.license.storeInfo(newInfo as unknown as Record<string, unknown>)
  }, [accessToken, info])

  const recheck = useCallback(async (): Promise<void> => {
    if (!isOnline || !accessToken) return
    await sendHeartbeat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, accessToken, info.licenseKey])

  return (
    <LicenseContext.Provider value={{ ...info, isLoading, activateLicense, recheck }}>
      {children}
    </LicenseContext.Provider>
  )
}

export function useLicense(): LicenseContextType {
  const ctx = useContext(LicenseContext)
  if (!ctx) throw new Error('useLicense must be used within LicenseProvider')
  return ctx
}

// ========== HELPERS ==========

/**
 * Determine if cached license is still valid offline.
 * Allow up to OFFLINE_GRACE_DAYS days since last heartbeat.
 */
function isOfflineValid(cached: Record<string, unknown>): boolean {
  if (!cached.isActivated) return false
  if (cached.licenseStatus === 'REVOKED' || cached.licenseStatus === 'SUSPENDED') return false
  if (!cached.lastHeartbeatAt) return false
  const lastBeat = new Date(cached.lastHeartbeatAt as string).getTime()
  const daysSince = (Date.now() - lastBeat) / 86_400_000
  return daysSince <= OFFLINE_GRACE_DAYS
}
