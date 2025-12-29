/**
 * Management Layout
 * Main layout wrapper for cross-functional management features
 * 
 * Features:
 * - Management-specific sidebar navigation
 * - Header with user info and tenant selector
 * - Breadcrumb navigation
 * - Purple/violet theme for Management
 * - Separate from Formazione and Clinica layouts
 * 
 * @module components/layouts/ManagementLayout
 * @project 43 - Tenant Roles Management System
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import { ModuleSwitcher } from '../shared/ModuleSwitcher';

// Import Management theme
import '../../styles/management-theme.css';
import {
    Home,
    Users,
    Shield,
    Building2,
    Settings,
    FileText,
    Activity,
    Database,
    Globe,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    Bell,
    User,
    LogOut,
    HelpCircle,
    Layers,
    Key,
    UserCog,
    Lock,
    ClipboardList,
    BarChart3,
    FolderCog,
    Tag,
    Sparkles
} from 'lucide-react';

interface NavItem {
    label: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: NavItem[];
    badge?: number;
    permission?: string;
    adminOnly?: boolean;
}

/**
 * Navigation configuration for management sidebar
 */
const navigationItems: NavItem[] = [
    {
        label: 'Dashboard',
        href: '/management',
        icon: Home
    },
    {
        label: 'Tenant & Accessi',
        icon: Building2,
        children: [
            { label: 'I Miei Tenant', href: '/management/my-tenants', icon: Building2 },
            { label: 'Tutti i Tenant', href: '/management/tenants', icon: Layers, adminOnly: true },
            { label: 'Accessi Utenti', href: '/management/tenant-access', icon: Key }
        ]
    },
    {
        label: 'Gestione Persone',
        icon: Users,
        children: [
            { label: 'Tutte le Persone', href: '/management/persons', icon: Users },
            { label: 'Persone per Tenant', href: '/management/tenant-users', icon: UserCog }
        ]
    },
    {
        label: 'Ruoli & Permessi',
        icon: Shield,
        children: [
            { label: 'Ruoli', href: '/management/roles', icon: Shield },
            { label: 'Gerarchia Ruoli', href: '/management/role-hierarchy', icon: Layers },
            { label: 'Permessi Avanzati', href: '/management/permissions/advanced', icon: Key },
            { label: 'Matrice Permessi', href: '/management/permissions', icon: Lock },
        ]
    },
    {
        label: 'CMS',
        href: '/management/cms',
        icon: Globe,
        permission: 'CMS'
    },
    {
        label: 'GDPR & Privacy',
        icon: FileText,
        children: [
            { label: 'Audit Log', href: '/management/gdpr/audit', icon: Activity },
            { label: 'Data Export', href: '/management/gdpr/export', icon: Database },
            { label: 'Consensi', href: '/management/gdpr/consent', icon: ClipboardList }
        ]
    },
    {
        label: 'Sistema',
        icon: Settings,
        adminOnly: true,
        children: [
            { label: 'Activity Logs', href: '/management/logs', icon: Activity },
            { label: 'Backup & Restore', href: '/management/backup', icon: Database },
            { label: 'Configurazioni', href: '/management/config', icon: FolderCog },
            { label: 'Reports', href: '/management/reports', icon: BarChart3 }
        ]
    },
    {
        label: 'Contenuti',
        icon: Sparkles,
        children: [
            { label: 'Templates', href: '/management/templates', icon: FileText },
            { label: 'Codici Sconto', href: '/management/codici-sconto', icon: Tag }
        ]
    }
];

/**
 * Management Layout Component
 */
const ManagementLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, hasPermission } = useAuth();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [notifications] = useState(0);

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
            if (item.href === '/management') {
                return location.pathname === '/management' || location.pathname === '/management/';
            }
            return location.pathname.startsWith(item.href);
        }
        if (item.children) {
            return item.children.some(child => child.href && location.pathname.startsWith(child.href));
        }
        return false;
    };

    // Filter nav items by permission
    const filterNavItems = (items: NavItem[]): NavItem[] => {
        return items.filter(item => {
            if (item.adminOnly && !isAdmin) return false;
            if (item.permission && !hasPermission(item.permission, 'read') && !isAdmin) return false;
            return true;
        }).map(item => ({
            ...item,
            children: item.children ? filterNavItems(item.children) : undefined
        }));
    };

    const filteredNavItems = filterNavItems(navigationItems);

    // Handle logout
    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
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
                                ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                            }
                        `}
                        style={{ paddingLeft: `${12 + depth * 12}px` }}
                    >
                        <span className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${isActive ? 'text-purple-600' : 'text-gray-500'}`} />
                            {sidebarOpen && <span>{item.label}</span>}
                        </span>
                        {sidebarOpen && (
                            isExpanded
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                    {isExpanded && sidebarOpen && (
                        <div className="mt-1 ml-4 pl-3 border-l-2 border-purple-200 dark:border-purple-800 space-y-1">
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
                className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg
                    text-sm font-medium transition-all duration-200
                    ${isActive
                        ? 'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }
                `}
                style={{ paddingLeft: `${12 + depth * 12}px` }}
            >
                <Icon className={`h-5 w-5 ${isActive ? 'text-purple-600' : 'text-gray-500'}`} />
                {sidebarOpen && (
                    <>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                            <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {item.badge}
                            </span>
                        )}
                    </>
                )}
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 management-theme">
            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 left-0 z-50 flex flex-col
                    bg-gradient-to-b from-white to-purple-50/30 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700
                    transition-all duration-300
                    ${sidebarOpen ? 'w-64' : 'w-20'}
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
                    <Link to="/management" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                            <Settings className="h-6 w-6 text-white" />
                        </div>
                        {sidebarOpen && (
                            <div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">Management</span>
                                <p className="text-xs text-gray-500">Sistema Gestionale</p>
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
                    {filteredNavItems.map(item => renderNavItem(item))}
                </nav>

                {/* Sidebar Footer - Module Switcher */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <ModuleSwitcher
                        currentModule="management"
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
                <header className="sticky top-0 z-30 h-16 bg-gradient-to-r from-white via-purple-50/50 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-purple-100 dark:border-gray-700">
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
                            <span className="text-sm text-gray-500">Management</span>
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) || 'Dashboard'}
                            </span>
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
                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                        <User className="h-5 w-5 text-purple-600" />
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
                                            {user?.firstName} {user?.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500">{user?.email}</p>
                                        {isAdmin && (
                                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                                Admin
                                            </span>
                                        )}
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
                        <span>© 2025 ElementMedica/Formazione - Management Console</span>
                        <span>v1.0.0</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ManagementLayout;
