import { useState, useEffect, useCallback } from 'react'
import {
  Briefcase,
  Search,
  RefreshCw,
  AlertTriangle,
  Shield,
  ChevronRight
} from 'lucide-react'

interface Mansione {
  id: string
  _serverId: string | null
  nome: string | null
  descrizione: string | null
  codice: string | null
  companyName: string | null
  isActive: number
  rischi: string | null // JSON string of associated risks
}

interface RischioMansione {
  nome: string
  livello: string
  note: string | null
}

const LIVELLO_COLORS: Record<string, { bg: string; text: string }> = {
  ALTO: { bg: 'bg-red-50', text: 'text-red-700' },
  MEDIO: { bg: 'bg-orange-50', text: 'text-orange-700' },
  BASSO: { bg: 'bg-green-50', text: 'text-green-700' },
  NON_RILEVANTE: { bg: 'bg-gray-50', text: 'text-gray-500' }
}

export function MansioniPage(): JSX.Element {
  const [mansioni, setMansioni] = useState<Mansione[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadMansioni = useCallback(async () => {
    setLoading(true)
    try {
      if (!window.desktopApi) return
      const rows = await window.desktopApi.db.query({
        table: 'mansioni',
        where: { _isDeleted: 0 },
        orderBy: { column: 'nome', direction: 'ASC' }
      }) as Mansione[]
      setMansioni(rows)
    } catch {
      // DB not ready
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMansioni() }, [loadMansioni])

  const filtered = mansioni.filter(m => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return [m.nome, m.codice, m.companyName, m.descrizione].some(f => f?.toLowerCase().includes(term))
  })

  function parseRischi(json: string | null): RischioMansione[] {
    if (!json) return []
    try { return JSON.parse(json) } catch { return [] }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-teal-600" />
          Mansioni
        </h1>
        <button
          onClick={loadMansioni}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Aggiorna
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per nome mansione, codice, azienda..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <p className="text-xs text-gray-500">{filtered.length} mansion{filtered.length === 1 ? 'e' : 'i'}</p>

      {/* Mansioni List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-card">
          <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {mansioni.length === 0
              ? 'Nessuna mansione scaricata. Scarica i dati dalla Dashboard.'
              : 'Nessuna mansione corrisponde alla ricerca.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            const rischi = parseRischi(m.rischi)
            const isExpanded = expandedId === m.id

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-card hover:shadow-card-hover transition-all overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{m.nome || 'Mansione senza nome'}</p>
                      {m.codice && (
                        <span className="text-[10px] text-gray-400 font-mono shrink-0">{m.codice}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {m.companyName && (
                        <span className="text-xs text-gray-500">{m.companyName}</span>
                      )}
                      {rischi.length > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Shield className="w-3 h-3" />{rischi.length} rischi
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!m.isActive && (
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Inattiva</span>
                    )}
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Expanded: risks */}
                {isExpanded && rischi.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/30 px-4 pb-3 pt-2">
                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Rischi Associati</p>
                    <div className="space-y-1.5">
                      {rischi.map((r, i) => {
                        const level = LIVELLO_COLORS[r.livello] || LIVELLO_COLORS.NON_RILEVANTE
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <AlertTriangle className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="text-gray-700 flex-1">{r.nome}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${level.bg} ${level.text}`}>
                              {r.livello}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {isExpanded && rischi.length === 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/30 px-4 py-3">
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Nessun rischio associato
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
