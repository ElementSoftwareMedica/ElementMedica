/**
 * usePermissionLoader Hook
 * 
 * Handles loading and categorization of available permissions and entities.
 * Integrates with rolesService and advancedPermissionsService.
 */

import { useState, useEffect } from 'react';
import { rolesService } from '../../../../services/roles';
import { advancedPermissionsService } from '../../../../services/advancedPermissions';
import type { PermissionGroup, EntityGroup, EntityDefinition, Permission } from '../types';

interface UsePermissionLoaderReturn {
  availablePermissions: Record<string, PermissionGroup>;
  entities: EntityDefinition[];
  entityGroups: EntityGroup[];
  loadingPermissions: boolean;
  error: string | null;
}

/**
 * Hook for loading and managing available permissions
 */
export const usePermissionLoader = (isOpen: boolean): UsePermissionLoaderReturn => {
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, PermissionGroup>>({});
  const [entities, setEntities] = useState<EntityDefinition[]>([]);
  const [entityGroups, setEntityGroups] = useState<EntityGroup[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAvailablePermissions();
    }
  }, [isOpen]);

  const loadAvailablePermissions = async () => {
    try {
      setLoadingPermissions(true);
      setError(null);
      
      // Load both permissions and entities
      const [permissions, entitiesData] = await Promise.all([
        rolesService.getPermissions(),
        advancedPermissionsService.getEntityDefinitions()
      ]);
      
      console.log('🔍 [usePermissionLoader] Entities loaded:', entitiesData.length);
      console.log('🔍 [usePermissionLoader] Entity list:', entitiesData.map(e => e.name));
      
      // Verify critical entities are present
      const criticalEntities = ['form_templates', 'form_submissions', 'public_cms'];
      const foundCriticalEntities = criticalEntities.filter(entity => 
        entitiesData.some(e => e.name === entity)
      );
      console.log('🔍 [usePermissionLoader] Critical entities found:', foundCriticalEntities);
      
      // Group permissions by category
      const groupedPermissions: Record<string, PermissionGroup> = {};
      permissions.forEach(permission => {
        const category = permission.category || 'general';
        if (!groupedPermissions[category]) {
          const categoryLabel = category && typeof category === 'string' 
            ? category.charAt(0).toUpperCase() + category.slice(1)
            : 'General';
          
          groupedPermissions[category] = {
            label: categoryLabel,
            description: `Permessi per ${category}`,
            permissions: []
          };
        }
        groupedPermissions[category].permissions.push({
          key: permission.id,
          label: permission.name,
          description: permission.description || ''
        });
      });
      
      // Create entity groups with CRUD permissions
      const entityGroupsData: EntityGroup[] = entitiesData.map(entity => {
        // Normalize entity name as backend does
        const normalizedEntityName = entity.name.trim().toUpperCase();
        
        const crudPermissions: Permission[] = [
          {
            key: `CREATE_${normalizedEntityName}`,
            label: `Crea ${entity.displayName}`,
            description: `Permesso per creare nuovi record di ${entity.displayName}`
          },
          {
            key: `VIEW_${normalizedEntityName}`,
            label: `Visualizza ${entity.displayName}`,
            description: `Permesso per visualizzare i record di ${entity.displayName}`
          },
          {
            key: `EDIT_${normalizedEntityName}`,
            label: `Modifica ${entity.displayName}`,
            description: `Permesso per modificare i record di ${entity.displayName}`
          },
          {
            key: `DELETE_${normalizedEntityName}`,
            label: `Elimina ${entity.displayName}`,
            description: `Permesso per eliminare i record di ${entity.displayName}`
          }
        ];
        
        return {
          entity,
          permissions: crudPermissions
        };
      });
      
      console.log('🔍 [usePermissionLoader] Entity groups created:', entityGroupsData.length);
      console.log('🔍 [usePermissionLoader] Entities in groups:', entityGroupsData.map(g => g.entity.name));
      
      setAvailablePermissions(groupedPermissions);
      setEntities(entitiesData);
      setEntityGroups(entityGroupsData);
    } catch (error) {
      console.error('[usePermissionLoader] Error loading permissions:', error);
      setError('Errore nel caricamento dei permessi');
    } finally {
      setLoadingPermissions(false);
    }
  };

  return {
    availablePermissions,
    entities,
    entityGroups,
    loadingPermissions,
    error
  };
};
