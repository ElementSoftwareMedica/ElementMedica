/**
 * TenantAccessManager Component
 * 
 * Gestisce l'assegnazione di tenant multipli a una persona.
 * Permette di aggiungere, modificare e rimuovere accessi tenant.
 * 
 * @module components/persons/TenantAccessManager
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Building2,
    Plus,
    Trash2,
    Shield,
    Star,
    StarOff,
    Settings,
    Check,
    X,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { apiGet, apiPost, apiDelete, apiPut } from '../../services/api';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { useToast } from '@/hooks/useToast';

// Types
interface Tenant {
    id: string;
    name: string;
    slug: string;
    isActive?: boolean;
    enabledFeatures?: string[];
}

interface TenantAccess {
    id: string;
    tenantId: string;
    personId: string;
    accessLevel: 'READ' | 'WRITE' | 'ADMIN' | 'FULL';
    enabledFeatures: string[];
    defaultRoleType: string | null;
    isPrimary: boolean;
    validUntil: string | null;
    createdAt: string;
    tenant?: Tenant;
}

interface TenantAccessManagerProps {
    personId: string;
    personName?: string;
    onUpdate?: () => void;
    className?: string;
}

// Available access levels
const ACCESS_LEVELS = [
    { value: 'READ', label: 'Solo Lettura', color: 'bg-gray-100 text-gray-700' },
    { value: 'WRITE', label: 'Lettura/Scrittura', color: 'bg-blue-100 text-blue-700' },
    { value: 'ADMIN', label: 'Amministratore', color: 'bg-purple-100 text-purple-700' },
    { value: 'FULL', label: 'Accesso Completo', color: 'bg-green-100 text-green-700' }
];

// Available role types
const ROLE_TYPES = [
    { value: null, label: 'Nessun ruolo default' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'EMPLOYEE', label: 'Dipendente' },
    { value: 'TRAINER', label: 'Formatore' },
    { value: 'USER', label: 'Utente' }
];

// Available features
const AVAILABLE_FEATURES = [
    { id: 'formazione', label: 'Formazione', icon: '📚' },
    { id: 'medica', label: 'Medica', icon: '🏥' },
    { id: 'fatturazione', label: 'Fatturazione', icon: '💰' },
    { id: 'cms', label: 'CMS', icon: '📝' },
    { id: 'gdpr', label: 'GDPR', icon: '🔒' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'hr', label: 'HR', icon: '👥' },
    { id: 'documents', label: 'Documenti', icon: '📄' }
];

const TenantAccessManager: React.FC<TenantAccessManagerProps> = ({
    personId,
    personName,
    onUpdate,
    className = ''
}) => {
    // State
    const { confirmWarning } = useConfirmDialog();
    const { showToast } = useToast();
    const [tenantAccesses, setTenantAccesses] = useState<TenantAccess[]>([]);
    const [allTenants, setAllTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Add tenant modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');
    const [newAccessLevel, setNewAccessLevel] = useState<string>('READ');
    const [newRoleType, setNewRoleType] = useState<string | null>(null);
    const [newFeatures, setNewFeatures] = useState<string[]>([]);
    const [newIsPrimary, setNewIsPrimary] = useState(false);

    // Edit state
    const [editingAccessId, setEditingAccessId] = useState<string | null>(null);
    const [expandedAccessId, setExpandedAccessId] = useState<string | null>(null);

    // Fetch tenant accesses for the person
    const fetchTenantAccesses = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiGet(`/api/v1/person-tenant-access/persons/${personId}/tenants`) as {
                success: boolean;
                data: TenantAccess[];
            };

            if (response.success) {
                setTenantAccesses(response.data || []);
            }
        } catch (err) {
            setError('Errore nel caricamento degli accessi tenant');
        } finally {
            setLoading(false);
        }
    }, [personId]);

    // Fetch all available tenants
    const fetchAllTenants = useCallback(async () => {
        try {
            const response = await apiGet('/api/v1/tenants') as {
                success: boolean;
                data: Tenant[];
            };

            if (response.success) {
                setAllTenants(response.data || []);
            }
        } catch (err) {
            // Non-critical error, don't show to user
        }
    }, []);

    useEffect(() => {
        fetchTenantAccesses();
        fetchAllTenants();
    }, [fetchTenantAccesses, fetchAllTenants]);

    // Get available tenants (not yet assigned)
    const availableTenants = allTenants.filter(
        t => !tenantAccesses.some(ta => ta.tenantId === t.id)
    );

    // Grant new tenant access
    const handleGrantAccess = async () => {
        if (!selectedTenantId) return;

        try {
            setSaving(true);
            setError(null);

            await apiPost(`/api/v1/person-tenant-access/persons/${personId}/tenants`, {
                tenantId: selectedTenantId,
                accessLevel: newAccessLevel,
                defaultRoleType: newRoleType,
                enabledFeatures: newFeatures,
                isPrimary: newIsPrimary
            });

            // Reset form and close modal
            setSelectedTenantId('');
            setNewAccessLevel('READ');
            setNewRoleType(null);
            setNewFeatures([]);
            setNewIsPrimary(false);
            setShowAddModal(false);

            // Refresh data
            await fetchTenantAccesses();
            onUpdate?.();
        } catch (err) {
            setError('Errore nell\'assegnazione del tenant');
            showToast({ message: 'Errore nell\'assegnazione del tenant', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Revoke tenant access
    const handleRevokeAccess = async (tenantId: string) => {
        const confirmed = await confirmWarning(
            'Revoca accesso',
            'Sei sicuro di voler revocare l\'accesso a questo tenant?'
        );
        if (!confirmed) return;

        try {
            setSaving(true);
            setError(null);

            await apiDelete(`/api/v1/person-tenant-access/persons/${personId}/tenants/${tenantId}`);

            // Refresh data
            await fetchTenantAccesses();
            onUpdate?.();
        } catch (err) {
            setError('Errore nella revoca dell\'accesso');
            showToast({ message: 'Errore nella revoca dell\'accesso', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Update tenant access
    const handleUpdateAccess = async (
        tenantId: string,
        updates: Partial<Pick<TenantAccess, 'accessLevel' | 'defaultRoleType' | 'enabledFeatures' | 'isPrimary'>>
    ) => {
        try {
            setSaving(true);
            setError(null);

            await apiPut(`/api/v1/person-tenant-access/persons/${personId}/tenants/${tenantId}`, updates);

            // Refresh data
            await fetchTenantAccesses();
            setEditingAccessId(null);
            onUpdate?.();
        } catch (err) {
            setError('Errore nell\'aggiornamento dell\'accesso');
            showToast({ message: 'Errore nell\'aggiornamento dell\'accesso', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Set primary tenant
    const handleSetPrimary = async (tenantId: string) => {
        try {
            setSaving(true);
            setError(null);

            await apiPut(`/api/v1/person-tenant-access/persons/${personId}/primary-tenant`, {
                tenantId
            });

            // Refresh data
            await fetchTenantAccesses();
            onUpdate?.();
        } catch (err) {
            setError('Errore nell\'impostazione del tenant primario');
            showToast({ message: 'Errore nell\'impostazione del tenant primario', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // Toggle feature in new access form
    const toggleNewFeature = (featureId: string) => {
        setNewFeatures(prev =>
            prev.includes(featureId)
                ? prev.filter(f => f !== featureId)
                : [...prev, featureId]
        );
    };

    // Toggle expand/collapse access details
    const toggleExpand = (accessId: string) => {
        setExpandedAccessId(prev => prev === accessId ? null : accessId);
    };

    // Get access level config
    const getAccessLevelConfig = (level: string) => {
        return ACCESS_LEVELS.find(l => l.value === level) || ACCESS_LEVELS[0];
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    <span className="ml-2 text-gray-600">Caricamento accessi tenant...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg shadow ${className}`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-purple-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Accessi Tenant</h2>
                        {tenantAccesses.length > 0 && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                {tenantAccesses.length}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        disabled={availableTenants.length === 0 || saving}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Aggiungi Tenant
                    </button>
                </div>
                {personName && (
                    <p className="mt-1 text-sm text-gray-500">
                        Gestisci i tenant a cui {personName} può accedere
                    </p>
                )}
            </div>

            {/* Error message */}
            {error && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Tenant access list */}
            <div className="p-6">
                {tenantAccesses.length === 0 ? (
                    <div className="text-center py-8">
                        <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">Nessun tenant assegnato</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Clicca "Aggiungi Tenant" per assegnare l'accesso a un tenant
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tenantAccesses.map(access => {
                            const levelConfig = getAccessLevelConfig(access.accessLevel);
                            const isExpanded = expandedAccessId === access.id;

                            return (
                                <div
                                    key={access.id}
                                    className={`border rounded-lg transition-all ${access.isPrimary ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200'
                                        }`}
                                >
                                    {/* Main row */}
                                    <div className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* Expand button */}
                                                <button
                                                    onClick={() => toggleExpand(access.id)}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-5 h-5" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5" />
                                                    )}
                                                </button>

                                                {/* Tenant info */}
                                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                                                    <Building2 className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900">
                                                            {access.tenant?.name || 'Tenant sconosciuto'}
                                                        </span>
                                                        {access.isPrimary && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                                                                <Star className="w-3 h-3" />
                                                                Primario
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${levelConfig.color}`}>
                                                            <Shield className="w-3 h-3" />
                                                            {levelConfig.label}
                                                        </span>
                                                        {access.defaultRoleType && (
                                                            <span className="text-xs text-gray-500">
                                                                Ruolo: {access.defaultRoleType}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                {!access.isPrimary && (
                                                    <button
                                                        onClick={() => handleSetPrimary(access.tenantId)}
                                                        disabled={saving}
                                                        title="Imposta come primario"
                                                        className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                                    >
                                                        <StarOff className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setEditingAccessId(access.id)}
                                                    disabled={saving}
                                                    title="Modifica accesso"
                                                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleRevokeAccess(access.tenantId)}
                                                    disabled={saving}
                                                    title="Revoca accesso"
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded details */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Features */}
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 uppercase">
                                                        Features Abilitate
                                                    </label>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {access.enabledFeatures.length > 0 ? (
                                                            access.enabledFeatures.map(featureId => {
                                                                const feature = AVAILABLE_FEATURES.find(f => f.id === featureId);
                                                                return (
                                                                    <span
                                                                        key={featureId}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                                                    >
                                                                        {feature?.icon} {feature?.label || featureId}
                                                                    </span>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="text-sm text-gray-400">Nessuna feature specifica</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Metadata */}
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-500 uppercase">
                                                            Data Creazione
                                                        </label>
                                                        <p className="text-sm text-gray-700">
                                                            {new Date(access.createdAt).toLocaleDateString('it-IT', {
                                                                day: '2-digit',
                                                                month: 'long',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                    </div>
                                                    {access.validUntil && (
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 uppercase">
                                                                Valido Fino A
                                                            </label>
                                                            <p className="text-sm text-gray-700">
                                                                {new Date(access.validUntil).toLocaleDateString('it-IT')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Edit mode */}
                                    {editingAccessId === access.id && (
                                        <EditAccessForm
                                            access={access}
                                            onSave={(updates) => handleUpdateAccess(access.tenantId, updates)}
                                            onCancel={() => setEditingAccessId(null)}
                                            saving={saving}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Tenant Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Aggiungi Accesso Tenant</h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Tenant selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Seleziona Tenant *
                                </label>
                                <select
                                    value={selectedTenantId}
                                    onChange={(e) => setSelectedTenantId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="">-- Seleziona un tenant --</option>
                                    {availableTenants.map(tenant => (
                                        <option key={tenant.id} value={tenant.id}>
                                            {tenant.name} ({tenant.slug})
                                        </option>
                                    ))}
                                </select>
                                {availableTenants.length === 0 && (
                                    <p className="mt-1 text-sm text-amber-600">
                                        Tutti i tenant disponibili sono già assegnati
                                    </p>
                                )}
                            </div>

                            {/* Access level */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Livello di Accesso
                                </label>
                                <select
                                    value={newAccessLevel}
                                    onChange={(e) => setNewAccessLevel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    {ACCESS_LEVELS.map(level => (
                                        <option key={level.value} value={level.value}>
                                            {level.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Default role type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ruolo Default nel Tenant
                                </label>
                                <select
                                    value={newRoleType || ''}
                                    onChange={(e) => setNewRoleType(e.target.value || null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    {ROLE_TYPES.map(role => (
                                        <option key={role.value || 'none'} value={role.value || ''}>
                                            {role.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Features */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Features Abilitate
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {AVAILABLE_FEATURES.map(feature => (
                                        <label
                                            key={feature.id}
                                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${newFeatures.includes(feature.id)
                                                ? 'border-purple-300 bg-purple-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={newFeatures.includes(feature.id)}
                                                onChange={() => toggleNewFeature(feature.id)}
                                                className="sr-only"
                                            />
                                            <span className="text-lg">{feature.icon}</span>
                                            <span className="text-sm">{feature.label}</span>
                                            {newFeatures.includes(feature.id) && (
                                                <Check className="w-4 h-4 text-purple-600 ml-auto" />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Primary tenant */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newIsPrimary}
                                        onChange={(e) => setNewIsPrimary(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-700">Imposta come tenant primario</span>
                                    <Star className="w-4 h-4 text-yellow-500" />
                                </label>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleGrantAccess}
                                disabled={!selectedTenantId || saving}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Assegna Accesso
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Edit Access Form Component
interface EditAccessFormProps {
    access: TenantAccess;
    onSave: (updates: Partial<Pick<TenantAccess, 'accessLevel' | 'defaultRoleType' | 'enabledFeatures' | 'isPrimary'>>) => void;
    onCancel: () => void;
    saving: boolean;
}

const EditAccessForm: React.FC<EditAccessFormProps> = ({
    access,
    onSave,
    onCancel,
    saving
}) => {
    const [accessLevel, setAccessLevel] = useState(access.accessLevel);
    const [roleType, setRoleType] = useState(access.defaultRoleType);
    const [features, setFeatures] = useState(access.enabledFeatures);
    const [isPrimary, setIsPrimary] = useState(access.isPrimary);

    const toggleFeature = (featureId: string) => {
        setFeatures(prev =>
            prev.includes(featureId)
                ? prev.filter(f => f !== featureId)
                : [...prev, featureId]
        );
    };

    const handleSave = () => {
        onSave({
            accessLevel,
            defaultRoleType: roleType,
            enabledFeatures: features,
            isPrimary
        });
    };

    return (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Access level */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Livello di Accesso
                        </label>
                        <select
                            value={accessLevel}
                            onChange={(e) => setAccessLevel(e.target.value as TenantAccess['accessLevel'])}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            {ACCESS_LEVELS.map(level => (
                                <option key={level.value} value={level.value}>
                                    {level.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Default role */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ruolo Default
                        </label>
                        <select
                            value={roleType || ''}
                            onChange={(e) => setRoleType(e.target.value || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            {ROLE_TYPES.map(role => (
                                <option key={role.value || 'none'} value={role.value || ''}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Features */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Features
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_FEATURES.map(feature => (
                            <button
                                key={feature.id}
                                type="button"
                                onClick={() => toggleFeature(feature.id)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${features.includes(feature.id)
                                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                {feature.icon} {feature.label}
                                {features.includes(feature.id) && <Check className="w-3 h-3 ml-1" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary checkbox */}
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Tenant primario</span>
                </label>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="px-3 py-1.5 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Salva Modifiche
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TenantAccessManager;
