import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UsersTab from './UsersTab';
import ActivityLogsTab from './ActivityLogsTab';
import UserPreferences from './UserPreferences';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon } from 'lucide-react';
import { TabNavigation } from '../../components/shared';

const Settings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();

  // Helper per verificare se l'utente è admin
  const isAdmin = user?.role === 'Admin' || user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN');

  // Determina quale tab è attivo dalla URL o usa il default
  const getActiveTab = () => {
    if (location.pathname.endsWith('/users')) return 'users';
    if (location.pathname.endsWith('/logs')) return 'logs';
    return 'general';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  // Redirect da /settings a /settings/users se non c'è tab selezionato
  useEffect(() => {
    if (location.pathname === '/settings' || location.pathname === '/settings/') {
      navigate('/settings/users', { replace: true });
    }
  }, [location.pathname, navigate]);

  const changeTab = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/settings/${tabId}`);
  };

  // Crea array di tab basato sui permessi
  const tabs = [
    { id: 'general', label: 'Generali' },
  ];

  // Aggiungi i tab solo se l'utente ha i permessi
  if (hasPermission('users', 'read')) {
    tabs.push({ id: 'users', label: 'Utenti' });
  }

  if (hasPermission('logs', 'read')) {
    tabs.push({ id: 'logs', label: 'Log Attività' });
  }

  return (
    <div className="container px-4 mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center">
        <SettingsIcon className="mr-2 h-6 w-6" />
        Impostazioni
      </h1>

      <div className="bg-white rounded-2xl shadow-sm">
        {/* Tabs - usando TabNavigation */}
        <div className="border-b border-gray-200 p-4">
          <TabNavigation
            tabs={tabs}
            activeTabId={activeTab}
            onTabChange={changeTab}
          />
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'general' && <UserPreferences />}

          {activeTab === 'users' && hasPermission('users', 'read') && <UsersTab />}

          {activeTab === 'logs' && hasPermission('logs', 'read') && <ActivityLogsTab />}
        </div>
      </div>
    </div>
  );
};

export default Settings;