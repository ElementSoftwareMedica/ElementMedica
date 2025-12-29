/**
 * Advanced Permissions Page
 * 
 * Full-featured permission management integrating OptimizedPermissionManager
 * - Select role to manage permissions
 * - CRUD per entity with granular field permissions
 * - Scope control (all, tenant, own, relational)
 * - Field-level permissions
 * 
 * @module pages/management/permissions/AdvancedPermissionsPage
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield,
    RefreshCw,
    AlertCircle,
    Loader2,
    Info,
    CheckCircle,
    ArrowLeft,
    Settings,
    Users,
    Key,
    Layers,
    Lock,
    Unlock,
    Crown,
    Building2,
    GraduationCap,
    Stethoscope,
    UserCog,
    ClipboardList,
    UserCheck,
    UserX,
    FileSearch,
    Briefcase,
    Eye
} from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { useRoles, type Role } from '../../../hooks/useRoles';
import { useTenants } from '../../../hooks/useTenants';
import OptimizedPermissionManager from '../../../components/roles/OptimizedPermissionManager';

// Complete role type configurations for all 22 system roles
const ROLE_TYPES: Record<string, { name: string; description: string; level: number; color: string; icon: React.FC<{ className?: string }> }> = {
    SUPER_ADMIN: {
        name: 'Super Admin',
        description: 'Accesso completo a tutte le funzionalità e tenant',
        level: 0,
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: Crown
    },
    ADMIN: {
        name: 'Amministratore',
        description: 'Gestione completa del tenant assegnato',
        level: 1,
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: Shield
    },
    COMPANY_ADMIN: {
        name: 'Amministratore Azienda',
        description: 'Gestione della propria azienda',
        level: 2,
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Building2
    },
    TENANT_ADMIN: {
        name: 'Amministratore Tenant',
        description: 'Gestione del tenant',
        level: 2,
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: Key
    },
    TRAINING_ADMIN: {
        name: 'Admin Formazione',
        description: 'Gestione completa formazione',
        level: 3,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: GraduationCap
    },
    CLINIC_ADMIN: {
        name: 'Admin Clinica',
        description: 'Gestione poliambulatorio',
        level: 3,
        color: 'bg-teal-100 text-teal-800 border-teal-200',
        icon: Stethoscope
    },
    HR_MANAGER: {
        name: 'Manager HR',
        description: 'Gestione risorse umane',
        level: 4,
        color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: UserCog
    },
    MANAGER: {
        name: 'Manager',
        description: 'Gestione operativa',
        level: 4,
        color: 'bg-sky-100 text-sky-800 border-sky-200',
        icon: Briefcase
    },
    DEPARTMENT_HEAD: {
        name: 'Resp. Dipartimento',
        description: 'Gestione dipartimento',
        level: 4,
        color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        icon: ClipboardList
    },
    TRAINER_COORDINATOR: {
        name: 'Coord. Formatori',
        description: 'Coordinamento formativo',
        level: 5,
        color: 'bg-violet-100 text-violet-800 border-violet-200',
        icon: Users
    },
    COMPANY_MANAGER: {
        name: 'Resp. Aziendale',
        description: 'Responsabilità aziendali',
        level: 5,
        color: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
        icon: Building2
    },
    SUPERVISOR: {
        name: 'Supervisore',
        description: 'Supervisione operativa',
        level: 5,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Eye
    },
    AUDITOR: {
        name: 'Auditor',
        description: 'Controllo e audit',
        level: 5,
        color: 'bg-neutral-100 text-neutral-800 border-neutral-200',
        icon: FileSearch
    },
    SENIOR_TRAINER: {
        name: 'Formatore Senior',
        description: 'Formazione avanzata',
        level: 6,
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: GraduationCap
    },
    COORDINATOR: {
        name: 'Coordinatore',
        description: 'Coordinamento attività',
        level: 6,
        color: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: Users
    },
    TRAINER: {
        name: 'Formatore',
        description: 'Gestione corsi',
        level: 7,
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: GraduationCap
    },
    EXTERNAL_TRAINER: {
        name: 'Formatore Esterno',
        description: 'Formazione specialistica',
        level: 7,
        color: 'bg-lime-100 text-lime-800 border-lime-200',
        icon: UserCheck
    },
    OPERATOR: {
        name: 'Operatore',
        description: 'Operazioni base',
        level: 7,
        color: 'bg-pink-100 text-pink-800 border-pink-200',
        icon: Settings
    },
    CONSULTANT: {
        name: 'Consulente',
        description: 'Consulenza specialistica',
        level: 7,
        color: 'bg-stone-100 text-stone-800 border-stone-200',
        icon: FileSearch
    },
    EMPLOYEE: {
        name: 'Dipendente',
        description: 'Accesso base',
        level: 8,
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: Users
    },
    VIEWER: {
        name: 'Visualizzatore',
        description: 'Solo visualizzazione',
        level: 9,
        color: 'bg-slate-100 text-slate-800 border-slate-200',
        icon: Eye
    },
    GUEST: {
        name: 'Ospite',
        description: 'Accesso limitato',
        level: 10,
        color: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        icon: UserX
    }
};

const AdvancedPermissionsPage: React.FC = () => {
    const { hasPermission, isLoading: authLoading } = useAuth();
    const rolesData = useRoles();
    const roles: Role[] = rolesData.roles;
    const selectedRole: Role | null = rolesData.selectedRole;
    const { loadRoles, selectRole, setSelectedRole, loading: rolesLoading } = rolesData;

    // Load tenants for permission manager (non-blocking)
    const { tenants, loading: tenantsLoading } = useTenants();

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isChangingRole, setIsChangingRole] = useState(false);

    // Load roles on mount
    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    // Show message helper
    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    // Handle role selection
    const handleRoleChange = async (role: Role) => {
        if (hasUnsavedChanges && selectedRole) {
            if (!confirm('Hai modifiche non salvate. Vuoi procedere senza salvare?')) {
                return;
            }
        }

        setIsChangingRole(true);
        try {
            await selectRole(role);
            setHasUnsavedChanges(false);
        } catch (error) {
            showMessage('error', 'Errore nel cambio ruolo');
        } finally {
            setIsChangingRole(false);
        }
    };

    // Back to role selection
    const handleBackToRoleSelection = () => {
        setSelectedRole(null);
        setHasUnsavedChanges(false);
    };

    // Convert role for OptimizedPermissionManager
    const convertRole = (role: Role | null) => {
        if (!role) return null;
        return {
            ...role,
            description: role.description || '',
            userCount: role.userCount || 0,
            isActive: true
        };
    };

    // Loading state
    if (authLoading || rolesLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                <span className="ml-2 text-gray-600">Caricamento...</span>
            </div>
        );
    }

    // Permission check
    if (!hasPermission('roles', 'read')) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-xl border border-gray-200">
                <Shield className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Accesso negato</h3>
                <p className="text-gray-600">Non hai i permessi necessari per visualizzare i permessi.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                            <Settings className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-3">
                                <h1 className="text-2xl font-bold text-gray-900">Gestione Permessi Avanzata</h1>
                                {hasUnsavedChanges && (
                                    <div className="flex items-center space-x-1 px-2 py-1 bg-amber-100 border border-amber-300 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                        <span className="text-xs font-medium text-amber-700">Modifiche non salvate</span>
                                    </div>
                                )}
                                {isChangingRole && (
                                    <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 border border-purple-300 rounded-lg">
                                        <Loader2 className="w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs font-medium text-purple-700">Cambio ruolo...</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-600">
                                Configura permessi CRUD, scope tenant e accesso campi specifici per ogni ruolo
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center space-x-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{roles.length}</div>
                            <div className="text-xs text-gray-500">Ruoli</div>
                        </div>
                        {selectedRole && (
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{selectedRole.userCount || 0}</div>
                                <div className="text-xs text-gray-500">Utenti</div>
                            </div>
                        )}
                        <button
                            onClick={() => loadRoles()}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Aggiorna"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg border ${message.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                    <div className="flex items-center">
                        {message.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 mr-2" />
                        ) : (
                            <AlertCircle className="w-5 h-5 mr-2" />
                        )}
                        <span>{message.text}</span>
                    </div>
                </div>
            )}

            {/* Role Selection - when no role selected */}
            {!selectedRole && !rolesLoading && (
                <div className="space-y-6">
                    {/* Info Banner */}
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                        <div className="flex items-center space-x-3">
                            <Shield className="w-6 h-6 text-purple-600" />
                            <div>
                                <h3 className="font-semibold text-purple-900">Seleziona un ruolo</h3>
                                <p className="text-sm text-purple-700">
                                    Scegli un ruolo dalla lista per configurare i permessi CRUD, scope tenant e campi specifici
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Role Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map((role: Role, index: number) => {
                            const roleType = role.type || role.name;
                            // Usa la configurazione ROLE_TYPES se disponibile, altrimenti costruisci da dati API
                            const config = ROLE_TYPES[roleType] || {
                                name: role.name || roleType,
                                description: role.description || `Ruolo ${roleType}`,
                                level: role.level ?? 5,
                                color: 'bg-gray-100 text-gray-800 border-gray-200',
                                icon: Shield
                            };
                            const IconComponent = config.icon;

                            return (
                                <button
                                    key={role?.type || `role-${index}`}
                                    onClick={() => role && handleRoleChange(role)}
                                    disabled={isChangingRole || !role}
                                    className={`p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-400 hover:shadow-md transition-all text-left group relative ${isChangingRole || !role ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                                            <IconComponent className={`w-5 h-5 ${config.color.split(' ')[1]}`} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">{config.name}</div>
                                            <div className="text-xs text-gray-500">Livello {config.level}</div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-purple-600 font-medium">{role?.userCount || 0} utenti</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                                            {roleType}
                                        </span>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-purple-600 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform rounded-b-xl" />
                                </button>
                            );
                        })}
                    </div>

                    {/* Help Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-start space-x-3">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                                <h4 className="font-medium text-blue-900 mb-3">Guida ai Permessi Avanzati</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                                    <div className="space-y-3">
                                        <div>
                                            <p className="font-semibold mb-1">🎭 Ruoli e Tenant</p>
                                            <p className="text-xs">
                                                I ruoli sono <strong>per-tenant</strong>: lo stesso utente può avere
                                                ruoli diversi in tenant diversi (es: Admin in uno, Dipendente in un altro).
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold mb-1 flex items-center gap-2">
                                                <Lock className="w-4 h-4" />
                                                Azioni CRUD
                                            </p>
                                            <p className="text-xs">Create, Read, Update, Delete per ogni entità</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="font-semibold mb-1 flex items-center gap-2">
                                                <Layers className="w-4 h-4" />
                                                Scope (Ambito)
                                            </p>
                                            <ul className="text-xs space-y-0.5 ml-2">
                                                <li>• <strong>Tutti:</strong> Accesso globale</li>
                                                <li>• <strong>Tenant:</strong> Solo dati del tenant</li>
                                                <li>• <strong>Propri:</strong> Solo record creati dall'utente</li>
                                                <li>• <strong>Relazionale:</strong> Record correlati all'utente</li>
                                                <li>• <strong>Nessuno:</strong> Disabilita completamente il permesso</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="font-semibold mb-1 flex items-center gap-2">
                                                <Key className="w-4 h-4" />
                                                Campi e Limiti
                                            </p>
                                            <p className="text-xs">Configura accesso a campi specifici e limiti numerici</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Permission Manager - when role is selected */}
            {selectedRole && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Role Header */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={handleBackToRoleSelection}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Torna alla selezione ruoli"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className={`p-2 rounded-lg ${ROLE_TYPES[selectedRole.type || 'EMPLOYEE']?.color.split(' ')[0] || 'bg-gray-100'}`}>
                                    <Shield className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Gestione Permessi - {selectedRole.name}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Configura i permessi per tutte le entità del sistema
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${ROLE_TYPES[selectedRole.type || 'EMPLOYEE']?.color || 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {selectedRole.type || selectedRole.name}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {selectedRole.userCount || 0} utenti
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* OptimizedPermissionManager */}
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="h-full p-6 overflow-auto">
                            <OptimizedPermissionManager
                                role={convertRole(selectedRole)!}
                                tenants={tenants}
                                onBack={handleBackToRoleSelection}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Loading roles */}
            {rolesLoading && (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                        <p className="text-gray-600">Caricamento ruoli...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedPermissionsPage;
