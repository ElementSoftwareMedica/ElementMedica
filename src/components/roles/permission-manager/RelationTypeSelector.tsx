/**
 * RelationTypeSelector Component
 * 
 * Componente per selezionare il tipo di relazione per scope "relational"
 * Usato nella gestione permessi avanzati
 */

import React from 'react';
import { Select } from '../../../design-system/atoms/Select';
import { HelpCircle, Link2 } from 'lucide-react';

/**
 * Tipo per la definizione di una relazione
 */
interface RelationTypeDefinition {
    name: string;
    displayName: string;
    description: string;
    icon: string;
    applicableRoles: string[];
}

/**
 * Tipi di relazione disponibili
 */
export const RELATION_TYPES: Record<string, RelationTypeDefinition> = {
    trainer_courses: {
        name: 'trainer_courses',
        displayName: 'Formatore - Corsi Assegnati',
        description: 'Vede aziende e persone dei corsi dove è formatore',
        icon: 'Corsi',
        applicableRoles: ['TRAINER', 'SENIOR_TRAINER', 'EXTERNAL_TRAINER']
    },
    company_manager: {
        name: 'company_manager',
        displayName: 'Manager - Propria Azienda',
        description: 'Vede dipendenti e sedi della propria azienda',
        icon: 'Azienda',
        applicableRoles: ['COMPANY_MANAGER', 'COMPANY_ADMIN']
    },
    department_head: {
        name: 'department_head',
        displayName: 'Responsabile Reparto',
        description: 'Vede dipendenti del proprio reparto',
        icon: 'Reparto',
        applicableRoles: ['DEPARTMENT_HEAD', 'SUPERVISOR']
    }
} as const;

export type RelationTypeName = keyof typeof RELATION_TYPES;

interface RelationTypeSelectorProps {
    /** Valore selezionato (supporto per entrambe le API) */
    value?: string | null;
    /** Alias per value - relazione corrente (API alternativa) */
    currentRelationType?: string | null;
    /** Callback quando cambia la selezione */
    onChange?: (relationType: string | null) => void;
    /** Alias per onChange - callback cambio relazione (API alternativa) */
    onRelationTypeChange?: (relationType: string | null) => void;
    /** Ruolo corrente per filtrare relazioni applicabili */
    roleType?: string;
    /** Nome entità (per contesto) */
    entityName?: string;
    /** Disabilitato */
    disabled?: boolean;
    /** Mostra solo relazioni applicabili al ruolo */
    filterByRole?: boolean;
    /** Placeholder */
    placeholder?: string;
    /** Classe CSS aggiuntiva */
    className?: string;
    /** Modalità compatta */
    compact?: boolean;
}

/**
 * Componente per selezionare il tipo di relazione
 */
export const RelationTypeSelector: React.FC<RelationTypeSelectorProps> = ({
    value,
    currentRelationType,
    onChange,
    onRelationTypeChange,
    roleType,
    entityName,
    disabled = false,
    filterByRole = false,
    placeholder = 'Seleziona tipo relazione...',
    className = '',
    compact = false
}) => {
    // Supporto per entrambe le API
    const currentValue = value ?? currentRelationType ?? null;
    const handleChange = onChange ?? onRelationTypeChange ?? (() => { });
    // Filtra relazioni applicabili al ruolo se richiesto
    const availableRelations = React.useMemo(() => {
        const relations = Object.values(RELATION_TYPES);

        if (!filterByRole || !roleType) {
            return relations;
        }

        return relations.filter(rel =>
            rel.applicableRoles.includes(roleType)
        );
    }, [roleType, filterByRole]);

    // Costruisci opzioni per il Select
    const options = React.useMemo(() => [
        { value: '', label: placeholder },
        ...availableRelations.map(rel => ({
            value: rel.name,
            label: `${rel.icon} ${rel.displayName}`
        }))
    ], [availableRelations, placeholder]);

    // Trova la relazione selezionata per mostrare descrizione
    const selectedRelation = currentValue ? RELATION_TYPES[currentValue as RelationTypeName] : null;

    // Modalità compatta
    if (compact) {
        return (
            <div className={`${className}`} onClick={(e) => e.stopPropagation()}>
                <Select
                    value={currentValue || ''}
                    onChange={(e) => handleChange(e.target.value || null)}
                    disabled={disabled}
                    className="w-full text-xs"
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Select>
                {selectedRelation && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                        {selectedRelation.description}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                    Tipo Relazione
                    {entityName && <span className="text-gray-400 ml-1">({entityName})</span>}
                </label>
            </div>

            <Select
                value={currentValue || ''}
                onChange={(e) => handleChange(e.target.value || null)}
                disabled={disabled}
                className="w-full"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </Select>

            {selectedRelation && (
                <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-md">
                    <HelpCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                        {selectedRelation.description}
                    </p>
                </div>
            )}

            {availableRelations.length === 0 && filterByRole && roleType && (
                <p className="text-xs text-amber-600">
                    Nessuna relazione predefinita per il ruolo {roleType}.
                    Puoi comunque selezionare una relazione personalizzata.
                </p>
            )}
        </div>
    );
};

/**
 * Hook per ottenere relazioni per un ruolo
 */
export const useRelationTypesForRole = (roleType: string | undefined) => {
    return React.useMemo(() => {
        if (!roleType) return Object.values(RELATION_TYPES);

        return Object.values(RELATION_TYPES).filter(rel =>
            rel.applicableRoles.includes(roleType)
        );
    }, [roleType]);
};

export default RelationTypeSelector;
