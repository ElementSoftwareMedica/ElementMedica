import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDesktopPermission } from '../hooks/useDesktopPermission'
import { usePersistentPageState } from '../hooks/usePersistentPageState'
import { ElegantDateInput, ElegantSelect } from '../components/ElegantControls'
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Search,
  Building2,
  CheckCircle,
  AlertCircle,
  Hourglass,
  XCircle,
  RefreshCw,
  Play,
  UserPlus,
  EuroIcon,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutList
} from 'lucide-react'

interface PrestazionePrice {
  codice: string
  prezzoBase: number | null
  prezzoPrimaVisita: number | null
}

interface Appointment {
  id: string
  _localId: string
  _serverId: string | null
  tenantId: string
  dataOra: string
  durataPrevista: number | null
  stato: string
  personId: string | null
  personFirstName: string | null
  personLastName: string | null
  personTaxCode: string | null
  medicoId: string | null
  medicoFirstName: string | null
  medicoLastName: string | null
  ambulatorioId: string | null
  prestazioneId: string | null
  companyName: string | null
  prestazioneNome: string | null
  prestazioneCodice: string | null
  note: string | null
}

const STATO_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  PRENOTATO: { label: 'Prenotato', bg: 'bg-blue-50', text: 'text-blue-700', icon: Calendar },
  CONFERMATO: { label: 'Confermato', bg: 'bg-teal-50', text: 'text-teal-700', icon: CheckCircle },
  IN_ATTESA: { label: 'In Attesa', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: Hourglass },
  IN_CORSO: { label: 'In Corso', bg: 'bg-purple-50', text: 'text-purple-700', icon: Stethoscope },
  COMPLETATO: { label: 'Completato', bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle },
  ANNULLATO: { label: 'Annullato', bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  NO_SHOW: { label: 'No Show', bg: 'bg-gray-50', text: 'text-gray-500', icon: AlertCircle }
}

