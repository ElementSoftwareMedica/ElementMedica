import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
  Users,
  FileText,
  Download,
  LayoutGrid,
  List,
  Eye
} from 'lucide-react'
import { exportToCSV } from '../utils/exportCSV'
import { usePersistentPageState } from '../hooks/usePersistentPageState'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import { useDesktopPermission } from '../hooks/useDesktopPermission'

interface Azienda {
  id: string
  _serverId: string | null
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
  status: string | null
  medicoCompetenteId?: string | null
  medicoCompetenteNome?: string | null
  mediciCoordinati?: string | null
}

interface CompanySite {
  companyTenantProfileId: string
  medicoCompetenteId?: string | null
}

export function AziendePage(): JSX.Element {
  const [aziende, setAziende] = useState<Azienda[]>([])
  const [sites, setSites] = useState<CompanySite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = usePersistentPageState('aziende:searchTerm', '')
  const [viewMode, setViewMode] = usePersistentPageState<'cards' | 'table'>('aziende:viewMode', 'table')
  const [statusFilter, setStatusFilter] = usePersistentPageState('aziende:statusFilter', '')
  const [settoreFilter, setSettoreFilter] = usePersistentPageState('aziende:settoreFilter', '')
  const [cityFilter, setCityFilter] = usePersistentPageState('aziende:cityFilter', '')
  const [mcTab, setMcTab] = usePersistentPageState<'con_mc' | 'senza_mc'>('aziende:mcTab', 'con_mc')
  const navigate = useNavigate()
  const { user } = useDesktopAuth()
  const permissions = useDesktopPermission()
  const canSeeAllCompanies = permissions.isAdmin() || permissions.isSecretaryOrTenantAdmin()
  const showSenzaMcTab = canSeeAllCompanies && !permissions.isMedicoOnly()

  const loadAziende = useCallback(async () => {
    setLoading(true)
    try {
      if (!window.desktopApi) return
      const [rows, siteRows] = await Promise.all([
        window.desktopApi.db.query({
          table: 'companies',
          where: { _isDeleted: 0 },
          orderBy: { column: 'ragioneSociale', direction: 'ASC' }
        }) as Promise<Azienda[]>,
        window.desktopApi.db.query({
          table: 'company_sites',
          where: { _isDeleted: 0 }
        }).catch(() => []) as Promise<CompanySite[]>
      ])
      setAziende(rows)
      setSites(siteRows)
    } catch {
      // DB not ready
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAziende() }, [loadAziende])

  useEffect(() => {
    if (!showSenzaMcTab && mcTab === 'senza_mc') setMcTab('con_mc')
  }, [mcTab, setMcTab, showSenzaMcTab])

  const hasCompanyMc = useCallback((a: Azienda): boolean => {
    return !!(a.medicoCompetenteId || a.medicoCompetenteNome || sites.some(s => s.companyTenantProfileId === a.id && s.medicoCompetenteId))
  }, [sites])

  const isCompanyAssignedToCurrentDoctor = useCallback((a: Azienda): boolean => {
    if (!user?.id) return false
    if (a.medicoCompetenteId === user.id) return true
    if (sites.some(s => s.companyTenantProfileId === a.id && s.medicoCompetenteId === user.id)) return true
    const doctorName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim().toLowerCase()
    try {
      const raw = JSON.parse(a.mediciCoordinati || '[]') as Array<{ id?: string; personId?: string; medicoId?: string; nome?: string; firstName?: string; lastName?: string }>
      return raw.some(m => {
        const idMatch = [m.id, m.personId, m.medicoId].filter(Boolean).includes(user.id)
        const name = (m.nome || [m.firstName, m.lastName].filter(Boolean).join(' ')).trim().toLowerCase()
        return idMatch || (!!doctorName && name === doctorName)
      })
    } catch {
      return (a.mediciCoordinati || '').toLowerCase().includes(user.id.toLowerCase()) ||
        (!!doctorName && (a.mediciCoordinati || '').toLowerCase().includes(doctorName))
    }
  }, [sites, user?.firstName, user?.id, user?.lastName])

  const visibleByRole = aziende.filter(a => canSeeAllCompanies || isCompanyAssignedToCurrentDoctor(a))

  const filtered = visibleByRole.filter(a => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = !term || [a.ragioneSociale, a.piva, a.codiceFiscale, a.sedeLegaleCitta, a.settore, a.codiceAteco, a.emailGenerale]
      .some(f => f?.toLowerCase().includes(term))
    const matchesStatus = !statusFilter || a.status === statusFilter
    const matchesSettore = !settoreFilter || a.settore === settoreFilter
    const matchesCity = !cityFilter || a.sedeLegaleCitta === cityFilter
    const hasMc = hasCompanyMc(a)
    const matchesMc = mcTab === 'senza_mc' ? !hasMc : hasMc
    return matchesSearch && matchesStatus && matchesSettore && matchesCity && matchesMc
  })
  const conMcCount = visibleByRole.filter(hasCompanyMc).length
  const senzaMcCount = visibleByRole.filter(a => !hasCompanyMc(a)).length

  const settori = Array.from(new Set(visibleByRole.map(a => a.settore).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'it'))
  const cities = Array.from(new Set(visibleByRole.map(a => a.sedeLegaleCitta).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'it'))
  const statuses = Array.from(new Set(visibleByRole.map(a => a.status).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'it'))

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
          <Building2 className="w-5 h-5 text-teal-600" />
          Aziende
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV('companies')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Esporta CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={loadAziende}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Aggiorna
          </button>
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 ${viewMode === 'table' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}
              title="Vista tabella"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-2 ${viewMode === 'cards' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}
              title="Vista card"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        <button
          type="button"
          onClick={() => setMcTab('con_mc')}
          className={`px-4 py-2 text-sm ${mcTab === 'con_mc' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Aziende con Nomina Medico Competente <span className="ml-1 text-xs text-gray-400">{conMcCount}</span>
        </button>
        {showSenzaMcTab && (
          <button
            type="button"
            onClick={() => setMcTab('senza_mc')}
            className={`border-l border-gray-200 px-4 py-2 text-sm ${mcTab === 'senza_mc' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Aziende senza Nomina <span className="ml-1 text-xs text-gray-400">{senzaMcCount}</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-card md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca per ragione sociale, P.IVA, CF, ATECO, città..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
          <option value="">Stato</option>
          {statuses.map(s => <option key={s} value={s}>{s === 'ACTIVE' ? 'Attiva' : s}</option>)}
        </select>
        <select value={settoreFilter} onChange={e => setSettoreFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
          <option value="">Settore</option>
          {settori.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
          <option value="">Città</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <p className="text-xs text-gray-500">{filtered.length} aziend{filtered.length === 1 ? 'a' : 'e'}</p>

      {/* Companies Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-card">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {aziende.length === 0
              ? 'Nessuna azienda scaricata. Scarica i dati dalla Dashboard.'
              : 'Nessuna azienda corrisponde alla ricerca.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/70">
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Azienda</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">P.IVA / CF</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden lg:table-cell">ATECO</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden md:table-cell">Settore</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sede</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hidden xl:table-cell">Contatti</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Stato</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(a => (
                <tr key={a.id} onClick={() => navigate(`/aziende/${a.id}`)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.ragioneSociale || 'Azienda senza nome'}</p>
                    {a.medicoCompetenteNome && <p className="text-[10px] text-gray-400">MC: {a.medicoCompetenteNome}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    <div>{a.piva || '—'}</div>
                    {a.codiceFiscale && <div className="text-gray-400">{a.codiceFiscale}</div>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell font-mono text-xs text-gray-500">{a.codiceAteco || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">{a.settore || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{a.sedeLegaleCitta || '—'} {a.sedeLegaleProvincia ? `(${a.sedeLegaleProvincia})` : ''}</div>
                    {a.sedeLegaleIndirizzo && <div className="text-[10px] text-gray-400 truncate max-w-44">{a.sedeLegaleIndirizzo}</div>}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-gray-600">
                    <div>{a.emailGenerale || '—'}</div>
                    {a.telefonoGenerale && <div className="text-gray-400">{a.telefonoGenerale}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${a.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.status === 'ACTIVE' ? 'Attiva' : a.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">
                      <Eye className="h-3.5 w-3.5" /> Apri
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(a => (
            <div
              key={a.id}
              onClick={() => navigate(`/aziende/${a.id}`)}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {a.ragioneSociale || 'Azienda senza nome'}
                    </p>
                    {a.settore && (
                      <p className="text-[10px] text-gray-400 truncate">{a.settore}</p>
                    )}
                  </div>
                </div>
                {a.status && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    a.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {a.status === 'ACTIVE' ? 'Attiva' : a.status}
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1.5">
                {a.piva && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                    P.IVA: <span className="font-mono">{a.piva}</span>
                  </p>
                )}
                {a.sedeLegaleCitta && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    {[a.sedeLegaleIndirizzo, a.sedeLegaleCitta, a.sedeLegaleProvincia ? `(${a.sedeLegaleProvincia})` : null].filter(Boolean).join(', ')}
                  </p>
                )}
                {a.emailGenerale && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />{a.emailGenerale}
                  </p>
                )}
                {a.telefonoGenerale && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />{a.telefonoGenerale}
                  </p>
                )}
                {a.codiceAteco && (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    ATECO: <span className="font-mono">{a.codiceAteco}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
