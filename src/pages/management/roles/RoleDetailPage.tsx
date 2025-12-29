/**
 * Role Detail Page
 * 
 * Shows detailed information about a specific role including:
 * - Role information and statistics
 * - List of users with this role
 * - Permissions associated with the role
 * - Actions to manage the role
 * 
 * @module pages/management/roles/RoleDetailPage
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Shield,
    Users,
    ArrowLeft,
    Edit2,
    Trash2,
    RefreshCw,
    AlertCircle,
    Loader2,
    Key,
    Layers,
    Building2,
    Settings,
    Lock,
    Unlock,
    Eye,
    Plus,
    Info,
    Check,
    X,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { apiGet, apiDelete } from '../../../services/api';
import { ActionButton } from '../../../components/ui/ActionButton';

// Role type configuration - same as RolesManagement
interface RoleTypeConfig {
    name: string;
    description: string;
    level: number;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
}

const ROLE_TYPES: Record<string, RoleTypeConfig> = {
    SUPER_ADMIN: { name: 'Super Admin', description: 'Accesso completo a tutte le funzionalità e tenant', level: 0, color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Shield },
    ADMIN: { name: 'Amministratore', description: 'Gestione completa del tenant assegnato', level: 1, color: 'bg-red-100 text-red-800 border-red-300', icon: Key },
    COMPANY_ADMIN: { name: 'Amministratore Azienda', description: 'Gestione della propria azienda', level: 2, color: 'bg-orange-100 text-orange-800 border-orange-300', icon: Building2 },
    TENANT_ADMIN: { name: 'Amministratore Tenant', description: 'Gestione del tenant', level: 2, color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Key },
    TRAINING_ADMIN: { name: 'Admin Formazione', description: 'Gestione completa formazione', level: 3, color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Layers },
    CLINIC_ADMIN: { name: 'Admin Clinica', description: 'Gestione poliambulatorio', level: 3, color: 'bg-teal-100 text-teal-800 border-teal-300', icon: Settings },
    HR_MANAGER: { name: 'Manager HR', description: 'Gestione risorse umane', level: 4, color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Users },
    MANAGER: { name: 'Manager', description: 'Gestione utenti e risorse del proprio team', level: 4, color: 'bg-sky-100 text-sky-800 border-sky-300', icon: Users },
    DEPARTMENT_HEAD: { name: 'Resp. Dipartimento', description: 'Gestione dipartimento', level: 4, color: 'bg-cyan-100 text-cyan-800 border-cyan-300', icon: Layers },
    TRAINER_COORDINATOR: { name: 'Coord. Formatori', description: 'Coordinamento formativo', level: 5, color: 'bg-violet-100 text-violet-800 border-violet-300', icon: Users },
    COMPANY_MANAGER: { name: 'Resp. Aziendale', description: 'Responsabilità aziendali', level: 5, color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300', icon: Building2 },
    SUPERVISOR: { name: 'Supervisore', description: 'Supervisione operativa', level: 5, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Eye },
    AUDITOR: { name: 'Auditor', description: 'Controllo e audit', level: 5, color: 'bg-neutral-100 text-neutral-800 border-neutral-300', icon: Info },
    SENIOR_TRAINER: { name: 'Formatore Senior', description: 'Formazione avanzata', level: 6, color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: Layers },
    COORDINATOR: { name: 'Coordinatore', description: 'Coordinamento attività', level: 6, color: 'bg-rose-100 text-rose-800 border-rose-300', icon: Users },
    TRAINER: { name: 'Formatore', description: 'Gestione corsi e formazione', level: 7, color: 'bg-green-100 text-green-800 border-green-300', icon: Layers },
    EXTERNAL_TRAINER: { name: 'Formatore Esterno', description: 'Formazione specialistica', level: 7, color: 'bg-lime-100 text-lime-800 border-lime-300', icon: Layers },
    OPERATOR: { name: 'Operatore', description: 'Operazioni base', level: 7, color: 'bg-pink-100 text-pink-800 border-pink-300', icon: Settings },
    CONSULTANT: { name: 'Consulente', description: 'Consulenza specialistica', level: 7, color: 'bg-stone-100 text-stone-800 border-stone-300', icon: Info },
    EMPLOYEE: { name: 'Dipendente', description: 'Accesso base alle funzionalità assegnate', level: 8, color: 'bg-gray-100 text-gray-800 border-gray-300', icon: Users },
    VIEWER: { name: 'Visualizzatore', description: 'Solo visualizzazione', level: 9, color: 'bg-slate-100 text-slate-800 border-slate-300', icon: Eye },
    GUEST: { name: 'Ospite', description: 'Accesso limitato', level: 10, color: 'bg-zinc-100 text-zinc-600 border-zinc-300', icon: Users }
};

interface RoleUser {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    assignedAt: string;
    assignedBy?: string;
}

interface RolePermission {
    id: string;
    permission: string;
    resource: string;
    action: string;
    scope?: string;
}

interface RoleDetail {
    id: string;
    roleType: string;
    name: string;
    description: string;
    isActive: boolean;
    isSystemRole: boolean;
    userCount: number;
    permissions: RolePermission[];
    users?: RoleUser[];
}

const RoleDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    
    const [role, setRole] = useState<RoleDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'permissions'>('overview');

    useEffect(() => {
        if (id) {
            loadRoleDetails();
        }
    }, [id]);

    const loadRoleDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiGet<{ success: boolean; data: RoleDetail }>(
                `/api/v1/roles/${id}?includeUsers=true`
            );

            if (response?.data) {
                setRole(response.data);
            } else {
                setError('Ruolo non trovato');
            }
        } catch (err: any) {
            console.error('Error loading role details:', err);
            setError(err.message || 'Errore nel caricamento dei dettagli del ruolo');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!role) return;
        
        if (!confirm(`Sei sicuro di voler eliminare il ruolo "${role.name}"?`)) {
            return;
        }

        try {
            await apiDelete(`/api/v1/roles/${role.id}`);
            navigate('/management/roles');
        } catch (err: any) {
            console.error('Error deleting role:', err);
            setError(err.message || 'Errore nell\'eliminazione del ruolo');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600">Caricamento...</span>
            </div>
        );
    }

    if (error || !role) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-xl border border-red-200 p-6">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Errore</h3>
                <p className="text-red-600 text-center">{error || 'Ruolo non trovato'}</p>
                <button 
                    onClick={() => navigate('/management/roles')}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Torna ai ruoli
                </button>
            </div>
        );
    }

    const roleConfig = ROLE_TYPES[role.roleType] || ROLE_TYPES.EMPLOYEE;
    const IconComponent = roleConfig.icon;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => navigate('/management/roles')}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mt-1"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${roleConfig.color.split(' ')[0]}`}>
                            <IconComponent className={`w-8 h-8 ${roleConfig.color.split(' ')[1]}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{roleConfig.name}</h1>
                                {role.isSystemRole && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                        Sistema
                                    </span>
                                )}
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleConfig.color}`}>
                                    {role.roleType}
                                </span>
                            </div>
                            <p className="text-gray-600 mt-1">{roleConfig.description}</p>
                            <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{role.userCount} utenti</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Layers className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">Livello {roleConfig.level}</span>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {role.isActive ? 'Attivo' : 'Inattivo'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadRoleDetails}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Aggiorna"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        {!role.isSystemRole && hasPermission('roles', 'write') && (
                            <>
                                <button
                                    onClick={() => navigate(`/management/permissions/advanced`)}
                                    className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Key className="w-4 h-4" />
                                    Gestisci Permessi
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Elimina
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="flex px-4">
                        {[
                            { id: 'overview', label: 'Panoramica', icon: Info },
                            { id: 'users', label: 'Utenti', icon: Users, count: role.userCount },
                            { id: 'permissions', label: 'Permessi', icon: Key, count: role.permissions?.length || 0 }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-purple-600 text-purple-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                        activeTab === tab.id
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900">Informazioni Ruolo</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tipo</span>
                                        <span className="font-medium text-gray-900">{role.roleType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Nome</span>
                                        <span className="font-medium text-gray-900">{roleConfig.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Livello</span>
                                        <span className="font-medium text-gray-900">{roleConfig.level}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tipo</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            role.isSystemRole 
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {role.isSystemRole ? 'Sistema' : 'Personalizzato'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Stato</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            role.isActive 
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {role.isActive ? 'Attivo' : 'Inattivo'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900">Statistiche</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Utenti con questo ruolo</span>
                                        <span className="text-2xl font-bold text-purple-600">{role.userCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-500">Permessi</span>
                                        <span className="text-2xl font-bold text-blue-600">{role.permissions?.length || 0}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => setActiveTab('users')}
                                        className="flex-1 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Users className="w-4 h-4" />
                                        Vedi Utenti
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('permissions')}
                                        className="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Key className="w-4 h-4" />
                                        Vedi Permessi
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">Utenti con ruolo {roleConfig.name}</h3>
                                <button
                                    onClick={() => navigate('/management/users')}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Assegna Utente
                                </button>
                            </div>

                            {role.users && role.users.length > 0 ? (
                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Utente</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Assegnato il</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Stato</th>
                                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Azioni</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {role.users.map((user) => (
                                                <tr key={user.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                                <span className="text-purple-600 font-medium text-sm">
                                                                    {user.name?.charAt(0) || 'U'}
                                                                </span>
                                                            </div>
                                                            <span className="font-medium text-gray-900">{user.name || 'N/D'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                                                    <td className="px-4 py-3 text-gray-600 text-sm">
                                                        {new Date(user.assignedAt).toLocaleDateString('it-IT')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            user.isActive 
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {user.isActive ? 'Attivo' : 'Inattivo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => navigate(`/management/users/${user.id}`)}
                                                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">Nessun utente con questo ruolo</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Permissions Tab */}
                    {activeTab === 'permissions' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">Permessi del ruolo {roleConfig.name}</h3>
                                <button
                                    onClick={() => navigate('/management/permissions/advanced')}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                                >
                                    <Settings className="w-4 h-4" />
                                    Gestisci Permessi
                                </button>
                            </div>

                            {role.permissions && role.permissions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {role.permissions.map((permission, idx) => (
                                        <div 
                                            key={permission.id || idx}
                                            className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Key className="w-4 h-4 text-purple-500" />
                                                <span className="text-sm text-gray-900">
                                                    {permission.permission || `${permission.resource}:${permission.action}`}
                                                </span>
                                            </div>
                                            {permission.scope && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                                    {permission.scope}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-lg">
                                    <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 mb-4">
                                        {role.isSystemRole 
                                            ? 'I ruoli di sistema hanno permessi configurati automaticamente'
                                            : 'Nessun permesso configurato per questo ruolo'
                                        }
                                    </p>
                                    <button
                                        onClick={() => navigate('/management/permissions/advanced')}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        Configura Permessi
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoleDetailPage;
