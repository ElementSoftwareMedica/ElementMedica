import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../hooks/useToast';
import { Role } from '../../../hooks/useRoles';
import { Tenant } from '../../../hooks/useTenants';
import { EntityDefinition, EntityPermission, advancedPermissionsService } from '../../../services/advanced-permissions';
import {
  updatePermissionInArray,
  updatePermissionFields,
  updatePermissionTenants,
  updatePermissionRelationType,
  updatePermissionDeniedFields,
  applyBulkPermissions,
  getAllActionNames,
  filterEntities
} from './utils';
import type { RelationType } from '../../../services/advanced-permissions/types';

// Tipo per lo scope esteso con supporto relational
type PermissionScope = 'all' | 'tenant' | 'own' | 'relational' | 'none';

// Importa i componenti modulari
import PermissionManagerHeader from './PermissionManagerHeader';
import RoleInfoSection from './RoleInfoSection';
import EntityList from './EntityList';
import PermissionsSection from './PermissionsSection';
import FieldsSection from './FieldsSection';

interface OptimizedPermissionManagerRefactoredProps {
  role: Role;
  tenants: Tenant[];
  onBack: () => void;
}

const OptimizedPermissionManagerRefactored: React.FC<OptimizedPermissionManagerRefactoredProps> = ({
  role,
  tenants,
  onBack
}) => {
  const { showToast } = useToast();
  // Stati principali
  const [entities, setEntities] = useState<EntityDefinition[]>([]);
  const [permissions, setPermissions] = useState<EntityPermission[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntityDefinition | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Stati per modalità bulk
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());

  // Stati di caricamento e errore
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stato per ricerca entità
  const [searchTerm, setSearchTerm] = useState('');

  // Caricamento iniziale dei dati
  useEffect(() => {
    loadData();
  }, [role.type]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Usa role.type (roleType) invece di role.name per l'API
      const roleIdentifier = role.type || role.name;

      const [entitiesData, permissionsData] = await Promise.all([
        advancedPermissionsService.getEntityDefinitions(),
        advancedPermissionsService.getRolePermissions(roleIdentifier)
      ]);

      setEntities(entitiesData);
      setPermissions(permissionsData);
    } catch (err) {
      setError('Errore nel caricamento dei dati');
      showToast({ message: 'Errore nel caricamento dei dati', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Gestione selezione entità
  const handleEntitySelect = useCallback((entity: EntityDefinition) => {
    setSelectedEntity(entity);
    setSelectedAction(null);
    setBulkMode(false);
    setSelectedActions(new Set());
  }, []);

  // Gestione aggiornamento permessi
  const updatePermission = useCallback((
    entity: string,
    action: string,
    scope: PermissionScope,
    relationType?: RelationType
  ) => {
    setPermissions(prev => updatePermissionInArray(
      prev,
      entity,
      action,
      scope,
      relationType ? { relationType } : undefined
    ));
  }, []);

  // Gestione aggiornamento tipo relazione
  const handleRelationTypeChange = useCallback((
    entity: string,
    action: string,
    relationType: RelationType | null
  ) => {
    setPermissions(prev => updatePermissionRelationType(prev, entity, action, relationType));
  }, []);

  // Gestione toggle azioni per modalità bulk
  const toggleActionSelection = useCallback((action: string) => {
    setSelectedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(action)) {
        newSet.delete(action);
      } else {
        newSet.add(action);
      }
      return newSet;
    });
  }, []);

  const selectAllActions = useCallback(() => {
    setSelectedActions(getAllActionNames());
  }, []);

  const clearActionSelection = useCallback(() => {
    setSelectedActions(new Set());
  }, []);

  // Gestione operazioni bulk
  const applyBulkScope = useCallback((scope: PermissionScope) => {
    if (!selectedEntity || selectedActions.size === 0) return;

    setPermissions(prev =>
      applyBulkPermissions(prev, selectedEntity.name, selectedActions, 'scope', scope)
    );
  }, [selectedEntity, selectedActions]);

  const applyBulkFields = useCallback((fieldIds: string[], add: boolean) => {
    if (!selectedEntity || selectedActions.size === 0) return;

    setPermissions(prev =>
      applyBulkPermissions(prev, selectedEntity.name, selectedActions, 'fields', fieldIds, add)
    );
  }, [selectedEntity, selectedActions]);

  const applyBulkTenants = useCallback((tenantIds: string[], add: boolean) => {
    if (!selectedEntity || selectedActions.size === 0) return;

    setPermissions(prev =>
      applyBulkPermissions(prev, selectedEntity.name, selectedActions, 'tenants', tenantIds, add)
    );
  }, [selectedEntity, selectedActions]);

  // Gestione campi specifici
  const handleFieldToggle = useCallback((entity: string, action: string, fieldId: string, add: boolean) => {
    setPermissions(prev => updatePermissionFields(prev, entity, action, fieldId, add));
  }, []);

  // Gestione tenant
  const handleTenantChange = useCallback((entity: string, action: string, tenantId: string, selected: boolean) => {
    setPermissions(prev => updatePermissionTenants(prev, entity, action, tenantId, selected));
  }, []);

  // Gestione campi denied (modalità avanzata)
  const handleDeniedFieldsChange = useCallback((entity: string, action: string, deniedFields: string[]) => {
    setPermissions(prev => {
      const permissionIndex = prev.findIndex(p => p.entity === entity && p.action === action);

      // P69: Se il permesso non esiste, crealo con scope 'tenant' e i deniedFields
      if (permissionIndex === -1) {
        return [...prev, {
          entity,
          action: action as 'create' | 'read' | 'update' | 'delete',
          scope: 'tenant' as const,
          deniedFields,
          fields: []
        }];
      }

      const newPermissions = [...prev];
      newPermissions[permissionIndex] = {
        ...newPermissions[permissionIndex],
        deniedFields
      };
      return newPermissions;
    });
  }, []);

  // Gestione campi allowed (modalità avanzata)
  const handleAllowedFieldsChange = useCallback((entity: string, action: string, allowedFields: string[]) => {
    setPermissions(prev => {
      const permissionIndex = prev.findIndex(p => p.entity === entity && p.action === action);

      // P69: Se il permesso non esiste, crealo con scope 'tenant' e i campi allowed
      if (permissionIndex === -1) {
        return [...prev, {
          entity,
          action: action as 'create' | 'read' | 'update' | 'delete',
          scope: 'tenant' as const,
          fields: allowedFields,
          deniedFields: []
        }];
      }

      const newPermissions = [...prev];
      newPermissions[permissionIndex] = {
        ...newPermissions[permissionIndex],
        fields: allowedFields
      };
      return newPermissions;
    });
  }, []);

  // Salvataggio permessi
  const savePermissions = async () => {
    try {
      setSaving(true);
      // Usa role.type (roleType) invece di role.name per l'API
      const roleIdentifier = role.type || role.name;
      await advancedPermissionsService.updateRolePermissions(roleIdentifier, permissions);
      showToast({ message: 'Permessi aggiornati con successo', type: 'success' });
    } catch (err) {
      showToast({ message: 'Errore nel salvataggio dei permessi', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Filtro entità
  const filteredEntities = filterEntities(entities, searchTerm);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento permessi...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 min-h-0">
      {/* Header principale */}
      <PermissionManagerHeader
        role={role}
        filteredEntitiesCount={filteredEntities.length}
        selectedEntity={selectedEntity}
        bulkMode={bulkMode}
        onBulkModeToggle={() => setBulkMode(!bulkMode)}
      />

      {/* Sezione informazioni ruolo e azioni rapide */}
      <RoleInfoSection
        role={role}
        saving={saving}
        onBack={onBack}
        onSave={savePermissions}
        onReload={loadData}
      />

      {/* Layout principale a 3 colonne - P69: Independent scroll per colonna con altezza fissa */}
      <div className="flex-1 grid grid-cols-3 gap-0 min-h-0 overflow-hidden">
        {/* Colonna 1: Lista entità - scroll indipendente con altezza fissa */}
        <div className="h-full min-h-0 max-h-full overflow-y-auto overflow-x-hidden border-r border-gray-200 dark:border-gray-700">
          <EntityList
            entities={filteredEntities}
            selectedEntity={selectedEntity}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEntitySelect={handleEntitySelect}
          />
        </div>

        {/* Colonna 2: Gestione permessi CRUD - scroll indipendente */}
        <div className="min-h-0 overflow-y-auto overflow-x-hidden border-r border-gray-200 dark:border-gray-700">
          {selectedEntity ? (
            <PermissionsSection
              entity={selectedEntity}
              permissions={permissions}
              tenants={tenants}
              bulkMode={bulkMode}
              selectedActions={selectedActions}
              selectedAction={selectedAction}
              onPermissionUpdate={updatePermission}
              onTenantChange={handleTenantChange}
              onRelationTypeChange={handleRelationTypeChange}
              onActionToggle={toggleActionSelection}
              onActionSelect={setSelectedAction}
              onSelectAllActions={selectAllActions}
              onClearActionSelection={clearActionSelection}
              onBulkScopeApply={applyBulkScope}
              onBulkTenantsApply={applyBulkTenants}
            />
          ) : (
            <div className="min-h-0 bg-white border-r border-gray-200 flex items-center justify-center">
              <p className="text-gray-500">Seleziona un'entità per gestire i permessi</p>
            </div>
          )}
        </div>

        {/* Colonna 3: Gestione campi specifici - scroll indipendente */}
        <div className="min-h-0 overflow-y-auto overflow-x-hidden">
          {selectedEntity ? (
            <FieldsSection
              entity={selectedEntity}
              selectedAction={selectedAction}
              permissions={permissions}
              bulkMode={bulkMode}
              selectedActions={selectedActions}
              onFieldToggle={handleFieldToggle}
              onBulkFieldsApply={applyBulkFields}
              onDeniedFieldsChange={handleDeniedFieldsChange}
              onAllowedFieldsChange={handleAllowedFieldsChange}
            />
          ) : (
            <div className="min-h-0 bg-white flex items-center justify-center">
              <p className="text-gray-500">Seleziona un'entità per gestire i campi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizedPermissionManagerRefactored;