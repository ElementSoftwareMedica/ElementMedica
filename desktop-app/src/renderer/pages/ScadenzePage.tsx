import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { ElegantDateRangeInput } from '../components/ElegantControls'

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

interface ScadenzaGroup extends Scadenza {
  scadenze: Scadenza[]
  prestazioni: string[]
  dataScadenzaFine: string
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
const FINESTRA_RAGGRUPPAMENTO_GIORNI = 60
const MS_PER_DAY = 24 * 60 * 60 * 1000

const URGENZA_CONFIG: Record<Urgenza, { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }> = {
  scaduto: { label: 'Scaduto', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
  critico: { label: 'Critico (<7gg)', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle },
  urgente: { label: 'Urgente (7-30gg)', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Clock },
  attenzione: { label: 'Attenzione (30-60gg)', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Bell },
  programmato: { label: 'Programmato (>60gg)', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 }
}

function isoToday(offsetDays = 0): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().split('T')[0]
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

function isVisitaMedicaDelLavoro(nome: string | null | undefined): boolean {
  return (nome || '').toLowerCase().includes('visita medica del lavoro')
}

function uniquePrestazioni(scadenze: Scadenza[]): string[] {
  const names = scadenze
    .map(s => s.prestazioneNome || 'Accertamento')
    .sort((a, b) => {
      if (isVisitaMedicaDelLavoro(a)) return -1
      if (isVisitaMedicaDelLavoro(b)) return 1
      return a.localeCompare(b, 'it')
    })
  return Array.from(new Set(names))
}

function groupScadenzeMdl(scadenze: Scadenza[]): ScadenzaGroup[] {
  const byWorker = new Map<string, Scadenza[]>()
  for (const scadenza of scadenze) {
    const key = `${scadenza.personId || 'no-person'}::${scadenza.mansione || 'no-mansione'}`
    const list = byWorker.get(key) || []
    list.push(scadenza)
    byWorker.set(key, list)
  }

  const groups: ScadenzaGroup[] = []
  for (const rows of byWorker.values()) {
    const sorted = [...rows].sort((a, b) => new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime())
    let current: Scadenza[] = []
    let currentEnd = 0

    const flush = () => {
      if (current.length === 0) return
      const representative = [...current].sort((a, b) => {
        if (isVisitaMedicaDelLavoro(a.prestazioneNome)) return -1
        if (isVisitaMedicaDelLavoro(b.prestazioneNome)) return 1
        return new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime()
      })[0]
      const dateTimes = current.map(s => new Date(s.dataScadenza).getTime()).filter(Number.isFinite)
      const minDate = new Date(Math.min(...dateTimes)).toISOString()
      const maxDate = new Date(Math.max(...dateTimes)).toISOString()
      const prestazioni = uniquePrestazioni(current)
      const hasVisitaMedica = prestazioni.some(isVisitaMedicaDelLavoro)
      const label = prestazioni.length > 1
        ? hasVisitaMedica
          ? `Visita Medica del Lavoro + ${prestazioni.length - 1} accertament${prestazioni.length - 1 === 1 ? 'o' : 'i'}`
          : `${prestazioni[0]} + ${prestazioni.length - 1} accertament${prestazioni.length - 1 === 1 ? 'o' : 'i'}`
        : prestazioni[0]

      groups.push({
        ...representative,
        id: current.length > 1
          ? `visita-cluster-${representative.personId || 'no-person'}-${representative.mansione || 'no-mansione'}-${minDate.slice(0, 10)}`
          : representative.id,
        dataScadenza: minDate,
        dataScadenzaFine: maxDate,
        prestazioneNome: label,
        scadenze: current,
        prestazioni
      })
      current = []
      currentEnd = 0
    }

    for (const row of sorted) {
      const time = new Date(row.dataScadenza).getTime()
      if (!Number.isFinite(time)) continue
      if (current.length === 0 || time - currentEnd <= FINESTRA_RAGGRUPPAMENTO_GIORNI * MS_PER_DAY) {
        current.push(row)
        currentEnd = Math.max(currentEnd, time)
      } else {
        flush()
        current.push(row)
        currentEnd = time
      }
    }
    flush()
  }

  return groups.sort((a, b) => new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime())
}

export function ScadenzePage(): JSX.Element {
  const [scadenze, setScadenze] = useState<Scadenza[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = usePersistentPageState('scadenze:searchTerm', '')
  const [filterUrgenza, setFilterUrgenza] = usePersistentPageState<string>('scadenze:filterUrgenza', '')
  const [showCompleted, setShowCompleted] = usePersistentPageState('scadenze:showCompleted', false)
  const [dateFrom, setDateFrom] = usePersistentPageState<string>('scadenze:dateFrom', isoToday(-30))
  const [dateTo, setDateTo] = usePersistentPageState<string>('scadenze:dateTo', isoToday(30))
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

  const handleMarkDone = useCallback(async (group: ScadenzaGroup): Promise<void> => {
    if (!window.desktopApi || markingDone) return
    setMarkingDone(group.id)
    try {
      const now = new Date().toISOString()
      await Promise.all(group.scadenze.map(async (scadenza) => {
        await window.desktopApi.db.update({
          table: 'scadenze',
          id: scadenza.id,
          data: { eseguita: 1, dataEsecuzione: now }
        })
        await window.desktopApi.sync.enqueue({
          type: 'UPDATE',
          entity: 'scadenze',
          entityId: scadenza.id,
          payload: { status: 'COMPLETATA', completatoAt: now }
        })
      }))
      await loadScadenze()
    } catch {
      // Non-blocking
    } finally {
      setMarkingDone(null)
    }
  }, [loadScadenze, markingDone])

  const pending = useMemo(() => groupScadenzeMdl(scadenze.filter(s => !s.eseguita)), [scadenze])
  const completed = useMemo(() => groupScadenzeMdl(scadenze.filter(s => !!s.eseguita)), [scadenze])
  const activeList = showCompleted ? completed : pending
  const enriched = activeList.map(s => ({ ...s, urgenza: getUrgenza(s.dataScadenza) }))
  const filtered = enriched.filter(s => {
    const matchSearch = !searchTerm || [
      s.personFirstName, s.personLastName, s.prestazioneNome, s.companyName, s.mansione, ...s.prestazioni
    ].some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchUrgenza = !filterUrgenza || s.urgenza === filterUrgenza
    const matchDate = (!dateFrom || s.dataScadenzaFine >= dateFrom) && (!dateTo || s.dataScadenza <= dateTo)
    return matchSearch && matchUrgenza && matchDate
  })

  useEffect(() => {
    window.desktopApi?.app?.setScadenzeCounterRange?.(dateFrom && dateTo ? { start: dateFrom, end: dateTo } : null)
    window.desktopApi?.app?.updateBadge?.()
    window.dispatchEvent(new Event('elementmedica-desktop:scadenze-counter-refresh'))
  }, [dateFrom, dateTo])

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

      {/* Search + date range */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
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
        <ElegantDateRangeInput
          value={{ start: dateFrom, end: dateTo }}
          onChange={range => {
            setDateFrom(range.start)
            setDateTo(range.end)
          }}
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
                    {s.prestazioni.length > 1 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.prestazioni.map(prestazione => (
                          <span key={prestazione} className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-medium text-teal-700">
                            {prestazione}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Date + days + action */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-2">
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1 justify-end">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {dataScad.toLocaleDateString('it-IT')}
                    </p>
                    {s.dataScadenzaFine.slice(0, 10) !== s.dataScadenza.slice(0, 10) && (
                      <p className="text-[10px] text-gray-400">
                        gruppo fino al {new Date(s.dataScadenzaFine).toLocaleDateString('it-IT')}
                      </p>
                    )}
                    <p className={`text-xs font-medium ${conf.text}`}>
                      {daysUntil < 0
                        ? `Scaduto da ${Math.abs(daysUntil)} giorni`
                        : daysUntil === 0
                          ? 'Scade oggi'
                          : `Tra ${daysUntil} giorni`}
                    </p>
                    {!showCompleted && (
                      <button
                        onClick={() => handleMarkDone(s)}
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
