/**
 * Roles Management Page
 * 
 * Manage roles and permissions across the system
 * - List all roles by type
 * - View role details and permissions
 * - Create/edit roles
 * - Permission matrix visualization
 * 
 * @module pages/management/roles/RolesManagement
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield,
    Search,
    Filter,
    Plus,
    Edit2,
    Trash2,
    Eye,
    ChevronRight,
    RefreshCw,
    Check,
    X,
    AlertCircle,
    Loader2,
    Users,
    Lock,
    Unlock,
    Key,
    Layers,
    Info,
    Settings,
    Building2,
    Save
} from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { apiGet } from '../../../services/api';
import { managementApi, type CreateRoleData, type UpdateRoleData } from '../api';
import { ActionButton } from '../../../components/ui/ActionButton';
import type { Tenant } from '../types';

interface Role {
    id: string;
    roleType: string;
    personId: string;
    tenantId: string;
    companyId?: string;
    isActive: boolean;
    isPrimary: boolean;
    level: number;
    path: string;
    permissions: Permission[];
    createdAt: string;
    description?: string;
    userCount?: number;
    person?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

interface Permission {
    id: string;
    permission: string;
    isGranted: boolean;
    grantedAt?: string;
    grantedBy?: string;
}

// Definition from API (structure from /api/v1/roles)
interface RoleDefinition {
    id: string;
    name: string;
    roleType: string;
    displayName?: string;
    description?: string;
    isActive?: boolean;
    isSystemRole?: boolean;
    userCount?: number;
    permissions: string[];
}

interface RoleType {
    name: string;
    description: string;
    level: number;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
}

// Complete configuration for all 22 system roles
const ROLE_TYPES: Record<string, RoleType> = {
    SUPER_ADMIN: {
        name: 'Super Admin',
        description: 'Accesso completo a tutte le funzionalità e tenant',
        level: 0,
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: Shield
    },
    ADMIN: {
        name: 'Amministratore',
        description: 'Gestione completa del tenant assegnato',
        level: 1,
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: Key
    },
    COMPANY_ADMIN: {
        name: 'Amministratore Azienda',
        description: 'Gestione della propria azienda',
        level: 2,
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: Building2
    },
    TENANT_ADMIN: {
        name: 'Amministratore Tenant',
        description: 'Gestione del tenant',
        level: 2,
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: Key
    },
    TRAINING_ADMIN: {
        name: 'Admin Formazione',
        description: 'Gestione completa formazione',
        level: 3,
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: Layers
    },
    CLINIC_ADMIN: {
        name: 'Admin Clinica',
        description: 'Gestione poliambulatorio',
        level: 3,
        color: 'bg-teal-100 text-teal-800 border-teal-300',
        icon: Settings
    },
    HR_MANAGER: {
        name: 'Manager HR',
        description: 'Gestione risorse umane',
        level: 4,
        color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        icon: Users
    },
    MANAGER: {
        name: 'Manager',
        description: 'Gestione utenti e risorse del proprio team',
        level: 4,
        color: 'bg-sky-100 text-sky-800 border-sky-300',
        icon: Users
    },
    DEPARTMENT_HEAD: {
        name: 'Resp. Dipartimento',
        description: 'Gestione dipartimento',
        level: 4,
        color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
        icon: Layers
    },
    TRAINER_COORDINATOR: {
        name: 'Coord. Formatori',
        description: 'Coordinamento formativo',
        level: 5,
        color: 'bg-violet-100 text-violet-800 border-violet-300',
        icon: Users
    },
    COMPANY_MANAGER: {
        name: 'Resp. Aziendale',
        description: 'Responsabilità aziendali',
        level: 5,
        color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
        icon: Building2
    },
    SUPERVISOR: {
        name: 'Supervisore',
        description: 'Supervisione operativa',
        level: 5,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: Eye
    },
    AUDITOR: {
        name: 'Auditor',
        description: 'Controllo e audit',
        level: 5,
        color: 'bg-neutral-100 text-neutral-800 border-neutral-300',
        icon: Info
    },
    SENIOR_TRAINER: {
        name: 'Formatore Senior',
        description: 'Formazione avanzata',
        level: 6,
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: Layers
    },
    COORDINATOR: {
        name: 'Coordinatore',
        description: 'Coordinamento attività',
        level: 6,
        color: 'bg-rose-100 text-rose-800 border-rose-300',
        icon: Users
    },
    TRAINER: {
        name: 'Formatore',
        description: 'Gestione corsi e formazione',
        level: 7,
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: Layers
    },
    EXTERNAL_TRAINER: {
        name: 'Formatore Esterno',
        description: 'Formazione specialistica',
        level: 7,
        color: 'bg-lime-100 text-lime-800 border-lime-300',
        icon: Layers
    },
    OPERATOR: {
        name: 'Operatore',
        description: 'Operazioni base',
        level: 7,
        color: 'bg-pink-100 text-pink-800 border-pink-300',
        icon: Settings
    },
    CONSULTANT: {
        name: 'Consulente',
        description: 'Consulenza specialistica',
        level: 7,
        color: 'bg-stone-100 text-stone-800 border-stone-300',
        icon: Info
    },
    EMPLOYEE: {
        name: 'Dipendente',
        description: 'Accesso base alle funzionalità assegnate',
        level: 8,
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: Users
    },
    VIEWER: {
        name: 'Visualizzatore',
        description: 'Solo visualizzazione',
        level: 9,
        color: 'bg-slate-100 text-slate-800 border-slate-300',
        icon: Eye
    },
    GUEST: {
        name: 'Ospite',
        description: 'Accesso limitato',
        level: 10,
        color: 'bg-zinc-100 text-zinc-600 border-zinc-300',
        icon: Users
    }
};

const PERMISSION_RESOURCES = [
    'persons', 'companies', 'courses', 'schedules', 'enrollments',
    'trainers', 'locations', 'templates', 'preventivi', 'submissions',
    'cms', 'gdpr', 'reports', 'settings'
];

const PERMISSION_ACTIONS = ['read', 'write', 'create', 'delete', 'manage'];

const RolesManagement: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRoleType, setSelectedRoleType] = useState<string>('');
    const [selectedTenant, setSelectedTenant] = useState<string>('');
    const [showMatrixView, setShowMatrixView] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [rolesResponse, tenantsResponse] = await Promise.all([
                // Use the correct endpoint: /api/v1/roles (from permissions.js routes)
                apiGet<{ success: boolean; data: { data: RoleDefinition[]; pagination: any } }>('/api/v1/roles').catch(() => ({ success: false, data: { data: [], pagination: {} } })),
                managementApi.getMyTenants()
            ]);

            // Transform role definitions to Role objects for display
            // Handle nested response structure: { data: { data: [...] } }
            const roleDefinitions = rolesResponse?.data?.data || [];
            const transformedRoles: Role[] = roleDefinitions.map((def: RoleDefinition) => {
                const roleType = def.roleType || def.name;
                const roleConfig = ROLE_TYPES[roleType] || ROLE_TYPES.EMPLOYEE;

                return {
                    id: def.id,
                    roleType,
                    personId: '',
                    tenantId: '',
                    isActive: def.isActive ?? true,
                    isPrimary: false,
                    // Use level from ROLE_TYPES config instead of API
                    level: roleConfig.level,
                    path: '',
                    permissions: (def.permissions || []).map((p: string) => ({
                        id: p,
                        permission: p,
                        isGranted: true,
                        grantedAt: new Date().toISOString(),
                        grantedBy: ''
                    })),
                    createdAt: new Date().toISOString(),
                    // Add extra fields from API
                    description: def.description || roleConfig.description,
                    userCount: def.userCount
                };
            });

            setRoles(transformedRoles);
            setTenants(tenantsResponse.data || []);
        } catch (err: any) {
            console.error('Error loading data:', err);
            setError(err.message || 'Errore nel caricamento dei dati');
        } finally {
            setLoading(false);
        }
    };

    // Group roles by type
    const rolesByType = useMemo(() => {
        const grouped: Record<string, Role[]> = {};
        roles.forEach(role => {
            if (!grouped[role.roleType]) {
                grouped[role.roleType] = [];
            }
            grouped[role.roleType].push(role);
        });
        return grouped;
    }, [roles]);

    // Filter roles
    const filteredRoles = useMemo(() => {
        return roles.filter(role => {
            if (selectedRoleType && role.roleType !== selectedRoleType) return false;
            if (selectedTenant && role.tenantId !== selectedTenant) return false;
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const personName = `${role.person?.firstName} ${role.person?.lastName}`.toLowerCase();
                if (!role.roleType.toLowerCase().includes(search) && !personName.includes(search)) {
                    return false;
                }
            }
            return true;
        });
    }, [roles, selectedRoleType, selectedTenant, searchTerm]);

    // Stats
    const stats = useMemo(() => ({
        total: roles.length,
        active: roles.filter(r => r.isActive).length,
        byType: Object.keys(ROLE_TYPES).map(type => ({
            type,
            count: roles.filter(r => r.roleType === type).length
        }))
    }), [roles]);

    const handleViewRole = (role: Role) => {
        setSelectedRole(role);
        setShowRoleModal(true);
    };

    const handleEditRole = (role: Role) => {
        setSelectedRole(role);
        setShowEditModal(true);
    };

    const handleDeleteRole = async (role: Role) => {
        if (!confirm(`Sei sicuro di voler eliminare questo ruolo?`)) {
            return;
        }
        try {
            await managementApi.deleteRole(role.id);
            await loadData();
        } catch (err: any) {
            console.error('Error deleting role:', err);
            setError(err.message || 'Errore nell\'eliminazione del ruolo');
        }
    };

    const handleCreateSuccess = async () => {
        setShowCreateModal(false);
        await loadData();
    };

    const handleEditSuccess = async () => {
        setShowEditModal(false);
        setSelectedRole(null);
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
                        <Shield className="w-7 h-7 text-purple-600" />
                        Gestione Ruoli
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {filteredRoles.length} ruoli su {roles.length} totali
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
                        onClick={() => setShowMatrixView(!showMatrixView)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${showMatrixView
                                ? 'bg-purple-100 text-purple-700'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Layers className="w-5 h-5" />
                        {showMatrixView ? 'Vista Lista' : 'Matrice Permessi'}
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuovo Ruolo
                    </button>
                </div>
            </div>

            {/* Role Types Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(ROLE_TYPES).map(([type, config]) => {
                    const count = rolesByType[type]?.length || 0;
                    const IconComponent = config.icon;
                    return (
                        <button
                            key={type}
                            onClick={() => setSelectedRoleType(selectedRoleType === type ? '' : type)}
                            className={`bg-white rounded-xl border p-4 text-left transition-all ${selectedRoleType === type
                                    ? 'border-purple-500 ring-2 ring-purple-200'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color.split(' ')[0]}`}>
                                    <IconComponent className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
                                </div>
                                <span className="text-2xl font-bold text-gray-900">{count}</span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">{config.name}</div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">{config.description}</div>
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cerca</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Nome ruolo, utente..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                    </div>

                    {/* Role Type Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Ruolo</label>
                        <select
                            value={selectedRoleType}
                            onChange={(e) => setSelectedRoleType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="">Tutti i ruoli</option>
                            {Object.entries(ROLE_TYPES).map(([type, config]) => (
                                <option key={type} value={type}>{config.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tenant Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                        <select
                            value={selectedTenant}
                            onChange={(e) => setSelectedTenant(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="">Tutti i tenant</option>
                            {tenants.map(tenant => (
                                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            {showMatrixView ? (
                <PermissionMatrix roleTypes={Object.keys(ROLE_TYPES)} />
            ) : (
                <RolesList
                    roles={filteredRoles}
                    tenants={tenants}
                    onViewRole={handleViewRole}
                    onEditRole={handleEditRole}
                    onDeleteRole={handleDeleteRole}
                />
            )}

            {/* Role Detail Modal */}
            {showRoleModal && selectedRole && (
                <RoleDetailModal
                    role={selectedRole}
                    tenants={tenants}
                    onClose={() => {
                        setShowRoleModal(false);
                        setSelectedRole(null);
                    }}
                    onEdit={() => {
                        setShowRoleModal(false);
                        setShowEditModal(true);
                    }}
                />
            )}

            {/* Create Role Modal */}
            {showCreateModal && (
                <CreateRoleModal
                    tenants={tenants}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {/* Edit Role Modal */}
            {showEditModal && selectedRole && (
                <EditRoleModal
                    role={selectedRole}
                    tenants={tenants}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedRole(null);
                    }}
                    onSuccess={handleEditSuccess}
                />
            )}
        </div>
    );
};

