/**
 * Person Permissions Tab - P69 Session 4
 * 
 * Per-person granular permission management with 3-column layout:
 * - Column 1: Person selection (filtered by tenant)
 * - Column 2: Role assignment for selected person
 * - Column 3: Permissions summary with "Gestione Permessi Avanzata" button
 * 
 * @module pages/management/permissions/PersonPermissionsTab
 * @project 69 - Roles & Permissions Refactoring
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Users,
    Search,
    RefreshCw,
    AlertCircle,
    Loader2,
    Info,
    Key,
    Shield,
    Check,
    X,
    Plus,
    Trash2,
    Save,
    User,
    Building2,
    Eye,
    Edit2,
    Settings,
    ChevronDown,
    ChevronUp,
    Crown,
    Briefcase,
    Stethoscope,
    Heart,
    Receipt,
    Tag,
    FileText,
    CalendarDays,
    PencilLine
} from 'lucide-react';
import { useAuth } from '../../../hooks/auth/useAuth';
import { apiGet, apiPost, apiDelete } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useTenantMode } from '../../../contexts/TenantModeContext';
import PersonAdvancedPermissionManager from '../../../components/roles/permission-manager/PersonAdvancedPermissionManager';

// Role type configuration
interface RoleConfig {
    name: string;
    description: string;
    level: number;
    color: string;
    icon: React.FC<{ className?: string }>;
}

// P69: All 22 system roles
const ROLE_TYPES: Record<string, RoleConfig> = {
    SUPER_ADMIN: { name: 'Super Admin', description: 'Controllo totale sistema', level: 0, color: 'bg-purple-100 text-purple-800', icon: Crown },
    ADMIN: { name: 'Admin', description: 'Amministratore principale', level: 1, color: 'bg-red-100 text-red-800', icon: Shield },
    TENANT_ADMIN: { name: 'Tenant Admin', description: 'Gestione completa tenant', level: 2, color: 'bg-amber-100 text-amber-800', icon: Building2 },
    COMPANY_ADMIN: { name: 'Admin Azienda', description: 'Gestione azienda cliente', level: 3, color: 'bg-orange-100 text-orange-800', icon: Building2 },
    TRAINING_ADMIN: { name: 'Admin Formazione', description: 'Gestione formazione', level: 4, color: 'bg-blue-100 text-blue-800', icon: Briefcase },
    CLINIC_ADMIN: { name: 'Admin Clinica', description: 'Gestione clinica', level: 4, color: 'bg-teal-100 text-teal-800', icon: Briefcase },
    HR_MANAGER: { name: 'HR Manager', description: 'Gestione risorse umane', level: 4, color: 'bg-indigo-100 text-indigo-800', icon: Users },
    MANAGER: { name: 'Manager', description: 'Supervisore area', level: 5, color: 'bg-cyan-100 text-cyan-800', icon: Users },
    DEPARTMENT_HEAD: { name: 'Capo Reparto', description: 'Responsabile reparto', level: 5, color: 'bg-sky-100 text-sky-800', icon: Users },
    TRAINER_COORDINATOR: { name: 'Coordinatore Formatori', description: 'Coordina formatori', level: 6, color: 'bg-violet-100 text-violet-800', icon: Users },
    COMPANY_MANAGER: { name: 'Manager Azienda', description: 'Manager cliente', level: 6, color: 'bg-fuchsia-100 text-fuchsia-800', icon: Building2 },
    SUPERVISOR: { name: 'Supervisore', description: 'Supervisore operativo', level: 6, color: 'bg-yellow-100 text-yellow-800', icon: Eye },
    AUDITOR: { name: 'Auditor', description: 'Verifiche e controlli', level: 6, color: 'bg-neutral-100 text-neutral-800', icon: Eye },
    SENIOR_TRAINER: { name: 'Formatore Senior', description: 'Formatore esperto', level: 7, color: 'bg-emerald-100 text-emerald-800', icon: Briefcase },
    COORDINATOR: { name: 'Coordinatore', description: 'Coordinamento attività', level: 7, color: 'bg-rose-100 text-rose-800', icon: Users },
    TRAINER: { name: 'Formatore', description: 'Erogazione corsi', level: 8, color: 'bg-green-100 text-green-800', icon: Briefcase },
    EXTERNAL_TRAINER: { name: 'Formatore Esterno', description: 'Formatore esterno', level: 8, color: 'bg-lime-100 text-lime-800', icon: Briefcase },
    OPERATOR: { name: 'Operatore', description: 'Operatore base', level: 8, color: 'bg-pink-100 text-pink-800', icon: Settings },
    CONSULTANT: { name: 'Consulente', description: 'Consulente esterno', level: 8, color: 'bg-stone-100 text-stone-800', icon: Briefcase },
    EMPLOYEE: { name: 'Dipendente', description: 'Utente base', level: 9, color: 'bg-gray-100 text-gray-800', icon: User },
    VIEWER: { name: 'Visualizzatore', description: 'Solo lettura', level: 10, color: 'bg-slate-100 text-slate-800', icon: Eye },
    GUEST: { name: 'Ospite', description: 'Accesso limitato', level: 11, color: 'bg-zinc-100 text-zinc-700', icon: User },
    // P69: Clinical & safety roles
    MEDICO: { name: 'Medico', description: 'Medico generico', level: 8, color: 'bg-teal-100 text-teal-800', icon: Stethoscope },
    PAZIENTE: { name: 'Paziente', description: 'Paziente clinica', level: 11, color: 'bg-sky-100 text-sky-800', icon: Heart },
    INFERMIERE: { name: 'Infermiere', description: 'Infermiere clinica', level: 8, color: 'bg-cyan-100 text-cyan-800', icon: Stethoscope },
    SEGRETERIA_CLINICA: { name: 'Segreteria Clinica', description: 'Segreteria clinica', level: 8, color: 'bg-teal-100 text-teal-700', icon: Settings },
    MEDICO_COMPETENTE: { name: 'Medico Competente', description: 'Medico del lavoro', level: 7, color: 'bg-emerald-100 text-emerald-800', icon: Stethoscope },
    RSPP: { name: 'RSPP', description: 'Responsabile prevenzione', level: 7, color: 'bg-amber-100 text-amber-700', icon: Shield },
    ASPP: { name: 'ASPP', description: 'Addetto prevenzione', level: 8, color: 'bg-yellow-100 text-yellow-700', icon: Shield },
    TECNICO_SICUREZZA: { name: 'Tecnico Sicurezza', description: 'Tecnico sicurezza', level: 8, color: 'bg-orange-100 text-orange-700', icon: Shield },
    CONSULENTE_SICUREZZA: { name: 'Consulente Sicurezza', description: 'Consulente sicurezza', level: 8, color: 'bg-stone-100 text-stone-700', icon: Shield },
};

// Person interface
interface Person {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    globalRole?: string;
    tenantProfiles?: {
        id: string;
        tenantId: string;
        tenant?: { name: string };
        roleType?: string;
    }[];
    personRoles?: {
        id: string;
        roleType: string;
        tenantId: string;
        isActive: boolean;
    }[];
    customPermissions?: PersonPermission[];
}

// Permission override for a person
interface PersonPermission {
    id: string;
    personId: string;
    resource: string;
    action: string;
    scope?: string;
    granted: boolean;
    reason?: string;
    createdAt: string;
    createdBy?: string;
}

// Resources and actions
const RESOURCES = [
    { id: 'persons', name: 'Persone', icon: Users },
    { id: 'companies', name: 'Aziende', icon: Building2 },
    { id: 'courses', name: 'Corsi', icon: Key },
    { id: 'schedules', name: 'Edizioni', icon: Key },
    { id: 'enrollments', name: 'Iscrizioni', icon: Key },
    { id: 'trainers', name: 'Formatori', icon: User },
    { id: 'templates', name: 'Template', icon: Key },
    { id: 'preventivi', name: 'Preventivi', icon: Key },
    { id: 'reports', name: 'Report', icon: Key },
    { id: 'settings', name: 'Impostazioni', icon: Settings },
    { id: 'roles', name: 'Ruoli', icon: Shield },
    // P65: Clinica resources
    { id: 'clinica.appuntamenti', name: 'Appuntamenti e Calendario', icon: CalendarDays },
    { id: 'clinica.visite', name: 'Visite Mediche', icon: Stethoscope },
    { id: 'clinica.prestazioni', name: 'Prestazioni', icon: Heart },
    { id: 'clinica.tariffari', name: 'Tariffari', icon: Receipt },
    { id: 'clinica.convenzioni', name: 'Convenzioni', icon: Tag },
    { id: 'clinica.referti', name: 'Referti', icon: FileText },
    { id: 'movimenti_contabili', name: 'Movimenti Contabili', icon: Receipt },
];

const ACTIONS = [
    { id: 'read', name: 'Lettura', icon: Eye },
    { id: 'write', name: 'Modifica', icon: Edit2 },
    { id: 'create', name: 'Creazione', icon: Plus },
    { id: 'update', name: 'Aggiornamento', icon: Edit2 },
    { id: 'delete', name: 'Elimina', icon: Trash2 },
    { id: 'manage', name: 'Gestione completa', icon: Settings },
    // P65: Granular actions for clinica
    { id: 'view_others_same_branch', name: 'Calendario stessa branca', icon: CalendarDays },
    { id: 'view_others_all', name: 'Calendario tutti i medici', icon: Users },
    { id: 'create_self', name: 'Crea appuntamenti propri', icon: Plus },
    { id: 'create_others', name: 'Crea appuntamenti per altri', icon: Users },
    { id: 'edit_others', name: 'Modifica altri medici', icon: PencilLine },
    { id: 'change_refertante', name: 'Cambia Refertante', icon: Stethoscope },
    { id: 'view_prices', name: 'Vedi Prezzi', icon: Eye },
    { id: 'manage_convenzioni', name: 'Gestisci Convenzioni/Sconti', icon: Tag },
];

const SCOPES = [
    { id: 'none', name: 'Nessuno', description: 'Accesso disabilitato' },
    { id: 'all', name: 'Tutti', description: 'Accesso globale' },
    { id: 'tenant', name: 'Tenant', description: 'Solo dati del tenant' },
    { id: 'own', name: 'Propri', description: 'Solo record creati dall\'utente' },
    { id: 'relational', name: 'Relazionale', description: 'Record correlati all\'utente' },
];

const PersonPermissionsTab: React.FC = () => {
    const { hasPermission: checkPermission, isLoading: authLoading, userRoles } = useAuth();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();
    const { getOperateHeaders } = useTenantMode();
    const operateHeaders = getOperateHeaders();

    const [persons, setPersons] = useState<Person[]>([]);
    const [totalPersons, setTotalPersons] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [personPermissions, setPersonPermissions] = useState<PersonPermission[]>([]);
    const [rolePermissions, setRolePermissions] = useState<{ resource: string; action: string }[]>([]);
    const [loadingRolePerms, setLoadingRolePerms] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [savingPermission, setSavingPermission] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [error, setError] = useState<string | null>(null);
    const PAGE_SIZE = 50;

    // Debounce search term for server-side search
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const handleSearchChange = useCallback((value: string) => {
        setSearchTerm(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(value);
            setCurrentPage(1);
        }, 300);
    }, []);

    // Add permission modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPermission, setNewPermission] = useState({
        resource: '',
        action: '',
        scope: 'tenant',
        granted: true,
        reason: ''
    });

    // P69: Advanced permissions modal + role change
    const [showAdvancedModal, setShowAdvancedModal] = useState(false);
    const [changingRole, setChangingRole] = useState(false);
    const [selectedNewRole, setSelectedNewRole] = useState<string>('');

    // Load persons (server-side search + pagination)
    useEffect(() => {
        if (isReady) {
            loadPersons(1).then(freshPersons => {
                // Aggiorna selectedPerson con dati freschi se presente nella nuova lista
                if (selectedPerson) {
                    const updated = freshPersons.find(p => p.id === selectedPerson.id);
                    if (updated) {
                        setSelectedPerson(updated);
                    } else {
                        // La persona non è più nella lista (cambio filtro/tenant)
                        setSelectedPerson(null);
                        setPersonPermissions([]);
                        setRolePermissions([]);
                    }
                }
            });
        }
    }, [isReady, tenantFilterKey, debouncedSearch]);

    // Track latest search request to ignore stale responses
    const searchRequestRef = useRef(0);

    const loadPersons = async (page = 1, append = false): Promise<Person[]> => {
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }
            setError(null);
            const requestId = ++searchRequestRef.current;
            const tenantParams = getTenantFilterParams();
            const params: Record<string, string | boolean> = {};
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }
            params.includeWithoutRoles = true;
            params.limit = String(PAGE_SIZE);
            params.page = String(page);
            if (debouncedSearch) {
                params.search = debouncedSearch;
            }
            const response = await apiGet<{ data: Person[]; persons?: Person[]; total?: number }>('/api/v1/persons', params);
            // Ignore stale responses from previous search terms
            if (requestId !== searchRequestRef.current) return [];
            const newPersons = response.data || response.persons || [];
            if (append) {
                setPersons(prev => [...prev, ...newPersons]);
            } else {
                setPersons(newPersons);
            }
            setTotalPersons((response as { total?: number }).total || newPersons.length);
            setCurrentPage(page);
            return newPersons;
        } catch (err: unknown) {
            setError('Errore nel caricamento utenti');
            return [];
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        loadPersons(currentPage + 1, true);
    };

    const hasMore = persons.length < totalPersons;

    // Load person's custom permissions
    const loadPersonPermissions = async (personId: string) => {
        try {
            const response = await apiGet(`/api/v1/permissions/person/${personId}`) as { data: PersonPermission[] };
            setPersonPermissions(response.data || []);
        } catch (err: unknown) {
            // If API doesn't exist yet, show empty
            setPersonPermissions([]);
        }
    };

    // P69: Load role permissions for the selected person's role
    const loadRolePermissions = async (roleType: string) => {
        try {
            setLoadingRolePerms(true);
            interface BackendPermission {
                permissionId: string;
                granted: boolean;
                scope?: string;
            }
            const response = await apiGet(`/api/v1/roles/${roleType}/permissions`) as {
                data: { permissions: BackendPermission[] }
            };

            // P69: Transform backend format (permissionId like "resource:action") 
            // to frontend format { resource, action }
            const transformedPermissions = (response.data?.permissions || [])
                .filter((p: BackendPermission) => p.granted)
                .map((p: BackendPermission) => {
                    const permId = p.permissionId || '';
                    // Parse permissionId format: resource:action (e.g., "notifications:create" → resource: "notifications", action: "create")
                    const colonIndex = permId.indexOf(':');
                    if (colonIndex > 0) {
                        const resource = permId.substring(0, colonIndex);
                        const action = permId.substring(colonIndex + 1);
                        return { resource, action };
                    }
                    // Legacy fallback for ACTION_RESOURCE format
                    const parts = permId.split('_');
                    if (parts.length >= 2) {
                        const action = parts[0].toLowerCase();
                        const resource = parts.slice(1).join('_').toLowerCase();
                        return { resource, action };
                    }
                    // Final fallback
                    return { resource: permId.toLowerCase(), action: 'access' };
                });

            setRolePermissions(transformedPermissions);
        } catch (err: unknown) {
            setRolePermissions([]);
        } finally {
            setLoadingRolePerms(false);
        }
    };

    // Select person
    const handleSelectPerson = async (person: Person) => {
        setSelectedPerson(person);
        const roleType = person.personRoles?.[0]?.roleType || 'EMPLOYEE';
        setSelectedNewRole(roleType);
        // Load both person permissions and role permissions
        await Promise.all([
            loadPersonPermissions(person.id),
            loadRolePermissions(roleType)
        ]);
    };

    // P69: Change role for selected person — now supports adding additional roles
    const handleChangeRole = async () => {
        if (!selectedPerson || !selectedNewRole) return;

        try {
            setChangingRole(true);
            // Add new role (don't delete existing — supports multi-role)
            await apiPost(`/api/v1/persons/${selectedPerson.id}/roles`, { roleType: selectedNewRole }, { headers: operateHeaders });
            showToast({ message: 'Ruolo aggiunto', type: 'success' });
            // Reload persons and use returned data to avoid stale closure
            const freshPersons = await loadPersons(1);
            const updatedPerson = freshPersons.find(p => p.id === selectedPerson.id);
            if (updatedPerson) {
                setSelectedPerson(updatedPerson);
                // Refresh permissions for the updated person
                await Promise.all([
                    loadPersonPermissions(updatedPerson.id),
                    loadRolePermissions(selectedNewRole)
                ]);
            }
        } catch (err: unknown) {
            const errMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            showToast({ message: errMsg || 'Errore aggiunta ruolo', type: 'error' });
        } finally {
            setChangingRole(false);
        }
    };

    // P69: Remove a specific role from selected person
    const handleRemoveRole = async (roleType: string) => {
        if (!selectedPerson) return;
        const activeRoles = selectedPerson.personRoles?.filter(r => r.isActive) || [];
        if (activeRoles.length <= 1) {
            showToast({ message: 'Non è possibile rimuovere l\'ultimo ruolo', type: 'error' });
            return;
        }
        try {
            setChangingRole(true);
            await apiDelete(`/api/v1/persons/${selectedPerson.id}/roles/${roleType}`, { headers: operateHeaders });
            showToast({ message: 'Ruolo rimosso', type: 'success' });
            // Reload persons and use returned data to avoid stale closure
            const freshPersons = await loadPersons(1);
            const updatedPerson = freshPersons.find(p => p.id === selectedPerson.id);
            if (updatedPerson) {
                setSelectedPerson(updatedPerson);
                // Refresh permissions — use first active role
                const firstRole = updatedPerson.personRoles?.find((r: { isActive: boolean }) => r.isActive)?.roleType || 'EMPLOYEE';
                await Promise.all([
                    loadPersonPermissions(updatedPerson.id),
                    loadRolePermissions(firstRole)
                ]);
            }
        } catch {
            showToast({ message: 'Errore rimozione ruolo', type: 'error' });
        } finally {
            setChangingRole(false);
        }
    };

    // Get role config
    const getRoleConfig = (roleType: string): RoleConfig => {
        return ROLE_TYPES[roleType] || ROLE_TYPES.EMPLOYEE;
    };

    // Count permissions summary
    const getPermissionsSummary = () => {
        if (personPermissions.length === 0) return null;
        const granted = personPermissions.filter(p => p.granted).length;
        const revoked = personPermissions.filter(p => !p.granted).length;
        return { granted, revoked, total: personPermissions.length };
    };

    // Add custom permission
    const handleAddPermission = async () => {
        if (!selectedPerson || !newPermission.resource || !newPermission.action) {
            showToast({ message: 'Seleziona risorsa e azione', type: 'error' });
            return;
        }

        try {
            setSavingPermission(true);
            await apiPost(`/api/v1/permissions/person/${selectedPerson.id}`, {
                resource: newPermission.resource,
                action: newPermission.action,
                scope: newPermission.scope,
                granted: newPermission.granted,
                reason: newPermission.reason
            }, { headers: operateHeaders });
            showToast({ message: 'Permesso aggiunto', type: 'success' });
            setShowAddModal(false);
            setNewPermission({ resource: '', action: '', scope: 'tenant', granted: true, reason: '' });
            await loadPersonPermissions(selectedPerson.id);
        } catch (err: unknown) {
            showToast({ message: 'Errore aggiunta permesso', type: 'error' });
        } finally {
            setSavingPermission(false);
        }
    };

    // Remove custom permission
    const handleRemovePermission = async (permissionId: string) => {
        if (!selectedPerson) return;

        if (!await confirmDelete('permesso personalizzato')) return;

        try {
            await apiDelete(`/api/v1/permissions/person/${selectedPerson.id}/${permissionId}`, { headers: operateHeaders });
            showToast({ message: 'Permesso rimosso', type: 'success' });
            await loadPersonPermissions(selectedPerson.id);
        } catch (err: unknown) {
            showToast({ message: 'Errore rimozione permesso', type: 'error' });
        }
    };

    // Persons are already filtered server-side via debouncedSearch
    const filteredPersons = persons;

    // Get role badge
    const getRoleBadge = (person: Person) => {
        const role = person.personRoles?.[0]?.roleType || person.globalRole || 'EMPLOYEE';
        const colors: Record<string, string> = {
            SUPER_ADMIN: 'bg-purple-100 text-purple-800',
            ADMIN: 'bg-red-100 text-red-800',
            TENANT_ADMIN: 'bg-amber-100 text-amber-800',
            MANAGER: 'bg-blue-100 text-blue-800',
            TRAINER: 'bg-green-100 text-green-800',
            EMPLOYEE: 'bg-gray-100 text-gray-800',
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    // Loading state
    if (authLoading || (loading && persons.length === 0)) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Caricamento...</span>
            </div>
        );
    }

    // Permission check - P69: Allow read access to view, write to modify
    // ADMIN and SUPER_ADMIN always have full access
    // P69 Fix: Use userRoles array (backend roles) instead of display role
    const isAdminRole = userRoles?.includes('ADMIN') || userRoles?.includes('SUPER_ADMIN');
    const canView = isAdminRole || checkPermission('roles', 'read') || checkPermission('permissions', 'read');
    const canModify = isAdminRole || checkPermission('roles', 'write') || checkPermission('permissions', 'write');

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <Shield className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">Accesso negato</h3>
                <p className="text-gray-600 dark:text-gray-400">Non hai i permessi necessari per visualizzare i permessi utente.</p>
            </div>
        );
    }

    // P69: Get current roles for display (multi-role support)
    const activeRoles = selectedPerson?.personRoles?.filter(r => r.isActive) || [];
    const currentRole = activeRoles[0]?.roleType || 'EMPLOYEE';
    const currentRoleConfig = getRoleConfig(currentRole);
    const permissionsSummary = getPermissionsSummary();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-3">
                        <Users className="w-5 h-5 text-violet-600" />
                        Permessi per Persona
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Seleziona una persona, assegna un ruolo e gestisci i permessi personalizzati
                    </p>
                </div>
                <button
                    onClick={() => loadPersons(1)}
                    className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Aggiorna"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800 dark:text-red-300">{error}</span>
                </div>
            )}

            {/* P69: 3-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* Column 1: Person List */}
                <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[600px]">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-violet-600" />
                            Seleziona Persona
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Cerca utente..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {totalPersons > 0 ? `${persons.length} di ${totalPersons} persone` : 'Nessuna persona'}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-violet-600 mx-auto" />
                            </div>
                        ) : filteredPersons.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                                Nessun utente trovato
                            </div>
                        ) : (
                            filteredPersons.map(person => {
                                const roleType = person.personRoles?.[0]?.roleType || 'EMPLOYEE';
                                const config = getRoleConfig(roleType);
                                return (
                                    <button
                                        key={person.id}
                                        onClick={() => handleSelectPerson(person)}
                                        className={`w-full p-3 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedPerson?.id === person.id
                                            ? 'bg-violet-50 dark:bg-violet-900/20 border-l-4 border-l-violet-600'
                                            : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
                                                    {person.firstName?.[0]}{person.lastName?.[0]}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 dark:text-gray-50 text-sm truncate">
                                                    {person.firstName} {person.lastName}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {person.email}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color} flex-shrink-0`}>
                                                {config.name}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                        {hasMore && !loading && (
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="w-full py-3 text-sm text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors flex items-center justify-center gap-2"
                            >
                                {loadingMore ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                                Carica altri ({totalPersons - persons.length} rimanenti)
                            </button>
                        )}
                    </div>
                </div>

                {/* Column 2: Role Assignment — Multi-role support */}
                <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-violet-600" />
                            Ruoli Assegnati
                        </h3>
                    </div>

                    {selectedPerson ? (
                        <div className="p-4 space-y-4">
                            {/* Current Roles Display */}
                            <div className="space-y-2">
                                {activeRoles.length > 0 ? activeRoles.map((role) => {
                                    const roleConfig = getRoleConfig(role.roleType);
                                    return (
                                        <div key={role.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${roleConfig.color}`}>
                                                    <roleConfig.icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-50">
                                                        {roleConfig.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        Livello: {roleConfig.level}
                                                    </div>
                                                </div>
                                            </div>
                                            {canModify && activeRoles.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveRole(role.roleType)}
                                                    disabled={changingRole}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Rimuovi ruolo"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${currentRoleConfig.color}`}>
                                                <currentRoleConfig.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-gray-50">
                                                    {currentRoleConfig.name}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {currentRoleConfig.description}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Add Role */}
                            {canModify && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Aggiungi Ruolo
                                    </label>
                                    <select
                                        value={selectedNewRole}
                                        onChange={(e) => setSelectedNewRole(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 text-sm focus:ring-2 focus:ring-violet-500"
                                    >
                                        {Object.entries(ROLE_TYPES)
                                            .filter(([key]) => !activeRoles.some(r => r.roleType === key))
                                            .map(([key, config]) => (
                                                <option key={key} value={key}>
                                                    {config.name} (Lv. {config.level})
                                                </option>
                                            ))}
                                    </select>

                                    {selectedNewRole && !activeRoles.some(r => r.roleType === selectedNewRole) && (
                                        <button
                                            onClick={handleChangeRole}
                                            disabled={changingRole}
                                            className="w-full px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                                        >
                                            {changingRole ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Plus className="w-4 h-4" />
                                            )}
                                            Aggiungi Ruolo
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
                            <Shield className="w-10 h-10 mb-2" />
                            <p className="text-sm">Seleziona una persona</p>
                        </div>
                    )}
                </div>

                {/* Column 3: Permissions Summary - P69: Shows role + granular permissions */}
                <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[600px]">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                            <Key className="w-4 h-4 text-violet-600" />
                            Permessi Attivi
                        </h3>
                    </div>

                    {selectedPerson ? (
                        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                            {/* P69: Role Permissions Section */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                                    <Shield className="w-3 h-3" />
                                    Permessi dal Ruolo ({currentRoleConfig.name})
                                </h4>
                                {loadingRolePerms ? (
                                    <div className="text-center py-4">
                                        <Loader2 className="w-4 h-4 animate-spin text-violet-600 mx-auto" />
                                    </div>
                                ) : rolePermissions.length > 0 ? (
                                    <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2">
                                        {rolePermissions.map((perm, idx) => (
                                            <div key={idx} className="text-xs px-2 py-1 rounded flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                <Shield className="w-3 h-3" />
                                                {perm.resource}:{perm.action}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                                        Nessun permesso definito per questo ruolo
                                    </div>
                                )}
                            </div>

                            {/* P69: Granular/Custom Permissions Section */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                                    <Key className="w-3 h-3" />
                                    Permessi Granulari/Personalizzati
                                </h4>
                                {personPermissions.length > 0 ? (
                                    <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2">
                                        {personPermissions.map(perm => (
                                            <div key={perm.id} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${perm.granted ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                }`}>
                                                {perm.granted ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                {perm.resource}:{perm.action}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                                        Nessun permesso personalizzato
                                    </div>
                                )}
                            </div>

                            {/* P69: Summary Statistics */}
                            {(rolePermissions.length > 0 || personPermissions.length > 0) && (
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                                        <div className="text-lg font-bold text-blue-600">{rolePermissions.length}</div>
                                        <div className="text-[10px] text-blue-700 dark:text-blue-400">Dal Ruolo</div>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                                        <div className="text-lg font-bold text-green-600">{personPermissions.filter(p => p.granted).length}</div>
                                        <div className="text-[10px] text-green-700 dark:text-green-400">Concessi</div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                                        <div className="text-lg font-bold text-red-600">{personPermissions.filter(p => !p.granted).length}</div>
                                        <div className="text-[10px] text-red-700 dark:text-red-400">Revocati</div>
                                    </div>
                                </div>
                            )}

                            {/* Advanced Permissions Button - P69: Always show if canModify */}
                            {canModify && (
                                <button
                                    onClick={() => setShowAdvancedModal(true)}
                                    className="w-full px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <Settings className="w-4 h-4" />
                                    Gestione Permessi Avanzata
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
                            <Key className="w-10 h-10 mb-2" />
                            <p className="text-sm">Seleziona una persona</p>
                        </div>
                    )}
                </div>
            </div>

            {/* P69: Advanced Permissions Modal - 3-column layout */}
            {showAdvancedModal && selectedPerson && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-violet-600" />
                                    Gestione Permessi Avanzata
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {selectedPerson.firstName} {selectedPerson.lastName} ({selectedPerson.email})
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAdvancedModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content - 3-column manager */}
                        <div className="flex-1 min-h-0 overflow-hidden">
                            <PersonAdvancedPermissionManager
                                personId={selectedPerson.id}
                                personName={`${selectedPerson.firstName} ${selectedPerson.lastName}`}
                                personPermissions={personPermissions}
                                rolePermissions={rolePermissions}
                                roleName={currentRoleConfig.name}
                                onAddPermission={async (resource, action, scope, granted) => {
                                    try {
                                        setSavingPermission(true);
                                        await apiPost(`/api/v1/permissions/person/${selectedPerson.id}`, {
                                            resource,
                                            action,
                                            scope,
                                            granted,
                                            reason: 'Override da gestione avanzata'
                                        }, { headers: operateHeaders });
                                        await loadPersonPermissions(selectedPerson.id);
                                    } catch (err: unknown) {
                                        showToast({ message: 'Errore aggiunta permesso', type: 'error' });
                                    } finally {
                                        setSavingPermission(false);
                                    }
                                }}
                                onRemovePermission={async (permissionId) => {
                                    try {
                                        setSavingPermission(true);
                                        await apiDelete(`/api/v1/permissions/person/${selectedPerson.id}/${permissionId}`, { headers: operateHeaders });
                                        await loadPersonPermissions(selectedPerson.id);
                                    } catch (err: unknown) {
                                        showToast({ message: 'Errore rimozione permesso', type: 'error' });
                                    } finally {
                                        setSavingPermission(false);
                                    }
                                }}
                                savingPermission={savingPermission}
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
                            <button
                                onClick={() => setShowAdvancedModal(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonPermissionsTab;
