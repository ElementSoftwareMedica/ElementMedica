/**
 * @deprecated Questo file è stato refactorizzato in una struttura modulare.
 * Utilizzare invece: import { advancedPermissionsService } from './advanced-permissions';
 * 
 * Il nuovo servizio modulare offre:
 * - Migliore organizzazione del codice
 * - Separazione delle responsabilità
 * - Facilità di manutenzione
 * - Test più semplici
 * 
 * Struttura modulare:
 * - src/services/advanced-permissions/types.ts - Interfacce TypeScript
 * - src/services/advanced-permissions/entityDefinitions.ts - Definizioni entità
 * - src/services/advanced-permissions/conversionUtils.ts - Utility conversione
 * - src/services/advanced-permissions/permissionUtils.ts - Utility permessi
 * - src/services/advanced-permissions/virtualEntityService.ts - Servizio entità virtuali
 * - src/services/advanced-permissions/AdvancedPermissionsService.ts - Servizio principale
 * - src/services/advanced-permissions/index.ts - Barrel file
 */

// Re-export della nuova struttura modulare per compatibilità
export {
  AdvancedPermissionsService,
  advancedPermissionsService as default,
  type EntityPermission,
  type RolePermissions,
  type EntityDefinition,
  type EntityField,
  type PermissionsSummary,
  type VirtualEntityName,
  type PermissionAction,
  ALL_ENTITY_DEFINITIONS,
  CRITICAL_ENTITIES,
  convertFromBackendFormat,
  convertToBackendFormat,
  validatePermission,
  groupPermissionsByEntity,
  getPermissionsSummary,
  virtualEntityService
} from './advanced-permissions';

// Named export per compatibilità
export { advancedPermissionsService } from './advanced-permissions';