// Enhanced Role Service - Servizio modulare per la gestione avanzata dei ruoli
// Importa tutti i moduli specializzati

// Core functionality
import RoleCore from './core/RoleCore.js';
import PermissionChecker from './permissions/PermissionChecker.js';

// Utilities
import RoleTypes from './utils/RoleTypes.js';
import RoleUtils from './utils/RoleUtils.js';

// Specialized modules
import RoleStats from './stats/RoleStats.js';
import RoleMiddleware from './middleware/RoleMiddleware.js';

// Logger
import { logger } from '../../utils/logger.js';

/**
 * Enhanced Role Service - Servizio principale per la gestione dei ruoli
 * 
 * Questo servizio aggrega tutte le funzionalità dei moduli specializzati
 * per fornire un'interfaccia unificata per la gestione dei ruoli e permessi.
 * 
 * Architettura modulare:
 * - Core: Operazioni CRUD sui ruoli
 * - Permissions: Verifica avanzata dei permessi
 * - Utils: Utility e validazioni
 * - Stats: Statistiche e report
 * - Middleware: Middleware Express per autorizzazione
 */

class EnhancedRoleService {
  constructor() {
    this.core = RoleCore;
    this.permissions = PermissionChecker;
    this.types = RoleTypes;
    this.utils = RoleUtils;
    this.stats = RoleStats;
    this.middleware = RoleMiddleware;
    
    logger.info('[ENHANCED_ROLE_SERVICE] Service initialized with modular architecture');
  }

  // ==================== CORE OPERATIONS ====================

  /**
   * Assegna un ruolo a un utente
   */
  async assignRole(personId, roleType, tenantId, options = {}) {
    return this.core.assignRole(personId, roleType, tenantId, options);
  }

  /**
   * Rimuove un ruolo da un utente
   */
  async removeRole(personId, roleType, tenantId, companyId = null) {
    return this.core.removeRole(personId, roleType, tenantId, companyId);
  }

  /**
   * Ottiene tutti i ruoli di un utente
   */
  async getUserRoles(personId, tenantId) {
    return this.core.getUserRoles(personId, tenantId);
  }

  /**
   * Ottiene utenti con un ruolo specifico
   */
  async getUsersByRole(roleType, tenantId, companyId = null) {
    return this.core.getUsersByRole(roleType, tenantId, companyId);
  }

  /**
   * Aggiorna i permessi di un ruolo
   */
  async updateRolePermissions(roleId, permissions) {
    return this.core.updateRolePermissions(roleId, permissions);
  }

  /**
   * Pulisce i ruoli scaduti
   */
  async cleanupExpiredRoles(tenantId) {
    return this.core.cleanupExpiredRoles(tenantId);
  }

  /**
   * Verifica se un utente ha un ruolo specifico
   */
  async hasRole(personId, roleType, tenantId, companyId = null) {
    return this.core.hasRole(personId, roleType, tenantId, companyId);
  }

  /**
   * Ottiene il ruolo primario di un utente
   */
  async getPrimaryRole(personId, tenantId) {
    return this.core.getPrimaryRole(personId, tenantId);
  }

  // ==================== PERMISSION CHECKING ====================

  /**
   * Verifica se un utente ha un permesso specifico
   */
  async hasPermission(personId, permission, tenantId, options = {}) {
    return this.permissions.hasPermission(personId, permission, tenantId, options);
  }

  /**
   * Ottiene tutti i permessi di un utente
   */
  async getUserPermissions(personId, tenantId) {
    return this.permissions.getUserPermissions(personId, tenantId);
  }

  /**
   * Ottiene permessi avanzati per una risorsa specifica
   */
  async getAdvancedPermissions(personId, resource, tenantId, resourceId = null) {
    return this.permissions.getAdvancedPermissions(personId, resource, tenantId, resourceId);
  }

  /**
   * Verifica l'accesso a una risorsa specifica
   */
  async canAccessResource(personId, resource, action, tenantId, resourceData = {}) {
    return this.permissions.canAccessResource(personId, resource, action, tenantId, resourceData);
  }

  /**
   * Filtra dati in base ai permessi dell'utente
   */
  async filterDataByPermissions(personId, resource, action, data, tenantId) {
    return this.permissions.filterDataByPermissions(personId, resource, action, data, tenantId);
  }

