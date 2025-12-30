/**
 * SystemRolesCard - System & Roles information card
 */

import React, { useState } from 'react';
import { Shield, Plus, Check, X, Trash2, Loader2 } from 'lucide-react';
import type { PersonData, PersonRole, Tenant } from './types';
import { ROLE_TYPES, ROLE_LABELS } from './types';
import { formatDateTime, getRoleBadgeColor, getRoleLabel } from './utils';

// Common input classes
const inputClasses = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500";
const labelClasses = "block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1";

interface SystemRolesCardProps {
    person: PersonData;
    editedPerson: Partial<PersonData>;
    isEditing: boolean;
    canEdit: boolean;
    saving: boolean;
    tenants: Tenant[];
    onFieldChange: (field: keyof PersonData, value: any) => void;
    onAddRole: (roleType: string) => Promise<void>;
    onRemoveRole: (roleId: string, roleType: string) => Promise<void>;
}

const SystemRolesCard: React.FC<SystemRolesCardProps> = ({
    person,
    editedPerson,
    isEditing,
    canEdit,
    saving,
    tenants,
    onFieldChange,
    onAddRole,
    onRemoveRole,
}) => {
    const [addingRole, setAddingRole] = useState(false);
    const [newRoleType, setNewRoleType] = useState('');

    const handleAddRole = async () => {
        if (!newRoleType) return;
        await onAddRole(newRoleType);
        setAddingRole(false);
        setNewRoleType('');
    };

    const availableRoles = ROLE_TYPES.filter(
        r => !person.personRoles?.some(pr => pr.roleType === r)
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Sistema & Ruoli
            </h3>
            <div className="space-y-4">
                {/* Global Role */}
                <div>
                    <label className={labelClasses}>Global Role</label>
                    {isEditing ? (
                        <select
                            value={editedPerson.globalRole || ''}
                            onChange={(e) => onFieldChange('globalRole', e.target.value || null)}
                            className={inputClasses}
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
                                    {getRoleLabel(person.globalRole)}
                                </span>
                            ) : 'N/A'}
                        </p>
                    )}
                </div>

                {/* Tenant */}
                <div>
                    <label className={labelClasses}>Tenant</label>
                    {isEditing && tenants.length > 0 ? (
                        <select
                            value={editedPerson.tenantId || ''}
                            onChange={(e) => onFieldChange('tenantId', e.target.value)}
                            className={inputClasses}
                        >
                            {tenants.map(tenant => (
                                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                            ))}
                        </select>
                    ) : (
                        <p className="text-gray-900 dark:text-white">{person.tenant?.name || person.tenantId}</p>
                    )}
                </div>

                {/* Assigned Roles */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className={labelClasses}>Ruoli Assegnati</label>
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
                                {availableRoles.map(role => (
                                    <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddRole}
                                disabled={!newRoleType || saving}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => { setAddingRole(false); setNewRoleType(''); }}
                                className="p-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Roles List */}
                    <div className="flex flex-wrap gap-2 mt-1">
                        {person.personRoles?.length ? (
                            person.personRoles.map((role) => (
                                <div
                                    key={role.id}
                                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full group ${
                                        role.isActive 
                                            ? getRoleBadgeColor(role.roleType) 
                                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 line-through'
                                    }`}
                                >
                                    <Shield className="w-3 h-3" />
                                    {getRoleLabel(role.roleType)}
                                    {role.isPrimary && (
                                        <span className="bg-yellow-400 text-yellow-900 px-1 rounded text-xs">P</span>
                                    )}
                                    {canEdit && (
                                        <button
                                            onClick={() => onRemoveRole(role.id, role.roleType)}
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

                {/* Last Login */}
                <div>
                    <label className={labelClasses}>Ultimo Accesso</label>
                    <p className="text-gray-900 dark:text-white">{formatDateTime(person.lastLogin)}</p>
                </div>

                {/* Failed Attempts */}
                <div>
                    <label className={labelClasses}>Tentativi Falliti</label>
                    <p className={`${(person.failedAttempts || 0) > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white'}`}>
                        {person.failedAttempts || 0}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SystemRolesCard;
