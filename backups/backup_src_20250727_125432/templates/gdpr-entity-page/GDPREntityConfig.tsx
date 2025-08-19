import React from 'react';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { GDPREntityTemplateProps } from './GDPREntityTemplate';
import { FileText, Clock, Euro, Users, Award } from 'lucide-react';
import { 
  EMPLOYEES_GDPR_SIMPLE_CONFIG, 
  TRAINERS_GDPR_SIMPLE_CONFIG
} from '../../config/personGDPRConfig';

/**
 * Configurazioni predefinite per il template GDPR Entity
 * Fornisce configurazioni complete per entità comuni del sistema
 */

// Configurazione per Companies
export const companiesConfig: Partial<GDPREntityTemplateProps<any>> = {
  entityName: 'company',
  entityNamePlural: 'companies',
  entityDisplayName: 'Azienda',
  entityDisplayNamePlural: 'Aziende',
  readPermission: 'companies.read',
  writePermission: 'companies.write',
  deletePermission: 'companies.delete',
  exportPermission: 'companies.export',
  apiEndpoint: '/api/v1/companies',
  searchFields: ['name', 'city', 'vat_number', 'email', 'contact_person'],
  filterOptions: [
    {
      label: 'Stato',
      key: 'status',
      options: [
        { label: 'Attiva', value: 'Active' },
        { label: 'Inattiva', value: 'Inactive' }
      ]
    },
    {
      label: 'Provincia',
      key: 'province',
      options: [] // Sarà popolato dinamicamente
    }
  ],
  sortOptions: [
    { label: 'Nome (A-Z)', key: 'name-asc' },
    { label: 'Nome (Z-A)', key: 'name-desc' },
    { label: 'Città (A-Z)', key: 'city-asc' },
    { label: 'Città (Z-A)', key: 'city-desc' }
  ],
  csvHeaders: {
    'name': 'Nome Azienda',
    'address': 'Indirizzo',
    'city': 'Città',
    'province': 'Provincia',
    'vat_number': 'P.IVA',
    'email': 'Email',
    'phone': 'Telefono',
    'contact_person': 'Persona di Contatto',
    'status': 'Stato'
  },
  csvTemplateData: [{
    'Nome Azienda': 'Esempio S.r.l.',
    'Indirizzo': 'Via Roma 123',
    'Città': 'Milano',
    'Provincia': 'MI',
    'P.IVA': '12345678901',
    'Email': 'info@esempio.it',
    'Telefono': '+39 02 1234567',
    'Persona di Contatto': 'Mario Rossi',
    'Stato': 'Active'
  }],
  cardConfig: {
    titleField: 'name',
    subtitleField: 'city',
    badgeField: 'status',
    descriptionField: 'address',
    additionalFields: [
      {
        key: 'vat_number',
        label: 'P.IVA',
        icon: <FileText className="h-3.5 w-3.5" />
      },
      {
        key: 'email',
        label: 'Email',
        icon: <FileText className="h-3.5 w-3.5" />
      },
      {
        key: 'phone',
        label: 'Telefono',
        icon: <FileText className="h-3.5 w-3.5" />
      }
    ]
  },
  enableBatchOperations: EMPLOYEES_GDPR_SIMPLE_CONFIG.gdprLevel === 'comprehensive',
  enableImportExport: true,
  enableColumnSelector: true,
  enableAdvancedFilters: true,
  defaultViewMode: 'table'
};

