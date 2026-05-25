import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import axios from 'axios'
import { useDesktopAuth } from './DesktopAuthContext'
import { useConnectivity } from './ConnectivityContext'

export type DesktopLicenseType = 'APP_ONLY' | 'BRIDGE_ONLY' | 'APP_AND_BRIDGE'

export interface LicenseInfo {
    isActivated: boolean
    isValid: boolean
    licenseKey: string | null
    licenseStatus: string | null   // PENDING | ACTIVE | SUSPENDED | REVOKED | EXPIRED | NOT_FOUND
    licenseType: DesktopLicenseType | null  // APP_ONLY | BRIDGE_ONLY | APP_AND_BRIDGE
    subscriptionStatus: string | null
    subscriptionExpiresAt: string | null
    gracePeriodUntil: string | null
    daysUntilExpiry: number | null
    machineId: string | null
    label: string | null
    lastHeartbeatAt: string | null
    tenantId: string | null
}

interface LicenseContextType extends LicenseInfo {
    isLoading: boolean
    activateLicense: (licenseKey: string, forceTransfer?: boolean) => Promise<void>
    recheck: () => Promise<void>
}

const LicenseContext = createContext<LicenseContextType | null>(null)

const API_BASE = import.meta.env.VITE_API_URL || 'https://app.elementmedica.com'

// Allow offline use for up to 30 days after last successful heartbeat
const OFFLINE_GRACE_DAYS = 30

const EMPTY_INFO: LicenseInfo = {
    isActivated: false,
    isValid: false,
    licenseKey: null,
    licenseStatus: null,
    licenseType: null,
    subscriptionStatus: null,
    subscriptionExpiresAt: null,
    gracePeriodUntil: null,
    daysUntilExpiry: null,
    machineId: null,
    label: null,
    lastHeartbeatAt: null,
    tenantId: null,
}

