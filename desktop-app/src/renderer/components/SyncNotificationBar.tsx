import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, RefreshCw, X, WifiOff, Clock } from 'lucide-react'
import { useSyncStatus, type SyncState, type SyncSummary } from '../sync/SyncStatusProvider'
import { useConnectivity } from '../context/ConnectivityContext'

const SUCCESS_DISMISS_DELAY = 4000 // ms

/**
 * SyncNotificationBar — barra full-width che appare sotto il top-bar durante/dopo la sincronizzazione.
 *
 * - UPLOADING/DOWNLOADING → barra teal con progress bar e testo "L'app continua a funzionare"
 * - IDLE (dopo sync) → barra verde con riepilogo, si nasconde automaticamente dopo 4s
 * - IDLE + pendingOperations > 0 + online → barra azzurra "In coda — invio a breve"
 * - IDLE + pendingOperations > 0 + offline → barra ambra "Offline — invio al ritorno"
 * - ERROR → barra rossa con messaggio, dismissabile manualmente
 * - RESOLVING_CONFLICTS → barra ambra
 */
export function SyncNotificationBar(): JSX.Element | null {
    const { syncState, progress, errorMessage, lastSyncSummary, pendingOperations } = useSyncStatus()
    const { isOnline } = useConnectivity()

    type NotifState = 'hidden' | 'syncing' | 'success' | 'error' | 'conflict' | 'pending-online' | 'pending-offline'
    const [notifState, setNotifState] = useState<NotifState>('hidden')
    const [successSummary, setSuccessSummary] = useState<SyncSummary | null>(null)
    const prevSyncStateRef = useRef<SyncState>('IDLE')
    const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const prev = prevSyncStateRef.current
        prevSyncStateRef.current = syncState

        // Clear previous auto-dismiss timer
        if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current)
            dismissTimerRef.current = null
        }

        if (syncState === 'UPLOADING' || syncState === 'DOWNLOADING') {
            setNotifState('syncing')
        } else if (syncState === 'ERROR') {
            setNotifState('error')
        } else if (syncState === 'RESOLVING_CONFLICTS') {
            setNotifState('conflict')
        } else if (
            syncState === 'IDLE' &&
            (prev === 'UPLOADING' || prev === 'DOWNLOADING')
        ) {
            // Transition from syncing → idle = sync completed
            if (lastSyncSummary && (lastSyncSummary.success > 0 || lastSyncSummary.conflict > 0 || lastSyncSummary.error > 0)) {
                setSuccessSummary(lastSyncSummary)
                setNotifState('success')
                dismissTimerRef.current = setTimeout(() => setNotifState('hidden'), SUCCESS_DISMISS_DELAY)
            } else {
                setNotifState('hidden')
            }
        } else if (syncState === 'IDLE' && pendingOperations > 0) {
            // Nothing is syncing but there are items in the queue
            setNotifState(isOnline ? 'pending-online' : 'pending-offline')
        } else if (syncState === 'IDLE' && notifState !== 'success' && notifState !== 'error' && notifState !== 'conflict') {
            setNotifState('hidden')
        }

        return () => {
            if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
        }
    }, [syncState, lastSyncSummary, pendingOperations, isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

    const dismiss = () => {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
        setNotifState('hidden')
    }

    // Progress percentage
    const pct = progress && progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : null

    if (notifState === 'hidden') return null

    // Syncing (upload or download)
    if (notifState === 'syncing') {
        return (
            <div className="bg-teal-600 text-white flex items-center gap-3 px-5 py-1.5 text-xs shrink-0">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span className="font-medium">
                    {syncState === 'DOWNLOADING' ? 'Scaricamento dati' : 'Sincronizzazione in corso'}
                    {progress ? ` — ${progress.current}/${progress.total} operazioni` : '...'}
                </span>

                {/* Progress bar */}
                {pct !== null && (
                    <div className="flex items-center gap-2 ml-2">
                        <div className="w-28 h-1.5 bg-teal-500/60 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className="text-teal-100 text-[11px] w-7 text-right">{pct}%</span>
                    </div>
                )}

                <span className="ml-auto text-teal-200 text-[10px] shrink-0">
                    L'app continua a funzionare normalmente
                </span>
            </div>
        )
    }

    // Success
    if (notifState === 'success' && successSummary) {
        const mod = successSummary.success
        return (
            <div className="bg-green-50 border-b border-green-200 text-green-800 flex items-center gap-3 px-5 py-1.5 text-xs shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-500" />
                <span>
                    <span className="font-medium">Sincronizzazione completata</span>
                    {mod > 0 && ` — ${mod} ${mod === 1 ? 'modifica' : 'modifiche'} sincronizzate`}
                    {successSummary.conflict > 0 && (
                        <span className="text-amber-700"> · {successSummary.conflict} {successSummary.conflict === 1 ? 'conflitto' : 'conflitti'} da risolvere</span>
                    )}
                </span>
                <button
                    onClick={dismiss}
                    className="ml-auto p-0.5 hover:bg-green-100 rounded transition-colors"
                    title="Chiudi"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        )
    }

    // Conflict
    if (notifState === 'conflict') {
        return (
            <div className="bg-amber-50 border-b border-amber-200 text-amber-800 flex items-center gap-3 px-5 py-1.5 text-xs shrink-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>
                    <span className="font-medium">Conflitti da risolvere</span> — vai alla pagina Sincronizzazione per gestirli
                </span>
                <button
                    onClick={dismiss}
                    className="ml-auto p-0.5 hover:bg-amber-100 rounded transition-colors"
                    title="Chiudi"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        )
    }

    // Error
    if (notifState === 'error') {
        return (
            <div className="bg-red-50 border-b border-red-200 text-red-800 flex items-center gap-3 px-5 py-1.5 text-xs shrink-0">
                <WifiOff className="w-3.5 h-3.5 shrink-0 text-red-500" />
                <span>
                    <span className="font-medium">Errore sincronizzazione</span>
                    {errorMessage ? ` — ${errorMessage}` : ''}
                </span>
                <button
                    onClick={dismiss}
                    className="ml-auto p-0.5 hover:bg-red-100 rounded transition-colors"
                    title="Chiudi"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        )
    }

    // Pending online — items in queue, will auto-sync shortly
    if (notifState === 'pending-online') {
        return (
            <div className="bg-sky-50 border-b border-sky-200 text-sky-800 flex items-center gap-3 px-5 py-1.5 text-xs shrink-0">
                <Clock className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                <span>
                    <span className="font-medium">{pendingOperations} {pendingOperations === 1 ? 'modifica in coda' : 'modifiche in coda'}</span>
                    {' — '}invio automatico a breve
                </span>
                <button
                    onClick={dismiss}
                    className="ml-auto p-0.5 hover:bg-sky-100 rounded transition-colors"
                    title="Chiudi"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        )
    }

    // Pending offline — items in queue, will sync when back online
    if (notifState === 'pending-offline') {
        return (
            <div className="bg-amber-50 border-b border-amber-200 text-amber-800 flex items-center gap-3 px-5 py-1.5 text-xs shrink-0">
                <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>
                    <span className="font-medium">Offline</span>
                    {' — '}{pendingOperations} {pendingOperations === 1 ? 'modifica salvata' : 'modifiche salvate'} localmente, invio automatico al ritorno online
                </span>
            </div>
        )
    }

    return null
}
