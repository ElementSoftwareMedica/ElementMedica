import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  Settings,
  User
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/auth/useAuth';
import Notifications from '../shared/Notifications';
import { DashboardSwitcher } from '../shared/DashboardSwitcher';
import { TenantSelector as TenantSwitcher } from '../shared/TenantSelector';
import { TenantSelector as TenantFilterSelector } from '../common/TenantSelector';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Genera le iniziali dell'utente
  const getUserInitials = () => {
    if (!user) return 'U';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';

    // Gestione sicura per evitare errori toUpperCase su undefined
    const firstInitial = firstName && typeof firstName === 'string' ? firstName.charAt(0) : '';
    const lastInitial = lastName && typeof lastName === 'string' ? lastName.charAt(0) : '';
    const initials = (firstInitial + lastInitial).trim();

    if (initials) {
      return initials.toUpperCase();
    }

    // Fallback all'email se disponibile
    if (user.email && typeof user.email === 'string') {
      return user.email.charAt(0).toUpperCase();
    }

    return 'U';
  };

  // Ottiene il nome completo dell'utente
  const getUserDisplayName = () => {
    if (!user) return 'Utente';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || 'Utente';
  };

  // Ottiene il ruolo dell'utente
  const getUserRole = () => {
    if (!user) return '';
    const roleConfig = {
      ADMIN: 'Admin',
      SUPER_ADMIN: 'Super Admin',
      MANAGER: 'Manager',
      TRAINER: 'Formatore',
      EMPLOYEE: 'Dipendente'
    };

    // Usa user.role invece di user.roleType per compatibilità con il tipo Person
    const userRole = user.role || '';
    return roleConfig[userRole as keyof typeof roleConfig] || userRole || '';
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-gradient-to-r from-white via-blue-50/50 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-blue-100 dark:border-gray-700">
      <div className="flex items-center justify-between h-full px-4">
        {/* Header: Left side */}
        <div className="flex items-center gap-4">
          {/* Breadcrumb / Title - Uniform style */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-600">ElementSicurezza</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {location.pathname === '/dashboard'
                ? 'Dashboard'
                : location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) || 'Dashboard'}
            </span>
          </div>
        </div>

        {/* Header: Center - Tenant Filter Selector (visible for multi-tenant users) */}
        <div className="flex-1 flex justify-center">
          <TenantFilterSelector variant="compact" />
        </div>

        {/* Header: Right side */}
        <div className="flex items-center gap-4">
          {/* Sistema di notifiche */}
          <Notifications />

          {/* Notifications bell */}
          <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Bell className="h-5 w-5 text-gray-500" />
          </button>

          {/* Help */}
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <HelpCircle className="h-5 w-5 text-gray-500" />
          </button>

          {/* User menu */}
          {user && (
            <div className="relative group">
              <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">{getUserInitials()}</span>
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.firstName || 'Utente'}
                </span>
              </button>

              {/* Dropdown menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{getUserDisplayName()}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  {getUserRole() && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                      {getUserRole()}
                    </span>
                  )}
                </div>

                <Link
                  to="/"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Home className="h-4 w-4" />
                  Vai al Sito Pubblico
                </Link>

                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Settings className="h-4 w-4" />
                  Impostazioni
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* Fallback se non c'è utente loggato */}
          {!user && (
            <Link
              to="/login"
              className="flex items-center justify-center bg-gray-100 rounded-full w-8 h-8"
            >
              <User className="w-4 h-4 text-gray-600" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;