/**
 * Tab Campi - Field builder con supporto completo tipi e logica condizionale
 * 
 * Supporta: text, textarea, number, date, email, phone, boolean, 
 *           select, radio, multiselect, signature
 * Ogni campo può avere una condizione per essere visibile solo se 
 * un altro campo soddisfa un criterio specifico.
 * 
 * @module pages/clinica/impostazioni/modulistica/components
 */

import React, { useState, useCallback } from 'react';
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    GripVertical,
    Info,
    GitBranch,
    AlertCircle,
    Copy
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CampoTemplate, CampoTemplateType, CampoCondition, FormData } from './types';
import { TIPI_CAMPO, CONDITION_OPERATORS } from './types';

// ============================================
// TYPES
// ============================================

interface TabCampiProps {
    campi: CampoTemplate[];
    errors: Record<string, string>;
    onUpdate: (campi: CampoTemplate[]) => void;
    /** Tutti i campi disponibili per le condizioni (escluso il corrente) */
    allFieldNames?: string[];
    /** Se il template ha scoring abilitato */
    haScoring?: boolean;
}

// ============================================
// HELPERS
// ============================================

/** Tipi che richiedono opzioni */
const TYPES_WITH_OPTIONS: CampoTemplateType[] = ['select', 'multiselect', 'radio'];

/** Tipi che supportano min/max validation */
const TYPES_WITH_MINMAX: CampoTemplateType[] = ['number', 'text', 'textarea'];

import { getOptionLabel, getOptionValue } from '@/utils/optionHelpers';

// ============================================
// SUB-COMPONENTS
// ============================================

/** Editor per le opzioni di select/radio/multiselect */
const OptionsEditor: React.FC<{
    options: string[];
    onChange: (options: string[]) => void;
    error?: string;
    fieldType: CampoTemplateType;
}> = ({ options, onChange, error, fieldType }) => {
    const [newOption, setNewOption] = useState('');

    const addOption = () => {
        const trimmed = newOption.trim();
        if (trimmed && !options.includes(trimmed)) {
            onChange([...options, trimmed]);
            setNewOption('');
        }
    };

    const removeOption = (index: number) => {
        onChange(options.filter((_, i) => i !== index));
    };

    const typeLabel = fieldType === 'radio' ? 'radio' : fieldType === 'multiselect' ? 'checkbox' : 'opzione';

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                Opzioni *
                <span className="ml-1 text-xs text-gray-400 font-normal">
                    ({fieldType === 'multiselect' ? 'selezione multipla' : 'selezione singola'})
                </span>
            </label>

            {/* Lista opzioni esistenti */}
            {options.length > 0 && (
                <div className="space-y-1">
                    {options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2 group">
                            <span className="flex items-center justify-center w-5 h-5 text-gray-400">
                                {fieldType === 'radio' ? (
                                    <div className="w-3.5 h-3.5 border-2 border-gray-300 rounded-full" />
                                ) : fieldType === 'multiselect' ? (
                                    <div className="w-3.5 h-3.5 border-2 border-gray-300 rounded" />
                                ) : (
                                    <span className="text-xs">{i + 1}.</span>
                                )}
                            </span>
                            <span className="flex-1 text-sm text-gray-700 px-2 py-1 bg-gray-50 rounded">
                                {getOptionLabel(opt)}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeOption(i)}
                                className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Aggiungi opzione */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder={`Aggiungi ${typeLabel}...`}
                />
                <button
                    type="button"
                    onClick={addOption}
                    disabled={!newOption.trim()}
                    className="px-3 py-1.5 text-sm bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {error && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="w-3 h-3" /> {error}
                </p>
            )}
        </div>
    );
};

