/**
 * QuestionarioRenderer
 * 
 * P61 - Componente per rendering dinamico di questionari medici
 * Supporta tutti i tipi di campo, scoring e firma
 */

import { useState, useCallback, useMemo, FormEvent, ChangeEvent } from 'react';
import { AlertTriangle, CheckCircle2, Clock, FileSignature, Info, Save, Wand2 } from 'lucide-react';
import { cn } from '@/design-system/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { SignaturePad } from '@/components/shared/SignaturePad';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';
import { isFieldVisible } from '@/utils/conditionalFieldVisibility';
import { useToast } from '@/hooks/useToast';
import type {
    QuestionarioTemplate,
    CampoQuestionario,
    CompilaQuestionarioData,
    QuestionarioCompilato
} from '@/services/questionariService';
import { normalizeOption, normalizeOptions } from '@/utils/optionHelpers';

// ============================================================================
// TYPES
// ============================================================================

export interface QuestionarioRendererProps {
    /** Template del questionario */
    template: QuestionarioTemplate;
    /** Chi sta compilando */
    compilatoDa: 'MEDICO' | 'PAZIENTE';
    /** ID paziente */
    pazienteId: string;
    /** ID visita (opzionale) */
    visitaId?: string;
    /** Callback su submit */
    onSubmit: (data: CompilaQuestionarioData) => void;
    /** Callback su salva bozza */
    onSave?: (data: Partial<CompilaQuestionarioData>) => void;
    /** Callback su firma */
    onSign?: (firma: string) => void;
    /** Solo lettura */
    readOnly?: boolean;
    /** Dati iniziali (per modifica) */
    initialData?: QuestionarioCompilato;
    /** Loading state */
    isLoading?: boolean;
    /** Classe CSS aggiuntiva */
    className?: string;
}

type FormValues = Record<string, string | number | boolean | string[] | null>;

// ============================================================================
// HELPERS
// ============================================================================

function getDefaultValues(
    campi: CampoQuestionario[] = [],
    initialData?: Record<string, unknown>
): FormValues {
    const defaults: FormValues = {};

    for (const campo of campi) {
        if (initialData?.[campo.name] !== undefined) {
            defaults[campo.name] = initialData[campo.name] as FormValues[string];
        } else if (campo.defaultValue != null && campo.defaultValue !== '') {
            // Use template-defined default value
            switch (campo.type) {
                case 'boolean':
                    defaults[campo.name] = campo.defaultValue === 'true' || campo.defaultValue === '1';
                    break;
                case 'number':
                case 'scale':
                    defaults[campo.name] = Number(campo.defaultValue) || 0;
                    break;
                case 'multiselect':
                    try {
                        defaults[campo.name] = JSON.parse(campo.defaultValue);
                    } catch {
                        defaults[campo.name] = [campo.defaultValue];
                    }
                    break;
                default:
                    defaults[campo.name] = campo.defaultValue;
            }
        } else {
            switch (campo.type) {
                case 'boolean':
                    defaults[campo.name] = null; // null = non selezionato (Sì/No)
                    break;
                case 'multiselect':
                    defaults[campo.name] = [];
                    break;
                case 'number':
                case 'scale':
                    defaults[campo.name] = campo.min ?? 0;
                    break;
                default:
                    defaults[campo.name] = '';
            }
        }
    }

    return defaults;
}

function validateField(campo: CampoQuestionario, value: unknown): string | undefined {
    if (campo.required) {
        if (value === undefined || value === null || value === '') {
            return 'Campo obbligatorio';
        }
        // Per campi booleani obbligatori, deve essere stato scelto Sì o No
        if (campo.type === 'boolean' && value === null) {
            return 'Seleziona Sì o No';
        }
        if (campo.type === 'multiselect' && Array.isArray(value) && value.length === 0) {
            return 'Seleziona almeno un\'opzione';
        }
    }

    if (campo.type === 'number' || campo.type === 'scale') {
        const numValue = Number(value);
        if (campo.min !== undefined && numValue < campo.min) {
            return `Minimo ${campo.min}`;
        }
        if (campo.max !== undefined && numValue > campo.max) {
            return `Massimo ${campo.max}`;
        }
    }

    return undefined;
}

// ============================================================================
// PRE-COMPILA PRESETS
// ============================================================================

