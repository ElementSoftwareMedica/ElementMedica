import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type SyncState = 'IDLE' | 'DOWNLOADING' | 'UPLOADING' | 'RESOLVING_CONFLICTS' | 'ERROR'

interface SyncProgress {
  current: number
  total: number
  entity?: string
}

interface SyncStatusContextType {
  syncState: SyncState
  progress: SyncProgress | null
  lastSyncAt: string | null
  pendingOperations: number
  conflicts: number
  errorMessage: string | null
  setSyncState: (state: SyncState) => void
  setProgress: (progress: SyncProgress | null) => void
  setLastSyncAt: (timestamp: string) => void
  setPendingOperations: (count: number) => void
  setConflicts: (count: number) => void
  setErrorMessage: (message: string | null) => void
}

const SyncStatusContext = createContext<SyncStatusContextType | null>(null)

export function SyncStatusProvider({ children }: { children: ReactNode }): JSX.Element {
  const [syncState, setSyncState] = useState<SyncState>('IDLE')
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [pendingOperations, setPendingOperations] = useState(0)
  const [conflicts, setConflicts] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  return (
    <SyncStatusContext.Provider
      value={{
        syncState,
        progress,
        lastSyncAt,
        pendingOperations,
        conflicts,
        errorMessage,
        setSyncState,
        setProgress,
        setLastSyncAt: useCallback((ts: string) => setLastSyncAt(ts), []),
        setPendingOperations,
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
