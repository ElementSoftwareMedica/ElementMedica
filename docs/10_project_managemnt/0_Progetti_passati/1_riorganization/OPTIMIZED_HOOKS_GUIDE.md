# Guida agli Hook Ottimizzati

## Panoramica

Questo documento descrive la nuova architettura di hook ottimizzati implementata per migliorare le performance, la manutenibilità e l'esperienza di sviluppo dell'applicazione.

## Architettura

### 🔧 Struttura degli Hook

```
src/hooks/
├── auth/                    # Hook di autenticazione
│   ├── useAuth.ts          # Hook principale per autenticazione
│   └── usePermissions.ts   # Hook per gestione permessi
├── state/                   # Hook di stato globale
│   └── useAppState.ts      # Hook per stato applicazione
├── ui/                      # Hook per interfaccia utente
│   └── useToast.ts         # Hook ottimizzato per toast
├── routing/                 # Hook per navigazione
│   ├── useNavigation.ts    # Hook per navigazione
│   └── useRouteGuard.ts    # Hook per protezione route
├── api/                     # Hook per API
│   └── useOptimizedQuery.ts # Hook ottimizzati per React Query
├── resources/               # Hook per risorse specifiche
│   └── useCompaniesOptimized.ts # Hook per gestione aziende
└── index.ts                # Esportazioni centrali
```

## 🚀 Hook Principali

### 1. Hook di Autenticazione

#### `useAuth`
Hook principale per la gestione dell'autenticazione con memoizzazione ottimizzata.

```typescript
import { useAuth } from '@/hooks';

const MyComponent = () => {
  const { 
    user, 
    isAuthenticated, 
    userName, 
    userEmail,
    login, 
    logout, 
    updateProfile 
  } = useAuth();
  
  return (
    <div>
      {isAuthenticated ? (
        <p>Benvenuto, {userName}!</p>
      ) : (
        <button onClick={() => login('identifier', 'password')}>
          Accedi
        </button>
      )}
    </div>
  );
};
```

#### `usePermissions`
Hook specializzato per la gestione dei permessi con funzioni memoizzate.

```typescript
import { usePermissions } from '@/hooks';

const AdminPanel = () => {
  const { 
    canManageCompanies, 
    isAdmin, 
    canViewReports,
    hasPermission,
    hasRole 
  } = usePermissions();
  
  if (!isAdmin()) {
    return <div>Accesso negato</div>;
  }
  
  return (
    <div>
      {canManageCompanies() && <CompanyManager />}
      {canViewReports() && <ReportsSection />}
    </div>
  );
};
```

### 2. Hook di Stato Globale

#### `useAppState`
Hook principale per lo stato globale con selettori ottimizzati.

```typescript
import { 
  useAppState, 
  useLanguage, 
  useTheme, 
  useSidebar 
} from '@/hooks';

const AppSettings = () => {
  const { language, theme } = useAppState();
  const { setLanguage } = useLanguage();
  const { toggleTheme, isDarkMode } = useTheme();
  const { isExpanded, toggleSidebar } = useSidebar();
  
  return (
    <div>
      <button onClick={() => setLanguage('en')}>
        Cambia in Inglese
      </button>
      <button onClick={toggleTheme}>
        {isDarkMode ? 'Modalità Chiara' : 'Modalità Scura'}
      </button>
      <button onClick={toggleSidebar}>
        {isExpanded ? 'Comprimi' : 'Espandi'} Sidebar
      </button>
    </div>
  );
};
```

### 3. Hook UI

#### `useToast`
Hook ottimizzato per la gestione dei toast con API semplificata.

```typescript
import { useToast } from '@/hooks';

const DataForm = () => {
  const toast = useToast();
  
  const handleSave = async (data) => {
    try {
      await saveData(data);
      toast.saveSuccess('Dati');
    } catch (error) {
      toast.saveError('Dati', error.message);
    }
  };
  
  const handleAsyncOperation = async () => {
    const promise = performLongOperation();
    
    await toast.promise(promise, {
      loading: 'Elaborazione in corso...',
      success: 'Operazione completata!',
      error: 'Operazione fallita'
    });
  };
  
  return (
    <form onSubmit={handleSave}>
      {/* form content */}
      <button type="submit">Salva</button>
      <button onClick={handleAsyncOperation}>
        Operazione Asincrona
      </button>
    </form>
  );
};
```

