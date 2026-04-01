/**
 * QuickActionTariffarioModal - Modal per associare tariffario da CompanyDetails
 * 
 * Modal per associare rapidamente un tariffario prestazioni MDL/RSPP all'azienda.
 * 
 * Features:
 * - Filtro multi-tenancy corretto (P59 Sprint 11 fix)
 * - Ultimi tariffari utilizzati in evidenza
 * - Searchbar per ricerca tariffari
 * - Quick look delle voci del tariffario (fetch separato)
 * - Visualizzazione convenzione associata (non modificabile)
 * - Programmazione validità compatta
 * 
 * @module components/companies/quick-actions/QuickActionTariffarioModal
 * @project P59 - Sprint 11 - Tariffario Multi-tenancy Fix
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Loader2,
    DollarSign,
    Search,
    Check,
    Info,
    Calendar,
    Eye,
    ChevronDown,
    ChevronUp,
    Handshake,
    X,
    AlertCircle
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { apiGet, apiPost } from '../../../services/api';
import { cn } from '../../../design-system/utils';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useTenantMode } from '../../../contexts/TenantModeContext';
import { DatePickerElegante } from '../../ui/DatePickerElegante';

interface QuickActionTariffarioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    companyId: string;
    companyName: string;
    // P59 Sprint 11.2: Edit mode - quando presente, pre-seleziona il tariffario corrente
    currentTariffario?: {
        id: string;
        nome: string;
        association?: {
            id: string;
            validoDa?: string;
            validoA?: string | null;
            note?: string | null;
        };
    };
    /** Multi-tenant operation headers (X-Operate-Tenant-Id) */
    operateHeaders?: Record<string, string>;
}

interface TariffarioVoce {
    id: string;
    nome: string;
    tipo: string;
    prezzoBase: number;
    frequenza?: string;
    unitaCalcolo?: string;
    usaFasceDipendenti?: boolean;
    fasceDipendenti?: Array<{
        id: string;
        minDipendenti: number;
        maxDipendenti: number | null;
        prezzo: number;
        descrizione?: string;
    }>;
    prestazione?: {
        id: string;
        codice: string;
        nome: string;
    };
}

interface TariffarioOption {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string;
    attivo: boolean;
    convenzione?: {
        id: string;
        codice: string;
        nome: string;
    } | null;
    voci?: TariffarioVoce[];
    _count?: {
        voci: number;
        companyAssociations?: number;  // P59 Sprint 11: M2M count
    };
    updatedAt?: string;
}

const TIPO_VOCE_LABELS: Record<string, string> = {
    'PRESTAZIONE_MDL': 'Prestazione',
    'TARIFFA_FISSA': 'Tariffa Fissa',
    'SOPRALLUOGO_MC': 'Sopralluogo MC',
    'RICORRENTE': 'Ricorrente',
    'CONSULENZA': 'Consulenza',
    'ALTRA_SPESA': 'Altra spesa',
    'PRESTAZIONE': 'Prestazione',
    'SPESA_FISSA': 'Spesa Fissa',
    'SPESA_RICORRENTE': 'Spesa Ricorrente'
};

