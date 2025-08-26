/**
 * RoleHierarchyService - Servizio modulare per la gestione della gerarchia dei ruoli
 * 
 * Questo servizio è stato refactorizzato per migliorare la manutenibilità e la leggibilità.
 * È diviso in moduli specializzati:
 * - HierarchyDefinition: Definizioni statiche della gerarchia
 * - HierarchyCalculator: Calcoli e operazioni gerarchiche
 * - PermissionManager: Gestione dei permessi
 * - DatabaseOperations: Operazioni con il database
 */

// Importazioni dai moduli specializzati
import {
  ROLE_HIERARCHY,
  getRoleLevel,
  getDefaultParentRole,
  getAssignableRoles,
  getRolePermissions,
  roleExists,
  getRoleInfo,
  getAllRoleTypes,
  getRolesByLevel
} from './HierarchyDefinition.js';

import {
  calculatePath,
  canAssignToRole,
  canManageRole,
  getHighestRole,
  getSubordinateRoles,
  getSuperiorRoles,
  isSubordinate,
  findShortestPath,
  calculateHierarchicalDistance,
  areSameLevel,
  getSiblingRoles
} from './HierarchyCalculator.js';

import {
  getAssignablePermissions,
  getAllPermissions,
  getAllAssignablePermissions,
  hasPermission,
  canAssignPermission,
  getUserEffectivePermissions,
  userHasPermission,
  getMissingPermissions,
  getExcessPermissions,
  validatePermissionsForRole,
  getCommonPermissions,
  getAllUniquePermissions
} from './PermissionManager.js';

import {
  getRoleHierarchy,
  assignRoleWithHierarchy,
  assignPermissionsWithHierarchy,
  getUserRoleHierarchy,
  updateRoleHierarchy,
  addRoleToHierarchy,
  getVisibleRolesForUser
} from './DatabaseOperations.js';

/**
 * Classe principale del servizio di gerarchia dei ruoli
 * Mantiene la compatibilità con l'interfaccia esistente
 */
class RoleHierarchyService {
  
  // ==================== METODI STATICI DI DEFINIZIONE ====================
  
  /**
   * Ottiene la gerarchia statica dei ruoli
   * @returns {Object} Gerarchia dei ruoli
   */
  static get ROLE_HIERARCHY() {
    return ROLE_HIERARCHY;
  }

  /**
   * Calcola il percorso gerarchico per un ruolo
   * @param {string} roleType - Tipo di ruolo
   * @returns {Array} Percorso gerarchico
   */
  static calculatePath(roleType) {
    return calculatePath(roleType);
  }

  /**
   * Ottiene il livello gerarchico di un ruolo
   * @param {string} roleType - Tipo di ruolo
   * @returns {number} Livello gerarchico
   */
  static getRoleLevel(roleType) {
    return getRoleLevel(roleType);
  }

  /**
   * Ottiene il ruolo padre predefinito
   * @param {string} roleType - Tipo di ruolo
   * @returns {string|null} Ruolo padre
   */
  static getDefaultParentRole(roleType) {
    return getDefaultParentRole(roleType);
  }

  // ==================== METODI DI VERIFICA AUTORIZZAZIONI ====================

  /**
   * Verifica se un ruolo può assegnare un altro ruolo
   * @param {string} assignerRole - Ruolo di chi assegna
   * @param {string} targetRole - Ruolo da assegnare
   * @returns {boolean} True se può assegnare
   */
  static canAssignToRole(assignerRole, targetRole) {
    return canAssignToRole(assignerRole, targetRole);
  }

  /**
   * Verifica se un ruolo può gestire un altro ruolo
   * @param {string} managerRole - Ruolo di chi gestisce
   * @param {string} targetRole - Ruolo da gestire
   * @returns {boolean} True se può gestire
   */
  static canManageRole(managerRole, targetRole) {
    return canManageRole(managerRole, targetRole);
  }

  // ==================== METODI DI GESTIONE RUOLI ====================

  /**
   * Ottiene i ruoli assegnabili da un ruolo
   * @param {string} roleType - Tipo di ruolo
   * @returns {Array} Array di ruoli assegnabili
   */
  static getAssignableRoles(roleType) {
    return getAssignableRoles(roleType);
  }

