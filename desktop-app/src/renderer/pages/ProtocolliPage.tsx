import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Search,
  RefreshCw,
  Stethoscope,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { formatProtocolloPeriodicity, normalizeProtocolloPrestazioni, type ProtocolloPrestazioneRow } from '../utils/protocolloSanitario'

interface Protocollo {
  id: string
  _serverId: string | null
  nome: string | null
  descrizione: string | null
  mansioneNome: string | null
  mansioneId: string | null
  isActive: number
}

export function ProtocolliPage(): JSX.Element {
  const [protocolli, setProtocolli] = useState<Protocollo[]>([])
  const [prestazioniByProtocollo, setPrestazioniByProtocollo] = useState<Map<string, ProtocolloPrestazioneRow[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadProtocolli = useCallback(async () => {
    setLoading(true)
    try {
      if (!window.desktopApi) return
      const rows = await window.desktopApi.db.query({
        table: 'protocolli',
        where: { _isDeleted: 0 },
        orderBy: { column: 'nome', direction: 'ASC' }
      }) as Protocollo[]
      const prestazioniRows = await window.desktopApi.db.query({
        table: 'protocollo_prestazioni',
        where: { _isDeleted: 0 }
      }).catch(() => []) as Array<ProtocolloPrestazioneRow & { protocolloId: string }>
      const grouped = new Map<string, ProtocolloPrestazioneRow[]>()
      for (const row of prestazioniRows) {
        const list = grouped.get(row.protocolloId) || []
        list.push(row)
        grouped.set(row.protocolloId, list)
      }
      setProtocolli(rows)
      setPrestazioniByProtocollo(grouped)
    } catch {
      // DB not ready
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProtocolli() }, [loadProtocolli])

  const filtered = protocolli.filter(p => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return [p.nome, p.descrizione, p.mansioneNome].some(f => f?.toLowerCase().includes(term))
  })

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
          <FileText className="w-5 h-5 text-teal-600" />
          Protocolli Sanitari
        </h1>
        <button
          onClick={loadProtocolli}
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
          placeholder="Cerca per nome protocollo, mansione..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <p className="text-xs text-gray-500">{filtered.length} protocoll{filtered.length === 1 ? 'o' : 'i'}</p>

      {/* Protocolli List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-card">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {protocolli.length === 0
              ? 'Nessun protocollo scaricato. Scarica i dati dalla Dashboard.'
              : 'Nessun protocollo corrisponde alla ricerca.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const prestazioni = normalizeProtocolloPrestazioni(prestazioniByProtocollo.get(p.id) || [])
            const isExpanded = expandedId === p.id

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-card hover:shadow-card-hover transition-all overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.nome || 'Protocollo senza nome'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {p.mansioneNome ? (
                        <span className="text-xs text-gray-500">Mansione: {p.mansioneNome}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Nessuna mansione</span>
                      )}
                      {prestazioni.length > 0 && (
                        <span className="text-xs text-gray-400">{prestazioni.length} prestazioni</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!p.isActive && (
                      <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Inattivo</span>
                    )}
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Expanded: prestazioni list */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/30 px-4 pb-3 pt-2">
                    {p.descrizione && (
                      <p className="text-xs text-gray-500 mb-3 italic">{p.descrizione}</p>
                    )}
                    {prestazioni.length > 0 ? (
                      <>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Prestazioni</p>
                        <div className="space-y-1.5">
                          {prestazioni.map((prest, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <Stethoscope className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="text-gray-700 flex-1">{prest.prestazioneNome}</span>
                              <span className="text-gray-400 shrink-0">{formatProtocolloPeriodicity(prest.periodicitaMesi)}</span>
                              {prest.obbligatoria && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">Obbl.</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Nessuna prestazione associata
                      </p>
                    )}
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
