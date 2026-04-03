import type { DataAdapter, ApiRequest, ApiResponse } from './ApiAdapter'
import { OnlineAdapter } from './OnlineAdapter'
import { OfflineAdapter } from './OfflineAdapter'

/**
 * HybridAdapter — Automatically switches between OnlineAdapter and OfflineAdapter
 * based on real-time connectivity status.
 *
 * Strategy:
 * - READS: Try online first, fallback to offline if fails
 * - WRITES: Always write to local SQLite + enqueue, then proxy online if available
 */
export class HybridAdapter implements DataAdapter {
  private onlineAdapter: OnlineAdapter
  private offlineAdapter: OfflineAdapter
  private _isOnline: boolean = navigator.onLine

  constructor() {
    this.onlineAdapter = new OnlineAdapter()
    this.offlineAdapter = new OfflineAdapter()

    // Listen for connectivity changes
    window.addEventListener('online', () => { this._isOnline = true })
    window.addEventListener('offline', () => { this._isOnline = false })
  }

  setAccessToken(token: string | null): void {
    this.onlineAdapter.setAccessToken(token)
  }

  setOnlineStatus(isOnline: boolean): void {
    this._isOnline = isOnline
  }

  isAvailable(): boolean {
    return true // Always available — either online or offline
  }

  async request<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>> {
    const isWriteOp = req.method !== 'GET'

    if (isWriteOp) {
      return this.handleWrite<T>(req)
    }
    return this.handleRead<T>(req)
  }

  private async handleRead<T>(req: ApiRequest): Promise<ApiResponse<T>> {
    // If online, try online first
    if (this._isOnline) {
      try {
        return await this.onlineAdapter.request<T>(req)
      } catch {
        // Fallback to offline
        console.info('[HybridAdapter] Online read failed, falling back to offline')
      }
    }

    // Offline fallback
    return this.offlineAdapter.request<T>(req)
  }

  private async handleWrite<T>(req: ApiRequest): Promise<ApiResponse<T>> {
    // Always write to local SQLite first (offline-first)
    const localResult = await this.offlineAdapter.request<T>(req)

    // If online, also send to server (fire-and-forget for now)
    if (this._isOnline) {
      try {
        await this.onlineAdapter.request<T>(req)
      } catch {
        // Online write failed — operation is queued for sync
        console.info('[HybridAdapter] Online write failed, queued for sync')
      }
    }

    return localResult
  }
}
