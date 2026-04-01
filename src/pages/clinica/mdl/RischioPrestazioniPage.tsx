/**
 * RischioPrestazioniPage - Configurazione Mapping Rischio → Prestazioni
 * 
 * Pagina per la configurazione del mapping tra codici rischio e prestazioni
 * obbligatorie secondo D.Lgs 81/08.
 * 
 * @module pages/clinica/mdl/RischioPrestazioniPage
 * @project P56 - Medicina del Lavoro Sistema Completo
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ShieldAlert,
    Plus,
    Search,
    AlertTriangle,
    Calendar,
    Link2,
    FileText,
    Loader2,
    AlertCircle,
    Settings2,
    BookOpen,
    ChevronRight,
    ChevronDown,
    Check,
    Trash2,
    Edit2,
    RefreshCw,
    X,
    Save,
    ArrowRight
} from 'lucide-react';
import {
    clinicaApi,
    type RischioPrestazione,
    type CodiceRischio,
    type CatalogoRischio,
    type TipoPeriodicita,
    type Prestazione
} from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import Modal from '../../../design-system/molecules/Modal/Modal';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Periodicity labels - Aligned with Prisma TipoPeriodicita enum
const PERIODICITY_LABELS: Record<TipoPeriodicita, string> = {
    MESI_6: 'Semestrale',
    MESI_12: 'Annuale',
    MESI_24: 'Biennale',
    MESI_36: 'Triennale',
    MESI_60: 'Quinquennale',
    SU_INDICAZIONE: 'Su indicazione',
    UNA_TANTUM: 'Una tantum'
};

// Risk category colors - aligned with Prisma enum CategoriaRischio
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    FISICI: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    CHIMICI: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    BIOLOGICI: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    ERGONOMICI: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    ORGANIZZATIVI: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    SPECIFICI: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    SETTORIALI: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' }
};

const RischioPrestazioniPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategoria, setFilterCategoria] = useState<string>('');
    const [expandedRischi, setExpandedRischi] = useState<Set<CodiceRischio>>(new Set());
    const [viewMode, setViewMode] = useState<'catalog' | 'mapping'>('catalog');

    // Add association modal state
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [selectedRischio, setSelectedRischio] = useState<CodiceRischio | null>(null);
    const [selectedRischioInfo, setSelectedRischioInfo] = useState<CatalogoRischio | null>(null);
    const [newAssociation, setNewAssociation] = useState({
        prestazioneId: '',
        periodicita: 'MESI_12' as TipoPeriodicita,
        obbligatoria: true,
        note: ''
    });
    // Edit modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingMapping, setEditingMapping] = useState<RischioPrestazione | null>(null);
    const [editFormData, setEditFormData] = useState({
        periodicita: 'MESI_12' as TipoPeriodicita,
        obbligatoria: true,
        note: '',
        riferimentoNormativo: ''
    });
    // Modal filter states
    const [modalSearchTerm, setModalSearchTerm] = useState('');
    const [modalFilterTipo, setModalFilterTipo] = useState<string>('');

    // Fetch risk catalog
    const { data: catalogoRischi, isLoading: loadingCatalogo } = useQuery({
        queryKey: ['catalogo-rischi'],
        queryFn: () => clinicaApi.rischioPrestazioni.getCatalogo(),
        staleTime: Infinity // Static data
    });

    // Fetch tenant mapping
    const { data: mappingResponse, isLoading: loadingMapping } = useQuery({
        queryKey: ['rischio-prestazioni', tenantFilterKey],
        queryFn: () => clinicaApi.rischioPrestazioni.getAll({
            ...getTenantFilterParams()
        }),
        enabled: isReady
    });

    // Fetch default mapping
    const { data: defaultMapping } = useQuery({
        queryKey: ['rischio-prestazioni-default'],
        queryFn: () => clinicaApi.rischioPrestazioni.getDefaultMapping(),
        staleTime: Infinity
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['rischio-prestazioni-stats', tenantFilterKey],
        queryFn: () => clinicaApi.rischioPrestazioni.getStats(),
        enabled: isReady
    });

    // Fetch prestazioni for add modal
    const { data: prestazioniResponse } = useQuery({
        queryKey: ['prestazioni-for-mapping'],
        queryFn: () => clinicaApi.prestazioni.getAll({ limit: 500 }),
        enabled: addModalOpen
    });
    const prestazioniDisponibili = prestazioniResponse?.data || [];

    // Seed defaults mutation
    const seedMutation = useMutation({
        mutationFn: () => clinicaApi.rischioPrestazioni.seedDefaults(),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['rischio-prestazioni'] });
            queryClient.invalidateQueries({ queryKey: ['rischio-prestazioni-stats'] });

            // Risposta contiene prestazioni.created/skipped e mappings.created/skipped
            const prestazioniCreate = data.prestazioni?.created || 0;
            const prestazioniSkipped = data.prestazioni?.skipped || 0;
            const mappingsCreati = data.mappings?.created || 0;
            const mappingsSkipped = data.mappings?.skipped || 0;

            // Messaggio user-friendly in base al risultato
            if (prestazioniCreate === 0 && mappingsCreati === 0) {
                if (prestazioniSkipped > 0 || mappingsSkipped > 0) {
                    showToast({
                        type: 'info',
                        message: `Catalogo già inizializzato: ${prestazioniSkipped} prestazioni e ${mappingsSkipped} mapping esistenti`
                    });
                } else {
                    showToast({
                        type: 'warning',
                        message: 'Nessun dato da inizializzare. Verifica la configurazione del catalogo.'
                    });
                }
            } else {
                showToast({
                    type: 'success',
                    message: `Inizializzazione completata: ${prestazioniCreate} nuove prestazioni e ${mappingsCreati} nuovi mapping creati`
                });
            }
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                message: 'Errore durante l\'inizializzazione. Riprova più tardi.'
            });
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => clinicaApi.rischioPrestazioni.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rischio-prestazioni'] });
            showToast({ type: 'success', message: 'Mapping eliminato' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Create association mutation
    const createMutation = useMutation({
        mutationFn: (data: { codiceRischio: CodiceRischio; prestazioneId: string; periodicita: TipoPeriodicita; obbligatoria: boolean; note?: string }) =>
            clinicaApi.rischioPrestazioni.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rischio-prestazioni'] });
            queryClient.invalidateQueries({ queryKey: ['rischio-prestazioni-stats'] });
            showToast({ type: 'success', message: 'Associazione creata con successo' });
            setAddModalOpen(false);
            setSelectedRischio(null);
            setSelectedRischioInfo(null);
            setNewAssociation({ prestazioneId: '', periodicita: 'MESI_12', obbligatoria: true, note: '' });
            setModalSearchTerm('');
            setModalFilterTipo('');
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante la creazione' });
        }
    });

    // Update association mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: string; periodicita?: TipoPeriodicita; obbligatoria?: boolean; note?: string; riferimentoNormativo?: string }) =>
            clinicaApi.rischioPrestazioni.update(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rischio-prestazioni'] });
            queryClient.invalidateQueries({ queryKey: ['rischio-prestazioni-stats'] });
            showToast({ type: 'success', message: 'Mapping aggiornato con successo' });
            setEditModalOpen(false);
            setEditingMapping(null);
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento' });
        }
    });

    // Handle edit association
    const handleOpenEditModal = (mapping: RischioPrestazione) => {
        setEditingMapping(mapping);
        setEditFormData({
            periodicita: mapping.periodicita,
            obbligatoria: mapping.obbligatoria,
            note: mapping.note || '',
            riferimentoNormativo: mapping.riferimentoNormativo || ''
        });
        setEditModalOpen(true);
    };

    const handleUpdateAssociation = () => {
        if (!editingMapping) return;
        updateMutation.mutate({
            id: editingMapping.id,
            ...editFormData
        });
    };

    // Handle add association
    const handleOpenAddModal = (codiceRischio: CodiceRischio, rischioInfo?: CatalogoRischio) => {
        setSelectedRischio(codiceRischio);
        setSelectedRischioInfo(rischioInfo || null);
        setNewAssociation({ prestazioneId: '', periodicita: 'MESI_12', obbligatoria: true, note: '' });
        setModalSearchTerm('');
        setModalFilterTipo('');
        setAddModalOpen(true);
    };

    const handleCreateAssociation = () => {
        if (!selectedRischio || !newAssociation.prestazioneId) {
            showToast({ type: 'warning', message: 'Seleziona una prestazione' });
            return;
        }
        createMutation.mutate({
            codiceRischio: selectedRischio,
            prestazioneId: newAssociation.prestazioneId,
            periodicita: newAssociation.periodicita,
            obbligatoria: newAssociation.obbligatoria,
            note: newAssociation.note || undefined
        });
    };

    // Filter prestazioni in modal
    const filteredPrestazioni = useMemo(() => {
        if (!prestazioniDisponibili.length) return [];
        return prestazioniDisponibili.filter((p: Prestazione) => {
            const matchSearch = !modalSearchTerm ||
                p.nome.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                p.codice.toLowerCase().includes(modalSearchTerm.toLowerCase());
            const matchTipo = !modalFilterTipo || p.tipo === modalFilterTipo;
            return matchSearch && matchTipo;
        });
    }, [prestazioniDisponibili, modalSearchTerm, modalFilterTipo]);

    // Get unique tipo values from prestazioni
    const tipiPrestazione = useMemo(() => {
        const tipi = new Set(prestazioniDisponibili.map((p: Prestazione) => p.tipo));
        return Array.from(tipi).sort();
    }, [prestazioniDisponibili]);

    // Extract data
    const mapping = mappingResponse?.data || [];

    // Filter catalog
    const filteredCatalogo = useMemo(() => {
        if (!catalogoRischi?.flatList) return [];
        return catalogoRischi.flatList.filter((r: CatalogoRischio) => {
            const matchSearch = !searchTerm ||
                r.codice.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.nome.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCategoria = !filterCategoria || r.categoria === filterCategoria;
            return matchSearch && matchCategoria;
        });
    }, [catalogoRischi, searchTerm, filterCategoria]);

    // Group by category
    const catalogByCategory = useMemo(() => {
        const grouped: Record<string, CatalogoRischio[]> = {};
        filteredCatalogo.forEach((r: CatalogoRischio) => {
            if (!grouped[r.categoria]) grouped[r.categoria] = [];
            grouped[r.categoria].push(r);
        });
        return grouped;
    }, [filteredCatalogo]);

    // Get mapping for a risk code
    const getMappingForRisk = useCallback((codice: CodiceRischio): RischioPrestazione[] => {
        return mapping.filter(m => m.codiceRischio === codice);
    }, [mapping]);

    // Toggle expanded risk
    const toggleExpanded = useCallback((codice: CodiceRischio) => {
        setExpandedRischi(prev => {
            const next = new Set(prev);
            if (next.has(codice)) {
                next.delete(codice);
            } else {
                next.add(codice);
            }
            return next;
        });
    }, []);

    // Loading state
    if (loadingCatalogo || loadingMapping) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento catalogo rischi...</span>
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
                        <ShieldAlert className="h-7 w-7 text-teal-600" />
                        Rischio → Prestazioni
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Configurazione mapping rischi e prestazioni obbligatorie - D.Lgs 81/08
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View mode toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('catalog')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'catalog'
                                ? 'bg-white text-teal-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <BookOpen className="h-4 w-4 inline mr-1" />
                            Catalogo
                        </button>
                        <button
                            onClick={() => setViewMode('mapping')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'mapping'
                                ? 'bg-white text-teal-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Settings2 className="h-4 w-4 inline mr-1" />
                            Mapping
                        </button>
                    </div>
                    <CRUDPrimaryButton
                        onClick={() => seedMutation.mutate()}
                        disabled={seedMutation.isPending}
                        className="btn-clinica-secondary inline-flex items-center gap-2"
                    >
                        {seedMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        Inizializza da Normativa
                    </CRUDPrimaryButton>
                </div>
            </div>

            {/* Stats Summary */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-100 rounded-lg">
                                <ShieldAlert className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">28</p>
                                <p className="text-sm text-gray-500">Codici rischio</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Link2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats.totaleMapping}</p>
                                <p className="text-sm text-gray-500">Mapping attivi</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <FileText className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {Object.keys(stats.perPeriodicita || {}).length}
                                </p>
                                <p className="text-sm text-gray-500">Periodicità diverse</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Calendar className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.perPeriodicita?.MESI_12 || 0}
                                </p>
                                <p className="text-sm text-gray-500">Annuali</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cerca per codice o nome rischio..."
                            className="input-clinica pl-10 w-full"
                        />
                    </div>

                    {/* Category filter */}
                    <select
                        value={filterCategoria}
                        onChange={(e) => setFilterCategoria(e.target.value)}
                        className="input-clinica w-48"
                    >
                        <option value="">Tutte le categorie</option>
                        {Object.keys(CATEGORY_COLORS).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Catalog View */}
            {viewMode === 'catalog' && (
                <div className="space-y-6">
                    {Object.entries(catalogByCategory).map(([categoria, rischi]) => {
                        const colors = CATEGORY_COLORS[categoria] || CATEGORY_COLORS.SPECIFICI;
                        return (
                            <div key={categoria} className={`rounded-xl border ${colors.border} overflow-hidden`}>
                                {/* Category Header */}
                                <div className={`px-6 py-4 ${colors.bg}`}>
                                    <h2 className={`text-lg font-semibold ${colors.text}`}>
                                        Rischi {categoria}
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {rischi.length} codici rischio
                                    </p>
                                </div>

                                {/* Risks List */}
                                <div className="divide-y divide-gray-100">
                                    {rischi.map((rischio) => {
                                        const riskMapping = getMappingForRisk(rischio.codice);
                                        const isExpanded = expandedRischi.has(rischio.codice);

                                        return (
                                            <div key={rischio.codice} className="bg-white">
                                                {/* Risk Row */}
                                                <div
                                                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                                                    onClick={() => toggleExpanded(rischio.codice)}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`px-3 py-1 rounded-lg font-mono text-sm font-medium ${colors.bg} ${colors.text}`}>
                                                            {rischio.codice}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-medium text-gray-900">
                                                                {rischio.nome}
                                                            </h3>
                                                            <p className="text-sm text-gray-500 line-clamp-1">
                                                                {rischio.descrizione}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm text-gray-500">
                                                            {riskMapping.length} prestazioni
                                                        </span>
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-5 w-5 text-gray-400" />
                                                        ) : (
                                                            <ChevronRight className="h-5 w-5 text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                {isExpanded && (
                                                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                                                        {/* Normativa Reference - using 'normativa' from API */}
                                                        {(rischio.normativa || rischio.riferimentoNormativo) && (
                                                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                                    <p className="text-sm text-blue-800">
                                                                        <strong>Riferimento normativo:</strong> {rischio.normativa || rischio.riferimentoNormativo}
                                                                    </p>
                                                                </div>
                                                                {rischio.periodicita && (
                                                                    <p className="text-xs text-blue-600 mt-1 ml-6">
                                                                        Periodicità consigliata: {rischio.periodicita} mesi
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Default prestazioni from normativa */}
                                                        <div className="mb-4">
                                                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                                Prestazioni da normativa:
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {(rischio.prestazioniObbligatorie || []).map((prest, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                                                    >
                                                                        {prest}
                                                                    </span>
                                                                ))}
                                                                {(!rischio.prestazioniObbligatorie || rischio.prestazioniObbligatorie.length === 0) && (
                                                                    <span className="text-sm text-gray-500 italic">
                                                                        Nessuna prestazione predefinita da normativa
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Tenant mapping */}
                                                        {riskMapping.length > 0 ? (
                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <h4 className="text-sm font-medium text-gray-700">
                                                                        Mapping configurato:
                                                                    </h4>
                                                                    <CRUDButton
                                                                        operation="create"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleOpenAddModal(rischio.codice, rischio);
                                                                        }}
                                                                        className="btn-clinica-secondary text-xs px-2 py-1 inline-flex items-center gap-1"
                                                                    >
                                                                        <Plus className="h-3 w-3" /> Aggiungi
                                                                    </CRUDButton>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {riskMapping.map((m) => (
                                                                        <div
                                                                            key={m.id}
                                                                            className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                {m.obbligatoria ? (
                                                                                    <span title="Obbligatoria">
                                                                                        <ShieldAlert className="h-4 w-4 text-red-500" />
                                                                                    </span>
                                                                                ) : (
                                                                                    <span title="Consigliata">
                                                                                        <Check className="h-4 w-4 text-green-500" />
                                                                                    </span>
                                                                                )}
                                                                                <span className="text-sm font-medium">
                                                                                    {m.prestazione?.nome || 'Prestazione'}
                                                                                </span>
                                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                                                    {PERIODICITY_LABELS[m.periodicita]}
                                                                                </span>
                                                                                {m.obbligatoria ? (
                                                                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">
                                                                                        ⚠️ Obbligatoria
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                                                                        Consigliata
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleOpenEditModal(m);
                                                                                    }}
                                                                                    className="text-blue-500 hover:text-blue-700"
                                                                                    title="Modifica"
                                                                                >
                                                                                    <Edit2 className="h-4 w-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        deleteMutation.mutate(m.id);
                                                                                    }}
                                                                                    className="text-red-500 hover:text-red-700"
                                                                                    title="Elimina"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                                                        <span className="text-sm text-yellow-700">
                                                                            Nessun mapping configurato per questo rischio
                                                                        </span>
                                                                    </div>
                                                                    <CRUDButton
                                                                        operation="create"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleOpenAddModal(rischio.codice, rischio);
                                                                        }}
                                                                        className="btn-clinica-primary text-xs px-2 py-1 inline-flex items-center gap-1"
                                                                    >
                                                                        <Plus className="h-3 w-3" /> Aggiungi
                                                                    </CRUDButton>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {Object.keys(catalogByCategory).length === 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <ShieldAlert className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nessun rischio trovato
                            </h3>
                            <p className="text-gray-500">
                                Prova a modificare i criteri di ricerca
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Mapping View */}
            {viewMode === 'mapping' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {mapping.length === 0 ? (
                        <div className="p-12 text-center">
                            <Link2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nessun mapping configurato
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Inizializza i mapping dalla normativa D.Lgs 81/08
                            </p>
                            <CRUDButton
                                operation="create"
                                onClick={() => seedMutation.mutate()}
                                disabled={seedMutation.isPending}
                                className="btn-clinica-primary inline-flex items-center gap-2"
                            >
                                {seedMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                                Inizializza da Normativa
                            </CRUDButton>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Codice Rischio
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Prestazione
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Periodicità
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Obbligatoria
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Rif. Normativo
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Azioni
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {mapping.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-mono font-medium rounded">
                                                {m.codiceRischio}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {m.prestazione?.nome || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {PERIODICITY_LABELS[m.periodicita]}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {m.obbligatoria ? (
                                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                                    Sì
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                                    No
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {m.riferimentoNormativo || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEditModal(m)}
                                                    className="text-blue-500 hover:text-blue-700"
                                                    title="Modifica associazione"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteMutation.mutate(m.id)}
                                                    disabled={deleteMutation.isPending}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Elimina associazione"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Enhanced Add Association Modal */}
            <Modal
                isOpen={addModalOpen}
                onClose={() => {
                    setAddModalOpen(false);
                    setSelectedRischio(null);
                    setSelectedRischioInfo(null);
                    setModalSearchTerm('');
                    setModalFilterTipo('');
                }}
                title=""
                size="lg"
            >
                <div className="flex flex-col h-[600px]">
                    {/* Modal Header with Risk Info */}
                    <div className="border-b border-gray-200 pb-4 mb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-teal-100 rounded-lg">
                                <ShieldAlert className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Aggiungi Prestazione al Rischio
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Seleziona una prestazione da associare a <span className="font-mono font-medium text-teal-600">{selectedRischio}</span>
                                </p>
                            </div>
                        </div>
                        {selectedRischioInfo && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>{selectedRischioInfo.nome}</strong>
                                </p>
                                {selectedRischioInfo.normativa && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        {selectedRischioInfo.normativa}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Two Column Layout */}
                    <div className="flex gap-4 flex-1 min-h-0">
                        {/* Left Column: Prestazione Selection */}
                        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 pr-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <Search className="h-4 w-4" />
                                Seleziona Prestazione
                            </h3>

                            {/* Search and Filter */}
                            <div className="flex gap-2 mb-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={modalSearchTerm}
                                        onChange={(e) => setModalSearchTerm(e.target.value)}
                                        placeholder="Cerca prestazione..."
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                                <select
                                    value={modalFilterTipo}
                                    onChange={(e) => setModalFilterTipo(e.target.value)}
                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="">Tutti i tipi</option>
                                    {tipiPrestazione.map((tipo) => (
                                        <option key={tipo} value={tipo}>
                                            {tipo.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Prestazioni List */}
                            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg">
                                {filteredPrestazioni.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm">
                                            {prestazioniDisponibili.length === 0
                                                ? 'Nessuna prestazione disponibile. Inizializza il catalogo.'
                                                : 'Nessuna prestazione trovata con i filtri selezionati.'
                                            }
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {filteredPrestazioni.map((p: Prestazione) => (
                                            <div
                                                key={p.id}
                                                onClick={() => setNewAssociation(prev => ({ ...prev, prestazioneId: p.id }))}
                                                className={`p-3 cursor-pointer transition-colors ${newAssociation.prestazioneId === p.id
                                                        ? 'bg-teal-50 border-l-4 border-teal-500'
                                                        : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm text-gray-900">
                                                                {p.nome}
                                                            </span>
                                                            {newAssociation.prestazioneId === p.id && (
                                                                <Check className="h-4 w-4 text-teal-600" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs font-mono text-gray-500">
                                                                {p.codice}
                                                            </span>
                                                            <span className={`text-xs px-1.5 py-0.5 rounded ${p.tipo === 'VISITA_MEDICINA_LAVORO' ? 'bg-purple-100 text-purple-700' :
                                                                    p.tipo === 'ESAME_STRUMENTALE' ? 'bg-blue-100 text-blue-700' :
                                                                        p.tipo === 'ESAME_LABORATORIO' ? 'bg-green-100 text-green-700' :
                                                                            p.tipo === 'VACCINAZIONE' ? 'bg-orange-100 text-orange-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {p.tipo.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-medium text-gray-900">
                                                            €{(typeof p.prezzoBase === 'number' ? p.prezzoBase : parseFloat(p.prezzoBase) || 0).toFixed(2)}
                                                        </span>
                                                        <p className="text-xs text-gray-500">
                                                            {p.durataPrevista || 0} min
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {filteredPrestazioni.length} prestazioni disponibili
                            </p>
                        </div>

                        {/* Right Column: Configuration */}
                        <div className="w-72 flex flex-col">
                            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <Settings2 className="h-4 w-4" />
                                Configurazione
                            </h3>

                            <div className="space-y-4 flex-1">
                                {/* Selected Prestazione Summary */}
                                {newAssociation.prestazioneId && (
                                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                                        <p className="text-xs text-teal-600 font-medium mb-1">Selezionata:</p>
                                        <p className="text-sm font-medium text-teal-800">
                                            {filteredPrestazioni.find((p: Prestazione) => p.id === newAssociation.prestazioneId)?.nome || 'Prestazione'}
                                        </p>
                                    </div>
                                )}

                                {/* Periodicità */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Calendar className="h-4 w-4 inline mr-1" />
                                        Periodicità
                                    </label>
                                    <select
                                        value={newAssociation.periodicita}
                                        onChange={(e) => setNewAssociation(prev => ({ ...prev, periodicita: e.target.value as TipoPeriodicita }))}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm"
                                    >
                                        {Object.entries(PERIODICITY_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Obbligatoria */}
                                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                    <input
                                        type="checkbox"
                                        id="modal-obbligatoria"
                                        checked={newAssociation.obbligatoria}
                                        onChange={(e) => setNewAssociation(prev => ({ ...prev, obbligatoria: e.target.checked }))}
                                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <label htmlFor="modal-obbligatoria" className="text-sm text-gray-700">
                                        Prestazione obbligatoria
                                    </label>
                                </div>

                                {/* Note */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Note (opzionale)
                                    </label>
                                    <textarea
                                        value={newAssociation.note}
                                        onChange={(e) => setNewAssociation(prev => ({ ...prev, note: e.target.value }))}
                                        rows={3}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm"
                                        placeholder="Note aggiuntive..."
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2 pt-4 border-t mt-4">
                                <CRUDPrimaryButton
                                    onClick={handleCreateAssociation}
                                    disabled={createMutation.isPending || !newAssociation.prestazioneId}
                                    className="w-full justify-center"
                                >
                                    {createMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Plus className="h-4 w-4 mr-2" />
                                    )}
                                    Aggiungi Associazione
                                </CRUDPrimaryButton>
                                <button
                                    onClick={() => {
                                        setAddModalOpen(false);
                                        setSelectedRischio(null);
                                        setSelectedRischioInfo(null);
                                        setModalSearchTerm('');
                                        setModalFilterTipo('');
                                    }}
                                    className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Edit Association Modal */}
            <Modal
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    setEditingMapping(null);
                    setEditFormData({
                        periodicita: 'MESI_12' as TipoPeriodicita,
                        obbligatoria: true,
                        note: '',
                        riferimentoNormativo: ''
                    });
                }}
                title="Modifica Associazione"
                size="md"
            >
                {editingMapping && (
                    <div className="space-y-4">
                        {/* Info Summary */}
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-mono font-medium rounded">
                                    {editingMapping.codiceRischio}
                                </span>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">
                                    {editingMapping.prestazione?.nome || 'Prestazione'}
                                </span>
                            </div>
                        </div>

                        {/* Periodicità */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Periodicità
                            </label>
                            <select
                                value={editFormData.periodicita}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, periodicita: e.target.value as TipoPeriodicita }))}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm"
                            >
                                {Object.entries(PERIODICITY_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>


                        {/* Obbligatoria */}
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <input
                                type="checkbox"
                                id="edit-obbligatoria"
                                checked={editFormData.obbligatoria}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, obbligatoria: e.target.checked }))}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                            />
                            <label htmlFor="edit-obbligatoria" className="text-sm text-gray-700">
                                Prestazione obbligatoria
                            </label>
                        </div>

                        {/* Riferimento Normativo */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Riferimento Normativo
                            </label>
                            <input
                                type="text"
                                value={editFormData.riferimentoNormativo}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, riferimentoNormativo: e.target.value }))}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm"
                                placeholder="Es. D.Lgs 81/08 Art. 196"
                            />
                        </div>

                        {/* Note */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Note (opzionale)
                            </label>
                            <textarea
                                value={editFormData.note}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, note: e.target.value }))}
                                rows={3}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm"
                                placeholder="Note aggiuntive..."
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t">
                            <button
                                onClick={() => {
                                    setEditModalOpen(false);
                                    setEditingMapping(null);
                                }}
                                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                            >
                                Annulla
                            </button>
                            <CRUDPrimaryButton
                                onClick={handleUpdateAssociation}
                                disabled={updateMutation.isPending}
                                className="flex-1 justify-center"
                            >
                                {updateMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Salva Modifiche
                            </CRUDPrimaryButton>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RischioPrestazioniPage;
