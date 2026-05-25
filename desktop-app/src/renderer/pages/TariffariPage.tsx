import { useState, useEffect, useCallback } from 'react'
import {
    Receipt,
    Search,
    RefreshCw,
    ChevronRight,
    ChevronDown,
    Building2,
    Tag,
    Euro,
    Users,
    AlertCircle,
    CheckCircle,
    Filter
} from 'lucide-react'

interface VoceTariffario {
    id: string
    tipo: string
    prestazioneId: string | null
    nome: string | null
    descrizione: string | null
    prezzoBase: number
    ivaAliquota: number
    categoriaVisita: string | null
    compensoProfessionistaTipo: string | null
    compensoProfessionistaValore: number | null
    compensoProfessionistaMinimo: number | null
    compensoProfessionistaMassimo: number | null
    frequenza: string
    unitaCalcolo: string
    ordine: number
    attivo: boolean
}

interface CompanyAssociation {
    id: string
    companyTenantProfileId: string
    validoDa: string | null
    validoA: string | null
    attivo: boolean
}

interface Tariffario {
    id: string
    codice: string | null
    nome: string | null
    descrizione: string | null
    attivo: number
    validoDa: string | null
    validoA: string | null
    voci: string | null
    companyAssociations: string | null
}

interface CompanyRow {
    id: string
    ragioneSociale: string | null
}

interface PrestazioneRow {
    id: string
    nome: string | null
    codice: string | null
}

type ViewFilter = 'tutti' | 'aziendali' | 'globali'

function parseVoci(json: string | null): VoceTariffario[] {
    if (!json) return []
    try { return JSON.parse(json) } catch { return [] }
}

function parseAssociations(json: string | null): CompanyAssociation[] {
    if (!json) return []
    try { return JSON.parse(json) } catch { return [] }
}

