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
  Loader2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useConnectivity } from '../context/ConnectivityContext'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import { useSyncStatus } from '../sync/SyncStatusProvider'
import axios from 'axios'

interface DayStats {
  appuntamenti: number
  visiteCompletate: number
  visitePendenti: number
  lavoratoriVisti: number
  scadenzeOggi: number
}

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate()
  const { user } = useDesktopAuth()
  const { isOnline } = useConnectivity()
  const { lastSyncAt, pendingOperations, setSyncState, setLastSyncAt, setErrorMessage } = useSyncStatus()
  const [stats, setStats] = useState<DayStats>({
    appuntamenti: 0,
    visiteCompletate: 0,
    visitePendenti: 0,
    lavoratoriVisti: 0,
    scadenzeOggi: 0
  })
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null)

  // Load local stats
  useEffect(() => {
    loadLocalStats()
  }, [])

  async function loadLocalStats() {
    try {
      if (!window.desktopApi) return

      const appointments = await window.desktopApi.db.query({
        table: 'appointments',
        where: { _isDeleted: 0 }
      }) as Record<string, unknown>[]

      const visits = await window.desktopApi.db.query({
        table: 'visits',
        where: { _isDeleted: 0 }
      }) as Record<string, unknown>[]

      const scadenze = await window.desktopApi.db.query({
        table: 'scadenze',
        where: { _isDeleted: 0 }
      }) as Record<string, unknown>[]

      // Count non-completed scadenze
      const scadenzeAttive = scadenze.filter(s => !s.eseguita).length

      setStats({
        appuntamenti: appointments.length,
        visiteCompletate: visits.filter(v => v.stato === 'COMPLETATA').length,
        visitePendenti: visits.filter(v => v.stato === 'INIZIATA' || v.stato === 'IN_CORSO').length,
        lavoratoriVisti: new Set(visits.map(v => v.personId)).size,
        scadenzeOggi: scadenzeAttive
      })
    } catch {
      // DB not ready yet — will show zeros
    }
  }

  const handleDownloadDay = useCallback(async () => {
    if (!isOnline || isDownloading) return

    setIsDownloading(true)
    setDownloadMessage(null)
    setSyncState('DOWNLOADING')
    setErrorMessage(null)

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'
      const token = localStorage.getItem('desktop_accessToken')
      const today = new Date().toISOString().split('T')[0]

      const response = await axios.get(`${API_BASE}/api/v1/desktop-sync/download-day`, {
        params: { date: today },
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Desktop-Client': 'true'
        },
        timeout: 60000
      })

      const data = response.data

      // Store all data in local SQLite via IPC
      await window.desktopApi.sync.storeDayData({ data })

      const now = new Date().toISOString()
      setLastSyncAt(now)
      setSyncState('IDLE')

      const counts = data.meta?.counts || {}
      setDownloadMessage(
        `Scaricati: ${counts.appuntamenti || 0} appuntamenti, ${counts.pazienti || 0} pazienti, ${counts.visiteEsistenti || 0} visite`
      )

      // Reload local stats
      await loadLocalStats()
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.status === 401
          ? 'Sessione scaduta — effettua nuovamente il login'
          : 'Errore nel download dei dati'
        : 'Errore imprevisto'
      setDownloadMessage(message)
      setSyncState('ERROR')
      setErrorMessage(message)
    } finally {
      setIsDownloading(false)
    }
  }, [isOnline, isDownloading, setSyncState, setLastSyncAt, setErrorMessage])

  const today = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white shadow-card">
        <h1 className="text-xl font-semibold font-heading">
          Buongiorno, Dott. {user?.lastName}
        </h1>
        <p className="text-teal-100 text-sm mt-1">{today}</p>

        {/* Download Day CTA */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleDownloadDay}
            disabled={!isOnline || isDownloading}
            className="bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scaricamento...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Scarica dati di oggi
              </>
            )}
          </button>
          {lastSyncAt && (
            <span className="text-xs text-teal-200">
              Ultimo sync: {new Date(lastSyncAt).toLocaleTimeString('it-IT')}
            </span>
          )}
        </div>
        {downloadMessage && (
          <p className="mt-2 text-xs text-teal-100">{downloadMessage}</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Calendar}
          label="Appuntamenti"
          value={stats.appuntamenti}
          color="teal"
          onClick={() => navigate('/agenda')}
        />
        <StatCard
          icon={Stethoscope}
          label="Visite Completate"
          value={stats.visiteCompletate}
          color="green"
          onClick={() => navigate('/visite')}
        />
        <StatCard
          icon={Users}
          label="Lavoratori Visti"
          value={stats.lavoratoriVisti}
          color="blue"
          onClick={() => navigate('/pazienti')}
        />
        <StatCard
          icon={Clock}
          label="Visite in Corso"
          value={stats.visitePendenti}
          color="amber"
          onClick={() => navigate('/visite')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Scadenze Attive"
          value={stats.scadenzeOggi}
          color="red"
          onClick={() => navigate('/scadenze')}
        />
      </div>

      {/* Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sync Status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card hover:shadow-card-hover transition-shadow">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 font-heading">Stato Sincronizzazione</h3>
          <div className="space-y-2">
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
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card hover:shadow-card-hover transition-shadow">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 font-heading">Azioni Rapide</h3>
          <div className="space-y-2">
            <QuickAction
              label="Inizia visite della giornata"
              onClick={() => navigate('/agenda')}
            />
            <QuickAction
              label="Scadenze in scadenza oggi"
              onClick={() => navigate('/scadenze')}
            />
            <QuickAction
              label="Gestisci aziende"
              onClick={() => navigate('/aziende')}
            />
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
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-700',
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700'
  }
  const iconColor: Record<string, string> = {
    teal: 'text-teal-500',
    green: 'text-green-500',
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    red: 'text-red-500'
  }

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-card-hover transition-all shadow-card"
    >
      <div className={`w-8 h-8 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${iconColor[color]}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
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
    green: 'text-green-500',
    amber: 'text-amber-500',
    gray: 'text-gray-400'
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${colorMap[color]}`} />
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  )
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <span>{label}</span>
      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
    </button>
  )
}
