/**
 * Gestore dei permessi per la gerarchia dei ruoli
 * Gestisce assegnazione, verifica e calcolo dei permessi
 */

import { ROLE_HIERARCHY, getRolePermissions, roleExists } from './HierarchyDefinition.js';
import { canAssignToRole, canManageRole, getSuperiorRoles } from './HierarchyCalculator.js';

/**
 * Ottiene tutti i permessi assegnabili da un ruolo
 * @param {string} assignerRole - Ruolo di chi assegna
 * @returns {Array} Array di permessi assegnabili
 */
export function getAssignablePermissions(assignerRole) {
  if (!roleExists(assignerRole)) return [];
  
  // SUPER_ADMIN può assegnare tutti i permessi
  if (assignerRole === 'SUPER_ADMIN') {
    return getAllPermissions();
  }
  
  const assignerPermissions = getRolePermissions(assignerRole);
  const assignablePermissions = new Set();
  
  // Un ruolo può assegnare solo i permessi che possiede
  assignerPermissions.forEach(permission => {
    if (permission === 'ALL_PERMISSIONS') {
      // Se ha ALL_PERMISSIONS, può assegnare tutti i permessi
      getAllPermissions().forEach(p => assignablePermissions.add(p));
    } else {
      assignablePermissions.add(permission);
    }
  });
  
  return Array.from(assignablePermissions);
}

/**
 * Ottiene tutti i permessi disponibili nel sistema
 * @returns {Array} Array di tutti i permessi
 */
export function getAllPermissions() {
  const allPermissions = new Set();
  
  Object.values(ROLE_HIERARCHY).forEach(roleData => {
    roleData.permissions.forEach(permission => {
      if (permission !== 'ALL_PERMISSIONS') {
        allPermissions.add(permission);
      }
    });
  });
  
  return Array.from(allPermissions);
}

/**
 * Ottiene tutti i permessi assegnabili considerando tutti i ruoli
 * @returns {Array} Array di tutti i permessi assegnabili
 */
export function getAllAssignablePermissions() {
  return getAllPermissions();
}

/**
 * Verifica se un ruolo ha un permesso specifico
 * @param {string} roleType - Tipo di ruolo
 * @param {string} permission - Permesso da verificare
 * @returns {boolean} True se il ruolo ha il permesso
 */
export function hasPermission(roleType, permission) {
  const permissions = getRolePermissions(roleType);
  
  // Se ha ALL_PERMISSIONS, ha tutti i permessi
  if (permissions.includes('ALL_PERMISSIONS')) {
    return true;
  }
  
  return permissions.includes(permission);
}

/**
 * Verifica se un ruolo può assegnare un permesso specifico
 * @param {string} assignerRole - Ruolo di chi assegna
 * @param {string} permission - Permesso da assegnare
 * @returns {boolean} True se può assegnare il permesso
 */
export function canAssignPermission(assignerRole, permission) {
  const assignablePermissions = getAssignablePermissions(assignerRole);
  return assignablePermissions.includes(permission);
}

/**
 * Ottiene i permessi effettivi di un utente considerando tutti i suoi ruoli
 * @param {Array} userRoles - Array di ruoli dell'utente
 * @returns {Array} Array di permessi unici
 */
export function getUserEffectivePermissions(userRoles) {
  const effectivePermissions = new Set();
  
  userRoles.forEach(role => {
    const permissions = getRolePermissions(role);
    permissions.forEach(permission => {
      if (permission === 'ALL_PERMISSIONS') {
        // Se ha ALL_PERMISSIONS, aggiungi tutti i permessi
        getAllPermissions().forEach(p => effectivePermissions.add(p));
      } else {
        effectivePermissions.add(permission);
      }
    });
  });
  
  return Array.from(effectivePermissions);
}

/**
 * Verifica se un utente ha un permesso specifico considerando tutti i suoi ruoli
 * @param {Array} userRoles - Array di ruoli dell'utente
 * @param {string} permission - Permesso da verificare
 * @returns {boolean} True se l'utente ha il permesso
 */
export function userHasPermission(userRoles, permission) {
  return userRoles.some(role => hasPermission(role, permission));
}

/**
 * Ottiene i permessi mancanti per un ruolo rispetto a un altro
 * @param {string} currentRole - Ruolo corrente
 * @param {string} targetRole - Ruolo target
 * @returns {Array} Array di permessi mancanti
 */
export function getMissingPermissions(currentRole, targetRole) {
  const currentPermissions = new Set(getRolePermissions(currentRole));
  const targetPermissions = getRolePermissions(targetRole);
  
  return targetPermissions.filter(permission => !currentPermissions.has(permission));
}

/**
 * Ottiene i permessi in eccesso per un ruolo rispetto a un altro
 * @param {string} currentRole - Ruolo corrente
 * @param {string} targetRole - Ruolo target
 * @returns {Array} Array di permessi in eccesso
 */
export function getExcessPermissions(currentRole, targetRole) {
  const currentPermissions = getRolePermissions(currentRole);
  const targetPermissions = new Set(getRolePermissions(targetRole));
  
  return currentPermissions.filter(permission => !targetPermissions.has(permission));
}

/**
 * Verifica se un set di permessi è valido per un ruolo
 * @param {string} roleType - Tipo di ruolo
 * @param {Array} permissions - Array di permessi da verificare
 * @returns {Object} Risultato della validazione con dettagli
 */
export function validatePermissionsForRole(roleType, permissions) {
  const rolePermissions = getRolePermissions(roleType);
  const allPermissions = getAllPermissions();
  
  const result = {
    valid: true,
    invalidPermissions: [],
    missingPermissions: [],
    extraPermissions: []
  };
  
  // Verifica permessi non validi
  permissions.forEach(permission => {
    if (!allPermissions.includes(permission) && permission !== 'ALL_PERMISSIONS') {
      result.invalidPermissions.push(permission);
      result.valid = false;
    }
  });
  
  // Verifica permessi mancanti rispetto al ruolo
  rolePermissions.forEach(permission => {
    if (!permissions.includes(permission)) {
      result.missingPermissions.push(permission);
    }
  });
  
  // Verifica permessi extra rispetto al ruolo
  permissions.forEach(permission => {
    if (!rolePermissions.includes(permission)) {
      result.extraPermissions.push(permission);
    }
  });
  
  return result;
}

/**
 * Ottiene i permessi comuni tra più ruoli
 * @param {Array} roles - Array di ruoli
 * @returns {Array} Array di permessi comuni
 */
export function getCommonPermissions(roles) {
  if (!roles || roles.length === 0) return [];
  
  let commonPermissions = new Set(getRolePermissions(roles[0]));
  
  for (let i = 1; i < roles.length; i++) {
    const rolePermissions = new Set(getRolePermissions(roles[i]));
    commonPermissions = new Set([...commonPermissions].filter(p => rolePermissions.has(p)));
  }
  
  return Array.from(commonPermissions);
}

/**
 * Ottiene tutti i permessi unici tra più ruoli
 * @param {Array} roles - Array di ruoli
 * @returns {Array} Array di tutti i permessi unici
 */
export function getAllUniquePermissions(roles) {
  const allPermissions = new Set();
  
  roles.forEach(role => {
    const permissions = getRolePermissions(role);
    permissions.forEach(permission => {
      if (permission === 'ALL_PERMISSIONS') {
        getAllPermissions().forEach(p => allPermissions.add(p));
      } else {
        allPermissions.add(permission);
      }
    });
  });
  
  return Array.from(allPermissions);
}