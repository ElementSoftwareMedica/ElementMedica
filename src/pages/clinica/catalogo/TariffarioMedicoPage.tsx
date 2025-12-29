/**
 * TariffarioMedicoPage - Gestione Tariffari per Medico
 * 
 * Pagina per la gestione dei compensi personalizzati per medico.
 * Consente di definire compensi specifici per medico, branca e convenzione.
 * 
 * Progetto 44: Sistema Tariffario Avanzato
 * 
 * @module pages/clinica/catalogo/TariffarioMedicoPage
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    UserCog,
    Plus,
    Search,
    Edit,
    Trash2,
    RefreshCw,
    AlertCircle,
    Stethoscope,
    Euro,
    Percent,
    Activity,
    Filter,
    X,
    Check,
    ChevronDown,
    ChevronUp,
    Info
} from 'lucide-react';

import { useTenantFilter } from '../../../context/TenantFilterContext';
import {
    tariffarioMedicoApi,
    mediciApi,
    convenzioniApi,
    TariffarioMedico,
    TariffarioMedicoInput,
    TipoCompensoMedico
} from '../../../services/clinicaApi';

// =====================================================
// TYPES
// =====================================================

interface FilterState {
    search: string;
    status: 'all' | 'active' | 'inactive';
    medicoId: string;
}

interface FormData extends Omit<TariffarioMedicoInput, 'medicoId'> {
    medicoId: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const TIPO_COMPENSO_OPTIONS: { value: TipoCompensoMedico; label: string; icon: React.ReactNode }[] = [
    { value: 'PERCENTUALE', label: 'Percentuale', icon: <Percent className="w-4 h-4" /> },
    { value: 'FISSO', label: 'Importo Fisso', icon: <Euro className="w-4 h-4" /> },
    { value: 'MINIMO_MASSIMO', label: 'Minimo/Massimo', icon: <Activity className="w-4 h-4" /> }
];

const BRANCHE_SPECIALISTICHE = [
    'Cardiologia',
    'Dermatologia',
    'Endocrinologia',
    'Gastroenterologia',
    'Ginecologia',
    'Medicina Generale',
    'Neurologia',
    'Oculistica',
    'Ortopedia',
    'Otorinolaringoiatria',
    'Pediatria',
    'Pneumologia',
    'Urologia',
    'Altro'
];

// =====================================================
// HELPER COMPONENTS
// =====================================================

const StatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
    >
        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
        {isActive ? 'Attivo' : 'Non attivo'}
    </span>
);

const TipoCompensoBadge: React.FC<{ tipo: TipoCompensoMedico }> = ({ tipo }) => {
    const config = TIPO_COMPENSO_OPTIONS.find(o => o.value === tipo);
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {config?.icon}
            {config?.label || tipo}
        </span>
    );
};

const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
};

const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return `${value}%`;
};

const formatCompenso = (tariffario: TariffarioMedico): string => {
    switch (tariffario.compensoMedicoTipo) {
        case 'PERCENTUALE':
            return formatPercentage(tariffario.compensoMedicoValore);
        case 'FISSO':
            return formatCurrency(tariffario.compensoMedicoValore);
        case 'MINIMO_MASSIMO':
            return `${formatCurrency(tariffario.compensoMedicoMinimo)} - ${formatCurrency(tariffario.compensoMedicoMassimo)}`;
        default:
            return '-';
    }
};

// =====================================================
// FORM MODAL COMPONENT
// =====================================================

interface TariffarioFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TariffarioMedicoInput) => void;
    initialData?: TariffarioMedico;
    isLoading: boolean;
}

const TariffarioFormModal: React.FC<TariffarioFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isLoading
}) => {
    const { getTenantFilterParams } = useTenantFilter();
    const tenantParams = getTenantFilterParams();

    // Fetch medici and convenzioni for dropdowns
    const { data: mediciResponse } = useQuery({
        queryKey: ['medici-dropdown'],
        queryFn: () => mediciApi.getAll({ limit: 1000, ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }) }),
        enabled: isOpen
    });

    const { data: convenzioniResponse } = useQuery({
        queryKey: ['convenzioni-dropdown'],
        queryFn: () => convenzioniApi.getAll({ limit: 1000, ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }) }),
        enabled: isOpen
    });

    const medici = mediciResponse?.data || [];
    const convenzioni = convenzioniResponse?.data || [];

    const [formData, setFormData] = useState<FormData>({
        medicoId: initialData?.medicoId || '',
        brancaSpecialistica: initialData?.brancaSpecialistica || '',
        convenzioneId: initialData?.convenzioneId || '',
        compensoMedicoTipo: initialData?.compensoMedicoTipo || 'PERCENTUALE',
        compensoMedicoValore: initialData?.compensoMedicoValore || undefined,
        compensoMedicoMinimo: initialData?.compensoMedicoMinimo || undefined,
        compensoMedicoMassimo: initialData?.compensoMedicoMassimo || undefined,
        note: initialData?.note || '',
        attivo: initialData?.attivo ?? true,
        priorita: initialData?.priorita || 0
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.medicoId) {
            alert('Seleziona un medico');
            return;
        }
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {initialData ? 'Modifica Tariffario Medico' : 'Nuovo Tariffario Medico'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Medico Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Medico *
                        </label>
                        <select
                            value={formData.medicoId}
                            onChange={(e) => setFormData(prev => ({ ...prev, medicoId: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            required
                        >
                            <option value="">Seleziona medico...</option>
                            {medici.map((medico) => (
                                <option key={medico.id} value={medico.id}>
                                    {medico.nome || medico.firstName} {medico.cognome || medico.lastName}
                                    {medico.specializzazione && ` - ${medico.specializzazione}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Branca Specialistica */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Branca Specialistica
                            <span className="ml-2 text-xs text-gray-500">(opzionale, per priorità)</span>
                        </label>
                        <select
                            value={formData.brancaSpecialistica || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, brancaSpecialistica: e.target.value || undefined }))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="">Tutte le branche</option>
                            {BRANCHE_SPECIALISTICHE.map((branca) => (
                                <option key={branca} value={branca}>{branca}</option>
                            ))}
                        </select>
                    </div>

                    {/* Convenzione */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Convenzione
                            <span className="ml-2 text-xs text-gray-500">(opzionale, per priorità)</span>
                        </label>
                        <select
                            value={formData.convenzioneId || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, convenzioneId: e.target.value || undefined }))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="">Nessuna convenzione specifica</option>
                            {convenzioni.map((conv) => (
                                <option key={conv.id} value={conv.id}>{conv.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tipo Compenso */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tipo Compenso *
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {TIPO_COMPENSO_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        compensoMedicoTipo: option.value,
                                        compensoMedicoValore: option.value === 'MINIMO_MASSIMO' ? undefined : prev.compensoMedicoValore,
                                        compensoMedicoMinimo: option.value !== 'MINIMO_MASSIMO' ? undefined : prev.compensoMedicoMinimo,
                                        compensoMedicoMassimo: option.value !== 'MINIMO_MASSIMO' ? undefined : prev.compensoMedicoMassimo
                                    }))}
                                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${formData.compensoMedicoTipo === option.value
                                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400'
                                        }`}
                                >
                                    {option.icon}
                                    <span className="text-sm font-medium">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Compenso Values */}
                    {formData.compensoMedicoTipo === 'MINIMO_MASSIMO' ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Minimo (€) *
                                </label>
                                <div className="relative">
                                    <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.compensoMedicoMinimo || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, compensoMedicoMinimo: parseFloat(e.target.value) || undefined }))}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Massimo (€) *
                                </label>
                                <div className="relative">
                                    <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.compensoMedicoMassimo || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, compensoMedicoMassimo: parseFloat(e.target.value) || undefined }))}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {formData.compensoMedicoTipo === 'PERCENTUALE' ? 'Percentuale (%) *' : 'Importo (€) *'}
                            </label>
                            <div className="relative">
                                {formData.compensoMedicoTipo === 'PERCENTUALE' ? (
                                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                ) : (
                                    <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                )}
                                <input
                                    type="number"
                                    step={formData.compensoMedicoTipo === 'PERCENTUALE' ? '1' : '0.01'}
                                    min="0"
                                    max={formData.compensoMedicoTipo === 'PERCENTUALE' ? '100' : undefined}
                                    value={formData.compensoMedicoValore || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, compensoMedicoValore: parseFloat(e.target.value) || undefined }))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                    placeholder={formData.compensoMedicoTipo === 'PERCENTUALE' ? '30' : '50.00'}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Priorità info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex gap-3">
                            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                                <p className="font-medium">Priorità di applicazione</p>
                                <p className="mt-1 text-blue-600 dark:text-blue-400">
                                    Il sistema applica il tariffario più specifico disponibile:
                                </p>
                                <ol className="mt-2 space-y-1 text-blue-600 dark:text-blue-400 list-decimal list-inside">
                                    <li>Medico + Branca + Convenzione (massima priorità)</li>
                                    <li>Medico + Branca</li>
                                    <li>Medico + Convenzione</li>
                                    <li>Solo Medico (priorità base)</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Note
                        </label>
                        <textarea
                            value={formData.note || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                            rows={3}
                            placeholder="Note aggiuntive..."
                        />
                    </div>

                    {/* Attivo toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, attivo: !prev.attivo }))}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.attivo ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.attivo ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            {formData.attivo ? 'Attivo' : 'Non attivo'}
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            {initialData ? 'Salva Modifiche' : 'Crea Tariffario'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export const TariffarioMedicoPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    // State
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        status: 'all',
        medicoId: ''
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTariffario, setEditingTariffario] = useState<TariffarioMedico | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Query params
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            page,
            limit: 20,
            search: filters.search || undefined,
            attivo: filters.status === 'all' ? undefined : filters.status === 'active',
            medicoId: filters.medicoId || undefined,
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [page, filters, getTenantFilterParams]);

    // Queries
    const {
        data: response,
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['tariffari-medico', queryParams, tenantFilterKey],
        queryFn: () => tariffarioMedicoApi.getAll(queryParams),
        enabled: isReady
    });

    const { data: mediciResponse } = useQuery({
        queryKey: ['medici-filter'],
        queryFn: () => mediciApi.getAll({ limit: 1000 }),
        enabled: isReady
    });

    const mediciList = mediciResponse?.data || [];

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: TariffarioMedicoInput) => tariffarioMedicoApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tariffari-medico'] });
            setIsModalOpen(false);
            setEditingTariffario(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: TariffarioMedicoInput }) =>
            tariffarioMedicoApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tariffari-medico'] });
            setIsModalOpen(false);
            setEditingTariffario(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => tariffarioMedicoApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tariffari-medico'] });
        }
    });

    // Extract data
    const tariffari = response?.data || [];
    const pagination = response?.pagination;

    // Handlers
    const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, search: e.target.value }));
        setPage(1);
    }, []);

    const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    }, []);

    const handleCreate = useCallback(() => {
        setEditingTariffario(null);
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback((tariffario: TariffarioMedico) => {
        setEditingTariffario(tariffario);
        setIsModalOpen(true);
    }, []);

    const handleDelete = useCallback((id: string, medico: string) => {
        if (window.confirm(`Sei sicuro di voler eliminare il tariffario per "${medico}"?`)) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation]);

    const handleSubmit = useCallback((data: TariffarioMedicoInput) => {
        if (editingTariffario) {
            updateMutation.mutate({ id: editingTariffario.id, data });
        } else {
            createMutation.mutate(data);
        }
    }, [editingTariffario, createMutation, updateMutation]);

    const getMedicoName = (tariffario: TariffarioMedico): string => {
        if (tariffario.medico) {
            const nome = tariffario.medico.nome || tariffario.medico.firstName || '';
            const cognome = tariffario.medico.cognome || tariffario.medico.lastName || '';
            return `${nome} ${cognome}`.trim() || 'Medico';
        }
        return 'Medico non trovato';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <UserCog className="w-7 h-7 text-teal-600" />
                        Tariffari per Medico
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gestisci i compensi personalizzati per ogni medico
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Aggiorna"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleCreate}
                        className="clinica-button-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nuovo Tariffario
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={filters.search}
                                onChange={handleSearch}
                                placeholder="Cerca per medico, branca..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-3">
                        <select
                            value={filters.medicoId}
                            onChange={(e) => handleFilterChange('medicoId', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="">Tutti i medici</option>
                            {mediciList.map((medico) => (
                                <option key={medico.id} value={medico.id}>
                                    {medico.nome || medico.firstName} {medico.cognome || medico.lastName}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="all">Tutti gli stati</option>
                            <option value="active">Attivi</option>
                            <option value="inactive">Non attivi</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                </div>
            ) : isError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                    <p className="text-red-700 dark:text-red-300">Errore nel caricamento dei tariffari</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-3 text-red-600 hover:text-red-700 dark:text-red-400 font-medium"
                    >
                        Riprova
                    </button>
                </div>
            ) : tariffari.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <UserCog className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Nessun tariffario trovato
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {filters.search || filters.medicoId || filters.status !== 'all'
                            ? 'Prova a modificare i filtri di ricerca'
                            : 'Inizia creando il primo tariffario per medico'}
                    </p>
                    {!filters.search && !filters.medicoId && filters.status === 'all' && (
                        <button onClick={handleCreate} className="clinica-button-primary">
                            <Plus className="w-4 h-4 mr-2" />
                            Crea primo tariffario
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Medico
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Branca / Convenzione
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Tipo Compenso
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Valore
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Stato
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Azioni
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {tariffari.map((tariffario) => (
                                <tr key={tariffario.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                                                <Stethoscope className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {getMedicoName(tariffario)}
                                                </p>
                                                {tariffario.medico?.specializzazione && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {tariffario.medico.specializzazione}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            {tariffario.brancaSpecialistica && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                    {tariffario.brancaSpecialistica}
                                                </span>
                                            )}
                                            {tariffario.convenzione && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                    {tariffario.convenzione.nome}
                                                </span>
                                            )}
                                            {!tariffario.brancaSpecialistica && !tariffario.convenzione && (
                                                <span className="text-sm text-gray-400 dark:text-gray-500">
                                                    Generico
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <TipoCompensoBadge tipo={tariffario.compensoMedicoTipo} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-gray-900 dark:text-white">
                                            {formatCompenso(tariffario)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <StatusBadge isActive={tariffario.attivo} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(tariffario)}
                                                className="p-2 text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                                title="Modifica"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tariffario.id, getMedicoName(tariffario))}
                                                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                                title="Elimina"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} risultati)
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    Precedente
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                    disabled={page >= pagination.totalPages}
                                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    Successiva
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            <TariffarioFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingTariffario(null);
                }}
                onSubmit={handleSubmit}
                initialData={editingTariffario || undefined}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    );
};

export default TariffarioMedicoPage;
