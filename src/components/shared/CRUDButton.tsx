/**
 * CRUDButton Component
 * 
 * Bottone che integra automaticamente il controllo TenantMode.
 * Disabilita automaticamente le operazioni CRUD quando l'utente
 * è in modalità "visualizza tutti i tenant".
 * 
 * @module components/shared/CRUDButton
 * @project 45 - Tenant Restructuring Commercial (Fase 8)
 */

import React from 'react';
import { useCRUDPermission } from '../../hooks/useCRUDPermission';
import { useTenantModeOptional } from '../../contexts/TenantModeContext';
import { cn } from '../../design-system/utils';

type ButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive';

interface CRUDButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Tipo di operazione CRUD */
    operation?: 'create' | 'update' | 'delete';
    /** Variante di stile del bottone */
    variant?: ButtonVariant;
    /** Children del bottone */
    children: React.ReactNode;
    /** Callback onClick */
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    /** Se true, mostra tooltip con messaggio di disabilitazione */
    showDisabledTooltip?: boolean;
    /** Classi CSS aggiuntive */
    className?: string;
    /** Se true, il bottone è già disabilitato indipendentemente dal TenantMode */
    disabled?: boolean;
}

// Stili predefiniti per varianti
const variantStyles: Record<ButtonVariant, string> = {
    default: 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100',
    primary: 'bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600',
    outline: 'border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600',
    destructive: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600', // alias di danger
};

/**
 * Bottone con controllo automatico TenantMode
 * 
 * @example
 * ```tsx
 * <CRUDButton operation="create" onClick={handleCreate}>
 *   <Plus /> Nuovo
 * </CRUDButton>
 * ```
 */
export function CRUDButton({
    operation = 'create',
    variant = 'default',
    children,
    onClick,
    showDisabledTooltip = true,
    className = '',
    disabled = false,
    ...buttonProps
}: CRUDButtonProps) {
    const { canCreate, canUpdate, canDelete, getButtonProps } = useCRUDPermission();
    const tenantMode = useTenantModeOptional();

    // Determina se l'operazione è permessa
    let canPerform = true;
    switch (operation) {
        case 'create':
            canPerform = canCreate;
            break;
        case 'update':
            canPerform = canUpdate;
            break;
        case 'delete':
            canPerform = canDelete;
            break;
    }

    const isDisabled = disabled || !canPerform;
    const buttonPermissionProps = getButtonProps();
    const variantClass = variantStyles[variant] || '';

    // Messaggio tooltip
    const tooltipMessage = !canPerform && tenantMode?.hasMultipleTenants
        ? 'Seleziona un tenant specifico per abilitare questa azione'
        : undefined;

    return (
        <button
            {...buttonProps}
            className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                variantClass,
                className,
                isDisabled && 'opacity-50 cursor-not-allowed'
            )}
            disabled={isDisabled}
            onClick={!isDisabled ? onClick : undefined}
            title={showDisabledTooltip ? tooltipMessage : buttonProps.title}
            aria-disabled={isDisabled}
        >
            {children}
        </button>
    );
}

/**
 * Variante per bottoni primari con stile predefinito
 * Supporta theme per adattarsi al brand context (ElementMedica=teal, Management=violet, ElementSicurezza=blue)
 */
export function CRUDPrimaryButton({
    children,
    className = '',
    theme = 'teal',
    ...props
}: CRUDButtonProps & { theme?: 'teal' | 'violet' | 'blue' }) {
    const themeStyles = {
        teal: 'bg-teal-600 dark:bg-teal-700 hover:bg-teal-700 dark:hover:bg-teal-600',
        violet: 'bg-violet-600 dark:bg-violet-700 hover:bg-violet-700 dark:hover:bg-violet-600',
        blue: 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600',
    };

    return (
        <CRUDButton
            {...props}
            className={`
                flex items-center gap-2 px-4 py-2 
                ${themeStyles[theme]} text-white rounded-lg 
                transition-colors
                disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:hover:bg-gray-400 dark:disabled:hover:bg-gray-600
                ${className}
            `}
        >
            {children}
        </CRUDButton>
    );
}

/**
 * Variante per bottoni di eliminazione
 */
export function CRUDDeleteButton({
    children,
    className = '',
    ...props
}: CRUDButtonProps) {
    return (
        <CRUDButton
            {...props}
            operation="delete"
            className={`
                flex items-center gap-2 px-4 py-2 
                bg-red-600 dark:bg-red-700 text-white rounded-lg 
                hover:bg-red-700 dark:hover:bg-red-600 transition-colors
                disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:hover:bg-gray-400 dark:disabled:hover:bg-gray-600
                ${className}
            `}
        >
            {children}
        </CRUDButton>
    );
}

export default CRUDButton;
