/**
 * PersonAdvancedPermissionManager - P69 Session 5.11
 * 
 * 3-column layout for managing person-specific permission overrides.
 * Matches the UX of OptimizedPermissionManagerRefactored but for per-person permissions.
 * 
 * Column 1: Entity list (reuses EntityList component)
 * Column 2: Per-entity CRUD permission overrides (role base + person overrides)
 * Column 3: Active overrides summary for selected entity
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Key,
  Check,
  X,
  Plus,
  Trash2,
  Loader2,
  Eye,
  Edit2,
  Search,
  Users,
  Building,
  User,
  Link2,
  Lock,
  Info,
  ChevronRight
} from 'lucide-react';
import { EntityDefinition, advancedPermissionsService } from '../../../services/advanced-permissions';
import { ENTITY_ICON_MAP } from './constants';
import EntityList from './EntityList';

// Person permission types
interface PersonPermission {
  id: string;
  personId: string;
  resource: string;
  action: string;
  scope?: string;
  granted: boolean;
  reason?: string;
  createdAt: string;
  createdBy?: string;
}

// Role permission (from role)
interface RolePermission {
  resource: string;
  action: string;
}

// CRUD actions config
const CRUD_ACTIONS = [
  { id: 'create', name: 'Crea', icon: Plus, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'read', name: 'Leggi', icon: Eye, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 'update', name: 'Modifica', icon: Edit2, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  { id: 'delete', name: 'Elimina', icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-900/20' },
];

const SCOPES = [
  { id: 'all', name: 'Tutti', icon: Users, description: 'Accesso globale' },
  { id: 'tenant', name: 'Tenant', icon: Building, description: 'Solo dati del tenant' },
  { id: 'own', name: 'Propri', icon: User, description: 'Solo record propri' },
  { id: 'related', name: 'Relazionali', icon: Link2, description: 'Record correlati' },
];

interface PersonAdvancedPermissionManagerProps {
  personId: string;
  personName: string;
  personPermissions: PersonPermission[];
  rolePermissions: RolePermission[];
  roleName: string;
  onAddPermission: (resource: string, action: string, scope: string, granted: boolean) => Promise<void>;
  onRemovePermission: (permissionId: string) => Promise<void>;
  savingPermission: boolean;
}

const PersonAdvancedPermissionManager: React.FC<PersonAdvancedPermissionManagerProps> = ({
  personId,
  personName,
  personPermissions,
  rolePermissions,
  roleName,
  onAddPermission,
  onRemovePermission,
  savingPermission
}) => {
  const [entities, setEntities] = useState<EntityDefinition[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityDefinition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState('tenant');

  // Load entity definitions
  useEffect(() => {
    const loadEntities = async () => {
      try {
        setLoading(true);
        const entitiesData = await advancedPermissionsService.getEntityDefinitions();
        setEntities(entitiesData);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    loadEntities();
  }, []);

  // Filter entities
  const filteredEntities = useMemo(() => {
    if (!searchTerm) return entities;
    const term = searchTerm.toLowerCase();
    return entities.filter(e =>
      e.displayName.toLowerCase().includes(term) ||
      e.name.toLowerCase().includes(term)
    );
  }, [entities, searchTerm]);

  // Check if role has a specific permission
  const roleHasPermission = useCallback((resource: string, action: string): boolean => {
    return rolePermissions.some(p =>
      p.resource === resource && (p.action === action || p.action === 'access')
    );
  }, [rolePermissions]);

  // Get person override for a specific resource+action
  const getPersonOverride = useCallback((resource: string, action: string): PersonPermission | null => {
    return personPermissions.find(p =>
      p.resource === resource && p.action === action
    ) || null;
  }, [personPermissions]);

  // Count overrides for an entity
  const getEntityOverrideCount = useCallback((entityName: string): number => {
    return personPermissions.filter(p => p.resource === entityName).length;
  }, [personPermissions]);

  // Handle toggle person permission
  const handleTogglePermission = async (resource: string, action: string) => {
    const existing = getPersonOverride(resource, action);
    const roleHas = roleHasPermission(resource, action);

    if (existing) {
      if (existing.granted && !roleHas) {
        // Was granted (extending role), toggle to remove override
        await onRemovePermission(existing.id);
      } else if (existing.granted && roleHas) {
        // Was explicitly granted but role already has it, toggle to revoke
        await onRemovePermission(existing.id);
        await onAddPermission(resource, action, activeScope, false);
      } else if (!existing.granted) {
        // Was revoked, toggle to remove override (back to role default)
        await onRemovePermission(existing.id);
      }
    } else {
      if (roleHas) {
        // Role has it, add revoke override
        await onAddPermission(resource, action, activeScope, false);
      } else {
        // Role doesn't have it, add grant override
        await onAddPermission(resource, action, activeScope, true);
      }
    }
  };

  // Get effective permission state
  const getEffectiveState = useCallback((resource: string, action: string): 'role-granted' | 'person-granted' | 'person-revoked' | 'denied' => {
    const override = getPersonOverride(resource, action);
    const roleHas = roleHasPermission(resource, action);

    if (override) {
      return override.granted ? 'person-granted' : 'person-revoked';
    }
    return roleHas ? 'role-granted' : 'denied';
  }, [getPersonOverride, roleHasPermission]);

  // Get all overrides for selected entity
  const selectedEntityOverrides = useMemo(() => {
    if (!selectedEntity) return [];
    return personPermissions.filter(p => p.resource === selectedEntity.name);
  }, [selectedEntity, personPermissions]);

  // Get all person overrides grouped by entity
  const allOverridesByEntity = useMemo(() => {
    const grouped: Record<string, PersonPermission[]> = {};
    personPermissions.forEach(p => {
      if (!grouped[p.resource]) grouped[p.resource] = [];
      grouped[p.resource].push(p);
    });
    return grouped;
  }, [personPermissions]);

  const handleEntitySelect = useCallback((entity: EntityDefinition) => {
    setSelectedEntity(entity);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Caricamento entità...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Info banner */}
      <div className="flex-shrink-0 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800">
        <div className="flex items-center gap-2 text-sm text-violet-800 dark:text-violet-300">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Ruolo base: {roleName}</strong> — I permessi personalizzati sovrascrivono quelli del ruolo.
            Clicca sulle azioni per aggiungere o rimuovere override.
          </span>
        </div>
      </div>

      {/* Scope selector */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Scope:</span>
          <div className="flex gap-1">
            {SCOPES.map(scope => {
              const ScopeIcon = scope.icon;
              return (
                <button
                  key={scope.id}
                  onClick={() => setActiveScope(scope.id)}
                  title={scope.description}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${activeScope === scope.id
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                    }`}
                >
                  <ScopeIcon className="w-3 h-3" />
                  {scope.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex-1 grid grid-cols-12 gap-0 min-h-0 overflow-hidden">
        {/* Column 1: Entity List */}
        <div className="col-span-3 h-full min-h-0 max-h-full overflow-y-auto overflow-x-hidden border-r border-gray-200 dark:border-gray-700">
          <EntityList
            entities={filteredEntities}
            selectedEntity={selectedEntity}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEntitySelect={handleEntitySelect}
          />
        </div>

        {/* Column 2: CRUD Permission Overrides */}
        <div className="col-span-5 min-h-0 overflow-y-auto overflow-x-hidden border-r border-gray-200 dark:border-gray-700">
          {selectedEntity ? (
            <div className="bg-white dark:bg-gray-800 h-full">
              {/* Entity header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="text-violet-600 dark:text-violet-400">
                    {ENTITY_ICON_MAP[selectedEntity.name] ?
                      React.createElement(ENTITY_ICON_MAP[selectedEntity.name], { className: "w-5 h-5" }) :
                      <Key className="w-5 h-5" />
                    }
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-50">{selectedEntity.displayName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedEntity.fields.length} campi disponibili</p>
                  </div>
                </div>
              </div>

              {/* CRUD Actions */}
              <div className="p-4 space-y-3">
                {CRUD_ACTIONS.map(action => {
                  const ActionIcon = action.icon;
                  const state = getEffectiveState(selectedEntity.name, action.id);
                  const override = getPersonOverride(selectedEntity.name, action.id);
                  const roleHas = roleHasPermission(selectedEntity.name, action.id);

                  return (
                    <div
                      key={action.id}
                      className={`p-3 rounded-lg border transition-all ${state === 'person-granted'
                        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                        : state === 'person-revoked'
                          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                          : state === 'role-granted'
                            ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${action.bgColor}`}>
                            <ActionIcon className={`w-4 h-4 ${action.color}`} />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-50">
                              {action.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {/* Role base indicator */}
                              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleHas
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                }`}>
                                <Shield className="w-2.5 h-2.5" />
                                {roleHas ? `Ruolo: ✓` : `Ruolo: ✗`}
                              </span>

                              {/* Override indicator */}
                              {override && (
                                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${override.granted
                                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                  }`}>
                                  <Key className="w-2.5 h-2.5" />
                                  {override.granted ? 'Concesso' : 'Revocato'}
                                  {override.scope && ` (${override.scope})`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          {override ? (
                            <button
                              onClick={() => onRemovePermission(override.id)}
                              disabled={savingPermission}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors
                                bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600
                                hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                              title="Rimuovi override (usa default del ruolo)"
                            >
                              <X className="w-3 h-3" />
                              Rimuovi
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleTogglePermission(selectedEntity.name, action.id)}
                            disabled={savingPermission}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 ${state === 'person-granted'
                              ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                              : state === 'person-revoked'
                                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                                : state === 'role-granted'
                                  ? 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-red-400 hover:text-red-600'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400 hover:text-green-600'
                              }`}
                            title={
                              state === 'role-granted'
                                ? 'Clicca per revocare (override)'
                                : state === 'denied'
                                  ? 'Clicca per concedere (override)'
                                  : state === 'person-granted'
                                    ? 'Concesso — clicca per ciclare'
                                    : 'Revocato — clicca per ciclare'
                            }
                          >
                            {savingPermission ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : state === 'person-granted' ? (
                              <Check className="w-3 h-3" />
                            ) : state === 'person-revoked' ? (
                              <Lock className="w-3 h-3" />
                            ) : roleHas ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            {state === 'person-granted' ? 'Concesso' :
                              state === 'person-revoked' ? 'Revocato' :
                                roleHas ? 'Revoca' : 'Concedi'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Effective permissions summary */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                    Risultato Effettivo
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {CRUD_ACTIONS.map(action => {
                      const state = getEffectiveState(selectedEntity.name, action.id);
                      const isEffectivelyGranted = state === 'role-granted' || state === 'person-granted';
                      return (
                        <div
                          key={action.id}
                          className={`text-center p-2 rounded-lg ${isEffectivelyGranted
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                            }`}
                        >
                          {isEffectivelyGranted ? (
                            <Check className="w-4 h-4 mx-auto mb-1" />
                          ) : (
                            <X className="w-4 h-4 mx-auto mb-1" />
                          )}
                          <div className="text-[10px] font-medium">{action.name}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800">
              <div className="text-center text-gray-400 dark:text-gray-500 px-6">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Seleziona un&apos;entità</p>
                <p className="text-xs mt-1">Scegli dalla lista a sinistra per gestire i permessi</p>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Active Overrides Summary */}
        <div className="col-span-4 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="bg-white dark:bg-gray-800 h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                <Key className="w-4 h-4 text-violet-600" />
                Override Attivi
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {personPermissions.length} permessi personalizzati per {personName}
              </p>
            </div>

            {/* Statistics */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-violet-600">{personPermissions.length}</div>
                  <div className="text-[10px] text-violet-700 dark:text-violet-400">Totale</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-green-600">{personPermissions.filter(p => p.granted).length}</div>
                  <div className="text-[10px] text-green-700 dark:text-green-400">Concessi</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-red-600">{personPermissions.filter(p => !p.granted).length}</div>
                  <div className="text-[10px] text-red-700 dark:text-red-400">Revocati</div>
                </div>
              </div>
            </div>

            {/* Override list grouped by entity */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {personPermissions.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nessun permesso personalizzato</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Seleziona un&apos;entità e clicca sui pulsanti per aggiungere override
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(allOverridesByEntity).map(([entityName, overrides]) => {
                    const entityDef = entities.find(e => e.name === entityName);
                    const isSelected = selectedEntity?.name === entityName;

                    return (
                      <div
                        key={entityName}
                        className={`rounded-lg border transition-colors ${isSelected
                          ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10'
                          : 'border-gray-200 dark:border-gray-700'
                          }`}
                      >
                        <button
                          onClick={() => entityDef && handleEntitySelect(entityDef)}
                          className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-t-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {entityDef?.displayName || entityName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500">
                              {overrides.length}
                            </span>
                          </div>
                          <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                        </button>

                        <div className="px-3 pb-2 space-y-1">
                          {overrides.map(perm => (
                            <div
                              key={perm.id}
                              className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${perm.granted
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                }`}
                            >
                              <div className="flex items-center gap-1.5">
                                {perm.granted ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                                <span className="font-medium">{perm.action}</span>
                                {perm.scope && (
                                  <span className="text-[10px] opacity-70">({perm.scope})</span>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemovePermission(perm.id);
                                }}
                                disabled={savingPermission}
                                className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                                title="Rimuovi override"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonAdvancedPermissionManager;
