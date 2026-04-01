/**
 * ConvenzioniPage Component
 * Main page for managing agreements (convenzioni)
 * 
 * Features:
 * - List with filtering
 * - Validity status display
 * - Quick view of associated price lists
 * - Active/inactive filtering
 * 
 * @module pages/poliambulatorio/catalogo/ConvenzioniPage
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    Handshake,
    Edit,
    Trash2,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Calendar,
    Building2,
    Clock,
    AlertTriangle,
    Grid3X3,
    List as ListIcon,
} from 'lucide-react';
import {
    convenzioniApi,
    Convenzione,
    PaginatedResponse
} from '../../../services/clinicaApi';
import { formatDate, isPast, isFuture } from '../../../utils/dateUtils';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useViewMode, type ViewMode } from '../../../hooks/useViewMode';
import { useToast } from '../../../hooks/useToast';
import { ActionMenu, createCrudActions } from '@/components/ui/ActionMenu';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

interface FilterState {
    search: string;
    status: 'all' | 'active' | 'inactive';
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const getValidityStatus = (convenzione: Convenzione): { status: 'valid' | 'expired' | 'future'; label: string; color: string } => {
    const now = new Date();
    const validoDa = new Date(convenzione.dataInizio);
    const validoA = convenzione.dataFine ? new Date(convenzione.dataFine) : null;

    if (validoDa > now) {
        return {
            status: 'future',
            label: 'Non ancora attiva',
            color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
        };
    }

    if (validoA && validoA < now) {
        return {
            status: 'expired',
            label: 'Scaduta',
            color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
    }

    return {
        status: 'valid',
        label: 'Valida',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    };
};

// =====================================================
// HELPER COMPONENTS
// =====================================================

const StatusIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isActive
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
        }`}>
        {isActive ? (
            <>
                <CheckCircle className="w-3 h-3" />
                Attiva
            </>
        ) : (
            <>
                <XCircle className="w-3 h-3" />
                Disattiva
            </>
        )}
    </span>
);

const ValidityBadge: React.FC<{ convenzione: Convenzione }> = ({ convenzione }) => {
    const { label, color } = getValidityStatus(convenzione);
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
            {label}
        </span>
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export const ConvenzioniPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // View mode with localStorage persistence
    const { viewMode, setViewMode } = useViewMode({ storageKey: 'convenzioni', defaultMode: 'grid' });

    // State
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        status: 'all',
    });

    // Query params
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            page,
            limit: 12,
            search: filters.search || undefined,
            isActive: filters.status === 'all' ? undefined : filters.status === 'active',
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [page, filters, getTenantFilterParams, tenantFilterKey]);

    // Queries
    const {
        data: response,
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['convenzioni', queryParams, tenantFilterKey],
        queryFn: () => convenzioniApi.getAll(queryParams),
        enabled: isReady
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: (id: string) => convenzioniApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['convenzioni'] });
            showToast({ type: 'success', message: 'Convenzione eliminata con successo' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    // Extract data
    const convenzioni = response?.data || [];
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

    const handleDelete = useCallback(async (id: string) => {
        if (await confirmDelete('questa convenzione')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation, confirmDelete]);

    const handleView = useCallback((id: string) => {
        navigate(`/poliambulatorio/catalogo/convenzioni/${id}`);
    }, [navigate]);

    const handleEdit = useCallback((id: string) => {
        navigate(`/poliambulatorio/catalogo/convenzioni/${id}/modifica`);
    }, [navigate]);

    // Render
    return (
        <div className="p-6 space-y-6" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Convenzioni
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gestione accordi con enti e assicurazioni
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Aggiorna"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <CRUDButton
                        operation="create"
                        onClick={() => navigate('/poliambulatorio/catalogo/convenzioni/nuovo')}
                        className="clinica-button-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nuova Convenzione
                    </CRUDButton>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={handleSearch}
                            placeholder="Cerca per nome, codice o ente..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="all">Tutti gli stati</option>
                        <option value="active">Solo attive</option>
                        <option value="inactive">Solo disattive</option>
                    </select>

                    {/* View Toggle */}
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 ${viewMode === 'list' ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <ListIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 ${viewMode === 'grid' ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <Grid3X3 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
                </div>
            ) : isError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Errore nel caricamento</h3>
                    <p className="text-red-600 dark:text-red-300 mt-1">Non è stato possibile caricare le convenzioni</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                        Riprova
                    </button>
                </div>
            ) : convenzioni.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Handshake className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nessuna convenzione</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {filters.search || filters.status !== 'all'
                            ? 'Nessuna convenzione corrisponde ai filtri selezionati'
                            : 'Inizia creando la tua prima convenzione'}
                    </p>
                    {!filters.search && filters.status === 'all' && (
                        <Link
                            to="/poliambulatorio/catalogo/convenzioni/nuovo"
                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                        >
                            <Plus className="w-4 h-4" />
                            Nuova Convenzione
                        </Link>
                    )}
                </div>
            ) : viewMode === 'list' ? (
                /* Table/List View */
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    Convenzione
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    Ente Terzo
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    Validità
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    Stato
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    Azioni
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {convenzioni.map((convenzione) => {
                                const validity = getValidityStatus(convenzione);
                                return (
                                    <tr
                                        key={convenzione.id}
                                        onClick={() => handleView(convenzione.id)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${validity.status === 'expired'
                                                    ? 'bg-red-100 dark:bg-red-900/30'
                                                    : 'bg-purple-100 dark:bg-purple-900/30'
                                                    }`}>
                                                    <Handshake className={`w-4 h-4 ${validity.status === 'expired'
                                                        ? 'text-red-600 dark:text-red-400'
                                                        : 'text-purple-600 dark:text-purple-400'
                                                        }`} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {convenzione.nome}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                        {convenzione.codice}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                                {convenzione.enteTerzo || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {formatDate(convenzione.dataInizio, 'short')}
                                                    {convenzione.dataFine ? ` - ${formatDate(convenzione.dataFine, 'short')}` : ''}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${validity.color}`}>
                                                    {validity.label}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusIndicator isActive={convenzione.attiva} />
                                        </td>
                                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <ActionMenu
                                                theme="teal"
                                                size="sm"
                                                actions={createCrudActions({
                                                    onView: () => handleView(convenzione.id),
                                                    onEdit: () => handleEdit(convenzione.id),
                                                    onDelete: () => handleDelete(convenzione.id)
                                                })}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {convenzioni.map((convenzione) => {
                        const validity = getValidityStatus(convenzione);

                        return (
                            <div
                                key={convenzione.id}
                                onClick={() => handleView(convenzione.id)}
                                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border hover:shadow-lg transition-shadow cursor-pointer ${validity.status === 'expired'
                                    ? 'border-red-200 dark:border-red-800'
                                    : 'border-gray-200 dark:border-gray-700'
                                    } p-5`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${validity.status === 'expired'
                                            ? 'bg-red-100 dark:bg-red-900/30'
                                            : 'bg-purple-100 dark:bg-purple-900/30'
                                            }`}>
                                            <Handshake className={`w-5 h-5 ${validity.status === 'expired'
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-purple-600 dark:text-purple-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-white">
                                                {convenzione.nome}
                                            </h3>
                                            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                                {convenzione.codice}
                                            </span>
                                        </div>
                                    </div>
                                    <ValidityBadge convenzione={convenzione} />
                                </div>

                                {convenzione.enteTerzo && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                        <Building2 className="w-4 h-4" />
                                        {convenzione.enteTerzo}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(convenzione.dataInizio, 'short')}
                                    {convenzione.dataFine ? ` - ${formatDate(convenzione.dataFine, 'short')}` : ' - Illimitata'}
                                </div>

                                {validity.status === 'expired' && (
                                    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-300 mb-4">
                                        <AlertTriangle className="w-4 h-4" />
                                        Convenzione scaduta
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                                    <StatusIndicator isActive={convenzione.attiva} />
                                    <ActionMenu
                                        theme="teal"
                                        size="sm"
                                        actions={createCrudActions({
                                            onView: () => handleView(convenzione.id),
                                            onEdit: () => handleEdit(convenzione.id),
                                            onDelete: () => handleDelete(convenzione.id)
                                        })}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Mostrando {((page - 1) * 12) + 1}-{Math.min(page * 12, pagination.total)} di {pagination.total}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Precedente
                        </button>
                        <span className="px-3 py-1 text-gray-600 dark:text-gray-400">
                            Pagina {page} di {pagination.totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                            disabled={page === pagination.totalPages}
                            className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Successiva
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConvenzioniPage;
