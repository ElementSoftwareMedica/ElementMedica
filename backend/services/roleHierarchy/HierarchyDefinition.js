/**
 * Definizioni statiche della gerarchia dei ruoli
 * Contiene la struttura gerarchica completa con livelli, relazioni e permessi
 */

/**
 * Definizione della gerarchia dei ruoli con livelli e relazioni parent-child
 * Livello più basso = maggiore autorità
 */
export const ROLE_HIERARCHY = {
  'SUPER_ADMIN': {
    level: 0,
    parent: null,
    name: 'Super Amministratore',
    description: 'Accesso completo a tutto il sistema',
    canAssignTo: ['ADMIN', 'COMPANY_ADMIN', 'TENANT_ADMIN', 'TRAINER', 'EMPLOYEE'],
    permissions: ['ALL_PERMISSIONS']
  },
  'ADMIN': {
    level: 1,
    parent: 'SUPER_ADMIN',
    name: 'Amministratore',
    description: 'Gestione completa del tenant',
    canAssignTo: ['COMPANY_ADMIN', 'TENANT_ADMIN', 'HR_MANAGER', 'MANAGER', 'TRAINER', 'EMPLOYEE'],
    permissions: [
      'ROLE_MANAGEMENT', 'USER_MANAGEMENT', 'TENANT_MANAGEMENT',
      'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES', 'VIEW_ROLES', 'EDIT_HIERARCHY',
      'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES', 'VIEW_ADMINISTRATION',
      'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY', 'HIERARCHY_MANAGEMENT',
      'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
      'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
      'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'VIEW_REPORTS', 'CREATE_REPORTS'
    ]
  },
  'COMPANY_ADMIN': {
    level: 2,
    parent: 'ADMIN',
    name: 'Amministratore Azienda',
    description: 'Gestione della propria azienda e dipendenti',
    canAssignTo: ['TRAINING_ADMIN', 'CLINIC_ADMIN', 'HR_MANAGER', 'MANAGER', 'TRAINER', 'EMPLOYEE'],
    permissions: [
      'CREATE_ROLES', 'EDIT_ROLES', 'VIEW_ROLES',
      'MANAGE_USERS', 'ASSIGN_ROLES', 'VIEW_HIERARCHY',
      'VIEW_COMPANIES', 'EDIT_COMPANIES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
      'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS'
    ]
  },
  'TENANT_ADMIN': {
    level: 2,
    parent: 'ADMIN',
    name: 'Amministratore Tenant',
    description: 'Gestione del tenant',
    canAssignTo: ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'TRAINER', 'EMPLOYEE'],
    permissions: [
      'TENANT_MANAGEMENT',
      'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES', 'VIEW_ROLES', 'EDIT_HIERARCHY',
      'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES', 'VIEW_ADMINISTRATION',
      'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'DELETE_HIERARCHY', 'MANAGE_HIERARCHY',
      'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
      'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES'
    ]
  },
  'TRAINING_ADMIN': {
    level: 3,
    parent: 'COMPANY_ADMIN',
    name: 'Amministratore Formazione & Lavoro',
    description: 'Gestione completa formazione e lavoro',
    canAssignTo: ['MANAGER', 'HR_MANAGER', 'TRAINER_COORDINATOR'],
    permissions: [
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
      'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS'
    ]
  },
  'CLINIC_ADMIN': {
    level: 3,
    parent: 'COMPANY_ADMIN',
    name: 'Amministratore Poliambulatorio',
    description: 'Gestione completa poliambulatorio',
    canAssignTo: ['MANAGER', 'DEPARTMENT_HEAD', 'SUPERVISOR'],
    permissions: [
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
      'VIEW_PATIENTS', 'CREATE_PATIENTS', 'EDIT_PATIENTS',
      'VIEW_APPOINTMENTS', 'CREATE_APPOINTMENTS', 'EDIT_APPOINTMENTS',
      'VIEW_MEDICAL_RECORDS', 'CREATE_MEDICAL_RECORDS', 'EDIT_MEDICAL_RECORDS',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
      'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS'
    ]
  },
  'HR_MANAGER': {
    level: 4,
    parent: 'TRAINING_ADMIN',
    name: 'Manager HR',
    description: 'Gestione risorse umane',
    canAssignTo: ['TRAINER_COORDINATOR', 'COMPANY_MANAGER', 'SUPERVISOR', 'EMPLOYEE'],
    permissions: [
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
      'VIEW_COURSES', 'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS'
    ]
  },
  'MANAGER': {
    level: 4,
    parent: 'TRAINING_ADMIN',
    name: 'Manager',
    description: 'Gestione operativa e coordinamento',
    canAssignTo: ['DEPARTMENT_HEAD', 'HR_MANAGER', 'TRAINER_COORDINATOR', 'SUPERVISOR'],
    permissions: [
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS',
      'VIEW_REPORTS'
    ]
  },
  'DEPARTMENT_HEAD': {
    level: 4,
    parent: 'MANAGER',
    name: 'Responsabile Dipartimento',
    description: 'Gestione dipartimento specifico',
    canAssignTo: ['SUPERVISOR', 'COORDINATOR', 'TRAINER'],
    permissions: [
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS'
    ]
  },
  'TRAINER_COORDINATOR': {
    level: 5,
    parent: 'HR_MANAGER',
    name: 'Coordinatore Formatori',
    description: 'Coordinamento attività formative',
    canAssignTo: ['SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER'],
    permissions: [
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS'
    ]
  },
  'COMPANY_MANAGER': {
    level: 5,
    parent: 'HR_MANAGER',
    name: 'Responsabile Aziendale',
    description: 'Responsabilità aziendali specifiche',
    canAssignTo: ['SUPERVISOR', 'COORDINATOR', 'EMPLOYEE'],
    permissions: [
      'VIEW_EMPLOYEES', 'EDIT_EMPLOYEES',
      'VIEW_COURSES', 'EDIT_COURSES',
      'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS',
      'VIEW_REPORTS'
    ]
  },
  'SENIOR_TRAINER': {
    level: 6,
    parent: 'TRAINER_COORDINATOR',
    name: 'Formatore Senior',
    description: 'Formazione avanzata e mentoring',
    canAssignTo: ['TRAINER', 'EXTERNAL_TRAINER'],
    permissions: [
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES',
      'VIEW_EMPLOYEES', 'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS'
    ]
  },
  'TRAINER': {
    level: 7,
    parent: 'SENIOR_TRAINER',
    name: 'Formatore',
    description: 'Gestione corsi e formazione',
    canAssignTo: ['EMPLOYEE'],
    permissions: [
      'VIEW_COURSES', 'EDIT_COURSES',
      'VIEW_EMPLOYEES', 'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS'
    ]
  },
  'EXTERNAL_TRAINER': {
    level: 7,
    parent: 'SENIOR_TRAINER',
    name: 'Formatore Esterno',
    description: 'Formazione specialistica esterna',
    canAssignTo: [],
    permissions: [
      'VIEW_COURSES', 'VIEW_DOCUMENTS'
    ]
  },
  'SUPERVISOR': {
    level: 5,
    parent: 'DEPARTMENT_HEAD',
    name: 'Supervisore',
    description: 'Supervisione operativa',
    canAssignTo: ['COORDINATOR', 'OPERATOR', 'EMPLOYEE'],
    permissions: [
      'VIEW_EMPLOYEES', 'EDIT_EMPLOYEES',
      'VIEW_COURSES', 'VIEW_DOCUMENTS'
    ]
  },
  'COORDINATOR': {
    level: 6,
    parent: 'SUPERVISOR',
    name: 'Coordinatore',
    description: 'Coordinamento attività',
    canAssignTo: ['OPERATOR', 'EMPLOYEE'],
    permissions: [
      'VIEW_EMPLOYEES',
      'VIEW_COURSES', 'VIEW_DOCUMENTS'
    ]
  },
  'OPERATOR': {
    level: 7,
    parent: 'COORDINATOR',
    name: 'Operatore',
    description: 'Operazioni base',
    canAssignTo: ['EMPLOYEE'],
    permissions: [
      'VIEW_COURSES', 'VIEW_DOCUMENTS'
    ]
  },
  'EMPLOYEE': {
    level: 8,
    parent: 'OPERATOR',
    name: 'Dipendente',
    description: 'Accesso base alle funzionalità',
    canAssignTo: ['VIEWER'],
    permissions: [
      'VIEW_COURSES', 'VIEW_DOCUMENTS'
    ]
  },
  'VIEWER': {
    level: 9,
    parent: 'EMPLOYEE',
    name: 'Visualizzatore',
    description: 'Solo visualizzazione',
    canAssignTo: ['GUEST'],
    permissions: [
      'VIEW_COURSES', 'VIEW_DOCUMENTS'
    ]
  },
  'GUEST': {
    level: 10,
    parent: 'VIEWER',
    name: 'Ospite',
    description: 'Accesso limitato',
    canAssignTo: [],
    permissions: [
      'VIEW_COURSES'
    ]
  },
  'CONSULTANT': {
    level: 7,
    parent: 'COORDINATOR',
    name: 'Consulente',
    description: 'Consulenza specialistica',
    canAssignTo: [],
    permissions: [
      'VIEW_COURSES', 'VIEW_DOCUMENTS', 'VIEW_REPORTS'
    ]
  },
  'AUDITOR': {
    level: 5,
    parent: 'MANAGER',
    name: 'Auditor',
    description: 'Controllo e audit',
    canAssignTo: [],
    permissions: [
      'VIEW_REPORTS', 'VIEW_DOCUMENTS', 'VIEW_EMPLOYEES'
    ]
  }
};

