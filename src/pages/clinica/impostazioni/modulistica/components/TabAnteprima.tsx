/**
 * Tab Anteprima - Preview del questionario come lo vedrà il paziente
 * 
 * Renderizza tutti i campi con i rispettivi tipi di input,
 * rispettando la logica condizionale in tempo reale.
 * 
 * @module pages/clinica/impostazioni/modulistica/components
 */

import React, { useState, useMemo } from 'react';
import { Eye, Smartphone, Monitor, RotateCcw, AlertCircle } from 'lucide-react';
import type { CampoTemplate, CampoCondition, FormData } from './types';
import { getOptionLabel, getOptionValue } from '@/utils/optionHelpers';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';

// ============================================
// TYPES
// ============================================

interface TabAnteprimaProps {
    formData: FormData;
}

type ViewMode = 'desktop' | 'mobile';

// ============================================
// HELPERS
// ============================================

/** Normalizza valori boolean-like per confronto (Sì/No, true/false, etc.) */
const normalizeBooleanValue = (v: unknown): string => {
    if (v === true || v === 'true') return 'true';
    if (v === false || v === 'false') return 'false';
    const str = String(v ?? '').toLowerCase().trim();
    if (str === 'sì' || str === 'si' || str === 'yes' || str === '1') return 'true';
    if (str === 'no' || str === 'false' || str === '0') return 'false';
    return String(v ?? '');
};

/** Valuta se una condizione è soddisfatta */
const evaluateCondition = (
    condition: CampoCondition,
    values: Record<string, string | boolean | number>
): boolean => {
    const fieldValue = values[condition.fieldName];
    const condValue = condition.value;
    const isBooleanValue = typeof fieldValue === 'boolean';

    switch (condition.operator) {
        case 'equals':
            if (isBooleanValue) return normalizeBooleanValue(fieldValue) === normalizeBooleanValue(condValue);
            return String(fieldValue ?? '') === String(condValue ?? '');
        case 'notEquals':
            if (isBooleanValue) return normalizeBooleanValue(fieldValue) !== normalizeBooleanValue(condValue);
            return String(fieldValue ?? '') !== String(condValue ?? '');
        case 'contains':
            return String(fieldValue || '').toLowerCase().includes(String(condValue || '').toLowerCase());
        case 'greaterThan':
            return Number(fieldValue) > Number(condValue);
        case 'lessThan':
            return Number(fieldValue) < Number(condValue);
        case 'isEmpty':
            return !fieldValue || String(fieldValue).trim() === '';
        case 'isNotEmpty':
            return !!fieldValue && String(fieldValue).trim() !== '';
        default:
            return true;
    }
};

// ============================================
// FIELD RENDERER
// ============================================

