/**
 * BranchGuard Component
 * 
 * Componente di protezione per route che richiedono un branch specifico.
 * Verifica che il branch corrente corrisponda a quello richiesto.
 * 
 * @module components/guards/BranchGuard
 * @project 45 - Tenant Restructuring Commercial (Opzione 2)
 */

import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBranchContext, type BranchType, BRANCH_CONFIGS } from '../../contexts/BranchContext';
import { AlertTriangle, Lock, ArrowLeft } from 'lucide-react';

/**
 * Props del componente BranchGuard
 */
interface BranchGuardProps {
    /** Branch richiesto per accedere al contenuto */
    requiredBranch: BranchType;

    /** Contenuto da renderizzare se l'accesso è consentito */
    children: ReactNode;

    /** URL di redirect se l'accesso è negato (default: /dashboard) */
    redirectTo?: string;

    /** Se true, mostra un messaggio invece di redirect */
    showMessage?: boolean;

    /** Messaggio personalizzato per accesso negato */
    accessDeniedMessage?: string;
}

/**
 * Componente per accesso negato
 */
function AccessDeniedPage({
    requiredBranch,
    currentBranch,
    message
}: {
    requiredBranch: BranchType;
    currentBranch: BranchType;
    message?: string;
}) {
    const requiredConfig = BRANCH_CONFIGS[requiredBranch];
    const currentConfig = BRANCH_CONFIGS[currentBranch];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Accesso Non Consentito
                </h1>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {message || (
                        <>
                            Questa sezione è disponibile solo per il branch{' '}
                            <span className="font-semibold" style={{ color: requiredConfig.color }}>
                                {requiredConfig.displayName}
                            </span>.
                            <br />
                            Stai attualmente utilizzando il branch{' '}
                            <span className="font-semibold" style={{ color: currentConfig.color }}>
                                {currentConfig.displayName}
                            </span>.
                        </>
                    )}
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Torna Indietro
                    </button>

                    <a
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                    >
                        Vai alla Dashboard
                    </a>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Se ritieni di dover avere accesso, contatta l'amministratore
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * BranchGuard Component
 * 
 * Protegge le route che richiedono un branch specifico.
 * Se il branch corrente non corrisponde, effettua redirect o mostra messaggio.
 * 
 * @example
 * ```tsx
 * // In routes.tsx
 * <Route 
 *   path="/clinica/*" 
 *   element={
 *     <BranchGuard requiredBranch="MEDICA">
 *       <ClinicaRoutes />
 *     </BranchGuard>
 *   } 
 * />
 * 
 * // Con messaggio invece di redirect
 * <BranchGuard 
 *   requiredBranch="FORMAZIONE" 
 *   showMessage
 *   accessDeniedMessage="I corsi sono disponibili solo su Element Formazione"
 * >
 *   <CoursesPage />
 * </BranchGuard>
 * ```
 */
export function BranchGuard({
    requiredBranch,
    children,
    redirectTo = '/dashboard',
    showMessage = false,
    accessDeniedMessage,
}: BranchGuardProps) {
    const location = useLocation();
    const { currentBranch, canAccessBranch } = useBranchContext();

    // Verifica se il branch corrente corrisponde a quello richiesto
    const isCorrectBranch = currentBranch === requiredBranch;

    // Verifica se l'utente ha comunque accesso al branch richiesto
    const hasAccess = canAccessBranch(requiredBranch);

    // Se il branch corrisponde e l'utente ha accesso, renderizza i children
    if (isCorrectBranch && hasAccess) {
        return <>{children}</>;
    }

    // Se deve mostrare messaggio invece di redirect
    if (showMessage) {
        return (
            <AccessDeniedPage
                requiredBranch={requiredBranch}
                currentBranch={currentBranch}
                message={accessDeniedMessage}
            />
        );
    }

    // Redirect alla pagina specificata
    return (
        <Navigate
            to={redirectTo}
            state={{ from: location, requiredBranch }}
            replace
        />
    );
}

/**
 * HOC per proteggere componenti con BranchGuard
 * 
 * @example
 * ```tsx
 * const ProtectedClinicaPage = withBranchGuard(ClinicaPage, 'MEDICA');
 * ```
 */
export function withBranchGuard<P extends object>(
    Component: React.ComponentType<P>,
    requiredBranch: BranchType,
    options?: Omit<BranchGuardProps, 'requiredBranch' | 'children'>
) {
    return function WrappedComponent(props: P) {
        return (
            <BranchGuard requiredBranch={requiredBranch} {...options}>
                <Component {...props} />
            </BranchGuard>
        );
    };
}

/**
 * Componente per mostrare contenuto condizionale basato sul branch
 * 
 * @example
 * ```tsx
 * <BranchConditional branch="MEDICA">
 *   <ClinicaWidget />
 * </BranchConditional>
 * 
 * <BranchConditional branch="FORMAZIONE" fallback={<UpgradePrompt />}>
 *   <CoursesWidget />
 * </BranchConditional>
 * ```
 */
export function BranchConditional({
    branch,
    children,
    fallback = null,
}: {
    branch: BranchType;
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const { currentBranch, canAccessBranch } = useBranchContext();

    if (currentBranch === branch && canAccessBranch(branch)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}

/**
 * Componente per mostrare contenuto SOLO se il branch corrente è MEDICA
 */
export function MedicaOnly({
    children,
    fallback = null
}: {
    children: ReactNode;
    fallback?: ReactNode;
}) {
    return (
        <BranchConditional branch="MEDICA" fallback={fallback}>
            {children}
        </BranchConditional>
    );
}

/**
 * Componente per mostrare contenuto SOLO se il branch corrente è FORMAZIONE
 */
export function FormazioneOnly({
    children,
    fallback = null
}: {
    children: ReactNode;
    fallback?: ReactNode;
}) {
    return (
        <BranchConditional branch="FORMAZIONE" fallback={fallback}>
            {children}
        </BranchConditional>
    );
}

export default BranchGuard;
