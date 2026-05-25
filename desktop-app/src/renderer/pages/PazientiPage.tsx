import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Phone,
  Mail,
  Building2,
  Calendar,
  RefreshCw,
  Download,
  UserPlus
} from 'lucide-react'
import { exportToCSV } from '../utils/exportCSV'
import { usePersistentPageState } from '../hooks/usePersistentPageState'

interface Paziente {
  id: string
  _serverId: string | null
  firstName: string | null
  lastName: string | null
  taxCode: string | null
  email: string | null
  phone: string | null
  birthDate: string | null
  gender: string | null
  residenceCity: string | null
  companyName: string | null
}

export function PazientiPage(): JSX.Element {
  const [pazienti, setPazienti] = useState<Paziente[]>([])
  const [filtered, setFiltered] = useState<Paziente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = usePersistentPageState('pazienti:searchTerm', '')
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const loadPazienti = useCallback(async () => {
    setLoading(true)
    try {
      if (!window.desktopApi) return
      const rows = await window.desktopApi.db.query({
        table: 'patients',
        where: { _isDeleted: 0 },
        orderBy: { column: 'lastName', direction: 'ASC' }
      }) as Paziente[]
      setPazienti(rows)
      setFiltered(rows)
    } catch {
      // DB not ready
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPazienti() }, [loadPazienti])

  // FTS5 search with debounce (150ms)
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)

    if (!searchTerm.trim()) {
      setFiltered(pazienti)
      return
    }

    if (searchTerm.trim().length < 2) {
      // Simple in-memory filter for 1-char queries
      const term = searchTerm.toLowerCase()
      setFiltered(pazienti.filter(p =>
        [p.firstName, p.lastName, p.taxCode, p.email, p.phone, p.companyName]
          .some(f => f?.toLowerCase().includes(term))
      ))
      return
    }

    searchDebounce.current = setTimeout(async () => {
      try {
        if (window.desktopApi?.db?.searchPatients) {
          const results = await window.desktopApi.db.searchPatients({ query: searchTerm.trim() }) as Paziente[]
          setFiltered(results)
        } else {
          // Fallback: in-memory filter if FTS not available
          const term = searchTerm.toLowerCase()
          setFiltered(pazienti.filter(p =>
            [p.firstName, p.lastName, p.taxCode, p.email, p.phone, p.companyName]
              .some(f => f?.toLowerCase().includes(term))
          ))
        }
      } catch {
        // FTS error: fall back to in-memory
        const term = searchTerm.toLowerCase()
        setFiltered(pazienti.filter(p =>
          [p.firstName, p.lastName, p.taxCode, p.email, p.phone, p.companyName]
            .some(f => f?.toLowerCase().includes(term))
        ))
      }
    }, 150)
  }, [searchTerm, pazienti])

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          Lavoratori
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/pazienti/nuovo')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nuovo
          </button>
          <button
            onClick={() => exportToCSV('patients')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Esporta CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={loadPazienti}
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
          placeholder="Cerca per nome, CF, email, telefono..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <p className="text-xs text-gray-500">{filtered.length} lavorator{filtered.length === 1 ? 'e' : 'i'}</p>

      {/* Patients Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-card">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {pazienti.length === 0
              ? 'Nessun lavoratore scaricato. Scarica i dati dalla Dashboard.'
              : 'Nessun lavoratore corrisponde alla ricerca.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Lavoratore</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Codice Fiscale</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Contatti</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Azienda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p => (
                <tr key={p.id} onClick={() => navigate(`/pazienti/${p.id}`)} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-semibold shrink-0">
                        {p.firstName?.[0]}{p.lastName?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {p.lastName} {p.firstName}
                        </p>
                        {p.birthDate && (
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {new Date(p.birthDate).toLocaleDateString('it-IT')}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700 font-mono">{p.taxCode || '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="space-y-0.5">
                      {p.email && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-gray-400 shrink-0" />{p.email}
                        </p>
                      )}
                      {p.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400 shrink-0" />{p.phone}
                        </p>
                      )}
                      {!p.email && !p.phone && <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {p.companyName ? (
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />{p.companyName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
