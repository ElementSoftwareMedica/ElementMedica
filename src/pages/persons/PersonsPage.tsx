import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GDPREntityTemplate } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { Badge } from '../../design-system';
import { 
  Building2,
  Calendar,
  Mail,
  Phone,
  Plus,
  Shield,
  User
} from 'lucide-react';
import { 
  Person, 
  FilterConfig, 
  getRoleDisplayName, 
  getActiveRoles,
  getHighestRole 
} from '../../services/roleHierarchyService';
import { usePersonFilters, useAllPersons, useAllPersonsForImport } from '../../hooks/usePersonFilters';
import { useCompanies } from '../../hooks/useCompanies';
import { PersonGDPRConfigFactory } from '../../config/personGDPRConfig';
import { PersonPermissionChecker } from '../../config/personPermissions';
import { PersonImportRefactored as PersonImport } from '../../components/persons/person-import';
import { useToast } from '../../hooks/useToast';
import { apiPost } from '../../services/api';

export interface PersonsPageProps {
  filter?: FilterConfig;
  filterType?: 'all' | 'employees' | 'trainers' | 'custom';
  title?: string;
  subtitle?: string;
}

/**
 * Pagina unificata per la gestione delle persone
 * Utilizza il template GDPR e supporta filtri gerarchici per employees/trainers
 */
