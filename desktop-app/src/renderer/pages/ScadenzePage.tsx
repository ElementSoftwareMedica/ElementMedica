import { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  Search,
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Building2,
  Stethoscope,
  CheckCheck
} from 'lucide-react'
import { usePersistentPageState } from '../hooks/usePersistentPageState'

interface Scadenza {
  id: string
  _serverId: string | null
  personId: string | null
  dataScadenza: string
  eseguita: number
  personFirstName: string | null
  personLastName: string | null
  mansione: string | null
  prestazioneNome: string | null
  companyName: string | null
  periodicitaMesi: number | null
  stato: string | null
}

interface PatientLookup {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  companyTenantProfileId?: string | null
}

interface CompanyLookup {
  id: string
  ragioneSociale: string | null
}

type Urgenza = 'scaduto' | 'critico' | 'urgente' | 'attenzione' | 'programmato'

const URGENZA_CONFIG: Record<Urgenza, { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  scaduto: { label: 'Scaduto', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
  critico: { label: 'Critico (<7gg)', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
  urgente: { label: 'Urgente (7-30gg)', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock },
  attenzione: { label: 'Attenzione (30-60gg)', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Bell },
  programmato: { label: 'Programmato (>60gg)', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 }
}

function getUrgenza(dataScadenza: string): Urgenza {
  const now = new Date()
  const scad = new Date(dataScadenza)
  const diffDays = Math.floor((scad.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'scaduto'
  if (diffDays < 7) return 'critico'
  if (diffDays < 30) return 'urgente'
  if (diffDays < 60) return 'attenzione'
  return 'programmato'
}

export function ScadenzePage(): JSX.Element {
  const [scadenze, setScadenze] = useState<Scadenza[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = usePersistentPageState('scadenze:searchTerm', '')
  const [filterUrgenza, setFilterUrgenza] = usePersistentPageState<string>('scadenze:filterUrgenza', '')
  const [showCompleted, setShowCompleted] = usePersistentPageState('scadenze:showCompleted', false)
  const [markingDone, setMarkingDone] = useState<string | null>(null)

  const loadScadenze = useCallback(async () => {
    setLoading(true)
    try {
      if (!window.desktopApi) return
      const rows = await window.desktopApi.db.query({
        table: 'scadenze',
        where: { _isDeleted: 0 },
        orderBy: { column: 'dataScadenza', direction: 'ASC' }
      }) as Scadenza[]
      const needsEnrichment = rows.some(row => !row.personFirstName || !row.personLastName || !row.companyName)
      if (!needsEnrichment) {
        setScadenze(rows)
        return
      }
      const [patients, companies] = await Promise.all([
        window.desktopApi.db.query({ table: 'patients', where: { _isDeleted: 0 } }).catch(() => []) as Promise<PatientLookup[]>,
        window.desktopApi.db.query({ table: 'companies', where: { _isDeleted: 0 } }).catch(() => []) as Promise<CompanyLookup[]>,
      ])
      const patientMap = new Map(patients.map(patient => [patient.id, patient]))
      const companyMap = new Map(companies.map(company => [company.id, company]))
      setScadenze(rows.map(row => {
        const patient = row.personId ? patientMap.get(row.personId) : undefined
        const company = patient?.companyTenantProfileId ? companyMap.get(patient.companyTenantProfileId) : undefined
        return {
          ...row,
          personFirstName: row.personFirstName || patient?.firstName || null,
          personLastName: row.personLastName || patient?.lastName || null,
          companyName: row.companyName || patient?.companyName || company?.ragioneSociale || null,
        }
      }))
    } catch {
      // DB not ready
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadScadenze() }, [loadScadenze])

  const handleMarkDone = useCallback(async (scadenzaId: string): Promise<void> => {
    if (!window.desktopApi || markingDone) return
    setMarkingDone(scadenzaId)
    try {
      const now = new Date().toISOString()
      await window.desktopApi.db.update({
        table: 'scadenze',
        id: scadenzaId,
        data: { eseguita: 1, dataEsecuzione: now }
      })
      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'scadenze',
        entityId: scadenzaId,
        payload: { status: 'COMPLETATA', completatoAt: now }
      })
      await loadScadenze()
    } catch {
      // Non-blocking
    } finally {
      setMarkingDone(null)
    }
  }, [loadScadenze, markingDone])

  const pending = scadenze.filter(s => !s.eseguita)
  const completed = scadenze.filter(s => !!s.eseguita)
  const activeList = showCompleted ? completed : pending
  const enriched = activeList.map(s => ({ ...s, urgenza: getUrgenza(s.dataScadenza) }))
  const filtered = enriched.filter(s => {
    const matchSearch = !searchTerm || [
      s.personFirstName, s.personLastName, s.prestazioneNome, s.companyName, s.mansione
    ].some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchUrgenza = !filterUrgenza || s.urgenza === filterUrgenza
    return matchSearch && matchUrgenza
  })

  // Stats
  const stats = enriched.reduce((acc, s) => {
    acc[s.urgenza] = (acc[s.urgenza] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-600" />
          Scadenze MDL
        </h1>
        <button
          onClick={loadScadenze}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Aggiorna
        </button>
      </div>

      {/* Toggle: pending vs completed */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setShowCompleted(false); setFilterUrgenza('') }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !showCompleted ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Da fare ({pending.length})
        </button>
        <button
          onClick={() => { setShowCompleted(true); setFilterUrgenza('') }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showCompleted ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Completate ({completed.length})
        </button>
      </div>

      {/* Urgency Stats */}
      {!showCompleted && enriched.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.entries(URGENZA_CONFIG) as [Urgenza, typeof URGENZA_CONFIG[Urgenza]][]).map(([key, conf]) => {
            const count = stats[key] || 0
            if (count === 0) return null
            const UrgIcon = conf.icon
            return (
              <button
                key={key}
                onClick={() => setFilterUrgenza(prev => prev === key ? '' : key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterUrgenza === key ? `${conf.bg} ${conf.text} ring-1 ring-current` : `${conf.bg} ${conf.text} opacity-80 hover:opacity-100`
                }`}
              >
                <UrgIcon className="w-3 h-3" />
                {conf.label.split('(')[0].trim()}: {count}
              </button>
            )
          })}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per lavoratore, prestazione, azienda..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <p className="text-xs text-gray-500">{filtered.length} scadenz{filtered.length === 1 ? 'a' : 'e'}</p>

      {/* Scadenze List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-card">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {scadenze.length === 0
              ? 'Nessuna scadenza scaricata. Scarica i dati dalla Dashboard.'
              : 'Nessuna scadenza corrisponde ai filtri.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const conf = URGENZA_CONFIG[s.urgenza]
            const UrgIcon = conf.icon
            const dataScad = new Date(s.dataScadenza)
            const daysUntil = Math.floor((dataScad.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border p-4 shadow-card hover:shadow-card-hover transition-all ${conf.border}`}
              >
                <div className="flex items-center gap-4">
                  {/* Urgency indicator */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${conf.bg}`}>
                    <UrgIcon className={`w-5 h-5 ${conf.text}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {s.personLastName} {s.personFirstName}
                      </p>
                      {s.mansione && (
                        <span className="text-[10px] text-gray-400 truncate hidden md:inline">— {s.mansione}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {s.prestazioneNome && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" />{s.prestazioneNome}
                        </span>
                      )}
                      {s.companyName && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />{s.companyName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date + days + action */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {dataScad.toLocaleDateString('it-IT')}
                    </p>
                    <p className={`text-xs font-medium ${conf.text}`}>
                      {daysUntil < 0
                        ? `Scaduto da ${Math.abs(daysUntil)} giorni`
                        : daysUntil === 0
                          ? 'Scade oggi'
                          : `Tra ${daysUntil} giorni`}
                    </p>
                    {!showCompleted && (
                      <button
                        onClick={() => handleMarkDone(s.id)}
                        disabled={markingDone === s.id}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <CheckCheck className="w-3 h-3" />
                        {markingDone === s.id ? 'Salvataggio...' : 'Eseguita'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
