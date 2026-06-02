import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  ActivitySquare
} from 'lucide-react'
import { formatProtocolloPeriodicity, normalizeProtocolloPrestazioni, type ProtocolloPrestazioneRow } from '../utils/protocolloSanitario'
import { ElegantSelect } from '../components/ElegantControls'

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
  protocolloSanitarioId: string | null
}

interface Visita {
  id: string
  dataOra: string | null
  tipoVisitaMDL: string | null
  stato: string | null
  motivoVisita: string | null
}

interface LavoratoreMansione {
  id: string
  mansioneId: string | null
  dataInizio: string | null
  dataFine: string | null
  isPrimary: number
}

interface MansioneCatalog {
  id: string
  nome: string | null
  codice: string | null
}

interface Movimento {
  id: string
  tipo: string | null
  descrizione: string | null
  importo: number | null
  importoNetto: number | null
  iva: number | null
  stato: string | null
  dataMovimento: string | null
  dataPagamento: string | null
  metodoPagamento: string | null
  riferimentoFattura: string | null
  note: string | null
}

interface Protocollo {
  id: string
  nome: string | null
  descrizione: string | null
  mansioneNome: string | null
  mansioneId: string | null
  isActive: number
}

const CATEGORIE_RISCHIO = ['CHIMICO', 'FISICO', 'BIOLOGICO', 'ERGONOMICO', 'PSICOSOCIALE', 'MOVIMENTAZIONE', 'ALTRO'] as const
const LIVELLI_RISCHIO = ['BASSO', 'MEDIO', 'ALTO', 'MOLTO_ALTO'] as const

interface RischioAggiuntivo {
  id: string
  personId: string
  codiceRischio: string | null
  livello: string | null
  categoria: string | null
  descrizioneEsposizione: string | null
  fonteRischio: string | null
  periodicitaMesi: number | null
  note: string | null
}

interface NuovoRischioForm {
  codiceRischio: string
  livello: string
  categoria: string
  descrizioneEsposizione: string
  fonteRischio: string
}

type ActiveTab = 'dati' | 'visite' | 'mansioni' | 'movimenti'

