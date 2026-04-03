import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users,
  ArrowLeft,
  Save,
  Phone,
  Mail,
  Calendar,
  Building2,
  Stethoscope,
  Briefcase,
  MapPin,
  FileText
} from 'lucide-react'

interface Paziente {
  id: string
  firstName: string | null
  lastName: string | null
  taxCode: string | null
  birthDate: string | null
  birthPlace: string | null
  gender: string | null
  email: string | null
  phone: string | null
  residenceAddress: string | null
  residenceCity: string | null
  postalCode: string | null
  province: string | null
  companyName: string | null
  companyTenantProfileId: string | null
  status: string | null
  title: string | null
}

interface Visita {
  id: string
  visitDate: string | null
  visitType: string | null
  status: string | null
  motivoVisita: string | null
}

interface Mansione {
  id: string
  mansioneId: string | null
  mansioneName: string | null
  dataAssegnazione: string | null
}

export function LavoratoreDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [paziente, setPaziente] = useState<Paziente | null>(null)
  const [visite, setVisite] = useState<Visita[]>([])
  const [mansioni, setMansioni] = useState<Mansione[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Editable fields
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const loadData = useCallback(async () => {
    if (!id || !window.desktopApi) return
    setLoading(true)
    try {
      const [patientRows, visitRows, mansioniRows] = await Promise.all([
        window.desktopApi.db.query({
          table: 'patients',
          where: { id, _isDeleted: 0 },
          limit: 1
        }),
        window.desktopApi.db.query({
          table: 'visits',
          where: { patientId: id, _isDeleted: 0 },
          orderBy: { column: 'visitDate', direction: 'DESC' }
        }),
        window.desktopApi.db.query({
          table: 'lavoratore_mansioni',
          where: { lavoratoreId: id, _isDeleted: 0 }
        })
      ])

      const rows = patientRows as Paziente[]
      if (rows.length > 0) {
        const p = rows[0]
        setPaziente(p)
        setEmail(p.email || '')
        setPhone(p.phone || '')
      }
      setVisite(visitRows as Visita[])
      setMansioni(mansioniRows as Mansione[])
    } catch {
      // silent
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (): Promise<void> => {
    if (!id || !paziente) return
    setSaving(true)
    try {
      const updateData = { email, phone }

      await window.desktopApi.db.update({
        table: 'patients',
        id,
        data: updateData
      })

      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'patients',
        entityId: id,
        payload: updateData
      })

      setDirty(false)
    } catch {
      // silent
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    )
  }

  if (!paziente) {
    return (
      <div className="text-center py-12">
        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Lavoratore non trovato</p>
        <button onClick={() => navigate('/pazienti')} className="mt-3 text-sm text-teal-600 hover:underline">
          Torna ai lavoratori
        </button>
      </div>
    )
  }

  const age = paziente.birthDate
    ? Math.floor((Date.now() - new Date(paziente.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/pazienti')}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold shrink-0">
            {paziente.firstName?.[0]}{paziente.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 font-heading truncate">
              {paziente.lastName} {paziente.firstName}
            </h1>
            <p className="text-xs text-gray-500">
              {paziente.taxCode && <span className="font-mono">{paziente.taxCode}</span>}
              {age !== null && ` · ${age} anni`}
              {paziente.gender && ` · ${paziente.gender === 'MALE' ? 'M' : paziente.gender === 'FEMALE' ? 'F' : paziente.gender}`}
            </p>
          </div>
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salva'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Info Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Dati Anagrafici
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {paziente.birthDate && (
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Data di Nascita</p>
                  <p className="text-sm text-gray-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    {new Date(paziente.birthDate).toLocaleDateString('it-IT')}
                  </p>
                </div>
              )}
              {paziente.birthPlace && (
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Luogo di Nascita</p>
                  <p className="text-sm text-gray-700">{paziente.birthPlace}</p>
                </div>
              )}
              {paziente.residenceCity && (
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 mb-0.5">Residenza</p>
                  <p className="text-sm text-gray-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {[paziente.residenceAddress, paziente.postalCode, paziente.residenceCity, paziente.province ? `(${paziente.province})` : null].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {paziente.companyName && (
                <div className="col-span-2">
                  <p className="text-[10px] text-gray-400 mb-0.5">Azienda</p>
                  <button
                    onClick={() => paziente.companyTenantProfileId && navigate(`/aziende/${paziente.companyTenantProfileId}`)}
                    className="text-sm text-teal-600 hover:underline flex items-center gap-1"
                  >
                    <Building2 className="w-3 h-3" />
                    {paziente.companyName}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Editable Contact Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-teal-600" />
              Contatti
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Mail className="w-3 h-3 inline mr-1" />Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setDirty(true) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="email@esempio.it"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />Telefono
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setDirty(true) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="+39 xxx xxx xxxx"
                />
              </div>
            </div>
          </div>

          {/* Visit History */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Storico Visite ({visite.length})
            </h2>
            {visite.length === 0 ? (
              <p className="text-xs text-gray-400">Nessuna visita registrata</p>
            ) : (
              <div className="space-y-2">
                {visite.map(v => (
                  <button
                    key={v.id}
                    onClick={() => navigate(`/visite/${v.id}`)}
                    className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800">
                        {v.visitDate ? new Date(v.visitDate).toLocaleDateString('it-IT') : '—'}
                        {v.visitType && ` · ${v.visitType}`}
                      </p>
                      {v.motivoVisita && (
                        <p className="text-[10px] text-gray-500 truncate">{v.motivoVisita}</p>
                      )}
                    </div>
                    <StatusBadge status={v.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Mansioni */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-teal-500" />
              Mansioni ({mansioni.length})
            </h3>
            {mansioni.length === 0 ? (
              <p className="text-xs text-gray-400">Nessuna mansione assegnata</p>
            ) : (
              <div className="space-y-1.5">
                {mansioni.map(m => (
                  <div key={m.id} className="px-2.5 py-2 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-800">{m.mansioneName || 'Mansione'}</p>
                    {m.dataAssegnazione && (
                      <p className="text-[10px] text-gray-500">
                        dal {new Date(m.dataAssegnazione).toLocaleDateString('it-IT')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-500" />
              Riepilogo
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Stato</span>
                <StatusBadge status={paziente.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Visite totali</span>
                <span className="font-medium text-gray-800">{visite.length}</span>
              </div>
              {visite.length > 0 && visite[0].visitDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Ultima visita</span>
                  <span className="font-medium text-gray-800">
                    {new Date(visite[0].visitDate).toLocaleDateString('it-IT')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string | null }): JSX.Element {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700',
    COMPLETED: 'bg-blue-50 text-blue-700',
    COMPLETATA: 'bg-blue-50 text-blue-700',
    IN_PROGRESS: 'bg-amber-50 text-amber-700',
    IN_CORSO: 'bg-amber-50 text-amber-700',
    PROGRAMMATA: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-red-50 text-red-600'
  }

  const labels: Record<string, string> = {
    ACTIVE: 'Attivo',
    COMPLETED: 'Completata',
    COMPLETATA: 'Completata',
    IN_PROGRESS: 'In corso',
    IN_CORSO: 'In corso',
    PROGRAMMATA: 'Programmata',
    CANCELLED: 'Annullata'
  }

  const s = status || 'ACTIVE'
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[s] || 'bg-gray-100 text-gray-500'}`}>
      {labels[s] || s}
    </span>
  )
}
