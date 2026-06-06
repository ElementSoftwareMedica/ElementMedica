/**
 * Clinica Layout (Poliambulatorio)
 * Main layout wrapper for ElementMedica clinical module
 * 
 * Features:
 * - Clinical-specific sidebar navigation (sticky, always visible)
 * - Header with user info and notifications (uniform style)
 * - Module switcher for cross-domain navigation
 * - Footer with version info
 * - Element Medica Teal theme
 * - SidebarContext for programmatic control from child pages
 * 
 * @module components/layouts/ClinicaLayout
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/auth/useAuth';
import { useTenantAccess } from '../../hooks/useTenantAccess';
import { getCurrentBrand } from '../../config/brands.config';
import { getTenantBranding } from '../../utils/tenantBranding';
import { visiteApi, appuntamentoPrestazioniApi, scadenzeMDLApi } from '../../services/clinicaApi';
import { ModuleSwitcher } from '../shared/ModuleSwitcher';
import { TenantSelector } from '../common/TenantSelector';
import { TenantModeSelector } from '../shared/TenantModeSelector';
import Notifications from '../shared/Notifications';
import NotificationBell from '../notifications/NotificationBell';
import NotificationPopup from '../notifications/NotificationPopup';
import TenantLogoImage from './TenantLogoImage';
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext';
import { useRoleGuard } from '../../hooks/useRoleGuard';

// Import Element Medica theme
import '../../styles/clinica-theme.css';
import {
    Home,
    Calendar,
    Users,
    FileText,
    Settings,
    Building2,
    ClipboardList,
    Stethoscope,
    Activity,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    User,
    LogOut,
    HelpCircle,
    MapPin,
    Package,
    UserCog,
    ListOrdered,
    Monitor,
    HardHat,
    Scale,
    ShieldCheck,
    UserCheck,
    ClipboardCheck,
    CalendarClock,
    Pill,
    Euro
} from 'lucide-react';

interface NavItem {
    label: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: NavItem[];
    badge?: number;
    feature?: string;
}

/**
 * Navigation configuration for clinical sidebar
 * Order: Dashboard, Agenda (open), Clinica (open), Fatturazione, Catalogo, Struttura
 */
const navigationItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/poliambulatorio/agenda',
        icon: Home
    },
    {
        label: 'Agenda',
        icon: Calendar,
        children: [
            { label: 'Calendario', href: '/poliambulatorio/calendario', icon: Calendar },
            { label: 'Appuntamenti', href: '/poliambulatorio/appuntamenti', icon: Calendar },
            { label: 'Disponibilità', href: '/poliambulatorio/disponibilita', icon: Calendar },
            { label: 'Coda', href: '/poliambulatorio/coda', icon: ListOrdered }
        ]
    },
    {
        label: 'Clinica',
        icon: Stethoscope,
        children: [
            { label: 'Visite', href: '/poliambulatorio/visite', icon: Stethoscope },
            { label: 'Pazienti', href: '/poliambulatorio/pazienti', icon: Users },
            { label: 'Medici', href: '/poliambulatorio/personale/medici', icon: User }
        ]
    },
    {
        label: 'Med. del Lavoro',
        icon: HardHat,
        feature: 'MDL_BASE',
        children: [
            { label: 'Dashboard Scadenze', href: '/poliambulatorio/mdl/scadenze', icon: Calendar },
            { label: 'Aziende', href: '/poliambulatorio/mdl/aziende', icon: Building2 },
            { label: 'Allegato 3A', href: '/poliambulatorio/mdl/allegato-3a', icon: FileText },
            { label: 'Allegato 3B', href: '/poliambulatorio/mdl/allegato-3b', icon: FileText, feature: 'MDL_ALLEGATO_3B' },
            { label: 'Mansioni', href: '/poliambulatorio/mdl/mansioni', icon: HardHat },
            { label: 'Giudizi Idoneità', href: '/poliambulatorio/mdl/giudizi-idoneita', icon: Scale },
            { label: 'Rischio → Prestazioni', href: '/poliambulatorio/mdl/rischio-prestazioni', icon: ShieldCheck },
            { label: 'Protocolli Sanitari', href: '/poliambulatorio/mdl/protocolli-sanitari', icon: ClipboardCheck, feature: 'MDL_PROTOCOLLI' },
            { label: 'Nomine Figure', href: '/poliambulatorio/mdl/nomine-ruolo', icon: UserCheck },
            { label: 'Tariffari Aziende', href: '/poliambulatorio/mdl/tariffari-aziende', icon: Euro }
        ]
    },
    {
        label: 'Catalogo',
        icon: ClipboardList,
        children: [
            { label: 'Prestazioni', href: '/poliambulatorio/catalogo/prestazioni', icon: ClipboardList },
            { label: 'Convenzioni', href: '/poliambulatorio/catalogo/convenzioni', icon: FileText },
            { label: 'Bundle/Offerte', href: '/poliambulatorio/catalogo/bundles', icon: Package }
        ]
    },
    {
        label: 'Struttura',
        icon: Building2,
        children: [
            { label: 'Poliambulatori', href: '/poliambulatorio/poliambulatori', icon: Building2 },
            { label: 'Sedi', href: '/poliambulatorio/sedi', icon: MapPin },
            { label: 'Ambulatori', href: '/poliambulatorio/ambulatori', icon: Building2 },
            { label: 'Strumenti', href: '/poliambulatorio/strumenti', icon: Activity },
            { label: 'Monitor Display', href: '/poliambulatorio/struttura/monitors', icon: Monitor }
        ]
    },
    {
        label: 'Scadenzario',
        icon: CalendarClock,
        children: [
            { label: 'Dashboard', href: '/poliambulatorio/scadenze', icon: CalendarClock },
            { label: 'Farmaci', href: '/poliambulatorio/scadenze?tab=farmaci', icon: Pill }
        ]
    },
    {
        label: 'Impostazioni',
        href: '/poliambulatorio/impostazioni',
        icon: Settings
    }
];

