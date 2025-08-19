# PLANNING DETTAGLIATO - Risoluzione Errori API e Ottimizzazione Performance

**Data Creazione:** 31 Gennaio 2025  
**Priorità:** ALTA  
**Sprint:** Hotfix Sprint  
**Durata Stimata:** 3-5 giorni  
**Team:** Frontend + Backend + DevOps  

---

## 🎯 Executive Summary

Piano di intervento sistematico per risolvere errori critici che impattano performance e user experience:
- **Richieste API duplicate** per `/tenants/current`
- **Errori di parsing JSON** con fallback a dati dummy
- **Violazioni GDPR** nell'uso di dati fittizi

**Obiettivo:** Zero errori, performance ottimizzate, conformità GDPR completa.

---

## 📋 Analisi Tecnica Approfondita

### 1. Problema Richieste Duplicate

**Stack Trace Analysis:**
```
TenantContext.tsx:76 → getCurrentTenant → api.ts:71
TenantContext.tsx:100 → getCurrentTenant → api.ts:71
```

**Root Cause Identificata:**
- **Multiple useEffect**: Due o più useEffect che triggherano la stessa chiamata
- **Dependency Array**: Dipendenze non ottimizzate che causano re-render
- **Context Re-initialization**: Context che si reinizializza ad ogni mount

**Soluzione Tecnica:**
```typescript
// Pattern da implementare: Singleton + Caching
const useTenantSingleton = () => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(null);
  
  const getTenant = useCallback(async () => {
    if (requestRef.current) return requestRef.current;
    if (tenant) return tenant;
    
    setLoading(true);
    requestRef.current = getCurrentTenant();
    
    try {
      const result = await requestRef.current;
      setTenant(result);
      return result;
    } finally {
      requestRef.current = null;
      setLoading(false);
    }
  }, [tenant]);
  
  return { tenant, loading, getTenant };
};
```

### 2. Problema Parsing JSON

**Error Pattern:**
```
SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
```

**Root Cause Analysis:**
- **Server Response**: API restituisce HTML invece di JSON
- **Routing Issue**: Possibile misconfiguration del proxy/routing
- **CORS Fallback**: Browser che fallback a pagina di errore

**Endpoints Coinvolti:**
- `/api/courses` → Dashboard.tsx:118
- `/api/trainers` → Dashboard.tsx:126  
- `/api/companies` → Dashboard.tsx:140

