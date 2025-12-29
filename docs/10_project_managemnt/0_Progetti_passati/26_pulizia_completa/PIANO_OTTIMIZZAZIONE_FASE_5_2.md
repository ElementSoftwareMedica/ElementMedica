# 🚀 Piano Ottimizzazione - Fase 5.2
**Data**: 12 Agosto 2025  
**Progetto**: Project 2.0 - Pulizia Completa  
**Fase**: 5.2 - Ottimizzazione Performance  

## 🎯 Obiettivo
Implementare ottimizzazioni specifiche sui file hotspot identificati nella Fase 5.1 per migliorare le performance del frontend.

## 📊 Analisi File Hotspot Completata

### 🔴 PRIORITÀ CRITICA: Dashboard.tsx (957 righe)

#### Problemi Identificati
1. **Monolitico**: Tutto in un singolo componente
2. **Troppe responsabilità**: Gestione stato, API calls, rendering, GDPR
3. **Import pesanti**: Chart.js, Lucide React, React Router
4. **Logica complessa**: Fetch con retry, cache, timeout
5. **Stato eccessivo**: 15+ state variables

#### Piano di Refactoring
```typescript
// PRIMA (957 righe)
const Dashboard: React.FC = () => {
  // 15+ useState hooks
  // 10+ useCallback hooks
  // Logica fetch complessa
  // Rendering monolitico
}

// DOPO (< 200 righe)
const Dashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <DashboardStats />
      <DashboardCharts />
      <DashboardCalendar />
    </DashboardLayout>
  )
}
```

#### Componenti da Estrarre
1. **DashboardStats** (StatCard + contatori)
2. **DashboardCharts** (Doughnut + Bar charts)
3. **DashboardCalendar** (ScheduleCalendar + eventi)
4. **DashboardLayout** (Layout e navigazione)

#### Hook Personalizzati da Creare
1. **useDashboardData** (API calls + cache)
2. **useGdprConsent** (Gestione consensi)
3. **useDashboardCounters** (Contatori ottimizzati)
4. **useCalendarEvents** (Eventi calendario)

### 🔴 PRIORITÀ CRITICA: api.ts (929 righe)

#### Problemi Identificati
1. **Monolitico**: Tutte le API in un file
2. **Cache complessa**: Gestione cache manuale
3. **Retry logic**: Logica retry ridondante
4. **Interceptors pesanti**: Troppa logica negli interceptors
5. **Deduplication**: Sistema complesso per evitare duplicati

#### Piano di Refactoring
```typescript
// PRIMA (929 righe)
// Tutto in api.ts

// DOPO (Modulare)
src/services/api/
├── client.ts          // Axios client base (< 100 righe)
├── cache.ts           // Sistema cache (< 150 righe)
├── interceptors.ts    // Request/Response interceptors (< 100 righe)
├── entities/
│   ├── companies.ts   // API companies (< 100 righe)
│   ├── employees.ts   // API employees (< 100 righe)
│   ├── courses.ts     // API courses (< 100 righe)
│   └── auth.ts        // API auth (< 100 righe)
└── index.ts           // Export unificato (< 50 righe)
```

#### Ottimizzazioni Specifiche
1. **Cache Intelligente**: TTL differenziato per tipo di dato
2. **Request Deduplication**: Semplificata con Map
3. **Retry Strategy**: Configurabile per endpoint
4. **Type Safety**: Generics per response types

### 🟡 PRIORITÀ MEDIA: GDPREntityTemplate.tsx (880 righe)

#### Problemi Identificati
1. **Template complesso**: Troppa logica in un componente
2. **Props pesanti**: Interfaccia con 15+ proprietà
3. **Rendering condizionale**: Logica complessa per viste
4. **Hook integrati**: Logica business nel componente

#### Piano di Refactoring
```typescript
// PRIMA (880 righe)
const GDPREntityTemplate = (props: GDPREntityTemplateProps) => {
  // Logica complessa per tabella/card
  // Gestione filtri, ordinamento, export
  // Modali integrate
}

// DOPO (< 300 righe)
const GDPREntityTemplate = (props: GDPREntityTemplateProps) => {
  const { data, operations } = useGDPREntity(props);
  
  return (
    <EntityLayout>
      <EntityToolbar {...operations} />
      <EntityView data={data} mode={viewMode} />
      <EntityModals {...operations} />
    </EntityLayout>
  )
}
```