  /**
   * Trova il ruolo più alto da un elenco
   * @param {Array} roles - Array di ruoli
   * @returns {string|null} Ruolo più alto
   */
  static getHighestRole(roles) {
    return getHighestRole(roles);
  }

  // ==================== METODI DI GESTIONE PERMESSI ====================

  /**
   * Ottiene i permessi assegnabili da un ruolo
   * @param {string} assignerRole - Ruolo di chi assegna
   * @returns {Array} Array di permessi assegnabili
   */
  static getAssignablePermissions(assignerRole) {
    return getAssignablePermissions(assignerRole);
  }

  /**
   * Ottiene tutti i permessi assegnabili
   * @returns {Array} Array di tutti i permessi assegnabili
   */
  static getAllAssignablePermissions() {
    return getAllAssignablePermissions();
  }

  // ==================== METODI DATABASE ====================

  /**
   * Ottiene la gerarchia completa dei ruoli (sistema + personalizzati)
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Gerarchia completa
   */
  static async getRoleHierarchy(tenantId) {
    return await getRoleHierarchy(tenantId);
  }

  /**
   * Assegna un ruolo con controlli gerarchici
   * @param {string} assignerId - ID di chi assegna
   * @param {string} targetUserId - ID dell'utente target
   * @param {string} roleType - Tipo di ruolo
   * @param {string} tenantId - ID del tenant
   * @param {Object} options - Opzioni aggiuntive
   * @returns {Promise<Object>} Risultato dell'assegnazione
   */
  static async assignRoleWithHierarchy(assignerId, targetUserId, roleType, tenantId, options = {}) {
    return await assignRoleWithHierarchy(assignerId, targetUserId, roleType, tenantId, options);
  }

  /**
   * Assegna permessi con controlli gerarchici
   * @param {string} assignerId - ID di chi assegna
   * @param {string} targetUserId - ID dell'utente target
   * @param {Array} permissions - Array di permessi
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Risultato dell'assegnazione
   */
  static async assignPermissionsWithHierarchy(assignerId, targetUserId, permissions, tenantId) {
    return await assignPermissionsWithHierarchy(assignerId, targetUserId, permissions, tenantId);
  }

  /**
   * Ottiene la gerarchia dei ruoli per un utente
   * @param {string} userId - ID dell'utente
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Gerarchia dell'utente
   */
  static async getUserRoleHierarchy(userId, tenantId) {
    return await getUserRoleHierarchy(userId, tenantId);
  }

  /**
   * Aggiorna la gerarchia dei ruoli
   * @param {string} roleType - Tipo di ruolo
   * @param {number} newLevel - Nuovo livello
   * @param {string} newParent - Nuovo genitore
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Risultato dell'aggiornamento
   */
  static async updateRoleHierarchy(roleType, newLevel, newParent, tenantId) {
    return await updateRoleHierarchy(roleType, newLevel, newParent, tenantId);
  }

  /**
   * Aggiunge un nuovo ruolo personalizzato
   * @param {Object} roleData - Dati del ruolo
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Object>} Risultato della creazione
   */
  static async addRoleToHierarchy(roleData, tenantId) {
    return await addRoleToHierarchy(roleData, tenantId);
  }

  /**
   * Ottiene i ruoli visibili per un utente
   * @param {string} userId - ID dell'utente
   * @param {string} tenantId - ID del tenant
   * @returns {Promise<Array>} Array di ruoli visibili
   */
  static async getVisibleRolesForUser(userId, tenantId) {
    return await getVisibleRolesForUser(userId, tenantId);
  }

  // ==================== METODI UTILITY AGGIUNTIVI ====================

  /**
   * Verifica se un ruolo esiste
   * @param {string} roleType - Tipo di ruolo
   * @returns {boolean} True se esiste
   */
  static roleExists(roleType) {
    return roleExists(roleType);
  }

