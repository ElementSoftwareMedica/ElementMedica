import { Routes, Route, Navigate } from 'react-router-dom'
import { DesktopLayout } from './components/DesktopLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { AgendaPage } from './pages/AgendaPage'
import { VisiteListPage } from './pages/VisiteListPage'
import { PazientiPage } from './pages/PazientiPage'
import { AziendePage } from './pages/AziendePage'
import { ScadenzePage } from './pages/ScadenzePage'
import { ProtocolliPage } from './pages/ProtocolliPage'
import { MansioniPage } from './pages/MansioniPage'
import { VisitaDetailPage } from './pages/VisitaDetailPage'
import { SyncDetailPage } from './pages/SyncDetailPage'
import { AziendaDetailPage } from './pages/AziendaDetailPage'
import { LavoratoreDetailPage } from './pages/LavoratoreDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { LicenseActivationPage } from './pages/LicenseActivationPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConnectivityProvider } from './context/ConnectivityContext'
import { SyncStatusProvider } from './sync/SyncStatusProvider'
import { DesktopAuthProvider, useDesktopAuth } from './context/DesktopAuthContext'
import { LicenseProvider, useLicense } from './context/LicenseContext'
import { KeyRound } from 'lucide-react'

export function App(): JSX.Element {
  return (
    <DesktopAuthProvider>
      <ConnectivityProvider>
        <SyncStatusProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </SyncStatusProvider>
      </ConnectivityProvider>
    </DesktopAuthProvider>
  )
}

function AppRoutes(): JSX.Element {
  const { isAuthenticated, isLoading } = useDesktopAuth()

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
  const { isActivated, isValid, licenseStatus, isLoading } = useLicense()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500" />
      </div>
    )
  }

  // License explicitly revoked or suspended by server
  if (isActivated && (licenseStatus === 'REVOKED' || licenseStatus === 'SUSPENDED')) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-2xl border border-red-600/30 mb-4">
            <KeyRound className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">
            {licenseStatus === 'REVOKED' ? 'Licenza Revocata' : 'Licenza Sospesa'}
          </h1>
          <p className="text-gray-400 text-sm">
            {licenseStatus === 'REVOKED'
              ? 'La licenza di questo PC è stata revocata. Contatta il tuo amministratore per ricevere un nuovo codice.'
              : 'La licenza di questo PC è temporaneamente sospesa. Contatta il tuo amministratore.'}
          </p>
          <p className="mt-4 text-xs text-gray-600">Stato: {licenseStatus}</p>
        </div>
      </div>
    )
  }

  // Not yet activated — show activation page
  if (!isActivated) {
    return <LicenseActivationPage />
  }

  // Activated but offline-check failed after grace period (isValid=false, not revoked)
  // Still allow use — only hard-block on explicit REVOKED/SUSPENDED from server
  // Show warning banner in DesktopLayout instead

  return (
    <DesktopLayout licenseExpiring={!isValid}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/visite" element={<VisiteListPage />} />
        <Route path="/visite/:id" element={<VisitaDetailPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/pazienti" element={<PazientiPage />} />
        <Route path="/pazienti/:id" element={<LavoratoreDetailPage />} />
        <Route path="/aziende" element={<AziendePage />} />
        <Route path="/aziende/:id" element={<AziendaDetailPage />} />
        <Route path="/scadenze" element={<ScadenzePage />} />
        <Route path="/protocolli" element={<ProtocolliPage />} />
        <Route path="/mansioni" element={<MansioniPage />} />
        <Route path="/sync" element={<SyncDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DesktopLayout>
  )
}
