/**
 * FatturazioneElettronicaPage - P97
 *
 * Lista e gestione fatture elettroniche (SDI / AcubeAPI).
 * Statistiche, filtri per stato/periodo, azioni su bozze.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    FileText, Send, CheckCircle2, XCircle, Clock, AlertTriangle,
    Euro, TrendingUp, Plus, Eye, Trash2, RefreshCw, CreditCard,
    RotateCcw, Search, Filter, X, FileDown
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CRUDButton, CRUDPrimaryButton, CRUDDeleteButton } from '../../../components/ui';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { apiDownloadWithFilename } from '../../../services/api';
import {
    useFatturazione,
    FatturaElettronica,
    StatoFattura,
    AcubeInvoiceStatus
} from '../../../hooks/finance/useFatturazione';
import NuovaFatturaModal from './components/NuovaFatturaModal';

// ─── Badge helpers ────────────────────────────────────────────────────────────

const STATO_CONFIG: Record<StatoFattura, { label: string; color: string; icon: React.ReactNode }> = {
    BOZZA: { label: 'Bozza', color: 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300', icon: <Clock className="h-3 w-3" /> },
    EMESSA: { label: 'Emessa', color: 'text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300', icon: <Send className="h-3 w-3" /> },
    PAGATA: { label: 'Pagata', color: 'text-teal-700 bg-teal-100 dark:bg-teal-900/40 dark:text-teal-300', icon: <CheckCircle2 className="h-3 w-3" /> },
    ANNULLATA: { label: 'Annullata', color: 'text-red-700 bg-red-100 dark:bg-red-900/40 dark:text-red-300', icon: <XCircle className="h-3 w-3" /> },
    STORNATA: { label: 'Stornata', color: 'text-orange-700 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300', icon: <RotateCcw className="h-3 w-3" /> },
};

const SDI_CONFIG: Record<AcubeInvoiceStatus, { label: string; dot: string }> = {
    BOZZA: { label: '—', dot: 'bg-gray-400' },
    WAITING: { label: 'In attesa SDI', dot: 'bg-yellow-400' },
    SENT: { label: 'Inviata SDI', dot: 'bg-blue-400' },
    DELIVERED: { label: 'Consegnata', dot: 'bg-teal-500' },
    NOT_DELIVERED: { label: 'Non consegnata', dot: 'bg-orange-500' },
    REJECTED: { label: 'Rifiutata SDI', dot: 'bg-red-500' },
    CANCELLED: { label: 'Annullata SDI', dot: 'bg-gray-500' },
};

const StatoBadge: React.FC<{ stato: StatoFattura }> = ({ stato }) => {
    const cfg = STATO_CONFIG[stato] ?? STATO_CONFIG.BOZZA;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
};

const SdiBadge: React.FC<{ status: AcubeInvoiceStatus }> = ({ status }) => {
    const cfg = SDI_CONFIG[status] ?? SDI_CONFIG.BOZZA;
    if (status === 'BOZZA') return null;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    sub?: string;
}> = ({ label, value, icon, color, sub }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
            {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ─── Formattazione ────────────────────────────────────────────────────────────

const formatEuro = (v: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);

const formatDate = (d: string) =>
    format(new Date(d), 'd MMM yyyy', { locale: it });

// ─── Componente principale ───────────────────────────────────────────────────

const FatturazioneElettronicaPage: React.FC = () => {
    const { showToast } = useToast();
    const { confirm } = useConfirmDialog();

    const {
        fatture, stats, loading, loadingStats, error,
        pagination, fetchFatture, fetchStats,
        emettiFattura, segnaPagata, creaNotaCredito, stornaERifai, eliminaFattura
    } = useFatturazione();

    const [showNuovaFattura, setShowNuovaFattura] = useState(false);
    const [searchParams] = useSearchParams();
    const highlightedId = searchParams.get('id');
    const highlightedRef = useRef<HTMLTableRowElement | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStato, setFilterStato] = useState('');
    const [filterTipoDoc, setFilterTipoDoc] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadData = useCallback(() => {
        const params = {
            ...(searchTerm && { search: searchTerm }),
            ...(filterStato && { stato: filterStato }),
            ...(filterTipoDoc && { tipoDocumento: filterTipoDoc }),
            ...(filterFrom && { from: filterFrom }),
            ...(filterTo && { to: filterTo }),
            page: currentPage,
            limit: 50,
        };
        fetchFatture(params);
    }, [searchTerm, filterStato, filterTipoDoc, filterFrom, filterTo, currentPage, fetchFatture]);

    useEffect(() => {
        loadData();
        fetchStats();
    }, [loadData, fetchStats]);

    // Scroll to highlighted fattura when loaded from external link (?id=...)
    useEffect(() => {
        if (!highlightedId || loading) return;
        const el = highlightedRef.current;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [highlightedId, loading, fatture]);

    // ── Azioni ─────────────────────────────────────────────────────────────────

    const handleEmetti = async (fattura: FatturaElettronica) => {
        const ok = await confirm({
            title: `Emettere fattura ${fattura.numero}?`,
            message: `Questa azione invierà la fattura allo SDI tramite AcubeAPI. L'operazione non è reversibile.`,
            confirmLabel: 'Emetti',
        });
        if (!ok) return;

        setActionLoading(fattura.id);
        try {
            const result = await emettiFattura(fattura.id);
            showToast({ type: 'success', message: result.message });
            loadData();
            fetchStats();
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore invio SDI' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleScaricaPdf = async (fattura: FatturaElettronica) => {
        setActionLoading(fattura.id);
        try {
            const { blob, filename } = await apiDownloadWithFilename(`/api/v1/billing/fatture/${fattura.id}/pdf`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `fattura-${fattura.numero}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore download PDF fattura' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleSegnaPagata = async (fattura: FatturaElettronica) => {
        const ok = await confirm({
            title: `Segnare come pagata?`,
            message: `La fattura ${fattura.numero} da ${formatEuro(fattura.totale)} verrà segnata come pagata.`,
            confirmLabel: 'Segna pagata',
        });
        if (!ok) return;

        setActionLoading(fattura.id);
        try {
            await segnaPagata(fattura.id);
            showToast({ type: 'success', message: 'Fattura segnata come pagata' });
            loadData();
            fetchStats();
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleNotaCredito = async (fattura: FatturaElettronica) => {
        const ok = await confirm({
            title: `Creare nota di credito?`,
            message: `Verrà creata una nota di credito (TD04) come bozza per stornare la fattura ${fattura.numero}.`,
            confirmLabel: 'Crea nota di credito',
            variant: 'warning',
        });
        if (!ok) return;

        setActionLoading(fattura.id);
        try {
            const nc = await creaNotaCredito(fattura.id);
            showToast({ type: 'success', message: `Nota di credito ${nc.numero} creata come bozza` });
            loadData();
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore creazione nota di credito' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleStornaERifai = async (fattura: FatturaElettronica) => {
        const ok = await confirm({
            title: `Stornare e rifare ${fattura.numero}?`,
            message: `La fattura verrà stornata con nota di credito e i movimenti torneranno disponibili per creare una nuova fattura corretta.`,
            confirmLabel: 'Storna e rifai',
            variant: 'warning',
        });
        if (!ok) return;

        setActionLoading(fattura.id);
        try {
            await stornaERifai(fattura.id, 'Storno e rifacimento da pagina fatture');
            showToast({ type: 'success', message: 'Fattura stornata. Puoi crearne una nuova corretta.' });
            loadData();
            fetchStats();
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore nello storno della fattura' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleElimina = async (fattura: FatturaElettronica) => {
        const ok = await confirm({
            title: `Eliminare bozza ${fattura.numero}?`,
            message: 'Questa azione è irreversibile. La bozza verrà eliminata.',
            confirmLabel: 'Elimina',
            variant: 'danger',
        });
        if (!ok) return;

        setActionLoading(fattura.id);
        try {
            await eliminaFattura(fattura.id, 'Eliminazione manuale bozza');
            showToast({ type: 'success', message: 'Bozza eliminata' });
            loadData();
            fetchStats();
        } catch (err: unknown) {
            showToast({ type: 'error', message: 'Errore eliminazione' });
        } finally {
            setActionLoading(null);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="h-7 w-7 text-teal-600" />
                            Fatturazione Elettronica
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Gestione fatture SDI tramite AcubeAPI
                        </p>
                    </div>
                    <CRUDPrimaryButton onClick={() => setShowNuovaFattura(true)}>
                        <Plus className="h-4 w-4" /> Nuova Fattura
                    </CRUDPrimaryButton>
                </div>

                {/* Stats */}
                {!loadingStats && stats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Emesse"
                            value={stats.contatori.emesse + stats.contatori.pagate}
                            icon={<Send className="h-5 w-5 text-blue-600" />}
                            color="bg-blue-50 dark:bg-blue-900/20"
                        />
                        <StatCard
                            label="Pagate"
                            value={stats.contatori.pagate}
                            icon={<CheckCircle2 className="h-5 w-5 text-teal-600" />}
                            color="bg-teal-50 dark:bg-teal-900/20"
                        />
                        <StatCard
                            label="Totale Emesso"
                            value={formatEuro(stats.totali.emesso)}
                            icon={<Euro className="h-5 w-5 text-violet-600" />}
                            color="bg-violet-50 dark:bg-violet-900/20"
                        />
                        <StatCard
                            label="Totale Incassato"
                            value={formatEuro(stats.totali.incassato)}
                            icon={<TrendingUp className="h-5 w-5 text-teal-600" />}
                            color="bg-teal-50 dark:bg-teal-900/20"
                            sub={`Bozze: ${stats.contatori.bozze}`}
                        />
                    </div>
                )}

                {/* Filtri */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex flex-wrap gap-3">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px] relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Cerca per numero, cliente, CF..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        {/* Stato */}
                        <select
                            value={filterStato}
                            onChange={e => setFilterStato(e.target.value)}
                            className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="">Tutti gli stati</option>
                            <option value="BOZZA">Bozza</option>
                            <option value="EMESSA">Emessa</option>
                            <option value="PAGATA">Pagata</option>
                            <option value="ANNULLATA">Annullata</option>
                            <option value="STORNATA">Stornata</option>
                        </select>

                        {/* Tipo documento */}
                        <select
                            value={filterTipoDoc}
                            onChange={e => setFilterTipoDoc(e.target.value)}
                            className="text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="">Tutti i tipi</option>
                            <option value="FATTURA">Fattura (TD01)</option>
                            <option value="ACCONTO">Acconto (TD02)</option>
                            <option value="NOTA_CREDITO">Nota credito (TD04)</option>
                            <option value="NOTA_DEBITO">Nota debito (TD05)</option>
                        </select>

                        {/* Date range */}
                        <DatePickerElegante
                            value={filterFrom}
                            onChange={(date) => setFilterFrom(date ? date.toISOString().split('T')[0] : '')}
                            label="Data da"
                        />
                        <DatePickerElegante
                            value={filterTo}
                            onChange={(date) => setFilterTo(date ? date.toISOString().split('T')[0] : '')}
                            label="Data a"
                        />

                        {/* Reset filtri */}
                        {(searchTerm || filterStato || filterTipoDoc || filterFrom || filterTo) && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterStato('');
                                    setFilterTipoDoc('');
                                    setFilterFrom('');
                                    setFilterTo('');
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1"
                            >
                                <X className="h-3.5 w-3.5" />
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Errore */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Tabella */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Numero</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Data</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tipo</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cliente</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Totale</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stato</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">SDI</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-gray-400 dark:text-gray-500">
                                            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                                            Caricamento...
                                        </td>
                                    </tr>
                                ) : fatture.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-gray-400 dark:text-gray-500">
                                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                            <p>Nessuna fattura trovata</p>
                                        </td>
                                    </tr>
                                ) : (
                                    fatture.map((fattura: FatturaElettronica) => {
                                        const isHighlighted = fattura.id === highlightedId;
                                        return (
                                            <tr
                                                key={fattura.id}
                                                ref={isHighlighted ? highlightedRef : undefined}
                                                className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors${isHighlighted ? ' ring-2 ring-inset ring-teal-400 bg-teal-50 dark:bg-teal-900/20' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <span className="font-mono font-semibold text-gray-900 dark:text-white text-sm">
                                                        {fattura.numero}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {formatDate(fattura.dataEmissione)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded font-mono">
                                                        {fattura.tipoDocumento === 'FATTURA' ? 'TD01' :
                                                            fattura.tipoDocumento === 'ACCONTO' ? 'TD02' :
                                                                fattura.tipoDocumento === 'NOTA_CREDITO' ? 'TD04' : 'TD05'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                                        {fattura.cessionarioDenominazione}
                                                    </div>
                                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                                        {fattura.cessionarioCF}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                                    {formatEuro(fattura.totale)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatoBadge stato={fattura.stato} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <SdiBadge status={fattura.acubeStatus} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* PDF (tutte le fatture: il PDF è generato dal documento) */}
                                                        <button
                                                            onClick={() => handleScaricaPdf(fattura)}
                                                            disabled={actionLoading === fattura.id}
                                                            title="Scarica PDF fattura"
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                                        >
                                                            <FileDown className="h-3 w-3" /> PDF
                                                        </button>
                                                        {/* Emetti (solo BOZZA) */}
                                                        {fattura.stato === 'BOZZA' && (
                                                            <button
                                                                onClick={() => handleEmetti(fattura)}
                                                                disabled={actionLoading === fattura.id}
                                                                title="Emetti fattura"
                                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 disabled:opacity-50 transition-colors"
                                                            >
                                                                <Send className="h-3 w-3" /> Emetti
                                                            </button>
                                                        )}
                                                        {/* Segna pagata (solo EMESSA) */}
                                                        {fattura.stato === 'EMESSA' && (
                                                            <button
                                                                onClick={() => handleSegnaPagata(fattura)}
                                                                disabled={actionLoading === fattura.id}
                                                                title="Segna come pagata"
                                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800/50 disabled:opacity-50 transition-colors"
                                                            >
                                                                <CreditCard className="h-3 w-3" /> Pagata
                                                            </button>
                                                        )}
                                                        {/* Nota credito (EMESSA o PAGATA) */}
                                                        {(fattura.stato === 'EMESSA' || fattura.stato === 'PAGATA') &&
                                                            fattura.tipoDocumento !== 'NOTA_CREDITO' && (
                                                                <button
                                                                    onClick={() => handleNotaCredito(fattura)}
                                                                    disabled={actionLoading === fattura.id}
                                                                    title="Crea nota di credito"
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/50 disabled:opacity-50 transition-colors"
                                                                >
                                                                    <RotateCcw className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                        {(fattura.stato === 'EMESSA' || fattura.stato === 'PAGATA') &&
                                                            fattura.tipoDocumento !== 'NOTA_CREDITO' && (
                                                                <button
                                                                    onClick={() => handleStornaERifai(fattura)}
                                                                    disabled={actionLoading === fattura.id}
                                                                    title="Storna e rifai"
                                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/50 disabled:opacity-50 transition-colors"
                                                                >
                                                                    <RefreshCw className="h-3 w-3" /> Rifai
                                                                </button>
                                                            )}
                                                        {/* Elimina (solo BOZZA) */}
                                                        {fattura.stato === 'BOZZA' && (
                                                            <button
                                                                onClick={() => handleElimina(fattura)}
                                                                disabled={actionLoading === fattura.id}
                                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50 disabled:opacity-50 transition-colors"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginazione */}
                    {pagination.pages > 1 && (
                        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                            <span>{pagination.total} risultati totali</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    ← Prec
                                </button>
                                <span className="px-3 py-1">
                                    {currentPage} / {pagination.pages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                                    disabled={currentPage === pagination.pages}
                                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Succ →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal nuova fattura */}
            {showNuovaFattura && (
                <NuovaFatturaModal
                    onClose={() => setShowNuovaFattura(false)}
                    onCreated={() => {
                        setShowNuovaFattura(false);
                        loadData();
                        fetchStats();
                    }}
                />
            )}
        </>
    );
};

export default FatturazioneElettronicaPage;
