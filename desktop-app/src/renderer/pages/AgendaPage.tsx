import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Play
} from 'lucide-react'

interface Appointment {
  id: string
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
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStato, setFilterStato] = useState<string>('')

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    try {
      if (!window.desktopApi) return
      const rows = await window.desktopApi.db.query({
        table: 'appointments',
        where: { _isDeleted: 0 },
        orderBy: { column: 'dataOra', direction: 'ASC' }
      }) as Appointment[]
      setAppointments(rows)
    } catch {
      // DB not ready
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAppointments() }, [loadAppointments])

  // Create or open visit for this appointment
  const handleIniziaVisita = useCallback(async (a: Appointment) => {
    if (!window.desktopApi) return

    // Check if visit already exists for this appointment
    const existing = await window.desktopApi.db.query({
      table: 'visits',
      where: { appuntamentoId: a.id, _isDeleted: 0 },
      limit: 1
    }) as Array<{ id: string }>

    if (existing.length > 0) {
      navigate(`/visite/${existing[0].id}`)
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
      entity: 'visita',
      entityId: result.id,
      localId: result._localId,
      payload: {
        tenantId: a.tenantId,
        personId: a.personId,
        appuntamentoId: a.id,
        medicoId: a.medicoId,
        ambulatorioId: a.ambulatorioId,
        stato: 'IN_CORSO',
        dataOra: a.dataOra,
        dataInizio: now,
        isMDL: true,
      }
    })

    // Update appointment status
    await window.desktopApi.db.update({
      table: 'appointments',
      id: a.id,
      data: { stato: 'IN_CORSO' }
    })

    navigate(`/visite/${result.id}`)
  }, [navigate])

  const filtered = appointments.filter(a => {
    const matchSearch = !searchTerm || [
      a.personFirstName, a.personLastName, a.personTaxCode, a.companyName, a.prestazioneNome
    ].some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchStato = !filterStato || a.stato === filterStato
    return matchSearch && matchStato
  })

  const today = new Date().toLocaleDateString('it-IT', {
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
        <button
          onClick={loadAppointments}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Aggiorna
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca paziente, azienda, prestazione..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStato}
          onChange={(e) => setFilterStato(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATO_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
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

      {/* Appointments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-card">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {appointments.length === 0
              ? 'Nessun appuntamento scaricato. Scarica i dati della giornata dalla Dashboard.'
              : 'Nessun appuntamento corrisponde ai filtri.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const conf = STATO_CONFIG[a.stato] || STATO_CONFIG.PRENOTATO
            const StatusIcon = conf.icon
            const ora = a.dataOra ? new Date(a.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--:--'

            return (
              <button
                key={a.id}
                onClick={() => handleIniziaVisita(a)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-4 shadow-card hover:shadow-card-hover transition-all text-left flex items-center gap-4"
              >
                {/* Time */}
                <div className="flex flex-col items-center w-14 shrink-0">
                  <span className="text-lg font-semibold text-gray-900 font-heading">{ora}</span>
                  {a.durataPrevista && (
                    <span className="text-[10px] text-gray-400">{a.durataPrevista} min</span>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-12 bg-gray-200 shrink-0" />

                {/* Patient Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-[10px] font-semibold shrink-0">
                      {a.personFirstName?.[0]}{a.personLastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {a.personLastName} {a.personFirstName}
                      </p>
                      {a.personTaxCode && (
                        <p className="text-[10px] text-gray-400 font-mono truncate">{a.personTaxCode}</p>
                      )}
                    </div>
                  </div>
                  {/* Prestazione & Company */}
                  <div className="flex items-center gap-3 mt-1.5">
                    {a.prestazioneNome && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Stethoscope className="w-3 h-3" />
                        {a.prestazioneNome}
                      </span>
                    )}
                    {a.companyName && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Building2 className="w-3 h-3" />
                        {a.companyName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Medico */}
                {a.medicoLastName && (
                  <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <User className="w-3 h-3" />
                    <span>Dott. {a.medicoLastName}</span>
                  </div>
                )}

                {/* Status Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {(a.stato !== 'COMPLETATO' && a.stato !== 'ANNULLATO') && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                      <Play className="w-2.5 h-2.5" />
                      {a.stato === 'IN_CORSO' ? 'Apri' : 'Inizia'}
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${conf.bg} ${conf.text}`}>
                    <StatusIcon className="w-3 h-3" />
                    {conf.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
