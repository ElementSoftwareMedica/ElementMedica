/**
 * User Detail Page - Management Section
 * 
 * Detailed view and edit page for a specific user
 * Allows managing user info, roles, permissions, and tenant access
 * 
 * @module pages/management/system/UserDetailPage
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    Shield,
    Building2,
    Mail,
    Phone,
    Calendar,
    Edit2,
    Save,
    X,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Lock,
    Unlock,
    Trash2,
    Plus,
    Settings,
    Clock,
    BadgeCheck,
    Activity
} from 'lucide-react';
import { apiGet, apiPut, apiPost, apiDelete } from '../../../services/api';
import { useTenantMode } from '../../../contexts/TenantModeContext';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { useAuth } from '../../../hooks/auth/useAuth';

// Types
interface UserData {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    fiscalCode?: string;
    globalRole: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
    tenant?: {
        id: string;
        name: string;
    };
    tenantId?: string;
    personRoles?: {
        id: string;
        roleId: string;
        role: {
            id: string;
            name: string;
            displayName: string;
        };
    }[];
    tenantAccess?: {
        id: string;
        tenantId: string;
        canRead: boolean;
        canWrite: boolean;
        canDelete: boolean;
        canManage: boolean;
        tenant: {
            id: string;
            name: string;
        };
    }[];
}

interface Tenant {
    id: string;
    name: string;
    isActive: boolean;
}

interface Role {
    id: string;
    name: string;
    displayName: string;
    description?: string;
}

// Global roles
const GLOBAL_ROLES = [
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'TRAINER',
    'INSTRUCTOR',
    'DOCTOR',
    'NURSE',
    'THERAPIST',
    'RECEPTIONIST',
    'SECRETARY',
    'ACCOUNTANT',
    'HR_MANAGER',
    'EMPLOYEE',
    'STUDENT',
    'PATIENT',
    'CLIENT',
    'VISITOR',
    'GUEST',
    'USER'
];

const UserDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { canPerformCRUD, getOperateHeaders } = useTenantMode();
    const isGlobalAdmin = currentUser?.globalRole === 'ADMIN' || currentUser?.globalRole === 'SUPER_ADMIN' ||
        (currentUser?.roles as string[] | undefined)?.includes('ADMIN') ||
        (currentUser?.roles as string[] | undefined)?.includes('SUPER_ADMIN');
    const operateHeaders = getOperateHeaders();
    const { confirm: confirmDialog } = useConfirmDialog();

    const [user, setUser] = useState<UserData | null>(null);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState<Partial<UserData>>({});
    const [showAddTenantModal, setShowAddTenantModal] = useState(false);
    const [newTenantAccess, setNewTenantAccess] = useState({
        tenantId: '',
        canRead: true,
        canWrite: false,
        canDelete: false,
        canManage: false
    });

    // Load user data
    const loadUser = useCallback(async () => {
        if (!id) return;

        setLoading(true);
        setError(null);

        try {
            const response = await apiGet<{ success: boolean; data: UserData }>(`/api/v1/persons/${id}`);
            if (response?.data) {
                setUser(response.data);
                setFormData(response.data);
            }
        } catch (err: unknown) {
            setError('Errore nel caricamento utente');
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Load tenants and roles
    const loadOptions = useCallback(async () => {
        try {
            const tenantsPromise = isGlobalAdmin
                ? apiGet<{ success: boolean; data: Tenant[] }>('/api/v1/tenants')
                : Promise.resolve({ success: true, data: [] as Tenant[] });
            const [tenantsRes, rolesRes] = await Promise.allSettled([
                tenantsPromise,
                apiGet<{ success: boolean; data: { data: Role[] } }>('/api/v1/roles')
            ]);

            if (tenantsRes.status === 'fulfilled' && tenantsRes.value?.data) {
                setTenants(tenantsRes.value.data);
            }
            if (rolesRes.status === 'fulfilled') {
                const rolesData = rolesRes.value?.data?.data || rolesRes.value?.data || [];
                setRoles(rolesData);
            }
        } catch (err) {
        }
    }, [isGlobalAdmin]);

    useEffect(() => {
        loadUser();
        loadOptions();
    }, [loadUser, loadOptions]);

    // Handle form input changes
    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Save user changes
    const handleSave = async () => {
        if (!id) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await apiPut(`/api/v1/persons/${id}`, formData, { headers: operateHeaders });
            setSuccess('Utente aggiornato con successo');
            setEditMode(false);
            loadUser();
        } catch (err: unknown) {
            setError('Errore nel salvataggio');
        } finally {
            setSaving(false);
        }
    };

    // Toggle user active status
    const toggleUserStatus = async () => {
        if (!id || !user) return;

        setSaving(true);
        try {
            await apiPut(`/api/v1/persons/${id}`, { isActive: !user.isActive }, { headers: operateHeaders });
            setSuccess(user.isActive ? 'Utente disattivato' : 'Utente attivato');
            loadUser();
        } catch (err: unknown) {
            setError('Errore nel cambio stato');
        } finally {
            setSaving(false);
        }
    };

    // Add tenant access
    const addTenantAccess = async () => {
        if (!id || !newTenantAccess.tenantId) return;

        setSaving(true);
        try {
            await apiPost(`/api/v1/persons/${id}/tenant-access`, newTenantAccess, { headers: operateHeaders });
            setSuccess('Accesso tenant aggiunto');
            setShowAddTenantModal(false);
            setNewTenantAccess({
                tenantId: '',
                canRead: true,
                canWrite: false,
                canDelete: false,
                canManage: false
            });
            loadUser();
        } catch (err: unknown) {
            setError('Errore nell\'aggiunta accesso');
        } finally {
            setSaving(false);
        }
    };

    // Remove tenant access
    const removeTenantAccess = async (accessId: string) => {
        if (!(await confirmDialog({ title: 'Rimuovi accesso', message: 'Rimuovere questo accesso tenant?', variant: 'danger', confirmLabel: 'Rimuovi' }))) return;

        setSaving(true);
        try {
            await apiDelete(`/api/v1/person-tenant-access/${accessId}`);
            setSuccess('Accesso tenant rimosso');
            loadUser();
        } catch (err: unknown) {
            setError('Errore nella rimozione');
        } finally {
            setSaving(false);
        }
    };

    // Format date
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-red-800">Utente non trovato</h3>
                <button
                    onClick={() => navigate('/management/users')}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    Torna alla lista
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/management/users')}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {user.firstName} {user.lastName}
                    </h1>
                    <p className="text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                    {editMode ? (
                        <>
                            <button
                                onClick={() => {
                                    setEditMode(false);
                                    setFormData(user);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Annulla
                            </button>
                            <CRUDPrimaryButton
                                onClick={handleSave}
                                disabled={saving}
                                operation="update"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Salva
                            </CRUDPrimaryButton>
                        </>
                    ) : (
                        <CRUDPrimaryButton
                            onClick={() => setEditMode(true)}
                            operation="update"
                        >
                            <Edit2 className="w-4 h-4" />
                            Modifica
                        </CRUDPrimaryButton>
                    )}
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-700">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-green-700">{success}</p>
                    <button onClick={() => setSuccess(null)} className="ml-auto text-green-600 hover:text-green-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-purple-600" />
                            Informazioni Base
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Nome</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={formData.firstName || ''}
                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{user.firstName}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Cognome</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={formData.lastName || ''}
                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{user.lastName}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                                {editMode ? (
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                ) : (
                                    <p className="text-gray-900 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        {user.email}
                                        {user.emailVerified && (
                                            <span title="Verificata">
                                                <BadgeCheck className="w-4 h-4 text-green-500" />
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Telefono</label>
                                {editMode ? (
                                    <input
                                        type="tel"
                                        value={formData.phone || ''}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                ) : (
                                    <p className="text-gray-900 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        {user.phone || 'Non specificato'}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Codice Fiscale</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={formData.fiscalCode || ''}
                                        onChange={(e) => handleInputChange('fiscalCode', e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{user.fiscalCode || 'Non specificato'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Ruolo Globale</label>
                                {editMode ? (
                                    <select
                                        value={formData.globalRole || ''}
                                        onChange={(e) => handleInputChange('globalRole', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        {GLOBAL_ROLES.map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-gray-900 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-purple-600" />
                                        {user.globalRole}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tenant Access Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-purple-600" />
                                Accesso Tenant
                            </h2>
                            <CRUDButton
                                onClick={() => setShowAddTenantModal(true)}
                                operation="create"
                                variant="secondary"
                                className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" />
                                Aggiungi
                            </CRUDButton>
                        </div>

                        {/* Primary Tenant */}
                        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium text-purple-700">Tenant Primario</div>
                                    <div className="text-lg font-semibold text-purple-900">
                                        {user.tenant?.name || 'Nessuno'}
                                    </div>
                                </div>
                                <Building2 className="w-8 h-8 text-purple-600" />
                            </div>
                        </div>

                        {/* Additional Tenant Access */}
                        <div className="space-y-3">
                            {user.tenantAccess && user.tenantAccess.length > 0 ? (
                                user.tenantAccess.map(access => (
                                    <div key={access.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-900">{access.tenant.name}</span>
                                            <CRUDButton
                                                onClick={() => removeTenantAccess(access.id)}
                                                operation="delete"
                                                variant="ghost"
                                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                title="Rimuovi accesso"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </CRUDButton>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`px-2 py-0.5 text-xs rounded ${access.canRead ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                Lettura
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs rounded ${access.canWrite ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                Scrittura
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs rounded ${access.canDelete ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                                Eliminazione
                                            </span>
                                            <span className={`px-2 py-0.5 text-xs rounded ${access.canManage ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                                                Gestione
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm text-center py-4">
                                    Nessun accesso aggiuntivo configurato
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-600" />
                            Stato
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Account</span>
                                <span className={`px-2 py-1 rounded-full text-sm font-medium ${user.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}>
                                    {user.isActive ? 'Attivo' : 'Disattivato'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-600">Email</span>
                                <span className={`px-2 py-1 rounded-full text-sm font-medium ${user.emailVerified
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {user.emailVerified ? 'Verificata' : 'Non verificata'}
                                </span>
                            </div>
                            <hr className="border-gray-200" />
                            <CRUDButton
                                onClick={toggleUserStatus}
                                disabled={saving}
                                operation="update"
                                variant="ghost"
                                className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 ${user.isActive
                                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                                    }`}
                            >
                                {user.isActive ? (
                                    <>
                                        <Lock className="w-4 h-4" />
                                        Disattiva Account
                                    </>
                                ) : (
                                    <>
                                        <Unlock className="w-4 h-4" />
                                        Attiva Account
                                    </>
                                )}
                            </CRUDButton>
                        </div>
                    </div>

                    {/* Timestamps Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-600" />
                            Cronologia
                        </h2>
                        <div className="space-y-3 text-sm">
                            <div>
                                <div className="text-gray-500">Creato</div>
                                <div className="text-gray-900">{formatDate(user.createdAt)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Ultimo aggiornamento</div>
                                <div className="text-gray-900">{formatDate(user.updatedAt)}</div>
                            </div>
                            <div>
                                <div className="text-gray-500">Ultimo login</div>
                                <div className="text-gray-900">{formatDate(user.lastLoginAt)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Roles Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-purple-600" />
                            Ruoli Assegnati
                        </h2>
                        <div className="space-y-2">
                            {user.personRoles && user.personRoles.length > 0 ? (
                                user.personRoles.map(pr => (
                                    <div
                                        key={pr.id}
                                        className="px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm"
                                    >
                                        {pr.role.displayName || pr.role.name}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm">Nessun ruolo assegnato</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Tenant Access Modal */}
            {showAddTenantModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Aggiungi Accesso Tenant</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                                <select
                                    value={newTenantAccess.tenantId}
                                    onChange={(e) => setNewTenantAccess(prev => ({ ...prev, tenantId: e.target.value }))}
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
                                <div className="space-y-2">
                                    {['canRead', 'canWrite', 'canDelete', 'canManage'].map(perm => (
                                        <label key={perm} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={newTenantAccess[perm as keyof typeof newTenantAccess] as boolean}
                                                onChange={(e) => setNewTenantAccess(prev => ({ ...prev, [perm]: e.target.checked }))}
                                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                                            />
                                            <span className="text-sm text-gray-700">
                                                {perm === 'canRead' && 'Lettura'}
                                                {perm === 'canWrite' && 'Scrittura'}
                                                {perm === 'canDelete' && 'Eliminazione'}
                                                {perm === 'canManage' && 'Gestione'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowAddTenantModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Annulla
                            </button>
                            <CRUDPrimaryButton
                                onClick={addTenantAccess}
                                disabled={!newTenantAccess.tenantId || saving}
                                operation="create"
                            >
                                Aggiungi
                            </CRUDPrimaryButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDetailPage;
