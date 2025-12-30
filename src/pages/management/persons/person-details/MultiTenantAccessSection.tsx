/**
 * MultiTenantAccessSection - Multi-tenant access management section
 */

import React, { useState } from 'react';
import { Globe, Building2, Plus, Star, Trash2, Loader2 } from 'lucide-react';
import type { PersonData, TenantAccess, Tenant, NewTenantAccess, AccessLevel } from './types';
import { ROLE_TYPES, ROLE_LABELS } from './types';
import { getAccessLevelColor, getAccessLevelLabel, getRoleLabel } from './utils';
import { Shield } from 'lucide-react';

interface MultiTenantAccessSectionProps {
    person: PersonData;
    tenants: Tenant[];
    canEdit: boolean;
    saving: boolean;
    onAddTenantAccess: (access: NewTenantAccess) => Promise<void>;
    onRemoveTenantAccess: (tenantId: string) => Promise<void>;
    onSetPrimaryTenant: (tenantId: string) => Promise<void>;
}

const MultiTenantAccessSection: React.FC<MultiTenantAccessSectionProps> = ({
    person,
    tenants,
    canEdit,
    saving,
    onAddTenantAccess,
    onRemoveTenantAccess,
    onSetPrimaryTenant,
}) => {
    const [addingTenantAccess, setAddingTenantAccess] = useState(false);
    const [newTenantAccess, setNewTenantAccess] = useState<NewTenantAccess>({
        tenantId: '',
        accessLevel: 'READ',
        defaultRoleType: '',
    });

    const handleAddTenantAccess = async () => {
        if (!newTenantAccess.tenantId) return;
        await onAddTenantAccess(newTenantAccess);
        setAddingTenantAccess(false);
        setNewTenantAccess({ tenantId: '', accessLevel: 'READ', defaultRoleType: '' });
    };

    // Filter out tenants that already have access
    const availableTenants = tenants.filter(
        t => !person?.tenantAccesses?.some(ta => ta.tenantId === t.id)
    );

    return (
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
                                {availableTenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Livello Accesso</label>
                            <select
                                value={newTenantAccess.accessLevel}
                                onChange={(e) => setNewTenantAccess({ ...newTenantAccess, accessLevel: e.target.value as AccessLevel })}
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
                            onClick={() => { 
                                setAddingTenantAccess(false); 
                                setNewTenantAccess({ tenantId: '', accessLevel: 'READ', defaultRoleType: '' }); 
                            }}
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
                            className={`flex items-center justify-between p-4 rounded-lg border ${
                                access.isPrimary
                                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    access.isPrimary ? 'bg-yellow-100 dark:bg-yellow-800' : 'bg-blue-100 dark:bg-blue-800'
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
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getAccessLevelColor(access.accessLevel)}`}>
                                            {getAccessLevelLabel(access.accessLevel)}
                                        </span>
                                        {access.roleType && (
                                            <span className="inline-flex items-center gap-1">
                                                <Shield className="w-3 h-3" />
                                                {getRoleLabel(access.roleType)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {canEdit && (
                                <div className="flex items-center gap-2">
                                    {!access.isPrimary && (
                                        <button
                                            onClick={() => onSetPrimaryTenant(access.tenantId)}
                                            className="p-2 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                                            title="Imposta come primario"
                                        >
                                            <Star className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onRemoveTenantAccess(access.tenantId)}
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
    );
};

export default MultiTenantAccessSection;
