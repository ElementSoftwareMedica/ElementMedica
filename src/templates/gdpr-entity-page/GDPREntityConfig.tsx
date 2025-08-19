import React from 'react';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { GDPREntityTemplateProps } from './GDPREntityTemplate';
import { Company } from '../../types';
import { 
  Award,
  Clock,
  Download,
  Edit,
  Euro,
  Eye,
  FileText,
  Trash2,
  Users
} from 'lucide-react';

/**
 * Configurazioni predefinite per il template GDPR Entity
 * Fornisce configurazioni complete per entità comuni del sistema
 */

// Tipo per configurazioni con campi obbligatori
type GDPREntityConfig<T extends Record<string, any> & { id: string }> = 
  Omit<GDPREntityTemplateProps<T>, 'columns'> & {
    columns?: DataTableColumn<T>[];
  };

// Configurazione per Companies
export const companiesConfig: GDPREntityConfig<Company> = {
  entityName: 'company',
  entityNamePlural: 'companies',
  entityDisplayName: 'Azienda',
  entityDisplayNamePlural: 'Aziende',
  readPermission: 'companies.read',
  writePermission: 'companies.write',
  deletePermission: 'companies.delete',
  exportPermission: 'companies.export',
  apiEndpoint: '/api/v1/companies',
  searchFields: ['ragioneSociale', 'citta', 'piva', 'mail', 'personaRiferimento'] as (keyof Company)[],
  filterOptions: [
      {
        key: 'status',
        label: 'Stato',
        options: [
          { label: 'Attiva', value: 'Active' },
          { label: 'Inattiva', value: 'Inactive' }
        ]
      },
      {
        key: 'province',
        label: 'Provincia',
        options: [] // Sarà popolato dinamicamente
      }
    ],
  sortOptions: [
    { key: 'ragioneSociale', label: 'Nome (A-Z)' },
    { key: 'ragioneSociale', label: 'Nome (Z-A)' },
    { key: 'citta', label: 'Città (A-Z)' },
    { key: 'citta', label: 'Città (Z-A)' }
  ],
  csvHeaders: {
    'ragioneSociale': 'Nome Azienda',
    'sedeAzienda': 'Indirizzo',
    'citta': 'Città',
    'provincia': 'Provincia',
    'piva': 'P.IVA',
    'mail': 'Email',
    'telefono': 'Telefono',
    'personaRiferimento': 'Persona di Contatto',
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
    'Stato': 'ACTIVE'
  }],
  cardConfig: {
    titleField: 'ragioneSociale',
    subtitleField: 'citta',
    badgeField: 'status',
    descriptionField: 'sedeAzienda',
    additionalFields: [
      {
        key: 'piva',
        label: 'P.IVA',
        icon: <FileText className="h-3.5 w-3.5" />
      },
      {
        key: 'mail',
        label: 'Email',
        icon: <FileText className="h-3.5 w-3.5" />
      },
      {
        key: 'telefono',
        label: 'Telefono',
        icon: <FileText className="h-3.5 w-3.5" />
      }
    ]
  },
  enableBatchOperations: true,
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
        key: 'category',
        label: 'Categoria',
        options: [] // Sarà popolato dinamicamente
      },
      {
        key: 'duration',
        label: 'Durata',
        options: [
          { label: '< 4 ore', value: 'short' },
          { label: '4-8 ore', value: 'medium' },
          { label: '> 8 ore', value: 'long' }
        ]
      }
    ],
  sortOptions: [
    { key: 'title', label: 'Titolo (A-Z)' },
    { key: 'title', label: 'Titolo (Z-A)' },
    { key: 'duration', label: 'Durata (crescente)' },
    { key: 'duration', label: 'Durata (decrescente)' }
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
  enableBatchOperations: true,
  enableImportExport: true,
  enableColumnSelector: true,
  enableAdvancedFilters: true,
  defaultViewMode: 'table'
};

// Configurazione per Employees
export const employeesConfig: Partial<GDPREntityTemplateProps<Record<string, any> & { id: string }>> = {
  entityName: 'employee',
  entityNamePlural: 'employees',
  entityDisplayName: 'Dipendente',
  entityDisplayNamePlural: 'Dipendenti',
  readPermission: 'employees.read',
  writePermission: 'employees.write',
  deletePermission: 'employees.delete',
  exportPermission: 'employees.export',
  apiEndpoint: '/api/v1/persons',
  searchFields: ['firstName', 'lastName', 'email', 'fiscalCode'],
  filterOptions: [
      {
        key: 'status',
        label: 'Stato',
        options: [
          { label: 'Attivo', value: 'Active' },
          { label: 'Inattivo', value: 'Inactive' }
        ]
      },
      {
        key: 'companyId',
        label: 'Azienda',
        options: [] // Sarà popolato dinamicamente
      }
    ],
  sortOptions: [
    { key: 'firstName', label: 'Nome (A-Z)' },
    { key: 'firstName', label: 'Nome (Z-A)' },
    { key: 'lastName', label: 'Cognome (A-Z)' },
    { key: 'lastName', label: 'Cognome (Z-A)' }
  ],
  csvHeaders: {
    'firstName': 'Nome',
    'lastName': 'Cognome',
    'email': 'Email',
    'fiscalCode': 'Codice Fiscale',
    'phone': 'Telefono',
    'birthDate': 'Data di Nascita',
    'hireDate': 'Data Assunzione',
    'status': 'Stato'
  },
  csvTemplateData: [{
    'Nome': 'Mario',
    'Cognome': 'Rossi',
    'Email': 'mario.rossi@esempio.it',
    'Codice Fiscale': 'RSSMRA80A01H501Z',
    'Telefono': '+39 333 1234567',
    'Data di Nascita': '1980-01-01',
    'Data Assunzione': '2020-01-15',
    'Stato': 'Active'
  }],
  cardConfig: {
    titleField: 'firstName',
    subtitleField: 'lastName',
    badgeField: 'status',
    descriptionField: 'email',
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
        formatter: (value) => new Date(value).toLocaleDateString('it-IT')
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
export function createEntityConfig<T extends Record<string, any> & { id: string }>(
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
export function createStandardColumns<T extends Record<string, any> & { id: string }>(
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
export function generateFilterOptions<T extends Record<string, any> & { id: string }>(
  entities: T[],
  field: keyof T,
  label: string
): { key: string; label: string; options: Array<{ label: string; value: string }> } {
  const uniqueValues = Array.from(new Set(
    entities
      .map(entity => entity[field])
      .filter(Boolean)
      .map(value => String(value))
  ));
  
  return {
    key: String(field),
    label,
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
  createEntityConfig,
  createStandardColumns,
  generateFilterOptions
};