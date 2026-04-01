/**
 * TemplateCampiBuilder - Form Builder per Template Campi Visita
 * 
 * P65.7: Refactored per usare VisitTemplate con scope=CATALOGO
 * invece del legacy TemplateCampoVisita.
 * 
 * Permette di creare e gestire campi dinamici per le prestazioni mediche.
 * Supporta drag&drop per riordinamento, preview live, configurazione HL7.
 * 
 * @module pages/clinica/catalogo/TemplateCampiBuilder
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { getOptionLabel, getOptionValue } from '@/utils/optionHelpers';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    GripVertical,
    Plus,
    Trash2,
    Edit,
    Save,
    X,
    Eye,
    EyeOff,
    ChevronUp,
    ChevronDown,
    Copy,
    Settings,
    Type,
    AlignLeft,
    Hash,
    Calendar,
    CheckSquare,
    List,
    ListChecks,
    FileText,
    HelpCircle,
    AlertCircle,
    CheckCircle,
    ArrowLeft,
    RefreshCw,
    FileCode2,
    Clock
} from 'lucide-react';
import {
    prestazioniApi,
    visitTemplatesApi,
    type VisitTemplate,
    type VisitField,
    type VisitFieldHL7Config,
    type Prestazione
} from '../../../services/clinicaApi';
import { useToast } from '../../../hooks/useToast';
import { useConfirmDialog } from '../../../contexts/ConfirmDialogContext';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import HL7FieldConfig from '../impostazioni/visit-templates/components/HL7FieldConfig';

// ============================================
// TYPES
// ============================================

type FieldType = VisitField['type'];

interface FieldFormData {
    name: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: (string | { value: string; label: string })[];
    defaultValue?: string;
    placeholder?: string;
    helpText?: string;
    validation?: VisitField['validation'];
    section: string;
    visible: boolean;
    hl7?: VisitFieldHL7Config;
}

const EMPTY_FIELD: FieldFormData = {
    name: '',
    label: '',
    type: 'TEXT',
    required: false,
    options: [],
    defaultValue: '',
    placeholder: '',
    helpText: '',
    validation: {},
    section: 'main',
    visible: true
};

// ============================================
// FIELD TYPE CONFIG
// ============================================

const TIPO_CAMPO_CONFIG: Record<FieldType, {
    label: string;
    icon: React.ElementType;
    description: string;
    hasOptions?: boolean;
    hasValidation?: 'text' | 'number' | 'date';
}> = {
    TEXT: {
        label: 'Testo',
        icon: Type,
        description: 'Campo di testo breve',
        hasValidation: 'text'
    },
    TEXTAREA: {
        label: 'Area di testo',
        icon: AlignLeft,
        description: 'Campo di testo lungo multiriga',
        hasValidation: 'text'
    },
    RICHTEXT: {
        label: 'Testo formattato',
        icon: AlignLeft,
        description: 'Editor di testo con formattazione',
        hasValidation: 'text'
    },
    NUMBER: {
        label: 'Numero',
        icon: Hash,
        description: 'Valore numerico',
        hasValidation: 'number'
    },
    DATE: {
        label: 'Data',
        icon: Calendar,
        description: 'Selettore data',
        hasValidation: 'date'
    },
    DATETIME: {
        label: 'Data e ora',
        icon: Calendar,
        description: 'Selettore data e ora'
    },
    BOOLEAN: {
        label: 'Checkbox',
        icon: CheckSquare,
        description: 'Valore sì/no'
    },
    DROPDOWN: {
        label: 'Selezione singola',
        icon: List,
        description: 'Menu a tendina con opzioni',
        hasOptions: true
    },
    MULTI_CHOICE: {
        label: 'Selezione multipla',
        icon: ListChecks,
        description: 'Selezione multipla con checkbox',
        hasOptions: true
    },
    FILE: {
        label: 'File allegato',
        icon: FileText,
        description: 'Upload file/immagine'
    },
    VITALS: {
        label: 'Parametri vitali',
        icon: Hash,
        description: 'Parametri vitali strutturati',
        hasValidation: 'number'
    },
    STRUMENTARIO_IMPORT: {
        label: 'Import Strumentario',
        icon: FileCode2,
        description: 'Importa dati da strumentario medico'
    }
};

const TIPO_OPTIONS = Object.entries(TIPO_CAMPO_CONFIG).map(([value, config]) => ({
    value: value as FieldType,
    label: config.label,
    icon: config.icon,
    description: config.description
}));

// Scadenza options in mesi
const SCADENZA_OPTIONS = [
    { value: 1, label: '1 mese' },
    { value: 3, label: '3 mesi' },
    { value: 6, label: '6 mesi' },
    { value: 12, label: '1 anno' },
    { value: 18, label: '18 mesi' },
    { value: 24, label: '2 anni' },
    { value: 36, label: '3 anni' },
    { value: 60, label: '5 anni' }
];

// ============================================
// FIELD EDITOR COMPONENT
// ============================================

interface FieldEditorProps {
    field?: VisitField;
    onSave: (data: FieldFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, onSave, onCancel, isLoading }) => {
    const [formData, setFormData] = useState<FieldFormData>(() => {
        if (field) {
            return {
                name: field.name,
                label: field.label,
                type: field.type,
                required: field.required || false,
                options: field.options || [],
                defaultValue: field.defaultValue as string || '',
                placeholder: field.placeholder || '',
                helpText: field.helpText || '',
                validation: field.validation || {},
                section: field.section || 'main',
                visible: field.visible !== false,
                hl7: field.hl7
            };
        }
        return { ...EMPTY_FIELD };
    });

    const [optionInput, setOptionInput] = useState('');
    const [showHL7Config, setShowHL7Config] = useState(!!field?.hl7);

    const typeConfig = TIPO_CAMPO_CONFIG[formData.type];

    const handleAddOption = useCallback(() => {
        if (optionInput.trim()) {
            setFormData(prev => ({
                ...prev,
                options: [...(prev.options || []), optionInput.trim()]
            }));
            setOptionInput('');
        }
    }, [optionInput]);

    const handleRemoveOption = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            options: prev.options?.filter((_, i) => i !== index) || []
        }));
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        // Genera nome univoco se non specificato
        const name = formData.name || formData.label
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        onSave({
            ...formData,
            name
        });
    }, [formData, onSave]);

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-teal-200 rounded-lg p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    {field ? 'Modifica Campo' : 'Nuovo Campo'}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    >
                        <X className="h-4 w-4 inline mr-1" />
                        Annulla
                    </button>
                    <button
                        type="submit"
                        disabled={!formData.label || isLoading}
                        className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 inline mr-1 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 inline mr-1" />
                        )}
                        Salva
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Label */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Etichetta <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.label}
                        onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        placeholder="es. Pressione arteriosa"
                        required
                    />
                </div>

                {/* Name (opzionale) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome campo (interno)
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Auto-generato da etichetta"
                    />
                    <p className="mt-1 text-xs text-gray-500">Identificativo univoco del campo</p>
                </div>

                {/* Tipo */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo di campo
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {TIPO_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = formData.type === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, type: opt.value }))}
                                    className={`
                                        flex flex-col items-center gap-1 p-3 border rounded-lg text-center
                                        transition-all duration-200
                                        ${isSelected
                                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                                            : 'border-gray-200 hover:border-teal-300 text-gray-600 hover:text-teal-600'
                                        }
                                    `}
                                    title={opt.description}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="text-xs font-medium">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Placeholder */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Placeholder
                    </label>
                    <input
                        type="text"
                        value={formData.placeholder}
                        onChange={(e) => setFormData(prev => ({ ...prev, placeholder: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Testo suggerimento nel campo"
                    />
                </div>

                {/* Valore Default */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valore predefinito
                    </label>
                    <input
                        type="text"
                        value={formData.defaultValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Valore iniziale"
                    />
                </div>

                {/* Help text */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Testo di aiuto
                    </label>
                    <input
                        type="text"
                        value={formData.helpText}
                        onChange={(e) => setFormData(prev => ({ ...prev, helpText: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Descrizione aggiuntiva per l'utente"
                    />
                </div>

                {/* Opzioni per SELECT/MULTISELECT */}
                {typeConfig.hasOptions && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Opzioni disponibili
                        </label>
                        <div className="space-y-2">
                            {formData.options?.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={typeof opt === 'string' ? opt : opt.value}
                                        onChange={(e) => {
                                            const newOptions = [...(formData.options || [])];
                                            newOptions[idx] = e.target.value;
                                            setFormData(prev => ({ ...prev, options: newOptions }));
                                        }}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOption(idx)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={optionInput}
                                    onChange={(e) => setOptionInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                                    placeholder="Nuova opzione..."
                                />
                                <button
                                    type="button"
                                    onClick={handleAddOption}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Validazione */}
                {typeConfig.hasValidation && (
                    <div className="md:col-span-2 bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Regole di validazione
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {typeConfig.hasValidation === 'text' && (
                                <>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Lunghezza minima</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.validation?.minLength || ''}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                validation: {
                                                    ...prev.validation,
                                                    minLength: e.target.value ? parseInt(e.target.value) : undefined
                                                }
                                            }))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Lunghezza massima</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.validation?.maxLength || ''}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                validation: {
                                                    ...prev.validation,
                                                    maxLength: e.target.value ? parseInt(e.target.value) : undefined
                                                }
                                            }))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                </>
                            )}
                            {typeConfig.hasValidation === 'number' && (
                                <>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Valore minimo</label>
                                        <input
                                            type="number"
                                            value={formData.validation?.min ?? ''}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                validation: {
                                                    ...prev.validation,
                                                    min: e.target.value ? parseFloat(e.target.value) : undefined
                                                }
                                            }))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Valore massimo</label>
                                        <input
                                            type="number"
                                            value={formData.validation?.max ?? ''}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                validation: {
                                                    ...prev.validation,
                                                    max: e.target.value ? parseFloat(e.target.value) : undefined
                                                }
                                            }))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Obbligatorio */}
                <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.required}
                            onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            Campo obbligatorio
                        </span>
                        <span className="text-xs text-gray-500">
                            (l'utente dovrà compilare questo campo)
                        </span>
                    </label>
                </div>

                {/* HL7 Config Section */}
                <div className="md:col-span-2 border-t pt-4">
                    <button
                        type="button"
                        onClick={() => setShowHL7Config(!showHL7Config)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600"
                    >
                        <FileCode2 className="h-4 w-4" />
                        Configurazione HL7/FSE
                        {formData.hl7?.code && (
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded">
                                {formData.hl7.code}
                            </span>
                        )}
                        <ChevronDown className={`h-4 w-4 transition-transform ${showHL7Config ? 'rotate-180' : ''}`} />
                    </button>

                    {showHL7Config && (
                        <div className="mt-3">
                            <HL7FieldConfig
                                hl7Config={formData.hl7}
                                onChange={(hl7: VisitFieldHL7Config | undefined) => setFormData(prev => ({ ...prev, hl7 }))}
                                fieldLabel={formData.label}
                                fieldType={formData.type}
                            />
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
};

// ============================================
// FIELD CARD COMPONENT
// ============================================

interface FieldCardProps {
    field: VisitField;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, index: number) => void;
}

const FieldCard: React.FC<FieldCardProps> = ({
    field,
    index,
    isFirst,
    isLast,
    onEdit,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onDragStart,
    onDragOver,
    onDrop
}) => {
    const typeConfig = TIPO_CAMPO_CONFIG[field.type] || TIPO_CAMPO_CONFIG.TEXT;
    const Icon = typeConfig.icon;

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, index)}
            className="group flex items-center gap-3 p-4 bg-white border rounded-lg transition-all duration-200 border-gray-200 hover:border-teal-300 cursor-grab active:cursor-grabbing"
        >
            {/* Drag Handle */}
            <div className="text-gray-400 group-hover:text-gray-600">
                <GripVertical className="h-5 w-5" />
            </div>

            {/* Campo Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-teal-600" />
                    <span className="font-medium text-gray-900 truncate">{field.label}</span>
                    {field.required && (
                        <span className="text-red-500 text-sm">*</span>
                    )}
                    {field.hl7?.code && (
                        <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded flex items-center gap-1">
                            <FileCode2 className="h-3 w-3" />
                            {field.hl7.code}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {typeConfig.label}
                    </span>
                    <span className="text-xs text-gray-400">
                        Nome: {field.name}
                    </span>
                </div>
                {field.helpText && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        {field.helpText}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onMoveUp}
                    disabled={isFirst}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Sposta su"
                >
                    <ChevronUp className="h-4 w-4" />
                </button>
                <button
                    onClick={onMoveDown}
                    disabled={isLast}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Sposta giù"
                >
                    <ChevronDown className="h-4 w-4" />
                </button>
                <button
                    onClick={onDuplicate}
                    className="p-1.5 text-gray-400 hover:text-teal-600"
                    title="Duplica"
                >
                    <Copy className="h-4 w-4" />
                </button>
                <button
                    onClick={onEdit}
                    className="p-1.5 text-gray-400 hover:text-teal-600"
                    title="Modifica"
                >
                    <Edit className="h-4 w-4" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1.5 text-gray-400 hover:text-red-600"
                    title="Elimina"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

// ============================================
// PREVIEW COMPONENT
// ============================================

interface PreviewProps {
    fields: VisitField[];
    prestazione?: Prestazione;
}

const TemplatePreview: React.FC<PreviewProps> = ({ fields, prestazione }) => {
    const sortedFields = useMemo(
        () => [...fields].sort((a, b) => (a.order || 0) - (b.order || 0)),
        [fields]
    );

    const renderField = (field: VisitField) => {
        switch (field.type) {
            case 'TEXT':
                return (
                    <input
                        type="text"
                        placeholder={field.placeholder || ''}
                        defaultValue={field.defaultValue as string || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                    />
                );
            case 'TEXTAREA':
                return (
                    <textarea
                        placeholder={field.placeholder || ''}
                        defaultValue={field.defaultValue as string || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        rows={3}
                        disabled
                    />
                );
            case 'NUMBER':
                return (
                    <input
                        type="number"
                        placeholder={field.placeholder || ''}
                        defaultValue={field.defaultValue as string || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                    />
                );
            case 'DATE':
                return (
                    <DatePickerElegante
                        value={field.defaultValue as string || ''}
                        onChange={() => { }}
                        theme="teal"
                        disabled
                    />
                );
            case 'DATETIME':
                return (
                    <input
                        type="datetime-local"
                        defaultValue={field.defaultValue as string || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                    />
                );
            case 'BOOLEAN':
                return (
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            defaultChecked={field.defaultValue === 'true'}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded"
                            disabled
                        />
                        <span className="text-gray-500">Sì</span>
                    </label>
                );
            case 'DROPDOWN':
                return (
                    <select
                        defaultValue={field.defaultValue as string || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        disabled
                    >
                        <option value="">Seleziona...</option>
                        {field.options?.map((opt, i) => (
                            <option key={i} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                        ))}
                    </select>
                );
            case 'MULTI_CHOICE':
                return (
                    <div className="space-y-1">
                        {field.options?.map((opt, i) => (
                            <label key={i} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-teal-600 border-gray-300 rounded"
                                    disabled
                                />
                                <span className="text-sm text-gray-700">{getOptionLabel(opt)}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'FILE':
                return (
                    <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500">Clicca per caricare file</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Preview Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Anteprima Form</span>
                </div>
                {prestazione && (
                    <p className="text-xs text-gray-500 mt-1">
                        {prestazione.nome}
                    </p>
                )}
            </div>

            {/* Preview Content */}
            <div className="p-6 space-y-5">
                {sortedFields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <HelpCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Nessun campo configurato</p>
                        <p className="text-xs">Aggiungi campi per vedere l'anteprima</p>
                    </div>
                ) : (
                    sortedFields.map((field, index) => (
                        <div key={field.name || index}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {renderField(field)}
                            {field.helpText && (
                                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                                    <HelpCircle className="h-3 w-3" />
                                    {field.helpText}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const TemplateCampiBuilder: React.FC = () => {
    const { id: prestazioneId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { confirmDelete } = useConfirmDialog();

    // State
    const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [scadenzaMesi, setScadenzaMesi] = useState<number | null>(null);
    const [localFields, setLocalFields] = useState<VisitField[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    // Query: Prestazione
    const { data: prestazione } = useQuery({
        queryKey: ['prestazione', prestazioneId],
        queryFn: () => prestazioniApi.getById(prestazioneId!),
        enabled: !!prestazioneId
    });

    // Query: Template CATALOGO per questa prestazione
    const { data: catalogoTemplate, isLoading, refetch } = useQuery({
        queryKey: ['visit-template-catalogo', prestazioneId],
        queryFn: async () => {
            // Cerca template con scope=CATALOGO per questa prestazione
            const response = await visitTemplatesApi.getAll({
                prestazioneId,
                scope: 'CATALOGO',
                limit: 1
            });
            return response.data?.[0] || null;
        },
        enabled: !!prestazioneId
    });

    // Initialize local state from template
    useEffect(() => {
        if (catalogoTemplate) {
            setLocalFields(catalogoTemplate.fields || []);
            setScadenzaMesi(catalogoTemplate.defaultScadenzaMesi || null);
            setIsDirty(false);
        }
    }, [catalogoTemplate]);

    // Sorted fields
    const sortedFields = useMemo(
        () => [...localFields].sort((a, b) => (a.order || 0) - (b.order || 0)),
        [localFields]
    );

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            // Update order before saving
            const fieldsWithOrder = localFields.map((f, i) => ({ ...f, order: i }));

            if (catalogoTemplate) {
                // Update existing template
                return visitTemplatesApi.update(catalogoTemplate.id, {
                    fields: fieldsWithOrder,
                    defaultScadenzaMesi: scadenzaMesi || undefined
                });
            } else {
                // Create new CATALOGO template
                return visitTemplatesApi.create({
                    name: `Template Catalogo - ${prestazione?.nome || 'Prestazione'}`,
                    description: `Campi default per ${prestazione?.nome}`,
                    scope: 'CATALOGO',
                    prestazioneId: prestazioneId!,
                    fields: fieldsWithOrder,
                    defaultScadenzaMesi: scadenzaMesi || undefined,
                    isDefault: true,
                    isActive: true
                });
            }
        },
        onSuccess: () => {
            showToast({ message: 'Template salvato con successo', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['visit-template-catalogo', prestazioneId] });
            setIsDirty(false);
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    // Handlers
    const handleAddField = useCallback((data: FieldFormData) => {
        const newField: VisitField = {
            name: data.name,
            label: data.label,
            type: data.type,
            required: data.required,
            visible: data.visible,
            section: data.section,
            order: localFields.length,
            options: data.options,
            defaultValue: data.defaultValue,
            placeholder: data.placeholder,
            helpText: data.helpText,
            validation: data.validation,
            hl7: data.hl7
        };

        setLocalFields(prev => [...prev, newField]);
        setIsCreating(false);
        setIsDirty(true);
    }, [localFields.length]);

    const handleUpdateField = useCallback((index: number, data: FieldFormData) => {
        setLocalFields(prev => prev.map((f, i) => {
            if (i !== index) return f;
            return {
                ...f,
                name: data.name,
                label: data.label,
                type: data.type,
                required: data.required,
                visible: data.visible,
                section: data.section,
                options: data.options,
                defaultValue: data.defaultValue,
                placeholder: data.placeholder,
                helpText: data.helpText,
                validation: data.validation,
                hl7: data.hl7
            };
        }));
        setEditingFieldIndex(null);
        setIsDirty(true);
    }, []);

    const handleDeleteField = useCallback(async (index: number) => {
        if (await confirmDelete('questo campo')) {
            setLocalFields(prev => prev.filter((_, i) => i !== index));
            setIsDirty(true);
        }
    }, [confirmDelete]);

    const handleDuplicateField = useCallback((index: number) => {
        const field = localFields[index];
        const newField: VisitField = {
            ...field,
            name: `${field.name}_copy`,
            label: `${field.label} (copia)`,
            order: localFields.length
        };
        setLocalFields(prev => [...prev, newField]);
        setIsDirty(true);
    }, [localFields]);

    const handleMoveField = useCallback((fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= localFields.length) return;

        const newFields = [...localFields];
        const [removed] = newFields.splice(fromIndex, 1);
        newFields.splice(toIndex, 0, removed);

        // Update order
        newFields.forEach((f, i) => { f.order = i; });

        setLocalFields(newFields);
        setIsDirty(true);
    }, [localFields]);

    // Drag handlers
    const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;
        handleMoveField(draggedIndex, dropIndex);
        setDraggedIndex(null);
    }, [draggedIndex, handleMoveField]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">
                                    Template Campi Visita
                                </h1>
                                {prestazione && (
                                    <p className="text-sm text-gray-500">
                                        {prestazione.nome} • {prestazione.codice}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className={`
                                    flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
                                    ${showPreview
                                        ? 'border-teal-300 bg-teal-50 text-teal-700'
                                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                    }
                                `}
                            >
                                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="text-sm">{showPreview ? 'Nascondi' : 'Mostra'} Preview</span>
                            </button>
                            <button
                                onClick={() => refetch()}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                title="Ricarica"
                            >
                                <RefreshCw className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => saveMutation.mutate()}
                                disabled={!isDirty || saveMutation.isPending}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {saveMutation.isPending ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Salva Template
                                {isDirty && <span className="w-2 h-2 bg-yellow-400 rounded-full" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                    {/* Builder Column */}
                    <div className="space-y-4">
                        {/* Scadenza Default */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <Clock className="h-4 w-4 text-teal-600" />
                                Scadenza Default per Prossimo Controllo
                            </label>
                            <select
                                value={scadenzaMesi || ''}
                                onChange={(e) => {
                                    setScadenzaMesi(e.target.value ? parseInt(e.target.value) : null);
                                    setIsDirty(true);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="">Nessuna scadenza predefinita</option>
                                {SCADENZA_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Questa scadenza verrà suggerita automaticamente quando si completa una visita
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-gray-600">{localFields.length} campi configurati</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <span className="text-gray-600">
                                    {localFields.filter(c => c.required).length} obbligatori
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <FileCode2 className="h-4 w-4 text-teal-500" />
                                <span className="text-gray-600">
                                    {localFields.filter(c => c.hl7?.code).length} con HL7
                                </span>
                            </div>
                        </div>

                        {/* Creating form */}
                        {isCreating && (
                            <FieldEditor
                                onSave={handleAddField}
                                onCancel={() => setIsCreating(false)}
                            />
                        )}

                        {/* Fields List */}
                        <div className="space-y-2">
                            {sortedFields.map((field, index) => (
                                <React.Fragment key={field.name || index}>
                                    {editingFieldIndex === index ? (
                                        <FieldEditor
                                            field={field}
                                            onSave={(data) => handleUpdateField(index, data)}
                                            onCancel={() => setEditingFieldIndex(null)}
                                        />
                                    ) : (
                                        <FieldCard
                                            field={field}
                                            index={index}
                                            isFirst={index === 0}
                                            isLast={index === sortedFields.length - 1}
                                            onEdit={() => setEditingFieldIndex(index)}
                                            onDelete={() => handleDeleteField(index)}
                                            onDuplicate={() => handleDuplicateField(index)}
                                            onMoveUp={() => handleMoveField(index, index - 1)}
                                            onMoveDown={() => handleMoveField(index, index + 1)}
                                            onDragStart={handleDragStart}
                                            onDragOver={handleDragOver}
                                            onDrop={handleDrop}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Empty State */}
                        {sortedFields.length === 0 && !isCreating && (
                            <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-lg">
                                <Type className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Nessun campo configurato
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    Aggiungi campi per creare il template della visita
                                </p>
                            </div>
                        )}

                        {/* Add Button */}
                        {!isCreating && editingFieldIndex === null && (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors"
                            >
                                <Plus className="h-5 w-5" />
                                Aggiungi Campo
                            </button>
                        )}
                    </div>

                    {/* Preview Column */}
                    {showPreview && (
                        <div className="lg:sticky lg:top-24 lg:self-start">
                            <TemplatePreview
                                fields={sortedFields}
                                prestazione={prestazione}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemplateCampiBuilder;
