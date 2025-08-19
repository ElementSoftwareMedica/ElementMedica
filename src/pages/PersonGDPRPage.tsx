import React from 'react';
import { GDPREntityPage } from '../templates/gdpr-entity-page/components/GDPREntityPage';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  residenceAddress?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Pagina per la gestione delle persone con conformità GDPR
 * Utilizza il template GDPREntityPage per fornire tutte le funzionalità necessarie
 */
export function PersonGDPRPage() {
  // Configurazione delle colonne per la tabella delle persone
  const personColumns = [
    {
      key: 'firstName',
      label: 'Nome',
      sortable: true,
      render: (value: any, person: Person) => person.firstName
    },
    {
      key: 'lastName',
      label: 'Cognome',
      sortable: true,
      render: (value: any, person: Person) => person.lastName
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (value: any, person: Person) => person.email
    },
    {
      key: 'phone',
      label: 'Telefono',
      sortable: false,
      render: (value: any, person: Person) => person.phone || '-'
    },
    {
      key: 'dateOfBirth',
      label: 'Data di nascita',
      sortable: true,
      render: (value: any, person: Person) => person.dateOfBirth 
        ? new Date(person.dateOfBirth).toLocaleDateString('it-IT')
        : '-'
    },
    {
      key: 'createdAt',
      label: 'Creato il',
      sortable: true,
      render: (value: any, person: Person) => new Date(person.createdAt).toLocaleDateString('it-IT')
    }
  ];

  // Gestori delle azioni
  const handleViewPerson = (person: Person) => {
    console.log('Visualizza persona:', person);
    // Implementare navigazione al dettaglio
  };

  const handleEditPerson = (person: Person) => {
    console.log('Modifica persona:', person);
    // Implementare navigazione al form di modifica
  };

  const handleDeletePerson = (person: Person) => {
    console.log('Elimina persona:', person);
    // Implementare logica di eliminazione
  };

  const handleExportPerson = (person: Person) => {
    console.log('Esporta persona:', person);
    // Implementare logica di esportazione
  };

  const handleCreatePerson = () => {
    console.log('Crea nuova persona');
    // Implementare navigazione al form di creazione
  };

  const handleImportPersons = () => {
    console.log('Importa persone');
    // Implementare logica di importazione
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestione Persone
          </h1>
          <p className="mt-2 text-gray-600">
            Gestisci le persone nel sistema con conformità GDPR completa
          </p>
        </div>

        <GDPREntityPage<Person>
          // Configurazione entità
          entityType="person"
          entityName="persona"
          entityNamePlural="persone"
          
          // Configurazione API
          apiEndpoint="/api/persons"
          
          // Configurazione colonne
          columns={personColumns}
          
          // Configurazione permessi GDPR
          permissions={{
            read: "person:read",
            create: "person:write",
            update: "person:write",
            delete: "person:delete",
            export: "person:export"
          }}
          
          // Azioni
          actions={{
            onView: handleViewPerson,
            onEdit: handleEditPerson,
            onDelete: handleDeletePerson,
            onExport: handleExportPerson,
            onCreate: handleCreatePerson,
            onImport: handleImportPersons,
            custom: [
              {
                label: 'Invia email',
                icon: <span>📧</span>,
                onClick: (person: Person) => {
                  console.log('Invia email a:', person.email);
                  // Implementare invio email
                },
                variant: 'secondary',
                permission: 'person:email'
              }
            ]
          }}
          
          // Configurazione vista
          defaultViewMode="table"
          showBatchOperations={true}
          showFilters={true}
          showColumnSettings={true}
        />
      </div>
    </div>
  );
}

export default PersonGDPRPage;