  // ==================== STATISTICS ====================

  /**
   * Ottiene statistiche sui ruoli
   */
  async getRoleStatistics(tenantId) {
    return this.stats.getRoleStatistics(tenantId);
  }

  /**
   * Ottiene statistiche dettagliate sui ruoli
   */
  async getDetailedRoleStatistics(tenantId) {
    return this.stats.getDetailedRoleStatistics(tenantId);
  }

  /**
   * Ottiene statistiche sull'uso dei permessi
   */
  async getPermissionUsageStats(tenantId) {
    return this.stats.getPermissionUsageStats(tenantId);
  }

  /**
   * Ottiene statistiche sui ruoli in scadenza
   */
  async getExpirationStats(tenantId, daysAhead = 30) {
    return this.stats.getExpirationStats(tenantId, daysAhead);
  }

  /**
   * Ottiene un report completo sui ruoli
   */
  async getCompleteRoleReport(tenantId) {
    return this.stats.getCompleteRoleReport(tenantId);
  }

  // ==================== UTILITIES ====================

  /**
   * Valida l'assegnazione di un ruolo
   */
  validateRoleAssignment(personId, roleType, tenantId, companyId = null) {
    return this.utils.validateRoleAssignment(personId, roleType, tenantId, companyId);
  }

  /**
   * Determina lo scope di un ruolo
   */
  determineRoleScope(roleType, companyId = null) {
    return this.utils.determineRoleScope(roleType, companyId);
  }

  /**
   * Normalizza i dati di un ruolo
   */
  normalizeRoleData(role) {
    return this.utils.normalizeRoleData(role);
  }

  /**
   * Filtra ruoli in base a criteri
   */
  filterRoles(roles, criteria = {}) {
    return this.utils.filterRoles(roles, criteria);
  }

  /**
   * Ordina ruoli per priorità
   */
  sortRolesByPriority(roles) {
    return this.utils.sortRolesByPriority(roles);
  }

  /**
   * Verifica se un ruolo è scaduto
   */
  isRoleExpired(role) {
    return this.utils.isRoleExpired(role);
  }

  /**
   * Verifica se un ruolo è valido
   */
  isRoleValid(role) {
    return this.utils.isRoleValid(role);
  }

  // ==================== MIDDLEWARE ====================

  /**
   * Middleware per verificare permessi
   */
  requirePermission(requiredPermissions, options = {}) {
    return this.middleware.requirePermission(requiredPermissions, options);
  }

  /**
   * Middleware per verificare ruoli
   */
  requireRole(requiredRoles, options = {}) {
    return this.middleware.requireRole(requiredRoles, options);
  }

  /**
   * Middleware per verificare admin
   */
  requireAdmin() {
    return this.middleware.requireAdmin();
  }

  /**
   * Middleware per verificare super admin
   */
  requireSuperAdmin() {
    return this.middleware.requireSuperAdmin();
  }

  /**
   * Middleware per verificare accesso a company
   */
  requireCompanyAccess(getCompanyId) {
    return this.middleware.requireCompanyAccess(getCompanyId);
  }

  // ==================== CONSTANTS ====================

  /**
   * Ottiene tutti i tipi di ruolo disponibili
   */
  getRoleTypes() {
    return this.types.ROLE_TYPES;
  }

  /**
   * Ottiene tutti gli scope dei ruoli
   */
  getRoleScopes() {
    return this.types.ROLE_SCOPES;
  }

  /**
   * Ottiene tutti i permessi disponibili
   */
  getPermissions() {
    return this.types.PERMISSIONS;
  }

  /**
   * Ottiene i permessi di default per un ruolo
   */
  getDefaultPermissions(roleType) {
    return this.types.getDefaultPermissions(roleType);
  }

  // ==================== LEGACY COMPATIBILITY ====================

  /**
   * Metodo legacy per compatibilità con il codice esistente
   * @deprecated Usa getUserRoles invece
   */
  async getPersonRoles(personId, tenantId) {
    logger.warn('[ENHANCED_ROLE_SERVICE] Using deprecated method getPersonRoles, use getUserRoles instead');
    return this.getUserRoles(personId, tenantId);
  }

