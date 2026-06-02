import React from 'react';

/**
 * Tipi di relazione disponibili per lo scope "relational"
 */
export type RelationType =
  | 'TRAINER_COURSES'      // Formatore → Corsi tenuti → Iscritti/Aziende
  | 'COMPANY_MANAGER'      // Manager → Azienda → Dipendenti
  | 'DEPARTMENT_HEAD'      // Capo Reparto → Reparto → Dipendenti
  | 'SITE_MANAGER'         // Responsabile Sito → Sito → Dipendenti
  | 'MEDICO_COMPETENTE'    // Medico → Siti assegnati → Dipendenti
  | 'RSPP'                 // RSPP → Siti assegnati → Dipendenti/DVR
  | 'CONSULTANT'           // Consulente → Aziende clienti → Documenti
  | 'AUDITOR'              // Auditor → Aziende assegnate → Reports
  // P69: Clinical/Poliambulatorio relation types
  | 'MEDICO_AMBULATORIO'         // Medico → Ambulatori assegnati → Appuntamenti/Visite
  | 'MEDICO_PAZIENTI'            // Medico → Pazienti assegnati → Visite/Referti/Documenti
  | 'MEDICO_PRESTAZIONI'         // Medico → Prestazioni abilitate → Appuntamenti
  | 'CLINIC_ADMIN_POLIAMBULATORIO' // Admin Clinica → Poliambulatorio → Tutte le risorse cliniche
  | 'AMBULATORIO_STRUMENTI'      // Ambulatorio → Strumenti assegnati
  | 'CONVENZIONE_AZIENDA';       // Convenzione → Azienda convenzionata → Tariffari

/**
 * Scope disponibili per i permessi
 */
export type PermissionScope = 'none' | 'all' | 'tenant' | 'own' | 'relational';

export interface EntityPermission {
  entity: string;
  action: string;
  scope: PermissionScope;
  fields?: string[];                // Campi permessi (allowedFields)
  deniedFields?: string[];          // Campi negati
  tenantIds?: string[];             // Tenant.id è UUID string in Prisma
  granted?: boolean;                // Indica se il permesso è concesso o meno
  relationType?: RelationType;      // Tipo di relazione per scope "relational"
  relationConfig?: Record<string, unknown>; // Config aggiuntiva per relazioni complesse
  priority?: number;                // Per risoluzione conflitti (higher = more priority)
  isInherited?: boolean;            // Se ereditato da ruolo genitore
  sourceRoleId?: string;            // ID del ruolo da cui è stato ereditato
  allowCrossTenant?: boolean;       // P69: Se il permesso vale per tutti i tenant accessibili
}

export interface RolePermissions {
  roleType: string;
  permissions: EntityPermission[];
}

export interface EntityDefinition {
  id: string;
  name: string;
  displayName: string;
  fields: EntityField[];
  actions?: string[];
  icon?: React.ComponentType<any>;
}

export interface EntityField {
  id: string;
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'phone';
  sensitive?: boolean;
}

export interface PermissionsSummary {
  totalPermissions: number;
  entitiesWithPermissions: number;
  sensitiveFieldsAccess: number;
}

export type VirtualEntityName = 'EMPLOYEES' | 'TRAINERS';
export type PermissionAction = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE';

/**
 * Definizione di una relazione per lo scope "relational"
 */
export interface RelationDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string;
  baseEntity: string;
  targetEntities: string[];
  relationChain: RelationChainLink[];
  isActive: boolean;
  isSystem: boolean;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Link nella catena di relazione
 */
export interface RelationChainLink {
  from: string;
  to: string;
  via: string;
  viaField?: string;
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
}

/**
 * Risultato del test data filter
 */
export interface DataFilterTestResult {
  allowed: boolean;
  permission?: {
    resource: string;
    action: string;
    scope: PermissionScope;
    relationType?: RelationType;
    allowedFields?: string[];
    deniedFields?: string[];
  };
  dataFilter?: {
    allowed: boolean;
    where?: Record<string, unknown>;
    relatedIds?: string[];
  };
  effectiveRoles?: string[];
  reason?: string;
}
