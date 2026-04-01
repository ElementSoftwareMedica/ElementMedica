/**
 * SpeseRicevutePage - P98
 *
 * Pagina per visualizzare le fatture passive (spese intestate all'azienda)
 * ricevute via AcubeAPI (SDI type=1).
 * Mostra sia le spese ricevute dai fornitori che le fatture emesse dall'ente
 * selezionato.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
    ArrowDownCircle, ArrowUpCircle, Building2, RefreshCw,
    Search, Filter, X, Calendar, Euro, FileText, ExternalLink,
    ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock,
    Download
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { apiGet } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';
import { useTenantFilter } from '../../../context/TenantFilterContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EnteEmittente {
    id: string;
    denominazione: string;
    tipo: string;
    piva?: string;
    codiceFiscale: string;
    isDefault: boolean;
}

interface AcubeParty {
    business_name?: string;
    business_vat_number_code?: string;
    business_fiscal_code?: string;
}

interface AcubeInvoice {
    uuid: string;
    type: number; // 0=emessa, 1=ricevuta
    created_at: string;
    invoice_date?: string;
    invoice_number?: string;
    document_type?: string;
    marking?: string;
    sender?: AcubeParty;
    recipient?: AcubeParty;
    signed?: boolean;
    legally_stored?: boolean;
    downloaded?: boolean;
    to_pa?: boolean;
    notice?: string;
}

type TabType = 'spese' | 'emesse';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MARKING_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
    WAITING: { label: 'In attesa SDI', dot: 'bg-yellow-400', text: 'text-yellow-700' },
    SENT: { label: 'Inviata SDI', dot: 'bg-blue-400', text: 'text-blue-700' },
    DELIVERED: { label: 'Consegnata', dot: 'bg-teal-500', text: 'text-teal-700' },
    NOT_DELIVERED: { label: 'Non consegnata', dot: 'bg-orange-500', text: 'text-orange-700' },
    REJECTED: { label: 'Rifiutata', dot: 'bg-red-500', text: 'text-red-700' },
    ACCEPTED: { label: 'Accettata', dot: 'bg-teal-500', text: 'text-teal-700' },
    REJECTED_BY_PA: { label: 'Rifiutata PA', dot: 'bg-red-500', text: 'text-red-700' },
};

function MarkingBadge({ marking }: { marking?: string }) {
    const cfg = marking ? (MARKING_CONFIG[marking] ?? { label: marking, dot: 'bg-gray-400', text: 'text-gray-600' }) : null;
    if (!cfg) return <span className="text-xs text-gray-400">—</span>;
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function DocTypeBadge({ docType }: { docType?: string }) {
    const map: Record<string, string> = {
        TD01: 'Fattura', TD04: 'Nota credito', TD05: 'Nota debito',
        TD02: 'Acconto', TD06: 'Parcella', TD16: 'Int. specifica',
        TD17: 'Int. acquisti', TD18: 'Acquisto intra UE', TD19: 'Acquisto beni',
    };
    const label = docType ? (map[docType] ?? docType) : '—';
    return <span className="text-xs text-gray-500">{label}</span>;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SpeseRicevutePage: React.FC = () => {
    const { showToast } = useToast();
    const { getTenantFilterParams, isReady } = useTenantFilter();

    const [enti, setEnti] = useState<EnteEmittente[]>([]);
    const [selectedEnteId, setSelectedEnteId] = useState<string | null>(null);
    const [tab, setTab] = useState<TabType>('spese');

    const [invoices, setInvoices] = useState<AcubeInvoice[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filtri
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [docType, setDocType] = useState('');

    // Load enti emittenti del tenant
    const loadEnti = useCallback(async () => {
        try {
            const data = await apiGet<{ data: EnteEmittente[] }>('/api/v1/billing/enti-emittenti');
            const list: EnteEmittente[] = data?.data ?? [];
            setEnti(list);
            // Preseleziona default o primo
            if (list.length > 0 && !selectedEnteId) {
                const def = list.find(e => e.isDefault) ?? list[0];
                setSelectedEnteId(def.id);
            }
        } catch (err) {
        }
    }, [selectedEnteId]);

    useEffect(() => {
        if (isReady) loadEnti();
    }, [isReady, loadEnti]);

    // Load fatture dal backend (che chiama AcubeAPI)
    const loadInvoices = useCallback(async () => {
        if (!selectedEnteId) return;
        setLoading(true);
        setError(null);
        try {
            const endpoint = tab === 'spese'
                ? `/api/v1/billing/enti-emittenti/${selectedEnteId}/spese-ricevute`
                : `/api/v1/billing/enti-emittenti/${selectedEnteId}/fatture-emesse`;

            const params = new URLSearchParams();
            params.set('page', String(page));
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);
            if (search) {
                if (tab === 'spese') params.set('sender', search);
                else params.set('recipient', search);
            }
            if (docType) params.set('document_type', docType);

            const data = await apiGet<{ data: AcubeInvoice[]; total: number }>(`${endpoint}?${params.toString()}`);
            setInvoices(data?.data ?? []);
            setTotal(data?.total ?? 0);
        } catch (err: unknown) {
            const msg = 'Errore caricamento';
            setError(msg);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    }, [selectedEnteId, tab, page, dateFrom, dateTo, search, docType]);

    useEffect(() => {
        if (selectedEnteId) loadInvoices();
    }, [loadInvoices]);

    const handleRefresh = () => {
        setPage(1);
        loadInvoices();
    };

    const resetFiltri = () => {
        setSearch('');
        setDateFrom('');
        setDateTo('');
        setDocType('');
        setPage(1);
    };

    const totalPages = Math.ceil(total / 20);
    const selectedEnte = enti.find(e => e.id === selectedEnteId);

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-6 p-4 sm:p-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Euro className="h-7 w-7 text-teal-600" />
                        Gestione Fatture AcubeAPI
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Visualizza fatture passive (spese aziendali) e fatture emesse tramite il Sistema di Interscambio
                    </p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading || !selectedEnteId}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Aggiorna
                </button>
            </div>

            {/* Selezione Ente + Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <select
                        value={selectedEnteId ?? ''}
                        onChange={e => { setSelectedEnteId(e.target.value); setPage(1); }}
                        className="flex-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    >
                        {enti.length === 0 && <option value="">Nessun ente configurato</option>}
                        {enti.map(e => (
                            <option key={e.id} value={e.id}>
                                {e.denominazione} {e.piva ? `(P.IVA ${e.piva})` : `(CF ${e.codiceFiscale})`}
                                {e.isDefault ? ' ★' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Tab switcher */}
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden flex-shrink-0">
                    <button
                        onClick={() => { setTab('spese'); setPage(1); }}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${tab === 'spese'
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <ArrowDownCircle className="h-4 w-4" />
                        Spese ricevute
                    </button>
                    <button
                        onClick={() => { setTab('emesse'); setPage(1); }}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${tab === 'emesse'
                            ? 'bg-teal-600 text-white'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <ArrowUpCircle className="h-4 w-4" />
                        Fatture emesse
                    </button>
                </div>
            </div>

            {/* No AcubeAPI configured warning */}
            {selectedEnte && !loading && error && error.includes('Credenziali') && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Credenziali AcubeAPI non configurate</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                            Configura le credenziali AcubeAPI per <strong>{selectedEnte.denominazione}</strong> nella pagina
                            {' '}<a href="/management/billing/enti-emittenti" className="underline">Enti Emittenti</a>.
                        </p>
                    </div>
                </div>
            )}

            {/* Filtri */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={tab === 'spese' ? 'Cerca fornitore (P.IVA/CF)...' : 'Cerca destinatario (P.IVA/CF)...'}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <DatePickerElegante
                        value={dateFrom}
                        onChange={(date) => setDateFrom(date ? date.toISOString().split('T')[0] : '')}
                        label="Data dal"
                    />
                    <DatePickerElegante
                        value={dateTo}
                        onChange={(date) => setDateTo(date ? date.toISOString().split('T')[0] : '')}
                        label="Data al"
                    />
                    <select
                        value={docType}
                        onChange={e => setDocType(e.target.value)}
                        className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="">Tutti i tipi</option>
                        <option value="TD01">TD01 - Fattura</option>
                        <option value="TD04">TD04 - Nota credito</option>
                        <option value="TD05">TD05 - Nota debito</option>
                        <option value="TD02">TD02 - Acconto</option>
                        <option value="TD06">TD06 - Parcella</option>
                    </select>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Filter className="h-4 w-4" />
                        Filtra
                    </button>
                    {(search || dateFrom || dateTo || docType) && (
                        <button
                            onClick={resetFiltri}
                            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <X className="h-4 w-4" />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Tabella */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Stats bar */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <FileText className="h-4 w-4" />
                        <span>
                            {loading ? 'Caricamento...' : (
                                tab === 'spese'
                                    ? `${total} spese ricevute`
                                    : `${total} fatture emesse`
                            )}
                        </span>
                    </div>
                    {total > 0 && (
                        <span className="text-xs text-gray-400">
                            Pagina {page} di {Math.max(1, totalPages)}
                        </span>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                    </div>
                )}

                {/* Error (non-credentials) */}
                {!loading && error && !error.includes('Credenziali') && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <AlertTriangle className="h-10 w-10 text-red-400" />
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        <button onClick={handleRefresh} className="text-xs text-teal-600 underline">Riprova</button>
                    </div>
                )}

                {/* No ente selezionato */}
                {!loading && !error && !selectedEnteId && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                        <Building2 className="h-10 w-10" />
                        <p className="text-sm">Seleziona un ente emittente per visualizzare i dati</p>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && selectedEnteId && invoices.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                        <FileText className="h-10 w-10" />
                        <p className="text-sm">
                            {tab === 'spese' ? 'Nessuna spesa ricevuta trovata' : 'Nessuna fattura emessa trovata'}
                        </p>
                    </div>
                )}

                {/* Table */}
                {!loading && !error && invoices.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {tab === 'spese' ? 'Fornitore' : 'Destinatario'}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Numero / Data</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo doc.</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stato SDI</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Archiviata</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                {invoices.map((inv) => {
                                    const party = tab === 'spese' ? inv.sender : inv.recipient;
                                    const partyName = party?.business_name ?? (party?.business_vat_number_code ?? party?.business_fiscal_code ?? '—');
                                    const partyId = party?.business_vat_number_code ?? party?.business_fiscal_code;
                                    const invoiceDate = inv.invoice_date ?? inv.created_at;

                                    return (
                                        <tr key={inv.uuid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{partyName}</p>
                                                {partyId && <p className="text-xs text-gray-500 dark:text-gray-400">{partyId}</p>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm text-gray-700 dark:text-gray-300">{inv.invoice_number ?? '—'}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {invoiceDate ? format(new Date(invoiceDate), 'd MMM yyyy', { locale: it }) : '—'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <DocTypeBadge docType={inv.document_type} />
                                                {inv.to_pa && (
                                                    <span className="ml-1 text-xs text-violet-600 font-medium">PA</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <MarkingBadge marking={inv.marking} />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {inv.legally_stored ? (
                                                    <span title="Conservata legalmente"><CheckCircle2 className="h-4 w-4 text-teal-500 mx-auto" /></span>
                                                ) : (
                                                    <span title="Non conservata"><Clock className="h-4 w-4 text-gray-300 mx-auto" /></span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <a
                                                    href={`https://it-sandbox.api.acubeapi.com/invoices/${inv.uuid}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Apri in AcubeAPI"
                                                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 underline"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Dettaglio
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Precedente
                        </button>
                        <span className="text-sm text-gray-500">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Successiva
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Info box */}
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4">
                <p className="text-sm text-teal-800 dark:text-teal-300 font-medium mb-1">
                    Come funziona
                </p>
                <p className="text-sm text-teal-700 dark:text-teal-400">
                    Le <strong>spese ricevute</strong> sono le fatture passive che il tuo ente ha ricevuto dai fornitori via SDI (type=1).
                    Le <strong>fatture emesse</strong> sono quelle inviate ai tuoi clienti (type=0).
                    I dati vengono recuperati in tempo reale da AcubeAPI utilizzando le credenziali configurate per l'ente selezionato.
                </p>
            </div>
        </div>
    );
};

export default SpeseRicevutePage;
