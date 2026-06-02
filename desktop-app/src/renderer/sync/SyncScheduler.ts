import { executeUploadSync, getQueueStats, executeIncrementalDownload, type SyncCallbacks, type DownloadCallbacks } from './SyncEngine'

const AUTO_SYNC_INTERVAL = 30 * 1000 // 30s fallback interval (triggerSyncSoon handles real-time writes)
const AUTO_DOWNLOAD_INTERVAL = 60 * 1000 // 1 minute incremental download — near-instant online feel
const MIN_SYNC_GAP = 8 * 1000 // Minimum 8s between auto-syncs

let schedulerTimer: ReturnType<typeof setInterval> | null = null
let downloadTimer: ReturnType<typeof setInterval> | null = null
let soonTimer: ReturnType<typeof setTimeout> | null = null
let lastSyncTime = 0
let isSyncing = false
let isDownloading = false
// Stored callbacks for use by triggerSyncSoon (set by startAutoSync)
let storedCallbacks: SyncCallbacks | null = null

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
    storedCallbacks = callbacks // Store for triggerSyncSoon
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
        try {
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
            }, { notify: false })
        } finally {
            // Belt-and-suspenders: ensure isSyncing is always reset even if executeUploadSync throws
            isSyncing = false
        }
    }, AUTO_SYNC_INTERVAL)
}

/**
 * Stop the auto-sync scheduler and clear any pending debounced sync.
 */
export function stopAutoSync(): void {
    if (schedulerTimer) {
        clearInterval(schedulerTimer)
        schedulerTimer = null
    }
    if (soonTimer) {
        clearTimeout(soonTimer)
        soonTimer = null
    }
    storedCallbacks = null
}

/**
 * Check if the scheduler is running.
 */
export function isAutoSyncRunning(): boolean {
    return schedulerTimer !== null
}

/**
 * Trigger a sync soon after a write operation (debounced).
 * Used by HybridAdapter after writes when online, to give live-sync feel
 * without the overhead of direct API calls.
 * Respects MIN_SYNC_GAP and isSyncing guard.
 */
export function triggerSyncSoon(delay = 3000): void {
    if (!storedCallbacks) return
    // Debounce: cancel any pending triggerSyncSoon and reschedule
    if (soonTimer) {
        clearTimeout(soonTimer)
        soonTimer = null
    }
    soonTimer = setTimeout(() => {
        soonTimer = null
        if (storedCallbacks) {
            void triggerSyncNow(storedCallbacks)
        }
    }, delay)
}

/**
 * Trigger a sync immediately (bypassing the timer interval).
 * Used when the app reconnects to the network.
 * Respects the isSyncing guard and MIN_SYNC_GAP.
 */
export async function triggerSyncNow(callbacks: SyncCallbacks): Promise<void> {
    if (isSyncing) return
    if (!navigator.onLine) return

    if (Date.now() - lastSyncTime < MIN_SYNC_GAP) return

    try {
        const stats = await getQueueStats()
        if (stats.pending === 0) return
    } catch {
        return
    }

    isSyncing = true
    try {
        await executeUploadSync({
            onStart: () => callbacks.onStart(),
            onProgress: (current, total) => callbacks.onProgress(current, total),
            onComplete: (summary) => {
                isSyncing = false
                lastSyncTime = Date.now()
                callbacks.onComplete(summary)
            },
            onError: (message) => {
                isSyncing = false
                callbacks.onError(message)
            }
        }, { notify: false })
    } finally {
        isSyncing = false
    }
}

/**
 * Start the auto-download scheduler.
 * Every 3 minutes, downloads records changed on the server since lastSyncAt.
 * Uses incremental sync (lastSyncAt param) so only delta records are transferred.
 * Silent on network errors — retries next interval.
 */
export function startAutoDownload(callbacks: DownloadCallbacks, getLastDownloadAt: () => string | null): void {
    if (downloadTimer) return // Already running

    downloadTimer = setInterval(async () => {
        if (isDownloading) return
        if (!navigator.onLine) return

        const lastDownloadAt = getLastDownloadAt()
        if (!lastDownloadAt) return // No baseline — require manual full download first

        isDownloading = true
        try {
            await executeIncrementalDownload(lastDownloadAt, callbacks)
        } finally {
            isDownloading = false
        }
    }, AUTO_DOWNLOAD_INTERVAL)
}

/**
 * Stop the auto-download scheduler.
 */
export function stopAutoDownload(): void {
    if (downloadTimer) {
        clearInterval(downloadTimer)
        downloadTimer = null
    }

    isDownloading = false
}

/**
 * Trigger an immediate incremental download (e.g., on reconnect).
 */
export async function triggerDownloadNow(callbacks: DownloadCallbacks, getLastDownloadAt: () => string | null): Promise<void> {
    if (isDownloading) return
    if (!navigator.onLine) return
    const lastDownloadAt = getLastDownloadAt()
    if (!lastDownloadAt) return

    isDownloading = true
    try {
        await executeIncrementalDownload(lastDownloadAt, callbacks)
    } finally {
        isDownloading = false
    }
}
