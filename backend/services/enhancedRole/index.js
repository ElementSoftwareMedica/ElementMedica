// Enhanced Role Service - Export principale
// Questo file fornisce un punto di accesso unificato per tutti i moduli del servizio ruoli

// Import del servizio principale
import EnhancedRoleService from './EnhancedRoleService.js';

// Import dei moduli specializzati per export diretto
import RoleCore from './core/RoleCore.js';
import PermissionChecker from './permissions/PermissionChecker.js';
import RoleTypes from './utils/RoleTypes.js';
import RoleUtils from './utils/RoleUtils.js';
import RoleStats from './stats/RoleStats.js';
import RoleMiddleware from './middleware/RoleMiddleware.js';

// Export del servizio principale (default)
export default EnhancedRoleService;

// Export dei moduli specializzati
export {
  RoleCore,
  PermissionChecker,
  RoleTypes,
  RoleUtils,
  RoleStats,
  RoleMiddleware
};

// Export delle funzioni principali per compatibilità diretta
export const {
  // Core operations
  assignRole,
  removeRole,
  getUserRoles,
  getUsersByRole,
  updateRolePermissions,
  cleanupExpiredRoles,
  hasRole,
  getPrimaryRole,
  
  // Permission checking
  hasPermission,
  getUserPermissions,
  getAdvancedPermissions,
  canAccessResource,
  filterDataByPermissions,
  
  // Statistics
  getRoleStatistics,
  getDetailedRoleStatistics,
  getPermissionUsageStats,
  getExpirationStats,
  getCompleteRoleReport,
  
  // Utilities
  validateRoleAssignment,
  determineRoleScope,
  normalizeRoleData,
  filterRoles,
  sortRolesByPriority,
  isRoleExpired,
  isRoleValid,
  
  // Middleware
  requirePermission,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireCompanyAccess,
  
  // Constants
  getRoleTypes,
  getRoleScopes,
  getPermissions,
  getDefaultPermissions
} = EnhancedRoleService;

// Export delle costanti per accesso diretto
export const ROLE_TYPES = RoleTypes.ROLE_TYPES;
export const ROLE_SCOPES = RoleTypes.ROLE_SCOPES;
export const PERMISSIONS = RoleTypes.PERMISSIONS;