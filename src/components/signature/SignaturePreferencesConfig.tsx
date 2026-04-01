/**
 * P65 - Signature Preferences Configuration
 * 
 * Componente per configurare le preferenze di firma del medico.
 * Tipi disponibili: SEMPLICE (base) e GRAFOMETRICA (biometrica integrata).
 * 
 * @module components/signature/SignaturePreferencesConfig
 */

import React, { useState } from 'react';
import {
    PenLine,
    Fingerprint,
    CheckCircle2,
    Info
} from 'lucide-react';
import {
    useSignaturePreferences,
    type TipoFirma
} from '../../hooks/signature/useSignature';

// ============================================
// TYPES
// ============================================

interface SignatureTypeOption {
    type: TipoFirma;
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
}

// ============================================
// CONSTANTS
// ============================================

const SIGNATURE_TYPE_OPTIONS: SignatureTypeOption[] = [
    {
        type: 'SEMPLICE',
        label: 'Firma Semplice',
        description: 'Firma base con validità interna. Ideale per documenti a basso rischio legale.',
        icon: PenLine,
        color: 'text-gray-600'
    },
    {
        type: 'GRAFOMETRICA',
        label: 'Firma Grafometrica',
        description: 'Firma con rilevamento biometrico della scrittura. Validità legale elevata.',
        icon: Fingerprint,
        color: 'text-teal-600'
    }
];

// ============================================
// SUB-COMPONENTS
// ============================================

interface SignatureCardProps {
    option: SignatureTypeOption;
    isSelected: boolean;
    onSelect: () => void;
    isUpdating: boolean;
}

function SignatureCard({
    option,
    isSelected,
    onSelect,
    isUpdating
}: SignatureCardProps) {
    const Icon = option.icon;

    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={isUpdating}
            className={`
                relative w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                ${isSelected
                    ? 'border-teal-500 bg-teal-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
                ${isUpdating ? 'pointer-events-none' : ''}
            `}
        >
            {/* Selection indicator */}
            {isSelected && (
                <div className="absolute top-3 right-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-600" />
                </div>
            )}

            {/* Header */}
            <div className="flex items-start gap-3 mb-2">
                <div className={`
                    flex items-center justify-center w-10 h-10 rounded-lg
                    ${isSelected ? 'bg-teal-100' : 'bg-gray-100'}
                `}>
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-teal-600' : option.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${isSelected ? 'text-teal-900' : 'text-gray-900'}`}>
                        {option.label}
                    </h4>
                </div>
            </div>

            {/* Description */}
            <p className={`text-sm ${isSelected ? 'text-teal-700' : 'text-gray-600'} ml-13`}>
                {option.description}
            </p>
        </button>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

interface SignaturePreferencesConfigProps {
    className?: string;
    onSave?: (type: TipoFirma) => void;
    showTitle?: boolean;
    compact?: boolean;
}

export function SignaturePreferencesConfig({
    className = '',
    onSave,
    showTitle = true,
    compact = false
}: SignaturePreferencesConfigProps) {
    const {
        preferredType,
        updatePreference,
        isLoading,
        isUpdating
    } = useSignaturePreferences();

    const [selectedType, setSelectedType] = useState<TipoFirma | null>(null);

    const handleSelect = (type: TipoFirma) => {
        setSelectedType(type);
    };

    const handleSave = async () => {
        if (!selectedType) return;

        try {
            await updatePreference(selectedType);
            onSave?.(selectedType);
            setSelectedType(null);
        } catch {
            // Error handled in hook
        }
    };

    const handleCancel = () => {
        setSelectedType(null);
    };

    const hasChanges = selectedType !== null && selectedType !== preferredType;
    const currentSelection = selectedType ?? preferredType;

    if (isLoading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2].map(i => (
                        <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Header */}
            {showTitle && (
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Preferenze Firma Digitale
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Seleziona il tipo di firma predefinito per i tuoi referti.
                    </p>
                </div>
            )}

            {/* Signature Type Cards */}
            <div className={`space-y-3 ${compact ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
                {SIGNATURE_TYPE_OPTIONS.map(option => (
                    <SignatureCard
                        key={option.type}
                        option={option}
                        isSelected={currentSelection === option.type}
                        onSelect={() => handleSelect(option.type)}
                        isUpdating={isUpdating}
                    />
                ))}
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                        <p className="font-medium">Come funziona?</p>
                        <p className="mt-1">
                            La firma scelta verrà applicata automaticamente quando firmi un referto.
                            Puoi sempre cambiare la preferenza in qualsiasi momento.
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            {hasChanges && (
                <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isUpdating}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Annulla
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isUpdating}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isUpdating && (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}
                        Salva Preferenza
                    </button>
                </div>
            )}
        </div>
    );
}

export default SignaturePreferencesConfig;
