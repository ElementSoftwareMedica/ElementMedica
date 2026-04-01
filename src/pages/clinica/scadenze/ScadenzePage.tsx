/**
 * P66 - Scadenze Centralizzate Page
 * 
 * Dashboard unificata per la gestione di tutte le scadenze:
 * - Visite mediche
 * - Protocolli sanitari MDL
 * - Tariffari
 * - Farmaci (con ubicazione)
 * - Manutenzioni strumentario
 * - Altro
 * 
 * @module pages/clinica/scadenze/ScadenzePage
 * @project P66 - Sistema Scadenze Centralizzato
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    CalendarClock,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Search,
    Plus,
    Pill,
    Stethoscope,
    Wrench,
    FileText,
    Building2,
    Package,
    X,
    Bell,
    TrendingUp
} from 'lucide-react';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useTenantMode } from '../../../contexts/TenantModeContext';
import { useToast } from '../../../hooks/useToast';
import {
    scadenzeApi,
    farmaciApi,
    type DeadlineItem,
    type DeadlineCategory,
    type DeadlineStatus,
    type DeadlinePriority,
    type DeadlineStats,
    type Farmaco
} from '../../../services/clinicaApi';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import {
    DeadlineEditorModal,
    FarmacoEditorModal,
    DeadlineTable,
    FarmacoTable
} from './components';

// ============================================
// TYPES & CONSTANTS
// ============================================

type TabType = 'dashboard' | 'scadenze' | 'farmaci';

// Extended filters for farmaci tab
interface ExtendedFilters {
    categoria?: DeadlineCategory;
    status?: DeadlineStatus;
    priorita?: DeadlinePriority;
    dataInizio?: string;
    dataFine?: string;
    responsabileId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    // Farmaci-specific
    inScadenza?: string;
    sottoScorta?: string;
}

const CATEGORY_CONFIG: Record<DeadlineCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
    VISITA: { label: 'Visite', icon: Stethoscope, color: 'text-blue-600 bg-blue-100' },
    PROTOCOLLO_SANITARIO: { label: 'Protocolli MDL', icon: FileText, color: 'text-purple-600 bg-purple-100' },
    TARIFFARIO: { label: 'Tariffari', icon: Package, color: 'text-green-600 bg-green-100' },
    FARMACO: { label: 'Farmaci', icon: Pill, color: 'text-red-600 bg-red-100' },
    MANUTENZIONE: { label: 'Manutenzioni', icon: Wrench, color: 'text-orange-600 bg-orange-100' },
    CERTIFICAZIONE: { label: 'Certificazioni', icon: CheckCircle2, color: 'text-teal-600 bg-teal-100' },
    DOCUMENTO: { label: 'Documenti', icon: FileText, color: 'text-gray-600 bg-gray-100' },
    CONTRATTO: { label: 'Contratti', icon: Building2, color: 'text-indigo-600 bg-indigo-100' },
    ALTRO: { label: 'Altro', icon: CalendarClock, color: 'text-slate-600 bg-slate-100' }
};

const PRIORITY_CONFIG: Record<DeadlinePriority, { label: string; color: string; bgColor: string }> = {
    LOW: { label: 'Bassa', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    NORMAL: { label: 'Normale', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    HIGH: { label: 'Alta', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    URGENT: { label: 'Urgente', color: 'text-red-600', bgColor: 'bg-red-100' }
};

const STATUS_CONFIG: Record<DeadlineStatus, { label: string; color: string; bgColor: string }> = {
    ATTIVA: { label: 'Attiva', color: 'text-green-700', bgColor: 'bg-green-100' },
    IN_PREAVVISO: { label: 'In Preavviso', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    SCADUTA: { label: 'Scaduta', color: 'text-red-700', bgColor: 'bg-red-100' },
    COMPLETATA: { label: 'Completata', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    ANNULLATA: { label: 'Annullata', color: 'text-gray-700', bgColor: 'bg-gray-100' }
};

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    trend?: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, bgColor, trend, onClick }) => (
    <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
    >
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className={`text-3xl font-bold ${color} mt-1`}>{value}</p>
                {trend && (
                    <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-600">{trend}</span>
                    </div>
                )}
            </div>
            <div className={`p-3 rounded-xl ${bgColor}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
        </div>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const ScadenzePage: React.FC = () => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
    const { canPerformCRUD } = useTenantMode();

    // State
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [filters, setFilters] = useState<ExtendedFilters>({
        page: 1,
        limit: 20
    });
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [editingDeadline, setEditingDeadline] = useState<DeadlineItem | null>(null);
    const [editingFarmaco, setEditingFarmaco] = useState<Farmaco | null>(null);
    const [isCreateDeadlineOpen, setIsCreateDeadlineOpen] = useState(false);
    const [isCreateFarmacoOpen, setIsCreateFarmacoOpen] = useState(false);

    // Query params
    const queryParams = useMemo(() => {
        const tenantParams = getTenantFilterParams();
        return {
            ...tenantParams,
            ...filters,
            search: searchTerm || undefined
        };
    }, [getTenantFilterParams, filters, searchTerm]);

    // Queries
    const { data: statsData } = useQuery({
        queryKey: ['scadenze-stats', tenantFilterKey],
        queryFn: () => scadenzeApi.getStats(),
        enabled: isReady
    });

    const { data: farmaciStats } = useQuery({
        queryKey: ['farmaci-stats', tenantFilterKey],
        queryFn: () => farmaciApi.getStats(),
        enabled: isReady
    });

    const { data: scadenzeData, isLoading: scadenzeLoading } = useQuery({
        queryKey: ['scadenze', tenantFilterKey, queryParams],
        queryFn: () => scadenzeApi.getAll(queryParams),
        enabled: isReady && activeTab === 'scadenze'
    });

    const { data: farmaciData, isLoading: farmaciLoading } = useQuery({
        queryKey: ['farmaci', tenantFilterKey, queryParams],
        queryFn: () => farmaciApi.getAll({
            ...queryParams,
            inScadenza: filters.inScadenza === 'true',
            sottoScorta: filters.sottoScorta === 'true'
        }),
        enabled: isReady && activeTab === 'farmaci'
    });

    // Mutations
    const completeDeadlineMutation = useMutation({
        mutationFn: ({ id, note }: { id: string; note?: string }) =>
            scadenzeApi.complete(id, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scadenze'] });
            queryClient.invalidateQueries({ queryKey: ['scadenze-stats'] });
            showToast({ message: 'Scadenza completata con successo', type: 'success' });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const deleteDeadlineMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            scadenzeApi.delete(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['scadenze'] });
            queryClient.invalidateQueries({ queryKey: ['scadenze-stats'] });
            showToast({ message: 'Scadenza eliminata', type: 'success' });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const deleteFarmacoMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            farmaciApi.delete(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['farmaci'] });
            queryClient.invalidateQueries({ queryKey: ['farmaci-stats'] });
            showToast({ message: 'Farmaco eliminato', type: 'success' });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    // Handlers
    const handleFilterChange = (key: keyof ExtendedFilters, value: string | number | undefined) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1 // Reset page on filter change
        }));
    };

    const handleCompleteDeadline = (id: string) => {
        const note = window.prompt('Note di completamento (opzionale):');
        completeDeadlineMutation.mutate({ id, note: note || undefined });
    };

    const handleDeleteDeadline = (id: string) => {
        const reason = window.prompt('Motivo della cancellazione (min. 10 caratteri):');
        if (reason && reason.length >= 10) {
            deleteDeadlineMutation.mutate({ id, reason });
        } else if (reason) {
            showToast({ message: 'Il motivo deve contenere almeno 10 caratteri', type: 'error' });
        }
    };

    const handleDeleteFarmaco = (id: string) => {
        const reason = window.prompt('Motivo della cancellazione (min. 10 caratteri):');
        if (reason && reason.length >= 10) {
            deleteFarmacoMutation.mutate({ id, reason });
        } else if (reason) {
            showToast({ message: 'Il motivo deve contenere almeno 10 caratteri', type: 'error' });
        }
    };

    // Stats summary
    const stats = statsData as DeadlineStats | undefined;

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <CalendarClock className="w-8 h-8 text-teal-600" />
                        Scadenzario
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Gestione centralizzata di tutte le scadenze cliniche
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {canPerformCRUD && (
                        <>
                            <CRUDButton
                                variant="secondary"
                                onClick={() => setIsCreateFarmacoOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                            >
                                <Pill className="w-4 h-4" />
                                Nuovo Farmaco
                            </CRUDButton>
                            <CRUDPrimaryButton
                                onClick={() => setIsCreateDeadlineOpen(true)}
                            >
                                <Plus className="w-4 h-4" />
                                Nuova Scadenza
                            </CRUDPrimaryButton>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-8" aria-label="Tabs">
                    {[
                        { id: 'dashboard' as TabType, label: 'Dashboard', icon: TrendingUp },
                        { id: 'scadenze' as TabType, label: 'Scadenze', icon: CalendarClock },
                        { id: 'farmaci' as TabType, label: 'Farmaci', icon: Pill }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === tab.id
                                    ? 'border-teal-600 text-teal-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Scadenze Totali"
                            value={stats?.totali || 0}
                            icon={CalendarClock}
                            color="text-teal-600"
                            bgColor="bg-teal-100"
                        />
                        <StatCard
                            title="Scadute"
                            value={stats?.scadute || 0}
                            icon={AlertTriangle}
                            color="text-red-600"
                            bgColor="bg-red-100"
                            onClick={() => {
                                setActiveTab('scadenze');
                                setFilters(prev => ({ ...prev, status: 'SCADUTA' as DeadlineStatus }));
                            }}
                        />
                        <StatCard
                            title="In Scadenza (7gg)"
                            value={stats?.inScadenza7gg || 0}
                            icon={Clock}
                            color="text-orange-600"
                            bgColor="bg-orange-100"
                        />
                        <StatCard
                            title="In Scadenza (30gg)"
                            value={stats?.inScadenza30gg || 0}
                            icon={Bell}
                            color="text-yellow-600"
                            bgColor="bg-yellow-100"
                        />
                    </div>

                    {/* Farmaci Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Farmaci Totali"
                            value={farmaciStats?.totali || 0}
                            icon={Pill}
                            color="text-blue-600"
                            bgColor="bg-blue-100"
                        />
                        <StatCard
                            title="Farmaci Scaduti"
                            value={farmaciStats?.scaduti || 0}
                            icon={AlertTriangle}
                            color="text-red-600"
                            bgColor="bg-red-100"
                            onClick={() => {
                                setActiveTab('farmaci');
                            }}
                        />
                        <StatCard
                            title="In Scadenza (30gg)"
                            value={farmaciStats?.inScadenza30gg || 0}
                            icon={Clock}
                            color="text-orange-600"
                            bgColor="bg-orange-100"
                        />
                        <StatCard
                            title="Sotto Scorta"
                            value={farmaciStats?.sottoScorta || 0}
                            icon={Package}
                            color="text-purple-600"
                            bgColor="bg-purple-100"
                        />
                    </div>

                    {/* Category Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Per Categoria */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Per Categoria</h3>
                            <div className="space-y-3">
                                {stats?.perCategoria?.map(item => {
                                    const config = CATEGORY_CONFIG[item.categoria];
                                    const Icon = config?.icon || CalendarClock;
                                    return (
                                        <div
                                            key={item.categoria}
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                                            onClick={() => {
                                                setActiveTab('scadenze');
                                                setFilters(prev => ({ ...prev, categoria: item.categoria }));
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${config?.color || 'text-gray-600 bg-gray-100'}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <span className="font-medium text-gray-700">
                                                    {config?.label || item.categoria}
                                                </span>
                                            </div>
                                            <span className="text-lg font-semibold text-gray-900">{item.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Per Priorità */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Per Priorità</h3>
                            <div className="space-y-3">
                                {stats?.perPriorita?.map(item => {
                                    const config = PRIORITY_CONFIG[item.priorita];
                                    return (
                                        <div
                                            key={item.priorita}
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                                            onClick={() => {
                                                setActiveTab('scadenze');
                                                setFilters(prev => ({ ...prev, priorita: item.priorita }));
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${config?.bgColor} ${config?.color}`}>
                                                    {config?.label || item.priorita}
                                                </span>
                                            </div>
                                            <span className="text-lg font-semibold text-gray-900">{item.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Scadenze Tab */}
            {activeTab === 'scadenze' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cerca scadenze..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>

                            {/* Category Filter */}
                            <select
                                value={filters.categoria || ''}
                                onChange={(e) => handleFilterChange('categoria', e.target.value || undefined)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">Tutte le categorie</option>
                                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>

                            {/* Status Filter */}
                            <select
                                value={filters.status || ''}
                                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">Tutti gli stati</option>
                                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>

                            {/* Priority Filter */}
                            <select
                                value={filters.priorita || ''}
                                onChange={(e) => handleFilterChange('priorita', e.target.value || undefined)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">Tutte le priorità</option>
                                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>

                            {/* Clear Filters */}
                            {(filters.categoria || filters.status || filters.priorita || searchTerm) && (
                                <button
                                    onClick={() => {
                                        setFilters({ page: 1, limit: 20 });
                                        setSearchTerm('');
                                    }}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-1"
                                >
                                    <X className="w-4 h-4" />
                                    Pulisci filtri
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <DeadlineTable
                        data={scadenzeData?.data || []}
                        pagination={scadenzeData?.pagination}
                        isLoading={scadenzeLoading}
                        onEdit={setEditingDeadline}
                        onComplete={handleCompleteDeadline}
                        onDelete={handleDeleteDeadline}
                        onPageChange={(page: number) => setFilters(prev => ({ ...prev, page }))}
                        categoryConfig={CATEGORY_CONFIG}
                        priorityConfig={PRIORITY_CONFIG}
                        statusConfig={STATUS_CONFIG}
                        canPerformCRUD={canPerformCRUD}
                    />
                </div>
            )}

            {/* Farmaci Tab */}
            {activeTab === 'farmaci' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cerca farmaci..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>

                            {/* In Scadenza Filter */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.inScadenza === 'true'}
                                    onChange={(e) => handleFilterChange('inScadenza', e.target.checked ? 'true' : undefined)}
                                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">In scadenza</span>
                            </label>

                            {/* Sotto Scorta Filter */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.sottoScorta === 'true'}
                                    onChange={(e) => handleFilterChange('sottoScorta', e.target.checked ? 'true' : undefined)}
                                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">Sotto scorta</span>
                            </label>

                            {/* Clear Filters */}
                            {(filters.inScadenza || filters.sottoScorta || searchTerm) && (
                                <button
                                    onClick={() => {
                                        setFilters({ page: 1, limit: 20 });
                                        setSearchTerm('');
                                    }}
                                    className="px-3 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-1"
                                >
                                    <X className="w-4 h-4" />
                                    Pulisci filtri
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <FarmacoTable
                        data={farmaciData?.data || []}
                        pagination={farmaciData?.pagination}
                        isLoading={farmaciLoading}
                        onEdit={setEditingFarmaco}
                        onDelete={handleDeleteFarmaco}
                        onPageChange={(page: number) => setFilters(prev => ({ ...prev, page }))}
                        canPerformCRUD={canPerformCRUD}
                    />
                </div>
            )}

            {/* Modals */}
            {(isCreateDeadlineOpen || editingDeadline) && (
                <DeadlineEditorModal
                    deadline={editingDeadline}
                    onClose={() => {
                        setIsCreateDeadlineOpen(false);
                        setEditingDeadline(null);
                    }}
                    onSaved={() => {
                        queryClient.invalidateQueries({ queryKey: ['scadenze'] });
                        queryClient.invalidateQueries({ queryKey: ['scadenze-stats'] });
                        setIsCreateDeadlineOpen(false);
                        setEditingDeadline(null);
                    }}
                    categoryConfig={CATEGORY_CONFIG}
                    priorityConfig={PRIORITY_CONFIG}
                />
            )}

            {(isCreateFarmacoOpen || editingFarmaco) && (
                <FarmacoEditorModal
                    farmaco={editingFarmaco}
                    onClose={() => {
                        setIsCreateFarmacoOpen(false);
                        setEditingFarmaco(null);
                    }}
                    onSaved={() => {
                        queryClient.invalidateQueries({ queryKey: ['farmaci'] });
                        queryClient.invalidateQueries({ queryKey: ['farmaci-stats'] });
                        setIsCreateFarmacoOpen(false);
                        setEditingFarmaco(null);
                    }}
                />
            )}
        </div>
    );
};

export default ScadenzePage;
