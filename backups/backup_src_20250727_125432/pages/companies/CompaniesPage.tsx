import React, { useState } from 'react';
import { GDPREntityTemplate } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { Badge } from '../../design-system';
import { Building2, MapPin, Phone, Mail, Globe, Users } from 'lucide-react';
import CompanyImport from '../../components/companies/CompanyImport';
import { apiPost } from '../../services/api';

interface Company {
  id: string;
  ragioneSociale?: string;
  codiceAteco?: string;
  iban?: string;
  pec?: string;
  sdi?: string;
  cap?: string;
  citta?: string;
  codiceFiscale?: string;
  mail?: string;
  note?: string;
  personaRiferimento?: string;
  piva?: string;
  provincia?: string;
  sedeAzienda?: string;
  telefono?: string;
  deletedAt?: string;
  tenantId?: string;
  slug?: string;
  domain?: string;
  settings?: any;
  subscriptionPlan?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Campi legacy per compatibilità con il frontend
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  vatNumber?: string;
  taxCode?: string;
  website?: string;
  status?: 'Active' | 'Inactive' | 'Pending';
}

// Configurazione colonne per la tabella
const getCompaniesColumns = (): DataTableColumn<Company>[] => [
  {
      key: 'ragioneSociale',
      label: 'Nome',
      sortable: true,
      renderCell: (company: Company) => (
        <div className="font-medium text-gray-900">
          {company.ragioneSociale || 'N/A'}
        </div>
      )
    },
  {
    key: 'mail',
    label: 'Email',
    sortable: true,
    renderCell: (company) => (
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-gray-400" />
        <a href={`mailto:${company.mail}`} className="text-blue-600 hover:text-blue-800">
          {company.mail}
        </a>
      </div>
    )
  },
  {
    key: 'telefono',
    label: 'Telefono',
    sortable: true,
    renderCell: (company) => (
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-gray-400" />
        <a href={`tel:${company.telefono}`} className="text-gray-900">
          {company.telefono}
        </a>
      </div>
    )
  },
  {
    key: 'citta',
    label: 'Località',
    sortable: false,
    renderCell: (company) => (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-gray-400" />
        <div>
          <div className="text-gray-900">{company.citta}</div>
          <div className="text-sm text-gray-500">{company.provincia || 'N/A'}</div>
        </div>
      </div>
    )
  },
  {
    key: 'piva',
    label: 'P.IVA',
    sortable: true,
    renderCell: (company) => (
      <span className="font-mono text-sm">{company.piva || 'N/A'}</span>
    )
  },
  {
    key: 'website',
    label: 'Sito Web',
    sortable: false,
    renderCell: (company) => company.website ? (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-gray-400" />
        <a 
          href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 truncate max-w-32"
        >
          {company.website}
        </a>
      </div>
    ) : (
      <span className="text-gray-400">N/A</span>
    )
  },
  {
    key: 'status',
    label: 'Stato',
    sortable: true,
    renderCell: (company) => {
      const statusConfig = {
        Active: { label: 'Attiva', color: 'default' as const },
        Inactive: { label: 'Inattiva', color: 'destructive' as const },
        Pending: { label: 'In attesa', color: 'outline' as const }
      };
      const config = (company.status && statusConfig[company.status]) || { label: company.status || 'Sconosciuto', color: 'secondary' as const };
      return <Badge variant={config.color}>{config.label}</Badge>;
    }
  }
];

// Configurazione card per la vista griglia
const getCompanyCardConfig = () => ({
  titleField: 'ragioneSociale' as keyof Company,
  subtitleField: 'citta' as keyof Company,
  badgeField: 'status' as keyof Company,
  descriptionField: 'website' as keyof Company,
  // Configurazione dinamica per compatibilità
  title: (company: Company) => company.ragioneSociale || 'N/A',
  subtitle: (company: Company) => company.citta || 'Località non specificata',
  badge: (company: Company) => {
    const statusConfig = {
      Active: { label: 'Attiva', variant: 'default' as const },
      Inactive: { label: 'Inattiva', variant: 'destructive' as const },
      Pending: { label: 'In attesa', variant: 'outline' as const }
    };
    const config = (company.status && statusConfig[company.status]) || { label: company.status || 'Sconosciuto', variant: 'secondary' as const };
    return { text: config.label, variant: config.variant };
  },
  icon: () => <Building2 className="h-5 w-5" />,
  fields: [
    {
      label: 'Email',
      value: (company: Company) => company.mail || 'N/A',
      icon: <Mail className="h-4 w-4" />
    },
    {
      label: 'Telefono',
      value: (company: Company) => company.telefono || 'N/A',
      icon: <Phone className="h-4 w-4" />
    },
    {
      label: 'Località',
      value: (company: Company) => `${company.citta || ''}${company.provincia ? `, ${company.provincia}` : ''}` || 'N/A',
      icon: <MapPin className="h-4 w-4" />
    },
    {
      label: 'P.IVA',
      value: (company: Company) => company.piva || 'N/A',
      icon: <Building2 className="h-4 w-4" />
    }
  ],
  description: (company: Company) => company.website ? `Sito web: ${company.website}` : undefined
});

