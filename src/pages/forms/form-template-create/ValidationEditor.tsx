/**
 * ValidationEditor Component
 * 
 * Editor for field validation rules.
 */

import React, { useState } from 'react';

interface ValidationEditorProps {
    validation?: any;
    fieldType: string;
    onChange: (validation: any) => void;
}

interface ValidationRule {
    name: string;
    label: string;
    type: 'number' | 'text' | 'boolean' | 'date';
}

/**
 * Get available validation rules based on field type
 */
const getAvailableRules = (fieldType: string): ValidationRule[] => {
    if (['text', 'textarea'].includes(fieldType)) {
        return [
            { name: 'minLength', label: 'Lunghezza minima', type: 'number' },
            { name: 'maxLength', label: 'Lunghezza massima', type: 'number' },
            { name: 'pattern', label: 'Pattern (regex)', type: 'text' },
            { name: 'alphanumeric', label: 'Solo alfanumerico', type: 'boolean' },
            { name: 'noSpecialChars', label: 'Nessun carattere speciale', type: 'boolean' },
        ];
    }

    if (fieldType === 'number') {
        return [
            { name: 'minValue', label: 'Valore minimo', type: 'number' },
            { name: 'maxValue', label: 'Valore massimo', type: 'number' },
            { name: 'integer', label: 'Solo numeri interi', type: 'boolean' },
            { name: 'positive', label: 'Solo numeri positivi', type: 'boolean' },
        ];
    }

    if (fieldType === 'email') {
        return [
            { name: 'email', label: 'Formato email valido', type: 'boolean' },
            { name: 'minLength', label: 'Lunghezza minima', type: 'number' },
            { name: 'maxLength', label: 'Lunghezza massima', type: 'number' },
            { name: 'allowedDomains', label: 'Domini consentiti (es: gmail.com,yahoo.it)', type: 'text' },
        ];
    }

    if (fieldType === 'tel') {
        return [
            { name: 'phone', label: 'Formato telefono valido', type: 'boolean' },
            { name: 'pattern', label: 'Pattern (regex)', type: 'text' },
            { name: 'minLength', label: 'Lunghezza minima', type: 'number' },
            { name: 'maxLength', label: 'Lunghezza massima', type: 'number' },
        ];
    }

    if (fieldType === 'date') {
        return [
            { name: 'minDate', label: 'Data minima', type: 'date' },
            { name: 'maxDate', label: 'Data massima', type: 'date' },
            { name: 'futureOnly', label: 'Solo date future', type: 'boolean' },
            { name: 'pastOnly', label: 'Solo date passate', type: 'boolean' },
        ];
    }

    if (['radio', 'select', 'checkbox'].includes(fieldType)) {
        return [
            { name: 'minSelections', label: 'Selezioni minime', type: 'number' },
            { name: 'maxSelections', label: 'Selezioni massime', type: 'number' },
        ];
    }

    if (fieldType === 'file') {
        return [
            { name: 'maxSize', label: 'Dimensione massima (MB)', type: 'number' },
            { name: 'allowedExtensions', label: 'Estensioni consentite (es: pdf,doc,jpg)', type: 'text' },
            { name: 'maxFiles', label: 'Numero massimo file', type: 'number' },
        ];
    }

    if (fieldType === 'url') {
        return [
            { name: 'url', label: 'Formato URL valido', type: 'boolean' },
            { name: 'requireProtocol', label: 'Richiedi protocollo (https://)', type: 'boolean' },
        ];
    }

    return [];
};

const ValidationEditor: React.FC<ValidationEditorProps> = ({ 
    validation, 
    fieldType, 
    onChange 
}) => {
    const [rules, setRules] = useState<any>(validation || {});

    const handleRuleChange = (ruleName: string, value: any) => {
        const newRules = { ...rules, [ruleName]: value };
        if (value === '' || value === undefined || value === null) {
            delete newRules[ruleName];
        }
        setRules(newRules);
        onChange(Object.keys(newRules).length > 0 ? newRules : undefined);
    };

    const availableRules = getAvailableRules(fieldType);

    return (
        <div className="space-y-2">
            {availableRules.length === 0 ? (
                <p className="text-xs text-gray-500">Nessuna regola disponibile per questo tipo di campo</p>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {availableRules.map(rule => (
                        <div key={rule.name} className="flex items-center space-x-2">
                            {rule.type === 'boolean' ? (
                                <label className="flex items-center text-xs">
                                    <input
                                        type="checkbox"
                                        checked={!!rules[rule.name]}
                                        onChange={(e) => handleRuleChange(rule.name, e.target.checked)}
                                        className="mr-2"
                                    />
                                    {rule.label}
                                </label>
                            ) : (
                                <>
                                    <label className="text-xs text-gray-700 whitespace-nowrap">{rule.label}:</label>
                                    <input
                                        type={rule.type}
                                        value={rules[rule.name] || ''}
                                        onChange={(e) => handleRuleChange(rule.name, e.target.value)}
                                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                                        placeholder={rule.type === 'number' ? '0' : 'Valore...'}
                                    />
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {Object.keys(rules).length > 0 && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                    ✓ {Object.keys(rules).length} regola/e attiva/e
                </div>
            )}
        </div>
    );
};

export default ValidationEditor;
