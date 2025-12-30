/**
 * PersonDetails Types - Types, interfaces and constants
 * @module pages/management/persons/person-details/types
 */

// Role types from Prisma schema
export const ROLE_TYPES = [
    'EMPLOYEE',
    'MANAGER',
    'HR_MANAGER',
    'DEPARTMENT_HEAD',
    'TRAINER',
    'SENIOR_TRAINER',
    'TRAINER_COORDINATOR',
    'EXTERNAL_TRAINER',
    'SUPER_ADMIN',
    'ADMIN',
    'COMPANY_ADMIN',
    'TENANT_ADMIN',
    'VIEWER',
    'OPERATOR',
    'COORDINATOR',
    'SUPERVISOR',
    'GUEST',
    'CONSULTANT',
    'AUDITOR',
    'TRAINING_ADMIN',
    'CLINIC_ADMIN',
    'COMPANY_MANAGER',
    'MEDICO',
    'PAZIENTE',
    'INFERMIERE',
    'SEGRETERIA_CLINICA',
] as const;

export const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'] as const;

export const ROLE_LABELS: Record<string, string> = {
    EMPLOYEE: 'Dipendente',
    MANAGER: 'Manager',
    HR_MANAGER: 'HR Manager',
    DEPARTMENT_HEAD: 'Responsabile Reparto',
    TRAINER: 'Formatore',
    SENIOR_TRAINER: 'Formatore Senior',
    TRAINER_COORDINATOR: 'Coordinatore Formatori',
    EXTERNAL_TRAINER: 'Formatore Esterno',
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    COMPANY_ADMIN: 'Admin Azienda',
    TENANT_ADMIN: 'Admin Tenant',
    VIEWER: 'Visualizzatore',
    OPERATOR: 'Operatore',
    COORDINATOR: 'Coordinatore',
    SUPERVISOR: 'Supervisore',
    GUEST: 'Ospite',
    CONSULTANT: 'Consulente',
    AUDITOR: 'Revisore',
    TRAINING_ADMIN: 'Admin Formazione',
    CLINIC_ADMIN: 'Admin Clinica',
    COMPANY_MANAGER: 'Manager Aziendale',
    MEDICO: 'Medico',
    PAZIENTE: 'Paziente',
    INFERMIERE: 'Infermiere',
    SEGRETERIA_CLINICA: 'Segreteria Clinica',
};

export const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    TRAINER: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    EMPLOYEE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    MEDICO: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

export const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export const ACCESS_LEVEL_COLORS: Record<string, string> = {
    FULL: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    WRITE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    READ: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

export const ACCESS_LEVEL_LABELS: Record<string, string> = {
    FULL: 'Completo',
    ADMIN: 'Admin',
    WRITE: 'Scrittura',
    READ: 'Lettura',
};

// Interfaces
export interface PersonRole {
    id: string;
    roleType: string;
    isActive: boolean;
    isPrimary: boolean;
    companyId?: string;
    tenantId: string;
    assignedAt: string;
}

export interface TenantAccess {
    id: string;
    tenantId: string;
    accessLevel: string;
    roleType?: string;
    isPrimary: boolean;
    tenant?: {
        id: string;
        name: string;
    };
}

export interface Company {
    id: string;
    name: string;
    ragioneSociale?: string;
}

export interface Site {
    id: string;
    siteName: string;
    citta?: string;
}

export interface Tenant {
    id: string;
    name: string;
}

export interface PersonData {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    birthDate?: string;
    taxCode?: string;
    vatNumber?: string;
    residenceAddress?: string;
    residenceCity?: string;
    postalCode?: string;
    province?: string;
    username?: string;
    status: string;
    title?: string;
    hiredDate?: string;
    hourlyRate?: number;
    iban?: string;
    registerCode?: string;
    certifications?: string[];
    specialties?: string[];
    profileImage?: string;
    notes?: string;
    lastLogin?: string;
    failedAttempts?: number;
    globalRole?: string;
    tenantId: string;
    companyId?: string;
    siteId?: string;
    reparto?: string;
    createdAt: string;
    updatedAt: string;
    gdprConsentDate?: string;
    gdprConsentVersion?: string;
    dataRetentionUntil?: string;
    // Relations
    company?: Company;
    site?: Site;
    tenant?: {
        id: string;
        name: string;
    };
    personRoles?: PersonRole[];
    tenantAccesses?: TenantAccess[];
}

// Utility types
export type AccessLevel = 'READ' | 'WRITE' | 'ADMIN' | 'FULL';

export interface NewTenantAccess {
    tenantId: string;
    accessLevel: AccessLevel;
    defaultRoleType: string;
}
