/**
 * Sidebar Component - Formazione (Sicurezza & Formazione)
 * Main sidebar navigation matching Management and Poliambulatorio style
 * 
 * Features:
 * - Collapsible sidebar with icons-only mode
 * - Expandable submenus with visual hierarchy
 * - Module switcher for cross-domain navigation
 * - Blue theme for Formazione section
 * 
 * @module components/layouts/Sidebar
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTenantAccess } from '../../hooks/useTenantAccess';
import { useExpiringCoursesCount } from '../../hooks/useExpiringCoursesCount';
import { useNewSubmissionsCount } from '../../hooks/useNewSubmissionsCount';
import { ModuleSwitcher } from '../shared/ModuleSwitcher';
import { getCurrentBrand } from '../../config/brands.config';
import { getTenantBranding } from '../../utils/tenantBranding';
import {
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Folder,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings,
  UserCheck,
  UserCog,
  Users
} from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: number;
}

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen, collapsed = false, onCollapsedChange }) => {
  const location = useLocation();
  const { pathname } = location;
  const { user, hasPermission: authHasPermission } = useAuth();
  const { currentTenant } = useTenantAccess();
  const brand = getCurrentBrand();

  // Branch-specific branding for training module (FORMAZIONE)
  const tenantBranding = getTenantBranding(
    currentTenant,
    'element-sicurezza',
    'ElementSicurezza',
    brand.logoIcon
  );

  // State for sidebar collapse (desktop) - use prop if provided
  const [sidebarOpen, setSidebarOpen] = useState(!collapsed);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Anagrafica', 'Formazione']);

  // Sync internal state with prop
  const handleCollapse = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    onCollapsedChange?.(!newState);
  };

  // Hook per il conteggio dei corsi in scadenza
  const { count: expiringCoursesCount } = useExpiringCoursesCount();

  // Hook per il conteggio delle nuove risposte ai form (status NEW)
  const { count: newSubmissionsCount } = useNewSubmissionsCount();

  // Permission helpers — usa ruoli e permessi del tenant corrente (tenant-scoped via /auth/verify)
  const hasPermission = authHasPermission || ((): boolean => false);
  const userRoles = user?.roles || [];
  // isAdmin: vero se l'utente ha un ruolo admin/tenant-admin SUL TENANT CORRENTE
  // user.roles è aggiornato da refreshUser() dopo ogni switchTenant()
  const isAdmin = userRoles.some(r => ['ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN', 'TENANT_ADMIN'].includes(r))
    || user?.role === 'Admin' || user?.role === 'Administrator';

  // Verifica se l'utente è un semplice EMPLOYEE (senza ruoli di gestione)
  const isEmployeeOnly = userRoles.includes('EMPLOYEE') &&
    !userRoles.some(r => ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN', 'COMPANY_ADMIN', 'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER'].includes(r));

  // Navigation configuration
  const navigationItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard
    },
    {
      label: 'Anagrafica',
      icon: Users,
      children: [
        ...(isAdmin || hasPermission('companies', 'read') ? [{
          label: 'Aziende',
          href: '/companies',
          icon: Building2
        }] : []),
        ...(!isEmployeeOnly && (isAdmin || hasPermission('employees', 'read')) ? [{
          label: 'Dipendenti',
          href: '/employees',
          icon: UserCog
        }] : []),
        ...(!isEmployeeOnly && (isAdmin || hasPermission('trainers', 'read')) ? [{
          label: 'Formatori e RSPP',
          href: '/trainers',
          icon: UserCheck
        }] : [])
      ].filter(Boolean)
    },
    {
      label: 'Formazione',
      icon: GraduationCap,
      children: [
        ...(isAdmin || hasPermission('courses', 'read') ? [{
          label: 'Corsi',
          href: '/courses',
          icon: GraduationCap
        }] : []),
        ...(isAdmin || hasPermission('courses', 'read') ? [{
          label: 'Programmazione',
          href: '/schedules',
          icon: Calendar,
          badge: expiringCoursesCount > 0 ? expiringCoursesCount : undefined
        }] : []),
        ...(isAdmin || hasPermission('documents', 'read') ? [{
          label: 'Documenti Corsi',
          href: '/documents-corsi',
          icon: Folder
        }] : [])
      ].filter(Boolean)
    },
    ...(isAdmin ? [{
      label: 'Amministrazione',
      icon: FileText,
      children: [
        {
          label: 'Preventivi',
          href: '/preventivi',
          icon: FileText
        },
        ...(isAdmin || hasPermission('form_templates', 'read') ? [{
          label: 'Test',
          href: '/test',
          icon: ClipboardList,
          badge: newSubmissionsCount > 0 ? newSubmissionsCount : undefined
        }] : [])
      ]
    }] : []),
    {
      label: 'Impostazioni',
      icon: Settings,
      children: [
        {
          label: 'Impostazioni',
          href: '/formazione/impostazioni',
          icon: Settings
        }
      ]
    }
  ].filter(item => !item.children || item.children.length > 0);

  // Auto-expand active menu
  useEffect(() => {
    navigationItems.forEach(item => {
      if (item.children) {
        const isActive = item.children.some(child =>
          child.href && pathname.startsWith(child.href)
        );
        if (isActive && !expandedItems.includes(item.label)) {
          setExpandedItems(prev => [...prev, item.label]);
        }
      }
    });
  }, [pathname]);

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
      if (item.href === '/dashboard') {
        return pathname === '/dashboard' || pathname === '/';
      }
      return pathname.startsWith(item.href);
    }
    if (item.children) {
      return item.children.some(child => child.href && pathname.startsWith(child.href));
    }
    return false;
  };

  // Render nav item with improved submenu styling
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
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }
            `}
          >
            <span className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
              {sidebarOpen && <span>{item.label}</span>}
            </span>
            {sidebarOpen && (
              isExpanded
                ? <ChevronDown className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && sidebarOpen && (
            <div className="mt-1 ml-4 pl-3 border-l-2 border-blue-200 dark:border-blue-800 space-y-1">
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
          flex items-center gap-3 px-3 py-2 rounded-lg
          text-sm font-medium transition-all duration-200
          ${isActive
            ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }
        `}
      >
        <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
        {sidebarOpen && (
          <>
            <span className="flex-1">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <div
      className={`
        flex flex-col h-screen
        bg-gradient-to-b from-white to-blue-50/30 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700
        transition-all duration-300
        ${sidebarOpen ? 'w-64' : 'w-20'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img
            src={tenantBranding.logoUrl || brand.logoIcon}
            alt={tenantBranding.displayName}
            className="w-10 h-10 rounded-lg object-contain"
          />
          {sidebarOpen && (
            <div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{tenantBranding.displayName}</span>
              <p className="text-xs text-gray-500">Sicurezza e Formazione</p>
            </div>
          )}
        </Link>
        <button
          onClick={handleCollapse}
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
          currentModule="formazione"
          collapsed={!sidebarOpen}
        />
      </div>
    </div>
  );
};

export default Sidebar;