**Soluzione Tecnica:**
```typescript
// Response Validator + Error Handler
const validateJsonResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type');
  
  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    logGdprAction({
      action: 'API_ERROR',
      details: `Invalid content-type: ${contentType}`,
      endpoint: response.url,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Expected JSON, received: ${contentType}`);
  }
  
  try {
    return await response.json();
  } catch (error) {
    logGdprAction({
      action: 'JSON_PARSE_ERROR',
      details: error.message,
      endpoint: response.url,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};
```

### 3. Problema Dati Dummy GDPR

**Violazioni Identificate:**
- **Audit Trail**: Dati dummy non tracciati
- **Consent**: Nessun controllo consenso
- **Data Minimization**: Violazione principio minimizzazione

**Soluzione GDPR-Compliant:**
```typescript
// GDPR-Compliant Error State
const useGdprCompliantData = (endpoint: string) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchData = async () => {
    // 1. Verifica consenso
    const hasConsent = await checkConsent('data_processing');
    if (!hasConsent) {
      setError('CONSENT_REQUIRED');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(endpoint);
      const validatedData = await validateJsonResponse(response);
      
      // 2. Log GDPR action
      await logGdprAction({
        action: 'DATA_FETCH_SUCCESS',
        endpoint,
        dataType: getDataTypeFromEndpoint(endpoint),
        timestamp: new Date().toISOString()
      });
      
      setData(validatedData);
    } catch (error) {
      // 3. Log error senza esporre dati
      await logGdprAction({
        action: 'DATA_FETCH_ERROR',
        endpoint,
        errorType: error.name,
        timestamp: new Date().toISOString()
      });
      
      setError('DATA_UNAVAILABLE');
      // NO DUMMY DATA - Mostra stato di errore
    } finally {
      setLoading(false);
    }
  };
  
  return { data, error, loading, fetchData };
};
```

---

## 🏗️ Strategia di Implementazione

### Fase 1: Analisi e Preparazione (Giorno 1)

#### 1.1 Code Review Approfondito
**Obiettivo:** Identificare tutti i punti critici nel codice

**Attività:**
- [ ] **Analisi TenantContext.tsx**
  - Identificare tutti i useEffect
  - Mappare dependency arrays
  - Verificare pattern di inizializzazione

- [ ] **Analisi Dashboard.tsx**
  - Verificare logica di fetch dati
  - Identificare punti di fallback a dummy data
  - Analizzare error handling attuale

- [ ] **Analisi api.ts**
  - Verificare implementazione getCurrentTenant
  - Controllare sistema di caching esistente
  - Analizzare request deduplication

**Deliverable:** Report dettagliato con mapping completo del codice

#### 1.2 Infrastructure Review
**Obiettivo:** Verificare configurazione server e routing

**Attività:**
- [ ] **Verifica Proxy Configuration**
  - Controllare nginx.conf
  - Verificare routing rules
  - Testare endpoints manualmente

- [ ] **Verifica CORS Settings**
  - Controllare headers CORS
  - Verificare allowed origins
  - Testare preflight requests

- [ ] **Verifica Server Status**
  - Controllare logs server API
  - Verificare connettività tra servizi
  - Analizzare response headers

**Deliverable:** Report infrastruttura con raccomandazioni

### Fase 2: Implementazione Core Fixes (Giorni 2-3)

#### 2.1 Fix Richieste Duplicate
**Priorità:** CRITICA

**Implementazione:**

1. **Refactor TenantContext**
```typescript
// File: src/contexts/TenantContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { getCurrentTenant } from '../services/tenants';
import { logGdprAction } from '../utils/gdpr';

interface TenantContextType {
  tenant: any;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<Promise<any> | null>(null);
  const initializedRef = useRef(false);

  const fetchTenant = useCallback(async () => {
    // Deduplication: se c'è già una richiesta in corso, restituisci quella
    if (requestRef.current) {
      return requestRef.current;
    }

    // Se abbiamo già i dati e non c'è errore, non rifetchiamo
    if (tenant && !error) {
      return tenant;
    }

    setLoading(true);
    setError(null);

    // Crea la promise e salvala nel ref
    requestRef.current = getCurrentTenant();

    try {
      const result = await requestRef.current;
      
      // Log GDPR action
      await logGdprAction({
        action: 'TENANT_FETCH_SUCCESS',
        tenantId: result?.id,
        timestamp: new Date().toISOString()
      });

      setTenant(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // Log GDPR error
      await logGdprAction({
        action: 'TENANT_FETCH_ERROR',
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      throw err;
    } finally {
      setLoading(false);
      requestRef.current = null;
    }
  }, [tenant, error]);

  const refreshTenant = useCallback(async () => {
    setTenant(null);
    setError(null);
    await fetchTenant();
  }, [fetchTenant]);

  // Inizializzazione una sola volta
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchTenant().catch(() => {
        // Error già gestito in fetchTenant
      });
    }
  }, [fetchTenant]);

  const value = {
    tenant,
    loading,
    error,
    refreshTenant
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
```

2. **Ottimizzazione API Layer**
```typescript
// File: src/services/api.ts
class ApiService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();

  private getCacheKey(url: string, params?: any): string {
    return `${url}${params ? JSON.stringify(params) : ''}`;
  }

  private isValidCache(cacheEntry: { timestamp: number; ttl: number }): boolean {
    return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
  }

  async request<T>(url: string, options: RequestInit = {}, cacheTtl = 5 * 60 * 1000): Promise<T> {
    const cacheKey = this.getCacheKey(url, options.body);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValidCache(cached)) {
      console.log(`Cache hit for ${url}`);
      return cached.data;
    }

    // Check pending requests (deduplication)
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      console.log(`Deduplicating request for ${url}`);
      return pending;
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(url, options);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache successful result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: cacheTtl
      });

      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async executeRequest<T>(url: string, options: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Validate response type
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      
      // Log GDPR error
      await logGdprAction({
        action: 'API_INVALID_RESPONSE',
        url,
        contentType,
        responsePreview: text.substring(0, 100),
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Expected JSON response, got ${contentType}. Response: ${text.substring(0, 100)}...`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      
      // Log GDPR error
      await logGdprAction({
        action: 'API_ERROR_RESPONSE',
        url,
        status: response.status,
        error: errorData.message,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`API Error ${response.status}: ${errorData.message}`);
    }

    try {
      return await response.json();
    } catch (error) {
      // Log GDPR parsing error
      await logGdprAction({
        action: 'JSON_PARSE_ERROR',
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to parse JSON response: ${error.message}`);
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const apiService = new ApiService();
```

#### 2.2 Fix Dashboard Data Fetching
**Priorità:** CRITICA

**Implementazione:**

```typescript
// File: src/components/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { checkConsent, logGdprAction } from '../utils/gdpr';
import { useTenant } from '../contexts/TenantContext';

interface DashboardData {
  courses: any[];
  trainers: any[];
  companies: any[];
}

interface DataState {
  data: any[] | null;
  loading: boolean;
  error: string | null;
  hasConsent: boolean;
}

const Dashboard: React.FC = () => {
  const { tenant } = useTenant();
  const [courses, setCourses] = useState<DataState>({
    data: null,
    loading: false,
    error: null,
    hasConsent: false
  });
  const [trainers, setTrainers] = useState<DataState>({
    data: null,
    loading: false,
    error: null,
    hasConsent: false
  });
  const [companies, setCompanies] = useState<DataState>({
    data: null,
    loading: false,
    error: null,
    hasConsent: false
  });

  const fetchDataWithGdprCompliance = useCallback(async (
    endpoint: string,
    dataType: string,
    setState: React.Dispatch<React.SetStateAction<DataState>>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Verifica consenso GDPR
      const hasConsent = await checkConsent('data_processing');
      if (!hasConsent) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'CONSENT_REQUIRED',
          hasConsent: false
        }));
        
        await logGdprAction({
          action: 'DATA_ACCESS_DENIED',
          reason: 'NO_CONSENT',
          dataType,
          timestamp: new Date().toISOString()
        });
        
        return;
      }

      // 2. Fetch data con validazione
      const data = await apiService.request(endpoint);
      
      // 3. Log successful access
      await logGdprAction({
        action: 'DATA_ACCESS_SUCCESS',
        dataType,
        recordCount: Array.isArray(data) ? data.length : 1,
        timestamp: new Date().toISOString()
      });

      setState({
        data,
        loading: false,
        error: null,
        hasConsent: true
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error senza esporre dati sensibili
      await logGdprAction({
        action: 'DATA_ACCESS_ERROR',
        dataType,
        errorType: error.name,
        timestamp: new Date().toISOString()
      });

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        hasConsent: true
      }));
    }
  }, []);

  const fetchCourses = useCallback(() => {
    return fetchDataWithGdprCompliance('/api/courses', 'courses', setCourses);
  }, [fetchDataWithGdprCompliance]);

  const fetchTrainers = useCallback(() => {
    return fetchDataWithGdprCompliance('/api/trainers', 'trainers', setTrainers);
  }, [fetchDataWithGdprCompliance]);

  const fetchCompanies = useCallback(() => {
    return fetchDataWithGdprCompliance('/api/companies', 'companies', setCompanies);
  }, [fetchDataWithGdprCompliance]);

  // Fetch data only when tenant is available
  useEffect(() => {
    if (tenant) {
      Promise.all([
        fetchCourses(),
        fetchTrainers(),
        fetchCompanies()
      ]).catch(error => {
        console.error('Error fetching dashboard data:', error);
      });
    }
  }, [tenant, fetchCourses, fetchTrainers, fetchCompanies]);

  const renderDataSection = (
    title: string,
    state: DataState,
    retryFn: () => void
  ) => {
    if (!state.hasConsent && state.error === 'CONSENT_REQUIRED') {
      return (
        <div className="data-section consent-required">
          <h3>{title}</h3>
          <div className="consent-message">
            <p>È necessario il consenso per visualizzare questi dati.</p>
            <button onClick={retryFn} className="btn-consent">
              Fornisci Consenso
            </button>
          </div>
        </div>
      );
    }

    if (state.loading) {
      return (
        <div className="data-section loading">
          <h3>{title}</h3>
          <div className="loading-spinner">Caricamento...</div>
        </div>
      );
    }

    if (state.error && state.error !== 'CONSENT_REQUIRED') {
      return (
        <div className="data-section error">
          <h3>{title}</h3>
          <div className="error-message">
            <p>Impossibile caricare i dati.</p>
            <button onClick={retryFn} className="btn-retry">
              Riprova
            </button>
          </div>
        </div>
      );
    }

    if (state.data) {
      return (
        <div className="data-section success">
          <h3>{title}</h3>
          <div className="data-content">
            {/* Render actual data */}
            <p>Dati caricati: {state.data.length} elementi</p>
          </div>
        </div>
      );
    }

    return (
      <div className="data-section empty">
        <h3>{title}</h3>
        <p>Nessun dato disponibile</p>
      </div>
    );
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {!tenant && (
        <div className="tenant-loading">
          <p>Caricamento informazioni tenant...</p>
        </div>
      )}
      
      {tenant && (
        <div className="dashboard-content">
          {renderDataSection('Corsi', courses, fetchCourses)}
          {renderDataSection('Formatori', trainers, fetchTrainers)}
          {renderDataSection('Aziende', companies, fetchCompanies)}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
```

### Fase 3: Testing e Validazione (Giorno 4)

#### 3.1 Unit Testing
**Obiettivo:** Verificare funzionamento singoli componenti

**Test Cases:**

```typescript
// File: src/__tests__/TenantContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { TenantProvider, useTenant } from '../contexts/TenantContext';
import * as tenantsService from '../services/tenants';

jest.mock('../services/tenants');
jest.mock('../utils/gdpr');

const mockGetCurrentTenant = tenantsService.getCurrentTenant as jest.MockedFunction<typeof tenantsService.getCurrentTenant>;

describe('TenantContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not make duplicate requests', async () => {
    const mockTenant = { id: '1', name: 'Test Tenant' };
    mockGetCurrentTenant.mockResolvedValue(mockTenant);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TenantProvider>{children}</TenantProvider>
    );

    const { result } = renderHook(() => useTenant(), { wrapper });

    // Trigger multiple calls simultaneously
    await act(async () => {
      await Promise.all([
        result.current.refreshTenant(),
        result.current.refreshTenant(),
        result.current.refreshTenant()
      ]);
    });

    // Should only call the API once
    expect(mockGetCurrentTenant).toHaveBeenCalledTimes(1);
    expect(result.current.tenant).toEqual(mockTenant);
  });

  it('should handle API errors gracefully', async () => {
    const mockError = new Error('API Error');
    mockGetCurrentTenant.mockRejectedValue(mockError);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TenantProvider>{children}</TenantProvider>
    );

    const { result } = renderHook(() => useTenant(), { wrapper });

    await act(async () => {
      try {
        await result.current.refreshTenant();
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.tenant).toBeNull();
  });
});
```

```typescript
// File: src/__tests__/ApiService.test.ts
import { apiService } from '../services/api';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiService.clearCache();
  });

  it('should deduplicate concurrent requests', async () => {
    const mockResponse = { data: 'test' };
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse)
    } as Response);

    // Make concurrent requests
    const promises = [
      apiService.request('/test'),
      apiService.request('/test'),
      apiService.request('/test')
    ];

    const results = await Promise.all(promises);

    // Should only make one fetch call
    expect(mockFetch).toHaveBeenCalledTimes(1);
    // All results should be the same
    results.forEach(result => {
      expect(result).toEqual(mockResponse);
    });
  });

  it('should handle non-JSON responses', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve('<!doctype html><html>...</html>')
    } as Response);

    await expect(apiService.request('/test')).rejects.toThrow(
      'Expected JSON response, got text/html'
    );
  });

  it('should cache successful responses', async () => {
    const mockResponse = { data: 'test' };
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse)
    } as Response);

    // First request
    const result1 = await apiService.request('/test');
    // Second request (should use cache)
    const result2 = await apiService.request('/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result1).toEqual(mockResponse);
    expect(result2).toEqual(mockResponse);
  });
});
```

#### 3.2 Integration Testing
**Obiettivo:** Verificare integrazione tra componenti

```typescript
// File: src/__tests__/Dashboard.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../components/Dashboard';
import { TenantProvider } from '../contexts/TenantContext';
import * as gdprUtils from '../utils/gdpr';

