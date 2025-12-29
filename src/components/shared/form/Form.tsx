import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../design-system/utils';
import { Button, ButtonVariant } from '../../../design-system/atoms/Button';
import { AlertCircle } from 'lucide-react';

interface FormProps {
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
  error?: string;
  children: React.ReactNode;
  buttonContainerClassName?: string;
  submitButtonClassName?: string;
  cancelButtonClassName?: string;
  submitButtonVariant?: ButtonVariant;
  cancelButtonVariant?: ButtonVariant;
  hideButtons?: boolean;
  /** Disabilita la validazione nativa del browser (default: true per usare validazione elegante) */
  noValidate?: boolean;
}

/**
 * Componente Form riutilizzabile per standardizzare i form dell'applicazione
 * Usa noValidate di default per abilitare la validazione elegante personalizzata
 */
const Form: React.FC<FormProps> = ({
  onSubmit,
  className,
  submitLabel,
  cancelLabel,
  onCancel,
  isLoading = false,
  isEditing = false,
  error,
  children,
  buttonContainerClassName,
  submitButtonClassName,
  cancelButtonClassName,
  submitButtonVariant = 'primary',
  cancelButtonVariant = 'outline',
  hideButtons = false,
  noValidate = true  // Default true per disabilitare tooltip nativi
}) => {
  const { t } = useTranslation();

  const defaultSubmitLabel = isEditing
    ? t('common.save')
    : t('common.create');

  const defaultCancelLabel = t('common.cancel');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)} noValidate={noValidate}>
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg border bg-red-50 border-red-200 mb-4 animate-slide-down">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-500" />
          <span className="text-sm font-medium text-red-700">{error}</span>
        </div>
      )}

      {children}

      {!hideButtons && (
        <div className={cn("flex justify-end space-x-3 pt-4", buttonContainerClassName)}>
          {onCancel && (
            <Button
              type="button"
              variant={cancelButtonVariant}
              onClick={onCancel}
              className={cancelButtonClassName}
              disabled={isLoading}
            >
              {cancelLabel || defaultCancelLabel}
            </Button>
          )}

          <Button
            type="submit"
            variant={submitButtonVariant}
            className={submitButtonClassName}
            loading={isLoading}
          >
            {submitLabel || defaultSubmitLabel}
          </Button>
        </div>
      )}
    </form>
  );
};

export default Form;