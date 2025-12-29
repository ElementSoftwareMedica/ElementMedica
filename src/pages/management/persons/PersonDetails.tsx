/**
 * PersonDetails - Comprehensive Person Management Page
 * 
 * Full Person entity view and edit with all fields:
 * - Personal information (name, birth, tax code, etc.)
 * - Contact info (email, phone, address)
 * - Work info (company, site, role, hired date)
 * - Financial (hourly rate, IBAN, VAT)
 * - System (tenant, roles, permissions)
 * - GDPR compliance data
 * 
 * Accessible only with 'persons' permission (not 'employees' virtual entity)
 * 
 * @module pages/management/persons/PersonDetails
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    User,
    Mail,
    Phone,
    MapPin,
    Building2,
    Calendar,
    CreditCard,
    Shield,
    Fingerprint,
    Clock,
    FileText,
    Award,
    Star,
    Lock,
    UserCheck,
    Edit2,
    X,
    Check,
    AlertCircle,
    Loader2,
    Globe,
    Hash,
    DollarSign,
    Briefcase,
    RefreshCw,
    Plus,
    Trash2
} from 'lucide-react';
import { apiGet, apiPut, apiPost, apiDelete } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

// Role types from Prisma schema
const ROLE_TYPES = [
    'EMPLOYEE',
    'MANAGER',
    'HR_MANAGER',
    'DEPARTMENT_HEAD',
    'TRAINER',
    'SENIOR_TRAINER',
    'TRAINER_COORDINATOR',
    'EXTERNAL_TRAINER',
    'SUPER_ADMIN',
    'ADMIN',
    'COMPANY_ADMIN',
    'TENANT_ADMIN',
    'VIEWER',
    'OPERATOR',
    'COORDINATOR',
    'SUPERVISOR',
    'GUEST',
    'CONSULTANT',
    'AUDITOR',
    'TRAINING_ADMIN',
    'CLINIC_ADMIN',
    'COMPANY_MANAGER',
    'MEDICO',
    'PAZIENTE',
    'INFERMIERE',
    'SEGRETERIA_CLINICA',
] as const;

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'] as const;

const ROLE_LABELS: Record<string, string> = {
    EMPLOYEE: 'Dipendente',
    MANAGER: 'Manager',
    HR_MANAGER: 'HR Manager',
    DEPARTMENT_HEAD: 'Responsabile Reparto',
    TRAINER: 'Formatore',
    SENIOR_TRAINER: 'Formatore Senior',
    TRAINER_COORDINATOR: 'Coordinatore Formatori',
    EXTERNAL_TRAINER: 'Formatore Esterno',
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    COMPANY_ADMIN: 'Admin Azienda',
    TENANT_ADMIN: 'Admin Tenant',
    VIEWER: 'Visualizzatore',
    OPERATOR: 'Operatore',
    COORDINATOR: 'Coordinatore',
    SUPERVISOR: 'Supervisore',
    GUEST: 'Ospite',
    CONSULTANT: 'Consulente',
    AUDITOR: 'Revisore',
    TRAINING_ADMIN: 'Admin Formazione',
    CLINIC_ADMIN: 'Admin Clinica',
    COMPANY_MANAGER: 'Manager Aziendale',
    MEDICO: 'Medico',
    PAZIENTE: 'Paziente',
    INFERMIERE: 'Infermiere',
    SEGRETERIA_CLINICA: 'Segreteria Clinica',
};

const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    TRAINER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    EMPLOYEE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    MEDICO: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

interface PersonRole {
    id: string;
    roleType: string;
    isActive: boolean;
    isPrimary: boolean;
    companyId?: string;
    tenantId: string;
    assignedAt: string;
}

interface TenantAccess {
    id: string;
    tenantId: string;
    accessLevel: string;
    roleType?: string;
    isPrimary: boolean;
    tenant?: {
        id: string;
        name: string;
    };
}

interface Company {
    id: string;
    name: string;
    ragioneSociale?: string;
}

interface Site {
    id: string;
    siteName: string;
    citta?: string;
}

interface PersonData {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    birthDate?: string;
    taxCode?: string;
    vatNumber?: string;
    residenceAddress?: string;
    residenceCity?: string;
    postalCode?: string;
    province?: string;
    username?: string;
    status: string;
    title?: string;
    hiredDate?: string;
    hourlyRate?: number;
    iban?: string;
    registerCode?: string;
    certifications?: string[];
    specialties?: string[];
    profileImage?: string;
    notes?: string;
    lastLogin?: string;
    failedAttempts?: number;
    globalRole?: string;
    tenantId: string;
    companyId?: string;
    siteId?: string;
    reparto?: string;
    createdAt: string;
    updatedAt: string;
    gdprConsentDate?: string;
    gdprConsentVersion?: string;
    dataRetentionUntil?: string;
    // Relations
    company?: Company;
    site?: Site;
    tenant?: {
        id: string;
        name: string;
    };
    personRoles?: PersonRole[];
    tenantAccesses?: TenantAccess[];
}

interface Tenant {
    id: string;
    name: string;
}

const PersonDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    const [person, setPerson] = useState<PersonData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedPerson, setEditedPerson] = useState<Partial<PersonData>>({});
    const [companies, setCompanies] = useState<Company[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [addingRole, setAddingRole] = useState(false);
    const [newRoleType, setNewRoleType] = useState<string>('');

    // Multi-tenant access state
    const [addingTenantAccess, setAddingTenantAccess] = useState(false);
    const [newTenantAccess, setNewTenantAccess] = useState({
        tenantId: '',
        accessLevel: 'READ' as 'READ' | 'WRITE' | 'ADMIN' | 'FULL',
        defaultRoleType: '',
    });

    // Check permission
    const canEdit = hasPermission('persons', 'write') || hasPermission('persons', 'update');
    const canView = hasPermission('persons', 'read');

    // Format date for display
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('it-IT');
    };

    // Format datetime for display
    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('it-IT');
    };

    // Format date for input
    const formatDateForInput = (dateStr?: string) => {
        if (!dateStr) return '';
        return dateStr.split('T')[0];
    };

    // Fetch person data
    const fetchPerson = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);
            setError(null);

            const response = await apiGet<PersonData>(`/api/v1/persons/${id}`);
            setPerson(response);
            setEditedPerson(response);

            // Fetch companies and tenants for dropdowns
            const [companiesRes, tenantsRes] = await Promise.all([
                apiGet<{ data: Company[] }>('/api/v1/companies?limit=100').catch(() => ({ data: [] })),
                apiGet<{ data: Tenant[] }>('/api/v1/tenants?limit=100').catch(() => ({ data: [] }))
            ]);

            setCompanies(companiesRes.data || []);
            setTenants(tenantsRes.data || []);

            // Fetch sites for person's company (if they have one)
            if (response.companyId) {
                try {
                    const sitesRes = await apiGet<{ sites: Site[] }>(`/api/v1/company-sites/company/${response.companyId}`);
                    setSites(sitesRes.sites || []);
                } catch {
                    setSites([]);
                }
            }
        } catch (err: any) {
            console.error('Error fetching person:', err);
            setError(err.message || 'Errore nel caricamento dei dati');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPerson();
    }, [fetchPerson]);

    // Handle field change
    const handleFieldChange = (field: keyof PersonData, value: any) => {
        setEditedPerson(prev => ({ ...prev, [field]: value }));
    };

    // Handle array field change (certifications, specialties)
    const handleArrayFieldChange = (field: 'certifications' | 'specialties', value: string) => {
        const items = value.split(',').map(s => s.trim()).filter(Boolean);
        setEditedPerson(prev => ({ ...prev, [field]: items }));
    };

    // Save changes
    const handleSave = async () => {
        if (!id || !canEdit) return;

        try {
            setSaving(true);
            setError(null);

            // Lista dei campi validi che possono essere inviati al backend
            const validFields = [
                'firstName', 'lastName', 'email', 'phone', 'birthDate', 'taxCode',
                'vatNumber', 'residenceAddress', 'residenceCity', 'postalCode', 'province',
                'username', 'status', 'title', 'hiredDate', 'hourlyRate',
                'iban', 'registerCode', 'certifications', 'specialties', 'profileImage',
                'notes', 'globalRole', 'tenantId', 'companyId', 'gdprConsentDate', 'gdprConsentVersion',
                'dataRetentionUntil', 'preferences', 'siteId', 'reparto', 'repartoId'
            ];

            // Filtra solo i campi validi per evitare errori API
            const updateData: Record<string, any> = {};
            const personAny = editedPerson as Record<string, any>;
            for (const key of validFields) {
                if (key in personAny && personAny[key] !== undefined) {
                    updateData[key] = personAny[key];
                }
            }

            // Convert empty strings to null for optional fields
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === '') {
                    updateData[key] = null;
                }
            });

            await apiPut(`/api/v1/persons/${id}`, updateData);

            setSuccess('Modifiche salvate con successo');
            setIsEditing(false);

            // Refresh data
            await fetchPerson();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Error saving person:', err);
            setError(err.message || 'Errore nel salvataggio');
        } finally {
            setSaving(false);
        }
    };

    // Cancel edit
    const handleCancel = () => {
        setIsEditing(false);
        setEditedPerson(person || {});
        setAddingRole(false);
        setNewRoleType('');
    };

    // Add role to person
    const handleAddRole = async () => {
        if (!id || !newRoleType || !person) return;

        try {
            setSaving(true);
            setError(null);

            // API: POST /api/v1/persons/:id/roles with body { roleType }
            await apiPost(`/api/v1/persons/${id}/roles`, {
                roleType: newRoleType
            });

            setSuccess('Ruolo aggiunto con successo');
            setAddingRole(false);
            setNewRoleType('');
            await fetchPerson();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Error adding role:', err);
            setError(err.message || 'Errore nell\'aggiunta del ruolo');
        } finally {
            setSaving(false);
        }
    };

    // Remove role from person
    const handleRemoveRole = async (roleId: string, roleType: string) => {
        if (!confirm('Sei sicuro di voler rimuovere questo ruolo?')) return;

        try {
            setSaving(true);
            setError(null);

            // API: DELETE /api/v1/persons/:id/roles/:roleType
            await apiDelete(`/api/v1/persons/${id}/roles/${roleType}`);

            setSuccess('Ruolo rimosso con successo');
            await fetchPerson();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Error removing role:', err);
            setError(err.message || 'Errore nella rimozione del ruolo');
        } finally {
            setSaving(false);
        }
    };

    // Add tenant access to person
    const handleAddTenantAccess = async () => {
        if (!id || !newTenantAccess.tenantId) return;

        try {
            setSaving(true);
            setError(null);

            await apiPost(`/api/v1/person-tenant-access/persons/${id}/tenants`, {
                tenantId: newTenantAccess.tenantId,
                accessLevel: newTenantAccess.accessLevel,
                defaultRoleType: newTenantAccess.defaultRoleType || undefined,
            });

            setSuccess('Accesso al tenant aggiunto con successo');
            setAddingTenantAccess(false);
            setNewTenantAccess({ tenantId: '', accessLevel: 'READ', defaultRoleType: '' });
            await fetchPerson();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Error adding tenant access:', err);
            setError(err.message || 'Errore nell\'aggiunta dell\'accesso al tenant');
        } finally {
            setSaving(false);
        }
    };

    // Remove tenant access from person
    const handleRemoveTenantAccess = async (tenantId: string) => {
        if (!confirm('Sei sicuro di voler rimuovere l\'accesso a questo tenant?')) return;

        try {
            setSaving(true);
            setError(null);

            await apiDelete(`/api/v1/person-tenant-access/persons/${id}/tenants/${tenantId}`);

            setSuccess('Accesso al tenant rimosso con successo');
            await fetchPerson();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Error removing tenant access:', err);
            setError(err.message || 'Errore nella rimozione dell\'accesso al tenant');
        } finally {
            setSaving(false);
        }
    };

    // Set primary tenant
    const handleSetPrimaryTenant = async (tenantId: string) => {
        try {
            setSaving(true);
            setError(null);

            await apiPut(`/api/v1/person-tenant-access/persons/${id}/primary-tenant`, { tenantId });

            setSuccess('Tenant primario impostato con successo');
            await fetchPerson();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Error setting primary tenant:', err);
            setError(err.message || 'Errore nell\'impostazione del tenant primario');
        } finally {
            setSaving(false);
        }
    };

    // Get role badge color
    const getRoleBadgeColor = (roleType: string) => {
        return ROLE_COLORS[roleType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
            SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        };
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || statusColors.INACTIVE}`}>
                {status}
            </span>
        );
    };

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Accesso Negato</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Non hai i permessi per visualizzare questa pagina.</p>
                <Link to="/management" className="mt-4 text-purple-600 hover:text-purple-800 dark:text-purple-400">
                    Torna al Management
                </Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!person) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <AlertCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Persona non trovata</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">La persona richiesta non esiste o è stata eliminata.</p>
                <Link to="/management/persons" className="mt-4 text-purple-600 hover:text-purple-800 dark:text-purple-400">
                    Torna a Gestione Persone
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        to="/management/persons"
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {person.firstName} {person.lastName}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {person.id}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchPerson}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Ricarica"
                    >
                        <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    {canEdit && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                            Modifica
                        </button>
                    )}
                    {isEditing && (
                        <>
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Annulla
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Salva
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-red-700 dark:text-red-300">{error}</span>
                </div>
            )}
            {success && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-700 dark:text-green-300">{success}</span>
                </div>
            )}

            {/* Profile Header */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                        {person.profileImage ? (
                            <img
                                src={person.profileImage}
                                alt={`${person.firstName} ${person.lastName}`}
                                className="w-24 h-24 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">
                                    {person.firstName?.charAt(0)}{person.lastName?.charAt(0)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {person.firstName} {person.lastName}
                            </h2>
                            {getStatusBadge(person.status)}
                            {person.globalRole && (
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(person.globalRole)}`}>
                                    {ROLE_LABELS[person.globalRole] || person.globalRole}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-1">{person.title || 'Nessun titolo'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                            {person.username && <span className="mr-3">@{person.username}</span>}
                            {person.taxCode && <span className="font-mono">{person.taxCode}</span>}
                        </p>

                        {/* Quick info */}
                        <div className="flex flex-wrap gap-4 mt-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Mail className="w-4 h-4" />
                                {person.email || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Phone className="w-4 h-4" />
                                {person.phone || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Building2 className="w-4 h-4" />
                                {person.company?.ragioneSociale || person.company?.name || 'Nessuna azienda'}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                Ultimo accesso: {formatDateTime(person.lastLogin)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Personal Information */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-purple-600" />
                        Informazioni Personali
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Nome</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedPerson.firstName || ''}
                                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{person.firstName}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Cognome</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedPerson.lastName || ''}
                                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{person.lastName}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Data di Nascita</label>
                            {isEditing ? (
                                <input
                                    type="date"
                                    value={formatDateForInput(editedPerson.birthDate)}
                                    onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{formatDate(person.birthDate)}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Codice Fiscale</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedPerson.taxCode || ''}
                                    onChange={(e) => handleFieldChange('taxCode', e.target.value.toUpperCase())}
                                    maxLength={16}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white font-mono">{person.taxCode || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Username</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedPerson.username || ''}
                                    onChange={(e) => handleFieldChange('username', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{person.username ? `@${person.username}` : 'N/A'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Contatti & Residenza
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Email</label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={editedPerson.email || ''}
                                    onChange={(e) => handleFieldChange('email', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{person.email || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Telefono</label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={editedPerson.phone || ''}
                                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{person.phone || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Indirizzo</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedPerson.residenceAddress || ''}
                                    onChange={(e) => handleFieldChange('residenceAddress', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{person.residenceAddress || 'N/A'}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Città</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedPerson.residenceCity || ''}
                                        onChange={(e) => handleFieldChange('residenceCity', e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white">{person.residenceCity || 'N/A'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Prov.</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedPerson.province || ''}
                                        onChange={(e) => handleFieldChange('province', e.target.value.toUpperCase())}
                                        maxLength={2}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white">{person.province || 'N/A'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">CAP</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedPerson.postalCode || ''}
                                        onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                                        maxLength={5}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white">{person.postalCode || 'N/A'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Work Information */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-green-600" />
                        Informazioni Lavorative
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Titolo / Posizione</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedPerson.title || ''}
                                    onChange={(e) => handleFieldChange('title', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{person.title || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Azienda</label>
                            {isEditing ? (
                                <select
                                    value={editedPerson.companyId || ''}
                                    onChange={(e) => handleFieldChange('companyId', e.target.value || null)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">-- Nessuna azienda --</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.ragioneSociale || c.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-gray-900 dark:text-white">{person.company?.ragioneSociale || person.company?.name || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Sede</label>
                            {isEditing ? (
                                <select
                                    value={editedPerson.siteId || ''}
                                    onChange={(e) => handleFieldChange('siteId', e.target.value || null)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">-- Nessuna sede --</option>
                                    {sites.map(s => (
                                        <option key={s.id} value={s.id}>{s.siteName} {s.citta && `(${s.citta})`}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-gray-900 dark:text-white">
                                    {person.site?.siteName || 'N/A'}
                                    {person.site?.citta && ` (${person.site.citta})`}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Reparto</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedPerson.reparto || ''}
                                    onChange={(e) => handleFieldChange('reparto', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{person.reparto || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Data Assunzione</label>
                            {isEditing ? (
                                <input
                                    type="date"
                                    value={formatDateForInput(editedPerson.hiredDate)}
                                    onChange={(e) => handleFieldChange('hiredDate', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{formatDate(person.hiredDate)}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Status</label>
                            {isEditing ? (
                                <select
                                    value={editedPerson.status || 'ACTIVE'}
                                    onChange={(e) => handleFieldChange('status', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                >
                                    {STATUS_OPTIONS.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            ) : (
                                getStatusBadge(person.status)
                            )}
                        </div>
                    </div>
                </div>

                {/* Financial Information */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-yellow-600" />
                        Dati Fiscali & Finanziari
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Partita IVA</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedPerson.vatNumber || ''}
                                    onChange={(e) => handleFieldChange('vatNumber', e.target.value)}
                                    maxLength={11}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white font-mono">{person.vatNumber || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">IBAN</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedPerson.iban || ''}
                                    onChange={(e) => handleFieldChange('iban', e.target.value.toUpperCase())}
                                    maxLength={34}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white font-mono text-xs">{person.iban || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Tariffa Oraria (€)</label>
                            {isEditing ? (
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editedPerson.hourlyRate || ''}
                                    onChange={(e) => handleFieldChange('hourlyRate', parseFloat(e.target.value) || null)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">
                                    {person.hourlyRate ? `€${Number(person.hourlyRate).toFixed(2)}/ora` : 'N/A'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Codice Registro</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedPerson.registerCode || ''}
                                    onChange={(e) => handleFieldChange('registerCode', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white font-mono">{person.registerCode || 'N/A'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Competencies */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-orange-600" />
                        Competenze & Certificazioni
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                                Certificazioni (separate da virgola)
                            </label>
                            {isEditing ? (
                                <textarea
                                    value={(editedPerson.certifications || []).join(', ')}
                                    onChange={(e) => handleArrayFieldChange('certifications', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                    placeholder="Es: Primo Soccorso, Antincendio, RSPP..."
                                />
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {person.certifications?.length ? (
                                        person.certifications.map((cert, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs"
                                            >
                                                <Award className="w-3 h-3" />
                                                {cert}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Nessuna certificazione</p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                                Specializzazioni (separate da virgola)
                            </label>
                            {isEditing ? (
                                <textarea
                                    value={(editedPerson.specialties || []).join(', ')}
                                    onChange={(e) => handleArrayFieldChange('specialties', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                    placeholder="Es: Formazione Sicurezza, HACCP, Privacy..."
                                />
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {person.specialties?.length ? (
                                        person.specialties.map((spec, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs"
                                            >
                                                <Star className="w-3 h-3" />
                                                {spec}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Nessuna specializzazione</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* System & Roles */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-600" />
                        Sistema & Ruoli
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Global Role</label>
                            {isEditing ? (
                                <select
                                    value={editedPerson.globalRole || ''}
                                    onChange={(e) => handleFieldChange('globalRole', e.target.value || null)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">-- Nessun ruolo globale --</option>
                                    {ROLE_TYPES.map(role => (
                                        <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-gray-900 dark:text-white">
                                    {person.globalRole ? (
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(person.globalRole)}`}>
                                            {ROLE_LABELS[person.globalRole] || person.globalRole}
                                        </span>
                                    ) : 'N/A'}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Tenant</label>
                            {isEditing && tenants.length > 0 ? (
                                <select
                                    value={editedPerson.tenantId || ''}
                                    onChange={(e) => handleFieldChange('tenantId', e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                >
                                    {tenants.map(tenant => (
                                        <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-gray-900 dark:text-white">{person.tenant?.name || person.tenantId}</p>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ruoli Assegnati</label>
                                {canEdit && (
                                    <button
                                        onClick={() => setAddingRole(true)}
                                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                                        title="Aggiungi ruolo"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Add Role Form */}
                            {addingRole && (
                                <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <select
                                        value={newRoleType}
                                        onChange={(e) => setNewRoleType(e.target.value)}
                                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Seleziona ruolo...</option>
                                        {ROLE_TYPES.filter(r => !person.personRoles?.some(pr => pr.roleType === r)).map(role => (
                                            <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAddRole}
                                        disabled={!newRoleType || saving}
                                        className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { setAddingRole(false); setNewRoleType(''); }}
                                        className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 mt-1">
                                {person.personRoles?.length ? (
                                    person.personRoles.map((role) => (
                                        <div
                                            key={role.id}
                                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full group ${role.isActive ? getRoleBadgeColor(role.roleType) : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 line-through'
                                                }`}
                                        >
                                            <Shield className="w-3 h-3" />
                                            {ROLE_LABELS[role.roleType] || role.roleType}
                                            {role.isPrimary && (
                                                <span className="bg-yellow-400 text-yellow-900 px-1 rounded text-xs">P</span>
                                            )}
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleRemoveRole(role.id, role.roleType)}
                                                    className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 hover:bg-white/30 rounded text-red-600 transition-opacity"
                                                    title="Rimuovi ruolo"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">Nessun ruolo assegnato</p>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Ultimo Accesso</label>
                            <p className="text-gray-900 dark:text-white">{formatDateTime(person.lastLogin)}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Tentativi Falliti</label>
                            <p className={`${(person.failedAttempts || 0) > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white'}`}>
                                {person.failedAttempts || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Multi-Tenant Access Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-600" />
                        Accessi Multi-Tenant
                    </h3>
                    {canEdit && (
                        <button
                            onClick={() => setAddingTenantAccess(true)}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Aggiungi Accesso
                        </button>
                    )}
                </div>

                {/* Add Tenant Access Form */}
                {addingTenantAccess && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">Nuovo Accesso Tenant</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tenant</label>
                                <select
                                    value={newTenantAccess.tenantId}
                                    onChange={(e) => setNewTenantAccess({ ...newTenantAccess, tenantId: e.target.value })}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Seleziona tenant...</option>
                                    {tenants
                                        .filter(t => !person?.tenantAccesses?.some(ta => ta.tenantId === t.id))
                                        .map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Livello Accesso</label>
                                <select
                                    value={newTenantAccess.accessLevel}
                                    onChange={(e) => setNewTenantAccess({ ...newTenantAccess, accessLevel: e.target.value as any })}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="READ">Solo Lettura</option>
                                    <option value="WRITE">Lettura/Scrittura</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="FULL">Completo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ruolo Predefinito</label>
                                <select
                                    value={newTenantAccess.defaultRoleType}
                                    onChange={(e) => setNewTenantAccess({ ...newTenantAccess, defaultRoleType: e.target.value })}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Nessuno</option>
                                    {ROLE_TYPES.map(role => (
                                        <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => { setAddingTenantAccess(false); setNewTenantAccess({ tenantId: '', accessLevel: 'READ', defaultRoleType: '' }); }}
                                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleAddTenantAccess}
                                disabled={!newTenantAccess.tenantId || saving}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiungi'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Tenant Access List */}
                <div className="space-y-3">
                    {person?.tenantAccesses && person.tenantAccesses.length > 0 ? (
                        person.tenantAccesses.map((access) => (
                            <div
                                key={access.id}
                                className={`flex items-center justify-between p-4 rounded-lg border ${access.isPrimary
                                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${access.isPrimary ? 'bg-yellow-100 dark:bg-yellow-800' : 'bg-blue-100 dark:bg-blue-800'
                                        }`}>
                                        <Building2 className={`w-5 h-5 ${access.isPrimary ? 'text-yellow-600' : 'text-blue-600'}`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {access.tenant?.name || access.tenantId}
                                            </span>
                                            {access.isPrimary && (
                                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-200 text-yellow-800">
                                                    <Star className="w-3 h-3 mr-1" />
                                                    Primario
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${access.accessLevel === 'FULL' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                    access.accessLevel === 'ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                        access.accessLevel === 'WRITE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                }`}>
                                                {access.accessLevel === 'FULL' ? 'Completo' :
                                                    access.accessLevel === 'ADMIN' ? 'Admin' :
                                                        access.accessLevel === 'WRITE' ? 'Scrittura' : 'Lettura'}
                                            </span>
                                            {access.roleType && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    {ROLE_LABELS[access.roleType] || access.roleType}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {canEdit && (
                                    <div className="flex items-center gap-2">
                                        {!access.isPrimary && (
                                            <button
                                                onClick={() => handleSetPrimaryTenant(access.tenantId)}
                                                className="p-2 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                                                title="Imposta come primario"
                                            >
                                                <Star className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleRemoveTenantAccess(access.tenantId)}
                                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                            title="Rimuovi accesso"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p>Nessun accesso multi-tenant configurato</p>
                            <p className="text-sm mt-1">Questa persona ha accesso solo al tenant primario</p>
                        </div>
                    )}
                </div>
            </div>

            {/* GDPR Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-green-600" />
                    Conformità GDPR
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Data Consenso GDPR</label>
                        {isEditing ? (
                            <input
                                type="date"
                                value={formatDateForInput(editedPerson.gdprConsentDate)}
                                onChange={(e) => handleFieldChange('gdprConsentDate', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                            />
                        ) : (
                            <p className="text-gray-900 dark:text-white">
                                {person.gdprConsentDate ? (
                                    <span className="flex items-center gap-2 text-green-600">
                                        <UserCheck className="w-4 h-4" />
                                        {formatDate(person.gdprConsentDate)}
                                    </span>
                                ) : (
                                    <span className="text-amber-600">Non fornito</span>
                                )}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Versione Consenso</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedPerson.gdprConsentVersion || ''}
                                onChange={(e) => handleFieldChange('gdprConsentVersion', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-purple-500"
                            />
                        ) : (
                            <p className="text-gray-900 dark:text-white font-mono">{person.gdprConsentVersion || 'N/A'}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Conservazione Dati Fino A</label>
                        {isEditing ? (
                            <input
                                type="date"
                                value={formatDateForInput(editedPerson.dataRetentionUntil)}
                                onChange={(e) => handleFieldChange('dataRetentionUntil', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                            />
                        ) : (
                            <p className="text-gray-900 dark:text-white">{formatDate(person.dataRetentionUntil)}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    Note
                </h3>
                {isEditing ? (
                    <textarea
                        value={editedPerson.notes || ''}
                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                        placeholder="Note aggiuntive sulla persona..."
                    />
                ) : (
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {person.notes || 'Nessuna nota'}
                    </p>
                )}
            </div>

            {/* Timestamps */}
            <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-4">
                <span>Creato il: {formatDateTime(person.createdAt)}</span>
                <span>Ultimo aggiornamento: {formatDateTime(person.updatedAt)}</span>
            </div>
        </div>
    );
};

export default PersonDetails;