/**
 * Roles List Component
 * Shows roles in a table with ActionButton as first column
 */
const RolesList: React.FC<{
    roles: Role[];
    tenants: Tenant[];
    onViewRole: (role: Role) => void;
    onEditRole: (role: Role) => void;
    onDeleteRole: (role: Role) => void;
}> = ({ roles, tenants, onViewRole, onEditRole, onDeleteRole }) => {
    if (roles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <Shield className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">Nessun ruolo trovato</h3>
                <p className="text-gray-500 text-sm">Prova a modificare i filtri di ricerca</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-28">Azioni</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Ruolo</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Utenti</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tenant</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Livello</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Stato</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {roles.map(role => {
                        const roleConfig = ROLE_TYPES[role.roleType] || ROLE_TYPES.EMPLOYEE;
                        const tenant = tenants.find(t => t.id === role.tenantId);
                        const IconComponent = roleConfig.icon;

                        // Actions for ActionButton - must use JSX elements for icons
                        const actions = [
                            {
                                label: 'Visualizza',
                                icon: <Eye className="w-4 h-4" />,
                                onClick: () => onViewRole(role)
                            },
                            {
                                label: 'Modifica',
                                icon: <Edit2 className="w-4 h-4" />,
                                onClick: () => onEditRole(role)
                            },
                            {
                                label: 'Elimina',
                                icon: <Trash2 className="w-4 h-4" />,
                                onClick: () => onDeleteRole(role),
                                variant: 'danger' as const
                            }
                        ];

                        return (
                            <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                                {/* Action Button - Prima colonna */}
                                <td className="px-4 py-3">
                                    <ActionButton actions={actions} theme="violet" />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${roleConfig.color.split(' ')[0]}`}>
                                            <IconComponent className={`w-5 h-5 ${roleConfig.color.split(' ')[1]}`} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{roleConfig.name}</div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleConfig.color}`}>
                                                {role.roleType}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-900 font-medium">{role.userCount || 0}</span>
                                        <span className="text-gray-500 text-sm">utenti</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-gray-400" />
                                        <span className="text-gray-900">{tenant?.name || 'Tutti i tenant'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig.level <= 2
                                                ? 'bg-purple-100 text-purple-800'
                                                : roleConfig.level <= 5
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            Livello {roleConfig.level}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${role.isActive
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                        {role.isActive ? 'Attivo' : 'Inattivo'}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

/**
 * Permission Matrix Component
 */
const PermissionMatrix: React.FC<{ roleTypes: string[] }> = ({ roleTypes }) => {
    // Default permission matrix
    const defaultPermissions: Record<string, Record<string, boolean>> = {
        SUPER_ADMIN: Object.fromEntries(PERMISSION_RESOURCES.flatMap(r => PERMISSION_ACTIONS.map(a => [`${r}:${a}`, true]))),
        ADMIN: Object.fromEntries(PERMISSION_RESOURCES.flatMap(r => PERMISSION_ACTIONS.map(a => [`${r}:${a}`, true]))),
        MANAGER: {
            'persons:read': true, 'persons:write': true, 'persons:create': true,
            'companies:read': true,
            'courses:read': true, 'courses:write': true,
            'schedules:read': true, 'schedules:write': true, 'schedules:create': true,
            'enrollments:read': true, 'enrollments:write': true, 'enrollments:create': true,
            'reports:read': true
        },
        TRAINER: {
            'persons:read': true,
            'courses:read': true, 'courses:write': true,
            'schedules:read': true,
            'enrollments:read': true
        },
        EMPLOYEE: {
            'persons:read': true,
            'courses:read': true,
            'schedules:read': true
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 sticky left-0 bg-gray-50 z-10">
                                Risorsa / Azione
                            </th>
                            {roleTypes.map(type => (
                                <th key={type} className="px-3 py-3 text-center text-sm font-medium text-gray-700 min-w-[100px]">
                                    {ROLE_TYPES[type]?.name || type}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {PERMISSION_RESOURCES.map(resource => (
                            <React.Fragment key={resource}>
                                {/* Resource Header */}
                                <tr className="bg-gray-50">
                                    <td colSpan={roleTypes.length + 1} className="px-4 py-2 text-sm font-semibold text-gray-700 capitalize sticky left-0 bg-gray-50">
                                        {resource}
                                    </td>
                                </tr>
                                {/* Actions */}
                                {PERMISSION_ACTIONS.map(action => (
                                    <tr key={`${resource}:${action}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm text-gray-600 pl-8 sticky left-0 bg-white">
                                            {action}
                                        </td>
                                        {roleTypes.map(type => {
                                            const hasPermission = defaultPermissions[type]?.[`${resource}:${action}`];
                                            return (
                                                <td key={`${type}:${resource}:${action}`} className="px-3 py-2 text-center">
                                                    {hasPermission ? (
                                                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                                                    ) : (
                                                        <X className="w-5 h-5 text-gray-300 mx-auto" />
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

/**
 * Role Detail Modal
 */
const RoleDetailModal: React.FC<{
    role: Role;
    tenants: Tenant[];
    onClose: () => void;
    onEdit: () => void;
}> = ({ role, tenants, onClose, onEdit }) => {
    const roleConfig = ROLE_TYPES[role.roleType] || ROLE_TYPES.EMPLOYEE;
    const tenant = tenants.find(t => t.id === role.tenantId);
    const IconComponent = roleConfig.icon;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-4 border-b ${roleConfig.color.replace('text-', 'border-')}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${roleConfig.color.split(' ')[0]}`}>
                                <IconComponent className={`w-6 h-6 ${roleConfig.color.split(' ')[1]}`} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">{roleConfig.name}</h2>
                                <p className="text-sm text-gray-500">{roleConfig.description}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* User Info */}
                    {role.person && (
                        <div className="mb-6">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Utente Assegnato</h4>
                            <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-purple-700">
                                        {role.person.firstName?.[0]}{role.person.lastName?.[0]}
                                    </span>
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {role.person.firstName} {role.person.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500">{role.person.email}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Tenant</div>
                            <div className="font-medium text-gray-900">{tenant?.name || 'N/A'}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Livello</div>
                            <div className="font-medium text-gray-900">{role.level}/100</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Stato</div>
                            <div className={`font-medium ${role.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                {role.isActive ? 'Attivo' : 'Inattivo'}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm text-gray-500">Primario</div>
                            <div className="font-medium text-gray-900">{role.isPrimary ? 'Sì' : 'No'}</div>
                        </div>
                    </div>

                    {/* Permissions */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Permessi Attivi</h4>
                        {role.permissions && role.permissions.length > 0 ? (
                            <div className="space-y-2">
                                {role.permissions.filter(p => p.isGranted).map(permission => (
                                    <div
                                        key={permission.id}
                                        className="flex items-center justify-between p-2 bg-green-50 rounded-lg"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Unlock className="w-4 h-4 text-green-600" />
                                            <span className="text-sm text-gray-900">
                                                {permission.permission}
                                            </span>
                                        </div>
                                        {permission.grantedAt && (
                                            <span className="text-xs text-gray-500">
                                                {new Date(permission.grantedAt).toLocaleDateString('it-IT')}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">
                                Permessi gestiti a livello di ruolo
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Chiudi
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
    );
};

/**
 * Create Role Modal Component
 */
const CreateRoleModal: React.FC<{
    tenants: Tenant[];
    onClose: () => void;
    onSuccess: () => Promise<void>;
}> = ({ tenants, onClose, onSuccess }) => {
    const [formData, setFormData] = useState<CreateRoleData>({
        name: '',
        roleType: 'EMPLOYEE',
        displayName: '',
        description: '',
        permissions: [],
        tenantId: tenants[0]?.id || ''
    });
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const togglePermission = (permission: string) => {
        setSelectedPermissions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(permission)) {
                newSet.delete(permission);
            } else {
                newSet.add(permission);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.roleType) {
            setError('Nome e tipo ruolo sono obbligatori');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await managementApi.createRole({
                ...formData,
                permissions: Array.from(selectedPermissions)
            });
            await onSuccess();
        } catch (err: any) {
            console.error('Error creating role:', err);
            setError(err.message || 'Errore nella creazione del ruolo');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-purple-600" />
                        Nuovo Ruolo
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
                                    Nome Ruolo *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tipo Ruolo *
                                </label>
                                <select
                                    value={formData.roleType}
                                    onChange={(e) => setFormData(f => ({ ...f, roleType: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    required
                                >
                                    {Object.entries(ROLE_TYPES).map(([type, config]) => (
                                        <option key={type} value={type}>{config.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome Visualizzato
                            </label>
                            <input
                                type="text"
                                value={formData.displayName || ''}
                                onChange={(e) => setFormData(f => ({ ...f, displayName: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                placeholder="Nome visibile nell'interfaccia"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descrizione
                            </label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                rows={3}
                                placeholder="Descrizione del ruolo e delle sue responsabilità"
                            />
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

                        {/* Permissions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Permessi
                            </label>
                            <div className="border border-gray-200 rounded-lg max-h-[200px] overflow-y-auto">
                                {PERMISSION_RESOURCES.map(resource => (
                                    <div key={resource} className="border-b border-gray-100 last:border-b-0">
                                        <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700 capitalize">
                                            {resource}
                                        </div>
                                        <div className="px-3 py-2 flex flex-wrap gap-2">
                                            {PERMISSION_ACTIONS.map(action => {
                                                const permission = `${resource}:${action}`;
                                                return (
                                                    <label
                                                        key={permission}
                                                        className={`inline-flex items-center px-2 py-1 rounded text-xs cursor-pointer transition-colors ${selectedPermissions.has(permission)
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPermissions.has(permission)}
                                                            onChange={() => togglePermission(permission)}
                                                            className="sr-only"
                                                        />
                                                        {action}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {selectedPermissions.size} permessi selezionati
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
                                    Crea Ruolo
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
 * Edit Role Modal Component
 */
const EditRoleModal: React.FC<{
    role: Role;
    tenants: Tenant[];
    onClose: () => void;
    onSuccess: () => Promise<void>;
}> = ({ role, tenants, onClose, onSuccess }) => {
    const [formData, setFormData] = useState<UpdateRoleData>({
        name: role.roleType,
        roleType: role.roleType,
        displayName: role.description || '',
        description: role.description || '',
        isActive: role.isActive
    });
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
        new Set(role.permissions?.map(p => p.permission) || [])
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const togglePermission = (permission: string) => {
        setSelectedPermissions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(permission)) {
                newSet.delete(permission);
            } else {
                newSet.add(permission);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setSaving(true);
        setError(null);

        try {
            await managementApi.updateRole(role.id, {
                ...formData,
                permissions: Array.from(selectedPermissions)
            });
            await onSuccess();
        } catch (err: any) {
            console.error('Error updating role:', err);
            setError(err.message || 'Errore nell\'aggiornamento del ruolo');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-purple-600" />
                        Modifica Ruolo
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
                                    Nome Ruolo
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
                                    Tipo Ruolo
                                </label>
                                <select
                                    value={formData.roleType || role.roleType}
                                    onChange={(e) => setFormData(f => ({ ...f, roleType: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                    {Object.entries(ROLE_TYPES).map(([type, config]) => (
                                        <option key={type} value={type}>{config.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descrizione
                            </label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive ?? true}
                                    onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">Ruolo attivo</span>
                            </label>
                        </div>

                        {/* Permissions */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Permessi
                            </label>
                            <div className="border border-gray-200 rounded-lg max-h-[200px] overflow-y-auto">
                                {PERMISSION_RESOURCES.map(resource => (
                                    <div key={resource} className="border-b border-gray-100 last:border-b-0">
                                        <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700 capitalize">
                                            {resource}
                                        </div>
                                        <div className="px-3 py-2 flex flex-wrap gap-2">
                                            {PERMISSION_ACTIONS.map(action => {
                                                const permission = `${resource}:${action}`;
                                                return (
                                                    <label
                                                        key={permission}
                                                        className={`inline-flex items-center px-2 py-1 rounded text-xs cursor-pointer transition-colors ${selectedPermissions.has(permission)
                                                                ? 'bg-purple-100 text-purple-800'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPermissions.has(permission)}
                                                            onChange={() => togglePermission(permission)}
                                                            className="sr-only"
                                                        />
                                                        {action}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {selectedPermissions.size} permessi selezionati
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

export default RolesManagement;
