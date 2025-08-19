import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../design-system/utils';

type FieldType = 'text' | 'textarea' | 'number' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'date';

interface FormFieldProps {
  name: string;
  label: string;
  type?: FieldType;
  value: string | number | boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  disabled?: boolean;
  readOnly?: boolean;
  labelClassName?: string;
  inputClassName?: string;
}

/**
 * Componente FormField riutilizzabile per standardizzare i campi del form
 */
const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder,
  className,
  error,
  min,
  max,
  step,
  options = [],
  rows = 3,
  disabled = false,
  readOnly = false,
  labelClassName,
  inputClassName
}) => {
  const { t } = useTranslation();

  const renderField = () => {
    const baseInputClassName = cn(
      "mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500",
      error ? "border-red-300" : "border-gray-300",
      inputClassName
    );

    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={value as string}
            onChange={onChange}
            rows={rows}
            placeholder={placeholder}
            className={baseInputClassName}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
          />
        );
      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value as string}
            onChange={onChange}
            className={baseInputClassName}
            required={required}
            disabled={disabled}
          >
            <option value="">{t('common.select')}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <input
            type="checkbox"
            id={name}
            name={name}
            checked={!!value}
            onChange={onChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={disabled}
            readOnly={readOnly}
          />
        );
      default:
        return (
          <input
            type={type}
            id={name}
            name={name}
            value={value as string | number}
            onChange={onChange}
            placeholder={placeholder}
            className={baseInputClassName}
            required={required}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            readOnly={readOnly}
          />
        );
    }
  };

  return (
    <div className={cn("mb-4", className)}>
      <label 
        htmlFor={name} 
        className={cn(
          "block text-sm font-medium",
          error ? "text-red-500" : "text-gray-700",
          type === 'checkbox' && "inline-flex items-center",
          labelClassName
        )}
      >
        {type === 'checkbox' && renderField()}
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {type !== 'checkbox' && renderField()}
      
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default FormField;