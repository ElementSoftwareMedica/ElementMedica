import React, { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { useErrorHandler } from './index';

type ValidationRuleFn = (value: unknown, formData?: Record<string, unknown>) => string | null;

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  custom?: ValidationRuleFn;
  customMessage?: string;
}

export type ValidationSchema = Record<string, ValidationRule>;

interface UseFormValidationReturn<T extends Record<string, unknown>> {
  formData: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  setFormData: Dispatch<SetStateAction<T>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  validateField: (fieldName: string, value?: unknown) => string | null;
  validateForm: () => boolean;
  resetForm: () => void;
  setFieldValue: (fieldName: string, value: unknown) => void;
  getFieldProps: (fieldName: string) => {
    name: string;
    value: unknown;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    error: string | undefined;
  };
}

/**
 * Hook per gestire la validazione dei form con uno schema definito
 */
export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validationSchema: ValidationSchema = {},
  onSubmit?: (values: T) => void
): UseFormValidationReturn<T> {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { handleError } = useErrorHandler();

  /**
   * Validazione di un singolo campo con lo schema
   */
  const validateField = useCallback(
    (fieldName: string, value: unknown = undefined): string | null => {
      const fieldValue = value !== undefined ? value : formData[fieldName];
      const rules = validationSchema[fieldName];

      if (!rules) return null;

      // Validazione del campo richiesto
      if (rules.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
        return t('errors.required');
      }

      // Salta la validazione se il valore è vuoto ma non è richiesto
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        return null;
      }

      // Validazione minLength (per stringhe)
      if (rules.minLength !== undefined && typeof fieldValue === 'string' && fieldValue.length < rules.minLength) {
        return t('validation.minLength', { min: rules.minLength });
      }

      // Validazione maxLength (per stringhe)
      if (rules.maxLength !== undefined && typeof fieldValue === 'string' && fieldValue.length > rules.maxLength) {
        return t('validation.maxLength', { max: rules.maxLength });
      }

      // Validazione min (per numeri)
      if (rules.min !== undefined && typeof fieldValue === 'number' && fieldValue < rules.min) {
        return t('validation.min', { min: rules.min });
      }

      // Validazione max (per numeri)
      if (rules.max !== undefined && typeof fieldValue === 'number' && fieldValue > rules.max) {
        return t('validation.max', { max: rules.max });
      }

      // Validazione pattern (per stringhe)
      if (rules.pattern && typeof fieldValue === 'string' && !rules.pattern.test(fieldValue)) {
        return t('validation.pattern');
      }

      // Validazione email (per stringhe)
      if (
        rules.email &&
        typeof fieldValue === 'string' &&
        !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(fieldValue)
      ) {
        return t('validation.email');
      }

      // Validazione custom
      if (rules.custom) {
        const customError = rules.custom(fieldValue, formData);
        if (customError) {
          return rules.customMessage || customError;
        }
      }

      return null;
    },
    [formData, validationSchema, t]
  );

  /**
   * Validazione dell'intero form
   */
  const validateForm = useCallback((): boolean => {
    const validationErrors: Record<string, string> = {};
    let isValid = true;

    Object.keys(validationSchema).forEach((fieldName) => {
      const errorMessage = validateField(fieldName);
      if (errorMessage) {
        validationErrors[fieldName] = errorMessage;
        isValid = false;
      }
    });

    setErrors(validationErrors);
    return isValid;
  }, [validateField, validationSchema]);

  /**
   * Gestione del cambio valore nei campi
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target as HTMLInputElement;
      let finalValue: unknown = value;

      // Converti i valori in base al tipo di input
      if (type === 'number') {
        finalValue = value === '' ? '' : Number(value);
      } else if (type === 'checkbox') {
        finalValue = (e.target as HTMLInputElement).checked;
      }

      setFormData((prevData) => ({
        ...prevData,
        [name]: finalValue,
      }));

      // Se il campo è già stato toccato, aggiorna gli errori in tempo reale
      if (touched[name]) {
        const errorMessage = validateField(name, finalValue);
        setErrors((prevErrors) => ({
          ...prevErrors,
          [name]: errorMessage || '',
        }));
      }
    },
    [touched, validateField]
  );

  /**
   * Gestione dell'evento blur (uscita dal campo)
   */
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name } = e.target;

      // Marca il campo come toccato
      setTouched((prevTouched) => ({
        ...prevTouched,
        [name]: true,
      }));

      // Valida il campo
      const errorMessage = validateField(name);
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: errorMessage || '',
      }));
    },
    [validateField]
  );

  /**
   * Imposta direttamente il valore di un campo
   */
  const setFieldValue = useCallback(
    (fieldName: string, value: unknown) => {
      setFormData((prevData) => ({
        ...prevData,
        [fieldName]: value,
      }));

      // Se il campo è già stato toccato, aggiorna gli errori in tempo reale
      if (touched[fieldName]) {
        const errorMessage = validateField(fieldName, value);
        setErrors((prevErrors) => ({
          ...prevErrors,
          [fieldName]: errorMessage || '',
        }));
      }
    },
    [touched, validateField]
  );

  /**
   * Reset del form ai valori iniziali
   */
  const resetForm = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Ottieni tutte le props necessarie per un campo del form
   */
  const getFieldProps = useCallback(
    (fieldName: string) => ({
      name: fieldName,
      value: formData[fieldName],
      onChange: handleChange,
      onBlur: handleBlur,
      error: errors[fieldName],
    }),
    [formData, errors, handleChange, handleBlur]
  );

  return {
    formData,
    errors,
    touched,
    setFormData,
    handleChange,
    handleBlur,
    validateField,
    validateForm,
    resetForm,
    setFieldValue,
    getFieldProps,
  };
}

export default useFormValidation;