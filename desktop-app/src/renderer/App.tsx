import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { DesktopLayout } from './components/DesktopLayout'
import { PermissionGuard } from './components/PermissionGuard'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConnectivityProvider } from './context/ConnectivityContext'
import { SyncStatusProvider } from './sync/SyncStatusProvider'
import { DesktopAuthProvider, useDesktopAuth } from './context/DesktopAuthContext'
import { LicenseProvider, useLicense } from './context/LicenseContext'
import { AutoLockProvider } from './context/AutoLockContext'
import { KeyRound } from 'lucide-react'

// Heavy pages are lazy-loaded to improve initial render performance
const AgendaPage = lazy(() => import('./pages/AgendaPage').then(m => ({ default: m.AgendaPage })))
const AppuntamentoDetailPage = lazy(() => import('./pages/AppuntamentoDetailPage').then(m => ({ default: m.AppuntamentoDetailPage })))
const VisiteListPage = lazy(() => import('./pages/VisiteListPage').then(m => ({ default: m.VisiteListPage })))
const PazientiPage = lazy(() => import('./pages/PazientiPage').then(m => ({ default: m.PazientiPage })))
const AziendePage = lazy(() => import('./pages/AziendePage').then(m => ({ default: m.AziendePage })))
const ScadenzePage = lazy(() => import('./pages/ScadenzePage').then(m => ({ default: m.ScadenzePage })))
const ProtocolliPage = lazy(() => import('./pages/ProtocolliPage').then(m => ({ default: m.ProtocolliPage })))
const MansioniPage = lazy(() => import('./pages/MansioniPage').then(m => ({ default: m.MansioniPage })))
const TariffariPage = lazy(() => import('./pages/TariffariPage').then(m => ({ default: m.TariffariPage })))
const PrestazioniPage = lazy(() => import('./pages/PrestazioniPage').then(m => ({ default: m.PrestazioniPage })))
const ConvenzioniPage = lazy(() => import('./pages/ConvenzioniPage').then(m => ({ default: m.ConvenzioniPage })))
const VisitaDetailPage = lazy(() => import('./pages/VisitaDetailPage').then(m => ({ default: m.VisitaDetailPage })))
const SyncDetailPage = lazy(() => import('./pages/SyncDetailPage').then(m => ({ default: m.SyncDetailPage })))
const AziendaDetailPage = lazy(() => import('./pages/AziendaDetailPage').then(m => ({ default: m.AziendaDetailPage })))
const LavoratoreDetailPage = lazy(() => import('./pages/LavoratoreDetailPage').then(m => ({ default: m.LavoratoreDetailPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const NuovaVisitaPage = lazy(() => import('./pages/NuovaVisitaPage').then(m => ({ default: m.NuovaVisitaPage })))
const NuovoPazientePage = lazy(() => import('./pages/NuovoPazientePage').then(m => ({ default: m.NuovoPazientePage })))
const LicenseActivationPage = lazy(() => import('./pages/LicenseActivationPage').then(m => ({ default: m.LicenseActivationPage })))
const HelpPage = lazy(() => import('./pages/HelpPage').then(m => ({ default: m.HelpPage })))
const BridgeModePage = lazy(() => import('./pages/BridgeModePage').then(m => ({ default: m.BridgeModePage })))

// Minimal spinner shown during chunk loading
function PageLoader(): JSX.Element {
    return (
        <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
    )
}

export function App(): JSX.Element {
    return (
        <DesktopAuthProvider>
            <ConnectivityProvider>
                <SyncStatusProvider>
                    <AutoLockProvider>
                        <ErrorBoundary>
                            <AppRoutes />
                        </ErrorBoundary>
                    </AutoLockProvider>
                </SyncStatusProvider>
            </ConnectivityProvider>
        </DesktopAuthProvider>
    )
}

function AppRoutes(): JSX.Element {
    const { isAuthenticated, isLoading } = useDesktopAuth()
    const location = useLocation()

    // Diagnostic log: report every navigation to startup.log.
    // Critical for diagnosing Windows file:// routing issues (blank content when
    // BrowserRouter used with non-root pathnames).
    useEffect(() => {
        try {
            window.desktopApi?.app?.logError({
                message: `[AppRoutes] location=${location.pathname}${location.hash} auth=${isAuthenticated} loading=${isLoading}`,
                context: 'renderer:route'
            })
        } catch { /* non-blocking */ }
    }, [location.pathname, location.hash, isAuthenticated, isLoading])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">Caricamento...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return <LoginPage />
    }

    return (
        <LicenseProvider>
            <LicensedApp />
        </LicenseProvider>
    )
}

function LicensedApp(): JSX.Element {
    const { isActivated, isValid, licenseStatus, licenseType, isLoading } = useLicense()

    // Daily startup notification for scadenze due within 7 days
    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10)
        const key = 'last_scadenze_notify_date'
        if (localStorage.getItem(key) === today) return

        if (!window.desktopApi?.db?.query || !window.desktopApi?.app?.showNotification) return

        const threshold = new Date()
        threshold.setDate(threshold.getDate() + 7)
        const thresholdStr = threshold.toISOString().slice(0, 10)

        window.desktopApi.db.query({ table: 'scadenze', where: { _isDeleted: 0 } })
            .then((rows: Array<{ eseguita: number; dataScadenza: string | null }>) => {
                const pending = rows.filter(s =>
                    !s.eseguita && s.dataScadenza && s.dataScadenza.slice(0, 10) <= thresholdStr
                )
                const scadute = pending.filter(s => s.dataScadenza!.slice(0, 10) < today)
                if (pending.length > 0) {
                    const body = scadute.length > 0
                        ? `${scadute.length} scadut${scadute.length === 1 ? 'a' : 'e'}, ${pending.length - scadute.length} in scadenza entro 7 giorni`
                        : `${pending.length} scadenz${pending.length === 1 ? 'a' : 'e'} in scadenza entro 7 giorni`
                    window.desktopApi.app.showNotification({ title: 'Scadenze MDL in evidenza', body })
                    localStorage.setItem(key, today)
                } else {
                    localStorage.setItem(key, today)
                }
            })
            .catch(() => { /* non-blocking */ })
    }, [])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Verifica licenza...</p>
                </div>
            </div>
        )
    }

    // License explicitly revoked or suspended by server
    if (isActivated && (licenseStatus === 'REVOKED' || licenseStatus === 'SUSPENDED')) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="w-full max-w-md text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl border border-red-200 mb-4">
                        <KeyRound className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 font-heading mb-2">
                        {licenseStatus === 'REVOKED' ? 'Licenza Revocata' : 'Licenza Sospesa'}
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {licenseStatus === 'REVOKED'
                            ? 'La licenza di questo PC è stata revocata. Contatta il tuo amministratore per ricevere un nuovo codice.'
                            : 'La licenza di questo PC è temporaneamente sospesa. Contatta il tuo amministratore.'}
                    </p>
                    <p className="mt-4 text-xs text-gray-400">Stato: {licenseStatus}</p>
                </div>
            </div>
        )
    }

    // Not yet activated — show activation page
    if (!isActivated) {
        return (
            <Suspense fallback={<PageLoader />}>
                <LicenseActivationPage />
            </Suspense>
        )
    }

    // BRIDGE_ONLY license — show bridge mode UI (no offline data)
    if (licenseType === 'BRIDGE_ONLY') {
        return (
            <Suspense fallback={<PageLoader />}>
                <BridgeModePage />
            </Suspense>
        )
    }

    // Activated but offline-check failed after grace period (isValid=false, not revoked)
    // Still allow use — only hard-block on explicit REVOKED/SUSPENDED from server
    // Show warning banner in DesktopLayout instead

    return (
        <DesktopLayout licenseExpiring={!isValid} showBridge={licenseType === 'APP_AND_BRIDGE'}>
            <Suspense fallback={<PageLoader />}>
                <Routes>          <Route path="/" element={<DashboardPage />} />
                    <Route path="/appuntamenti" element={
                        <PermissionGuard permission="clinica.appuntamenti:read">
                            <AgendaPage />
                        </PermissionGuard>
                    } />
                    <Route path="/appuntamenti/:id" element={
                        <PermissionGuard permission="clinica.appuntamenti:read">
                            <AppuntamentoDetailPage />
                        </PermissionGuard>
                    } />
                    <Route path="/agenda" element={
                        <PermissionGuard permission="clinica.appuntamenti:read">
                            <AgendaPage />
                        </PermissionGuard>
                    } />
                    <Route path="/visite" element={
                        <PermissionGuard permission="clinica.visite:read">
                            <VisiteListPage />
                        </PermissionGuard>
                    } />
                    <Route path="/visite/nuova" element={
                        <PermissionGuard permission="clinica.visite:create">
                            <NuovaVisitaPage />
                        </PermissionGuard>
                    } />
                    <Route path="/visite/:id" element={
                        <PermissionGuard permission="clinica.visite:read">
                            <VisitaDetailPage />
                        </PermissionGuard>
                    } />
                    <Route path="/pazienti" element={
                        <PermissionGuard permission="clinica.pazienti:read">
                            <PazientiPage />
                        </PermissionGuard>
                    } />
                    <Route path="/pazienti/nuovo" element={
                        <PermissionGuard permission="clinica.pazienti:create">
                            <NuovoPazientePage />
                        </PermissionGuard>
                    } />
                    <Route path="/pazienti/:id" element={
                        <PermissionGuard permission="clinica.pazienti:read">
                            <LavoratoreDetailPage />
                        </PermissionGuard>
                    } />
                    <Route path="/aziende" element={
                        <PermissionGuard permission="companies:read">
                            <AziendePage />
                        </PermissionGuard>
                    } />
                    <Route path="/aziende/:id" element={
                        <PermissionGuard permission="companies:read">
                            <AziendaDetailPage />
                        </PermissionGuard>
                    } />
                    <Route path="/scadenze" element={
                        <PermissionGuard permission="scadenze:read">
                            <ScadenzePage />
                        </PermissionGuard>
                    } />
                    <Route path="/protocolli" element={
                        <PermissionGuard permission="clinica.visite:read">
                            <ProtocolliPage />
                        </PermissionGuard>
                    } />
                    <Route path="/mansioni" element={
                        <PermissionGuard permission="clinica.visite:read">
                            <MansioniPage />
                        </PermissionGuard>
                    } />
                    <Route path="/tariffari" element={
                        <PermissionGuard permission="clinica.tariffari:read">
                            <TariffariPage />
                        </PermissionGuard>
                    } />
                    <Route path="/prestazioni" element={
                        <PermissionGuard permission="clinica.prestazioni:read">
                            <PrestazioniPage />
                        </PermissionGuard>
                    } />
                    <Route path="/convenzioni" element={
                        <PermissionGuard permission="clinica.convenzioni:read">
                            <ConvenzioniPage />
                        </PermissionGuard>
                    } />
                    <Route path="/sync" element={<SyncDetailPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/help" element={<HelpPage />} />
                    {licenseType === 'APP_AND_BRIDGE' && (
                        <Route path="/bridge" element={
                            <Suspense fallback={<PageLoader />}>
                                <BridgeModePage />
                            </Suspense>
                        } />
                    )}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </DesktopLayout>
    )
}
