/**
 * PersonTenantProfilesWidget - Widget per visualizzare e gestire i profili tenant di una persona
 * 
 * Progetto 48: Mostra tutti i profili che una persona ha nei vari tenant,
 * permettendo di vedere e modificare i dati specifici per ciascun tenant.
 * 
 * @module components/person/PersonTenantProfilesWidget
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Building2,
    ChevronDown,
    ChevronRight,
    Edit,
    Trash2,
    Plus,
    Star,
    StarOff,
    Shield,
    Mail,
    Phone,
    Briefcase,
    Calendar,
    DollarSign,
    Loader2,
    AlertCircle,
    Check,
    X
} from 'lucide-react';
import { PersonTenantProfileService } from '../../services/personTenantProfile';
import { useToast } from '../../hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import type {
    PersonTenantProfile,
    PersonStatus
} from '../../types/personMultiTenant';

// ============================================
// TYPES
// ============================================

interface PersonTenantProfilesWidgetProps {
    personId: string;
    /** Se true, mostra solo il profilo primario */
    compactMode?: boolean;
    /** Se true, permette la modifica inline */
    editable?: boolean;
    /** Callback quando viene selezionato un profilo */
    onProfileSelect?: (profile: PersonTenantProfile) => void;
    /** Theme colore (teal per medica, blue per sicurezza) */
    theme?: 'teal' | 'blue' | 'violet';
    /** Classi CSS aggiuntive */
    className?: string;
}

// Status badge colors
const STATUS_COLORS: Record<PersonStatus, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-800 dark:text-green-300', label: 'Attivo' },
    INACTIVE: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', label: 'Inattivo' },
    SUSPENDED: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-800 dark:text-yellow-300', label: 'Sospeso' },
    TERMINATED: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-300', label: 'Terminato' },
    PENDING: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-300', label: 'In attesa' }
};

// Theme colors
const THEME_COLORS = {
    teal: {
        primary: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-50 dark:bg-teal-900/30',
        border: 'border-teal-200 dark:border-teal-700',
        hover: 'hover:bg-teal-100 dark:hover:bg-teal-800/40'
    },
    blue: {
        primary: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        border: 'border-blue-200 dark:border-blue-700',
        hover: 'hover:bg-blue-100 dark:hover:bg-blue-800/40'
    },
    violet: {
        primary: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-50 dark:bg-violet-900/30',
        border: 'border-violet-200 dark:border-violet-700',
        hover: 'hover:bg-violet-100 dark:hover:bg-violet-800/40'
    }
};

// ============================================
// COMPONENT
// ============================================

export const PersonTenantProfilesWidget: React.FC<PersonTenantProfilesWidgetProps> = ({
    personId,
    compactMode = false,
    editable = false,
    onProfileSelect,
    theme = 'teal',
    className = ''
}) => {
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [expandedProfiles, setExpandedProfiles] = useState<Set<string>>(new Set());
    const themeColors = THEME_COLORS[theme];

    // Query per ottenere tutti i profili della persona
    const { data: profilesData, isLoading, error } = useQuery({
        queryKey: ['person-profiles', personId],
        queryFn: () => PersonTenantProfileService.getAllForPerson(personId),
        enabled: !!personId
    });

    // Mutation per impostare profilo primario
    const setPrimaryMutation = useMutation({
        mutationFn: ({ personId, tenantId }: { personId: string; tenantId: string }) =>
            PersonTenantProfileService.setPrimary(personId, tenantId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['person-profiles', personId] });
            showToast({ message: 'Profilo primario aggiornato', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Errore nell\'aggiornamento', type: 'error' });
        }
    });

    // Mutation per eliminare profilo
    const deleteMutation = useMutation({
        mutationFn: ({ personId, tenantId }: { personId: string; tenantId: string }) =>
            PersonTenantProfileService.delete(personId, tenantId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['person-profiles', personId] });
            showToast({ message: 'Profilo eliminato', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Errore nell\'eliminazione', type: 'error' });
        }
    });

    // Toggle espansione profilo
    const toggleExpanded = useCallback((profileId: string) => {
        setExpandedProfiles(prev => {
            const next = new Set(prev);
            if (next.has(profileId)) {
                next.delete(profileId);
            } else {
                next.add(profileId);
            }
            return next;
        });
    }, []);

    // Profiles array
    const profiles = useMemo(() => {
        return profilesData?.profiles || [];
    }, [profilesData]);

    // Primary profile
    const primaryProfile = useMemo(() => {
        return profiles.find(p => p.isPrimary);
    }, [profiles]);

    // Handle delete
    const handleDelete = useCallback(async (profile: PersonTenantProfile) => {
        if (profile.isPrimary) {
            showToast({ message: 'Non puoi eliminare il profilo primario', type: 'warning' });
            return;
        }
        const confirmed = await confirmDelete(`profilo per ${profile.tenant?.name || 'questo tenant'}`);
        if (confirmed) {
            deleteMutation.mutate({ personId: profile.personId, tenantId: profile.tenantId });
        }
    }, [deleteMutation, showToast, confirmDelete]);

    // Handle set primary
    const handleSetPrimary = useCallback((profile: PersonTenantProfile) => {
        if (profile.isPrimary) return;
        setPrimaryMutation.mutate({ personId: profile.personId, tenantId: profile.tenantId });
    }, [setPrimaryMutation]);

    // Loading state
    if (isLoading) {
        return (
            <div className={`flex items-center justify-center p-4 ${className}`}>
                <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" />
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Caricamento profili...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg ${className}`}>
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                <span className="text-sm text-red-700 dark:text-red-300">Errore nel caricamento profili</span>
            </div>
        );
    }

    // Empty state
    if (profiles.length === 0) {
        return (
            <div className={`flex flex-col items-center gap-2 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
                <Building2 className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Nessun profilo tenant</span>
                {editable && (
                    <button className={`mt-2 px-3 py-1.5 text-sm rounded-lg ${themeColors.bg} ${themeColors.primary} ${themeColors.hover}`}>
                        <Plus className="w-4 h-4 inline mr-1" />
                        Aggiungi profilo
                    </button>
                )}
            </div>
        );
    }

    // Compact mode - solo profilo primario
    if (compactMode && primaryProfile) {
        return (
            <ProfileCard
                profile={primaryProfile}
                isExpanded={false}
                theme={theme}
                editable={false}
                onToggle={() => onProfileSelect?.(primaryProfile)}
                className={className}
            />
        );
    }

    // Full mode - tutti i profili
    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Building2 className={`w-4 h-4 ${themeColors.primary}`} />
                    Profili Tenant ({profiles.length})
                </h3>
                {editable && (
                    <button className={`px-2 py-1 text-xs rounded ${themeColors.bg} ${themeColors.primary} ${themeColors.hover}`}>
                        <Plus className="w-3 h-3 inline mr-1" />
                        Nuovo
                    </button>
                )}
            </div>

            {profiles.map(profile => (
                <ProfileCard
                    key={profile.id}
                    profile={profile}
                    isExpanded={expandedProfiles.has(profile.id)}
                    theme={theme}
                    editable={editable}
                    onToggle={() => toggleExpanded(profile.id)}
                    onSetPrimary={() => handleSetPrimary(profile)}
                    onDelete={() => handleDelete(profile)}
                    onSelect={() => onProfileSelect?.(profile)}
                />
            ))}
        </div>
    );
};

