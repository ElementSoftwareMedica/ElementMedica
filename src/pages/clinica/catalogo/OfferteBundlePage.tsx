/**
 * OfferteBundlePage - Gestione Offerte Bundle/Pacchetti
 * 
 * Pagina per la gestione delle offerte bundle che raggruppano più prestazioni
 * con prezzi scontati rispetto all'acquisto singolo.
 * 
 * @module pages/clinica/catalogo/OfferteBundlePage
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Package,
    Plus,
    Search,
    Edit,
    Trash2,
    RefreshCw,
    AlertCircle,
    Calendar,
    ToggleLeft,
    ToggleRight,
    Eye,
    Tag,
    TrendingDown,
    Activity,
    Grid3X3,
    List as ListIcon,
} from 'lucide-react';

import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useViewMode, type ViewMode } from '../../../hooks/useViewMode';
import { useToast } from '../../../hooks/useToast';
import { bundleApi, OffertaBundle } from '../../../services/clinicaApi';
import { ActionMenu, createCrudActions } from '@/components/ui/ActionMenu';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';

// Types
interface FilterState {
    search: string;
    status: 'all' | 'active' | 'inactive';
}

// Status Indicator Component
const StatusIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => (
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

// Format date helper
const formatDate = (dateStr: string | null | undefined, style: 'short' | 'long' = 'short'): string => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (style === 'short') {
            return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return '-';
    }
};

// Format currency helper
const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '€0,00';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
};

// Calculate risparmio
const calcolaRisparmio = (bundle: OffertaBundle): { valore: number; percentuale: number } => {
    const prezzoSingoli = bundle.prezzoSingoli || 0;
    const prezzoBundle = bundle.prezzoBundle || 0;
    const valore = prezzoSingoli - prezzoBundle;
    const percentuale = prezzoSingoli > 0 ? (valore / prezzoSingoli) * 100 : 0;
    return { valore, percentuale };
};

/**
 * OfferteBundlePage Component
 * 
 * Gestisce la visualizzazione e gestione delle offerte bundle.
 * Include ricerca, filtri per stato, toggle attivazione e CRUD operations.
 */
