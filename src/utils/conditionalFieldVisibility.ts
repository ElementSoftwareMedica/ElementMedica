/**
 * Conditional Field Visibility Utility
 * 
 * Shared logic for evaluating conditional field visibility in form modals.
 * Extracted from MobileQueueLanding.tsx to be reused across:
 * - ModulisticaModal (Modulistica documents)
 * - QuestionariModal (Medical questionnaires)
 * - MobileQueueLanding (Patient queue/check-in)
 * 
 * Supports operators: equals, notEquals, contains, greaterThan, lessThan, isEmpty, isNotEmpty
 * Handles boolean normalization for Italian localization (Sì/No).
 * 
 * @module utils/conditionalFieldVisibility
 * @session S59 - Conditional fields fix
 */

/**
 * Condition definition for a form field.
 * When present, the field is only visible if the condition evaluates to true.
 */
export interface FieldCondition {
    fieldName: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
    value?: string | number | boolean;
}

/**
 * Minimal field interface for conditional visibility evaluation.
 */
export interface ConditionalField {
    name: string;
    type?: string;
    condition?: FieldCondition;
}

/**
 * Normalize boolean-like values for comparison.
 * Boolean fields may store true/false but conditions use "Sì"/"No" or "true"/"false".
 */
function normalizeBooleanValue(v: unknown): string {
    if (v === true || v === 'true') return 'true';
    if (v === false || v === 'false') return 'false';
    const str = String(v ?? '').toLowerCase().trim();
    if (str === 'sì' || str === 'si' || str === 'yes' || str === '1') return 'true';
    if (str === 'no' || str === 'false' || str === '0') return 'false';
    return String(v ?? '');
}

/**
 * Evaluate whether a field should be visible based on its condition
 * and the current form values.
 * 
 * @param field - The field with an optional condition
 * @param formValues - Current form values (key-value map)
 * @param allFields - All fields in the form (used to determine source field type)
 * @returns true if the field should be visible
 */
export function isFieldVisible(
    field: ConditionalField,
    formValues: Record<string, unknown>,
    allFields: ConditionalField[] = []
): boolean {
    if (!field.condition) return true;

    const { fieldName, operator, value } = field.condition;
    const currentValue = formValues[fieldName];

    // Find the source field type to determine comparison strategy
    const sourceField = allFields.find(c => c.name === fieldName);
    const isBooleanSource = sourceField?.type === 'boolean' || typeof currentValue === 'boolean';

    switch (operator) {
        case 'equals': {
            if (isBooleanSource) {
                return normalizeBooleanValue(currentValue) === normalizeBooleanValue(value);
            }
            return String(currentValue ?? '') === String(value ?? '');
        }
        case 'notEquals': {
            if (isBooleanSource) {
                return normalizeBooleanValue(currentValue) !== normalizeBooleanValue(value);
            }
            return String(currentValue ?? '') !== String(value ?? '');
        }
        case 'contains':
            return String(currentValue ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
        case 'greaterThan':
            return Number(currentValue) > Number(value);
        case 'lessThan':
            return Number(currentValue) < Number(value);
        case 'isEmpty':
            return !currentValue || currentValue === '' || (Array.isArray(currentValue) && currentValue.length === 0);
        case 'isNotEmpty':
            return !!currentValue && currentValue !== '' && !(Array.isArray(currentValue) && currentValue.length === 0);
        default:
            return true;
    }
}
