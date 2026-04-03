/**
 * ApiAdapter — Core pattern for intercepting all API calls.
 * Routes requests to OnlineAdapter (proxy) or OfflineAdapter (SQLite) based on connectivity.
 *
 * Usage: Replace `clinicaApi` imports with the adapter in desktop context.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiRequest {
  method: HttpMethod
  path: string
  data?: Record<string, unknown>
  params?: Record<string, unknown>
}

export interface ApiResponse<T = unknown> {
  data: T
  status: number
  isOffline: boolean
}

export interface DataAdapter {
  request<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>>
  isAvailable(): boolean
}

let currentAdapter: DataAdapter | null = null
let connectivityCheckFn: () => boolean = () => navigator.onLine

export function setConnectivityCheck(fn: () => boolean): void {
  connectivityCheckFn = fn
}

export function registerAdapter(adapter: DataAdapter): void {
  currentAdapter = adapter
}

export function getAdapter(): DataAdapter {
  if (!currentAdapter) {
    throw new Error('No adapter registered. Call registerAdapter() first.')
  }
  return currentAdapter
}

/**
 * Main API call function — used by all components.
 * Automatically routes to online or offline based on connectivity.
 */
export async function apiCall<T = unknown>(
  method: HttpMethod,
  path: string,
  data?: Record<string, unknown>,
  params?: Record<string, unknown>
): Promise<T> {
  const adapter = getAdapter()
  const response = await adapter.request<T>({ method, path, data, params })
  return response.data
}

// Convenience methods matching the webapp's clinicaApi pattern
export const desktopApi = {
  get: <T = unknown>(path: string, params?: Record<string, unknown>) =>
    apiCall<T>('GET', path, undefined, params),

  post: <T = unknown>(path: string, data?: Record<string, unknown>) =>
    apiCall<T>('POST', path, data),

  put: <T = unknown>(path: string, data?: Record<string, unknown>) =>
    apiCall<T>('PUT', path, data),

  patch: <T = unknown>(path: string, data?: Record<string, unknown>) =>
    apiCall<T>('PATCH', path, data),

  delete: <T = unknown>(path: string, data?: Record<string, unknown>) =>
    apiCall<T>('DELETE', path, data)
}
