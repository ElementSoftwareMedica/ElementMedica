import { useState, useEffect, useCallback } from 'react'
import {
    HandshakeIcon,
    Search,
    RefreshCw,
    Calendar,
    Building2,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    ChevronDown,
    Filter
} from 'lucide-react'

interface Convenzione {
    id: string
    codice: string | null
    nome: string
    tipo: string | null
    descrizione: string | null
    enteTerzo: string | null
    branchType: string | null
    dataInizio: string | null
    dataFine: string | null
    attiva: number
    isActive: number
    condizioni: string | null
}

const TIPO_LABELS: Record<string, string> = {
    PUBBLICA: 'Pubblica',
    PRIVATA: 'Privata',
    MUTUALIST: 'Mutualistica',
    ASSICURATIVA: 'Assicurativa',
    AZIENDALE: 'Aziendale',
    ISTITUZIONALE: 'Istituzionale'
}

const BRANCH_LABELS: Record<string, { label: string; color: string }> = {
    MEDICA: { label: 'Clinica', color: 'bg-teal-100 text-teal-700' },
    SICUREZZA: { label: 'Formazione', color: 'bg-blue-100 text-blue-700' },
    MANAGEMENT: { label: 'Management', color: 'bg-violet-100 text-violet-700' }
}

function formatDate(iso: string | null): string {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
        return iso
    }
}

function isExpired(dataFine: string | null): boolean {
    if (!dataFine) return false
    return new Date(dataFine) < new Date()
}

type FilterType = 'tutte' | 'attive' | 'scadute'

export function ConvenzioniPage(): JSX.Element {
    const [convenzioni, setConvenzioni] = useState<Convenzione[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState<FilterType>('attive')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            if (!window.desktopApi) return
            const rows = await window.desktopApi.db.query({
                table: 'convenzioni',
                where: { _isDeleted: 0 },
                orderBy: { column: 'nome', direction: 'ASC' }
            }) as Convenzione[]
            setConvenzioni(rows)
        } catch {
            // DB not ready
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filtered = convenzioni.filter(c => {
        const active = c.attiva === 1 || c.isActive === 1
        const expired = isExpired(c.dataFine)

        if (filterType === 'attive' && (!active || expired)) return false
        if (filterType === 'scadute' && !expired) return false

        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return [c.nome, c.codice, c.tipo, c.enteTerzo, c.descrizione].some(f => f?.toLowerCase().includes(term))
    })

    const attivaCount = convenzioni.filter(c => (c.attiva === 1 || c.isActive === 1) && !isExpired(c.dataFine)).length
    const scaduteCount = convenzioni.filter(c => isExpired(c.dataFine)).length

    return (
        <div className="max-w-5xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
                    <HandshakeIcon className="w-5 h-5 text-teal-600" />
                    Convenzioni
                </h1>
                <button
                    onClick={loadData}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500"
                    title="Aggiorna"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Totale convenzioni</div>
                    <div className="text-2xl font-bold text-gray-900 font-mono">{convenzioni.length}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Attive</div>
                    <div className="text-2xl font-bold text-teal-600 font-mono">{attivaCount}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Scadute</div>
                    <div className="text-2xl font-bold text-red-500 font-mono">{scaduteCount}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cerca per nome, codice, ente..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                    <Filter className="w-3.5 h-3.5 text-gray-500 ml-1" />
                    {(['tutte', 'attive', 'scadute'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterType(f)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filterType === f ? 'bg-white shadow-sm text-teal-700' : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12 text-gray-500 text-sm">Caricamento...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                        {convenzioni.length === 0
                            ? 'Nessuna convenzione presente. Esegui una sincronizzazione.'
                            : 'Nessuna convenzione corrisponde ai filtri.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(conv => {
                        const active = (conv.attiva === 1 || conv.isActive === 1) && !isExpired(conv.dataFine)
                        const expired = isExpired(conv.dataFine)
                        const isExpanded = expandedId === conv.id
                        const branch = BRANCH_LABELS[conv.branchType || 'MEDICA'] || BRANCH_LABELS.MEDICA

                        return (
                            <div
                                key={conv.id}
                                className={`bg-white rounded-lg border transition-colors ${active ? 'border-gray-200' : 'border-gray-100 opacity-70'
                                    }`}
                            >
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg text-left"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="mt-0.5">
                                            {active
                                                ? <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                                : <AlertCircle className={`w-4 h-4 flex-shrink-0 ${expired ? 'text-red-400' : 'text-gray-400'}`} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-gray-900 text-sm">{conv.nome}</span>
                                                {conv.codice && (
                                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">{conv.codice}</span>
                                                )}
                                                <span className={`px-1.5 py-0.5 text-xs rounded ${branch.color}`}>{branch.label}</span>
                                                {conv.tipo && (
                                                    <span className="text-xs text-gray-400">{TIPO_LABELS[conv.tipo] || conv.tipo}</span>
                                                )}
                                                {expired && (
                                                    <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-xs rounded">Scaduta</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                {conv.enteTerzo && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {conv.enteTerzo}
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(conv.dataInizio)} – {conv.dataFine ? formatDate(conv.dataFine) : 'Indeterminato'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {isExpanded
                                        ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-4 space-y-3 text-sm text-gray-600">
                                        {conv.descrizione && (
                                            <p className="italic text-gray-500">{conv.descrizione}</p>
                                        )}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Decorrenza</span>
                                                <span>{formatDate(conv.dataInizio)}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Scadenza</span>
                                                <span className={expired ? 'text-red-500' : ''}>
                                                    {conv.dataFine ? formatDate(conv.dataFine) : 'Nessuna scadenza'}
                                                </span>
                                            </div>
                                            {conv.tipo && (
                                                <div>
                                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Tipo</span>
                                                    <span>{TIPO_LABELS[conv.tipo] || conv.tipo}</span>
                                                </div>
                                            )}
                                            {conv.enteTerzo && (
                                                <div>
                                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Ente / Organo</span>
                                                    <span>{conv.enteTerzo}</span>
                                                </div>
                                            )}
                                        </div>
                                        {conv.condizioni && conv.condizioni !== '{}' && (
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Condizioni</span>
                                                <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-32 text-gray-600">
                                                    {JSON.stringify(JSON.parse(conv.condizioni), null, 2)}
                                                </pre>
                                            </div>
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
