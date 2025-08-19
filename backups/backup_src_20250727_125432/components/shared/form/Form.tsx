import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../design-system/utils';
import { Button } from '../../../design-system/atoms/Button';

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
  submitButtonVariant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
  cancelButtonVariant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger';
  hideButtons?: boolean;
}

/**
 * Componente Form riutilizzabile per standardizzare i form dell'applicazione
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
  hideButtons = false
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
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
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
            isLoading={isLoading}
          >
            {submitLabel || defaultSubmitLabel}
          </Button>
        </div>
      )}
    </form>
  );
};

export default Form;