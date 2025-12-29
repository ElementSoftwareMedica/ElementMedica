/**
 * AppuntamentiPage - Lista appuntamenti con filtri e gestione stati
 * 
 * Supporta filtri avanzati, cambio stato rapido, e vista kanban.
 * 
 * @module pages/poliambulatorio/agenda/AppuntamentiPage
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    Clock,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Eye,
    Edit,
    Trash2,
    Phone,
    CheckCircle,
    XCircle,
    AlertCircle,
    User,
    Stethoscope,
    Building2,
    ChevronDown,
    RefreshCw,
    LayoutList,
    LayoutGrid,
    Download,
    ArrowUpDown
} from 'lucide-react';
import {
    appuntamentiApi,
    ambulatoriApi,
    StatoAppuntamento,
    Appuntamento
} from '../../../services/clinicaApi';
import { formatDate, formatTime, formatRelativeTime } from '../../../utils/dateUtils';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { getDoctorTitle } from '../../../utils/codiceFiscale';

// ============================================
// TYPES
// ============================================

type ViewMode = 'list' | 'kanban';
type SortField = 'dataOra' | 'paziente' | 'stato';
type SortOrder = 'asc' | 'desc';

interface FilterState {
    search: string;
    stato: StatoAppuntamento | '';
    ambulatorioId: string;
    dataInizio: string;
    dataFine: string;
}

// ============================================
// CONSTANTS
// ============================================

const STATO_CONFIG: Record<StatoAppuntamento, {
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
    icon: React.ElementType;
    nextStates: StatoAppuntamento[];
}> = {
    PRENOTATO: {
        label: 'Prenotato',
        color: 'blue',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        icon: Calendar,
        nextStates: ['CONFERMATO', 'ANNULLATO']
    },
    CONFERMATO: {
        label: 'Confermato',
        color: 'green',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700',
        icon: CheckCircle,
        nextStates: ['IN_ATTESA', 'ANNULLATO', 'NO_SHOW']
    },
    IN_ATTESA: {
        label: 'In Attesa',
        color: 'amber',
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-700',
        icon: Clock,
        nextStates: ['IN_CORSO', 'NO_SHOW']
    },
    IN_CORSO: {
        label: 'In Corso',
        color: 'purple',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700',
        icon: Stethoscope,
        nextStates: ['COMPLETATO']
    },
    COMPLETATO: {
        label: 'Completato',
        color: 'gray',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
        icon: CheckCircle,
        nextStates: []
    },
    ANNULLATO: {
        label: 'Annullato',
        color: 'red',
        bgColor: 'bg-red-100',
        textColor: 'text-red-700',
        icon: XCircle,
        nextStates: ['PRENOTATO']
    },
    NO_SHOW: {
        label: 'No Show',
        color: 'orange',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700',
        icon: AlertCircle,
        nextStates: ['PRENOTATO']
    }
};

const INITIAL_FILTERS: FilterState = {
    search: '',
    stato: '',
    ambulatorioId: '',
    dataInizio: '',
    dataFine: ''
};

// ============================================
// COMPONENTS
// ============================================

/**
 * Status Badge Component
 */
const StatusBadge: React.FC<{
    stato: StatoAppuntamento;
    size?: 'sm' | 'md';
}> = ({ stato, size = 'md' }) => {
    const config = STATO_CONFIG[stato];
    const Icon = config.icon;

    return (
        <span className={`
      inline-flex items-center gap-1 rounded-full font-medium
      ${config.bgColor} ${config.textColor}
      ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
    `}>
            <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
            {config.label}
        </span>
    );
};

/**
 * Appuntamento Row Component
 */
