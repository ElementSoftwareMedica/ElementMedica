/**
 * Calcolatore per operazioni gerarchiche
 * Gestisce calcoli di percorsi, livelli e relazioni tra ruoli
 */

import { ROLE_HIERARCHY, getRoleLevel, getDefaultParentRole, roleExists } from './HierarchyDefinition.js';

/**
 * Calcola il percorso gerarchico completo per un ruolo
 * @param {string} roleType - Tipo di ruolo
 * @returns {Array} Array del percorso dalla radice al ruolo
 */
export function calculatePath(roleType) {
  const path = [];
  let currentRole = roleType;
  
  while (currentRole && ROLE_HIERARCHY[currentRole]) {
    path.unshift(currentRole);
    currentRole = ROLE_HIERARCHY[currentRole].parent;
  }
  
  return path;
}

/**
 * Verifica se un ruolo può assegnare un altro ruolo
 * @param {string} assignerRole - Ruolo di chi assegna
 * @param {string} targetRole - Ruolo da assegnare
 * @returns {boolean} True se l'assegnazione è permessa
 */
export function canAssignToRole(assignerRole, targetRole) {
  const assignerInfo = ROLE_HIERARCHY[assignerRole];
  if (!assignerInfo) return false;
  
  // SUPER_ADMIN può assegnare qualsiasi ruolo
  if (assignerRole === 'SUPER_ADMIN') return true;
  
  // Verifica se il ruolo target è nella lista dei ruoli assegnabili
  return assignerInfo.canAssignTo.includes(targetRole);
}

/**
 * Verifica se un ruolo può gestire (modificare/eliminare) un altro ruolo
 * @param {string} managerRole - Ruolo di chi gestisce
 * @param {string} targetRole - Ruolo da gestire
 * @returns {boolean} True se la gestione è permessa
 */
export function canManageRole(managerRole, targetRole) {
  const managerLevel = getRoleLevel(managerRole);
  const targetLevel = getRoleLevel(targetRole);
  
  // SUPER_ADMIN può gestire tutto
  if (managerRole === 'SUPER_ADMIN') return true;
  
  // Un ruolo può gestire solo ruoli di livello inferiore
  return managerLevel < targetLevel;
}

/**
 * Trova il ruolo più alto da un elenco di ruoli
 * @param {Array} roles - Array di ruoli
 * @returns {string|null} Il ruolo con il livello più alto (numero più basso)
 */
export function getHighestRole(roles) {
  if (!roles || roles.length === 0) return null;
  
  let highestRole = roles[0];
  let highestLevel = getRoleLevel(highestRole);
  
  for (let i = 1; i < roles.length; i++) {
    const currentLevel = getRoleLevel(roles[i]);
    if (currentLevel < highestLevel) {
      highestRole = roles[i];
      highestLevel = currentLevel;
    }
  }
  
  return highestRole;
}

/**
 * Ottiene tutti i ruoli subordinati (diretti e indiretti) di un ruolo
 * @param {string} roleType - Tipo di ruolo
 * @returns {Array} Array di ruoli subordinati
 */
export function getSubordinateRoles(roleType) {
  const subordinates = [];
  const roleLevel = getRoleLevel(roleType);
  
  // Trova tutti i ruoli con livello superiore (numero maggiore)
  Object.entries(ROLE_HIERARCHY).forEach(([type, data]) => {
    if (data.level > roleLevel) {
      subordinates.push(type);
    }
  });
  
  return subordinates;
}

/**
 * Ottiene tutti i ruoli superiori (diretti e indiretti) di un ruolo
 * @param {string} roleType - Tipo di ruolo
 * @returns {Array} Array di ruoli superiori
 */
export function getSuperiorRoles(roleType) {
  const superiors = [];
  const roleLevel = getRoleLevel(roleType);
  
  // Trova tutti i ruoli con livello inferiore (numero minore)
  Object.entries(ROLE_HIERARCHY).forEach(([type, data]) => {
    if (data.level < roleLevel) {
      superiors.push(type);
    }
  });
  
  return superiors;
}

/**
 * Verifica se un ruolo è subordinato a un altro
 * @param {string} subordinateRole - Ruolo subordinato
 * @param {string} superiorRole - Ruolo superiore
 * @returns {boolean} True se il primo ruolo è subordinato al secondo
 */
export function isSubordinate(subordinateRole, superiorRole) {
  const subordinateLevel = getRoleLevel(subordinateRole);
  const superiorLevel = getRoleLevel(superiorRole);
  
  return subordinateLevel > superiorLevel;
}

/**
 * Trova il percorso più breve tra due ruoli nella gerarchia
 * @param {string} fromRole - Ruolo di partenza
 * @param {string} toRole - Ruolo di destinazione
 * @returns {Array} Array del percorso più breve
 */
export function findShortestPath(fromRole, toRole) {
  if (!roleExists(fromRole) || !roleExists(toRole)) {
    return [];
  }
  
  const fromPath = calculatePath(fromRole);
  const toPath = calculatePath(toRole);
  
  // Trova il punto di convergenza comune
  let commonAncestor = null;
  let commonIndex = -1;
  
  for (let i = 0; i < Math.min(fromPath.length, toPath.length); i++) {
    if (fromPath[i] === toPath[i]) {
      commonAncestor = fromPath[i];
      commonIndex = i;
    } else {
      break;
    }
  }
  
  if (!commonAncestor) return [];
  
  // Costruisce il percorso: da fromRole al comune antenato, poi al toRole
  const upPath = fromPath.slice(commonIndex).reverse();
  const downPath = toPath.slice(commonIndex + 1);
  
  return [...upPath, ...downPath];
}

/**
 * Calcola la distanza gerarchica tra due ruoli
 * @param {string} role1 - Primo ruolo
 * @param {string} role2 - Secondo ruolo
 * @returns {number} Distanza gerarchica (differenza di livelli)
 */
export function calculateHierarchicalDistance(role1, role2) {
  const level1 = getRoleLevel(role1);
  const level2 = getRoleLevel(role2);
  
  return Math.abs(level1 - level2);
}

/**
 * Verifica se due ruoli sono allo stesso livello gerarchico
 * @param {string} role1 - Primo ruolo
 * @param {string} role2 - Secondo ruolo
 * @returns {boolean} True se sono allo stesso livello
 */
export function areSameLevel(role1, role2) {
  return getRoleLevel(role1) === getRoleLevel(role2);
}

/**
 * Ottiene tutti i ruoli "fratelli" (stesso livello e stesso genitore)
 * @param {string} roleType - Tipo di ruolo
 * @returns {Array} Array di ruoli fratelli
 */
export function getSiblingRoles(roleType) {
  const roleInfo = ROLE_HIERARCHY[roleType];
  if (!roleInfo) return [];
  
  const parent = roleInfo.parent;
  const level = roleInfo.level;
  
  return Object.entries(ROLE_HIERARCHY)
    .filter(([type, data]) => 
      type !== roleType && 
      data.level === level && 
      data.parent === parent
    )
    .map(([type]) => type);
}