jest.mock('../services/api');
jest.mock('../utils/gdpr');

const mockCheckConsent = gdprUtils.checkConsent as jest.MockedFunction<typeof gdprUtils.checkConsent>;
const mockLogGdprAction = gdprUtils.logGdprAction as jest.MockedFunction<typeof gdprUtils.logGdprAction>;

describe('Dashboard Integration', () => {
  const renderDashboard = () => {
    return render(
      <TenantProvider>
        <Dashboard />
      </TenantProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogGdprAction.mockResolvedValue(undefined);
  });

  it('should show consent required message when no consent', async () => {
    mockCheckConsent.mockResolvedValue(false);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/È necessario il consenso/)).toBeInTheDocument();
    });

    expect(mockLogGdprAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DATA_ACCESS_DENIED',
        reason: 'NO_CONSENT'
      })
    );
  });

  it('should load data when consent is given', async () => {
    mockCheckConsent.mockResolvedValue(true);
    
    // Mock successful API responses
    const mockApiService = require('../services/api').apiService;
    mockApiService.request.mockResolvedValue([{ id: 1, name: 'Test' }]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Dati caricati: 1 elementi/)).toBeInTheDocument();
    });

    expect(mockLogGdprAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DATA_ACCESS_SUCCESS'
      })
    );
  });

  it('should handle API errors gracefully', async () => {
    mockCheckConsent.mockResolvedValue(true);
    
    const mockApiService = require('../services/api').apiService;
    mockApiService.request.mockRejectedValue(new Error('API Error'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Impossibile caricare i dati/)).toBeInTheDocument();
    });

    expect(mockLogGdprAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DATA_ACCESS_ERROR'
      })
    );
  });
});
```

#### 3.3 E2E Testing
**Obiettivo:** Verificare flusso completo utente

```typescript
// File: cypress/e2e/dashboard-api-optimization.cy.ts
describe('Dashboard API Optimization', () => {
  beforeEach(() => {
    // Intercept API calls
    cy.intercept('GET', '/api/tenants/current', { fixture: 'tenant.json' }).as('getTenant');
    cy.intercept('GET', '/api/courses', { fixture: 'courses.json' }).as('getCourses');
    cy.intercept('GET', '/api/trainers', { fixture: 'trainers.json' }).as('getTrainers');
    cy.intercept('GET', '/api/companies', { fixture: 'companies.json' }).as('getCompanies');
    
    cy.visit('/dashboard');
  });

  it('should not make duplicate tenant requests', () => {
    // Wait for initial load
    cy.wait('@getTenant');
    
    // Navigate away and back
    cy.visit('/profile');
    cy.visit('/dashboard');
    
    // Should not make another tenant request due to caching
    cy.get('@getTenant.all').should('have.length', 1);
  });

  it('should handle API errors gracefully', () => {
    // Mock API error
    cy.intercept('GET', '/api/courses', {
      statusCode: 500,
      body: { error: 'Internal Server Error' }
    }).as('getCoursesError');
    
    cy.wait('@getCoursesError');
    
    // Should show error message, not dummy data
    cy.contains('Impossibile caricare i dati').should('be.visible');
    cy.contains('Riprova').should('be.visible');
    
    // Should not show any dummy data
    cy.contains('dummy').should('not.exist');
  });

  it('should respect GDPR consent', () => {
    // Mock no consent
    cy.window().then((win) => {
      win.localStorage.setItem('gdpr_consent', 'false');
    });
    
    cy.reload();
    
    // Should show consent required message
    cy.contains('È necessario il consenso').should('be.visible');
    cy.contains('Fornisci Consenso').should('be.visible');
    
    // Click consent button
    cy.contains('Fornisci Consenso').click();
    
    // Should now load data
    cy.wait(['@getCourses', '@getTrainers', '@getCompanies']);
    cy.contains('Dati caricati').should('be.visible');
  });
});
```

### Fase 4: Deployment e Monitoring (Giorno 5)

#### 4.1 Pre-Deployment Checklist

- [ ] **Code Review Completo**
  - [ ] Peer review di tutti i cambiamenti
  - [ ] Security review per GDPR compliance
  - [ ] Performance review per ottimizzazioni

- [ ] **Testing Completo**
  - [ ] Unit tests passano al 100%
  - [ ] Integration tests passano
  - [ ] E2E tests passano
  - [ ] Performance tests mostrano miglioramenti

- [ ] **Documentation Update**
  - [ ] API documentation aggiornata
  - [ ] Architecture documentation aggiornata
  - [ ] GDPR compliance documentation aggiornata

#### 4.2 Deployment Strategy

**Blue-Green Deployment:**

1. **Deploy to Green Environment**
```bash
# Build optimized version
npm run build:production

