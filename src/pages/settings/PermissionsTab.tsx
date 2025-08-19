import React, { useState, useEffect } from 'react';
import { 
  AlertCircle,
  Building2,
  Check,
  Save,
  Shield,
  Users,
  X
} from 'lucide-react';
import { apiGet, apiPut } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  permissions: string[];
}

const PermissionsTab: React.FC = () => {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Carica dati iniziali
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, permissionsData, rolesData] = await Promise.all([
        apiGet('/api/v1/users'),
        apiGet('/api/v1/permissions'),
        apiGet('/api/v1/roles')
      ]);
      
      setUsers(usersData.data || usersData);
      setPermissions(permissionsData.data || permissionsData);
      setRoles(rolesData.data || rolesData);
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const updateUserPermissions = async (personId: string, newPermissions: string[]) => {
    try {
      setSaving(true);
      await apiPut(`/api/v1/users/${personId}/permissions`, {
        permissions: newPermissions
      });
      
      // Aggiorna lo stato locale
      setUsers(prev => prev.map(user => 
        user.id === personId 
          ? { ...user, permissions: newPermissions }
          : user
      ));
      
      if (selectedUser?.id === personId) {
        setSelectedUser(prev => prev ? { ...prev, permissions: newPermissions } : null);
      }
      
      toast.success('Permessi aggiornati con successo');
    } catch (error) {
      console.error('Errore nell\'aggiornamento permessi:', error);
      toast.error('Errore nell\'aggiornamento dei permessi');
    } finally {
      setSaving(false);
    }
  };

  const updateRolePermissions = async (roleId: string, newPermissions: string[]) => {
    try {
      setSaving(true);
      await apiPut(`/api/v1/roles/${roleId}`, {
        permissions: newPermissions
      });
      
      // Aggiorna lo stato locale
      setRoles(prev => prev.map(role => 
        role.id === roleId 
          ? { ...role, permissions: newPermissions }
          : role
      ));
      
      toast.success('Permessi del ruolo aggiornati con successo');
    } catch (error) {
      console.error('Errore nell\'aggiornamento permessi ruolo:', error);
      toast.error('Errore nell\'aggiornamento dei permessi del ruolo');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserPermission = (permission: string) => {
    if (!selectedUser) return;
    
    const currentPermissions = selectedUser.permissions || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    updateUserPermissions(selectedUser.id, newPermissions);
  };

  const toggleRolePermission = (roleId: string, permission: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    
    const currentPermissions = role.permissions || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    updateRolePermissions(roleId, newPermissions);
  };

  // Raggruppa i permessi per categoria
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const category = permission.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Definisci le categorie di permessi con icone
  const permissionCategories = {
    'Companies': { icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    'Users': { icon: Users, color: 'text-green-600', bgColor: 'bg-green-50' },
    'System': { icon: Shield, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    'General': { icon: AlertCircle, color: 'text-gray-600', bgColor: 'bg-gray-50' }
  };

  if (!hasPermission('system', 'admin')) {
    return (
      <div className="text-center py-8">
        <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accesso Negato</h3>
        <p className="text-gray-600">Non hai i permessi necessari per gestire i permessi utente.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Gestione Permessi</h2>
          <p className="text-gray-600 mt-1">Gestisci i permessi granulari per utenti e ruoli</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Utenti
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'roles'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Ruoli
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'users' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista Utenti */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Utenti</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        user.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.roles.map((role) => (
                            <span
                              key={role}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Permessi Utente */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">
                    Permessi per {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedUser.email}</p>
                </div>
                <div className="p-4 space-y-6">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => {
                    const categoryConfig = permissionCategories[category as keyof typeof permissionCategories] || permissionCategories.General;
                    const IconComponent = categoryConfig.icon;
                    
                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${categoryConfig.bgColor}`}>
                            <IconComponent className={`w-4 h-4 ${categoryConfig.color}`} />
                          </div>
                          <h4 className="ml-3 font-medium text-gray-900">{category}</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-10">
                          {categoryPermissions.map((permission) => {
                            const hasPermission = selectedUser.permissions?.includes(permission.name) || false;
                            return (
                              <label
                                key={permission.id}
                                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={hasPermission}
                                  onChange={() => toggleUserPermission(permission.name)}
                                  disabled={saving}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  hasPermission
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-gray-300'
                                }`}>
                                  {hasPermission && <Check className="w-3 h-3" />}
                                </div>
                                <div className="ml-3 flex-1">
                                  <p className="text-sm font-medium text-gray-900">{permission.name}</p>
                                  {permission.description && (
                                    <p className="text-xs text-gray-500">{permission.description}</p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Seleziona un Utente</h3>
                <p className="text-gray-600">Scegli un utente dalla lista per gestire i suoi permessi.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Gestione Ruoli */
        <div className="space-y-6">
          {roles.map((role) => (
            <div key={role.id} className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">{role.displayName || role.name}</h3>
                <p className="text-sm text-gray-600 mt-1">Gestisci i permessi per il ruolo {role.name}</p>
              </div>
              <div className="p-4 space-y-6">
                {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => {
                  const categoryConfig = permissionCategories[category as keyof typeof permissionCategories] || permissionCategories.General;
                  const IconComponent = categoryConfig.icon;
                  
                  return (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${categoryConfig.bgColor}`}>
                          <IconComponent className={`w-4 h-4 ${categoryConfig.color}`} />
                        </div>
                        <h4 className="ml-3 font-medium text-gray-900">{category}</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ml-10">
                        {categoryPermissions.map((permission) => {
                          const hasPermission = role.permissions?.includes(permission.name) || false;
                          return (
                            <label
                              key={permission.id}
                              className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={hasPermission}
                                onChange={() => toggleRolePermission(role.id, permission.name)}
                                disabled={saving}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                hasPermission
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-gray-300'
                              }`}>
                                {hasPermission && <Check className="w-3 h-3" />}
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">{permission.name}</p>
                                {permission.description && (
                                  <p className="text-xs text-gray-500">{permission.description}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-900">Salvando...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsTab;