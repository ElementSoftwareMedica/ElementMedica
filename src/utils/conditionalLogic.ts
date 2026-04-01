/**
 * Conditional Logic Evaluator
 * 
 * Valuta le condizioni per mostrare/nascondere sezioni e campi
 * Supporta 30+ operatori condizionali
 */

import type { 
  ConditionalLogic, 
  SimpleCondition, 
  ComplexCondition,
  ConditionOperator 
} from '../types/forms';

/**
 * Valuta una condizione simple contro i dati del form
 */
export function evaluateSimpleCondition(
  condition: SimpleCondition,
  formData: Record<string, any>
): boolean {
  const fieldValue = formData[condition.field];
  const { operator, value, value2 } = condition;

  // Helper: converti a stringa per confronti
  const asString = (v: any): string => {
    if (v === null || v === undefined) return '';
    return String(v);
  };

  // Helper: converti a numero
  const asNumber = (v: any): number => {
    if (v === null || v === undefined) return 0;
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  };

  // Helper: converti a data
  const asDate = (v: any): Date | null => {
    if (!v) return null;
    const date = new Date(v);
    return isNaN(date.getTime()) ? null : date;
  };

  // Helper: converti ad array
  const asArray = (v: any): any[] => {
    if (Array.isArray(v)) return v;
    if (v === null || v === undefined || v === '') return [];
    return [v];
  };

  switch (operator) {
    // String operators
    case 'equals':
      return asString(fieldValue) === asString(value);

    case 'not_equals':
      return asString(fieldValue) !== asString(value);

    case 'contains':
      return asString(fieldValue).toLowerCase().includes(asString(value).toLowerCase());

    case 'not_contains':
      return !asString(fieldValue).toLowerCase().includes(asString(value).toLowerCase());

    case 'starts_with':
      return asString(fieldValue).toLowerCase().startsWith(asString(value).toLowerCase());

    case 'ends_with':
      return asString(fieldValue).toLowerCase().endsWith(asString(value).toLowerCase());

    case 'is_empty':
      return !fieldValue || asString(fieldValue).trim() === '';

    case 'is_not_empty':
      return !!fieldValue && asString(fieldValue).trim() !== '';

    // Numeric operators
    case 'greater':
    case 'greater_than':
      return asNumber(fieldValue) > asNumber(value);

    case 'greater_or_equal':
    case 'greater_than_or_equal':
      return asNumber(fieldValue) >= asNumber(value);

    case 'less':
    case 'less_than':
      return asNumber(fieldValue) < asNumber(value);

    case 'less_or_equal':
    case 'less_than_or_equal':
      return asNumber(fieldValue) <= asNumber(value);

    case 'between': {
      const num = asNumber(fieldValue);
      const min = asNumber(value);
      const max = asNumber(value2);
      return num >= min && num <= max;
    }

    case 'not_between': {
      const num = asNumber(fieldValue);
      const min = asNumber(value);
      const max = asNumber(value2);
      return num < min || num > max;
    }

    // Array operators
    case 'in': {
      const arr = asArray(value);
      return arr.includes(fieldValue);
    }

    case 'not_in': {
      const arr = asArray(value);
      return !arr.includes(fieldValue);
    }

    case 'includes_all': {
      const fieldArr = asArray(fieldValue);
      const valueArr = asArray(value);
      return valueArr.every(v => fieldArr.includes(v));
    }

    case 'includes_any': {
      const fieldArr = asArray(fieldValue);
      const valueArr = asArray(value);
      return valueArr.some(v => fieldArr.includes(v));
    }

    case 'includes_none': {
      const fieldArr = asArray(fieldValue);
      const valueArr = asArray(value);
      return !valueArr.some(v => fieldArr.includes(v));
    }

    // Date operators
    case 'date_equals': {
      const fieldDate = asDate(fieldValue);
      const valueDate = asDate(value);
      if (!fieldDate || !valueDate) return false;
      return fieldDate.toDateString() === valueDate.toDateString();
    }

    case 'date_before': {
      const fieldDate = asDate(fieldValue);
      const valueDate = asDate(value);
      if (!fieldDate || !valueDate) return false;
      return fieldDate < valueDate;
    }

    case 'date_after': {
      const fieldDate = asDate(fieldValue);
      const valueDate = asDate(value);
      if (!fieldDate || !valueDate) return false;
      return fieldDate > valueDate;
    }

    case 'date_between': {
      const fieldDate = asDate(fieldValue);
      const minDate = asDate(value);
      const maxDate = asDate(value2);
      if (!fieldDate || !minDate || !maxDate) return false;
      return fieldDate >= minDate && fieldDate <= maxDate;
    }

    // Boolean operators
    case 'is_true':
      return fieldValue === true || fieldValue === 'true' || fieldValue === '1' || fieldValue === 1;

    case 'is_false':
      return fieldValue === false || fieldValue === 'false' || fieldValue === '0' || fieldValue === 0 || !fieldValue;

    // Pattern operators
    case 'matches_regex':
      try {
        const regex = new RegExp(asString(value));
        return regex.test(asString(fieldValue));
      } catch {
        return false;
      }

    case 'not_matches_regex':
      try {
        const regex = new RegExp(asString(value));
        return !regex.test(asString(fieldValue));
      } catch {
        return true;
      }

    // Length operators
    case 'length_equals':
      return asString(fieldValue).length === asNumber(value);

    case 'length_greater_than':
      return asString(fieldValue).length > asNumber(value);

    case 'length_less_than':
      return asString(fieldValue).length < asNumber(value);

    default:
      return false;
  }
}

