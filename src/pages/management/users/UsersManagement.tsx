/**
 * Users Management Page
 * 
 * Comprehensive user management with tenant access and role assignment
 * - List all users across all tenants (admin view)
 * - Filter by tenant, role, status
 * - Assign/revoke tenant access
 * - Manage user roles and permissions
 * 
 * @module pages/management/users/UsersManagement
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Search,
    Filter,
    Plus,
    Edit2,
    Trash2,
    Eye,
    Building2,
    Shield,
    Mail,
    Phone,
    UserCog,
    ChevronDown,
    ChevronRight,
    MoreVertical,
    Key,
    RefreshCw,
    Download,
    Upload,
    X,
    Check,
    AlertCircle,
    Loader2,
    Save
} from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { apiGet } from '../../../services/api';
import { managementApi, type CreatePersonData, type UpdatePersonData } from '../api';
import type { Tenant, PersonTenantAccess, TenantAccessLevel } from '../types';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    globalRole?: string;
    tenantId?: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
    personRoles?: {
        roleType: string;
        tenantId: string;
        isActive: boolean;
    }[];
    tenantAccess?: PersonTenantAccess[];
}

interface FilterState {
    search: string;
    tenantId: string;
    roleType: string;
    status: 'all' | 'active' | 'inactive';
    hasMultipleTenants: boolean;
}

const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-800',
    SUPER_ADMIN: 'bg-purple-100 text-purple-800',
    MANAGER: 'bg-blue-100 text-blue-800',
    TRAINER: 'bg-green-100 text-green-800',
    EMPLOYEE: 'bg-gray-100 text-gray-800',
};

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin',
    SUPER_ADMIN: 'Super Admin',
    MANAGER: 'Manager',
    TRAINER: 'Formatore',
    EMPLOYEE: 'Dipendente',
};

const UsersManagement: React.FC = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showTenantModal, setShowTenantModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        search: '',
        tenantId: '',
        roleType: '',
        status: 'all',
        hasMultipleTenants: false
    });

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load users and tenants in parallel
            const [usersResponse, tenantsResponse] = await Promise.all([
                apiGet<{ data: User[]; total: number }>('/api/v1/persons?limit=500'),
                managementApi.getMyTenants()
            ]);

            setUsers(usersResponse.data || []);
            setTenants(tenantsResponse.data || []);
        } catch (err: any) {
            console.error('Error loading data:', err);
            setError(err.message || 'Errore nel caricamento dei dati');
        } finally {
            setLoading(false);
        }
    };

    // Filter users based on current filters
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
                const emailLower = user.email?.toLowerCase() || '';
                if (!fullName.includes(searchLower) && !emailLower.includes(searchLower)) {
                    return false;
                }
            }

            // Tenant filter
            if (filters.tenantId && user.tenantId !== filters.tenantId) {
                return false;
            }

            // Role filter
            if (filters.roleType) {
                const hasRole = user.personRoles?.some(r => r.roleType === filters.roleType);
                if (!hasRole && user.globalRole !== filters.roleType) {
                    return false;
                }
            }

            // Status filter
            if (filters.status === 'active' && !user.isActive) return false;
            if (filters.status === 'inactive' && user.isActive) return false;

            // Multiple tenants filter
            if (filters.hasMultipleTenants) {
                const tenantCount = user.tenantAccess?.length || 0;
                if (tenantCount <= 1) return false;
            }

            return true;
        }).sort((a, b) => {
            // Ordine alfabetico per cognome
            const lastNameA = (a.lastName || '').toLowerCase();
            const lastNameB = (b.lastName || '').toLowerCase();
            if (lastNameA < lastNameB) return -1;
            if (lastNameA > lastNameB) return 1;
            // Se i cognomi sono uguali, ordina per nome
            const firstNameA = (a.firstName || '').toLowerCase();
            const firstNameB = (b.firstName || '').toLowerCase();
            return firstNameA.localeCompare(firstNameB);
        });
    }, [users, filters]);

    // Get primary role for display
    const getPrimaryRole = (user: User): string => {
        if (user.globalRole) return user.globalRole;
        const primaryRole = user.personRoles?.find(r => r.isActive);
        return primaryRole?.roleType || 'EMPLOYEE';
    };

    // Count users by role
    const roleStats = useMemo(() => {
        const stats: Record<string, number> = {};
        users.forEach(user => {
            const role = getPrimaryRole(user);
            stats[role] = (stats[role] || 0) + 1;
        });
        return stats;
    }, [users]);

    // Handle user actions
    const handleViewUser = (user: User) => {
        // Naviga alla pagina di dettaglio della persona
        navigate(`/management/persons/${user.id}`);
    };

    const handleRowClick = (user: User) => {
        // Naviga alla pagina di dettaglio quando si clicca sulla riga
        navigate(`/management/persons/${user.id}`);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setShowEditModal(true);
    };

    const handleEditTenantAccess = (user: User) => {
        setSelectedUser(user);
        setShowTenantModal(true);
    };

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`Sei sicuro di voler disattivare l'utente ${user.lastName} ${user.firstName}?`)) {
            return;
        }
        try {
            await managementApi.togglePersonStatus(user.id, false);
            await loadData();
        } catch (err: any) {
            console.error('Error deactivating user:', err);
            setError(err.message || 'Errore nella disattivazione utente');
        }
    };

    const handleToggleUserStatus = async (user: User) => {
        const newStatus = !user.isActive;
        const action = newStatus ? 'riattivare' : 'disattivare';
        if (!confirm(`Sei sicuro di voler ${action} l'utente ${user.lastName} ${user.firstName}?`)) {
            return;
        }
        try {
            await managementApi.togglePersonStatus(user.id, newStatus);
            await loadData();
        } catch (err: any) {
            console.error('Error toggling user status:', err);
            setError(err.message || 'Errore nel cambio stato utente');
        }
    };

    const handleCreateSuccess = async () => {
        setShowCreateModal(false);
        await loadData();
    };

    const handleEditSuccess = async () => {
        setShowEditModal(false);
        setSelectedUser(null);
        await loadData();
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
                    onClick={loadData}
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
                        <Users className="w-7 h-7 text-purple-600" />
                        Gestione Utenti
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {filteredUsers.length} utenti su {users.length} totali
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
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
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuovo Utente
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                    <div className="text-sm text-gray-500">Totali</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-green-600">
                        {users.filter(u => u.isActive).length}
                    </div>
                    <div className="text-sm text-gray-500">Attivi</div>
                </div>
                {Object.entries(roleStats).slice(0, 4).map(([role, count]) => (
                    <div key={role} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="text-2xl font-bold text-gray-900">{count}</div>
                        <div className="text-sm text-gray-500">{ROLE_LABELS[role] || role}</div>
                    </div>
                ))}
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 animate-in slide-in-from-top duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cerca
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                    placeholder="Nome, email..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                            </div>
                        </div>

                        {/* Tenant Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tenant
                            </label>
                            <select
                                value={filters.tenantId}
                                onChange={(e) => setFilters(f => ({ ...f, tenantId: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="">Tutti i tenant</option>
                                {tenants.map(tenant => (
                                    <option key={tenant.id} value={tenant.id}>
                                        {tenant.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Role Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ruolo
                            </label>
                            <select
                                value={filters.roleType}
                                onChange={(e) => setFilters(f => ({ ...f, roleType: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="">Tutti i ruoli</option>
                                <option value="ADMIN">Admin</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                                <option value="MANAGER">Manager</option>
                                <option value="TRAINER">Formatore</option>
                                <option value="EMPLOYEE">Dipendente</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Stato
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as FilterState['status'] }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="all">Tutti</option>
                                <option value="active">Attivi</option>
                                <option value="inactive">Inattivi</option>
                            </select>
                        </div>
                    </div>

                    {/* Additional Filters */}
                    <div className="mt-4 flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filters.hasMultipleTenants}
                                onChange={(e) => setFilters(f => ({ ...f, hasMultipleTenants: e.target.checked }))}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span className="text-sm text-gray-700">Solo utenti multi-tenant</span>
                        </label>

                        <button
                            onClick={() => setFilters({
                                search: '',
                                tenantId: '',
                                roleType: '',
                                status: 'all',
                                hasMultipleTenants: false
                            })}
                            className="text-sm text-purple-600 hover:text-purple-800"
                        >
                            Azzera filtri
                        </button>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Utente</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ruolo</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tenant</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Stato</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ultimo Accesso</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        Nessun utente trovato
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr
                                        key={user.id}
                                        onClick={() => handleRowClick(user)}
                                        className="hover:bg-purple-50 transition-colors cursor-pointer"
                                    >
                                        {/* User */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <span className="text-sm font-medium text-purple-700">
                                                        {user.lastName?.[0]}{user.firstName?.[0]}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {user.lastName} {user.firstName}
                                                    </div>
                                                    {user.phone && (
                                                        <div className="text-sm text-gray-500 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {user.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Email */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <a
                                                    href={`mailto:${user.email}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {user.email}
                                                </a>
                                            </div>
                                        </td>

                                        {/* Role */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[getPrimaryRole(user)] || ROLE_COLORS.EMPLOYEE
                                                }`}>
                                                <Shield className="w-3 h-3 mr-1" />
                                                {ROLE_LABELS[getPrimaryRole(user)] || getPrimaryRole(user)}
                                            </span>
                                        </td>

                                        {/* Tenants */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                {user.tenantAccess && user.tenantAccess.length > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm text-gray-900">
                                                            {user.tenantAccess.length} tenant
                                                        </span>
                                                        {user.tenantAccess.length > 1 && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                                                                Multi
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-500">
                                                        {tenants.find(t => t.id === user.tenantId)?.name || 'N/A'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {user.isActive ? 'Attivo' : 'Inattivo'}
                                            </span>
                                        </td>

                                        {/* Last Login */}
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {user.lastLogin
                                                ? new Date(user.lastLogin).toLocaleDateString('it-IT', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })
                                                : 'Mai'
                                            }
                                        </td>

                                        {/* Actions - Pillola Blu */}
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewUser(user);
                                                    }}
                                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full transition-colors inline-flex items-center gap-2"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Azioni
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User Detail Modal */}
            {showUserModal && selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    tenants={tenants}
                    onClose={() => {
                        setShowUserModal(false);
                        setSelectedUser(null);
                    }}
                />
            )}

            {/* Tenant Access Modal */}
            {showTenantModal && selectedUser && (
                <TenantAccessModal
                    user={selectedUser}
                    tenants={tenants}
                    onClose={() => {
                        setShowTenantModal(false);
                        setSelectedUser(null);
                    }}
                    onSave={async () => {
                        await loadData();
                        setShowTenantModal(false);
                        setSelectedUser(null);
                    }}
                />
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <CreateUserModal
                    tenants={tenants}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    tenants={tenants}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                    }}
                    onSuccess={handleEditSuccess}
                />
            )}
        </div>
    );
};

