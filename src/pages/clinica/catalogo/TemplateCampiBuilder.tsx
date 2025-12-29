/**
 * TemplateCampiBuilder - Form Builder per Template Campi Visita
 * 
 * Permette di creare e gestire campi dinamici per le prestazioni mediche.
 * Supporta drag&drop per riordinamento, preview live, e validazione.
 * 
 * @module pages/poliambulatorio/catalogo/TemplateCampiBuilder
 */

import React, { useState, useCallback, useMemo } from 'react';
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
    RefreshCw
} from 'lucide-react';
import { prestazioniApi, TemplateCampoVisita, TipoCampoVisita, Prestazione } from '../../../services/clinicaApi';

// ============================================
// TYPES
// ============================================

interface CampoFormData {
    nome: string;
    etichetta: string;
    tipo: TipoCampoVisita;
    obbligatorio: boolean;
    opzioni: string[];
    valoreDefault: string;
    placeholder: string;
    helpText: string;
    validazione: ValidationRules;
}

interface ValidationRules {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customMessage?: string;
}

const EMPTY_CAMPO: CampoFormData = {
    nome: '',
    etichetta: '',
    tipo: 'TESTO',
    obbligatorio: false,
    opzioni: [],
    valoreDefault: '',
    placeholder: '',
    helpText: '',
    validazione: {}
};

// ============================================
// FIELD TYPE CONFIG
// ============================================

