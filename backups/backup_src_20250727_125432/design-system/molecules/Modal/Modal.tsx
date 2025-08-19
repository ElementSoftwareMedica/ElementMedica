/**
 * Design System - Modal Component (Molecule)
 * Week 8 Implementation - Component Library
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils';
import { Button } from '../../atoms/Button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalVariant = 'default' | 'centered' | 'drawer';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Function to call when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal size */
  size?: ModalSize;
  /** Modal variant */
  variant?: ModalVariant;
  /** Modal content */
  children: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Whether clicking overlay closes modal */
  closeOnOverlayClick?: boolean;
  /** Whether pressing escape closes modal */
  closeOnEscape?: boolean;
  /** Custom className for modal container */
  className?: string;
  /** Custom className for modal content */
  contentClassName?: string;
  /** Custom className for modal header */
  headerClassName?: string;
  /** Custom className for modal body */
  bodyClassName?: string;
  /** Custom className for modal footer */
  footerClassName?: string;
  /** Loading state */
  loading?: boolean;
  /** Prevent body scroll when modal is open */
  preventBodyScroll?: boolean;
  /** Z-index for modal */
  zIndex?: number;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** ARIA described by for accessibility */
  ariaDescribedBy?: string;
}

// Size styles
const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4'
};

// Variant styles
const variantStyles: Record<ModalVariant, string> = {
  default: 'items-start pt-16',
  centered: 'items-center',
  drawer: 'items-end'
};

/**
 * Modal component - A flexible modal dialog with overlay
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  variant = 'default',
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  loading = false,
  preventBodyScroll = true,
  zIndex = 1040,
  ariaLabel,
  ariaDescribedBy,
  ...props
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle body scroll
  useEffect(() => {
    if (!preventBodyScroll) return;

    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore scroll position
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      };
    }
  }, [isOpen, preventBodyScroll]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);
    } else {
      // Restore focus to previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Handle focus trap
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          event.preventDefault();
        }
      }
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={cn(
        'fixed inset-0 flex justify-center px-4 py-4',
        variantStyles[variant],
        className
      )}
      style={{ zIndex }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
      aria-describedby={ariaDescribedBy}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative bg-white rounded-2xl shadow-xl w-full',
          'transform transition-all duration-200',
          'focus:outline-none',
          sizeStyles[size],
          {
            'opacity-0 scale-95': loading,
            'opacity-100 scale-100': !loading
          },
          contentClassName
        )}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={cn(
              'flex items-center justify-between p-6 border-b border-gray-200',
              headerClassName
            )}
          >
            {title && (
              <h2 className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
            )}
            
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto -mr-2"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div
          className={cn(
            'p-6 overflow-y-auto',
            {
              'pt-6': !title && !showCloseButton,
              'pb-6': !footer,
              'max-h-[calc(80vh-200px)]': footer, // Limita l'altezza se c'è un footer
              'max-h-[calc(80vh-120px)]': !footer
            },
            bodyClassName
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            children
          )}
        </div>
        
        {/* Footer */}
        {footer && (
          <div
            className={cn(
              'flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0',
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Render modal in portal
  return createPortal(modalContent, document.body);
};

// Convenience components for common modal patterns
export const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false
}) => {
  const variantStyles = {
    danger: 'destructive',
    warning: 'outline',
    info: 'primary'
  } as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      variant="centered"
      loading={loading}
      footer={
        <>
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variantStyles[variant]}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-gray-600">{message}</p>
    </Modal>
  );
};

export default Modal;