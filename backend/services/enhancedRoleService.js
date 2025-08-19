/**
 * Enhanced Role Service - Wrapper per compatibilità
 * 
 * MIGRAZIONE COMPLETATA: Questo file è stato ottimizzato e modularizzato.
 * Il codice originale (968 righe) è stato suddiviso in moduli specializzati
 * per migliorare la manutenibilità e le performance.
 * 
 * Nuova architettura modulare:
 * - Core: Operazioni CRUD sui ruoli
 * - Permissions: Verifica avanzata dei permessi  
 * - Utils: Utility e validazioni
 * - Stats: Statistiche e report
 * - Middleware: Middleware Express per autorizzazione
 */

import { logger } from '../utils/logger.js';

// Import della nuova implementazione modulare
import EnhancedRoleService, {
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
} from './enhancedRole/EnhancedRoleService.js';

// Log della migrazione
logger.info('[ENHANCED_ROLE_SERVICE] Using modular implementation - Migration completed');

// Export della nuova implementazione per compatibilità
export default EnhancedRoleService;

// Re-export delle funzioni principali per compatibilità diretta
export {
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
};

// Export delle costanti per compatibilità
export const ROLE_TYPES = getRoleTypes();
export const ROLE_SCOPES = getRoleScopes();
export const PERMISSIONS = getPermissions();