const TIPO_CAMPO_CONFIG: Record<TipoCampoVisita, {
    label: string;
    icon: React.ElementType;
    description: string;
    hasOptions?: boolean;
    hasValidation?: 'text' | 'number' | 'date';
}> = {
    TESTO: {
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
    NUMERO: {
        label: 'Numero intero',
        icon: Hash,
        description: 'Valore numerico intero',
        hasValidation: 'number'
    },
    DECIMALE: {
        label: 'Numero decimale',
        icon: Hash,
        description: 'Valore numerico con decimali',
        hasValidation: 'number'
    },
    DATA: {
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
    SELECT: {
        label: 'Selezione singola',
        icon: List,
        description: 'Menu a tendina con opzioni',
        hasOptions: true
    },
    MULTISELECT: {
        label: 'Selezione multipla',
        icon: ListChecks,
        description: 'Selezione multipla con checkbox',
        hasOptions: true
    },
    FILE: {
        label: 'File allegato',
        icon: FileText,
        description: 'Upload file/immagine'
    }
};

const TIPO_OPTIONS = Object.entries(TIPO_CAMPO_CONFIG).map(([value, config]) => ({
    value: value as TipoCampoVisita,
    label: config.label,
    icon: config.icon,
    description: config.description
}));

// ============================================
// COMPONENTS
// ============================================

/**
 * Campo Form Item nel builder
 */
const CampoItem: React.FC<{
    campo: TemplateCampoVisita;
    index: number;
    isEditing: boolean;
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
}> = ({
    campo,
    index,
    isEditing,
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
        const config = TIPO_CAMPO_CONFIG[campo.tipo];
        const Icon = config.icon;

        return (
            <div
                draggable={!isEditing}
                onDragStart={(e) => onDragStart(e, index)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, index)}
                className={`
        group flex items-center gap-3 p-4 bg-white border rounded-lg
        transition-all duration-200
        ${isEditing ? 'ring-2 ring-teal-500 border-teal-300' : 'border-gray-200 hover:border-teal-300'}
        ${!isEditing ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
            >
                {/* Drag Handle */}
                <div className="text-gray-400 group-hover:text-gray-600">
                    <GripVertical className="h-5 w-5" />
                </div>

                {/* Campo Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-teal-600" />
                        <span className="font-medium text-gray-900 truncate">{campo.etichetta}</span>
                        {campo.obbligatorio && (
                            <span className="text-red-500 text-sm">*</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {config.label}
                        </span>
                        <span className="text-xs text-gray-400">
                            Nome: {campo.nome}
                        </span>
                    </div>
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
                        className="p-1.5 text-gray-400 hover:text-blue-600"
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

/**
 * Form per creare/modificare un campo
 */
const CampoForm: React.FC<{
    initialData?: CampoFormData;
    onSave: (data: CampoFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
}> = ({ initialData = EMPTY_CAMPO, onSave, onCancel, isLoading }) => {
    const [formData, setFormData] = useState<CampoFormData>(initialData);
    const [newOption, setNewOption] = useState('');

    const config = TIPO_CAMPO_CONFIG[formData.tipo];
    const showOptions = config.hasOptions;
    const showValidation = config.hasValidation;

    const handleChange = <K extends keyof CampoFormData>(
        field: K,
        value: CampoFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddOption = () => {
        if (newOption.trim()) {
            handleChange('opzioni', [...formData.opzioni, newOption.trim()]);
            setNewOption('');
        }
    };

    const handleRemoveOption = (index: number) => {
        handleChange('opzioni', formData.opzioni.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Auto-generate nome from etichetta if empty
        const data = {
            ...formData,
            nome: formData.nome || formData.etichetta.toLowerCase()
                .replace(/[^a-z0-9]/gi, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '')
        };
        onSave(data);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-teal-200 rounded-lg p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    {initialData?.nome ? 'Modifica Campo' : 'Nuovo Campo'}
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
                        disabled={!formData.etichetta || isLoading}
                        className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                    >
                        <Save className="h-4 w-4 inline mr-1" />
                        {isLoading ? 'Salvataggio...' : 'Salva'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Etichetta */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Etichetta <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.etichetta}
                        onChange={(e) => handleChange('etichetta', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        placeholder="es. Pressione arteriosa"
                        required
                    />
                </div>

                {/* Nome (interno) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome campo (interno)
                    </label>
                    <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => handleChange('nome', e.target.value)}
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {TIPO_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleChange('tipo', option.value)}
                                    className={`
                    flex flex-col items-center gap-1 p-3 border rounded-lg text-center
                    transition-all duration-200
                    ${formData.tipo === option.value
                                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                                            : 'border-gray-200 hover:border-teal-300 text-gray-600 hover:text-teal-600'
                                        }
                  `}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="text-xs font-medium">{option.label}</span>
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
                        onChange={(e) => handleChange('placeholder', e.target.value)}
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
                        value={formData.valoreDefault}
                        onChange={(e) => handleChange('valoreDefault', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Valore iniziale"
                    />
                </div>

                {/* Help Text */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Testo di aiuto
                    </label>
                    <input
                        type="text"
                        value={formData.helpText}
                        onChange={(e) => handleChange('helpText', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Descrizione per aiutare l'utente"
                    />
                </div>

                {/* Opzioni (per SELECT/MULTISELECT) */}
                {showOptions && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Opzioni disponibili
                        </label>
                        <div className="space-y-2">
                            {formData.opzioni.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                            const newOpzioni = [...formData.opzioni];
                                            newOpzioni[idx] = e.target.value;
                                            handleChange('opzioni', newOpzioni);
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
                                    value={newOption}
                                    onChange={(e) => setNewOption(e.target.value)}
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
                {showValidation && (
                    <div className="md:col-span-2 bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Regole di validazione
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {showValidation === 'text' && (
                                <>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Lunghezza minima</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.validazione.minLength || ''}
                                            onChange={(e) => handleChange('validazione', {
                                                ...formData.validazione,
                                                minLength: e.target.value ? parseInt(e.target.value) : undefined
                                            })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Lunghezza massima</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={formData.validazione.maxLength || ''}
                                            onChange={(e) => handleChange('validazione', {
                                                ...formData.validazione,
                                                maxLength: e.target.value ? parseInt(e.target.value) : undefined
                                            })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                </>
                            )}
                            {showValidation === 'number' && (
                                <>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Valore minimo</label>
                                        <input
                                            type="number"
                                            value={formData.validazione.min ?? ''}
                                            onChange={(e) => handleChange('validazione', {
                                                ...formData.validazione,
                                                min: e.target.value ? parseFloat(e.target.value) : undefined
                                            })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Valore massimo</label>
                                        <input
                                            type="number"
                                            value={formData.validazione.max ?? ''}
                                            onChange={(e) => handleChange('validazione', {
                                                ...formData.validazione,
                                                max: e.target.value ? parseFloat(e.target.value) : undefined
                                            })}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">Messaggio errore personalizzato</label>
                                <input
                                    type="text"
                                    value={formData.validazione.customMessage || ''}
                                    onChange={(e) => handleChange('validazione', {
                                        ...formData.validazione,
                                        customMessage: e.target.value || undefined
                                    })}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                    placeholder="Messaggio di errore..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Obbligatorio */}
                <div className="md:col-span-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.obbligatorio}
                            onChange={(e) => handleChange('obbligatorio', e.target.checked)}
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
            </div>
        </form>
    );
};

/**
 * Preview del template
 */
const TemplatePreview: React.FC<{
    campi: TemplateCampoVisita[];
    prestazione?: Prestazione;
}> = ({ campi, prestazione }) => {
    const sortedCampi = useMemo(
        () => [...campi].sort((a, b) => a.ordine - b.ordine),
        [campi]
    );

    const renderField = (campo: TemplateCampoVisita) => {
        const opzioni = campo.opzioni ? JSON.parse(campo.opzioni) : [];

        switch (campo.tipo) {
            case 'TESTO':
                return (
                    <input
                        type="text"
                        placeholder={campo.placeholder || ''}
                        defaultValue={campo.valoreDefault || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled
                    />
                );
            case 'TEXTAREA':
                return (
                    <textarea
                        placeholder={campo.placeholder || ''}
                        defaultValue={campo.valoreDefault || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        rows={3}
                        disabled
                    />
                );
            case 'NUMERO':
            case 'DECIMALE':
                return (
                    <input
                        type="number"
                        step={campo.tipo === 'DECIMALE' ? '0.01' : '1'}
                        placeholder={campo.placeholder || ''}
                        defaultValue={campo.valoreDefault || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled
                    />
                );
            case 'DATA':
                return (
                    <input
                        type="date"
                        defaultValue={campo.valoreDefault || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled
                    />
                );
            case 'DATETIME':
                return (
                    <input
                        type="datetime-local"
                        defaultValue={campo.valoreDefault || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled
                    />
                );
            case 'BOOLEAN':
                return (
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            defaultChecked={campo.valoreDefault === 'true'}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded"
                            disabled
                        />
                        <span className="text-gray-500">Sì</span>
                    </label>
                );
            case 'SELECT':
                return (
                    <select
                        defaultValue={campo.valoreDefault || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled
                    >
                        <option value="">Seleziona...</option>
                        {opzioni.map((opt: string, i: number) => (
                            <option key={i} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'MULTISELECT':
                return (
                    <div className="space-y-1">
                        {opzioni.map((opt: string, i: number) => (
                            <label key={i} className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-teal-600 border-gray-300 rounded"
                                    disabled
                                />
                                <span className="text-sm text-gray-700">{opt}</span>
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
                {sortedCampi.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <HelpCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Nessun campo configurato</p>
                        <p className="text-xs">Aggiungi campi per vedere l'anteprima</p>
                    </div>
                ) : (
                    sortedCampi.map((campo) => (
                        <div key={campo.id}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {campo.etichetta}
                                {campo.obbligatorio && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {renderField(campo)}
                            {campo.helpText && (
                                <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                                    <HelpCircle className="h-3 w-3" />
                                    {campo.helpText}
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

    // State
    const [editingCampo, setEditingCampo] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Query: Prestazione
    const { data: prestazione } = useQuery({
        queryKey: ['prestazione', prestazioneId],
        queryFn: () => prestazioniApi.getById(prestazioneId!),
        enabled: !!prestazioneId
    });

    // Query: Campi
    const { data: campi = [], isLoading, refetch } = useQuery({
        queryKey: ['prestazione-campi', prestazioneId],
        queryFn: () => prestazioniApi.getCampi(prestazioneId!),
        enabled: !!prestazioneId
    });

    // Mutations
    const addCampoMutation = useMutation({
        mutationFn: (data: CampoFormData) => {
            const payload = {
                nome: data.nome,
                etichetta: data.etichetta,
                tipo: data.tipo,
                obbligatorio: data.obbligatorio,
                ordine: campi.length,
                opzioni: data.opzioni.length > 0 ? JSON.stringify(data.opzioni) : undefined,
                valoreDefault: data.valoreDefault || undefined,
                placeholder: data.placeholder || undefined,
                helpText: data.helpText || undefined,
                validazione: Object.keys(data.validazione).length > 0
                    ? JSON.stringify(data.validazione)
                    : undefined
            };
            return prestazioniApi.addCampo(prestazioneId!, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestazione-campi', prestazioneId] });
            setIsCreating(false);
        }
    });

    const updateCampoMutation = useMutation({
        mutationFn: ({ campoId, data }: { campoId: string; data: CampoFormData }) => {
            const payload = {
                nome: data.nome,
                etichetta: data.etichetta,
                tipo: data.tipo,
                obbligatorio: data.obbligatorio,
                opzioni: data.opzioni.length > 0 ? JSON.stringify(data.opzioni) : undefined,
                valoreDefault: data.valoreDefault || undefined,
                placeholder: data.placeholder || undefined,
                helpText: data.helpText || undefined,
                validazione: Object.keys(data.validazione).length > 0
                    ? JSON.stringify(data.validazione)
                    : undefined
            };
            return prestazioniApi.updateCampo(prestazioneId!, campoId, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestazione-campi', prestazioneId] });
            setEditingCampo(null);
        }
    });

    const deleteCampoMutation = useMutation({
        mutationFn: (campoId: string) => prestazioniApi.deleteCampo(prestazioneId!, campoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestazione-campi', prestazioneId] });
        }
    });

    const reorderMutation = useMutation({
        mutationFn: (orderedIds: string[]) => prestazioniApi.reorderCampi(prestazioneId!, orderedIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestazione-campi', prestazioneId] });
        }
    });

    // Sorted campi
    const sortedCampi = useMemo(
        () => [...campi].sort((a, b) => a.ordine - b.ordine),
        [campi]
    );

    // Handlers
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

        const newOrder = [...sortedCampi];
        const [removed] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(dropIndex, 0, removed);

        reorderMutation.mutate(newOrder.map(c => c.id));
        setDraggedIndex(null);
    }, [draggedIndex, sortedCampi, reorderMutation]);

    const handleMoveUp = useCallback((index: number) => {
        if (index === 0) return;
        const newOrder = [...sortedCampi];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        reorderMutation.mutate(newOrder.map(c => c.id));
    }, [sortedCampi, reorderMutation]);

    const handleMoveDown = useCallback((index: number) => {
        if (index === sortedCampi.length - 1) return;
        const newOrder = [...sortedCampi];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        reorderMutation.mutate(newOrder.map(c => c.id));
    }, [sortedCampi, reorderMutation]);

    const handleDuplicate = useCallback((campo: TemplateCampoVisita) => {
        const opzioni = campo.opzioni ? JSON.parse(campo.opzioni) : [];
        const validazione = campo.validazione ? JSON.parse(campo.validazione) : {};

        addCampoMutation.mutate({
            nome: `${campo.nome}_copy`,
            etichetta: `${campo.etichetta} (copia)`,
            tipo: campo.tipo,
            obbligatorio: campo.obbligatorio,
            opzioni,
            valoreDefault: campo.valoreDefault || '',
            placeholder: campo.placeholder || '',
            helpText: campo.helpText || '',
            validazione
        });
    }, [addCampoMutation]);

    const handleDelete = useCallback((campoId: string) => {
        if (confirm('Sei sicuro di voler eliminare questo campo?')) {
            deleteCampoMutation.mutate(campoId);
        }
    }, [deleteCampoMutation]);

    const getEditingCampoData = useCallback((campoId: string): CampoFormData | undefined => {
        const campo = campi.find(c => c.id === campoId);
        if (!campo) return undefined;

        return {
            nome: campo.nome,
            etichetta: campo.etichetta,
            tipo: campo.tipo,
            obbligatorio: campo.obbligatorio,
            opzioni: campo.opzioni ? JSON.parse(campo.opzioni) : [],
            valoreDefault: campo.valoreDefault || '',
            placeholder: campo.placeholder || '',
            helpText: campo.helpText || '',
            validazione: campo.validazione ? JSON.parse(campo.validazione) : {}
        };
    }, [campi]);

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
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                    {/* Builder Column */}
                    <div className="space-y-4">
                        {/* Stats */}
                        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-gray-600">{campi.length} campi configurati</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <span className="text-gray-600">
                                    {campi.filter(c => c.obbligatorio).length} obbligatori
                                </span>
                            </div>
                        </div>

                        {/* Creating form */}
                        {isCreating && (
                            <CampoForm
                                onSave={(data) => addCampoMutation.mutate(data)}
                                onCancel={() => setIsCreating(false)}
                                isLoading={addCampoMutation.isPending}
                            />
                        )}

                        {/* Campi List */}
                        <div className="space-y-2">
                            {sortedCampi.map((campo, index) => (
                                <React.Fragment key={campo.id}>
                                    {editingCampo === campo.id ? (
                                        <CampoForm
                                            initialData={getEditingCampoData(campo.id)}
                                            onSave={(data) => updateCampoMutation.mutate({ campoId: campo.id, data })}
                                            onCancel={() => setEditingCampo(null)}
                                            isLoading={updateCampoMutation.isPending}
                                        />
                                    ) : (
                                        <CampoItem
                                            campo={campo}
                                            index={index}
                                            isEditing={editingCampo === campo.id}
                                            isFirst={index === 0}
                                            isLast={index === sortedCampi.length - 1}
                                            onEdit={() => setEditingCampo(campo.id)}
                                            onDelete={() => handleDelete(campo.id)}
                                            onDuplicate={() => handleDuplicate(campo)}
                                            onMoveUp={() => handleMoveUp(index)}
                                            onMoveDown={() => handleMoveDown(index)}
                                            onDragStart={handleDragStart}
                                            onDragOver={handleDragOver}
                                            onDrop={handleDrop}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Empty State */}
                        {sortedCampi.length === 0 && !isCreating && (
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
                        {!isCreating && !editingCampo && (
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
                                campi={sortedCampi}
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
