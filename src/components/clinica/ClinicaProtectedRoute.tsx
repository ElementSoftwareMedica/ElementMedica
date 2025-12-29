/**
 * Clinica Protected Route
 * 
 * Permission guard specifico per il modulo clinico ElementMedica.
 * Verifica permessi clinici e ruoli sanitari.
 * 
 * @module components/clinica/ClinicaProtectedRoute
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Stethoscope, Lock, ArrowLeft } from 'lucide-react';

// Import Element Medica theme
import '../../styles/clinica-theme.css';

/**
 * Clinical permission resources
 */
export type ClinicaResource =
    | 'clinica_dashboard'
    | 'clinica_struttura'
    | 'clinica_ambulatori'
    | 'clinica_strumenti'
    | 'clinica_prestazioni'
    | 'clinica_listini'
    | 'clinica_convenzioni'
    | 'clinica_agenda'
    | 'clinica_appuntamenti'
    | 'clinica_pazienti'
    | 'clinica_visite'
    | 'clinica_referti'
    | 'clinica_impostazioni';

/**
 * Clinical roles
 */
export type ClinicaRole =
    | 'ADMIN'
    | 'MEDICO'
    | 'INFERMIERE'
    | 'SEGRETERIA'
    | 'AMMINISTRAZIONE'
    | 'TECNICO';

/**
 * Permission actions
 */
export type ClinicaAction = 'read' | 'create' | 'update' | 'delete' | 'manage';

interface ClinicaProtectedRouteProps {
    resource?: ClinicaResource;
    action?: ClinicaAction;
    requiredRoles?: ClinicaRole[];
    fallbackPath?: string;
}

/**
 * Check if user has any of the required roles
 */
const hasRequiredRole = (userRoles: string[] | undefined, requiredRoles: ClinicaRole[]): boolean => {
    if (!userRoles || userRoles.length === 0) return false;
    if (requiredRoles.length === 0) return true;

    // ADMIN sempre autorizzato
    if (userRoles.includes('ADMIN')) return true;

    return requiredRoles.some(role => userRoles.includes(role));
};

/**
 * Default role permissions matrix for clinical module
 */
const rolePermissions: Record<ClinicaRole, Record<ClinicaResource, ClinicaAction[]>> = {
    ADMIN: {
        clinica_dashboard: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_struttura: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_ambulatori: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_strumenti: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_prestazioni: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_listini: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_convenzioni: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_agenda: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_appuntamenti: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_pazienti: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_visite: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_referti: ['read', 'create', 'update', 'delete', 'manage'],
        clinica_impostazioni: ['read', 'create', 'update', 'delete', 'manage'],
    },
    MEDICO: {
        clinica_dashboard: ['read'],
        clinica_struttura: ['read'],
        clinica_ambulatori: ['read'],
        clinica_strumenti: ['read'],
        clinica_prestazioni: ['read'],
        clinica_listini: ['read'],
        clinica_convenzioni: ['read'],
        clinica_agenda: ['read', 'update'],
        clinica_appuntamenti: ['read', 'update'],
        clinica_pazienti: ['read', 'create', 'update'],
        clinica_visite: ['read', 'create', 'update'],
        clinica_referti: ['read', 'create', 'update'],
        clinica_impostazioni: ['read'],
    },
    INFERMIERE: {
        clinica_dashboard: ['read'],
        clinica_struttura: ['read'],
        clinica_ambulatori: ['read'],
        clinica_strumenti: ['read', 'update'],
        clinica_prestazioni: ['read'],
        clinica_listini: [],
        clinica_convenzioni: [],
        clinica_agenda: ['read'],
        clinica_appuntamenti: ['read', 'update'],
        clinica_pazienti: ['read', 'update'],
        clinica_visite: ['read', 'update'],
        clinica_referti: ['read'],
        clinica_impostazioni: [],
    },
    SEGRETERIA: {
        clinica_dashboard: ['read'],
        clinica_struttura: ['read'],
        clinica_ambulatori: ['read'],
        clinica_strumenti: [],
        clinica_prestazioni: ['read'],
        clinica_listini: ['read'],
        clinica_convenzioni: ['read'],
        clinica_agenda: ['read', 'create', 'update'],
        clinica_appuntamenti: ['read', 'create', 'update', 'delete'],
        clinica_pazienti: ['read', 'create', 'update'],
        clinica_visite: ['read'],
        clinica_referti: ['read'],
        clinica_impostazioni: [],
    },
    AMMINISTRAZIONE: {
        clinica_dashboard: ['read'],
        clinica_struttura: ['read', 'create', 'update'],
        clinica_ambulatori: ['read', 'create', 'update'],
        clinica_strumenti: ['read', 'create', 'update'],
        clinica_prestazioni: ['read', 'create', 'update'],
        clinica_listini: ['read', 'create', 'update', 'delete'],
        clinica_convenzioni: ['read', 'create', 'update', 'delete'],
        clinica_agenda: ['read'],
        clinica_appuntamenti: ['read'],
        clinica_pazienti: ['read'],
        clinica_visite: [],
        clinica_referti: [],
        clinica_impostazioni: ['read', 'update'],
    },
    TECNICO: {
        clinica_dashboard: ['read'],
        clinica_struttura: ['read'],
        clinica_ambulatori: ['read', 'update'],
        clinica_strumenti: ['read', 'create', 'update', 'delete'],
        clinica_prestazioni: [],
        clinica_listini: [],
        clinica_convenzioni: [],
        clinica_agenda: [],
        clinica_appuntamenti: [],
        clinica_pazienti: [],
        clinica_visite: [],
        clinica_referti: [],
        clinica_impostazioni: [],
    },
};

