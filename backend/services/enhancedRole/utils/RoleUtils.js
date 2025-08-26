import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Utility per la gestione dei ruoli
 * Modulo estratto da EnhancedRoleService per migliorare la manutenibilità
 */

/**
 * Determina lo scope di un ruolo basato sul tipo
 */
export function determineRoleScope(roleType, companyId = null) {
  const globalRoles = ['SUPER_ADMIN', 'ADMIN'];
  const tenantRoles = ['TENANT_ADMIN'];
  const companyRoles = ['COMPANY_ADMIN', 'MANAGER', 'HR_MANAGER', 'TRAINER', 'SENIOR_TRAINER', 'EMPLOYEE', 'VIEWER'];

  if (globalRoles.includes(roleType)) {
    return 'GLOBAL';
  } else if (tenantRoles.includes(roleType)) {
    return 'TENANT';
  } else if (companyRoles.includes(roleType)) {
    return companyId ? 'COMPANY' : 'TENANT';
  }

  return 'TENANT'; // Default
}

/**
 * Valida i parametri per l'assegnazione di un ruolo
 */
export function validateRoleAssignment(personId, roleType, tenantId, companyId = null) {
  const errors = [];

  if (!personId) {
    errors.push('Person ID is required');
  }

  if (!roleType) {
    errors.push('Role type is required');
  }

  if (!tenantId) {
    errors.push('Tenant ID is required');
  }

  // Importa ROLE_TYPES dinamicamente per evitare dipendenze circolari
  import('../utils/RoleTypes.js').then(({ ROLE_TYPES }) => {
    if (roleType && !Object.values(ROLE_TYPES).includes(roleType)) {
      errors.push(`Invalid role type: ${roleType}`);
    }
  });

  // Verifica che i ruoli company abbiano un companyId
  const companyRoles = ['COMPANY_ADMIN', 'MANAGER', 'HR_MANAGER', 'TRAINER', 'SENIOR_TRAINER', 'EMPLOYEE', 'VIEWER'];
  if (companyRoles.includes(roleType) && !companyId) {
    errors.push(`Role ${roleType} requires a company ID`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Normalizza i dati di un ruolo per la risposta
 */
export function normalizeRoleData(role) {
  if (!role) return null;

  return {
    id: role.id,
    personId: role.personId,
    roleType: role.roleType,
    scope: role.scope,
    tenantId: role.tenantId,
    companyId: role.companyId,
    isPrimary: role.isPrimary,
    isActive: role.isActive,
    assignedAt: role.assignedAt,
    assignedBy: role.assignedBy,
    validUntil: role.validUntil,
    metadata: role.metadata,
    // Includi dati relazionali se presenti
    person: role.person ? {
      id: role.person.id,
      firstName: role.person.firstName,
      lastName: role.person.lastName,
      email: role.person.email
    } : undefined,
    company: role.company ? {
      id: role.company.id,
      name: role.company.name
    } : undefined,
    tenant: role.tenant ? {
      id: role.tenant.id,
      name: role.tenant.name
    } : undefined
  };
}

/**
 * Filtra i ruoli in base ai criteri specificati
 */
export function filterRoles(roles, criteria = {}) {
  let filteredRoles = [...roles];

  if (criteria.isActive !== undefined) {
    filteredRoles = filteredRoles.filter(role => role.isActive === criteria.isActive);
  }

  if (criteria.roleTypes && criteria.roleTypes.length > 0) {
    filteredRoles = filteredRoles.filter(role => criteria.roleTypes.includes(role.roleType));
  }

  if (criteria.scope) {
    filteredRoles = filteredRoles.filter(role => role.scope === criteria.scope);
  }

  if (criteria.companyId) {
    filteredRoles = filteredRoles.filter(role => role.companyId === criteria.companyId);
  }

  if (criteria.isPrimary !== undefined) {
    filteredRoles = filteredRoles.filter(role => role.isPrimary === criteria.isPrimary);
  }

  if (criteria.validOnly) {
    const now = new Date();
    filteredRoles = filteredRoles.filter(role => 
      !role.validUntil || role.validUntil > now
    );
  }

  return filteredRoles;
}

/**
 * Ordina i ruoli secondo una priorità predefinita
 */
export function sortRolesByPriority(roles) {
  const rolePriority = {
    'SUPER_ADMIN': 1,
    'ADMIN': 2,
    'TENANT_ADMIN': 3,
    'COMPANY_ADMIN': 4,
    'HR_MANAGER': 5,
    'MANAGER': 6,
    'SENIOR_TRAINER': 7,
    'TRAINER': 8,
    'EMPLOYEE': 9,
    'VIEWER': 10
  };

  return roles.sort((a, b) => {
    const priorityA = rolePriority[a.roleType] || 999;
    const priorityB = rolePriority[b.roleType] || 999;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Se hanno la stessa priorità, ordina per isPrimary
    if (a.isPrimary !== b.isPrimary) {
      return b.isPrimary ? 1 : -1;
    }

    // Infine ordina per data di assegnazione
    return new Date(b.assignedAt) - new Date(a.assignedAt);
  });
}

/**
 * Verifica se un ruolo è scaduto
 */
export function isRoleExpired(role) {
  if (!role.validUntil) return false;
  return new Date(role.validUntil) < new Date();
}

/**
 * Verifica se un ruolo è valido (attivo e non scaduto)
 */
export function isRoleValid(role) {
  return role.isActive && !isRoleExpired(role);
}

/**
 * Ottiene il ruolo con priorità più alta da una lista
 */
export function getHighestPriorityRole(roles) {
  if (!roles || roles.length === 0) return null;
  
  const validRoles = roles.filter(isRoleValid);
  if (validRoles.length === 0) return null;

  const sortedRoles = sortRolesByPriority(validRoles);
  return sortedRoles[0];
}

/**
 * Genera metadati per un ruolo
 */
export function generateRoleMetadata(options = {}) {
  const metadata = {
    assignedAt: new Date().toISOString(),
    source: options.source || 'manual',
    reason: options.reason || null,
    assignedBy: options.assignedBy || null,
    originalRole: options.originalRole || null,
    migrationInfo: options.migrationInfo || null
  };

  // Rimuovi campi null/undefined
  Object.keys(metadata).forEach(key => {
    if (metadata[key] === null || metadata[key] === undefined) {
      delete metadata[key];
    }
  });

  return metadata;
}

/**
 * Verifica se due ruoli sono in conflitto
 */
export function areRolesConflicting(role1, role2) {
  // Due ruoli sono in conflitto se:
  // 1. Sono dello stesso tipo nello stesso scope
  // 2. Sono entrambi primari
  // 3. Hanno scope incompatibili

  if (role1.roleType === role2.roleType && 
      role1.scope === role2.scope && 
      role1.companyId === role2.companyId) {
    return true;
  }

  if (role1.isPrimary && role2.isPrimary) {
    return true;
  }

  // Verifica conflitti di scope (es. non si può essere ADMIN e EMPLOYEE contemporaneamente)
  const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'TENANT_ADMIN', 'COMPANY_ADMIN'];
  const isRole1Admin = adminRoles.includes(role1.roleType);
  const isRole2Admin = adminRoles.includes(role2.roleType);

  if (isRole1Admin && isRole2Admin && role1.roleType !== role2.roleType) {
    return true;
  }

  return false;
}

/**
 * Calcola la data di scadenza per un ruolo
 */
export function calculateRoleExpiration(roleType, options = {}) {
  const defaultDurations = {
    'SUPER_ADMIN': null, // Mai scade
    'ADMIN': null, // Mai scade
    'TENANT_ADMIN': null, // Mai scade
    'COMPANY_ADMIN': 365, // 1 anno
    'HR_MANAGER': 365, // 1 anno
    'MANAGER': 365, // 1 anno
    'SENIOR_TRAINER': 180, // 6 mesi
    'TRAINER': 180, // 6 mesi
    'EMPLOYEE': null, // Mai scade
    'VIEWER': 90 // 3 mesi
  };

  const duration = options.customDuration || defaultDurations[roleType];
  
  if (!duration) return null;

  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + duration);
  
  return expirationDate;
}

/**
 * Formatta un ruolo per la visualizzazione
 */
export function formatRoleForDisplay(role, options = {}) {
  const formatted = {
    id: role.id,
    type: role.roleType,
    scope: role.scope,
    status: isRoleValid(role) ? 'active' : (isRoleExpired(role) ? 'expired' : 'inactive'),
    isPrimary: role.isPrimary,
    assignedAt: role.assignedAt,
    validUntil: role.validUntil
  };

  if (options.includePersonInfo && role.person) {
    formatted.person = {
      name: `${role.person.firstName} ${role.person.lastName}`,
      email: role.person.email
    };
  }

  if (options.includeCompanyInfo && role.company) {
    formatted.company = {
      name: role.company.name
    };
  }

  if (options.includeMetadata && role.metadata) {
    formatted.metadata = role.metadata;
  }

  return formatted;
}

export default {
  determineRoleScope,
  validateRoleAssignment,
  normalizeRoleData,
  filterRoles,
  sortRolesByPriority,
  isRoleExpired,
  isRoleValid,
  getHighestPriorityRole,
  generateRoleMetadata,
  areRolesConflicting,
  calculateRoleExpiration,
  formatRoleForDisplay
};