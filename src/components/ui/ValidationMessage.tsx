/**
 * ValidationMessage - Componente per messaggi di validazione eleganti
 * Sostituisce i tooltip nativi del browser con un design professionale
 */
import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../design-system/utils';

export type ValidationMessageType = 'error' | 'success' | 'warning' | 'info';

export interface ValidationMessageProps {
    message?: string;
    type?: ValidationMessageType;
    show?: boolean;
    className?: string;
    inline?: boolean;
    animate?: boolean;
}

const typeConfig = {
    error: {
        icon: AlertCircle,
        bgColor: 'bg-red-50',
        textColor: 'text-red-600',
        iconColor: 'text-red-500',
        borderColor: 'border-red-200',
    },
    success: {
        icon: CheckCircle,
        bgColor: 'bg-green-50',
        textColor: 'text-green-600',
        iconColor: 'text-green-500',
        borderColor: 'border-green-200',
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-600',
        iconColor: 'text-amber-500',
        borderColor: 'border-amber-200',
    },
    info: {
        icon: Info,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-600',
        iconColor: 'text-blue-500',
        borderColor: 'border-blue-200',
    },
};

/**
 * Messaggio di validazione elegante con animazione
 */
export const ValidationMessage: React.FC<ValidationMessageProps> = ({
    message,
    type = 'error',
    show = true,
    className,
    inline = false,
    animate = true,
}) => {
    if (!message || !show) return null;

    const config = typeConfig[type];
    const Icon = config.icon;

    if (inline) {
        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1 text-sm',
                    config.textColor,
                    animate && 'animate-fade-in',
                    className
                )}
            >
                <Icon className={cn('w-3.5 h-3.5', config.iconColor)} />
                {message}
            </span>
        );
    }

    return (
        <div
            className={cn(
                'flex items-start gap-2 px-3 py-2 rounded-lg border mt-1',
                config.bgColor,
                config.borderColor,
                animate && 'animate-slide-down',
                className
            )}
            role="alert"
        >
            <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.iconColor)} />
            <span className={cn('text-sm font-medium', config.textColor)}>{message}</span>
        </div>
    );
};

/**
 * Componente per mostrare un asterisco rosso per campi obbligatori
 */
export const RequiredIndicator: React.FC<{ className?: string }> = ({ className }) => (
    <span className={cn('text-red-500 ml-0.5', className)} aria-hidden="true">*</span>
);

/**
 * Label con indicatore di campo obbligatorio
 */
export interface FormLabelProps {
    htmlFor?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
    error?: boolean;
}

export const FormLabel: React.FC<FormLabelProps> = ({
    htmlFor,
    required,
    children,
    className,
    error,
}) => (
    <label
        htmlFor={htmlFor}
        className={cn(
            'block text-sm font-medium mb-1',
            error ? 'text-red-600' : 'text-gray-700',
            className
        )}
    >
        {children}
        {required && <RequiredIndicator />}
    </label>
);

/**
 * Wrapper per input con validazione integrata
 */
export interface ValidatedInputWrapperProps {
    label?: string;
    htmlFor?: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}

export const ValidatedInputWrapper: React.FC<ValidatedInputWrapperProps> = ({
    label,
    htmlFor,
    required,
    error,
    hint,
    children,
    className,
}) => (
    <div className={cn('space-y-1', className)}>
        {label && (
            <FormLabel htmlFor={htmlFor} required={required} error={!!error}>
                {label}
            </FormLabel>
        )}
        {children}
        {error ? (
            <ValidationMessage message={error} type="error" />
        ) : hint ? (
            <p className="text-sm text-gray-500 mt-1">{hint}</p>
        ) : null}
    </div>
);

/**
 * Input con validazione elegante integrata
 */
export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    wrapperClassName?: string;
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
    ({ label, error, hint, wrapperClassName, className, required, id, ...props }, ref) => {
        const inputId = id || props.name;

        return (
            <ValidatedInputWrapper
                label={label}
                htmlFor={inputId}
                required={required}
                error={error}
                hint={hint}
                className={wrapperClassName}
            >
                <input
                    ref={ref}
                    id={inputId}
                    className={cn(
                        'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm',
                        'ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium',
                        'placeholder:text-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'transition-colors duration-200',
                        error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200',
                        className
                    )}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    {...props}
                />
            </ValidatedInputWrapper>
        );
    }
);
ValidatedInput.displayName = 'ValidatedInput';

/**
 * Select con validazione elegante integrata
 */
export interface ValidatedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    hint?: string;
    wrapperClassName?: string;
    options: Array<{ value: string; label: string; disabled?: boolean }>;
    placeholder?: string;
}

export const ValidatedSelect = React.forwardRef<HTMLSelectElement, ValidatedSelectProps>(
    ({ label, error, hint, wrapperClassName, className, required, id, options, placeholder, ...props }, ref) => {
        const selectId = id || props.name;

        return (
            <ValidatedInputWrapper
                label={label}
                htmlFor={selectId}
                required={required}
                error={error}
                hint={hint}
                className={wrapperClassName}
            >
                <select
                    ref={ref}
                    id={selectId}
                    className={cn(
                        'flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'transition-colors duration-200',
                        error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200',
                        className
                    )}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${selectId}-error` : undefined}
                    {...props}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((option) => (
                        <option key={option.value} value={option.value} disabled={option.disabled}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </ValidatedInputWrapper>
        );
    }
);
ValidatedSelect.displayName = 'ValidatedSelect';

/**
 * Textarea con validazione elegante integrata
 */
export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
    wrapperClassName?: string;
}

export const ValidatedTextarea = React.forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
    ({ label, error, hint, wrapperClassName, className, required, id, ...props }, ref) => {
        const textareaId = id || props.name;

        return (
            <ValidatedInputWrapper
                label={label}
                htmlFor={textareaId}
                required={required}
                error={error}
                hint={hint}
                className={wrapperClassName}
            >
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={cn(
                        'flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm',
                        'placeholder:text-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        'transition-colors duration-200 resize-y',
                        error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200',
                        className
                    )}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${textareaId}-error` : undefined}
                    {...props}
                />
            </ValidatedInputWrapper>
        );
    }
);
ValidatedTextarea.displayName = 'ValidatedTextarea';

export default ValidationMessage;
