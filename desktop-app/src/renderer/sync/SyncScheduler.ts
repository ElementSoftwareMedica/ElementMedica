import { executeUploadSync, getQueueStats, type SyncCallbacks } from './SyncEngine'

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MIN_SYNC_GAP = 30 * 1000 // Minimum 30s between auto-syncs

let schedulerTimer: ReturnType<typeof setInterval> | null = null
let lastSyncTime = 0
let isSyncing = false

interface SchedulerCallbacks extends SyncCallbacks {
  onAutoSyncSkipped?: (reason: string) => void
}

/**
 * Start the auto-sync scheduler.
 * Triggers upload sync every 5 minutes when:
 * - The app is online (checked via Navigator API)
 * - There are pending operations
 * - Not already syncing
 * - Minimum gap since last sync has elapsed
 */
export function startAutoSync(callbacks: SchedulerCallbacks): void {
  if (schedulerTimer) return // Already running

  schedulerTimer = setInterval(async () => {
    // Guard: don't overlap syncs
    if (isSyncing) {
      callbacks.onAutoSyncSkipped?.('Sincronizzazione già in corso')
      return
    }

    // Guard: check connectivity
    if (!navigator.onLine) {
      callbacks.onAutoSyncSkipped?.('Offline')
      return
    }

    // Guard: minimum gap
    if (Date.now() - lastSyncTime < MIN_SYNC_GAP) {
      callbacks.onAutoSyncSkipped?.('Intervallo minimo non raggiunto')
      return
    }

    // Guard: check if there are pending operations
    try {
      const stats = await getQueueStats()
      if (stats.pending === 0) return
    } catch {
      return
    }

    // Execute sync
    isSyncing = true
    await executeUploadSync({
      onStart: () => {
        callbacks.onStart()
      },
      onProgress: (current, total) => {
        callbacks.onProgress(current, total)
      },
      onComplete: (summary) => {
        isSyncing = false
        lastSyncTime = Date.now()
        callbacks.onComplete(summary)
      },
      onError: (message) => {
        isSyncing = false
        lastSyncTime = Date.now()
        callbacks.onError(message)
      }
    })
  }, AUTO_SYNC_INTERVAL)
}

/**
 * Stop the auto-sync scheduler.
 */
export function stopAutoSync(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
}

/**
 * Check if the scheduler is running.
 */
export function isAutoSyncRunning(): boolean {
  return schedulerTimer !== null
}
