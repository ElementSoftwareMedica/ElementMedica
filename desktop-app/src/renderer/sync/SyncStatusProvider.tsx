import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export type SyncState = 'IDLE' | 'DOWNLOADING' | 'UPLOADING' | 'RESOLVING_CONFLICTS' | 'ERROR'

interface SyncProgress {
    current: number
    total: number
    entity?: string
}

export interface SyncSummary {
    success: number
    conflict: number
    error: number
}

interface SyncStatusContextType {
    syncState: SyncState
    progress: SyncProgress | null
    lastSyncAt: string | null
    lastDownloadAt: string | null
    lastSyncSummary: SyncSummary | null
    pendingOperations: number
    conflicts: number
    errorMessage: string | null
    setSyncState: (state: SyncState) => void
    setProgress: (progress: SyncProgress | null) => void
    setLastSyncAt: (timestamp: string) => void
    setLastDownloadAt: (timestamp: string) => void
    setLastSyncSummary: (summary: SyncSummary | null) => void
    setPendingOperations: (count: number | ((prev: number) => number)) => void
    setConflicts: (count: number) => void
    setErrorMessage: (message: string | null) => void
}

const SyncStatusContext = createContext<SyncStatusContextType | null>(null)

function getStoredIsoTimestamp(key: string): string | null {
    const value = localStorage.getItem(key)
    if (!value) return null
    if (Number.isNaN(Date.parse(value))) {
        localStorage.removeItem(key)
        return null
    }
    return value
}

export function SyncStatusProvider({ children }: { children: ReactNode }): JSX.Element {
    const [syncState, setSyncState] = useState<SyncState>('IDLE')
    const [progress, setProgress] = useState<SyncProgress | null>(null)
    const [lastSyncAt, setLastSyncAtState] = useState<string | null>(
        () => getStoredIsoTimestamp('desktop_lastSyncAt')
    )
    const [lastDownloadAt, setLastDownloadAt] = useState<string | null>(
        () => getStoredIsoTimestamp('desktop_lastDownloadAt')
    )
    const [lastSyncSummary, setLastSyncSummary] = useState<SyncSummary | null>(null)
    const [pendingOperations, setPendingOperations] = useState(0)
    const [conflicts, setConflicts] = useState(0)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const handleSetLastDownloadAt = useCallback((ts: string) => {
        if (Number.isNaN(Date.parse(ts))) return
        setLastDownloadAt(ts)
        localStorage.setItem('desktop_lastDownloadAt', ts)
    }, [])

    const handleSetLastSyncAt = useCallback((ts: string) => {
        if (Number.isNaN(Date.parse(ts))) return
        setLastSyncAtState(ts)
        localStorage.setItem('desktop_lastSyncAt', ts)
    }, [])

    // Initialize pending count from queue on mount
    useEffect(() => {
        if (!window.desktopApi) return
        window.desktopApi.sync.getQueueStats().then((stats: { pending: number; conflict: number }) => {
            setPendingOperations(stats.pending ?? 0)
            setConflicts(stats.conflict ?? 0)
        }).catch(() => { /* ignore if IPC not ready */ })
    }, [])

    return (
        <SyncStatusContext.Provider
            value={{
                syncState,
                progress,
                lastSyncAt,
                lastDownloadAt,
                lastSyncSummary,
                pendingOperations,
                conflicts,
                errorMessage,
                setSyncState,
                setProgress,
                setLastSyncAt: handleSetLastSyncAt,
                setLastDownloadAt: handleSetLastDownloadAt,
                setLastSyncSummary,
                setPendingOperations: (v: number | ((prev: number) => number)) => setPendingOperations(v as Parameters<typeof setPendingOperations>[0]),
                setConflicts,
                setErrorMessage
            }}
        >
            {children}
        </SyncStatusContext.Provider>
    )
}

export function useSyncStatus(): SyncStatusContextType {
    const context = useContext(SyncStatusContext)
    if (!context) {
        throw new Error('useSyncStatus must be used within SyncStatusProvider')
    }
    return context
}