/**
 * Check if user has permission based on role
 */
const hasRolePermission = (
    userRoles: string[] | undefined,
    resource: ClinicaResource,
    action: ClinicaAction
): boolean => {
    if (!userRoles || userRoles.length === 0) return false;

    // ADMIN sempre autorizzato
    if (userRoles.includes('ADMIN')) return true;

    return userRoles.some(role => {
        const permissions = rolePermissions[role as ClinicaRole];
        if (!permissions) return false;
        return permissions[resource]?.includes(action) ?? false;
    });
};

/**
 * Access Denied Component
 */
const AccessDenied: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 clinica-theme px-4">
            <div className="max-w-md w-full text-center">
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <Lock className="h-10 w-10 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Accesso Negato</h1>
                <p className="text-gray-600 mb-8">
                    Non hai i permessi necessari per accedere a questa sezione del modulo clinico.
                    Contatta l'amministratore se ritieni di dover avere accesso.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={onBack ?? (() => window.history.back())}
                        className="btn-clinica-secondary inline-flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Torna Indietro
                    </button>
                    <a href="/clinica" className="btn-clinica-primary inline-flex items-center justify-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        Vai alla Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
};

/**
 * Loading Component
 */
const LoadingClinica: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 clinica-theme">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Stethoscope className="h-8 w-8 text-teal-600" />
            </div>
            <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-teal-600 border-t-transparent"></div>
                <span className="text-gray-600">Verifica permessi...</span>
            </div>
        </div>
    );
};

/**
 * ClinicaProtectedRoute Component
 * 
 * Protegge le rotte del modulo clinico verificando:
 * 1. Autenticazione utente
 * 2. Permessi specifici per risorsa/azione
 * 3. Ruoli clinici richiesti
 */
const ClinicaProtectedRoute: React.FC<ClinicaProtectedRouteProps> = ({
    resource,
    action = 'read',
    requiredRoles = [],
    fallbackPath
}) => {
    const { isAuthenticated, isLoading, user, hasPermission } = useAuth();
    const location = useLocation();

    // Mostra loader durante la verifica dell'autenticazione
    if (isLoading) {
        return <LoadingClinica />;
    }

    // Se non autenticato, reindirizza al login medica
    if (!isAuthenticated) {
        return <Navigate to="/poliambulatorio/login" state={{ from: location }} replace />;
    }

    // Verifica ruoli richiesti
    if (requiredRoles.length > 0) {
        // user.roles è già un array di stringhe (RoleType enum values)
        const userRoles = (user?.roles || []) as string[];
        if (!hasRequiredRole(userRoles, requiredRoles)) {
            if (fallbackPath) {
                return <Navigate to={fallbackPath} replace />;
            }
            return <AccessDenied />;
        }
    }

    // Verifica permessi per risorsa/azione
    if (resource) {
        // Prima prova con il sistema di permessi generale
        const generalResource = resource.replace('clinica_', '');
        const hasGeneralPermission = hasPermission(generalResource, action);

        // Poi prova con la matrice dei ruoli clinici
        // user.roles è già un array di stringhe (RoleType enum values)
        const userRoles = (user?.roles || []) as string[];
        const hasClinicaPermission = hasRolePermission(userRoles, resource, action);

        if (!hasGeneralPermission && !hasClinicaPermission) {
            if (fallbackPath) {
                return <Navigate to={fallbackPath} replace />;
            }
            return <AccessDenied />;
        }
    }

    // Se tutto ok, mostra il contenuto
    return <Outlet />;
};

export default ClinicaProtectedRoute;

// Export dei tipi e utilities
export { hasRequiredRole, hasRolePermission, rolePermissions, AccessDenied, LoadingClinica };
