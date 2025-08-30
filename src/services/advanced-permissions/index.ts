// Esportazioni principali
export { AdvancedPermissionsService } from './AdvancedPermissionsService';

// Tipi TypeScript
export type {
  EntityPermission,
  RolePermissions,
  EntityDefinition,
  EntityField,
  PermissionsSummary,
  VirtualEntityName,
  PermissionAction
} from './types';

// Definizioni entità
export {
  STATIC_ENTITY_DEFINITIONS,
  EXTENDED_ENTITY_DEFINITIONS,
  ALL_ENTITY_DEFINITIONS,
  CRITICAL_ENTITIES,
  isVirtualEntity,
  getVirtualEntityBackendName
} from './entityDefinitions';

// Utility di conversione
export {
  convertFromBackendFormat,
  convertToBackendFormat,
  extractEntityFromPermissionName,
  extractActionFromPermissionName,
  generateBackendPermissionName
} from './conversionUtils';

// Utility per permessi
export {
  validatePermission,
  groupPermissionsByEntity,
  getPermissionsSummary,
  filterPermissionsByAction,
  filterPermissionsByEntity,
  filterPermissionsByScope,
  hasPermission,
  getGrantedPermissions,
  getDeniedPermissions,
  mergePermissions,
  deduplicatePermissions,
  permissionToString,
  getUniqueEntities,
  getUniqueActions,
  getUniqueScopes
} from './permissionUtils';

// Servizio entità virtuali
export { virtualEntityService } from './virtualEntityService';

// Istanza singleton del servizio principale
import { AdvancedPermissionsService } from './AdvancedPermissionsService';
export const advancedPermissionsService = new AdvancedPermissionsService();

// Export di default per compatibilità
export default advancedPermissionsService;