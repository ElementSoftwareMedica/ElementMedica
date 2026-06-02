// Re-export template types
export * from './templates';
// Re-export multi-tenant Person types (Progetto 48)
export * from './personMultiTenant';

// Permission types
export interface Permission {
  resource: string;
  action: string;
  scope?: string;
}

// Company types - P49 Multi-Tenant Pattern
// Company globale + CompanyTenantProfile per tenant + CompanySite per sedi
export interface Company {
  // P49: IDs
  id: string; // Alias per companyTenantProfileId (backward compat)
  companyTenantProfileId?: string; // ID profilo tenant-specifico
  allCompanyTenantProfileIds?: string[]; // All CTP IDs across tenants (for multi-tenant matching)
  companyId?: string; // ID company globale

  // P49: Dati globali (da Company)
  ragioneSociale: string;
  piva?: string;
  codiceFiscale?: string;
  formaGiuridica?: string;
  sedeLegaleIndirizzo?: string;
  sedeLegaleCitta?: string;
  sedeLegaleCap?: string;
  sedeLegaleProvincia?: string;
  sedeLegaleNazione?: string;
  codiceAteco?: string;
  settore?: string;
  dimensione?: 'MICRO' | 'PICCOLA' | 'MEDIA' | 'GRANDE';
  sdi?: string;
  pecFatturazione?: string;

  // P49: Dati tenant-specifici (da CompanyTenantProfile)
  tenantId?: string;
  referenteId?: string;
  referenteRuolo?: string;
  emailGenerale?: string;
  telefonoGenerale?: string;
  pec?: string;
  dataInizioRapporto?: string;
  dataFineRapporto?: string;
  tipoContratto?: string;
  numeroContratto?: string;
  valoreContrattoAnnuo?: number | string;
  listinoPrezzi?: string;
  scontoPercentuale?: number | string;
  terminiPagamento?: string;
  modalitaPagamento?: string;
  iban?: string;
  noteCommerciali?: string;
  noteOperative?: string;
  noteInterne?: string;
  status?: 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CHURNED';
  isActive?: boolean;
  isPrimary?: boolean;
  dataShareConsent?: boolean;
  dataShareConsentDate?: string;

  // P49: Relazioni
  referente?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName?: string;
  };
  sites?: CompanySite[];
  tenant?: {
    id: string;
    name: string;
    slug?: string;
  };
  _count?: {
    sites?: number;
    personProfiles?: number;
  };

  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;

  // Legacy fields for backward compatibility (deprecated - use P49 fields)
  /** @deprecated Use emailGenerale */
  mail?: string;
  /** @deprecated Use telefonoGenerale */
  telefono?: string;
  /** @deprecated Use referenteId */
  personaRiferimento?: string;
  /** @deprecated Use sedeLegaleIndirizzo */
  sedeAzienda?: string;
  /** @deprecated Use sedeLegaleCitta */
  citta?: string;
  /** @deprecated Use sedeLegaleCap */
  cap?: string;
  /** @deprecated Use sedeLegaleProvincia */
  provincia?: string;
  /** @deprecated Use noteInterne */
  note?: string;
  nomeSede?: string;
  slug?: string;
  domain?: string;
  settings?: Record<string, unknown>;
  subscriptionPlan?: string;
  name?: string;
  industry?: string;
  location?: string;
  employeesCount?: number;
  establishedYear?: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  description?: string;
  vatNumber?: string;
  fiscalCode?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  notes?: string;
}

// CompanySite types - P49 Multi-Tenant Pattern
// Sedi operative collegate a CompanyTenantProfile
export interface CompanySite {
  id: string;
  companyTenantProfileId: string; // P49: FK a CompanyTenantProfile
  tenantId: string; // P49: per query dirette
  /** @deprecated Use companyTenantProfileId */
  companyId?: string; // Legacy alias

  siteName: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  numeroPAT?: string; // Posizione Assicurativa Territoriale INAIL
  telefono?: string;
  mail?: string;

  // P49: Referenti come FK a Person
  referenteId?: string;
  rsppId?: string;
  medicoCompetenteId?: string;

  // Documentazione sicurezza
  dvr?: string;
  dvrDataAggiornamento?: string;

  // Sopralluoghi generali
  ultimoSopralluogo?: string;
  prossimoSopralluogo?: string;
  valutazioneSopralluogo?: string;
  sopralluogoEseguitoDa?: string;

  // Sopralluoghi RSPP
  ultimoSopralluogoRSPP?: string;
  prossimoSopralluogoRSPP?: string;
  noteSopralluogoRSPP?: string;

  // Sopralluoghi Medico
  ultimoSopralluogoMedico?: string;
  prossimoSopralluogoMedico?: string;
  noteSopralluogoMedico?: string;

  // P49: Relazioni risolte
  referente?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName?: string;
  };
  rspp?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  medicoCompetente?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };

  // Metadata
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;

  /** @deprecated Use referenteId */
  personaRiferimento?: string;
}

