/**
 * Tenant Access Page - Management Section
 * 
 * Manages user access across multiple tenants
 * Allows admin to assign/revoke tenant access with granular permissions
 * 
 * @module pages/management/system/TenantAccessPage
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useCallback } from 'react';
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
    Settings
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../services/api';

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
}

interface TenantAccess {
    id: string;
    personId: string;
    tenantId: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
    canManage: boolean;
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
        canRead: boolean;
        canWrite: boolean;
        canDelete: boolean;
        canManage: boolean;
    }[];
}

const TenantAccessPage: React.FC = () => {
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
    const [newAccess, setNewAccess] = useState({
        personId: '',
        tenantId: '',
        canRead: true,
        canWrite: false,
        canDelete: false,
        canManage: false
    });

    // Load all data
    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const [tenantsRes, personsRes, accessRes] = await Promise.allSettled([
                apiGet<{ success: boolean; data: Tenant[] }>('/api/v1/tenants'),
                apiGet<{ data: Person[] }>('/api/v1/persons', { limit: '500' }),
                apiGet<{ success: boolean; data: TenantAccess[] }>('/api/v1/person-tenant-access')
            ]);

            // Extract tenants
            if (tenantsRes.status === 'fulfilled' && tenantsRes.value?.data) {
                setTenants(tenantsRes.value.data);
            } else {
                // Fallback mock tenants
                setTenants([
                    { id: '1', name: 'Default Company', slug: 'default', isActive: true },
                    { id: '2', name: 'Element Formazione', slug: 'formazione', isActive: true },
                    { id: '3', name: 'Element Medica', slug: 'medica', isActive: true }
                ]);
            }

            // Extract persons
            if (personsRes.status === 'fulfilled' && personsRes.value?.data) {
                setPersons(personsRes.value.data);
            }

            // Extract access list
            if (accessRes.status === 'fulfilled' && accessRes.value?.data) {
                setAccessList(accessRes.value.data);
            }

        } catch (err: any) {
            console.error('Error loading data:', err);
            setError(err.message || 'Errore nel caricamento dati');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

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
                email: access.person?.email || '',
                accessId: access.id,
                canRead: access.canRead,
                canWrite: access.canWrite,
                canDelete: access.canDelete,
                canManage: access.canManage
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
        if (!newAccess.personId || !newAccess.tenantId) return;

        setSaving(true);
        try {
            await apiPost('/api/v1/person-tenant-access', newAccess);
            setSuccess('Accesso tenant aggiunto con successo');
            setShowAddModal(false);
            setNewAccess({
                personId: '',
                tenantId: '',
                canRead: true,
                canWrite: false,
                canDelete: false,
                canManage: false
            });
            loadData();
        } catch (err: any) {
            setError(err.message || 'Errore nell\'aggiunta accesso');
        } finally {
            setSaving(false);
        }
    };

    // Update access
    const handleUpdateAccess = async (accessId: string, updates: Partial<TenantAccess>) => {
        setSaving(true);
        try {
            await apiPut(`/api/v1/person-tenant-access/${accessId}`, updates);
            setSuccess('Permessi aggiornati');
            loadData();
        } catch (err: any) {
            setError(err.message || 'Errore nell\'aggiornamento');
        } finally {
            setSaving(false);
        }
    };

    // Remove access
    const handleRemoveAccess = async (accessId: string) => {
        if (!confirm('Rimuovere questo accesso tenant?')) return;

        setSaving(true);
        try {
            await apiDelete(`/api/v1/person-tenant-access/${accessId}`);
            setSuccess('Accesso rimosso');
            loadData();
        } catch (err: any) {
            setError(err.message || 'Errore nella rimozione');
        } finally {
            setSaving(false);
        }
    };

    // Permission badge component
    const PermissionBadge: React.FC<{
        label: string;
        active: boolean;
        icon: React.ComponentType<{ className?: string }>;
        onClick?: () => void;
    }> = ({ label, active, icon: Icon, onClick }) => (
        <button
            onClick={onClick}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${active
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
            title={`${active ? 'Disabilita' : 'Abilita'} ${label}`}
        >
            <Icon className="w-3 h-3" />
            {label}
        </button>
    );

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
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Nuovo Accesso
                    </button>
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
                                                        {/* Permission Badges */}
                                                        <div className="flex items-center gap-2">
                                                            <PermissionBadge
                                                                label="Lettura"
                                                                active={user.canRead}
                                                                icon={Eye}
                                                                onClick={() => user.accessId && handleUpdateAccess(user.accessId, { canRead: !user.canRead })}
                                                            />
                                                            <PermissionBadge
                                                                label="Scrittura"
                                                                active={user.canWrite}
                                                                icon={Pencil}
                                                                onClick={() => user.accessId && handleUpdateAccess(user.accessId, { canWrite: !user.canWrite })}
                                                            />
                                                            <PermissionBadge
                                                                label="Elimina"
                                                                active={user.canDelete}
                                                                icon={Trash}
                                                                onClick={() => user.accessId && handleUpdateAccess(user.accessId, { canDelete: !user.canDelete })}
                                                            />
                                                            <PermissionBadge
                                                                label="Gestione"
                                                                active={user.canManage}
                                                                icon={Settings}
                                                                onClick={() => user.accessId && handleUpdateAccess(user.accessId, { canManage: !user.canManage })}
                                                            />
                                                        </div>
                                                        {/* Remove Button */}
                                                        <button
                                                            onClick={() => user.accessId && handleRemoveAccess(user.accessId)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                            title="Rimuovi accesso"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="px-6 py-8 text-center text-gray-500">
                                            <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                            <p>Nessun utente ha accesso aggiuntivo a questo tenant</p>
                                            <button
                                                onClick={() => {
                                                    setNewAccess(prev => ({ ...prev, tenantId: matrix.tenantId }));
                                                    setShowAddModal(true);
                                                }}
                                                className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
                                            >
                                                + Aggiungi primo utente
                                            </button>
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
                            <li>Es: Mario Rossi può essere <strong>Admin</strong> in "Element Medica" ma <strong>Dipendente</strong> in "Element Formazione"</li>
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
                            <p><strong>Utente:</strong> Dr. Laura Bianchi</p>
                            <p><strong>Tenant Primario:</strong> Element Medica (Ruolo: MEDICO)</p>
                            <p><strong>Accesso Aggiuntivo:</strong> Element Formazione (Ruolo: DOCENTE)</p>
                            <p className="mt-2 text-purple-600">
                                → Quando Laura fa login, vede i dati di ENTRAMBI i tenant.<br />
                                → In Element Medica ha permessi da Medico (visite, pazienti).<br />
                                → In Element Formazione ha permessi da Docente (corsi, studenti).
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
                                onClick={() => setShowAddModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Utente</label>
                                <select
                                    value={newAccess.personId}
                                    onChange={(e) => setNewAccess(prev => ({ ...prev, personId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Seleziona utente...</option>
                                    {persons.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.firstName} {p.lastName} ({p.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Permessi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: 'canRead', label: 'Lettura', icon: Eye },
                                        { key: 'canWrite', label: 'Scrittura', icon: Pencil },
                                        { key: 'canDelete', label: 'Eliminazione', icon: Trash },
                                        { key: 'canManage', label: 'Gestione', icon: Settings }
                                    ].map(perm => (
                                        <label
                                            key={perm.key}
                                            className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={newAccess[perm.key as keyof typeof newAccess] as boolean}
                                                onChange={(e) => setNewAccess(prev => ({
                                                    ...prev,
                                                    [perm.key]: e.target.checked
                                                }))}
                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                                            />
                                            <perm.icon className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-700">{perm.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleAddAccess}
                                disabled={!newAccess.personId || !newAccess.tenantId || saving}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Salva
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantAccessPage;
