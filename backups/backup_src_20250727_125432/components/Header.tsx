import React, { useState } from 'react';
import { Menu, Bell, User, LogOut, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/auth/useAuth';
import Notifications from './shared/Notifications';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
    <header className="sticky top-0 bg-white border-b border-gray-200 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 -mb-px">
          {/* Header: Left side */}
          <div className="flex">
            {/* Hamburger button */}
            <button
              className="text-gray-500 hover:text-gray-600 xl:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🍔 Hamburger button clicked! Current state:', sidebarOpen);
                setSidebarOpen(!sidebarOpen);
              }}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="w-6 h-6 fill-current" />
            </button>
          </div>

          {/* Header: Right side */}
          <div className="flex items-center space-x-3">
            {/* Sistema di notifiche */}
            <Notifications />
            
            <button className="p-2 text-gray-500 hover:text-gray-600">
              <span className="sr-only">Notifications</span>
              <Bell className="w-5 h-5" />
            </button>

            {/* User info and menu */}
            {user && (
              <div className="flex items-center space-x-3">
                {/* User info */}
                <div className="hidden md:block text-right">
                  <div className="text-sm font-medium text-gray-900">{getUserDisplayName()}</div>
                  <div className="text-xs text-gray-500">{getUserRole()}</div>
                </div>

                {/* User menu dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center justify-center bg-blue-100 rounded-full w-8 h-8 hover:bg-blue-200 transition-colors"
                  >
                    <span className="text-xs font-medium text-blue-600">{getUserInitials()}</span>
                  </button>

                  {/* Dropdown menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <div className="text-sm font-medium text-gray-900">{getUserDisplayName()}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          <div className="text-xs text-blue-600">{getUserRole()}</div>
                        </div>
                        
                        <Link
                          to="/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Impostazioni
                        </Link>
                        
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
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
      </div>

      {/* Overlay per chiudere il menu quando si clicca fuori */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
};

export default Header;