  /**
   * Metodo legacy per compatibilità
   * @deprecated Usa hasPermission invece
   */
  async checkPermission(personId, permission, tenantId) {
    logger.warn('[ENHANCED_ROLE_SERVICE] Using deprecated method checkPermission, use hasPermission instead');
    return this.hasPermission(personId, permission, tenantId);
  }
}

// Crea un'istanza singleton del servizio
const enhancedRoleService = new EnhancedRoleService();

// Export delle funzioni principali per compatibilità (bind dei metodi)
export const assignRole = enhancedRoleService.assignRole.bind(enhancedRoleService);
export const removeRole = enhancedRoleService.removeRole.bind(enhancedRoleService);
export const getUserRoles = enhancedRoleService.getUserRoles.bind(enhancedRoleService);
export const getUsersByRole = enhancedRoleService.getUsersByRole.bind(enhancedRoleService);
export const updateRolePermissions = enhancedRoleService.updateRolePermissions.bind(enhancedRoleService);
export const cleanupExpiredRoles = enhancedRoleService.cleanupExpiredRoles.bind(enhancedRoleService);
export const hasRole = enhancedRoleService.hasRole.bind(enhancedRoleService);
export const getPrimaryRole = enhancedRoleService.getPrimaryRole.bind(enhancedRoleService);

// Permission checking
export const hasPermission = enhancedRoleService.hasPermission.bind(enhancedRoleService);
export const getUserPermissions = enhancedRoleService.getUserPermissions.bind(enhancedRoleService);
export const getAdvancedPermissions = enhancedRoleService.getAdvancedPermissions.bind(enhancedRoleService);
export const canAccessResource = enhancedRoleService.canAccessResource.bind(enhancedRoleService);
export const filterDataByPermissions = enhancedRoleService.filterDataByPermissions.bind(enhancedRoleService);

// Statistics
export const getRoleStatistics = enhancedRoleService.getRoleStatistics.bind(enhancedRoleService);
export const getDetailedRoleStatistics = enhancedRoleService.getDetailedRoleStatistics.bind(enhancedRoleService);
export const getPermissionUsageStats = enhancedRoleService.getPermissionUsageStats.bind(enhancedRoleService);
export const getExpirationStats = enhancedRoleService.getExpirationStats.bind(enhancedRoleService);
export const getCompleteRoleReport = enhancedRoleService.getCompleteRoleReport.bind(enhancedRoleService);

// Utilities
export const validateRoleAssignment = enhancedRoleService.validateRoleAssignment.bind(enhancedRoleService);
export const determineRoleScope = enhancedRoleService.determineRoleScope.bind(enhancedRoleService);
export const normalizeRoleData = enhancedRoleService.normalizeRoleData.bind(enhancedRoleService);
export const filterRoles = enhancedRoleService.filterRoles.bind(enhancedRoleService);
export const sortRolesByPriority = enhancedRoleService.sortRolesByPriority.bind(enhancedRoleService);
export const isRoleExpired = enhancedRoleService.isRoleExpired.bind(enhancedRoleService);
export const isRoleValid = enhancedRoleService.isRoleValid.bind(enhancedRoleService);

// Middleware
export const requirePermission = enhancedRoleService.requirePermission.bind(enhancedRoleService);
export const requireRole = enhancedRoleService.requireRole.bind(enhancedRoleService);
export const requireAdmin = enhancedRoleService.requireAdmin.bind(enhancedRoleService);
export const requireSuperAdmin = enhancedRoleService.requireSuperAdmin.bind(enhancedRoleService);
export const requireCompanyAccess = enhancedRoleService.requireCompanyAccess.bind(enhancedRoleService);

// Constants
export const getRoleTypes = enhancedRoleService.getRoleTypes.bind(enhancedRoleService);
export const getRoleScopes = enhancedRoleService.getRoleScopes.bind(enhancedRoleService);
export const getPermissions = enhancedRoleService.getPermissions.bind(enhancedRoleService);
export const getDefaultPermissions = enhancedRoleService.getDefaultPermissions.bind(enhancedRoleService);

// Export dei moduli per uso diretto
export {
  RoleCore,
  PermissionChecker,
  RoleTypes,
  RoleUtils,
  RoleStats,
  RoleMiddleware
};

// Export di default del servizio completo
export default enhancedRoleService;