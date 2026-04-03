import { useState, useEffect, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Stethoscope,
  Calendar,
  Users,
  Building2,
  Clock,
  FileText,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Download,
  Upload,
  Activity,
  Settings
} from 'lucide-react'
import { AlertTriangle } from 'lucide-react'
import { OfflineIndicator } from './OfflineIndicator'
import { SyncStatusBar } from './SyncStatusBar'
import { UpdateBanner } from './UpdateBanner'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import { useConnectivity } from '../context/ConnectivityContext'
import { useSyncStatus } from '../sync/SyncStatusProvider'
import { useLicense } from '../context/LicenseContext'
import { executeUploadSync } from '../sync/SyncEngine'
import { startAutoSync, stopAutoSync } from '../sync/SyncScheduler'

interface DesktopLayoutProps {
  children: ReactNode
  licenseExpiring?: boolean
}

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda Giornata', icon: Calendar },
  { to: '/visite', label: 'Visite MDL', icon: Stethoscope },
  { to: '/pazienti', label: 'Lavoratori', icon: Users },
  { to: '/aziende', label: 'Aziende', icon: Building2 },
  { to: '/scadenze', label: 'Scadenze', icon: Clock },
  { to: '/protocolli', label: 'Protocolli', icon: FileText },
  { to: '/mansioni', label: 'Mansioni', icon: Briefcase },
  { to: '/sync', label: 'Sincronizzazione', icon: Activity },
  { to: '/settings', label: 'Impostazioni', icon: Settings }
]

export function DesktopLayout({ children, licenseExpiring }: DesktopLayoutProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useDesktopAuth()
  const { daysUntilExpiry, subscriptionExpiresAt } = useLicense()
  const { isOnline } = useConnectivity()
  const { pendingOperations, setSyncState, setProgress, setLastSyncAt, setPendingOperations, setErrorMessage } = useSyncStatus()
  const navigate = useNavigate()

  // Auto-sync scheduler: start on mount, stop on unmount
  useEffect(() => {
    startAutoSync({
      onStart: () => {
        setSyncState('UPLOADING')
        setErrorMessage(null)
      },
      onProgress: (current, total) => {
        setProgress({ current, total })
      },
      onComplete: (summary) => {
        setSyncState('IDLE')
        setProgress(null)
        setLastSyncAt(new Date().toISOString())
        setPendingOperations(Math.max(0, pendingOperations - summary.success))
        if (summary.conflict > 0) {
          setErrorMessage(`${summary.conflict} conflitti da risolvere`)
        }
      },
      onError: (message) => {
        setSyncState('ERROR')
        setProgress(null)
        setErrorMessage(message)
      }
    })
    return () => stopAutoSync()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async (): Promise<void> => {
    await executeUploadSync({
      onStart: () => {
        setSyncState('UPLOADING')
        setErrorMessage(null)
      },
      onProgress: (current, total) => {
        setProgress({ current, total })
      },
      onComplete: (summary) => {
        setSyncState('IDLE')
        setProgress(null)
        setLastSyncAt(new Date().toISOString())
        setPendingOperations(Math.max(0, pendingOperations - summary.success))
        if (summary.conflict > 0) {
          setErrorMessage(`${summary.conflict} conflitti da risolvere`)
        }
      },
      onError: (message) => {
        setSyncState('ERROR')
        setProgress(null)
        setErrorMessage(message)
      }
    })
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-60'
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-200 ease-in-out`}
      >
        {/* Logo / Brand */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900 font-heading">ElementMedica</span>
                <span className="block text-[10px] text-teal-600 -mt-0.5">Desktop MDL</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sync Actions */}
        <div className="border-t border-gray-100 p-2 space-y-1">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors ${
              isOnline
                ? 'text-teal-700 hover:bg-teal-50'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            disabled={!isOnline}
            title={isOnline ? 'Scarica dati giornata' : 'Non disponibile offline'}
          >
            <Download className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Scarica Giornata</span>}
          </button>
          <button
            onClick={handleSync}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full transition-colors ${
              isOnline && pendingOperations > 0
                ? 'text-blue-700 hover:bg-blue-50'
                : 'text-gray-400 cursor-not-allowed'
            }`}
            disabled={!isOnline || pendingOperations === 0}
            title={!isOnline ? 'Non disponibile offline' : pendingOperations === 0 ? 'Nessuna modifica da sincronizzare' : `Sincronizza ${pendingOperations} modifiche`}
          >
            <Upload className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span>
                Sincronizza{pendingOperations > 0 ? ` (${pendingOperations})` : ''}
              </span>
            )}
          </button>
        </div>

        {/* User Section */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="p-1 text-gray-400 hover:text-red-500"
              title="Esci"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <OfflineIndicator />
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
          <SyncStatusBar />
        </header>

        {/* Auto-update Banner */}
        <UpdateBanner />

        {/* License expiry warning banner */}
        {licenseExpiring && daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-800 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {daysUntilExpiry <= 0
                ? "L'abbonamento è scaduto. Contatta il supporto per rinnovarlo."
                : `L'abbonamento scade tra ${daysUntilExpiry} giorni${subscriptionExpiresAt ? ` (${new Date(subscriptionExpiresAt).toLocaleDateString('it-IT')})` : ''}. Contatta il supporto per rinnovarlo.`}
            </span>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
