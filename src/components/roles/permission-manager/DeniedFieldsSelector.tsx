/**
 * DeniedFieldsSelector Component
 * 
 * Componente per gestire i campi permessi/negati per un permesso
 * Usato insieme a RelationTypeSelector per scope "relational"
 */

import React from 'react';
import { X, Plus, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';

/**
 * Campi comuni per entità
 */
const ENTITY_FIELDS: Record<string, { name: string; label: string; sensitive: boolean }[]> = {
    persons: [
        { name: 'id', label: 'ID', sensitive: false },
        { name: 'firstName', label: 'Nome', sensitive: false },
        { name: 'lastName', label: 'Cognome', sensitive: false },
        { name: 'email', label: 'Email', sensitive: false },
        { name: 'phone', label: 'Telefono', sensitive: false },
        { name: 'fiscalCode', label: 'Codice Fiscale', sensitive: true },
        { name: 'birthDate', label: 'Data Nascita', sensitive: true },
        { name: 'birthPlace', label: 'Luogo Nascita', sensitive: true },
        { name: 'address', label: 'Indirizzo', sensitive: true },
        { name: 'salary', label: 'Stipendio', sensitive: true },
        { name: 'bankAccount', label: 'IBAN', sensitive: true },
        { name: 'notes', label: 'Note', sensitive: false }
    ],
    companies: [
        { name: 'id', label: 'ID', sensitive: false },
        { name: 'ragioneSociale', label: 'Ragione Sociale', sensitive: false },
        { name: 'partitaIva', label: 'Partita IVA', sensitive: false },
        { name: 'codiceFiscale', label: 'Codice Fiscale', sensitive: false },
        { name: 'pec', label: 'PEC', sensitive: false },
        { name: 'sdi', label: 'Codice SDI', sensitive: false },
        { name: 'iban', label: 'IBAN', sensitive: true },
        { name: 'telefono', label: 'Telefono', sensitive: false },
        { name: 'email', label: 'Email', sensitive: false },
        { name: 'indirizzo', label: 'Indirizzo', sensitive: false },
        { name: 'citta', label: 'Città', sensitive: false },
        { name: 'cap', label: 'CAP', sensitive: false }
    ],
    schedules: [
        { name: 'id', label: 'ID', sensitive: false },
        { name: 'startDate', label: 'Data Inizio', sensitive: false },
        { name: 'endDate', label: 'Data Fine', sensitive: false },
        { name: 'location', label: 'Luogo', sensitive: false },
        { name: 'status', label: 'Stato', sensitive: false },
        { name: 'notes', label: 'Note', sensitive: false },
        { name: 'attendance', label: 'Presenze', sensitive: false },
        { name: 'maxParticipants', label: 'Max Partecipanti', sensitive: false }
    ],
    courses: [
        { name: 'id', label: 'ID', sensitive: false },
        { name: 'name', label: 'Nome Corso', sensitive: false },
        { name: 'description', label: 'Descrizione', sensitive: false },
        { name: 'duration', label: 'Durata', sensitive: false },
        { name: 'price', label: 'Prezzo', sensitive: true },
        { name: 'category', label: 'Categoria', sensitive: false }
    ]
};

interface DeniedFieldsSelectorProps {
    /** Risorsa (es: "persons", "companies") */
    resource?: string;
    /** Entità (alternativa a resource, include fields e name) */
    entity?: { name: string; fields?: { name: string; displayName?: string }[] };
    /** Campi permessi */
    allowedFields: string[] | null;
    /** Campi negati */
    deniedFields: string[] | null;
    /** Callback per aggiornare campi permessi */
    onAllowedFieldsChange: (fields: string[] | null) => void;
    /** Callback per aggiornare campi negati */
    onDeniedFieldsChange: (fields: string[] | null) => void;
    /** Disabilitato */
    disabled?: boolean;
    /** Mostra solo campi sensibili */
    showOnlySensitive?: boolean;
    /** Classe CSS aggiuntiva */
    className?: string;
}

type FieldMode = 'all' | 'allowed' | 'denied';

/**
 * Componente per gestire campi permessi/negati
 */
export const DeniedFieldsSelector: React.FC<DeniedFieldsSelectorProps> = ({
    resource,
    entity,
    allowedFields,
    deniedFields,
    onAllowedFieldsChange,
    onDeniedFieldsChange,
    disabled = false,
    showOnlySensitive = false,
    className = ''
}) => {
    // Determina il nome della risorsa (da resource o entity)
    const resourceName = resource || entity?.name || '';

    // Ottieni campi disponibili per la risorsa
    const availableFields = React.useMemo(() => {
        // Se entity ha fields, usali direttamente
        if (entity?.fields && entity.fields.length > 0) {
            return entity.fields.map(f => ({
                name: f.name,
                label: f.displayName || f.name,
                sensitive: false // I campi entity non hanno info sulla sensibilità
            }));
        }

        // Altrimenti usa i campi predefiniti
        const fields = ENTITY_FIELDS[resourceName] || [];
        if (showOnlySensitive) {
            return fields.filter(f => f.sensitive);
        }
        return fields;
    }, [entity?.fields, resourceName, showOnlySensitive]);

    // Determina la modalità corrente
    const mode: FieldMode = React.useMemo(() => {
        if (deniedFields && deniedFields.length > 0) return 'denied';
        if (allowedFields && allowedFields.length > 0 && !allowedFields.includes('*')) return 'allowed';
        return 'all';
    }, [allowedFields, deniedFields]);

    // Cambia modalità
    const handleModeChange = (newMode: FieldMode) => {
        if (newMode === 'all') {
            onAllowedFieldsChange(null);
            onDeniedFieldsChange(null);
        } else if (newMode === 'allowed') {
            onAllowedFieldsChange(['id']); // Inizia con solo ID
            onDeniedFieldsChange(null);
        } else if (newMode === 'denied') {
            onAllowedFieldsChange(null);
            onDeniedFieldsChange([]); // Inizia vuoto
        }
    };

    // Toggle campo specifico
    const toggleField = (fieldName: string) => {
        if (mode === 'allowed') {
            const current = allowedFields || [];
            if (current.includes(fieldName)) {
                // Non permettere di rimuovere 'id'
                if (fieldName === 'id') return;
                onAllowedFieldsChange(current.filter(f => f !== fieldName));
            } else {
                onAllowedFieldsChange([...current, fieldName]);
            }
        } else if (mode === 'denied') {
            const current = deniedFields || [];
            if (current.includes(fieldName)) {
                onDeniedFieldsChange(current.filter(f => f !== fieldName));
            } else {
                onDeniedFieldsChange([...current, fieldName]);
            }
        }
    };

    // Verifica se un campo è selezionato
    const isFieldSelected = (fieldName: string): boolean => {
        if (mode === 'all') return true;
        if (mode === 'allowed') return allowedFields?.includes(fieldName) ?? false;
        if (mode === 'denied') return !(deniedFields?.includes(fieldName) ?? false);
        return true;
    };

    // Aggiungi tutti i campi sensibili a denied
    const denyAllSensitive = () => {
        const sensitiveFields = availableFields
            .filter(f => f.sensitive)
            .map(f => f.name);
        onDeniedFieldsChange(sensitiveFields);
    };

    // Permetti tutti i campi non sensibili
    const allowNonSensitive = () => {
        const nonSensitiveFields = availableFields
            .filter(f => !f.sensitive)
            .map(f => f.name);
        onAllowedFieldsChange(nonSensitiveFields);
        onDeniedFieldsChange(null);
    };

    if (availableFields.length === 0) {
        return (
            <div className={`text-sm text-gray-500 ${className}`}>
                Nessun campo configurabile per questa risorsa
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Mode selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Visibilità Campi:</span>
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                    <button
                        type="button"
                        onClick={() => handleModeChange('all')}
                        disabled={disabled}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === 'all'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Tutti
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeChange('allowed')}
                        disabled={disabled}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === 'allowed'
                                ? 'bg-white text-green-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Solo Permessi
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeChange('denied')}
                        disabled={disabled}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${mode === 'denied'
                                ? 'bg-white text-red-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        Escludi Alcuni
                    </button>
                </div>
            </div>

            {/* Quick actions */}
            {mode !== 'all' && (
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={denyAllSensitive}
                        disabled={disabled}
                        className="text-xs"
                    >
                        <EyeOff className="h-3 w-3 mr-1" />
                        Nascondi Sensibili
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={allowNonSensitive}
                        disabled={disabled}
                        className="text-xs"
                    >
                        <Eye className="h-3 w-3 mr-1" />
                        Solo Non-Sensibili
                    </Button>
                </div>
            )}

            {/* Field list */}
            {mode !== 'all' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableFields.map(field => {
                        const isSelected = isFieldSelected(field.name);
                        const isLocked = mode === 'allowed' && field.name === 'id';

                        return (
                            <button
                                key={field.name}
                                type="button"
                                onClick={() => !isLocked && toggleField(field.name)}
                                disabled={disabled || isLocked}
                                className={`
                  flex items-center gap-2 p-2 rounded-md text-left text-sm
                  transition-colors border
                  ${isSelected
                                        ? 'bg-green-50 border-green-200 text-green-800'
                                        : 'bg-red-50 border-red-200 text-red-800'
                                    }
                  ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}
                `}
                            >
                                {isSelected ? (
                                    <Eye className="h-4 w-4 text-green-600" />
                                ) : (
                                    <EyeOff className="h-4 w-4 text-red-600" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{field.label}</div>
                                    {field.sensitive && (
                                        <div className="text-xs text-amber-600">🔒 Sensibile</div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Summary */}
            {mode !== 'all' && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    {mode === 'allowed' && (
                        <>
                            <strong>Campi visibili:</strong> {allowedFields?.join(', ') || 'Nessuno'}
                        </>
                    )}
                    {mode === 'denied' && (
                        <>
                            <strong>Campi nascosti:</strong> {deniedFields?.join(', ') || 'Nessuno'}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Hook per ottenere campi di un'entità
 */
export const useEntityFields = (resource: string) => {
    return React.useMemo(() => ENTITY_FIELDS[resource] || [], [resource]);
};

export default DeniedFieldsSelector;