/**
 * Ottiene il livello gerarchico di un ruolo
 * @param {string} roleType - Tipo di ruolo
 * @returns {number} Livello gerarchico (0 = massima autorità)
 */
export function getRoleLevel(roleType) {
  return ROLE_HIERARCHY[roleType]?.level || 999;
}

/**
 * Ottiene il ruolo padre predefinito
 * @param {string} roleType - Tipo di ruolo
 * @returns {string|null} Tipo di ruolo padre
 */
export function getDefaultParentRole(roleType) {
  return ROLE_HIERARCHY[roleType]?.parent || null;
}

/**
 * Ottiene i ruoli che un determinato ruolo può assegnare
 * @param {string} roleType - Tipo di ruolo
 * @returns {Array} Array di ruoli assegnabili
 */
export function getAssignableRoles(roleType) {
  const roleInfo = ROLE_HIERARCHY[roleType];
  if (!roleInfo) return [];
  
  return roleInfo.canAssignTo.map(targetRole => ({
    type: targetRole,
    ...ROLE_HIERARCHY[targetRole]
  }));
}

/**
 * Ottiene i permessi di un ruolo
 * @param {string} roleType - Tipo di ruolo
 * @returns {Array} Array di permessi
 */
export function getRolePermissions(roleType) {
  return ROLE_HIERARCHY[roleType]?.permissions || [];
}

