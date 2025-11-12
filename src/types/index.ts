// Re-export template types
export * from './templates';

// Company types
export interface Company {
  id: string;
  ragioneSociale: string;
  piva?: string;
  codiceFiscale?: string;
  mail?: string;
  telefono?: string;
  pec?: string;
  sdi?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  codiceAteco?: string;
  iban?: string;
  personaRiferimento?: string;
  sedeAzienda?: string;
  nomeSede?: string; // Campo per il nome della sede specifica
  note?: string;
  deletedAt?: Date | null;
  tenantId?: string;
  slug?: string;
  domain?: string;
  settings?: Record<string, unknown>;
  subscriptionPlan?: string;
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt?: Date;
  updatedAt?: Date;
  
  // Relazione con le sedi aziendali (opzionale, popolata dagli endpoint che includono le sites)
  sites?: CompanySite[];
  
  // Legacy fields for backward compatibility (deprecated)
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

// CompanySite types (condiviso tra componenti)
export interface CompanySite {
  id: string;
  companyId: string;
  siteName: string;
  citta: string;
  indirizzo: string;
  cap: string;
  provincia: string;
  personaRiferimento?: string;
  telefono?: string;
  mail?: string;
  dvr?: string;
  rsppId?: string;
  medicoCompetenteId?: string;
  // Campi sopralluogo (opzionali, presenti in alcune risposte API)
  ultimoSopralluogo?: string;
  prossimoSopralluogo?: string;
  valutazioneSopralluogo?: string;
  sopralluogoEseguitoDa?: string;
  // Relazioni opzionali risolte dal backend
  rspp?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  medicoCompetente?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Person types (unified User/Employee)
export interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  department?: string;
  companyId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'PENDING';
  email: string;
  phone?: string;
  dateOfBirth?: string;
  residenceAddress?: string;
  employeeId?: string;
  startDate?: string;
  roleType?: string;
  tenantId?: string;
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

// Training record types
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

// Authentication types
export interface Person {
  id: string;
  username?: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string; // Profilo professionale
  role: string; // Single role for frontend compatibility
  roles: string[]; // Array of roles from backend
  companyId?: string;
  tenantId?: string;
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