import { useState, useEffect, useCallback, useMemo, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CheckCheck,
  Plus,
  Undo2,
  X,
  Filter
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { usePersistentPageState } from '../hooks/usePersistentPageState'
import { ElegantDateRangeInput, ElegantSelect } from '../components/ElegantControls'

interface Scadenza {
  id: string
  _serverId: string | null
  _localId?: string | null
  tenantId: string | null
  personId: string | null
  prestazioneId: string | null
  mansioneId: string | null
  protocolloId: string | null
  visitaId: string | null
  dataScadenza: string
  eseguita: number
  isPrimaVisita?: number | null
  personFirstName: string | null
  personLastName: string | null
  personTaxCode?: string | null
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
  tenantId: string | null
  firstName: string | null
  lastName: string | null
  taxCode: string | null
  companyName: string | null
  companyTenantProfileId?: string | null
}

interface CompanyLookup {
  id: string
  tenantId: string | null
  ragioneSociale: string | null
  medicoCompetenteId?: string | null
}

type Urgenza = 'scaduto' | 'critico' | 'urgente' | 'attenzione' | 'programmato'
const FINESTRA_RAGGRUPPAMENTO_GIORNI = 60
const MS_PER_DAY = 24 * 60 * 60 * 1000

const URGENZA_CONFIG: Record<Urgenza, { label: string; bg: string; text: string; border: string; icon: ComponentType<{ className?: string }> }> = {
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
  const diffDays = Math.floor((scad.getTime() - now.getTime()) / MS_PER_DAY)
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

function countUniquePeople(groups: ScadenzaGroup[]): number {
  return new Set(groups.map(group => group.personId || group.id)).size
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
  const navigate = useNavigate()
  const [scadenze, setScadenze] = useState<Scadenza[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = usePersistentPageState('scadenze:searchTerm', '')
  const [filterUrgenza, setFilterUrgenza] = usePersistentPageState<string>('scadenze:filterUrgenza', '')
  const [showCompleted, setShowCompleted] = usePersistentPageState('scadenze:showCompleted', false)
  const [dateFrom, setDateFrom] = usePersistentPageState<string>('scadenze:dateFrom', isoToday(-30))
  const [dateTo, setDateTo] = usePersistentPageState<string>('scadenze:dateTo', isoToday(30))
  const [markingDone, setMarkingDone] = useState<string | null>(null)
  const [creatingVisit, setCreatingVisit] = useState<string | null>(null)
  const [undoAction, setUndoAction] = useState<{ label: string; scadenze: Scadenza[] } | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [filterCompany, setFilterCompany] = usePersistentPageState<string>('scadenze:filterCompany', '')
  const [companies, setCompanies] = useState<CompanyLookup[]>([])

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
          tenantId: row.tenantId || patient?.tenantId || company?.tenantId || null,
          personFirstName: row.personFirstName || patient?.firstName || null,
          personLastName: row.personLastName || patient?.lastName || null,
          personTaxCode: row.personTaxCode || patient?.taxCode || null,
          companyName: row.companyName || patient?.companyName || company?.ragioneSociale || null,
        }
      }))
    } catch {
      setPageError('Impossibile caricare le scadenze locali.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadScadenze() }, [loadScadenze])

  useEffect(() => {
    if (!window.desktopApi) return
    window.desktopApi.db.query({ table: 'companies', where: { _isDeleted: 0 } })
      .then(rows => setCompanies((rows as CompanyLookup[]).sort((a, b) => (a.ragioneSociale || '').localeCompare(b.ragioneSociale || '', 'it'))))
      .catch(() => undefined)
  }, [])

  const handleMarkDone = useCallback(async (group: ScadenzaGroup): Promise<void> => {
    if (!window.desktopApi || markingDone) return
    setPageError(null)
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
          entityId: scadenza._serverId || scadenza.id,
          localId: scadenza._localId || undefined,
          payload: { status: 'COMPLETATA', completatoAt: now }
        })
      }))
      setUndoAction({
        label: `${group.personLastName || ''} ${group.personFirstName || ''}`.trim() || 'Scadenza',
        scadenze: group.scadenze,
      })
      await loadScadenze()
    } catch {
      setPageError('Non sono riuscito a segnare la scadenza come eseguita.')
    } finally {
      setMarkingDone(null)
    }
  }, [loadScadenze, markingDone])

  const handleUndoMarkDone = useCallback(async (): Promise<void> => {
    if (!window.desktopApi || !undoAction) return
    setPageError(null)
    try {
      await Promise.all(undoAction.scadenze.map(async (scadenza) => {
        await window.desktopApi.db.update({
          table: 'scadenze',
          id: scadenza.id,
          data: { eseguita: 0, dataEsecuzione: null }
        })
        await window.desktopApi.sync.enqueue({
          type: 'UPDATE',
          entity: 'scadenze',
          entityId: scadenza._serverId || scadenza.id,
          localId: scadenza._localId || undefined,
          payload: { status: 'PENDING', completatoAt: null }
        })
      }))
      setUndoAction(null)
      await loadScadenze()
    } catch {
      setPageError('Non sono riuscito ad annullare la marcatura come eseguita.')
    }
  }, [loadScadenze, undoAction])

  const handleCreateVisit = useCallback(async (group: ScadenzaGroup): Promise<void> => {
    if (!window.desktopApi || !group.personId || creatingVisit) return
    setPageError(null)
    setCreatingVisit(group.id)
    try {
      const [patients, companies] = await Promise.all([
        window.desktopApi.db.query({ table: 'patients', where: { id: group.personId } }).catch(() => []) as Promise<PatientLookup[]>,
        window.desktopApi.db.query({ table: 'companies', where: { _isDeleted: 0 } }).catch(() => []) as Promise<CompanyLookup[]>,
      ])
      const patient = patients[0]
      const company = patient?.companyTenantProfileId
        ? companies.find(c => c.id === patient.companyTenantProfileId)
        : companies.find(c => c.ragioneSociale === group.companyName)
      const tenantId = group.tenantId || patient?.tenantId || company?.tenantId
      if (!tenantId) throw new Error('Tenant mancante per la visita.')

      const now = new Date().toISOString()
      const appointmentId = uuidv4()
      const visitId = uuidv4()
      const selectedRows = [...group.scadenze].sort((a, b) => {
        if (isVisitaMedicaDelLavoro(a.prestazioneNome)) return -1
        if (isVisitaMedicaDelLavoro(b.prestazioneNome)) return 1
        return new Date(a.dataScadenza).getTime() - new Date(b.dataScadenza).getTime()
      })
      const prestazioneIds = Array.from(new Set(selectedRows.map(row => row.prestazioneId).filter(Boolean) as string[]))
      const mainPrestazione = selectedRows.find(row => row.prestazioneId && isVisitaMedicaDelLavoro(row.prestazioneNome)) || selectedRows.find(row => row.prestazioneId) || selectedRows[0]
      const prestazioneId = mainPrestazione?.prestazioneId || prestazioneIds[0] || null
      const prestazioneNome = mainPrestazione?.prestazioneNome || 'Visita Medica del Lavoro'
      const tipoVisitaMDL = selectedRows.some(row => row.isPrimaVisita) ? 'PREVENTIVA' : 'PERIODICA'
      const personFirstName = patient?.firstName || group.personFirstName || ''
      const personLastName = patient?.lastName || group.personLastName || ''
      const personTaxCode = patient?.taxCode || group.personTaxCode || null
      const companyName = company?.ragioneSociale || group.companyName || patient?.companyName || null

      await window.desktopApi.db.insert({
        table: 'appointments',
        data: {
          id: appointmentId,
          tenantId,
          personId: group.personId,
          medicoId: company?.medicoCompetenteId || null,
          prestazioneId,
          companyTenantProfileId: patient?.companyTenantProfileId || company?.id || null,
          dataOra: now,
          durata: 10,
          durataPrevista: 10,
          stato: 'IN_CORSO',
          tipo: 'MEDICINA_LAVORO',
          personFirstName,
          personLastName,
          personTaxCode,
          companyName,
          prestazioneNome,
          noteInterne: `Visita MdL creata da Scadenze desktop con ${prestazioneIds.length || selectedRows.length} accertamenti collegati`,
          createdAt: now,
          updatedAt: now,
        }
      })
      await window.desktopApi.sync.enqueue({
        type: 'CREATE',
        entity: 'appointments',
        entityId: appointmentId,
        payload: {
          personId: group.personId,
          companyTenantProfileId: patient?.companyTenantProfileId || company?.id || null,
          dataOra: now,
          durataMinuti: 10,
          stato: 'IN_CORSO',
          tipoVisitaMDL,
          prestazioneId,
          medicoId: company?.medicoCompetenteId || null,
          createdFromScadenzeMdl: true,
          promemoriaEmail: false,
          promemoriaSms: false,
          isOverbooking: true,
        }
      })

      for (const selectedPrestazioneId of prestazioneIds) {
        const inserted = await window.desktopApi.db.insert({
          table: 'appointment_prestazioni',
          data: {
            appuntamentoId: appointmentId,
            prestazioneId: selectedPrestazioneId,
            prezzo: null,
            quantita: 1,
            note: 'Accertamento da scadenza protocollo sanitario',
          }
        }) as { id: string }
        await window.desktopApi.sync.enqueue({
          type: 'CREATE',
          entity: 'appointment_prestazioni',
          entityId: inserted.id,
          payload: { appuntamentoId: appointmentId, prestazioneId: selectedPrestazioneId, prezzo: null, quantita: 1 }
        })
      }

      await window.desktopApi.db.insert({
        table: 'visits',
        data: {
          id: visitId,
          tenantId,
          appuntamentoId: appointmentId,
          personId: group.personId,
          medicoId: company?.medicoCompetenteId || null,
          dataOra: now,
          stato: 'IN_CORSO',
          tipo: 'MEDICINA_LAVORO',
          tipoVisitaMDL,
          isMDL: 1,
          personFirstName,
          personLastName,
          personTaxCode,
          companyName,
          prestazioneId,
          prestazioneNome,
          datiStrutturati: JSON.stringify({
            accertamentiCollegati: prestazioneIds,
            scadenzeCollegate: group.scadenze.map(scadenza => scadenza.id),
          }),
          noteInterne: 'Visita MdL avviata da Scadenze desktop',
          createdAt: now,
          updatedAt: now,
        }
      })
      await window.desktopApi.sync.enqueue({
        type: 'CREATE',
        entity: 'visits',
        entityId: visitId,
        payload: {
          appuntamentoId: appointmentId,
          personId: group.personId,
          stato: 'IN_CORSO',
          tipoVisitaMDL,
          isMDL: true,
          prestazioneId,
          datiStrutturati: {
            accertamentiCollegati: prestazioneIds,
            scadenzeCollegate: group.scadenze.map(scadenza => scadenza.id),
          }
        }
      })

      await Promise.all(group.scadenze.map(scadenza =>
        window.desktopApi.db.update({ table: 'scadenze', id: scadenza.id, data: { visitaId: visitId } }).catch(() => undefined)
      ))
      navigate(`/visite/${visitId}`, { state: { from: '/scadenze' } })
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Non sono riuscito a creare la visita dalla scadenza.')
    } finally {
      setCreatingVisit(null)
    }
  }, [creatingVisit, navigate])

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
    const matchCompany = !filterCompany || (s.companyName || '').toLowerCase().includes(filterCompany.toLowerCase())
    return matchSearch && matchUrgenza && matchDate && matchCompany
  })
  const pendingPeople = countUniquePeople(pending)
  const completedPeople = countUniquePeople(completed)
  const filteredPeople = countUniquePeople(filtered)

  useEffect(() => {
    window.desktopApi?.app?.setScadenzeCounterRange?.(dateFrom && dateTo ? { start: dateFrom, end: dateTo } : null)
    window.desktopApi?.app?.updateBadge?.()
    window.dispatchEvent(new Event('elementmedica-desktop:scadenze-counter-refresh'))
  }, [dateFrom, dateTo])

  const stats = enriched.reduce((acc, s) => {
    const key = s.urgenza
    const set = acc[key] || new Set<string>()
    set.add(s.personId || s.id)
    acc[key] = set
    return acc
  }, {} as Record<string, Set<string>>)

  const activeFiltersCount = [filterUrgenza, filterCompany, searchTerm].filter(Boolean).length

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
        {/* Row 1: Title + toggle + refresh */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900 font-heading">
              <Clock className="h-5 w-5 text-teal-600" />
              Scadenze MDL
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              {filteredPeople} person{filteredPeople === 1 ? 'a' : 'e'} · {filtered.length} grupp{filtered.length === 1 ? 'o' : 'i'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
              <button
                onClick={() => { setShowCompleted(false); setFilterUrgenza('') }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  !showCompleted ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Da fare ({pendingPeople})
              </button>
              <button
                onClick={() => { setShowCompleted(true); setFilterUrgenza('') }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  showCompleted ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Completate ({completedPeople})
              </button>
            </div>
            <button
              onClick={loadScadenze}
              title="Aggiorna"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Aggiorna</span>
            </button>
          </div>
        </div>

        {/* Row 2: Filters */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
          {/* Search */}
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cerca lavoratore, prestazione..."
              className="h-10 w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Company filter */}
          {companies.length > 0 && (
            <div className="min-w-[180px]">
              <ElegantSelect
                value={filterCompany}
                onChange={setFilterCompany}
                placeholder="Tutte le aziende"
                options={[
                  { value: '', label: 'Tutte le aziende' },
                  ...companies.map(c => ({ value: c.ragioneSociale || c.id, label: c.ragioneSociale || c.id }))
                ]}
              />
            </div>
          )}

          {/* Date range */}
          <ElegantDateRangeInput
            value={{ start: dateFrom, end: dateTo }}
            onChange={range => {
              setDateFrom(range.start)
              setDateTo(range.end)
            }}
          />
        </div>

        {/* Row 3: Urgency filter pills */}
        {!showCompleted && enriched.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Filter className="h-3 w-3" />
            </span>
            {(Object.entries(URGENZA_CONFIG) as [Urgenza, typeof URGENZA_CONFIG[Urgenza]][]).map(([key, conf]) => {
              const count = stats[key]?.size || 0
              if (count === 0) return null
              const UrgIcon = conf.icon
              return (
                <button
                  key={key}
                  onClick={() => setFilterUrgenza(prev => prev === key ? '' : key)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    filterUrgenza === key ? `${conf.bg} ${conf.text} ring-1 ring-current` : `${conf.bg} ${conf.text} opacity-70 hover:opacity-100`
                  }`}
                >
                  <UrgIcon className="h-3 w-3" />
                  {conf.label.split('(')[0].trim()}: {count}
                </button>
              )
            })}
            {activeFiltersCount > 0 && (
              <button
                onClick={() => { setSearchTerm(''); setFilterUrgenza(''); setFilterCompany('') }}
                className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <X className="h-3 w-3" />
                Rimuovi filtri ({activeFiltersCount})
              </button>
            )}
          </div>
        )}
      </div>

      {undoAction && (
        <div className="flex flex-col gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <span>
            Scadenza di <strong>{undoAction.label}</strong> segnata come eseguita.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndoMarkDone}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-green-700 shadow-sm hover:bg-green-100"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Annulla
            </button>
            <button type="button" onClick={() => setUndoAction(null)} className="rounded-lg p-1.5 text-green-700 hover:bg-green-100" aria-label="Chiudi notifica">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {pageError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center shadow-card">
          <Clock className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">
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
            const daysUntil = Math.floor((dataScad.getTime() - Date.now()) / MS_PER_DAY)

            return (
              <div
                key={s.id}
                className={`rounded-2xl border bg-white p-4 shadow-card transition-all hover:shadow-card-hover ${conf.border}`}
              >
                <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${conf.bg}`}>
                    <UrgIcon className={`h-5 w-5 ${conf.text}`} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {s.personLastName} {s.personFirstName}
                      </p>
                      {s.mansione && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{s.mansione}</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {s.prestazioneNome && (
                        <span className="flex min-w-0 items-center gap-1 text-xs text-gray-500">
                          <Stethoscope className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.prestazioneNome}</span>
                        </span>
                      )}
                      {s.companyName && (
                        <span className="flex min-w-0 items-center gap-1 text-xs text-gray-400">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.companyName}</span>
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

                  <div className="flex flex-col gap-2 lg:items-end">
                    <div className="text-left lg:text-right">
                      <p className="flex items-center gap-1 text-sm font-medium text-gray-900 lg:justify-end">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
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
                    </div>
                    {!showCompleted && (
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          onClick={() => handleCreateVisit(s)}
                          disabled={creatingVisit === s.id || !s.personId}
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" />
                          {creatingVisit === s.id ? 'Creazione...' : 'Crea visita'}
                        </button>
                        <button
                          onClick={() => handleMarkDone(s)}
                          disabled={markingDone === s.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-[11px] font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
                        >
                          <CheckCheck className="h-3 w-3" />
                          {markingDone === s.id ? 'Salvataggio...' : 'Eseguita'}
                        </button>
                      </div>
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
