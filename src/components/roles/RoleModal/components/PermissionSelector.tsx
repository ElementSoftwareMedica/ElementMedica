/**
 * PermissionSelector Component
 * 
 * Two-column permission selector with entity groups and individual permissions.
 * Left column: Entity/category list, Right column: Permissions for selected group.
 */

import React from 'react';
import { Shield, Database, Settings, ChevronRight } from 'lucide-react';
import type { PermissionGroup, EntityGroup, Permission } from '../types';

interface PermissionSelectorProps {
  availablePermissions: Record<string, PermissionGroup>;
  entityGroups: EntityGroup[];
  selectedPermissionGroup: string | null;
  setSelectedPermissionGroup: (group: string | null) => void;
  selectedPermissions: Record<string, boolean>;
  handlePermissionChange: (permissionKey: string, checked: boolean) => void;
  handleSelectGroupPermissions: (groupKey: string, selectAll: boolean) => void;
  getSelectedPermissionsCount: (groupPermissions: Permission[]) => number;
  getEntityIcon: (entityName: string) => React.ComponentType<any>;
}

export const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  availablePermissions,
  entityGroups,
  selectedPermissionGroup,
  setSelectedPermissionGroup,
  selectedPermissions,
  handlePermissionChange,
  handleSelectGroupPermissions,
  getSelectedPermissionsCount,
  getEntityIcon
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
        <div className="grid grid-cols-2 h-12">
          {/* Header Entità */}
          <div className="flex items-center px-4 border-r border-gray-200">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-green-600" />
              <div>
                <h4 className="font-medium text-gray-900 text-sm">Entità del Sistema</h4>
                <p className="text-xs text-gray-600">{entityGroups.length + Object.keys(availablePermissions).length} categorie</p>
              </div>
            </div>
          </div>
          
          {/* Header Permessi */}
          <div className="flex items-center px-4">
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-orange-600" />
              <div>
                <h4 className="font-medium text-gray-900 text-sm">Permessi</h4>
                <p className="text-xs text-gray-600">Seleziona permessi specifici</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="grid grid-cols-2 h-80">
        {/* Colonna 1: Lista Entità */}
        <div className="border-r border-gray-200 overflow-hidden">
          <div className="overflow-y-auto h-full">
            {/* Entità del sistema */}
            {entityGroups.map((entityGroup, index) => {
              const groupKey = `entity_${index}`;
              const selectedCount = getSelectedPermissionsCount(entityGroup.permissions);
              const hasPermissions = selectedCount > 0;
              const EntityIcon = getEntityIcon(entityGroup.entity.name);
              
              return (
                <button
                  key={groupKey}
                  type="button"
                  onClick={() => setSelectedPermissionGroup(groupKey)}
                  className={`w-full text-left p-3 border-b border-gray-100 transition-colors ${
                    selectedPermissionGroup === groupKey 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${hasPermissions ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <EntityIcon className={`w-4 h-4 ${hasPermissions ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{entityGroup.entity.displayName}</div>
                      <div className="text-xs text-gray-500">
                        {selectedCount}/{entityGroup.permissions.length} selezionati
                      </div>
                    </div>
                    {selectedPermissionGroup === groupKey && (
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </button>
              );
            })}
            
            {/* Categorie di permessi esistenti */}
            {Object.entries(availablePermissions).map(([groupKey, group]) => {
              const selectedCount = getSelectedPermissionsCount(group.permissions);
              const hasPermissions = selectedCount > 0;
              
              return (
                <button
                  key={groupKey}
                  type="button"
                  onClick={() => setSelectedPermissionGroup(groupKey)}
                  className={`w-full text-left p-3 border-b border-gray-100 transition-colors ${
                    selectedPermissionGroup === groupKey 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${hasPermissions ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Shield className={`w-4 h-4 ${hasPermissions ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{group.label}</div>
                      <div className="text-xs text-gray-500">
                        {selectedCount}/{group.permissions.length} selezionati
                      </div>
                    </div>
                    {selectedPermissionGroup === groupKey && (
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Colonna 2: Permessi del gruppo selezionato */}
        <div className="overflow-hidden">
          {selectedPermissionGroup ? (
            <div className="h-full overflow-y-auto">
              {selectedPermissionGroup.startsWith('entity_') ? (
                // Entity permissions
                (() => {
                  const entityIndex = parseInt(selectedPermissionGroup.replace('entity_', ''));
                  const entityGroup = entityGroups[entityIndex];
                  if (!entityGroup) return null;
                  
                  return (
                    <>
                      <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900 text-sm">
                              {entityGroup.entity.displayName}
                            </h5>
                            <p className="text-xs text-gray-600">
                              Permessi CRUD per {entityGroup.entity.displayName}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleSelectGroupPermissions(selectedPermissionGroup, true)}
                              className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-medium hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Tutti
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectGroupPermissions(selectedPermissionGroup, false)}
                              className="px-3 py-1.5 bg-gray-500 text-white rounded-full text-xs font-medium hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                            >
                              Nessuno
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 space-y-1">
                        {entityGroup.permissions.map((permission) => {
                          const isChecked = selectedPermissions[permission.key] || false;
                          
                          return (
                            <label 
                              key={permission.key} 
                              className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                                isChecked 
                                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                                  : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                name={`permission-${permission.key}`}
                                checked={isChecked}
                                onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium ${isChecked ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {permission.label}
                                </div>
                                <p className={`text-xs mt-1 ${isChecked ? 'text-blue-700' : 'text-gray-500'}`}>
                                  {permission.description}
                                </p>
                              </div>
                              {isChecked && (
                                <div className="flex-shrink-0">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                </div>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </>
                  );
                })()
              ) : availablePermissions[selectedPermissionGroup] ? (
                // Category permissions
                <>
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900 text-sm">
                          {availablePermissions[selectedPermissionGroup].label}
                        </h5>
                        <p className="text-xs text-gray-600">
                          {availablePermissions[selectedPermissionGroup].description}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleSelectGroupPermissions(selectedPermissionGroup, true)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-medium hover:bg-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          Tutti
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectGroupPermissions(selectedPermissionGroup, false)}
                          className="px-3 py-1.5 bg-gray-500 text-white rounded-full text-xs font-medium hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          Nessuno
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-1">
                    {availablePermissions[selectedPermissionGroup].permissions.map((permission) => {
                      const isChecked = selectedPermissions[permission.key] || false;
                      
                      return (
                        <label 
                          key={permission.key} 
                          className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                            isChecked 
                              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                              : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            name={`permission-${permission.key}`}
                            checked={isChecked}
                            onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${isChecked ? 'text-blue-900' : 'text-gray-900'}`}>
                              {permission.label}
                            </div>
                            <p className={`text-xs mt-1 ${isChecked ? 'text-blue-700' : 'text-gray-500'}`}>
                              {permission.description}
                            </p>
                          </div>
                          {isChecked && (
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Seleziona una categoria di permessi</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
