/**
 * GiudiziIdoneitaPage - Gestione Giudizi di Idoneità
 * 
 * Pagina per la gestione dei giudizi di idoneità del Medico Competente
 * secondo Art. 41 D.Lgs 81/08.
 * 
 * @module pages/clinica/mdl/GiudiziIdoneitaPage
 * @project P56 - Medicina del Lavoro Sistema Completo
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    FileCheck,
    Plus,
    Search,
    AlertTriangle,
    User,
    Calendar,
    Clock,
    Filter,
    Edit2,
    Trash2,
    Bell,
    Scale,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    AlertOctagon,
    Pause,
    Mail,
    Send,
    ChevronDown,
    LayoutList,
    Stethoscope,
    FileDown,
    FilePlus2,
    Activity,
    X,
    UserCheck,
    Building,
    PenTool
} from 'lucide-react';
import {
    clinicaApi,
    type GiudizioIdoneita,
    type TipoGiudizioIdoneita,
    type StatoGiudizio,
    type PecLog
} from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useViewMode } from '../../../hooks/useViewMode';
import { ViewModeToggle } from '../../../components/clinica/ViewModeToggle';
import { ActionMenu, createCrudActions } from '@/components/ui/ActionMenu';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { formatMedicoName } from '../../../utils/textFormatters';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';
import { ElegantSelect } from '@/components/ui/ElegantSelect';
import GiudizioFormModal from './components/GiudizioFormModal';
import GiudizioRicorsoModal from './components/GiudizioRicorsoModal';
import GiudizioFirmaModal from './components/GiudizioFirmaModal';
import BatchSendModal from './components/BatchSendModal';
import BatchForceSendModal from './components/BatchForceSendModal';
import { useAuth } from '../../../context/AuthContext';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Judgment type labels and colors
const JUDGMENT_TYPES: Record<TipoGiudizioIdoneita, { label: string; color: string; icon: React.ReactNode }> = {
    IDONEO: {
        label: 'Idoneo',
        color: 'bg-green-100 text-green-700',
        icon: <CheckCircle2 className="h-4 w-4" />
    },
    IDONEO_CON_PRESCRIZIONI: {
        label: 'Idoneo parziale con prescrizioni',
        color: 'bg-yellow-100 text-yellow-700',
        icon: <AlertTriangle className="h-4 w-4" />
    },
    IDONEO_CON_LIMITAZIONI: {
        label: 'Idoneo parziale con limitazioni',
        color: 'bg-orange-100 text-orange-700',
        icon: <AlertOctagon className="h-4 w-4" />
    },
    IDONEO_CON_LIMITAZIONI_PRESCRIZIONI: {
        label: 'Idoneo parziale con limitazioni e prescrizioni',
        color: 'bg-amber-100 text-amber-700',
        icon: <AlertTriangle className="h-4 w-4" />
    },
    NON_IDONEO_TEMPORANEO: {
        label: 'Temp. non idoneo',
        color: 'bg-red-100 text-red-700',
        icon: <Pause className="h-4 w-4" />
    },
    NON_IDONEO_PERMANENTE: {
        label: 'Non idoneo',
        color: 'bg-red-200 text-red-800',
        icon: <XCircle className="h-4 w-4" />
    }
};

// Status labels and colors
const STATUS_LABELS: Record<StatoGiudizio, { label: string; color: string }> = {
    BOZZA: { label: 'Bozza', color: 'bg-gray-100 text-gray-600' },
    VALIDO: { label: 'Valido', color: 'bg-green-100 text-green-700' },
    SCADUTO: { label: 'Scaduto', color: 'bg-red-100 text-red-700' },
    SOSTITUITO: { label: 'Sostituito', color: 'bg-gray-100 text-gray-700' },
    RICORRIBILE: { label: 'Ricorribile', color: 'bg-yellow-100 text-yellow-700' },
    RICORSO_IN_CORSO: { label: 'Ricorso in corso', color: 'bg-purple-100 text-purple-700' }
};

const getAziendaFromGiudizio = (g: GiudizioIdoneita): string => {
    const fromMansione = g.mansioni?.find(m => (m.mansione as any)?.site?.companyTenantProfile?.company?.ragioneSociale);
    if (fromMansione) return (fromMansione.mansione as any).site.companyTenantProfile.company.ragioneSociale as string;
    return (g.visita as any)?.appuntamento?.companyTenantProfile?.company?.ragioneSociale || '';
};

const GiudiziIdoneitaPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isRicorsoPath = location.pathname.endsWith('/ricorso');
    const { id: urlGiudizioId } = useParams<{ id?: string }>();
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Auth — detect Company Manager to auto-filter by their company
    const { user } = useAuth();
    const isCompanyManager = user?.roles?.includes('COMPANY_MANAGER') &&
        !user?.roles?.some((r: string) => ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'].includes(r));
    const companyManagerCompanyId = isCompanyManager ? (user as any)?.companyTenantProfileId : undefined;

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTipo, setFilterTipo] = useState<TipoGiudizioIdoneita | ''>('');
    const [filterStato, setFilterStato] = useState<StatoGiudizio | ''>('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterMedicoId, setFilterMedicoId] = useState('');
    const [filterMansione, setFilterMansione] = useState('');
    const [groupByDay, setGroupByDay] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [giudizioToDelete, setGiudizioToDelete] = useState<GiudizioIdoneita | null>(null);
    const [deletionReason, setDeletionReason] = useState('');
    const [notifyModalOpen, setNotifyModalOpen] = useState(false);
    const [giudizioToNotify, setGiudizioToNotify] = useState<GiudizioIdoneita | null>(null);

    // Form Modal state
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [giudizioToEdit, setGiudizioToEdit] = useState<GiudizioIdoneita | null>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

    // Ricorso Modal state
    const [ricorsoModalOpen, setRicorsoModalOpen] = useState(false);
    const [giudizioForRicorso, setGiudizioForRicorso] = useState<GiudizioIdoneita | null>(null);

    // Batch send modal
    const [batchSendModalOpen, setBatchSendModalOpen] = useState(false);
    // Force-send (invio sicuro selezionato) modal
    const [forceSendModalOpen, setForceSendModalOpen] = useState(false);

    // Firma lavoratore modal
    const [firmaModalOpen, setFirmaModalOpen] = useState(false);
    const [giudizioForFirma, setGiudizioForFirma] = useState<GiudizioIdoneita | null>(null);

    // Firma medico modal
    const [firmaMedicoModalOpen, setFirmaMedicoModalOpen] = useState(false);
    const [giudizioForFirmaMedico, setGiudizioForFirmaMedico] = useState<GiudizioIdoneita | null>(null);

    // Helper: apre il form modal in modalità edit per un giudizio
    const openEditModal = useCallback((giudizio: GiudizioIdoneita) => {
        setGiudizioToEdit(giudizio);
        setFormMode('edit');
        setFormModalOpen(true);
    }, []);

    // PEC Modal state
    const [pecModalOpen, setPecModalOpen] = useState(false);
    const [giudizioForPec, setGiudizioForPec] = useState<GiudizioIdoneita | null>(null);
    const [pecRecipient, setPecRecipient] = useState<'lavoratore' | 'datore' | 'both'>('both');
    const [pecLogsModalOpen, setPecLogsModalOpen] = useState(false);
    const [pecLogs, setPecLogs] = useState<PecLog[]>([]);

    // View mode with localStorage persistence
    // viewMode 'list' = tabella (default), 'grid' = card per azienda
    const { viewMode, setViewMode } = useViewMode({ storageKey: 'giudizi-mdl', defaultMode: 'list' });
    // Azienda selezionata in vista card (drill-in)
    const [selectedAzienda, setSelectedAzienda] = useState<string | null>(null);

    // Query params with tenant filter
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            search: searchTerm || undefined,
            tipoGiudizio: filterTipo || undefined,
            stato: filterStato || undefined,
            dateFrom: filterDateFrom || undefined,
            dateTo: filterDateTo || undefined,
            medicoCompetenteId: filterMedicoId || undefined,
            mansione: filterMansione || undefined,
            ...(companyManagerCompanyId && { companyTenantProfileId: companyManagerCompanyId }),
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [searchTerm, filterTipo, filterStato, filterDateFrom, filterDateTo, filterMedicoId, filterMansione, getTenantFilterParams, tenantFilterKey, companyManagerCompanyId]);

    // Fetch giudizi
    const { data: giudiziResponse, isLoading, error } = useQuery({
        queryKey: ['giudizi-idoneita', queryParams, tenantFilterKey],
        queryFn: () => clinicaApi.giudiziIdoneita.getAll(queryParams),
        enabled: isReady
    });

    // Fetch expiring giudizi
    const { data: expiringGiudizi } = useQuery({
        queryKey: ['giudizi-idoneita-expiring', tenantFilterKey],
        queryFn: () => clinicaApi.giudiziIdoneita.getExpiring(30),
        enabled: isReady
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => clinicaApi.giudiziIdoneita.delete(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
            showToast({ type: 'success', message: 'Giudizio eliminato con successo' });
            setDeleteModalOpen(false);
            setGiudizioToDelete(null);
            setDeletionReason('');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Notify worker mutation
    const notifyWorkerMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.giudiziIdoneita.notifyWorker(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
            showToast({ type: 'success', message: 'Notifica inviata al lavoratore' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'invio notifica' });
        }
    });

    // Notify employer mutation
    const notifyEmployerMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.giudiziIdoneita.notifyEmployer(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
            showToast({ type: 'success', message: 'Notifica inviata al datore di lavoro' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'invio notifica' });
        }
    });

    // Generate PDF documents mutation
    // Apre il PDF generato on-demand (rotta autenticata): evita 404 su URL statici obsoleti
    // e applica sempre firma/posizione + header tenant corretti.
    const openGiudizioPdf = useCallback(async (id: string, destinatario: 'lavoratore' | 'datore') => {
        try {
            const blob = await clinicaApi.giudiziIdoneita.fetchPdfBlob(id, destinatario);
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (win) setTimeout(() => URL.revokeObjectURL(url), 60000);
            else URL.revokeObjectURL(url);
        } catch {
            showToast({ type: 'error', message: 'Impossibile aprire il PDF del giudizio' });
        }
    }, [showToast]);

    const generateDocsMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.giudiziIdoneita.generateDocuments(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
            showToast({ type: 'success', message: 'Documenti PDF generati con successo' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante la generazione dei PDF' });
        }
    });

    // PEC send mutation - invia giudizio via PEC certificata
    const sendPecMutation = useMutation({
        mutationFn: async ({ giudizioId, recipient }: { giudizioId: string; recipient: 'lavoratore' | 'datore' | 'both' }) => {
            if (recipient === 'lavoratore') {
                return clinicaApi.pec.sendToWorker(giudizioId);
            } else if (recipient === 'datore') {
                return clinicaApi.pec.sendToEmployer(giudizioId);
            } else {
                return clinicaApi.pec.sendToBoth(giudizioId);
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
            const recipientLabel = variables.recipient === 'lavoratore'
                ? 'al lavoratore'
                : variables.recipient === 'datore'
                    ? 'al datore di lavoro'
                    : 'a lavoratore e datore';
            showToast({
                type: 'success',
                message: `PEC inviata con successo ${recipientLabel}`
            });
            setPecModalOpen(false);
            setGiudizioForPec(null);
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                message: 'Errore durante l\'invio PEC'
            });
        }
    });

    // Extract data
    const giudizi = giudiziResponse?.data || [];
    const pagination = giudiziResponse?.pagination;

    // Se la pagina viene aperta con un :id nell'URL, apri il modal appropriato.
    // Se il path termina con /ricorso, apri il GiudizioRicorsoModal.
    React.useEffect(() => {
        if (urlGiudizioId && giudizi.length > 0 && !formModalOpen && !ricorsoModalOpen) {
            const target = giudizi.find(g => g.id === urlGiudizioId);
            if (target) {
                if (isRicorsoPath) {
                    setGiudizioForRicorso(target);
                    setRicorsoModalOpen(true);
                } else {
                    openEditModal(target);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlGiudizioId, giudizi.length, isRicorsoPath]);

    // Day-grouped helper — groups giudizi by emission date for calendar-style display
    const giudiziGroupedByDay = useMemo(() => {
        if (!groupByDay) return null;
        const groups: Record<string, GiudizioIdoneita[]> = {};
        for (const g of giudizi) {
            const day = g.dataEmissione
                ? new Date(g.dataEmissione).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                : 'Senza data';
            if (!groups[day]) groups[day] = [];
            groups[day].push(g);
        }
        return Object.entries(groups);
    }, [groupByDay, giudizi]);

    // Raggruppamento per azienda (vista card)
    const giudiziByAzienda = useMemo(() => {
        const groups: Record<string, GiudizioIdoneita[]> = {};
        for (const g of giudizi) {
            const azienda = getAziendaFromGiudizio(g) || 'Senza azienda';
            if (!groups[azienda]) groups[azienda] = [];
            groups[azienda].push(g);
        }
        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [giudizi]);

    // Lista giudizi effettivamente mostrata nella tabella (filtrata per azienda in drill-in)
    const displayedGiudizi = useMemo(() => {
        if (viewMode === 'grid' && selectedAzienda) {
            return giudizi.filter(g => (getAziendaFromGiudizio(g) || 'Senza azienda') === selectedAzienda);
        }
        return giudizi;
    }, [giudizi, viewMode, selectedAzienda]);

    // Handlers
    const handleDelete = useCallback(() => {
        if (giudizioToDelete && deletionReason.length >= 10) {
            deleteMutation.mutate({ id: giudizioToDelete.id, reason: deletionReason });
        }
    }, [giudizioToDelete, deletionReason, deleteMutation]);

    const handleNotifyWorker = useCallback((giudizio: GiudizioIdoneita) => {
        notifyWorkerMutation.mutate(giudizio.id);
    }, [notifyWorkerMutation]);

    const handleNotifyEmployer = useCallback((giudizio: GiudizioIdoneita) => {
        notifyEmployerMutation.mutate(giudizio.id);
    }, [notifyEmployerMutation]);

    // Handler PEC: apre il modal per inviare via PEC
    const handleOpenPecModal = useCallback((giudizio: GiudizioIdoneita) => {
        setGiudizioForPec(giudizio);
        setPecRecipient('both');
        setPecModalOpen(true);
    }, []);

    // Handler PEC: esegue l'invio
    const handleSendPec = useCallback(() => {
        if (giudizioForPec) {
            sendPecMutation.mutate({
                giudizioId: giudizioForPec.id,
                recipient: pecRecipient
            });
        }
    }, [giudizioForPec, pecRecipient, sendPecMutation]);

    // Handler PEC: visualizza log PEC per un giudizio
    const handleViewPecLogs = useCallback(async (giudizio: GiudizioIdoneita) => {
        try {
            const logs = await clinicaApi.pec.getLogsForGiudizio(giudizio.id);
            setPecLogs(logs);
            setPecLogsModalOpen(true);
        } catch (error) {
            showToast({
                type: 'error',
                message: 'Errore nel recupero log PEC'
            });
        }
    }, [showToast]);

    // Format date
    const formatDate = useCallback((dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('it-IT');
    }, []);

    // Check if giudizio is expiring soon (30 days)
    const isExpiringSoon = useCallback((giudizio: GiudizioIdoneita) => {
        if (!giudizio.dataScadenza) return false;
        const days = Math.ceil((new Date(giudizio.dataScadenza).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days > 0 && days <= 30;
    }, []);

    // Loading state
    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento giudizi...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-medium">Errore nel caricamento</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {'Errore sconosciuto'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileCheck className="h-7 w-7 text-teal-600" />
                        Giudizi di Idoneità
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gestione giudizi Medico Competente - Art. 41 D.Lgs 81/08
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setBatchSendModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                        title="Genera PDF e invia email/ZIP per i giudizi di oggi"
                    >
                        <Send className="h-4 w-4" />
                        Genera e Invia Oggi
                    </button>
                    <button
                        onClick={() => setForceSendModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                        title="Forza invio dei giudizi non ancora inviati, con selezione e scelta destinatario"
                    >
                        <Mail className="h-4 w-4" />
                        Forza Invio
                    </button>
                    <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                    <CRUDPrimaryButton
                        onClick={() => {
                            setGiudizioToEdit(null);
                            setFormMode('create');
                            setFormModalOpen(true);
                        }}
                        className="btn-clinica-primary inline-flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Nuovo Giudizio
                    </CRUDPrimaryButton>
                </div>
            </div>

            {/* Expiring Alert */}
            {expiringGiudizi && expiringGiudizi.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-yellow-800">
                                {expiringGiudizi.length} giudizi in scadenza
                            </h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                Ci sono giudizi che scadranno nei prossimi 30 giorni.
                                Pianifica le visite di rinnovo.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
                {/* Primary filters row */}
                <div className="p-3 flex flex-col md:flex-row md:flex-wrap md:items-center gap-2">
                    {/* Search */}
                    <div className="flex-1 relative min-w-[14rem]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cerca lavoratore, medico, azienda..."
                            className="input-clinica w-full text-sm"
                            style={{ paddingLeft: '2.25rem', paddingRight: searchTerm ? '2rem' : undefined }}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Tipo filter */}
                    <div className="w-full md:w-44 flex-shrink-0">
                        <ElegantSelect
                            value={filterTipo}
                            onChange={(v) => setFilterTipo(v as TipoGiudizioIdoneita | '')}
                            placeholder="Tutti i tipi"
                            options={[
                                { value: '', label: 'Tutti i tipi' },
                                ...Object.entries(JUDGMENT_TYPES).map(([value, { label }]) => ({ value, label }))
                            ]}
                        />
                    </div>

                    {/* Stato filter */}
                    <div className="w-full md:w-40 flex-shrink-0">
                        <ElegantSelect
                            value={filterStato}
                            onChange={(v) => setFilterStato(v as StatoGiudizio | '')}
                            placeholder="Tutti gli stati"
                            options={[
                                { value: '', label: 'Tutti gli stati' },
                                ...Object.entries(STATUS_LABELS).map(([value, { label }]) => ({ value, label }))
                            ]}
                        />
                    </div>

                    {/* Advanced filters toggle */}
                    <button
                        onClick={() => setShowAdvancedFilters(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${showAdvancedFilters ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        Filtri
                        {(filterDateFrom || filterDateTo || filterMedicoId || filterMansione) && (
                            <span className="ml-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-teal-500 text-white text-[10px] font-bold">
                                {[filterDateFrom, filterDateTo, filterMedicoId, filterMansione].filter(Boolean).length}
                            </span>
                        )}
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Clear all */}
                    {(searchTerm || filterTipo || filterStato || filterDateFrom || filterDateTo || filterMedicoId || filterMansione) && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterTipo('');
                                setFilterStato('');
                                setFilterDateFrom('');
                                setFilterDateTo('');
                                setFilterMedicoId('');
                                setFilterMansione('');
                            }}
                            className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
                        >
                            <X className="h-3 w-3" />
                            Pulisci
                        </button>
                    )}
                </div>

                {/* Quick filter chips */}
                <div className="px-3 pb-2 flex items-center gap-2 flex-wrap border-t border-gray-50 pt-2">
                    <span className="text-xs text-gray-400 font-medium">Rapidi:</span>
                    {(['VALIDO', 'SCADUTO', 'RICORSO_IN_CORSO'] as StatoGiudizio[]).map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStato(filterStato === s ? '' : s)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${filterStato === s
                                ? STATUS_LABELS[s]?.color + ' border-current'
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            {STATUS_LABELS[s]?.label ?? s}
                        </button>
                    ))}
                </div>

                {/* Advanced filters (date range, medico, mansione, group-by-day) */}
                {showAdvancedFilters && (
                    <div className="px-3 pb-3 pt-2 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Date from */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Data emissione da</label>
                            <DatePickerElegante
                                value={filterDateFrom}
                                onChange={(date) => setFilterDateFrom(date ? date.toISOString().split('T')[0] : '')}
                                label=""
                            />
                        </div>
                        {/* Date to */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Data emissione a</label>
                            <DatePickerElegante
                                value={filterDateTo}
                                onChange={(date) => setFilterDateTo(date ? date.toISOString().split('T')[0] : '')}
                                label=""
                            />
                        </div>
                        {/* Medico competente */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                                <Stethoscope className="h-3 w-3" /> Medico competente
                            </label>
                            <input
                                type="text"
                                value={filterMedicoId}
                                onChange={(e) => setFilterMedicoId(e.target.value)}
                                placeholder="ID medico..."
                                className="input-clinica w-full"
                            />
                        </div>
                        {/* Mansione */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mansione</label>
                            <input
                                type="text"
                                value={filterMansione}
                                onChange={(e) => setFilterMansione(e.target.value)}
                                placeholder="Cerca mansione..."
                                className="input-clinica w-full"
                            />
                        </div>

                        {/* Raggruppa per giorno */}
                        <div className="lg:col-span-4 flex items-center justify-between pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={groupByDay}
                                    onChange={(e) => setGroupByDay(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                <LayoutList className="h-4 w-4 text-gray-500" />
                                Raggruppa per giorno
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Summary */}
            {pagination && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-100 rounded-lg">
                                <FileCheck className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                                <p className="text-sm text-gray-500">Totali</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {giudizi.filter(g => g.stato === 'VALIDO').length}
                                </p>
                                <p className="text-sm text-gray-500">Validi</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Clock className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {expiringGiudizi?.length || 0}
                                </p>
                                <p className="text-sm text-gray-500">In scadenza</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <XCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {giudizi.filter(g => g.stato === 'SCADUTO').length}
                                </p>
                                <p className="text-sm text-gray-500">Scaduti</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Scale className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {giudizi.filter(g => g.stato === 'RICORSO_IN_CORSO').length}
                                </p>
                                <p className="text-sm text-gray-500">In ricorso</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Giudizi List */}
            {giudizi.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <FileCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm || filterTipo || filterStato
                            ? 'Nessun giudizio trovato'
                            : 'Nessun giudizio registrato'}
                    </h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm || filterTipo || filterStato
                            ? 'Prova a modificare i criteri di ricerca'
                            : 'Inizia emettendo il primo giudizio di idoneità'
                        }
                    </p>
                </div>
            ) : groupByDay && giudiziGroupedByDay ? (
                /* Day-grouped view */
                <div className="space-y-6">
                    {giudiziGroupedByDay.map(([dayLabel, dayGiudizi]) => (
                        <div key={dayLabel}>
                            <div className="flex items-center gap-3 mb-3">
                                <Calendar className="h-4 w-4 text-teal-600" />
                                <h3 className="text-sm font-semibold text-teal-700 capitalize">{dayLabel}</h3>
                                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{dayGiudizi.length}</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {dayGiudizi.map(giudizio => {
                                            const tipoInfo = JUDGMENT_TYPES[giudizio.tipoGiudizio];
                                            const expiring = isExpiringSoon(giudizio);
                                            return (
                                                <tr
                                                    key={giudizio.id}
                                                    className={`hover:bg-gray-50 cursor-pointer ${expiring ? 'bg-yellow-50' : ''}`}
                                                    onClick={() => openEditModal(giudizio)}
                                                >
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-gray-400" />
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {giudizio.person?.firstName} {giudizio.person?.lastName}
                                                            </span>
                                                            {giudizio.mansioni && giudizio.mansioni.length > 0 && (
                                                                <span className="text-xs text-gray-400">· {giudizio.mansioni.map(m => m.mansione?.denominazione).filter(Boolean).join(', ')}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${tipoInfo?.color || 'bg-gray-100 text-gray-700'}`}>
                                                            {tipoInfo?.icon}
                                                            {tipoInfo?.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        {giudizio.medicoCompetente ? formatMedicoName(giudizio.medicoCompetente) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        Scad. {formatDate(giudizio.dataScadenza)}
                                                        {expiring && <Clock className="inline ml-1 h-3 w-3 text-yellow-500" />}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            ) : viewMode === 'grid' && !selectedAzienda ? (
                /* Card View — aziende */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {giudiziByAzienda.map(([azienda, list]) => {
                        const validi = list.filter(g => g.stato === 'VALIDO').length;
                        const nonInviati = list.filter(g => !g.notificatoLavoratore || !g.notificatoDatoreLavoro).length;
                        return (
                            <button
                                key={azienda}
                                onClick={() => setSelectedAzienda(azienda)}
                                className="text-left bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-teal-300 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2.5 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors">
                                        <Building className="h-5 w-5 text-teal-600" />
                                    </div>
                                    <span className="text-2xl font-bold text-gray-900">{list.length}</span>
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2" title={azienda}>{azienda}</h3>
                                <p className="text-xs text-gray-500 mb-3">{list.length} giudizi · {validi} validi</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {nonInviati > 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                                            <Send className="h-3 w-3" />
                                            {nonInviati} da inviare
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Tutti inviati
                                        </span>
                                    )}
                                    <span className="ml-auto text-xs text-teal-600 font-medium group-hover:underline">Apri →</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                /* Table View */
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                    {viewMode === 'grid' && selectedAzienda && (
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setSelectedAzienda(null)}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
                            >
                                <ChevronDown className="h-4 w-4 rotate-90" />
                                Tutte le aziende
                            </button>
                            <span className="text-gray-300">/</span>
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                <Building className="h-4 w-4 text-teal-600" />
                                {selectedAzienda}
                            </span>
                        </div>
                    )}
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Lavoratore
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[150px]">
                                    Giudizio
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Medico Competente
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[170px]">
                                    Azienda
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Stato
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Documenti / Invio
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Azioni
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {displayedGiudizi.map((giudizio) => {
                                const tipoInfo = JUDGMENT_TYPES[giudizio.tipoGiudizio];
                                const statoInfo = STATUS_LABELS[giudizio.stato];
                                const expiring = isExpiringSoon(giudizio);

                                return (
                                    <tr
                                        key={giudizio.id}
                                        className={`hover:bg-gray-50 cursor-pointer ${expiring ? 'bg-yellow-50' : ''}`}
                                        onClick={() => openEditModal(giudizio)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="p-2 bg-gray-100 rounded-lg mr-3">
                                                    <User className="h-4 w-4 text-gray-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {giudizio.person?.firstName} {giudizio.person?.lastName}
                                                    </div>
                                                    {giudizio.mansioni && giudizio.mansioni.length > 0 && (
                                                        <div className="text-xs text-gray-500">
                                                            {giudizio.mansioni.map(m => m.mansione?.denominazione).filter(Boolean).join(', ')}
                                                        </div>
                                                    )}
                                                    {giudizio.visita?.tipoVisitaMDL && (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <Activity className="h-3 w-3 text-teal-500" />
                                                            <span className="text-xs text-teal-600 font-medium">
                                                                {giudizio.visita.tipoVisitaMDL.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 max-w-[150px]">
                                            <span
                                                title={tipoInfo?.label || giudizio.tipoGiudizio}
                                                className={`inline-flex items-start gap-1 px-2 py-1 text-xs font-medium rounded-2xl leading-snug ${tipoInfo?.color || 'bg-gray-100 text-gray-700'}`}
                                            >
                                                <span className="flex-shrink-0 mt-0.5">{tipoInfo?.icon}</span>
                                                <span className="line-clamp-2">{tipoInfo?.label || giudizio.tipoGiudizio}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {giudizio.medicoCompetente
                                                ? formatMedicoName(giudizio.medicoCompetente)
                                                : '-'
                                            }
                                        </td>
                                        <td className="px-4 py-4 max-w-[170px] text-sm text-gray-500">
                                            <span className="line-clamp-2 break-words" title={getAziendaFromGiudizio(giudizio) || undefined}>
                                                {getAziendaFromGiudizio(giudizio) || '-'}
                                            </span>
                                        </td>
                                        {/* Date: emissione + scadenza su due righe */}
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-gray-700" title="Data emissione">
                                                    <span className="text-[10px] text-gray-400 uppercase mr-1">Em.</span>
                                                    {formatDate(giudizio.dataEmissione)}
                                                </span>
                                                <span className={`flex items-center gap-1 ${expiring ? 'text-yellow-700 font-medium' : 'text-gray-500'}`} title="Data scadenza">
                                                    <span className="text-[10px] text-gray-400 uppercase mr-1">Scad.</span>
                                                    {formatDate(giudizio.dataScadenza)}
                                                    {expiring && <Clock className="h-3.5 w-3.5 text-yellow-500" />}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statoInfo?.color || 'bg-gray-100 text-gray-700'}`}>
                                                {statoInfo?.label || giudizio.stato}
                                            </span>
                                        </td>
                                        {/* Documenti PDF + Stato invio (Art. 41 c.7) */}
                                        <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                            {/* Invio badges */}
                                            <div className="flex items-center gap-1 mb-1.5">
                                                <span title={giudizio.notificatoLavoratore ? `Inviato al lavoratore il ${giudizio.dataNotificaLavoratore ? new Date(giudizio.dataNotificaLavoratore).toLocaleDateString('it-IT') : ''}` : 'Non inviato al lavoratore'}
                                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${giudizio.notificatoLavoratore ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'}`}>
                                                    <UserCheck className="h-2.5 w-2.5" />
                                                    Lav.
                                                    {giudizio.notificatoLavoratore ? ' ✓' : ' ✗'}
                                                </span>
                                                <span title={giudizio.notificatoDatoreLavoro ? `Inviato al datore il ${giudizio.dataNotificaDatoreLavoro ? new Date(giudizio.dataNotificaDatoreLavoro).toLocaleDateString('it-IT') : ''}` : 'Non inviato al datore di lavoro'}
                                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${giudizio.notificatoDatoreLavoro ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
                                                    <Building className="h-2.5 w-2.5" />
                                                    Dat.
                                                    {giudizio.notificatoDatoreLavoro ? ' ✓' : ' ✗'}
                                                </span>
                                                {/* Firma lavoratore badge */}
                                                {(giudizio as any).firmaLavoratore ? (
                                                    <span title="Firma del lavoratore acquisita" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700">
                                                        <PenTool className="h-2.5 w-2.5" />
                                                        Lav. ✓
                                                    </span>
                                                ) : (
                                                    <button
                                                        title="Acquisisci firma del lavoratore"
                                                        onClick={(e) => { e.stopPropagation(); setGiudizioForFirma(giudizio); setFirmaModalOpen(true); }}
                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                                    >
                                                        <PenTool className="h-2.5 w-2.5" />
                                                        Lav.
                                                    </button>
                                                )}
                                                {/* Firma medico badge */}
                                                {(giudizio as any).firmaMedico ? (
                                                    <span title="Firma del medico competente acquisita" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                                                        <PenTool className="h-2.5 w-2.5" />
                                                        Med. ✓
                                                    </span>
                                                ) : (
                                                    <button
                                                        title="Acquisisci firma del medico competente"
                                                        onClick={(e) => { e.stopPropagation(); setGiudizioForFirmaMedico(giudizio); setFirmaMedicoModalOpen(true); }}
                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                    >
                                                        <PenTool className="h-2.5 w-2.5" />
                                                        Med.
                                                    </button>
                                                )}
                                            </div>
                                            {giudizio.pdfLavoratoreUrl ? (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => openGiudizioPdf(giudizio.id, 'lavoratore')}
                                                        title="PDF Lavoratore"
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 transition-colors"
                                                    >
                                                        <FileDown className="h-3 w-3" />
                                                        Lav.
                                                    </button>
                                                    <button
                                                        onClick={() => openGiudizioPdf(giudizio.id, 'datore')}
                                                        title="PDF Datore di Lavoro"
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                                    >
                                                        <FileDown className="h-3 w-3" />
                                                        Dat.
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => generateDocsMutation.mutate(giudizio.id)}
                                                    disabled={generateDocsMutation.isPending}
                                                    title="Genera documenti PDF"
                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 transition-colors disabled:opacity-50"
                                                >
                                                    {generateDocsMutation.isPending ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <FilePlus2 className="h-3 w-3" />
                                                    )}
                                                    Genera
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                            <ActionMenu
                                                actions={[
                                                    ...createCrudActions(
                                                        () => openEditModal(giudizio),
                                                        () => openEditModal(giudizio),
                                                        () => {
                                                            setGiudizioToDelete(giudizio);
                                                            setDeleteModalOpen(true);
                                                        }
                                                    ),
                                                    ...(giudizio.stato === 'VALIDO' && !giudizio.notificatoLavoratore ? [{
                                                        label: 'Notifica lavoratore',
                                                        icon: Bell,
                                                        onClick: () => handleNotifyWorker(giudizio)
                                                    }] : []),
                                                    ...(giudizio.stato === 'VALIDO' && !giudizio.notificatoDatoreLavoro ? [{
                                                        label: 'Notifica datore',
                                                        icon: Bell,
                                                        onClick: () => handleNotifyEmployer(giudizio)
                                                    }] : []),
                                                    // Azioni PEC (Art. 41 D.Lgs 81/08)
                                                    ...(giudizio.stato === 'VALIDO' ? [{
                                                        label: 'Invia via PEC',
                                                        icon: Mail,
                                                        onClick: () => handleOpenPecModal(giudizio)
                                                    }] : []),
                                                    {
                                                        label: 'Cronologia PEC',
                                                        icon: Send,
                                                        onClick: () => handleViewPecLogs(giudizio)
                                                    },
                                                    ...(giudizio.stato === 'VALIDO' ? [{
                                                        label: 'Registra ricorso',
                                                        icon: Scale,
                                                        onClick: () => navigate(`/poliambulatorio/mdl/giudizi-idoneita/${giudizio.id}/ricorso`)
                                                    }] : []),
                                                    {
                                                        label: (giudizio as any).firmaLavoratore ? 'Aggiorna firma lavoratore' : 'Firma lavoratore',
                                                        icon: PenTool,
                                                        onClick: () => { setGiudizioForFirma(giudizio); setFirmaModalOpen(true); }
                                                    },
                                                    {
                                                        label: (giudizio as any).firmaMedico ? 'Aggiorna firma medico' : 'Firma medico competente',
                                                        icon: PenTool,
                                                        onClick: () => { setGiudizioForFirmaMedico(giudizio); setFirmaMedicoModalOpen(true); }
                                                    }
                                                ]}
                                                theme="teal"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModalOpen}
                onClose={() => {
                    setDeleteModalOpen(false);
                    setGiudizioToDelete(null);
                    setDeletionReason('');
                }}
                title="Conferma eliminazione"
                size="sm"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Eliminare il giudizio?
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Questa azione non può essere annullata.
                            </p>
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Motivo dell'eliminazione <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={deletionReason}
                            onChange={(e) => setDeletionReason(e.target.value)}
                            placeholder="Inserisci il motivo dell'eliminazione (minimo 10 caratteri)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                            rows={3}
                        />
                        {deletionReason.length > 0 && deletionReason.length < 10 && (
                            <p className="text-xs text-red-500 mt-1">Minimo 10 caratteri ({deletionReason.length}/10)</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteModalOpen(false);
                                setGiudizioToDelete(null);
                                setDeletionReason('');
                            }}
                            className="btn-clinica-secondary"
                        >
                            Annulla
                        </button>
                        <CRUDButton
                            operation="delete"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending || deletionReason.length < 10}
                            className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Eliminazione...
                                </>
                            ) : (
                                'Elimina'
                            )}
                        </CRUDButton>
                    </div>
                </div>
            </Modal>

            {/* PEC Send Modal */}
            <Modal
                isOpen={pecModalOpen}
                onClose={() => {
                    setPecModalOpen(false);
                    setGiudizioForPec(null);
                }}
                title="Invia Giudizio via PEC"
                size="md"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-teal-100 rounded-full">
                            <Mail className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Invio PEC Giudizio di Idoneità
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Art. 41 D.Lgs 81/08 - Comunicazione obbligatoria
                            </p>
                        </div>
                    </div>

                    {giudizioForPec && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-600">
                                <strong>Lavoratore:</strong> {giudizioForPec.person?.firstName} {giudizioForPec.person?.lastName}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                <strong>Giudizio:</strong> {JUDGMENT_TYPES[giudizioForPec.tipoGiudizio]?.label || giudizioForPec.tipoGiudizio}
                            </p>
                        </div>
                    )}

                    <div className="space-y-4 mb-6">
                        <p className="text-sm font-medium text-gray-700">Seleziona destinatari:</p>
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="pecRecipient"
                                    value="lavoratore"
                                    checked={pecRecipient === 'lavoratore'}
                                    onChange={() => setPecRecipient('lavoratore')}
                                    className="text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                    <p className="font-medium text-gray-900">Solo Lavoratore</p>
                                    <p className="text-sm text-gray-500">Invia copia del giudizio al lavoratore</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="pecRecipient"
                                    value="datore"
                                    checked={pecRecipient === 'datore'}
                                    onChange={() => setPecRecipient('datore')}
                                    className="text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                    <p className="font-medium text-gray-900">Solo Datore di Lavoro</p>
                                    <p className="text-sm text-gray-500">Invia comunicazione al datore</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 border-teal-300 bg-teal-50">
                                <input
                                    type="radio"
                                    name="pecRecipient"
                                    value="both"
                                    checked={pecRecipient === 'both'}
                                    onChange={() => setPecRecipient('both')}
                                    className="text-teal-600 focus:ring-teal-500"
                                />
                                <div>
                                    <p className="font-medium text-gray-900">Entrambi (Consigliato)</p>
                                    <p className="text-sm text-gray-500">Invia a lavoratore e datore come da normativa</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setPecModalOpen(false);
                                setGiudizioForPec(null);
                            }}
                            className="btn-clinica-secondary"
                        >
                            Annulla
                        </button>
                        <CRUDButton
                            operation="create"
                            onClick={handleSendPec}
                            disabled={sendPecMutation.isPending}
                            className="btn-clinica-primary inline-flex items-center gap-2"
                        >
                            {sendPecMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Invio in corso...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Invia PEC
                                </>
                            )}
                        </CRUDButton>
                    </div>
                </div>
            </Modal>

            {/* PEC Logs Modal */}
            <Modal
                isOpen={pecLogsModalOpen}
                onClose={() => {
                    setPecLogsModalOpen(false);
                    setPecLogs([]);
                }}
                title="Cronologia Invii PEC"
                size="lg"
            >
                <div className="p-6">
                    {pecLogs.length === 0 ? (
                        <div className="text-center py-8">
                            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Nessun invio PEC registrato per questo giudizio</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pecLogs.map((log) => (
                                <div key={log.id} className="border rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {log.tipo === 'GIUDIZIO_LAVORATORE' ? 'Al Lavoratore' : 'Al Datore di Lavoro'}
                                            </p>
                                            <p className="text-sm text-gray-500">{log.destinatario}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${log.statoInvio === 'CONSEGNATO' ? 'bg-green-100 text-green-700' :
                                            log.statoInvio === 'ACCETTATO' ? 'bg-blue-100 text-blue-700' :
                                                log.statoInvio === 'INVIATO' ? 'bg-yellow-100 text-yellow-700' :
                                                    log.statoInvio === 'ERRORE' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                            }`}>
                                            {log.statoInvio}
                                        </span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500">Data Invio</p>
                                            <p className="text-gray-900">{new Date(log.dataInvio).toLocaleString('it-IT')}</p>
                                        </div>
                                        {log.dataAccettazione && (
                                            <div>
                                                <p className="text-gray-500">Accettazione</p>
                                                <p className="text-gray-900">{new Date(log.dataAccettazione).toLocaleString('it-IT')}</p>
                                            </div>
                                        )}
                                        {log.dataConsegna && (
                                            <div>
                                                <p className="text-gray-500">Consegna</p>
                                                <p className="text-gray-900">{new Date(log.dataConsegna).toLocaleString('it-IT')}</p>
                                            </div>
                                        )}
                                        {log.errore && (
                                            <div className="col-span-2">
                                                <p className="text-gray-500">Errore</p>
                                                <p className="text-red-600">{log.errore}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-end mt-6">
                        <button
                            type="button"
                            onClick={() => {
                                setPecLogsModalOpen(false);
                                setPecLogs([]);
                            }}
                            className="btn-clinica-secondary"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Form Modal for Create/Edit */}
            <GiudizioFormModal
                isOpen={formModalOpen}
                onClose={() => {
                    setFormModalOpen(false);
                    setGiudizioToEdit(null);
                }}
                onSuccess={(giudizio) => {
                    setFormModalOpen(false);
                    setGiudizioToEdit(null);
                    queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
                    showToast({
                        message: formMode === 'create'
                            ? 'Giudizio creato con successo'
                            : 'Giudizio aggiornato con successo',
                        type: 'success'
                    });
                }}
                giudizio={giudizioToEdit}
                mode={formMode}
            />

            {/* Batch Send Modal */}
            <BatchSendModal
                open={batchSendModalOpen}
                onClose={() => setBatchSendModalOpen(false)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] })}
            />

            {/* Force Send Modal — invio sicuro dei giudizi selezionati */}
            <BatchForceSendModal
                open={forceSendModalOpen}
                giudizi={giudizi}
                getAzienda={getAziendaFromGiudizio}
                onClose={() => setForceSendModalOpen(false)}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] })}
            />

            {/* Firma Lavoratore Modal */}
            {firmaModalOpen && giudizioForFirma && (
                <GiudizioFirmaModal
                    isOpen={firmaModalOpen}
                    giudizio={giudizioForFirma}
                    firmatario="lavoratore"
                    onClose={() => { setFirmaModalOpen(false); setGiudizioForFirma(null); }}
                    onSuccess={() => {
                        setFirmaModalOpen(false);
                        setGiudizioForFirma(null);
                        queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
                    }}
                />
            )}

            {/* Firma Medico Competente Modal */}
            {firmaMedicoModalOpen && giudizioForFirmaMedico && (
                <GiudizioFirmaModal
                    isOpen={firmaMedicoModalOpen}
                    giudizio={giudizioForFirmaMedico}
                    firmatario="medico"
                    onClose={() => { setFirmaMedicoModalOpen(false); setGiudizioForFirmaMedico(null); }}
                    onSuccess={() => {
                        setFirmaMedicoModalOpen(false);
                        setGiudizioForFirmaMedico(null);
                        queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
                    }}
                />
            )}

            {/* Ricorso Modal */}
            {ricorsoModalOpen && giudizioForRicorso && (
                <GiudizioRicorsoModal
                    isOpen={ricorsoModalOpen}
                    giudizio={giudizioForRicorso}
                    onClose={() => {
                        setRicorsoModalOpen(false);
                        setGiudizioForRicorso(null);
                        navigate('/poliambulatorio/mdl/giudizi-idoneita');
                    }}
                    onSuccess={() => {
                        setRicorsoModalOpen(false);
                        setGiudizioForRicorso(null);
                        queryClient.invalidateQueries({ queryKey: ['giudizi-idoneita'] });
                        navigate('/poliambulatorio/mdl/giudizi-idoneita');
                        showToast({ message: 'Ricorso registrato con successo', type: 'success' });
                    }}
                />
            )}
        </div>
    );
};

export default GiudiziIdoneitaPage;
