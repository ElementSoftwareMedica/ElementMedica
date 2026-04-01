/**
 * BatchSendModal — Modale "Genera e Invia Oggi"
 *
 * Consente al medico competente di scegliere come inviare i giudizi di oggi:
 * - Tutte le aziende
 * - Aziende selezionate
 * - Lavoratori selezionati
 *
 * Mostra stato invio per prevenire reinvii accidentali e permette force re-send.
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    X, Send, Loader2, Building2, Users, CheckCircle2,
    AlertTriangle, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { clinicaApi } from '../../../../services/clinicaApi';
import { useToast } from '../../../../hooks/useToast';
import { CRUDPrimaryButton } from '../../../../components/shared/CRUDButton';

// ── Types ──

type SendMode = 'all' | 'companies' | 'workers';

interface BatchSendModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// ── Component ──

const BatchSendModal: React.FC<BatchSendModalProps> = ({ open, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [sendMode, setSendMode] = useState<SendMode>('all');
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
    const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
    const [forceResend, setForceResend] = useState(false);
    const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

    const { data: preview, isLoading } = useQuery({
        queryKey: ['giudizi-batch-preview'],
        queryFn: () => clinicaApi.giudiziIdoneita.batchPreview(),
        enabled: open,
    });

    const sendMutation = useMutation({
        mutationFn: () => {
            const params: {
                companyTenantProfileIds?: string[];
                personIds?: string[];
                force?: boolean;
            } = {};

            if (sendMode === 'companies' && selectedCompanyIds.length > 0) {
                params.companyTenantProfileIds = selectedCompanyIds;
            } else if (sendMode === 'workers' && selectedPersonIds.length > 0) {
                params.personIds = selectedPersonIds;
            }

            if (forceResend) params.force = true;

            return clinicaApi.giudiziIdoneita.batchGenerateAndSend(params);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
            queryClient.invalidateQueries({ queryKey: ['giudizi-batch-preview'] });
            showToast({
                type: 'success',
                message: `Completato: ${data.giudiziTrovati} giudizi, ${data.pdfGenerati} PDF generati, ${data.email?.sent || 0} email inviate`,
            });
            onSuccess();
            onClose();
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante la generazione e invio batch' });
        },
    });

    const companies = preview?.companies ?? [];
    const totaleGiudizi = preview?.totaleGiudizi ?? 0;
    const totaleGiaInviati = companies.reduce((s, c) => s + c.giaInviati, 0);

    // Counts for selected items
    const selectedCount = useMemo(() => {
        if (sendMode === 'all') return totaleGiudizi;
        if (sendMode === 'companies') {
            return companies
                .filter(c => selectedCompanyIds.includes(c.companyTenantProfileId || ''))
                .reduce((s, c) => s + c.totale, 0);
        }
        return selectedPersonIds.length;
    }, [sendMode, totaleGiudizi, companies, selectedCompanyIds, selectedPersonIds]);

    const canSend = totaleGiudizi > 0 && (
        sendMode === 'all' ||
        (sendMode === 'companies' && selectedCompanyIds.length > 0) ||
        (sendMode === 'workers' && selectedPersonIds.length > 0)
    );

    const toggleCompany = (id: string) => {
        setSelectedCompanyIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const togglePerson = (personId: string) => {
        setSelectedPersonIds(prev =>
            prev.includes(personId) ? prev.filter(x => x !== personId) : [...prev, personId]
        );
    };

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <Send className="h-5 w-5 text-teal-600" />
                            Genera e Invia Giudizi di Oggi
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Seleziona come inviare i giudizi emessi oggi
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                            <span className="ml-2 text-sm text-gray-500">Caricamento giudizi di oggi...</span>
                        </div>
                    ) : totaleGiudizi === 0 ? (
                        <div className="text-center py-10 space-y-2">
                            <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto" />
                            <p className="text-sm text-gray-500">Nessun giudizio emesso oggi.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary banner */}
                            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <div className="flex-1">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totaleGiudizi}</div>
                                    <div className="text-xs text-gray-500">giudizi di oggi</div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{companies.length}</div>
                                    <div className="text-xs text-gray-500">aziende coinvolte</div>
                                </div>
                                {totaleGiaInviati > 0 && (
                                    <div className="flex-1">
                                        <div className="text-2xl font-bold text-green-600">{totaleGiaInviati}</div>
                                        <div className="text-xs text-green-600">già inviati</div>
                                    </div>
                                )}
                            </div>

                            {/* Already-sent warning */}
                            {totaleGiaInviati > 0 && !forceResend && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700">
                                    <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-700 dark:text-amber-300">
                                        <strong>{totaleGiaInviati} giudizi</strong> sono già stati inviati e non saranno reinviati.
                                        Il cron delle 22:00 non li invierà nuovamente.
                                    </div>
                                </div>
                            )}

                            {/* Send mode selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Modalità invio</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { value: 'all' as SendMode, label: 'Tutte le aziende', icon: <Send className="h-4 w-4" /> },
                                        { value: 'companies' as SendMode, label: 'Aziende selezionate', icon: <Building2 className="h-4 w-4" /> },
                                        { value: 'workers' as SendMode, label: 'Lavoratori selezionati', icon: <Users className="h-4 w-4" /> },
                                    ]).map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setSendMode(opt.value)}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${sendMode === opt.value
                                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            {opt.icon}
                                            <span className="text-xs font-medium">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Companies / Workers selection */}
                            {sendMode !== 'all' && (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {companies.map(company => {
                                        const cId = company.companyTenantProfileId || 'senza-azienda';
                                        const isExpanded = expandedCompany === cId;
                                        const companySelected = sendMode === 'companies' && selectedCompanyIds.includes(cId);

                                        return (
                                            <div key={cId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50">
                                                    {sendMode === 'companies' && (
                                                        <input
                                                            type="checkbox"
                                                            checked={companySelected}
                                                            onChange={() => toggleCompany(cId)}
                                                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                    )}
                                                    <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                                            {company.ragioneSociale}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[11px] text-gray-500">{company.totale} giudizi</span>
                                                            {company.giaInviati > 0 && (
                                                                <span className="text-[11px] text-green-600">{company.giaInviati} già inviati</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {sendMode === 'workers' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setExpandedCompany(isExpanded ? null : cId)}
                                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                                        >
                                                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Workers list (expanded in workers mode) */}
                                                {sendMode === 'workers' && isExpanded && (
                                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {company.giudizi.map(g => (
                                                            <label
                                                                key={g.id}
                                                                className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedPersonIds.includes(g.personId)}
                                                                    onChange={() => togglePerson(g.personId)}
                                                                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                                />
                                                                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                                                    {g.lavoratore}
                                                                </span>
                                                                <span className="text-[11px] text-gray-400">{g.tipoGiudizio.replace(/_/g, ' ')}</span>
                                                                {g.alreadySent && (
                                                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                                )}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Force re-send toggle */}
                            {totaleGiaInviati > 0 && (
                                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={forceResend}
                                        onChange={() => setForceResend(!forceResend)}
                                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            Forza reinvio
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            Reinvia anche i giudizi già notificati
                                        </div>
                                    </div>
                                </label>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                    <div className="text-xs text-gray-500">
                        {totaleGiudizi > 0 && (
                            <span>{selectedCount} giudizi da processare</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Annulla
                        </button>
                        <CRUDPrimaryButton
                            onClick={() => sendMutation.mutate()}
                            disabled={!canSend || sendMutation.isPending}
                        >
                            {sendMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {sendMutation.isPending ? 'Invio in corso...' : 'Genera e Invia'}
                        </CRUDPrimaryButton>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BatchSendModal;
