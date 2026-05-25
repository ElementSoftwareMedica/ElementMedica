import { useState, useEffect, useCallback } from 'react'
import {
    Stethoscope,
    Search,
    RefreshCw,
    Euro,
    Clock,
    AlertCircle,
    Filter
} from 'lucide-react'
import { usePersistentPageState } from '../hooks/usePersistentPageState'

interface Prestazione {
    id: string
    codice: string | null
    nome: string | null
    tipo: string | null
    durataPrevista: number | null
    prezzoBase: number | null
    ivaAliquota: number | null
    prezzoPrimaVisita: number | null
    prezzoControllo: number | null
    scadenzaDefaultMesi: number | null
    branchType: string | null
    attivo: number
}

type TipoFilter = 'tutti' | string

const TIPO_LABELS: Record<string, string> = {
    VISITA_MDL: 'Visita MDL',
    ESAME_CLINICO: 'Esame clinico',
    ESAME_STRUMENTALE: 'Esame strumentale',
    ESAME_LABORATORIO: 'Esame laboratorio',
    SOPRALLUOGO: 'Sopralluogo',
    CONSULENZA: 'Consulenza',
    VACCINAZIONE: 'Vaccinazione',
    ALTRO: 'Altro'
}

function formatEuro(val: number | null | undefined): string {
    if (val == null) return '—'
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

function formatMesi(mesi: number | null): string {
    if (mesi == null) return '—'
    if (mesi >= 12 && mesi % 12 === 0) {
        const anni = mesi / 12
        return `${anni} ann${anni === 1 ? 'o' : 'i'}`
    }
    return `${mesi} mes${mesi === 1 ? 'e' : 'i'}`
}

export function PrestazioniPage(): JSX.Element {
    const [prestazioni, setPrestazioni] = useState<Prestazione[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = usePersistentPageState('prestazioni:searchTerm', '')
    const [tipoFilter, setTipoFilter] = usePersistentPageState<TipoFilter>('prestazioni:tipoFilter', 'tutti')

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            if (!window.desktopApi) return
            const rows = await window.desktopApi.db.query({
                table: 'prestazioni',
                where: { _isDeleted: 0 },
                orderBy: { column: 'nome', direction: 'ASC' }
            }) as Prestazione[]
            setPrestazioni(rows)
        } catch {
            // DB not ready
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    // Collect distinct tipi
    const tipiDisponibili = Array.from(new Set(prestazioni.map(p => p.tipo).filter(Boolean))) as string[]

    const filtered = prestazioni.filter(p => {
        if (tipoFilter !== 'tutti' && p.tipo !== tipoFilter) return false
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return [p.nome, p.codice, p.tipo].some(f => f?.toLowerCase().includes(term))
    })

    const avgPrice = prestazioni.reduce((sum, p, _, arr) => {
        if (p.prezzoBase == null) return sum
        return sum + p.prezzoBase / arr.filter(x => x.prezzoBase != null).length
    }, 0)

    return (
        <div className="max-w-5xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-teal-600" />
                    Catalogo Prestazioni
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
                    <div className="text-xs text-gray-500">Totale prestazioni</div>
                    <div className="text-2xl font-bold text-gray-900 font-mono">{prestazioni.length}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Tipi distinti</div>
                    <div className="text-2xl font-bold text-teal-600 font-mono">{tipiDisponibili.length}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Prezzo medio</div>
                    <div className="text-2xl font-bold text-blue-600 font-mono text-lg">
                        {prestazioni.some(p => p.prezzoBase != null) ? formatEuro(avgPrice) : '—'}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cerca per nome o codice..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
                {tipiDisponibili.length > 0 && (
                    <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                        <Filter className="w-3.5 h-3.5 text-gray-500 ml-1" />
                        <button
                            onClick={() => setTipoFilter('tutti')}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${tipoFilter === 'tutti' ? 'bg-white shadow-sm text-teal-700' : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            Tutti
                        </button>
                        {tipiDisponibili.slice(0, 4).map(t => (
                            <button
                                key={t}
                                onClick={() => setTipoFilter(t)}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${tipoFilter === t ? 'bg-white shadow-sm text-teal-700' : 'text-gray-600 hover:text-gray-800'
                                    }`}
                            >
                                {TIPO_LABELS[t] || t}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-gray-500 text-sm">Caricamento...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                    <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                        {prestazioni.length === 0
                            ? 'Nessuna prestazione presente. Esegui una sincronizzazione.'
                            : 'Nessuna prestazione corrisponde ai filtri.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prestazione</th>
                                <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                                <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prezzo base</th>
                                <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prima visita</th>
                                <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Controllo</th>
                                <th className="text-center p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Durata</th>
                                <th className="text-center p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scadenza</th>
                                <th className="text-center p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IVA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3">
                                        <div className="font-medium text-gray-900">{p.nome || '—'}</div>
                                        {p.codice && (
                                            <div className="text-xs text-gray-400 font-mono">{p.codice}</div>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {p.tipo ? (
                                            <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full font-medium">
                                                {TIPO_LABELS[p.tipo] || p.tipo}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className="font-mono font-semibold text-gray-900">
                                            {formatEuro(p.prezzoBase)}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className="font-mono text-gray-600 text-xs">
                                            {p.prezzoPrimaVisita != null ? formatEuro(p.prezzoPrimaVisita) : <span className="text-gray-300">—</span>}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <span className="font-mono text-gray-600 text-xs">
                                            {p.prezzoControllo != null ? formatEuro(p.prezzoControllo) : <span className="text-gray-300">—</span>}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        {p.durataPrevista != null ? (
                                            <span className="text-xs text-gray-600 flex items-center justify-center gap-1">
                                                <Clock className="w-3 h-3 text-gray-400" />
                                                {p.durataPrevista} min
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        {p.scadenzaDefaultMesi != null ? (
                                            <span className="text-xs text-blue-600">{formatMesi(p.scadenzaDefaultMesi)}</span>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className="text-xs text-gray-500 flex items-center justify-center gap-0.5">
                                            <Euro className="w-3 h-3" />
                                            {p.ivaAliquota != null ? `${p.ivaAliquota}%` : '—'}
                                        </span>
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
