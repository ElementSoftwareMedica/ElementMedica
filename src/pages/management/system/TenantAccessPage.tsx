/**
 * Tenant Access Page - Management Section
 * 
 * Manages user access across multiple tenants
 * Allows admin to assign/revoke tenant access with granular permissions
 * 
 * @module pages/management/system/TenantAccessPage
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Building2,
    Users,
    Plus,
    Search,
    RefreshCw,
    Filter,
    ChevronDown,
    ChevronRight,
    Edit2,
    Trash2,
    Shield,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    X,
    Save,
    Eye,
    Pencil,
    Trash,
    Settings,
    UserPlus,
    Crown
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../services/api';
import { useTenantMode } from '../../../contexts/TenantModeContext';
import { useAuth } from '../../../hooks/auth/useAuth';
import { useTenantAccess } from '../../../hooks/useTenantAccess';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { managementApi } from '../api';
import type { PersonTenantProfile } from '../../../types/personMultiTenant';

// Types
interface Tenant {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    userCount?: number;
}

interface Person {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    globalRole: string;
    isActive: boolean;
    tenant?: {
        id: string;
        name: string;
    };
    // Progetto 48: Multi-tenant support
    tenantProfiles?: PersonTenantProfile[];
}

interface TenantAccess {
    id: string;
    personId: string;
    tenantId: string;
    accessLevel: 'READ' | 'WRITE' | 'ADMIN' | 'FULL';
    enabledFeatures?: string[];
    isActive: boolean;
    person: Person;
    tenant: Tenant;
    createdAt: string;
}

interface AccessMatrix {
    tenantId: string;
    tenantName: string;
    users: {
        personId: string;
        personName: string;
        email: string;
        accessId?: string;
        accessLevel: 'READ' | 'WRITE' | 'ADMIN' | 'FULL';
    }[];
}

type AddAccessMode = 'existing' | 'new';

interface NewUserForm {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    makeTenantAdmin: boolean;
}

const ACCESS_LEVEL_OPTIONS: Array<{ value: 'READ' | 'WRITE' | 'ADMIN' | 'FULL'; label: string }> = [
    { value: 'READ', label: 'Lettura' },
    { value: 'WRITE', label: 'Scrittura' },
    { value: 'ADMIN', label: 'Admin Tenant' },
    { value: 'FULL', label: 'Completo' },
];

const TenantAccessPage: React.FC = () => {
    const { canPerformCRUD, getOperateHeaders } = useTenantMode();
    const location = useLocation();
    const operateHeaders = getOperateHeaders();
    const { confirm: confirmDialog } = useConfirmDialog();
    const { user } = useAuth();
    const { currentTenantId, currentTenant } = useTenantAccess();

    // Global admin = ADMIN or SUPER_ADMIN only
    const isGlobalAdmin = user?.role === 'Admin' ||
        user?.globalRole === 'ADMIN' ||
        user?.globalRole === 'SUPER_ADMIN' ||
        user?.roles?.includes('ADMIN') ||
        user?.roles?.includes('SUPER_ADMIN');
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [accessList, setAccessList] = useState<TenantAccess[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
    const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());
    const [showAddModal, setShowAddModal] = useState(false);
    const [addAccessMode, setAddAccessMode] = useState<AddAccessMode>('existing');
    const [newAccess, setNewAccess] = useState({
        personId: '',
        tenantId: '',
        accessLevel: 'READ' as 'READ' | 'WRITE' | 'ADMIN' | 'FULL',
    });
    const [newUserForm, setNewUserForm] = useState<NewUserForm>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        makeTenantAdmin: true,
    });
    const [personSearch, setPersonSearch] = useState('');

    // Persons sorted alphabetically and filtered by search
    const sortedFilteredPersons = useMemo(() => {
        const q = personSearch.toLowerCase().trim();
        return persons
            .filter(p => {
                if (!q) return true;
                const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
                const email = (p.email || p.tenantProfiles?.[0]?.email || '').toLowerCase();
                return fullName.includes(q) || email.includes(q);
            })
            .sort((a, b) => {
                const lastA = (a.lastName || '').toLowerCase();
                const lastB = (b.lastName || '').toLowerCase();
                if (lastA !== lastB) return lastA.localeCompare(lastB);
                return (a.firstName || '').toLowerCase().localeCompare((b.firstName || '').toLowerCase());
            });
    }, [persons, personSearch]);

    const resetAddModalState = useCallback(() => {
        setShowAddModal(false);
        setAddAccessMode('existing');
        setNewAccess({ personId: '', tenantId: '', accessLevel: 'READ' });
        setNewUserForm({ firstName: '', lastName: '', email: '', password: '', makeTenantAdmin: true });
        setPersonSearch('');
    }, []);

    // Auto-select tenant when there is only one available (e.g. TENANT_ADMIN)
    useEffect(() => {
        if (tenants.length === 1) {
            setNewAccess(prev => prev.tenantId ? prev : { ...prev, tenantId: tenants[0].id });
        }
    }, [tenants]);

    // Load all data
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (isGlobalAdmin) {
                // Global admin: load all tenants, persons, and access list
                const [tenantsRes, personsRes, accessRes] = await Promise.all([
                    apiGet<{ success: boolean; data: Tenant[] }>('/api/v1/tenants'),
                    apiGet<{ data: Person[] }>('/api/v1/persons', { limit: '500' }),
                    apiGet<{ success: boolean; data: TenantAccess[] }>('/api/v1/person-tenant-access')
                ]);

                setTenants(tenantsRes.data || []);
                setPersons(personsRes.data || []);
                setAccessList(accessRes.data || []);
            } else {
                // TENANT_ADMIN: scope to own tenant only
                const ownTenantId = currentTenantId;
                if (!ownTenantId) {
                    setError('Tenant non trovato');
                    return;
                }

                const [personsRes, accessRes] = await Promise.all([
                    apiGet<{ data: Person[] }>('/api/v1/persons', { limit: '500', tenantId: ownTenantId }),
                    apiGet<{ success: boolean; data: TenantAccess[] }>('/api/v1/person-tenant-access')
                ]);

                // Use current tenant from context
                setTenants([{
                    id: ownTenantId,
                    name: currentTenant?.name || 'Il mio Tenant',
                    slug: currentTenant?.slug || '',
                    isActive: true,
                }]);
                setPersons(personsRes.data || []);
                // Filter access list to own tenant only
                const allAccess = accessRes.data || [];
                setAccessList(allAccess.filter(a => a.tenantId === ownTenantId));
            }

        } catch (err: unknown) {
            setError('Errore nel caricamento dati');
        } finally {
            setLoading(false);
        }
    }, [isGlobalAdmin, currentTenantId, currentTenant]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tenantIdFromQuery = params.get('tenantId');
        if (!tenantIdFromQuery) {
            return;
        }

        setSelectedTenant(tenantIdFromQuery);
        setExpandedTenants((prev) => {
            const next = new Set(prev);
            next.add(tenantIdFromQuery);
            return next;
        });

        // Facilita il flusso "crea primo utente" dopo apertura da dettagli tenant.
        setNewAccess((prev) => ({ ...prev, tenantId: tenantIdFromQuery, accessLevel: 'ADMIN' }));
    }, [location.search]);

    // Toggle tenant expansion
    const toggleTenant = (tenantId: string) => {
        setExpandedTenants(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tenantId)) {
                newSet.delete(tenantId);
            } else {
                newSet.add(tenantId);
            }
            return newSet;
        });
    };

    // Get access matrix by tenant
    const getAccessMatrix = (): AccessMatrix[] => {
        return tenants.map(tenant => {
            const tenantAccesses = accessList.filter(a => a.tenantId === tenant.id);
            const users = tenantAccesses.map(access => ({
                personId: access.personId,
                personName: `${access.person?.firstName || ''} ${access.person?.lastName || ''}`.trim(),
                email: access.person?.email || access.person?.tenantProfiles?.[0]?.email || '',
                accessId: access.id,
                accessLevel: access.accessLevel || 'READ',
            }));

            return {
                tenantId: tenant.id,
                tenantName: tenant.name,
                users
            };
        });
    };

    // Filter matrix by search
    const filteredMatrix = getAccessMatrix().filter(matrix => {
        if (selectedTenant && matrix.tenantId !== selectedTenant) return false;
        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase();
        if (matrix.tenantName.toLowerCase().includes(term)) return true;
        return matrix.users.some(u =>
            u.personName.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term)
        );
    });

    // Add new access
    const handleAddAccess = async () => {
        if (!newAccess.tenantId) {
            setError('Seleziona il tenant di destinazione');
            return;
        }

        if (addAccessMode === 'existing' && !newAccess.personId) {
            setError('Seleziona un utente dalla lista');
            return;
        }

        if (addAccessMode === 'new') {
            if (!newUserForm.firstName || !newUserForm.lastName || !newUserForm.email || !newUserForm.password) {
                setError('Compila tutti i campi obbligatori per creare il primo utente');
                return;
            }
            if (newUserForm.password.length < 8) {
                setError('La password deve avere almeno 8 caratteri');
                return;
            }
        }

        setSaving(true);
        try {
            if (addAccessMode === 'existing') {
                await apiPost('/api/v1/person-tenant-access', {
                    personId: newAccess.personId,
                    tenantId: newAccess.tenantId,
                    accessLevel: newAccess.accessLevel,
                    defaultRoleType: newAccess.accessLevel === 'ADMIN' ? 'TENANT_ADMIN' : undefined,
                    enabledFeatures: [],
                }, { headers: operateHeaders });

                setSuccess('Accesso tenant aggiunto con successo');
            } else {
                // Only global admins can assign TENANT_ADMIN role (protected role)
                const effectiveMakeTenantAdmin = isGlobalAdmin && newUserForm.makeTenantAdmin;
                const createPersonResponse = await managementApi.createPerson({
                    firstName: newUserForm.firstName,
                    lastName: newUserForm.lastName,
                    email: newUserForm.email,
                    password: newUserForm.password,
                    tenantId: newAccess.tenantId,
                    roleType: effectiveMakeTenantAdmin ? 'TENANT_ADMIN' : 'EMPLOYEE',
                });

                // Backend returns the bare person object (not wrapped in { success, data }).
                // Cast to generic map to handle both possible response shapes.
                const createdPerson = createPersonResponse as unknown as Record<string, unknown>;
                const createdPersonNested = createdPerson?.data as Record<string, unknown> | undefined;
                const createdPersonId = (createdPerson?.id ?? createdPersonNested?.id) as string | undefined;
                if (!createdPersonId) {
                    throw new Error('Creazione utente non completata: risposta API non valida');
                }

                await apiPost('/api/v1/person-tenant-access', {
                    personId: createdPersonId,
                    tenantId: newAccess.tenantId,
                    accessLevel: effectiveMakeTenantAdmin ? 'ADMIN' : newAccess.accessLevel,
                    defaultRoleType: effectiveMakeTenantAdmin ? 'TENANT_ADMIN' : undefined,
                    enabledFeatures: [],
                    isPrimary: false,
                }, { headers: operateHeaders });

                setSuccess(effectiveMakeTenantAdmin
                    ? 'Primo utente creato e configurato come Tenant Admin'
                    : 'Primo utente creato e accesso tenant configurato');
            }

            resetAddModalState();
            loadData();
        } catch (err: unknown) {
            const axiosData = (err as any)?.response?.data;
            const backendMsg = axiosData?.error || axiosData?.message
                || (Array.isArray(axiosData?.errors) ? axiosData.errors.map((e: any) => e.msg).join(', ') : null);
            const errorMsg = backendMsg || (err instanceof Error ? err.message : 'Errore nella configurazione del primo accesso tenant');
            setError(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    // Update access
    const handleUpdateAccess = async (accessId: string, accessLevel: 'READ' | 'WRITE' | 'ADMIN' | 'FULL') => {
        setSaving(true);
        try {
            await apiPut(`/api/v1/person-tenant-access/${accessId}`, { accessLevel }, { headers: operateHeaders });
            setSuccess('Permessi aggiornati');
            loadData();
        } catch (err: unknown) {
            setError('Errore nell\'aggiornamento');
        } finally {
            setSaving(false);
        }
    };

    // Remove access
    const handleRemoveAccess = async (accessId: string) => {
        if (!(await confirmDialog({ title: 'Rimuovi accesso', message: 'Rimuovere questo accesso tenant?', variant: 'danger', confirmLabel: 'Rimuovi' }))) return;

        setSaving(true);
        try {
            await apiDelete(`/api/v1/person-tenant-access/${accessId}`, { headers: operateHeaders });
            setSuccess('Accesso rimosso');
            loadData();
        } catch (err: unknown) {
            setError('Errore nella rimozione');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Building2 className="w-7 h-7 text-purple-600" />
                        Gestione Accessi Tenant
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Configura gli accessi multi-tenant per gli utenti
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <CRUDPrimaryButton
                        onClick={() => setShowAddModal(true)}
                        operation="create"
                    >
                        <Plus className="w-4 h-4" />
                        Nuovo Accesso
                    </CRUDPrimaryButton>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-700">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4 text-red-600" />
                    </button>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-green-700">{success}</p>
                    <button onClick={() => setSuccess(null)} className="ml-auto">
                        <X className="w-4 h-4 text-green-600" />
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cerca utente o tenant..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                    <select
                        value={selectedTenant || ''}
                        onChange={(e) => setSelectedTenant(e.target.value || null)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="">Tutti i tenant</option>
                        {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
            ) : (
                /* Access Matrix by Tenant */
                <div className="space-y-4">
                    {filteredMatrix.map(matrix => (
                        <div key={matrix.tenantId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            {/* Tenant Header */}
                            <button
                                onClick={() => toggleTenant(matrix.tenantId)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {expandedTenants.has(matrix.tenantId) ? (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    )}
                                    <Building2 className="w-5 h-5 text-purple-600" />
                                    <span className="font-semibold text-gray-900">{matrix.tenantName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                                        {matrix.users.length} accessi configurati
                                    </span>
                                </div>
                            </button>

                            {/* Users List */}
                            {expandedTenants.has(matrix.tenantId) && (
                                <div className="border-t border-gray-200">
                                    {matrix.users.length > 0 ? (
                                        <div className="divide-y divide-gray-100">
                                            {matrix.users.map(user => (
                                                <div key={user.personId} className="px-6 py-4 flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-gray-900">{user.personName}</div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs text-gray-500">Livello</label>
                                                            <select
                                                                value={user.accessLevel}
                                                                onChange={(e) => user.accessId && handleUpdateAccess(user.accessId, e.target.value as 'READ' | 'WRITE' | 'ADMIN' | 'FULL')}
                                                                className="px-2 py-1 border border-gray-300 rounded text-xs font-medium bg-white"
                                                            >
                                                                {ACCESS_LEVEL_OPTIONS.map((option) => (
                                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        {/* Remove Button */}
                                                        <CRUDButton
                                                            onClick={() => user.accessId && handleRemoveAccess(user.accessId)}
                                                            operation="delete"
                                                            variant="ghost"
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                            title="Rimuovi accesso"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </CRUDButton>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-6 py-8 text-center text-gray-500">
                                            <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                            <p>Nessun utente ha accesso aggiuntivo a questo tenant</p>
                                            <CRUDButton
                                                onClick={() => {
                                                    setAddAccessMode('new');
                                                    setNewAccess(prev => ({ ...prev, tenantId: matrix.tenantId, accessLevel: 'ADMIN' }));
                                                    setShowAddModal(true);
                                                }}
                                                operation="create"
                                                variant="ghost"
                                                className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
                                            >
                                                <UserPlus className="w-4 h-4 mr-1" />
                                                Crea primo utente (Tenant Admin)
                                            </CRUDButton>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredMatrix.length === 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun risultato</h3>
                            <p className="text-gray-500">Modifica i filtri di ricerca per vedere i risultati</p>
                        </div>
                    )}
                </div>
            )}

            {/* Info Card */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Guida Completa: Ruoli, Permessi e Tenant
                </h3>
                <div className="text-sm text-purple-800 space-y-4">
                    {/* Section 1: Roles */}
                    <div className="bg-white/50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 mb-2">🎭 I Ruoli sono PER-TENANT</h4>
                        <p className="mb-2">
                            Ogni ruolo (Admin, Manager, Medico, etc.) è assegnato <strong>per specifico tenant</strong>,
                            non globalmente. Questo significa:
                        </p>
                        <ul className="ml-4 list-disc space-y-1">
                            <li>Lo stesso utente può avere ruoli <strong>diversi</strong> in tenant diversi</li>
                            <li>Es: Mario Rossi può essere <strong>Admin</strong> in "Element Medica" ma <strong>Dipendente</strong> in "Element Sicurezza"</li>
                            <li>I permessi di un ruolo si applicano solo ai dati del tenant in cui è stato assegnato</li>
                        </ul>
                    </div>

                    {/* Section 2: Permission Scopes */}
                    <div className="bg-white/50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 mb-2">🔒 Scope dei Permessi (in Permessi Avanzati)</h4>
                        <p className="mb-2">Quando configuri un permesso, lo <strong>scope</strong> definisce a quali dati si applica:</p>
                        <ul className="ml-4 list-disc space-y-1">
                            <li><strong>Tutti (all):</strong> Accesso a TUTTI i dati della risorsa (cross-tenant per SUPER_ADMIN)</li>
                            <li><strong>Tenant:</strong> Accesso solo ai dati del/dei tenant a cui l'utente ha accesso</li>
                            <li><strong>Solo Propri (own):</strong> Accesso solo ai record creati dall'utente stesso</li>
                            <li><strong>Relazionale:</strong> Accesso ai record correlati all'utente (es: i suoi pazienti, le sue visite)</li>
                            <li><strong>Nessuno:</strong> Nessun accesso a questa azione (disabilita il permesso)</li>
                        </ul>
                    </div>

                    {/* Section 3: Multi-tenant Access */}
                    <div className="bg-white/50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 mb-2">🏢 Accessi Multi-Tenant (questa pagina)</h4>
                        <p className="mb-2">
                            <strong>Tenant Primario:</strong> Ogni utente ha un tenant primario assegnato alla creazione.
                        </p>
                        <p className="mb-2">
                            <strong>Accessi Aggiuntivi:</strong> Gli admin possono concedere accesso a tenant aggiuntivi:
                        </p>
                        <ul className="ml-4 list-disc space-y-1">
                            <li><strong>Lettura:</strong> Visualizzare dati del tenant</li>
                            <li><strong>Scrittura:</strong> Creare e modificare dati</li>
                            <li><strong>Eliminazione:</strong> Eliminare dati (soft delete)</li>
                            <li><strong>Gestione:</strong> Amministrare impostazioni del tenant</li>
                        </ul>
                    </div>

                    {/* Section 4: Practical Example */}
                    <div className="bg-white/50 rounded-lg p-4">
                        <h4 className="font-semibold text-purple-900 mb-2">📋 Esempio Pratico</h4>
                        <div className="bg-purple-100 rounded p-3 text-xs font-mono">
                            <p><strong>Utente:</strong> Dott.ssa Laura Bianchi</p>
                            <p><strong>Tenant Primario:</strong> Element Medica (Ruolo: MEDICO)</p>
                            <p><strong>Accesso Aggiuntivo:</strong> Element Sicurezza (Ruolo: DOCENTE)</p>
                            <p className="mt-2 text-purple-600">
                                → Quando Laura fa login, vede i dati di ENTRAMBI i tenant.<br />
                                → In Element Medica ha permessi da Medico (visite, pazienti).<br />
                                → In Element Sicurezza ha permessi da Docente (corsi, studenti).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Access Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Nuovo Accesso Tenant</h3>
                            <button
                                onClick={resetAddModalState}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setAddAccessMode('existing')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${addAccessMode === 'existing'
                                    ? 'bg-purple-100 border-purple-300 text-purple-800'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Utente esistente
                            </button>
                            <button
                                onClick={() => setAddAccessMode('new')}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${addAccessMode === 'new'
                                    ? 'bg-purple-100 border-purple-300 text-purple-800'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Crea primo utente
                            </button>
                        </div>

                        <div className="space-y-4">
                            {addAccessMode === 'existing' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Utente</label>
                                    <input
                                        type="text"
                                        value={personSearch}
                                        onChange={(e) => setPersonSearch(e.target.value)}
                                        placeholder="Cerca per nome o email..."
                                        className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                                    />
                                    <select
                                        value={newAccess.personId}
                                        onChange={(e) => setNewAccess(prev => ({ ...prev, personId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        size={6}
                                    >
                                        <option value="">Seleziona utente...</option>
                                        {sortedFilteredPersons.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.lastName} {p.firstName} ({p.email || p.tenantProfiles?.[0]?.email || 'n/d'})
                                            </option>
                                        ))}
                                    </select>
                                    {sortedFilteredPersons.length === 0 && personSearch && (
                                        <p className="text-xs text-gray-500 mt-1">Nessun utente trovato per "{personSearch}"</p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                            <input
                                                type="text"
                                                value={newUserForm.firstName}
                                                onChange={(e) => setNewUserForm((prev) => ({ ...prev, firstName: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                                            <input
                                                type="text"
                                                value={newUserForm.lastName}
                                                onChange={(e) => setNewUserForm((prev) => ({ ...prev, lastName: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                        <input
                                            type="email"
                                            value={newUserForm.email}
                                            onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                        <input
                                            type="password"
                                            value={newUserForm.password}
                                            onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            placeholder="Minimo 8 caratteri"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 p-3 border border-amber-200 bg-amber-50 rounded-lg cursor-pointer">
                                        {isGlobalAdmin ? (
                                            <>
                                                <input
                                                    type="checkbox"
                                                    checked={newUserForm.makeTenantAdmin}
                                                    onChange={(e) => setNewUserForm((prev) => ({ ...prev, makeTenantAdmin: e.target.checked }))}
                                                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                                />
                                                <Crown className="w-4 h-4 text-amber-600" />
                                                <span className="text-sm text-amber-800 font-medium">Configura come Tenant Admin</span>
                                            </>
                                        ) : (
                                            <>
                                                <input type="checkbox" checked={false} disabled className="w-4 h-4 rounded text-gray-400" />
                                                <Crown className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-500">Configura come Tenant Admin (richiede permessi Admin globale)</span>
                                            </>
                                        )}
                                    </label>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                                <select
                                    value={newAccess.tenantId}
                                    onChange={(e) => setNewAccess(prev => ({ ...prev, tenantId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Seleziona tenant...</option>
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Livello Accesso</label>
                                <select
                                    value={newAccess.accessLevel}
                                    onChange={(e) => setNewAccess((prev) => ({
                                        ...prev,
                                        accessLevel: e.target.value as 'READ' | 'WRITE' | 'ADMIN' | 'FULL'
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    {ACCESS_LEVEL_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Se "Tenant Admin" è attivo, il livello viene forzato ad Admin.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={resetAddModalState}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Annulla
                            </button>
                            <CRUDPrimaryButton
                                onClick={handleAddAccess}
                                disabled={
                                    !newAccess.tenantId ||
                                    (addAccessMode === 'existing' && !newAccess.personId) ||
                                    saving
                                }
                                operation="create"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {addAccessMode === 'new' ? 'Crea utente e accesso' : 'Salva'}
                            </CRUDPrimaryButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantAccessPage;
