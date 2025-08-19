/**
 * Admin Settings Component
 * Week 14 Implementation - Administrative System Configuration
 */

import React, { useState } from 'react';
import { Shield, Server, Database, Clock, AlertTriangle, Download, Upload, RotateCcw, Save } from 'lucide-react';
import { Card } from '../../design-system/molecules/Card/Card';
import { Button } from '../../design-system/atoms/Button/Button';
import { Input } from '../../design-system/atoms/Input/Input';
import { Select } from '../../design-system/atoms/Select/Select';
import { useAuth } from '../../context/AuthContext';

// Toast notification function (simplified)
const toast = {
  success: (message: string) => console.log('SUCCESS:', message),
  error: (message: string) => console.error('ERROR:', message),
  warning: (message: string) => console.warn('WARNING:', message)
};

interface AdminSettingsProps {
  className?: string;
}

const BACKUP_FREQUENCIES = [
  { value: 'daily', label: 'Giornaliero', description: 'Backup automatico ogni giorno alle 02:00' },
  { value: 'weekly', label: 'Settimanale', description: 'Backup automatico ogni domenica alle 02:00' },
  { value: 'monthly', label: 'Mensile', description: 'Backup automatico il primo giorno del mese' },
  { value: 'manual', label: 'Manuale', description: 'Solo backup manuali' }
];

const RETENTION_PERIODS = [
  { value: '7', label: '7 giorni' },
  { value: '30', label: '30 giorni' },
  { value: '90', label: '90 giorni' },
  { value: '365', label: '1 anno' },
  { value: 'unlimited', label: 'Illimitato' }
];

const LOG_LEVELS = [
  { value: 'error', label: 'Error', description: 'Solo errori critici' },
  { value: 'warn', label: 'Warning', description: 'Errori e avvisi' },
  { value: 'info', label: 'Info', description: 'Informazioni generali' },
  { value: 'debug', label: 'Debug', description: 'Informazioni dettagliate per debug' }
];