/**
 * Verifica se un ruolo esiste nella gerarchia
 * @param {string} roleType - Tipo di ruolo
 * @returns {boolean} True se il ruolo esiste
 */
export function roleExists(roleType) {
  return !!ROLE_HIERARCHY[roleType];
}

/**
 * Ottiene tutte le informazioni di un ruolo
 * @param {string} roleType - Tipo di ruolo
 * @returns {Object|null} Informazioni del ruolo o null se non esiste
 */
export function getRoleInfo(roleType) {
  return ROLE_HIERARCHY[roleType] || null;
}

/**
 * Ottiene tutti i tipi di ruolo disponibili
 * @returns {Array} Array di tutti i tipi di ruolo
 */
export function getAllRoleTypes() {
  return Object.keys(ROLE_HIERARCHY);
}

/**
 * Ottiene tutti i ruoli di un determinato livello
 * @param {number} level - Livello gerarchico
 * @returns {Array} Array di ruoli del livello specificato
 */
export function getRolesByLevel(level) {
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, roleData]) => roleData.level === level)
    .map(([roleType, roleData]) => ({ type: roleType, ...roleData }));
}

// Timestamp per forzare il ricaricamento del modulo: 2025-02-01T06:30:00.000Z
export const MODULE_TIMESTAMP = '2025-02-01T06:30:00.000Z';