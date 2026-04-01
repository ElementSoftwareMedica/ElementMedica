/**
 * AccessControlCard - Card for managing visit access control and confidentiality
 * 
 * Allows setting:
 * - Access level: All, Branch Medics, Selected, Author Only
 * - Confidentiality: Normal, Restricted, Highly Restricted
 * - Option to apply settings as default for all referti
 * 
 * @module pages/clinica/clinica/components/AccessControlCard
 * @project P52 - Clinical Visit Template System
 */

import React, { useState, useCallback } from 'react';
import {
    Shield,
    Lock,
    Eye,
    Users,
    User,
    UserCheck,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Settings,
    Info
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

import type { VisitAccessControl, VisitConfidentiality } from '../../../../services/clinicaApi';

/**
 * Access level for referti (UI-specific)
 */
export type AccessLevel = 'ALL' | 'BRANCH_MEDICS' | 'SELECTED' | 'AUTHOR_ONLY';

/**
 * Confidentiality level (matches Prisma enum VisitConfidentiality)
 */
export type ConfidentialityLevel = VisitConfidentiality;

/**
 * Access control configuration for UI
 * Extends VisitAccessControl with UI-specific fields
 */
export interface AccessControlConfig extends Omit<VisitAccessControl, 'allowedRoleTypes' | 'allowedSpecialties' | 'denyPersonIds'> {
    accessLevel: AccessLevel;
    applyAsDefault?: boolean;
}

/**
 * Convert AccessControlConfig to VisitAccessControl for API
 */
export function toVisitAccessControl(config: AccessControlConfig): VisitAccessControl {
    const roleTypes: string[] = [];

    // Map accessLevel to roleTypes
    if (config.accessLevel === 'BRANCH_MEDICS') {
        roleTypes.push('MEDICO');
    } else if (config.accessLevel === 'AUTHOR_ONLY') {
        // No allowedRoleTypes = author only
    } else if (config.accessLevel === 'ALL') {
        roleTypes.push('MEDICO', 'INFERMIERE', 'SEGRETERIA', 'ADMIN');
    }

    return {
        confidentiality: config.confidentiality,
        allowedPersonIds: config.allowedPersonIds,
        allowedRoleTypes: roleTypes.length > 0 ? roleTypes : undefined
    };
}

interface AccessControlCardProps {
    value: AccessControlConfig;
    onChange: (config: AccessControlConfig) => void;
    disabled?: boolean;
    medicibranca?: Array<{ id: string; nome: string; cognome: string }>;
    className?: string;
}

// ============================================
// CONSTANTS
// ============================================

const ACCESS_LEVELS: Array<{ value: AccessLevel; label: string; description: string; icon: React.ElementType }> = [
    {
        value: 'ALL',
        label: 'Tutti gli utenti',
        description: 'Tutti gli utenti con accesso alle visite possono visualizzare',
        icon: Users
    },
    {
        value: 'BRANCH_MEDICS',
        label: 'Medici della branca',
        description: 'Solo i medici della stessa specializzazione',
        icon: UserCheck
    },
    {
        value: 'SELECTED',
        label: 'Utenti selezionati',
        description: 'Solo gli utenti selezionati manualmente',
        icon: User
    },
    {
        value: 'AUTHOR_ONLY',
        label: 'Solo autore',
        description: 'Solo chi ha creato la visita può visualizzarla',
        icon: Lock
    }
];

const CONFIDENTIALITY_LEVELS: Array<{ value: ConfidentialityLevel; label: string; description: string; color: string }> = [
    {
        value: 'NORMAL',
        label: 'Normale',
        description: 'Riservatezza standard per dati sanitari',
        color: 'bg-green-100 text-green-700 border-green-300'
    },
    {
        value: 'RESTRICTED',
        label: 'Ristretta',
        description: 'Dati sanitari fortemente confidenziali (es. HIV, dipendenze)',
        color: 'bg-amber-100 text-amber-700 border-amber-300'
    },
    {
        value: 'HIGHLY_RESTRICTED',
        label: 'Molto ristretta',
        description: 'Dati a maggior tutela dell\'anonimato (es. psichiatria, IVG)',
        color: 'bg-red-100 text-red-700 border-red-300'
    }
];

// ============================================
// COMPONENT
// ============================================

export const AccessControlCard: React.FC<AccessControlCardProps> = ({
    value,
    onChange,
    disabled = false,
    medicibranca = [],
    className = ''
}) => {
    // Default to collapsed for cleaner UI - user can expand when needed
    const [isExpanded, setIsExpanded] = useState(false);
    const [showPersonSelector, setShowPersonSelector] = useState(false);

    // ============================================
    // HANDLERS
    // ============================================

    const handleAccessLevelChange = useCallback((level: AccessLevel) => {
        onChange({
            ...value,
            accessLevel: level,
            // Reset selected persons when changing from SELECTED
            allowedPersonIds: level === 'SELECTED' ? (value.allowedPersonIds || []) : undefined
        });
        // Show person selector when SELECTED is chosen
        setShowPersonSelector(level === 'SELECTED');
    }, [value, onChange]);

    const handleConfidentialityChange = useCallback((level: ConfidentialityLevel) => {
        onChange({
            ...value,
            confidentiality: level
        });
    }, [value, onChange]);

    const handleApplyAsDefaultChange = useCallback((checked: boolean) => {
        onChange({
            ...value,
            applyAsDefault: checked
        });
    }, [value, onChange]);

    const handlePersonToggle = useCallback((personId: string) => {
        const currentIds = value.allowedPersonIds || [];
        const newIds = currentIds.includes(personId)
            ? currentIds.filter(id => id !== personId)
            : [...currentIds, personId];

        onChange({
            ...value,
            allowedPersonIds: newIds
        });
    }, [value, onChange]);

    // ============================================
    // RENDER
    // ============================================

    const currentAccessLevel = ACCESS_LEVELS.find(l => l.value === value.accessLevel);
    const currentConfidentiality = CONFIDENTIALITY_LEVELS.find(l => l.value === value.confidentiality);

    return (
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
            {/* Header - Collapsed by default for cleaner UI */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-100 bg-gray-50 rounded-t-xl hover:bg-gray-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-teal-600" />
                    <h3 className="text-sm font-semibold text-gray-700">Accesso e Riservatezza</h3>
                    {/* Show current settings when collapsed */}
                    {!isExpanded && (
                        <span className="ml-2 text-xs text-gray-500">
                            ({currentAccessLevel?.label?.split(' ')[0]} - {currentConfidentiality?.label})
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="p-4 space-y-6">
                    {/* Access Level Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Eye className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Accesso ai Referti</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {ACCESS_LEVELS.map((level) => {
                                const Icon = level.icon;
                                const isSelected = value.accessLevel === level.value;

                                return (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => handleAccessLevelChange(level.value)}
                                        disabled={disabled}
                                        className={`
                                            w-full flex items-start gap-3 p-3 rounded-lg border text-left
                                            transition-all duration-150
                                            ${isSelected
                                                ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }
                                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                        `}
                                    >
                                        <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-teal-600' : 'text-gray-400'}`} />
                                        <div>
                                            <div className={`text-sm font-medium ${isSelected ? 'text-teal-700' : 'text-gray-700'}`}>
                                                {level.label}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {level.description}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Person Selector (for SELECTED mode) */}
                        {value.accessLevel === 'SELECTED' && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="h-4 w-4 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600">Seleziona utenti autorizzati</span>
                                </div>

                                {medicibranca.length > 0 ? (
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {medicibranca.map((medico) => (
                                            <label
                                                key={medico.id}
                                                className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={value.allowedPersonIds?.includes(medico.id) || false}
                                                    onChange={() => handlePersonToggle(medico.id)}
                                                    disabled={disabled}
                                                    className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                                />
                                                <span className="text-sm text-gray-700">
                                                    {medico.cognome} {medico.nome}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 italic">
                                        Nessun medico disponibile per la selezione
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <hr className="border-gray-200" />

                    {/* Confidentiality Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Lock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Livello di Riservatezza</span>
                        </div>

                        <div className="space-y-2">
                            {CONFIDENTIALITY_LEVELS.map((level) => {
                                const isSelected = value.confidentiality === level.value;

                                return (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => handleConfidentialityChange(level.value)}
                                        disabled={disabled}
                                        className={`
                                            w-full flex items-center justify-between p-3 rounded-lg border text-left
                                            transition-all duration-150
                                            ${isSelected
                                                ? `${level.color} ring-2 ring-offset-1`
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }
                                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                        `}
                                    >
                                        <div>
                                            <div className={`text-sm font-medium ${isSelected ? '' : 'text-gray-700'}`}>
                                                {level.label}
                                            </div>
                                            <div className={`text-xs mt-0.5 ${isSelected ? 'opacity-80' : 'text-gray-500'}`}>
                                                {level.description}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="ml-2">
                                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Warning for restricted levels */}
                    {(value.confidentiality === 'RESTRICTED' || value.confidentiality === 'HIGHLY_RESTRICTED') && (
                        <div className={`
                            flex items-start gap-2 p-3 rounded-lg
                            ${value.confidentiality === 'HIGHLY_RESTRICTED'
                                ? 'bg-red-50 border border-red-200'
                                : 'bg-amber-50 border border-amber-200'
                            }
                        `}>
                            <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${value.confidentiality === 'HIGHLY_RESTRICTED' ? 'text-red-500' : 'text-amber-500'
                                }`} />
                            <p className={`text-xs ${value.confidentiality === 'HIGHLY_RESTRICTED' ? 'text-red-700' : 'text-amber-700'
                                }`}>
                                {value.confidentiality === 'HIGHLY_RESTRICTED'
                                    ? 'I dati con riservatezza "molto ristretta" sono accessibili solo all\'autore e richiedono autorizzazione specifica per la visualizzazione da parte di altri operatori.'
                                    : 'I dati con riservatezza "ristretta" sono protetti da accesso non autorizzato e registrati in audit trail specifico.'
                                }
                            </p>
                        </div>
                    )}

                    {/* Divider */}
                    <hr className="border-gray-200" />

                    {/* Apply as Default Option */}
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <input
                            type="checkbox"
                            id="applyAsDefault"
                            checked={value.applyAsDefault || false}
                            onChange={(e) => handleApplyAsDefaultChange(e.target.checked)}
                            disabled={disabled}
                            className="h-4 w-4 mt-0.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="applyAsDefault" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-2">
                                <Settings className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">
                                    Applica come predefinito
                                </span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                                Questa configurazione sarà applicata automaticamente a tutti i nuovi referti creati da questo account
                            </p>
                        </label>
                    </div>

                    {/* Info Box */}
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                        <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-500">
                            Le impostazioni di accesso e riservatezza sono conformi al GDPR e alle normative sulla privacy sanitaria.
                            Ogni accesso viene tracciato nell'audit log.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessControlCard;
