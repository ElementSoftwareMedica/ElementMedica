import { useState, useEffect, useCallback } from 'react'
import {
    Stethoscope,
    Calendar,
    Users,
    Clock,
    Download,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    Loader2,
    Activity,
    Database,
    CalendarDays,
    Plus,
    Building2,
    Receipt,
    Handshake
} from 'lucide-react'
import { GiudziSchedulerWidget } from '../components/GiudziSchedulerWidget'
import { useNavigate } from 'react-router-dom'
import { useConnectivity } from '../context/ConnectivityContext'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import { useSyncStatus } from '../sync/SyncStatusProvider'
import axios from 'axios'
import DatePickerElegante from '@/components/ui/DatePickerElegante'

interface DayStats {
    appuntamenti: number
    visiteCompletate: number
    visitePendenti: number
    lavoratoriVisti: number
    scadenzeOggi: number
    totalePazienti: number
    totaleAziende: number
    tariffariAttivi: number
    convenzioniAttive: number
}

type DesktopSyncPayload = {
    meta?: { counts?: Record<string, number>; tenantId?: string; syncCursor?: string; downloadedAt?: string }
    aziende?: Array<Record<string, unknown>>
    medici?: Array<Record<string, unknown>>
}

const getPayloadSyncCursor = (data: DesktopSyncPayload): string | null => {
    const cursor = data.meta?.syncCursor || data.meta?.downloadedAt
    if (!cursor || Number.isNaN(Date.parse(cursor))) return null
    return cursor
}

const uniqueById = (items: Array<Record<string, unknown>>): Array<Record<string, unknown>> => {
    const map = new Map<string, Record<string, unknown>>()
    for (const item of items) {
        const id = typeof item.id === 'string' ? item.id : ''
        if (id && !map.has(id)) map.set(id, item)
    }
    return Array.from(map.values())
}

async function enrichFullDbFallback(
    data: DesktopSyncPayload,
    apiBase: string,
    headers: Record<string, string>,
    logInfo: (msg: string) => void
): Promise<void> {
    const medici = Array.isArray(data.medici) ? data.medici : []
    const fallbackMedici: Array<Record<string, unknown>> = []
    if (medici.length === 0) {
        const medicoCalls = [
            axios.get(`${apiBase}/api/v1/clinica/medici`, { params: { limit: 500 }, headers, timeout: 60000 }),
            axios.get(`${apiBase}/api/v1/persons`, { params: { roleType: 'RSPP,ASPP,CONSULENTE_SICUREZZA,TECNICO_SICUREZZA,MEDICO_COMPETENTE,MEDICO', limit: 500 }, headers, timeout: 60000 })
        ]
        const results = await Promise.allSettled(medicoCalls)
        for (const result of results) {
            if (result.status !== 'fulfilled') continue
            const payload = result.value.data
            const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
            fallbackMedici.push(...rows)
        }
    }

    const nomineRows: Array<Record<string, unknown>> = []
    const nomineResponse = await axios.get(`${apiBase}/api/v1/clinica/nomine-ruolo`, {
        params: { limit: 1000, stato: 'ATTIVA' },
        headers,
        timeout: 60000
    }).catch(() => null)
    const nominePayload = nomineResponse?.data
    const remoteNomine = Array.isArray(nominePayload?.data) ? nominePayload.data : Array.isArray(nominePayload) ? nominePayload : []
    nomineRows.push(...remoteNomine)

    const professionistiDaNomina = nomineRows
        .map(n => n.person)
        .filter((person): person is Record<string, unknown> => !!person && typeof person === 'object')

    data.medici = uniqueById([...medici, ...fallbackMedici, ...professionistiDaNomina])

    if (Array.isArray(data.aziende) && nomineRows.length > 0) {
        const byCompany = new Map<string, Array<Record<string, unknown>>>()
        for (const nomina of nomineRows) {
            const companyId = typeof nomina.companyTenantProfileId === 'string'
                ? nomina.companyTenantProfileId
                : typeof (nomina.site as Record<string, unknown> | undefined)?.companyTenantProfileId === 'string'
                    ? String((nomina.site as Record<string, unknown>).companyTenantProfileId)
                    : ''
            if (!companyId) continue
            const list = byCompany.get(companyId) || []
            list.push(nomina)
            byCompany.set(companyId, list)
        }
        data.aziende = data.aziende.map(azienda => {
            const companyId = typeof azienda.id === 'string' ? azienda.id : ''
            const existing = Array.isArray(azienda.nomine) ? azienda.nomine as Array<Record<string, unknown>> : []
            const fallback = companyId ? byCompany.get(companyId) || [] : []
            return { ...azienda, nomine: uniqueById([...existing, ...fallback]) }
        })
    }

    data.meta = data.meta || {}
    data.meta.counts = data.meta.counts || {}
    data.meta.counts.medici = data.medici.length
    if (nomineRows.length > 0) data.meta.counts.nomine = nomineRows.length
    if (fallbackMedici.length > 0 || professionistiDaNomina.length > 0 || nomineRows.length > 0) {
        logInfo(`Fallback sync professionisti/nomine: ${data.medici.length} medici, ${nomineRows.length} nomine`)
    }
}