export function AgendaPage(): JSX.Element {
  const navigate = useNavigate()
  const permissions = useDesktopPermission()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [prestazioni, setPrestazioni] = useState<PrestazionePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = usePersistentPageState('agenda:searchTerm', '')
  const [filterStato, setFilterStato] = usePersistentPageState<string>('agenda:filterStato', '')
  const [selectedDate, setSelectedDate] = usePersistentPageState('agenda:selectedDate', new Date().toISOString().split('T')[0])
  const [dateFrom, setDateFrom] = usePersistentPageState('agenda:dateFrom', selectedDate)
  const [dateTo, setDateTo] = usePersistentPageState('agenda:dateTo', selectedDate)
  const [viewMode, setViewMode] = usePersistentPageState<'list' | 'table' | 'day'>('agenda:viewMode', 'list')

  const setSingleDay = useCallback((date: string) => {
    setSelectedDate(date)
    setDateFrom(date)
    setDateTo(date)
  }, [setDateFrom, setDateTo, setSelectedDate])

  const goToPrevDay = useCallback(() => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setSingleDay(d.toISOString().split('T')[0])
  }, [selectedDate, setSingleDay])

  const goToNextDay = useCallback(() => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    setSingleDay(d.toISOString().split('T')[0])
  }, [selectedDate, setSingleDay])

  const goToToday = useCallback(() => {
    setSingleDay(new Date().toISOString().split('T')[0])
  }, [setSingleDay])

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    try {
      if (!window.desktopApi) return
      const [rows, prezziRows] = await Promise.all([
        window.desktopApi.db.query({
          table: 'appointments',
          where: { _isDeleted: 0 },
          orderBy: { column: 'dataOra', direction: 'ASC' }
        }) as Promise<Appointment[]>,
        window.desktopApi.db.query({
          table: 'prestazioni',
          where: { _isDeleted: 0 }
        }) as Promise<PrestazionePrice[]>
      ])
      setAppointments(rows)
      setPrestazioni(prezziRows)
    } catch {
      // DB not ready
    } finally {
      setLoading(false)
    }
  }, [])

  const priceMap = useMemo(() => {
    const m: Record<string, { prezzoBase: number | null; prezzoPrimaVisita: number | null }> = {}
    for (const p of prestazioni) {
      if (p.codice) m[p.codice] = { prezzoBase: p.prezzoBase, prezzoPrimaVisita: p.prezzoPrimaVisita }
    }
    return m
  }, [prestazioni])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  // Create or open visit for this appointment
  const handleIniziaVisita = useCallback(async (a: Appointment) => {
    if (!window.desktopApi) return
    if (!permissions.canCreateVisite() || !permissions.canUpdateAppuntamenti()) return

    // Check if visit already exists for this appointment
    const existing = await window.desktopApi.db.query({
      table: 'visits',
      where: { appuntamentoId: a.id, _isDeleted: 0 },
      limit: 1
    }) as Array<{ id: string }>

    if (existing.length > 0) {
      navigate(`/visite/${existing[0].id}`, { state: { from: '/appuntamenti' } })
      return
    }

    // Create new visit
    const now = new Date().toISOString()
    const result = await window.desktopApi.db.insert({
      table: 'visits',
      data: {
        tenantId: a.tenantId,
        personId: a.personId,
        appuntamentoId: a.id,
        medicoId: a.medicoId,
        ambulatorioId: a.ambulatorioId,
        stato: 'IN_CORSO',
        dataOra: a.dataOra,
        dataInizio: now,
        datiStrutturati: '{}',
        isMDL: 1,
        personFirstName: a.personFirstName,
        personLastName: a.personLastName,
        personTaxCode: a.personTaxCode,
        medicoFirstName: a.medicoFirstName,
        medicoLastName: a.medicoLastName,
        companyName: a.companyName,
        prestazioneNome: a.prestazioneNome,
        prestazioneCodice: a.prestazioneCodice,
        createdAt: now,
        updatedAt: now,
      }
    }) as { id: string; _localId: string }

    // Enqueue visit creation for sync
    await window.desktopApi.sync.enqueue({
      type: 'CREATE',
      entity: 'visits',
      entityId: result.id,
      localId: result._localId,
      payload: {
        tenantId: a.tenantId,
        pazienteId: a.personId,       // Prisma: pazienteId (local: personId)
        appuntamentoId: a.id,
        medicoId: a.medicoId,
        ambulatorioId: a.ambulatorioId,
        prestazioneId: a.prestazioneId || null,
        stato: 'IN_CORSO',
        dataOra: a.dataOra,
        // dataInizio is local-only, not in Prisma Visita schema
      }
    })

    // Update appointment status
    await window.desktopApi.db.update({
      table: 'appointments',
      id: a.id,
      data: { stato: 'IN_CORSO' }
    })

    await window.desktopApi.sync.enqueue({
      type: 'UPDATE',
      entity: 'appointments',
      entityId: a._serverId || a.id,
      localId: a._localId,
      payload: { stato: 'IN_CORSO' }
    })

    navigate(`/visite/${result.id}`, { state: { from: '/appuntamenti' } })
  }, [navigate, permissions])

  const filtered = appointments.filter(a => {
    const appointmentDate = a.dataOra ? new Date(a.dataOra).toLocaleDateString('sv-SE') : ''
    const matchDate = (!dateFrom || appointmentDate >= dateFrom) && (!dateTo || appointmentDate <= dateTo)
    const matchSearch = !searchTerm || [
      a.personFirstName, a.personLastName, a.personTaxCode, a.companyName, a.prestazioneNome
    ].some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchStato = !filterStato || a.stato === filterStato
    return matchDate && matchSearch && matchStato
  })

  const today = dateFrom && dateTo && dateFrom !== dateTo
    ? `${new Date(dateFrom + 'T12:00:00').toLocaleDateString('it-IT')} - ${new Date(dateTo + 'T12:00:00').toLocaleDateString('it-IT')}`
    : new Date(selectedDate + 'T12:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-600" />
            Agenda Giornata
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              title="Vista card"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 border-x border-gray-200 transition-colors ${viewMode === 'table' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              title="Vista tabella"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`p-2 transition-colors ${viewMode === 'day' ? 'bg-teal-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              title="Vista giornata"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => navigate('/visite/nuova')}
            disabled={!permissions.canCreateVisite()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nuova Visita
          </button>
          <button
            onClick={loadAppointments}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Aggiorna
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Prev/Next day navigation */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
          <button
            onClick={goToPrevDay}
            className="px-2 py-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors border-r border-gray-200"
            title="Giorno precedente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-2.5 py-2 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-200 whitespace-nowrap"
            title="Oggi"
          >
            Oggi
          </button>
          <button
            onClick={goToNextDay}
            className="px-2 py-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            title="Giorno successivo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Date range: two inline inputs */}
        <div className="w-36 shrink-0">
          <ElegantDateInput
            value={dateFrom}
            onChange={start => { setDateFrom(start); if (start) setSelectedDate(start) }}
            clearable
          />
        </div>
        <span className="text-gray-300 text-sm shrink-0">—</span>
        <div className="w-36 shrink-0">
          <ElegantDateInput
            value={dateTo}
            onChange={end => setDateTo(end)}
            clearable
          />
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1 shrink-0">
          {([
            { label: 'Oggi', start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] },
            { label: 'Domani', start: new Date(Date.now() + 86_400_000).toISOString().split('T')[0], end: new Date(Date.now() + 86_400_000).toISOString().split('T')[0] },
            { label: '7 giorni', start: new Date().toISOString().split('T')[0], end: new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0] },
          ] as const).map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => { setDateFrom(preset.start); setDateTo(preset.end); setSelectedDate(preset.start) }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                dateFrom === preset.start && dateTo === preset.end
                  ? 'bg-teal-600 text-white'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="hidden sm:block h-5 w-px bg-gray-200 shrink-0" />

        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca paziente, azienda, prestazione..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div className="w-44 shrink-0">
          <ElegantSelect
            value={filterStato}
            onChange={setFilterStato}
            options={[{ value: '', label: 'Tutti gli stati' }, ...Object.entries(STATO_CONFIG).map(([key, { label }]) => ({ value: key, label }))]}
          />
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 font-medium">
          {filtered.length} appuntament{filtered.length === 1 ? 'o' : 'i'}
        </span>
        {filtered.length > 0 && (
          <>
            <span className="text-gray-300">|</span>
            {Object.entries(
              filtered.reduce((acc, a) => { acc[a.stato] = (acc[a.stato] || 0) + 1; return acc }, {} as Record<string, number>)
            ).map(([stato, count]) => {
              const conf = STATO_CONFIG[stato]
              return (
                <span key={stato} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${conf?.bg || 'bg-gray-50'} ${conf?.text || 'text-gray-600'}`}>
                  {conf?.label || stato}: {count}
                </span>
              )
            })}
          </>
        )}
      </div>

      {/* Appointments: List / Table / Day views */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 && viewMode !== 'day' ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-card">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {appointments.length === 0
              ? 'Nessun appuntamento scaricato. Scarica i dati della giornata dalla Dashboard.'
              : 'Nessun appuntamento corrisponde ai filtri.'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* ── LIST / CARD VIEW ── */
        <div className="space-y-2">
          {filtered.map((a) => {
            const conf = STATO_CONFIG[a.stato] || STATO_CONFIG.PRENOTATO
            const StatusIcon = conf.icon
            const ora = a.dataOra ? new Date(a.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--:--'
            const price = a.prestazioneCodice ? priceMap[a.prestazioneCodice] : null

            return (
              <button
                key={a.id}
                onClick={() => navigate(`/appuntamenti/${a.id}`)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-4 shadow-card hover:shadow-card-hover transition-all text-left flex items-center gap-4"
              >
                <div className="flex flex-col items-center w-14 shrink-0">
                  <span className="text-lg font-semibold text-gray-900 font-heading">{ora}</span>
                  {a.durataPrevista && (
                    <span className="text-[10px] text-gray-400">{a.durataPrevista} min</span>
                  )}
                </div>
                <div className="w-px h-12 bg-gray-200 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-[10px] font-semibold shrink-0">
                      {a.personFirstName?.[0]}{a.personLastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.personLastName} {a.personFirstName}</p>
                      {a.personTaxCode && (
                        <p className="text-[10px] text-gray-400 font-mono truncate">{a.personTaxCode}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {a.prestazioneNome && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Stethoscope className="w-3 h-3" />{a.prestazioneNome}
                      </span>
                    )}
                    {a.companyName && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Building2 className="w-3 h-3" />{a.companyName}
                      </span>
                    )}
                    {price?.prezzoBase != null && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                        <EuroIcon className="w-3 h-3" />{Number(price.prezzoBase).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                {a.medicoLastName && (
                  <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <User className="w-3 h-3" /><span>Dott. {a.medicoLastName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  {(a.stato !== 'COMPLETATO' && a.stato !== 'FATTURATO' && a.stato !== 'ANNULLATO' && a.stato !== 'NO_SHOW' && permissions.canCreateVisite() && permissions.canUpdateAppuntamenti()) && (
                    <span
                      onClick={(event) => { event.stopPropagation(); handleIniziaVisita(a) }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200"
                    >
                      <Play className="w-2.5 h-2.5" />{a.stato === 'IN_CORSO' ? 'Apri' : 'Inizia'}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${conf.bg} ${conf.text}`}>
                    <StatusIcon className="w-3 h-3" />{conf.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : viewMode === 'table' ? (
        /* ── TABLE VIEW ── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-16">Ora</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Paziente</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Prestazione</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Azienda</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Medico</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Stato</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-20">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((a) => {
                const conf = STATO_CONFIG[a.stato] || STATO_CONFIG.PRENOTATO
                const StatusIcon = conf.icon
                const ora = a.dataOra ? new Date(a.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--:--'
                return (
                  <tr
                    key={a.id}
                    onClick={() => navigate(`/appuntamenti/${a.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-700 font-heading text-sm">{ora}</span>
                      {a.durataPrevista && (
                        <div className="text-[10px] text-gray-400">{a.durataPrevista}'</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{a.personLastName} {a.personFirstName}</p>
                      {a.personTaxCode && (
                        <p className="text-[10px] text-gray-400 font-mono">{a.personTaxCode}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-gray-600 text-xs">{a.prestazioneNome || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-gray-500 text-xs">{a.companyName || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-gray-500 text-xs">{a.medicoLastName ? `Dott. ${a.medicoLastName}` : '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${conf.bg} ${conf.text}`}>
                        <StatusIcon className="w-2.5 h-2.5" />{conf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(a.stato !== 'COMPLETATO' && a.stato !== 'FATTURATO' && a.stato !== 'ANNULLATO' && a.stato !== 'NO_SHOW' && permissions.canCreateVisite() && permissions.canUpdateAppuntamenti()) && (
                        <span
                          onClick={(event) => { event.stopPropagation(); handleIniziaVisita(a) }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200"
                        >
                          <Play className="w-2.5 h-2.5" />{a.stato === 'IN_CORSO' ? 'Apri' : 'Inizia'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── DAY TIMELINE VIEW ── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
          {Array.from({ length: 13 }, (_, i) => i + 7).map(hour => {
            const slotStart = hour * 60
            const slotEnd = slotStart + 60
            const slotAppts = filtered.filter(a => {
              if (!a.dataOra) return false
              const d = new Date(a.dataOra)
              const mins = d.getHours() * 60 + d.getMinutes()
              return mins >= slotStart && mins < slotEnd
            })
            const isCurrentHour = new Date().getHours() === hour && selectedDate === new Date().toISOString().split('T')[0]

            return (
              <div
                key={hour}
                className={`flex border-b border-gray-50 last:border-0 min-h-[52px] ${isCurrentHour ? 'bg-teal-50/30' : ''}`}
              >
                {/* Hour label */}
                <div className="w-14 shrink-0 px-3 pt-3 text-xs text-gray-400 font-medium border-r border-gray-100">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {/* Slot content */}
                <div className="flex-1 px-3 py-2 flex flex-col gap-1.5">
                  {slotAppts.length === 0 && isCurrentHour && (
                    <div className="flex items-center gap-1.5 text-[10px] text-teal-500 font-medium">
                      <Clock className="w-3 h-3" />ora attuale
                    </div>
                  )}
                  {slotAppts.map(a => {
                    const conf = STATO_CONFIG[a.stato] || STATO_CONFIG.PRENOTATO
                    const ora = new Date(a.dataOra!).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                    return (
                      <button
                        key={a.id}
                        onClick={() => navigate(`/appuntamenti/${a.id}`)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all hover:shadow-sm flex items-center gap-2 ${conf.bg} border-current/10`}
                      >
                        <span className={`text-[10px] font-semibold shrink-0 ${conf.text}`}>{ora}</span>
                        <span className={`text-xs font-medium flex-1 truncate ${conf.text}`}>
                          {a.personLastName} {a.personFirstName}
                          {a.prestazioneNome && <span className="font-normal opacity-70"> · {a.prestazioneNome}</span>}
                        </span>
                        {a.companyName && (
                          <span className={`text-[10px] hidden sm:block truncate max-w-[120px] opacity-60 ${conf.text}`}>{a.companyName}</span>
                        )}
                        <span className={`text-[10px] font-medium shrink-0 ${conf.text}`}>{conf.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
