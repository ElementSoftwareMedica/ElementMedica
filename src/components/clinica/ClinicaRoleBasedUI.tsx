/**
 * ClinicaRoleBasedUI
 * 
 * Componente per rendering condizionale basato sul ruolo utente
 * nel modulo clinico ElementMedica.
 * 
 * @module components/clinica/ClinicaRoleBasedUI
 */

import React, { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    ClinicaResource,
    ClinicaAction,
    ClinicaRole,
    hasRequiredRole,
    hasRolePermission
} from './ClinicaProtectedRoute';

interface ClinicaRoleBasedUIProps {
    children: ReactNode;
    /** Permetti la visualizzazione solo per questi ruoli */
    allowedRoles?: ClinicaRole[];
    /** Nega la visualizzazione per questi ruoli */
    deniedRoles?: ClinicaRole[];
    /** Richiedi permesso per questa risorsa */
    resource?: ClinicaResource;
    /** Azione richiesta (default: 'read') */
    action?: ClinicaAction;
    /** Contenuto alternativo se non autorizzato */
    fallback?: ReactNode;
    /** Se true, mostra fallback invece di null quando non autorizzato */
    showFallback?: boolean;
}

/**
 * ClinicaRoleBasedUI Component
 * 
 * Rende i children solo se l'utente ha i permessi necessari.
 * 
 * @example
 * // Mostra solo per medici
 * <ClinicaRoleBasedUI allowedRoles={['MEDICO', 'ADMIN']}>
 *   <ButtonFirmaReferto />
 * </ClinicaRoleBasedUI>
 * 
 * @example
 * // Nascondi per segreteria
 * <ClinicaRoleBasedUI deniedRoles={['SEGRETERIA']}>
 *   <SezionePrivata />
 * </ClinicaRoleBasedUI>
 * 
 * @example
 * // Verifica permesso specifico
 * <ClinicaRoleBasedUI resource="clinica_referti" action="update">
 *   <ModificaReferto />
 * </ClinicaRoleBasedUI>
 */
const ClinicaRoleBasedUI: React.FC<ClinicaRoleBasedUIProps> = ({
    children,
    allowedRoles = [],
    deniedRoles = [],
    resource,
    action = 'read',
    fallback = null,
    showFallback = false
}) => {
    const { user, isAuthenticated } = useAuth();

    // Se non autenticato, non mostrare nulla
    if (!isAuthenticated || !user) {
        return showFallback ? <>{fallback}</> : null;
    }

    // Estrai ruoli utente (user.roles è già un array di stringhe RoleType)
    const userRoles = (user.roles || []) as string[];

    // Check: utente ha ruoli negati?
    if (deniedRoles.length > 0 && hasRequiredRole(userRoles, deniedRoles)) {
        // ADMIN bypassa le denied rules
        if (!userRoles.includes('ADMIN')) {
            return showFallback ? <>{fallback}</> : null;
        }
    }

    // Check: utente ha ruoli permessi?
    if (allowedRoles.length > 0 && !hasRequiredRole(userRoles, allowedRoles)) {
        return showFallback ? <>{fallback}</> : null;
    }

    // Check: permesso per risorsa/azione
    if (resource && !hasRolePermission(userRoles, resource, action)) {
        return showFallback ? <>{fallback}</> : null;
    }

    return <>{children}</>;
};

export default ClinicaRoleBasedUI;

/**
 * Hook per verificare permessi clinici
 */
export function useClinicaPermission(resource: ClinicaResource, action: ClinicaAction = 'read'): boolean {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user) return false;

    // user.roles è già un array di stringhe RoleType
    const userRoles = (user.roles || []) as string[];
    return hasRolePermission(userRoles, resource, action);
}

/**
 * Hook per verificare ruolo clinico
 */
export function useClinicaRole(requiredRoles: ClinicaRole[]): boolean {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user) return false;

    // user.roles è già un array di stringhe RoleType
    const userRoles = (user.roles || []) as string[];
    return hasRequiredRole(userRoles, requiredRoles);
}

