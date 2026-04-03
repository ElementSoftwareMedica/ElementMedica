import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Building2,
  ArrowLeft,
  Save,
  MapPin,
  Phone,
  Mail,
  FileText,
  Users,
  Globe,
  StickyNote
} from 'lucide-react'

interface Azienda {
  id: string
  ragioneSociale: string | null
  piva: string | null
  codiceFiscale: string | null
  codiceAteco: string | null
  settore: string | null
  sedeLegaleIndirizzo: string | null
  sedeLegaleCitta: string | null
  sedeLegaleCap: string | null
  sedeLegaleProvincia: string | null
  emailGenerale: string | null
  telefonoGenerale: string | null
  pec: string | null
  sdi: string | null
  status: string | null
  noteCommerciali: string | null
  noteOperative: string | null
  noteInterne: string | null
}

interface CompanySite {
  id: string
  siteName: string | null
  indirizzo: string | null
  citta: string | null
  cap: string | null
  provincia: string | null
}

interface Lavoratore {
  id: string
  firstName: string | null
  lastName: string | null
  taxCode: string | null
}

export function AziendaDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [azienda, setAzienda] = useState<Azienda | null>(null)
  const [sites, setSites] = useState<CompanySite[]>([])
  const [lavoratori, setLavoratori] = useState<Lavoratore[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Editable fields
  const [noteCommerciali, setNoteCommerciali] = useState('')
  const [noteOperative, setNoteOperative] = useState('')
  const [noteInterne, setNoteInterne] = useState('')

  const loadData = useCallback(async () => {
    if (!id || !window.desktopApi) return
    setLoading(true)
    try {
      const [companyRows, siteRows, workerRows] = await Promise.all([
        window.desktopApi.db.query({
          table: 'companies',
          where: { id, _isDeleted: 0 },
          limit: 1
        }),
        window.desktopApi.db.query({
          table: 'company_sites',
          where: { companyTenantProfileId: id, _isDeleted: 0 }
        }),
        window.desktopApi.db.query({
          table: 'patients',
          where: { companyTenantProfileId: id, _isDeleted: 0 },
          orderBy: { column: 'lastName', direction: 'ASC' }
        })
      ])

      const rows = companyRows as Azienda[]
      if (rows.length > 0) {
        const c = rows[0]
        setAzienda(c)
        setNoteCommerciali(c.noteCommerciali || '')
        setNoteOperative(c.noteOperative || '')
        setNoteInterne(c.noteInterne || '')
      }
      setSites(siteRows as CompanySite[])
      setLavoratori(workerRows as Lavoratore[])
    } catch {
      // silent
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (): Promise<void> => {
    if (!id || !azienda) return
    setSaving(true)
    try {
      const updateData = {
        noteCommerciali,
        noteOperative,
        noteInterne
      }

      await window.desktopApi.db.update({
        table: 'companies',
        id,
        data: updateData
      })

      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'companies',
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

  if (!azienda) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Azienda non trovata</p>
        <button onClick={() => navigate('/aziende')} className="mt-3 text-sm text-teal-600 hover:underline">
          Torna alle aziende
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/aziende')}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 font-heading truncate">
            {azienda.ragioneSociale || 'Azienda'}
          </h1>
          <p className="text-xs text-gray-500">
            {azienda.settore && `${azienda.settore} · `}
            {azienda.status === 'ACTIVE' ? 'Attiva' : azienda.status}
          </p>
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
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Company Details Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              Dati Azienda
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoRow label="P.IVA" value={azienda.piva} icon={FileText} mono />
              <InfoRow label="Codice Fiscale" value={azienda.codiceFiscale} icon={FileText} mono />
              <InfoRow label="ATECO" value={azienda.codiceAteco} mono />
              <InfoRow label="SDI" value={azienda.sdi} mono />
              <InfoRow label="Email" value={azienda.emailGenerale} icon={Mail} />
              <InfoRow label="Telefono" value={azienda.telefonoGenerale} icon={Phone} />
              <InfoRow label="PEC" value={azienda.pec} icon={Mail} />
            </div>
            {azienda.sedeLegaleCitta && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  Sede legale: {[azienda.sedeLegaleIndirizzo, azienda.sedeLegaleCap, azienda.sedeLegaleCitta, azienda.sedeLegaleProvincia ? `(${azienda.sedeLegaleProvincia})` : null].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Notes (Editable) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-teal-600" />
              Note
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note Operative</label>
                <textarea
                  rows={3}
                  value={noteOperative}
                  onChange={(e) => { setNoteOperative(e.target.value); setDirty(true) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Note operative per la giornata di visite..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note Commerciali</label>
                <textarea
                  rows={3}
                  value={noteCommerciali}
                  onChange={(e) => { setNoteCommerciali(e.target.value); setDirty(true) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Note commerciali..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note Interne</label>
                <textarea
                  rows={3}
                  value={noteInterne}
                  onChange={(e) => { setNoteInterne(e.target.value); setDirty(true) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Note interne riservate..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Sedi */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-teal-500" />
              Sedi ({sites.length})
            </h3>
            {sites.length === 0 ? (
              <p className="text-xs text-gray-400">Nessuna sede registrata</p>
            ) : (
              <div className="space-y-2">
                {sites.map(s => (
                  <div key={s.id} className="px-2.5 py-2 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-800">{s.siteName || 'Sede'}</p>
                    <p className="text-[10px] text-gray-500">
                      {[s.indirizzo, s.citta, s.provincia ? `(${s.provincia})` : null].filter(Boolean).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lavoratori */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-500" />
              Lavoratori ({lavoratori.length})
            </h3>
            {lavoratori.length === 0 ? (
              <p className="text-xs text-gray-400">Nessun lavoratore associato</p>
            ) : (
              <div className="space-y-1">
                {lavoratori.slice(0, 15).map(l => (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/pazienti/${l.id}`)}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between"
                  >
                    <span className="truncate">{l.lastName} {l.firstName}</span>
                    <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">{l.taxCode?.slice(0, 6)}</span>
                  </button>
                ))}
                {lavoratori.length > 15 && (
                  <p className="text-[10px] text-gray-400 text-center pt-1">
                    + altri {lavoratori.length - 15}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  icon: Icon,
  mono
}: {
  label: string
  value: string | null | undefined
  icon?: React.ComponentType<{ className?: string }>
  mono?: boolean
}): JSX.Element | null {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm text-gray-700 flex items-center gap-1 ${mono ? 'font-mono' : ''}`}>
        {Icon && <Icon className="w-3 h-3 text-gray-400 shrink-0" />}
        {value}
      </p>
    </div>
  )
}
