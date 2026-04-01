/**
 * Tenants Management Page
 * 
 * Admin view for managing all tenants in the system
 * - List all tenants with stats
 * - View tenant details
 * - Manage tenant features and settings
 * - View users with access to each tenant
 * 
 * @module pages/management/tenants/TenantsManagement
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    Search,
    Filter,
    Plus,
    Edit2,
    Trash2,
    Eye,
    Users,
    Settings,
    Globe,
    ChevronRight,
    RefreshCw,
    Check,
    X,
    AlertCircle,
    Loader2,
    Star,
    Package,
    Shield,
    Activity,
    ToggleLeft,
    ToggleRight,
    Save
} from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { managementApi, type TenantData } from '../api';
import { apiGet } from '../../../services/api';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import type { Tenant } from '../types';

interface TenantStats {
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
}

const FEATURE_LIST = [
    { id: 'formazione', name: 'Formazione', icon: Package },
    { id: 'medica', name: 'Medica', icon: Activity },
    { id: 'cms', name: 'CMS', icon: Globe },
    { id: 'gdpr', name: 'GDPR', icon: Shield },
    { id: 'fatturazione', name: 'Fatturazione', icon: Package },
    { id: 'hr', name: 'HR', icon: Users },
    { id: 'reports', name: 'Report', icon: Activity },
    { id: 'documents', name: 'Documenti', icon: Package }
];

// Preset di funzionalità pre-configurati
const FEATURE_PRESETS = [
    {
        id: 'formazione',
        name: 'Element Sicurezza',
        description: 'Solo funzionalità per la gestione della formazione',
        features: ['formazione', 'cms', 'gdpr', 'documents', 'reports'],
        color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
        id: 'medica',
        name: 'Element Medica',
        description: 'Solo funzionalità per poliambulatori e visite mediche',
        features: ['medica', 'cms', 'gdpr', 'documents', 'reports'],
        color: 'bg-green-50 border-green-200 text-green-800'
    },
    {
        id: 'full',
        name: 'Tutte le funzionalità',
        description: 'Accesso completo a tutte le funzionalità del sistema',
        features: ['formazione', 'medica', 'fatturazione', 'cms', 'gdpr', 'reports', 'hr', 'documents'],
        color: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    {
        id: 'base',
        name: 'Base',
        description: 'Funzionalità essenziali: CMS e documenti',
        features: ['cms', 'documents'],
        color: 'bg-gray-50 border-gray-200 text-gray-800'
    }
];

const BILLING_PLAN_COLORS: Record<string, string> = {
    enterprise: 'bg-purple-100 text-purple-800',
    professional: 'bg-blue-100 text-blue-800',
    basic: 'bg-gray-100 text-gray-800',
    free: 'bg-green-100 text-green-800'
};

const TenantsManagement: React.FC = () => {
    const { user: currentUser } = useAuth();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
    const { confirmDelete } = useConfirmDialog();

    // Check if current user is admin (for delete permission)
    const isAdmin = useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.globalRole || currentUser.role;
        return role === 'ADMIN' || role === 'SUPER_ADMIN';
    }, [currentUser]);

    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filterPlan, setFilterPlan] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

    // Load tenants with filter
    // silent=true skips the loading spinner (used after create to avoid unmounting open modals)
    const loadTenants = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);

            // Get tenant filter params
            const tenantParams = getTenantFilterParams();

            // Build query string with tenant filter
            const params = new URLSearchParams();
            if (tenantParams.tenantIds) {
                params.append('tenantIds', tenantParams.tenantIds.join(','));
            }
            if (tenantParams.allTenants) {
                params.append('allTenants', 'true');
            }

            // Use the filtered tenants endpoint
            const queryString = params.toString();
            const url = queryString ? `/api/v1/tenants?${queryString}` : '/api/v1/tenants';
            const response = await apiGet<{ success: boolean; data: Tenant[] }>(url);

            setTenants(response.data || []);
        } catch (err: unknown) {
            if (!silent) setError('Errore nel caricamento dei tenant');
        } finally {
            if (!silent) setLoading(false);
        }
    }, [getTenantFilterParams, tenantFilterKey]);

    useEffect(() => {
        if (isReady) {
            loadTenants();
        }
    }, [loadTenants, isReady]);

    // Filter tenants
    const filteredTenants = useMemo(() => {
        return tenants.filter(tenant => {
            // Search filter
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                if (!tenant.name.toLowerCase().includes(search) &&
                    !tenant.slug.toLowerCase().includes(search)) {
                    return false;
                }
            }

            // Plan filter
            if (filterPlan && tenant.billingPlan !== filterPlan) {
                return false;
            }

            // Status filter
            if (filterStatus === 'active' && !tenant.isActive) return false;
            if (filterStatus === 'inactive' && tenant.isActive) return false;

            return true;
        });
    }, [tenants, searchTerm, filterPlan, filterStatus]);

    // Stats
    const stats = useMemo(() => ({
        total: tenants.length,
        active: tenants.filter(t => t.isActive).length,
        inactive: tenants.filter(t => !t.isActive).length,
        enterprise: tenants.filter(t => t.billingPlan === 'enterprise').length
    }), [tenants]);

    const handleViewTenant = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setShowDetailModal(true);
    };

    const handleEditTenant = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setShowEditModal(true);
    };

    const handleDeleteTenant = async (tenant: Tenant) => {
        if (!(await confirmDelete(tenant.name))) {
            return;
        }
        try {
            await managementApi.deleteTenant(tenant.id);
            await loadTenants();
        } catch (err: unknown) {
            setError('Errore nell\'eliminazione del tenant');
        }
    };

    const handleCreateSuccess = async () => {
        // Use silent refresh to avoid showing loading spinner (which unmounts the modal)
        // so the user can see the success state and configure the first user
        await loadTenants(true);
    };

    const handleEditSuccess = async () => {
        setShowEditModal(false);
        setSelectedTenant(null);
        await loadTenants();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-xl border border-red-200 p-6">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Errore</h3>
                <p className="text-red-600 text-center">{error}</p>
                <button
                    onClick={loadTenants}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Riprova
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Building2 className="w-7 h-7 text-purple-600" />
                        Gestione Tenant
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {filteredTenants.length} tenant su {tenants.length} totali
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadTenants}
                        className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Aggiorna"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${showFilters
                            ? 'bg-purple-100 text-purple-700'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Filter className="w-5 h-5" />
                        Filtri
                    </button>
                    <CRUDButton
                        operation="create"
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuovo Tenant
                    </CRUDButton>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                            <div className="text-sm text-gray-500">Totali</div>
                        </div>
                        <Building2 className="w-8 h-8 text-purple-200" />
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                            <div className="text-sm text-gray-500">Attivi</div>
                        </div>
                        <Check className="w-8 h-8 text-green-200" />
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
                            <div className="text-sm text-gray-500">Inattivi</div>
                        </div>
                        <X className="w-8 h-8 text-red-200" />
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-2xl font-bold text-purple-600">{stats.enterprise}</div>
                            <div className="text-sm text-gray-500">Enterprise</div>
                        </div>
                        <Star className="w-8 h-8 text-purple-200" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 animate-in slide-in-from-top duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cerca
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Nome, slug..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                        </div>

                        {/* Plan Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Piano
                            </label>
                            <select
                                value={filterPlan}
                                onChange={(e) => setFilterPlan(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="">Tutti i piani</option>
                                <option value="enterprise">Enterprise</option>
                                <option value="professional">Professional</option>
                                <option value="basic">Basic</option>
                                <option value="free">Free</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Stato
                            </label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="all">Tutti</option>
                                <option value="active">Attivi</option>
                                <option value="inactive">Inattivi</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Tenants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTenants.map(tenant => (
                    <div
                        key={tenant.id}
                        className="bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => handleViewTenant(tenant)}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                        <Building2 className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                                        <p className="text-sm text-gray-500">{tenant.slug}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {tenant.isPrimary && (
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tenant.isActive
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {tenant.isActive ? 'Attivo' : 'Inattivo'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            {/* Domain */}
                            {tenant.domain && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    {tenant.domain}
                                </div>
                            )}

                            {/* Plan Badge */}
                            <div className="flex items-center justify-between mb-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${BILLING_PLAN_COLORS[tenant.billingPlan] || BILLING_PLAN_COLORS.basic
                                    }`}>
                                    {tenant.billingPlan?.charAt(0).toUpperCase() + tenant.billingPlan?.slice(1) || 'Basic'}
                                </span>
                                {tenant.accessLevel && (
                                    <span className="text-xs text-gray-500">
                                        Accesso: {tenant.accessLevel}
                                    </span>
                                )}
                            </div>

                            {/* Features */}
                            {tenant.enabledFeatures && tenant.enabledFeatures.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {tenant.enabledFeatures.slice(0, 4).map(feature => (
                                        <span
                                            key={feature}
                                            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                        >
                                            {feature}
                                        </span>
                                    ))}
                                    {tenant.enabledFeatures.length > 4 && (
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                            +{tenant.enabledFeatures.length - 4}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-xl">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewTenant(tenant);
                                }}
                                className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                                Dettagli
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTenant(tenant);
                                        setShowUsersModal(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Visualizza Utenti"
                                >
                                    <Users className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditTenant(tenant);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Modifica Tenant"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTenant(tenant);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Elimina Tenant"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredTenants.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                        <Building2 className="w-12 h-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-1">Nessun tenant trovato</h3>
                        <p className="text-gray-500 text-sm">Prova a modificare i filtri di ricerca</p>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedTenant && (
                <TenantDetailModal
                    tenant={selectedTenant}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedTenant(null);
                    }}
                    onEdit={() => {
                        setShowDetailModal(false);
                        setShowEditModal(true);
                    }}
                    onShowUsers={() => {
                        setShowDetailModal(false);
                        setShowUsersModal(true);
                    }}
                />
            )}

            {/* Create Tenant Modal */}
            {showCreateModal && (
                <CreateTenantModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {/* Edit Tenant Modal */}
            {showEditModal && selectedTenant && (
                <EditTenantModal
                    tenant={selectedTenant}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedTenant(null);
                    }}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* Users Modal */}
            {showUsersModal && selectedTenant && (
                <TenantUsersModal
                    tenant={selectedTenant}
                    onClose={() => {
                        setShowUsersModal(false);
                        setSelectedTenant(null);
                    }}
                />
            )}
        </div>
    );
};

/**
 * Tenant Detail Modal
 */
const TenantDetailModal: React.FC<{
    tenant: Tenant;
    onClose: () => void;
    onEdit: () => void;
    onShowUsers: () => void;
}> = ({ tenant, onClose, onEdit, onShowUsers }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-purple-700">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">{tenant.name}</h2>
                            <p className="text-purple-200 text-sm">{tenant.slug}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* Status */}
                    <div className="flex items-center gap-4 mb-6">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${tenant.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {tenant.isActive ? (
                                <>
                                    <ToggleRight className="w-4 h-4 mr-1" />
                                    Attivo
                                </>
                            ) : (
                                <>
                                    <ToggleLeft className="w-4 h-4 mr-1" />
                                    Inattivo
                                </>
                            )}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${BILLING_PLAN_COLORS[tenant.billingPlan] || BILLING_PLAN_COLORS.basic
                            }`}>
                            Piano {tenant.billingPlan?.charAt(0).toUpperCase() + tenant.billingPlan?.slice(1) || 'Basic'}
                        </span>
                        {tenant.isPrimary && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                <Star className="w-4 h-4 mr-1 fill-current" />
                                Primario
                            </span>
                        )}
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-1">ID Tenant</div>
                            <div className="font-mono text-sm text-gray-900 break-all">{tenant.id}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-1">Dominio</div>
                            <div className="font-medium text-gray-900">{tenant.domain || 'Non configurato'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-1">Livello Accesso</div>
                            <div className="font-medium text-gray-900">{tenant.accessLevel || 'N/A'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-1">Admin Access</div>
                            <div className="font-medium text-gray-900">
                                {tenant.isAdminAccess ? 'Sì' : 'No'}
                            </div>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Funzionalità Abilitate</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {FEATURE_LIST.map(feature => {
                                const isEnabled = tenant.enabledFeatures?.includes(feature.id);
                                return (
                                    <div
                                        key={feature.id}
                                        className={`flex items-center gap-2 p-2 rounded-lg ${isEnabled
                                            ? 'bg-purple-50 border border-purple-200'
                                            : 'bg-gray-50 border border-gray-200 opacity-50'
                                            }`}
                                    >
                                        <feature.icon className={`w-4 h-4 ${isEnabled ? 'text-purple-600' : 'text-gray-400'
                                            }`} />
                                        <span className={`text-sm ${isEnabled ? 'text-purple-900' : 'text-gray-500'
                                            }`}>
                                            {feature.name}
                                        </span>
                                        {isEnabled && (
                                            <Check className="w-4 h-4 text-purple-600 ml-auto" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Settings JSON (if available) */}
                    {tenant.settings && Object.keys(tenant.settings).length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Impostazioni</h4>
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                                {JSON.stringify(tenant.settings, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Chiudi
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onShowUsers}
                            className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-2"
                        >
                            <Users className="w-4 h-4" />
                            Vedi Utenti
                        </button>
                        <button
                            onClick={onEdit}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                        >
                            <Edit2 className="w-4 h-4" />
                            Modifica
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Create Tenant Modal Component
 */
const CreateTenantModal: React.FC<{
    onClose: () => void;
    onSuccess: () => Promise<void>;
}> = ({ onClose, onSuccess }) => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<TenantData & {
        // Company data
        companyName?: string;
        vatNumber?: string;
        fiscalCode?: string;
        legalAddress?: string;
        legalCity?: string;
        legalZip?: string;
        legalProvince?: string;
    }>({
        name: '',
        slug: '',
        domain: '',
        billingPlan: 'basic',
        isActive: true
    });
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    // P-FIX: Use ref to track manual slug edits to avoid stale closure issues
    const slugManuallyEditedRef = useRef(false);
    const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
    const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateSlug = (name: string) => {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    };

    const handleNameChange = (name: string) => {
        setFormData(f => ({
            ...f,
            name,
            // Auto-generate slug only if user hasn't manually edited it
            // P-FIX: Use ref instead of state to get current value in closure
            slug: slugManuallyEditedRef.current ? f.slug : generateSlug(name)
        }));
    };

    const handleSlugChange = (slug: string) => {
        setSlugManuallyEdited(true);
        slugManuallyEditedRef.current = true;
        setFormData(f => ({ ...f, slug }));
    };

    const toggleFeature = (featureId: string) => {
        setSelectedFeatures(prev => {
            const newSet = new Set(prev);
            if (newSet.has(featureId)) {
                newSet.delete(featureId);
            } else {
                newSet.add(featureId);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Guard against double-click on "Avanti" triggering submit on step 1
        if (currentStep !== 2) return;
        if (!formData.name || !formData.slug) {
            setError('Nome e slug sono obbligatori');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await managementApi.createTenant({
                name: formData.name,
                slug: formData.slug,
                domain: formData.domain,
                billingPlan: formData.billingPlan,
                isActive: formData.isActive,
                settings: {
                    enabledFeatures: Array.from(selectedFeatures),
                    // P69: Include company data in settings for sync
                    companyName: formData.companyName || formData.name,
                    vatNumber: formData.vatNumber,
                    fiscalCode: formData.fiscalCode,
                    legalAddress: formData.legalAddress,
                    legalCity: formData.legalCity,
                    legalZip: formData.legalZip,
                    legalProvince: formData.legalProvince
                }
            });
            setCreatedTenant(response.data);
            await onSuccess();
        } catch (err: unknown) {
            setError('Errore nella creazione del tenant');
        } finally {
            setSaving(false);
        }
    };

    const handleConfigureFirstUser = () => {
        if (!createdTenant?.id) return;
        onClose();
        navigate(`/management/tenant-access?tenantId=${encodeURIComponent(createdTenant.id)}`);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-purple-600" />
                            Nuovo Tenant
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <div className={`flex items-center gap-1.5 ${currentStep === 1 ? 'text-purple-600' : 'text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${currentStep === 1 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>1</div>
                                <span className="text-sm">Dati Tenant</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <div className={`flex items-center gap-1.5 ${currentStep === 2 ? 'text-purple-600' : 'text-gray-400'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${currentStep === 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>2</div>
                                <span className="text-sm">Dati Azienda</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form
                    onSubmit={handleSubmit}
                    onKeyDown={(e) => { if (e.key === 'Enter' && currentStep < 2) e.preventDefault(); }}
                >
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
                        {createdTenant ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <h3 className="text-base font-semibold text-green-800 mb-1">Tenant creato con successo</h3>
                                    <p className="text-sm text-green-700">
                                        Il tenant <strong>{createdTenant.name}</strong> e` pronto. Ora puoi creare subito il primo utente e definirlo come tenant admin.
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm text-amber-800">
                                        Suggerimento: completa ora la configurazione per evitare tenant senza account amministrativo.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                {/* Step 1: Dati Tenant */}
                                {currentStep === 1 && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nome Tenant *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => handleNameChange(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Slug *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.slug}
                                                onChange={(e) => handleSlugChange(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="es. element-sicurezza"
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Identificativo URL univoco (solo lettere minuscole e trattini)
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Dominio
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.domain || ''}
                                                onChange={(e) => setFormData(f => ({ ...f, domain: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="es. formazione.example.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Piano
                                            </label>
                                            <select
                                                value={formData.billingPlan || 'basic'}
                                                onChange={(e) => setFormData(f => ({ ...f, billingPlan: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            >
                                                <option value="free">Free</option>
                                                <option value="basic">Basic</option>
                                                <option value="professional">Professional</option>
                                                <option value="enterprise">Enterprise</option>
                                            </select>
                                        </div>

                                        {/* Feature Presets */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Preset Funzionalità
                                            </label>
                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                {FEATURE_PRESETS.map(preset => (
                                                    <button
                                                        key={preset.id}
                                                        type="button"
                                                        onClick={() => setSelectedFeatures(new Set(preset.features))}
                                                        className={`p-3 rounded-lg border text-left transition-colors hover:shadow-sm ${preset.color}`}
                                                    >
                                                        <div className="font-medium text-sm">{preset.name}</div>
                                                        <div className="text-xs opacity-75 mt-0.5">{preset.description}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Funzionalità ({selectedFeatures.size} selezionate)
                                            </label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {FEATURE_LIST.map(feature => (
                                                    <label
                                                        key={feature.id}
                                                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedFeatures.has(feature.id)
                                                            ? 'bg-purple-50 border border-purple-200'
                                                            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFeatures.has(feature.id)}
                                                            onChange={() => toggleFeature(feature.id)}
                                                            className="sr-only"
                                                        />
                                                        <feature.icon className={`w-4 h-4 ${selectedFeatures.has(feature.id) ? 'text-purple-600' : 'text-gray-400'
                                                            }`} />
                                                        <span className={`text-sm ${selectedFeatures.has(feature.id) ? 'text-purple-900' : 'text-gray-700'
                                                            }`}>
                                                            {feature.name}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isActive ?? true}
                                                    onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                                />
                                                <span className="text-sm text-gray-700">Tenant attivo</span>
                                            </label>
                                        </div>
                                    </>
                                )}

                                {/* Step 2: Dati Azienda */}
                                {currentStep === 2 && (
                                    <>
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                                            <p className="text-sm text-purple-800">
                                                <strong>Dati Azienda</strong>: Questi dati verranno usati per creare l'azienda associata al tenant.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Ragione Sociale
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.companyName || formData.name}
                                                onChange={(e) => setFormData(f => ({ ...f, companyName: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="Es. Element Sicurezza S.r.l."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Partita IVA
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.vatNumber || ''}
                                                    onChange={(e) => setFormData(f => ({ ...f, vatNumber: e.target.value }))}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    placeholder="Es. IT12345678901"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Codice Fiscale
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.fiscalCode || ''}
                                                    onChange={(e) => setFormData(f => ({ ...f, fiscalCode: e.target.value }))}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    placeholder="Es. 12345678901"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Indirizzo Sede Legale
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.legalAddress || ''}
                                                onChange={(e) => setFormData(f => ({ ...f, legalAddress: e.target.value }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="Es. Via Roma, 1"
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Città
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.legalCity || ''}
                                                    onChange={(e) => setFormData(f => ({ ...f, legalCity: e.target.value }))}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    placeholder="Es. Milano"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    CAP
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.legalZip || ''}
                                                    onChange={(e) => setFormData(f => ({ ...f, legalZip: e.target.value }))}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    placeholder="Es. 20100"
                                                    maxLength={5}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Provincia
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.legalProvince || ''}
                                                onChange={(e) => setFormData(f => ({ ...f, legalProvince: e.target.value.toUpperCase().slice(0, 2) }))}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="Es. MI"
                                                maxLength={2}
                                            />
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                        <div>
                            {!createdTenant && currentStep > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(currentStep - 1)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    ← Indietro
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {createdTenant ? 'Chiudi' : 'Annulla'}
                            </button>
                            {createdTenant ? (
                                <button
                                    type="button"
                                    onClick={handleConfigureFirstUser}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                                >
                                    <Users className="w-4 h-4" />
                                    Crea primo utente/admin
                                </button>
                            ) : currentStep < 2 ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(2)}
                                    disabled={!formData.name || !formData.slug}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                >
                                    Avanti →
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creazione...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Crea Tenant
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * Edit Tenant Modal Component
 */
const EditTenantModal: React.FC<{
    tenant: Tenant;
    onClose: () => void;
    onSuccess: () => Promise<void>;
}> = ({ tenant, onClose, onSuccess }) => {
    const [formData, setFormData] = useState<Partial<TenantData>>({
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        billingPlan: tenant.billingPlan,
        isActive: tenant.isActive
    });
    const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
        new Set(tenant.enabledFeatures || [])
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleFeature = (featureId: string) => {
        setSelectedFeatures(prev => {
            const newSet = new Set(prev);
            if (newSet.has(featureId)) {
                newSet.delete(featureId);
            } else {
                newSet.add(featureId);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setSaving(true);
        setError(null);

        try {
            await managementApi.updateTenant(tenant.id, {
                ...formData,
                settings: {
                    ...tenant.settings,
                    enabledFeatures: Array.from(selectedFeatures)
                }
            });
            await onSuccess();
        } catch (err: unknown) {
            setError('Errore nell\'aggiornamento del tenant');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-purple-600" />
                        Modifica Tenant
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit}>
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome Tenant
                            </label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Slug
                            </label>
                            <input
                                type="text"
                                value={formData.slug || ''}
                                onChange={(e) => setFormData(f => ({ ...f, slug: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dominio
                            </label>
                            <input
                                type="text"
                                value={formData.domain || ''}
                                onChange={(e) => setFormData(f => ({ ...f, domain: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Piano
                            </label>
                            <select
                                value={formData.billingPlan || 'basic'}
                                onChange={(e) => setFormData(f => ({ ...f, billingPlan: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="free">Free</option>
                                <option value="basic">Basic</option>
                                <option value="professional">Professional</option>
                                <option value="enterprise">Enterprise</option>
                            </select>
                        </div>

                        {/* Features */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Funzionalità
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {FEATURE_LIST.map(feature => (
                                    <label
                                        key={feature.id}
                                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedFeatures.has(feature.id)
                                            ? 'bg-purple-50 border border-purple-200'
                                            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFeatures.has(feature.id)}
                                            onChange={() => toggleFeature(feature.id)}
                                            className="sr-only"
                                        />
                                        <feature.icon className={`w-4 h-4 ${selectedFeatures.has(feature.id) ? 'text-purple-600' : 'text-gray-400'
                                            }`} />
                                        <span className={`text-sm ${selectedFeatures.has(feature.id) ? 'text-purple-900' : 'text-gray-700'
                                            }`}>
                                            {feature.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive ?? true}
                                    onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">Tenant attivo</span>
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Salva Modifiche
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * Tenant Users Modal
 * Shows users with access to this tenant
 */
const TenantUsersModal: React.FC<{
    tenant: Tenant;
    onClose: () => void;
}> = ({ tenant, onClose }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadUsers();
    }, [tenant.id]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError(null);
            // Load persons directly by tenantId instead of using PersonTenantAccess
            const response = await apiGet<{ data: any[]; total: number }>(
                `/api/v1/persons?tenantId=${tenant.id}&limit=500`
            );
            setUsers(response.data || []);
        } catch (err: unknown) {
            setError('Errore nel caricamento utenti');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Utenti del Tenant</h2>
                            <p className="text-blue-200 text-sm">{tenant.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                            <p className="text-red-600">{error}</p>
                            <button
                                onClick={loadUsers}
                                className="mt-4 text-blue-600 hover:text-blue-800"
                            >
                                Riprova
                            </button>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-1">Nessun utente</h3>
                            <p className="text-gray-500 text-sm">Non ci sono persone in questo tenant</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="text-sm text-gray-500 mb-4">
                                {users.length} person{users.length === 1 ? 'a' : 'e'} nel tenant
                            </div>
                            {users.map((person: any) => (
                                <div
                                    key={person.id}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                            <span className="text-blue-600 font-medium">
                                                {(person.firstName?.[0] || '?').toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {person.firstName} {person.lastName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {person.email}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${person.globalRole === 'ADMIN' || person.globalRole === 'SUPER_ADMIN'
                                            ? 'bg-purple-100 text-purple-800'
                                            : person.globalRole === 'MANAGER'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {person.globalRole || 'USER'}
                                        </span>
                                        {person.status === 'ACTIVE' && (
                                            <span className="w-2 h-2 bg-green-500 rounded-full" title="Attivo" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TenantsManagement;