/**
 * ClinicaLayout Component
 * @param children - Optional children to render instead of Outlet
 */
interface ClinicaLayoutProps {
    children?: React.ReactNode;
}

/**
 * Inner layout component that uses SidebarContext
 */
const ClinicaLayoutContent: React.FC<ClinicaLayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, userRole, userRoleType, isAuthenticated, isLoading } = useAuth();
    const { isCollapsed, setCollapsed } = useSidebar();
    const { currentTenant, hasFeature } = useTenantAccess();
    const { isTrainerOnly, isPazienteOnly, isMedico, isMedicoCompetente } = useRoleGuard();

    // Branch-specific branding for clinical module (MEDICA)
    const tenantBranding = getTenantBranding(
        currentTenant,
        'element-medica',
        'ElementMedica',
        getCurrentBrand().logoIcon
    );

    // Use sidebar context for desktop, local state for mobile
    const sidebarOpen = !isCollapsed;
    const setSidebarOpen = (open: boolean) => setCollapsed(!open);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>(['Agenda', 'Clinica']);

    // Nascondi header ClinicaLayout quando l'overlay dettaglio visita è attivo
    // (VisitaPage ha il proprio StickyVisitHeader con navigazione completa)
    const isVisitaDetailActive = /\/poliambulatorio\/visite\/[^/]+/.test(location.pathname);

    // Conteggio prestazioni da refertare per badge sidebar
    // Usa AppuntamentoPrestazione con stato IN_ATTESA_REFERTO/ESEGUITA senza referto
    // queryKey include currentTenant.id per refetch automatico su cambio tenant
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prestazioniDaRefertareData } = useQuery({
        queryKey: ['prestazioni-da-refertare-sidebar', currentTenant?.id],
        queryFn: () => appuntamentoPrestazioniApi.listDaRefertare({ limit: 1 }),
        refetchInterval: 60_000,
        staleTime: 30_000,
        enabled: isAuthenticated && !!currentTenant?.id,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prestazioniDaRefertareBadge = ((prestazioniDaRefertareData as any)?.total ?? 0) > 0
        ? (prestazioniDaRefertareData as any).total
        : undefined;

    const { data: scadenzeMdlNotificheData } = useQuery({
        queryKey: ['scadenze-mdl-sidebar-badge', currentTenant?.id],
        queryFn: () => scadenzeMDLApi.getNotifiche(30, 30),
        refetchInterval: 60_000,
        staleTime: 30_000,
        enabled: isAuthenticated && !!currentTenant?.id && hasFeature('MDL_BASE'),
    });
    const scadenzeMdlBadge = scadenzeMdlNotificheData?.conteggio
        ? scadenzeMdlNotificheData.conteggio.scadute + scadenzeMdlNotificheData.conteggio.critiche + scadenzeMdlNotificheData.conteggio.urgenti
        : 0;

    // Versione dinamica di navigationItems con badge "Visite" e feature gating + filtri per ruolo
    const dynamicNavItems = useMemo((): NavItem[] => {
        // PAZIENTE puro: nav ridotta alla sola cartella personale
        if (isPazienteOnly && user?.id) {
            return [{
                label: 'La mia cartella',
                href: `/poliambulatorio/pazienti/${user.id}`,
                icon: Users,
            }];
        }

        // Gruppi nascosti per MEDICO (base o del lavoro, senza admin)
        const hiddenForMedico = new Set(['Catalogo', 'Struttura', 'Scadenzario']);
        // Med. del Lavoro visibile solo per MEDICO_COMPETENTE o per medici con specialità 'Medicina del Lavoro'
        const medicoSpecialita: string[] = ((user as any)?.specialties ?? []);
        const hasMdlSpecialty = medicoSpecialita.some(
            (s: string) => s.toLowerCase().includes('medicina del lavoro') || s.toLowerCase().includes('medicina lavoro')
        );
        if (isMedico && !isMedicoCompetente && !hasMdlSpecialty) {
            hiddenForMedico.add('Med. del Lavoro');
        }

        let items = navigationItems
            .filter(group => !group.feature || hasFeature(group.feature))
            .filter(group => !isMedico || !hiddenForMedico.has(group.label));

        // MEDICO: filtra le voci di Impostazioni (solo template visita, firma, bridge, privacy)
        if (isMedico) {
            const allowedMedicoSettings = new Set([
                '/poliambulatorio/impostazioni/visit-templates',
                '/poliambulatorio/impostazioni/modulistica',
                '/poliambulatorio/impostazioni/email-template',
                '/poliambulatorio/impostazioni/firma',
                '/poliambulatorio/impostazioni/bridge',
                '/poliambulatorio/impostazioni/privacy',
            ]);
            items = items.map(group => {
                if (group.label === 'Impostazioni' && group.children) {
                    return {
                        ...group,
                        children: group.children.filter(c => !c.href || allowedMedicoSettings.has(c.href))
                    };
                }
                return group;
            });
        }

        return items.map(group => ({
            ...group,
            children: group.children
                ?.filter(child => !child.feature || hasFeature(child.feature))
                .map(child =>
                    child.href === '/poliambulatorio/visite'
                        ? { ...child, badge: prestazioniDaRefertareBadge }
                        : child.href === '/poliambulatorio/mdl/scadenze' && scadenzeMdlBadge > 0
                            ? { ...child, badge: scadenzeMdlBadge }
                            : child
                )
        }));
    }, [prestazioniDaRefertareBadge, scadenzeMdlBadge, hasFeature, isPazienteOnly, isMedico, isMedicoCompetente, user?.id]);

    // Auth protection: redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Save redirect path for after login
            sessionStorage.setItem('redirectAfterLogin', location.pathname);
            navigate('/poliambulatorio/login', { replace: true });
        }
    }, [isLoading, isAuthenticated, navigate, location.pathname]);

    // Auto-expand active menu — spostato prima degli early return per rispettare le regole degli hook
    useEffect(() => {
        if (!isAuthenticated) return;
        dynamicNavItems.forEach(item => {
            if (item.children) {
                const isActive = item.children.some(child =>
                    child.href && location.pathname.startsWith(child.href)
                );
                if (isActive && !expandedItems.includes(item.label)) {
                    setExpandedItems(prev => [...prev, item.label]);
                }
            }
        });
    }, [location.pathname, isAuthenticated]);

    // Close mobile menu on Escape — spostato prima degli early return
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [mobileMenuOpen]);

    // Raccogli tutti gli href foglia dalla navigazione per il longest-prefix-match —
    // spostato prima degli early return per rispettare le regole degli hook
    const allLeafHrefs = useMemo(() => {
        const hrefs: string[] = [];
        const collect = (items: NavItem[]) => {
            for (const item of items) {
                if (item.href) hrefs.push(item.href);
                if (item.children) collect(item.children);
            }
        };
        collect(dynamicNavItems);
        return hrefs;
    }, [dynamicNavItems]);

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="h-screen flex justify-center items-center bg-gradient-to-br from-teal-50 to-cyan-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
                    <span className="mt-4 block text-gray-600">Verifica autenticazione...</span>
                </div>
            </div>
        );
    }

    // Don't render if not authenticated (will redirect)
    if (!isAuthenticated) {
        return null;
    }

    // --- Guardie di accesso per ruolo ---
    // TRAINER puro: non ha accesso al Poliambulatorio → reindirizza alla Formazione
    if (isTrainerOnly) {
        return <Navigate to="/schedules" replace />;
    }
    // PAZIENTE puro: può vedere SOLO la propria cartella
    if (isPazienteOnly && user?.id) {
        const cartellaPath = `/poliambulatorio/pazienti/${user.id}`;
        if (!location.pathname.startsWith(cartellaPath)) {
            return <Navigate to={cartellaPath} replace />;
        }
    }

    // Check if user is admin (include TENANT_ADMIN — tenant-scoped via user.roles da /auth/verify)
    const isAdmin = user?.role === 'Admin' ||
        user?.role === 'Administrator' ||
        user?.globalRole === 'ADMIN' ||
        user?.globalRole === 'SUPER_ADMIN' ||
        user?.roles?.includes('ADMIN') ||
        user?.roles?.includes('SUPER_ADMIN') ||
        user?.roles?.includes('TENANT_ADMIN') ||
        user?.roles?.includes('COMPANY_ADMIN');

    // Toggle submenu
    const toggleExpand = (label: string) => {
        setExpandedItems(prev =>
            prev.includes(label)
                ? prev.filter(l => l !== label)
                : [...prev, label]
        );
    };

    // Check if nav item is active — usa longest-prefix-match per evitare
    // che /poliambulatorio/coda matchi quando siamo su /poliambulatorio/coda/monitors
    const isNavItemActive = (item: NavItem): boolean => {
        if (item.href) {
            // Dashboard now points to /poliambulatorio/agenda
            if (item.href === '/poliambulatorio/agenda' && item.label === 'Dashboard') {
                return location.pathname === '/poliambulatorio/agenda' ||
                    location.pathname === '/poliambulatorio' ||
                    location.pathname === '/poliambulatorio/';
            }
            // Match esatto
            if (location.pathname === item.href || location.pathname === item.href + '/') {
                return true;
            }
            // Prefix match: attivo solo se nessun altro href è un match più specifico (più lungo)
            if (location.pathname.startsWith(item.href! + '/') || location.pathname.startsWith(item.href!)) {
                const hasMoreSpecificMatch = allLeafHrefs.some(
                    otherHref => otherHref !== item.href &&
                        otherHref.length > (item.href?.length ?? 0) &&
                        location.pathname.startsWith(otherHref)
                );
                return !hasMoreSpecificMatch;
            }
            return false;
        }
        if (item.children) {
            return item.children.some(child => isNavItemActive(child));
        }
        return false;
    };

    // Get user display name with title
    const getUserDisplayName = () => {
        if (user) {
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            const isMedico = userRoleType === 'MEDICO';
            if (isMedico) {
                const userGender = (user as { gender?: string }).gender;
                const title = userGender === 'F' ? 'Dott.ssa' : 'Dott.';
                return `${title} ${firstName} ${lastName}`.trim();
            }
            return `${firstName} ${lastName}`.trim() || user.email || 'Utente';
        }
        return 'Utente';
    };

    /**
     * Generate smart breadcrumb title from path
     * Handles UUIDs by showing parent segment with "Dettagli" suffix
     */
    const getBreadcrumbTitle = (): string => {
        const segments = location.pathname.split('/').filter(Boolean);
        if (segments.length === 0) return 'Dashboard';

        const lastSegment = segments[segments.length - 1];

        // Check if last segment is a UUID (36 chars with dashes or 32 chars without)
        const isUuid = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(lastSegment);

        // Path label mapping for better readability
        const pathLabels: Record<string, string> = {
            'poliambulatorio': 'Dashboard',
            'poliambulatori': 'Poliambulatori',
            'sedi': 'Sedi',
            'ambulatori': 'Ambulatori',
            'strumenti': 'Strumenti',
            'prestazioni': 'Prestazioni',
            'convenzioni': 'Convenzioni',
            'bundles': 'Bundle/Offerte',
            'agenda': 'Agenda',
            'calendario': 'Calendario',
            'appuntamenti': 'Appuntamenti',
            'disponibilita': 'Disponibilità',
            'accettazione': 'Accettazione',
            'medico': 'Dashboard Medico',
            'visite': 'Visite',
            'pazienti': 'Pazienti',
            'medici': 'Medici',
            'fatturazione': 'Fatturazione',
            'fatture': 'Fatture',
            'report': 'Report',
            'impostazioni': 'Impostazioni',
            'modifica': 'Modifica',
            'nuovo': 'Nuovo',
            'nuova': 'Nuova'
        };

        // Singular form mapping for detail pages
        const singularLabels: Record<string, string> = {
            'poliambulatori': 'Poliambulatorio',
            'sedi': 'Sede',
            'ambulatori': 'Ambulatorio',
            'strumenti': 'Strumento',
            'prestazioni': 'Prestazione',
            'convenzioni': 'Convenzione',
            'bundles': 'Bundle',
            'appuntamenti': 'Appuntamento',
            'visite': 'Visita',
            'pazienti': 'Paziente',
            'medici': 'Medico',
            'fatture': 'Fattura'
        };

        if (isUuid && segments.length > 1) {
            // Get parent segment for context
            const parentSegment = segments[segments.length - 2];
            const singularLabel = singularLabels[parentSegment] ||
                pathLabels[parentSegment] ||
                parentSegment.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
            return `Dettaglio ${singularLabel}`;
        }

        return pathLabels[lastSegment] ||
            lastSegment.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
    };

    const getUserRoleDisplay = () => {
        // userRole from useAuth already returns the display name (e.g. 'Medico', 'Admin')
        return userRole || 'Operatore';
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/poliambulatorio/login');
        } catch (error) {
        }
    };

    // Render nav item
    const renderNavItem = (item: NavItem, depth = 0) => {
        const isActive = isNavItemActive(item);
        const isExpanded = expandedItems.includes(item.label);
        const hasChildren = item.children && item.children.length > 0;
        const Icon = item.icon;

        if (hasChildren) {
            return (
                <div key={item.label}>
                    <button
                        onClick={() => {
                            // When sidebar is collapsed, expand it first then show children
                            if (!sidebarOpen) {
                                setSidebarOpen(true);
                                // Ensure the item is expanded after sidebar opens
                                if (!expandedItems.includes(item.label)) {
                                    setExpandedItems(prev => [...prev, item.label]);
                                }
                            } else {
                                toggleExpand(item.label);
                            }
                        }}
                        title={!sidebarOpen ? item.label : undefined}
                        className={`
                            w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                            text-sm font-medium transition-all duration-200
                            ${isActive
                                ? 'bg-teal-100 text-teal-900 dark:bg-teal-900/30 dark:text-teal-200'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                            }
                        `}
                        style={{ paddingLeft: `${12 + depth * 12}px` }}
                    >
                        <span className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${isActive ? 'text-teal-600' : 'text-gray-500'}`} />
                            {sidebarOpen && <span>{item.label}</span>}
                        </span>
                        {sidebarOpen && (
                            isExpanded
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                    {isExpanded && sidebarOpen && (
                        <div className="mt-1 ml-4 pl-3 border-l-2 border-teal-200 dark:border-teal-800 space-y-1">
                            {item.children!.map(child => renderNavItem(child, depth + 1))}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                key={item.label}
                to={item.href || '#'}
                onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}
                className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    text-sm font-medium transition-all duration-200
                    ${isActive
                        ? 'bg-teal-100 text-teal-900 dark:bg-teal-900/30 dark:text-teal-200'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }
                `}
                style={{ paddingLeft: `${12 + depth * 12}px` }}
            >
                <Icon className={`h-5 w-5 ${isActive ? 'text-teal-600' : 'text-gray-500'}`} />
                {sidebarOpen && (
                    <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                            <span className="bg-teal-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {item.badge}
                            </span>
                        )}
                    </>
                )}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 clinica-theme" data-brand="element-medica">
            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 flex flex-col
                    bg-gradient-to-b from-white to-teal-50/30 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700
                    transition-all duration-300
                    ${sidebarOpen ? 'w-64' : 'w-20'}
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
                    <Link to="/poliambulatorio" className="flex items-center gap-3">
                        <TenantLogoImage
                            src={tenantBranding.logoUrl}
                            fallbackSrc={getCurrentBrand().logoIcon}
                            alt={tenantBranding.displayName}
                            className="w-10 h-10 rounded-lg object-contain"
                        />
                        {sidebarOpen && (
                            <div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">{tenantBranding.displayName}</span>
                                <p className="text-xs text-gray-500">Poliambulatorio</p>
                            </div>
                        )}
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="hidden lg:block p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <Menu className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {dynamicNavItems.map(item => renderNavItem(item))}
                </nav>

                {/* Sidebar Footer - Module Switcher */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <ModuleSwitcher
                        currentModule="poliambulatorio"
                        collapsed={!sidebarOpen}
                    />
                </div>
            </aside>

            {/* Mobile overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Main Content */}
            <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {/* Header — nascosto quando l'overlay dettaglio visita è attivo (VisitaPage ha il proprio header) */}
                {!isVisitaDetailActive && (
                    <header className="sticky top-0 z-30 h-16 bg-gradient-to-r from-white via-teal-50/50 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-teal-100 dark:border-gray-700">
                        <div className="flex items-center justify-between h-full px-4">
                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>

                            {/* Breadcrumb / Title */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-teal-600">ElementMedica</span>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {getBreadcrumbTitle()}
                                </span>
                            </div>

                            {/* Tenant Filter Selector - Visible for multi-tenant users */}
                            <div className="flex-1 flex justify-end px-4">
                                <TenantModeSelector compact />
                            </div>

                            {/* Right side */}
                            <div className="flex items-center gap-4">
                                {/* Advanced Notification System */}
                                <NotificationBell />

                                {/* User menu */}
                                <div className="relative group">
                                    <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                                            <User className="h-5 w-5 text-teal-600" />
                                        </div>
                                        <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {user?.firstName || 'Utente'}
                                        </span>
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </button>

                                    {/* Dropdown */}
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {getUserDisplayName()}
                                            </p>
                                            <p className="text-xs text-gray-500">{user?.email}</p>
                                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-teal-100 text-teal-800 rounded">
                                                {getUserRoleDisplay()}
                                            </span>
                                        </div>
                                        <Link
                                            to="/poliambulatorio/profilo"
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <User className="h-4 w-4" />
                                            Profilo
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Esci
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                {/* Page Content */}
                <main className="p-6">
                    {children || <Outlet />}
                </main>

                {/* Footer */}
                <footer className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>© 2025 ElementMedica - Poliambulatorio</span>
                        <span>v1.0.0</span>
                    </div>
                </footer>
            </div>

            {/* Sistema di notifiche toast globale */}
            <Notifications />

            {/* Real-time notification popups */}
            <NotificationPopup position="top-right" />
        </div>
    );
};

/**
 * Main ClinicaLayout component - wraps content with SidebarProvider
 */
const ClinicaLayout: React.FC<ClinicaLayoutProps> = ({ children }) => {
    return (
        <SidebarProvider>
            <ClinicaLayoutContent>{children}</ClinicaLayoutContent>
        </SidebarProvider>
    );
};

export default ClinicaLayout;
