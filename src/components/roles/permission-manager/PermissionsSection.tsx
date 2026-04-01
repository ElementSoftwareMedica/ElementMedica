import React from 'react';
import {
  Building,
  User,
  Users,
  X,
  Link2,
  Lock
} from 'lucide-react';
import { EntityDefinition, EntityPermission } from '../../../services/advanced-permissions';
import { Tenant } from '../../../hooks/useTenants';
import { PERMISSION_ACTIONS, PERMISSION_SCOPES } from './constants';
import { getPermission } from './utils';
import RelationTypeSelector from './RelationTypeSelector';
import type { RelationType } from '../../../services/advanced-permissions/types';

// Tipo per lo scope esteso con supporto relational
type PermissionScope = 'all' | 'tenant' | 'own' | 'relational' | 'none';

interface PermissionsSectionProps {
  entity: EntityDefinition;
  permissions: EntityPermission[];
  tenants: Tenant[];
  bulkMode: boolean;
  selectedActions: Set<string>;
  selectedAction?: string | null;
  onPermissionUpdate: (entity: string, action: string, scope: PermissionScope, relationType?: RelationType) => void;
  onTenantChange: (entity: string, action: string, tenantId: string, selected: boolean) => void;
  onRelationTypeChange?: (entity: string, action: string, relationType: RelationType | null) => void;
  onActionToggle: (action: string) => void;
  onActionSelect?: (action: string | null) => void;
  onSelectAllActions: () => void;
  onClearActionSelection: () => void;
  onBulkScopeApply: (scope: PermissionScope) => void;
  onBulkTenantsApply: (tenantIds: string[], add: boolean) => void;
}

