/**
 * Allegato3BPage - Relazione Annuale Medico Competente
 * 
 * Pagina per la gestione delle relazioni annuali del medico competente
 * da trasmettere all'INAIL e ASL secondo D.Lgs 81/08 Art. 40.
 * 
 * Funzionalità:
 * - Lista relazioni annuali per anno
 * - Creazione nuova relazione (calcolo automatico dati)
 * - Compilazione progressiva
 * - Export XML per trasmissione INAIL
 * - Dashboard statistiche aggregate
 * 
 * @module pages/clinica/mdl/Allegato3BPage
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 6
 * @compliance D.Lgs 81/08 Art. 40
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
    FileText,
    Building2,
    Calendar,
    Download,
    Plus,
    ChevronRight,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Clock,
    Send,
    Eye,
    Edit,
    FileCode,
    Users,
    Activity,
    Shield,
    Briefcase,
    Filter,
    Search,
    BarChart3,
    Stethoscope,
    Info,
    Loader2,
    Trash2
} from 'lucide-react';
import {
    clinicaApi,
    type Allegato3B,
    type Allegato3BStatistiche,
    type Allegato3BCreateInput,
    type Allegato3BEligibleCompany,
    type Allegato3BPreviewResponse
} from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useTenantMode } from '../../../contexts/TenantModeContext';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { ActionButton } from '../../../components/ui';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { formatMedicoName } from '../../../utils/textFormatters';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// =====================================================
// STATUS CONFIGURATION
// =====================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
    'DA_COMPILARE': { label: 'Da Compilare', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: Edit },
    'BOZZA': { label: 'Bozza', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Clock },
    'COMPILATO': { label: 'Compilato', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: CheckCircle2 },
    'PRONTO': { label: 'Pronto per invio', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle2 },
    'INVIATO': { label: 'Trasmesso', color: 'text-teal-700', bgColor: 'bg-teal-100', icon: Send },
    'CONFERMATO': { label: 'Confermato', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: CheckCircle2 },
    'ERRORE': { label: 'Errore', color: 'text-red-700', bgColor: 'bg-red-100', icon: AlertCircle }
};

// =====================================================
// COMPONENTE PRINCIPALE
// =====================================================

const Allegato3BPage: React.FC = () => {
    const { showToast } = useToast();
    const { confirm: confirmDialog } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    // Tenant filter from global context
    const { isReady, tenantFilterKey } = useTenantFilter();
    const { canPerformCRUD } = useTenantMode();

    // State
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedRecord, setSelectedRecord] = useState<Allegato3B | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCompileModalOpen, setIsCompileModalOpen] = useState(false);

    // P59: Stato modale creazione con pre-selezione da query params
    const [newAnno, setNewAnno] = useState(new Date().getFullYear() - 1);
    const [newCompanyId, setNewCompanyId] = useState('');
    const [newMedicoId, setNewMedicoId] = useState('');
    const [companySearch, setCompanySearch] = useState('');
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [statisticheOverride, setStatisticheOverride] = useState<NonNullable<Allegato3BCreateInput['statisticheOverride']>>({});
    const companyDropdownRef = useRef<HTMLDivElement>(null);

    // P59: Leggi query params per apertura automatica modale o dettaglio
    useEffect(() => {
        const companyIdFromUrl = searchParams.get('companyId');
        const idFromUrl = searchParams.get('id');
        const action = searchParams.get('action');

        // Apertura diretta dettaglio per ID
        if (idFromUrl && !companyIdFromUrl) {
            clinicaApi.allegato3B.getById(idFromUrl).then((record) => {
                if (record) {
                    setSelectedRecord(record);
                    setViewMode('detail');
                }
            }).catch(() => { });
            setSearchParams({}, { replace: true });
            return;
        }

        if (companyIdFromUrl) {
            setNewCompanyId(companyIdFromUrl);
            // Se action=nuovo oppure c'è companyId, apri modale creazione
            if (action === 'nuovo' || !idFromUrl) {
                setIsCreateModalOpen(true);
            }
            // Pulisci query params dopo lettura
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    // Years for filter (last 5 years)
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);
    }, []);

    // Close company dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
                setIsCompanyDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch companies eligible for Allegato 3B: active MC/MC coordinated nomination only.
    const { data: companiesResponse } = useQuery({
        queryKey: ['companies-for-allegato3b', tenantFilterKey],
        queryFn: () => clinicaApi.allegato3B.getEligibleCompanies(),
        enabled: isReady
    });

    // Sorted + filtered companies for searchable dropdown (must be after companiesResponse declaration)
    const sortedFilteredCompanies = useMemo(() => {
        const list = (companiesResponse || []) as Allegato3BEligibleCompany[];
        const sorted = [...list].sort((a, b) =>
            (a.ragioneSociale || '').localeCompare(b.ragioneSociale || '', 'it')
        );
        if (!companySearch.trim()) return sorted;
        const search = companySearch.toLowerCase();
        return sorted.filter(c =>
            (c.ragioneSociale || '').toLowerCase().includes(search) ||
            (c.piva || '').includes(search)
        );
    }, [companiesResponse, companySearch]);

    const selectedCreateCompany = useMemo(() => {
        const list = (companiesResponse || []) as Allegato3BEligibleCompany[];
        return list.find(company => (company.companyTenantProfileId || company.id) === newCompanyId) || null;
    }, [companiesResponse, newCompanyId]);

    useEffect(() => {
        setNewMedicoId(selectedCreateCompany?.medicoCompetenteId || '');
        setStatisticheOverride({});
    }, [selectedCreateCompany?.medicoCompetenteId, newCompanyId, newAnno]);

    const { data: createPreview, isFetching: isPreviewLoading } = useQuery<Allegato3BPreviewResponse | undefined>({
        queryKey: ['allegato3b-create-preview', newCompanyId, newAnno],
        queryFn: () => clinicaApi.allegato3B.preview({ anno: newAnno, companyTenantProfileId: newCompanyId }),
        enabled: isCreateModalOpen && !!newCompanyId && !!newAnno,
        staleTime: 30_000
    });

    // Fetch list of Allegato 3B records
    const { data: recordsResponse, isLoading: recordsLoading, refetch: refetchRecords } = useQuery({
        queryKey: ['allegato3b-list', selectedYear, selectedCompanyId, statusFilter, tenantFilterKey],
        queryFn: () => clinicaApi.allegato3B.getAll({
            anno: selectedYear,
            companyTenantProfileId: selectedCompanyId || undefined
        }),
        enabled: isReady
    });

    // Filter records by search and status
    const filteredRecords = useMemo(() => {
        if (!recordsResponse) return [];
        let filtered = recordsResponse;

        // Filter by status if specified
        if (statusFilter) {
            filtered = filtered.filter((record: Allegato3B) => record.stato === statusFilter);
        }

        // Filter by search term
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter((record: Allegato3B) =>
                record.companyTenantProfile?.company?.ragioneSociale?.toLowerCase().includes(search) ||
                record.medicoCompetente?.lastName?.toLowerCase().includes(search) ||
                record.medicoCompetente?.firstName?.toLowerCase().includes(search)
            );
        }

        return filtered;
    }, [recordsResponse, searchTerm, statusFilter]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: Allegato3BCreateInput) => clinicaApi.allegato3B.create(data),
        onSuccess: (result) => {
            showToast({ message: 'Allegato 3B creato e compilato con successo', type: 'success' });
            setIsCreateModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['allegato3b-list'] });
            // Mostra direttamente il dettaglio dell'allegato appena creato
            if (result) {
                setSelectedRecord(result);
                setViewMode('detail');
            }
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore nella creazione dell\'allegato', type: 'error' });
        }
    });

    // Compile mutation
    const compileMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.allegato3B.compile(id),
        onSuccess: (result) => {
            showToast({ message: 'Allegato 3B compilato con successo', type: 'success' });
            setIsCompileModalOpen(false);
            setSelectedRecord(result);
            queryClient.invalidateQueries({ queryKey: ['allegato3b-list'] });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore compilazione', type: 'error' });
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.allegato3B.delete(id),
        onSuccess: () => {
            showToast({ message: 'Allegato 3B eliminato con successo', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['allegato3b-list'] });
            if (viewMode === 'detail') {
                setSelectedRecord(null);
                setViewMode('list');
            }
        },
        onError: () => {
            showToast({ message: 'Errore durante l\'eliminazione', type: 'error' });
        }
    });

    // Quick status update mutation (e.g. mark as "Trasmesso/INVIATO")
    const updateStatoMutation = useMutation({
        mutationFn: ({ id, stato }: { id: string; stato: string }) =>
            clinicaApi.allegato3B.updateStato(id, { stato } as any),
        onSuccess: () => {
            showToast({ message: 'Stato aggiornato con successo', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['allegato3b-list'] });
        },
        onError: () => {
            showToast({ message: 'Errore nell\'aggiornamento dello stato', type: 'error' });
        }
    });

    // Export XML
    const handleExportXML = useCallback(async (id: string) => {
        try {
            const { blob, filename } = await clinicaApi.allegato3B.getXml(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `allegato3b-${id}.xml`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast({ message: 'File XML scaricato', type: 'success' });
        } catch (error) {
            showToast({ message: 'Errore export XML', type: 'error' });
        }
    }, [showToast]);

    // Export ZIP (all XMLs for the year)
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);
    const handleExportZIP = useCallback(async () => {
        setIsDownloadingZip(true);
        try {
            const { blob, filename } = await clinicaApi.allegato3B.getZip(selectedYear);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `allegati_3b_${selectedYear}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast({ message: `ZIP con tutti gli XML del ${selectedYear} scaricato`, type: 'success' });
        } catch (error) {
            showToast({ message: 'Errore download ZIP', type: 'error' });
        } finally {
            setIsDownloadingZip(false);
        }
    }, [showToast, selectedYear]);

    // Generate all allegati for the year
    const generateAllMutation = useMutation({
        mutationFn: (anno: number) => clinicaApi.allegato3B.generateAll(anno),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['allegato3b-list'] });
            showToast({
                type: 'success',
                message: `Generati ${data.creati} allegati per ${data.totaleAziende} aziende (${data.errori} errori)`
            });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore nella generazione massiva degli Allegati 3B' });
        }
    });

    // View record detail
    const handleViewRecord = useCallback((record: Allegato3B) => {
        setSelectedRecord(record);
        setViewMode('detail');
    }, []);

    // Back to list
    const handleBackToList = useCallback(() => {
        setSelectedRecord(null);
        setViewMode('list');
    }, []);

    // Format date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/D';
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // =====================================================
    // RENDER: Filters
    // =====================================================

    const renderFilters = () => (
        <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Year Filter */}
            <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Anno</label>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                >
                    {years.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            {/* Company Filter */}
            <div className="flex-1 max-w-xs">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Azienda</label>
                <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                >
                    <option value="">Tutte le aziende</option>
                    {[...(companiesResponse || [])].sort((a: any, b: any) =>
                        (a.ragioneSociale || '').localeCompare(b.ragioneSociale || '', 'it')
                    ).map((company: { id: string; ragioneSociale?: string; piva?: string; companyTenantProfileId?: string }) => (
                        <option key={company.companyTenantProfileId || company.id} value={company.companyTenantProfileId || company.id}>
                            {company.ragioneSociale || company.piva || company.id}
                        </option>
                    ))}
                </select>
            </div>

            {/* Status Filter */}
            <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Stato</label>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                >
                    <option value="">Tutti</option>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                    ))}
                </select>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-xs">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Cerca</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <input
                        type="text"
                        placeholder="Cerca per azienda, medico..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500"
                    />
                </div>
            </div>

            {/* Refresh */}
            <div className="flex items-end">
                <button
                    onClick={() => refetchRecords()}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    title="Aggiorna"
                >
                    <RefreshCw className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
            </div>
        </div>
    );

    // =====================================================
    // RENDER: Stats Summary
    // =====================================================

    const renderStatsSummary = () => {
        const records = recordsResponse || [];
        const total = records.length;
        const byStatus = records.reduce((acc: Record<string, number>, r: Allegato3B) => {
            acc[r.stato] = (acc[r.stato] || 0) + 1;
            return acc;
        }, {});

        return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Totale</p>
                </div>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    const count = byStatus[key] || 0;
                    return (
                        <div key={key} className={`${config.bgColor} border rounded-lg p-3 text-center`}>
                            <p className={`text-2xl font-bold ${config.color}`}>{count}</p>
                            <p className={`text-xs ${config.color}`}>{config.label}</p>
                        </div>
                    );
                })}
            </div>
        );
    };

    // =====================================================
    // RENDER: Records List
    // =====================================================

    const renderRecordsList = () => {
        if (recordsLoading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    <span className="ml-3 text-gray-500 dark:text-gray-400">Caricamento relazioni...</span>
                </div>
            );
        }

        if (filteredRecords.length === 0) {
            return (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">
                        Nessuna relazione trovata
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {searchTerm ? 'Modifica i criteri di ricerca' : `Non ci sono Allegati 3B per l'anno ${selectedYear}`}
                    </p>
                    {canPerformCRUD && (
                        <CRUDPrimaryButton onClick={() => setIsCreateModalOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Crea Nuovo Allegato 3B
                        </CRUDPrimaryButton>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {filteredRecords.map((record: Allegato3B) => {
                    const statusConfig = STATUS_CONFIG[record.stato] || STATUS_CONFIG['DA_COMPILARE'];
                    const StatusIcon = statusConfig.icon;

                    return (
                        <div
                            key={record.id}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md dark:hover:shadow-black/30 hover:border-teal-300 dark:hover:border-teal-700 transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 cursor-pointer" onClick={() => handleViewRecord(record)}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900 dark:text-gray-50">
                                                {record.companyTenantProfile?.company?.ragioneSociale || 'N/D'}
                                            </h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                Anno {record.anno} - MC: {record.medicoCompetente?.lastName} {record.medicoCompetente?.firstName}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                        <span className={`
                                            flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                            ${statusConfig.bgColor} ${statusConfig.color}
                                        `}>
                                            <StatusIcon className="h-3 w-3" />
                                            {statusConfig.label}
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            {record.statistiche?.totaleOccupati || 0} lavoratori
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            Creato: {formatDate(record.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {/* Quick status → Trasmesso for PRONTO/COMPILATO */}
                                    {(record.stato === 'PRONTO' || record.stato === 'COMPILATO') && canPerformCRUD && (
                                        <CRUDButton
                                            onClick={() => updateStatoMutation.mutate({ id: record.id, stato: 'INVIATO' })}
                                            className="px-2 py-1 text-xs font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors"
                                            title="Segna come trasmesso"
                                        >
                                            <Send className="h-3.5 w-3.5 mr-1 inline" />
                                            Trasmesso
                                        </CRUDButton>
                                    )}
                                    <ActionButton
                                        theme="teal"
                                        actions={[
                                            { label: 'Visualizza', icon: <Eye className="w-4 h-4" />, onClick: () => handleViewRecord(record) },
                                            ...((record.stato === 'BOZZA' || record.stato === 'DA_COMPILARE') && canPerformCRUD ? [{
                                                label: 'Compila', icon: <Edit className="w-4 h-4" />, onClick: () => {
                                                    setSelectedRecord(record);
                                                    setIsCompileModalOpen(true);
                                                }
                                            }] : []),
                                            ...((record.stato === 'COMPILATO' || record.stato === 'PRONTO') && canPerformCRUD ? [{
                                                label: 'Ricompila dati', icon: <RefreshCw className="w-4 h-4" />, onClick: () => {
                                                    setSelectedRecord(record);
                                                    setIsCompileModalOpen(true);
                                                }
                                            }] : []),
                                            ...((record.stato === 'COMPILATO' || record.stato === 'PRONTO' || record.stato === 'INVIATO') ? [{
                                                label: 'Esporta XML', icon: <FileCode className="w-4 h-4" />, onClick: () => handleExportXML(record.id)
                                            }] : []),
                                            ...(record.stato !== 'INVIATO' && record.stato !== 'CONFERMATO' && canPerformCRUD ? [{
                                                label: 'Elimina', icon: <Trash2 className="w-4 h-4" />, onClick: async () => {
                                                    const confirmed = await confirmDialog({
                                                        title: 'Conferma eliminazione',
                                                        message: `Eliminare l'Allegato 3B per ${record.companyTenantProfile?.company?.ragioneSociale || 'N/D'} - Anno ${record.anno}?`,
                                                        variant: 'danger'
                                                    });
                                                    if (confirmed) deleteMutation.mutate(record.id);
                                                },
                                                variant: 'danger' as const
                                            }] : []),
                                        ]}
                                    />
                                    <ChevronRight
                                        className="h-5 w-5 text-gray-400 dark:text-gray-500 cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                                        onClick={() => handleViewRecord(record)}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // =====================================================
    // RENDER: Record Detail
    // =====================================================

    const renderRecordDetail = () => {
        if (!selectedRecord) return null;

        const statusConfig = STATUS_CONFIG[selectedRecord.stato] || STATUS_CONFIG['DA_COMPILARE'];
        const StatusIcon = statusConfig.icon;

        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleBackToList}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2"
                    >
                        ← Torna alla lista
                    </button>
                    <div className="flex items-center gap-2">
                        {(selectedRecord.stato === 'COMPILATO' || selectedRecord.stato === 'PRONTO' || selectedRecord.stato === 'INVIATO') && (
                            <button
                                onClick={() => handleExportXML(selectedRecord.id)}
                                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-gray-50"
                            >
                                <FileCode className="h-4 w-4" />
                                Esporta XML
                            </button>
                        )}
                        {selectedRecord.stato !== 'INVIATO' && selectedRecord.stato !== 'CONFERMATO' && canPerformCRUD && (
                            <CRUDButton
                                onClick={async () => {
                                    const confirmed = await confirmDialog({
                                        title: 'Conferma eliminazione',
                                        message: 'Eliminare questo Allegato 3B?',
                                        variant: 'danger'
                                    });
                                    if (confirmed) {
                                        deleteMutation.mutate(selectedRecord.id);
                                    }
                                }}
                                className="px-4 py-2 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 text-red-600 dark:text-red-400"
                            >
                                <Trash2 className="h-4 w-4" />
                                Elimina
                            </CRUDButton>
                        )}
                        {canPerformCRUD && (
                            <CRUDPrimaryButton
                                onClick={() => setIsCompileModalOpen(true)}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {selectedRecord.stato === 'BOZZA' || selectedRecord.stato === 'DA_COMPILARE' ? 'Compila Dati' : 'Ricompila Dati'}
                            </CRUDPrimaryButton>
                        )}
                    </div>
                </div>

                {/* Status Banner */}
                <div className={`${statusConfig.bgColor} ${statusConfig.color} p-4 rounded-xl flex items-center gap-3`}>
                    <StatusIcon className="h-6 w-6" />
                    <div>
                        <p className="font-semibold">Stato: {statusConfig.label}</p>
                        <p className="text-sm opacity-80">
                            Ultimo aggiornamento: {formatDate(selectedRecord.updatedAt)}
                        </p>
                    </div>
                </div>

                {/* Section: Info Generali */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        Informazioni Generali
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Anno di Riferimento</label>
                            <p className="font-medium text-lg text-gray-900 dark:text-gray-50">{selectedRecord.anno}</p>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Azienda</label>
                            <p className="font-medium text-gray-900 dark:text-gray-50">{selectedRecord.companyTenantProfile?.company?.ragioneSociale || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">P.IVA</label>
                            <p className="font-medium font-mono text-gray-900 dark:text-gray-50">{selectedRecord.companyTenantProfile?.company?.piva || 'N/D'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Codice Fiscale</label>
                            <p className="font-medium text-gray-900 dark:text-gray-50">{selectedRecord.companyTenantProfile?.company?.codiceFiscale || 'N/D'}</p>
                        </div>
                    </div>
                </div>

                {/* Section: Medico Competente */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        Medico Competente
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Nome</label>
                            <p className="font-medium text-gray-900 dark:text-gray-50">
                                {selectedRecord.medicoCompetente ? formatMedicoName(selectedRecord.medicoCompetente) : ''}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section: Dati Statistici */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        Dati Statistici Aggregati
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-gray-900 dark:text-gray-50">{selectedRecord.statistiche?.totaleOccupati || 0}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Lavoratori Totali</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                                {(selectedRecord.statistiche?.visitePreventive || 0) + (selectedRecord.statistiche?.visitePeriodiche || 0)}
                            </p>
                            <p className="text-sm text-green-600 dark:text-green-400">Visite Effettuate</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                                {(selectedRecord.statistiche?.idonei || 0) + (selectedRecord.statistiche?.idoneiConPrescrizioni || 0) + (selectedRecord.statistiche?.idoneiConLimitazioni || 0)}
                            </p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Giudizi Emessi</p>
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{selectedRecord.statistiche?.idoneiConLimitazioni || 0}</p>
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">Con Limitazioni</p>
                        </div>
                    </div>

                    {/* Breakdown by type */}
                    {selectedRecord.statistiche && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Giudizi per Tipologia</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-green-700 dark:text-green-400">{selectedRecord.statistiche.idonei}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Idonei</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{selectedRecord.statistiche.idoneiConPrescrizioni}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Con Prescrizioni</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{selectedRecord.statistiche.idoneiConLimitazioni}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Con Limitazioni</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{selectedRecord.statistiche.nonIdoneiTemporanei}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Non Idonei Temp.</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                                    <p className="text-lg font-bold text-red-800 dark:text-red-500">{selectedRecord.statistiche.nonIdoneiPermanenti}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Non Idonei Perm.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rischi */}
                    {selectedRecord.statistiche?.statistichePerRischio && selectedRecord.statistiche.statistichePerRischio.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Rischi Principali</h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedRecord.statistiche.statistichePerRischio.map((rischio, idx: number) => (
                                    <span key={idx} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm">
                                        {rischio.tipoRischio}: {rischio.lavoratoriEsposti} esposti
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Section: Malattie Professionali */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        Malattie Professionali
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                        <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                                {selectedRecord.statistiche?.malattieRilevate || 0}
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400">Rilevate</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                                {selectedRecord.statistiche?.malattieDeununciate || 0}
                            </p>
                            <p className="text-sm text-orange-600 dark:text-orange-400">Denunciate</p>
                        </div>
                    </div>
                </div>

                {/* Note */}
                {selectedRecord.note && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Note</h3>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedRecord.note}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                    <p>Allegato 3B - D.Lgs 81/08 Art. 40 - Relazione Annuale Medico Competente</p>
                    <p>Documento generato il {formatDate(selectedRecord.createdAt)}</p>
                </div>
            </div>
        );
    };

    // =====================================================
    // RENDER: Create Modal
    // =====================================================

    const renderCreateModal = () => {
        // P59: Stati spostati a livello componente per supportare query params

        const handleCreate = () => {
            if (!newCompanyId) {
                showToast({ message: 'Seleziona un\'azienda', type: 'error' });
                return;
            }
            if (!newMedicoId) {
                showToast({ message: 'Nessun medico competente attivo trovato per questa azienda. Verifica le nomine prima di creare l\'Allegato 3B.', type: 'error' });
                return;
            }
            createMutation.mutate({
                anno: newAnno,
                companyTenantProfileId: newCompanyId,
                medicoCompetenteId: newMedicoId,
                statisticheOverride
            });
        };

        // Reset stati quando la modale si chiude
        const handleClose = () => {
            setIsCreateModalOpen(false);
            setNewCompanyId('');
            setNewMedicoId('');
            setNewAnno(new Date().getFullYear() - 1);
            setCompanySearch('');
            setStatisticheOverride({});
            setIsCompanyDropdownOpen(false);
        };

        const medicoName = selectedCreateCompany?.medicoCompetente || null;
        const hasFiscalData = Boolean(selectedCreateCompany?.piva || selectedCreateCompany?.codiceFiscale);
        const checks = [
            {
                label: 'Azienda',
                ok: Boolean(newCompanyId),
                detail: selectedCreateCompany?.ragioneSociale || companySearch || 'Da selezionare'
            },
            {
                label: 'Identificativi fiscali',
                ok: hasFiscalData,
                detail: hasFiscalData
                    ? [selectedCreateCompany?.piva && `P.IVA ${selectedCreateCompany.piva}`, selectedCreateCompany?.codiceFiscale && `CF ${selectedCreateCompany.codiceFiscale}`].filter(Boolean).join(' • ')
                    : 'P.IVA o codice fiscale assenti'
            },
            {
                label: 'Medico competente',
                ok: Boolean(newMedicoId && medicoName),
                detail: medicoName || 'Nessuna nomina attiva trovata'
            },
            {
                label: 'Anno comunicazione',
                ok: Boolean(newAnno),
                detail: String(newAnno)
            }
        ];

        return (
            <Modal
                isOpen={isCreateModalOpen}
                onClose={handleClose}
                title="Nuovo Allegato 3B"
                size="full"
                overlayClassName="items-start pt-8"
                className="max-w-7xl max-h-[92vh]"
                bodyClassName="max-h-[calc(92vh-96px)] overflow-y-auto p-0"
            >
                <div className="space-y-5 p-5">
                    {/* Anno */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Anno di Riferimento
                        </label>
                        <select
                            value={newAnno}
                            onChange={(e) => setNewAnno(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Azienda — ricerca con dropdown */}
                    <div ref={companyDropdownRef} className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Azienda <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={companySearch}
                                onChange={(e) => {
                                    setCompanySearch(e.target.value);
                                    setIsCompanyDropdownOpen(true);
                                    if (!e.target.value) {
                                        setNewCompanyId('');
                                        setNewMedicoId('');
                                    }
                                }}
                                onFocus={() => setIsCompanyDropdownOpen(true)}
                                placeholder="Cerca azienda per nome o P.IVA..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm"
                            />
                        </div>
                        {newCompanyId && !isCompanyDropdownOpen && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Selezionata: {companySearch}</span>
                            </div>
                        )}
                        {isCompanyDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                                {sortedFilteredCompanies.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Nessuna azienda trovata</div>
                                ) : (
                                    sortedFilteredCompanies.map((company) => (
                                        <button
                                            key={company.companyTenantProfileId || company.id}
                                            type="button"
                                            onClick={() => {
                                                setNewCompanyId(company.companyTenantProfileId || company.id);
                                                setNewMedicoId('');
                                                setCompanySearch(company.ragioneSociale || company.piva || company.id);
                                                setIsCompanyDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/30 ${(company.companyTenantProfileId || company.id) === newCompanyId ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 font-medium' : 'text-gray-900 dark:text-gray-50'
                                                }`}
                                        >
                                            {company.ragioneSociale || company.piva || company.id}
                                            {company.piva && company.ragioneSociale && (
                                                <span className="ml-2 text-xs text-gray-400">P.IVA {company.piva}</span>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Medico Competente — auto-selezionato da nomina attiva */}
                    {newCompanyId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                                <Stethoscope className="h-4 w-4 text-teal-500" />
                                Medico Competente
                            </label>

                            {medicoName ? (
                                <div className="flex items-start gap-3 px-3 py-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                                    <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-teal-800 dark:text-teal-200 text-sm">{medicoName}</p>
                                        <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">
                                            Auto-selezionato dalla nomina attiva
                                            · {selectedCreateCompany?.nomineCount || 1} nomina/e attiva/e
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 px-3 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                            Nessun Medico Competente nominato
                                        </p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                            Aggiungi una nomina attiva nella sezione Nomine Ruoli prima di creare l'Allegato 3B.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {newCompanyId && (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-100 dark:border-teal-800">
                                <div>
                                    <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">Preview campi XML INAIL</p>
                                    <p className="text-xs text-teal-700 dark:text-teal-300">Controlla i dati aggregati prima di creare il file.</p>
                                </div>
                                {isPreviewLoading && <Loader2 className="h-4 w-4 animate-spin text-teal-600" />}
                            </div>
                            {createPreview?.xmlPreview ? (
                                <div className="max-h-[58vh] space-y-3 overflow-y-auto p-3 pr-4">
                                    {createPreview.xmlPreview.errors.length > 0 && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                            {createPreview.xmlPreview.errors.map(error => <p key={error}>{error}</p>)}
                                        </div>
                                    )}
                                    {createPreview.xmlPreview.warnings.length > 0 && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                            {createPreview.xmlPreview.warnings.map(warning => <p key={warning}>{warning}</p>)}
                                        </div>
                                    )}
                                    <div className="grid gap-3 xl:grid-cols-2">
                                    {createPreview.xmlPreview.fieldGroups.map(group => (
                                        <div key={group.title} className="rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{group.title}</p>
                                            </div>
                                            <div className="grid gap-2 p-3 sm:grid-cols-2">
                                                {group.fields.map(field => {
                                                    const overrideKey = field.key as keyof NonNullable<Allegato3BCreateInput['statisticheOverride']> | undefined;
                                                    const value = overrideKey && field.editable
                                                        ? (statisticheOverride[overrideKey] ?? field.value ?? 0)
                                                        : field.value;
                                                    return (
                                                        <label key={`${group.title}-${field.label}`} className="min-w-0 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                                                            <span className="block text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                                                {field.label}{field.required ? ' *' : ''}
                                                            </span>
                                                            {field.editable && overrideKey ? (
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={Number(value) || 0}
                                                                    onChange={(event) => setStatisticheOverride(prev => ({
                                                                        ...prev,
                                                                        [overrideKey]: Number(event.target.value) || 0
                                                                    }))}
                                                                    className="mt-1 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                                                                />
                                                            ) : (
                                                                <span className="mt-1 block truncate text-sm text-gray-800 dark:text-gray-100">
                                                                    {field.type === 'json'
                                                                        ? JSON.stringify(value ?? {})
                                                                        : String(value ?? '—')}
                                                                </span>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 text-sm text-gray-500">Seleziona azienda e anno per generare la preview.</div>
                            )}
                        </div>
                    )}

                    {newCompanyId && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                                    Controlli prima della compilazione
                                </p>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {checks.map(check => (
                                    <div key={check.label} className="flex items-start gap-3 px-3 py-2.5">
                                        {check.ok ? (
                                            <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{check.label}</p>
                                            <p className={`text-xs ${check.ok ? 'text-gray-500 dark:text-gray-400' : 'text-amber-700 dark:text-amber-300'}`}>
                                                {check.detail}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            L'Allegato 3B verrà creato come bozza. I dati statistici verranno calcolati automaticamente alla compilazione.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-50"
                        >
                            Annulla
                        </button>
                        <CRUDPrimaryButton
                            onClick={handleCreate}
                            disabled={createMutation.isPending || !newCompanyId || !newMedicoId || createPreview?.xmlPreview?.valid === false}
                        >
                            {createMutation.isPending ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Creazione…
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crea Allegato 3B
                                </>
                            )}
                        </CRUDPrimaryButton>
                    </div>
                </div>
            </Modal>
        );
    };

    // =====================================================
    // RENDER: Compile Modal
    // =====================================================

    const renderCompileModal = () => {
        if (!selectedRecord) return null;

        const handleCompile = () => {
            compileMutation.mutate(selectedRecord.id);
        };

        return (
            <Modal
                isOpen={isCompileModalOpen}
                onClose={() => setIsCompileModalOpen(false)}
                title="Compila Allegato 3B"
            >
                <div className="p-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                            <strong>Attenzione:</strong> La compilazione calcolerà automaticamente tutti i dati
                            statistici dall'archivio delle visite e dei giudizi di idoneità per l'anno {selectedRecord.anno}.
                        </p>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <p><strong>Azienda:</strong> {selectedRecord.companyTenantProfile?.company?.ragioneSociale}</p>
                        <p><strong>Anno:</strong> {selectedRecord.anno}</p>
                        <p><strong>Stato attuale:</strong> {STATUS_CONFIG[selectedRecord.stato]?.label}</p>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsCompileModalOpen(false)}
                            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-50"
                        >
                            Annulla
                        </button>
                        <CRUDPrimaryButton
                            onClick={handleCompile}
                            disabled={compileMutation.isPending}
                        >
                            {compileMutation.isPending ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Compilazione...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Compila Dati
                                </>
                            )}
                        </CRUDPrimaryButton>
                    </div>
                </div>
            </Modal>
        );
    };

    // =====================================================
    // MAIN RENDER
    // =====================================================

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                            <FileText className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                        </div>
                        Allegato 3B - Relazioni Annuali
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Relazione annuale attività del Medico Competente - D.Lgs 81/08 Art. 40
                    </p>
                </div>
                {viewMode === 'list' && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleExportZIP}
                            disabled={isDownloadingZip || !filteredRecords.length}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title={`Scarica tutti gli XML del ${selectedYear} in formato ZIP`}
                        >
                            {isDownloadingZip ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            ZIP Anno {selectedYear}
                        </button>
                        {canPerformCRUD && (
                            <button
                                onClick={() => generateAllMutation.mutate(selectedYear)}
                                disabled={generateAllMutation.isPending}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-teal-300 rounded-lg text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title={`Genera e compila Allegato 3B per tutte le aziende con MC attivo per il ${selectedYear}`}
                            >
                                {generateAllMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Genera Tutti {selectedYear}
                            </button>
                        )}
                        {canPerformCRUD && (
                            <CRUDPrimaryButton onClick={() => setIsCreateModalOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuovo Allegato 3B
                            </CRUDPrimaryButton>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            {viewMode === 'list' ? (
                <>
                    {renderFilters()}
                    {renderStatsSummary()}
                    {renderRecordsList()}
                </>
            ) : (
                renderRecordDetail()
            )}

            {/* Modals */}
            {renderCreateModal()}
            {renderCompileModal()}
        </div>
    );
};

export default Allegato3BPage;