// Configurazione per Courses
export const coursesConfig: Partial<GDPREntityTemplateProps<any>> = {
  entityName: 'course',
  entityNamePlural: 'courses',
  entityDisplayName: 'Corso',
  entityDisplayNamePlural: 'Corsi',
  readPermission: 'courses.read',
  writePermission: 'courses.write',
  deletePermission: 'courses.delete',
  exportPermission: 'courses.export',
  apiEndpoint: '/api/v1/courses',
  searchFields: ['title', 'description', 'category', 'code'],
  filterOptions: [
    {
      label: 'Categoria',
      key: 'category',
      options: [] // Sarà popolato dinamicamente
    },
    {
      label: 'Durata',
      key: 'duration',
      options: [
        { label: '< 4 ore', value: 'short' },
        { label: '4-8 ore', value: 'medium' },
        { label: '> 8 ore', value: 'long' }
      ]
    }
  ],
  sortOptions: [
    { label: 'Titolo (A-Z)', key: 'title-asc' },
    { label: 'Titolo (Z-A)', key: 'title-desc' },
    { label: 'Durata (crescente)', key: 'duration-asc' },
    { label: 'Durata (decrescente)', key: 'duration-desc' }
  ],
  csvHeaders: {
    'title': 'Corso',
    'code': 'Codice',
    'category': 'Categoria',
    'duration': 'DurataCorso',
    'validityYears': 'AnniValidita',
    'renewalDuration': 'DurataCorsoAggiornamento',
    'pricePerPerson': 'EuroPersona',
    'certifications': 'Certificazioni',
    'maxPeople': 'MaxPersone',
    'regulation': 'Normativa',
    'contents': 'Contenuti',
    'description': 'Descrizione'
  },
  csvTemplateData: [{
    'Corso': 'Nome del corso',
    'Codice': 'ABC123',
    'Categoria': 'Categoria corso',
    'DurataCorso': '8',
    'AnniValidita': '5',
    'DurataCorsoAggiornamento': '4',
    'EuroPersona': '150',
    'Certificazioni': 'Tipo certificazione',
    'MaxPersone': '20',
    'Normativa': 'Riferimento normativo',
    'Contenuti': 'Descrizione contenuti',
    'Descrizione': 'Descrizione dettagliata'
  }],
  cardConfig: {
    titleField: 'title',
    subtitleField: 'category',
    badgeField: 'code',
    descriptionField: 'description',
    additionalFields: [
      {
        key: 'duration',
        label: 'Durata',
        icon: <Clock className="h-3.5 w-3.5" />,
        formatter: (value) => `${value} ore`
      },
      {
        key: 'validityYears',
        label: 'Validità',
        icon: <Award className="h-3.5 w-3.5" />,
        formatter: (value) => `${value} anni`
      },
      {
        key: 'pricePerPerson',
        label: 'Prezzo',
        icon: <Euro className="h-3.5 w-3.5" />,
        formatter: (value) => `€${Number(value).toFixed(2)}`
      },
      {
        key: 'maxPeople',
        label: 'Max Persone',
        icon: <Users className="h-3.5 w-3.5" />
      }
    ]
  },
  enableBatchOperations: TRAINERS_GDPR_SIMPLE_CONFIG.gdprLevel === 'comprehensive', // false per trainers (livello standard)
  enableImportExport: true,
  enableColumnSelector: true,
  enableAdvancedFilters: true,
  defaultViewMode: 'table'
};

