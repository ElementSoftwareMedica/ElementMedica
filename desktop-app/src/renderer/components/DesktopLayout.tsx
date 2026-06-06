import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode, type CSSProperties } from 'react'
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
    Settings,
    AlertTriangle,
    ChevronDown,
    Receipt,
    List,
    Handshake,
    BookOpen,
    Wifi,
    Cpu
} from 'lucide-react'
import { OfflineIndicator } from './OfflineIndicator'
import { SyncStatusBar } from './SyncStatusBar'
import { SyncNotificationBar } from './SyncNotificationBar'
import { UpdateBanner } from './UpdateBanner'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import { useConnectivity } from '../context/ConnectivityContext'
import { useSyncStatus } from '../sync/SyncStatusProvider'
import { useLicense } from '../context/LicenseContext'
import { executeUploadSync } from '../sync/SyncEngine'
import { startAutoSync, stopAutoSync, triggerSyncNow, startAutoDownload, stopAutoDownload, triggerDownloadNow } from '../sync/SyncScheduler'

interface DesktopLayoutProps {
    children: ReactNode
    licenseExpiring?: boolean
    showBridge?: boolean
}

interface NavItem {
    to: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    section?: string
    /** Permesso richiesto. Se undefined, sempre visibile. */
    requiredPermission?: string
}

/** Tutti i nav items con il permesso richiesto */
const ALL_NAV_ITEMS: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
    { to: '/appuntamenti', label: 'Appuntamenti', icon: Calendar, section: 'main', requiredPermission: 'clinica.appuntamenti:read' },
    { to: '/visite', label: 'Visite MDL', icon: Stethoscope, section: 'clinica', requiredPermission: 'clinica.visite:read' },
    { to: '/pazienti', label: 'Lavoratori', icon: Users, section: 'clinica', requiredPermission: 'clinica.pazienti:read' },
    { to: '/aziende', label: 'Aziende', icon: Building2, section: 'clinica', requiredPermission: 'companies:read' },
    { to: '/scadenze', label: 'Scadenze', icon: Clock, section: 'clinica', requiredPermission: 'scadenze:read' },
    { to: '/protocolli', label: 'Protocolli', icon: FileText, section: 'dati', requiredPermission: 'clinica.visite:read' },
    { to: '/mansioni', label: 'Mansioni', icon: Briefcase, section: 'dati', requiredPermission: 'clinica.visite:read' },
    { to: '/tariffari', label: 'Tariffari', icon: Receipt, section: 'dati', requiredPermission: 'clinica.tariffari:read' },
    { to: '/prestazioni', label: 'Prestazioni', icon: List, section: 'dati', requiredPermission: 'clinica.prestazioni:read' },
    { to: '/convenzioni', label: 'Convenzioni', icon: Handshake, section: 'dati', requiredPermission: 'clinica.convenzioni:read' },
    { to: '/sync', label: 'Sincronizzazione', icon: Activity, section: 'sistema' },
    { to: '/settings', label: 'Impostazioni', icon: Settings, section: 'sistema' },
    { to: '/help', label: 'Guida', icon: BookOpen, section: 'sistema' }
]

const SECTIONS: Record<string, string> = {
    main: '',
    clinica: 'Medicina del Lavoro',
    dati: 'Anagrafiche',
    sistema: 'Sistema'
}

