/**
 * PrestazioniPage Component
 * Main page for managing medical services (prestazioni)
 * 
 * Features:
 * - List with pagination and filtering
 * - Filter by type, status
 * - Search by name/code
 * - View/Edit/Delete actions
 * - Quick actions for associated ambulatori/medici
 * 
 * @module pages/poliambulatorio/catalogo/PrestazioniPage
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus,
    Search,
    Filter,
    Grid3X3,
    List as ListIcon,
    Edit,
    Trash2,
    Clock,
    FileText,
    Stethoscope,
    Building2,
    Users,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Download,
    MoreHorizontal,
    Activity
} from 'lucide-react';
import {
    prestazioniApi,
    Prestazione,
    TipoPrestazione,
    PaginatedResponse
} from '../../../services/clinicaApi';
import { formatDate, formatDuration } from '../../../utils/dateUtils';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

type ViewMode = 'grid' | 'table';

interface FilterState {
    search: string;
    tipo: TipoPrestazione | 'all';
    status: 'all' | 'active' | 'inactive';
}

// =====================================================
// CONSTANTS
// =====================================================

const TIPO_PRESTAZIONE_OPTIONS: { value: TipoPrestazione | 'all'; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'Tutti i tipi', icon: <Activity className="w-4 h-4" /> },
    { value: 'VISITA_SPECIALISTICA', label: 'Visita Specialistica', icon: <Stethoscope className="w-4 h-4" /> },
    { value: 'VISITA_MEDICINA_LAVORO', label: 'Medicina del Lavoro', icon: <Stethoscope className="w-4 h-4" /> },
    { value: 'ESAME_STRUMENTALE', label: 'Esame Strumentale', icon: <FileText className="w-4 h-4" /> },
    { value: 'ESAME_LABORATORIO', label: 'Esame Laboratorio', icon: <FileText className="w-4 h-4" /> },
    { value: 'INTERVENTO_AMBULATORIALE', label: 'Intervento', icon: <Activity className="w-4 h-4" /> },
    { value: 'VACCINAZIONE', label: 'Vaccinazione', icon: <Activity className="w-4 h-4" /> },
    { value: 'CERTIFICAZIONE', label: 'Certificazione', icon: <FileText className="w-4 h-4" /> },
    { value: 'CONSULENZA', label: 'Consulenza', icon: <Users className="w-4 h-4" /> },
];

const TIPO_LABELS: Record<TipoPrestazione, string> = {
    VISITA_SPECIALISTICA: 'Visita Specialistica',
    VISITA_MEDICINA_LAVORO: 'Medicina del Lavoro',
    ESAME_STRUMENTALE: 'Esame Strumentale',
    ESAME_LABORATORIO: 'Esame Laboratorio',
    INTERVENTO_AMBULATORIALE: 'Intervento',
    VACCINAZIONE: 'Vaccinazione',
    CERTIFICAZIONE: 'Certificazione',
    CONSULENZA: 'Consulenza',
};

const TIPO_COLORS: Record<TipoPrestazione, string> = {
    VISITA_SPECIALISTICA: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    VISITA_MEDICINA_LAVORO: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    ESAME_STRUMENTALE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    ESAME_LABORATORIO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    INTERVENTO_AMBULATORIALE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    VACCINAZIONE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    CERTIFICAZIONE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    CONSULENZA: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

// =====================================================
// HELPER COMPONENTS
// =====================================================

const TipoBadge: React.FC<{ tipo: TipoPrestazione }> = ({ tipo }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${TIPO_COLORS[tipo]}`}>
        {TIPO_LABELS[tipo]}
    </span>
);

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

// =====================================================
// MAIN COMPONENT
// =====================================================

export const PrestazioniPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<FilterState>({
        search: '',
        tipo: 'all',
        status: 'all',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Query params
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            page,
            limit: 12,
            search: filters.search || undefined,
            tipo: filters.tipo !== 'all' ? filters.tipo : undefined,
            isActive: filters.status === 'all' ? undefined : filters.status === 'active',
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
        queryKey: ['prestazioni', queryParams, tenantFilterKey],
        queryFn: () => prestazioniApi.getAll(queryParams),
        enabled: isReady
    });

    const { data: stats } = useQuery({
        queryKey: ['prestazioni', 'stats', tenantFilterKey],
        queryFn: () => prestazioniApi.getStats(),
        enabled: isReady
    });

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: (id: string) => prestazioniApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestazioni'] });
        },
    });

    // Extract data
    const prestazioni = response?.data || [];
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

    const handleDelete = useCallback((id: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questa prestazione?')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation]);

    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === prestazioni.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(prestazioni.map(p => p.id)));
        }
    }, [prestazioni, selectedIds.size]);

    const handleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // Render
    return (
        <div className="p-6 space-y-6" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Catalogo Prestazioni
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gestione servizi medici e relativi template
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
                    <button
                        onClick={() => {/* TODO: Export */ }}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Esporta"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <Link
                        to="/poliambulatorio/catalogo/prestazioni/nuovo"
                        className="clinica-button-primary flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nuova Prestazione
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                                <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Totale</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.total || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Attive</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.active || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Visite</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.byTipo?.VISITA || 0}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Esami</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">{stats.byTipo?.ESAME || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters
                            ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtri
                    </button>

                    {/* View Toggle */}
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 ${viewMode === 'table' ? 'bg-teal-500 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
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

                {/* Filter Panel */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo
                            </label>
                            <select
                                value={filters.tipo}
                                onChange={(e) => handleFilterChange('tipo', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                            >
                                {TIPO_PRESTAZIONE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Stato
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="all">Tutti</option>
                                <option value="active">Solo attive</option>
                                <option value="inactive">Solo disattive</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setFilters({ search: '', tipo: 'all', status: 'all' });
                                    setPage(1);
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                Reset filtri
                            </button>
                        </div>
                    </div>
                )}
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
                    <p className="text-red-600 dark:text-red-300 mt-1">Non è stato possibile caricare le prestazioni</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                        Riprova
                    </button>
                </div>
            ) : prestazioni.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nessuna prestazione</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {filters.search || filters.tipo !== 'all' || filters.status !== 'all'
                            ? 'Nessuna prestazione corrisponde ai filtri selezionati'
                            : 'Inizia creando la tua prima prestazione'}
                    </p>
                    {!filters.search && filters.tipo === 'all' && filters.status === 'all' && (
                        <Link
                            to="/poliambulatorio/catalogo/prestazioni/nuovo"
                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
                        >
                            <Plus className="w-4 h-4" />
                            Nuova Prestazione
                        </Link>
                    )}
                </div>
            ) : viewMode === 'table' ? (
                /* Table View */
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="w-10 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === prestazioni.length && prestazioni.length > 0}
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Codice
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Nome
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Durata
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Stato
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Azioni
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {prestazioni.map((prestazione) => (
                                    <tr
                                        key={prestazione.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(prestazione.id)}
                                                onChange={() => handleSelect(prestazione.id)}
                                                className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                                                {prestazione.codice}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <Link
                                                    to={`/poliambulatorio/catalogo/prestazioni/${prestazione.id}`}
                                                    className="font-medium text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400"
                                                >
                                                    {prestazione.nome}
                                                </Link>
                                                {prestazione.descrizione && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                                        {prestazione.descrizione}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <TipoBadge tipo={prestazione.tipo} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                                <Clock className="w-4 h-4" />
                                                {formatDuration(prestazione.durataPrevista)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusIndicator isActive={prestazione.isActive} />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/poliambulatorio/catalogo/prestazioni/${prestazione.id}`}
                                                    className="p-2 text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="Dettagli"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    to={`/poliambulatorio/catalogo/prestazioni/${prestazione.id}/modifica`}
                                                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="Modifica"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(prestazione.id)}
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
                    </div>
                </div>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {prestazioni.map((prestazione) => (
                        <div
                            key={prestazione.id}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                        {prestazione.codice}
                                    </span>
                                    <h3 className="font-medium text-gray-900 dark:text-white mt-1">
                                        {prestazione.nome}
                                    </h3>
                                </div>
                                <TipoBadge tipo={prestazione.tipo} />
                            </div>

                            {prestazione.descrizione && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                    {prestazione.descrizione}
                                </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {formatDuration(prestazione.durataPrevista)}
                                </span>
                                <StatusIndicator isActive={prestazione.isActive} />
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                {prestazione.richiedeReferto && (
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        Referto
                                    </span>
                                )}
                                {prestazione.richiedeConsenso && (
                                    <span className="flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Consenso
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                                <Link
                                    to={`/poliambulatorio/catalogo/prestazioni/${prestazione.id}`}
                                    className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1"
                                >
                                    Dettagli
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                                <div className="flex items-center gap-2">
                                    <Link
                                        to={`/poliambulatorio/catalogo/prestazioni/${prestazione.id}/modifica`}
                                        className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(prestazione.id)}
                                        className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
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

export default PrestazioniPage;
