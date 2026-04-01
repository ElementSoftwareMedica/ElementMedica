/**
 * CompanyBillingCard
 *
 * Card fatturazione per la pagina dettaglio azienda (companies/:id).
 * Mostra tutti i MovimentoContabile ENTRATA associati all'azienda,
 * classificati per stato: Bozze | Da Fatturare | Fatturati | Pagati.
 *
 * Sostituisce il vecchio QuickFatturazioneTab (P97 sprint billing cleanup).
 *
 * @module components/companies/CompanyBillingCard
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    DollarSign,
    FileCheck,
    Clock,
    CheckCircle2,
    AlertCircle,
    Stethoscope,
    GraduationCap,
    Briefcase,
    FileText,
    User,
    Building2,
    Calendar,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Receipt,
    Shield,
    UserCheck,
    Repeat,
    Zap,
    Sparkles,
    Pencil,
    Trash2,
    CheckCheck,
    Link2,
    X,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDeleteWithPayload } from '../../services/api';
import { Button } from '../../design-system';
import { cn } from '../../design-system/utils';
import { useToast } from '../../hooks/useToast';
import { useTenantMode } from '../../contexts/TenantModeContext';

// ─── Types ──────────────────────────────────────────────────────────────────

type ComputedStatus = 'BOZZA' | 'DA_FATTURARE' | 'FATTURATO' | 'PAGATO';
type ActiveTab = 'DA_FATTURARE' | 'FATTURATO' | 'PAGATO' | 'BOZZA';

interface LinkedMovimento {
    id: string;
    importoNetto: number;
    importoLordo: number;
    aliquotaIva: number;
    stato: string;
    isEditable: boolean;
    personName: string | null;
}

interface BillingItem {
    id: string;
    tipo: string;
    sourceType: string;
    description: string;
    personName: string | null;
    siteName: string | null;
    dataEsecuzione: string;
    importoLordo: number;
    importoNetto: number;
    importoIva: number;
    aliquotaIva: number;
    stato: string;
    computedStatus: ComputedStatus;
    fatturaElettronicaId: string | null;
    fatturaNumero: string | null;
    dataFatturaEmissione: string | null;
    dataFatturazione: string | null;
    dataPagamento: string | null;
    note: string | null;
    // enriched fields
    isEditable: boolean;
    voceTariffarioNome: string | null;
    voceTariffarioFrequenza: string | null;
    voceTariffarioModalita: string | null;
    linkedMovimento: LinkedMovimento | null;
}

interface BillingSummaryBucket {
    count: number;
    total: number;
}

interface BillingSummary {
    bozza: BillingSummaryBucket;
    daFatturare: BillingSummaryBucket;
    fatturato: BillingSummaryBucket;
    pagato: BillingSummaryBucket;
    totale: BillingSummaryBucket;
}

interface BillingSummaryResponse {
    summary: BillingSummary;
    items: BillingItem[];
}

interface CompanyBillingCardProps {
    companyId: string;       // companyTenantProfileId
    companyName?: string;
    className?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SOURCE_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    VISITA_MDL: { label: 'Visita MDL', icon: Stethoscope, color: 'text-teal-600' },
    FORMAZIONE: { label: 'Formazione', icon: GraduationCap, color: 'text-blue-600' },
    SOPRALLUOGO: { label: 'Sopralluogo', icon: Briefcase, color: 'text-purple-600' },
    SOPRALLUOGO_MC: { label: 'Sopralluogo MC', icon: Briefcase, color: 'text-purple-600' },
    SOPRALLUOGO_RSPP: { label: 'Sopralluogo RSPP', icon: Shield, color: 'text-indigo-600' },
    NOMINA: { label: 'Nomina', icon: UserCheck, color: 'text-violet-600' },
    NOMINA_MC: { label: 'Nomina MC', icon: UserCheck, color: 'text-violet-600' },
    NOMINA_RSPP: { label: 'Nomina RSPP', icon: Shield, color: 'text-blue-700' },
    DVR: { label: 'DVR', icon: FileText, color: 'text-orange-600' },
    DVR_NUOVO: { label: 'Nuovo DVR', icon: FileText, color: 'text-orange-600' },
    DVR_AGGIORNAMENTO_CON_MODIFICHE: { label: 'Agg. DVR (con mod.)', icon: RefreshCw, color: 'text-amber-600' },
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: { label: 'Agg. DVR (senza mod.)', icon: RefreshCw, color: 'text-amber-500' },
    CONSULENZA: { label: 'Consulenza', icon: Briefcase, color: 'text-indigo-600' },
    SPESA_FISSA: { label: 'Spesa Fissa', icon: Repeat, color: 'text-emerald-600' },
    SPESA_RICORRENTE: { label: 'Spesa Ricorrente', icon: Zap, color: 'text-cyan-600' },
    CORSO_FORMAZIONE: { label: 'Corso Formazione', icon: GraduationCap, color: 'text-blue-600' },
};

const TAB_CONFIG: { id: ActiveTab; label: string; summaryKey: keyof BillingSummary; icon: React.ElementType; bg: string; text: string; border: string }[] = [
    {
        id: 'BOZZA',
        label: 'Bozze',
        summaryKey: 'bozza',
        icon: Clock,
        bg: 'bg-gray-50 dark:bg-gray-700/30',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-600',
    },
    {
        id: 'DA_FATTURARE',
        label: 'Da Fatturare',
        summaryKey: 'daFatturare',
        icon: AlertCircle,
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-700',
    },
    {
        id: 'FATTURATO',
        label: 'Fatturati',
        summaryKey: 'fatturato',
        icon: Receipt,
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-700',
    },
    {
        id: 'PAGATO',
        label: 'Pagati',
        summaryKey: 'pagato',
        icon: CheckCircle2,
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-700',
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatEuro = (n: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

const formatDate = (s: string | null | undefined) => {
    if (!s) return '-';
    return new Date(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Edit Price Modal ────────────────────────────────────────────────────────

interface EditPriceModalProps {
    item: BillingItem;
    onClose: () => void;
    onSuccess: () => void;
}

const EditPriceModal: React.FC<EditPriceModalProps> = ({ item, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();
    const operateHeaders = getOperateHeaders();
    const [loading, setLoading] = useState(false);
    const [netto, setNetto] = useState(String(item.importoNetto));
    const [iva, setIva] = useState(String(item.aliquotaIva));
    const [note, setNote] = useState(item.note ?? '');
    const [alsoUpdateLinked, setAlsoUpdateLinked] = useState(false);
    const [linkedNetto, setLinkedNetto] = useState(
        item.linkedMovimento ? String(item.linkedMovimento.importoNetto) : ''
    );

    const nettoNum = parseFloat(netto) || 0;
    const ivaNum = parseFloat(iva) || 0;
    const lordo = parseFloat((nettoNum * (1 + ivaNum / 100)).toFixed(2));

    const handleSave = async () => {
        if (nettoNum <= 0) {
            showToast({ message: 'Importo netto non valido', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await apiPatch(`/api/v1/movimenti-contabili/${item.id}/prezzo`, {
                importoNetto: nettoNum,
                importoLordo: lordo,
                aliquotaIva: ivaNum,
                note: note || null,
                alsoUpdateLinked,
                ...(alsoUpdateLinked && item.linkedMovimento ? {
                    linkedImportoNetto: parseFloat(linkedNetto) || 0,
                    linkedImportoLordo: parseFloat(((parseFloat(linkedNetto) || 0) * (1 + ivaNum / 100)).toFixed(2)),
                } : {}),
            }, { headers: operateHeaders });
            showToast({ message: 'Prezzi aggiornati con successo', type: 'success' });
            onSuccess();
        } catch {
            showToast({ message: 'Errore nell\'aggiornamento del prezzo', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-teal-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Modifica Prezzo</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Importo Netto (€)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={netto}
                                onChange={e => setNetto(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">IVA (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={iva}
                                onChange={e => setIva(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end text-sm text-gray-500 dark:text-gray-400">
                        <span>Lordo calcolato: <strong className="text-gray-800 dark:text-gray-200">{formatEuro(lordo)}</strong></span>
                    </div>
                    {/* Note */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                        <textarea
                            rows={2}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Note opzionali..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                        />
                    </div>
                    {/* Linked movement (compenso professionista) */}
                    {item.linkedMovimento && item.linkedMovimento.isEditable && (
                        <div className="rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={alsoUpdateLinked}
                                    onChange={e => setAlsoUpdateLinked(e.target.checked)}
                                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="flex items-center gap-1.5 text-sm text-blue-700 dark:text-blue-300 font-medium">
                                    <Link2 className="h-3.5 w-3.5" />
                                    Aggiorna anche compenso professionista
                                    {item.linkedMovimento.personName && (
                                        <span className="font-normal text-blue-500">({item.linkedMovimento.personName})</span>
                                    )}
                                </span>
                            </label>
                            {alsoUpdateLinked && (
                                <div>
                                    <label className="block text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                        Compenso Netto (€) — attuale: {formatEuro(item.linkedMovimento.importoNetto)}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={linkedNetto}
                                        onChange={e => setLinkedNetto(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        Salva
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Delete Modal ────────────────────────────────────────────────────────────

interface DeleteModalProps {
    item: BillingItem;
    onClose: () => void;
    onSuccess: () => void;
}

const DeleteMovimentoModal: React.FC<DeleteModalProps> = ({ item, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();
    const operateHeaders = getOperateHeaders();
    const [loading, setLoading] = useState(false);
    const [reason, setReason] = useState('');

    const handleDelete = async () => {
        if (reason.trim().length < 10) {
            showToast({ message: 'Motivo eliminazione: minimo 10 caratteri (GDPR)', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await apiDeleteWithPayload(`/api/v1/movimenti-contabili/${item.id}`, {
                deletionReason: reason.trim(),
            }, { headers: operateHeaders });
            showToast({ message: 'Movimento eliminato', type: 'success' });
            onSuccess();
        } catch {
            showToast({ message: 'Errore nell\'eliminazione del movimento', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4 text-red-600" />
                        <h3 className="font-semibold text-red-800 dark:text-red-300">Elimina Movimento</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition-colors">
                        <X className="h-4 w-4 text-red-500" />
                    </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Stai per eliminare <strong className="text-gray-900 dark:text-gray-100">{item.description}</strong> ({formatEuro(item.importoLordo)}).
                        Questa operazione è irreversibile.
                    </p>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Motivo eliminazione <span className="text-red-500">*</span> <span className="font-normal text-gray-400">(min. 10 caratteri — GDPR)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Descrivi il motivo dell'eliminazione..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                        />
                        <p className={cn(
                            'text-xs mt-0.5',
                            reason.trim().length < 10 ? 'text-red-400' : 'text-emerald-500'
                        )}>
                            {reason.trim().length}/10 caratteri minimi
                        </p>
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={loading || reason.trim().length < 10}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        Elimina
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Item Row ────────────────────────────────────────────────────────────────

const ItemRow: React.FC<{
    item: BillingItem;
    expanded: boolean;
    onToggle: () => void;
    onRefetch: () => void;
}> = ({ item, expanded, onToggle, onRefetch }) => {
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();
    const operateHeaders = getOperateHeaders();
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const src = SOURCE_TYPE_CONFIG[item.sourceType] || { label: item.tipo, icon: FileText, color: 'text-gray-600' };
    const Icon = src.icon;

    const handleConfirm = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirming(true);
        try {
            await apiPatch(`/api/v1/movimenti-contabili/${item.id}/stato`, { stato: 'DA_FATTURARE' }, { headers: operateHeaders });
            showToast({ message: 'Movimento confermato', type: 'success' });
            onRefetch();
        } catch {
            showToast({ message: 'Errore nella conferma del movimento', type: 'error' });
        } finally {
            setConfirming(false);
        }
    };

    return (
        <>
            {showEditModal && (
                <EditPriceModal
                    item={item}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={() => { setShowEditModal(false); onRefetch(); }}
                />
            )}
            {showDeleteModal && (
                <DeleteMovimentoModal
                    item={item}
                    onClose={() => setShowDeleteModal(false)}
                    onSuccess={() => { setShowDeleteModal(false); onRefetch(); }}
                />
            )}
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={onToggle}
                >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', src.color)} />
                    <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.description}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />{formatDate(item.dataEsecuzione)}
                            {item.personName && (
                                <><span>·</span><User className="h-3 w-3" />{item.personName}</>
                            )}
                            {item.siteName && (
                                <><span>·</span><Building2 className="h-3 w-3" />{item.siteName}</>
                            )}
                            {item.voceTariffarioNome && (
                                <><span>·</span><Repeat className="h-3 w-3" /><span className="text-teal-600 dark:text-teal-400">{item.voceTariffarioNome}</span></>
                            )}
                        </span>
                    </span>
                    <div className="flex-shrink-0 text-right">
                        <span className="block font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {formatEuro(item.importoLordo)}
                        </span>
                        {item.aliquotaIva > 0 && (
                            <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {formatEuro(item.importoNetto)} + IVA {item.aliquotaIva}%
                            </span>
                        )}
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                </button>

                {expanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50/60 dark:bg-gray-700/30 space-y-3">
                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Netto</span>
                                <p className="text-gray-800 dark:text-gray-200 font-medium">{formatEuro(item.importoNetto)}</p>
                            </div>
                            {item.aliquotaIva > 0 ? (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">IVA {item.aliquotaIva}%</span>
                                    <p className="text-gray-800 dark:text-gray-200 font-medium">{formatEuro(item.importoIva)}</p>
                                </div>
                            ) : (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">IVA</span>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs italic">Esente</p>
                                </div>
                            )}
                            {item.voceTariffarioFrequenza && (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Frequenza</span>
                                    <p className="text-gray-800 dark:text-gray-200">{item.voceTariffarioFrequenza}</p>
                                </div>
                            )}
                            {item.fatturaNumero && (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">N° Fattura</span>
                                    <p className="text-gray-800 dark:text-gray-200 font-medium font-mono">{item.fatturaNumero}</p>
                                </div>
                            )}
                            {(item.dataFatturaEmissione || item.dataFatturazione) && (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Data Fattura</span>
                                    <p className="text-gray-800 dark:text-gray-200">{formatDate(item.dataFatturaEmissione || item.dataFatturazione)}</p>
                                </div>
                            )}
                            {item.dataPagamento && (
                                <div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Data Pagamento</span>
                                    <p className="text-gray-800 dark:text-gray-200">{formatDate(item.dataPagamento)}</p>
                                </div>
                            )}
                            {item.note && (
                                <div className="col-span-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Note</span>
                                    <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">{item.note}</p>
                                </div>
                            )}
                        </div>

                        {/* Linked compenso */}
                        {item.linkedMovimento && (
                            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                                <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>
                                    Compenso professionista collegato{item.linkedMovimento.personName ? ` (${item.linkedMovimento.personName})` : ''}: <strong>{formatEuro(item.linkedMovimento.importoNetto)}</strong>
                                </span>
                            </div>
                        )}

                        {/* Action buttons */}
                        {(item.isEditable || item.stato === 'BOZZA') && (
                            <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-600">
                                {item.stato === 'BOZZA' && (
                                    <button
                                        onClick={handleConfirm}
                                        disabled={confirming}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 transition-colors disabled:opacity-50"
                                    >
                                        <CheckCheck className={cn('h-3.5 w-3.5', confirming && 'animate-pulse')} />
                                        Conferma
                                    </button>
                                )}
                                {item.isEditable && (
                                    <button
                                        onClick={e => { e.stopPropagation(); setShowEditModal(true); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                        Modifica prezzo
                                    </button>
                                )}
                                {item.isEditable && (
                                    <button
                                        onClick={e => { e.stopPropagation(); setShowDeleteModal(true); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700 transition-colors ml-auto"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Elimina
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const CompanyBillingCard: React.FC<CompanyBillingCardProps> = ({ companyId, companyName, className }) => {
    // Default tab = BOZZA: è dove compaiono i nuovi movimenti generati automaticamente
    const [activeTab, setActiveTab] = useState<ActiveTab>('BOZZA');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();
    const operateHeaders = getOperateHeaders();

    const { data, isLoading, isError, refetch, isFetching } = useQuery<BillingSummaryResponse>({
        queryKey: ['company-billing-summary', companyId],
        queryFn: async () => {
            const resp = await apiGet<{ success: boolean; data: BillingSummaryResponse }>(
                `/api/v1/companies/${companyId}/billing-summary`
            );
            return resp.data;
        },
        staleTime: 60_000,
    });

    const summary = data?.summary;
    const allItems = data?.items ?? [];
    const filteredItems = allItems.filter(i => i.computedStatus === activeTab);

    const toggleExpanded = (id: string) =>
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const handleGenerateMovements = async () => {
        setIsGenerating(true);
        try {
            const resp = await apiPost<{
                success: boolean;
                data: { totaleCreati: number };
                warnings?: Array<{ type: string; message: string; solutionUrl?: string }>;
            }>(
                `/api/v1/companies/${companyId}/generate-movements`,
                {},
                { headers: operateHeaders }
            );
            const { totaleCreati } = resp.data;
            if (totaleCreati > 0) {
                showToast({ message: `Generati ${totaleCreati} movimenti contabili`, type: 'success' });
            } else {
                showToast({ message: 'Nessun nuovo movimento da generare — tutto aggiornato!', type: 'info' });
            }
            // Mostra warning configurazione tariffario (max 3, non bloccanti)
            if (resp.warnings?.length) {
                const unique = Array.from(new Map(resp.warnings.map(w => [w.type, w])).values());
                for (const warn of unique.slice(0, 3)) {
                    showToast({ message: warn.message, type: 'warning', duration: 8000 });
                }
            }
            refetch();
        } catch (err: unknown) {
            showToast({ message: 'Errore nella generazione movimenti', type: 'error' });
        } finally {
            setIsGenerating(false);
        }
    };

    const activeConfig = TAB_CONFIG.find(t => t.id === activeTab)!;;

    return (
        <div className={cn('bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden', className)}>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/30 dark:to-emerald-900/30 border-b border-teal-200 dark:border-teal-700">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <h4 className="font-semibold text-teal-800 dark:text-teal-200">Fatturazione</h4>
                    {companyName && (
                        <span className="text-xs text-teal-600 dark:text-teal-400 font-normal hidden sm:inline">— {companyName}</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    {/* Genera movimenti mancanti */}
                    <button
                        onClick={handleGenerateMovements}
                        disabled={isGenerating}
                        title="Genera movimenti contabili mancanti (idempotente)"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-800/40 border border-teal-200 dark:border-teal-700 transition-colors disabled:opacity-50"
                    >
                        <Sparkles className={cn('h-3.5 w-3.5', isGenerating && 'animate-pulse')} />
                        <span className="hidden sm:inline">{isGenerating ? 'Generazione...' : 'Genera movimenti'}</span>
                    </button>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="p-1.5 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-800/40 transition-colors"
                        title="Aggiorna"
                    >
                        <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-4">
                {/* Summary pill row */}
                {summary && (
                    <div className="flex flex-wrap gap-2">
                        {TAB_CONFIG.map(tab => {
                            const bucket = summary[tab.summaryKey];
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                                        tab.bg, tab.text, tab.border,
                                        isActive
                                            ? 'ring-2 ring-offset-1 ring-current shadow-sm'
                                            : 'opacity-80 hover:opacity-100'
                                    )}
                                >
                                    <TabIcon className="h-3.5 w-3.5" />
                                    {tab.label}
                                    <span className="ml-0.5 font-bold">{bucket.count}</span>
                                    {bucket.total > 0 && (
                                        <span className="hidden sm:inline text-xs font-normal opacity-80">
                                            · {formatEuro(bucket.total)}
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                        {/* Totale generale */}
                        {summary.totale.count > 0 && (
                            <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm border border-gray-200 dark:border-gray-600">
                                <FileCheck className="h-3.5 w-3.5" />
                                Totale: <span className="font-bold">{formatEuro(summary.totale.total)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
                            <span className="text-sm">Caricamento movimenti...</span>
                        </div>
                    </div>
                ) : isError ? (
                    <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <span className="text-sm">Errore nel caricamento dei dati di fatturazione.</span>
                        <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto">
                            Riprova
                        </Button>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className={cn(
                        'flex flex-col items-center gap-3 py-10 rounded-xl border-2 border-dashed',
                        activeConfig.border, activeConfig.bg
                    )}>
                        {React.createElement(activeConfig.icon, { className: cn('h-8 w-8 opacity-40', activeConfig.text) })}
                        <p className={cn('text-sm font-medium', activeConfig.text)}>
                            Nessun movimento in stato "{activeConfig.label}"
                        </p>
                        {/* Se siamo nella tab BOZZA e non ci sono movimenti → guida all'azione */}
                        {activeTab === 'BOZZA' && summary?.totale.count === 0 && (
                            <div className="flex flex-col items-center gap-2 mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-xs">
                                    Premi <strong>Genera movimenti</strong> per creare automaticamente tutti i movimenti contabili mancanti (visite MDL, sopralluogi, nomine, consulenze, spese periodiche).
                                </p>
                                <Button
                                    size="sm"
                                    onClick={handleGenerateMovements}
                                    disabled={isGenerating}
                                    className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 mt-1"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    {isGenerating ? 'Generazione...' : 'Genera movimenti ora'}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Subtotale sezione */}
                        {summary && (
                            <div className={cn('flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium', activeConfig.bg, activeConfig.text)}>
                                <span>{filteredItems.length} movimenti</span>
                                <span>{formatEuro(summary[activeConfig.summaryKey].total)}</span>
                            </div>
                        )}

                        {filteredItems.map(item => (
                            <ItemRow
                                key={item.id}
                                item={item}
                                expanded={expandedIds.has(item.id)}
                                onToggle={() => toggleExpanded(item.id)}
                                onRefetch={refetch}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanyBillingCard;
