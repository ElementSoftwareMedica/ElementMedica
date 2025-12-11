/**
 * ElegantForm - Form wrapper che sostituisce la validazione nativa del browser
 * con messaggi eleganti e personalizzati.
 * 
 * Uso: Avvolgi qualsiasi <form> con <ElegantForm> per ottenere validazione elegante.
 * I campi con `required` mostreranno automaticamente messaggi eleganti.
 */
import React, { useRef, useState, useCallback, FormEvent } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../design-system/utils';

export interface ElegantFormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
    children: React.ReactNode;
    onSubmit?: (e: FormEvent<HTMLFormElement>, isValid: boolean) => void;
    showSuccessMessage?: boolean;
    successMessage?: string;
    errorSummary?: boolean;
    className?: string;
}

interface ValidationError {
    field: string;
    message: string;
    element: HTMLElement;
}

/**
 * Mappa dei messaggi di validazione per tipo di input
 */
const getValidationMessage = (element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string => {
    const { validity, type, name } = element;

    // Label personalizzata se presente
    const placeholder = 'placeholder' in element ? element.placeholder : '';
    const label = element.labels?.[0]?.textContent?.replace(/\s*\*\s*$/, '').trim() ||
        placeholder ||
        name ||
        'Questo campo';

    if (validity.valueMissing) {
        if (type === 'checkbox') return 'Devi accettare questa opzione';
        if (type === 'select-one' || element.tagName === 'SELECT') return `Seleziona ${label.toLowerCase()}`;
        if (type === 'file') return `Carica un file per ${label.toLowerCase()}`;
        return `${label} è obbligatorio`;
    }

    if (validity.typeMismatch) {
        if (type === 'email') return 'Inserisci un indirizzo email valido';
        if (type === 'url') return 'Inserisci un URL valido';
        return `Formato di ${label.toLowerCase()} non valido`;
    }

    if (validity.patternMismatch) {
        return element.title || `Il formato di ${label.toLowerCase()} non è corretto`;
    }

    if (validity.tooShort) {
        const minLength = (element as HTMLInputElement).minLength;
        return `${label} deve contenere almeno ${minLength} caratteri`;
    }

    if (validity.tooLong) {
        const maxLength = (element as HTMLInputElement).maxLength;
        return `${label} non può superare ${maxLength} caratteri`;
    }

    if (validity.rangeUnderflow) {
        const min = (element as HTMLInputElement).min;
        return `Il valore minimo è ${min}`;
    }

    if (validity.rangeOverflow) {
        const max = (element as HTMLInputElement).max;
        return `Il valore massimo è ${max}`;
    }

    if (validity.stepMismatch) {
        return `Inserisci un valore valido`;
    }

    if (validity.badInput) {
        return `Inserisci un valore valido per ${label.toLowerCase()}`;
    }

    return element.validationMessage || `${label} non è valido`;
};

/**
 * Applica stile di errore all'elemento
 */
const applyErrorStyle = (element: HTMLElement) => {
    element.classList.add('border-red-300', 'focus:border-red-500', 'focus:ring-red-200');
    element.classList.remove('border-gray-300', 'focus:border-blue-500', 'focus:ring-blue-200',
        'focus:border-orange-500', 'focus:ring-orange-500',
        'focus:border-primary-500', 'focus:ring-primary-500');
};

/**
 * Rimuove stile di errore dall'elemento
 */
const removeErrorStyle = (element: HTMLElement) => {
    element.classList.remove('border-red-300', 'focus:border-red-500', 'focus:ring-red-200');
    element.classList.add('border-gray-300');
};

/**
 * Crea elemento messaggio di errore
 */
const createErrorMessage = (message: string, fieldId: string): HTMLDivElement => {
    const errorDiv = document.createElement('div');
    errorDiv.id = `${fieldId}-elegant-error`;
    errorDiv.className = 'elegant-validation-error flex items-start gap-2 px-3 py-2 rounded-lg border mt-1 bg-red-50 border-red-200 animate-slide-down';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.innerHTML = `
    <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span class="text-sm font-medium text-red-600">${message}</span>
  `;
    return errorDiv;
};

/**
 * Rimuove tutti i messaggi di errore
 */
const clearAllErrors = (form: HTMLFormElement) => {
    // Rimuovi messaggi di errore
    form.querySelectorAll('.elegant-validation-error').forEach(el => el.remove());

    // Rimuovi stili di errore
    form.querySelectorAll('input, select, textarea').forEach(el => {
        removeErrorStyle(el as HTMLElement);
    });
};

/**
 * ElegantForm Component
 */
export const ElegantForm: React.FC<ElegantFormProps> = ({
    children,
    onSubmit,
    showSuccessMessage = false,
    successMessage = 'Operazione completata con successo!',
    errorSummary = false,
    className,
    ...props
}) => {
    const formRef = useRef<HTMLFormElement>(null);
    const [errors, setErrors] = useState<ValidationError[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);

    const validateForm = useCallback((): ValidationError[] => {
        if (!formRef.current) return [];

        const form = formRef.current;
        const validationErrors: ValidationError[] = [];

        // Pulisci errori precedenti
        clearAllErrors(form);

        // Trova tutti i campi da validare
        const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
        );

        fields.forEach((field) => {
            if (!field.checkValidity()) {
                const message = getValidationMessage(field);
                const fieldId = field.id || field.name || `field-${Math.random().toString(36).substr(2, 9)}`;

                // Applica stile errore
                applyErrorStyle(field);

                // Aggiungi messaggio sotto il campo
                const errorMessage = createErrorMessage(message, fieldId);

                // Trova il contenitore appropriato (label parent o field stesso)
                const container = field.closest('.relative') || field.parentElement;
                if (container) {
                    // Rimuovi eventuali errori precedenti per questo campo
                    const existingError = container.querySelector(`#${fieldId}-elegant-error`);
                    if (existingError) existingError.remove();

                    // Inserisci dopo il campo o il suo container
                    if (field.parentElement?.classList.contains('relative')) {
                        field.parentElement.after(errorMessage);
                    } else {
                        field.after(errorMessage);
                    }
                }

                validationErrors.push({
                    field: field.name || fieldId,
                    message,
                    element: field as HTMLElement
                });

                // Aggiungi listener per rimuovere errore quando l'utente corregge
                const handleInput = () => {
                    if (field.checkValidity()) {
                        removeErrorStyle(field);
                        const errorEl = document.getElementById(`${fieldId}-elegant-error`);
                        if (errorEl) {
                            errorEl.classList.add('animate-fade-out');
                            setTimeout(() => errorEl.remove(), 200);
                        }
                    }
                    field.removeEventListener('input', handleInput);
                    field.removeEventListener('change', handleInput);
                };

                field.addEventListener('input', handleInput);
                field.addEventListener('change', handleInput);
            }
        });

        return validationErrors;
    }, []);

    const handleSubmit = useCallback((e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validationErrors = validateForm();
        setErrors(validationErrors);

        const isValid = validationErrors.length === 0;

        if (!isValid && validationErrors.length > 0) {
            // Focus sul primo campo con errore
            validationErrors[0].element.focus();
        }

        if (isValid && showSuccessMessage) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }

        // Chiama il callback onSubmit originale
        if (onSubmit) {
            onSubmit(e, isValid);
        }
    }, [validateForm, onSubmit, showSuccessMessage]);

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            className={className}
            {...props}
        >
            {/* Success Message */}
            {showSuccess && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-lg border bg-green-50 border-green-200 mb-4 animate-slide-down">
                    <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-500" />
                    <span className="text-sm font-medium text-green-700">{successMessage}</span>
                </div>
            )}

            {/* Error Summary */}
            {errorSummary && errors.length > 0 && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-lg border bg-red-50 border-red-200 mb-4 animate-slide-down">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-500" />
                    <div>
                        <span className="text-sm font-medium text-red-700">
                            Correggi i seguenti errori:
                        </span>
                        <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                            {errors.map((error, index) => (
                                <li key={index}>{error.message}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {children}
        </form>
    );
};

/**
 * Hook per usare la validazione elegante in modo programmatico
 */
export function useElegantValidation() {
    const validateField = useCallback((
        element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    ): string | null => {
        if (!element.checkValidity()) {
            return getValidationMessage(element);
        }
        return null;
    }, []);

    const showFieldError = useCallback((
        element: HTMLElement,
        message: string
    ) => {
        applyErrorStyle(element);
        const fieldId = element.id || `field-${Math.random().toString(36).substr(2, 9)}`;

        // Rimuovi errore precedente
        const existingError = document.getElementById(`${fieldId}-elegant-error`);
        if (existingError) existingError.remove();

        const errorMessage = createErrorMessage(message, fieldId);
        element.after(errorMessage);
    }, []);

    const clearFieldError = useCallback((element: HTMLElement) => {
        removeErrorStyle(element);
        const fieldId = element.id;
        if (fieldId) {
            const errorEl = document.getElementById(`${fieldId}-elegant-error`);
            if (errorEl) errorEl.remove();
        }
    }, []);

    return {
        validateField,
        showFieldError,
        clearFieldError
    };
}

export default ElegantForm;
