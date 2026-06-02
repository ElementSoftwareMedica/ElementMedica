import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import axios from 'axios'
import { convertBackendToFrontendPermissions } from '@/utils/permissionMapping'

interface AuthUser {
    id: string
    email: string
    firstName: string
    lastName: string
    tenantId: string
    roles: string[]
}

export interface AccessibleTenant {
    tenantId: string
    tenantName: string
    role?: string
    features?: string[]
}

interface DesktopAuthContextType {
    isAuthenticated: boolean
    isLoading: boolean
    user: AuthUser | null
    accessToken: string | null
    currentTenantId: string | null
    availableTenants: AccessibleTenant[]
    permissions: Record<string, boolean>
    hasPermission: (permission: string) => boolean
    switchTenant: (tenantId: string) => Promise<void>
    login: (identifier: string, password: string) => Promise<void>
    logout: () => void
    /** Refresh permissions from server (call when reconnecting) */
    refreshPermissionsNow: () => Promise<void>
    /** Refresh access token using stored refresh token. Returns new token or throws. */
    refreshSessionNow: () => Promise<string>
}

const DesktopAuthContext = createContext<DesktopAuthContextType | null>(null)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'
const isDev = import.meta.env.DEV

/** Converte permessi backend → Record normalizzato frontend */
function buildPermissionsMap(rawPermissions: unknown[]): Record<string, boolean> {
    const raw: Record<string, boolean> = {}
    for (const p of rawPermissions) {
        if (!p) continue
        if (typeof p === 'string') {
            raw[p] = true
            continue
        }
        if (typeof p === 'object') {
            const item = p as Record<string, unknown>
            const key = item.key || item.permission || item.name || item.codice
            const resource = item.resource || item.entity
            const action = item.action || item.operation
            if (typeof key === 'string' && key.includes(':')) raw[key] = true
            else if (typeof resource === 'string' && typeof action === 'string') raw[`${resource}:${action}`] = true
        }
    }
    return convertBackendToFrontendPermissions(raw)
}