// Template CSV per l'import
const csvTemplateData: Partial<Company>[] = [
  {
    ragioneSociale: 'Esempio Azienda S.r.l.',
    mail: 'info@esempio.com',
    telefono: '+39 02 1234567',
    sedeAzienda: 'Via Roma 123',
    citta: 'Milano',
    provincia: 'MI',
    piva: '12345678901',
    status: 'Active'
  }
];

// Headers CSV
const csvHeaders = [
  { key: 'ragioneSociale', label: 'Ragione Sociale' },
  { key: 'mail', label: 'Email' },
  { key: 'telefono', label: 'Telefono' },
  { key: 'sedeAzienda', label: 'Indirizzo' },
  { key: 'citta', label: 'Città' },
  { key: 'provincia', label: 'Provincia' },
  { key: 'piva', label: 'P.IVA' },
  { key: 'status', label: 'Stato' }
];

export const CompaniesPage: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Funzione per gestire l'import delle aziende
  const handleImportEntities = async (data: any[]) => {
    // Questa funzione viene chiamata dal template quando c'è onImportEntities
    // Ma noi vogliamo aprire il modal invece, quindi apriamo il modal
    setShowImportModal(true);
    return Promise.resolve();
  };

  const handleImportCompanies = async (importedCompanies: any[], overwriteIds?: string[]) => {
    try {
      // Invia i dati al backend
      const response = await apiPost('/api/v1/companies/import', {
        companies: importedCompanies,
        overwriteIds: overwriteIds || []
      });
      
      // Aggiorna la lista locale (il template si ricaricherà automaticamente)
      console.log('Import completato:', response);
      
      // Chiudi il modal
      setShowImportModal(false);
    } catch (error) {
      console.error('Errore durante l\'import:', error);
      throw error; // Rilancia l'errore per permettere al modal di gestirlo
    }
  };

  return (
    <>
      <GDPREntityTemplate<Company>
        entityName="company"
        entityNamePlural="companies"
        entityDisplayName="Azienda"
        entityDisplayNamePlural="Aziende"
        readPermission="companies:read"
        writePermission="companies:write"
        deletePermission="companies:delete"
        exportPermission="companies:export"
        apiEndpoint="/api/v1/companies"
        columns={getCompaniesColumns()}
        searchFields={['ragioneSociale', 'mail', 'citta', 'piva']}
        filterOptions={[
          {
            key: 'status',
            label: 'Stato',
            options: [
              { value: 'Active', label: 'Attiva' },
              { value: 'Inactive', label: 'Inattiva' },
              { value: 'Pending', label: 'In attesa' }
            ]
          }
        ]}
        sortOptions={[
          { key: 'ragioneSociale', label: 'Nome' },
          { key: 'mail', label: 'Email' },
          { key: 'citta', label: 'Città' },
          { key: 'status', label: 'Stato' },
          { key: 'createdAt', label: 'Data creazione' }
        ]}
        csvHeaders={csvHeaders}
        csvTemplateData={csvTemplateData}
        cardConfig={getCompanyCardConfig()}
        enableBatchOperations={true}
        enableImportExport={true}
        enableColumnSelector={true}
        enableAdvancedFilters={true}
        defaultViewMode="table"
        onImportEntities={handleImportEntities}
      />
      
      {showImportModal && (
        <CompanyImport
          onImport={handleImportCompanies}
          onClose={() => setShowImportModal(false)}
          existingCompanies={companies}
        />
      )}
    </>
  );
};

// Export default per compatibilità
export default CompaniesPage;