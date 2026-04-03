import { useState, useEffect } from 'react'
import {
  Settings,
  HardDrive,
  RefreshCw,
  Clock,
  Trash2,
  Download,
  Info,
  CheckCircle2
} from 'lucide-react'
import { isAutoSyncRunning, startAutoSync, stopAutoSync } from '../sync/SyncScheduler'
import { useSyncStatus } from '../sync/SyncStatusProvider'

interface AppInfo {
  version: string
  dbPath: string
  isPackaged: boolean
}

export function SettingsPage(): JSX.Element {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(isAutoSyncRunning())
  const [clearConfirm, setClearConfirm] = useState(false)
  const { setSyncState, setProgress, setLastSyncAt, setPendingOperations, setErrorMessage } = useSyncStatus()

  useEffect(() => {
    loadAppInfo()
  }, [])

  const loadAppInfo = async (): Promise<void> => {
    if (!window.desktopApi) return
    try {
      const [version, dbPath, isPackaged] = await Promise.all([
        window.desktopApi.app.getVersion(),
        window.desktopApi.app.getPath('userData'),
        window.desktopApi.app.isPackaged()
      ])
      setAppInfo({
        version: version as string,
        dbPath: dbPath as string,
        isPackaged: isPackaged as boolean
      })
    } catch {
      // silent
    }
  }

  const handleToggleAutoSync = (): void => {
    if (autoSyncEnabled) {
      stopAutoSync()
      setAutoSyncEnabled(false)
    } else {
      startAutoSync({
        onStart: () => {
          setSyncState('UPLOADING')
          setErrorMessage(null)
        },
        onProgress: (current, total) => {
          setProgress({ current, total })
        },
        onComplete: (summary) => {
          setSyncState('IDLE')
          setProgress(null)
          setLastSyncAt(new Date().toISOString())
          if (summary.conflict > 0) {
            setErrorMessage(`${summary.conflict} conflitti da risolvere`)
          }
        },
        onError: (message) => {
          setSyncState('ERROR')
          setProgress(null)
          setErrorMessage(message)
        }
      })
      setAutoSyncEnabled(true)
    }
  }

  const handleClearSyncedOps = async (): Promise<void> => {
    if (!clearConfirm) {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 3000)
      return
    }
    try {
      await window.desktopApi.db.deleteWhere({
        table: 'operations_queue',
        where: { status: 'SYNCED' }
      })
      setClearConfirm(false)
    } catch {
      setClearConfirm(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-600" />
          Impostazioni
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Configurazione applicazione desktop</p>
      </div>

      {/* Sync Settings */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-teal-600" />
          Sincronizzazione
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Sincronizzazione automatica</p>
              <p className="text-xs text-gray-500">Sincronizza automaticamente ogni 5 minuti quando connesso</p>
            </div>
            <button
              onClick={handleToggleAutoSync}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoSyncEnabled ? 'bg-teal-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Intervallo sync</p>
              <p className="text-xs text-gray-500">Intervallo tra sincronizzazioni automatiche</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              5 minuti
            </div>
          </div>
        </div>
      </div>

      {/* Storage */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-teal-600" />
          Archiviazione
        </h2>
        <div className="space-y-3">
          {appInfo && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Percorso database</p>
                <p className="text-xs text-gray-500 font-mono truncate max-w-md">{appInfo.dbPath}/data/elementmedica.db</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Pulisci operazioni sincronizzate</p>
              <p className="text-xs text-gray-500">Rimuovi le operazioni già sincronizzate dalla coda</p>
            </div>
            <button
              onClick={handleClearSyncedOps}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                clearConfirm
                  ? 'text-red-600 border-red-300 bg-red-50 hover:bg-red-100'
                  : 'text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Trash2 className="w-3 h-3" />
              {clearConfirm ? 'Conferma' : 'Pulisci'}
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-600" />
          Informazioni App
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Versione</span>
            <span className="font-mono text-gray-800">{appInfo?.version || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Ambiente</span>
            <span className="text-gray-800">{appInfo?.isPackaged ? 'Produzione' : 'Sviluppo'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Piattaforma</span>
            <span className="text-gray-800">{navigator.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Electron</span>
            <span className="font-mono text-gray-800">{navigator.userAgent.match(/Electron\/([\d.]+)/)?.[1] || '—'}</span>
          </div>
        </div>
      </div>

      {/* Update Banner (placeholder — updates are automatic) */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800">App aggiornata</p>
          <p className="text-xs text-green-600">Gli aggiornamenti vengono controllati automaticamente ogni 4 ore</p>
        </div>
      </div>
    </div>
  )
}