  /**
   * Ottiene le informazioni complete di un ruolo
   * @param {string} roleType - Tipo di ruolo
   * @returns {Object|null} Informazioni del ruolo
   */
  static getRoleInfo(roleType) {
    return getRoleInfo(roleType);
  }

  /**
   * Ottiene tutti i tipi di ruolo disponibili
   * @returns {Array} Array di tipi di ruolo
   */
  static getAllRoleTypes() {
    return getAllRoleTypes();
  }

  /**
   * Ottiene i permessi di un ruolo
   * @param {string} roleType - Tipo di ruolo
   * @returns {Array} Array di permessi
   */
  static getRolePermissions(roleType) {
    return getRolePermissions(roleType);
  }

  /**
   * Verifica se un ruolo ha un permesso specifico
   * @param {string} roleType - Tipo di ruolo
   * @param {string} permission - Permesso da verificare
   * @returns {boolean} True se ha il permesso
   */
  static hasPermission(roleType, permission) {
    return hasPermission(roleType, permission);
  }

  /**
   * Ottiene i permessi effettivi di un utente
   * @param {Array} userRoles - Array di ruoli dell'utente
   * @returns {Array} Array di permessi effettivi
   */
  static getUserEffectivePermissions(userRoles) {
    return getUserEffectivePermissions(userRoles);
  }

  /**
   * Verifica se un utente ha un permesso
   * @param {Array} userRoles - Array di ruoli dell'utente
   * @param {string} permission - Permesso da verificare
   * @returns {boolean} True se ha il permesso
   */
  static userHasPermission(userRoles, permission) {
    return userHasPermission(userRoles, permission);
  }

  /**
   * Calcola la distanza gerarchica tra due ruoli
   * @param {string} role1 - Primo ruolo
   * @param {string} role2 - Secondo ruolo
   * @returns {number} Distanza gerarchica
   */
  static calculateHierarchicalDistance(role1, role2) {
    return calculateHierarchicalDistance(role1, role2);
  }

  /**
   * Verifica se due ruoli sono allo stesso livello
   * @param {string} role1 - Primo ruolo
   * @param {string} role2 - Secondo ruolo
   * @returns {boolean} True se sono allo stesso livello
   */
  static areSameLevel(role1, role2) {
    return areSameLevel(role1, role2);
  }

  /**
   * Ottiene i ruoli subordinati di un ruolo
   * @param {string} roleType - Tipo di ruolo
   * @returns {Array} Array di ruoli subordinati
   */
  static getSubordinateRoles(roleType) {
    return getSubordinateRoles(roleType);
  }

  /**
   * Ottiene i ruoli superiori di un ruolo
   * @param {string} roleType - Tipo di ruolo
   * @returns {Array} Array di ruoli superiori
   */
  static getSuperiorRoles(roleType) {
    return getSuperiorRoles(roleType);
  }
}

// Esporta la classe principale e i moduli per uso diretto se necessario
export default RoleHierarchyService;

// Esporta anche i moduli individuali per uso avanzato
export {
  // Definizioni
  ROLE_HIERARCHY,
  getRoleLevel,
  getDefaultParentRole,
  getAssignableRoles,
  getRolePermissions,
  roleExists,
  getRoleInfo,
  getAllRoleTypes,
  getRolesByLevel,
  
  // Calcoli
  calculatePath,
  canAssignToRole,
  canManageRole,
  getHighestRole,
  getSubordinateRoles,
  getSuperiorRoles,
  isSubordinate,
  findShortestPath,
  calculateHierarchicalDistance,
  areSameLevel,
  getSiblingRoles,
  
  // Permessi
  getAssignablePermissions,
  getAllPermissions,
  getAllAssignablePermissions,
  hasPermission,
  canAssignPermission,
  getUserEffectivePermissions,
  userHasPermission,
  getMissingPermissions,
  getExcessPermissions,
  validatePermissionsForRole,
  getCommonPermissions,
  getAllUniquePermissions,
  
  // Database
  getRoleHierarchy,
  assignRoleWithHierarchy,
  assignPermissionsWithHierarchy,
  getUserRoleHierarchy,
  updateRoleHierarchy,
  addRoleToHierarchy,
  getVisibleRolesForUser
};