/**
 * HOC per proteggere componenti in base al ruolo
 */
export function withClinicaRole<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    requiredRoles: ClinicaRole[],
    FallbackComponent?: React.ComponentType
): React.FC<P> {
    const WithRoleCheck: React.FC<P> = (props) => {
        const hasRole = useClinicaRole(requiredRoles);

        if (!hasRole) {
            return FallbackComponent ? <FallbackComponent /> : null;
        }

        return <WrappedComponent {...props} />;
    };

    WithRoleCheck.displayName = `withClinicaRole(${WrappedComponent.displayName || WrappedComponent.name})`;

    return WithRoleCheck;
}

/**
 * HOC per proteggere componenti in base al permesso
 */
export function withClinicaPermission<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    resource: ClinicaResource,
    action: ClinicaAction = 'read',
    FallbackComponent?: React.ComponentType
): React.FC<P> {
    const WithPermissionCheck: React.FC<P> = (props) => {
        const hasPermission = useClinicaPermission(resource, action);

        if (!hasPermission) {
            return FallbackComponent ? <FallbackComponent /> : null;
        }

        return <WrappedComponent {...props} />;
    };

    WithPermissionCheck.displayName = `withClinicaPermission(${WrappedComponent.displayName || WrappedComponent.name})`;

    return WithPermissionCheck;
}

/**
 * Utility Components per rendering condizionale comune
 */

// Solo Admin
export const AdminOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
    <ClinicaRoleBasedUI allowedRoles={['ADMIN']} fallback={fallback} showFallback={!!fallback}>
        {children}
    </ClinicaRoleBasedUI>
);

// Solo Medici (include Admin)
export const MedicoOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
    <ClinicaRoleBasedUI allowedRoles={['ADMIN', 'MEDICO']} fallback={fallback} showFallback={!!fallback}>
        {children}
    </ClinicaRoleBasedUI>
);

// Personale Sanitario (Medici + Infermieri)
export const PersonaleSanitario: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
    <ClinicaRoleBasedUI allowedRoles={['ADMIN', 'MEDICO', 'INFERMIERE']} fallback={fallback} showFallback={!!fallback}>
        {children}
    </ClinicaRoleBasedUI>
);

// Staff Amministrativo (Segreteria + Amministrazione)
export const StaffAmministrativo: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
    <ClinicaRoleBasedUI allowedRoles={['ADMIN', 'SEGRETERIA', 'AMMINISTRAZIONE']} fallback={fallback} showFallback={!!fallback}>
        {children}
    </ClinicaRoleBasedUI>
);

// Escludi Tecnici
export const EscludiTecnici: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ children, fallback }) => (
    <ClinicaRoleBasedUI deniedRoles={['TECNICO']} fallback={fallback} showFallback={!!fallback}>
        {children}
    </ClinicaRoleBasedUI>
);

// Can Read (verifica permesso di lettura)
export const CanRead: React.FC<{ resource: ClinicaResource; children: ReactNode; fallback?: ReactNode }> = ({
    resource, children, fallback
}) => (
    <ClinicaRoleBasedUI resource={resource} action="read" fallback={fallback} showFallback={!!fallback}>
        {children}
    </ClinicaRoleBasedUI>
);

// Can Edit (verifica permesso di modifica)
export const CanEdit: React.FC<{ resource: ClinicaResource; children: ReactNode; fallback?: ReactNode }> = ({
    resource, children, fallback
}) => (
    <ClinicaRoleBasedUI resource={resource} action="update" fallback={fallback} showFallback={!!fallback}>
        {children}
    </ClinicaRoleBasedUI>
);

// Can Delete (verifica permesso di eliminazione)
export const CanDelete: React.FC<{ resource: ClinicaResource; children: ReactNode; fallback?: ReactNode }> = ({
    resource, children, fallback
}) => (
    <ClinicaRoleBasedUI resource={resource} action="delete" fallback={fallback} showFallback={!!fallback}>
        {children}
    </ClinicaRoleBasedUI>
);