# Deploy to green environment
docker build -t app:optimized .
docker tag app:optimized app:green
docker-compose -f docker-compose.green.yml up -d
```

2. **Smoke Tests on Green**
```bash
# Test API endpoints
curl -f http://green.app.local/api/health
curl -f http://green.app.local/api/tenants/current

# Test frontend
cypress run --env baseUrl=http://green.app.local
```

3. **Switch Traffic**
```bash
# Update load balancer
nginx -s reload

# Monitor for 5 minutes
watch -n 10 'curl -s http://app.local/api/health | jq .'
```

4. **Rollback Plan**
```bash
# If issues detected
nginx -s reload  # Switch back to blue
docker-compose -f docker-compose.blue.yml up -d
```

#### 4.3 Monitoring Setup

**Metrics to Monitor:**

1. **API Performance**
```yaml
# prometheus.yml
- job_name: 'api-optimization'
  static_configs:
    - targets: ['app:3000']
  metrics_path: '/metrics'
  scrape_interval: 15s
```

2. **Custom Metrics**
```typescript
// File: src/utils/metrics.ts
import { register, Counter, Histogram } from 'prom-client';

export const apiRequestDuplicates = new Counter({
  name: 'api_request_duplicates_total',
  help: 'Total number of duplicate API requests prevented',
  labelNames: ['endpoint']
});