const AdminSettings: React.FC<AdminSettingsProps> = ({ className = '' }) => {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('system');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Mock settings state - in a real app, this would come from an API
  const [settings, setSettings] = useState({
    system: {
      siteName: 'Sistema Gestionale',
      siteDescription: 'Piattaforma di gestione aziendale',
      adminEmail: 'admin@example.com',
      timezone: 'Europe/Rome',
      language: 'it',
      maintenanceMode: false,
      debugMode: false,
      logLevel: 'info',
      maxFileSize: '10',
      sessionTimeout: '30'
    },
    features: {
      userRegistration: true,
      emailVerification: true,
      twoFactorAuth: false,
      apiAccess: true,
      fileUploads: true,
      notifications: true,
      analytics: true,
      backups: true
    },
    backup: {
      enabled: true,
      frequency: 'daily',
      retention: '30',
      location: 'local',
      compression: true,
      encryption: true
    },
    security: {
      passwordMinLength: '8',
      passwordRequireSpecial: true,
      passwordRequireNumbers: true,
      passwordRequireUppercase: true,
      maxLoginAttempts: '5',
      lockoutDuration: '15',
      sessionSecurity: true,
      ipWhitelist: '',
      corsOrigins: ''
    }
  });

  // Check if user has admin permissions
  if (!hasPermission('system', 'admin')) {
    return (
      <Card className={className}>
        <div className="p-6">
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <Shield className="w-4 h-4" />
            <span>Non hai i permessi necessari per accedere alle impostazioni amministrative.</span>
          </div>
        </div>
      </Card>
    );
  }

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, make API call here
      // await apiClient.put('/api/admin/settings', settings);
      
      setHasChanges(false);
      toast.success('Impostazioni salvate con successo');
    } catch (error) {
      toast.error('Errore nel salvataggio delle impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Sei sicuro di voler ripristinare tutte le impostazioni ai valori predefiniti?')) {
      return;
    }
    
    setLoading(true);
    try {
      // Reset to default values
      // In a real app, this would call an API endpoint
      toast.success('Impostazioni ripristinate ai valori predefiniti');
      setHasChanges(false);
    } catch (error) {
      toast.error('Errore nel ripristino delle impostazioni');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Impostazioni esportate con successo');
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings);
        setHasChanges(true);
        toast.success('Impostazioni importate con successo');
      } catch (error) {
        toast.error('Errore nell\'importazione delle impostazioni');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleMaintenanceToggle = async (enabled: boolean) => {
    if (enabled) {
      const confirmed = confirm(
        'Attivare la modalità manutenzione? Tutti gli utenti (eccetto gli amministratori) non potranno accedere al sistema.'
      );
      if (!confirmed) return;
    }
    
    handleSettingChange('system', 'maintenanceMode', enabled);
    
    if (enabled) {
      toast.warning('Modalità manutenzione attivata');
    } else {
      toast.success('Modalità manutenzione disattivata');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Impostazioni Amministrative
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configura le impostazioni di sistema e le funzionalità avanzate.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportSettings}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Esporta
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Importa
            </Button>
          </div>
          
          <Button
            onClick={handleResetSettings}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          
          {hasChanges && (
            <Button
              onClick={handleSaveSettings}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salva Modifiche
            </Button>
          )}
        </div>
      </div>

      {/* Changes Alert */}
      {hasChanges && (
        <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          <AlertTriangle className="w-4 h-4" />
          <span>Hai modifiche non salvate. Ricorda di salvare le impostazioni prima di uscire.</span>
        </div>
      )}

      {/* Maintenance Mode Alert */}
      {settings.system.maintenanceMode && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertTriangle className="w-4 h-4" />
          <span><strong>Modalità Manutenzione Attiva:</strong> Il sistema è attualmente in manutenzione. Solo gli amministratori possono accedere.</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'system'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Server className="w-4 h-4" />
            <span className="hidden sm:inline">Sistema</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Permessi</span>
          </button>
        </div>

        {/* System Settings */}
        {activeTab === 'system' && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Server className="w-5 h-5" />
                Configurazione Sistema
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="siteName" className="block text-sm font-medium">Nome Sito</label>
                    <Input
                      id="siteName"
                      value={settings.system.siteName}
                      onChange={(e) => handleSettingChange('system', 'siteName', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="adminEmail" className="block text-sm font-medium">Email Amministratore</label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={settings.system.adminEmail}
                      onChange={(e) => handleSettingChange('system', 'adminEmail', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Permissions Management */}
        {activeTab === 'permissions' && (
          <PermissionsManagement />
        )}

      </div>
    </div>
  );
};

// Permissions Management Component
const PermissionsManagement: React.FC = () => {
  const [users, setUsers] = useState([
    { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'Admin' },
    { id: '2', name: 'Manager User', email: 'manager@example.com', role: 'Manager' },
    { id: '3', name: 'Employee User', email: 'employee@example.com', role: 'Employee' }
  ]);
  
  const [permissions] = useState([
    { resource: 'companies', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'employees', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'courses', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'assessments', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'reports', actions: ['read', 'create', 'export'] },
    { resource: 'settings', actions: ['read', 'update'] }
  ]);
  
  const [userPermissions, setUserPermissions] = useState<Record<string, Record<string, string[]>>>({
    '1': { // Admin - all permissions
      companies: ['read', 'create', 'update', 'delete'],
      employees: ['read', 'create', 'update', 'delete'],
      courses: ['read', 'create', 'update', 'delete'],
      assessments: ['read', 'create', 'update', 'delete'],
      reports: ['read', 'create', 'export'],
      settings: ['read', 'update']
    },
    '2': { // Manager - limited permissions
      companies: ['read'],
      employees: ['read', 'create', 'update'],
      courses: ['read', 'create', 'update'],
      assessments: ['read', 'create'],
      reports: ['read', 'export'],
      settings: ['read']
    },
    '3': { // Employee - minimal permissions
      companies: ['read'],
      employees: ['read'],
      courses: ['read'],
      assessments: ['read'],
      reports: ['read'],
      settings: []
    }
  });
  
  const handlePermissionToggle = async (userId: string, resource: string, action: string) => {
    const currentPermissions = userPermissions[userId]?.[resource] || [];
    const hasPermission = currentPermissions.includes(action);
    
    let newPermissions;
    if (hasPermission) {
      newPermissions = currentPermissions.filter(p => p !== action);
    } else {
      newPermissions = [...currentPermissions, action];
    }
    
    setUserPermissions(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [resource]: newPermissions
      }
    }));
    
    // Here you would make an API call to update permissions
    try {
      // await apiClient.put(`/api/admin/users/${userId}/permissions`, {
      //   resource,
      //   action,
      //   granted: !hasPermission
      // });
      toast.success(`Permesso ${hasPermission ? 'rimosso' : 'assegnato'} con successo`);
    } catch (error) {
      toast.error('Errore nell\'aggiornamento dei permessi');
      // Revert the change
      setUserPermissions(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          [resource]: currentPermissions
        }
      }));
    }
  };
  
  const assignAllCompaniesPermissions = async () => {
    const adminUser = users.find(u => u.role === 'Admin');
    if (!adminUser) return;
    
    try {
      // Assign all companies permissions to admin
      setUserPermissions(prev => ({
        ...prev,
        [adminUser.id]: {
          ...prev[adminUser.id],
          companies: ['read', 'create', 'update', 'delete']
        }
      }));
      
      // Here you would make an API call
      // await apiClient.put(`/api/admin/users/${adminUser.id}/permissions/companies`, {
      //   actions: ['read', 'create', 'update', 'delete']
      // });
      
      toast.success('Tutti i permessi Companies assegnati all\'Admin');
    } catch (error) {
      toast.error('Errore nell\'assegnazione dei permessi Companies');
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Gestione Permessi Granulari
            </h3>
            <Button onClick={assignAllCompaniesPermissions} className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Assegna Permessi Companies ad Admin
            </Button>
          </div>
          
          <div className="space-y-6">
            {users.map(user => (
              <div key={user.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium">{user.name}</h4>
                    <p className="text-sm text-gray-600">{user.email} - {user.role}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === 'Admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {permissions.map(permission => (
                    <div key={permission.resource} className="border rounded p-3">
                      <h5 className="font-medium mb-2 capitalize">{permission.resource}</h5>
                      <div className="space-y-2">
                        {permission.actions.map(action => {
                          const hasPermission = userPermissions[user.id]?.[permission.resource]?.includes(action) || false;
                          return (
                            <label key={action} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hasPermission}
                                onChange={() => handlePermissionToggle(user.id, permission.resource, action)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm capitalize">{action}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminSettings;