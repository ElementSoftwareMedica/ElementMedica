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
    CalendarDays,
    CalendarPlus,
    PencilLine,
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
    },
    {
        resource: 'clinica.appuntamenti',
        action: 'edit_others',
        label: 'Modifica appuntamenti altri',
        description: 'Può aprire e modificare appuntamenti non assegnati a lui',
        icon: PencilLine
    },
    {
        resource: 'clinica.visite',
        action: 'edit_others',
        label: 'Modifica visite altri medici',
        description: 'Può modificare visite non assegnate; il cambio refertante viene versionato',
        icon: PencilLine
    }
];

const PERMISSION_SECTIONS: Array<{ title: string; description: string; items: PermissionDef[] }> = [
    {
        title: 'Visite e referti',
        description: 'Regola modifica visite, refertante, prezzi e convenzioni.',
        items: VISIT_PERMISSIONS.filter(p => p.resource === 'clinica.visite')
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

    const setPermission = useCallback(async (resource: string, action: string, granted: boolean) => {
        const existing = getPermissionRecord(resource, action);
        if (existing) {
            await apiDelete(`/api/v1/permissions/person/${medicoId}/${existing.id}`);
        }
        await apiPost(`/api/v1/permissions/person/${medicoId}`, {
            resource,
            action,
            scope: 'tenant',
            granted,
            reason: `${granted ? 'Concesso' : 'Revocato'} da pannello medico`
        });
    }, [getPermissionRecord, medicoId]);

    // Toggle a permission
    const handleToggle = useCallback(async (permDef: PermissionDef) => {
        const key = `${permDef.resource}:${permDef.action}`;
        setSaving(key);

        try {
            const existing = getPermissionRecord(permDef.resource, permDef.action);
            const nextGranted = existing ? !existing.granted : true;

            await setPermission(permDef.resource, permDef.action, nextGranted);

            if (nextGranted && permDef.resource === 'clinica.appuntamenti' && ['create_others', 'edit_others'].includes(permDef.action)) {
                await setPermission('clinica.appuntamenti', 'view_others_same_branch', true);
                await setPermission('clinica.appuntamenti', 'view_others_all', true);
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
    }, [getPermissionRecord, loadPermissions, setPermission, showToast]);

    const handleCalendarScopeToggle = useCallback(async (scope: 'same_branch' | 'all') => {
        const key = `clinica.appuntamenti:view_others_${scope}`;
        setSaving(key);
        try {
            if (scope === 'all') {
                const shouldGrant = isPermissionGranted('clinica.appuntamenti', 'view_others_all') !== true;
                await setPermission('clinica.appuntamenti', 'view_others_all', shouldGrant);
                await setPermission('clinica.appuntamenti', 'view_others_same_branch', shouldGrant);
            } else {
                const shouldGrant = isPermissionGranted('clinica.appuntamenti', 'view_others_same_branch') !== true ||
                    isPermissionGranted('clinica.appuntamenti', 'view_others_all') === true;
                await setPermission('clinica.appuntamenti', 'view_others_same_branch', shouldGrant);
                if (shouldGrant) {
                    await setPermission('clinica.appuntamenti', 'view_others_all', false);
                }
            }
            await loadPermissions();
            showToast({ type: 'success', message: 'Permessi calendario aggiornati' });
        } catch {
            showToast({ type: 'error', message: 'Errore aggiornamento permessi calendario' });
        } finally {
            setSaving(null);
        }
    }, [isPermissionGranted, loadPermissions, setPermission, showToast]);

    const handleAppointmentCreationToggle = useCallback(async (scope: 'self' | 'others') => {
        const action = scope === 'self' ? 'create_self' : 'create_others';
        const key = `clinica.appuntamenti:${action}`;
        setSaving(key);
        try {
            const shouldGrant = isPermissionGranted('clinica.appuntamenti', action) !== true;
            await setPermission('clinica.appuntamenti', action, shouldGrant);
            if (shouldGrant && scope === 'others') {
                await setPermission('clinica.appuntamenti', 'view_others_same_branch', true);
                await setPermission('clinica.appuntamenti', 'view_others_all', true);
            }
            await loadPermissions();
            showToast({ type: 'success', message: 'Permessi creazione appuntamenti aggiornati' });
        } catch {
            showToast({ type: 'error', message: 'Errore aggiornamento permessi creazione appuntamenti' });
        } finally {
            setSaving(null);
        }
    }, [isPermissionGranted, loadPermissions, setPermission, showToast]);

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
                <div className="space-y-5">
                    <div className="space-y-2">
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Appuntamenti e calendario</h3>
                            <p className="text-xs text-gray-400">Visualizzazione, creazione e modifica degli appuntamenti in un unico gruppo.</p>
                        </div>

                    <div className="min-w-0 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="p-1.5 bg-teal-50 rounded-lg">
                                    <CalendarDays className="h-4 w-4 text-teal-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900">Visualizza appuntamenti altri medici</p>
                                    <p className="text-xs text-gray-500">Scegli se vedere appuntamenti della stessa branca o di tutti i medici.</p>
                                </div>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[190px]">
                                {[
                                    {
                                        label: 'Stessa branca',
                                        action: 'view_others_same_branch',
                                        checked: isPermissionGranted('clinica.appuntamenti', 'view_others_same_branch') === true ||
                                            isPermissionGranted('clinica.appuntamenti', 'view_others_all') === true,
                                        savingKey: 'clinica.appuntamenti:view_others_same_branch',
                                        onClick: () => handleCalendarScopeToggle('same_branch')
                                    },
                                    {
                                        label: 'Tutti i medici',
                                        action: 'view_others_all',
                                        checked: isPermissionGranted('clinica.appuntamenti', 'view_others_all') === true,
                                        savingKey: 'clinica.appuntamenti:view_others_all',
                                        onClick: () => handleCalendarScopeToggle('all')
                                    }
                                ].map(item => {
                                    const isSaving = saving === item.savingKey;
                                    return (
                                        <div key={item.action} className="flex min-w-0 items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-gray-700">{item.label}</span>
                                            {!disabled && (
                                                <button
                                                    onClick={item.onClick}
                                                    disabled={isSaving}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                                                        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
                                                        ${item.checked ? 'bg-teal-600' : 'bg-gray-300'}
                                                        ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    title={`Aggiorna ${item.label.toLowerCase()}`}
                                                >
                                                    {isSaving ? (
                                                        <span className="flex items-center justify-center w-full h-full">
                                                            <Loader2 className="h-3 w-3 text-white animate-spin" />
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                                                                transition duration-200 ease-in-out
                                                                ${item.checked ? 'translate-x-5' : 'translate-x-0'}`}
                                                        />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="p-1.5 bg-teal-50 rounded-lg">
                                    <CalendarPlus className="h-4 w-4 text-teal-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900">Crea appuntamenti</p>
                                    <p className="text-xs text-gray-500">Scegli se il medico puo prenotare sui propri slot o anche per altri medici.</p>
                                </div>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[190px]">
                                {[
                                    {
                                        label: 'Propri',
                                        action: 'create_self',
                                        checked: isPermissionGranted('clinica.appuntamenti', 'create_self') === true,
                                        savingKey: 'clinica.appuntamenti:create_self',
                                        onClick: () => handleAppointmentCreationToggle('self')
                                    },
                                    {
                                        label: 'Per altri',
                                        action: 'create_others',
                                        checked: isPermissionGranted('clinica.appuntamenti', 'create_others') === true,
                                        savingKey: 'clinica.appuntamenti:create_others',
                                        onClick: () => handleAppointmentCreationToggle('others')
                                    }
                                ].map(item => {
                                    const isSaving = saving === item.savingKey;
                                    return (
                                        <div key={item.action} className="flex min-w-0 items-center justify-between gap-2">
                                            <span className="text-xs font-medium text-gray-700">{item.label}</span>
                                            {!disabled && (
                                                <button
                                                    onClick={item.onClick}
                                                    disabled={isSaving}
                                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                                                        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2
                                                        ${item.checked ? 'bg-teal-600' : 'bg-gray-300'}
                                                        ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    title={`Aggiorna ${item.label.toLowerCase()}`}
                                                >
                                                    {isSaving ? (
                                                        <span className="flex items-center justify-center w-full h-full">
                                                            <Loader2 className="h-3 w-3 text-white animate-spin" />
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                                                                transition duration-200 ease-in-out
                                                                ${item.checked ? 'translate-x-5' : 'translate-x-0'}`}
                                                        />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {VISIT_PERMISSIONS.filter(p => p.resource === 'clinica.appuntamenti').map((permDef) => {
                        const Icon = permDef.icon;
                        const key = `${permDef.resource}:${permDef.action}`;
                        const isSaving = saving === key;
                        const granted = isPermissionGranted(permDef.resource, permDef.action);

                        return (
                            <div
                                key={key}
                                className="flex min-w-0 flex-col gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="p-1.5 bg-teal-50 rounded-lg">
                                        <Icon className="h-4 w-4 text-teal-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{permDef.label}</p>
                                        <p className="text-xs text-gray-500">{permDef.description}</p>
                                    </div>
                                </div>

                                <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
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
                    </div>

                    {PERMISSION_SECTIONS.map(section => (
                        <div key={section.title} className="space-y-2">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{section.title}</h3>
                                <p className="text-xs text-gray-400">{section.description}</p>
                            </div>
                            {section.items.map((permDef) => {
                                const Icon = permDef.icon;
                                const key = `${permDef.resource}:${permDef.action}`;
                                const isSaving = saving === key;
                                const granted = isPermissionGranted(permDef.resource, permDef.action);

                                return (
                                    <div
                                        key={key}
                                        className="flex min-w-0 flex-col gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors sm:flex-row sm:items-center sm:justify-between"
                                    >
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="p-1.5 bg-teal-50 rounded-lg">
                                        <Icon className="h-4 w-4 text-teal-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{permDef.label}</p>
                                        <p className="text-xs text-gray-500">{permDef.description}</p>
                                    </div>
                                </div>

                                <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end">
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
                        </div>
                    ))}

                    {/* Info note */}
                    <div className="flex items-start gap-2 mt-3 p-2 bg-blue-50 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-blue-700">
                            I permessi personalizzati sovrascrivono quelli del ruolo.
                            I toggle salvano gli stessi permessi visibili nella pagina Permessi persone.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicoVisitPermissionsCard;
