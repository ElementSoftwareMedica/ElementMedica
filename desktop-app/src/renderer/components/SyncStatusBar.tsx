import { RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { useSyncStatus } from '../sync/SyncStatusProvider'

export function SyncStatusBar(): JSX.Element {
  const { syncState, progress, lastSyncAt, pendingOperations, conflicts } = useSyncStatus()

  if (syncState === 'DOWNLOADING') {
    return (
      <div className="flex items-center gap-2">
        <RefreshCw className="w-3.5 h-3.5 text-teal-500 animate-spin" />
        <span className="text-xs text-teal-700">
          Scaricamento{progress ? ` ${progress.current}/${progress.total}` : '...'}
        </span>
        {progress && (
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  if (syncState === 'UPLOADING') {
    return (
      <div className="flex items-center gap-2">
        <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
        <span className="text-xs text-blue-700">
          Sincronizzazione{progress ? ` ${progress.current}/${progress.total}` : '...'}
        </span>
      </div>
    )
  }

  if (syncState === 'ERROR') {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
        <span className="text-xs text-red-600">Errore sincronizzazione</span>
      </div>
    )
  }

  if (syncState === 'RESOLVING_CONFLICTS') {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs text-amber-600">{conflicts} conflitti da risolvere</span>
      </div>
    )
  }

  // IDLE state
  return (
    <div className="flex items-center gap-3">
      {pendingOperations > 0 && (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] text-amber-600">{pendingOperations} in coda</span>
        </div>
      )}
      {lastSyncAt && (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span className="text-[10px] text-gray-500">
            Sync: {new Date(lastSyncAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  )
}
