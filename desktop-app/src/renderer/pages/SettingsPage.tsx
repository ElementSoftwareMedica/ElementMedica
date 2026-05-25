import { useState, useEffect, useRef } from 'react'
import {
    Settings,
    HardDrive,
    RefreshCw,
    Clock,
    Trash2,
    Download,
    Upload,
    Info,
    CheckCircle2,
    AlertCircle,
    ArrowDownToLine,
    Bug,
    ChevronDown,
    ChevronUp,
    Zap,
    Play,
    Square,
    DatabaseBackup,
    List,
    Shield,
    Eye,
    ExternalLink,
    KeyRound
} from 'lucide-react'
import { isAutoSyncRunning, startAutoSync, stopAutoSync } from '../sync/SyncScheduler'
import { useSyncStatus } from '../sync/SyncStatusProvider'

interface AppInfo {
    version: string
    dbPath: string
    isPackaged: boolean
}

type UpdateState =
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'available'; version: string; releaseDate: string }
    | { status: 'not-available' }
    | { status: 'downloading'; percent: number }
    | { status: 'downloaded' }
    | { status: 'error'; message: string }

export function SettingsPage(): JSX.Element {
    const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(isAutoSyncRunning())
    const [clearConfirm, setClearConfirm] = useState(false)
    const [updateState, setUpdateState] = useState<UpdateState>({ status: 'idle' })
    const [backupMessage, setBackupMessage] = useState<string | null>(null)
    const [backupRestoreConfirm, setBackupRestoreConfirm] = useState(false)
    const [errorLog, setErrorLog] = useState<{ id: string; timestamp: string; message: string; stack?: string; processType: string; errorType: string }[]>([])
    const [showErrorLog, setShowErrorLog] = useState(false)
    const [clearLogConfirm, setClearLogConfirm] = useState(false)
    const [backupList, setBackupList] = useState<{ name: string; size: number; createdAt: string }[]>([])
    const [showBackupList, setShowBackupList] = useState(false)
    const [bridgeStatus, setBridgeStatus] = useState<{ running: boolean; port: number; available: boolean; pid?: number; isSetup?: boolean } | null>(null)
    const [bridgeAction, setBridgeAction] = useState<'starting' | 'stopping' | null>(null)
    const [gdprLog, setGdprLog] = useState<{ id: string; action: string; resourceType: string; resourceId: string; reason?: string; dataAccessed?: string; timestamp: string }[]>([])
    const [showGdprLog, setShowGdprLog] = useState(false)
    const [gdprFilter, setGdprFilter] = useState<string>('')
    const listenersAttached = useRef(false)
    const { setSyncState, setProgress, setLastSyncAt, setErrorMessage } = useSyncStatus()

    useEffect(() => {
        loadAppInfo()
        loadBridgeStatus()
    }, [])

    // Wire up auto-updater IPC listeners once
    useEffect(() => {
        if (!window.desktopApi || listenersAttached.current) return
        listenersAttached.current = true

        window.desktopApi.on.updaterChecking(() => setUpdateState({ status: 'checking' }))
        window.desktopApi.on.updaterAvailable((_event, info) =>
            setUpdateState({ status: 'available', version: info.version, releaseDate: info.releaseDate })
        )
        window.desktopApi.on.updaterNotAvailable(() => setUpdateState({ status: 'not-available' }))
        window.desktopApi.on.updaterProgress((_event, progress) =>
            setUpdateState({ status: 'downloading', percent: Math.round(progress.percent) })
        )
        window.desktopApi.on.updaterDownloaded(() => setUpdateState({ status: 'downloaded' }))
        window.desktopApi.on.updaterError((_event, message) =>
            setUpdateState({ status: 'error', message })
        )
    }, [])

    const handleDownloadUpdate = async (): Promise<void> => {
        if (!window.desktopApi?.updater?.downloadUpdate) {
            setUpdateState({ status: 'error', message: 'Aggiornamento in-app non disponibile. Scarica manualmente dal sito.' })
            return
        }
        try {
            await window.desktopApi.updater.downloadUpdate()
        } catch {
            setUpdateState({ status: 'error', message: 'Errore durante il download dell\'aggiornamento' })
        }
    }

    const handleInstallUpdate = (): void => {
        window.desktopApi?.updater?.installUpdate?.()
    }

    const handleExportBackup = async (): Promise<void> => {
        setBackupMessage(null)
        try {
            const result = await window.desktopApi.backup.export() as { ok: boolean; path?: string; error?: string }
            if (result.ok) {
                setBackupMessage(`Backup salvato in: ${result.path}`)
                window.desktopApi.notify.send({ event: 'backup-created', detail: result.path })
                await loadBackupList()
            } else {
                setBackupMessage(result.error ?? 'Errore durante l\'esportazione')
            }
        } catch {
            setBackupMessage('Errore durante l\'esportazione del backup')
        }
    }

    const handleImportBackup = async (): Promise<void> => {
        if (!backupRestoreConfirm) {
            setBackupRestoreConfirm(true)
            setTimeout(() => setBackupRestoreConfirm(false), 5000)
            return
        }
        setBackupRestoreConfirm(false)
        setBackupMessage(null)
        try {
            const result = await window.desktopApi.backup.import() as { ok: boolean; message?: string; error?: string }
            if (result.ok) {
                setBackupMessage(result.message ?? 'Backup ripristinato. Riavvia l\'applicazione.')
            } else if (result.error && result.error !== 'Annullato') {
                setBackupMessage(`Errore: ${result.error}`)
            }
        } catch {
            setBackupMessage('Errore durante il ripristino del backup')
        }
    }

    const loadBackupList = async (): Promise<void> => {
        try {
            const result = await window.desktopApi.backup.list() as { ok: boolean; files: { name: string; size: number; createdAt: string }[] }
            if (result.ok) setBackupList(result.files.slice(0, 10))
        } catch { /* silent */ }
    }

    const handleToggleBackupList = async (): Promise<void> => {
        if (!showBackupList) await loadBackupList()
        setShowBackupList(p => !p)
    }

    const loadBridgeStatus = async (): Promise<void> => {
        if (!window.desktopApi) return
        try {
            const status = await window.desktopApi.bridge.getStatus() as { running: boolean; port: number; available: boolean; pid?: number; isSetup?: boolean }
            setBridgeStatus(status)
        } catch { /* silent */ }
    }

    const handleBridgeStart = async (): Promise<void> => {
        if (!window.desktopApi || bridgeAction) return
        setBridgeAction('starting')
        try {
            await window.desktopApi.bridge.start()
            // Small delay so process has time to start
            await new Promise(r => setTimeout(r, 1500))
            await loadBridgeStatus()
        } catch { /* silent */ } finally {
            setBridgeAction(null)
        }
    }

    const handleBridgeStop = async (): Promise<void> => {
        if (!window.desktopApi || bridgeAction) return
        setBridgeAction('stopping')
        try {
            await window.desktopApi.bridge.stop()
            await new Promise(r => setTimeout(r, 500))
            await loadBridgeStatus()
        } catch { /* silent */ } finally {
            setBridgeAction(null)
        }
    }

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

    const loadErrorLog = async (): Promise<void> => {
        try {
            const result = await window.desktopApi.crash.getLogs(30) as { ok: boolean; reports: { id: string; timestamp: string; message: string; stack?: string; processType: string; errorType: string }[] }
            if (result.ok) setErrorLog(result.reports)
        } catch { /* silent */ }
    }

    const handleClearErrorLog = async (): Promise<void> => {
        if (!clearLogConfirm) {
            setClearLogConfirm(true)
            setTimeout(() => setClearLogConfirm(false), 3000)
            return
        }
        setClearLogConfirm(false)
        try {
            await window.desktopApi.crash.clearLogs()
            setErrorLog([])
        } catch { /* silent */ }
    }

    const handleToggleErrorLog = async (): Promise<void> => {
        if (!showErrorLog) await loadErrorLog()
        setShowErrorLog(p => !p)
    }

    const loadGdprLog = async (): Promise<void> => {
        try {
            if (!window.desktopApi?.gdpr) return
            const result = await window.desktopApi.gdpr.getAuditLog({ limit: 50 }) as {
                ok: boolean
                entries: { id: string; action: string; resourceType: string; resourceId: string; reason?: string; dataAccessed?: string; timestamp: string }[]
            }
            if (result.ok) setGdprLog(result.entries || [])
        } catch { /* silent */ }
    }

    const handleToggleGdprLog = async (): Promise<void> => {
        if (!showGdprLog) await loadGdprLog()
        setShowGdprLog(p => !p)
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
                            <p className="text-xs text-gray-500">Sincronizza automaticamente ogni minuto quando connesso</p>
                        </div>
                        <button
                            onClick={handleToggleAutoSync}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoSyncEnabled ? 'bg-teal-600' : 'bg-gray-200'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
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
                            1 minuto
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
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${clearConfirm
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

            {/* Backup & Restore */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
                <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <DatabaseBackup className="w-4 h-4 text-teal-600" />
                    Backup del Database
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                    Esporta una copia compressa del database locale (<code>.db.gz</code>). Un backup giornaliero viene creato automaticamente all'avvio.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={handleExportBackup}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Esporta backup
                    </button>
                    <button
                        onClick={handleImportBackup}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${backupRestoreConfirm
                            ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                            : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        <Upload className="w-3.5 h-3.5" />
                        {backupRestoreConfirm ? 'Conferma ripristino' : 'Ripristina backup'}
                    </button>
                    <button
                        onClick={handleToggleBackupList}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <List className="w-3.5 h-3.5" />
                        {showBackupList ? 'Nascondi lista' : 'Backup automatici'}
                    </button>
                </div>
                {backupMessage && (
                    <p className={`mt-3 text-xs rounded-lg px-3 py-2 ${backupMessage.toLowerCase().includes('errore')
                        ? 'bg-red-50 text-red-700'
                        : 'bg-green-50 text-green-700'
                        }`}>{backupMessage}</p>
                )}
                {showBackupList && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">Ultimi backup automatici</p>
                        {backupList.length === 0 ? (
                            <p className="text-xs text-gray-400">Nessun backup automatico disponibile.</p>
                        ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {backupList.map((b) => (
                                    <div key={b.name} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                                        <span className="font-mono truncate max-w-xs">{b.name}</span>
                                        <span className="shrink-0 text-gray-400 ml-2">
                                            {(b.size / 1024 / 1024).toFixed(1)} MB · {new Date(b.createdAt).toLocaleDateString('it-IT')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
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

            {/* Update Banner */}
            {(updateState.status === 'idle' || updateState.status === 'checking' || updateState.status === 'not-available') && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-green-800">
                            {updateState.status === 'checking' ? 'Controllo aggiornamenti…' : 'App aggiornata'}
                        </p>
                        <p className="text-xs text-green-600">Gli aggiornamenti vengono controllati automaticamente ogni 4 ore</p>
                    </div>
                </div>
            )}

            {updateState.status === 'available' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <ArrowDownToLine className="w-5 h-5 text-blue-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-blue-800">Aggiornamento disponibile — v{updateState.version}</p>
                            <p className="text-xs text-blue-600">Scarica e installa per ottenere le ultime funzionalità</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDownloadUpdate}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Scarica
                    </button>
                </div>
            )}

            {updateState.status === 'downloading' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-3">
                        <Download className="w-5 h-5 text-blue-500 shrink-0 animate-bounce" />
                        <p className="text-sm font-medium text-blue-800">Download in corso… {updateState.percent}%</p>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-1.5">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${updateState.percent}%` }}
                        />
                    </div>
                </div>
            )}

            {updateState.status === 'downloaded' && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-teal-800">Aggiornamento pronto</p>
                            <p className="text-xs text-teal-600">L'app si riavvierà per completare l'installazione</p>
                        </div>
                    </div>
                    <button
                        onClick={handleInstallUpdate}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors shrink-0"
                    >
                        Installa e riavvia
                    </button>
                </div>
            )}

            {updateState.status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Errore aggiornamento</p>
                        <p className="text-xs text-red-600">{updateState.message}</p>
                    </div>
                </div>
            )}

            {/* Medical Device Bridge */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
                <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-violet-600" />
                    Medical Device Bridge
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                    Collega spirometro (MIR WinSpiro), audiometro (Oscilla) ed ECG (Edan) tramite il protocollo GDT 2.1 per importare i risultati automaticamente nella visita.
                </p>
                {bridgeStatus === null ? (
                    <p className="text-xs text-gray-400">Caricamento stato…</p>
                ) : !bridgeStatus.available ? (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-amber-800">Bridge non disponibile</p>
                            <p className="text-xs text-amber-600">Il file eseguibile del bridge non è stato trovato. Installa il Medical Device Bridge e riavvia l'applicazione.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${bridgeStatus.running ? (bridgeStatus.isSetup ? 'bg-amber-500' : 'bg-green-500') : 'bg-gray-300'}`} />
                                <div>
                                    <p className="text-sm font-medium text-gray-800">
                                        {bridgeStatus.running
                                            ? (bridgeStatus.isSetup ? 'Bridge in attivazione' : 'Bridge in esecuzione')
                                            : 'Bridge fermo'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {bridgeStatus.running
                                            ? `Porta ${bridgeStatus.port} · PID ${bridgeStatus.pid ?? '—'}`
                                            : `Porta configurata: ${bridgeStatus.port}`
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={loadBridgeStatus}
                                    className="px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Aggiorna
                                </button>
                                {bridgeStatus.running ? (
                                    <button
                                        onClick={handleBridgeStop}
                                        disabled={bridgeAction !== null}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                                    >
                                        <Square className="w-3 h-3" />
                                        {bridgeAction === 'stopping' ? 'Arresto…' : 'Ferma'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleBridgeStart}
                                        disabled={bridgeAction !== null}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 disabled:opacity-50 transition-colors"
                                    >
                                        <Play className="w-3 h-3" />
                                        {bridgeAction === 'starting' ? 'Avvio…' : 'Avvia'}
                                    </button>
                                )}
                            </div>
                        </div>
                        {bridgeStatus.running && (
                            <div className={`rounded-xl p-3 flex items-start gap-2 ${bridgeStatus.isSetup ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                                {bridgeStatus.isSetup ? (
                                    <KeyRound className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                    {bridgeStatus.isSetup ? (
                                        <>
                                            <p className="text-xs font-medium text-amber-800 mb-1">
                                                Bridge in modalità attivazione — inserire codice licenza
                                            </p>
                                            <p className="text-xs text-amber-700 mb-2">
                                                Il Bridge è avviato ma non ancora attivato. Apri la pagina di setup e inserisci il codice generato nella web app.
                                            </p>
                                            <button
                                                onClick={() => window.desktopApi?.app.openExternal(`http://localhost:${bridgeStatus.port}/setup`)}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Apri pagina di setup
                                            </button>
                                        </>
                                    ) : (
                                        <p className="text-xs text-green-700">
                                            Bridge pronto. Nella scheda visita usa i pulsanti <strong>ECG</strong>, <strong>Spirometria</strong> o <strong>Audiometria</strong> nella sezione Esami Strumentali per avviare un esame dal dispositivo.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* GDPR Audit Log */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
                <button
                    onClick={handleToggleGdprLog}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-teal-600" />
                        Registro GDPR (Audit Log)
                        {gdprLog.length > 0 && (
                            <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-semibold">
                                {gdprLog.length}
                            </span>
                        )}
                    </h2>
                    {showGdprLog ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {showGdprLog && (
                    <div className="border-t border-gray-100 px-5 pb-5 pt-3 space-y-3">
                        <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Filtra per tipo risorsa..."
                                value={gdprFilter}
                                onChange={e => setGdprFilter(e.target.value)}
                                className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            <button
                                onClick={loadGdprLog}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Aggiorna
                            </button>
                        </div>
                        {gdprLog.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">Nessuna operazione GDPR registrata</p>
                        ) : (
                            <div className="space-y-1.5 max-h-80 overflow-y-auto">
                                {gdprLog
                                    .filter(e => !gdprFilter || e.resourceType.toLowerCase().includes(gdprFilter.toLowerCase()))
                                    .map((entry) => (
                                        <div key={entry.id} className="bg-gray-50 rounded-xl px-3 py-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${entry.action === 'DELETE' ? 'bg-red-100 text-red-700'
                                                            : entry.action === 'UPDATE' ? 'bg-amber-100 text-amber-700'
                                                                : entry.action === 'CREATE' ? 'bg-green-100 text-green-700'
                                                                    : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                            {entry.action}
                                                        </span>
                                                        <span className="text-xs font-medium text-gray-700">{entry.resourceType}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-[160px]">{entry.resourceId}</span>
                                                    </div>
                                                    {entry.reason && (
                                                        <p className="text-[10px] text-gray-500 truncate">Motivo: {entry.reason}</p>
                                                    )}
                                                    {entry.dataAccessed && (
                                                        <p className="text-[10px] text-teal-600">Dati: {entry.dataAccessed}</p>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                                                    {new Date(entry.timestamp).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                        <p className="text-[10px] text-gray-400">
                            Il registro GDPR locale viene sincronizzato automaticamente al prossimo sync.
                            I record definitivi sono nel database cloud.
                        </p>
                    </div>
                )}
            </div>

            {/* Error Log */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
                <button
                    onClick={handleToggleErrorLog}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Bug className="w-4 h-4 text-gray-500" />
                        Log errori
                        {errorLog.length > 0 && (
                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">
                                {errorLog.length}
                            </span>
                        )}
                    </h2>
                    {showErrorLog ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {showErrorLog && (
                    <div className="border-t border-gray-100 px-5 pb-5 pt-3 space-y-3">
                        {errorLog.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">Nessun errore registrato</p>
                        ) : (
                            <>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleClearErrorLog}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors ${clearLogConfirm
                                            ? 'text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
                                            : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        {clearLogConfirm ? 'Conferma cancellazione' : 'Cancella log'}
                                    </button>
                                </div>
                                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                    {errorLog.map((entry) => (
                                        <div key={entry.id} className="bg-red-50 rounded-lg px-3 py-2">
                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                <p className="text-xs font-medium text-red-700 truncate">{entry.message}</p>
                                                <span className="text-[10px] text-red-400 shrink-0">
                                                    {new Date(entry.timestamp).toLocaleString('it-IT')}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-red-500">
                                                {entry.processType} · {entry.errorType}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