### 4. Hook di Navigazione

#### `useNavigation`
Hook per navigazione ottimizzata con funzioni memoizzate.

```typescript
import { useNavigation } from '@/hooks';

const NavigationMenu = () => {
  const { 
    goToCompanies, 
    goToSettings, 
    goBack,
    currentPath,
    isOnCompanies 
  } = useNavigation();
  
  return (
    <nav>
      <button 
        onClick={goToCompanies}
        className={isOnCompanies() ? 'active' : ''}
      >
        Aziende
      </button>
      <button onClick={goToSettings}>Impostazioni</button>
      <button onClick={goBack}>Indietro</button>
      <span>Percorso: {currentPath}</span>
    </nav>
  );
};
```

#### `useRouteGuard`
Hook per protezione delle route con controlli di autorizzazione.

```typescript
import { useRouteGuard, useConditionalRender } from '@/hooks';

const ProtectedPage = () => {
  const { isAuthorized, isLoading } = useRouteGuard({
    requireAuth: true,
    requiredPermissions: [{ resource: 'companies', action: 'read' }],
    requiredRoles: ['Manager', 'Administrator']
  });
  
  const { renderIfPermission, renderIfRole } = useConditionalRender();
  
  if (isLoading) return <div>Verifica autorizzazioni...</div>;
  if (!isAuthorized) return <div>Accesso negato</div>;
  
  return (
    <div>
      <h1>Pagina Protetta</h1>
      
      {renderIfPermission('companies', 'create') && (
        <button>Crea Azienda</button>
      )}
      
      {renderIfRole('Administrator') && (
        <AdminControls />
      )}
    </div>
  );
};
```

### 5. Hook API

#### `useOptimizedQuery`
Hook ottimizzati per React Query con configurazioni predefinite.

```typescript
import { 
  useOptimizedQuery, 
  useListQuery, 
  useDetailQuery,
  useOptimizedMutation,
  useCrudOperations 
} from '@/hooks';

const CompanyList = () => {
  // Query ottimizzata per lista
  const { 
    data: companies, 
    isLoading, 
    error,
    refetch 
  } = useListQuery({
    queryKey: ['companies'],
    queryFn: () => fetchCompanies(),
    search: searchTerm,
    filters: { active: true }
  });
  
  // Operazioni CRUD complete
  const {
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting
  } = useCrudOperations({
    resource: 'companies',
    queryKey: ['companies']
  });
  
  const handleCreate = async (data) => {
    await create(data);
    // Cache automaticamente invalidata e toast mostrato
  };
  
  return (
    <div>
      {isLoading ? (
        <div>Caricamento...</div>
      ) : (
        companies?.map(company => (
          <CompanyCard 
            key={company.id} 
            company={company}
            onUpdate={update}
            onDelete={remove}
          />
        ))
      )}
      
      <button 
        onClick={() => handleCreate(newCompanyData)}
        disabled={isCreating}
      >
        {isCreating ? 'Creazione...' : 'Crea Azienda'}
      </button>
    </div>
  );
};
```

### 6. Hook per Risorse

#### `useCompaniesOptimized`
Hook specializzato per la gestione delle aziende.

```typescript
import { useCompaniesOptimized } from '@/hooks';

const CompaniesPage = () => {
  const {
    companies,
    total,
    isLoading,
    createCompany,
    updateCompany,
    deleteCompany,
    searchCompanies,
    filters,
    setFilters,
    pagination,
    setPagination
  } = useCompaniesOptimized({
    search: searchTerm,
    limit: 20,
    filters: { active: true }
  });
  
  return (
    <div>
      <SearchBar onSearch={searchCompanies} />
      <FilterPanel filters={filters} onChange={setFilters} />
      
      <CompanyGrid 
        companies={companies}
        onUpdate={updateCompany}
        onDelete={deleteCompany}
      />
      
      <Pagination 
        current={pagination.page}
        total={total}
        pageSize={pagination.limit}
        onChange={setPagination}
      />
    </div>
  );
};
```

## 🎯 Vantaggi dell'Architettura

### 1. **Performance Ottimizzate**
- Memoizzazione automatica delle funzioni
- Selettori ottimizzati per evitare re-render inutili
- Cache intelligente per le query API
- Lazy loading e code splitting

