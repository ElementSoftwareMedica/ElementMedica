/**
 * ConditionalEditor Component
 * 
 * Editor for field conditional logic (show/hide based on other field values).
 */

import React, { useState, useEffect } from 'react';
import type { FormField } from './types';

interface ConditionalEditorProps {
    conditional?: any;
    onChange: (conditional: any) => void;
    availableFields: FormField[];
}

const ConditionalEditor: React.FC<ConditionalEditorProps> = ({ 
    conditional, 
    onChange, 
    availableFields 
}) => {
    const [enabled, setEnabled] = useState(!!conditional);
    const [operator, setOperator] = useState(conditional?.operator || 'equals');
    const [targetField, setTargetField] = useState(conditional?.field || '');
    const [targetValue, setTargetValue] = useState(conditional?.value || '');

    const handleToggle = (checked: boolean) => {
        setEnabled(checked);
        if (!checked) {
            onChange(undefined);
        } else {
            onChange({
                type: 'simple',
                operator,
                field: targetField,
                value: targetValue
            });
        }
    };

    const handleUpdate = () => {
        if (!enabled) return;
        onChange({
            type: 'simple',
            operator,
            field: targetField,
            value: targetValue
        });
    };

    useEffect(() => {
        handleUpdate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [operator, targetField, targetValue]);

    return (
        <div className="space-y-2">
            <label className="flex items-center text-xs">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => handleToggle(e.target.checked)}
                    className="mr-2"
                />
                Mostra campo solo se...
            </label>

            {enabled && (
                <div className="grid grid-cols-3 gap-2">
                    <select
                        value={targetField}
                        onChange={(e) => setTargetField(e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded"
                    >
                        <option value="">Campo...</option>
                        {availableFields.map(f => (
                            <option key={f.id} value={f.name}>{f.label}</option>
                        ))}
                    </select>

                    <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded"
                    >
                        <option value="equals">uguale a</option>
                        <option value="notEquals">diverso da</option>
                        <option value="contains">contiene</option>
                        <option value="greaterThan">&gt;</option>
                        <option value="lessThan">&lt;</option>
                        <option value="greaterOrEqual">&gt;=</option>
                        <option value="lessOrEqual">&lt;=</option>
                        <option value="isEmpty">vuoto</option>
                        <option value="isNotEmpty">non vuoto</option>
                    </select>

                    {!['isEmpty', 'isNotEmpty'].includes(operator) && (
                        <input
                            type="text"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded"
                            placeholder="Valore..."
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default ConditionalEditor;