export function DesktopLayout({ children, licenseExpiring, showBridge }: DesktopLayoutProps): JSX.Element {
    const [collapsed, setCollapsed] = useState(false)
    const { user, logout, currentTenantId, availableTenants, switchTenant, hasPermission, permissions, refreshPermissionsNow } = useDesktopAuth()

    // Detect macOS/Windows for custom titlebar handling (hiddenInset on macOS, overlay on Windows)
    const isMac = navigator.userAgent.includes('Macintosh')
    const isWin = navigator.userAgent.includes('Windows')

    // Filtra i nav items in base ai permessi dell'utente.
    // Se i permessi non sono ancora caricati, mostra tutti i nav items (offline first).
    const NAV_ITEMS = useMemo(() => {
        const permissionsLoaded = Object.keys(permissions).length > 0
        if (!permissionsLoaded) return ALL_NAV_ITEMS
        return ALL_NAV_ITEMS.filter(item => {
            if (!item.requiredPermission) return true
            return hasPermission(item.requiredPermission)
        })
    }, [permissions, hasPermission])
    const { daysUntilExpiry, subscriptionExpiresAt } = useLicense()
    const { isOnline } = useConnectivity()
    const { pendingOperations, setSyncState, setProgress, setLastSyncAt, setPendingOperations, setErrorMessage, setLastSyncSummary, lastDownloadAt, setLastDownloadAt } = useSyncStatus()
    const navigate = useNavigate()
    const [showTenantMenu, setShowTenantMenu] = useState(false)

    // In-app scadenze badge counter
    const [scadenzeCount, setScadenzeCount] = useState<{ urgent: number; total: number }>({ urgent: 0, total: 0 })
    const refreshScadenzeCount = useCallback(async () => {
        if (!window.desktopApi?.app?.getScadenzeCount) return
        try {
            const counts = await window.desktopApi.app.getScadenzeCount() as { urgent: number; total: number }
            setScadenzeCount(counts)
        } catch {
            // Non-critical — DB may not be ready yet
        }
    }, [])
    useEffect(() => {
        // Initial load after a short delay to allow DB init
        const init = setTimeout(() => { void refreshScadenzeCount() }, 3000)
        const interval = setInterval(() => { void refreshScadenzeCount() }, 5 * 60 * 1000)
        window.addEventListener('elementmedica-desktop:scadenze-counter-refresh', refreshScadenzeCount)
        return () => {
            clearTimeout(init)
            clearInterval(interval)
            window.removeEventListener('elementmedica-desktop:scadenze-counter-refresh', refreshScadenzeCount)
        }
    }, [refreshScadenzeCount])

    // Callbacks riutilizzati per auto-sync, trigger immediato e sync manuale
    const syncCallbacks = useMemo(() => ({
        onStart: () => {
            setSyncState('UPLOADING')
            setErrorMessage(null)
        },
        onProgress: (current: number, total: number) => {
            setProgress({ current, total })
        },
        onComplete: (summary: { success: number; conflict: number; error: number }) => {
            setSyncState('IDLE')
            setProgress(null)
            setLastSyncAt(new Date().toISOString())
            setLastSyncSummary(summary)
            setPendingOperations(prev => Math.max(0, prev - summary.success))
            if (summary.conflict > 0) {
                setErrorMessage(`${summary.conflict} conflitti da risolvere`)
            }
            // Update tray badge after sync (scadenze may have changed)
            void window.desktopApi?.app?.updateBadge?.()
            void refreshScadenzeCount()
        },
        onError: (message: string) => {
            setSyncState('ERROR')
            setProgress(null)
            setErrorMessage(message)
        }
    }), [setSyncState, setErrorMessage, setProgress, setLastSyncAt, setLastSyncSummary, setPendingOperations])

    useEffect(() => {
        startAutoSync(syncCallbacks)
        return () => stopAutoSync()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-download callbacks (silent — no UI feedback on incremental updates)
    const downloadCallbacks = useMemo(() => ({
        onStart: () => { /* silent */ },
        onComplete: (recordCount: number, syncCursor?: string) => {
            const cursor = syncCursor || new Date().toISOString()
            if (recordCount > 0) {
                setLastDownloadAt(cursor)
                void refreshScadenzeCount()
            } else {
                setLastDownloadAt(cursor)
            }
        },
        onError: (_message: string) => { /* silent — retry next interval */ }
    }), [setLastDownloadAt, refreshScadenzeCount])

    // lastDownloadAtRef — stable ref for the scheduler closure
    const lastDownloadAtRef = useRef(lastDownloadAt)
    useEffect(() => { lastDownloadAtRef.current = lastDownloadAt }, [lastDownloadAt])

    useEffect(() => {
        startAutoDownload(downloadCallbacks, () => lastDownloadAtRef.current)
        return () => stopAutoDownload()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Periodic permission refresh (every 30 min when online)
    useEffect(() => {
        if (!isOnline) return
        const interval = setInterval(() => {
            void refreshPermissionsNow()
        }, 30 * 60 * 1000) // 30 minutes
        return () => clearInterval(interval)
    }, [isOnline, refreshPermissionsNow])

    // Auto-sync immediato al ritorno online (da offline → online)
    const prevIsOnlineRef = useRef(isOnline)
    useEffect(() => {
        const wasOffline = !prevIsOnlineRef.current
        prevIsOnlineRef.current = isOnline
        if (isOnline && wasOffline) {
            // Ritornati online: flush della coda immediatamente + aggiorna permessi + scarica delta
            void triggerSyncNow(syncCallbacks)
            void triggerDownloadNow(downloadCallbacks, () => lastDownloadAtRef.current)
            void refreshPermissionsNow()
        }
    }, [isOnline, syncCallbacks, refreshPermissionsNow])

    const handleSync = async (): Promise<void> => {
        await executeUploadSync(syncCallbacks)
    }

    // Group nav items by section
    let lastSection = ''

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`${collapsed ? 'w-[60px]' : 'w-[220px]'
                    } bg-white border-r border-gray-200/80 flex flex-col transition-all duration-200 ease-in-out`}
            >
                {/* Logo / Brand — macOS: extra top padding for traffic lights (trafficLightPosition y=18).
             The brand content is pushed right (pl-20 on mac) so it clears the three native buttons
             which extend to x≈66. On Windows the overlay titlebar handles spacing automatically. */}
                <div
                    className={`${isMac ? 'h-[60px] pt-[26px]' : 'h-14'} flex items-center justify-between px-3 border-b border-gray-100`}
                    style={isMac ? ({ WebkitAppRegion: 'drag' } as CSSProperties) : undefined}
                >
                    {!collapsed && (
                        <div className={`flex items-center gap-2.5 ${isMac ? 'pl-16' : ''}`} style={isMac ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}>
                            <div className="w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg flex items-center justify-center shadow-sm shadow-teal-600/20">
                                <Stethoscope className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-gray-900 font-heading tracking-tight">ElementMedica</span>
                                <span className="block text-[10px] text-teal-600 font-medium -mt-0.5">Desktop MDL</span>
                            </div>
                        </div>
                    )}
                    {collapsed && (
                        // On macOS collapsed sidebar, hide the icon in the traffic-light zone and show
                        // only the expand button below it to avoid overlapping the native buttons.
                        <div className={`w-8 h-8 bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg flex items-center justify-center shadow-sm shadow-teal-600/20 ${isMac ? 'invisible' : 'mx-auto'}`} style={isMac ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}>
                            <Stethoscope className="w-4 h-4 text-white" />
                        </div>
                    )}
                    {!collapsed && (
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
                            style={isMac ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {collapsed && (
                    <button
                        onClick={() => setCollapsed(false)}
                        className="py-2 flex justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                )}

                {/* Navigation */}
                <nav className="flex-1 py-2 px-2 overflow-y-auto">
                    {NAV_ITEMS.map(({ to, label, icon: Icon, section }) => {
                        const showSectionHeader = !collapsed && section && section !== lastSection && SECTIONS[section]
                        if (section) lastSection = section

                        return (
                            <div key={to}>
                                {showSectionHeader && (
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1.5">
                                        {SECTIONS[section]}
                                    </p>
                                )}
                                <NavLink
                                    to={to}
                                    end={to === '/'}
                                    className={({ isActive }) =>
                                        `flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all duration-150 ${collapsed ? 'justify-center' : ''
                                        } ${isActive
                                            ? 'bg-teal-50 text-teal-700 font-medium shadow-sm shadow-teal-100/50'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`
                                    }
                                    title={collapsed ? label : undefined}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    {!collapsed && <span>{label}</span>}
                                    {!collapsed && to === '/scadenze' && scadenzeCount.urgent > 0 && (
                                        <span className="ml-auto text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold leading-none">
                                            {scadenzeCount.urgent}
                                        </span>
                                    )}
                                    {!collapsed && to === '/scadenze' && scadenzeCount.urgent === 0 && scadenzeCount.total > 0 && (
                                        <span className="ml-auto text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold leading-none">
                                            {scadenzeCount.total}
                                        </span>
                                    )}
                                </NavLink>
                            </div>
                        )
                    })}
                </nav>

                {/* Bridge section (APP_AND_BRIDGE only) */}
                {showBridge && (
                    <div className="px-2 pb-1">
                        {!collapsed && (
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1.5">
                                Bridge
                            </p>
                        )}
                        <NavLink
                            to="/bridge"
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] transition-all duration-150 ${collapsed ? 'justify-center' : ''
                                } ${isActive
                                    ? 'bg-teal-50 text-teal-700 font-medium shadow-sm shadow-teal-100/50'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`
                            }
                            title={collapsed ? 'Dispositivi Medici' : undefined}
                        >
                            <Cpu className="w-4 h-4 shrink-0" />
                            {!collapsed && <span>Dispositivi Medici</span>}
                        </NavLink>
                    </div>
                )}

                {/* Sync Actions */}
                <div className="border-t border-gray-100 p-2 space-y-0.5">
                    <button
                        onClick={() => navigate('/')}
                        className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] w-full transition-all duration-150 ${collapsed ? 'justify-center' : ''
                            } ${isOnline
                                ? 'text-teal-700 hover:bg-teal-50'
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                        disabled={!isOnline}
                        title={isOnline ? 'Scarica dati giornata' : 'Non disponibile offline'}
                    >
                        <Download className="w-4 h-4 shrink-0" />
                        {!collapsed && <span>Scarica dati</span>}
                    </button>
                    <button
                        onClick={handleSync}
                        className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] w-full transition-all duration-150 ${collapsed ? 'justify-center' : ''
                            } ${isOnline && pendingOperations > 0
                                ? 'text-blue-700 hover:bg-blue-50'
                                : 'text-gray-300 cursor-not-allowed'
                            }`}
                        disabled={!isOnline || pendingOperations === 0}
                        title={!isOnline ? 'Non disponibile offline' : pendingOperations === 0 ? 'Nessuna modifica da sincronizzare' : `Sincronizza ${pendingOperations} modifiche`}
                    >
                        <Upload className="w-4 h-4 shrink-0" />
                        {!collapsed && (
                            <span>
                                Sincronizza{pendingOperations > 0 && (
                                    <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                                        {pendingOperations}
                                    </span>
                                )}
                            </span>
                        )}
                    </button>
                </div>

                {/* User Section */}
                <div className="border-t border-gray-100 p-2.5">
                    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
                        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm flex-shrink-0">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-gray-900 truncate">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                            </div>
                        )}
                        {!collapsed && (
                            <button
                                onClick={logout}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                title="Esci"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar — draggable on macOS/Windows with hidden title bar.
                    On macOS: same height/padding as the sidebar brand header (h-[56px] pt-[32px])
                    so both bottom borders are flush, creating a clean horizontal divider line. */}
                <header
                    className={`${isMac ? 'h-[60px] pt-[26px]' : isWin ? 'h-11' : 'h-12'} bg-white border-b border-gray-200/80 flex items-center justify-between px-5`}
                    style={(isMac || isWin) ? ({ WebkitAppRegion: 'drag' } as CSSProperties) : undefined}
                >
                    <div className="flex items-center gap-3" style={(isMac || isWin) ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}>
                        <OfflineIndicator />
                        <span className="text-[13px] text-gray-500 font-medium">
                            {new Date().toLocaleDateString('it-IT', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                            })}
                        </span>
                    </div>

                    <div className={`flex items-center gap-3${isWin ? ' pr-36' : ''}`} style={(isMac || isWin) ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}>
                        {/* Tenant selector — always visible in header if multiple tenants */}
                        {availableTenants.length > 1 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowTenantMenu(!showTenantMenu)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-medium transition-colors"
                                >
                                    <span className="max-w-[140px] truncate">
                                        {availableTenants.find(t => t.tenantId === currentTenantId)?.tenantName || 'Tenant'}
                                    </span>
                                    <ChevronDown className={`w-3 h-3 text-teal-500 transition-transform ${showTenantMenu ? 'rotate-180' : ''}`} />
                                </button>
                                {showTenantMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[180px] max-h-64 overflow-y-auto">
                                        {availableTenants.map(t => (
                                            <button
                                                key={t.tenantId}
                                                onClick={async () => {
                                                    await switchTenant(t.tenantId)
                                                    setShowTenantMenu(false)
                                                }}
                                                className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${t.tenantId === currentTenantId
                                                    ? 'bg-teal-50 text-teal-700 font-medium'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span className="block truncate">{t.tenantName}</span>
                                                {t.role && (
                                                    <span className="block text-[10px] text-gray-400 mt-0.5">{t.role}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <SyncStatusBar />
                    </div>
                </header>
                <UpdateBanner />

                {/* Barra notifiche sincronizzazione — appare durante/dopo sync */}
                <SyncNotificationBar />

                {/* License expiry warning banner */}
                {licenseExpiring && daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                    <div className="bg-amber-50 border-b border-amber-200/80 px-5 py-2 flex items-center gap-2.5 text-amber-800 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                            {daysUntilExpiry <= 0
                                ? "L'abbonamento è scaduto. Contatta il supporto per rinnovarlo."
                                : `L'abbonamento scade tra ${daysUntilExpiry} giorni${subscriptionExpiresAt ? ` (${new Date(subscriptionExpiresAt).toLocaleDateString('it-IT')})` : ''}. Contatta il supporto per rinnovarlo.`}
                        </span>
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-5 bg-gray-50/50">
                    {children}
                </main>
            </div>
        </div>
    )
}