const OfferteBundlePage: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();

    // View mode with localStorage persistence
    const { viewMode, setViewMode } = useViewMode({ storageKey: 'bundles', defaultMode: 'grid' });

    // State
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        status: 'all',
    });
    const [expandedBundle, setExpandedBundle] = useState<string | null>(null);

    // Query params
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            page,
            limit: 12,
            search: filters.search || undefined,
            attivo: filters.status === 'all' ? undefined : filters.status === 'active',
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
        queryKey: ['bundles', queryParams, tenantFilterKey],
        queryFn: () => bundleApi.getAll(queryParams),
        enabled: isReady
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: (id: string) => bundleApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bundles'] });
            showToast({ type: 'success', message: 'Bundle eliminato con successo' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione' });
        }
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, attivo }: { id: string; attivo: boolean }) =>
            bundleApi.toggle(id, !attivo),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bundles'] });
            showToast({ type: 'success', message: 'Stato aggiornato con successo' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore durante l\'aggiornamento' });
        }
    });

    // Extract data
    const bundles = response?.data || [];
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

    const handleDelete = useCallback(async (id: string, nome: string) => {
        if (await confirmDelete(nome)) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation, confirmDelete]);

    const handleView = useCallback((id: string) => {
        navigate(`/poliambulatorio/catalogo/bundles/${id}`);
    }, [navigate]);

    const handleEdit = useCallback((id: string) => {
        navigate(`/poliambulatorio/catalogo/bundles/${id}/modifica`);
    }, [navigate]);

    const handleToggle = useCallback((id: string, attivo: boolean) => {
        toggleMutation.mutate({ id, attivo });
    }, [toggleMutation]);

    const toggleExpand = useCallback((id: string) => {
        setExpandedBundle(prev => prev === id ? null : id);
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Offerte Bundle
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gestisci pacchetti di prestazioni con prezzi scontati
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
                        onClick={() => navigate('/poliambulatorio/catalogo/bundles/nuovo')}
                        className="clinica-button-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nuovo Bundle
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
                            placeholder="Cerca per nome o codice..."
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
                        <option value="active">Solo attivi</option>
                        <option value="inactive">Solo disattivi</option>
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
                    <p className="text-red-600 dark:text-red-300 mt-1">Non è stato possibile caricare i bundle</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                        Riprova
                    </button>
                </div>
            ) : bundles.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nessun bundle</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {filters.search || filters.status !== 'all'
                            ? 'Nessun bundle corrisponde ai filtri selezionati'
                            : 'Inizia creando il tuo primo pacchetto di prestazioni'}
                    </p>
                    {!filters.search && filters.status === 'all' && (
                        <Link
                            to="/poliambulatorio/catalogo/bundles/nuovo"
                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                        >
                            <Plus className="w-4 h-4" />
                            Nuovo Bundle
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
                                    Bundle
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    Prestazioni
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    Prezzo Singoli
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    Prezzo Bundle
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    Risparmio
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
                            {bundles.map((bundle) => {
                                const risparmio = calcolaRisparmio(bundle);
                                return (
                                    <tr
                                        key={bundle.id}
                                        onClick={() => handleView(bundle.id)}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                                    <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {bundle.nome}
                                                    </p>
                                                    {bundle.codice && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                            {bundle.codice}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                                                <Activity className="w-4 h-4 text-gray-400" />
                                                {bundle.prestazioni?.length || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                                                {formatCurrency(bundle.prezzoSingoli)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                                                {formatCurrency(bundle.prezzoBundle)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                <TrendingDown className="w-3 h-3" />
                                                {risparmio.percentuale.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusIndicator isActive={bundle.attivo} />
                                        </td>
                                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggle(bundle.id, bundle.attivo)}
                                                    className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 ${bundle.attivo
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-gray-400 dark:text-gray-500'
                                                        }`}
                                                    title={bundle.attivo ? 'Disattiva' : 'Attiva'}
                                                >
                                                    {bundle.attivo ? (
                                                        <ToggleRight className="w-4 h-4" />
                                                    ) : (
                                                        <ToggleLeft className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <ActionMenu
                                                    theme="teal"
                                                    size="sm"
                                                    actions={createCrudActions({
                                                        onView: () => handleView(bundle.id),
                                                        onEdit: () => handleEdit(bundle.id),
                                                        onDelete: () => handleDelete(bundle.id, bundle.nome)
                                                    })}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {bundles.map((bundle) => {
                        const risparmio = calcolaRisparmio(bundle);
                        const isExpanded = expandedBundle === bundle.id;

                        return (
                            <div
                                key={bundle.id}
                                onClick={() => handleView(bundle.id)}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                            >
                                {/* Main Card Content */}
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                                <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    {bundle.nome}
                                                </h3>
                                                {bundle.codice && (
                                                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                                        {bundle.codice}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <StatusIndicator isActive={bundle.attivo} />
                                    </div>

                                    {/* Price Info */}
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Prezzo Singoli</div>
                                            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 line-through">
                                                {formatCurrency(bundle.prezzoSingoli)}
                                            </div>
                                        </div>
                                        <div className="text-center p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                                            <div className="text-xs text-teal-600 dark:text-teal-400 mb-1">Prezzo Bundle</div>
                                            <div className="text-lg font-bold text-teal-700 dark:text-teal-300">
                                                {formatCurrency(bundle.prezzoBundle)}
                                            </div>
                                        </div>
                                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <div className="text-xs text-green-600 dark:text-green-400 mb-1 flex items-center justify-center gap-1">
                                                <TrendingDown className="w-3 h-3" />
                                                Risparmio
                                            </div>
                                            <div className="text-sm font-bold text-green-700 dark:text-green-300">
                                                {risparmio.percentuale.toFixed(0)}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Meta Info */}
                                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        <span className="flex items-center gap-1">
                                            <Activity className="w-4 h-4" />
                                            {bundle.prestazioni?.length || 0} prestazioni
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {formatDate(bundle.validoDa)}
                                            {bundle.validoA && ` - ${formatDate(bundle.validoA)}`}
                                        </span>
                                    </div>

                                    {/* Description if exists */}
                                    {bundle.descrizione && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                            {bundle.descrizione}
                                        </p>
                                    )}

                                    {/* Expanded Prestazioni List */}
                                    {isExpanded && bundle.prestazioni && bundle.prestazioni.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Prestazioni incluse:
                                            </h4>
                                            <ul className="space-y-2">
                                                {bundle.prestazioni.map((p, idx) => (
                                                    <li key={idx} className="flex items-center justify-between text-sm">
                                                        <span className="flex items-center gap-2">
                                                            <Tag className="w-3 h-3 text-gray-400" />
                                                            <span className="text-gray-700 dark:text-gray-300">
                                                                {p.prestazione?.nome || `Prestazione ${idx + 1}`}
                                                            </span>
                                                            {p.obbligatoria && (
                                                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                                                                    Obbligatoria
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-gray-500 dark:text-gray-400">
                                                            x{p.quantita || 1}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Actions Footer */}
                                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => toggleExpand(bundle.id)}
                                        className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400"
                                    >
                                        <Eye className="w-4 h-4" />
                                        {isExpanded ? 'Nascondi dettagli' : 'Mostra dettagli'}
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggle(bundle.id, bundle.attivo)}
                                            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 ${bundle.attivo
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-gray-400 dark:text-gray-500'
                                                }`}
                                            title={bundle.attivo ? 'Disattiva' : 'Attiva'}
                                        >
                                            {bundle.attivo ? (
                                                <ToggleRight className="w-5 h-5" />
                                            ) : (
                                                <ToggleLeft className="w-5 h-5" />
                                            )}
                                        </button>
                                        <ActionMenu
                                            theme="teal"
                                            size="sm"
                                            actions={createCrudActions({
                                                onView: () => handleView(bundle.id),
                                                onEdit: () => handleEdit(bundle.id),
                                                onDelete: () => handleDelete(bundle.id, bundle.nome)
                                            })}
                                        />
                                    </div>
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

export default OfferteBundlePage;