export function LicenseProvider({ children }: { children: ReactNode }): JSX.Element {
    const { user, accessToken, currentTenantId, availableTenants, switchTenant, refreshSessionNow, logout } = useDesktopAuth()
    const { isOnline } = useConnectivity()
    const [isLoading, setIsLoading] = useState(true)
    const [info, setInfo] = useState<LicenseInfo>(EMPTY_INFO)
    // Keep a stable ref to info so sendHeartbeat callback doesn't become stale
    const infoRef = useRef<LicenseInfo>(EMPTY_INFO)
    useEffect(() => { infoRef.current = info }, [info])

    // Prevent auto-switch after the first detection attempt.
    // Only the initial heartbeat (once per login session) may auto-switch tenants.
    // After that, the user's manual tenant selection must be respected.
    const hasAttemptedAutoSwitchRef = useRef(false)
    useEffect(() => {
        // Reset on new login session
        hasAttemptedAutoSwitchRef.current = false
    }, [user?.id])

    // Load cached license info for CURRENT tenant on mount and on tenant switch
    useEffect(() => {
        const loadCached = async (): Promise<void> => {
            setIsLoading(true)
            try {
                if (!currentTenantId) {
                    setInfo(EMPTY_INFO)
                    return
                }
                const cached = await window.desktopApi.license.getInfo(currentTenantId)
                if (cached && typeof cached === 'object') {
                    setInfo({
                        isActivated: Boolean(cached.isActivated),
                        isValid: isOfflineValid(cached),
                        licenseKey: (cached.licenseKey as string) || null,
                        licenseStatus: (cached.licenseStatus as string) || null,
                        licenseType: (cached.licenseType as DesktopLicenseType) || null,
                        subscriptionStatus: (cached.subscriptionStatus as string) || null,
                        subscriptionExpiresAt: (cached.subscriptionExpiresAt as string) || null,
                        gracePeriodUntil: (cached.gracePeriodUntil as string) || null,
                        daysUntilExpiry: typeof cached.daysUntilExpiry === 'number' ? cached.daysUntilExpiry : null,
                        machineId: (cached.machineId as string) || null,
                        label: (cached.label as string) || null,
                        lastHeartbeatAt: (cached.lastHeartbeatAt as string) || null,
                        tenantId: currentTenantId,
                    })
                } else {
                    setInfo({ ...EMPTY_INFO, tenantId: currentTenantId })
                }
            } catch {
                setInfo({ ...EMPTY_INFO, tenantId: currentTenantId })
            } finally {
                setIsLoading(false)
            }
        }
        loadCached()
    }, [currentTenantId])

    // When going online + authenticated: send heartbeat for current tenant
    useEffect(() => {
        if (!isOnline || !user || !accessToken || !currentTenantId) return
        sendHeartbeat()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline, user?.id, currentTenantId])

    const sendHeartbeat = async (retryToken?: string): Promise<void> => {
        if (!currentTenantId) return
        const token = retryToken || accessToken
        if (!token) return

        // Fetch device info before entering try/catch so it's available in error handlers
        let machineId = ''
        let appVersion = ''
        try {
            machineId = await window.desktopApi.license.getMachineId() as string
            appVersion = await window.desktopApi.app.getVersion() as string
        } catch {
            return // Device info unavailable
        }

        type HeartbeatData = {
            license: { id: string; status: string; label: string; licenseType: DesktopLicenseType }
            subscription: { status: string; expiresAt: string | null; gracePeriodUntil: string | null; isActive: boolean; isExpired: boolean; daysUntilExpiry: number | null }
        }

        const applySuccess = async (data: HeartbeatData, tenantId: string): Promise<void> => {
            const { license, subscription } = data
            const newInfo: LicenseInfo = {
                isActivated: true,
                isValid: subscription.isActive && license.status === 'ACTIVE',
                licenseKey: infoRef.current.licenseKey,
                licenseStatus: license.status,
                licenseType: license.licenseType || infoRef.current.licenseType,
                subscriptionStatus: subscription.status,
                subscriptionExpiresAt: subscription.expiresAt,
                gracePeriodUntil: subscription.gracePeriodUntil,
                daysUntilExpiry: subscription.daysUntilExpiry,
                machineId,
                label: license.label,
                lastHeartbeatAt: new Date().toISOString(),
                tenantId,
            }
            setInfo(newInfo)
            await window.desktopApi.license.storeInfo(newInfo as unknown as Record<string, unknown>, tenantId)
        }

        try {
            const response = await axios.post(
                `${API_BASE}/api/v1/desktop-licenses/heartbeat`,
                { machineId, appVersion },
                {
                    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': currentTenantId },
                    timeout: 8000
                }
            )
            if (response.data.success) {
                await applySuccess(response.data as HeartbeatData, currentTenantId)
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response) {
                const status = err.response.status

                // 401 — token expired: try to refresh once, then retry heartbeat
                if (status === 401 && !retryToken) {
                    try {
                        const newToken = await refreshSessionNow()
                        await sendHeartbeat(newToken)
                    } catch {
                        // Refresh failed — session truly expired, force re-login
                        logout()
                    }
                    return
                }

                // 404 — no active license for this machine on this tenant
                // Auto-detect: try other available tenants (user may have logged in with non-default tenant)
                // Only attempt auto-switch ONCE per login session; after that, respect user's manual choice.
                if (status === 404 && err.response.data?.requiresActivation) {
                    if (!hasAttemptedAutoSwitchRef.current && availableTenants.length > 1) {
                        hasAttemptedAutoSwitchRef.current = true  // Mark: we tried auto-detection once
                        for (const tenant of availableTenants) {
                            if (tenant.tenantId === currentTenantId) continue
                            try {
                                const retryResp = await axios.post(
                                    `${API_BASE}/api/v1/desktop-licenses/heartbeat`,
                                    { machineId, appVersion },
                                    {
                                        headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenant.tenantId },
                                        timeout: 8000
                                    }
                                )
                                if (retryResp.data.success) {
                                    // Found the tenant with the active license — auto-switch
                                    await switchTenant(tenant.tenantId)
                                    await applySuccess(retryResp.data as HeartbeatData, tenant.tenantId)
                                    return
                                }
                            } catch {
                                // This tenant has no license either — try next
                            }
                        }
                    } else if (!hasAttemptedAutoSwitchRef.current) {
                        // Only one tenant — mark as attempted anyway
                        hasAttemptedAutoSwitchRef.current = true
                    }
                    // No auto-switch (either already attempted, or user manually chose this tenant) → requires activation
                    setInfo(prev => ({ ...prev, isActivated: false, isValid: false, licenseStatus: 'NOT_FOUND', tenantId: currentTenantId }))
                    return
                }

                // 403 — license revoked or suspended
                if (status === 403) {
                    const licenseStatus = (err.response.data?.licenseStatus as string) || 'REVOKED'
                    const updated = { ...infoRef.current, licenseStatus, isValid: false, tenantId: currentTenantId }
                    setInfo(updated)
                    await window.desktopApi.license.storeInfo(updated as unknown as Record<string, unknown>, currentTenantId)
                    return
                }
            }
            // Network/server error — keep using cached info (offline tolerance)
        }
    }

    const activateLicense = useCallback(async (licenseKey: string, forceTransfer = false): Promise<void> => {
        if (!accessToken) throw new Error('Non autenticato. Effettua il login prima di attivare la licenza.')
        if (!currentTenantId) throw new Error('Nessun tenant selezionato.')

        const machineId = await window.desktopApi.license.getMachineId()
        const appVersion = await window.desktopApi.app.getVersion()
        const machineName = await window.desktopApi.license.getMachineName()

        // Try to refresh token proactively before activate (token may have expired)
        let effectiveToken = accessToken
        try {
            effectiveToken = await refreshSessionNow()
        } catch {
            // Refresh failed — proceed with current token (may still be valid)
        }

        type ActivateResponse = {
            data: { id: string; licenseKey: string; label: string; status: string; licenseType: DesktopLicenseType; activatedAt: string; expiresAt: string | null }
            subscription: { status: string; expiresAt: string | null; gracePeriodUntil: string | null }
        }

        const tryActivate = async (tenantId: string, ft = false) => {
            const r = await axios.post(
                `${API_BASE}/api/v1/desktop-licenses/activate`,
                { licenseKey: licenseKey.trim().toUpperCase(), machineId, machineName, appVersion, ...(ft ? { forceTransfer: true } : {}) },
                { headers: { Authorization: `Bearer ${effectiveToken}`, 'X-Tenant-ID': tenantId }, timeout: 10000 }
            )
            if (!r.data.success) throw new Error(r.data.error || 'Attivazione fallita')
            return r.data as ActivateResponse
        }

        let result: ActivateResponse
        let activatedTenantId = currentTenantId

        try {
            result = await tryActivate(currentTenantId, forceTransfer)
        } catch (firstErr: unknown) {
            // 404 means the license key doesn't belong to this tenant — auto-try other tenants
            if (axios.isAxiosError(firstErr) && firstErr.response?.status === 404 && availableTenants.length > 1) {
                let found = false
                for (const tenant of availableTenants) {
                    if (tenant.tenantId === currentTenantId) continue
                    try {
                        result = await tryActivate(tenant.tenantId, forceTransfer)
                        activatedTenantId = tenant.tenantId
                        found = true
                        break
                    } catch {
                        // Try next tenant
                    }
                }
                if (!found) {
                    throw new Error('Codice licenza non trovato per nessuno dei tenant accessibili. Verifica il codice o contatta il supporto.')
                }
            } else {
                // 409 = license already active on a different machine: attach extra info before re-throwing
                if (axios.isAxiosError(firstErr) && firstErr.response?.status === 409) {
                    const conflictErr = new Error(
                        firstErr.response.data?.error || 'Licenza già attiva su un altro PC.'
                    ) as Error & { code: string; activatedOn: string }
                    conflictErr.code = 'MACHINE_CONFLICT'
                    conflictErr.activatedOn = (firstErr.response.data?.activatedOn as string) || ''
                    throw conflictErr
                }
                throw firstErr
            }
        }

        // Switch to the tenant that owns the license (if different from current)
        if (activatedTenantId !== currentTenantId) {
            await switchTenant(activatedTenantId)
        }

        const { data: license, subscription } = result!

        const newInfo: LicenseInfo = {
            isActivated: true,
            isValid: license.status === 'ACTIVE',
            licenseKey: license.licenseKey,
            licenseStatus: license.status,
            licenseType: license.licenseType || 'APP_ONLY',
            subscriptionStatus: subscription.status,
            subscriptionExpiresAt: subscription.expiresAt,
            gracePeriodUntil: subscription.gracePeriodUntil,
            daysUntilExpiry: subscription.expiresAt
                ? Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86_400_000)
                : null,
            machineId,
            label: license.label,
            lastHeartbeatAt: new Date().toISOString(),
            tenantId: activatedTenantId,
        }
        setInfo(newInfo)
        await window.desktopApi.license.storeInfo(newInfo as unknown as Record<string, unknown>, activatedTenantId)
    }, [accessToken, currentTenantId, availableTenants, switchTenant, refreshSessionNow])

    const recheck = useCallback(async (): Promise<void> => {
        if (!isOnline || !accessToken) return
        await sendHeartbeat()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline, accessToken, currentTenantId, info.licenseKey])

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
