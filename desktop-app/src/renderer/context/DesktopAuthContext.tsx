import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import axios from 'axios'

interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  tenantId: string
  roles: string[]
}

interface DesktopAuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  accessToken: string | null
  login: (identifier: string, password: string) => Promise<void>
  logout: () => void
}

const DesktopAuthContext = createContext<DesktopAuthContextType | null>(null)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'

export function DesktopAuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Try to restore session on mount
  useEffect(() => {
    const storedRefreshToken = localStorage.getItem('desktop_refreshToken')
    if (storedRefreshToken) {
      refreshAccess(storedRefreshToken)
        .catch(() => {
          // Refresh failed — user needs to re-login
          localStorage.removeItem('desktop_refreshToken')
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const refreshAccess = async (refreshToken: string): Promise<void> => {
    const response = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
      refreshToken
    })

    // Refresh endpoint returns flat { access_token, refresh_token } (no wrapper)
    const newAccessToken = response.data.access_token
    const newRefreshToken = response.data.refresh_token

    setAccessToken(newAccessToken)
    localStorage.setItem('desktop_accessToken', newAccessToken)
    localStorage.setItem('desktop_refreshToken', newRefreshToken)

    // Restore user info from localStorage (saved during login)
    const storedUser = localStorage.getItem('desktop_user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
        return
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
      // Malformed JWT — force re-login
      localStorage.removeItem('desktop_refreshToken')
      localStorage.removeItem('desktop_accessToken')
      throw new Error('Token non valido')
    }
  }

  const login = useCallback(async (identifier: string, password: string): Promise<void> => {
    const response = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      identifier,
      password
    })

    const { tokens, user: userData } = response.data

    setAccessToken(tokens.access_token)
    const userInfo: AuthUser = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      tenantId: userData.tenantId,
      roles: userData.roles || []
    }
    setUser(userInfo)

    // Store tokens + user info for session persistence
    localStorage.setItem('desktop_refreshToken', tokens.refresh_token)
    localStorage.setItem('desktop_accessToken', tokens.access_token)
    localStorage.setItem('desktop_user', JSON.stringify(userInfo))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem('desktop_refreshToken')
    localStorage.removeItem('desktop_accessToken')
    localStorage.removeItem('desktop_user')
  }, [])

  return (
    <DesktopAuthContext.Provider
      value={{
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        user,
        accessToken,
        login,
        logout
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