export const PersonsPage: React.FC<PersonsPageProps> = ({
  filter,
  filterType = 'all',
  title,
  subtitle
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // Stati per il modal di importazione
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Hook per recuperare dati esistenti per l'importazione (inclusi soft-deleted)
  const { filteredPersons: existingPersonsForImport, refetch: refetchPersonsForImport } = useAllPersonsForImport();
  const { filteredPersons: existingPersons, refetch: refetchPersons } = useAllPersons();
  const { companies: existingCompanies, refresh: refreshCompanies } = useCompanies();

  // Debug logging per capire cosa restituisce useAllPersonsForImport
  console.log('🔍 PersonsPage - existingPersonsForImport:', existingPersonsForImport?.length || 0, 'elementi');
  console.log('🔍 PersonsPage - existingPersons:', existingPersons?.length || 0, 'elementi');
  console.log('🔍 PersonsPage - existingCompanies:', existingCompanies?.length || 0, 'elementi');

  // Determina il titolo e sottotitolo in base al tipo di filtro
  const pageTitle = title || (() => {
    switch (filterType) {
      case 'employees': return 'Dipendenti';
      case 'trainers': return 'Formatori';
      default: return 'Persone';
    }
  })();

  const pageSubtitle = subtitle || (() => {
    switch (filterType) {
      case 'employees': return 'Gestione dipendenti aziendali';
      case 'trainers': return 'Gestione formatori e coordinatori';
      default: return 'Gestione persone del sistema';
    }
  })();

  // Configurazione colonne per la tabella
  const getPersonsColumns = (): DataTableColumn<Person>[] => [
    {
      key: 'fullName',
      label: 'Nome Completo',
      sortable: true,
      renderCell: (person) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-500" />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {`${person.firstName} ${person.lastName}`}
            </div>
            <div className="text-sm text-gray-500">{person.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      renderCell: (person) => (
        <a 
          href={`mailto:${person.email}`} 
          className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
        >
          <Mail className="h-4 w-4" />
          <span>{person.email}</span>
        </a>
      )
    },
    {
      key: 'phone',
      label: 'Telefono',
      sortable: true,
      renderCell: (person) => person.phone ? (
        <div className="flex items-center space-x-1">
          <Phone className="h-4 w-4 text-gray-400" />
          <span>{person.phone}</span>
        </div>
      ) : (
        <span className="text-gray-400">N/A</span>
      )
    },
    {
      key: 'title',
      label: 'Profilo Professionale',
      sortable: true,
      renderCell: (person) => (
        <span className="text-gray-900">
          {person.title || 'N/A'}
        </span>
      )
    },
    {
      key: 'roles',
      label: 'Ruoli',
      sortable: false,
      renderCell: (person) => {
        const activeRoles = getActiveRoles(person);
        const highestRole = getHighestRole(person);
        
        return (
          <div className="flex flex-wrap gap-1">
            {activeRoles.length > 0 ? (
              activeRoles.map(role => (
                <Badge 
                  key={role.id} 
                  variant={role.id === highestRole?.id ? "default" : "outline"}
                  className="text-xs"
                >
                  {getRoleDisplayName(role.roleType)}
                </Badge>
              ))
            ) : (
              <span className="text-gray-400 text-sm">Nessun ruolo</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'company',
      label: 'Azienda',
      sortable: true,
      renderCell: (person) => person.company ? (
        <div className="flex items-center space-x-1">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span>{person.company.ragioneSociale}</span>
        </div>
      ) : (
        <span className="text-gray-400">N/A</span>
      )
    },
    {
      key: 'status',
      label: 'Stato',
      sortable: true,
      renderCell: (person) => {
        const getStatusVariant = (status: string) => {
          switch (status) {
            case 'Active': return 'default';
            case 'Inactive': return 'secondary';
            case 'Pending': return 'outline';
            default: return 'secondary';
          }
        };

        const getStatusLabel = (status: string) => {
          switch (status) {
            case 'Active': return 'Attivo';
            case 'Inactive': return 'Inattivo';
            case 'Pending': return 'In attesa';
            default: return status;
          }
        };

        return (
          <Badge variant={getStatusVariant(person.status) as any}>
            {getStatusLabel(person.status)}
          </Badge>
        );
      }
    },
    {
      key: 'createdAt',
      label: 'Creato il',
      sortable: true,
      renderCell: (person) => (
        <div className="flex items-center space-x-1">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>{new Date(person.createdAt).toLocaleDateString('it-IT')}</span>
        </div>
      )
    }
  ];

  // Configurazione filtri
  const filterOptions = useMemo(() => {
    const options = [
      {
        key: 'status',
        label: 'Stato',
        options: [
          { label: 'Attivo', value: 'Active' },
          { label: 'Inattivo', value: 'Inactive' },
          { label: 'In attesa', value: 'Pending' }
        ]
      }
    ];

    // Aggiungi filtri specifici per tipo
    if (filterType === 'employees') {
      options.push({
        key: 'roleType',
        label: 'Ruolo Dipendente',
        options: [
          { label: 'Responsabile Aziendale', value: 'COMPANY_ADMIN' },
          { label: 'Manager HR', value: 'HR_MANAGER' },
          { label: 'Manager', value: 'MANAGER' },
          { label: 'Dipendente', value: 'EMPLOYEE' }
        ]
      });
    } else if (filterType === 'trainers') {
      options.push({
        key: 'roleType',
        label: 'Ruolo Formatore',
        options: [
          { label: 'Coordinatore Formatori', value: 'TRAINER_COORDINATOR' },
          { label: 'Formatore Senior', value: 'SENIOR_TRAINER' },
          { label: 'Formatore', value: 'TRAINER' },
          { label: 'Formatore Esterno', value: 'EXTERNAL_TRAINER' }
        ]
      });
    }

    return options;
  }, [filterType]);

  // Configurazione card per vista griglia
  const cardConfig = {
    titleField: 'firstName' as keyof Person,
    subtitleField: 'email' as keyof Person,
    title: (person: Person) => `${person.firstName} ${person.lastName}`,
    subtitle: (person: Person) => person.email,
    badge: (person: Person) => {
      const highestRole = getHighestRole(person);
      return {
        text: highestRole ? getRoleDisplayName(highestRole.roleType) : 'Nessun ruolo',
        variant: 'outline' as const
      };
    },
    icon: () => <User className="h-5 w-5" />,
    fields: [
      {
        label: 'Telefono',
        value: (person: Person) => person.phone || 'N/A',
        icon: <Phone className="h-4 w-4" />
      },
      {
        label: 'Azienda',
        value: (person: Person) => person.company?.ragioneSociale || 'N/A',
        icon: <Building2 className="h-4 w-4" />
      },
      {
        label: 'Stato',
        value: (person: Person) => {
          switch (person.status) {
            case 'Active': return 'Attivo';
            case 'Inactive': return 'Inattivo';
            case 'Pending': return 'In attesa';
            default: return person.status;
          }
        },
        icon: <Shield className="h-4 w-4" />
      }
    ]
  };

  // Headers CSV senza caratteri accentati per evitare errori di importazione
  const csvHeaders = {
    firstName: 'Nome',
    lastName: 'Cognome',
    email: 'Email',
    phone: 'Telefono',
    taxCode: 'Codice Fiscale',
    birthDate: 'Data Nascita',
    address: 'Indirizzo',
    city: 'Citta',
    province: 'Provincia',
    postalCode: 'CAP',
    roleType: 'Ruolo',
    companyName: 'Azienda',
    username: 'Username',
    notes: 'Note',
    status: 'Stato',
    createdAt: 'Data Creazione',
    // Campi aggiuntivi per compatibilita con PersonImport
    title: 'Profilo Professionale',
    hiredDate: 'Data Assunzione'
  };

  // Template CSV con dati di esempio - COMPLETO CON TUTTI I CAMPI
  const csvTemplateData = [
    {
      firstName: 'Mario',
      lastName: 'Rossi',
      email: 'mario.rossi@esempio.com',
      phone: '+39 123 456 7890',
      taxCode: 'RSSMRA85M01H501Z',
      birthDate: '1985-08-01',
      address: 'Via Roma 123',
      city: 'Milano',
      province: 'MI',
      postalCode: '20100',
      roleType: 'EMPLOYEE',
      companyName: 'Esempio Azienda S.r.l.',
      username: 'mario.rossi',
      notes: 'Dipendente esempio',
      status: 'ACTIVE',
      createdAt: '2024-01-01',
      title: 'Sviluppatore Software',
      hiredDate: '2024-01-15'
    },
    {
      firstName: 'Anna',
      lastName: 'Bianchi',
      email: 'anna.bianchi@esempio.com',
      phone: '+39 321 654 9870',
      taxCode: 'BNCNNA90F41H501W',
      birthDate: '1990-06-01',
      address: 'Via Milano 456',
      city: 'Roma',
      province: 'RM',
      postalCode: '00100',
      roleType: 'TRAINER',
      companyName: 'Formazione Plus S.r.l.',
      username: 'anna.bianchi',
      notes: 'Formatrice esperta',
      status: 'ACTIVE',
      createdAt: '2024-01-02',
      title: 'Senior Trainer',
      hiredDate: '2024-02-01'
    }
  ];

  // Handlers
  const handleCreatePerson = () => {
    switch (filterType) {
      case 'employees':
        navigate('/employees/create');
        break;
      case 'trainers':
        navigate('/trainers/create');
        break;
      default:
        navigate('/persons/create');
        break;
    }
  };

  const handleEditPerson = (person: Person) => {
    switch (filterType) {
      case 'employees':
        navigate(`/employees/${person.id}/edit`);
        break;
      case 'trainers':
        navigate(`/trainers/${person.id}/edit`);
        break;
      default:
        navigate(`/persons/${person.id}/edit`);
        break;
    }
  };

  // Gestione importazione persone
  const handleImportEntities = async (data: any[]) => {
    // Se viene chiamata dal template con dati, processa direttamente
    if (data && data.length > 0) {
      return handleImportPersons(data);
    }
    
    // Prima di aprire il modal, aggiorna i dati esistenti (inclusi soft-deleted per importazione)
    try {
      await refetchPersonsForImport();
      await refetchPersons();
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dei dati:', error);
    }
    
    // Altrimenti apri il modal
    setShowImportModal(true);
  };

  const handleImportPersons = async (persons: any[], overwriteIds?: string[]) => {
    try {
      const response = await apiPost('/api/v1/persons/import', {
        persons,
        overwriteIds
      });

      showToast({
        type: 'success',
        message: `Importazione completata: ${response.imported} persone importate con successo`
      });

      setShowImportModal(false);
      
      // Aggiorna i dati delle persone senza ricaricare la pagina
      await refetchPersons();
    } catch (error: any) {
      console.error('Errore durante l\'importazione:', error);
      showToast({
        type: 'error',
        message: error.message || 'Errore durante l\'importazione delle persone'
      });
    }
  };

  // Configurazione GDPR dinamica
  const gdprConfig = useMemo(() => {
    // Gestisce il caso 'custom' mappandolo a 'all'
    const mappedFilterType = filterType === 'custom' ? 'all' : filterType;
    return PersonGDPRConfigFactory.getConfigByFilterType(mappedFilterType);
  }, [filterType]);

  // Permessi dinamici basati sul tipo di filtro
  const permissions = useMemo(() => {
    const mappedFilterType = filterType === 'custom' ? 'all' : filterType;
    const config = PersonGDPRConfigFactory.getConfigByFilterType(mappedFilterType);
    return config.permissions;
  }, [filterType]);

  return (
    <div className="space-y-6">
      {/* Header personalizzato */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
        <p className="text-gray-600 mt-1">{pageSubtitle}</p>
        
        {/* Indicatore livello GDPR */}
        <div className="mt-2">
          <Badge 
            variant={gdprConfig.gdprLevel === 'comprehensive' ? 'default' : 'outline'}
            className="text-xs"
          >
            GDPR: {gdprConfig.gdprLevel === 'comprehensive' ? 'Completo' : 'Standard'}
          </Badge>
        </div>
      </div>

      {/* Template GDPR */}
      <GDPREntityTemplate<Person>
        entityName={gdprConfig.entityType}
        entityNamePlural="persons"
        entityDisplayName={gdprConfig.displayName}
        entityDisplayNamePlural={gdprConfig.displayName}
        
        readPermission={permissions.read}
        writePermission={(permissions as any).write || (permissions as any).create}
        deletePermission={permissions.delete}
        exportPermission={permissions.export}
        
        apiEndpoint="/api/v1/persons"
        
        columns={getPersonsColumns()}
        searchFields={['firstName', 'lastName', 'email']}
        filterOptions={filterOptions}
        
        csvHeaders={csvHeaders}
        csvTemplateData={csvTemplateData}
        
        onCreateEntity={handleCreatePerson}
        onEditEntity={handleEditPerson}
        onImportEntities={handleImportEntities}
        
        cardConfig={cardConfig}
        
        enableBatchOperations={gdprConfig.gdprLevel === 'comprehensive'}
        enableImportExport={true}
        enableColumnSelector={true}
        enableAdvancedFilters={true}
        defaultViewMode="table"
      />

      {/* Modal di importazione */}
      {showImportModal && (
        <PersonImport
          onImport={handleImportPersons}
          onClose={() => setShowImportModal(false)}
          existingPersons={existingPersonsForImport || []}
          existingCompanies={existingCompanies || []}
          onRefreshData={async () => {
            await refetchPersonsForImport();
            await refetchPersons();
            await refreshCompanies();
          }}
        />
      )}
    </div>
  );
};

export default PersonsPage;