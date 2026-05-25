import { useState, useEffect, useCallback } from 'react'
import { Send, CheckCircle2, AlertTriangle, WifiOff, Loader2, CalendarCheck, FileText, Mail, Archive } from 'lucide-react'

interface BatchResult {
    date: string
    status: 'success' | 'failed' | 'no_giudizi' | 'offline'
    giudiziTrovati?: number
    pdfGenerati?: number
    emailInviati?: number
    zipAziende?: number
    error?: string
    completedAt?: string
}

interface SchedulerStatus {
    lastRun: string | null
    lastResult: BatchResult | null
    isRunning: boolean
}

const STATUS_CONFIG: Record<BatchResult['status'], { label: string; icon: React.ComponentType<{ className?: string }>; badge: string; dot: string }> = {
    success: { label: 'Inviato', icon: CheckCircle2, badge: 'text-emerald-700 bg-emerald-50', dot: 'bg-emerald-500' },
    no_giudizi: { label: 'Nessun giudizio', icon: CalendarCheck, badge: 'text-gray-600 bg-gray-50', dot: 'bg-gray-400' },
    failed: { label: 'Invio fallito', icon: AlertTriangle, badge: 'text-red-700 bg-red-50', dot: 'bg-red-500' },
    offline: { label: 'Offline', icon: WifiOff, badge: 'text-amber-700 bg-amber-50', dot: 'bg-amber-500' },
}

export function GiudziSchedulerWidget(): JSX.Element {
    const [status, setStatus] = useState<SchedulerStatus>({ lastRun: null, lastResult: null, isRunning: false })
    const [isSending, setIsSending] = useState(false)

    const refresh = useCallback(async () => {
        try {
            const s = await window.desktopApi.giudizi.getStatus()
            setStatus(s)
        } catch {
            // IPC not ready yet
        }
    }, [])

    useEffect(() => {
        refresh()

        // Listen for real-time results from the scheduler
        const listener = (_event: unknown, result: BatchResult) => {
            setStatus(prev => ({ ...prev, lastResult: result, lastRun: result.date, isRunning: false }))
            setIsSending(false)
        }
        window.desktopApi.on.giudziiBatchResult(listener)

        return () => {
            window.desktopApi.on.removeAllListeners('giudizi:batchResult')
        }
    }, [refresh])

    const handleSendNow = useCallback(async () => {
        if (isSending || status.isRunning) return
        setIsSending(true)
        try {
            const result = await window.desktopApi.giudizi.runBatch(true)
            setStatus(prev => ({ ...prev, lastResult: result, lastRun: result.date, isRunning: false }))
        } catch {
            // Result will arrive via event listener
        } finally {
            setIsSending(false)
        }
    }, [isSending, status.isRunning])

    const isRunningNow = isSending || status.isRunning
    const lastResult = status.lastResult
    const lastRun = status.lastRun

    const today = new Date().toISOString().slice(0, 10)
    const ranToday = lastRun === today
    const alreadySentToday = ranToday && (lastResult?.status === 'success' || lastResult?.status === 'no_giudizi')

    const nextSendLabel = (() => {
        if (isRunningNow) return 'Invio in corso…'
        if (alreadySentToday) return 'Già elaborato oggi'
        const now = new Date()
        if (now.getHours() >= 22) return 'In attesa di elaborazione…'
        return 'Prossimo invio automatico: oggi alle 22:00'
    })()

    return (
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-semibold text-gray-800 font-heading">Giudizi Idoneità — Invio Automatico</h3>
                </div>
                <button
                    onClick={handleSendNow}
                    disabled={isRunningNow}
                    title="Forza l'invio immediato del batch"
                    className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white transition-colors"
                >
                    {isRunningNow ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Send className="w-3.5 h-3.5" />
                    )}
                    Invia ora
                </button>
            </div>

            {/* Next send info */}
            <p className={`text-[11px] mb-4 font-medium ${alreadySentToday ? 'text-emerald-600' : isRunningNow ? 'text-teal-600' : 'text-gray-400'}`}>
                {nextSendLabel}
            </p>

            {/* Last result */}
            {lastResult ? (
                <div className="space-y-3">
                    {/* Status badge row */}
                    <div className="flex items-center gap-3">
                        {(() => {
                            const cfg = STATUS_CONFIG[lastResult.status]
                            const Icon = cfg.icon
                            return (
                                <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full ${cfg.badge}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                    <Icon className="w-3.5 h-3.5" />
                                    {cfg.label}
                                </span>
                            )
                        })()}
                        <span className="text-[11px] text-gray-400 ml-auto">
                            {lastResult.completedAt
                                ? new Date(lastResult.completedAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                : lastResult.date}
                        </span>
                    </div>

                    {/* Stats row */}
                    {(lastResult.status === 'success') && (
                        <div className="grid grid-cols-4 gap-2">
                            <StatItem icon={FileText} label="Giudizi" value={lastResult.giudiziTrovati ?? 0} />
                            <StatItem icon={FileText} label="PDF" value={lastResult.pdfGenerati ?? 0} />
                            <StatItem icon={Mail} label="Email" value={lastResult.emailInviati ?? 0} />
                            <StatItem icon={Archive} label="ZIP" value={lastResult.zipAziende ?? 0} />
                        </div>
                    )}

                    {/* Error message */}
                    {(lastResult.status === 'failed' || lastResult.status === 'offline') && lastResult.error && (
                        <p className="text-[11px] text-red-600 bg-red-50 rounded-lg px-3 py-2 font-mono break-all">
                            {lastResult.error}
                        </p>
                    )}
                </div>
            ) : (
                <p className="text-[12px] text-gray-400">Nessun invio eseguito ancora oggi.</p>
            )}
        </div>
    )
}

function StatItem({
    icon: Icon,
    label,
    value
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: number
}): JSX.Element {
    return (
        <div className="bg-gray-50 rounded-xl p-2.5 text-center">
            <Icon className="w-3.5 h-3.5 text-teal-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-gray-800">{value}</p>
            <p className="text-[10px] text-gray-400">{label}</p>
        </div>
    )
}
