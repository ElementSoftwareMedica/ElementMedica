import React, { useState, useEffect } from 'react';
import { GDPREntityTemplate } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { Badge } from '../../design-system';
import { Building2, MapPin, Phone, Mail, Globe } from 'lucide-react';
import CompanyImport from '../../components/companies/CompanyImport';
import { apiGet, apiPost } from '../../services/api';
import { CompanyData } from '../../components/companies/company-import/types';

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
  nomeSede?: string; // Campo per il nome della sede specifica
  telefono?: string;
  deletedAt?: string;
  tenantId?: string;
  slug?: string;
  domain?: string;
  settings?: Record<string, unknown>;
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

// Template CSV per l'import - COMPLETO CON TUTTI I CAMPI DELLO SCHEMA PRISMA
const csvTemplateData: Record<string, unknown>[] = [
  {
    // === CAMPI COMPANY ===
    ragioneSociale: 'Esempio Azienda S.r.l.',
    codiceAteco: '62.01.00',
    piva: '12345678901',
    codiceFiscale: '12345678901',
    sdi: 'ABCDEFG',
    pec: 'pec@esempio.com',
    iban: 'IT60 X054 2811 1010 0000 0123 456',
    sedeAzienda: 'Via Roma 123',
    citta: 'Milano',
    provincia: 'MI',
    cap: '20100',
    mail: 'info@esempio.com',
    telefono: '+39 02 1234567',
    personaRiferimento: 'Mario Rossi',
    note: 'Note azienda',
    slug: 'esempio-azienda',
    domain: 'esempio.com',
    settings: '{}',
    subscriptionPlan: 'basic',
    isActive: true,
    // === CAMPI COMPANY SITE ===
    siteName: 'Sede Principale',
    siteIndirizzo: 'Via Roma 123',
    siteCitta: 'Milano',
    siteProvincia: 'MI',
    siteCap: '20100',
    sitePersonaRiferimento: 'Mario Rossi',
    siteTelefono: '+39 02 1234567',
    siteMail: 'sede@esempio.com',
    dvr: 'DVR-001',
    rsppId: '1',
    medicoCompetenteId: '1',
    ultimoSopralluogo: '2024-01-15',
    prossimoSopralluogo: '2024-07-15',
    valutazioneSopralluogo: 'Positiva',
    sopralluogoEseguitoDa: 'Ing. Bianchi',
    ultimoSopralluogoRSPP: '2024-01-10',
    prossimoSopralluogoRSPP: '2024-07-10',
    noteSopralluogoRSPP: 'Tutto regolare',
    ultimoSopralluogoMedico: '2024-01-20',
    prossimoSopralluogoMedico: '2024-07-20',
    noteSopralluogoMedico: 'Visite mediche aggiornate'
  },
  {
    // === CAMPI COMPANY ===
    ragioneSociale: 'Altra Azienda S.p.A.',
    codiceAteco: '47.11.10',
    piva: '98765432109',
    codiceFiscale: '98765432109',
    sdi: 'HIJKLMN',
    pec: 'pec@altraazienda.com',
    iban: 'IT60 X054 2811 1010 0000 0987 654',
    sedeAzienda: 'Via Nazionale 456',
    citta: 'Roma',
    provincia: 'RM',
    cap: '00100',
    mail: 'info@altraazienda.com',
    telefono: '+39 06 7654321',
    personaRiferimento: 'Giulia Verdi',
    note: 'Azienda di distribuzione',
    slug: 'altra-azienda',
    domain: 'altraazienda.com',
    settings: '{}',
    subscriptionPlan: 'premium',
    isActive: true,
    // === CAMPI COMPANY SITE ===
    siteName: 'Sede Secondaria',
    siteIndirizzo: 'Via Nazionale 456',
    siteCitta: 'Roma',
    siteProvincia: 'RM',
    siteCap: '00100',
    sitePersonaRiferimento: 'Giulia Verdi',
    siteTelefono: '+39 06 7654321',
    siteMail: 'sede@altraazienda.com',
    dvr: 'DVR-002',
    rsppId: '2',
    medicoCompetenteId: '2',
    ultimoSopralluogo: '2024-02-01',
    prossimoSopralluogo: '2024-08-01',
    valutazioneSopralluogo: 'Buona',
    sopralluogoEseguitoDa: 'Dott. Neri',
    ultimoSopralluogoRSPP: '2024-01-25',
    prossimoSopralluogoRSPP: '2024-07-25',
    noteSopralluogoRSPP: 'Miglioramenti necessari',
    ultimoSopralluogoMedico: '2024-02-05',
    prossimoSopralluogoMedico: '2024-08-05',
    noteSopralluogoMedico: 'Controlli periodici'
  }
];