export const QuickActionTariffarioModal: React.FC<QuickActionTariffarioModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    companyId,
    companyName,
    currentTariffario,  // P59 Sprint 11.2: Tariffario corrente per edit mode
    operateHeaders
}) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    // P59 Sprint 11: Usa tenant filter per multi-tenancy
    const { getTenantFilterParams, isReady: tenantReady } = useTenantFilter();
    const { getOperateHeaders } = useTenantMode();
    const effectiveHeaders = operateHeaders || getOperateHeaders();

    // P59 Sprint 11.2: Determina se siamo in edit mode
    const isEditMode = !!currentTariffario;

    // Form state
    const [selectedTariffarioId, setSelectedTariffarioId] = useState('');
    const [note, setNote] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Scheduling state - compatto (P59 Sprint 11: rimosso successoreId e isPromozione)
    const [validoDa, setValidoDa] = useState<string>('');
    const [validoA, setValidoA] = useState<string>('');
    const [showScheduling, setShowScheduling] = useState(false);

    // Quick look state
    const [quickLookId, setQuickLookId] = useState<string | null>(null);
    const [quickLookVoci, setQuickLookVoci] = useState<TariffarioVoce[]>([]);
    const [loadingQuickLook, setLoadingQuickLook] = useState(false);

    // Reset form quando si apre - in edit mode pre-popola con i dati correnti
    useEffect(() => {
        if (isOpen) {
            if (currentTariffario) {
                // Edit mode: pre-popola con i dati correnti
                setSelectedTariffarioId(currentTariffario.id);
                setNote(currentTariffario.association?.note || '');
                // Formatta le date per l'input datetime-local
                if (currentTariffario.association?.validoDa) {
                    const date = new Date(currentTariffario.association.validoDa);
                    setValidoDa(date.toISOString().slice(0, 16));
                } else {
                    setValidoDa('');
                }
                if (currentTariffario.association?.validoA) {
                    const date = new Date(currentTariffario.association.validoA);
                    setValidoA(date.toISOString().slice(0, 16));
                } else {
                    setValidoA('');
                }
                // Mostra sempre lo scheduling in edit mode se ci sono date
                setShowScheduling(!!(currentTariffario.association?.validoDa || currentTariffario.association?.validoA));
            } else {
                // New mode: resetta tutto
                setSelectedTariffarioId('');
                setNote('');
                setValidoDa('');
                setValidoA('');
                setShowScheduling(false);
            }
            setSearchTerm('');
            setErrors({});
            setQuickLookId(null);
            setQuickLookVoci([]);
        }
    }, [isOpen, currentTariffario]);

    // P59 Sprint 11.2: Auto-fill validoA = validoDa + 1 anno quando validoDa cambia
    // Solo in modalità new (non in edit per non sovrascrivere valori esistenti)
    useEffect(() => {
        if (validoDa && !isEditMode) {
            const dataInizio = new Date(validoDa);
            // Aggiungi 1 anno
            const dataFine = new Date(dataInizio);
            dataFine.setFullYear(dataFine.getFullYear() + 1);
            // Formatta per datetime-local (YYYY-MM-DDTHH:mm)
            setValidoA(dataFine.toISOString().slice(0, 16));
        }
    }, [validoDa, isEditMode]);

    // P59 Sprint 11: Fetch tariffari disponibili con filtro tenant corretto
    // Con M2M tutti i tariffari sono unici (non più tipo BASE/AZIENDALE)
    const { data: tariffariData, isLoading: isLoadingTariffari } = useQuery({
        queryKey: ['tariffari-quick-action', searchTerm, getTenantFilterParams()],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            const response = await apiGet<{ success: boolean; data: TariffarioOption[] }>('/api/v1/tariffari-aziendali', {
                search: searchTerm,
                attivo: 'true',
                limit: 50,
                // P59: Passa i parametri tenant per multi-tenancy
                tenantIds: tenantParams.tenantIds?.join(','),
                allTenants: tenantParams.allTenants
            });
            return response.data || [];
        },
        staleTime: 60 * 1000,
        enabled: isOpen && tenantReady
    });

    // P59 Sprint 11: Fetch tariffari già associati all'azienda (via M2M)
    const { data: existingTariffari } = useQuery({
        queryKey: ['company-tariffari', companyId],
        queryFn: async () => {
            const response = await apiGet<{ success: boolean; data: Array<{ id: string }> }>(
                `/api/v1/companies/${companyId}/tariffari`
            );
            // Ritorna gli ID dei tariffari associati
            return (response.data || []).map(t => t.id);
        },
        staleTime: 60 * 1000,
        enabled: isOpen && !!companyId
    });

    const tariffari = tariffariData || [];
    const alreadyAssigned = existingTariffari || [];

    // Ordina: ultimi modificati prima, poi alfabetico
    const sortedTariffari = useMemo(() => {
        return [...tariffari].sort((a, b) => {
            if (a.updatedAt && b.updatedAt) {
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
            return a.nome.localeCompare(b.nome);
        });
    }, [tariffari]);

    // Recenti (ultimi 3) e resto
    const recentTariffari = useMemo(() => sortedTariffari.slice(0, 3), [sortedTariffari]);
    const otherTariffari = useMemo(() => sortedTariffari.slice(3), [sortedTariffari]);

    const selectedTariffario = useMemo(() =>
        tariffari.find(t => t.id === selectedTariffarioId),
        [tariffari, selectedTariffarioId]
    );

    // P59 Sprint 11.2: Fetch voci per quick look con tenant params
    const fetchQuickLookVoci = useCallback(async (tariffarioId: string) => {
        setLoadingQuickLook(true);
        try {
            // Passa i tenant params per permettere accesso cross-tenant se autorizzato
            const tenantParams = getTenantFilterParams();
            const queryParams = new URLSearchParams();
            if (tenantParams.tenantIds?.length) {
                queryParams.set('tenantIds', tenantParams.tenantIds.join(','));
            }
            if (tenantParams.allTenants) {
                queryParams.set('allTenants', 'true');
            }
            const queryString = queryParams.toString();
            const url = `/api/v1/tariffari-aziendali/${tariffarioId}${queryString ? `?${queryString}` : ''}`;

            const response = await apiGet<{ success: boolean; data: { voci: TariffarioVoce[] } }>(url);
            setQuickLookVoci(response.data?.voci || []);
        } catch (error) {
            setQuickLookVoci([]);
        } finally {
            setLoadingQuickLook(false);
        }
    }, [getTenantFilterParams]);

    // Quando si apre il quick look, fetcha le voci
    useEffect(() => {
        if (quickLookId) {
            fetchQuickLookVoci(quickLookId);
        } else {
            setQuickLookVoci([]);
        }
    }, [quickLookId, fetchQuickLookVoci]);

    // P59 Sprint 11: Mutation per associare tariffario (M2M, non crea clone)
    const assignMutation = useMutation({
        mutationFn: async () => {
            return apiPost(`/api/v1/tariffari-aziendali/${selectedTariffarioId}/associate`, {
                companyTenantProfileId: companyId,
                note: note || undefined,
                validoDa: validoDa || undefined,
                validoA: validoA || undefined
            }, { headers: effectiveHeaders });
        },
        onSuccess: () => {
            showToast({
                type: 'success',
                message: isEditMode ? 'Associazione tariffario aggiornata' : 'Tariffario associato con successo'
            });
            // P59 Sprint 11.2: Invalida le query per forzare il refresh della card e dello storico
            queryClient.invalidateQueries({ queryKey: ['company-tariffari', companyId] });
            queryClient.invalidateQueries({ queryKey: ['company', companyId] });
            onSuccess();
            onClose();
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'associazione' });
        }
    });

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!selectedTariffarioId) {
            newErrors.tariffario = 'Seleziona un tariffario';
        }

        if (validoA && validoDa && new Date(validoA) <= new Date(validoDa)) {
            newErrors.validoA = 'La data fine deve essere successiva a quella di inizio';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [selectedTariffarioId, validoDa, validoA]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            assignMutation.mutate();
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price);
    };

    // P59 Sprint 11: Render singolo tariffario nella lista
    // P59 Sprint 11.2: In edit mode, permette di ri-selezionare tariffari già associati
    const renderTariffarioItem = (tariffario: TariffarioOption, isRecent: boolean = false) => {
        const isAssigned = alreadyAssigned.includes(tariffario.id);
        const isCurrentTariffario = currentTariffario?.id === tariffario.id;
        const isSelected = selectedTariffarioId === tariffario.id;
        const isQuickLookOpen = quickLookId === tariffario.id;
        const numAssociazioni = tariffario._count?.companyAssociations || 0;

        // In edit mode: permetti selezione di qualsiasi tariffario (incluso quello corrente)
        // In new mode: disabilita quelli già associati
        const isDisabled = !isEditMode && isAssigned;

        return (
            <div key={tariffario.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div
                    onClick={() => {
                        if (!isDisabled) {
                            setSelectedTariffarioId(tariffario.id);
                            if (errors.tariffario) {
                                setErrors(prev => ({ ...prev, tariffario: '' }));
                            }
                        }
                    }}
                    className={cn(
                        "p-3 transition-colors",
                        isDisabled
                            ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50"
                            : isSelected
                                ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500 cursor-pointer"
                                : isCurrentTariffario && isEditMode
                                    ? "bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer border-l-4 border-l-emerald-400"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    )}
                >
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {tariffario.nome}
                                </p>
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                    {tariffario.codice}
                                </span>
                                {isCurrentTariffario && isEditMode && (
                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded font-medium">
                                        ATTUALE
                                    </span>
                                )}
                                {isRecent && (
                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded font-medium">
                                        RECENTE
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {tariffario.convenzione && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
                                        <Handshake className="h-3 w-3" />
                                        {tariffario.convenzione.nome}
                                    </span>
                                )}
                                {numAssociazioni > 0 && (
                                    <span className="text-[10px] text-gray-400">
                                        {numAssociazioni} {numAssociazioni === 1 ? 'azienda' : 'aziende'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {tariffario._count?.voci || 0} voci
                            </span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickLookId(isQuickLookOpen ? null : tariffario.id);
                                }}
                                className={cn(
                                    "p-1 rounded transition-colors",
                                    isQuickLookOpen
                                        ? "text-blue-600 bg-blue-100"
                                        : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                )}
                                title="Anteprima voci"
                            >
                                <Eye className="h-4 w-4" />
                            </button>
                            {isAssigned && !isEditMode && (
                                <span className="flex items-center text-xs text-green-600" title="Già associato">
                                    <Check className="h-4 w-4" />
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Look Panel */}
                {isQuickLookOpen && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                Anteprima Voci
                            </h5>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickLookId(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {loadingQuickLook ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-gray-500" />
                                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Caricamento voci...</span>
                            </div>
                        ) : quickLookVoci.length === 0 ? (
                            <div className="flex items-center justify-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Nessuna voce trovata
                            </div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-100 dark:bg-gray-600 sticky top-0">
                                        <tr>
                                            <th className="text-left px-2 py-1 text-gray-600 dark:text-gray-300">Voce</th>
                                            <th className="text-left px-2 py-1 text-gray-600 dark:text-gray-300 w-24">Tipo</th>
                                            <th className="text-right px-2 py-1 text-gray-600 dark:text-gray-300 w-28">Prezzo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-600">
                                        {quickLookVoci.map((voce) => {
                                            // Nome: usa prestazione.nome se disponibile, altrimenti voce.nome
                                            const voceName = voce.prestazione?.nome || voce.nome || 'Voce senza nome';

                                            return (
                                                <React.Fragment key={voce.id}>
                                                    <tr className="hover:bg-white dark:hover:bg-gray-600">
                                                        <td className="px-2 py-1.5 text-gray-900 dark:text-gray-100">{voceName}</td>
                                                        <td className="px-2 py-1.5 text-gray-500 dark:text-gray-400 text-[10px]">
                                                            {TIPO_VOCE_LABELS[voce.tipo] || voce.tipo}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300 font-mono">
                                                            {voce.usaFasceDipendenti && voce.fasceDipendenti?.length ? (
                                                                <span className="text-blue-600 text-[10px]">a scaglioni</span>
                                                            ) : (
                                                                formatPrice(voce.prezzoBase)
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {/* Mostra fasce dipendenti se presenti */}
                                                    {voce.usaFasceDipendenti && voce.fasceDipendenti && voce.fasceDipendenti.length > 0 && (
                                                        voce.fasceDipendenti.map((fascia, idx) => (
                                                            <tr key={`${voce.id}-fascia-${idx}`} className="bg-blue-50/50 dark:bg-blue-900/20">
                                                                <td colSpan={2} className="px-2 py-1 pl-6 text-gray-500 dark:text-gray-400 text-[10px]">
                                                                    {fascia.minDipendenti}-{fascia.maxDipendenti ?? '∞'} dipendenti
                                                                </td>
                                                                <td className="px-2 py-1 text-right text-blue-700 font-mono text-[10px]">
                                                                    {formatPrice(fascia.prezzo)}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditMode ? "Modifica Associazione Tariffario" : "Associa Tariffario"}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="flex flex-col max-h-[70vh]">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 mb-4 flex-shrink-0">
                    <div className="flex items-center">
                        <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <p className="ml-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                            {companyName}
                        </p>
                    </div>
                    {isEditMode && currentTariffario && (
                        <p className="ml-7 text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            Tariffario attuale: {currentTariffario.nome}
                        </p>
                    )}
                </div>

                <div className="relative mb-3 flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cerca tariffario per nome o codice..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    />
                    {isLoadingTariffari && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                    )}
                </div>

                <div className={cn(
                    "flex-1 overflow-y-auto border rounded-lg min-h-[200px] max-h-[250px]",
                    errors.tariffario ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700"
                )}>
                    {!tenantReady ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                            Inizializzazione...
                        </div>
                    ) : tariffari.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                            {isLoadingTariffari ? 'Caricamento tariffari...' : 'Nessun tariffario BASE trovato'}
                        </div>
                    ) : (
                        <>
                            {!searchTerm && recentTariffari.length > 0 && (
                                <div>
                                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0 z-10">
                                        <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Ultimi Utilizzati
                                        </h4>
                                    </div>
                                    {recentTariffari.map(t => renderTariffarioItem(t, true))}
                                </div>
                            )}

                            {otherTariffari.length > 0 && (
                                <div>
                                    {!searchTerm && recentTariffari.length > 0 && (
                                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 sticky top-0 z-10">
                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                                                Altri Tariffari
                                            </h4>
                                        </div>
                                    )}
                                    {(searchTerm ? sortedTariffari : otherTariffari).map(t => renderTariffarioItem(t, false))}
                                </div>
                            )}
                        </>
                    )}
                </div>
                {errors.tariffario && (
                    <p className="mt-1 text-xs text-red-600">{errors.tariffario}</p>
                )}

                {selectedTariffario?.convenzione && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Handshake className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                Convenzione: {selectedTariffario.convenzione.nome}
                            </span>
                            <span className="text-xs text-purple-600 dark:text-purple-400">
                                ({selectedTariffario.convenzione.codice})
                            </span>
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            La convenzione non può essere modificata da qui
                        </p>
                    </div>
                )}

                <div className="mt-3 border rounded-lg overflow-hidden flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowScheduling(!showScheduling)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                            <Calendar className="h-4 w-4" />
                            Programmazione Validità
                            {(validoDa || validoA) && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                                    Configurato
                                </span>
                            )}
                        </div>
                        {showScheduling ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </button>

                    {showScheduling && (
                        <div className="p-3 space-y-3 border-t bg-white dark:bg-gray-800">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valido Da</label>
                                    <DatePickerElegante
                                        value={validoDa}
                                        onChange={(date) => setValidoDa(date ? date.toISOString().split('T')[0] : '')}
                                        theme="teal"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Valido Fino Al</label>
                                    <DatePickerElegante
                                        value={validoA}
                                        onChange={(date) => setValidoA(date ? date.toISOString().split('T')[0] : '')}
                                        theme="teal"
                                    />
                                    {errors.validoA && <p className="mt-0.5 text-[10px] text-red-600">{errors.validoA}</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-3 flex-shrink-0">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                        placeholder="Condizioni particolari..."
                    />
                </div>

                <div className="flex items-start p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 mt-3 flex-shrink-0">
                    <Info className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <p className="ml-2 text-[11px] text-gray-500 dark:text-gray-400">
                        Il tariffario verrà associato all'azienda (non viene creata una copia).
                        Lo stesso tariffario può essere condiviso tra più aziende.
                    </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                        disabled={assignMutation.isPending}
                    >
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={assignMutation.isPending || !selectedTariffarioId}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {assignMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Salvataggio...
                            </>
                        ) : (
                            <>
                                <DollarSign className="h-4 w-4 mr-2" />
                                {isEditMode ? 'Aggiorna Associazione' : 'Associa Tariffario'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickActionTariffarioModal;
