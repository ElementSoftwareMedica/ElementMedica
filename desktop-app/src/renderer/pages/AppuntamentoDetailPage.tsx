import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  Play,
  RefreshCw,
  Stethoscope,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Ban
} from 'lucide-react'
import { useDesktopPermission } from '../hooks/useDesktopPermission'

interface Appointment {
  id: string
  _localId: string
  _serverId: string | null
  tenantId: string
  dataOra: string
  durataPrevista: number | null
  durata: number | null
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
  ambulatorioNome: string | null
  note: string | null
  tipo: string | null
}

export function AppuntamentoDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const permissions = useDesktopPermission()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [visitId, setVisitId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const loadAppointment = useCallback(async () => {
    if (!id || !window.desktopApi) return
    setLoading(true)
    setError(null)
    try {
      let rows = await window.desktopApi.db.query({
        table: 'appointments',
        where: { id, _isDeleted: 0 },
        limit: 1
      }) as Appointment[]

      if (rows.length === 0) {
        rows = await window.desktopApi.db.query({
          table: 'appointments',
          where: { _serverId: id, _isDeleted: 0 },
          limit: 1
        }) as Appointment[]
      }

      if (rows.length === 0) {
        setAppointment(null)
        setError('Appuntamento non trovato')
        return
      }

      const appt = rows[0]
      setAppointment(appt)

      const visits = await window.desktopApi.db.query({
        table: 'visits',
        where: { appuntamentoId: appt.id, _isDeleted: 0 },
        limit: 1
      }) as Array<{ id: string }>
      setVisitId(visits[0]?.id || null)
    } catch {
      setError('Errore nel caricamento dell\'appuntamento')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void loadAppointment() }, [loadAppointment])

  const startVisit = useCallback(async () => {
    if (!appointment || !window.desktopApi || starting) return
    if (!permissions.canCreateVisite() || !permissions.canUpdateAppuntamenti()) return
    if (visitId) {
      navigate(`/visite/${visitId}`)
      return
    }

    setStarting(true)
    try {
      const now = new Date().toISOString()
      const result = await window.desktopApi.db.insert({
        table: 'visits',
        data: {
          tenantId: appointment.tenantId,
          personId: appointment.personId,
          appuntamentoId: appointment.id,
          medicoId: appointment.medicoId,
          ambulatorioId: appointment.ambulatorioId,
          stato: 'IN_CORSO',
          tipo: appointment.tipo,
          tipoVisitaMDL: appointment.tipo,
          dataOra: appointment.dataOra,
          dataInizio: now,
          datiStrutturati: '{}',
          isMDL: appointment.tipo ? 1 : 0,
          personFirstName: appointment.personFirstName,
          personLastName: appointment.personLastName,
          personTaxCode: appointment.personTaxCode,
          medicoFirstName: appointment.medicoFirstName,
          medicoLastName: appointment.medicoLastName,
          companyName: appointment.companyName,
          prestazioneNome: appointment.prestazioneNome,
          prestazioneCodice: appointment.prestazioneCodice,
          createdAt: now,
          updatedAt: now,
        }
      }) as { id: string; _localId: string }

      await window.desktopApi.sync.enqueue({
        type: 'CREATE',
        entity: 'visits',
        entityId: result.id,
        localId: result._localId,
        payload: {
          tenantId: appointment.tenantId,
          pazienteId: appointment.personId,
          appuntamentoId: appointment._serverId || appointment.id,
          medicoId: appointment.medicoId,
          ambulatorioId: appointment.ambulatorioId,
          prestazioneId: appointment.prestazioneId || null,
          tipoVisitaMDL: appointment.tipo || null,
          stato: 'IN_CORSO',
          dataOra: appointment.dataOra,
        }
      })

      await window.desktopApi.db.update({
        table: 'appointments',
        id: appointment.id,
        data: { stato: 'IN_CORSO' }
      })

      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'appointments',
        entityId: appointment._serverId || appointment.id,
        localId: appointment._localId,
        payload: { stato: 'IN_CORSO' }
      })

      navigate(`/visite/${result.id}`)
    } finally {
      setStarting(false)
    }
  }, [appointment, navigate, permissions, starting, visitId])

  const updateAppointmentStatus = useCallback(async (stato: string): Promise<void> => {
    if (!appointment || !window.desktopApi || updatingStatus) return
    if (!permissions.canUpdateAppuntamenti()) return

    const isDelete = stato === 'ANNULLATO'
    setUpdatingStatus(stato)
    try {
      if (isDelete) {
        const confirmed = await window.desktopApi.app.confirmDialog({
          title: 'Annulla appuntamento',
          message: 'Vuoi eliminare l\'appuntamento dall\'agenda operativa?',
          detail: 'Usa questa azione quando il paziente ha avvisato per disdire. Per assenza senza avviso usa "No show".',
          buttons: ['Mantieni', 'Annulla appuntamento'],
          defaultId: 0,
          type: 'warning'
        })
        if (!confirmed) return

        await window.desktopApi.db.update({
          table: 'appointments',
          id: appointment.id,
          data: { stato: 'ANNULLATO' }
        })
        await window.desktopApi.db.softDelete({
          table: 'appointments',
          id: appointment.id,
          reason: 'Disdetta comunicata dal paziente'
        })
        await window.desktopApi.sync.enqueue({
          type: 'DELETE',
          entity: 'appointments',
          entityId: appointment._serverId || appointment.id,
          localId: appointment._localId,
          payload: { deletionReason: 'Disdetta comunicata dal paziente', stato: 'ANNULLATO' }
        })
        navigate('/appuntamenti')
        return
      }

      await window.desktopApi.db.update({
        table: 'appointments',
        id: appointment.id,
        data: { stato }
      })
      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'appointments',
        entityId: appointment._serverId || appointment.id,
        localId: appointment._localId,
        payload: { stato }
      })
      setAppointment(prev => prev ? { ...prev, stato } : prev)
    } finally {
      setUpdatingStatus(null)
    }
  }, [appointment, navigate, permissions, updatingStatus])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-card">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <p className="text-sm text-gray-600">{error || 'Appuntamento non trovato'}</p>
          <button onClick={() => navigate('/appuntamenti')} className="mt-4 text-sm font-medium text-teal-700">
            Torna agli appuntamenti
          </button>
        </div>
      </div>
    )
  }

  const date = new Date(appointment.dataOra)
  const patientName = [appointment.personLastName, appointment.personFirstName].filter(Boolean).join(' ') || 'Paziente'
  const doctorName = [appointment.medicoFirstName, appointment.medicoLastName].filter(Boolean).join(' ') || 'Medico'
  const canStartVisit = permissions.canCreateVisite() && permissions.canUpdateAppuntamenti()

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/appuntamenti')} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 font-heading">Appuntamento</h1>
            <p className="text-sm text-gray-500">{date.toLocaleDateString('it-IT')} · {date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        <button
          onClick={startVisit}
          disabled={starting || ['ANNULLATO', 'NO_SHOW', 'FATTURATO'].includes(appointment.stato) || !canStartVisit}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {starting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {visitId ? 'Apri visita' : 'Avvia visita'}
        </button>
      </div>

      {permissions.canUpdateAppuntamenti() && !['COMPLETATO', 'FATTURATO', 'ANNULLATO'].includes(appointment.stato) && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-card">
          <span className="text-xs font-medium text-gray-500">Azioni stato</span>
          {appointment.stato !== 'IN_ATTESA' && (
            <button
              onClick={() => { void updateAppointmentStatus('IN_ATTESA') }}
              disabled={!!updatingStatus}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Arrivato
            </button>
          )}
          {appointment.stato !== 'NO_SHOW' && (
            <button
              onClick={() => { void updateAppointmentStatus('NO_SHOW') }}
              disabled={!!updatingStatus}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Paziente non presentato senza avviso: il record resta visibile"
            >
              <Ban className="h-3.5 w-3.5" />
              No show
            </button>
          )}
          {appointment.stato !== 'IN_CORSO' && canStartVisit && (
            <button
              onClick={startVisit}
              disabled={starting || !!updatingStatus}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              Avvia visita
            </button>
          )}
          {appointment.stato !== 'NO_SHOW' && (
            <button
              onClick={() => { void updateAppointmentStatus('ANNULLATO') }}
              disabled={!!updatingStatus}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              title="Disdetta comunicata: l'appuntamento viene tolto dall'agenda"
            >
              <XCircle className="h-3.5 w-3.5" />
              Annulla/elimina
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <User className="h-4 w-4 text-teal-600" />
            Paziente
          </div>
          <p className="font-medium text-gray-900">{patientName}</p>
          {appointment.personTaxCode && <p className="mt-1 font-mono text-xs text-gray-500">{appointment.personTaxCode}</p>}
          {appointment.companyName && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-600">
              <Building2 className="h-4 w-4 text-gray-400" />
              {appointment.companyName}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Calendar className="h-4 w-4 text-teal-600" />
            Dettagli
          </div>
          <div className="space-y-3 text-sm text-gray-700">
            <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-400" />{date.toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            <p className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-gray-400" />{appointment.prestazioneNome || 'Prestazione non indicata'}</p>
            <p>Medico: <span className="font-medium">{doctorName}</span></p>
            <p>Ambulatorio: <span className="font-medium">{appointment.ambulatorioNome || 'Non indicato'}</span></p>
            <p>Stato: <span className="font-medium">{appointment.stato}</span></p>
          </div>
        </section>
      </div>

      {appointment.note && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
          <h2 className="mb-2 text-sm font-semibold text-gray-900">Note</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{appointment.note}</p>
        </section>
      )}
    </div>
  )
}