function formatEuro(val: number | undefined | null): string {
    if (val == null) return '—'
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

const TIPO_VOCE_LABELS: Record<string, string> = {
    VISITA: 'Visita',
    ESAME: 'Esame',
    PRESTAZIONE: 'Prestazione',
    SOPRALLUOGO: 'Sopralluogo',
    DOCUMENTO: 'Documento',
    ALTRO: 'Altro'
}

const CATEGORIA_VISITA_LABELS: Record<string, string> = {
    PREVENTIVA: 'Preventiva',
    PERIODICA: 'Periodica',
    RIPRESA_LAVORO: 'Ripresa lavoro',
    CAMBIO_MANSIONE: 'Cambio mansione',
    RICHIESTA_LAVORATORE: 'Richiesta lavoratore',
    PRE_ASSUNTIVA: 'Pre-assuntiva',
    STRAORDINARIA: 'Straordinaria',
    CESSAZIONE: 'Cessazione'
}

export function TariffariPage(): JSX.Element {
    const [tariffari, setTariffari] = useState<Tariffario[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [viewFilter, setViewFilter] = useState<ViewFilter>('tutti')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [companyMap, setCompanyMap] = useState<Record<string, string>>({})
    const [prestazioneMap, setPrestazioneMap] = useState<Record<string, string>>({})

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            if (!window.desktopApi) return

            const rows = await window.desktopApi.db.query({
                table: 'tariffari',
                where: { _isDeleted: 0 }
            }) as Tariffario[]
            setTariffari(rows)

            // Build company map
            const companyRows = await window.desktopApi.db.query({
                table: 'companies',
                where: { _isDeleted: 0 }
            }) as CompanyRow[]
            const cmap: Record<string, string> = {}
            for (const c of companyRows) {
                cmap[c.id] = c.ragioneSociale || c.id
            }
            setCompanyMap(cmap)

            // Build prestazione map
            const presRows = await window.desktopApi.db.query({
                table: 'prestazioni',
                where: { _isDeleted: 0 }
            }) as PrestazioneRow[]
            const pmap: Record<string, string> = {}
            for (const p of presRows) {
                pmap[p.id] = p.nome ? `${p.codice ? `[${p.codice}] ` : ''}${p.nome}` : p.id
            }
            setPrestazioneMap(pmap)
        } catch {
            // DB not ready
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const filtered = tariffari.filter(t => {
        const associations = parseAssociations(t.companyAssociations)
        if (viewFilter === 'aziendali' && associations.length === 0) return false
        if (viewFilter === 'globali' && associations.length > 0) return false

        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return [t.nome, t.codice, t.descrizione].some(f => f?.toLowerCase().includes(term))
    })

    const totalVoci = tariffari.reduce((sum, t) => sum + parseVoci(t.voci).length, 0)
    const activeCount = tariffari.filter(t => t.attivo === 1).length

    return (
        <div className="max-w-5xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-teal-600" />
                    Tariffari Aziendali
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
                    <div className="text-xs text-gray-500">Totale tariffari</div>
                    <div className="text-2xl font-bold text-gray-900 font-mono">{tariffari.length}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Attivi</div>
                    <div className="text-2xl font-bold text-teal-600 font-mono">{activeCount}</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500">Voci totali</div>
                    <div className="text-2xl font-bold text-blue-600 font-mono">{totalVoci}</div>
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
                <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                    <Filter className="w-3.5 h-3.5 text-gray-500 ml-1" />
                    {(['tutti', 'aziendali', 'globali'] as ViewFilter[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setViewFilter(f)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${viewFilter === f
                                ? 'bg-white shadow-sm text-teal-700'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            {f === 'tutti' ? 'Tutti' : f === 'aziendali' ? 'Per azienda' : 'Globali'}
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
                        {tariffari.length === 0
                            ? 'Nessun tariffario presente. Esegui una sincronizzazione.'
                            : 'Nessun tariffario corrisponde ai filtri.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(tariffario => {
                        const voci = parseVoci(tariffario.voci)
                        const associations = parseAssociations(tariffario.companyAssociations)
                        const isExpanded = expandedId === tariffario.id
                        const isActive = tariffario.attivo === 1

                        return (
                            <div
                                key={tariffario.id}
                                className={`bg-white rounded-lg border transition-colors ${isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'
                                    }`}
                            >
                                {/* Card header */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : tariffario.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg text-left"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="mt-0.5">
                                            {isActive
                                                ? <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                                                : <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900 text-sm">
                                                    {tariffario.nome || 'Tariffario senza nome'}
                                                </span>
                                                {tariffario.codice && (
                                                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">
                                                        {tariffario.codice}
                                                    </span>
                                                )}
                                            </div>
                                            {tariffario.descrizione && (
                                                <p className="text-xs text-gray-500 mt-0.5 truncate">{tariffario.descrizione}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-blue-600 flex items-center gap-1">
                                                    <Tag className="w-3 h-3" />
                                                    {voci.length} voc{voci.length === 1 ? 'e' : 'i'}
                                                </span>
                                                {associations.length > 0 ? (
                                                    <span className="text-xs text-violet-600 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {associations.length} aziend{associations.length === 1 ? 'a' : 'e'}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Tariffario globale</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {isExpanded
                                        ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                </button>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-4 space-y-4">
                                        {/* Company associations */}
                                        {associations.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                    Aziende associate
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {associations.map(a => (
                                                        <div
                                                            key={a.id}
                                                            className="flex items-center gap-1.5 px-2 py-1 bg-violet-50 border border-violet-200 rounded-md text-xs"
                                                        >
                                                            <Building2 className="w-3 h-3 text-violet-500" />
                                                            <span className="text-violet-800">
                                                                {companyMap[a.companyTenantProfileId] || a.companyTenantProfileId}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Voci tariffario */}
                                        {voci.length > 0 ? (
                                            <div>
                                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                    Voci tariffario ({voci.length})
                                                </h3>
                                                <div className="divide-y divide-gray-100 rounded-md border border-gray-100 overflow-hidden">
                                                    {voci.map((voce, idx) => (
                                                        <div key={voce.id || idx} className="flex items-start justify-between p-3 text-sm hover:bg-gray-50">
                                                            <div className="min-w-0 flex-1 pr-4">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-medium text-gray-800">
                                                                        {voce.nome ||
                                                                            (voce.prestazioneId ? prestazioneMap[voce.prestazioneId] : null) ||
                                                                            'Voce senza nome'}
                                                                    </span>
                                                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                                                                        {TIPO_VOCE_LABELS[voce.tipo] || voce.tipo}
                                                                    </span>
                                                                    {voce.categoriaVisita && (
                                                                        <span className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-xs rounded">
                                                                            {CATEGORIA_VISITA_LABELS[voce.categoriaVisita] || voce.categoriaVisita}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {voce.descrizione && (
                                                                    <p className="text-xs text-gray-400 mt-0.5 truncate">{voce.descrizione}</p>
                                                                )}
                                                                {voce.prestazioneId && voce.nome && (
                                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                                        Prestazione: {prestazioneMap[voce.prestazioneId] || voce.prestazioneId}
                                                                    </p>
                                                                )}
                                                                {voce.compensoProfessionistaTipo && voce.compensoProfessionistaValore != null && (
                                                                    <p className="text-xs text-orange-600 mt-0.5 flex items-center gap-1">
                                                                        <Users className="w-3 h-3" />
                                                                        Compenso medico: {formatEuro(voce.compensoProfessionistaValore)} ({voce.compensoProfessionistaTipo})
                                                                        {voce.compensoProfessionistaMinimo != null && voce.compensoProfessionistaMassimo != null && (
                                                                            <span className="text-gray-400">
                                                                                (min {formatEuro(voce.compensoProfessionistaMinimo)} – max {formatEuro(voce.compensoProfessionistaMassimo)})
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <div className="font-semibold text-gray-900 font-mono text-sm flex items-center gap-0.5">
                                                                    <Euro className="w-3 h-3 text-gray-400" />
                                                                    {formatEuro(voce.prezzoBase).replace('€', '').trim()}
                                                                </div>
                                                                <div className="text-xs text-gray-400">IVA {voce.ivaAliquota}%</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">Nessuna voce in questo tariffario.</p>
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
