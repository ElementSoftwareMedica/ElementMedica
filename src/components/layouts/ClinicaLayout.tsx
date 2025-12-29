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
 * 
 * @module components/layouts/ClinicaLayout
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import { ModuleSwitcher } from '../shared/ModuleSwitcher';
import { TenantSelector } from '../common/TenantSelector';

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
    Bell,
    User,
    LogOut,
    HelpCircle,
    MapPin,
    CreditCard,
    Package,
    UserCog
} from 'lucide-react';

interface NavItem {
    label: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: NavItem[];
    badge?: number;
}

/**
 * Navigation configuration for clinical sidebar
 */
const navigationItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/poliambulatorio',
        icon: Home
    },
    {
        label: 'Struttura',
        icon: Building2,
        children: [
            { label: 'Poliambulatori', href: '/poliambulatorio/poliambulatori', icon: Building2 },
            { label: 'Sedi', href: '/poliambulatorio/sedi', icon: MapPin },
            { label: 'Ambulatori', href: '/poliambulatorio/ambulatori', icon: Building2 },
            { label: 'Strumenti', href: '/poliambulatorio/strumenti', icon: Activity }
        ]
    },
    {
        label: 'Catalogo',
        icon: ClipboardList,
        children: [
            { label: 'Prestazioni', href: '/poliambulatorio/prestazioni', icon: ClipboardList },
            { label: 'Convenzioni', href: '/poliambulatorio/convenzioni', icon: FileText },
            { label: 'Bundle/Offerte', href: '/poliambulatorio/catalogo/bundles', icon: Package }
        ]
    },
    {
        label: 'Agenda',
        icon: Calendar,
        children: [
            { label: 'Dashboard', href: '/poliambulatorio/agenda', icon: Home },
            { label: 'Calendario', href: '/poliambulatorio/calendario', icon: Calendar },
            { label: 'Appuntamenti', href: '/poliambulatorio/appuntamenti', icon: Calendar },
            { label: 'Disponibilità', href: '/poliambulatorio/disponibilita', icon: Calendar },
            { label: 'Accettazione', href: '/poliambulatorio/accettazione', icon: Users }
        ]
    },
    {
        label: 'Clinica',
        icon: Stethoscope,
        children: [
            { label: 'Dashboard Medico', href: '/poliambulatorio/medico', icon: Stethoscope },
            { label: 'Visite', href: '/poliambulatorio/visite', icon: Stethoscope },
            { label: 'Referti', href: '/poliambulatorio/referti', icon: FileText },
            { label: 'Pazienti', href: '/poliambulatorio/pazienti', icon: Users },
            { label: 'Medici', href: '/poliambulatorio/personale/medici', icon: User }
        ]
    },
    {
        label: 'Fatturazione',
        icon: CreditCard,
        children: [
            { label: 'Dashboard', href: '/poliambulatorio/fatturazione', icon: Home },
            { label: 'Fatture', href: '/poliambulatorio/fatturazione/fatture', icon: FileText },
            { label: 'Report', href: '/poliambulatorio/fatturazione/report', icon: Activity }
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

const ClinicaLayout: React.FC<ClinicaLayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, userRole, isAuthenticated, isLoading } = useAuth();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>(['Struttura', 'Catalogo']);
    const [notifications] = useState(3);

    // Auth protection: redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Save redirect path for after login
            sessionStorage.setItem('redirectAfterLogin', location.pathname);
            navigate('/poliambulatorio/login', { replace: true });
        }
    }, [isLoading, isAuthenticated, navigate, location.pathname]);

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

    // Check if user is admin
    const isAdmin = user?.role === 'Admin' ||
        user?.globalRole === 'ADMIN' ||
        user?.globalRole === 'SUPER_ADMIN' ||
        user?.roles?.includes('ADMIN') ||
        user?.roles?.includes('SUPER_ADMIN');

    // Auto-expand active menu
    useEffect(() => {
        navigationItems.forEach(item => {
            if (item.children) {
                const isActive = item.children.some(child =>
                    child.href && location.pathname.startsWith(child.href)
                );
                if (isActive && !expandedItems.includes(item.label)) {
                    setExpandedItems(prev => [...prev, item.label]);
                }
            }
        });
    }, [location.pathname]);

    // Close mobile menu on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [mobileMenuOpen]);

    // Toggle submenu
    const toggleExpand = (label: string) => {
        setExpandedItems(prev =>
            prev.includes(label)
                ? prev.filter(l => l !== label)
                : [...prev, label]
        );
    };

    // Check if nav item is active
    const isNavItemActive = (item: NavItem): boolean => {
        if (item.href) {
            if (item.href === '/poliambulatorio') {
                return location.pathname === '/poliambulatorio' || location.pathname === '/poliambulatorio/';
            }
            return location.pathname.startsWith(item.href);
        }
        if (item.children) {
            return item.children.some(child => child.href && location.pathname.startsWith(child.href));
        }
        return false;
    };

    // Get user display name with title
    const getUserDisplayName = () => {
        if (user) {
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            const isMedico = userRole === 'MEDICO';
            if (isMedico) {
                const userGender = (user as { gender?: string }).gender;
                const title = userGender === 'F' ? 'Dott.ssa' : 'Dott.';
                return `${title} ${firstName} ${lastName}`.trim();
            }
            return `${firstName} ${lastName}`.trim() || user.email || 'Utente';
        }
        return 'Utente';
    };

    const getUserRoleDisplay = () => {
        if (userRole) {
            switch (userRole) {
                case 'MEDICO': return 'Medico';
                case 'INFERMIERE': return 'Infermiere';
                case 'ADMIN': return 'Amministratore';
                case 'RECEPTIONIST': return 'Segreteria';
                default: return userRole;
            }
        }
        return 'Operatore';
    };

    // Handle logout
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/poliambulatorio/login');
        } catch (error) {
            console.error('Logout error:', error);
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
                        onClick={() => toggleExpand(item.label)}
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
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-700 rounded-lg flex items-center justify-center">
                            <Stethoscope className="h-6 w-6 text-white" />
                        </div>
                        {sidebarOpen && (
                            <div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">ElementMedica</span>
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
                    {navigationItems.map(item => renderNavItem(item))}
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
                {/* Header */}
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
                                {location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) || 'Dashboard'}
                            </span>
                        </div>

                        {/* Tenant Filter Selector - Visible for multi-tenant users */}
                        <div className="flex-1 flex justify-center">
                            <TenantSelector variant="compact" />
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-4">
                            {/* Notifications */}
                            <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Bell className="h-5 w-5 text-gray-500" />
                                {notifications > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                        {notifications}
                                    </span>
                                )}
                            </button>

                            {/* Help */}
                            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <HelpCircle className="h-5 w-5 text-gray-500" />
                            </button>

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
                                        to="/profile"
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
        </div>
    );
};

export default ClinicaLayout;
