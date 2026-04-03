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
  Download
} from 'lucide-react'
import { exportToCSV } from '../utils/exportCSV'

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
}

export function AziendePage(): JSX.Element {
  const [aziende, setAziende] = useState<Azienda[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  const loadAziende = useCallback(async () => {
    setLoading(true)
    try {
      if (!window.desktopApi) return
      const rows = await window.desktopApi.db.query({
        table: 'companies',
        where: { _isDeleted: 0 },
        orderBy: { column: 'ragioneSociale', direction: 'ASC' }
      }) as Azienda[]
      setAziende(rows)
    } catch {
      // DB not ready
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAziende() }, [loadAziende])

  const filtered = aziende.filter(a => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return [a.ragioneSociale, a.piva, a.codiceFiscale, a.sedeLegaleCitta, a.settore]
      .some(f => f?.toLowerCase().includes(term))
  })

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
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per ragione sociale, P.IVA, città..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
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