// Headers CSV - RIORDINATI SECONDO RICHIESTA UTENTE
const csvHeaders = [
  // === ORDINE PRIORITARIO RICHIESTO ===
  { key: 'ragioneSociale', label: 'Ragione Sociale' },
  { key: 'codiceAteco', label: 'Codice ATECO' },
  { key: 'piva', label: 'P.IVA' },
  { key: 'codiceFiscale', label: 'Codice Fiscale' },
  { key: 'sdi', label: 'SDI' },
  { key: 'pec', label: 'PEC' },
  { key: 'iban', label: 'IBAN' },
  { key: 'siteName', label: 'Nome Sede' },
  { key: 'siteIndirizzo', label: 'Indirizzo Sede' },
  { key: 'siteCitta', label: 'Città Sede' },
  { key: 'siteProvincia', label: 'Provincia Sede' },
  { key: 'siteCap', label: 'CAP Sede' },
  { key: 'sitePersonaRiferimento', label: 'Persona Riferimento Sede' },
  { key: 'siteTelefono', label: 'Telefono Sede' },
  { key: 'siteMail', label: 'Mail Sede' },
  { key: 'domain', label: 'Sito (Domain)' },
  { key: 'note', label: 'Note' },
  
  // === ALTRI CAMPI COMPANY SITE ===
  { key: 'dvr', label: 'DVR' },
  { key: 'rsppId', label: 'RSPP ID' },
  { key: 'medicoCompetenteId', label: 'Medico Competente ID' },
  { key: 'ultimoSopralluogo', label: 'Ultimo Sopralluogo' },
  { key: 'prossimoSopralluogo', label: 'Prossimo Sopralluogo' },
  { key: 'valutazioneSopralluogo', label: 'Valutazione Sopralluogo' },
  { key: 'sopralluogoEseguitoDa', label: 'Sopralluogo Eseguito Da' },
  { key: 'ultimoSopralluogoRSPP', label: 'Ultimo Sopralluogo RSPP' },
  { key: 'prossimoSopralluogoRSPP', label: 'Prossimo Sopralluogo RSPP' },
  { key: 'noteSopralluogoRSPP', label: 'Note Sopralluogo RSPP' },
  { key: 'ultimoSopralluogoMedico', label: 'Ultimo Sopralluogo Medico' },
  { key: 'prossimoSopralluogoMedico', label: 'Prossimo Sopralluogo Medico' },
  { key: 'noteSopralluogoMedico', label: 'Note Sopralluogo Medico' },

  // === ALTRI CAMPI COMPANY ===
  { key: 'slug', label: 'Slug' },
  { key: 'settings', label: 'Settings' },
  { key: 'subscriptionPlan', label: 'Subscription Plan' },
  { key: 'isActive', label: 'Is Active' },
];

export const CompaniesPage: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [, setLoadingCompanies] = useState(false);

  // Carica i dati delle aziende per l'import
  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await apiGet('/api/v1/companies') as Company[];
      console.log('Aziende caricate per import:', response?.length || 0, response?.[0]); // Debug log
      setCompanies(response || []);
    } catch (error) {
      console.error('Errore nel caricamento delle aziende:', error);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Carica le aziende al mount del componente
  useEffect(() => {
    loadCompanies();
  }, []);

  // Funzione per gestire l'import delle aziende
  const handleImportEntities = async () => {
    // Ricarica i dati delle aziende prima di aprire il modal
    await loadCompanies();
    
    // Apri il modal di import
    setShowImportModal(true);
  };

  // Funzione per gestire la creazione di una nuova azienda
  const handleCreateCompany = () => {
    // Naviga alla pagina di creazione azienda
    window.location.href = '/companies/create';
  };

  const handleImportCompanies = async (importedCompanies: CompanyData[], overwriteIds?: string[]) => {
    try {
      // Invia i dati al backend
      const response = await apiPost('/api/v1/companies/import', {
        companies: importedCompanies,
        overwriteIds: overwriteIds || []
      });
      
      // Aggiorna la lista locale (il template si ricaricherà automaticamente)
      console.log('Import completato:', response);
      
      // Ricarica i dati delle aziende per aggiornare la lista
      await loadCompanies();
      
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
        onCreateEntity={handleCreateCompany}
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