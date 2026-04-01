/**
 * Servizio per la gestione della gerarchia dei ruoli
 * Implementa i filtri per employees e trainers secondo le regole del progetto
 */

import type { PersonTenantProfile } from '../types/personMultiTenant';

export interface PersonRole {
  id: string;
  roleType: string;
  isActive: boolean;
  deletedAt?: string;
  professionalProfile?: string;
  hiringDate?: string;
  company?: {
    id: string;
    ragioneSociale: string;
  };
  assignedAt: string;
}

/**
 * Person - Interfaccia unificata che supporta sia il modello legacy che il nuovo modello multi-tenant
 * Progetto 48: Aggiunto supporto per tenantProfiles e currentProfile
 */
export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  taxCode?: string;
  roles: PersonRole[];
  personRoles?: PersonRole[];
  company?: {
    id: string;
    ragioneSociale: string;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'TERMINATED';
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Campi opzionali estesi per la UI
  title?: string;
  birthDate?: string;
  birthPlace?: string;      // Progetto 48
  birthProvince?: string;   // Progetto 48
  site?: { id: string; name?: string; siteName?: string; citta?: string };
  hiredDate?: string;
  certifications?: Array<{ id: string; name: string; expiresAt?: string }> | string[];
  specialties?: string[];   // Progetto 48
  residenceCity?: string;
  hourlyRate?: number | string;
  iban?: string;            // Progetto 48
  // Progetto 48: Nuovi campi per multi-tenant
  tenantId?: string;
  tenantProfiles?: PersonTenantProfile[];
  currentProfile?: PersonTenantProfile;
  companyId?: string;
  siteId?: string;
  repartoId?: string;
  // Mansioni attive del lavoratore
  mansioni?: Array<{
    id: string;
    mansioneId: string;
    denominazione?: string;
    codice?: string;
    isPrimaria?: boolean;
  }>;
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
  'TENANT_ADMIN': 1,
  'COMPANY_ADMIN': 2,        // "Responsabile Aziendale"
  'TRAINING_ADMIN': 2,
  'CLINIC_ADMIN': 2,
  'HR_MANAGER': 3,
  'MANAGER': 3,
  'COMPANY_MANAGER': 3,
  'DEPARTMENT_HEAD': 4,
  'TRAINER_COORDINATOR': 4,  // "Coordinatore Formatori"
  'COORDINATOR': 4,
  'SUPERVISOR': 5,
  'SENIOR_TRAINER': 5,
  'TRAINER': 6,
  'EXTERNAL_TRAINER': 6,
  'OPERATOR': 7,
  'VIEWER': 7,
  'CONSULTANT': 7,
  'AUDITOR': 7,
  'GUEST': 8,
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
    'TENANT_ADMIN': 'Tenant Admin',
    'COMPANY_ADMIN': 'Responsabile Aziendale',
    'TRAINING_ADMIN': 'Admin Formazione',
    'CLINIC_ADMIN': 'Admin Clinica',
    'HR_MANAGER': 'Manager HR',
    'MANAGER': 'Manager',
    'COMPANY_MANAGER': 'Company Manager',
    'DEPARTMENT_HEAD': 'Responsabile Reparto',
    'TRAINER_COORDINATOR': 'Coordinatore Formatori',
    'COORDINATOR': 'Coordinatore',
    'SUPERVISOR': 'Supervisore',
    'SENIOR_TRAINER': 'Formatore Senior',
    'TRAINER': 'Formatore',
    'EXTERNAL_TRAINER': 'Formatore Esterno',
    'OPERATOR': 'Operatore',
    'VIEWER': 'Visualizzatore',
    'CONSULTANT': 'Consulente',
    'AUDITOR': 'Auditor',
    'GUEST': 'Ospite',
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
    'Admin': 'ADMIN',
    'Tenant Admin': 'TENANT_ADMIN',
    'Responsabile Aziendale': 'COMPANY_ADMIN',
    'Company Admin': 'COMPANY_ADMIN',
    'Admin Formazione': 'TRAINING_ADMIN',
    'Training Admin': 'TRAINING_ADMIN',
    'Admin Clinica': 'CLINIC_ADMIN',
    'Clinic Admin': 'CLINIC_ADMIN',
    'Manager HR': 'HR_MANAGER',
    'Hr Manager': 'HR_MANAGER',
    'Manager': 'MANAGER',
    'Company Manager': 'COMPANY_MANAGER',
    'Responsabile Reparto': 'DEPARTMENT_HEAD',
    'Department Head': 'DEPARTMENT_HEAD',
    'Coordinatore Formatori': 'TRAINER_COORDINATOR',
    'Trainer Coordinator': 'TRAINER_COORDINATOR',
    'Coordinatore': 'COORDINATOR',
    'Coordinator': 'COORDINATOR',
    'Supervisore': 'SUPERVISOR',
    'Supervisor': 'SUPERVISOR',
    'Formatore Senior': 'SENIOR_TRAINER',
    'Senior Trainer': 'SENIOR_TRAINER',
    'Formatore': 'TRAINER',
    'Trainer': 'TRAINER',
    'Formatore Esterno': 'EXTERNAL_TRAINER',
    'External Trainer': 'EXTERNAL_TRAINER',
    'Operatore': 'OPERATOR',
    'Operator': 'OPERATOR',
    'Visualizzatore': 'VIEWER',
    'Viewer': 'VIEWER',
    'Consulente': 'CONSULTANT',
    'Consultant': 'CONSULTANT',
    'Auditor': 'AUDITOR',
    'Ospite': 'GUEST',
    'Guest': 'GUEST',
    'Dipendente': 'EMPLOYEE',
    'Employee': 'EMPLOYEE'
  };

  // Prima cerca nella mappatura esatta
  if (displayNameToRoleType[displayName]) {
    return displayNameToRoleType[displayName];
  }

  // Se non trova, verifica se è già un roleType valido (tutto maiuscolo con underscore)
  if (/^[A-Z_]+$/.test(displayName)) {
    return displayName;
  }

  // Ultimo fallback: ritorna il displayName come è
  return displayName;
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
 * Supporta sia il campo `roles` (dopo mapAliases) che `personRoles` (risposta API diretta)
 */
export const getActiveRoles = (person: Person): PersonRole[] => {
  // Fallback su personRoles quando roles è assente/vuoto (es. dati da GDPREntityTemplate senza mapAliases)
  const source = (person.roles?.length ? person.roles : person.personRoles) ?? [];
  if (!Array.isArray(source)) {
    return [];
  }
  return source.filter(role => role.isActive);
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
    employeeRoleTypes.includes(role.roleType as string)
  );
  const hasTrainerRole = activeRoles.some(role =>
    trainerRoleTypes.includes(role.roleType as string)
  );

  return hasEmployeeRole && hasTrainerRole;
}

/**
 * Applica un filtro personalizzato alle persone
 */
export const applyCustomFilter = (persons: Person[], filterConfig: FilterConfig): Person[] => {
  return filterPersonsByRoleLevel(persons, filterConfig.minRoleLevel, filterConfig.maxRoleLevel);
};