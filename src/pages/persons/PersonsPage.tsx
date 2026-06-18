import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GDPREntityTemplate, DataTableColumn } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { Badge } from '../../design-system';
import {
  Building2,
  Calendar,
  Mail,
  Phone,
  Plus,
  Shield,
  User,
  BookOpen,
  X
} from 'lucide-react';
import { DateRangeCalendar } from '../../components/ui/DateRangeCalendar';
import type { DateRange } from '../../components/ui/DateRangeCalendar';
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
import EmployeeImportModal from '../../components/import/employee/EmployeeImportModal';
import TrainerImportModal from '../../components/import/trainer/TrainerImportModal';
import { useToast } from '../../hooks/useToast';
import { apiPost } from '../../services/api';
import { useTenant } from '../../context/TenantContext';

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
  const { tenant } = useTenant();

  // Stati per il modal di importazione
  const [showImportModal, setShowImportModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Key per forzare refresh del template

  // Filtri corsi (solo per employees)
  const [corsoCategoria, setCorsoCategoria] = useState('');
  const [corsoRange, setCorsoRange] = useState<DateRange>({ start: null, end: null });
  const [courseRefreshTrigger, setCourseRefreshTrigger] = useState(0);
  const isCourseFilterMounted = useRef(false);

  // Hook per recuperare dati esistenti per l'importazione (inclusi soft-deleted)
  const { filteredPersons: existingPersonsForImport, refetch: refetchPersonsForImport } = useAllPersonsForImport();
  const { filteredPersons: existingPersons, refetch: refetchPersons } = useAllPersons();
  const { companies: existingCompanies, refresh: refreshCompanies } = useCompanies();

  // Determina il titolo e sottotitolo in base al tipo di filtro
  const pageTitle = title || (() => {
    switch (filterType) {
      case 'employees': return 'Dipendenti';
      case 'trainers': return 'Formatori';
      default: return 'Persone';
    }
  })();

  // Singolare corretto per il dropdown "Aggiungi X"
  const pageTitleSingular = (() => {
    switch (filterType) {
      case 'employees': return 'Dipendente';
      case 'trainers': return 'Formatore';
      default: return 'Persona';
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
  const getPersonsColumns = (): DataTableColumn<Person>[] => {
    // Colonne comuni
    const commonColumns: DataTableColumn<Person>[] = [
      {
        key: 'lastName',
        label: 'Nome Completo',
        sortable: true,
        renderCell: (person) => {
          // Subtitle: per trainers mostra data nascita, per employees mostra azienda
          const subtitle = filterType === 'trainers' && person.birthDate
            ? new Date(person.birthDate).toLocaleDateString('it-IT')
            : (person.personRoles?.find(r => r.roleType === 'EMPLOYEE' && !r.deletedAt)?.company?.ragioneSociale ||
              person.company?.ragioneSociale);

          return (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {`${person.lastName} ${person.firstName}`}
                </div>
                <div className="text-sm text-gray-500">
                  {subtitle ? (
                    <div className="flex items-center gap-1">
                      {filterType === 'trainers' ? (
                        <Calendar className="h-3 w-3" />
                      ) : (
                        <Building2 className="h-3 w-3" />
                      )}
                      {subtitle}
                    </div>
                  ) : (
                    <span className="text-gray-400">
                      {filterType === 'trainers' ? 'Data nascita non disponibile' : 'Nessuna azienda'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        }
      },
      {
        key: 'phone',
        label: 'Contatti',
        sortable: true,
        renderCell: (person) => {
          if (!person.phone && !person.email) return <span className="text-gray-400">N/A</span>;
          return (
            <div className="space-y-0.5">
              {person.phone && (
                <div className="flex items-center gap-1 text-sm">
                  <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span>{person.phone}</span>
                </div>
              )}
              {person.email && (
                <div className="flex items-center gap-1 text-sm">
                  <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate max-w-[180px]">{person.email}</span>
                </div>
              )}
            </div>
          );
        }
      }
    ];

    // Colonne specifiche per employees
    const employeeColumns: DataTableColumn<Person>[] = [
      {
        key: 'profile',
        label: 'Profilo Professionale',
        sortable: true,
        renderCell: (person: Person) => {
          const mansioniNames = (person.mansioni || [])
            .map(m => m.denominazione)
            .filter(Boolean)
            .join(', ');
          if (!person.title && !mansioniNames) return <span className="text-gray-400">N/A</span>;
          return (
            <div className="space-y-0.5">
              {person.title && (
                <div className="text-sm font-medium text-gray-900">{person.title}</div>
              )}
              {mansioniNames && (
                <div className="text-xs text-gray-500">{mansioniNames}</div>
              )}
            </div>
          );
        }
      },
      {
        key: 'site',
        label: 'Sede',
        sortable: true,
        renderCell: (person: Person) => {
          const siteName = person.site?.siteName || person.site?.name;
          if (siteName) return <span className="text-gray-900">{siteName}</span>;
          const fallback = person.fallbackSite?.siteName;
          if (fallback) return <span className="text-gray-500 italic">{fallback}</span>;
          return <span className="text-gray-400">N/A</span>;
        }
      },
      {
        key: 'hiringDate',
        label: 'Data Assunzione',
        sortable: true,
        renderCell: (person: Person) => {
          const hiringDate = person.hiredDate;
          return hiringDate ? (
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{new Date(hiringDate).toLocaleDateString('it-IT')}</span>
            </div>
          ) : (
            <span className="text-gray-400">N/A</span>
          );
        }
      }
    ];

    // Colonne specifiche per trainers
    const trainerColumns: DataTableColumn<Person>[] = [
      {
        key: 'certifications',
        label: 'Certificazioni',
        sortable: false,
        renderCell: (person: Person) => {
          const certs = person.certifications;
          return certs && certs.length > 0 ? (
            <span className="text-gray-900 text-sm">
              {certs.join(', ')}
            </span>
          ) : (
            <span className="text-gray-400">Nessuna</span>
          );
        }
      },
      {
        key: 'city',
        label: 'Città',
        sortable: true,
        renderCell: (person: Person) => {
          const city = person.residenceCity;
          return city ? (
            <span className="text-gray-900">{city}</span>
          ) : (
            <span className="text-gray-400">N/A</span>
          );
        }
      },
      {
        key: 'hourlyRate',
        label: 'Prezzo/h',
        sortable: true,
        renderCell: (person: Person) => {
          const rate = person.hourlyRate;
          return rate ? (
            <span className="text-gray-900 font-medium">€{Number(rate).toFixed(2)}</span>
          ) : (
            <span className="text-gray-400">N/A</span>
          );
        }
      }
    ];

    // Combina colonne in base al tipo
    if (filterType === 'trainers') {
      return [...commonColumns, ...trainerColumns];
    } else if (filterType === 'employees') {
      return [...commonColumns, ...employeeColumns];
    } else {
      return commonColumns;
    }
  };

  // Configurazione filtri
  const filterOptions = useMemo(() => {
    const options = [
      {
        key: 'status',
        label: 'Stato',
        options: [
          { label: 'Attivo', value: 'ACTIVE' },
          { label: 'Inattivo', value: 'INACTIVE' },
          { label: 'In attesa', value: 'PENDING' },
          { label: 'Sospeso', value: 'SUSPENDED' }
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
            case 'ACTIVE': return 'Attivo';
            case 'INACTIVE': return 'Inattivo';
            case 'PENDING': return 'In attesa';
            default: return person.status as string;
          }
        },
        icon: <Shield className="h-4 w-4" />
      }
    ]
  };

  // Headers CSV senza caratteri accentati per evitare errori di importazione
  const csvHeaders = useMemo(() => {
    const baseHeaders = {
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
      title: 'Profilo Professionale'
    } as const;

    if (filterType === 'employees') {
      return { ...baseHeaders, hiredDate: 'Data Assunzione' };
    }
    if (filterType === 'trainers') {
      return baseHeaders;
    }
    // all/custom: includi tutti i campi
    return { ...baseHeaders, hiredDate: 'Data Assunzione' };
  }, [filterType]);

  // Template CSV con dati di esempio - COMPLETO CON TUTTI I CAMPI
  const csvTemplateData = useMemo(() => {
    if (filterType === 'employees') {
      return [
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
        }
      ];
    }
    if (filterType === 'trainers') {
      return [
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
          title: 'Senior Trainer'
        }
      ];
    }
    // all/custom
    return [
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
        title: 'Senior Trainer'
      }
    ];
  }, [filterType]);

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

  const handleViewPerson = (person: Person) => {
    switch (filterType) {
      case 'employees':
        navigate(`/employees/${person.id}`);
        break;
      case 'trainers':
        navigate(`/trainers/${person.id}`);
        break;
      default:
        navigate(`/persons/${person.id}`);
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

    // Apri SUBITO il modal per evitare la percezione di "doppio clic" e aggiorna i dati in background
    setShowImportModal(true);

    try {
      // Esegui i refetch in background senza bloccare l'apertura del modal
      void refetchPersonsForImport();
      void refetchPersons();
      void refreshCompanies();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Errore durante l\'aggiornamento dei dati:', error);
    }
  };

  const handleImportPersons = async (persons: any[], overwriteIds?: string[]) => {
    try {
      const response = await apiPost<{
        imported: number;
        errors: Array<{ row: number; error: string }>;
        updated?: number;
        skipped?: number;
      }>(
        '/api/v1/persons/import?mode=json',
        {
          persons,
          overwriteIds
        }
      );

      showToast({
        type: 'success',
        message: `Importazione completata: ${response.imported} persone importate con successo${response.updated ? `, ${response.updated} aggiornate` : ''}${response.skipped ? `, ${response.skipped} saltate` : ''}`
      });

      setShowImportModal(false);
      await refetchPersons();
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Errore durante l\'importazione:', error);
      showToast({
        type: 'error',
        message: 'Errore durante l\'importazione delle persone'
      });
    }
  };

  // Trigger refresh quando cambiano i filtri corsi
  useEffect(() => {
    if (!isCourseFilterMounted.current) {
      isCourseFilterMounted.current = true;
      return;
    }
    if (filterType === 'employees') {
      setCourseRefreshTrigger(prev => prev + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corsoCategoria, corsoRange.start, corsoRange.end, filterType]);

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

  // Query params statici per filtrare lato backend in base al tipo virtuale
  const staticQueryParams = useMemo(() => {
    const base: Record<string, string> = { sortBy: 'lastName', sortOrder: 'asc' };
    if (filterType === 'employees') base.roleType = 'EMPLOYEE';
    if (filterType === 'trainers') base.roleType = 'TRAINER';
    if (filterType === 'employees') {
      if (corsoCategoria) base.corsoCategoria = corsoCategoria;
      if (corsoRange.start) base.corsoPeriodoStart = corsoRange.start.toISOString().split('T')[0];
      if (corsoRange.end) base.corsoPeriodoEnd = corsoRange.end.toISOString().split('T')[0];
    }
    return base;
  }, [filterType, corsoCategoria, corsoRange]);

  const activeCourseFilterCount = (corsoCategoria ? 1 : 0) + (corsoRange.start || corsoRange.end ? 1 : 0);

  return (
    <>
      {/* Filtri corsi (solo employees) */}
      {filterType === 'employees' && (
        <div className="px-4 pt-4 pb-0 max-w-screen-xl mx-auto">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">
              <BookOpen className="w-4 h-4" />
              Corsi
            </div>

            {/* Categoria corso */}
            <input
              type="text"
              placeholder="Tipo corso (es. Antincendio)..."
              value={corsoCategoria}
              onChange={e => setCorsoCategoria(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 w-52"
            />

            {/* Periodo corsi */}
            <DateRangeCalendar
              value={corsoRange}
              onChange={setCorsoRange}
              placeholder="Periodo corsi..."
            />

            {/* Reset filtri corsi */}
            {activeCourseFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setCorsoCategoria(''); setCorsoRange({ start: null, end: null }); }}
                className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-600 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Reset
                <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                  {activeCourseFilterCount}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Template GDPR */}
      <GDPREntityTemplate<Person>
        key={refreshKey} // Forza re-mount quando refreshKey cambia
        refreshTrigger={courseRefreshTrigger}
        entityName={gdprConfig.entityType}
        entityNamePlural="persons"
        entityDisplayName={pageTitleSingular}
        entityDisplayNamePlural={pageTitle}

        readPermission={permissions.read}
        writePermission={(permissions as any).write || (permissions as any).create}
        deletePermission={permissions.delete}
        exportPermission={permissions.export}

        apiEndpoint="/api/v1/persons"

        columns={getPersonsColumns()}
        searchFields={['firstName', 'lastName', 'email']}
        filterOptions={filterOptions}
        staticQueryParams={staticQueryParams}

        csvHeaders={csvHeaders}
        csvTemplateData={csvTemplateData}

        onCreateEntity={handleCreatePerson}
        onViewEntity={handleViewPerson}
        onEditEntity={handleEditPerson}
        onImportEntities={handleImportEntities}

        cardConfig={cardConfig}

        enableBatchOperations={gdprConfig.gdprLevel === 'comprehensive'}
        enableImportExport={true}
        enableColumnSelector={true}
        enableAdvancedFilters={true}
        defaultViewMode="table"
      />

      {/* Modal di importazione - usa modali specifici per employees/trainers */}
      {showImportModal && filterType === 'employees' && tenant?.id && (
        <EmployeeImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          companies={existingCompanies || []}
          tenantId={tenant.id}
          onImportComplete={async () => {
            await refetchPersonsForImport();
            await refetchPersons();
            await refreshCompanies();
            setShowImportModal(false);
            // Forza refresh del GDPREntityTemplate incrementando la key
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showImportModal && filterType === 'trainers' && tenant?.id && (
        <TrainerImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          tenantId={tenant.id}
          onImportComplete={async () => {
            await refetchPersonsForImport();
            await refetchPersons();
            setShowImportModal(false);
            // Forza refresh del GDPREntityTemplate incrementando la key
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showImportModal && filterType !== 'employees' && filterType !== 'trainers' && (
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
    </>
  );
};

export default PersonsPage;