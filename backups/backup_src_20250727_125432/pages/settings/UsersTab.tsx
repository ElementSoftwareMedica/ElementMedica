import React, { useState } from 'react';
import { GDPREntityTemplate } from '../../templates/gdpr-entity-page/GDPREntityTemplate';
import { DataTableColumn } from '../../components/shared/tables/DataTable';
import { Badge } from '../../design-system';
import { 
  Users, 
  Edit, 
  Trash2, 
  Key,
  Building,
  Mail,
  Phone,
  Clock,
  Shield,
  Eye,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Person } from '../../services/users';
import { apiPost } from '../../services/api';

// Configurazione colonne per la tabella riutilizzabile (con colonna azioni esplicita)
const getUsersColumns = (): DataTableColumn<Person>[] => [
    {
      key: 'actions',
      label: 'Azioni',
      sortable: false,
      width: 120,
      renderCell: (user) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => console.log('Visualizza utente:', user.id)}
            className="p-1 text-blue-600 hover:text-blue-800 rounded"
            title="Visualizza"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => console.log('Modifica utente:', user.id)}
            className="p-1 text-green-600 hover:text-green-800 rounded"
            title="Modifica"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => console.log('Elimina utente:', user.id)}
            className="p-1 text-red-600 hover:text-red-800 rounded"
            title="Elimina"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    },
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      renderCell: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
            <div className="text-sm text-gray-500">{user.username || 'N/A'}</div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      renderCell: (user) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-800">
            {user.email}
          </a>
        </div>
      )
    },
    {
      key: 'phone',
      label: 'Telefono',
      sortable: true,
      renderCell: (user) => user.phone ? (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-gray-400" />
          <a href={`tel:${user.phone}`} className="text-gray-900">
            {user.phone}
          </a>
        </div>
      ) : (
        <span className="text-gray-400">N/A</span>
      )
    },
    {
      key: 'company',
      label: 'Azienda',
      sortable: true,
      renderCell: (user) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900">{user.companyId || 'N/A'}</span>
        </div>
      )
    },
    {
      key: 'roleType',
      label: 'Ruolo',
      sortable: true,
      renderCell: (user) => {
        const roleConfig = {
          ADMIN: { label: 'Admin', color: 'destructive' as const },
          SUPER_ADMIN: { label: 'Super Admin', color: 'destructive' as const },
          MANAGER: { label: 'Manager', color: 'outline' as const },
          TRAINER: { label: 'Formatore', color: 'default' as const },
          EMPLOYEE: { label: 'Dipendente', color: 'default' as const }
        };
        const config = roleConfig[user.roleType as keyof typeof roleConfig] || { label: user.roleType || 'N/A', color: 'secondary' as const };
        return <Badge variant={config.color}>{config.label}</Badge>;
      }
    },
    {
      key: 'onlineStatus',
      label: 'Stato Online',
      sortable: true,
      renderCell: (user) => {
        // Determina se l'utente è online basandosi su lastActivityAt e sessioni attive
        const isOnline = user.isOnline || false; // Questo campo verrà popolato dal backend
        const lastSeen = user.lastActivityAt || user.lastLogin;
        
        if (isOnline) {
          return (
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-500" />
              <Badge variant="default">Online</Badge>
            </div>
          );
        } else {
          const lastSeenText = lastSeen 
            ? `Visto ${new Date(lastSeen).toLocaleDateString('it-IT')} alle ${new Date(lastSeen).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`
            : 'Mai visto';
          
          return (
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-gray-400" />
              <div className="flex flex-col">
                <Badge variant="secondary">Offline</Badge>
                <span className="text-xs text-gray-500 mt-1">{lastSeenText}</span>
              </div>
            </div>
          );
        }
      }
    },
    {
      key: 'lastLogin',
      label: 'Ultimo accesso',
      sortable: true,
      renderCell: (user) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('it-IT') : 'Mai'}</span>
        </div>
      )
    },
    {
      key: 'isActive',
      label: 'Stato Account',
      sortable: true,
      renderCell: (user) => {
        const isActive = user.isActive !== false; // Default true se undefined
        return (
          <Badge variant={isActive ? 'default' : 'destructive'}>
            {isActive ? 'Attivo' : 'Inattivo'}
          </Badge>
        );
      }
    }
  ];

