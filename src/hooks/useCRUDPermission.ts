/**
 * useCRUDPermission Hook
 * 
 * Hook helper per gestire i permessi CRUD in base alla modalità tenant.
 * Fornisce un modo semplice per disabilitare/nascondere bottoni e form
 * quando l'utente è in modalità "visualizza tutti i tenant".
 * 
 * @module hooks/useCRUDPermission
 * @project 45 - Tenant Restructuring Commercial (Fase 8)
 */

import { useMemo, useCallback } from 'react';
import { useTenantModeOptional, type ViewMode } from '../contexts/TenantModeContext';

/**
 * Return type del hook
 */
export interface CRUDPermission {
    /** Se true, le operazioni CRUD sono permesse */
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;

    /** Se true, l'utente è multi-tenant */
    isMultiTenant: boolean;

    /** Modalità di visualizzazione corrente */
    viewMode: ViewMode | null;

    /** ID del tenant per le operazioni CRUD */
    operateTenantId: string | null;

    /** Nome del tenant per le operazioni CRUD (per UI) */
    operateTenantName: string | null;

    /** Messaggio da mostrare se CRUD è disabilitato */
    disabledMessage: string | null;

    /** Props per bottoni disabled */
    getButtonProps: () => {
        disabled: boolean;
        title: string;
    };

    /** Wrapper per azioni che controlla i permessi */
    withPermissionCheck: <T extends unknown[]>(action: (...args: T) => void) => (...args: T) => void;
}

/**
 * useCRUDPermission
 * 
 * Hook per gestire i permessi CRUD in base alla modalità tenant.
 * 
 * @example
 * ```tsx
 * function CreateButton() {
 *   const { canCreate, getButtonProps, disabledMessage } = useCRUDPermission();
 *   
 *   return (
 *     <div>
 *       <button {...getButtonProps()} onClick={handleCreate}>
 *         Crea Nuovo
 *       </button>
 *       {disabledMessage && <p className="text-amber-600">{disabledMessage}</p>}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * function MyForm() {
 *   const { canCreate, operateTenantId, withPermissionCheck } = useCRUDPermission();
 *   
 *   const handleSubmit = withPermissionCheck((data) => {
 *     // Questo viene eseguito solo se canCreate è true
 *     createEntity({ ...data, tenantId: operateTenantId });
 *   });
 *   
 *   return <Form onSubmit={handleSubmit} />;
 * }
 * ```
 */
export function useCRUDPermission(): CRUDPermission {
    const tenantMode = useTenantModeOptional();

    // Se non c'è context (single-tenant), tutte le operazioni sono permesse
    const isSingleTenant = !tenantMode;

    const canPerformCRUD = useMemo(() => {
        if (isSingleTenant) return true;
        return tenantMode?.canPerformCRUD ?? true;
    }, [isSingleTenant, tenantMode?.canPerformCRUD]);

    const viewMode = tenantMode?.viewMode ?? null;
    const operateTenantId = tenantMode?.operateTenantId ?? null;
    const operateTenantName = tenantMode?.operateTenant?.name ?? null;
    const isMultiTenant = tenantMode?.hasMultipleTenants ?? false;

    const disabledMessage = useMemo(() => {
        if (!isMultiTenant) return null;
        if (canPerformCRUD) return null;

        if (viewMode === 'all') {
            return 'Seleziona un tenant specifico per abilitare le operazioni di creazione e modifica.';
        }

        return 'Le operazioni di modifica non sono disponibili nella modalità corrente.';
    }, [isMultiTenant, canPerformCRUD, viewMode]);

    const getButtonProps = useCallback(() => ({
        disabled: !canPerformCRUD,
        title: canPerformCRUD
            ? ''
            : 'Seleziona un tenant specifico per abilitare questa azione',
    }), [canPerformCRUD]);

    const withPermissionCheck = useCallback(
        <T extends unknown[]>(action: (...args: T) => void) => {
            return (...args: T) => {
                if (!canPerformCRUD) {
                    return;
                }
                action(...args);
            };
        },
        [canPerformCRUD]
    );

    return {
        canCreate: canPerformCRUD,
        canUpdate: canPerformCRUD,
        canDelete: canPerformCRUD,
        isMultiTenant,
        viewMode,
        operateTenantId,
        operateTenantName,
        disabledMessage,
        getButtonProps,
        withPermissionCheck,
    };
}

/**
 * Hook helper per ottenere solo il flag canCreate
 */
export function useCanCreate(): boolean {
    const { canCreate } = useCRUDPermission();
    return canCreate;
}

/**
 * Hook helper per ottenere il tenantId per le operazioni CREATE
 */
export function useCreateTenantId(): string | null {
    const { canCreate, operateTenantId } = useCRUDPermission();
    return canCreate ? operateTenantId : null;
}

export default useCRUDPermission;
