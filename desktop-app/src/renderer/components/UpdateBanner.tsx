import { useState, useEffect } from 'react'
import { Download, X, RefreshCw, CheckCircle2, RotateCcw, AlertTriangle, ExternalLink } from 'lucide-react'

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'

interface UpdateInfo {
  version: string
  releaseDate: string
}

// These URLs must always point to the same location as the auto-update feed
// (www.elementmedica.com/desktop-updates/) so manual downloads serve the latest version.
const DOWNLOAD_URL_ARM64 = 'https://www.elementmedica.com/desktop-updates/ElementMedica-Desktop-latest-arm64.dmg'
const DOWNLOAD_URL_X64 = 'https://www.elementmedica.com/desktop-updates/ElementMedica-Desktop-latest-x64.dmg'
const DOWNLOAD_URL_WIN = 'https://www.elementmedica.com/desktop-updates/ElementMedica-Desktop-latest-Setup.exe'

function getManualDownloadUrl(): string {
  const platform = navigator.platform?.toLowerCase() ?? ''
  if (platform.includes('win')) return DOWNLOAD_URL_WIN
  // macOS: try to detect arm64 — navigator.userAgent contains 'Mac' but no arch info
  // Default to showing both links; arm64 is more common on recent Macs
  return DOWNLOAD_URL_ARM64
}

export function UpdateBanner(): JSX.Element | null {
  const [state, setState] = useState<UpdateState>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [showManualLinks, setShowManualLinks] = useState(false)

  useEffect(() => {
    if (!window.desktopApi?.on) return

    window.desktopApi.on.updaterChecking(() => {
      setState('checking')
    })

    window.desktopApi.on.updaterAvailable((_event, info) => {
      setState('available')
      setUpdateInfo(info)
      setDismissed(false)
      setShowManualLinks(false)
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

    window.desktopApi.on.updaterError((_event, msg) => {
      setErrorMsg(msg || 'Errore sconosciuto')
      setState('error')
      setShowManualLinks(true)
    })

    return () => {
      const channels = [
        'updater:checking', 'updater:available', 'updater:not-available',
        'updater:progress', 'updater:downloaded', 'updater:error'
      ]
      channels.forEach(ch => window.desktopApi.on.removeAllListeners(ch))
    }
  }, [])

  const handleDownload = async (): Promise<void> => {
    // Guard: old app versions (< 0.1.7) may not expose desktopApi.updater
    if (!window.desktopApi?.updater?.downloadUpdate) {
      setErrorMsg('Aggiornamento in-app non supportato in questa versione. Usa il download manuale.')
      setState('error')
      setShowManualLinks(true)
      return
    }
    setState('downloading')
    setDownloadPercent(0)
    const result = await window.desktopApi.updater.downloadUpdate().catch((e: unknown) => ({
      success: false,
      error: e instanceof Error ? e.message : 'Errore'
    })) as { success: boolean; error?: string }
    if (result && !result.success) {
      setErrorMsg(result.error ?? 'Download non riuscito')
      setState('error')
      setShowManualLinks(true)
    }
  }

  const openManualDownload = (url: string): void => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (dismissed || state === 'idle' || state === 'checking') return null

  if (state === 'available' && updateInfo) {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Download className="w-4 h-4 flex-shrink-0" />
          <span>
            Versione <strong>{updateInfo.version}</strong> disponibile
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Scarica
          </button>
          <button
            onClick={() => openManualDownload(getManualDownloadUrl())}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-100 transition-colors"
            title="Download manuale dal browser"
          >
            <ExternalLink className="w-3 h-3" />
            Manuale
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
        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
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
                await window.desktopApi?.updater?.installUpdate?.()
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
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-amber-800 min-w-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-medium">Aggiornamento automatico non disponibile</span>
              {errorMsg && (
                <p className="text-xs text-amber-600 mt-0.5 truncate" title={errorMsg}>{errorMsg}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-amber-400 hover:text-amber-600 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {showManualLinks && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-amber-700">Scarica manualmente:</span>
            <button
              onClick={() => openManualDownload(DOWNLOAD_URL_ARM64)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              macOS Apple Silicon
            </button>
            <button
              onClick={() => openManualDownload(DOWNLOAD_URL_X64)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              macOS Intel
            </button>
            <button
              onClick={() => openManualDownload(DOWNLOAD_URL_WIN)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Windows
            </button>
          </div>
        )}
      </div>
    )
  }

  return null
}
