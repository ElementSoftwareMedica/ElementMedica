import React, { useState } from 'react';
import {
  useAuth,
  usePermissions,
  useAppState,
  useLanguage,
  useTheme,
  useSidebar,
  useToast,
  useNavigation,
  useRouteGuard,
  useConditionalRender
} from '../hooks';
import { useCompaniesOptimized } from '../hooks/resources/useCompaniesOptimized';
import { Button } from '../design-system/atoms/Button';

/**
 * Componente dimostrativo per i nuovi hook ottimizzati
 * Mostra come utilizzare tutti gli hook insieme per una gestione efficiente dello stato
 */
export const OptimizedHooksDemo: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hook di autenticazione
  const { user, isAuthenticated, userName, userEmail } = useAuth();
  const { canManageCompanies, isAdmin, canViewReports } = usePermissions();
  
  // Hook di stato globale
  const { language, theme } = useAppState();
  const { setLanguage } = useLanguage();
  const { toggleTheme, isDarkMode } = useTheme();
  const { isExpanded, toggleSidebar } = useSidebar();
  
  // Hook UI
  const toast = useToast();
  
  // Hook di navigazione
  const { goToCompanies, goToSettings, currentPath, isOnCompanies } = useNavigation();
  
  // Hook di protezione route
  const { isAuthorized, isLoading: routeLoading } = useRouteGuard({
    requireAuth: true,
    requiredPermissions: [{ resource: 'companies', action: 'read' }]
  });
  
  // Hook di rendering condizionale
  const { renderIfPermission, renderIfRole, renderIf } = useConditionalRender();
  
  // Hook per dati aziende
  const {
    companies,
    total,
    isLoading: companiesLoading,
    createCompany,
    isCreating,
    filters
  } = useCompaniesOptimized({
    search: searchTerm,
    limit: 10
  });
  
  // Handlers per dimostrare le funzionalità
  const handleCreateTestCompany = async () => {
    try {
      await createCompany({
        name: `Test Company ${Date.now()}`,
        email: 'test@example.com',
        phone: '+39 123 456 789',
        address: 'Via Test 123',
        city: 'Milano',
        province: 'MI',
        cap: '20100',
        vatNumber: 'IT12345678901',
        fiscalCode: 'TESTCMP123',
        legalRepresentative: 'Test Representative'
      });
      toast.saveSuccess('Azienda');
    } catch (error) {
      toast.saveError('Azienda', error instanceof Error ? error.message : 'Errore sconosciuto');
    }
  };
  
  const handleTestToasts = () => {
    toast.success('Operazione completata con successo!');
    setTimeout(() => toast.warning('Attenzione: questo è un avviso'), 1000);
    setTimeout(() => toast.error('Errore di esempio'), 2000);
    setTimeout(() => toast.info('Informazione utile'), 3000);
  };
  
  const handleTestPromise = async () => {
    const mockPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.5) {
          resolve('Operazione completata!');
        } else {
          reject(new Error('Operazione fallita'));
        }
      }, 2000);
    });
    
    try {
      await toast.promise(mockPromise, {
        loading: 'Elaborazione in corso...',
        success: 'Operazione completata con successo!',
        error: 'Operazione fallita'
      });
    } catch (error) {
      // Errore già gestito dal toast
    }
  };
  
  if (routeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Verifica autorizzazioni...</div>
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Accesso non autorizzato</div>
      </div>
    );
  }
  
  return (
    <div className={`p-6 space-y-8 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold mb-2">Demo Hook Ottimizzati</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Dimostrazione delle funzionalità dei nuovi hook ottimizzati per state management e routing
        </p>
      </div>
      
      {/* Sezione Autenticazione */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">🔐 Autenticazione e Permessi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Stato Utente</h3>
            <p><strong>Autenticato:</strong> {isAuthenticated ? '✅ Sì' : '❌ No'}</p>
            <p><strong>Nome:</strong> {userName || 'N/A'}</p>
            <p><strong>Email:</strong> {userEmail || 'N/A'}</p>
            <p><strong>Ruolo:</strong> {user?.role || 'N/A'}</p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Permessi</h3>
            <p><strong>Gestione Aziende:</strong> {canManageCompanies() ? '✅' : '❌'}</p>
            <p><strong>Amministratore:</strong> {isAdmin() ? '✅' : '❌'}</p>
            <p><strong>Visualizza Report:</strong> {canViewReports() ? '✅' : '❌'}</p>
          </div>
        </div>
      </section>
      
      {/* Sezione Stato Globale */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">🌐 Stato Globale</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Lingua</h3>
            <p className="mb-2"><strong>Corrente:</strong> {language}</p>
            <div className="space-x-2">
              <Button 
                size="sm" 
                variant={language === 'it' ? 'primary' : 'secondary'}
                onClick={() => setLanguage('it')}
              >
                Italiano
              </Button>
              <Button 
                size="sm" 
                variant={language === 'en' ? 'primary' : 'secondary'}
                onClick={() => setLanguage('en')}
              >
                English
              </Button>
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Tema</h3>
            <p className="mb-2"><strong>Corrente:</strong> {theme}</p>
            <Button onClick={toggleTheme}>
              {isDarkMode ? '☀️ Modalità Chiara' : '🌙 Modalità Scura'}
            </Button>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Sidebar</h3>
            <p className="mb-2"><strong>Espansa:</strong> {isExpanded ? '✅' : '❌'}</p>
            <Button onClick={toggleSidebar}>
              {isExpanded ? '⬅️ Comprimi' : '➡️ Espandi'}
            </Button>
          </div>
        </div>
      </section>
      
      {/* Sezione Toast */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">🔔 Sistema Toast</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleTestToasts}>Test Toast Multipli</Button>
          <Button onClick={handleTestPromise}>Test Promise Toast</Button>
          <Button onClick={() => toast.networkError()}>Test Errore Rete</Button>
          <Button onClick={() => toast.validationError('Dati non validi')}>Test Validazione</Button>
        </div>
      </section>
      
      {/* Sezione Navigazione */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">🧭 Navigazione</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Stato Corrente</h3>
            <p><strong>Path:</strong> {currentPath}</p>
            <p><strong>Su Aziende:</strong> {isOnCompanies() ? '✅' : '❌'}</p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Navigazione</h3>
            <div className="space-x-2">
              <Button size="sm" onClick={goToCompanies}>Aziende</Button>
              <Button size="sm" onClick={goToSettings}>Impostazioni</Button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Sezione Dati Aziende */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">🏢 Gestione Aziende</h2>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <input
            type="text"
            placeholder="Cerca aziende..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded-lg flex-1 max-w-md"
          />
          
          {renderIfPermission('companies', 'create') && (
            <Button 
              onClick={handleCreateTestCompany}
              disabled={isCreating}
            >
              {isCreating ? 'Creazione...' : 'Crea Azienda Test'}
            </Button>
          )}
        </div>
        
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Statistiche</h3>
          <p><strong>Totale Aziende:</strong> {total}</p>
          <p><strong>Filtri Attivi:</strong> {JSON.stringify(filters)}</p>
          <p><strong>Caricamento:</strong> {companiesLoading ? '⏳' : '✅'}</p>
        </div>
        
        {companiesLoading ? (
          <div className="text-center py-8">Caricamento aziende...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <div key={company.id} className="p-4 border rounded-lg">
                <h4 className="font-semibold">{company.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{company.city}, {company.province}</p>
                <p className="text-sm">{company.email}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Sezione Rendering Condizionale */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">🎯 Rendering Condizionale</h2>
        <div className="space-y-2">
          {renderIfRole('Administrator') && (
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
              ⚡ Contenuto visibile solo agli Amministratori
            </div>
          )}
          
          {renderIfPermission('companies', 'manage') && (
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              🏢 Contenuto per chi può gestire le aziende
            </div>
          )}
          
          {renderIf({ authenticated: true, role: ['Administrator', 'Manager'] }) && (
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              👥 Contenuto per Amministratori e Manager autenticati
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default OptimizedHooksDemo;