/**
 * Valuta una condizione complex (AND/OR) ricorsivamente
 */
export function evaluateComplexCondition(
  condition: ComplexCondition,
  formData: Record<string, any>
): boolean {
  // Supporta sia 'operator' che 'logic' come field name
  const logicOp = condition.logic || condition.operator;
  const { conditions } = condition;

  if (!conditions || conditions.length === 0) {
    return true; // Empty complex condition = always true
  }

  const results = conditions.map(cond => {
    if ('simple' in cond && cond.simple) {
      return evaluateSimpleCondition(cond.simple, formData);
    } else if ('complex' in cond && cond.complex) {
      return evaluateComplexCondition(cond.complex, formData);
    }
    return false;
  });

  if (logicOp === 'AND') {
    return results.every(r => r === true);
  } else if (logicOp === 'OR') {
    return results.some(r => r === true);
  } else if (logicOp === 'NOT') {
    return !results[0]; // NOT applies to first condition only
  }
  return false;
}

/**
 * Valuta una condizione generica (simple o complex)
 */
export function evaluateCondition(
  condition: ConditionalLogic | null | undefined,
  formData: Record<string, any>
): boolean {
  if (!condition) {
    return true; // No condition = always visible
  }

  if (condition.simple) {
    return evaluateSimpleCondition(condition.simple, formData);
  }

  if (condition.complex) {
    return evaluateComplexCondition(condition.complex, formData);
  }

  // Ignora entity, permission, workflow per ora (solo client-side)
  // TODO: implementare entity/permission/workflow conditions
  return true; // Fallback: show if condition format unknown
}

/**
 * Valuta se una sezione deve essere visibile
 */
export function isSectionVisible(
  section: { conditional?: ConditionalLogic | null },
  formData: Record<string, any>
): boolean {
  return evaluateCondition(section.conditional, formData);
}

/**
 * Valuta se un campo deve essere visibile
 */
export function isFieldVisible(
  field: { conditional?: ConditionalLogic | null },
  formData: Record<string, any>
): boolean {
  return evaluateCondition(field.conditional, formData);
}

/**
 * Filtra i campi visibili di una sezione
 */
export function getVisibleFields(
  fields: Array<{ conditional?: ConditionalLogic | null }>,
  formData: Record<string, any>
) {
  return fields.filter(field => isFieldVisible(field, formData));
}

/**
 * Ottiene le sezioni visibili con i loro campi visibili
 */
export function getVisibleSections<
  TSection extends { id: string; conditional?: ConditionalLogic | null },
  TField extends { sectionId?: string; conditional?: ConditionalLogic | null }
>(
  sections: TSection[],
  allFields: TField[],
  formData: Record<string, any>
) {
  return sections
    .filter(section => isSectionVisible(section, formData))
    .map(section => ({
      ...section,
      fields: allFields
        .filter(field => field.sectionId === section.id)
        .filter(field => isFieldVisible(field, formData))
    }))
    .filter(section => section.fields.length > 0);
}