// ============================================
// PROFILE CARD SUB-COMPONENT
// ============================================

interface ProfileCardProps {
    profile: PersonTenantProfile;
    isExpanded: boolean;
    theme: 'teal' | 'blue' | 'violet';
    editable: boolean;
    onToggle: () => void;
    onSetPrimary?: () => void;
    onDelete?: () => void;
    onSelect?: () => void;
    className?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
    profile,
    isExpanded,
    theme,
    editable,
    onToggle,
    onSetPrimary,
    onDelete,
    onSelect,
    className = ''
}) => {
    const themeColors = THEME_COLORS[theme];
    const statusConfig = STATUS_COLORS[profile.status] || STATUS_COLORS.PENDING;

    return (
        <div className={`border rounded-lg overflow-hidden ${profile.isPrimary ? themeColors.border : 'border-gray-200 dark:border-gray-700'} ${className}`}>
            {/* Header */}
            <div
                className={`flex items-center justify-between p-3 cursor-pointer ${profile.isPrimary ? themeColors.bg : 'bg-white dark:bg-gray-800'} hover:bg-gray-50 dark:hover:bg-gray-700`}
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    {/* Expand icon */}
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    )}

                    {/* Tenant info */}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                {profile.tenant?.name || 'Tenant'}
                            </span>
                            {profile.isPrimary && (
                                <Star className={`w-4 h-4 ${themeColors.primary}`} fill="currentColor" />
                            )}
                        </div>
                        {profile.title && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{profile.title}</span>
                        )}
                    </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                    </span>

                    {editable && !profile.isPrimary && onSetPrimary && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSetPrimary(); }}
                            className="p-1 text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 rounded"
                            title="Imposta come primario"
                        >
                            <StarOff className="w-4 h-4" />
                        </button>
                    )}

                    {editable && !profile.isPrimary && onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"
                            title="Elimina profilo"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Contact info */}
                        {profile.email && (
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-600 dark:text-gray-300">{profile.email}</span>
                            </div>
                        )}
                        {profile.phone && (
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-600 dark:text-gray-300">{profile.phone}</span>
                            </div>
                        )}

                        {/* Work info */}
                        {profile.title && (
                            <div className="flex items-center gap-2 text-sm">
                                <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-600 dark:text-gray-300">{profile.title}</span>
                            </div>
                        )}
                        {profile.hiredDate && (
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-600 dark:text-gray-300">
                                    Dal {new Date(profile.hiredDate).toLocaleDateString('it-IT')}
                                </span>
                            </div>
                        )}

                        {/* Financial info */}
                        {profile.hourlyRate && (
                            <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <span className="text-gray-600 dark:text-gray-300">€{profile.hourlyRate}/ora</span>
                            </div>
                        )}

                        {/* Consent info */}
                        <div className="flex items-center gap-2 text-sm">
                            <Shield className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className={profile.dataShareConsent ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
                                {profile.dataShareConsent ? 'Condivisione dati autorizzata' : 'Nessun consenso condivisione'}
                            </span>
                        </div>
                    </div>

                    {/* Company/Site/Reparto */}
                    {(profile.company || profile.site || profile.reparto) && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                {profile.company && <span>Azienda: {profile.company.ragioneSociale}</span>}
                                {profile.site && <span className="ml-3">Sede: {profile.site.siteName}</span>}
                                {profile.reparto && <span className="ml-3">Reparto: {profile.reparto.nome}</span>}
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    {(editable || onSelect) && (
                        <div className="mt-4 flex justify-end gap-2">
                            {onSelect && (
                                <button
                                    onClick={onSelect}
                                    className={`px-3 py-1.5 text-sm rounded-lg ${themeColors.bg} ${themeColors.primary} ${themeColors.hover}`}
                                >
                                    Seleziona
                                </button>
                            )}
                            {editable && (
                                <button
                                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-1"
                                >
                                    <Edit className="w-4 h-4" />
                                    Modifica
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PersonTenantProfilesWidget;