#### Hook da Estrarre
1. **useGDPREntity** (Logica principale)
2. **useEntityFilters** (Gestione filtri)
3. **useEntityExport** (Export/Import)
4. **useEntityModals** (Gestione modali)

## 🛠️ Implementazione Fase 5.2

### Settimana 1: Dashboard Refactoring

#### Giorno 1-2: Estrazione Componenti
```bash
# Creare struttura componenti
src/components/dashboard/
├── DashboardLayout.tsx
├── DashboardStats.tsx
├── DashboardCharts.tsx
├── DashboardCalendar.tsx
└── hooks/
    ├── useDashboardData.ts
    ├── useGdprConsent.ts
    ├── useDashboardCounters.ts
    └── useCalendarEvents.ts
```

#### Giorno 3-4: Hook Personalizzati
```typescript
// useDashboardData.ts
export const useDashboardData = () => {
  const [data, setData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  
  const fetchData = useCallback(async () => {
    // Logica fetch ottimizzata
  }, []);
  
  return { data, loading, fetchData, refetch };
};
```

#### Giorno 5: Integrazione e Test
- Sostituire Dashboard.tsx originale
- Test funzionalità complete
- Verifica performance

### Settimana 2: API Services Refactoring

#### Giorno 1-2: Struttura Modulare
```typescript
// src/services/api/client.ts
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// src/services/api/entities/companies.ts
export const companiesApi = {
  getAll: () => apiClient.get<Company[]>('/companies'),
  getById: (id: string) => apiClient.get<Company>(`/companies/${id}`),
  create: (data: CreateCompanyDto) => apiClient.post<Company>('/companies', data),
  update: (id: string, data: UpdateCompanyDto) => apiClient.put<Company>(`/companies/${id}`, data),
  delete: (id: string) => apiClient.delete(`/companies/${id}`),
};
```

#### Giorno 3-4: Sistema Cache Ottimizzato
```typescript
// src/services/api/cache.ts
class ApiCache {
  private cache = new Map<string, CacheEntry>();
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }
  
  set<T>(key: string, data: T, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }
}
```

#### Giorno 5: Migrazione e Test
- Sostituire api.ts originale
- Aggiornare import in tutti i componenti
- Test API calls

### Settimana 3: GDPR Template Refactoring

#### Giorno 1-2: Hook Extraction
```typescript
// useGDPREntity.ts
export const useGDPREntity = <T>(config: GDPREntityConfig<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  
  const operations = {
    create: useCallback((item: T) => { /* ... */ }, []),
    update: useCallback((id: string, item: T) => { /* ... */ }, []),
    delete: useCallback((id: string) => { /* ... */ }, []),
    export: useCallback(() => { /* ... */ }, []),
    import: useCallback((file: File) => { /* ... */ }, []),
  };
  
  return { data, loading, filters, operations };
};
```

#### Giorno 3-4: Componenti Modulari
```typescript
// EntityToolbar.tsx
export const EntityToolbar = ({ operations, config }) => (
  <div className="entity-toolbar">
    <SearchBar onSearch={operations.search} />
    <FilterPanel filters={config.filters} />
    <ExportButton onExport={operations.export} />
    <ImportButton onImport={operations.import} />
    <CreateButton onCreate={operations.create} />
  </div>
);
```

#### Giorno 5: Integrazione Template
- Sostituire GDPREntityTemplate.tsx
- Aggiornare tutte le pagine che lo usano
- Test funzionalità GDPR

## 📈 Ottimizzazioni Performance

### 1. Lazy Loading Componenti
```typescript
// Lazy loading per componenti pesanti
const DashboardCharts = lazy(() => import('./DashboardCharts'));
const PDFViewer = lazy(() => import('./PDFViewer'));
const Calendar = lazy(() => import('./Calendar'));

// Wrapper con Suspense
const LazyComponent = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);
```

