import { useState, useEffect } from 'react'
import { Download, X, RefreshCw, CheckCircle2, RotateCcw } from 'lucide-react'

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'

interface UpdateInfo {
  version: string
  releaseDate: string
}

export function UpdateBanner(): JSX.Element | null {
  const [state, setState] = useState<UpdateState>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.desktopApi?.on) return

    window.desktopApi.on.updaterChecking(() => {
      setState('checking')
    })

    window.desktopApi.on.updaterAvailable((_event, info) => {
      setState('available')
      setUpdateInfo(info)
      setDismissed(false)
    })

    window.desktopApi.on.updaterNotAvailable(() => {
      setState('idle')
    })

    window.desktopApi.on.updaterProgress((_event, progress) => {
      setState('downloading')
      setDownloadPercent(Math.round(progress.percent))
    })

    window.desktopApi.on.updaterDownloaded(() => {
      setState('downloaded')
    })

    window.desktopApi.on.updaterError(() => {
      setState('error')
      setTimeout(() => setState('idle'), 5000)
    })

    return () => {
      // Cleanup listeners to prevent memory leaks
      const channels = [
        'updater:checking', 'updater:available', 'updater:not-available',
        'updater:progress', 'updater:downloaded', 'updater:error'
      ]
      channels.forEach(ch => window.desktopApi.on.removeAllListeners(ch))
    }
  }, [])

  if (dismissed || state === 'idle' || state === 'checking') return null

  if (state === 'available' && updateInfo) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Download className="w-4 h-4" />
          <span>
            Versione <strong>{updateInfo.version}</strong> disponibile
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                await window.desktopApi.updater.downloadUpdate()
              } catch { /* will show progress via events */ }
            }}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Scarica
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-blue-400 hover:text-blue-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  if (state === 'downloading') {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
        <span className="text-sm text-blue-700">Scaricamento aggiornamento... {downloadPercent}%</span>
        <div className="flex-1 max-w-xs h-1.5 bg-blue-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${downloadPercent}%` }}
          />
        </div>
      </div>
    )
  }

  if (state === 'downloaded') {
    return (
      <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="w-4 h-4" />
          <span>Aggiornamento pronto per l'installazione</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                await window.desktopApi.updater.installUpdate()
              } catch { /* app will restart */ }
            }}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Riavvia e installa
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-green-400 hover:text-green-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-sm text-red-600">
        <span>Errore durante il controllo aggiornamenti</span>
      </div>
    )
  }

  return null
}