// Person types (unified User/Employee) - P49 Multi-Tenant Pattern
export interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  department?: string;
  // P49: Company relationship via CompanyTenantProfile
  companyTenantProfileId?: string;
  /** @deprecated Use companyTenantProfileId */
  companyId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'PENDING';
  email: string;
  phone?: string;
  dateOfBirth?: string;
  birthDate?: string; // Alias for dateOfBirth (UI component compatibility)
  birthPlace?: string; // Progetto 48: Comune di nascita
  birthProvince?: string; // Progetto 48: Provincia nascita
  taxCode?: string; // Codice Fiscale
  residenceAddress?: string;
  residenceCity?: string;
  postalCode?: string;
  province?: string;
  notes?: string;
  employeeId?: string;
  startDate?: string;
  hiredDate?: string; // Alias for startDate (UI component compatibility)
  hourlyRate?: number | string; // Prezzo/ora per trainers (Decimal compatibility)
  iban?: string; // Progetto 48: IBAN per pagamenti
  roleType?: string;
  tenantId?: string;
  siteId?: string; // ID sede aziendale
  repartoId?: string; // Progetto 48: ID reparto
  gender?: string; // Genere (MALE/FEMALE/OTHER)
  site?: CompanySite; // Sede aziendale
  certifications?: string[]; // Array of certification names
  specialties?: string[]; // Array of specialty names
  // Progetto 48: Multi-tenant support
  tenantProfiles?: import('./personMultiTenant').PersonTenantProfile[];
  currentProfile?: import('./personMultiTenant').PersonTenantProfile;
}

// Backward compatibility alias - Employee is now unified with PersonData
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Employee extends PersonData {
  // This interface is intentionally empty as Employee is now unified with PersonData
  // Kept for backward compatibility with existing code
}

// Course types re-exported from './courses'
// See src/types/courses.ts for the canonical Course interface

// Medical record types
export interface MedicalRecord {
  id: string;
  personId: string;
  employeeId?: string; // Backward compatibility
  date: Date;
  type: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  notes?: string;
  attachments?: string[];
  provider?: string;
}

// Training record types (alias for backward compatibility)
export type Training = TrainingRecord;

export interface TrainingRecord {
  id: string;
  personId: string;
  employeeId?: string; // Backward compatibility
  courseId: string;
  completionDate?: Date;
  expiryDate?: Date;
  status: 'Enrolled' | 'In Progress' | 'Completed' | 'Expired';
  score?: number;
  certificateUrl?: string;
}

// Assessment types
export interface Assessment {
  id: string;
  personId: string;
  employeeId?: string; // Backward compatibility
  type: 'Annual' | 'Pre-employment' | 'Special';
  date: Date;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  results?: AssessmentResult[];
  recommendations?: string;
  nextAssessmentDate?: Date;
}

export interface AssessmentResult {
  test: string;
  result: string;
  normalRange?: string;
  isNormal: boolean;
}

// Authentication types - P49 Multi-Tenant Pattern
export interface Person {
  id: string;
  username?: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string; // Profilo professionale
  role: string; // Single role for frontend compatibility
  roleType?: string; // Original role type from backend (EMPLOYEE, TRAINER, ADMIN, etc.)
  globalRole?: string; // Global role (ADMIN, SUPER_ADMIN, USER, etc.)
  roles: string[]; // Array of roles from backend
  // P49: Company relationship via CompanyTenantProfile
  companyTenantProfileId?: string;
  /** @deprecated Use companyTenantProfileId */
  companyId?: string;
  tenantId?: string;
  siteId?: string; // Sede aziendale (da PersonTenantProfile, denormalizzato)
  company?: {
    id: string;
    name: string;
    type?: string;
  };
  tenant?: {
    id: string;
    name: string;
  };
  isVerified?: boolean;
  permissions?: string[];
}



export interface AuthResponse {
  success: boolean;
  message?: string;
  mustChangePassword?: boolean;
  user: Person;
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
  permissions?: Record<string, boolean>;
}

export interface AuthVerifyResponse {
  valid: boolean;
  mustChangePassword?: boolean;
  user: Person;
  permissions: Record<string, boolean>;
  timestamp?: string;
}

export interface LoginRequest {
  identifier: string; // Può essere email, username o codice fiscale
  password: string;
}

// Import template response interface
export interface ImportWithTemplateResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

// Activity Log types
export interface ActivityLog {
  id: string;
  userId: string;
  user?: {
    username: string;
    email: string;
  };
  resource: string;
  resourceId?: string;
  action: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface ActivityLogFilters {
  userId?: string;
  resource?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export * from './courses';
export * from './gdpr';
export * from './preferences';

// Import explicit types needed in Database interface below
import type { Course } from './courses';

// Database types per le interazioni con l'API
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: Omit<Company, 'id'> & { id?: string };
        Update: Partial<Omit<Company, 'id'>>;
      };
      persons: {
        Row: PersonData;
        Insert: Omit<PersonData, 'id'> & { id?: string };
        Update: Partial<Omit<PersonData, 'id'>>;
      };
      employees: {
        Row: Employee;
        Insert: Omit<Employee, 'id'> & { id?: string };
        Update: Partial<Omit<Employee, 'id'>>;
      };
      courses: {
        Row: Course;
        Insert: Omit<Course, 'id'> & { id?: string };
        Update: Partial<Omit<Course, 'id'>>;
      };
      trainers: {
        Row: {
          id: string;
          firstName: string;
          lastName: string;
          specialties?: string[];
          tariffaOraria?: number;
        };
        Insert: Omit<{ id: string; firstName: string; lastName: string; specialties?: string[]; tariffaOraria?: number }, 'id'> & { id?: string };
        Update: Partial<Omit<{ id: string; firstName: string; lastName: string; specialties?: string[]; tariffaOraria?: number }, 'id'>>;
      };
    };
  };
}