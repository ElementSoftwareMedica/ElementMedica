/**
 * DynamicField - Render a single form field based on type
 * 
 * Supports all VisitFieldType values:
 * TEXT, TEXTAREA, RICHTEXT, NUMBER, DROPDOWN, MULTI_CHOICE, DATE, DATETIME, BOOLEAN, FILE, VITALS
 * 
 * Features:
 * - Auto-advance for vital signs (peso, altezza, pressione)
 * - BMI coloring with category display
 * - Rich text editing support
 * 
 * @module pages/clinica/clinica/components/DynamicField
 * @project P52 - Clinical Visit Template System
 */

import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Upload, AlertCircle, Activity, Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import RichTextEditor from '../../../../components/editor/RichTextEditor';
import MiniParametroChart from './MiniParametroChart';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';
import { strumentiBridgeApi, type EsameStrumentale, type TestResult } from '../../../../services/bridgeApi';
import type { DynamicFieldProps } from '../types';

// ============================================
// OPTION NORMALIZATION
// ============================================

/** Normalizza opzione: accetta sia stringa che {value, label, description} */
const normalizeOpt = (opt: string | { value: string; label: string; description?: string }): { value: string; label: string; description?: string } => {
    if (typeof opt === 'string') return { value: opt, label: opt };
    return { value: opt.value ?? String(opt), label: opt.label ?? opt.value ?? String(opt), description: opt.description };
};

type ExcludeOptionRule = {
    field?: string;
    equals?: string;
    values?: string[];
};

// ============================================
// BMI CLASSIFICATION
// ============================================

interface BMIClassification {
    category: string;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
}

const getBMIClassification = (bmi: number): BMIClassification => {
    if (bmi < 18.5) {
        return {
            category: 'Sottopeso',
            color: 'text-blue-700',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-300',
            textColor: 'text-blue-600'
        };
    } else if (bmi < 25) {
        return {
            category: 'Normopeso',
            color: 'text-green-700',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-400',
            textColor: 'text-green-600'
        };
    } else if (bmi < 30) {
        return {
            category: 'Sovrappeso',
            color: 'text-yellow-700',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-400',
            textColor: 'text-yellow-600'
        };
    } else if (bmi < 35) {
        return {
            category: 'Obesità I',
            color: 'text-orange-700',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-400',
            textColor: 'text-orange-600'
        };
    } else if (bmi < 40) {
        return {
            category: 'Obesità II',
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-400',
            textColor: 'text-red-500'
        };
    } else {
        return {
            category: 'Obesità III',
            color: 'text-red-800',
            bgColor: 'bg-red-100',
            borderColor: 'border-red-500',
            textColor: 'text-red-700'
        };
    }
};

// ============================================
// AUTO-ADVANCE LOGIC
// ============================================

interface AutoAdvanceConfig {
    fieldName: string;
    getExpectedDigits: (firstDigit: string) => number;
}

const AUTO_ADVANCE_FIELDS: AutoAdvanceConfig[] = [
    {
        fieldName: 'peso',
        // Peso: se inizia con 1 → 3 cifre (es. 100-199), altrimenti 2 cifre (20-99)
        getExpectedDigits: (firstDigit: string) => firstDigit === '1' ? 3 : 2
    },
    {
        fieldName: 'altezza',
        // Altezza: sempre 3 cifre (100-250 cm)
        getExpectedDigits: () => 3
    },
    {
        fieldName: 'pressioneSistolica',
        // Sistolica: 3 cifre se inizia con 1,2,3 (100-300), altrimenti 2 cifre (40-99)
        getExpectedDigits: (firstDigit: string) => ['1', '2', '3'].includes(firstDigit) ? 3 : 2
    },
    {
        fieldName: 'pressioneDiastolica',
        // Diastolica: stesso della sistolica
        getExpectedDigits: (firstDigit: string) => ['1', '2', '3'].includes(firstDigit) ? 3 : 2
    }
];

const getAutoAdvanceConfig = (fieldName: string): AutoAdvanceConfig | undefined => {
    return AUTO_ADVANCE_FIELDS.find(f => f.fieldName === fieldName);
};

