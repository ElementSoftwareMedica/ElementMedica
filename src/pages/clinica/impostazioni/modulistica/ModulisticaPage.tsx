/**
 * Modulistica Management Page
 * 
 * Pagina per la gestione dei template documenti modulistica.
 * Permette di:
 * - Creare/modificare template documenti
 * - Associare template a prestazioni/medici
 * - Configurare firme, scadenze e campi
 * - Gestire log e audit
 * 
 * @module pages/clinica/impostazioni/modulistica
 * @project P53 - Modulistica System (Session #13)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileText,
    Plus,
    Edit,
    Trash2,
    Copy,
    Eye,
    Check,
    X,
    Search,
    Filter,
    ChevronDown,
    Stethoscope,
    User,
    Clock,
    FileSignature,
    ToggleLeft,
    ToggleRight,
    AlertTriangle,
    Settings,
    BookOpen
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useTenantFilter } from '../../../../context/TenantFilterContext';
import { useTenantMode } from '../../../../contexts/TenantModeContext';
import { useToast } from '../../../../hooks/useToast';
import {
    modulisticaTemplatesApi,
    type DocumentoTemplate,
    type DocumentoTemplateInput,
    type TipoDocumentoTemplate,
    type FaseDocumento
} from '../../../../services/clinicaApi';
import { CRUDButton, CRUDPrimaryButton } from '../../../../components/shared/CRUDButton';
import { ActionButton } from '../../../../components/ui';
import TemplateFormModal from './components/TemplateFormModal';

// ============================================
// CONSTANTS
// ============================================

const TIPI_DOCUMENTO: { value: TipoDocumentoTemplate; label: string }[] = [
    { value: 'CONSENSO_INFORMATO', label: 'Consenso Informato' },
    { value: 'PRIVACY', label: 'Informativa Privacy' },
    { value: 'ANAMNESI', label: 'Anamnesi' },
    { value: 'CERTIFICATO', label: 'Certificato' },
    { value: 'PRESCRIZIONE', label: 'Prescrizione' },
    { value: 'REFERTO', label: 'Referto' },
    { value: 'MODULO_GENERICO', label: 'Modulo Generico' },
    { value: 'DICHIARAZIONE', label: 'Dichiarazione' },
    { value: 'QUESTIONARIO_ANAMNESI_MDL', label: 'Questionario Anamnesi MDL' },
    { value: 'QUESTIONARIO_RISCHIO', label: 'Questionario Rischio' },
    { value: 'QUESTIONARIO_SINTOMI', label: 'Questionario Sintomi' },
    { value: 'SCHEDA_SORVEGLIANZA', label: 'Scheda Sorveglianza' },
    { value: 'ALCOL_SCREENING', label: 'Alcol Screening' },
    { value: 'ALTRO', label: 'Altro' }
];

const FASI_DOCUMENTO: { value: FaseDocumento; label: string }[] = [
    { value: 'REGISTRAZIONE', label: 'Registrazione' },
    { value: 'PRE_VISITA', label: 'Pre-visita' },
    { value: 'DURANTE_VISITA', label: 'Durante visita' },
    { value: 'POST_VISITA', label: 'Post-visita' },
    { value: 'AMMINISTRATIVO', label: 'Amministrativo' },
    { value: 'ALTRO', label: 'Altro' }
];

// ============================================
// TYPES
// ============================================

interface TemplateFilters {
    search: string;
    tipo: TipoDocumentoTemplate | '';
    fase: FaseDocumento | '';
    isActive: boolean | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getTipoLabel = (tipo: TipoDocumentoTemplate): string => {
    return TIPI_DOCUMENTO.find(t => t.value === tipo)?.label || tipo;
};

const getFaseLabel = (fase: FaseDocumento): string => {
    return FASI_DOCUMENTO.find(f => f.value === fase)?.label || fase;
};

const getTipoColor = (tipo: TipoDocumentoTemplate): string => {
    const colors: Record<TipoDocumentoTemplate, string> = {
        'CONSENSO_INFORMATO': 'bg-blue-100 text-blue-800',
        'PRIVACY': 'bg-purple-100 text-purple-800',
        'ANAMNESI': 'bg-teal-100 text-teal-800',
        'CERTIFICATO': 'bg-green-100 text-green-800',
        'PRESCRIZIONE': 'bg-orange-100 text-orange-800',
        'REFERTO': 'bg-cyan-100 text-cyan-800',
        'MODULO_GENERICO': 'bg-gray-100 text-gray-800',
        'DICHIARAZIONE': 'bg-yellow-100 text-yellow-800',
        'QUESTIONARIO_ANAMNESI_MDL': 'bg-indigo-100 text-indigo-800',
        'QUESTIONARIO_RISCHIO': 'bg-rose-100 text-rose-800',
        'QUESTIONARIO_SINTOMI': 'bg-amber-100 text-amber-800',
        'SCHEDA_SORVEGLIANZA': 'bg-emerald-100 text-emerald-800',
        'ALCOL_SCREENING': 'bg-violet-100 text-violet-800',
        'ALTRO': 'bg-slate-100 text-slate-800'
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
};

// ============================================
// MAIN COMPONENT
// ============================================

const ModulisticaPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
    const { canPerformCRUD } = useTenantMode();
    const { confirmDelete, confirm } = useConfirmDialog();

    // State
    const [filters, setFilters] = useState<TemplateFilters>({
        search: '',
        tipo: '',
        fase: '',
        isActive: null
    });
    const [page, setPage] = useState(1);
    const [editingTemplate, setEditingTemplate] = useState<DocumentoTemplate | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Query params with tenant filter
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            page,
            limit: 20,
            search: filters.search || undefined,
            tipo: filters.tipo || undefined,
            fase: filters.fase || undefined,
            isActive: filters.isActive !== null ? filters.isActive : undefined,
            ...tenantParams
        };
    }, [page, filters, getTenantFilterParams, tenantFilterKey]);

    // Fetch templates
    const { data: templatesData, isLoading, error, refetch } = useQuery({
        queryKey: ['modulistica-templates', tenantFilterKey, queryParams],
        queryFn: () => modulisticaTemplatesApi.getAll(queryParams),
        enabled: isReady
    });

    const templates = templatesData?.data || [];
    const totalPages = Math.ceil((templatesData?.total || 0) / 20);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: DocumentoTemplateInput) => modulisticaTemplatesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['modulistica-templates'] });
            showToast({ message: 'Template creato con successo', type: 'success' });
            setIsCreateModalOpen(false);
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore nella creazione', type: 'error' });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<DocumentoTemplateInput> }) =>
            modulisticaTemplatesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['modulistica-templates'] });
            showToast({ message: 'Template aggiornato con successo', type: 'success' });
            setEditingTemplate(null);
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore nell\'aggiornamento', type: 'error' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => modulisticaTemplatesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['modulistica-templates'] });
            showToast({ message: 'Template eliminato', type: 'success' });
        }
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            modulisticaTemplatesApi.toggleActive(id, isActive),
        onSuccess: (_, { isActive }) => {
            queryClient.invalidateQueries({ queryKey: ['modulistica-templates'] });
            showToast({
                message: isActive ? 'Template attivato' : 'Template disattivato',
                type: 'success'
            });
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: (id: string) => modulisticaTemplatesApi.duplicate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['modulistica-templates'] });
            showToast({ message: 'Template duplicato con successo', type: 'success' });
        }
    });

    const initDaNormativaMutation = useMutation({
        mutationFn: () => modulisticaTemplatesApi.initDaNormativa(),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['modulistica-templates'] });
            const createdCount = result?.created ?? 0;
            showToast({
                message: createdCount > 0
                    ? `Inizializzazione completata: ${createdCount} template creati, ${result?.skipped ?? 0} già presenti.`
                    : `Tutti i template MDL erano già presenti (${result?.skipped ?? 0}).`,
                type: 'success'
            });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore durante l\'inizializzazione', type: 'error' });
        }
    });

    // Handlers
    const handleDelete = useCallback(async (id: string, nome: string) => {
        if (await confirmDelete(nome)) {
            try {
                await deleteMutation.mutateAsync(id);
            } catch (error: unknown) {
                const serverMessage = (error as any)?.response?.data?.message || '';
                // P74: se ci sono documenti compilati attivi, offri l'alternativa di disattivare
                const compilatiMatch = serverMessage.match(/(\d+) documenti compilati attivi/);
                if (compilatiMatch) {
                    const count = compilatiMatch[1];
                    const shouldDeactivate = await confirm({
                        title: 'Template non eliminabile',
                        message: `Questo template ha ${count} documenti compilati attivi e non può essere eliminato.\n\nVuoi disattivarlo invece? Il template non sarà più proposto per nuovi documenti, ma quelli esistenti rimarranno intatti.`,
                        confirmLabel: 'Disattiva template',
                        cancelLabel: 'Annulla',
                        variant: 'warning'
                    });
                    if (shouldDeactivate) {
                        toggleActiveMutation.mutate({ id, isActive: false });
                    }
                } else {
                    showToast({ message: serverMessage || 'Errore nell\'eliminazione del template', type: 'error' });
                }
            }
        }
    }, [deleteMutation, confirmDelete, confirm, toggleActiveMutation, showToast]);

    const handleToggleActive = useCallback((id: string, currentActive: boolean) => {
        toggleActiveMutation.mutate({ id, isActive: !currentActive });
    }, [toggleActiveMutation]);

    const handleDuplicate = useCallback((id: string) => {
        duplicateMutation.mutate(id);
    }, [duplicateMutation]);

    // Reset filters
    const handleResetFilters = useCallback(() => {
        setFilters({ search: '', tipo: '', fase: '', isActive: null });
        setPage(1);
    }, []);

    // Active filters count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.tipo) count++;
        if (filters.fase) count++;
        if (filters.isActive !== null) count++;
        return count;
    }, [filters]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg">
                            <FileText className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-900">Modulistica</h1>
                            <p className="text-sm text-gray-500">
                                Gestione template documenti e moduli
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <CRUDButton
                            onClick={() => initDaNormativaMutation.mutate()}
                            disabled={initDaNormativaMutation.isPending}
                            className="flex items-center gap-2"
                            title="Crea automaticamente tutti i modelli obbligatori per la Medicina del Lavoro (D.Lgs 81/08)"
                        >
                            <BookOpen className="w-4 h-4" />
                            {initDaNormativaMutation.isPending ? 'Inizializzazione...' : 'Inizializza da normativa'}
                        </CRUDButton>
                        <CRUDPrimaryButton
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Nuovo Template
                        </CRUDPrimaryButton>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="mt-4 flex items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca template..."
                            value={filters.search}
                            onChange={(e) => {
                                setFilters(prev => ({ ...prev, search: e.target.value }));
                                setPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtri
                        {activeFiltersCount > 0 && (
                            <span className="bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Tipo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo documento
                                </label>
                                <select
                                    value={filters.tipo}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, tipo: e.target.value as TipoDocumentoTemplate | '' }));
                                        setPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Tutti i tipi</option>
                                    {TIPI_DOCUMENTO.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Fase */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fase
                                </label>
                                <select
                                    value={filters.fase}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, fase: e.target.value as FaseDocumento | '' }));
                                        setPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Tutte le fasi</option>
                                    {FASI_DOCUMENTO.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Stato */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Stato
                                </label>
                                <select
                                    value={filters.isActive === null ? '' : filters.isActive.toString()}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFilters(prev => ({
                                            ...prev,
                                            isActive: value === '' ? null : value === 'true'
                                        }));
                                        setPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Tutti</option>
                                    <option value="true">Attivi</option>
                                    <option value="false">Disattivati</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleResetFilters}
                                className="text-sm text-gray-600 hover:text-gray-800"
                            >
                                Resetta filtri
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <p className="text-red-700">Errore nel caricamento dei template</p>
                        <button
                            onClick={() => refetch()}
                            className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
                        >
                            Riprova
                        </button>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Nessun template trovato
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {filters.search || filters.tipo || filters.fase || filters.isActive !== null
                                ? 'Prova a modificare i filtri di ricerca'
                                : 'Inizia creando il tuo primo template documento'}
                        </p>
                        {canPerformCRUD && !filters.search && !filters.tipo && !filters.fase && filters.isActive === null && (
                            <CRUDPrimaryButton onClick={() => setIsCreateModalOpen(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Crea Template
                            </CRUDPrimaryButton>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Templates Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => navigate(`/poliambulatorio/impostazioni/modulistica/${template.id}`)}
                                    className={`bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${!template.isActive ? 'opacity-60' : ''
                                        }`}
                                >
                                    {/* Card Header */}
                                    <div className="p-4 border-b border-gray-100">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTipoColor(template.tipo)}`}>
                                                        {getTipoLabel(template.tipo)}
                                                    </span>
                                                    {template.obbligatorio && (
                                                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                                                            Obbligatorio
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-medium text-gray-900 truncate">
                                                    {template.nome}
                                                </h3>
                                                {template.codice && (
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        Codice: {template.codice}
                                                    </p>
                                                )}
                                            </div>
                                            <ActionButton
                                                theme="teal"
                                                actions={[
                                                    {
                                                        label: 'Modifica',
                                                        icon: <Edit className="w-4 h-4" />,
                                                        onClick: () => setEditingTemplate(template)
                                                    },
                                                    {
                                                        label: 'Duplica',
                                                        icon: <Copy className="w-4 h-4" />,
                                                        onClick: () => handleDuplicate(template.id)
                                                    },
                                                    {
                                                        label: template.isActive ? 'Disattiva' : 'Attiva',
                                                        icon: template.isActive ?
                                                            <ToggleRight className="w-4 h-4" /> :
                                                            <ToggleLeft className="w-4 h-4" />,
                                                        onClick: () => handleToggleActive(template.id, template.isActive)
                                                    },
                                                    {
                                                        label: 'Elimina',
                                                        icon: <Trash2 className="w-4 h-4" />,
                                                        onClick: () => handleDelete(template.id, template.nome),
                                                        variant: 'danger'
                                                    }
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4 space-y-3">
                                        {template.descrizione && (
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {template.descrizione}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {/* Fase */}
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-gray-700">
                                                <Clock className="w-3 h-3" />
                                                {getFaseLabel(template.fase)}
                                            </span>

                                            {/* Firma paziente */}
                                            {template.richiedeFirma && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-blue-700">
                                                    <FileSignature className="w-3 h-3" />
                                                    Firma Pz
                                                </span>
                                            )}

                                            {/* Firma medico */}
                                            {template.richiedeFirmaMedico && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 rounded text-green-700">
                                                    <Stethoscope className="w-3 h-3" />
                                                    Firma Med
                                                </span>
                                            )}

                                            {/* Scadenza */}
                                            {template.validitaGiorni && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 rounded text-orange-700">
                                                    <Clock className="w-3 h-3" />
                                                    {template.validitaGiorni}gg
                                                </span>
                                            )}
                                        </div>

                                        {/* Associations */}
                                        {((template.prestazioni?.length || 0) > 0 || (template.medici?.length || 0) > 0) && (
                                            <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                                                {(template.prestazioni?.length || 0) > 0 && (
                                                    <p className="flex items-center gap-1">
                                                        <Settings className="w-3 h-3" />
                                                        {template.prestazioni?.length} prestazioni associate
                                                    </p>
                                                )}
                                                {(template.medici?.length || 0) > 0 && (
                                                    <p className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {template.medici?.length} medici associati
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Stats */}
                                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                                            <span className="text-gray-500">
                                                v{template.versione}
                                            </span>
                                            <span className="text-gray-500">
                                                {template._count?.compilati || 0} compilati
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Precedente
                                </button>
                                <span className="px-4 py-2 text-sm text-gray-600">
                                    Pagina {page} di {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Successiva
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <TemplateFormModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={(data) => createMutation.mutate(data)}
                    isLoading={createMutation.isPending}
                />
            )}

            {/* Edit Modal */}
            {editingTemplate && (
                <TemplateFormModal
                    isOpen={!!editingTemplate}
                    onClose={() => setEditingTemplate(null)}
                    onSave={(data) => updateMutation.mutate({ id: editingTemplate.id, data })}
                    template={editingTemplate}
                    isLoading={updateMutation.isPending}
                />
            )}
        </div>
    );
};

export default ModulisticaPage;
