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
    Shield,
    AlertCircle,
    Loader2,
    RefreshCw,
    Edit2,
    X,
    Check
} from 'lucide-react';
import { apiGet, apiPut, apiPost, apiDelete } from '../../../../services/api';
import { useAuth } from '../../../../context/AuthContext';

// Import types
import type { PersonData, Company, Site, Tenant, NewTenantAccess } from './types';

// Import components
import ProfileHeader from './ProfileHeader';
import {
    PersonalInfoCard,
    ContactInfoCard,
    WorkInfoCard,
    FinancialInfoCard,
    CompetenciesCard,
} from './InfoCards';
import SystemRolesCard from './SystemRolesCard';
import MultiTenantAccessSection from './MultiTenantAccessSection';
import { GdprSection, NotesSection, Timestamps } from './GdprNotesSection';

const PersonDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    // State
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

    // Permissions
    const canEdit = hasPermission('persons', 'write') || hasPermission('persons', 'update');
    const canView = hasPermission('persons', 'read');

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

    // Save changes
    const handleSave = async () => {
        if (!id || !canEdit) return;

        try {
            setSaving(true);
            setError(null);

            // Valid fields that can be sent to backend
            const validFields = [
                'firstName', 'lastName', 'email', 'phone', 'birthDate', 'taxCode',
                'vatNumber', 'residenceAddress', 'residenceCity', 'postalCode', 'province',
                'username', 'status', 'title', 'hiredDate', 'hourlyRate',
                'iban', 'registerCode', 'certifications', 'specialties', 'profileImage',
                'notes', 'globalRole', 'tenantId', 'companyId', 'gdprConsentDate', 'gdprConsentVersion',
                'dataRetentionUntil', 'preferences', 'siteId', 'reparto', 'repartoId'
            ];

            // Filter only valid fields
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
    };

    // Add role
    const handleAddRole = async (roleType: string) => {
        if (!id || !roleType || !person) return;

        try {
            setSaving(true);
            setError(null);

            await apiPost(`/api/v1/persons/${id}/roles`, { roleType });

            setSuccess('Ruolo aggiunto con successo');
            await fetchPerson();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Error adding role:', err);
            setError(err.message || 'Errore nell\'aggiunta del ruolo');
        } finally {
            setSaving(false);
        }
    };

    // Remove role
    const handleRemoveRole = async (roleId: string, roleType: string) => {
        if (!confirm('Sei sicuro di voler rimuovere questo ruolo?')) return;

        try {
            setSaving(true);
            setError(null);

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

    // Add tenant access
    const handleAddTenantAccess = async (access: NewTenantAccess) => {
        if (!id || !access.tenantId) return;

        try {
            setSaving(true);
            setError(null);

            await apiPost(`/api/v1/person-tenant-access/persons/${id}/tenants`, {
                tenantId: access.tenantId,
                accessLevel: access.accessLevel,
                defaultRoleType: access.defaultRoleType || undefined,
            });

            setSuccess('Accesso al tenant aggiunto con successo');
            await fetchPerson();

            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('Error adding tenant access:', err);
            setError(err.message || 'Errore nell\'aggiunta dell\'accesso al tenant');
        } finally {
            setSaving(false);
        }
    };

    // Remove tenant access
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

    // Access denied
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

    // Loading
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    // Not found
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
            <ProfileHeader person={person} />

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <PersonalInfoCard
                    person={person}
                    editedPerson={editedPerson}
                    isEditing={isEditing}
                    onFieldChange={handleFieldChange}
                />
                <ContactInfoCard
                    person={person}
                    editedPerson={editedPerson}
                    isEditing={isEditing}
                    onFieldChange={handleFieldChange}
                />
                <WorkInfoCard
                    person={person}
                    editedPerson={editedPerson}
                    isEditing={isEditing}
                    onFieldChange={handleFieldChange}
                    companies={companies}
                    sites={sites}
                />
                <FinancialInfoCard
                    person={person}
                    editedPerson={editedPerson}
                    isEditing={isEditing}
                    onFieldChange={handleFieldChange}
                />
                <CompetenciesCard
                    person={person}
                    editedPerson={editedPerson}
                    isEditing={isEditing}
                    onFieldChange={handleFieldChange}
                />
                <SystemRolesCard
                    person={person}
                    editedPerson={editedPerson}
                    isEditing={isEditing}
                    canEdit={canEdit}
                    saving={saving}
                    tenants={tenants}
                    onFieldChange={handleFieldChange}
                    onAddRole={handleAddRole}
                    onRemoveRole={handleRemoveRole}
                />
            </div>

            {/* Multi-Tenant Access Section */}
            <MultiTenantAccessSection
                person={person}
                tenants={tenants}
                canEdit={canEdit}
                saving={saving}
                onAddTenantAccess={handleAddTenantAccess}
                onRemoveTenantAccess={handleRemoveTenantAccess}
                onSetPrimaryTenant={handleSetPrimaryTenant}
            />

            {/* GDPR Section */}
            <GdprSection
                person={person}
                editedPerson={editedPerson}
                isEditing={isEditing}
                onFieldChange={handleFieldChange}
            />

            {/* Notes Section */}
            <NotesSection
                person={person}
                editedPerson={editedPerson}
                isEditing={isEditing}
                onFieldChange={handleFieldChange}
            />

            {/* Timestamps */}
            <Timestamps person={person} />
        </div>
    );
};

export default PersonDetails;
