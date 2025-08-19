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
  note?: string;
  deletedAt?: Date | null;
  tenantId?: string;
  slug?: string;
  domain?: string;
  settings?: any;
  subscriptionPlan?: string;
  isActive?: boolean;
  status?: 'Active' | 'Inactive' | 'Pending';
  createdAt?: Date;
  updatedAt?: Date;
  
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

// Person types (unified User/Employee)
export interface PersonData {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  department?: string;
  companyId?: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  employeeId?: string;
  startDate?: string;
  roleType?: string;
  tenantId?: string;
}

// Backward compatibility alias
export interface Employee extends PersonData {}

// Course types
export interface Course {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  status: 'Active' | 'Inactive';
  rating: number;
  enrolled: number;
}

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

// Backward compatibility alias
export interface User extends Person {}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: Person;
    accessToken: string;
    refreshToken?: string;
    sessionToken?: string;
    expiresIn?: number;
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
  data?: any;
}

export * from './courses';
export * from './gdpr';
export * from './preferences';

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