### 2. Code Splitting per Route
```typescript
// Router con lazy loading
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Companies = lazy(() => import('./pages/Companies'));
const Employees = lazy(() => import('./pages/Employees'));

const AppRouter = () => (
  <Router>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/employees" element={<Employees />} />
      </Routes>
    </Suspense>
  </Router>
);
```

### 3. Tree Shaking Ottimizzato
```typescript
// PRIMA (import completo)
import * as Icons from '@heroicons/react';
import { Chart } from 'chart.js';

// DOPO (import specifico)
import { UserIcon, BuildingIcon } from '@heroicons/react/24/outline';
import { Doughnut, Bar } from 'react-chartjs-2';
```

### 4. Memoization Strategica
```typescript
// Memoization per componenti pesanti
const DashboardStats = memo(({ data }) => {
  const stats = useMemo(() => 
    calculateStats(data), [data]
  );
  
  return <StatsDisplay stats={stats} />;
});

// Callback memoizzati
const handleSearch = useCallback(
  debounce((query: string) => {
    // Logica search
  }, 300),
  [dependencies]
);
```

## 🎯 Metriche Target Post-Ottimizzazione

### Performance
- **Bundle Size**: < 1.5MB (da ~2.5MB stimato)
- **First Contentful Paint**: < 1.2s (da ~2s)
- **Largest Contentful Paint**: < 2s (da ~3.5s)
- **Time to Interactive**: < 2.5s (da ~4s)

### Codice
- **Dashboard.tsx**: < 200 righe (da 957)
- **api.ts**: Eliminato, sostituito da moduli < 100 righe
- **GDPREntityTemplate.tsx**: < 300 righe (da 880)
- **Complessità Ciclomatica**: < 8 per funzione

### Manutenibilità
- **Componenti Riutilizzabili**: +15 nuovi componenti
- **Hook Personalizzati**: +8 hook specifici
- **Test Coverage**: > 85% (da ~60%)
- **TypeScript Errors**: 0 (da 804)

## 📋 Checklist Implementazione

### Pre-Refactoring
- [ ] **CRITICO**: Risolvere errori TypeScript (804)
- [ ] Backup completo codice esistente
- [ ] Test suite funzionante
- [ ] Documentazione stato attuale

### Durante Refactoring
- [ ] Implementazione incrementale
- [ ] Test continui dopo ogni modifica
- [ ] Monitoraggio performance
- [ ] Documentazione modifiche

### Post-Refactoring
- [ ] Test completi funzionalità
- [ ] Analisi bundle size
- [ ] Performance audit
- [ ] Documentazione aggiornata
- [ ] Code review completo

## 🚧 Rischi e Mitigazioni

### Rischi Identificati
1. **Breaking Changes**: Modifiche potrebbero rompere funzionalità
2. **Performance Regression**: Ottimizzazioni potrebbero peggiorare performance
3. **TypeScript Errors**: Nuovi errori durante refactoring
4. **GDPR Compliance**: Rischio di compromettere conformità

### Mitigazioni
1. **Feature Flags**: Implementazione graduale con flag
2. **A/B Testing**: Confronto performance prima/dopo
3. **Rollback Plan**: Possibilità di tornare alla versione precedente
4. **GDPR Audit**: Verifica conformità dopo ogni modifica

## 📅 Timeline Dettagliata

### Settimana 1 (19-25 Agosto)
- **Lun-Mar**: Dashboard refactoring
- **Mer-Gio**: Hook extraction
- **Ven**: Test e integrazione

### Settimana 2 (26 Agosto - 1 Settembre)
- **Lun-Mar**: API services refactoring
- **Mer-Gio**: Cache optimization
- **Ven**: Migration e test

### Settimana 3 (2-8 Settembre)
- **Lun-Mar**: GDPR template refactoring
- **Mer-Gio**: Component extraction
- **Ven**: Final integration

### Settimana 4 (9-15 Settembre)
- **Lun-Mar**: Performance optimization
- **Mer-Gio**: Bundle analysis
- **Ven**: Documentation e review

---

**Nota**: Questo piano è condizionato dalla risoluzione degli errori TypeScript nella Fase 5.1. Una volta risolti, si potrà procedere con l'implementazione completa.