export const apiResponseTime = new Histogram({
  name: 'api_response_time_seconds',
  help: 'API response time in seconds',
  labelNames: ['endpoint', 'method', 'status']
});

export const gdprConsentChecks = new Counter({
  name: 'gdpr_consent_checks_total',
  help: 'Total number of GDPR consent checks',
  labelNames: ['result']
});
```

3. **Alerting Rules**
```yaml
# alertmanager.yml
groups:
- name: api-optimization
  rules:
  - alert: HighDuplicateRequests
    expr: rate(api_request_duplicates_total[5m]) > 0.1
    for: 2m
    annotations:
      summary: "High number of duplicate API requests detected"
      
  - alert: APIErrorRate
    expr: rate(api_errors_total[5m]) > 0.05
    for: 1m
    annotations:
      summary: "High API error rate detected"
      
  - alert: GDPRConsentFailures
    expr: rate(gdpr_consent_checks_total{result="denied"}[5m]) > 0.1
    for: 2m
    annotations:
      summary: "High GDPR consent denial rate"
```

---

## 📊 Success Metrics

### Performance Targets

| Metrica | Valore Attuale | Target | Miglioramento |
|---------|----------------|--------|--------------|
| Richieste Duplicate | 3x per tenant | 1x per tenant | -66% |
| Error Rate API | 100% | <1% | -99% |
| Fallback a Dummy | 100% | 0% | -100% |
| Time to First Byte | ~2s | <500ms | -75% |
| Bundle Size | Current | -10% | Ottimizzazione |

### GDPR Compliance Targets

| Aspetto | Stato Attuale | Target | Implementazione |
|---------|---------------|--------|-----------------|
| Audit Trail | Parziale | Completo | 100% |
| Consent Checks | Assente | Presente | 100% |
| Data Minimization | Violato | Conforme | 100% |
| Error Logging | Non Conforme | Conforme | 100% |

### User Experience Targets

| Metrica | Attuale | Target | Miglioramento |
|---------|---------|--------|--------------|
| Loading Time | >3s | <1s | -66% |
| Error Messages | Tecnici | User-Friendly | 100% |
| Data Accuracy | Dummy | Real | 100% |
| Consent UX | Assente | Presente | 100% |

---

## 🚨 Risk Assessment

### Rischi Tecnici

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Cache Issues | Media | Alto | Extensive testing + TTL configuration |
| GDPR Violations | Bassa | Critico | Legal review + audit trail |
| Performance Regression | Bassa | Medio | Load testing + monitoring |
| Breaking Changes | Media | Alto | Backward compatibility + feature flags |

### Rischi Business

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| User Disruption | Bassa | Alto | Blue-green deployment + rollback plan |
| Data Loss | Molto Bassa | Critico | Backup strategy + validation |
| Compliance Issues | Bassa | Critico | Legal review + documentation |

---

## 📋 Checklist Finale

### Pre-Implementation
- [x] **Analisi Problema**: Completata
- [x] **Planning Dettagliato**: Completato
- [ ] **Team Alignment**: Da completare
- [ ] **Resource Allocation**: Da completare

### Implementation
- [ ] **TenantContext Refactor**: Da implementare
- [ ] **API Service Optimization**: Da implementare
- [ ] **Dashboard GDPR Compliance**: Da implementare
- [ ] **Error Handling Enhancement**: Da implementare

### Testing
- [ ] **Unit Tests**: Da scrivere ed eseguire
- [ ] **Integration Tests**: Da scrivere ed eseguire
- [ ] **E2E Tests**: Da scrivere ed eseguire
- [ ] **Performance Tests**: Da eseguire

### Deployment
- [ ] **Code Review**: Da completare
- [ ] **Security Review**: Da completare
- [ ] **Blue-Green Deployment**: Da eseguire
- [ ] **Monitoring Setup**: Da configurare

### Post-Deployment
- [ ] **Performance Monitoring**: Da attivare
- [ ] **Error Tracking**: Da verificare
- [ ] **GDPR Audit**: Da eseguire
- [ ] **User Feedback**: Da raccogliere

---

## 🎯 Next Steps

1. **Team Meeting**: Allineamento su planning e timeline
2. **Environment Setup**: Preparazione ambiente di sviluppo
3. **Implementation Start**: Inizio Fase 1 - Analisi e Preparazione
4. **Daily Standups**: Monitoraggio progresso giornaliero
5. **Continuous Testing**: Testing continuo durante implementazione

---

**Documento preparato per:** Implementazione Immediata  
**Prossimo documento:** `IMPLEMENTATION_LOG.md`  
**Responsabile:** Team Development  
**Review:** Team Lead + GDPR Officer + DevOps Lead  
**Approvazione:** Product Owner