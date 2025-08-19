/**
 * Servizio per la gestione della gerarchia dei ruoli
 * Implementa i filtri per employees e trainers secondo le regole del progetto
 */

export interface PersonRole {
  id: string;
  roleType: string;
  isActive: boolean;
  company?: {
    id: string;
    ragioneSociale: string;
  };
  assignedAt: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  taxCode?: string;
  roles: PersonRole[];
  company?: {
    id: string;
    ragioneSociale: string;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterConfig {
  minRoleLevel: number;
  maxRoleLevel: number;
  roleTypes?: string[];
}

/**
 * Gerarchia dei ruoli secondo il planning dettagliato
 * Livelli più bassi = maggiore autorità
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  'SUPER_ADMIN': 0,
  'ADMIN': 1,
  'COMPANY_ADMIN': 2,        // "Responsabile Aziendale"
  'HR_MANAGER': 3,
  'MANAGER': 3,
  'TRAINER_COORDINATOR': 4,  // "Coordinatore Formatori"
  'SENIOR_TRAINER': 5,
  'TRAINER': 6,
  'EXTERNAL_TRAINER': 6,
  'EMPLOYEE': 8
};

/**
 * Configurazioni predefinite per i filtri
 */
export const FILTER_CONFIGS = {
  // Employees: COMPANY_ADMIN (2) o inferiore (livelli più alti)
  employees: {
    minRoleLevel: 2,
    maxRoleLevel: 8,
    roleTypes: ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'TRAINER_COORDINATOR', 'SENIOR_TRAINER', 'TRAINER', 'EMPLOYEE'] as string[]
  } as FilterConfig,
  
  // Trainers: TRAINER_COORDINATOR (4) o inferiore (livelli più alti)
  trainers: {
    minRoleLevel: 4,
    maxRoleLevel: 6,
    roleTypes: ['TRAINER_COORDINATOR', 'SENIOR_TRAINER', 'TRAINER', 'EXTERNAL_TRAINER'] as string[]
  } as FilterConfig
};

/**
 * Filtra le persone in base alla gerarchia dei ruoli
 * Una persona appare nel filtro se ha ALMENO UN ruolo attivo nel range specificato
 */
export const filterPersonsByRoleLevel = (
  persons: Person[], 
  minLevel: number, 
  maxLevel: number
): Person[] => {
  return persons.filter(person => 
    person.roles.some(role => {
      if (!role.isActive) return false;
      
      const level = ROLE_HIERARCHY[role.roleType];
      return level !== undefined && level >= minLevel && level <= maxLevel;
    })
  );
};

/**
 * Filtra le persone per il ramo "Employees"
 * Include persone con ruoli da COMPANY_ADMIN in giù
 */
export const filterEmployees = (persons: Person[]): Person[] => {
  const config = FILTER_CONFIGS.employees;
  return filterPersonsByRoleLevel(persons, config.minRoleLevel, config.maxRoleLevel);
};

/**
 * Filtra le persone per il ramo "Trainers"
 * Include persone con ruoli da TRAINER_COORDINATOR in giù
 */
export const filterTrainers = (persons: Person[]): Person[] => {
  const config = FILTER_CONFIGS.trainers;
  return filterPersonsByRoleLevel(persons, config.minRoleLevel, config.maxRoleLevel);
};

/**
 * Ottiene il nome visualizzato per un ruolo
 */
export const getRoleDisplayName = (roleType: string): string => {
  const roleNames: Record<string, string> = {
    'SUPER_ADMIN': 'Super Admin',
    'ADMIN': 'Amministratore',
    'COMPANY_ADMIN': 'Responsabile Aziendale',
    'HR_MANAGER': 'Manager HR',
    'MANAGER': 'Manager',
    'TRAINER_COORDINATOR': 'Coordinatore Formatori',
    'SENIOR_TRAINER': 'Formatore Senior',
    'TRAINER': 'Formatore',
    'EXTERNAL_TRAINER': 'Formatore Esterno',
    'EMPLOYEE': 'Dipendente'
  };
  
  return roleNames[roleType] || roleType;
};

/**
 * Ottiene il roleType dal nome visualizzato (mappatura inversa)
 */
export const getRoleTypeFromDisplayName = (displayName: string): string => {
  const displayNameToRoleType: Record<string, string> = {
    'Super Admin': 'SUPER_ADMIN',
    'Amministratore': 'ADMIN',
    'Responsabile Aziendale': 'COMPANY_ADMIN',
    'Manager HR': 'HR_MANAGER',
    'Manager': 'MANAGER',
    'Coordinatore Formatori': 'TRAINER_COORDINATOR',
    'Formatore Senior': 'SENIOR_TRAINER',
    'Formatore': 'TRAINER',
    'Formatore Esterno': 'EXTERNAL_TRAINER',
    'Dipendente': 'EMPLOYEE'
  };
  
  return displayNameToRoleType[displayName] || displayName;
};

/**
 * Ottiene il livello di un ruolo
 */
export const getRoleLevel = (roleType: string): number => {
  return ROLE_HIERARCHY[roleType] ?? 999;
};

/**
 * Verifica se una persona ha un ruolo specifico attivo
 */
export const hasActiveRole = (person: Person, roleType: string): boolean => {
  return person.roles.some(role => role.roleType === roleType && role.isActive);
};

/**
 * Ottiene tutti i ruoli attivi di una persona
 */
export const getActiveRoles = (person: Person): PersonRole[] => {
  if (!person.roles || !Array.isArray(person.roles)) {
    return [];
  }
  return person.roles.filter(role => role.isActive);
};

/**
 * Ottiene il ruolo con il livello più alto (numero più basso) di una persona
 */
export const getHighestRole = (person: Person): PersonRole | null => {
  const activeRoles = getActiveRoles(person);
  if (activeRoles.length === 0) return null;
  
  return activeRoles.reduce((highest, current) => {
    const currentLevel = getRoleLevel(current.roleType);
    const highestLevel = getRoleLevel(highest.roleType);
    return currentLevel < highestLevel ? current : highest;
  });
};

/**
 * Verifica se una persona rientra in entrambi i rami (employees e trainers)
 */
export function isInBothBranches(person: Person): boolean {
  const employeeRoleTypes = FILTER_CONFIGS.employees?.roleTypes;
  const trainerRoleTypes = FILTER_CONFIGS.trainers?.roleTypes;
  
  if (!employeeRoleTypes || !trainerRoleTypes) {
    return false;
  }
  
  const activeRoles = getActiveRoles(person);
  const hasEmployeeRole = activeRoles.some(role => 
    employeeRoleTypes.includes(role.roleType as any)
  );
  const hasTrainerRole = activeRoles.some(role => 
    trainerRoleTypes.includes(role.roleType as any)
  );
  
  return hasEmployeeRole && hasTrainerRole;
}

/**
 * Applica un filtro personalizzato alle persone
 */
export const applyCustomFilter = (persons: Person[], filterConfig: FilterConfig): Person[] => {
  return filterPersonsByRoleLevel(persons, filterConfig.minRoleLevel, filterConfig.maxRoleLevel);
};