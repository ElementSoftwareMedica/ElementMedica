// Types per l'importazione delle persone
export interface PersonImportProps {
  onImport: (persons: PersonData[], overwriteIds?: string[]) => Promise<void>;
  onClose: () => void;
  existingPersons?: PersonData[];
  existingCompanies?: CompanyOption[];
  onRefreshData?: () => Promise<void>;
}

export interface ConflictInfo {
  type: 'duplicate' | 'invalid_company';
  rowIndex: number;
  personData: PersonData;
  message: string;
  existingPerson?: PersonData;
  suggestedCompanies?: { id: string; name: string }[];
  suggestedCompanyId?: string;
  resolution?: 'skip' | 'overwrite' | 'company';
  resolvedCompanyId?: string;
  selectedCompanyId?: string;
  selectedCompanyName?: string;
}

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export interface PersonData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  taxCode?: string;
  birthDate?: string;
  residenceAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  roleType?: string;
  title?: string;
  companyName?: string;
  companyId?: string;
  username?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
  nationality?: string;
  gender?: string;
  maritalStatus?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  salary?: string;
  contractType?: string;
  workLocation?: string;
  manager?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ImportValidationResult {
  [rowIdx: number]: string[];
}

export interface ConflictResolutionState {
  [index: number]: ConflictInfo;
}

export interface CompanyOption {
  value: string;
  label: string;
}

export interface DateFormatConfig {
  inputFormat: RegExp;
  parser: (dateString: string) => Date | null;
  validator: (dateString: string) => boolean;
}

// Costanti per la mappatura CSV
export const CSV_HEADER_MAPPINGS = {
  // Intestazioni italiane minuscole
  'nome': 'firstName',
  'cognome': 'lastName',
  'email': 'email',
  'telefono': 'phone',
  'codice_fiscale': 'taxCode',
  'data_nascita': 'birthDate',
  'indirizzo': 'residenceAddress',
  'citta': 'city',
  'provincia': 'province',
  'cap': 'postalCode',
  'ruolo': 'roleType',
  'profilo_professionale': 'title',
  'azienda': 'companyName',
  'username': 'username',
  'note': 'notes',
  'stato': 'status',
  'data_creazione': 'createdAt',
  'nazionalita': 'nationality',
  'genere': 'gender',
  'stato_civile': 'maritalStatus',
  'contatto_emergenza': 'emergencyContact',
  'telefono_emergenza': 'emergencyPhone',
  'dipartimento': 'department',
  'posizione': 'position',
  'data_assunzione': 'hireDate',
  'stipendio': 'salary',
  'tipo_contratto': 'contractType',
  'sede_lavoro': 'workLocation',
  'manager': 'manager',
  
  // Intestazioni italiane con prima lettera maiuscola
  'Nome': 'firstName',
  'Cognome': 'lastName',
  'Email': 'email',
  'Telefono': 'phone',
  'Codice Fiscale': 'taxCode',
  'Data Nascita': 'birthDate',
  'Indirizzo': 'residenceAddress',
  'Citta': 'city',
  'Provincia': 'province',
  'CAP': 'postalCode',
  'Ruolo': 'roleType',
  'Profilo Professionale': 'title',
  'Azienda': 'companyName',
  'Username': 'username',
  'Note': 'notes',
  'Stato': 'status',
  'Data Creazione': 'createdAt',
  'Nazionalita': 'nationality',
  'Genere': 'gender',
  'Stato Civile': 'maritalStatus',
  'Contatto Emergenza': 'emergencyContact',
  'Telefono Emergenza': 'emergencyPhone',
  'Dipartimento': 'department',
  'Posizione': 'position',
  'Data Assunzione': 'hireDate',
  'Stipendio': 'salary',
  'Tipo Contratto': 'contractType',
  'Sede Lavoro': 'workLocation',
  'Manager': 'manager',
  
  // Varianti inglesi
  'firstname': 'firstName',
  'first_name': 'firstName',
  'lastname': 'lastName',
  'last_name': 'lastName',
  'phone': 'phone',
  'taxcode': 'taxCode',
  'tax_code': 'taxCode',
  'birthdate': 'birthDate',
  'birth_date': 'birthDate',
  'address': 'residenceAddress',
  'city': 'city',
  'province': 'province',
  'postalcode': 'postalCode',
  'postal_code': 'postalCode',
  'role': 'roleType',
  'roletype': 'roleType',
  'role_type': 'roleType',
  'company': 'companyName',
  'companyname': 'companyName',
  'company_name': 'companyName',
  'notes': 'notes',
  'nationality': 'nationality',
  'gender': 'gender',
  'marital_status': 'maritalStatus',
  'emergency_contact': 'emergencyContact',
  'emergency_phone': 'emergencyPhone',
  'department': 'department',
  'position': 'position',
  'hire_date': 'hireDate',
  'salary': 'salary',
  'contract_type': 'contractType',
  'work_location': 'workLocation'
} as const;

// Campi da formattare in Title Case
export const TITLE_CASE_FIELDS = ['firstName', 'lastName', 'residenceAddress', 'city', 'province'] as const;

// Formati data supportati
export const DATE_FORMATS: DateFormatConfig[] = [
  {
    inputFormat: /^\d{4}-\d{2}-\d{2}$/,
    parser: (dateString: string) => new Date(dateString),
    validator: (dateString: string) => {
      const date = new Date(dateString);
      return !isNaN(date.getTime()) && date.getFullYear() >= 1900 && date.getFullYear() <= 2100;
    }
  },
  {
    inputFormat: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    parser: (dateString: string) => {
      const parts = dateString.split('/');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      return new Date(year, month - 1, day);
    },
    validator: (dateString: string) => {
      const parts = dateString.split('/');
      if (parts.length !== 3) return false;
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;
      const date = new Date(year, month - 1, day);
      return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    }
  },
  {
    inputFormat: /^\d{1,2}-\d{1,2}-\d{4}$/,
    parser: (dateString: string) => {
      const parts = dateString.split('-');
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      return new Date(year, month - 1, day);
    },
    validator: (dateString: string) => {
      const parts = dateString.split('-');
      if (parts.length !== 3) return false;
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;
      const date = new Date(year, month - 1, day);
      return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    }
  }
];