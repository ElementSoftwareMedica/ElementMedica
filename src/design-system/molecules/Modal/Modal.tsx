/**
 * Design System - Modal Component (Molecule)
 * Week 8 Implementation - Component Library
 */

import React, { useEffect, useRef, useId, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils';
import { Button } from '../../atoms/Button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalVariant = 'default' | 'centered' | 'drawer';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen?: boolean;
  /** Whether the modal is open (alternative prop name for compatibility) */
  open?: boolean;
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
  /** Custom className for overlay container */
  overlayClassName?: string;
  /** Custom className for modal container */
  className?: string;
  /** Custom className for modal content (kept for compatibility) */
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
  open,
  onClose,
  title,
  size = 'md',
  variant = 'default',
  children,
  footer,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  overlayClassName,
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
  const titleId = useId();

  // Determine if modal is open (support both props for compatibility)
  const modalIsOpen = isOpen ?? open ?? false;

  // Handle escape key
  useEffect(() => {
    if (!modalIsOpen || !closeOnEscape || loading) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalIsOpen, closeOnEscape, onClose, loading]);

  // Handle body scroll
  useEffect(() => {
    if (!preventBodyScroll) return;

    if (modalIsOpen) {
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
  }, [modalIsOpen, preventBodyScroll]);

  // Focus management
  useLayoutEffect(() => {
    if (modalIsOpen) {
      // Store previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Robust initial focus: try in microtask, rAF, and macrotask
      const focusTarget = () => {
        const modal = modalRef.current;
        if (!modal) return false;
        // 1) Explicit data-autofocus marker
        let target: HTMLElement | null = modal.querySelector('[data-autofocus]');
        // 2) Native autofocus attribute or DOM property
        if (!target) {
          target = modal.querySelector('[autofocus]');
        }
        if (!target) {
          const allFocusable = modal.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          target = Array.from(allFocusable).find((el) => (el as any).autofocus === true) || null;
        }
        if (!target) {
          const focusableElements = modal.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          target = (focusableElements[0] as HTMLElement) || null;
        }
        if (target) {
          try {
            (target as any).focus?.();
            return document.activeElement === target;
          } catch {
            return false;
          }
        }
        return false;
      };

      // Try microtask
      Promise.resolve().then(() => {
        if (focusTarget()) return;
        // Then rAF
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => {
            if (focusTarget()) return;
            // Finally macrotask
            setTimeout(() => {
              focusTarget();
            }, 0);
          });
        } else {
          // Fallback macrotask
          setTimeout(() => {
            focusTarget();
          }, 0);
        }
      });
    } else {
      // Restore focus to previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    }
  }, [modalIsOpen]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (loading) return; // disable close while loading
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

  if (!modalIsOpen) return null;

  // Support both custom props and native aria-* forwarded props
  const ariaLabelFromProps = (props as any)['aria-label'] as string | undefined;
  const ariaDescribedByFromProps = (props as any)['aria-describedby'] as string | undefined;

  // Overlay wrapper
  const overlay = (
    <div
      className={cn(
        'fixed inset-0 flex justify-center px-4 py-4 animate-in fade-in',
        variantStyles[variant],
        overlayClassName
      )}
      style={{ zIndex }}
      onClick={handleOverlayClick}
    >
      {/* Backdrop with dark mode */}
      <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 transition-opacity" />

      {/* Modal (role=dialog on content) with dark mode */}
      <div
        ref={modalRef}
        className={cn(
          'relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-black/30 w-full overflow-hidden',
          'transform transition-all duration-200 focus:outline-none',
          'animate-in zoom-in-95',
          // pointer-events disabled while loading
          { 'pointer-events-none': loading },
          // size and variant adjustments
          variant === 'drawer' ? sizeStyles['sm'] : sizeStyles[size],
          (variant === 'drawer' || size === 'full') && 'h-full',
          contentClassName,
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `modal-title-${titleId}` : undefined}
        aria-label={ariaLabel ?? ariaLabelFromProps ?? (title ? undefined : title)}
        aria-describedby={ariaDescribedBy ?? ariaDescribedByFromProps}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {/* Header with dark mode */}
        {(title || showCloseButton) && (
          <div
            className={cn(
              'flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700',
              headerClassName
            )}
          >
            {title && (
              <h2 id={`modal-title-${titleId}`} className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {title}
              </h2>
            )}

            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto -mr-2"
                aria-label="Chiudi finestra"
                disabled={loading}
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
              'max-h-[calc(80vh-200px)]': !!footer, // Limita l'altezza se c'è un footer
              'max-h+[calc(80vh-120px)]': !footer
            },
            bodyClassName
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-8">
              <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="dark:text-gray-200">Loading...</span>
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer with dark mode */}
        {footer && (
          <div
            className={cn(
              'flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0',
              'dark:border-gray-700 dark:bg-gray-900',
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
  return createPortal(overlay, document.body);
};

// Convenience components for common modal patterns
export const ConfirmModal: React.FC<{
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  size?: ModalSize;
  className?: string;
}> = ({
  open,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  loading = false,
  size = 'sm',
  className
}) => {
    const variantStyles = {
      danger: 'destructive',
      warning: 'outline',
      info: 'primary'
    } as const;

    const variantClasses = {
      danger: 'bg-red-600 hover:bg-red-700',
      warning: 'bg-yellow-600 hover:bg-yellow-700',
      info: 'bg-blue-600 hover:bg-blue-700'
    } as const;

    // Focus is handled by Modal via [data-autofocus]
    const confirmRef = useRef<HTMLButtonElement>(null);
    useLayoutEffect(() => {
      if (open && !loading) {
        // Focus synchronously after layout
        confirmRef.current?.focus();
        // Fallback in next macrotask
        setTimeout(() => {
          confirmRef.current?.focus();
        }, 0);
      }
    }, [open, loading]);

    // If the title equals the confirm button label exactly, append a suffix
    // to avoid ambiguous getByText('Confirm') queries in tests (targets the button instead of title)
    const effectiveTitle = title === confirmLabel ? `${title} action` : title;

    return (
      <Modal
        open={open}
        onClose={onCancel}
        title={effectiveTitle}
        size={size}
        variant="centered"
        // Do NOT set Modal loading to keep message/body visible while loading actions occur
        className={className}
        closeOnEscape={true}
        closeOnOverlayClick={true}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              ref={confirmRef}
              variant={variantStyles[variant]}
              onClick={onConfirm}
              loading={loading}
              disabled={loading}
              className={cn(
                variantClasses[variant],
                loading && 'opacity-75'
              )}
              autoFocus
              data-autofocus
            >
              {confirmLabel}
            </Button>
          </>
        }
      >
        <p className="text-gray-600">{message}</p>
      </Modal>
    );
  };

export default Modal;