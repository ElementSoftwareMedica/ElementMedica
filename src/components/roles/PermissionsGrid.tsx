import React from 'react';
import { 
  Building2,
  Edit,
  Eye,
  FileText,
  Layers,
  Plus,
  Target,
  Trash2
} from 'lucide-react';
import { Role } from '../../hooks/useRoles';
import { RolePermission } from '../../hooks/usePermissions';
import { Tenant } from '../../hooks/useTenants';

interface PermissionsGridProps {
  selectedRole: Role | null;
  entities: Array<{ key: string; label: string; icon: React.ComponentType<{ className?: string; size?: number }> }>;
  rolePermissions: Record<string, RolePermission>;
  tenants: Tenant[];
  tenantsLoading: boolean;
  fieldPermissions: Record<string, Array<{ key: string; label: string }>>;
  onPermissionChange: (permissionId: string, granted: boolean, scope?: string) => void;
  onTenantChange: (permissionId: string, tenantId: string, selected: boolean) => void;
  onFieldRestrictionChange: (permissionId: string, field: string, restricted: boolean) => void;
  getPermissionKey: (entity: string, action: string) => string;
  getPermissionsByEntity: (entity: string) => Array<{ id: string; name: string; description: string; category: string; entity: string; action: string }>;
  translatePermissionAction: (action: string) => string;
}

export const PermissionsGrid: React.FC<PermissionsGridProps> = ({
  selectedRole,
  entities,
  rolePermissions,
  tenants,
  tenantsLoading,
  fieldPermissions,
  onPermissionChange,
  onTenantChange,
  onFieldRestrictionChange,
  getPermissionKey,
  getPermissionsByEntity,
  translatePermissionAction
}) => {
  if (!selectedRole) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center p-8">
          <div className="p-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-6 inline-block">
            <Eye className="w-16 h-16 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Seleziona un ruolo</h3>
          <p className="text-gray-600 text-base mb-4">Gestisci permessi e accessi per gli utenti</p>
          <p className="text-gray-500 text-sm">Scegli un ruolo dalla lista a sinistra per iniziare</p>
        </div>
      </div>
    );
  }

  // Icone moderne per le azioni CRUD con colori
  const actionIcons: Record<string, JSX.Element> = {
    view: <Eye className="w-4 h-4 text-blue-600" />,
    create: <Plus className="w-4 h-4 text-green-600" />,
    edit: <Edit className="w-4 h-4 text-amber-600" />,
    delete: <Trash2 className="w-4 h-4 text-red-600" />
  };

  const actionColors: Record<string, string> = {
    view: 'bg-blue-50 border-blue-200',
    create: 'bg-green-50 border-green-200',
    edit: 'bg-amber-50 border-amber-200',
    delete: 'bg-red-50 border-red-200'
  };

  const ringColors: Record<string, string> = {
    view: 'ring-blue-300',
    create: 'ring-green-300',
    edit: 'ring-amber-300',
    delete: 'ring-red-300'
  };

  return (
    <div className="space-y-8">
      {entities.map((entity) => {
        const IconComponent = entity.icon;
        const entityPermissions = getPermissionsByEntity(entity.key);

        return (
          <div key={entity.key} id={`entity-${entity.key}`} className="scroll-mt-20">
            <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-3 sticky top-0 bg-white/95 backdrop-blur-sm py-3 z-10 border-b border-gray-200">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-md">
                <IconComponent className="w-5 h-5 text-white" />
              </div>
              <span>{entity.label}</span>
            </h4>
              
            {/* LAYOUT CRUD 2x2 - OTTIMIZZATO */}
            <div className="grid grid-cols-2 gap-4">
              {entityPermissions.map((permission) => {
                if (!permission.entity || !permission.action) {
                  return null;
                }
                
                const permissionKey = getPermissionKey(permission.entity, permission.action);
                const rolePermission = rolePermissions[permissionKey];
                const isGranted = rolePermission?.granted || false;
                const scope = rolePermission?.scope || 'all';
                const tenantIds = rolePermission?.tenantIds || [];
                const fieldRestrictions = rolePermission?.fieldRestrictions || [];

                const colorClass = actionColors[permission.action] || 'bg-gray-50 border-gray-200';
                const ringClass = ringColors[permission.action] || 'ring-gray-300';

                return (
                  <div 
                    key={permissionKey} 
                    className={`${colorClass} rounded-xl p-4 border hover:shadow-md transition-all duration-300 ${
                      isGranted ? `ring-2 ring-opacity-50 ${ringClass}` : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isGranted}
                          onChange={(e) => onPermissionChange(permissionKey, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200"
                        />
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 bg-white rounded-lg shadow-sm">
                            {actionIcons[permission.action] || <FileText className="w-4 h-4 text-gray-600" />}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">
                            {translatePermissionAction(permission.action)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isGranted && (
                      <div className="space-y-3 ml-6">
                        {/* Scope selection - DROPDOWN A PILLOLA OTTIMIZZATO */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center">
                            <Target className="w-3 h-3 mr-1 text-blue-600" />
                            Ambito di applicazione
                          </label>
                          <div className="relative">
                            <select
                              value={scope}
                              onChange={(e) => onPermissionChange(permissionKey, true, e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none cursor-pointer hover:border-gray-400 transition-colors"
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.2em 1.2em',
                                paddingRight: '2rem'
                              }}
                            >
                              <option value="all">🌐 Tutti i record</option>
                              <option value="own">👤 Solo i propri record</option>
                              <option value="tenant">🏢 Per tenant specifici</option>
                            </select>
                          </div>
                        </div>

                        {/* Tenant selection */}
                        {scope === 'tenant' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center">
                              <Building2 className="w-3 h-3 mr-1 text-blue-600" />
                              Tenant autorizzati
                            </label>
                            {tenantsLoading ? (
                              <div className="text-xs text-gray-500 p-2 flex items-center">
                                <Layers className="w-3 h-3 mr-1 animate-spin" />
                                Caricamento tenant...
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-24 overflow-y-auto bg-white border border-gray-200 rounded-lg p-2">
                                {tenants.map((tenant) => (
                                  <label key={tenant.id} className="flex items-center hover:bg-gray-50 p-1 rounded cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={tenantIds.includes(tenant.id)}
                                      onChange={(e) => onTenantChange(permissionKey, tenant.id, e.target.checked)}
                                      className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-xs text-gray-700">{tenant.name}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Field restrictions */}
                        {fieldPermissions[entity.key] && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1.5 flex items-center">
                              <Eye className="w-3 h-3 mr-1 text-blue-600" />
                              Campi visibili
                            </label>
                            <div className="space-y-1.5 max-h-24 overflow-y-auto bg-white border border-gray-200 rounded-lg p-2">
                              {fieldPermissions[entity.key].map((field) => (
                                <label key={field.key} className="flex items-center hover:bg-gray-50 p-1 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!fieldRestrictions.includes(field.key)}
                                    onChange={(e) => onFieldRestrictionChange(permissionKey, field.key, !e.target.checked)}
                                    className="mr-2 h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <span className="text-xs text-gray-700">{field.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};