export function DashboardPage(): JSX.Element {
    const navigate = useNavigate()
    const { user, currentTenantId, accessToken } = useDesktopAuth()
    const { isOnline } = useConnectivity()
    const { lastSyncAt, pendingOperations, setSyncState, setLastSyncAt, setErrorMessage, setLastDownloadAt } = useSyncStatus()
    const [stats, setStats] = useState<DayStats>({
        appuntamenti: 0,
        visiteCompletate: 0,
        visitePendenti: 0,
        lavoratoriVisti: 0,
        scadenzeOggi: 0,
        totalePazienti: 0,
        totaleAziende: 0,
        tariffariAttivi: 0,
        convenzioniAttive: 0
    })
    const [isDownloading, setIsDownloading] = useState(false)
    const [downloadMessage, setDownloadMessage] = useState<string | null>(null)
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
    const [downloadType, setDownloadType] = useState<'day' | 'fulldb' | 'range' | null>(null)
    const [rangeStart, setRangeStart] = useState(() => new Date().toISOString().split('T')[0])
    const [rangeEnd, setRangeEnd] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() + 1)
        return d.toISOString().split('T')[0]
    })

    useEffect(() => {
        loadLocalStats()
    }, [selectedDate])

    async function loadLocalStats() {
        try {
            if (!window.desktopApi) return

            const [appointments, visits, scadenze, patients, companies, tariffari, convenzioni] = await Promise.all([
                window.desktopApi.db.query({ table: 'appointments', where: { _isDeleted: 0 } }),
                window.desktopApi.db.query({ table: 'visits', where: { _isDeleted: 0 } }),
                window.desktopApi.db.query({ table: 'scadenze', where: { _isDeleted: 0 } }),
                window.desktopApi.db.query({ table: 'patients', where: { _isDeleted: 0 } }),
                window.desktopApi.db.query({ table: 'companies', where: { _isDeleted: 0 } }),
                window.desktopApi.db.query({ table: 'tariffari', where: { _isDeleted: 0 } }),
                window.desktopApi.db.query({ table: 'convenzioni', where: { _isDeleted: 0 } })
            ]) as Record<string, unknown>[][]

            const now = new Date().toISOString().split('T')[0]

            // Filter by selected date
            const dayAppointments = appointments.filter(a => {
                if (!a.dataOra) return false
                return String(a.dataOra).split('T')[0] === selectedDate
            })
            const dayVisits = visits.filter(v => {
                if (!v.dataVisita) return false
                return String(v.dataVisita).split('T')[0] === selectedDate
            })
            const scadenzeAttive = scadenze.filter(s => !s.eseguita).length

            setStats({
                appuntamenti: dayAppointments.length,
                visiteCompletate: dayVisits.filter(v => v.stato === 'COMPLETATA').length,
                visitePendenti: dayVisits.filter(v => v.stato === 'IN_CORSO').length,
                lavoratoriVisti: new Set(dayVisits.map(v => v.personId)).size,
                scadenzeOggi: scadenzeAttive,
                totalePazienti: patients.length,
                totaleAziende: companies.length,
                tariffariAttivi: tariffari.filter(t => t.attivo === 1 || t.attivo === null).length,
                convenzioniAttive: convenzioni.filter(c => (c.attiva === 1 || c.isActive === 1) && (!c.dataFine || String(c.dataFine) >= now)).length
            })
        } catch {
            // DB not ready
        }
    }

    const handleDownloadDay = useCallback(async (date: string) => {
        if (!isOnline || isDownloading) return

        setIsDownloading(true)
        setDownloadMessage(null)
        setDownloadType('day')
        setSyncState('DOWNLOADING')
        setErrorMessage(null)

        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'
            const token = accessToken || ''

            const response = await axios.get(`${API_BASE}/api/v1/desktop-sync/download-day`, {
                params: { date },
                headers: {
                    Authorization: `Bearer ${token}`,
                    'X-Desktop-Client': 'true',
                    ...(currentTenantId ? { 'X-Tenant-ID': currentTenantId, 'X-Operate-Tenant-Id': currentTenantId } : {})
                },
                timeout: 60000
            })

            const data = response.data
            await window.desktopApi.sync.storeDayData({ data: data as unknown as Record<string, unknown[]> })

            const now = new Date().toISOString()
            setLastSyncAt(now)
            setSyncState('IDLE')

            const counts = data.meta?.counts || {}
            const dayLabel = new Date(date + 'T12:00:00').toLocaleDateString('it-IT')
            if ((counts.appuntamenti || 0) === 0 && (counts.visiteEsistenti || 0) === 0) {
                setDownloadMessage(`Nessun appuntamento per il ${dayLabel}; anagrafiche e dati di supporto aggiornati.`)
            } else {
                setDownloadMessage(
                    `Scaricati dati del ${dayLabel}: ${counts.appuntamenti || 0} appuntamenti, ${counts.pazienti || 0} pazienti, ${counts.visiteEsistenti || 0} visite`
                )
            }

            await loadLocalStats()
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? `HTTP ${error.response?.status ?? 'NETWORK'} ${JSON.stringify(error.response?.data ?? error.message).slice(0, 300)}`
                : error instanceof Error ? error.message : 'unknown'
            window.desktopApi?.app?.logError({ message: `[ERROR] [DownloadDay] ${date} ${detail}` }).catch(() => undefined)
            const message = axios.isAxiosError(error)
                ? error.response?.status === 401
                    ? 'Sessione scaduta — effettua nuovamente il login'
                    : `Errore download giornata (${error.response?.status ?? 'rete'})`
                : 'Errore imprevisto'
            setDownloadMessage(message)
            setSyncState('ERROR')
            setErrorMessage(message)
        } finally {
            setIsDownloading(false)
            setDownloadType(null)
        }
    }, [isOnline, isDownloading, accessToken, setSyncState, setLastSyncAt, setErrorMessage, currentTenantId])

    const handleDownloadFullDb = useCallback(async () => {
        if (!isOnline || isDownloading) return

        setIsDownloading(true)
        setDownloadMessage(null)
        setDownloadType('fulldb')
        setSyncState('DOWNLOADING')
        setErrorMessage(null)

        const logInfo = (msg: string) => {
            console.info(`[DownloadFullDb] ${msg}`)
            window.desktopApi.app.logError({ message: `[INFO] [DownloadFullDb] ${msg}` }).catch(() => undefined)
        }
        const logError = (msg: string) => {
            console.error(`[DownloadFullDb] ${msg}`)
            window.desktopApi.app.logError({ message: `[ERROR] [DownloadFullDb] ${msg}` }).catch(() => undefined)
        }

        logInfo(`Avvio download database completo — tenant: ${currentTenantId || 'n/a'}, online: ${isOnline}`)

        try {
            const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'
            const token = accessToken

            const incrementalSince = lastSyncAt || null
            logInfo(`GET ${API_BASE}/api/v1/desktop-sync/download-full-db${incrementalSince ? `?lastSyncAt=${incrementalSince}` : ''}`)
            const headers = {
                    Authorization: `Bearer ${token}`,
                    'X-Desktop-Client': 'true',
                    ...(currentTenantId ? { 'X-Tenant-ID': currentTenantId, 'X-Operate-Tenant-Id': currentTenantId } : {})
                }
            const response = await axios.get(`${API_BASE}/api/v1/desktop-sync/download-full-db`, {
                params: incrementalSince ? { lastSyncAt: incrementalSince } : undefined,
                headers,
                timeout: 120000
            })

            logInfo(`Risposta ricevuta — status: ${response.status}`)
            const data = response.data as DesktopSyncPayload
            await enrichFullDbFallback(data, API_BASE, headers, logInfo)
            logInfo(`Salvataggio dati in locale…`)
            await window.desktopApi.sync.storeDayData({ data: data as unknown as Record<string, unknown[]> })

            const syncCursor = getPayloadSyncCursor(data) || new Date().toISOString()
            setLastSyncAt(syncCursor)
            setLastDownloadAt(syncCursor) // Attiva l'auto-sync incrementale dal server
            setSyncState('IDLE')

            const counts = data.meta?.counts || {}
            const totalItems = Object.values(counts).reduce((a: number, b) => a + (b as number), 0)
            const parts = [
                counts.pazienti ? `${counts.pazienti} pazienti` : null,
                counts.aziende ? `${counts.aziende} aziende` : null,
                counts.mansioni ? `${counts.mansioni} mansioni` : null,
                counts.prestazioni ? `${counts.prestazioni} prestazioni` : null,
                counts.medici ? `${counts.medici} medici` : null,
                counts.tariffari ? `${counts.tariffari} tariffari` : null,
                counts.convenzioni ? `${counts.convenzioni} convenzioni` : null,
                counts.giudizi ? `${counts.giudizi} giudizi` : null,
                counts.movimenti ? `${counts.movimenti} movimenti` : null,
            ].filter(Boolean)
            const summary = incrementalSince
                ? `Database aggiornato: ${parts.join(', ') || 'nessuna modifica'} (${totalItems} record modificati)`
                : `Database completo scaricato: ${parts.join(', ')} (${totalItems} record totali)`
            logInfo(summary)
            setDownloadMessage(summary)

            await loadLocalStats()
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? `HTTP ${error.response?.status} — ${JSON.stringify(error.response?.data)}`
                : `${error}`
            logError(`Download fallito: ${detail}`)
            const message = axios.isAxiosError(error)
                ? error.response?.status === 401
                    ? 'Sessione scaduta — effettua nuovamente il login'
                    : 'Errore nel download del database'
                : 'Errore imprevisto'
            setDownloadMessage(message)
            setSyncState('ERROR')
            setErrorMessage(message)
        } finally {
            setIsDownloading(false)
            setDownloadType(null)
        }
    }, [isOnline, isDownloading, accessToken, setSyncState, setLastSyncAt, setLastDownloadAt, setErrorMessage, currentTenantId])

    const handleDownloadRange = useCallback(async () => {
        if (!isOnline || isDownloading || !rangeStart || !rangeEnd) return
        if (rangeStart > rangeEnd) {
            setDownloadMessage('La data di inizio deve essere precedente alla data di fine')
            return
        }
        const dates: string[] = []
        const d = new Date(rangeStart + 'T12:00:00')
        const end = new Date(rangeEnd + 'T12:00:00')
        while (d <= end && dates.length < 14) {
            dates.push(d.toISOString().split('T')[0])
            d.setDate(d.getDate() + 1)
        }
        setIsDownloading(true)
        setDownloadMessage(null)
        setDownloadType('range')
        setSyncState('DOWNLOADING')
        setErrorMessage(null)

        // Fetch all days in parallel, write to DB sequentially (SQLite single-writer)
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'
        const token = accessToken
        const headers = {
            Authorization: `Bearer ${token}`,
            'X-Desktop-Client': 'true',
            ...(currentTenantId ? { 'X-Tenant-ID': currentTenantId, 'X-Operate-Tenant-Id': currentTenantId } : {})
        }

        const results = await Promise.allSettled(
            dates.map(date =>
                axios.get(`${API_BASE}/api/v1/desktop-sync/download-day`, { params: { date }, headers, timeout: 60000 })
            )
        )

        let downloaded = 0
        for (const result of results) {
            if (result.status === 'fulfilled') {
                try {
                    await window.desktopApi.sync.storeDayData({ data: result.value.data })
                    downloaded++
                    setDownloadMessage(`Salvati ${downloaded}/${dates.length} giorni...`)
                } catch {
                    // Continue with remaining
                }
            }
        }
        const now = new Date().toISOString()
        setLastSyncAt(now)
        setSyncState('IDLE')
        setDownloadMessage(`Scaricati ${downloaded}/${dates.length} giorni (${new Date(rangeStart + 'T12:00:00').toLocaleDateString('it-IT')} → ${new Date(rangeEnd + 'T12:00:00').toLocaleDateString('it-IT')})`)
        setIsDownloading(false)
        setDownloadType(null)
        await loadLocalStats()
    }, [isOnline, isDownloading, accessToken, rangeStart, rangeEnd, setSyncState, setLastSyncAt, setErrorMessage, currentTenantId])

    const greeting = (() => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Buongiorno'
        if (hour < 18) return 'Buon pomeriggio'
        return 'Buonasera'
    })()

    const today = new Date().toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    })

    return (
        <div className="max-w-5xl mx-auto space-y-5">
            {/* Welcome Header */}
            <div className="bg-gradient-to-br from-teal-600 via-teal-600 to-teal-700 rounded-2xl p-6 text-white relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 right-20 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />

                <div className="relative z-10">
                    <p className="text-teal-200 text-xs font-medium uppercase tracking-wider">{today}</p>
                    <h1 className="text-xl font-bold font-heading mt-1">
                        {greeting}, Dott. {user?.lastName || 'Medico'}
                    </h1>

                    {lastSyncAt && (
                        <p className="text-xs text-teal-200/70 mt-1">
                            Ultimo sync: {new Date(lastSyncAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>
            </div>

            {/* Download Panel */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Download className="w-4 h-4 text-teal-600" />
                    <h3 className="text-sm font-semibold text-gray-800 font-heading">Scarica Dati</h3>
                    {!isOnline && (
                        <span className="ml-auto text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Offline</span>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* Day download with date picker */}
                    <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-teal-500" />
                            <span className="text-[13px] font-medium text-gray-700">Scarica giornata</span>
                        </div>
                        <p className="text-[11px] text-gray-400">Scarica appuntamenti, pazienti coinvolti e visite per una data specifica</p>
                        <div className="flex items-center gap-2 mt-auto">
                            <div className="flex-1 min-w-0">
                                <DatePickerElegante
                                    value={selectedDate}
                                    onChange={(date) => {
                                        if (date) setSelectedDate(date.toISOString().split('T')[0])
                                    }}
                                    placeholder="Seleziona data"
                                />
                            </div>
                            <button
                                onClick={() => handleDownloadDay(selectedDate)}
                                disabled={!isOnline || isDownloading}
                                className="shrink-0 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-1.5"
                            >
                                {isDownloading && downloadType === 'day' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Download className="w-3.5 h-3.5" />
                                )}
                                Scarica
                            </button>
                        </div>
                    </div>

                    {/* Multi-day range download */}
                    <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-violet-500" />
                            <span className="text-[13px] font-medium text-gray-700">Scarica più giorni</span>
                        </div>
                        <p className="text-[11px] text-gray-400">Scarica un intervallo di date (max 14 giorni) — utile per trasferte</p>
                        <div className="flex flex-col gap-2 mt-auto">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <DatePickerElegante
                                        value={rangeStart}
                                        onChange={(date) => { if (date) setRangeStart(date.toISOString().split('T')[0]) }}
                                        placeholder="Da"
                                    />
                                </div>
                                <span className="text-gray-300 text-[13px] shrink-0">→</span>
                                <div className="flex-1 min-w-0">
                                    <DatePickerElegante
                                        value={rangeEnd}
                                        onChange={(date) => { if (date) setRangeEnd(date.toISOString().split('T')[0]) }}
                                        placeholder="A"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleDownloadRange}
                                disabled={!isOnline || isDownloading}
                                className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5"
                            >
                                {isDownloading && downloadType === 'range' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Download className="w-3.5 h-3.5" />
                                )}
                                Scarica range
                            </button>
                        </div>
                    </div>

                    {/* Full DB download */}
                    <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-blue-500" />
                            <span className="text-[13px] font-medium text-gray-700">Database completo</span>
                        </div>
                        <p className="text-[11px] text-gray-400">Scarica tutti i pazienti, aziende, mansioni, protocolli, scadenze del tenant</p>
                        <button
                            onClick={handleDownloadFullDb}
                            disabled={!isOnline || isDownloading}
                            className="mt-auto w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5"
                        >
                            {isDownloading && downloadType === 'fulldb' ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Scaricamento completo...
                                </>
                            ) : (
                                <>
                                    <Database className="w-3.5 h-3.5" />
                                    Scarica tutto il database
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {downloadMessage && (
                    <p className={`mt-3 text-xs rounded-lg px-3 py-2 ${downloadMessage.startsWith('Errore') || downloadMessage.startsWith('Sessione') ? 'text-red-700 bg-red-50' : 'text-gray-600 bg-gray-50'}`}>
                        {downloadMessage}
                    </p>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Calendar} label="Appuntamenti" value={stats.appuntamenti} color="teal" onClick={() => navigate('/agenda')} />
                <StatCard icon={Stethoscope} label="Visite Completate" value={stats.visiteCompletate} color="green" onClick={() => navigate('/visite')} />
                <StatCard icon={Users} label="Pazienti in DB" value={stats.totalePazienti} color="blue" onClick={() => navigate('/pazienti')} />
                <StatCard icon={Building2} label="Aziende in DB" value={stats.totaleAziende} color="violet" onClick={() => navigate('/aziende')} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard icon={Clock} label="Visite in Corso" value={stats.visitePendenti} color="amber" onClick={() => navigate('/visite')} />
                <StatCard icon={Users} label="Lavoratori Visti" value={stats.lavoratoriVisti} color="teal" onClick={() => navigate('/pazienti')} />
                <StatCard icon={AlertTriangle} label="Scadenze Attive" value={stats.scadenzeOggi} color="red" onClick={() => navigate('/scadenze')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <StatCard icon={Receipt} label="Tariffari Attivi" value={stats.tariffariAttivi} color="violet" onClick={() => navigate('/tariffari')} />
                <StatCard icon={Handshake} label="Convenzioni Attive" value={stats.convenzioniAttive} color="green" onClick={() => navigate('/convenzioni')} />
            </div>

            {/* Giudizi Scheduler */}
            <GiudziSchedulerWidget />

            {/* Status Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Sync Status */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-800 font-heading">Stato Sincronizzazione</h3>
                    </div>
                    <div className="space-y-3">
                        <StatusRow
                            icon={isOnline ? CheckCircle2 : AlertTriangle}
                            label="Connessione"
                            value={isOnline ? 'Online' : 'Offline'}
                            color={isOnline ? 'green' : 'amber'}
                        />
                        <StatusRow
                            icon={Clock}
                            label="Operazioni in coda"
                            value={String(pendingOperations)}
                            color={pendingOperations > 0 ? 'amber' : 'green'}
                        />
                        <StatusRow
                            icon={CheckCircle2}
                            label="Ultima sincronizzazione"
                            value={lastSyncAt ? new Date(lastSyncAt).toLocaleString('it-IT') : 'Mai'}
                            color={lastSyncAt ? 'green' : 'gray'}
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-5">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4 font-heading">Azioni Rapide</h3>
                    <div className="space-y-1">
                        <QuickAction label="Inizia visite della giornata" icon={Calendar} onClick={() => navigate('/agenda')} />
                        <QuickAction label="Nuova visita non programmata" icon={Plus} onClick={() => navigate('/visite/nuova')} />
                        <QuickAction label="Scadenze in evidenza" icon={AlertTriangle} onClick={() => navigate('/scadenze')} />
                        <QuickAction label="Gestisci aziende" icon={Building2} onClick={() => navigate('/aziende')} />
                        <QuickAction label="Tutti i lavoratori" icon={Users} onClick={() => navigate('/pazienti')} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({
    icon: Icon,
    label,
    value,
    color,
    onClick
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: number
    color: string
    onClick?: () => void
}): JSX.Element {
    const bgMap: Record<string, string> = {
        teal: 'bg-teal-50',
        green: 'bg-emerald-50',
        blue: 'bg-blue-50',
        amber: 'bg-amber-50',
        red: 'bg-red-50',
        violet: 'bg-violet-50'
    }
    const iconColor: Record<string, string> = {
        teal: 'text-teal-600',
        green: 'text-emerald-600',
        blue: 'text-blue-600',
        amber: 'text-amber-600',
        red: 'text-red-600',
        violet: 'text-violet-600'
    }
    const valueColor: Record<string, string> = {
        teal: 'text-teal-700',
        green: 'text-emerald-700',
        blue: 'text-blue-700',
        amber: 'text-amber-700',
        red: 'text-red-700',
        violet: 'text-violet-700'
    }

    return (
        <button
            onClick={onClick}
            className="bg-white rounded-xl border border-gray-200/80 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
        >
            <div className={`w-9 h-9 rounded-xl ${bgMap[color]} flex items-center justify-center mb-3`}>
                <Icon className={`w-4.5 h-4.5 ${iconColor[color]}`} />
            </div>
            <p className={`text-2xl font-bold ${valueColor[color]}`}>{value}</p>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</p>
        </button>
    )
}

function StatusRow({
    icon: Icon,
    label,
    value,
    color
}: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string
    color: string
}): JSX.Element {
    const colorMap: Record<string, string> = {
        green: 'text-emerald-500',
        amber: 'text-amber-500',
        gray: 'text-gray-400'
    }

    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 ${colorMap[color]}`} />
                <span className="text-[13px] text-gray-600">{label}</span>
            </div>
            <span className="text-[13px] font-medium text-gray-800">{value}</span>
        </div>
    )
}

function QuickAction({
    label,
    icon: Icon,
    onClick
}: {
    label: string
    icon: React.ComponentType<{ className?: string }>
    onClick: () => void
}): JSX.Element {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-150 group"
        >
            <Icon className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-colors" />
            <span className="flex-1 text-left">{label}</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
        </button>
    )
}