export function LavoratoreDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const backTarget = (location.state as { from?: string } | null)?.from || '/pazienti'
  const [paziente, setPaziente] = useState<Paziente | null>(null)
  const [visite, setVisite] = useState<Visita[]>([])
  const [mansioni, setMansioni] = useState<LavoratoreMansione[]>([])
  const [mansioneCatalog, setMansioneCatalog] = useState<Map<string, string>>(new Map())
  const [movimenti, setMovimenti] = useState<Movimento[]>([])
  const [protocolli, setProtocolli] = useState<Protocollo[]>([])
  const [protocolloPrestazioni, setProtocolloPrestazioni] = useState<Map<string, ProtocolloPrestazioneRow[]>>(new Map())
  const [rischi, setRischi] = useState<RischioAggiuntivo[]>([])
  const [showAddRischio, setShowAddRischio] = useState(false)
  const [nuovoRischio, setNuovoRischio] = useState<NuovoRischioForm>({
    codiceRischio: '', livello: 'MEDIO', categoria: 'CHIMICO', descrizioneEsposizione: '', fonteRischio: ''
  })
  const [savingRischio, setSavingRischio] = useState(false)
  const [editingRischioId, setEditingRischioId] = useState<string | null>(null)
  const [editingLivello, setEditingLivello] = useState<string>('MEDIO')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('dati')
  const [savingProtocollo, setSavingProtocollo] = useState(false)

  // FSE 2.0 - Fascicolo Sanitario Elettronico
  const [fseConsent, setFseConsent] = useState<{ hasConsent: boolean; optOut: boolean } | null>(null)
  const [fseSaving, setFseSaving] = useState(false)

  // Editable fields
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const loadData = useCallback(async () => {
    if (!id || !window.desktopApi) return
    setLoading(true)
    try {
      const [patientRows, visitRows, mansioniRows, mansioneCatalogRows, movimentiRows] = await Promise.all([
        window.desktopApi.db.query({
          table: 'patients',
          where: { id, _isDeleted: 0 },
          limit: 1
        }),
        window.desktopApi.db.query({
          table: 'visits',
          where: { personId: id, _isDeleted: 0 },
          orderBy: { column: 'dataOra', direction: 'DESC' }
        }),
        window.desktopApi.db.query({
          table: 'lavoratore_mansioni',
          where: { personId: id, _isDeleted: 0 }
        }),
        window.desktopApi.db.query({
          table: 'mansioni',
          where: { _isDeleted: 0 }
        }),
        window.desktopApi.db.query({
          table: 'movimenti_contabili',
          where: { personId: id, _isDeleted: 0 },
          orderBy: { column: 'dataMovimento', direction: 'DESC' }
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
      setMansioni(mansioniRows as LavoratoreMansione[])
      const catalog = new Map<string, string>()
      for (const m of mansioneCatalogRows as Array<{ id: string; nome: string | null }>) {
        if (m.id && m.nome) catalog.set(m.id, m.nome)
      }
      setMansioneCatalog(catalog)
      setMovimenti(movimentiRows as Movimento[])

      // Load protocolli filtered by worker's mansioni
      const allProtocolli = await window.desktopApi.db.query({
        table: 'protocolli',
        where: { _isDeleted: 0 }
      }) as Protocollo[]
      const workerMansioniIds = new Set((mansioniRows as LavoratoreMansione[]).map(m => m.mansioneId).filter(Boolean))
      const patientProtocolloId = (rows[0]?.protocolloSanitarioId ?? null) as string | null
      const linked = allProtocolli.filter(p =>
        (patientProtocolloId && p.id === patientProtocolloId) ||
        (p.mansioneId && workerMansioniIds.has(p.mansioneId))
      )
      setProtocolli(linked)
      const linkedProtocolloIds = new Set(linked.map(p => p.id))
      const protocolloPrestazioniRows = await window.desktopApi.db.query({
        table: 'protocollo_prestazioni',
        where: { _isDeleted: 0 }
      }).catch(() => []) as Array<ProtocolloPrestazioneRow & { protocolloId: string }>
      const grouped = new Map<string, ProtocolloPrestazioneRow[]>()
      for (const row of protocolloPrestazioniRows) {
        if (!linkedProtocolloIds.has(row.protocolloId)) continue
        const rows = grouped.get(row.protocolloId) || []
        rows.push(row)
        grouped.set(row.protocolloId, rows)
      }
      setProtocolloPrestazioni(grouped)

      // Load rischi aggiuntivi for this worker
      if (window.desktopApi.rischi) {
        const rischiRows = await window.desktopApi.rischi.getForWorker(id) as RischioAggiuntivo[]
        setRischi(rischiRows)
      }

      // Load FSE consent
      if (window.desktopApi.fse) {
        try {
          const fseResult = await window.desktopApi.fse.getConsent(id) as { ok: boolean; hasConsent?: boolean; optOut?: boolean }
          if (fseResult.ok) {
            setFseConsent({ hasConsent: !!fseResult.hasConsent, optOut: !!fseResult.optOut })
          }
        } catch { /* FSE not available */ }
      }
    } catch {
      // silent
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const handleAddRischio = async (): Promise<void> => {
    if (!id || !nuovoRischio.codiceRischio.trim()) return
    setSavingRischio(true)
    try {
      const tenantId = (await window.desktopApi.tenant.get()) as string || ''
      await window.desktopApi.rischi.add(id, tenantId, {
        codiceRischio: nuovoRischio.codiceRischio.trim(),
        livello: nuovoRischio.livello,
        categoria: nuovoRischio.categoria,
        descrizioneEsposizione: nuovoRischio.descrizioneEsposizione || null,
        fonteRischio: nuovoRischio.fonteRischio || null
      })
      // Reload rischi
      const updated = await window.desktopApi.rischi.getForWorker(id) as RischioAggiuntivo[]
      setRischi(updated)
      setNuovoRischio({ codiceRischio: '', livello: 'MEDIO', categoria: 'CHIMICO', descrizioneEsposizione: '', fonteRischio: '' })
      setShowAddRischio(false)
    } catch { /* silent */ }
    setSavingRischio(false)
  }

  const handleRemoveRischio = async (rischioId: string): Promise<void> => {
    if (!id) return
    try {
      await window.desktopApi.rischi.remove(rischioId)
      setRischi(prev => prev.filter(r => r.id !== rischioId))
    } catch { /* silent */ }
  }

  const handleUpdateLivello = async (rischioId: string, nuovoLivello: string): Promise<void> => {
    try {
      await window.desktopApi.rischi.update(rischioId, { livello: nuovoLivello })
      setRischi(prev => prev.map(r => r.id === rischioId ? { ...r, livello: nuovoLivello } : r))
    } catch { /* silent */ } finally {
      setEditingRischioId(null)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!id || !paziente) return
    setSaving(true)
    setSaveError(null)
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
      setSaveError('Errore nel salvataggio. Riprova.')
    }
    setSaving(false)
  }

  /** Assign or unassign the active protocollo sanitario to the worker */
  const handleAssignProtocollo = async (protocolloId: string | null): Promise<void> => {
    if (!id || !paziente) return
    setSavingProtocollo(true)
    try {
      await window.desktopApi.db.update({ table: 'patients', id, data: { protocolloSanitarioId: protocolloId } })
      setPaziente(prev => prev ? { ...prev, protocolloSanitarioId: protocolloId } : prev)
      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'personTenantProfile',
        entityId: id,
        payload: { protocolloSanitarioId: protocolloId }
      })
    } catch { /* silent */ }
    setSavingProtocollo(false)
  }

  const handleToggleFseConsent = async (newConsent: boolean): Promise<void> => {
    if (!id || !window.desktopApi?.fse || fseSaving) return
    setFseSaving(true)
    try {
      const result = await window.desktopApi.fse.setConsent(id, newConsent) as { ok: boolean }
      if (result.ok) {
        setFseConsent(prev => prev ? { ...prev, hasConsent: newConsent } : { hasConsent: newConsent, optOut: false })
      }
    } catch { /* silent */ } finally {
      setFseSaving(false)
    }
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
        <button onClick={() => navigate(backTarget)} className="mt-3 text-sm text-teal-600 hover:underline">
          Torna ai lavoratori
        </button>
      </div>
    )
  }

  const age = paziente.birthDate
    ? Math.floor((Date.now() - new Date(paziente.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const tabs: { id: ActiveTab; label: string; count?: number }[] = [
    { id: 'dati', label: 'Dati Personali' },
    { id: 'visite', label: 'Visite', count: visite.length },
    { id: 'mansioni', label: 'Mansioni & Protocolli', count: mansioni.length },
    { id: 'movimenti', label: 'Movimenti', count: movimenti.length }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(backTarget)}
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
              {paziente.companyName && ` · ${paziente.companyName}`}
            </p>
          </div>
        </div>
        {dirty && (
          <div className="flex items-center gap-2">
            {saveError && (
              <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">{saveError}</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salva'}
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.id ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== TAB: DATI ===== */}
      {activeTab === 'dati' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Personal Info */}
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
          </div>

          {/* Sidebar Quick Info */}
          <div className="space-y-4">
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
                {visite.length > 0 && visite[0].dataOra && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ultima visita</span>
                    <span className="font-medium text-gray-800">
                      {new Date(visite[0].dataOra).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Mansioni</span>
                  <span className="font-medium text-gray-800">{mansioni.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Protocolli</span>
                  <span className="font-medium text-gray-800">{protocolli.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Movimenti</span>
                  <span className="font-medium text-gray-800">{movimenti.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* FSE 2.0 Consent */}
          {fseConsent !== null && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ActivitySquare className="w-4 h-4 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Fascicolo Sanitario Elettronico (FSE 2.0)</p>
                    <p className="text-[10px] text-gray-500">Consenso alla trasmissione dati al FSE regionale</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleFseConsent(!fseConsent.hasConsent)}
                  disabled={fseSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    fseConsent.hasConsent ? 'bg-teal-600' : 'bg-gray-200'
                  }`}
                  title={fseConsent.hasConsent ? 'Consenso accordato — clicca per revocare' : 'Consenso non accordato — clicca per concedere'}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    fseConsent.hasConsent ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <p className={`mt-2 text-[10px] ${fseConsent.hasConsent ? 'text-teal-600' : 'text-gray-400'}`}>
                {fseConsent.hasConsent
                  ? 'Il lavoratore ha fornito consenso. I dati delle visite potranno essere trasmessi al FSE.'
                  : 'Consenso non accordato. I dati non vengono trasmessi al FSE.'}
                {fseConsent.optOut && ' (Opt-out attivo)'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: VISITE ===== */}
      {activeTab === 'visite' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            Storico Visite ({visite.length})
          </h2>
          {visite.length === 0 ? (
            <div className="text-center py-8">
              <Stethoscope className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nessuna visita registrata</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visite.map(v => (
                <button
                  key={v.id}
                  onClick={() => navigate(`/visite/${v.id}`, { state: { from: `/pazienti/${id}` } })}
                  className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">
                      {v.dataOra ? new Date(v.dataOra).toLocaleDateString('it-IT') : '—'}
                      {v.tipoVisitaMDL && ` · ${v.tipoVisitaMDL}`}
                    </p>
                    {v.motivoVisita && (
                      <p className="text-[10px] text-gray-500 truncate">{v.motivoVisita}</p>
                    )}
                  </div>
                  <StatusBadge status={v.stato} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: MANSIONI & PROTOCOLLI ===== */}
      {activeTab === 'mansioni' && (
        <>
        {/* Protocollo Attivo del Lavoratore */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              Protocollo Sanitario Attivo
            </h2>
            {protocolli.length > 1 && (
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {protocolli.length} protocolli disponibili — selezionane uno
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Anche se il lavoratore ha più mansioni con più protocolli, solo uno è applicato: quello qui selezionato.
          </p>
          {protocolli.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <FileText className="w-4 h-4 shrink-0" />
              <span>
                {mansioni.length === 0
                  ? 'Assegna prima una mansione per avere protocolli disponibili.'
                  : 'Nessun protocollo associato alle mansioni di questo lavoratore.'}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {protocolli.map(p => {
                const isActive = paziente?.protocolloSanitarioId === p.id
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                      isActive
                        ? 'bg-teal-50 border-teal-300'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.nome || 'Protocollo'}</p>
                      {p.mansioneNome && (
                        <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Briefcase className="w-2.5 h-2.5 shrink-0" />
                          Mansione: {p.mansioneNome}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {isActive ? (
                        <>
                          <span className="text-[10px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                            ATTIVO
                          </span>
                          {protocolli.length > 1 && (
                            <button
                              onClick={() => { void handleAssignProtocollo(null) }}
                              disabled={savingProtocollo}
                              className="text-[11px] text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Rimuovi assegnazione"
                            >
                              Rimuovi
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => { void handleAssignProtocollo(p.id) }}
                          disabled={savingProtocollo}
                          className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50"
                        >
                          {savingProtocollo ? '...' : 'Imposta come attivo'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {!paziente?.protocolloSanitarioId && protocolli.length > 0 && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Nessun protocollo attivo selezionato — scegline uno sopra.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mansioni */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-teal-600" />
              Mansioni Assegnate ({mansioni.length})
            </h2>
            {mansioni.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nessuna mansione assegnata</p>
              </div>
            ) : (
              <div className="space-y-2">
                {mansioni.map(m => {
                  const nomeMansione = m.mansioneId ? (mansioneCatalog.get(m.mansioneId) || m.mansioneId) : '—'
                  return (
                    <div key={m.id} className="px-3 py-2.5 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{nomeMansione}</p>
                        {!!m.isPrimary && (
                          <span className="text-[9px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-full font-semibold shrink-0 ml-2">
                            PRINCIPALE
                          </span>
                        )}
                      </div>
                      {m.dataInizio && (
                        <p className="text-[10px] text-gray-500">
                          dal {new Date(m.dataInizio).toLocaleDateString('it-IT')}
                          {m.dataFine ? ` al ${new Date(m.dataFine).toLocaleDateString('it-IT')}` : ' · in corso'}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Protocolli dalla mansione */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              Protocolli Sanitari ({protocolli.length})
            </h2>
            {protocolli.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {mansioni.length === 0 ? 'Nessuna mansione assegnata' : 'Nessun protocollo per le mansioni assegnate'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {protocolli.map(p => {
                  const prestazioni = normalizeProtocolloPrestazioni(protocolloPrestazioni.get(p.id) || [])
                  return (
                    <div key={p.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-3 py-2.5 bg-gray-50 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{p.nome || 'Protocollo'}</p>
                          {p.mansioneNome && (
                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <Briefcase className="w-2.5 h-2.5" />
                              {p.mansioneNome}
                            </p>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {p.isActive ? 'Attivo' : 'Non attivo'}
                        </span>
                      </div>
                      {prestazioni.length > 0 && (
                        <div className="divide-y divide-gray-50">
                          {prestazioni.map((prest, i) => (
                            <div key={i} className="px-3 py-2 flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-700">{prest.prestazioneNome}</p>
                                <p className="text-[10px] text-gray-400">{formatProtocolloPeriodicity(prest.periodicitaMesi)}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {prest.obbligatoria && (
                                  <span className="text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full font-medium">
                                    OBB
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rischi Aggiuntivi (full width below grid) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Rischi Aggiuntivi Personalizzati ({rischi.length})
            </h2>
            <button
              onClick={() => setShowAddRischio(p => !p)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
            >
              <Shield className="w-3 h-3" />
              {showAddRischio ? 'Annulla' : 'Aggiungi rischio'}
            </button>
          </div>

          {/* Add rischio form */}
          {showAddRischio && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Codice rischio *</label>
                  <input
                    type="text"
                    value={nuovoRischio.codiceRischio}
                    onChange={e => setNuovoRischio(p => ({ ...p, codiceRischio: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="es. RUMORE, VIBRAZIONE, VDT..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Livello</label>
                  <ElegantSelect
                    value={nuovoRischio.livello}
                    onChange={livello => setNuovoRischio(p => ({ ...p, livello }))}
                    options={LIVELLI_RISCHIO.map(l => ({ value: l, label: l }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                  <ElegantSelect
                    value={nuovoRischio.categoria}
                    onChange={categoria => setNuovoRischio(p => ({ ...p, categoria }))}
                    options={CATEGORIE_RISCHIO.map(c => ({ value: c, label: c }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fonte rischio</label>
                  <input
                    type="text"
                    value={nuovoRischio.fonteRischio}
                    onChange={e => setNuovoRischio(p => ({ ...p, fonteRischio: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="es. Macchinario X, Solvente Y..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descrizione esposizione</label>
                <input
                  type="text"
                  value={nuovoRischio.descrizioneEsposizione}
                  onChange={e => setNuovoRischio(p => ({ ...p, descrizioneEsposizione: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Descrizione modalità di esposizione..."
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddRischio}
                  disabled={savingRischio || !nuovoRischio.codiceRischio.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  {savingRischio ? 'Aggiungendo...' : 'Aggiungi'}
                </button>
              </div>
            </div>
          )}

          {rischi.length === 0 && !showAddRischio ? (
            <div className="text-center py-6">
              <Shield className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nessun rischio aggiuntivo personalizzato</p>
              <p className="text-xs text-gray-400 mt-1">Aggiungili per integrare i rischi della mansione con quelli specifici del lavoratore</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rischi.map(r => {
                const livelloColor =
                  r.livello === 'MOLTO_ALTO' ? 'bg-red-100 text-red-700' :
                  r.livello === 'ALTO' ? 'bg-orange-100 text-orange-700' :
                  r.livello === 'MEDIO' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                return (
                  <div key={r.id} className="flex items-start justify-between px-3 py-2.5 bg-gray-50 rounded-xl gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-gray-800">{r.codiceRischio}</p>
                        {editingRischioId === r.id ? (
                          <div className="w-28" onClick={e => e.stopPropagation()}>
                          <ElegantSelect
                            value={editingLivello}
                            onChange={value => {
                              setEditingLivello(value)
                              void handleUpdateLivello(r.id, value)
                            }}
                            options={LIVELLI_RISCHIO.map(l => ({ value: l, label: l }))}
                          />
                          </div>
                        ) : (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${livelloColor} cursor-pointer hover:opacity-75 transition-opacity`}
                            title="Clicca per modificare il livello"
                            onClick={() => { setEditingRischioId(r.id); setEditingLivello(r.livello || 'MEDIO') }}
                          >
                            {r.livello}
                          </span>
                        )}
                        {r.categoria && (
                          <span className="text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full">
                            {r.categoria}
                          </span>
                        )}
                      </div>
                      {r.descrizioneEsposizione && (
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{r.descrizioneEsposizione}</p>
                      )}
                      {r.fonteRischio && (
                        <p className="text-[10px] text-gray-400 truncate">{r.fonteRischio}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveRischio(r.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </>
      )}

      {/* ===== TAB: MOVIMENTI ===== */}
      {activeTab === 'movimenti' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-teal-600" />
            Movimenti Contabili ({movimenti.length})
          </h2>
          {movimenti.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nessun movimento contabile registrato</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {movimenti.map(mov => {
                const imEuro = mov.importo != null ? `€ ${Number(mov.importo).toFixed(2)}` : '—'
                const isPayment = mov.tipo?.toLowerCase().includes('pagamento') || mov.tipo?.toLowerCase().includes('incasso')
                return (
                  <div key={mov.id} className="px-3 py-2.5 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isPayment
                          ? <TrendingDown className="w-3 h-3 text-green-500 shrink-0" />
                          : <TrendingUp className="w-3 h-3 text-amber-500 shrink-0" />}
                        <p className="text-sm text-gray-800 truncate">
                          {mov.descrizione || mov.tipo || 'Movimento'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {mov.dataMovimento && (
                          <span className="text-[10px] text-gray-400">
                            {new Date(mov.dataMovimento).toLocaleDateString('it-IT')}
                          </span>
                        )}
                        {mov.metodoPagamento && (
                          <span className="text-[10px] text-gray-400">{mov.metodoPagamento}</span>
                        )}
                        {mov.riferimentoFattura && (
                          <span className="text-[10px] text-gray-500 font-mono">{mov.riferimentoFattura}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-gray-900">{imEuro}</p>
                      <MovimentoStatoBadge stato={mov.stato} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
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

function MovimentoStatoBadge({ stato }: { stato: string | null }): JSX.Element {
  const config: Record<string, { label: string; cls: string }> = {
    BOZZA: { label: 'Bozza', cls: 'bg-gray-100 text-gray-500' },
    DA_EMETTERE: { label: 'Da emettere', cls: 'bg-amber-50 text-amber-700' },
    EMESSO: { label: 'Emesso', cls: 'bg-blue-50 text-blue-700' },
    PAGATO: { label: 'Pagato', cls: 'bg-green-50 text-green-700' },
    ANNULLATO: { label: 'Annullato', cls: 'bg-red-50 text-red-600' },
    DA_FATTURARE: { label: 'Da fatturare', cls: 'bg-orange-50 text-orange-600' }
  }
  const s = stato || 'BOZZA'
  const { label, cls } = config[s] || { label: s, cls: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
  )
}