const PermissionsSection: React.FC<PermissionsSectionProps> = ({
  entity,
  permissions,
  tenants,
  bulkMode,
  selectedActions,
  selectedAction,
  onPermissionUpdate,
  onTenantChange,
  onRelationTypeChange,
  onActionToggle,
  onActionSelect,
  onSelectAllActions,
  onClearActionSelection,
  onBulkScopeApply,
  onBulkTenantsApply
}) => {
  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'all': return <Users className="w-4 h-4" />;
      case 'tenant': return <Building className="w-4 h-4" />;
      case 'own': return <User className="w-4 h-4" />;
      case 'relational': return <Link2 className="w-4 h-4" />;
      case 'none': return <Lock className="w-4 h-4" />;
      default: return <X className="w-4 h-4" />;
    }
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'all': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'tenant': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'own': return 'text-green-600 bg-green-50 border-green-200';
      case 'relational': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'none': return 'text-gray-500 bg-gray-100 border-gray-300';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const hasAllTenants = (permission: EntityPermission | undefined): boolean => {
    if (!permission?.tenantIds) return false;
    return tenants.every(tenant => permission.tenantIds!.includes(tenant.id));
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col">
      {/* Header generale con controlli */}
      <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${bulkMode ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-50">
            {bulkMode ? 'Modalità Multipla' : 'Permessi Azioni'}
          </h4>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onSelectAllActions}
              className="text-xs px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded hover:bg-violet-200 dark:hover:bg-violet-800/40"
            >
              Seleziona Tutto
            </button>
            <button
              type="button"
              onClick={onClearActionSelection}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Deseleziona
            </button>
          </div>
        </div>

        {/* Controlli specifici per modalità bulk */}
        {bulkMode && (
          <>
            {/* Controlli bulk scope */}
            <div className="space-y-2">
              <p className="text-xs text-gray-600">Applica scope alle azioni selezionate:</p>
              <div className="flex flex-wrap gap-1">
                {PERMISSION_SCOPES.map((scope) => (
                  <button
                    key={scope.name}
                    type="button"
                    onClick={() => onBulkScopeApply(scope.name as PermissionScope)}
                    disabled={selectedActions.size === 0}
                    title={scope.description}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border transition-colors disabled:opacity-50 ${getScopeColor(scope.name)}`}
                  >
                    {getScopeIcon(scope.name)}
                    <span>{scope.displayName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Controlli bulk tenant */}
            {tenants.length > 0 && (
              <div className="mt-3 pt-3 border-t border-orange-200">
                <p className="text-xs text-gray-600 mb-2">Gestione tenant per azioni selezionate:</p>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => onBulkTenantsApply(tenants.map(t => t.id), true)}
                    disabled={selectedActions.size === 0}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                  >
                    Aggiungi Tutti
                  </button>
                  <button
                    type="button"
                    onClick={() => onBulkTenantsApply(tenants.map(t => t.id), false)}
                    disabled={selectedActions.size === 0}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                  >
                    Rimuovi Tutti
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lista azioni */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {PERMISSION_ACTIONS.map((action) => {
            const permission = getPermission(permissions, entity.name, action.name);
            const currentScope = permission?.scope || 'none';
            const isSelected = selectedActions.has(action.name);
            const isActionSelected = selectedAction === action.name;

            return (
              <div
                key={action.name}
                className={`border rounded-lg p-3 transition-colors cursor-pointer ${bulkMode && isSelected
                  ? 'border-orange-300 bg-orange-50'
                  : isActionSelected
                    ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                onClick={() => {
                  // In modalità non-bulk, seleziona l'azione per modificare i campi
                  if (!bulkMode && onActionSelect) {
                    onActionSelect(isActionSelected ? null : action.name);
                  }
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onActionToggle(action.name);
                        }}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                    )}
                    <action.icon className={`w-4 h-4 ${isActionSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    <span className={`font-medium ${isActionSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      {action.displayName}
                      {isActionSelected && <span className="ml-2 text-xs text-blue-600">(selezionato per campi)</span>}
                    </span>
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border ${getScopeColor(currentScope)}`}>
                    {getScopeIcon(currentScope)}
                    <span>{PERMISSION_SCOPES.find(s => s.name === currentScope)?.displayName || 'Nessuno'}</span>
                  </div>
                </div>

                {/* Controlli scope */}
                {!bulkMode && (
                  <div className="flex flex-wrap gap-1 mb-2" onClick={(e) => e.stopPropagation()}>
                    {PERMISSION_SCOPES.map((scope) => (
                      <button
                        key={scope.name}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPermissionUpdate(entity.name, action.name, scope.name as PermissionScope);
                        }}
                        title={scope.description}
                        className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border transition-colors ${currentScope === scope.name
                          ? getScopeColor(scope.name)
                          : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        {getScopeIcon(scope.name)}
                        <span>{scope.displayName}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selezione tipo relazione per scope 'relational' */}
                {permission?.scope === 'relational' && !bulkMode && onRelationTypeChange && (
                  <div className="mt-2">
                    <RelationTypeSelector
                      entityName={entity.name}
                      currentRelationType={permission.relationType as RelationType | undefined}
                      onRelationTypeChange={(relationType: string | null) =>
                        onRelationTypeChange(entity.name, action.name, relationType as RelationType | null)
                      }
                      compact={true}
                    />
                    {/* P69: Cross-tenant option for relational permissions */}
                    <label className="flex items-center gap-2 mt-2 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permission.allowCrossTenant ?? false}
                        onChange={() => {
                          // Toggle allowCrossTenant - will be handled by parent
                          onPermissionUpdate(
                            entity.name,
                            action.name,
                            'relational',
                            permission.relationType as RelationType
                          );
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Cross-tenant (accesso a più tenant)</span>
                    </label>
                  </div>
                )}

                {/* Gestione tenant per scope 'tenant' */}
                {permission?.scope === 'tenant' && tenants.length > 0 && !bulkMode && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-600">Tenant autorizzati:</p>
                      <button
                        type="button"
                        onClick={() => {
                          const allSelected = hasAllTenants(permission);
                          tenants.forEach(tenant => {
                            onTenantChange(entity.name, action.name, tenant.id, !allSelected);
                          });
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {hasAllTenants(permission) ? 'Deseleziona tutti' : 'Seleziona tutti'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {tenants.map((tenant) => {
                        const isSelected = permission.tenantIds?.includes(tenant.id) || false;
                        return (
                          <label
                            key={tenant.id}
                            className="flex items-center space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => onTenantChange(entity.name, action.name, tenant.id, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="truncate">{tenant.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PermissionsSection;