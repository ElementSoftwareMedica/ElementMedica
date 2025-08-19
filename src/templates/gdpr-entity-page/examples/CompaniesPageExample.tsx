import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../../design-system';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { GDPREntityTemplate } from '../GDPREntityTemplate';
import { companiesConfig, createStandardColumns } from '../GDPREntityConfig';
import { Company } from '../../../types';
import { DataTableColumn } from '../../../components/shared/tables/DataTable';

/**
 * Esempio di implementazione del template GDPR per la gestione delle aziende
 * Dimostra come utilizzare il template unificato con configurazione personalizzata
 */

export const CompaniesPageExample: React.FC = () => {
  const navigate = useNavigate();
  
  // Definizione colonne personalizzate per le aziende
  const columns: DataTableColumn<Company>[] = [
    {
      key: 'name',
      label: 'Nome Azienda',
      sortable: true,
      width: 300,
      renderCell: (company: Company) => (
        <div className="font-medium">
          {company.name}
        </div>
      )
    },
    {
      key: 'address',
      label: 'Indirizzo',
      sortable: true,
      width: 200,
      renderCell: (company: Company) => company.address || '-'
    },
    {
      key: 'city',
      label: 'Città',
      sortable: true,
      width: 120,
      renderCell: (company: Company) => company.city || '-'
    },
    {
      key: 'province',
      label: 'Provincia',
      sortable: true,
      width: 100,
      renderCell: (company: Company) => company.province || '-'
    },
    {
      key: 'vatNumber',
      label: 'P.IVA',
      sortable: true,
      width: 120,
      renderCell: (company: Company) => company.vatNumber || '-'
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      width: 200,
      renderCell: (company: Company) => company.email || '-'
    },
    {
      key: 'phone',
      label: 'Telefono',
      sortable: true,
      width: 120,
      renderCell: (company: Company) => company.phone || '-'
    },
    {
      key: 'status',
      label: 'Stato',
      sortable: true,
      width: 120,
      renderCell: (company) => (
          <Badge variant={company.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {company.status || 'ACTIVE'}
          </Badge>
        )
    }
  ];
  
  // Handler personalizzati
  const handleCreateCompany = () => {
    navigate('/companies/create');
  };
  
  const handleEditCompany = (company: Company) => {
    navigate(`/companies/${company.id}/edit`);
  };
  
  const handleDeleteCompany = async (id: string) => {
    // Implementazione personalizzata per eliminazione azienda
    // Qui potresti aggiungere logica specifica per le aziende
    console.log('Eliminazione azienda personalizzata:', id);
    
    // Chiamata API personalizzata se necessario
    // await customDeleteCompany(id);
  };
  
  const handleImportCompanies = async (data: any[]) => {
    // Implementazione personalizzata per import aziende
    console.log('Import aziende personalizzato:', data);
    
    // Logica di validazione e trasformazione dati specifica per aziende
    const validatedData = data.map(item => ({
      ...item,
      // Validazioni specifiche per aziende
      vatNumber: item.vatNumber?.replace(/[^0-9]/g, ''), // Solo numeri per P.IVA
      email: item.email?.toLowerCase(), // Email in minuscolo
      status: item.status || 'ACTIVE' // Stato di default
    }));
    
    // Chiamata API per import
    // await importCompanies(validatedData);
  };
  
  const handleExportCompanies = (companies: Company[]) => {
    // Implementazione personalizzata per export aziende
    console.log('Export aziende personalizzato:', companies);
    
    // Potresti aggiungere logica per formattazione speciale dei dati
    const formattedData = companies.map(company => ({
      ...company,
      full_address: `${company.address || ''}, ${company.city || ''} ${company.province || ''}`.trim(),
      contact_info: `${company.email || ''} - ${company.phone || ''}`.replace(/^\s*-\s*|\s*-\s*$/g, '')
    }));
    
    // Esportazione con dati formattati
    // exportToCsv(formattedData, customHeaders, 'aziende_export.csv');
  };
  
  return (
    <GDPREntityTemplate<Company>
      // Configurazione base da config
      {...companiesConfig}
      
      // Colonne personalizzate
      columns={columns}
      
      // Handler personalizzati
      onCreateEntity={handleCreateCompany}
      onEditEntity={handleEditCompany}
      onDeleteEntity={handleDeleteCompany}
      onImportEntities={handleImportCompanies}
      onExportEntities={handleExportCompanies}
      
      // Configurazioni specifiche per aziende
      filterOptions={[
        {
          label: 'Stato',
          key: 'status',
          options: [
            { label: 'Attiva', value: 'ACTIVE' },
            { label: 'Inattiva', value: 'INACTIVE' }
          ]
        },
        {
          label: 'Provincia',
          key: 'province',
          options: [
            { label: 'Milano', value: 'MI' },
            { label: 'Roma', value: 'RM' },
            { label: 'Torino', value: 'TO' },
            { label: 'Napoli', value: 'NA' },
            { label: 'Bologna', value: 'BO' }
          ]
        }
      ]}
      
      sortOptions={[
        { label: 'Nome (A-Z)', key: 'name-asc' },
        { label: 'Nome (Z-A)', key: 'name-desc' },
        { label: 'Città (A-Z)', key: 'city-asc' },
        { label: 'Città (Z-A)', key: 'city-desc' },
        { label: 'Data creazione (recente)', key: 'createdAt-desc' },
        { label: 'Data creazione (meno recente)', key: 'createdAt-asc' }
      ]}
      
      // Configurazione card per vista griglia
      cardConfig={{
        titleField: 'name',
        subtitleField: 'city',
        badgeField: 'status',
        descriptionField: 'address',
        additionalFields: [
          {
            key: 'vatNumber',
            label: 'P.IVA',
            icon: <Eye className="h-3.5 w-3.5" />
          },
          {
            key: 'email',
            label: 'Email',
            icon: <Edit className="h-3.5 w-3.5" />
          },
          {
            key: 'phone',
            label: 'Telefono',
            icon: <Trash2 className="h-3.5 w-3.5" />
          },
          {
            key: 'contactPerson',
            label: 'Contatto',
            icon: <Eye className="h-3.5 w-3.5" />
          }
        ]
      }}
      
      // Configurazioni UI
      enableBatchOperations={true}
      enableImportExport={true}
      enableColumnSelector={true}
      enableAdvancedFilters={true}
      defaultViewMode="table"
    />
  );
};

export default CompaniesPageExample;

/**
 * Esempio di utilizzo alternativo con configurazione minima
 */
export const CompaniesPageMinimal: React.FC = () => {
  // Utilizzo con configurazione minima usando createStandardColumns
  const minimalColumns = createStandardColumns<Company>([
    { key: 'name', label: 'Nome', width: 200 },
    { key: 'city', label: 'Città', width: 150 },
    { key: 'email', label: 'Email', width: 200 },
    { 
      key: 'status', 
      label: 'Stato', 
      width: 120,
      formatter: (value) => (
        <Badge variant={value === 'ACTIVE' ? 'default' : 'secondary'}>
          {value || 'ACTIVE'}
        </Badge>
      )
    }
  ]);
  
  return (
    <GDPREntityTemplate<Company>
      {...companiesConfig}
      columns={minimalColumns}
      enableBatchOperations={false}
      enableImportExport={false}
      enableColumnSelector={false}
      enableAdvancedFilters={false}
    />
  );
};

/**
 * Esempio di utilizzo con permessi personalizzati
 */
export const CompaniesPageCustomPermissions: React.FC = () => {
  return (
    <GDPREntityTemplate<Company>
      {...companiesConfig}
      
      // Override permessi per logica specifica
      readPermission="companies.view"
      writePermission="companies.manage"
      deletePermission="companies.remove"
      exportPermission="companies.export"
      
      columns={createStandardColumns<Company>([
        { key: 'name', label: 'Nome Azienda' },
        { key: 'city', label: 'Città' },
        { key: 'vatNumber', label: 'P.IVA' }
      ])}
    />
  );
};