const AppuntamentoRow: React.FC<{
    appuntamento: Appuntamento;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onChangeStato: (stato: StatoAppuntamento) => void;
}> = ({ appuntamento, onView, onEdit, onDelete, onChangeStato }) => {
    const [showActions, setShowActions] = useState(false);
    const [showStatoMenu, setShowStatoMenu] = useState(false);

    const config = STATO_CONFIG[appuntamento.stato];
    const dataOra = new Date(appuntamento.dataOra);
    const oraFine = new Date(dataOra.getTime() + appuntamento.durataPrevista * 60000);

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            {/* Data/Ora */}
            <td className="px-4 py-3 whitespace-nowrap">
                <div>
                    <p className="font-medium text-gray-900">{formatDate(dataOra, 'short')}</p>
                    <p className="text-sm text-gray-500">
                        {formatTime(dataOra)} - {formatTime(oraFine)}
                    </p>
                </div>
            </td>

            {/* Paziente */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">
                            {appuntamento.paziente
                                ? `${appuntamento.paziente.cognome} ${appuntamento.paziente.nome}`
                                : 'N/D'}
                        </p>
                        <p className="text-xs text-gray-500">#{appuntamento.numero}</p>
                    </div>
                </div>
            </td>

            {/* Prestazione */}
            <td className="px-4 py-3">
                <p className="text-sm text-gray-900">
                    {appuntamento.prestazione?.nome || 'Non specificata'}
                </p>
                {appuntamento.medico && (
                    <p className="text-xs text-gray-500">
                        {getDoctorTitle(appuntamento.medico.taxCode || null, appuntamento.medico.gender || null)} {appuntamento.medico.cognome}
                    </p>
                )}
            </td>

            {/* Ambulatorio */}
            <td className="px-4 py-3">
                <p className="text-sm text-gray-600">
                    {appuntamento.ambulatorio?.nome || 'N/D'}
                </p>
            </td>

            {/* Stato */}
            <td className="px-4 py-3">
                <div className="relative">
                    <button
                        onClick={() => setShowStatoMenu(!showStatoMenu)}
                        className="flex items-center gap-1"
                    >
                        <StatusBadge stato={appuntamento.stato} />
                        {config.nextStates.length > 0 && (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    {showStatoMenu && config.nextStates.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
                            {config.nextStates.map(nextStato => {
                                const nextConfig = STATO_CONFIG[nextStato];
                                const NextIcon = nextConfig.icon;
                                return (
                                    <button
                                        key={nextStato}
                                        onClick={() => {
                                            onChangeStato(nextStato);
                                            setShowStatoMenu(false);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                                    >
                                        <NextIcon className={`h-4 w-4 ${nextConfig.textColor}`} />
                                        <span>{nextConfig.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </td>

            {/* Note */}
            <td className="px-4 py-3">
                {appuntamento.note ? (
                    <div className="flex items-center gap-1 text-sm text-gray-600" title={appuntamento.note}>
                        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{appuntamento.note}</span>
                    </div>
                ) : (
                    <span className="text-gray-400 text-sm">-</span>
                )}
            </td>

            {/* Actions */}
            <td className="px-4 py-3 text-right">
                <div className="relative">
                    <button
                        onClick={() => setShowActions(!showActions)}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <MoreVertical className="h-5 w-5 text-gray-400" />
                    </button>

                    {showActions && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
                            <button
                                onClick={() => { onView(); setShowActions(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                            >
                                <Eye className="h-4 w-4" />
                                Visualizza
                            </button>
                            <button
                                onClick={() => { onEdit(); setShowActions(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                            >
                                <Edit className="h-4 w-4" />
                                Modifica
                            </button>
                            <button
                                onClick={() => { onDelete(); setShowActions(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                Elimina
                            </button>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
};

/**
 * Kanban Column Component
 */
const KanbanColumn: React.FC<{
    stato: StatoAppuntamento;
    appuntamenti: Appuntamento[];
    onCardClick: (id: string) => void;
    onChangeStato: (id: string, stato: StatoAppuntamento) => void;
}> = ({ stato, appuntamenti, onCardClick, onChangeStato }) => {
    const config = STATO_CONFIG[stato];

    return (
        <div className="flex-shrink-0 w-72 bg-gray-100 rounded-lg overflow-hidden">
            {/* Header */}
            <div className={`${config.bgColor} px-3 py-2 border-b border-gray-200`}>
                <div className="flex items-center justify-between">
                    <span className={`font-medium ${config.textColor}`}>{config.label}</span>
                    <span className={`text-sm ${config.textColor}`}>{appuntamenti.length}</span>
                </div>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                {appuntamenti.map(app => {
                    const dataOra = new Date(app.dataOra);
                    return (
                        <div
                            key={app.id}
                            onClick={() => onCardClick(app.id)}
                            className="bg-white p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-teal-300 transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <p className="font-medium text-gray-900 text-sm">
                                    {app.paziente
                                        ? `${app.paziente.cognome} ${app.paziente.nome}`
                                        : 'Paziente'}
                                </p>
                                <span className="text-xs text-gray-500">#{app.numero}</span>
                            </div>
                            <div className="space-y-1 text-xs text-gray-500">
                                <p className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(dataOra)} • {app.durataPrevista}min
                                </p>
                                {app.prestazione && (
                                    <p className="flex items-center gap-1">
                                        <Stethoscope className="h-3 w-3" />
                                        {app.prestazione.nome}
                                    </p>
                                )}
                                {app.ambulatorio && (
                                    <p className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {app.ambulatorio.nome}
                                    </p>
                                )}
                                {app.note && (
                                    <p className="flex items-center gap-1 text-amber-600">
                                        <AlertCircle className="h-3 w-3" />
                                        <span className="truncate">{app.note}</span>
                                    </p>
                                )}
                            </div>
                            {config.nextStates.length > 0 && (
                                <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                                    {config.nextStates.slice(0, 2).map(nextStato => {
                                        const nextConfig = STATO_CONFIG[nextStato];
                                        return (
                                            <button
                                                key={nextStato}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onChangeStato(app.id, nextStato);
                                                }}
                                                className={`
                          flex-1 text-xs px-2 py-1 rounded
                          ${nextConfig.bgColor} ${nextConfig.textColor}
                          hover:opacity-80
                        `}
                                            >
                                                {nextConfig.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
                {appuntamenti.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-4">
                        Nessun appuntamento
                    </p>
                )}
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AppuntamentiPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [view, setView] = useState<ViewMode>('list');
    const [filters, setFilters] = useState<FilterState>({
        ...INITIAL_FILTERS,
        stato: (searchParams.get('stato') as StatoAppuntamento) || '',
        dataInizio: searchParams.get('dataInizio') || '',
        dataFine: searchParams.get('dataFine') || ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [sortField, setSortField] = useState<SortField>('dataOra');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Build query filters with tenant params
    const queryFiltersWithTenant = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            ...(filters.stato && { stato: filters.stato }),
            ...(filters.ambulatorioId && { ambulatorioId: filters.ambulatorioId }),
            ...(filters.dataInizio && { dataInizio: filters.dataInizio }),
            ...(filters.dataFine && { dataFine: filters.dataFine }),
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [filters, getTenantFilterParams]);

    // Query: Appointments
    const { data: appuntamentiData, isLoading, refetch } = useQuery({
        queryKey: ['appuntamenti', queryFiltersWithTenant, page, limit, tenantFilterKey],
        queryFn: () => appuntamentiApi.getAll({
            page,
            limit,
            search: filters.search || undefined,
            filters: queryFiltersWithTenant
        }),
        enabled: isReady
    });

    // Query: Ambulatori for filters - also filtered by tenant
    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-filter', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            return ambulatoriApi.getAll({
                limit: 100,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    // Mutation: Change stato
    const changeStatoMutation = useMutation({
        mutationFn: ({ id, stato }: { id: string; stato: StatoAppuntamento }) =>
            appuntamentiApi.changeStato(id, stato),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
        }
    });

    // Mutation: Delete
    const deleteMutation = useMutation({
        mutationFn: (id: string) => appuntamentiApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
        }
    });

    // Sorted and filtered data
    const sortedAppuntamenti = useMemo(() => {
        const data = appuntamentiData?.data || [];
        return [...data].sort((a, b) => {
            let comparison = 0;
            if (sortField === 'dataOra') {
                comparison = new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime();
            } else if (sortField === 'paziente') {
                const nameA = a.paziente ? `${a.paziente.cognome} ${a.paziente.nome}` : '';
                const nameB = b.paziente ? `${b.paziente.cognome} ${b.paziente.nome}` : '';
                comparison = nameA.localeCompare(nameB);
            } else if (sortField === 'stato') {
                comparison = a.stato.localeCompare(b.stato);
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [appuntamentiData, sortField, sortOrder]);

    // Group by stato for kanban
    const appuntamentiByStato = useMemo(() => {
        const grouped: Record<StatoAppuntamento, Appuntamento[]> = {
            PRENOTATO: [],
            CONFERMATO: [],
            IN_ATTESA: [],
            IN_CORSO: [],
            COMPLETATO: [],
            ANNULLATO: [],
            NO_SHOW: []
        };
        sortedAppuntamenti.forEach(app => {
            grouped[app.stato].push(app);
        });
        return grouped;
    }, [sortedAppuntamenti]);

    // Handlers
    const handleFilterChange = <K extends keyof FilterState>(
        key: K,
        value: FilterState[K]
    ) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Sei sicuro di voler eliminare questo appuntamento?')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    const pagination = appuntamentiData?.pagination;
    const totalPages = pagination?.totalPages || 1;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Appuntamenti</h1>
                        <p className="text-gray-500 text-sm">
                            {pagination?.total || 0} appuntamenti totali
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/poliambulatorio/agenda/nuovo"
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                            Nuovo Appuntamento
                        </Link>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 bg-white border border-gray-200 rounded-lg p-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Cerca paziente, numero..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    {/* Quick filters */}
                    <div className="flex items-center gap-2">
                        <select
                            value={filters.stato}
                            onChange={(e) => handleFilterChange('stato', e.target.value as StatoAppuntamento | '')}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">Tutti gli stati</option>
                            {Object.entries(STATO_CONFIG).map(([stato, config]) => (
                                <option key={stato} value={stato}>{config.label}</option>
                            ))}
                        </select>

                        <input
                            type="date"
                            value={filters.dataInizio}
                            onChange={(e) => handleFilterChange('dataInizio', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 border rounded-lg ${showFilters ? 'border-teal-300 bg-teal-50' : 'border-gray-300'
                                }`}
                        >
                            <Filter className="h-5 w-5" />
                        </button>

                        {/* View toggle */}
                        <div className="flex items-center border border-gray-300 rounded-lg p-1">
                            <button
                                onClick={() => setView('list')}
                                className={`p-1.5 rounded ${view === 'list' ? 'bg-teal-100 text-teal-700' : 'text-gray-500'}`}
                            >
                                <LayoutList className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setView('kanban')}
                                className={`p-1.5 rounded ${view === 'kanban' ? 'bg-teal-100 text-teal-700' : 'text-gray-500'}`}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                        </div>

                        <button
                            onClick={() => refetch()}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Extended filters */}
                {showFilters && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Ambulatorio</label>
                            <select
                                value={filters.ambulatorioId}
                                onChange={(e) => handleFilterChange('ambulatorioId', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                                <option value="">Tutti</option>
                                {ambulatoriData?.data?.map(amb => (
                                    <option key={amb.id} value={amb.id}>{amb.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Data inizio</label>
                            <input
                                type="date"
                                value={filters.dataInizio}
                                onChange={(e) => handleFilterChange('dataInizio', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Data fine</label>
                            <input
                                type="date"
                                value={filters.dataFine}
                                onChange={(e) => handleFilterChange('dataFine', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters(INITIAL_FILTERS)}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Resetta filtri
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                    </div>
                )}

                {/* List View */}
                {!isLoading && view === 'list' && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th
                                        className="px-4 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('dataOra')}
                                    >
                                        <span className="flex items-center gap-1">
                                            Data/Ora
                                            <ArrowUpDown className="h-4 w-4" />
                                        </span>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('paziente')}
                                    >
                                        <span className="flex items-center gap-1">
                                            Paziente
                                            <ArrowUpDown className="h-4 w-4" />
                                        </span>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                        Prestazione
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                        Ambulatorio
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleSort('stato')}
                                    >
                                        <span className="flex items-center gap-1">
                                            Stato
                                            <ArrowUpDown className="h-4 w-4" />
                                        </span>
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                        Note
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                                        Azioni
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sortedAppuntamenti.map(app => (
                                    <AppuntamentoRow
                                        key={app.id}
                                        appuntamento={app}
                                        onView={() => navigate(`/poliambulatorio/agenda/appuntamenti/${app.id}`)}
                                        onEdit={() => navigate(`/poliambulatorio/agenda/appuntamenti/${app.id}/modifica`)}
                                        onDelete={() => handleDelete(app.id)}
                                        onChangeStato={(stato) => changeStatoMutation.mutate({ id: app.id, stato })}
                                    />
                                ))}
                            </tbody>
                        </table>

                        {sortedAppuntamenti.length === 0 && (
                            <div className="text-center py-12">
                                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Nessun appuntamento trovato</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                                <p className="text-sm text-gray-500">
                                    Pagina {page} di {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Precedente
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Successiva
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Kanban View */}
                {!isLoading && view === 'kanban' && (
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {(['PRENOTATO', 'CONFERMATO', 'IN_ATTESA', 'IN_CORSO', 'COMPLETATO'] as StatoAppuntamento[]).map(stato => (
                            <KanbanColumn
                                key={stato}
                                stato={stato}
                                appuntamenti={appuntamentiByStato[stato]}
                                onCardClick={(id) => navigate(`/poliambulatorio/agenda/appuntamenti/${id}`)}
                                onChangeStato={(id, newStato) => changeStatoMutation.mutate({ id, stato: newStato })}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppuntamentiPage;
