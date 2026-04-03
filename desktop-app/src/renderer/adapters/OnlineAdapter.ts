import axios, { AxiosError } from 'axios'
import type { DataAdapter, ApiRequest, ApiResponse } from './ApiAdapter'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'

/**
 * OnlineAdapter — Proxies requests to the webapp's API server.
 * Used when the app is online.
 * Handles 401 token refresh automatically.
 */
export class OnlineAdapter implements DataAdapter {
  private accessToken: string | null = null
  private onTokenRefreshed: ((token: string) => void) | null = null
  private isRefreshing = false

  setAccessToken(token: string | null): void {
    this.accessToken = token
  }

  setOnTokenRefreshed(callback: (token: string) => void): void {
    this.onTokenRefreshed = callback
  }

  isAvailable(): boolean {
    return navigator.onLine
  }

  async request<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>> {
    try {
      return await this.executeRequest<T>(req)
    } catch (error) {
      // Auto-refresh token on 401
      if (error instanceof AxiosError && error.response?.status === 401 && !this.isRefreshing) {
        const refreshed = await this.tryRefreshToken()
        if (refreshed) {
          return await this.executeRequest<T>(req)
        }
      }
      throw error
    }
  }

  private async executeRequest<T>(req: ApiRequest): Promise<ApiResponse<T>> {
    const url = `${API_BASE}${req.path}`
    const headers: Record<string, string> = {}

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }
    headers['Content-Type'] = 'application/json'
    headers['X-Frontend-Id'] = 'element-medica'
    headers['X-Desktop-Client'] = 'true'

    const response = await axios({
      method: req.method,
      url,
      data: req.data,
      params: req.params,
      headers,
      timeout: 30000
    })

    return {
      data: response.data,
      status: response.status,
      isOffline: false
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    this.isRefreshing = true
    try {
      const refreshToken = localStorage.getItem('desktop_refreshToken')
      if (!refreshToken) return false

      const response = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
        refreshToken
      })

      const newAccessToken = response.data.access_token
      const newRefreshToken = response.data.refresh_token

      this.accessToken = newAccessToken
      localStorage.setItem('desktop_accessToken', newAccessToken)
      localStorage.setItem('desktop_refreshToken', newRefreshToken)

      if (this.onTokenRefreshed) {
        this.onTokenRefreshed(newAccessToken)
      }

      return true
    } catch {
      return false
    } finally {
      this.isRefreshing = false
    }
  }
}
