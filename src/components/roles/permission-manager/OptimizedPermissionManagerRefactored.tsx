import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Role } from '../../../hooks/useRoles';
import { Tenant } from '../../../hooks/useTenants';
import { EntityDefinition, EntityPermission, advancedPermissionsService } from '../../../services/advancedPermissions';
import { 
  updatePermissionInArray, 
  updatePermissionFields, 
  updatePermissionTenants,
  applyBulkPermissions,
  getAllActionNames,
  filterEntities
} from './utils';

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
  }, [role.name]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [entitiesData, permissionsData] = await Promise.all([
        advancedPermissionsService.getEntityDefinitions(),
        advancedPermissionsService.getRolePermissions(role.name)
      ]);
      
      setEntities(entitiesData);
      setPermissions(permissionsData);
    } catch (err) {
      console.error('Errore nel caricamento dei dati:', err);
      setError('Errore nel caricamento dei dati');
      toast.error('Errore nel caricamento dei dati');
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
    scope: 'all' | 'tenant' | 'own' | 'none'
  ) => {
    setPermissions(prev => updatePermissionInArray(prev, entity, action, scope));
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
  const applyBulkScope = useCallback((scope: 'all' | 'tenant' | 'own' | 'none') => {
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

  const applyBulkTenants = useCallback((tenantIds: number[], add: boolean) => {
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
  const handleTenantChange = useCallback((entity: string, action: string, tenantId: number, selected: boolean) => {
    setPermissions(prev => updatePermissionTenants(prev, entity, action, tenantId, selected));
  }, []);

  // Salvataggio permessi
  const savePermissions = async () => {
    try {
      setSaving(true);
      await advancedPermissionsService.updateRolePermissions(role.name, permissions);
      toast.success('Permessi aggiornati con successo');
    } catch (err) {
      console.error('Errore nel salvataggio:', err);
      toast.error('Errore nel salvataggio dei permessi');
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
    <div className="h-full flex flex-col bg-gray-50">
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

      {/* Layout principale a 4 colonne */}
      <div className="flex-1 grid grid-cols-4 min-h-0">
        {/* Colonna 1: Lista entità */}
        <EntityList
          entities={filteredEntities}
          selectedEntity={selectedEntity}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onEntitySelect={handleEntitySelect}
        />

        {/* Colonna 2: Gestione permessi CRUD */}
        {selectedEntity ? (
          <PermissionsSection
            entity={selectedEntity}
            permissions={permissions}
            tenants={tenants}
            bulkMode={bulkMode}
            selectedActions={selectedActions}
            onPermissionUpdate={updatePermission}
            onTenantChange={handleTenantChange}
            onActionToggle={toggleActionSelection}
            onSelectAllActions={selectAllActions}
            onClearActionSelection={clearActionSelection}
            onBulkScopeApply={applyBulkScope}
            onBulkTenantsApply={applyBulkTenants}
          />
        ) : (
          <div className="bg-white border-r border-gray-200 flex items-center justify-center">
            <p className="text-gray-500">Seleziona un'entità per gestire i permessi</p>
          </div>
        )}

        {/* Colonna 3: Gestione campi specifici */}
        {selectedEntity ? (
          <FieldsSection
            entity={selectedEntity}
            selectedAction={selectedAction}
            permissions={permissions}
            bulkMode={bulkMode}
            selectedActions={selectedActions}
            onFieldToggle={handleFieldToggle}
            onBulkFieldsApply={applyBulkFields}
          />
        ) : (
          <div className="bg-white flex items-center justify-center">
            <p className="text-gray-500">Seleziona un'entità per gestire i campi</p>
          </div>
        )}

        {/* Colonna 4: Informazioni aggiuntive o preview */}
        <div className="bg-white border-l border-gray-200 p-4">
          <div className="text-center text-gray-500">
            <h4 className="font-medium mb-2">Riepilogo Permessi</h4>
            <div className="space-y-2 text-sm">
              <p>Entità totali: {entities.length}</p>
              <p>Permessi attivi: {permissions.length}</p>
              {selectedEntity && (
                <>
                  <p>Entità selezionata: {selectedEntity.displayName}</p>
                  <p>Campi disponibili: {selectedEntity.fields.length}</p>
                </>
              )}
              {bulkMode && (
                <p>Azioni selezionate: {selectedActions.size}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedPermissionManagerRefactored;