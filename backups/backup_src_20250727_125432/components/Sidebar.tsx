import React, { useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  GraduationCap,
  UserCog,
  Settings,
  X,
  Calendar,
  FileText,
  Folder,
  Globe,
  Shield,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const location = useLocation();
  const { pathname } = location;
  const { user, isAuthenticated, hasPermission: authHasPermission, permissions, isLoading } = useAuth();
  
  // Usa direttamente l'AuthContext per i permessi
  const hasPermission = authHasPermission || ((resource: string, action: string): boolean => false);
  const userRole = user?.role || 'Employee';
  
  // Debug log per monitorare il ruolo utente nella Sidebar
  console.log('🎭 Sidebar: User role and permissions from AuthContext:', {
    userRole,
    isLoading,
    permissionsCount: Object.keys(permissions || {}).length,
    isAdmin: userRole === 'Admin' || userRole === 'Administrator',
    timestamp: new Date().toISOString()
  });
  
  // Debug logging per capire cosa sta succedendo
  console.log('🔍 Sidebar Debug:', {
    userRole,
    permissionsCount: Object.keys(permissions || {}).length,
    isLoading,
    hasPermissionFunction: typeof hasPermission,
    isAuthenticated,
    userId: user?.id
  });
  
  // Test specifici per i permessi
  console.log('🎯 Permission Tests:', {
    companiesRead: hasPermission('companies', 'read'),
    employeesRead: hasPermission('employees', 'read'),
    trainersRead: hasPermission('trainers', 'read'),
    personsRead: hasPermission('persons', 'read')
  });
  
  // Debug specifico per le condizioni del menu
  console.log('🎯 Menu Visibility Debug:', {
    companiesVisible: (userRole === 'Admin' || userRole === 'Administrator') || hasPermission('companies', 'read'),
    employeesVisible: (userRole === 'Admin' || userRole === 'Administrator') || hasPermission('employees', 'read'),
    trainersVisible: (userRole === 'Admin' || userRole === 'Administrator') || hasPermission('trainers', 'read'),
    personsVisible: (userRole === 'Admin' || userRole === 'Administrator') || hasPermission('persons', 'read'),
    tenantsVisible: userRole === 'Admin',
    adminGdprVisible: userRole === 'Admin'
  });
  
  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);

  // Close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!open || keyCode !== 27) return;
      setOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  // Close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !open ||
        sidebar.current.contains(target as Node) ||
        trigger.current.contains(target as Node)
      )
        return;
      setOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  return (
    <>
      {/* Sidebar backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-gray-900 bg-opacity-30 z-40 xl:hidden xl:z-auto transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div
        id="sidebar"
        ref={sidebar}
        className={`flex flex-col absolute z-40 left-0 top-0 xl:static xl:left-auto xl:top-auto xl:translate-x-0 transform h-screen overflow-y-scroll xl:overflow-y-auto no-scrollbar w-64 xl:w-72 xl:sidebar-expanded:!w-72 2xl:!w-72 shrink-0 bg-white p-4 transition-all duration-200 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-64'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          {/* Logo */}
          <NavLink to="/" className="block">
            <div className="flex items-center">
              <svg 
                className="w-8 h-8 text-blue-600" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              <span className="ml-2 text-xl font-bold text-gray-800">ElementSoftware</span>
            </div>
          </NavLink>
          {/* Close button */}
          <button
            ref={trigger}
            className="xl:hidden text-gray-500 hover:text-gray-600"
            onClick={() => setOpen(!open)}
            aria-controls="sidebar"
            aria-expanded={open}
          >
            <span className="sr-only">Close sidebar</span>
            <X className="w-6 h-6 fill-current" />
          </button>
        </div>

        {/* Links */}
        <div className="space-y-8">
          {/* Pages group */}
          <div>
            <h3 className="text-xs uppercase text-gray-500 font-semibold pl-3">
              Main
            </h3>
            <ul className="mt-3">
              <li className="mb-1 last:mb-0">
                <NavLink
                  end
                  to="/"
                  className={({ isActive }) =>
                    `block transition duration-150 truncate ${
                      isActive
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`
                  }
                >
                  <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                    <LayoutDashboard className="shrink-0 h-5 w-5 mr-3" />
                    <span className="text-sm">Dashboard</span>
                  </div>
                </NavLink>
              </li>
              {((userRole === 'Admin' || userRole === 'Administrator') || hasPermission('companies', 'read')) && (
                <li className="mb-1 last:mb-0">
                  <NavLink
                    to="/companies"
                    className={({ isActive }) =>
                      `block transition duration-150 truncate ${
                        isActive || pathname.includes('/companies')
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                      <Building2 className="shrink-0 h-5 w-5 mr-3" />
                      <span className="text-sm">Companies</span>
                    </div>
                  </NavLink>
                </li>
              )}
              {(userRole === 'Admin' || userRole === 'Administrator' || hasPermission('persons', 'read')) && (
                <li className="mb-1 last:mb-0">
                  <NavLink
                    to="/persons"
                    className={({ isActive }) =>
                      `block transition duration-150 truncate ${
                        isActive || pathname.includes('/persons')
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                      <Users className="shrink-0 h-5 w-5 mr-3" />
                      <span className="text-sm">Persone</span>
                    </div>
                  </NavLink>
                </li>
              )}
              {(userRole === 'Admin' || userRole === 'Administrator' || hasPermission('employees', 'read')) && (
                <li className="mb-1 last:mb-0">
                  <NavLink
                    to="/employees"
                    className={({ isActive }) =>
                      `block transition duration-150 truncate ${
                        isActive || pathname.includes('/employees')
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                      <UserCog className="shrink-0 h-5 w-5 mr-3" />
                      <span className="text-sm">Dipendenti</span>
                    </div>
                  </NavLink>
                </li>
              )}
              {((userRole === 'Admin' || userRole === 'Administrator') || hasPermission('courses', 'read')) && (
                <li className="mb-1 last:mb-0">
                  <NavLink
                    to="/courses"
                    className={({ isActive }) =>
                      `block transition duration-150 truncate ${
                        isActive || pathname.includes('/courses')
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                      <GraduationCap className="shrink-0 h-5 w-5 mr-3" />
                      <span className="text-sm">Courses</span>
                    </div>
                  </NavLink>
                </li>
              )}
              {((userRole === 'Admin' || userRole === 'Administrator') || hasPermission('trainers', 'read')) && (
                <li className="mb-1 last:mb-0">
                  <NavLink
                    to="/trainers"
                    className={({ isActive }) =>
                      `block transition duration-150 truncate ${
                        isActive || pathname.includes('/trainers')
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                      <UserCheck className="shrink-0 h-5 w-5 mr-3" />
                      <span className="text-sm">Formatori</span>
                    </div>
                  </NavLink>
                </li>
              )}
              {((userRole === 'Admin' || userRole === 'Administrator') || hasPermission('courses', 'read')) && (
                <li className="mb-1 last:mb-0">
                  <NavLink
                    to="/scheduled-courses"
                    className={({ isActive }) =>
                      `block transition duration-150 truncate ${
                        isActive || pathname.includes('/scheduled-courses')
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                      <Calendar className="shrink-0 h-5 w-5 mr-3" />
                      <span className="text-sm">Scheduled Courses</span>
                    </div>
                  </NavLink>
                </li>
              )}
              {((userRole === 'Admin' || userRole === 'Administrator') || hasPermission('documents', 'read')) && (
                <li className="mb-1 last:mb-0">
                  <NavLink
                    to="/documents-corsi"
                    className={({ isActive }) =>
                      `block transition duration-150 truncate ${
                        isActive || pathname.includes('/documents-corsi')
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                      <Folder className="shrink-0 h-5 w-5 mr-3" />
                      <span className="text-sm">Documenti Corsi</span>
                    </div>
                  </NavLink>
                </li>
              )}
              {(userRole === 'Admin' || userRole === 'Administrator') && (
                <li className="mb-1 last:mb-0">
                  <NavLink
                    to="/quotes-invoices"
                    className={({ isActive }) =>
                      `block transition duration-150 truncate ${
                        isActive || pathname.includes('/quotes-invoices')
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                      <FileText className="shrink-0 h-5 w-5 mr-3" />
                      <span className="text-sm">Preventivi e Fatture</span>
                    </div>
                  </NavLink>
                </li>
              )}
            </ul>
          </div>
          {/* Settings group */}
          <div>
            <h3 className="text-xs uppercase text-gray-500 font-semibold pl-3">
              Settings
            </h3>
            <ul className="mt-3">
              {userRole === 'Admin' && (
                <li className="mb-1 last:mb-0">
                  <NavLink
                    to="/tenants"
                    className={({ isActive }) =>
                      `block transition duration-150 truncate ${
                        isActive
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                      <Globe className="shrink-0 h-5 w-5 mr-3" />
                      <span className="text-sm">Tenants</span>
                    </div>
                  </NavLink>
                </li>
              )}
              <li className="mb-1 last:mb-0">
                <NavLink
                  to="/gdpr"
                  className={({ isActive }) =>
                    `block transition duration-150 truncate ${
                      isActive || pathname.includes('/gdpr')
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`
                  }
                >
                  <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                    <Shield className="shrink-0 h-5 w-5 mr-3" />
                    <span className="text-sm">GDPR & Privacy</span>
                  </div>
                </NavLink>
              </li>
              {((userRole === 'Admin') || hasPermission('gdpr', 'read')) && (
                <li className="mb-1 last:mb-0">
                  <NavLink
                    to="/admin/gdpr"
                    className={({ isActive }) =>
                      `block transition duration-150 truncate ${
                        isActive || pathname.includes('/admin/gdpr')
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`
                    }
                  >
                    <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                      <Shield className="shrink-0 h-5 w-5 mr-3" />
                      <span className="text-sm">Admin GDPR</span>
                    </div>
                  </NavLink>
                </li>
              )}
              <li className="mb-1 last:mb-0">
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    `block transition duration-150 truncate ${
                      isActive
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`
                  }
                >
                  <div className="flex items-center p-2 rounded-xl hover:bg-gray-100">
                    <Settings className="shrink-0 h-5 w-5 mr-3" />
                    <span className="text-sm">Settings</span>
                  </div>
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        {/* User info */}
        <div className="mt-auto pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center">
              <div className="flex items-center justify-center bg-blue-100 rounded-full w-10 h-10">
                <span className="text-sm font-medium text-blue-600">JD</span>
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-800">John Doe</div>
                <div className="text-xs text-gray-500">Administrator</div>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Log out</span>
              <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                <path d="M6.5 14.5A7.5 7.5 0 0 1 6.5 1.5m3.25 7h-9.5" />
                <path d="M10.982 9.762L13.5 7.244l-2.518-2.518" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;