const PreviewField: React.FC<{
    campo: CampoTemplate;
    value: string | boolean | string[];
    onChange: (value: string | boolean | string[]) => void;
}> = ({ campo, value, onChange }) => {
    const baseInputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors';

    const renderInput = () => {
        switch (campo.type) {
            case 'text':
            case 'email':
            case 'phone':
                return (
                    <input
                        type={campo.type === 'email' ? 'email' : campo.type === 'phone' ? 'tel' : 'text'}
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={campo.placeholder || ''}
                        className={baseInputClass}
                    />
                );

            case 'textarea':
                return (
                    <textarea
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={campo.placeholder || ''}
                        rows={3}
                        className={baseInputClass}
                    />
                );

            case 'number':
                return (
                    <input
                        type="number"
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={campo.placeholder || ''}
                        min={campo.validation?.min}
                        max={campo.validation?.max}
                        className={baseInputClass}
                    />
                );

            case 'date':
                return (
                    <DatePickerElegante
                        value={String(value || '')}
                        onChange={(date) => onChange(date ? date.toISOString().split('T')[0] : '')}
                        label=""
                    />
                );

            case 'boolean':
                return (
                    <div className="flex gap-4">
                        <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-1">
                            <input
                                type="radio"
                                name={`boolean-${campo.name}`}
                                checked={value === true || value === 'true'}
                                onChange={() => onChange(true)}
                                className="w-5 h-5 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">Sì</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-1">
                            <input
                                type="radio"
                                name={`boolean-${campo.name}`}
                                checked={value === false || value === 'false'}
                                onChange={() => onChange(false)}
                                className="w-5 h-5 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-700">No</span>
                        </label>
                    </div>
                );

            case 'select':
                return (
                    <select
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className={baseInputClass}
                    >
                        <option value="">— Seleziona —</option>
                        {(campo.options || []).map((opt, i) => (
                            <option key={i} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                        ))}
                    </select>
                );

            case 'radio':
                return (
                    <div className="space-y-2">
                        {(campo.options || []).map((opt, i) => (
                            <label
                                key={i}
                                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${value === getOptionValue(opt)
                                    ? 'border-teal-300 bg-teal-50'
                                    : 'border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name={`preview_${campo.name}`}
                                    value={getOptionValue(opt)}
                                    checked={value === getOptionValue(opt)}
                                    onChange={() => onChange(getOptionValue(opt))}
                                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-700">{getOptionLabel(opt)}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'multiselect':
                return (
                    <div className="space-y-2">
                        {(campo.options || []).map((opt, i) => {
                            const selectedValues = Array.isArray(value) ? value : [];
                            const optVal = getOptionValue(opt);
                            const isChecked = selectedValues.includes(optVal);
                            return (
                                <label
                                    key={i}
                                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${isChecked
                                        ? 'border-teal-300 bg-teal-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                            const newValues = isChecked
                                                ? selectedValues.filter(v => v !== optVal)
                                                : [...selectedValues, optVal];
                                            onChange(newValues);
                                        }}
                                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-sm text-gray-700">{getOptionLabel(opt)}</span>
                                </label>
                            );
                        })}
                    </div>
                );

            case 'signature':
                return (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                        <p className="text-sm text-gray-400 italic">
                            Area firma digitale
                        </p>
                        <p className="text-xs text-gray-300 mt-1">
                            Il paziente firmerà qui con il dito o lo stilo
                        </p>
                    </div>
                );

            default:
                return (
                    <input
                        type="text"
                        value={String(value || '')}
                        onChange={(e) => onChange(e.target.value)}
                        className={baseInputClass}
                    />
                );
        }
    };

    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-800">
                {campo.label || campo.name}
                {campo.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderInput()}
            {campo.helpText && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {campo.helpText}
                </p>
            )}
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const TabAnteprima: React.FC<TabAnteprimaProps> = ({ formData }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('desktop');
    const [values, setValues] = useState<Record<string, string | boolean | string[]>>({});

    const resetValues = () => setValues({});

    /** Campi visibili in base alla logica condizionale */
    const visibleCampi = useMemo(() => {
        return formData.campi.filter(campo => {
            if (!campo.condition) return true;
            return evaluateCondition(campo.condition, values as Record<string, string | boolean | number>);
        });
    }, [formData.campi, values]);

    const hasCampi = formData.campi.length > 0;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                        Anteprima come la vedrà il paziente
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={resetValues}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        title="Resetta valori"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setViewMode('desktop')}
                            className={`p-1.5 ${viewMode === 'desktop' ? 'bg-teal-50 text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Desktop"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('mobile')}
                            className={`p-1.5 ${viewMode === 'mobile' ? 'bg-teal-50 text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Mobile"
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Container */}
            <div className="flex justify-center">
                <div
                    className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all ${viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-2xl'
                        }`}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
                        <h3 className="text-white font-semibold text-lg">
                            {formData.nome || 'Titolo Questionario'}
                        </h3>
                        {formData.descrizione && (
                            <p className="text-teal-100 text-sm mt-1">{formData.descrizione}</p>
                        )}
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {!hasCampi ? (
                            <div className="text-center py-12">
                                <p className="text-gray-400">
                                    Nessun campo definito. Vai al tab "Campi" per aggiungere domande.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                {visibleCampi.map((campo, index) => (
                                    <PreviewField
                                        key={campo.name}
                                        campo={campo}
                                        value={values[campo.name] ?? (campo.defaultValue || '')}
                                        onChange={(val) => setValues(prev => ({ ...prev, [campo.name]: val }))}
                                    />
                                ))}

                                {/* Indicatore campi nascosti */}
                                {visibleCampi.length < formData.campi.length && (
                                    <div className="text-center py-2">
                                        <p className="text-xs text-amber-600 bg-amber-50 inline-block px-3 py-1 rounded-full">
                                            {formData.campi.length - visibleCampi.length} campo/i nascosto/i per logica condizionale
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {hasCampi && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-400">
                                    {visibleCampi.filter(c => c.required).length} campi obbligatori
                                </p>
                                <button
                                    type="button"
                                    disabled
                                    className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg opacity-60 cursor-not-allowed"
                                >
                                    Invia Questionario
                                </button>
                            </div>
                            {(formData.richiedeFirma || formData.richiedeFirmaMedico) && (
                                <div className="mt-3 pt-3 border-t border-gray-200 flex gap-4">
                                    {formData.richiedeFirma && (
                                        <div className="flex-1">
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                                <p className="text-xs text-gray-400">Firma Paziente</p>
                                            </div>
                                        </div>
                                    )}
                                    {formData.richiedeFirmaMedico && (
                                        <div className="flex-1">
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                                <p className="text-xs text-gray-400">Firma Medico</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TabAnteprima;