/**
 * Applica valori "nella norma" a tutti i campi:
 * - boolean → false (nessun problema)
 * - select/radio → prima opzione
 * - multiselect → []
 * - number/scale → min o 0
 * - text/textarea → 'Nella norma'
 * - date → oggi
 */
function applyNormaDefaults(campi: CampoQuestionario[]): FormValues {
    const values: FormValues = {};
    for (const campo of campi) {
        switch (campo.type) {
            case 'boolean':
                values[campo.name] = false;
                break;
            case 'select':
            case 'radio':
                values[campo.name] = campo.options?.[0] ? normalizeOption(campo.options[0]).value : '';
                break;
            case 'multiselect':
                values[campo.name] = [];
                break;
            case 'number':
            case 'scale':
                values[campo.name] = campo.min ?? 0;
                break;
            case 'text':
                values[campo.name] = 'Nella norma';
                break;
            case 'textarea':
                values[campo.name] = 'Nella norma';
                break;
            case 'date':
                values[campo.name] = new Date().toISOString().split('T')[0];
                break;
            default:
                values[campo.name] = '';
        }
    }
    return values;
}

interface PrecompilaPreset {
    id: string;
    label: string;
    description: string;
    icon: string;
    apply: (campi: CampoQuestionario[]) => FormValues;
}

const PRECOMPILA_PRESETS: PrecompilaPreset[] = [
    {
        id: 'da-template',
        label: 'Da template',
        description: 'Usa i valori predefiniti impostati nel template',
        icon: '📋',
        apply: (campi) => {
            const values: FormValues = {};
            const hasDefaults = campi.some(c => c.defaultValue !== undefined && c.defaultValue !== '');
            if (!hasDefaults) {
                // Nessun defaultValue nel template: usa valori "nella norma"
                return applyNormaDefaults(campi);
            }
            for (const campo of campi) {
                if (campo.defaultValue !== undefined && campo.defaultValue !== '') {
                    switch (campo.type) {
                        case 'boolean':
                            values[campo.name] = campo.defaultValue === 'true' || campo.defaultValue === '1';
                            break;
                        case 'number':
                        case 'scale':
                            values[campo.name] = Number(campo.defaultValue) || 0;
                            break;
                        case 'multiselect':
                            try { values[campo.name] = JSON.parse(campo.defaultValue); }
                            catch { values[campo.name] = [campo.defaultValue]; }
                            break;
                        default:
                            values[campo.name] = campo.defaultValue;
                    }
                } else {
                    // Fields without explicit defaultValue: fall back to "nella norma" sensible defaults
                    switch (campo.type) {
                        case 'boolean': values[campo.name] = false; break;
                        case 'multiselect': values[campo.name] = []; break;
                        case 'number': case 'scale': values[campo.name] = campo.min ?? 0; break;
                        case 'select':
                        case 'radio': {
                            const opts = normalizeOptions(campo.options).filter(o => o.value !== '');
                            values[campo.name] = opts[0]?.value || '';
                            break;
                        }
                        case 'text':
                        case 'textarea': values[campo.name] = 'Nella norma'; break;
                        case 'date': values[campo.name] = new Date().toISOString().split('T')[0]; break;
                        default: values[campo.name] = '';
                    }
                }
            }
            return values;
        }
    },
    {
        id: 'nella-norma',
        label: 'Nella norma',
        description: 'Tutti i campi impostati su valori normali/negativi',
        icon: '✅',
        apply: (campi) => applyNormaDefaults(campi)
    },
    {
        id: 'tutto-si',
        label: 'Tutto Sì',
        description: 'Checkbox attivate, prime opzioni selezionate',
        icon: '👍',
        apply: (campi) => {
            const values: FormValues = {};
            for (const campo of campi) {
                switch (campo.type) {
                    case 'boolean':
                        values[campo.name] = true;
                        break;
                    case 'select':
                        values[campo.name] = campo.options?.[0] ? normalizeOption(campo.options[0]).value : '';
                        break;
                    case 'multiselect':
                        values[campo.name] = normalizeOptions(campo.options).map(o => o.value);
                        break;
                    case 'number':
                    case 'scale':
                        values[campo.name] = campo.max ?? 10;
                        break;
                    case 'text':
                    case 'textarea':
                        values[campo.name] = 'Sì';
                        break;
                    case 'date':
                        values[campo.name] = new Date().toISOString().split('T')[0];
                        break;
                    default:
                        values[campo.name] = '';
                }
            }
            return values;
        }
    },
    {
        id: 'tutto-no',
        label: 'Tutto No',
        description: 'Checkbox disattivate, campi azzerati',
        icon: '👎',
        apply: (campi) => {
            const values: FormValues = {};
            for (const campo of campi) {
                switch (campo.type) {
                    case 'boolean':
                        values[campo.name] = false;
                        break;
                    case 'select':
                        values[campo.name] = '';
                        break;
                    case 'multiselect':
                        values[campo.name] = [];
                        break;
                    case 'number':
                    case 'scale':
                        values[campo.name] = campo.min ?? 0;
                        break;
                    case 'text':
                    case 'textarea':
                        values[campo.name] = 'No';
                        break;
                    case 'date':
                        values[campo.name] = '';
                        break;
                    default:
                        values[campo.name] = '';
                }
            }
            return values;
        }
    },
    {
        id: 'reset',
        label: 'Reset',
        description: 'Ripristina tutti i campi ai valori predefiniti',
        icon: '🔄',
        apply: (campi) => getDefaultValues(campi)
    }
];