// Configurazione per Employees (entità Person unificata)
export const employeesConfig: Partial<GDPREntityTemplateProps<any>> = {
  entityName: EMPLOYEES_GDPR_SIMPLE_CONFIG.entityType,
  entityNamePlural: EMPLOYEES_GDPR_SIMPLE_CONFIG.entityType,
  entityDisplayName: EMPLOYEES_GDPR_SIMPLE_CONFIG.displayName,
  entityDisplayNamePlural: EMPLOYEES_GDPR_SIMPLE_CONFIG.displayName,
  readPermission: EMPLOYEES_GDPR_SIMPLE_CONFIG.permissions.read,
  writePermission: (EMPLOYEES_GDPR_SIMPLE_CONFIG.permissions as any).write || (EMPLOYEES_GDPR_SIMPLE_CONFIG.permissions as any).create,
  deletePermission: EMPLOYEES_GDPR_SIMPLE_CONFIG.permissions.delete,
  exportPermission: EMPLOYEES_GDPR_SIMPLE_CONFIG.permissions.export,
  apiEndpoint: '/api/v1/persons',
  searchFields: ['firstName', 'lastName', 'email', 'fiscalCode'],
  filterOptions: [
    {
      label: 'Stato',
      key: 'status',
      options: [
        { label: 'Attivo', value: 'Active' },
        { label: 'Inattivo', value: 'Inactive' },
        { label: 'In attesa', value: 'Pending' }
      ]
    },
    {
      label: 'Ruolo Dipendente',
      key: 'roleType',
      options: [
        { label: 'Responsabile Aziendale', value: 'COMPANY_ADMIN' },
        { label: 'Manager HR', value: 'HR_MANAGER' },
        { label: 'Manager', value: 'MANAGER' },
        { label: 'Dipendente', value: 'EMPLOYEE' }
      ]
    },
    {
      label: 'Azienda',
      key: 'companyId',
      options: [] // Sarà popolato dinamicamente
    }
  ],
  sortOptions: [
    { label: 'Nome (A-Z)', key: 'firstName-asc' },
    { label: 'Nome (Z-A)', key: 'firstName-desc' },
    { label: 'Cognome (A-Z)', key: 'lastName-asc' },
    { label: 'Cognome (Z-A)', key: 'lastName-desc' }
  ],
  csvHeaders: {
    'firstName': 'Nome',
    'lastName': 'Cognome',
    'email': 'Email',
    'fiscalCode': 'Codice Fiscale',
    'phone': 'Telefono',
    'birthDate': 'Data di Nascita',
    'hireDate': 'Data Assunzione',
    'status': 'Stato',
    'company.ragioneSociale': 'Azienda'
  },
  csvTemplateData: [{
    'Nome': 'Mario',
    'Cognome': 'Rossi',
    'Email': 'mario.rossi@esempio.it',
    'Codice Fiscale': 'RSSMRA80A01H501Z',
    'Telefono': '+39 333 1234567',
    'Data di Nascita': '1980-01-01',
    'Data Assunzione': '2020-01-15',
    'Stato': 'Active',
    'Azienda': 'Esempio S.r.l.'
  }],
  cardConfig: {
    titleField: 'firstName',
    subtitleField: 'email',
    badgeField: 'status',
    descriptionField: 'company.ragioneSociale',
    additionalFields: [
      {
        key: 'fiscalCode',
        label: 'C.F.',
        icon: <FileText className="h-3.5 w-3.5" />
      },
      {
        key: 'phone',
        label: 'Telefono',
        icon: <FileText className="h-3.5 w-3.5" />
      },
      {
        key: 'hireDate',
        label: 'Assunto',
        icon: <FileText className="h-3.5 w-3.5" />,
        formatter: (value) => value ? new Date(value).toLocaleDateString('it-IT') : 'N/A'
      }
    ]
  },
  enableBatchOperations: true,
  enableImportExport: true,
  enableColumnSelector: true,
  enableAdvancedFilters: true,
  defaultViewMode: 'table'
};