/**
 * User Detail Modal Component
 */
const UserDetailModal: React.FC<{
    user: User;
    tenants: Tenant[];
    onClose: () => void;
}> = ({ user, tenants, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Dettagli Utente</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* User Info */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-xl font-bold text-purple-700">
                                {user.lastName?.[0]}{user.firstName?.[0]}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                                {user.lastName} {user.firstName}
                            </h3>
                            <p className="text-gray-500">{user.email}</p>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Telefono</div>
                            <div className="font-medium text-gray-900">{user.phone || 'N/A'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Ruolo Globale</div>
                            <div className="font-medium text-gray-900">{user.globalRole || 'N/A'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Stato</div>
                            <div className={`font-medium ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                {user.isActive ? 'Attivo' : 'Inattivo'}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Ultimo Accesso</div>
                            <div className="font-medium text-gray-900">
                                {user.lastLogin
                                    ? new Date(user.lastLogin).toLocaleDateString('it-IT')
                                    : 'Mai'
                                }
                            </div>
                        </div>
                    </div>

                    {/* Tenant Access */}
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Accesso Tenant</h4>
                        {user.tenantAccess && user.tenantAccess.length > 0 ? (
                            <div className="space-y-2">
                                {user.tenantAccess.map(access => {
                                    const tenant = tenants.find(t => t.id === access.tenantId);
                                    return (
                                        <div
                                            key={access.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Building2 className="w-5 h-5 text-purple-600" />
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {tenant?.name || access.tenantId}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {access.enabledFeatures?.join(', ') || 'Tutte le funzionalità'}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${access.accessLevel === 'FULL' ? 'bg-green-100 text-green-800' :
                                                access.accessLevel === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                                                    access.accessLevel === 'WRITE' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {access.accessLevel}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">
                                Nessun accesso tenant configurato
                            </p>
                        )}
                    </div>

                    {/* Roles */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Ruoli</h4>
                        {user.personRoles && user.personRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {user.personRoles.map((role, idx) => (
                                    <span
                                        key={idx}
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${role.isActive
                                            ? ROLE_COLORS[role.roleType] || ROLE_COLORS.EMPLOYEE
                                            : 'bg-gray-100 text-gray-400 line-through'
                                            }`}
                                    >
                                        <Shield className="w-3 h-3 mr-1" />
                                        {ROLE_LABELS[role.roleType] || role.roleType}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">
                                Nessun ruolo assegnato
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Tenant Access Modal Component
 */
const TenantAccessModal: React.FC<{
    user: User;
    tenants: Tenant[];
    onClose: () => void;
    onSave: () => Promise<void>;
}> = ({ user, tenants, onClose, onSave }) => {
    const [selectedTenants, setSelectedTenants] = useState<Record<string, { accessLevel: TenantAccessLevel; features: string[] }>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Track original tenant IDs for comparison
    const originalTenantIds = useMemo(() =>
        new Set(user.tenantAccess?.map(a => a.tenantId) || []),
        [user]
    );

    // Initialize from user's current access
    useEffect(() => {
        const initial: Record<string, { accessLevel: TenantAccessLevel; features: string[] }> = {};
        user.tenantAccess?.forEach(access => {
            initial[access.tenantId] = {
                accessLevel: access.accessLevel,
                features: access.enabledFeatures || []
            };
        });
        setSelectedTenants(initial);
    }, [user]);

    const toggleTenant = (tenantId: string) => {
        setSelectedTenants(prev => {
            if (prev[tenantId]) {
                const { [tenantId]: _, ...rest } = prev;
                return rest;
            }
            return {
                ...prev,
                [tenantId]: { accessLevel: 'READ' as TenantAccessLevel, features: [] }
            };
        });
    };

    const updateAccessLevel = (tenantId: string, level: TenantAccessLevel) => {
        setSelectedTenants(prev => ({
            ...prev,
            [tenantId]: { ...prev[tenantId], accessLevel: level }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const currentTenantIds = new Set(Object.keys(selectedTenants));

            // Grant access to new tenants
            for (const tenantId of currentTenantIds) {
                if (!originalTenantIds.has(tenantId)) {
                    // New tenant access
                    await managementApi.grantTenantAccess(user.id, {
                        tenantId,
                        accessLevel: selectedTenants[tenantId].accessLevel,
                        enabledFeatures: selectedTenants[tenantId].features
                    });
                } else {
                    // Update existing tenant access
                    await managementApi.updateTenantAccess(user.id, tenantId, {
                        accessLevel: selectedTenants[tenantId].accessLevel,
                        enabledFeatures: selectedTenants[tenantId].features
                    });
                }
            }

            // Revoke access from removed tenants
            for (const tenantId of originalTenantIds) {
                if (!currentTenantIds.has(tenantId)) {
                    await managementApi.revokeTenantAccess(user.id, tenantId);
                }
            }

            await onSave();
        } catch (err: any) {
            console.error('Error saving tenant access:', err);
            setError(err.message || 'Errore nel salvataggio degli accessi tenant');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Gestione Accesso Tenant</h2>
                        <p className="text-sm text-gray-500">{user.lastName} {user.firstName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    <div className="space-y-3">
                        {tenants.map(tenant => {
                            const isSelected = !!selectedTenants[tenant.id];
                            return (
                                <div
                                    key={tenant.id}
                                    className={`border rounded-xl p-4 transition-all ${isSelected
                                        ? 'border-purple-300 bg-purple-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleTenant(tenant.id)}
                                                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                            />
                                            <div className="flex items-center gap-2">
                                                <Building2 className={`w-5 h-5 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                                                <span className="font-medium text-gray-900">{tenant.name}</span>
                                            </div>
                                        </label>
                                        {isSelected && (
                                            <select
                                                value={selectedTenants[tenant.id]?.accessLevel || 'READ'}
                                                onChange={(e) => updateAccessLevel(tenant.id, e.target.value as TenantAccessLevel)}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            >
                                                <option value="READ">Lettura</option>
                                                <option value="WRITE">Scrittura</option>
                                                <option value="ADMIN">Admin</option>
                                                <option value="FULL">Completo</option>
                                            </select>
                                        )}
                                    </div>
                                    {tenant.slug && (
                                        <div className="ml-8 mt-1 text-sm text-gray-500">{tenant.slug}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSave}
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
                                <Check className="w-4 h-4" />
                                Salva
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Create User Modal Component
 */
const CreateUserModal: React.FC<{
    tenants: Tenant[];
    onClose: () => void;
    onSuccess: () => Promise<void>;
}> = ({ tenants, onClose, onSuccess }) => {
    const [formData, setFormData] = useState<CreatePersonData>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        globalRole: null,
        roleType: 'EMPLOYEE',
        tenantId: tenants[0]?.id || ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.email) {
            setError('Nome, cognome e email sono obbligatori');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await managementApi.createPerson(formData);
            await onSuccess();
        } catch (err: any) {
            console.error('Error creating user:', err);
            setError(err.message || 'Errore nella creazione utente');
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
                        <Plus className="w-5 h-5 text-purple-600" />
                        Nuovo Utente
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome *
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData(f => ({ ...f, firstName: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cognome *
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData(f => ({ ...f, lastName: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telefono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={formData.password || ''}
                                onChange={(e) => setFormData(f => ({ ...f, password: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                placeholder="Lascia vuoto per password autogenerata"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ruolo
                                </label>
                                <select
                                    value={formData.roleType || 'EMPLOYEE'}
                                    onChange={(e) => setFormData(f => ({ ...f, roleType: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    <option value="EMPLOYEE">Dipendente</option>
                                    <option value="TRAINER">Formatore</option>
                                    <option value="MANAGER">Manager</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tenant
                                </label>
                                <select
                                    value={formData.tenantId || ''}
                                    onChange={(e) => setFormData(f => ({ ...f, tenantId: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    {tenants.map(tenant => (
                                        <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ruolo Globale
                            </label>
                            <select
                                value={formData.globalRole || ''}
                                onChange={(e) => setFormData(f => ({ ...f, globalRole: e.target.value as 'ADMIN' | 'USER' | null || null }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="">Nessuno</option>
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin Globale</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Il ruolo globale concede accesso a tutti i tenant
                            </p>
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
                                    Creazione...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Crea Utente
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
 * Edit User Modal Component
 */
const EditUserModal: React.FC<{
    user: User;
    tenants: Tenant[];
    onClose: () => void;
    onSuccess: () => Promise<void>;
}> = ({ user, tenants, onClose, onSuccess }) => {
    const [formData, setFormData] = useState<UpdatePersonData>({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        globalRole: user.globalRole as 'ADMIN' | 'USER' | null || null,
        isActive: user.isActive
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.email) {
            setError('Nome, cognome e email sono obbligatori');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await managementApi.updatePerson(user.id, formData);
            await onSuccess();
        } catch (err: any) {
            console.error('Error updating user:', err);
            setError(err.message || 'Errore nell\'aggiornamento utente');
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
                        Modifica Utente
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome *
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName || ''}
                                    onChange={(e) => setFormData(f => ({ ...f, firstName: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cognome *
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName || ''}
                                    onChange={(e) => setFormData(f => ({ ...f, lastName: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData(f => ({ ...f, email: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telefono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData(f => ({ ...f, phone: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ruolo Globale
                            </label>
                            <select
                                value={formData.globalRole || ''}
                                onChange={(e) => setFormData(f => ({ ...f, globalRole: e.target.value as 'ADMIN' | 'USER' | null || null }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                                <option value="">Nessuno</option>
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin Globale</option>
                            </select>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive ?? true}
                                    onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">Utente attivo</span>
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

export default UsersManagement;