// ============================================================================
// FIELD COMPONENTS
// ============================================================================

interface FieldProps {
    campo: CampoQuestionario;
    value: FormValues[string];
    onChange: (name: string, value: FormValues[string]) => void;
    readOnly?: boolean;
    error?: string;
}

function TextField({ campo, value, onChange, readOnly, error }: FieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={campo.name}>
                {campo.label}
                {campo.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
                id={campo.name}
                value={(value as string) ?? ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(campo.name, e.target.value)}
                placeholder={campo.placeholder}
                disabled={readOnly}
                className={cn(error && 'border-red-500')}
            />
            {campo.helpText && (
                <p className="text-xs text-gray-500">{campo.helpText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

function TextareaField({ campo, value, onChange, readOnly, error }: FieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={campo.name}>
                {campo.label}
                {campo.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
                id={campo.name}
                value={(value as string) ?? ''}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(campo.name, e.target.value)}
                placeholder={campo.placeholder}
                disabled={readOnly}
                rows={4}
                className={cn(error && 'border-red-500')}
            />
            {campo.helpText && (
                <p className="text-xs text-gray-500">{campo.helpText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

function NumberField({ campo, value, onChange, readOnly, error }: FieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={campo.name}>
                {campo.label}
                {campo.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
                id={campo.name}
                type="number"
                value={(value as number) ?? ''}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(campo.name, e.target.value ? Number(e.target.value) : null)}
                min={campo.min}
                max={campo.max}
                step={campo.step ?? 1}
                placeholder={campo.placeholder}
                disabled={readOnly}
                className={cn('w-32', error && 'border-red-500')}
            />
            {campo.helpText && (
                <p className="text-xs text-gray-500">{campo.helpText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

function BooleanField({ campo, value, onChange, readOnly, error }: FieldProps) {
    const boolValue = value as boolean | null;
    return (
        <div className="space-y-2">
            <Label>
                {campo.label}
                {campo.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name={campo.name}
                        checked={boolValue === true}
                        onChange={() => onChange(campo.name, true)}
                        disabled={readOnly}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">Sì</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="radio"
                        name={campo.name}
                        checked={boolValue === false}
                        onChange={() => onChange(campo.name, false)}
                        disabled={readOnly}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">No</span>
                </label>
            </div>
            {campo.helpText && (
                <p className="text-xs text-gray-500">{campo.helpText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

function DateField({ campo, value, onChange, readOnly, error }: FieldProps) {
    return (
        <div className="space-y-2">
            <Label htmlFor={campo.name}>
                {campo.label}
                {campo.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <DatePickerElegante
                value={(value as string) ?? ''}
                onChange={(date) => onChange(campo.name, date ? date.toISOString().split('T')[0] : '')}
                theme="teal"
                disabled={readOnly}
            />
            {campo.helpText && (
                <p className="text-xs text-gray-500">{campo.helpText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

function SelectField({ campo, value, onChange, readOnly, error }: FieldProps) {
    const valueStr = (value as string) ?? '';
    const opts = normalizeOptions(campo.options);
    // Find the label for the current value so SelectValue displays correctly
    // even when the dropdown has never been opened (Radix context not yet populated)
    const selectedLabel = opts.find(o => o.value === valueStr)?.label;

    return (
        <div className="space-y-2">
            <Label htmlFor={campo.name}>
                {campo.label}
                {campo.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
                value={valueStr}
                onValueChange={(val: string) => onChange(campo.name, val)}
            >
                <SelectTrigger
                    className={cn('w-full max-w-xs', error && 'border-red-500')}
                    disabled={readOnly}
                >
                    <SelectValue placeholder={campo.placeholder || selectedLabel || 'Seleziona...'} />
                </SelectTrigger>
                <SelectContent>
                    {opts.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {campo.helpText && (
                <p className="text-xs text-gray-500">{campo.helpText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

function MultiselectField({ campo, value, onChange, readOnly, error }: FieldProps) {
    const values = (value as string[]) || [];

    const toggleOption = (optionValue: string) => {
        if (values.includes(optionValue)) {
            onChange(campo.name, values.filter((v) => v !== optionValue));
        } else {
            onChange(campo.name, [...values, optionValue]);
        }
    };

    return (
        <div className="space-y-2">
            <Label>
                {campo.label}
                {campo.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
                {normalizeOptions(campo.options).map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                        <Checkbox
                            id={`${campo.name}-${opt.value}`}
                            checked={values.includes(opt.value)}
                            onCheckedChange={() => toggleOption(opt.value)}
                            disabled={readOnly}
                        />
                        <Label
                            htmlFor={`${campo.name}-${opt.value}`}
                            className="cursor-pointer font-normal"
                        >
                            {opt.label}
                        </Label>
                    </div>
                ))}
            </div>
            {campo.helpText && (
                <p className="text-xs text-gray-500">{campo.helpText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

function RadioField({ campo, value, onChange, readOnly, error }: FieldProps) {
    const opts = normalizeOptions(campo.options);
    return (
        <div className="space-y-2">
            <Label>
                {campo.label}
                {campo.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
                {opts.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name={campo.name}
                            checked={(value as string) === opt.value}
                            onChange={() => onChange(campo.name, opt.value)}
                            disabled={readOnly}
                            className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                ))}
            </div>
            {campo.helpText && (
                <p className="text-xs text-gray-500">{campo.helpText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

function ScaleField({ campo, value, onChange, readOnly, error }: FieldProps) {
    const min = campo.min ?? 0;
    const max = campo.max ?? 10;
    const currentValue = (value as number) ?? min;

    return (
        <div className="space-y-2">
            <Label htmlFor={campo.name}>
                {campo.label}
                {campo.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-8">{min}</span>
                <input
                    type="range"
                    value={currentValue}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(campo.name, Number(e.target.value))}
                    min={min}
                    max={max}
                    step={campo.step ?? 1}
                    disabled={readOnly}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-500 w-8">{max}</span>
                <Badge variant="outline" className="ml-2">
                    {currentValue}
                </Badge>
            </div>
            {campo.helpText && (
                <p className="text-xs text-gray-500">{campo.helpText}</p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function QuestionarioRenderer({
    template,
    compilatoDa,
    pazienteId,
    visitaId,
    onSubmit,
    onSave,
    onSign,
    readOnly = false,
    initialData,
    isLoading = false,
    className,
}: QuestionarioRendererProps) {
    // Normalizza campi: template legacy usano 'key' invece di 'name'
    const campi = useMemo(() => {
        const rawCampi = (template.campi ?? []) as (CampoQuestionario & { key?: string })[];
        return rawCampi.map(c => ({
            ...c,
            // Se name è assente (template MDL legacy), usa key come fallback
            name: c.name || c.key || '',
        })) as CampoQuestionario[];
    }, [template.campi]);
    const config = template.questionarioConfig;

    const [formValues, setFormValues] = useState<FormValues>(() =>
        getDefaultValues(campi, initialData?.datiCompilati as Record<string, unknown> | undefined)
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isDirty, setIsDirty] = useState(false);
    const { showToast } = useToast();

    const handleFieldChange = useCallback((name: string, value: FormValues[string]) => {
        setFormValues(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);
        // Clear error on change
        setErrors(prev => {
            const next = { ...prev };
            delete next[name];
            return next;
        });
    }, []);

    const validateForm = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        for (const campo of campi) {
            // Skip validation for conditionally hidden fields (S59)
            if (!isFieldVisible(campo as any, formValues as Record<string, unknown>, campi as any[])) {
                continue;
            }
            const error = validateField(campo, formValues[campo.name]);
            if (error) {
                newErrors[campo.name] = error;
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    }, [campi, formValues]);

    const handleFormSubmit = useCallback((e: FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const risposte = campi.map((campo) => ({
            // Fallback: alcuni template legacy usano 'key' invece di 'name'
            campoId: campo.name || (campo as unknown as Record<string, string>).key || '',
            campoLabel: campo.label,
            ...(campo.type === 'text' || campo.type === 'textarea' ? { valoreTesto: formValues[campo.name] as string } : {}),
            ...(campo.type === 'number' || campo.type === 'scale' ? { valoreNumerico: formValues[campo.name] as number } : {}),
            ...(campo.type === 'boolean' ? { valoreBoolean: formValues[campo.name] as boolean } : {}),
            ...(campo.type === 'date' ? { valoreData: formValues[campo.name] as string } : {}),
            ...(campo.type === 'select' || campo.type === 'radio' ? { valoreTesto: formValues[campo.name] as string } : {}),
            ...(campo.type === 'multiselect' ? { valoreJson: formValues[campo.name] } : {}),
        }));

        onSubmit({
            pazienteId,
            visitaId,
            datiCompilati: formValues,
            risposte,
        });
    }, [campi, formValues, pazienteId, visitaId, onSubmit, validateForm]);

    const handleSaveDraft = useCallback(() => {
        if (onSave) {
            onSave({
                pazienteId,
                visitaId,
                datiCompilati: formValues,
            });
        }
    }, [formValues, onSave, pazienteId, visitaId]);

    // Pre-compila: apply template defaults to all fields (single direct action)
    const handleApplyTemplatePreset = useCallback(() => {
        const templatePreset = PRECOMPILA_PRESETS.find(p => p.id === 'da-template');
        if (!templatePreset) return;
        if (campi.length === 0) {
            showToast({ message: 'Nessun campo da pre-compilare in questo template', type: 'info' });
            return;
        }
        const newValues = templatePreset.apply(campi);
        setFormValues(newValues);
        setIsDirty(true);
        setErrors({});
        showToast({ message: `${Object.keys(newValues).length} campi pre-compilati con i valori di default`, type: 'success' });
    }, [campi, showToast]);

    const renderField = useCallback(
        (campo: CampoQuestionario) => {
            const fieldProps: FieldProps = {
                campo,
                value: formValues[campo.name],
                onChange: handleFieldChange,
                readOnly,
                error: errors[campo.name],
            };

            switch (campo.type) {
                case 'text':
                    return <TextField key={campo.name} {...fieldProps} />;
                case 'textarea':
                    return <TextareaField key={campo.name} {...fieldProps} />;
                case 'number':
                    return <NumberField key={campo.name} {...fieldProps} />;
                case 'boolean':
                    return <BooleanField key={campo.name} {...fieldProps} />;
                case 'date':
                    return <DateField key={campo.name} {...fieldProps} />;
                case 'select':
                    return <SelectField key={campo.name} {...fieldProps} />;
                case 'radio':
                    return <RadioField key={campo.name} {...fieldProps} />;
                case 'multiselect':
                    return <MultiselectField key={campo.name} {...fieldProps} />;
                case 'scale':
                    return <ScaleField key={campo.name} {...fieldProps} />;
                default:
                    return <TextField key={campo.name} {...fieldProps} />;
            }
        },
        [formValues, handleFieldChange, readOnly, errors]
    );

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-xl">{template.nome}</CardTitle>
                            {template.descrizione && (
                                <CardDescription className="mt-1">{template.descrizione}</CardDescription>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {config?.haScoring && (
                                <Badge variant="outline" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Con Scoring
                                </Badge>
                            )}
                            {config?.tempoStimato && (
                                <Badge variant="outline" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    {config.tempoStimato} min
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Istruzioni */}
            {((compilatoDa === 'PAZIENTE' && config?.istruzioniPaziente) ||
                (compilatoDa === 'MEDICO' && config?.istruzioniMedico)) && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Istruzioni:</strong>{' '}
                            {compilatoDa === 'PAZIENTE' ? config?.istruzioniPaziente : config?.istruzioniMedico}
                        </AlertDescription>
                    </Alert>
                )}

            {/* Esito critico precedente */}
            {initialData?.esitoCritico && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Attenzione: Esito Critico</strong><br />
                        {initialData.noteAlgoritmo || 'Questo questionario ha prodotto un esito che richiede attenzione.'}
                        {initialData.punteggioTotale && (
                            <span className="block mt-1 font-medium">
                                Punteggio: {initialData.punteggioTotale}
                                {initialData.punteggioPercentuale && ` (${initialData.punteggioPercentuale.toFixed(0)}%)`}
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit}>
                {/* Pre-compila Bar */}
                {!readOnly && campi.length > 0 && (
                    <div className="mb-4">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleApplyTemplatePreset}
                            className="gap-2 text-gray-600 hover:text-teal-700 hover:border-teal-300"
                            title="Compila automaticamente con i valori predefiniti del template"
                        >
                            <Wand2 className="h-4 w-4" />
                            Pre-compila risposte
                        </Button>
                    </div>
                )}

                <Card>
                    <CardContent className="pt-6 space-y-6">
                        {campi.map((campo) => {
                            // Evaluate conditional visibility (S59)
                            if (!isFieldVisible(campo as any, formValues as Record<string, unknown>, campi as any[])) {
                                return null;
                            }
                            return renderField(campo);
                        })}
                    </CardContent>
                </Card>

                {/* Firme */}
                {(template.richiedeFirma || template.richiedeFirmaMedico || template.richiedeFirmaDipendente || template.richiedeFirmaFormatore || template.richiedeFirmaDatore) && (
                    <>
                        <Separator className="my-6" />
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileSignature className="h-5 w-5" />
                                    Firme richieste
                                </CardTitle>
                                <CardDescription>
                                    Apporre le firme richieste nei riquadri sottostanti
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Firma paziente — gestita tramite Azioni Rapide */}
                                {template.richiedeFirma && (
                                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                        <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                                            <FileSignature className="h-4 w-4" />
                                            Firma Paziente richiesta
                                        </p>
                                        <p className="text-xs text-amber-600 mt-1">
                                            La firma del paziente verrà raccolta dopo la compilazione tramite la sezione "Firma" nelle Azioni Rapide
                                        </p>
                                    </div>
                                )}

                                {/* Firma medico — placeholder (gestita separatamente dalla visita) */}
                                {template.richiedeFirmaMedico && (
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                            <FileSignature className="h-4 w-4" />
                                            Firma Medico richiesta
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            La firma del medico verrà applicata dopo la compilazione tramite "Azioni Rapide"
                                        </p>
                                    </div>
                                )}

                                {/* Firma dipendente */}
                                {template.richiedeFirmaDipendente && (
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FileSignature className="h-4 w-4" />
                                            Firma Dipendente richiesta
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            La firma del dipendente verrà applicata tramite "Azioni Rapide"
                                        </p>
                                    </div>
                                )}

                                {/* Firma formatore */}
                                {template.richiedeFirmaFormatore && (
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FileSignature className="h-4 w-4" />
                                            Firma Formatore richiesta
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            La firma del formatore verrà applicata tramite "Azioni Rapide"
                                        </p>
                                    </div>
                                )}

                                {/* Firma datore lavoro */}
                                {template.richiedeFirmaDatore && (
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <FileSignature className="h-4 w-4" />
                                            Firma Datore di Lavoro richiesta
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            La firma del datore verrà applicata tramite "Azioni Rapide"
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Actions */}
                {!readOnly && (
                    <div className="flex items-center justify-between pt-6">
                        <div>
                            {onSave && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleSaveDraft}
                                    disabled={!isDirty || isLoading}
                                    className="gap-2"
                                >
                                    <Save className="h-4 w-4" />
                                    Salva Bozza
                                </Button>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="gap-2 bg-teal-600 hover:bg-teal-700"
                        >
                            {isLoading ? (
                                'Invio in corso...'
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    {template.richiedeFirma || template.richiedeFirmaMedico ? 'Invia e Firma' : 'Invia Questionario'}
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
}

export default QuestionarioRenderer;
