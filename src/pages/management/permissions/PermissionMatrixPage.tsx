/**
 * Permission Matrix Page
 * 
 * Visual matrix showing permissions across all roles
 * - Rows: Resources (persons, companies, courses, etc.)
 * - Columns: Roles (ADMIN, MANAGER, TRAINER, EMPLOYEE)
 * - Cells: Permission actions (read, write, create, delete)
 * 
 * @module pages/management/permissions/PermissionMatrixPage
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    Shield,
    Search,
    Filter,
    RefreshCw,
    Check,
    X,
    AlertCircle,
    Loader2,
    Info,
    Lock,
    Eye,
    Edit2,
    Plus,
    Trash2,
    Settings,
    ChevronDown,
    ChevronUp,
    Download,
    Save
} from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { apiGet, apiPut } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';

// Permission resources
const RESOURCES = [
    { id: 'persons', name: 'Persone', description: 'Gestione utenti e dipendenti', icon: 'users' },
    { id: 'companies', name: 'Aziende', description: 'Gestione aziende clienti', icon: 'building' },
    { id: 'courses', name: 'Corsi', description: 'Gestione catalogo corsi', icon: 'book' },
    { id: 'schedules', name: 'Edizioni', description: 'Gestione edizioni corsi', icon: 'calendar' },
    { id: 'enrollments', name: 'Iscrizioni', description: 'Gestione iscrizioni', icon: 'clipboard' },
    { id: 'trainers', name: 'Formatori', description: 'Gestione formatori', icon: 'user-check' },
    { id: 'locations', name: 'Sedi', description: 'Gestione sedi formative', icon: 'map-pin' },
    { id: 'templates', name: 'Template', description: 'Template documenti', icon: 'file-text' },
    { id: 'preventivi', name: 'Preventivi', description: 'Gestione preventivi', icon: 'file' },
    { id: 'submissions', name: 'Richieste', description: 'Form submissions', icon: 'inbox' },
    { id: 'cms', name: 'CMS', description: 'Content Management', icon: 'globe' },
    { id: 'gdpr', name: 'GDPR', description: 'Privacy e compliance', icon: 'shield' },
    { id: 'reports', name: 'Report', description: 'Report e statistiche', icon: 'bar-chart' },
    { id: 'settings', name: 'Impostazioni', description: 'Configurazioni sistema', icon: 'settings' },
    { id: 'tenants', name: 'Tenant', description: 'Gestione tenant', icon: 'layers' },
    { id: 'roles', name: 'Ruoli', description: 'Gestione ruoli e permessi', icon: 'key' },
];

// Permission actions
const ACTIONS = [
    { id: 'read', name: 'Lettura', icon: Eye, color: 'text-blue-600' },
    { id: 'write', name: 'Modifica', icon: Edit2, color: 'text-green-600' },
    { id: 'create', name: 'Creazione', icon: Plus, color: 'text-purple-600' },
    { id: 'delete', name: 'Elimina', icon: Trash2, color: 'text-red-600' },
    { id: 'manage', name: 'Gestione', icon: Settings, color: 'text-orange-600' },
];

// System roles
const SYSTEM_ROLES = [
    { id: 'SUPER_ADMIN', name: 'Super Admin', level: 100, color: 'bg-purple-100 text-purple-800' },
    { id: 'ADMIN', name: 'Admin', level: 90, color: 'bg-red-100 text-red-800' },
    { id: 'MANAGER', name: 'Manager', level: 70, color: 'bg-blue-100 text-blue-800' },
    { id: 'TRAINER', name: 'Formatore', level: 50, color: 'bg-green-100 text-green-800' },
    { id: 'EMPLOYEE', name: 'Dipendente', level: 10, color: 'bg-gray-100 text-gray-800' },
];

// Default permissions matrix
const DEFAULT_PERMISSIONS: Record<string, Record<string, string[]>> = {
    SUPER_ADMIN: {
        persons: ['read', 'write', 'create', 'delete', 'manage'],
        companies: ['read', 'write', 'create', 'delete', 'manage'],
        courses: ['read', 'write', 'create', 'delete', 'manage'],
        schedules: ['read', 'write', 'create', 'delete', 'manage'],
        enrollments: ['read', 'write', 'create', 'delete', 'manage'],
        trainers: ['read', 'write', 'create', 'delete', 'manage'],
        locations: ['read', 'write', 'create', 'delete', 'manage'],
        templates: ['read', 'write', 'create', 'delete', 'manage'],
        preventivi: ['read', 'write', 'create', 'delete', 'manage'],
        submissions: ['read', 'write', 'create', 'delete', 'manage'],
        cms: ['read', 'write', 'create', 'delete', 'manage'],
        gdpr: ['read', 'write', 'create', 'delete', 'manage'],
        reports: ['read', 'write', 'create', 'delete', 'manage'],
        settings: ['read', 'write', 'create', 'delete', 'manage'],
        tenants: ['read', 'write', 'create', 'delete', 'manage'],
        roles: ['read', 'write', 'create', 'delete', 'manage'],
    },
    ADMIN: {
        persons: ['read', 'write', 'create', 'delete'],
        companies: ['read', 'write', 'create', 'delete'],
        courses: ['read', 'write', 'create', 'delete'],
        schedules: ['read', 'write', 'create', 'delete'],
        enrollments: ['read', 'write', 'create', 'delete'],
        trainers: ['read', 'write', 'create', 'delete'],
        locations: ['read', 'write', 'create', 'delete'],
        templates: ['read', 'write', 'create', 'delete'],
        preventivi: ['read', 'write', 'create', 'delete'],
        submissions: ['read', 'write', 'create', 'delete'],
        cms: ['read', 'write', 'create', 'delete'],
        gdpr: ['read', 'write'],
        reports: ['read', 'write'],
        settings: ['read', 'write'],
        tenants: ['read'],
        roles: ['read', 'write'],
    },
    MANAGER: {
        persons: ['read', 'write', 'create'],
        companies: ['read', 'write'],
        courses: ['read', 'write', 'create'],
        schedules: ['read', 'write', 'create'],
        enrollments: ['read', 'write', 'create'],
        trainers: ['read', 'write'],
        locations: ['read'],
        templates: ['read'],
        preventivi: ['read', 'write', 'create'],
        submissions: ['read', 'write'],
        cms: ['read'],
        gdpr: ['read'],
        reports: ['read'],
        settings: [],
        tenants: [],
        roles: ['read'],
    },
    TRAINER: {
        persons: ['read'],
        companies: ['read'],
        courses: ['read'],
        schedules: ['read', 'write'],
        enrollments: ['read', 'write'],
        trainers: ['read'],
        locations: ['read'],
        templates: ['read'],
        preventivi: [],
        submissions: ['read'],
        cms: [],
        gdpr: [],
        reports: ['read'],
        settings: [],
        tenants: [],
        roles: [],
    },
    EMPLOYEE: {
        persons: ['read'],
        companies: ['read'],
        courses: ['read'],
        schedules: ['read'],
        enrollments: ['read'],
        trainers: ['read'],
        locations: ['read'],
        templates: ['read'],
        preventivi: [],
        submissions: [],
        cms: [],
        gdpr: [],
        reports: [],
        settings: [],
        tenants: [],
        roles: [],
    },
};

interface PermissionMatrixPageProps {
    className?: string;
}

const PermissionMatrixPage: React.FC<PermissionMatrixPageProps> = ({ className = '' }) => {
    const { user: currentUser } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [expandedResources, setExpandedResources] = useState<string[]>([]);
    const [permissions, setPermissions] = useState<Record<string, Record<string, string[]>>>(DEFAULT_PERMISSIONS);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        try {
            setLoading(true);
            setError(null);
            // For now, use default permissions
            // In production, fetch from API: const response = await apiGet('/api/v1/permissions/matrix');
            setPermissions(DEFAULT_PERMISSIONS);
        } catch (err: any) {
            console.error('Error loading permissions:', err);
            setError(err.message || 'Errore nel caricamento permessi');
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePermission = (roleId: string, resourceId: string, actionId: string) => {
        if (roleId === 'SUPER_ADMIN') {
            // Super admin has all permissions, cannot be changed
            return;
        }

        setPermissions(prev => {
            const rolePerm = prev[roleId] || {};
            const resourcePerm = rolePerm[resourceId] || [];

            const newResourcePerm = resourcePerm.includes(actionId)
                ? resourcePerm.filter(a => a !== actionId)
                : [...resourcePerm, actionId];

            return {
                ...prev,
                [roleId]: {
                    ...rolePerm,
                    [resourceId]: newResourcePerm
                }
            };
        });
        setHasChanges(true);
    };

    const handleSavePermissions = async () => {
        try {
            setSaving(true);
            // In production: await apiPut('/api/v1/permissions/matrix', permissions);
            console.log('Saving permissions:', permissions);
            // Simulate save
            await new Promise(resolve => setTimeout(resolve, 1000));
            setHasChanges(false);
            showToast({ message: 'Permessi salvati con successo!', type: 'success' });
        } catch (err: any) {
            console.error('Error saving permissions:', err);
            setError(err.message || 'Errore nel salvataggio permessi');
        } finally {
            setSaving(false);
        }
    };

    const toggleResourceExpand = (resourceId: string) => {
        setExpandedResources(prev =>
            prev.includes(resourceId)
                ? prev.filter(r => r !== resourceId)
                : [...prev, resourceId]
        );
    };

    const hasPermission = (roleId: string, resourceId: string, actionId: string): boolean => {
        return permissions[roleId]?.[resourceId]?.includes(actionId) || false;
    };

    const filteredResources = useMemo(() => {
        if (!searchTerm) return RESOURCES;
        const term = searchTerm.toLowerCase();
        return RESOURCES.filter(r =>
            r.name.toLowerCase().includes(term) ||
            r.description.toLowerCase().includes(term)
        );
    }, [searchTerm]);

    const displayRoles = selectedRole
        ? SYSTEM_ROLES.filter(r => r.id === selectedRole)
        : SYSTEM_ROLES;

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
                    onClick={loadPermissions}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Riprova
                </button>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Shield className="w-7 h-7 text-purple-600" />
                        Panoramica Permessi Base
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Vista semplificata delle azioni CRUD per ruolo.
                        Per gestione avanzata (scope, campi, limiti) usa <a href="/management/permissions/advanced" className="text-purple-600 hover:underline">Permessi Avanzati</a>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadPermissions}
                        className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Aggiorna"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    {hasChanges && (
                        <button
                            onClick={handleSavePermissions}
                            disabled={saving}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Salva Modifiche
                        </button>
                    )}
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                    <p className="text-sm text-blue-800">
                        <strong>Matrice Semplificata:</strong> Questa pagina mostra una panoramica delle azioni CRUD base (Crea, Leggi, Modifica, Elimina) per ogni ruolo.
                        Per configurazioni avanzate come scope (Tutti, Solo Tenant, Solo Propri), permessi su campi specifici e limiti numerici, usa la pagina <strong>Permessi Avanzati</strong>.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cerca risorsa..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div className="w-full md:w-64">
                        <select
                            value={selectedRole || ''}
                            onChange={(e) => setSelectedRole(e.target.value || null)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="">Tutti i ruoli</option>
                            {SYSTEM_ROLES.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Legenda Azioni</h3>
                <div className="flex flex-wrap gap-4">
                    {ACTIONS.map(action => {
                        const Icon = action.icon;
                        return (
                            <div key={action.id} className="flex items-center gap-2">
                                <div className={`p-1.5 rounded ${action.color} bg-opacity-10`}>
                                    <Icon className={`w-4 h-4 ${action.color}`} />
                                </div>
                                <span className="text-sm text-gray-600">{action.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Permission Matrix Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                                    Risorsa
                                </th>
                                {displayRoles.map(role => (
                                    <th key={role.id} className="px-4 py-3 text-center min-w-[160px]">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${role.color}`}>
                                            {role.name}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResources.map((resource, idx) => (
                                <tr
                                    key={resource.id}
                                    className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                >
                                    <td className="px-4 py-3 sticky left-0 bg-inherit z-10">
                                        <button
                                            onClick={() => toggleResourceExpand(resource.id)}
                                            className="flex items-center gap-2 text-left w-full"
                                        >
                                            {expandedResources.includes(resource.id) ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            )}
                                            <div>
                                                <div className="font-medium text-gray-900">{resource.name}</div>
                                                {expandedResources.includes(resource.id) && (
                                                    <div className="text-xs text-gray-500 mt-0.5">{resource.description}</div>
                                                )}
                                            </div>
                                        </button>
                                    </td>
                                    {displayRoles.map(role => (
                                        <td key={role.id} className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-1">
                                                {ACTIONS.map(action => {
                                                    const Icon = action.icon;
                                                    const hasPerm = hasPermission(role.id, resource.id, action.id);
                                                    const isLocked = role.id === 'SUPER_ADMIN';

                                                    return (
                                                        <button
                                                            key={action.id}
                                                            onClick={() => handleTogglePermission(role.id, resource.id, action.id)}
                                                            disabled={isLocked}
                                                            className={`p-1.5 rounded transition-all ${hasPerm
                                                                    ? `${action.color} bg-opacity-10 hover:bg-opacity-20`
                                                                    : 'text-gray-300 hover:text-gray-400 hover:bg-gray-100'
                                                                } ${isLocked ? 'cursor-not-allowed opacity-50' : ''}`}
                                                            title={`${action.name}: ${hasPerm ? 'Abilitato' : 'Disabilitato'}${isLocked ? ' (Bloccato)' : ''}`}
                                                        >
                                                            <Icon className="w-4 h-4" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {SYSTEM_ROLES.map(role => {
                    const totalPerms = Object.values(permissions[role.id] || {}).reduce(
                        (sum, actions) => sum + (actions?.length || 0), 0
                    );
                    const maxPerms = RESOURCES.length * ACTIONS.length;
                    const percentage = Math.round((totalPerms / maxPerms) * 100);

                    return (
                        <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className={`text-sm font-medium ${role.color.replace('bg-', 'text-').replace('-100', '-700')}`}>
                                {role.name}
                            </div>
                            <div className="mt-2 flex items-end gap-2">
                                <span className="text-2xl font-bold text-gray-900">{totalPerms}</span>
                                <span className="text-sm text-gray-500 pb-1">/ {maxPerms} ({percentage}%)</span>
                            </div>
                            <div className="mt-2 bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${role.color.replace('text-', 'bg-').replace('-800', '-500')}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PermissionMatrixPage;
