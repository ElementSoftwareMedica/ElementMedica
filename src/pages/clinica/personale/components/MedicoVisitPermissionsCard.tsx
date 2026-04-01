/**
 * MedicoVisitPermissionsCard
 * 
 * Card per gestire i permessi granulari sulle visite per un singolo medico.
 * Permessi gestiti:
 * - change_refertante: può cambiare il medico refertante
 * - view_prices: può visualizzare i prezzi delle prestazioni
 * - manage_convenzioni: può gestire convenzioni e codici sconto
 * 
 * Usa le API esistenti:
 * - GET /api/v1/permissions/person/:personId
 * - POST /api/v1/permissions/person/:personId
 * - DELETE /api/v1/permissions/person/:personId/:permissionId
 * 
 * @module pages/clinica/personale/components/MedicoVisitPermissionsCard
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield,
    Stethoscope,
    Eye,
    Tag,
    Loader2,
    Check,
    X,
    AlertCircle
} from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../../../../services/api';
import { useToast } from '../../../../hooks/useToast';

interface PersonPermission {
    id: string;
    resource: string;
    action: string;
    scope: string;
    granted: boolean;
    reason?: string;
}

interface PermissionDef {
    resource: string;
    action: string;
    label: string;
    description: string;
    icon: React.ElementType;
}

const VISIT_PERMISSIONS: PermissionDef[] = [
    {
        resource: 'clinica.visite',
        action: 'change_refertante',
        label: 'Cambia Refertante',
        description: 'Può cambiare il medico che firma il referto',
        icon: Stethoscope
    },
    {
        resource: 'clinica.visite',
        action: 'view_prices',
        label: 'Visualizza Prezzi',
        description: 'Può vedere i prezzi delle prestazioni durante la visita',
        icon: Eye
    },
    {
        resource: 'clinica.visite',
        action: 'manage_convenzioni',
        label: 'Gestisci Convenzioni/Sconti',
        description: 'Può applicare convenzioni e codici sconto alle visite',
        icon: Tag
    }
];

interface MedicoVisitPermissionsCardProps {
    medicoId: string;
    disabled?: boolean;
    className?: string;
}

export const MedicoVisitPermissionsCard: React.FC<MedicoVisitPermissionsCardProps> = ({
    medicoId,
    disabled = false,
    className = ''
}) => {
    const { showToast } = useToast();
    const [permissions, setPermissions] = useState<PersonPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Load permissions for this person
    const loadPermissions = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiGet(`/api/v1/permissions/person/${medicoId}`) as {
                data: PersonPermission[];
            };
            setPermissions(response.data || []);
        } catch (err) {
            setPermissions([]);
        } finally {
            setLoading(false);
        }
    }, [medicoId]);

    useEffect(() => {
        if (medicoId) {
            loadPermissions();
        }
    }, [medicoId, loadPermissions]);

    // Check if a specific permission is currently granted
    const isPermissionGranted = useCallback((resource: string, action: string): boolean | null => {
        const perm = permissions.find(p => p.resource === resource && p.action === action);
        if (!perm) return null; // No custom override
        return perm.granted;
    }, [permissions]);

    // Get the permission record if it exists
    const getPermissionRecord = useCallback((resource: string, action: string): PersonPermission | undefined => {
        return permissions.find(p => p.resource === resource && p.action === action);
    }, [permissions]);

    // Toggle a permission
    const handleToggle = useCallback(async (permDef: PermissionDef) => {
        const key = `${permDef.resource}:${permDef.action}`;
        setSaving(key);

        try {
            const existing = getPermissionRecord(permDef.resource, permDef.action);

            if (existing) {
                if (existing.granted) {
                    // Currently granted → revoke (set granted=false)
                    // Remove and re-create with granted=false
                    await apiDelete(`/api/v1/permissions/person/${medicoId}/${existing.id}`);
                    await apiPost(`/api/v1/permissions/person/${medicoId}`, {
                        resource: permDef.resource,
                        action: permDef.action,
                        scope: 'tenant',
                        granted: false,
                        reason: `Revocato da pannello medico`
                    });
                } else {
                    // Currently revoked → remove override (back to role default)
                    await apiDelete(`/api/v1/permissions/person/${medicoId}/${existing.id}`);
                }
            } else {
                // No override → grant explicitly
                await apiPost(`/api/v1/permissions/person/${medicoId}`, {
                    resource: permDef.resource,
                    action: permDef.action,
                    scope: 'tenant',
                    granted: true,
                    reason: `Concesso da pannello medico`
                });
            }

            await loadPermissions();
            showToast({
                type: 'success',
                message: `Permesso "${permDef.label}" aggiornato`
            });
        } catch (err: unknown) {
            showToast({
                type: 'error',
                message: 'Errore aggiornamento permesso'
            });
        } finally {
            setSaving(null);
        }
    }, [medicoId, getPermissionRecord, loadPermissions, showToast]);

    // Render permission state indicator
    const renderState = (resource: string, action: string) => {
        const granted = isPermissionGranted(resource, action);

        if (granted === null) {
            // No explicit override — show as "default" (role-based)
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    Ruolo
                </span>
            );
        }

        if (granted) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <Check className="h-3 w-3" />
                    Concesso
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                <X className="h-3 w-3" />
                Revocato
            </span>
        );
    };

    return (
        <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-600" />
                Permessi Visite
            </h2>
            <p className="text-xs text-gray-500 mb-4">
                Permessi granulari per le visite mediche. "Ruolo" indica il default del ruolo assegnato.
            </p>

            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 text-teal-600 animate-spin" />
                </div>
            ) : (
                <div className="space-y-3">
                    {VISIT_PERMISSIONS.map((permDef) => {
                        const Icon = permDef.icon;
                        const key = `${permDef.resource}:${permDef.action}`;
                        const isSaving = saving === key;
                        const granted = isPermissionGranted(permDef.resource, permDef.action);

                        return (
                            <div
                                key={key}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-teal-50 rounded-lg">
                                        <Icon className="h-4 w-4 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{permDef.label}</p>
                                        <p className="text-xs text-gray-500">{permDef.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {renderState(permDef.resource, permDef.action)}

                                    {!disabled && (
                                        <button
                                            onClick={() => handleToggle(permDef)}
                                            disabled={isSaving}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                                                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
                                                ${granted === true ? 'bg-teal-600' : granted === false ? 'bg-red-400' : 'bg-gray-300'}
                                                ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            title={
                                                granted === null ? 'Concedi permesso' :
                                                    granted ? 'Revoca permesso' :
                                                        'Rimuovi override (torna a default ruolo)'
                                            }
                                        >
                                            {isSaving ? (
                                                <span className="flex items-center justify-center w-full h-full">
                                                    <Loader2 className="h-3 w-3 text-white animate-spin" />
                                                </span>
                                            ) : (
                                                <span
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                                                        transition duration-200 ease-in-out
                                                        ${granted ? 'translate-x-5' : 'translate-x-0'}`}
                                                />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Info note */}
                    <div className="flex items-start gap-2 mt-3 p-2 bg-blue-50 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700">
                            I permessi personalizzati sovrascrivono quelli del ruolo.
                            Toggle triplo: Ruolo (default) → Concesso → Revocato → Ruolo.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicoVisitPermissionsCard;
