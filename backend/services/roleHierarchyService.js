/**
 * RoleHierarchyService - Wrapper di compatibilità
 * 
 * Questo file mantiene la compatibilità con il codice esistente
 * delegando tutte le chiamate alla nuova struttura modulare.
 * 
 * NOTA: Il file originale è stato salvato come roleHierarchyService.js.backup
 * La nuova implementazione modulare si trova in ./roleHierarchy/
 */

import RoleHierarchyService from './roleHierarchy/index.js';

// Esporta direttamente la classe dalla nuova struttura modulare
export default RoleHierarchyService;

// Esporta anche tutte le funzioni individuali per compatibilità
export const {
  ROLE_HIERARCHY,
  calculatePath,
  getRoleLevel,
  getDefaultParentRole,
  canAssignToRole,
  canManageRole,
  getAssignableRoles,
  getHighestRole,
  getAssignablePermissions,
  getAllAssignablePermissions,
  getRoleHierarchy,
  assignRoleWithHierarchy,
  assignPermissionsWithHierarchy,
  getUserRoleHierarchy,
  updateRoleHierarchy,
  addRoleToHierarchy,
  getVisibleRolesForUser,
  roleExists,
  getRoleInfo,
  getAllRoleTypes,
  getRolePermissions,
  hasPermission,
  getUserEffectivePermissions,
  userHasPermission,
  calculateHierarchicalDistance,
  areSameLevel,
  getSubordinateRoles,
  getSuperiorRoles
} = RoleHierarchyService;