// ============================================
// R17: STRUMENTARIO IMPORT FIELD
// Sub-component with its own data fetching — reads completed bridge exams for the visit
// ============================================

interface StrumentarioValue {
    esito: string;
    note: string;
}

interface StrumentarioImportFieldProps {
    field: DynamicFieldProps['field'];
    value: StrumentarioValue;
    onChange: (v: StrumentarioValue) => void;
    visitaId?: string;
    disabled?: boolean;
}

/** Color mapping for esito classification */
const ESITO_COLORS: Record<string, string> = {
    normale: 'bg-green-100 text-green-800 border-green-300',
    lieve_ipoacusia: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    moderata_ipoacusia: 'bg-orange-100 text-orange-800 border-orange-300',
    grave_ipoacusia: 'bg-red-100 text-red-800 border-red-300',
    borderline: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    alterato: 'bg-red-100 text-red-800 border-red-300',
    ostruzione_lieve: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    ostruzione_moderata: 'bg-orange-100 text-orange-800 border-orange-300',
    ostruzione_grave: 'bg-red-100 text-red-800 border-red-300',
    restrizione: 'bg-orange-100 text-orange-800 border-orange-300',
    non_eseguito: 'bg-gray-100 text-gray-500 border-gray-200',
    non_eseguita: 'bg-gray-100 text-gray-500 border-gray-200',
};

