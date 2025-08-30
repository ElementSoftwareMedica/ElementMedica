/**
 * Costanti per l'importazione delle persone
 */

// Mappatura degli header CSV ai campi dell'entità Person
export const CSV_HEADER_MAP = {
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
};

// Campi da formattare in Title Case
export const TITLE_CASE_FIELDS = ['firstName', 'lastName', 'residenceAddress', 'city', 'province'];

// Mappa dei mesi per l'estrazione della data dal codice fiscale
export const MONTH_MAP: { [key: string]: string } = {
  'A': '01', 'B': '02', 'C': '03', 'D': '04', 'E': '05', 'H': '06',
  'L': '07', 'M': '08', 'P': '09', 'R': '10', 'S': '11', 'T': '12'
};

// Valori validi per lo status delle persone
export const VALID_PERSON_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED', 'PENDING'];

// Configurazione colonne per la preview
export const PREVIEW_COLUMNS = [
  {
    key: 'lastName',
    label: 'Cognome',
    minWidth: 120,
    width: 150
  },
  {
    key: 'firstName',
    label: 'Nome',
    minWidth: 120,
    width: 150
  },
  {
    key: 'taxCode',
    label: 'Codice Fiscale',
    minWidth: 140,
    width: 160
  },
  {
    key: 'companyName',
    label: 'Azienda',
    minWidth: 150,
    width: 200
  },
  {
    key: 'title',
    label: 'Profilo Professionale',
    minWidth: 150,
    width: 180
  },
  {
    key: 'email',
    label: 'Email',
    minWidth: 150,
    width: 200
  },
  {
    key: 'phone',
    label: 'Telefono',
    minWidth: 120,
    width: 140
  },
  {
    key: 'birthDate',
    label: 'Data Nascita',
    minWidth: 100,
    width: 120
  },
  {
    key: 'residenceAddress',
    label: 'Indirizzo',
    minWidth: 150,
    width: 200
  },
  {
    key: 'city',
    label: 'Città',
    minWidth: 100,
    width: 120
  },
  {
    key: 'province',
    label: 'Provincia',
    minWidth: 80,
    width: 100
  },
  {
    key: 'postalCode',
    label: 'CAP',
    minWidth: 80,
    width: 100
  }
];