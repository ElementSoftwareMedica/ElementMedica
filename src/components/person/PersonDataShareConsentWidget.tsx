/**
 * PersonDataShareConsentWidget - Widget per gestire i consensi di condivisione dati GDPR
 * 
 * Progetto 48: Permette di visualizzare e gestire i consensi di condivisione dati
 * tra tenant diversi, in conformità con il GDPR.
 * 
 * @module components/person/PersonDataShareConsentWidget
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Shield,
    ShieldCheck,
    ShieldOff,
    Plus,
    Trash2,
    Calendar,
    Building2,
    FileText,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronRight,
    History,
    Info
} from 'lucide-react';
import { PersonDataShareConsentService } from '../../services/personDataShareConsent';
import { useToast } from '../../hooks/useToast';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { DatePickerElegante } from '../ui/DatePickerElegante';
import type {
    PersonDataShareConsent,
    CreatePersonDataShareConsentDTO
} from '../../types/personMultiTenant';

// ============================================
// TYPES
// ============================================

interface PersonDataShareConsentWidgetProps {
    personId: string;
    /** Tenant corrente (source) */
    currentTenantId?: string;
    /** Se true, mostra solo i consensi attivi */
    activeOnly?: boolean;
    /** Se true, permette la creazione/revoca consensi */
    editable?: boolean;
    /** Theme colore */
    theme?: 'teal' | 'blue' | 'violet';
    /** Classi CSS aggiuntive */
    className?: string;
}

interface CreateConsentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateConsentInput) => void;
    personId: string;
    sourceTenantId: string;
    isLoading: boolean;
}

/** Input per creare un nuovo consenso */
interface CreateConsentInput {
    personId: string;
    sourceTenantId: string;
    targetTenantId: string;
    purpose: string;
    scope?: string[];
    legalBasis?: string;
    expiresAt?: Date;
}

/** Status del consenso calcolato */
type ConsentStatus = 'GRANTED' | 'REVOKED' | 'EXPIRED' | 'PENDING';

/** Helper per calcolare lo status da PersonDataShareConsent */
function getConsentStatus(consent: PersonDataShareConsent): ConsentStatus {
    if (consent.isRevoked) return 'REVOKED';
    if (consent.validUntil && new Date(consent.validUntil) < new Date()) return 'EXPIRED';
    if (consent.consentGiven) return 'GRANTED';
    return 'PENDING';
}

/** Helper per ottenere la data di concessione */
function getGrantedAt(consent: PersonDataShareConsent): string | Date {
    return consent.consentDate || consent.createdAt;
}

/** Helper per ottenere purpose dal tipo di dati condivisi */
function getPurpose(consent: PersonDataShareConsent): string {
    if (Array.isArray(consent.sharedDataTypes) && consent.sharedDataTypes.length > 0) {
        return consent.sharedDataTypes[0] as string;
    }
    return 'other';
}

// Status colors
const STATUS_COLORS: Record<ConsentStatus, { bg: string; text: string; icon: typeof ShieldCheck; label: string }> = {
    GRANTED: { bg: 'bg-green-100', text: 'text-green-800', icon: ShieldCheck, label: 'Concesso' },
    REVOKED: { bg: 'bg-red-100', text: 'text-red-800', icon: ShieldOff, label: 'Revocato' },
    EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: ShieldOff, label: 'Scaduto' },
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Shield, label: 'In attesa' }
};