// Configurazione per Trainers (entità Person unificata)
export const trainersConfig: Partial<GDPREntityTemplateProps<any>> = {
  entityName: TRAINERS_GDPR_SIMPLE_CONFIG.entityType,
  entityNamePlural: TRAINERS_GDPR_SIMPLE_CONFIG.entityType,
  entityDisplayName: TRAINERS_GDPR_SIMPLE_CONFIG.displayName,
  entityDisplayNamePlural: TRAINERS_GDPR_SIMPLE_CONFIG.displayName,
  readPermission: TRAINERS_GDPR_SIMPLE_CONFIG.permissions.read,
  writePermission: (TRAINERS_GDPR_SIMPLE_CONFIG.permissions as any).write || (TRAINERS_GDPR_SIMPLE_CONFIG.permissions as any).create,
  deletePermission: TRAINERS_GDPR_SIMPLE_CONFIG.permissions.delete,
  exportPermission: TRAINERS_GDPR_SIMPLE_CONFIG.permissions.export,
  apiEndpoint: '/api/v1/persons',
  searchFields: ['firstName', 'lastName', 'email', 'fiscalCode'],
  filterOptions: [
    {
      label: 'Stato',
      key: 'status',
      options: [
        { label: 'Attivo', value: 'Active' },
        { label: 'Inattivo', value: 'Inactive' },
        { label: 'In attesa', value: 'Pending' }
      ]
    },
    {
      label: 'Ruolo Formatore',
      key: 'roleType',
      options: [
        { label: 'Coordinatore Formatori', value: 'TRAINER_COORDINATOR' },
        { label: 'Formatore Senior', value: 'SENIOR_TRAINER' },
        { label: 'Formatore', value: 'TRAINER' },
        { label: 'Formatore Esterno', value: 'EXTERNAL_TRAINER' }
      ]
    },
    {
      label: 'Specializzazione',
      key: 'specialization',
      options: [] // Sarà popolato dinamicamente
    }
  ],
  sortOptions: [
    { label: 'Nome (A-Z)', key: 'firstName-asc' },
    { label: 'Nome (Z-A)', key: 'firstName-desc' },
    { label: 'Cognome (A-Z)', key: 'lastName-asc' },
    { label: 'Cognome (Z-A)', key: 'lastName-desc' }
  ],
  csvHeaders: {
    'firstName': 'Nome',
    'lastName': 'Cognome',
    'email': 'Email',
    'fiscalCode': 'Codice Fiscale',
    'phone': 'Telefono',
    'birthDate': 'Data di Nascita',
    'specialization': 'Specializzazione',
    'status': 'Stato',
    'certifications': 'Certificazioni'
  },
  csvTemplateData: [{
    'Nome': 'Giulia',
    'Cognome': 'Verdi',
    'Email': 'giulia.verdi@formazione.it',
    'Codice Fiscale': 'VRDGLI85M15F205X',
    'Telefono': '+39 333 9876543',
    'Data di Nascita': '1985-08-15',
    'Specializzazione': 'Sicurezza sul Lavoro',
    'Stato': 'Active',
    'Certificazioni': 'RSPP, Formatore Qualificato'
  }],
  cardConfig: {
    titleField: 'firstName',
    subtitleField: 'email',
    badgeField: 'status',
    descriptionField: 'specialization',
    additionalFields: [
      {
        key: 'fiscalCode',
        label: 'C.F.',
        icon: <FileText className="h-3.5 w-3.5" />
      },
      {
        key: 'phone',
        label: 'Telefono',
        icon: <FileText className="h-3.5 w-3.5" />
      },
      {
        key: 'specialization',
        label: 'Specializzazione',
        icon: <Award className="h-3.5 w-3.5" />
      },
      {
        key: 'certifications',
        label: 'Certificazioni',
        icon: <Award className="h-3.5 w-3.5" />
      }
    ]
  },
  enableBatchOperations: true,
  enableImportExport: true,
  enableColumnSelector: true,
  enableAdvancedFilters: true,
  defaultViewMode: 'table'
};

/**
 * Utility per creare configurazioni personalizzate
 */
export function createEntityConfig<T extends Record<string, any>>(
  baseConfig: Partial<GDPREntityTemplateProps<T>>
): Partial<GDPREntityTemplateProps<T>> {
  return {
    enableBatchOperations: true,
    enableImportExport: true,
    enableColumnSelector: true,
    enableAdvancedFilters: true,
    defaultViewMode: 'table',
    ...baseConfig
  };
}

/**
 * Utility per generare colonne standard
 */
export function createStandardColumns<T extends Record<string, any>>(
  fields: Array<{
    key: keyof T;
    label: string;
    sortable?: boolean;
    width?: number;
    formatter?: (value: any) => React.ReactNode;
  }>
): DataTableColumn<T>[] {
  return fields.map(field => ({
    key: String(field.key),
    label: field.label,
    sortable: field.sortable ?? true,
    width: field.width ?? 150,
    renderCell: (entity: T) => {
      const value = entity[field.key];
      if (field.formatter) {
        return field.formatter(value);
      }
      return value || '-';
    }
  }));
}

/**
 * Utility per generare opzioni di filtro dinamiche
 */
export function generateFilterOptions<T extends Record<string, any>>(
  entities: T[],
  field: keyof T,
  label: string
): { label: string; key: string; options: Array<{ label: string; value: string }> } {
  const uniqueValues = Array.from(new Set(
    entities
      .map(entity => entity[field])
      .filter(Boolean)
      .map(value => String(value))
  ));
  
  return {
    label,
    key: String(field),
    options: uniqueValues.map(value => ({
      label: value,
      value: value
    }))
  };
}

export default {
  companiesConfig,
  coursesConfig,
  employeesConfig,
  trainersConfig,
  createEntityConfig,
  createStandardColumns,
  generateFilterOptions
};