/** Editor per la logica condizionale */
const ConditionEditor: React.FC<{
    condition?: CampoCondition;
    onChange: (condition: CampoCondition | undefined) => void;
    availableFields: { name: string; label: string; type: CampoTemplateType; options?: string[] }[];
}> = ({ condition, onChange, availableFields }) => {
    const [isEnabled, setIsEnabled] = useState(!!condition);

    const handleToggle = (enabled: boolean) => {
        setIsEnabled(enabled);
        if (!enabled) {
            onChange(undefined);
        } else if (!condition && availableFields.length > 0) {
            const firstField = availableFields[0];
            onChange({
                fieldName: firstField.name,
                operator: 'equals',
                value: firstField.type === 'boolean' ? 'Sì' : ''
            });
        }
    };

    const selectedField = availableFields.find(f => f.name === condition?.fieldName);
    const needsValue = condition?.operator !== 'isEmpty' && condition?.operator !== 'isNotEmpty';

    // Determine value input type based on source field
    const isSourceBoolean = selectedField?.type === 'boolean';
    const isSourceSelect = selectedField?.type === 'select' || selectedField?.type === 'radio';
    const sourceOptions = selectedField?.options || [];

    if (availableFields.length === 0) {
        return (
            <div className="px-3 py-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 italic">
                    Aggiungi altri campi prima di poter usare le condizioni
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleToggle(e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                />
                <GitBranch className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">Mostra condizionalmente</span>
            </label>

            {isEnabled && condition && (
                <div className="ml-6 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                    <p className="text-xs text-amber-700 font-medium">Mostra questo campo solo quando:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Campo di riferimento */}
                        <select
                            value={condition.fieldName}
                            onChange={(e) => onChange({ ...condition, fieldName: e.target.value })}
                            className="px-2 py-1.5 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white"
                        >
                            {availableFields.map(f => (
                                <option key={f.name} value={f.name}>{f.label || f.name}</option>
                            ))}
                        </select>

                        {/* Operatore */}
                        <select
                            value={condition.operator}
                            onChange={(e) => onChange({ ...condition, operator: e.target.value as CampoCondition['operator'] })}
                            className="px-2 py-1.5 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white"
                        >
                            {CONDITION_OPERATORS.map(op => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                        </select>

                        {/* Valore — smart input based on source field type */}
                        {needsValue && isSourceBoolean && (
                            <select
                                value={String(condition.value ?? '')}
                                onChange={(e) => onChange({ ...condition, value: e.target.value })}
                                className="px-2 py-1.5 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white"
                            >
                                <option value="Sì">Sì</option>
                                <option value="No">No</option>
                            </select>
                        )}
                        {needsValue && isSourceSelect && sourceOptions.length > 0 && (
                            <select
                                value={String(condition.value ?? '')}
                                onChange={(e) => onChange({ ...condition, value: e.target.value })}
                                className="px-2 py-1.5 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white"
                            >
                                <option value="">Seleziona valore...</option>
                                {sourceOptions.map((opt, idx) => (
                                    <option key={idx} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                                ))}
                            </select>
                        )}
                        {needsValue && !isSourceBoolean && !(isSourceSelect && sourceOptions.length > 0) && (
                            <input
                                type="text"
                                value={String(condition.value ?? '')}
                                onChange={(e) => onChange({ ...condition, value: e.target.value })}
                                className="px-2 py-1.5 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400"
                                placeholder="Valore..."
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// SORTABLE CAMPO ITEM
// ============================================

interface SortableCampoItemProps {
    campo: CampoTemplate;
    index: number;
    campiLength: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (updates: Partial<CampoTemplate>) => void;
    onDuplicate: () => void;
    onRemove: () => void;
    otherFields: { name: string; label: string; type: CampoTemplateType; fieldName: string; options?: string[] }[];
    errors: Record<string, string>;
    haScoring?: boolean;
}

const SortableCampoItem: React.FC<SortableCampoItemProps> = ({
    campo, index, isExpanded, onToggleExpand, onUpdate, onDuplicate, onRemove, otherFields, errors, haScoring = false
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: campo.name || `campo-${index}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.8 : 1,
    };

    const tipoInfo = TIPI_CAMPO.find(t => t.value === campo.type);
    const hasOptions = TYPES_WITH_OPTIONS.includes(campo.type);
    const hasCondition = !!campo.condition;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`border rounded-lg overflow-hidden transition-colors ${isDragging ? 'shadow-lg ring-2 ring-teal-400' : ''
                } ${hasCondition ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'}`}
        >
            {/* Header */}
            <div
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${hasCondition ? 'bg-amber-50 hover:bg-amber-100/70' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                onClick={onToggleExpand}
            >
                {/* Drag handle */}
                <button
                    type="button"
                    className="touch-none cursor-grab active:cursor-grabbing p-1 -m-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200/50 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    {...attributes}
                    {...listeners}
                    title="Trascina per riordinare"
                >
                    <GripVertical className="w-4 h-4" />
                </button>

                <span className="text-xs text-gray-400 font-mono w-5 text-center">{index + 1}</span>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                            {campo.label || campo.name}
                        </span>
                        {campo.required && (
                            <span className="text-xs text-red-600 font-bold">*</span>
                        )}
                        {hasCondition && (
                            <GitBranch className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        )}
                    </div>
                    <span className="text-xs text-gray-500">
                        {tipoInfo?.label}
                        {hasOptions && campo.options && ` · ${campo.options.length} opzioni`}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                        className="p-1 text-gray-400 hover:text-teal-600"
                        title="Duplica campo"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Elimina campo"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="p-4 space-y-4 border-t border-gray-200 bg-white">
                    {/* Nome e Etichetta */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome campo (ID) *
                            </label>
                            <input
                                type="text"
                                value={campo.name}
                                onChange={(e) => onUpdate({ name: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 font-mono text-sm ${errors[`campo_${index}_name`] ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                placeholder="nome_campo"
                            />
                            {errors[`campo_${index}_name`] && (
                                <p className="mt-1 text-xs text-red-600">{errors[`campo_${index}_name`]}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Etichetta (domanda) *
                            </label>
                            <input
                                type="text"
                                value={campo.label}
                                onChange={(e) => onUpdate({ label: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 ${errors[`campo_${index}_label`] ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                placeholder="Es. Soffre di allergie?"
                            />
                            {errors[`campo_${index}_label`] && (
                                <p className="mt-1 text-xs text-red-600">{errors[`campo_${index}_label`]}</p>
                            )}
                        </div>
                    </div>

                    {/* Tipo, Placeholder, Required */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo di risposta
                            </label>
                            <select
                                value={campo.type}
                                onChange={(e) => onUpdate({ type: e.target.value as CampoTemplateType })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                {TIPI_CAMPO.map(t => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-400">{TIPI_CAMPO.find(t => t.value === campo.type)?.description}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Placeholder
                            </label>
                            <input
                                type="text"
                                value={campo.placeholder || ''}
                                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                placeholder="Testo suggerimento..."
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                checked={campo.required}
                                onChange={(e) => onUpdate({ required: e.target.checked })}
                                className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Obbligatorio</span>
                        </div>
                    </div>

                    {/* Opzioni per select/radio/multiselect */}
                    {hasOptions && (
                        <OptionsEditor
                            options={campo.options || []}
                            onChange={(options) => onUpdate({ options })}
                            error={errors[`campo_${index}_options`]}
                            fieldType={campo.type}
                        />
                    )}

                    {/* Validazione min/max per number/text */}
                    {TYPES_WITH_MINMAX.includes(campo.type) && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {campo.type === 'number' ? 'Valore minimo' : 'Lunghezza minima'}
                                </label>
                                <input
                                    type="number"
                                    value={campo.validation?.min ?? ''}
                                    onChange={(e) => onUpdate({
                                        validation: {
                                            ...campo.validation,
                                            min: e.target.value ? parseInt(e.target.value) : undefined
                                        }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {campo.type === 'number' ? 'Valore massimo' : 'Lunghezza massima'}
                                </label>
                                <input
                                    type="number"
                                    value={campo.validation?.max ?? ''}
                                    onChange={(e) => onUpdate({
                                        validation: {
                                            ...campo.validation,
                                            max: e.target.value ? parseInt(e.target.value) : undefined
                                        }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Testo di aiuto */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Testo di aiuto
                        </label>
                        <input
                            type="text"
                            value={campo.helpText || ''}
                            onChange={(e) => onUpdate({ helpText: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            placeholder="Es. Indicare eventuali allergie note"
                        />
                    </div>

                    {/* Valore di default */}
                    {campo.type !== 'signature' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Valore predefinito
                            </label>
                            {campo.type === 'boolean' ? (
                                <select
                                    value={campo.defaultValue || ''}
                                    onChange={(e) => onUpdate({ defaultValue: e.target.value || undefined })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Nessuno</option>
                                    <option value="true">Sì</option>
                                    <option value="false">No</option>
                                </select>
                            ) : hasOptions ? (
                                <select
                                    value={campo.defaultValue || ''}
                                    onChange={(e) => onUpdate({ defaultValue: e.target.value || undefined })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Nessuno</option>
                                    {(campo.options || []).map((opt, idx) => (
                                        <option key={idx} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                                    ))}
                                </select>
                            ) : campo.type === 'textarea' ? (
                                <textarea
                                    value={campo.defaultValue || ''}
                                    onChange={(e) => onUpdate({ defaultValue: e.target.value || undefined })}
                                    rows={8}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-y"
                                    placeholder="Testo mostrato al paziente"
                                />
                            ) : (
                                <input
                                    type={campo.type === 'number' ? 'number' : campo.type === 'date' ? 'date' : 'text'}
                                    value={campo.defaultValue || ''}
                                    onChange={(e) => onUpdate({ defaultValue: e.target.value || undefined })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            )}
                        </div>
                    )}

                    {/* Scoring per campo (visibile solo se template ha scoring abilitato) */}
                    {haScoring && campo.type !== 'signature' && campo.type !== 'text' && campo.type !== 'textarea' && campo.type !== 'date' && campo.type !== 'email' && campo.type !== 'phone' && (
                        <div className="pt-2 border-t border-gray-100">
                            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                                <span className="text-amber-500">★</span> Scoring
                            </p>
                            <div className="space-y-3 bg-amber-50/50 p-3 rounded-lg">
                                {/* Peso */}
                                <div className="flex items-center gap-3">
                                    <label className="text-sm text-gray-600 w-20">Peso</label>
                                    <input
                                        type="number"
                                        value={campo.scoring?.weight ?? 1}
                                        onChange={(e) => onUpdate({
                                            scoring: { ...campo.scoring, weight: parseFloat(e.target.value) || 1 }
                                        })}
                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500"
                                        min="0"
                                        step="0.1"
                                    />
                                    <span className="text-xs text-gray-400">Moltiplicatore punteggio</span>
                                </div>

                                {/* Boolean scoring */}
                                {campo.type === 'boolean' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Punteggio "Sì"</label>
                                            <input
                                                type="number"
                                                value={campo.scoring?.trueScore ?? 0}
                                                onChange={(e) => onUpdate({
                                                    scoring: { ...campo.scoring, trueScore: parseFloat(e.target.value) || 0 }
                                                })}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500"
                                            />
                                            <label className="flex items-center gap-1 mt-1">
                                                <input
                                                    type="checkbox"
                                                    checked={campo.scoring?.trueCritical || false}
                                                    onChange={(e) => onUpdate({
                                                        scoring: { ...campo.scoring, trueCritical: e.target.checked }
                                                    })}
                                                    className="rounded text-red-500 focus:ring-red-400"
                                                />
                                                <span className="text-xs text-red-600">Critico</span>
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Punteggio "No"</label>
                                            <input
                                                type="number"
                                                value={campo.scoring?.falseScore ?? 0}
                                                onChange={(e) => onUpdate({
                                                    scoring: { ...campo.scoring, falseScore: parseFloat(e.target.value) || 0 }
                                                })}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500"
                                            />
                                            <label className="flex items-center gap-1 mt-1">
                                                <input
                                                    type="checkbox"
                                                    checked={campo.scoring?.falseCritical || false}
                                                    onChange={(e) => onUpdate({
                                                        scoring: { ...campo.scoring, falseCritical: e.target.checked }
                                                    })}
                                                    className="rounded text-red-500 focus:ring-red-400"
                                                />
                                                <span className="text-xs text-red-600">Critico</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Select/Radio/Multiselect — per-option scores */}
                                {hasOptions && (campo.options || []).length > 0 && (
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Punteggio per opzione</label>
                                        <div className="space-y-1">
                                            {(campo.options || []).map((opt, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-2">
                                                    <span className="text-sm text-gray-700 flex-1 truncate">{getOptionLabel(opt)}</span>
                                                    <input
                                                        type="number"
                                                        value={campo.scoring?.optionScores?.[optIdx] ?? 0}
                                                        onChange={(e) => {
                                                            const scores = [...(campo.scoring?.optionScores || [])];
                                                            // Ensure array is at least as long as options
                                                            while (scores.length <= optIdx) scores.push(0);
                                                            scores[optIdx] = parseFloat(e.target.value) || 0;
                                                            onUpdate({
                                                                scoring: { ...campo.scoring, optionScores: scores }
                                                            });
                                                        }}
                                                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-teal-500"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Number — range scoring */}
                                {campo.type === 'number' && (
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Range di punteggio</label>
                                        <div className="space-y-2">
                                            {(campo.scoring?.ranges || []).map((range, rangeIdx) => (
                                                <div key={rangeIdx} className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={range.min ?? ''}
                                                        onChange={(e) => {
                                                            const ranges = [...(campo.scoring?.ranges || [])];
                                                            ranges[rangeIdx] = { ...ranges[rangeIdx], min: e.target.value ? parseFloat(e.target.value) : undefined };
                                                            onUpdate({ scoring: { ...campo.scoring, ranges } });
                                                        }}
                                                        className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-teal-500"
                                                        placeholder="Min"
                                                    />
                                                    <span className="text-xs text-gray-400">—</span>
                                                    <input
                                                        type="number"
                                                        value={range.max ?? ''}
                                                        onChange={(e) => {
                                                            const ranges = [...(campo.scoring?.ranges || [])];
                                                            ranges[rangeIdx] = { ...ranges[rangeIdx], max: e.target.value ? parseFloat(e.target.value) : undefined };
                                                            onUpdate({ scoring: { ...campo.scoring, ranges } });
                                                        }}
                                                        className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-teal-500"
                                                        placeholder="Max"
                                                    />
                                                    <span className="text-xs text-gray-400">→</span>
                                                    <input
                                                        type="number"
                                                        value={range.score}
                                                        onChange={(e) => {
                                                            const ranges = [...(campo.scoring?.ranges || [])];
                                                            ranges[rangeIdx] = { ...ranges[rangeIdx], score: parseFloat(e.target.value) || 0 };
                                                            onUpdate({ scoring: { ...campo.scoring, ranges } });
                                                        }}
                                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-teal-500"
                                                        placeholder="Pts"
                                                    />
                                                    <label className="flex items-center gap-0.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={range.critical || false}
                                                            onChange={(e) => {
                                                                const ranges = [...(campo.scoring?.ranges || [])];
                                                                ranges[rangeIdx] = { ...ranges[rangeIdx], critical: e.target.checked };
                                                                onUpdate({ scoring: { ...campo.scoring, ranges } });
                                                            }}
                                                            className="rounded text-red-500 focus:ring-red-400"
                                                        />
                                                        <span className="text-xs text-red-600">!</span>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const ranges = (campo.scoring?.ranges || []).filter((_, i) => i !== rangeIdx);
                                                            onUpdate({ scoring: { ...campo.scoring, ranges } });
                                                        }}
                                                        className="text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const ranges = [...(campo.scoring?.ranges || []), { score: 0 }];
                                                    onUpdate({ scoring: { ...campo.scoring, ranges } });
                                                }}
                                                className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Aggiungi range
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Logica condizionale */}
                    <div className="pt-2 border-t border-gray-100">
                        <ConditionEditor
                            condition={campo.condition}
                            onChange={(condition) => onUpdate({ condition })}
                            availableFields={otherFields}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const TabCampi: React.FC<TabCampiProps> = ({ campi, errors, onUpdate, haScoring = false }) => {
    const [expandedCampo, setExpandedCampo] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 }, // 5px threshold to distinguish click from drag
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const addCampo = useCallback(() => {
        const newCampo: CampoTemplate = {
            name: `campo_${campi.length + 1}`,
            type: 'text',
            label: '',
            required: false
        };
        onUpdate([...campi, newCampo]);
        setExpandedCampo(campi.length);
    }, [campi, onUpdate]);

    const removeCampo = useCallback((index: number) => {
        onUpdate(campi.filter((_, i) => i !== index));
        if (expandedCampo === index) setExpandedCampo(null);
    }, [campi, expandedCampo, onUpdate]);

    const updateCampo = useCallback((index: number, updates: Partial<CampoTemplate>) => {
        const updated = campi.map((c, i) => {
            if (i !== index) return c;
            const merged = { ...c, ...updates };
            if (updates.type && !TYPES_WITH_OPTIONS.includes(updates.type)) {
                delete merged.options;
            }
            if (updates.type && TYPES_WITH_OPTIONS.includes(updates.type) && !merged.options) {
                merged.options = [];
            }
            return merged;
        });
        onUpdate(updated);
    }, [campi, onUpdate]);

    const duplicateCampo = useCallback((index: number) => {
        const campo = campi[index];
        const copy: CampoTemplate = {
            ...campo,
            name: `${campo.name}_copia`,
            label: `${campo.label} (copia)`
        };
        const newCampi = [...campi];
        newCampi.splice(index + 1, 0, copy);
        onUpdate(newCampi);
        setExpandedCampo(index + 1);
    }, [campi, onUpdate]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = campi.findIndex(c => c.name === active.id);
        const newIndex = campi.findIndex(c => c.name === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        onUpdate(arrayMove(campi, oldIndex, newIndex));

        // Update expanded index to follow the moved item
        if (expandedCampo === oldIndex) {
            setExpandedCampo(newIndex);
        } else if (expandedCampo !== null) {
            // Adjust expanded index if it shifted
            if (oldIndex < expandedCampo && newIndex >= expandedCampo) {
                setExpandedCampo(expandedCampo - 1);
            } else if (oldIndex > expandedCampo && newIndex <= expandedCampo) {
                setExpandedCampo(expandedCampo + 1);
            }
        }
    }, [campi, expandedCampo, onUpdate]);

    // Stable IDs for SortableContext (campo names must be unique)
    const sortableIds = campi.map((c, i) => c.name || `campo-${i}`);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500">
                        Definisci i campi compilabili del questionario
                    </p>
                    {campi.length > 1 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                            Trascina i campi con l&apos;icona ⠿ per riordinarli
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={addCampo}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Aggiungi Campo
                </button>
            </div>

            {campi.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                    <Info className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-1">Nessun campo definito</p>
                    <p className="text-xs text-gray-400 mb-3">Aggiungi campi per creare il questionario</p>
                    <button
                        type="button"
                        onClick={addCampo}
                        className="text-sm text-teal-600 hover:text-teal-800 font-medium"
                    >
                        Aggiungi il primo campo
                    </button>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {campi.map((campo, index) => {
                                const otherFields = campi
                                    .filter((_, i) => i !== index)
                                    .map(c => ({ name: c.name, label: c.label, type: c.type, fieldName: c.name, options: c.options }));

                                return (
                                    <SortableCampoItem
                                        key={campo.name || `campo-${index}`}
                                        campo={campo}
                                        index={index}
                                        campiLength={campi.length}
                                        isExpanded={expandedCampo === index}
                                        onToggleExpand={() => setExpandedCampo(expandedCampo === index ? null : index)}
                                        onUpdate={(updates) => updateCampo(index, updates)}
                                        onDuplicate={() => duplicateCampo(index)}
                                        onRemove={() => removeCampo(index)}
                                        otherFields={otherFields}
                                        errors={errors}
                                        haScoring={haScoring}
                                    />
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
};

export default TabCampi;
