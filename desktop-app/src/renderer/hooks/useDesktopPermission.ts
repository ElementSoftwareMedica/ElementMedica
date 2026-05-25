/**
 * Hook per la verifica dei permessi nell'app desktop.
 * Specchia il comportamento di usePermissions() della webapp.
 * I permessi vengono sincronizzati dal server ad ogni login/refresh
 * e mantenuti in localStorage per la modalità offline.
 */
import { useCallback, useMemo } from 'react'
import { useDesktopAuth } from '../context/DesktopAuthContext'

export function useDesktopPermission() {
    const { hasPermission, permissions, user, availableTenants, currentTenantId } = useDesktopAuth()

    const isAdmin = useCallback((): boolean =>
        !!(permissions['*:*'] || permissions['all:*'] || permissions['admin:access']), [permissions])

    const normalizedRoles = useMemo(() => [
        ...(user?.roles || []),
        availableTenants.find(t => t.tenantId === currentTenantId)?.role || ''
    ].map(r => String(r).toLowerCase()).filter(Boolean), [availableTenants, currentTenantId, user?.roles])

    const isMedicoOnly = useCallback((): boolean =>
        normalizedRoles.length > 0 && normalizedRoles.every(r => r.includes('medic') || r === 'doctor'), [normalizedRoles])

    const isSecretaryOrTenantAdmin = useCallback((): boolean =>
        normalizedRoles.some(r =>
            r.includes('tenant_admin') || r.includes('tenant admin') || r.includes('admin') ||
            r.includes('segreter') || r.includes('secretar')
        ), [normalizedRoles])

    // ─── Dashboard ───────────────────────────────────────────────────────────
    const canAccessDashboard = useCallback((): boolean => true, [])

    // ─── Agenda / Appuntamenti ───────────────────────────────────────────────
    const canReadAgenda = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.appuntamenti:read') || hasPermission('clinica.agenda:read'), [hasPermission, isAdmin])
    const canUpdateAppuntamenti = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.appuntamenti:update') || hasPermission('clinica.appuntamenti:write') || hasPermission('clinica.agenda:update'), [hasPermission, isAdmin])
    const canDeleteAppuntamenti = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.appuntamenti:delete'), [hasPermission, isAdmin])

    // ─── Visite MDL ──────────────────────────────────────────────────────────
    const canReadVisite = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.visite:read'), [hasPermission, isAdmin])
    const canCreateVisite = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.visite:create'), [hasPermission, isAdmin])
    const canUpdateVisite = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.visite:update'), [hasPermission, isAdmin])

    // ─── Pazienti / Lavoratori ───────────────────────────────────────────────
    const canReadPazienti = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.pazienti:read') || hasPermission('persons:read'), [hasPermission, isAdmin])
    const canCreatePazienti = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.pazienti:create') || hasPermission('persons:create'), [hasPermission, isAdmin])
    const canUpdatePazienti = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.pazienti:update') || hasPermission('persons:update'), [hasPermission, isAdmin])

    // ─── Aziende ─────────────────────────────────────────────────────────────
    const canReadAziende = useCallback((): boolean =>
        isAdmin() || hasPermission('companies:read'), [hasPermission, isAdmin])
    const canUpdateAziende = useCallback((): boolean =>
        isAdmin() || hasPermission('companies:update'), [hasPermission, isAdmin])

    // ─── Scadenze ────────────────────────────────────────────────────────────
    const canReadScadenze = useCallback((): boolean =>
        isAdmin() || hasPermission('scadenze:read'), [hasPermission, isAdmin])

    // ─── Protocolli ──────────────────────────────────────────────────────────
    const canReadProtocolli = useCallback((): boolean =>
        isAdmin() || hasPermission('modulistica:read') || hasPermission('clinica.visite:read'), [hasPermission, isAdmin])

    // ─── Mansioni ────────────────────────────────────────────────────────────
    const canReadMansioni = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.visite:read') || hasPermission('hr.mansioni:read'), [hasPermission, isAdmin])

    // ─── Tariffari ───────────────────────────────────────────────────────────
    const canReadTariffari = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.tariffari:read') || hasPermission('tariffari:read'), [hasPermission, isAdmin])

    // ─── Prestazioni ─────────────────────────────────────────────────────────
    const canReadPrestazioni = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.prestazioni:read') || hasPermission('clinica.visite:read'), [hasPermission, isAdmin])

    // ─── Convenzioni ─────────────────────────────────────────────────────────
    const canReadConvenzioni = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.convenzioni:read') || hasPermission('clinica.tariffari:read'), [hasPermission, isAdmin])

    // ─── Movimenti Contabili ─────────────────────────────────────────────────
    const canReadMovimenti = useCallback((): boolean =>
        isAdmin() || hasPermission('clinica.contabilita:read') || hasPermission('clinica.billing:read'), [hasPermission, isAdmin])
    const canReadCompanyBilling = useCallback((): boolean => {
        return (isAdmin() || isSecretaryOrTenantAdmin() || hasPermission('clinica.contabilita:read') || hasPermission('clinica.billing:read')) && !isMedicoOnly()
    }, [hasPermission, isAdmin, isMedicoOnly, isSecretaryOrTenantAdmin])

    // ─── Settings ────────────────────────────────────────────────────────────
    const canAccessSettings = useCallback((): boolean => true, [])

    return useMemo(() => ({
        isAdmin,
        isMedicoOnly,
        isSecretaryOrTenantAdmin,
        hasPermission,
        canAccessDashboard,
        canReadAgenda,
        canUpdateAppuntamenti,
        canDeleteAppuntamenti,
        canReadVisite,
        canCreateVisite,
        canUpdateVisite,
        canReadPazienti,
        canCreatePazienti,
        canUpdatePazienti,
        canReadAziende,
        canUpdateAziende,
        canReadScadenze,
        canReadProtocolli,
        canReadMansioni,
        canReadTariffari,
        canReadPrestazioni,
        canReadConvenzioni,
        canReadMovimenti,
        canReadCompanyBilling,
        canAccessSettings
    }), [
        isAdmin, isMedicoOnly, isSecretaryOrTenantAdmin, hasPermission, canAccessDashboard, canReadAgenda, canUpdateAppuntamenti,
        canDeleteAppuntamenti, canReadVisite, canCreateVisite, canUpdateVisite,
        canReadPazienti, canCreatePazienti, canUpdatePazienti, canReadAziende,
        canUpdateAziende, canReadScadenze, canReadProtocolli, canReadMansioni,
        canReadTariffari, canReadPrestazioni, canReadConvenzioni, canReadMovimenti,
        canReadCompanyBilling, canAccessSettings
    ])
}