### 2. **Separazione delle Responsabilità**
- Hook specializzati per domini specifici
- API pulite e intuitive
- Riutilizzabilità massima
- Testing semplificato

### 3. **Developer Experience**
- TypeScript completo con inferenza dei tipi
- Autocompletamento intelligente
- Documentazione integrata
- Debugging facilitato

### 4. **Manutenibilità**
- Codice modulare e organizzato
- Dipendenze chiare
- Aggiornamenti centralizzati
- Refactoring sicuro

## 📋 Best Practices

### 1. **Utilizzo degli Hook**

```typescript
// ✅ CORRETTO: Usa hook specifici
const { canManageCompanies } = usePermissions();
const { isDarkMode, toggleTheme } = useTheme();

// ❌ EVITA: Hook generici quando esistono specifici
const { user } = useAuth();
const canManage = user?.permissions?.includes('manage_companies');
```

### 2. **Memoizzazione**

```typescript
// ✅ CORRETTO: Le funzioni sono già memoizzate
const { createCompany } = useCompaniesOptimized();

// ❌ EVITA: Memoizzazione ridondante
const createCompanyMemo = useCallback(createCompany, [createCompany]);
```

### 3. **Gestione Errori**

```typescript
// ✅ CORRETTO: Usa toast integrati
const toast = useToast();
try {
  await saveData();
  toast.saveSuccess('Dati');
} catch (error) {
  toast.saveError('Dati', error.message);
}

// ❌ EVITA: Gestione manuale complessa
const [error, setError] = useState(null);
// ... gestione manuale
```

### 4. **Rendering Condizionale**

```typescript
// ✅ CORRETTO: Usa hook di rendering condizionale
const { renderIfPermission } = useConditionalRender();
return renderIfPermission('companies', 'create') && <CreateButton />;

// ❌ EVITA: Logica condizionale complessa nei componenti
const { hasPermission } = usePermissions();
return hasPermission('companies', 'create') ? <CreateButton /> : null;
```

## 🧪 Testing

### Test degli Hook

```typescript
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks';
import { TestProviders } from '@/providers';

describe('useAuth', () => {
  it('should return user data when authenticated', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: TestProviders
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userName).toBe('Test User');
  });
});
```

### Test dei Componenti

```typescript
import { render, screen } from '@testing-library/react';
import { TestProviders } from '@/providers';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly with providers', () => {
    render(
      <TestProviders>
        <MyComponent />
      </TestProviders>
    );
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## 🔄 Migrazione

### Da Hook Legacy a Hook Ottimizzati

```typescript
// PRIMA (Legacy)
import { useToast as useToastLegacy } from '@/contexts/ToastContext';
const { addToast } = useToastLegacy();
addToast({ type: 'success', message: 'Salvato!' });

// DOPO (Ottimizzato)
import { useToast } from '@/hooks';
const toast = useToast();
toast.saveSuccess('Dati');
```

```typescript
// PRIMA (Legacy)
import { useAuth as useAuthLegacy } from '@/contexts/AuthContext';
const { user } = useAuthLegacy();
const canManage = user?.permissions?.includes('manage_companies');

// DOPO (Ottimizzato)
import { usePermissions } from '@/hooks';
const { canManageCompanies } = usePermissions();
const canManage = canManageCompanies();
```

## 📚 Risorse Aggiuntive

- [Demo Component](../../../src/components/examples/OptimizedHooksDemo.tsx) - Esempio completo di utilizzo
- [Provider Setup](../../../src/providers/index.tsx) - Configurazione dei provider
- [Hook Index](../../../src/hooks/index.ts) - Esportazioni centrali
- [React Query Guide](https://tanstack.com/query/latest) - Documentazione React Query

## 🚀 Prossimi Passi

1. **Migrazione Graduale**: Sostituire progressivamente gli hook legacy
2. **Ottimizzazioni Aggiuntive**: Implementare lazy loading per hook pesanti
3. **Monitoring**: Aggiungere metriche di performance
4. **Documentazione**: Espandere esempi e casi d'uso
5. **Testing**: Aumentare copertura dei test

---

*Questa guida è in continua evoluzione. Per suggerimenti o domande, contatta il team di sviluppo.*