// Theme colors
const THEME_COLORS = {
    teal: {
        primary: 'text-teal-600',
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        hover: 'hover:bg-teal-100',
        button: 'bg-teal-600 hover:bg-teal-700 text-white'
    },
    blue: {
        primary: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        hover: 'hover:bg-blue-100',
        button: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    violet: {
        primary: 'text-violet-600',
        bg: 'bg-violet-50',
        border: 'border-violet-200',
        hover: 'hover:bg-violet-100',
        button: 'bg-violet-600 hover:bg-violet-700 text-white'
    }
};

// Consent purpose labels
const PURPOSE_LABELS: Record<string, string> = {
    medical_records: 'Cartelle cliniche',
    employment: 'Dati lavorativi',
    billing: 'Fatturazione',
    scheduling: 'Appuntamenti',
    analytics: 'Analisi dati',
    research: 'Ricerca',
    other: 'Altro'
};

// ============================================
// COMPONENT
// ============================================

export const PersonDataShareConsentWidget: React.FC<PersonDataShareConsentWidgetProps> = ({
    personId,
    currentTenantId,
    activeOnly = false,
    editable = false,
    theme = 'teal',
    className = ''
}) => {
    const { showToast } = useToast();
    const { confirmWarning } = useConfirmDialog();
    const queryClient = useQueryClient();
    const [expandedConsents, setExpandedConsents] = useState<Set<string>>(new Set());
    const [showHistory, setShowHistory] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const themeColors = THEME_COLORS[theme];

    // Query per ottenere tutti i consensi della persona
    const { data: consentsData, isLoading, error } = useQuery({
        queryKey: ['person-consents', personId, activeOnly],
        queryFn: () => PersonDataShareConsentService.getAllForPerson(personId),
        enabled: !!personId
    });

    // Mutation per creare consenso
    const createMutation = useMutation({
        mutationFn: (data: CreateConsentInput) => PersonDataShareConsentService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['person-consents', personId] });
            showToast({ message: 'Consenso creato con successo', type: 'success' });
            setShowCreateModal(false);
        },
        onError: () => {
            showToast({ message: 'Errore nella creazione', type: 'error' });
        }
    });

    // Mutation per revocare consenso
    const revokeMutation = useMutation({
        mutationFn: (consentId: string) => PersonDataShareConsentService.revoke(consentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['person-consents', personId] });
            showToast({ message: 'Consenso revocato', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Errore nella revoca', type: 'error' });
        }
    });

    // Toggle espansione consenso
    const toggleExpanded = useCallback((consentId: string) => {
        setExpandedConsents(prev => {
            const next = new Set(prev);
            if (next.has(consentId)) {
                next.delete(consentId);
            } else {
                next.add(consentId);
            }
            return next;
        });
    }, []);

    // Filtra consensi
    const consents = useMemo(() => {
        let list = consentsData?.consents || [];
        if (activeOnly) {
            list = list.filter((c: PersonDataShareConsent) => getConsentStatus(c) === 'GRANTED');
        }
        return list;
    }, [consentsData, activeOnly]);

    // Consensi attivi vs storici
    const { activeConsents, historicalConsents } = useMemo(() => {
        const active = consents.filter((c: PersonDataShareConsent) => getConsentStatus(c) === 'GRANTED');
        const historical = consents.filter((c: PersonDataShareConsent) => getConsentStatus(c) !== 'GRANTED');
        return { activeConsents: active, historicalConsents: historical };
    }, [consents]);

    // Handle revoke
    const handleRevoke = useCallback(async (consent: PersonDataShareConsent) => {
        const confirmed = await confirmWarning(
            'Revoca consenso',
            'Sei sicuro di voler revocare questo consenso? Questa azione verrà registrata per conformità GDPR.'
        );
        if (confirmed) {
            revokeMutation.mutate(consent.id);
        }
    }, [revokeMutation, confirmWarning]);

    // Handle create
    const handleCreate = useCallback((data: CreateConsentInput) => {
        createMutation.mutate(data);
    }, [createMutation]);

    // Loading state
    if (isLoading) {
        return (
            <div className={`flex items-center justify-center p-4 ${className}`}>
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Caricamento consensi...</span>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className={`flex items-center gap-2 p-4 bg-red-50 rounded-lg ${className}`}>
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-700">Errore nel caricamento consensi</span>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${themeColors.primary}`} />
                    Consensi Condivisione Dati GDPR
                </h3>
                <div className="flex items-center gap-2">
                    {historicalConsents.length > 0 && (
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${showHistory ? themeColors.bg + ' ' + themeColors.primary : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <History className="w-3 h-3" />
                            Storico ({historicalConsents.length})
                        </button>
                    )}
                    {editable && currentTenantId && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className={`px-2 py-1 text-xs rounded ${themeColors.button}`}
                        >
                            <Plus className="w-3 h-3 inline mr-1" />
                            Nuovo consenso
                        </button>
                    )}
                </div>
            </div>

            {/* GDPR Info Banner */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                    I consensi per la condivisione dati tra tenant sono tracciati per conformità GDPR.
                    Ogni modifica viene registrata nel registro di audit.
                </p>
            </div>

            {/* Empty state */}
            {activeConsents.length === 0 && !showHistory && (
                <div className="flex flex-col items-center gap-2 p-6 bg-gray-50 rounded-lg">
                    <Shield className="w-8 h-8 text-gray-300" />
                    <span className="text-sm text-gray-500">Nessun consenso attivo</span>
                    <span className="text-xs text-gray-400">I dati non vengono condivisi con altri tenant</span>
                </div>
            )}

            {/* Active consents */}
            {activeConsents.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Consensi attivi ({activeConsents.length})
                    </h4>
                    {activeConsents.map((consent: PersonDataShareConsent) => (
                        <ConsentCard
                            key={consent.id}
                            consent={consent}
                            isExpanded={expandedConsents.has(consent.id)}
                            theme={theme}
                            editable={editable}
                            onToggle={() => toggleExpanded(consent.id)}
                            onRevoke={() => handleRevoke(consent)}
                        />
                    ))}
                </div>
            )}

            {/* Historical consents */}
            {showHistory && historicalConsents.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-200">
                    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Storico consensi ({historicalConsents.length})
                    </h4>
                    {historicalConsents.map((consent: PersonDataShareConsent) => (
                        <ConsentCard
                            key={consent.id}
                            consent={consent}
                            isExpanded={expandedConsents.has(consent.id)}
                            theme={theme}
                            editable={false}
                            onToggle={() => toggleExpanded(consent.id)}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && currentTenantId && (
                <CreateConsentModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreate}
                    personId={personId}
                    sourceTenantId={currentTenantId}
                    isLoading={createMutation.isPending}
                />
            )}
        </div>
    );
};

// ============================================
// CONSENT CARD SUB-COMPONENT
// ============================================

interface ConsentCardProps {
    consent: PersonDataShareConsent;
    isExpanded: boolean;
    theme: 'teal' | 'blue' | 'violet';
    editable: boolean;
    onToggle: () => void;
    onRevoke?: () => void;
}

const ConsentCard: React.FC<ConsentCardProps> = ({
    consent,
    isExpanded,
    theme,
    editable,
    onToggle,
    onRevoke
}) => {
    const status = getConsentStatus(consent);
    const statusConfig = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
    const StatusIcon = statusConfig.icon;
    const isActive = status === 'GRANTED';
    const purpose = getPurpose(consent);
    const grantedAt = getGrantedAt(consent);

    return (
        <div className={`border rounded-lg overflow-hidden ${isActive ? 'border-green-200' : 'border-gray-200'}`}>
            {/* Header */}
            <div
                className={`flex items-center justify-between p-3 cursor-pointer ${isActive ? 'bg-green-50' : 'bg-gray-50'} hover:bg-gray-100`}
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    {/* Expand icon */}
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}

                    {/* Status icon */}
                    <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />

                    {/* Tenant info */}
                    <div>
                        <div className="flex items-center gap-2">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                                {consent.sourceTenant?.name || 'Tenant origine'}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-sm font-medium text-gray-900">
                                {consent.targetTenant?.name || 'Tenant destinazione'}
                            </span>
                        </div>
                        <span className="text-xs text-gray-500">
                            {PURPOSE_LABELS[purpose] || purpose}
                        </span>
                    </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                    </span>

                    {editable && isActive && onRevoke && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRevoke(); }}
                            className="p-1 text-gray-400 hover:text-red-500 rounded"
                            title="Revoca consenso"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="p-4 border-t border-gray-100 bg-white">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Granted date */}
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">
                                Concesso: {new Date(grantedAt).toLocaleDateString('it-IT', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>

                        {/* Expiry date */}
                        {consent.validUntil && (
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className={status === 'EXPIRED' ? 'text-red-600' : 'text-gray-600'}>
                                    Scade: {new Date(consent.validUntil).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                        )}

                        {/* Revoked date */}
                        {consent.revokedAt && (
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-red-400" />
                                <span className="text-red-600">
                                    Revocato: {new Date(consent.revokedAt).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Scope - usa sharedDataTypes */}
                    {consent.sharedDataTypes && consent.sharedDataTypes.length > 0 && (
                        <div className="mt-4">
                            <span className="text-xs font-medium text-gray-500">Dati condivisi:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {consent.sharedDataTypes.map((item: string, idx: number) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Legal basis */}
                    {consent.legalBasis && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                            <div className="flex items-start gap-2">
                                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                                <div>
                                    <span className="text-xs font-medium text-gray-500">Base giuridica:</span>
                                    <p className="text-sm text-gray-600">{consent.legalBasis}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================
// CREATE CONSENT MODAL
// ============================================

const CreateConsentModal: React.FC<CreateConsentModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    personId,
    sourceTenantId,
    isLoading
}) => {
    const [formData, setFormData] = useState({
        targetTenantId: '',
        purpose: 'medical_records',
        scope: [] as string[],
        legalBasis: '',
        expiresAt: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            personId,
            sourceTenantId,
            targetTenantId: formData.targetTenantId,
            purpose: formData.purpose,
            scope: formData.scope,
            legalBasis: formData.legalBasis || undefined,
            expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : undefined
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-medium text-gray-900">Nuovo Consenso Condivisione</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Target Tenant - TODO: Add tenant selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tenant destinazione *
                        </label>
                        <input
                            type="text"
                            value={formData.targetTenantId}
                            onChange={(e) => setFormData(prev => ({ ...prev, targetTenantId: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="ID tenant destinazione"
                            required
                        />
                    </div>

                    {/* Purpose */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Finalità *
                        </label>
                        <select
                            value={formData.purpose}
                            onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            required
                        >
                            {Object.entries(PURPOSE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Legal Basis */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Base giuridica
                        </label>
                        <textarea
                            value={formData.legalBasis}
                            onChange={(e) => setFormData(prev => ({ ...prev, legalBasis: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            rows={2}
                            placeholder="Art. 6 GDPR - Consenso esplicito dell'interessato"
                        />
                    </div>

                    {/* Expiry date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data scadenza (opzionale)
                        </label>
                        <DatePickerElegante
                            value={formData.expiresAt}
                            onChange={(date) => setFormData(prev => ({ ...prev, expiresAt: date ? date.toISOString().split('T')[0] : '' }))}
                            theme="teal"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Annulla
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !formData.targetTenantId}
                            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Crea consenso
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PersonDataShareConsentWidget;