const StrumentarioImportField: React.FC<StrumentarioImportFieldProps> = ({
    field,
    value,
    onChange,
    visitaId,
    disabled = false,
}) => {
    const tipoEsame = (field.metadata as Record<string, string> | undefined)?.tipoEsame ?? '';

    // Fetch all completed exams for this visit (only when we have a visitaId)
    const { data: esamiData, isLoading } = useQuery<EsameStrumentale[]>({
        queryKey: ['esami-strumentali', visitaId],
        queryFn: () => strumentiBridgeApi.getEsamiVisita(visitaId!),
        enabled: !!visitaId,
        staleTime: 30_000,
    });

    // Find the matching completed exam
    const esame = esamiData?.find(
        e => e.tipoEsame?.toLowerCase() === tipoEsame.toLowerCase() &&
            (e.stato === 'COMPLETATO' || e.stato === 'PARZIALE')
    );

    const normalizeOpt = (opt: string | { value: string; label: string }) =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt;

    const currentEsito = value?.esito ?? '';
    const currentNote = value?.note ?? '';
    const esitoColor = ESITO_COLORS[currentEsito] ?? 'bg-gray-50 text-gray-600 border-gray-200';
    const normalOption = field.options?.map(normalizeOpt).find(opt => opt.value === 'normale');
    const chartValues = (esame?.risultati || [])
        .map((r) => {
            const numeric = typeof r.value === 'number'
                ? r.value
                : Number(String(r.value ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0]);
            return Number.isFinite(numeric)
                ? { ...r, numeric }
                : null;
        })
        .filter(Boolean)
        .slice(0, 8) as Array<TestResult & { numeric: number }>;
    const chartMax = Math.max(...chartValues.map(r => Math.abs(r.numeric)), 1);

    return (
        <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            {/* Bridge import status */}
            {visitaId && (
                <div className="flex items-center gap-2 text-xs">
                    {isLoading ? (
                        <span className="flex items-center gap-1 text-gray-400">
                            <Activity className="w-3 h-3 animate-pulse" />
                            Ricerca dati bridge…
                        </span>
                    ) : esame ? (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Importato dal dispositivo
                            {esame.dataEsame && (
                                <span className="text-teal-500">
                                    · {new Date(esame.dataEsame).toLocaleDateString('it-IT')}
                                </span>
                            )}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-gray-400">
                            <WifiOff className="w-3 h-3" />
                            Nessun dato da dispositivo — inserimento manuale
                        </span>
                    )}
                </div>
            )}

            {/* Key measurements from bridge (read-only) */}
            {esame?.risultati && esame.risultati.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                    {esame.risultati.slice(0, 6).map((r) => (
                        <div
                            key={r.testId}
                            className="flex items-center justify-between text-xs px-2 py-1 bg-white rounded border border-gray-100"
                        >
                            <span className="text-gray-500 truncate">{r.testName}</span>
                            <span className={`font-medium ml-1 ${r.status === 'high' || r.status === 'low' ? 'text-orange-600' : 'text-gray-800'}`}>
                                {r.value}{r.unit ? ` ${r.unit}` : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {chartValues.length > 0 && (
                <div className="rounded-lg border border-gray-100 bg-white p-2">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">Andamento misure</span>
                        <span className="text-[11px] text-gray-400">{tipoEsame || 'Esame'}</span>
                    </div>
                    <div className="space-y-1.5">
                        {chartValues.map((r) => {
                            const width = Math.max(8, Math.min(100, (Math.abs(r.numeric) / chartMax) * 100));
                            const tone = r.status === 'high' || r.status === 'low'
                                ? 'bg-orange-400'
                                : r.status === 'abnormal'
                                    ? 'bg-red-400'
                                    : 'bg-teal-500';
                            return (
                                <div key={`chart-${r.testId}`} className="grid grid-cols-[minmax(72px,1fr)_minmax(80px,2fr)_auto] items-center gap-2 text-[11px]">
                                    <span className="truncate text-gray-500" title={r.testName}>{r.testName}</span>
                                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
                                    </div>
                                    <span className="font-medium text-gray-700 tabular-nums">
                                        {r.value}{r.unit ? ` ${r.unit}` : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Findings text from bridge */}
            {esame?.findings && esame.findings.length > 0 && (
                <div className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-100 leading-relaxed">
                    {esame.findings.join(' — ')}
                </div>
            )}

            {/* Esito classification (MULTI_CHOICE style) */}
            <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-gray-600">Esito / Classificazione</p>
                    {normalOption && !disabled && (
                        <button
                            type="button"
                            onClick={() => onChange({ ...value, esito: normalOption.value, note: currentNote || 'Esame nei limiti della norma.' })}
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                            Valori normali
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 gap-1">
                    {field.options?.map((rawOpt) => {
                        const opt = normalizeOpt(rawOpt);
                        const isSelected = currentEsito === opt.value;
                        return (
                            <label
                                key={opt.value}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-all text-sm
                                    ${isSelected
                                        ? `${ESITO_COLORS[opt.value] ?? 'bg-teal-50 text-teal-700 border-teal-300'} font-medium`
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name={`esito-${field.name}`}
                                    value={opt.value}
                                    checked={isSelected}
                                    onChange={() => onChange({ ...value, esito: opt.value })}
                                    disabled={disabled}
                                    className="w-3.5 h-3.5 border-gray-300 text-teal-600 focus:ring-teal-500"
                                />
                                {opt.label}
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Manual notes */}
            <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Note / Osservazioni</p>
                <textarea
                    value={currentNote}
                    onChange={(e) => onChange({ ...value, note: e.target.value })}
                    disabled={disabled}
                    rows={2}
                    placeholder="Annotazioni aggiuntive sul risultato…"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white 
                               focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none
                               disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
            </div>
        </div>
    );
};

// ============================================
// MULTI CHOICE FIELD — sub-component with collapse + Altro state
// ============================================

interface MultiChoiceFieldProps {
    field: import('../../../../services/clinicaApi').VisitField;
    selectedValues: string[];
    onChange: (values: string[]) => void;
    disabled?: boolean;
    compact?: boolean;
}

const MULTI_CHOICE_COLLAPSE_THRESHOLD = 5;

const MultiChoiceField: React.FC<MultiChoiceFieldProps> = ({ field, selectedValues, onChange, disabled, compact = false }) => {
    const metadata = field.metadata as { checklistStyle?: string; expandedChecklist?: boolean } | undefined;
    const expandedGrid = compact || metadata?.checklistStyle === 'expanded-grid' || metadata?.expandedChecklist === true;
    const hasMany = !expandedGrid && (field.options?.length ?? 0) > MULTI_CHOICE_COLLAPSE_THRESHOLD;
    const [isCollapsed, setIsCollapsed] = useState(hasMany);
    const [altroText, setAltroText] = useState(() => {
        // Recover any previously saved custom value
        const predefined = new Set((field.options || []).map(o => (typeof o === 'string' ? o : o.value)));
        return selectedValues.find(v => !predefined.has(v)) ?? '';
    });

    const predefinedValues = new Set((field.options || []).map(o => (typeof o === 'string' ? o : o.value)));
    const altroChecked = !!altroText && selectedValues.includes(altroText);

    const handleOptionChange = (optValue: string, checked: boolean) => {
        if (checked) {
            onChange([...selectedValues, optValue]);
        } else {
            onChange(selectedValues.filter(v => v !== optValue));
        }
    };

    const handleAltroToggle = (checked: boolean) => {
        if (checked && altroText) {
            onChange([...selectedValues.filter(v => predefinedValues.has(v)), altroText]);
        } else {
            onChange(selectedValues.filter(v => predefinedValues.has(v)));
        }
    };

    const handleAltroTextChange = (text: string) => {
        setAltroText(text);
        // Update selection: remove previous custom, add new if non-empty
        const withoutCustom = selectedValues.filter(v => predefinedValues.has(v));
        if (text) {
            onChange([...withoutCustom, text]);
        } else {
            onChange(withoutCustom);
        }
    };

    const selectedCount = selectedValues.filter(v => predefinedValues.has(v)).length + (altroChecked ? 1 : 0);
    const normalPreset = useMemo(() => {
        const values = new Set((field.options || []).map(o => normalizeOpt(o).value));
        if (values.has('dolore_assente')) return ['dolore_assente'];
        if (values.has('motilita_conservata')) return ['motilita_conservata'];
        return [];
    }, [field.options]);

    return (
        <div className="bg-white rounded-lg border border-gray-200">
            {/* Header with collapse toggle */}
            <button
                type="button"
                onClick={() => setIsCollapsed(c => !c)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
            >
                <span className="text-sm font-medium text-gray-700">
                    {selectedCount > 0 ? (
                        <span className="text-teal-700">{selectedCount} selezionat{selectedCount === 1 ? 'a' : 'e'}</span>
                    ) : (
                        <span className="text-gray-400">Nessuna selezione</span>
                    )}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                    <span className={`inline-block transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>▼</span>
                    {isCollapsed ? 'Espandi' : 'Comprimi'}
                </span>
            </button>

            {!isCollapsed && (
                <div className="px-3 pb-2 border-t border-gray-200">
                    {normalPreset.length > 0 && !disabled && (
                        <button
                            type="button"
                            onClick={() => onChange(normalPreset)}
                            className="mt-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                            Compila valori normali
                        </button>
                    )}
                    <div className={expandedGrid ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1 pt-2' : 'space-y-1 pt-2'}>
                        {(field.options || []).map((rawOpt) => {
                            const opt = normalizeOpt(rawOpt);
                            return (
                                <label
                                    key={opt.value}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-white p-1.5 rounded-md transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedValues.includes(opt.value)}
                                        onChange={(e) => handleOptionChange(opt.value, e.target.checked)}
                                        disabled={disabled}
                                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-sm text-gray-700">{opt.label}</span>
                                        {opt.description && (
                                            <span className="block text-[11px] leading-snug text-gray-400">{opt.description}</span>
                                        )}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {(!field.options || field.options.length === 0) && (
                        <p className="text-sm text-gray-400 italic py-1">Nessuna opzione disponibile</p>
                    )}
                    {/* Altro — shown when allowCustom is enabled on the template field */}
                    {field.allowCustom && (
                        <div className="pt-1 border-t border-dashed border-gray-200 mt-1">
                            <label className="flex items-center gap-3 cursor-pointer hover:bg-white p-1.5 rounded-md transition-colors">
                                <input
                                    type="checkbox"
                                    checked={altroChecked}
                                    onChange={(e) => handleAltroToggle(e.target.checked)}
                                    disabled={disabled || !altroText}
                                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                />
                                <span className="text-sm text-gray-700 font-medium">Altro...</span>
                            </label>
                            <input
                                type="text"
                                value={altroText}
                                onChange={(e) => handleAltroTextChange(e.target.value)}
                                disabled={disabled}
                                placeholder="Descrivi voce personalizzata..."
                                className="ml-7 mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-400 outline-none bg-white"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


export const DynamicField: React.FC<DynamicFieldProps> = ({
    field,
    value,
    onChange,
    error,
    disabled = false,
    onAdvanceToNext,
    allValues,
    shouldStretch = false, // P52 Session #8: Field should stretch to fill grid span when height > 1
    pazienteId,            // P52 Session #13b: For inline chart feature
    onOpenFullChart,       // P52 Session #13b: Callback to open full chart view
    visitaId,              // R17: For STRUMENTARIO_IMPORT auto-fill from bridge
    compact = false
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const visibilityRule = (field.metadata as { showWhen?: { field?: string; in?: string[]; equals?: string } } | undefined)?.showWhen;
    const isHiddenByRule = (() => {
        if (!visibilityRule?.field) return false;
        const watchedValue = allValues?.[visibilityRule.field];
        const visibleByList = visibilityRule.in?.includes(String(watchedValue ?? ''));
        const visibleByEquals = visibilityRule.equals !== undefined && String(watchedValue ?? '') === visibilityRule.equals;
        return !visibleByList && !visibleByEquals;
    })();
    const isOptionExcluded = useCallback((optionValue: string) => {
        const rules = (field.metadata as { excludeOptionsWhen?: ExcludeOptionRule[] } | undefined)?.excludeOptionsWhen || [];
        return rules.some((rule) => {
            if (!rule.field || !rule.values?.includes(optionValue)) return false;
            return rule.equals !== undefined && String(allValues?.[rule.field] ?? '') === rule.equals;
        });
    }, [allValues, field.metadata]);

    // Determine if this field should show a chart (showChart flag from template)
    const shouldShowChart = field.showChart && pazienteId && field.type === 'NUMBER';

    // Common input classes
    const inputClasses = `w-full ${compact ? 'px-3 py-2 text-sm' : 'px-4 py-2.5'} border rounded-lg transition-all duration-200
        ${error
            ? 'border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
        }
        ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
        placeholder-gray-400`;

    // Handle number input with auto-advance logic
    const handleNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;

        // Update value
        if (val === '') {
            onChange(undefined);
        } else {
            onChange(parseFloat(val));
        }

        // Check for auto-advance
        const config = getAutoAdvanceConfig(field.name);
        if (config && val.length > 0 && onAdvanceToNext) {
            const firstDigit = val.charAt(0);
            const expectedDigits = config.getExpectedDigits(firstDigit);

            if (val.length >= expectedDigits) {
                // Auto-advance to next field after a short delay
                setTimeout(() => {
                    onAdvanceToNext();
                }, 50);
            }
        }
    }, [onChange, field.name, onAdvanceToNext]);

    // Check if this is a BMI field
    const isBMIField = field.name.toLowerCase() === 'bmi' || field.computed;
    const bmiValue = typeof value === 'number' ? value : null;
    const bmiClassification = bmiValue ? getBMIClassification(bmiValue) : null;

    // Render field based on type
    const renderField = () => {
        switch (field.type) {
            case 'TEXT':
                // When height > 1 (shouldStretch), render as textarea to fill the grid span
                if (shouldStretch) {
                    return (
                        <textarea
                            value={(value as string) || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={field.placeholder || `Inserisci ${field.label.toLowerCase()}...`}
                            disabled={disabled}
                            className={`${inputClasses} resize-y h-full min-h-[60px]`}
                        />
                    );
                }
                return (
                    <input
                        type="text"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder || `Inserisci ${field.label.toLowerCase()}...`}
                        disabled={disabled}
                        className={inputClasses}
                    />
                );

            case 'TEXTAREA':
                // When shouldStretch, textarea fills available space
                return (
                    <textarea
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder || `Inserisci ${field.label.toLowerCase()}...`}
                        disabled={disabled}
                        rows={shouldStretch ? undefined : 4}
                        className={`${inputClasses} resize-y ${shouldStretch ? 'h-full min-h-[100px]' : ''}`}
                    />
                );

            case 'RICHTEXT':
                // Use the RichTextEditor component for rich text editing
                // Toolbar is always visible at the top of the editor
                // When shouldStretch is true, RichText fills the available grid span
                return (
                    <div className={shouldStretch ? 'h-full flex flex-col' : 'min-h-[150px]'}>
                        <RichTextEditor
                            content={(value as string) || ''}
                            onChange={(content) => onChange(content)}
                            placeholder={field.placeholder || `Inserisci ${field.label.toLowerCase()}...`}
                            className={shouldStretch ? 'flex-1 min-h-[150px]' : ''}
                            disabled={disabled}
                        />
                    </div>
                );

            case 'NUMBER':
                // Special rendering for BMI field with color and category
                if (isBMIField && bmiValue && bmiClassification) {
                    return (
                        <div className="relative">
                            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 transition-all duration-200 ${bmiClassification.bgColor} ${bmiClassification.borderColor}`}>
                                <span className={`text-2xl font-bold ${bmiClassification.color}`}>
                                    {bmiValue.toFixed(1)}
                                </span>
                                <span className={`text-sm font-semibold ${bmiClassification.textColor}`}>
                                    {bmiClassification.category}
                                </span>
                            </div>
                        </div>
                    );
                }

                // Regular number input - hide spin buttons with CSS class
                return (
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="number"
                            value={value !== undefined && value !== null ? String(value) : ''}
                            onChange={handleNumberChange}
                            placeholder={field.placeholder || '0'}
                            disabled={disabled || field.computed}
                            min={field.validation?.min}
                            max={field.validation?.max}
                            step="any"
                            className={`${inputClasses} tabular-nums hide-spin-buttons ${field.computed ? 'bg-gray-100' : ''}`}
                            data-field-name={field.name}
                        />
                        {field.normalRange && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                Normale: {field.normalRange.min}-{field.normalRange.max}
                            </span>
                        )}
                    </div>
                );

            case 'DROPDOWN':
                return (
                    <select
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className={inputClasses + ' cursor-pointer'}
                    >
                        <option value="">Seleziona...</option>
                        {field.options?.map((rawOpt) => {
                            const opt = normalizeOpt(rawOpt);
                            if (isOptionExcluded(opt.value)) return null;
                            return (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            );
                        })}
                    </select>
                );

            case 'MULTI_CHOICE':
                return (
                    <MultiChoiceField
                        field={field}
                        selectedValues={(value as string[]) || []}
                        onChange={(vals) => onChange(vals)}
                        disabled={disabled}
                        compact={compact}
                    />
                );

            case 'DATE':
                return (
                    <DatePickerElegante
                        value={(value as string) || ''}
                        onChange={(date) => onChange(date ? date.toISOString().split('T')[0] : '')}
                        disabled={disabled}
                        theme="teal"
                    />
                );

            case 'DATETIME':
                return (
                    <input
                        type="datetime-local"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className={inputClasses + ' cursor-pointer'}
                    />
                );

            case 'BOOLEAN':
                return (
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <input
                            type="checkbox"
                            checked={(value as boolean) || false}
                            onChange={(e) => onChange(e.target.checked)}
                            disabled={disabled}
                            className="w-5 h-5 rounded border-gray-300 text-teal-600 
                                     focus:ring-teal-500 cursor-pointer"
                        />
                        <span className="text-gray-700 font-medium">
                            {(value as boolean) ? 'Sì' : 'No'}
                        </span>
                    </label>
                );

            case 'FILE':
                return (
                    <div className="relative">
                        <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors
                            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100 cursor-pointer'}
                            ${error ? 'border-red-300' : 'border-gray-300 hover:border-teal-400'}`}
                        >
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">
                                {value ? (value as File).name : 'Trascina un file o clicca per selezionare'}
                            </p>
                            <input
                                type="file"
                                onChange={(e) => onChange(e.target.files?.[0])}
                                disabled={disabled}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>
                );

            case 'VITALS':
                // Render vitals as a group of number inputs with inline mini-charts
                const vitalsValue = (value as Record<string, number>) || {};
                const vitalsFields = ['sistolica', 'diastolica', 'frequenza', 'saturazione', 'temperatura'];
                const vitalsLabels: Record<string, string> = {
                    sistolica: 'Sistolica (mmHg)',
                    diastolica: 'Diastolica (mmHg)',
                    frequenza: 'FC (bpm)',
                    saturazione: 'SpO2 (%)',
                    temperatura: 'Temp (°C)'
                };
                // Map VITALS sub-field to storico fieldName (composite: field.name + sub-key)
                const vitalsFieldNameMap: Record<string, string> = {
                    sistolica: 'pressioneSistolica',
                    diastolica: 'pressioneDiastolica',
                    frequenza: 'frequenzaCardiaca',
                    saturazione: 'saturazione',
                    temperatura: 'temperatura'
                };

                return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {vitalsFields.map(vital => (
                            <div key={vital}>
                                <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                    {vitalsLabels[vital]}
                                    {pazienteId && (
                                        <MiniParametroChart
                                            pazienteId={pazienteId}
                                            fieldName={vitalsFieldNameMap[vital]}
                                            fieldLabel={vitalsLabels[vital]}
                                            currentValue={vitalsValue[vital]}
                                            onOpenFullChart={() => onOpenFullChart?.(vitalsFieldNameMap[vital])}
                                        />
                                    )}
                                </label>
                                <input
                                    type="number"
                                    value={vitalsValue[vital] ?? ''}
                                    onChange={(e) => onChange({
                                        ...vitalsValue,
                                        [vital]: e.target.value ? parseFloat(e.target.value) : undefined
                                    })}
                                    disabled={disabled}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded
                                             focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        ))}
                    </div>
                );

            case 'STRUMENTARIO_IMPORT':
                // R17: Auto-import from bridge device data + manual esito classification
                return (
                    <StrumentarioImportField
                        field={field}
                        value={(value as { esito: string; note: string }) ?? { esito: '', note: '' }}
                        onChange={(v) => onChange(v)}
                        visitaId={visitaId}
                        disabled={disabled}
                    />
                );

            default:
                return (
                    <input
                        type="text"
                        value={(value as string) || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        className={inputClasses}
                    />
                );
        }
    };

    if (isHiddenByRule) return null;

    return (
        <div className={`flex flex-col ${shouldStretch ? 'h-full' : ''}`}>
            {/* Label - always aligned to top */}
            <label className={`flex items-center gap-2 font-medium text-gray-700 flex-shrink-0 ${compact ? 'mb-1 text-xs uppercase tracking-wide text-slate-500' : 'mb-1.5 text-sm'}`}>
                <span className="flex items-center gap-1">
                    {field.label}
                    {field.required && (
                        <span className="text-red-500">*</span>
                    )}
                </span>
                {/* P52 Session #13b: Inline mini chart for parameters with showChart=true */}
                {shouldShowChart && (
                    <MiniParametroChart
                        pazienteId={pazienteId}
                        fieldName={field.name}
                        fieldLabel={field.label}
                        currentValue={typeof value === 'number' ? value : undefined}
                        onOpenFullChart={() => onOpenFullChart?.(field.name)}
                    />
                )}
            </label>

            {/* Field - stretches to fill remaining space when shouldStretch is true */}
            <div className={shouldStretch ? 'flex-1 min-h-0' : ''}>
                {renderField()}
            </div>

            {/* Error */}
            {error && (
                <p className="flex items-center gap-1 text-sm text-red-600 mt-1.5 flex-shrink-0">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </p>
            )}
        </div>
    );
};

export default DynamicField;
