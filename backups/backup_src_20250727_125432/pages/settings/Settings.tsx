import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TemplatesSettingsPage from './Templates';
import UsersTab from './UsersTab';
import RolesTab from './RolesTab';
import HierarchyTab from './HierarchyTab';
import ActivityLogsTab from './ActivityLogsTab';
import UserPreferences from './UserPreferences';
import AdminSettings from '../../components/settings/AdminSettings';
import PermissionsTab from './PermissionsTab';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon } from 'lucide-react';
import { TabNavigation } from '../../components/shared';

const Settings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // Determina quale tab è attivo dalla URL o usa il default
  const getActiveTab = () => {
    if (location.pathname.endsWith('/users')) return 'users';
    if (location.pathname.endsWith('/roles')) return 'roles';
    if (location.pathname.endsWith('/hierarchy')) return 'hierarchy';
    if (location.pathname.endsWith('/logs')) return 'logs';
    if (location.pathname.endsWith('/templates')) return 'templates';
    if (location.pathname.endsWith('/permissions')) return 'permissions';
    return 'general';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  const changeTab = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/settings${tabId !== 'general' ? `/${tabId}` : ''}`);
  };

  // Crea array di tab basato sui permessi
  const tabs = [
    { id: 'general', label: 'Generali' },
    { id: 'templates', label: 'Templates' },
  ];
  
  // Aggiungi i tab solo se l'utente ha i permessi
  if (hasPermission('users', 'read')) {
    tabs.push({ id: 'users', label: 'Utenti' });
  }
  
  if (hasPermission('roles', 'read') || hasPermission('ROLE_MANAGEMENT')) {
    tabs.push({ id: 'roles', label: 'Ruoli' });
  }
  
  // Aggiungi tab Gerarchia se l'utente può gestire i ruoli
  if (hasPermission('roles', 'read') || hasPermission('ROLE_MANAGEMENT')) {
    tabs.push({ id: 'hierarchy', label: 'Gerarchia' });
  }
  
  if (hasPermission('system', 'admin')) {
    tabs.push({ id: 'permissions', label: 'Permessi' });
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

          {activeTab === 'templates' && <TemplatesSettingsPage />}
          
          {activeTab === 'users' && hasPermission('users', 'read') && <UsersTab />}
          
          {activeTab === 'roles' && (hasPermission('roles', 'read') || hasPermission('ROLE_MANAGEMENT')) && <RolesTab />}
          
          {activeTab === 'hierarchy' && (hasPermission('roles', 'read') || hasPermission('ROLE_MANAGEMENT')) && <HierarchyTab />}
          
          {activeTab === 'permissions' && hasPermission('system', 'admin') && <PermissionsTab />}
          
          {activeTab === 'logs' && hasPermission('logs', 'read') && <ActivityLogsTab />}
        </div>
      </div>
    </div>
  );
};

export default Settings;
           
          