export function DesktopAuthProvider({ children }: { children: ReactNode }): JSX.Element {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentTenantId, setCurrentTenantId] = useState<string | null>(null)
    const [availableTenants, setAvailableTenants] = useState<AccessibleTenant[]>([])
    const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
        try {
            const stored = localStorage.getItem('desktop_permissions')
            return stored ? JSON.parse(stored) : {}
        } catch { return {} }
    })

    // Try to restore session on mount
    useEffect(() => {
        // Version-based session migration: clear stale auth if app version changed
        const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0'
        const storedVersion = localStorage.getItem('desktop_app_version')
        if (storedVersion && storedVersion !== APP_VERSION) {
            // New version installed — clear stale tokens to force fresh login
            const keysToRemove = ['desktop_refreshToken', 'desktop_accessToken', 'desktop_user',
                'desktop_currentTenantId', 'desktop_availableTenants', 'desktop_permissions']
            keysToRemove.forEach(k => localStorage.removeItem(k))
        }
        localStorage.setItem('desktop_app_version', APP_VERSION)

        const storedUser = localStorage.getItem('desktop_user')
        const storedTenantId = localStorage.getItem('desktop_currentTenantId')
        const storedTenants = localStorage.getItem('desktop_availableTenants')

        // Restore cached tenants
        if (storedTenants) {
            try { setAvailableTenants(JSON.parse(storedTenants)) } catch { /* ignore */ }
        }

        // Retrieve tokens from secure storage (safeStorage via IPC)
        const restoreSession = async (): Promise<void> => {
            let secureRefreshToken: string | null = null
            let secureAccessToken: string | null = null
            try {
                if (window.desktopApi?.auth) {
                    const stored = await window.desktopApi.auth.getTokens()
                    secureRefreshToken = stored.refreshToken || null
                    secureAccessToken = stored.accessToken || null
                }
            } catch { /* token read failed — treat as no session */ }

            if (secureRefreshToken) {
                // Try to refresh token (requires online)
                refreshAccess(secureRefreshToken)
                    .then((newToken) => {
                        // After refresh, load available tenants + refresh permissions
                        loadAvailableTenants(newToken).catch(() => { /* offline — use cached */ })
                        refreshPermissions(newToken).catch(() => { /* offline — use cached */ })
                    })
                    .catch(() => {
                        // Refresh failed — if we have cached credentials, use them (offline mode)
                        // BUT only if the access token is not expired (check JWT exp)
                        if (secureAccessToken && storedUser) {
                            try {
                                let tokenValid = false
                                try {
                                    const payload = JSON.parse(atob(secureAccessToken.split('.')[1]))
                                    tokenValid = payload.exp && (payload.exp * 1000) > Date.now()
                                } catch { tokenValid = false }

                                if (tokenValid) {
                                    setAccessToken(secureAccessToken)
                                    setUser(JSON.parse(storedUser))
                                } else {
                                    // Expired access token + failed refresh = clear everything, show login
                                    window.desktopApi?.auth?.clearTokens().catch(() => { /* best-effort */ })
                                    localStorage.removeItem('desktop_user')
                                }
                            } catch {
                                window.desktopApi?.auth?.clearTokens().catch(() => { /* best-effort */ })
                                localStorage.removeItem('desktop_user')
                            }
                        } else {
                            window.desktopApi?.auth?.clearTokens().catch(() => { /* best-effort */ })
                        }
                    })
                    .finally(() => {
                        // Restore tenant selection
                        if (storedTenantId) {
                            setCurrentTenantId(storedTenantId)
                            if (window.desktopApi?.tenant) {
                                window.desktopApi.tenant.set(storedTenantId)
                            }
                        } else if (storedUser) {
                            try {
                                const u = JSON.parse(storedUser)
                                setCurrentTenantId(u.tenantId)
                                if (window.desktopApi?.tenant) {
                                    window.desktopApi.tenant.set(u.tenantId)
                                }
                            } catch { /* ignore */ }
                        }
                        setIsLoading(false)
                    })
            } else {
                setIsLoading(false)
            }
        } // end restoreSession
        restoreSession()
    }, [])

    const loadAvailableTenants = async (token: string): Promise<void> => {
        try {
            const response = await axios.get(`${API_BASE}/api/v1/person-tenant-access/my-tenants`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 8000
            })
            if (response.data?.success && Array.isArray(response.data.data)) {
                const tenants: AccessibleTenant[] = response.data.data.map((t: Record<string, unknown>) => ({
                    tenantId: t.tenantId || t.id,
                    tenantName: t.tenantName || t.name || 'Tenant',
                    role: t.role || t.roleType,
                    features: t.features
                }))
                setAvailableTenants(tenants)
                localStorage.setItem('desktop_availableTenants', JSON.stringify(tenants))
            }
        } catch {
            // Offline or endpoint not available — keep cached tenants
        }
    }

    /** Carica permessi aggiornati dal server (chiamato online) */
    const refreshPermissions = async (token: string): Promise<void> => {
        try {
            const resp = await axios.get(`${API_BASE}/api/v1/auth/verify`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 8000
            })
            const rawPerms: Record<string, boolean> | unknown[] = resp.data?.permissions || resp.data?.user?.permissions || {}
            let map: Record<string, boolean>
            if (Array.isArray(rawPerms)) {
                map = buildPermissionsMap(rawPerms)
            } else {
                map = convertBackendToFrontendPermissions(rawPerms as Record<string, boolean>)
            }
            setPermissions(map)
            localStorage.setItem('desktop_permissions', JSON.stringify(map))
        } catch {
            // Offline — keep cached permissions
        }
    }

    const refreshAccess = async (refreshToken: string): Promise<string> => {
        const response = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
            refresh_token: refreshToken
        })

        const newAccessToken: string | undefined = response.data.access_token
        const newRefreshToken: string | undefined = response.data.refresh_token

        if (!newAccessToken) {
            throw new Error('Token di accesso non ricevuto dal server')
        }

        setAccessToken(newAccessToken)
        // Store tokens securely via safeStorage (OS keychain)
        if (window.desktopApi?.auth) {
            window.desktopApi.auth.storeTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken ?? '' }).catch(() => { /* best-effort */ })
        }

        // Restore user info from localStorage (saved during login)
        const storedUser = localStorage.getItem('desktop_user')
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser))
                return newAccessToken
            } catch { /* fallback to JWT decode */ }
        }

        // Fallback: decode from JWT payload (limited fields)
        try {
            const payload = JSON.parse(atob(newAccessToken.split('.')[1]))
            setUser({
                id: payload.personId,
                email: payload.email || '',
                firstName: payload.username || '',
                lastName: '',
                tenantId: payload.tenantId,
                roles: payload.roles || []
            })
        } catch {
            if (window.desktopApi?.auth) {
                window.desktopApi.auth.clearTokens().catch(() => { /* best-effort */ })
            }
            throw new Error('Token non valido')
        }
        return newAccessToken
    }

    const login = useCallback(async (identifier: string, password: string): Promise<void> => {
        if (isDev) console.info('[Auth] Login attempt', { identifier, apiBase: API_BASE, url: `${API_BASE}/api/v1/auth/login` })
        let response
        try {
            response = await axios.post(`${API_BASE}/api/v1/auth/login`, {
                identifier,
                password
            })
            if (isDev) console.info('[Auth] Login HTTP OK', { status: response.status, dataKeys: Object.keys(response.data || {}), tokensKeys: Object.keys(response.data?.tokens || {}) })
        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: unknown }; code?: string; message?: string }
            if (isDev) console.error('[Auth] Login HTTP error', { code: axiosErr.code, message: axiosErr.message, status: axiosErr.response?.status })
            throw err
        }

        const { tokens, user: userData } = response.data

        if (isDev) console.info('[Auth] Login response', { tokensKeys: Object.keys(tokens || {}), hasAccessToken: !!tokens?.access_token, userKeys: Object.keys(userData || {}) })

        const accessTokenValue: string = tokens.access_token
        const refreshTokenValue: string = tokens.refresh_token

        if (!accessTokenValue) {
            if (isDev) console.error('[Auth] access_token missing from response.tokens')
            throw new Error('Token di accesso non ricevuto dal server')
        }

        if (isDev) console.info('[Auth] Tokens extracted OK, storing...')

        setAccessToken(accessTokenValue)

        // tenantId is not included in the login response user object — decode from JWT payload
        let jwtTenantId: string = ''
        try {
            const jwtPayload = JSON.parse(atob(accessTokenValue.split('.')[1]))
            jwtTenantId = jwtPayload.tenantId || ''
        } catch { /* ignore — tenantId defaults to empty */ }

        const userInfo: AuthUser = {
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            tenantId: jwtTenantId,
            roles: userData.roles || []
        }
        setUser(userInfo)

        // Build permissions from login response (array of strings)
        const rawPermArr: unknown[] = Array.isArray(userData.permissions) ? userData.permissions : []
        const permMap = buildPermissionsMap(rawPermArr)
        setPermissions(permMap)
        localStorage.setItem('desktop_permissions', JSON.stringify(permMap))

        // Set initial tenant from JWT
        setCurrentTenantId(jwtTenantId || null)
        if (jwtTenantId) {
            localStorage.setItem('desktop_currentTenantId', jwtTenantId)
        }
        // Set tenant scope in main process for SQLite filtering
        if (jwtTenantId && window.desktopApi?.tenant) {
            window.desktopApi.tenant.set(jwtTenantId)
        }

        // Store tokens securely via safeStorage; cache user info in localStorage for offline UX
        if (window.desktopApi?.auth) {
            window.desktopApi.auth.storeTokens({ accessToken: accessTokenValue, refreshToken: refreshTokenValue })
                .then(() => { if (isDev) console.info('[Auth] Tokens stored in safeStorage OK') })
                .catch(() => { if (isDev) console.error('[Auth] storeTokens failed') })
            // Store password hash for offline auto-lock unlock
            window.desktopApi.auth.storePasswordHash(password).catch(() => { /* best-effort */ })
        } else {
            if (isDev) console.warn('[Auth] window.desktopApi.auth not available — tokens not persisted')
        }
        localStorage.setItem('desktop_user', JSON.stringify(userInfo))
        if (isDev) console.info('[Auth] Login complete', { tenant: jwtTenantId })

        // Load available tenants in background
        loadAvailableTenants(accessTokenValue).catch(() => { /* will retry later */ })
        // Refresh full permissions from verify endpoint (more complete than login response)
        refreshPermissions(accessTokenValue).catch(() => { /* use login permissions if fails */ })
    }, [])

    const switchTenant = useCallback(async (tenantId: string): Promise<void> => {
        // Validate that the tenant is in the accessible list (empty list = not yet loaded = deny)
        if (availableTenants.length === 0 || !availableTenants.some(t => t.tenantId === tenantId)) {
            throw new Error('Tenant non accessibile')
        }

        // Call server to validate the switch (when online)
        if (accessToken) {
            try {
                await axios.post(
                    `${API_BASE}/api/v1/person-tenant-access/switch-tenant`,
                    { tenantId },
                    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 8000 }
                )
            } catch {
                // Offline — allow switch anyway if tenant is in cached list
            }
        }

        setCurrentTenantId(tenantId)
        localStorage.setItem('desktop_currentTenantId', tenantId)
        // Update tenant scope in main process for SQLite filtering
        if (window.desktopApi?.tenant) {
            window.desktopApi.tenant.set(tenantId)
        }
    }, [accessToken, availableTenants])

    const logout = useCallback(() => {
        setUser(null)
        setAccessToken(null)
        setCurrentTenantId(null)
        setAvailableTenants([])
        setPermissions({})
        if (window.desktopApi?.auth) {
            window.desktopApi.auth.clearTokens().catch(() => { /* best-effort */ })
        }
        localStorage.removeItem('desktop_user')
        localStorage.removeItem('desktop_currentTenantId')
        localStorage.removeItem('desktop_availableTenants')
        localStorage.removeItem('desktop_permissions')
        if (window.desktopApi?.tenant) {
            window.desktopApi.tenant.set(null)
        }
    }, [])

    const hasPermission = useCallback((permission: string): boolean => {
        // Super admin / wildcard
        if (permissions['*:*'] || permissions['all:*']) return true
        // Direct match
        if (permissions[permission]) return true
        // resource:* wildcard
        if (permission.includes(':')) {
            const resource = permission.substring(0, permission.indexOf(':'))
            if (permissions[`${resource}:*`]) return true
        }
        return false
    }, [permissions])

    /** Public wrapper — refresh permissions from server using current access token */
    const refreshPermissionsNow = useCallback(async (): Promise<void> => {
        if (!accessToken) return
        await refreshPermissions(accessToken)
    }, [accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

    /** Public wrapper — refresh access token using stored refresh token */
    const refreshSessionNow = useCallback(async (): Promise<string> => {
        const stored = window.desktopApi?.auth ? await window.desktopApi.auth.getTokens() : {}
        const storedRefreshToken = (stored as { refreshToken?: string }).refreshToken || null
        if (!storedRefreshToken) throw new Error('Nessun refresh token disponibile. Effettua il login.')
        return refreshAccess(storedRefreshToken)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <DesktopAuthContext.Provider
            value={{
                isAuthenticated: !!user && !!accessToken,
                isLoading,
                user,
                accessToken,
                currentTenantId,
                availableTenants,
                permissions,
                hasPermission,
                switchTenant,
                login,
                logout,
                refreshPermissionsNow,
                refreshSessionNow
            }}
        >
            {children}
        </DesktopAuthContext.Provider>
    )
}

export function useDesktopAuth(): DesktopAuthContextType {
    const context = useContext(DesktopAuthContext)
    if (!context) {
        throw new Error('useDesktopAuth must be used within DesktopAuthProvider')
    }
    return context
}
