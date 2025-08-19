import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Notifications from '../shared/Notifications';

console.log('DEBUG: Layout.tsx rendered');

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Debug logging per il sidebar
  console.log('📱 Layout render - sidebarOpen:', sidebarOpen);

  return (
    <div className="flex min-h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
        <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      </div>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden lg:ml-0">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <Notifications />
        <main className="flex-grow p-4 sm:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;