// Configurazione card per la vista griglia
const getUserCardConfig = () => ({
  titleField: 'firstName' as keyof Person,
  subtitleField: 'email' as keyof Person,
  badgeField: 'isActive' as keyof Person,
  // Configurazione dinamica per compatibilità
  title: (user: Person) => `${user.firstName} ${user.lastName}`,
  subtitle: (user: Person) => user.email,
  badge: (user: Person) => {
    const isActive = user.isActive !== false;
    return { text: isActive ? 'Attivo' : 'Inattivo', variant: isActive ? 'default' as const : 'destructive' as const };
  },
  icon: () => <Users className="h-5 w-5" />,
  fields: [
    {
      label: 'Email',
      value: (user: Person) => user.email,
      icon: <Mail className="h-4 w-4" />
    },
    {
      label: 'Telefono',
      value: (user: Person) => user.phone || 'N/A',
      icon: <Phone className="h-4 w-4" />
    },
    {
      label: 'Ruolo',
      value: (user: Person) => {
        const roleConfig = {
          ADMIN: 'Admin',
          SUPER_ADMIN: 'Super Admin',
          MANAGER: 'Manager',
          TRAINER: 'Formatore',
          EMPLOYEE: 'Dipendente'
        };
        return roleConfig[user.roleType as keyof typeof roleConfig] || user.roleType || 'N/A';
      },
      icon: <Shield className="h-4 w-4" />
    },
    {
      label: 'Stato Online',
      value: (user: Person) => {
        const isOnline = user.isOnline || false;
        return isOnline ? 'Online' : 'Offline';
      },
      icon: <Wifi className="h-4 w-4" />
    },
    {
      label: 'Ultimo accesso',
      value: (user: Person) => user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('it-IT') : 'Mai',
      icon: <Clock className="h-4 w-4" />
    }
  ]
});

// Template CSV per l'import
const csvTemplateData: Partial<Person>[] = [
  {
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario.rossi@esempio.com',
    phone: '+39 123 456 7890',
    address: 'Via Roma 123',
    position: 'Manager',
    department: 'IT',
    roleType: 'MANAGER',
    isActive: true
  }
];

// Headers CSV
const csvHeaders = [
  { key: 'firstName', label: 'Nome' },
  { key: 'lastName', label: 'Cognome' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefono' },
  { key: 'address', label: 'Indirizzo' },
  { key: 'position', label: 'Posizione' },
  { key: 'department', label: 'Dipartimento' },
  { key: 'roleType', label: 'Ruolo' },
  { key: 'isActive', label: 'Attivo' }
];

export const UsersTab: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [users, setUsers] = useState<Person[]>([]);

  // Funzione per gestire l'import degli utenti
  const handleImportEntities = async (data: any[]) => {
    // Questa funzione viene chiamata dal template quando c'è onImportEntities
    // Ma noi vogliamo aprire il modal invece, quindi apriamo il modal
    setShowImportModal(true);
    return Promise.resolve();
  };

  const handleImportUsers = async (importedUsers: any[], overwriteIds?: string[]) => {
    try {
      // Invia i dati al backend
      const response = await apiPost('/api/v1/persons/import', {
        users: importedUsers,
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
      <GDPREntityTemplate<Person>
        entityName="user"
        entityNamePlural="users"
        entityDisplayName="Utente"
        entityDisplayNamePlural="Utenti"
        readPermission="VIEW_USERS"
        writePermission="EDIT_USERS"
        deletePermission="DELETE_USERS"
        exportPermission="VIEW_USERS"
        apiEndpoint="/api/v1/persons"
        columns={getUsersColumns()}
        searchFields={['firstName', 'lastName', 'email', 'username', 'phone']}
        filterOptions={[
          {
            key: 'roleType',
            label: 'Ruolo',
            options: [
              { value: 'ADMIN', label: 'Admin' },
              { value: 'SUPER_ADMIN', label: 'Super Admin' },
              { value: 'MANAGER', label: 'Manager' },
              { value: 'TRAINER', label: 'Formatore' },
              { value: 'EMPLOYEE', label: 'Dipendente' }
            ]
          },
          {
            key: 'isActive',
            label: 'Stato Account',
            options: [
              { value: 'true', label: 'Attivo' },
              { value: 'false', label: 'Inattivo' }
            ]
          },
          {
            key: 'isOnline',
            label: 'Stato Online',
            options: [
              { value: 'true', label: 'Online' },
              { value: 'false', label: 'Offline' }
            ]
          }
        ]}
        sortOptions={[
          { key: 'firstName', label: 'Nome' },
          { key: 'lastName', label: 'Cognome' },
          { key: 'email', label: 'Email' },
          { key: 'roleType', label: 'Ruolo' },
          { key: 'lastLogin', label: 'Ultimo accesso' },
          { key: 'lastActivityAt', label: 'Ultima attività' },
          { key: 'createdAt', label: 'Data creazione' }
        ]}
        csvHeaders={csvHeaders}
        csvTemplateData={csvTemplateData}
        cardConfig={getUserCardConfig()}
        enableBatchOperations={true}
        enableImportExport={true}
        enableColumnSelector={true}
        enableAdvancedFilters={true}
        defaultViewMode="table"
        onImportEntities={handleImportEntities}
      />
      
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Import Utenti</h3>
            <p className="text-gray-600 mb-4">
              La funzionalità di import per gli utenti sarà disponibile a breve.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Export default per compatibilità
export default UsersTab;