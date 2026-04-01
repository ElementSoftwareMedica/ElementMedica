import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationPopup from '../notifications/NotificationPopup';

// Import Formazione theme
import '../../styles/formazione-theme.css';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Layout Component - ElementSicurezza (Sicurezza e Formazione)
 * Main layout wrapper with sidebar navigation (always visible on desktop)
 * Sidebar collapse syncs with main content area width
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 formazione-theme">
      {/* Sidebar - Fixed on desktop, toggleable on mobile */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 
          transition-all duration-300
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          open={mobileMenuOpen}
          setOpen={setMobileMenuOpen}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area - adjusts based on sidebar width */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {/* Header */}
        <Header sidebarOpen={mobileMenuOpen} setSidebarOpen={setMobileMenuOpen} />

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>© 2025 ElementSicurezza - Sicurezza e Formazione</span>
            <span>v1.0.0</span>
          </div>
        </footer>
      </div>

      {/* Real-time notification popups */}
      <NotificationPopup position="top-right" />
    </div>
  );
};

export default Layout;