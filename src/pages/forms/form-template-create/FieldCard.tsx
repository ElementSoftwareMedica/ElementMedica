/**
 * FieldCard Component
 * 
 * Card component for displaying and editing a single form field.
 * Supports drag & drop, validation rules, conditional logic, and quiz mode.
 */

import React, { useState } from 'react';
import {
    GripVertical,
    Trash2,
    Plus,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { getFieldTypeInfo } from '../../../components/forms/FieldTypeSelector';
import ConditionalEditor from './ConditionalEditor';
import ValidationEditor from './ValidationEditor';
import type { FormField, FormSection, FieldOption } from './types';

export interface FieldCardProps {
    field: FormField;
    isEditing: boolean;
    isDragging: boolean;
    isDragOver: boolean;
    dropPosition: 'before' | 'after' | null;
    sections: FormSection[];
    allFields: FormField[];
    onEdit: () => void;
    onCollapse: () => void;
    onUpdate: (updates: Partial<FormField>) => void;
    onDelete: () => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onAddOption: () => void;
    onUpdateOption: (index: number, updates: Partial<FieldOption>) => void;
    onDeleteOption: (index: number) => void;
}

const FieldCard: React.FC<FieldCardProps> = ({
    field,
    isEditing,
    isDragging,
    isDragOver,
    dropPosition,
    sections,
    allFields,
    onEdit,
    onCollapse,
    onUpdate,
    onDelete,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onAddOption,
    onUpdateOption,
    onDeleteOption
}) => {
    const [showConditional, setShowConditional] = useState(false);
    const [showValidation, setShowValidation] = useState(false);

    const typeInfo = getFieldTypeInfo(field.type);
    const hasOptions = ['select', 'radio', 'checkbox', 'multiple_choice'].includes(field.type);

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
                relative border rounded-lg bg-white transition-all
                ${isDragging ? 'opacity-40 border-blue-500' : 'border-gray-200'}
                ${isDragOver ? 'shadow-lg' : 'hover:shadow-md'}
            `}
        >
            {isDragOver && dropPosition && (
                <div
                    className={`absolute left-0 right-0 h-1 bg-blue-500 z-10 ${dropPosition === 'before' ? '-top-0.5' : '-bottom-0.5'
                        }`}
                />
            )}

            {/* Header */}
            <div
                className="flex items-center p-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    isEditing ? onCollapse() : onEdit();
                }}
            >
                <GripVertical
                    className="w-4 h-4 text-gray-400 cursor-move mr-2"
                    onMouseDown={(e) => e.stopPropagation()}
                />
                <div className="flex-1 flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{field.label}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{field.type}</span>
                    {field.required && <span className="text-xs text-red-600 font-bold">*</span>}
                    {field.conditional && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">🔀</span>
                    )}
                    {field.validation && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓</span>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="text-red-600 hover:text-red-800"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Editing Panel */}
            {isEditing && (
                <div className="p-3 space-y-3">
                    {/* Basic Fields */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Etichetta *</label>
                            <input
                                type="text"
                                value={field.label}
                                onChange={(e) => onUpdate({ label: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                            <select
                                value={field.type}
                                onChange={(e) => onUpdate({ type: e.target.value })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            >
                                <option value="text">Testo</option>
                                <option value="email">Email</option>
                                <option value="tel">Telefono</option>
                                <option value="number">Numero</option>
                                <option value="textarea">Area di Testo</option>
                                <option value="select">Select</option>
                                <option value="radio">Radio</option>
                                <option value="checkbox">Checkbox</option>
                                <option value="date">Data</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Placeholder</label>
                        <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => onUpdate({ placeholder: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="Testo di aiuto..."
                        />
                    </div>

                    <div className="flex items-center space-x-4">
                        <label className="flex items-center text-sm">
                            <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => onUpdate({ required: e.target.checked })}
                                className="mr-2"
                            />
                            Campo obbligatorio
                        </label>

                        {hasOptions && (
                            <label className="flex items-center text-sm">
                                <input
                                    type="checkbox"
                                    checked={field.enableQuizMode || false}
                                    onChange={(e) => onUpdate({ enableQuizMode: e.target.checked })}
                                    className="mr-2"
                                />
                                Modalità Quiz
                            </label>
                        )}
                    </div>

                    {/* Options */}
                    {hasOptions && (
                        <div className="border-t pt-3">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-medium text-gray-700">Opzioni</label>
                                <button
                                    onClick={onAddOption}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Aggiungi
                                </button>
                            </div>
                            <div className="space-y-3">
                                {(field.options || []).map((option, idx) => (
                                    <div key={idx} className="border border-gray-200 rounded p-2 space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                value={option.label}
                                                onChange={(e) => onUpdateOption(idx, { 
                                                    label: e.target.value, 
                                                    value: e.target.value.toLowerCase().replace(/\s+/g, '_') 
                                                })}
                                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                                                placeholder="Etichetta opzione"
                                            />
                                            <button
                                                onClick={() => onDeleteOption(idx)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Collega a sezione:</label>
                                                <select
                                                    value={option.linkedSectionId || ''}
                                                    onChange={(e) => onUpdateOption(idx, { linkedSectionId: e.target.value || undefined })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                                >
                                                    <option value="">Nessun link</option>
                                                    {sections.map(s => (
                                                        <option key={s.id} value={s.id}>→ {s.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Capacità massima:</label>
                                                <input
                                                    type="number"
                                                    value={option.maxCapacity || ''}
                                                    onChange={(e) => onUpdateOption(idx, { maxCapacity: e.target.value ? parseInt(e.target.value) : undefined })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                                    placeholder="Illimitato"
                                                    min="1"
                                                />
                                            </div>
                                        </div>

                                        {field.enableQuizMode && (
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                                                <div>
                                                    <label className="flex items-center text-xs text-gray-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={option.isCorrect || false}
                                                            onChange={(e) => onUpdateOption(idx, { isCorrect: e.target.checked })}
                                                            className="mr-2"
                                                        />
                                                        Risposta corretta
                                                    </label>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-600 mb-1">Punteggio:</label>
                                                    <input
                                                        type="number"
                                                        value={option.points !== undefined ? option.points : 1}
                                                        onChange={(e) => onUpdateOption(idx, { points: e.target.value ? parseInt(e.target.value) : 1 })}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                                        placeholder="1"
                                                        min="0"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Conditional Logic */}
                    <div className="border-t pt-3">
                        <button
                            onClick={() => setShowConditional(!showConditional)}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <span className="text-xs font-medium text-gray-700">
                                🔀 Logica Condizionale
                                {field.conditional && <span className="ml-2 text-yellow-600">(attiva)</span>}
                            </span>
                            {showConditional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {showConditional && (
                            <div className="mt-2">
                                <ConditionalEditor
                                    conditional={field.conditional}
                                    onChange={(conditional) => onUpdate({ conditional })}
                                    availableFields={allFields.filter(f => f.id !== field.id)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Validation Rules */}
                    <div className="border-t pt-3">
                        <button
                            onClick={() => setShowValidation(!showValidation)}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <span className="text-xs font-medium text-gray-700">
                                ✓ Regole di Validazione
                                {field.validation && Object.keys(field.validation).length > 0 && (
                                    <span className="ml-2 text-green-600">({Object.keys(field.validation).length} attive)</span>
                                )}
                            </span>
                            {showValidation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {showValidation && (
                            <div className="mt-2">
                                <ValidationEditor
                                    validation={field.validation}
                                    fieldType={field.type}
                                    onChange={(validation) => onUpdate({ validation })}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FieldCard;
