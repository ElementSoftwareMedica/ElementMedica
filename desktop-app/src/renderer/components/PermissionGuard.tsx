import { type ReactNode } from 'react'
import { ShieldOff } from 'lucide-react'
import { useDesktopAuth } from '../context/DesktopAuthContext'

interface PermissionGuardProps {
    permission: string
    children: ReactNode
    fallback?: ReactNode
}

/**
 * Protegge una pagina/sezione richiedendo un permesso specifico.
 * Se i permessi non sono ancora caricati (array vuoto ma utente presente),
 * permette l'accesso per non bloccare la modalità offline.
 */
export function PermissionGuard({ permission, children, fallback }: PermissionGuardProps): JSX.Element {
    const { hasPermission, permissions, isAuthenticated } = useDesktopAuth()

    // Se non autenticato, non mostrare nulla (App gestisce il redirect al login)
    if (!isAuthenticated) return <></>

    // Se i permessi non sono ancora stati caricati (primo avvio offline), consenti accesso
    const permissionsLoaded = Object.keys(permissions).length > 0
    if (!permissionsLoaded) return <>{children}</>

    if (hasPermission(permission)) return <>{children}</>

    if (fallback) return <>{fallback}</>

    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <ShieldOff className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Accesso non autorizzato</h2>
            <p className="text-sm text-gray-500 max-w-xs">
                Non hai i permessi necessari per accedere a questa sezione.
                Contatta l'amministratore se ritieni si tratti di un errore.
            </p>
        </div>
    )
}
