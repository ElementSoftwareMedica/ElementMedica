import React, { useState, useEffect } from 'react';
import { GDPREntityTemplate } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { Badge, Modal, Select, Button } from '../../design-system';
import { Building2, MapPin, Phone, Mail, Globe, AlertTriangle, Users, ArrowRight } from 'lucide-react';
import CompanyImport from '../../components/companies/company-import/CompanyImportRefactored';
import { apiGet, apiPost, apiDelete } from '../../services/api';
import { getPersons, updatePerson, deleteMultiplePersons } from '../../services/persons';
import { CompanyData } from '../../components/companies/company-import/types';
import type { CompanySite } from '../../types';

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
  // Aggiunta: includi le sedi per il rilevamento duplicati nel modal import
  sites?: CompanySite[];
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

  // Stati per migrazione persone e eliminazione azienda
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  const [companyToDeleteId, setCompanyToDeleteId] = useState<string | null>(null);
  const [linkedPersonsCount, setLinkedPersonsCount] = useState(0);
  const [targetCompanyId, setTargetCompanyId] = useState('');
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [deleteEmployeesWithoutMigration, setDeleteEmployeesWithoutMigration] = useState(false);

  // Carica i dati delle aziende per l'import
  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await apiGet('/api/v1/companies') as Company[];
      console.log('Aziende caricate per import:', response?.length || 0, response?.[0]); // Debug log

      // Prefetch delle sedi per ogni azienda, necessario per il rilevamento duplicati nel modal di import
      const companiesWithSites = await Promise.all(
        (response || []).map(async (company) => {
          try {
            const sitesResp = await apiGet(`/api/v1/company-sites/company/${company.id}`) as { sites: CompanySite[] };
            return { ...company, sites: Array.isArray(sitesResp?.sites) ? sitesResp.sites : [] } as Company;
          } catch (e) {
            console.warn('Impossibile caricare le sedi per azienda', company.id, e);
            return { ...company, sites: [] } as Company;
          }
        })
      );

      setCompanies(companiesWithSites);
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

  // Gestione eliminazione singola con verifica persone collegate e migrazione
  const handleDeleteCompany = async (id: string) => {
    try {
      // Verifica quante persone sono collegate a questa azienda (conteggio rapido)
      const resp = await getPersons({ companyId: Number(id), page: 1, limit: 1 });
      const total = resp?.total ?? 0;
      if (total > 0) {
        // Mostra modal di migrazione
        setCompanyToDeleteId(id);
        setLinkedPersonsCount(total);
        setTargetCompanyId('');
        setShowMigrateModal(true);
        return;
      }
      // Nessuna persona collegata: elimina direttamente
      await apiDelete(`/api/v1/companies/${id}`);
      await loadCompanies();
    } catch (e) {
      console.error('Errore nell\'eliminazione azienda:', e);
      throw e;
    }
  };

  // Esegue migrazione persone verso azienda target e poi elimina l'azienda origine
  const performMigrationAndDelete = async () => {
    if (!companyToDeleteId) return;
    if (!deleteEmployeesWithoutMigration && !targetCompanyId) return; // Button è disabilitato comunque
    setMigrationLoading(true);
    try {
      if (deleteEmployeesWithoutMigration) {
        // Elimina i dipendenti collegati senza migrazione
        const pageSize = 100;
        let page = 1;
        let processed = 0;
        let total = linkedPersonsCount;
        const deletions: Array<Promise<unknown>> = [];

        while (processed < total || page === 1) {
          const resp = await getPersons({ companyId: Number(companyToDeleteId), page, limit: pageSize });
          const persons = resp?.persons || [];
          total = resp?.total ?? persons.length;
          if (persons.length === 0) break;
          
          // Elimina persone in chunks per evitare sovraccarico
          const chunks: typeof persons[] = [];
          for (let i = 0; i < persons.length; i += 10) {
            chunks.push(persons.slice(i, i + 10));
          }
          for (const chunk of chunks) {
            deletions.push(
              deleteMultiplePersons(chunk.map(p => p.id))
            );
          }
          processed += persons.length;
          page += 1;
        }

        // Attendi completamento eliminazioni
        for (const batch of deletions) {
          await batch;
        }
      } else {
        // Migra i dipendenti verso l'azienda target
        const pageSize = 100;
        let page = 1;
        let processed = 0;
        let total = linkedPersonsCount;
        const updates: Array<Promise<unknown>> = [];

        while (processed < total || page === 1) {
          const resp = await getPersons({ companyId: Number(companyToDeleteId), page, limit: pageSize });
          const persons = resp?.persons || [];
          total = resp?.total ?? persons.length;
          if (persons.length === 0) break;
          // Aggiorna companyId per ciascuna persona (limita la concorrenza a 5 per evitare sovraccarico)
          const chunks: typeof persons[] = [];
          for (let i = 0; i < persons.length; i += 5) {
            chunks.push(persons.slice(i, i + 5));
          }
          for (const chunk of chunks) {
            updates.push(
              Promise.all(
                chunk.map((p) => updatePerson(p.id, { companyId: Number(targetCompanyId) }))
              )
            );
          }
          processed += persons.length;
          page += 1;
        }

        // Attendi completamento aggiornamenti
        for (const batch of updates) {
          await batch;
        }
      }

      // Elimina ora l'azienda origine
      await apiDelete(`/api/v1/companies/${companyToDeleteId}`);

      // Pulizia stato e refresh elenco aziende
      setShowMigrateModal(false);
      setCompanyToDeleteId(null);
      setTargetCompanyId('');
      setDeleteEmployeesWithoutMigration(false);
      await loadCompanies();
    } catch (e) {
      console.error('Errore nella migrazione/eliminazione azienda:', e);
      // Lascia il modal aperto per permettere retry o cambio target
      throw e;
    } finally {
      setMigrationLoading(false);
    }
  };

   // Funzione per gestire l'import delle aziende
   const handleImportEntities = async () => {
    // Apri subito il modal per evitare ritardi percepiti
    setShowImportModal(true);
    
    // Aggiorna i dati in background senza bloccare l'UI
    loadCompanies().catch(console.error);
  };

  // Funzione per gestire la creazione di una nuova azienda
  const handleCreateCompany = () => {
    // Naviga alla pagina di creazione azienda
    window.location.href = '/companies/create';
  };

  const handleImportCompanies = async (importedCompanies: CompanyData[], overwriteIds?: string[]): Promise<import('../../components/companies/company-import/types').ImportResults> => {
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
      
      // Chiudi il modal (la chiusura ora è gestita dal componente figlio in base ai conteggi)
      // setShowImportModal(false);

      // Ritorna la risposta per permettere il conteggio nel figlio
      return response as import('../../components/companies/company-import/types').ImportResults;
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
        onDeleteEntity={handleDeleteCompany}
       />
 

      {/* Modal migrazione persone prima dell'eliminazione azienda */}
      <Modal
        open={showMigrateModal}
        onClose={() => {
          if (migrationLoading) return;
          setShowMigrateModal(false);
          setCompanyToDeleteId(null);
          setTargetCompanyId('');
          setDeleteEmployeesWithoutMigration(false);
        }}
        title="Gestione dipendenti prima dell'eliminazione"
        variant="centered"
        size="lg"
        className="rounded-xl" // Angoli uniformemente arrotondati
        contentClassName="rounded-xl" // Anche il contenuto interno
        footer={
          <>
            <Button 
              variant="ghost" 
              onClick={() => {
                if (migrationLoading) return;
                setShowMigrateModal(false);
                setCompanyToDeleteId(null);
                setTargetCompanyId('');
                setDeleteEmployeesWithoutMigration(false);
              }} 
              disabled={migrationLoading}
            >
              Annulla
            </Button>
            <Button
              variant="primary"
              onClick={performMigrationAndDelete}
              loading={migrationLoading}
              disabled={migrationLoading || (!deleteEmployeesWithoutMigration && (!targetCompanyId || companies.filter(c => c.id !== companyToDeleteId).length === 0))}
            >
              {deleteEmployeesWithoutMigration ? 'Elimina dipendenti e azienda' : 'Migra dipendenti ed elimina azienda'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Avviso importante */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-amber-800 mb-1">
                  Raccomandazione importante
                </h4>
                <p className="text-sm text-amber-700">
                  Si consiglia vivamente di <strong>migrare i dipendenti</strong> verso un'altra azienda invece di eliminarli definitivamente. 
                  La migrazione preserva lo storico e i dati dei dipendenti mantenendo la conformità GDPR.
                </p>
              </div>
            </div>
          </div>

          {/* Informazioni sui dipendenti */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Dipendenti trovati: <span className="font-bold">{linkedPersonsCount}</span>
                </p>
                <p className="text-xs text-blue-700">
                  Questi dipendenti sono attualmente collegati all'azienda che stai per eliminare.
                </p>
              </div>
            </div>
          </div>

          {/* Opzioni di gestione */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Scegli come gestire i dipendenti:</h4>
            
            {/* Opzione 1: Migrazione (raccomandato) */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="migrationOption"
                  checked={!deleteEmployeesWithoutMigration}
                  onChange={() => setDeleteEmployeesWithoutMigration(false)}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      Migra verso un'altra azienda
                    </span>
                    <Badge variant="secondary" className="text-xs">Raccomandato</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    I dipendenti saranno trasferiti all'azienda selezionata mantenendo tutti i loro dati.
                  </p>
                </div>
              </label>

              {!deleteEmployeesWithoutMigration && (
                <div className="ml-7 space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Seleziona azienda di destinazione
                  </label>
                  
                  {/* Tabella aziende disponibili */}
                  {companies.filter(c => c.id !== companyToDeleteId).length > 0 ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                          Aziende disponibili per la migrazione
                        </h5>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {companies
                          .filter(c => c.id !== companyToDeleteId)
                          .map(company => (
                            <label
                              key={company.id}
                              className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                                targetCompanyId === company.id ? 'bg-blue-50 border-blue-200' : ''
                              }`}
                            >
                              <input
                                type="radio"
                                name="targetCompany"
                                value={company.id}
                                checked={targetCompanyId === company.id}
                                onChange={(e) => setTargetCompanyId(e.target.value)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-3"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {company.ragioneSociale || company.slug || company.domain || `Azienda ${company.id}`}
                                  </p>
                                  {targetCompanyId === company.id && (
                                    <ArrowRight className="h-4 w-4 text-blue-600 ml-2 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  {company.citta && (
                                    <p className="text-xs text-gray-500">📍 {company.citta}</p>
                                  )}
                                  {company.mail && (
                                    <p className="text-xs text-gray-500">✉️ {company.mail}</p>
                                  )}
                                </div>
                              </div>
                            </label>
                          ))
                        }
                      </div>
                    </div>
                  ) : (
                    <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-red-800">
                        ❌ Non ci sono altre aziende disponibili per la migrazione. 
                        Crea prima un'altra azienda o scegli di eliminare i dipendenti.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Opzione 2: Eliminazione (sconsigliato) */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="migrationOption"
                  checked={deleteEmployeesWithoutMigration}
                  onChange={() => setDeleteEmployeesWithoutMigration(true)}
                  className="mt-0.5 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      Elimina definitivamente i dipendenti
                    </span>
                    <Badge variant="destructive" className="text-xs">Sconsigliato</Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    ⚠️ I dipendenti e tutti i loro dati saranno eliminati permanentemente. Questa azione non è reversibile.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </Modal>

       {showImportModal && (
         <CompanyImport
           onImport={handleImportCompanies}
           onClose={() => setShowImportModal(false)}
           existingCompanies={companies as unknown as CompanyData[]}
         />
       )}
     </>
   );
 };

 // Export default per compatibilità
 export default CompaniesPage;