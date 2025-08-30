# GUIDA IMPLEMENTAZIONE - Risoluzione Errori API e Ottimizzazione Performance

**Data Creazione:** 31 Gennaio 2025  
**Versione:** 1.0  
**Stato:** Ready for Implementation  
**Team:** Frontend + Backend + DevOps  

---

## 🎯 Quick Start Guide

Questa guida fornisce tutti gli strumenti necessari per implementare immediatamente le soluzioni ai problemi identificati:

1. **Richieste API duplicate** per `/tenants/current`
2. **Errori di parsing JSON** con fallback a dati dummy
3. **Violazioni GDPR** nell'uso di dati fittizi

---

## 📂 Struttura File da Modificare

```
src/
├── contexts/
│   └── TenantContext.tsx          # MODIFICA CRITICA
├── services/
│   ├── api.ts                     # MODIFICA CRITICA
│   └── tenants.ts                 # VERIFICA
├── components/
│   └── Dashboard.tsx              # MODIFICA CRITICA
├── utils/
│   ├── gdpr.ts                    # VERIFICA/ESTENDI
│   └── metrics.ts                 # NUOVO FILE
└── __tests__/
    ├── TenantContext.test.tsx     # NUOVO FILE
    ├── ApiService.test.ts         # NUOVO FILE
    └── Dashboard.integration.test.tsx # NUOVO FILE
```

---

## 🔧 Implementazione Step-by-Step

### Step 1: Backup e Preparazione

```bash
# 1. Backup dei file esistenti
cp src/contexts/TenantContext.tsx src/contexts/TenantContext.tsx.backup
cp src/services/api.ts src/services/api.ts.backup
cp src/components/Dashboard.tsx src/components/Dashboard.tsx.backup

# 2. Creare branch per il fix
git checkout -b hotfix/api-optimization
git add .
git commit -m "Backup before API optimization implementation"

# 3. Verificare dipendenze
npm list react react-dom
npm list @types/react @types/react-dom
```

### Step 2: Implementazione TenantContext Ottimizzato

**File:** `src/contexts/TenantContext.tsx`

```typescript
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { getCurrentTenant } from '../services/tenants';
import { logGdprAction } from '../utils/gdpr';

// Types
interface Tenant {
  id: string;
  name: string;
  settings?: any;
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  clearTenant: () => void;
}

// Context
const TenantContext = createContext<TenantContextType | undefined>(undefined);

// Provider Component
export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for deduplication
  const requestRef = useRef<Promise<Tenant> | null>(null);
  const initializedRef = useRef(false);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Main fetch function with deduplication
  const fetchTenant = useCallback(async (): Promise<Tenant> => {
    // Deduplication: se c'è già una richiesta in corso, restituisci quella
    if (requestRef.current) {
      console.log('🔄 Deduplicating tenant request - using existing promise');
      return requestRef.current;
    }

    // Se abbiamo già i dati e non c'è errore, restituisci i dati cached
    if (tenant && !error) {
      console.log('📦 Using cached tenant data');
      return tenant;
    }

    console.log('🚀 Fetching tenant data...');
    
    // Solo aggiorna lo stato se il componente è ancora montato
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    // Crea la promise e salvala nel ref per deduplication
    requestRef.current = getCurrentTenant();

    try {
      const result = await requestRef.current;
      
      // Log GDPR action per audit trail
      await logGdprAction({
        action: 'TENANT_FETCH_SUCCESS',
        tenantId: result?.id,
        timestamp: new Date().toISOString(),
        metadata: {
          cached: false,
          deduplicated: false
        }
      });

      // Aggiorna stato solo se componente ancora montato
      if (mountedRef.current) {
        setTenant(result);
        console.log('✅ Tenant data loaded successfully:', result.name);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Log GDPR error per audit trail
      await logGdprAction({
        action: 'TENANT_FETCH_ERROR',
        error: errorMessage,
        timestamp: new Date().toISOString(),
        metadata: {
          errorType: err instanceof Error ? err.constructor.name : 'UnknownError'
        }
      });
      
      // Aggiorna stato solo se componente ancora montato
      if (mountedRef.current) {
        setError(errorMessage);
        console.error('❌ Failed to fetch tenant:', errorMessage);
      }
      
      throw err;
    } finally {
      // Cleanup
      requestRef.current = null;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [tenant, error]);

  // Public refresh function
  const refreshTenant = useCallback(async () => {
    console.log('🔄 Refreshing tenant data...');
    setTenant(null);
    setError(null);
    
    try {
      await fetchTenant();
    } catch (error) {
      // Error già gestito in fetchTenant
      console.error('Failed to refresh tenant:', error);
    }
  }, [fetchTenant]);

  // Clear tenant data
  const clearTenant = useCallback(() => {
    console.log('🗑️ Clearing tenant data');
    setTenant(null);
    setError(null);
    requestRef.current = null;
    
    // Log GDPR action
    logGdprAction({
      action: 'TENANT_DATA_CLEARED',
      timestamp: new Date().toISOString()
    }).catch(console.error);
  }, []);

  // Inizializzazione automatica una sola volta
  useEffect(() => {
    if (!initializedRef.current && mountedRef.current) {
      initializedRef.current = true;
      console.log('🎯 Initializing TenantContext...');
      
      fetchTenant().catch((error) => {
        console.error('Failed to initialize tenant:', error);
        // Error già gestito in fetchTenant
      });
    }
  }, [fetchTenant]);

  // Context value
  const value: TenantContextType = {
    tenant,
    loading,
    error,
    refreshTenant,
    clearTenant
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

// Hook per usare il context
export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// Hook per debug (solo development)
export const useTenantDebug = () => {
  const context = useTenant();
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🐛 TenantContext Debug:', {
        hasTenant: !!context.tenant,
        loading: context.loading,
        error: context.error,
        tenantId: context.tenant?.id
      });
    }
  }, [context]);
  
  return context;
};
```

### Step 3: Implementazione API Service Ottimizzato

**File:** `src/services/api.ts`

```typescript
import { logGdprAction } from '../utils/gdpr';

// Types
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface RequestOptions extends RequestInit {
  cacheTtl?: number;
  skipCache?: boolean;
  retries?: number;
}

// API Service Class
class ApiService {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<any>>();
  private baseURL: string;
  private defaultTtl = 5 * 60 * 1000; // 5 minuti

  constructor(baseURL = '') {
    this.baseURL = baseURL;
    
    // Cleanup cache periodicamente
    setInterval(() => this.cleanupCache(), 60 * 1000); // ogni minuto
  }

  // Genera chiave cache
  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body || '';
    return `${method}:${url}:${typeof body === 'string' ? body : JSON.stringify(body)}`;
  }

  // Verifica validità cache
  private isValidCache(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  // Cleanup cache scaduta
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  // Valida risposta JSON
  private async validateJsonResponse(response: Response, url: string): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      const preview = text.substring(0, 200);
      
      // Log GDPR error
      await logGdprAction({
        action: 'API_INVALID_CONTENT_TYPE',
        url,
        contentType,
        responsePreview: preview,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(
        `Expected JSON response, got ${contentType}. ` +
        `Response preview: ${preview}${text.length > 200 ? '...' : ''}`
      );
    }

    try {
      return await response.json();
    } catch (error) {
      // Log GDPR parsing error
      await logGdprAction({
        action: 'JSON_PARSE_ERROR',
        url,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Esegui richiesta HTTP
  private async executeRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    const { retries = 1, ...fetchOptions } = options;
    
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🌐 Making request to ${fullUrl} (attempt ${attempt + 1}/${retries + 1})`);
        
        const response = await fetch(fullUrl, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...fetchOptions.headers
          }
        });

        if (!response.ok) {
          const errorData = await this.validateJsonResponse(response, fullUrl)
            .catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
          
          // Log GDPR error
          await logGdprAction({
            action: 'API_ERROR_RESPONSE',
            url: fullUrl,
            status: response.status,
            statusText: response.statusText,
            error: errorData.message,
            attempt: attempt + 1,
            timestamp: new Date().toISOString()
          });
          
          const error = new Error(`API Error ${response.status}: ${errorData.message}`);
          (error as any).status = response.status;
          (error as any).response = errorData;
          throw error;
        }

        const data = await this.validateJsonResponse(response, fullUrl);
        
        // Log successful request
        await logGdprAction({
          action: 'API_REQUEST_SUCCESS',
          url: fullUrl,
          method: fetchOptions.method || 'GET',
          attempt: attempt + 1,
          timestamp: new Date().toISOString()
        });
        
        return data;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Retrying request in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  // Richiesta principale con cache e deduplication
  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { cacheTtl = this.defaultTtl, skipCache = false, ...requestOptions } = options;
    const cacheKey = this.getCacheKey(url, requestOptions);
    
    // Check cache first (se non skipCache)
    if (!skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isValidCache(cached)) {
        console.log(`📦 Cache hit for ${url}`);
        return cached.data;
      }
    }

    // Check pending requests (deduplication)
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      console.log(`🔄 Deduplicating request for ${url}`);
      
      // Log deduplication
      await logGdprAction({
        action: 'API_REQUEST_DEDUPLICATED',
        url,
        cacheKey,
        timestamp: new Date().toISOString()
      });
      
      return pending;
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(url, requestOptions);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache successful result (se non skipCache)
      if (!skipCache) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          ttl: cacheTtl
        });
        console.log(`💾 Cached result for ${url} (TTL: ${cacheTtl}ms)`);
      }

      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Metodi di convenienza
  async get<T>(url: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  async post<T>(url: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(url: string, data?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(url: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  // Gestione cache
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared ${size} cache entries`);
    
    // Log cache clear
    logGdprAction({
      action: 'API_CACHE_CLEARED',
      entriesCleared: size,
      timestamp: new Date().toISOString()
    }).catch(console.error);
  }

  invalidateCache(pattern: string): void {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    console.log(`🔄 Invalidated ${invalidated} cache entries matching "${pattern}"`);
    
    // Log cache invalidation
    logGdprAction({
      action: 'API_CACHE_INVALIDATED',
      pattern,
      entriesInvalidated: invalidated,
      timestamp: new Date().toISOString()
    }).catch(console.error);
  }

  // Debug info
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }
}

// Singleton instance
export const apiService = new ApiService();

// Export per backward compatibility
export default apiService;

// Utility functions
export const clearApiCache = () => apiService.clearCache();
export const invalidateApiCache = (pattern: string) => apiService.invalidateCache(pattern);
export const getApiCacheStats = () => apiService.getCacheStats();
```

### Step 4: Implementazione Dashboard GDPR-Compliant

**File:** `src/components/Dashboard.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { checkConsent, logGdprAction } from '../utils/gdpr';
import { useTenant } from '../contexts/TenantContext';

// Types
interface DataState<T = any> {
  data: T[] | null;
  loading: boolean;
  error: string | null;
  hasConsent: boolean;
  lastFetch: Date | null;
}

interface DashboardProps {
  className?: string;
}

// Utility function per determinare il tipo di dati dall'endpoint
const getDataTypeFromEndpoint = (endpoint: string): string => {
  if (endpoint.includes('courses')) return 'courses';
  if (endpoint.includes('trainers')) return 'trainers';
  if (endpoint.includes('companies')) return 'companies';
  return 'unknown';
};

// Hook personalizzato per gestire dati con GDPR compliance
const useGdprCompliantData = <T = any>(endpoint: string, dataType: string) => {
  const [state, setState] = useState<DataState<T>>({
    data: null,
    loading: false,
    error: null,
    hasConsent: false,
    lastFetch: null
  });

  const fetchData = useCallback(async (forceRefresh = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Verifica consenso GDPR
      console.log(`🔒 Checking GDPR consent for ${dataType}...`);
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
          endpoint,
          timestamp: new Date().toISOString()
        });
        
        return;
      }

      // 2. Fetch data con validazione
      console.log(`📡 Fetching ${dataType} data from ${endpoint}...`);
      const data = await apiService.get<T[]>(endpoint, {
        skipCache: forceRefresh,
        retries: 2
      });
      
      // 3. Log successful access
      await logGdprAction({
        action: 'DATA_ACCESS_SUCCESS',
        dataType,
        endpoint,
        recordCount: Array.isArray(data) ? data.length : 1,
        timestamp: new Date().toISOString(),
        metadata: {
          forceRefresh,
          dataSize: JSON.stringify(data).length
        }
      });

      setState({
        data,
        loading: false,
        error: null,
        hasConsent: true,
        lastFetch: new Date()
      });

      console.log(`✅ Successfully loaded ${Array.isArray(data) ? data.length : 1} ${dataType} records`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log error senza esporre dati sensibili
      await logGdprAction({
        action: 'DATA_ACCESS_ERROR',
        dataType,
        endpoint,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        errorMessage: errorMessage,
        timestamp: new Date().toISOString(),
        metadata: {
          forceRefresh
        }
      });

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        hasConsent: true
      }));

      console.error(`❌ Failed to load ${dataType}:`, errorMessage);
    }
  }, [endpoint, dataType]);

  const retry = useCallback(() => {
    console.log(`🔄 Retrying ${dataType} data fetch...`);
    fetchData(true); // Force refresh on retry
  }, [fetchData, dataType]);

  const requestConsent = useCallback(async () => {
    console.log(`📝 Requesting consent for ${dataType}...`);
    
    // Qui dovresti implementare la logica per richiedere il consenso
    // Per ora simuliamo l'accettazione del consenso
    try {
      // Simula richiesta consenso (sostituire con implementazione reale)
      const consentGranted = window.confirm(
        `Vuoi fornire il consenso per visualizzare i dati di ${dataType}?`
      );
      
      if (consentGranted) {
        // Salva consenso (implementare con il tuo sistema di consensi)
        localStorage.setItem('gdpr_consent_data_processing', 'true');
        
        await logGdprAction({
          action: 'CONSENT_GRANTED',
          dataType,
          timestamp: new Date().toISOString()
        });
        
        // Riprova il fetch
        await fetchData();
      } else {
        await logGdprAction({
          action: 'CONSENT_DENIED',
          dataType,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error requesting consent:', error);
    }
  }, [dataType, fetchData]);

  return {
    ...state,
    fetchData,
    retry,
    requestConsent
  };
};

// Componente per renderizzare sezione dati
const DataSection: React.FC<{
  title: string;
  state: DataState;
  onRetry: () => void;
  onRequestConsent: () => void;
  renderData?: (data: any[]) => React.ReactNode;
}> = ({ title, state, onRetry, onRequestConsent, renderData }) => {
  
  // Consent required
  if (!state.hasConsent && state.error === 'CONSENT_REQUIRED') {
    return (
      <div className="data-section consent-required">
        <div className="section-header">
          <h3>{title}</h3>
          <span className="status-badge consent">Consenso Richiesto</span>
        </div>
        <div className="consent-message">
          <div className="icon">🔒</div>
          <p>È necessario il consenso per visualizzare questi dati in conformità al GDPR.</p>
          <button onClick={onRequestConsent} className="btn btn-primary">
            Fornisci Consenso
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (state.loading) {
    return (
      <div className="data-section loading">
        <div className="section-header">
          <h3>{title}</h3>
          <span className="status-badge loading">Caricamento...</span>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Caricamento dati in corso...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error && state.error !== 'CONSENT_REQUIRED') {
    return (
      <div className="data-section error">
        <div className="section-header">
          <h3>{title}</h3>
          <span className="status-badge error">Errore</span>
        </div>
        <div className="error-content">
          <div className="icon">⚠️</div>
          <p>Impossibile caricare i dati.</p>
          <div className="error-details">
            <small>Dettagli: {state.error}</small>
          </div>
          <button onClick={onRetry} className="btn btn-secondary">
            🔄 Riprova
          </button>
        </div>
      </div>
    );
  }

  // Success state with data
  if (state.data && state.data.length > 0) {
    return (
      <div className="data-section success">
        <div className="section-header">
          <h3>{title}</h3>
          <span className="status-badge success">
            {state.data.length} elementi
          </span>
          {state.lastFetch && (
            <small className="last-fetch">
              Aggiornato: {state.lastFetch.toLocaleTimeString()}
            </small>
          )}
        </div>
        <div className="data-content">
          {renderData ? renderData(state.data) : (
            <div className="data-list">
              {state.data.map((item, index) => (
                <div key={item.id || index} className="data-item">
                  <span>{item.name || item.title || `Elemento ${index + 1}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="section-actions">
          <button onClick={onRetry} className="btn btn-outline">
            🔄 Aggiorna
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="data-section empty">
      <div className="section-header">
        <h3>{title}</h3>
        <span className="status-badge empty">Nessun dato</span>
      </div>
      <div className="empty-content">
        <div className="icon">📭</div>
        <p>Nessun dato disponibile</p>
        <button onClick={onRetry} className="btn btn-outline">
          🔄 Ricarica
        </button>
      </div>
    </div>
  );
};

// Componente Dashboard principale
const Dashboard: React.FC<DashboardProps> = ({ className = '' }) => {
  const { tenant, loading: tenantLoading, error: tenantError } = useTenant();
  
  // Hooks per i dati con GDPR compliance
  const courses = useGdprCompliantData('/api/courses', 'courses');
  const trainers = useGdprCompliantData('/api/trainers', 'trainers');
  const companies = useGdprCompliantData('/api/companies', 'companies');

  // Fetch data quando il tenant è disponibile
  useEffect(() => {
    if (tenant && !tenantLoading) {
      console.log('🎯 Tenant loaded, fetching dashboard data...');
      
      // Fetch tutti i dati in parallelo
      Promise.allSettled([
        courses.fetchData(),
        trainers.fetchData(),
        companies.fetchData()
      ]).then((results) => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`📊 Dashboard data fetch completed: ${successful} successful, ${failed} failed`);
        
        // Log dashboard load completion
        logGdprAction({
          action: 'DASHBOARD_LOAD_COMPLETED',
          tenantId: tenant.id,
          successfulFetches: successful,
          failedFetches: failed,
          timestamp: new Date().toISOString()
        }).catch(console.error);
      });
    }
  }, [tenant, tenantLoading, courses.fetchData, trainers.fetchData, companies.fetchData]);

  // Render custom per i corsi
  const renderCourses = (data: any[]) => (
    <div className="courses-grid">
      {data.slice(0, 6).map((course, index) => (
        <div key={course.id || index} className="course-card">
          <h4>{course.title || course.name}</h4>
          <p>{course.description?.substring(0, 100)}...</p>
          <div className="course-meta">
            <span>👥 {course.participants || 0} partecipanti</span>
            <span>⏱️ {course.duration || 'N/A'}</span>
          </div>
        </div>
      ))}
    </div>
  );

  // Render custom per i formatori
  const renderTrainers = (data: any[]) => (
    <div className="trainers-list">
      {data.slice(0, 8).map((trainer, index) => (
        <div key={trainer.id || index} className="trainer-item">
          <div className="trainer-avatar">
            {trainer.name?.charAt(0) || '👤'}
          </div>
          <div className="trainer-info">
            <h5>{trainer.name}</h5>
            <p>{trainer.specialization || trainer.role}</p>
          </div>
        </div>
      ))}
    </div>
  );

  // Render custom per le aziende
  const renderCompanies = (data: any[]) => (
    <div className="companies-list">
      {data.slice(0, 10).map((company, index) => (
        <div key={company.id || index} className="company-item">
          <div className="company-logo">
            {company.name?.charAt(0) || '🏢'}
          </div>
          <div className="company-info">
            <h5>{company.name}</h5>
            <p>{company.sector || company.industry || 'Settore non specificato'}</p>
            <small>{company.employees || 0} dipendenti</small>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`dashboard ${className}`}>
      {/* Header */}
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        {tenant && (
          <div className="tenant-info">
            <span>🏢 {tenant.name}</span>
          </div>
        )}
      </div>
      
      {/* Tenant Loading */}
      {tenantLoading && (
        <div className="tenant-loading">
          <div className="loading-spinner"></div>
          <p>Caricamento informazioni tenant...</p>
        </div>
      )}
      
      {/* Tenant Error */}
      {tenantError && (
        <div className="tenant-error">
          <div className="icon">⚠️</div>
          <p>Errore nel caricamento delle informazioni tenant: {tenantError}</p>
        </div>
      )}
      
      {/* Dashboard Content */}
      {tenant && !tenantLoading && (
        <div className="dashboard-content">
          <DataSection
            title="Corsi di Formazione"
            state={courses}
            onRetry={courses.retry}
            onRequestConsent={courses.requestConsent}
            renderData={renderCourses}
          />
          
          <DataSection
            title="Formatori"
            state={trainers}
            onRetry={trainers.retry}
            onRequestConsent={trainers.requestConsent}
            renderData={renderTrainers}
          />
          
          <DataSection
            title="Aziende Partner"
            state={companies}
            onRetry={companies.retry}
            onRequestConsent={companies.requestConsent}
            renderData={renderCompanies}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
```

### Step 5: Implementazione Utilities GDPR

**File:** `src/utils/gdpr.ts` (verifica/estendi esistente)

```typescript
// Assicurati che queste funzioni esistano e siano implementate correttamente

export interface GdprAction {
  action: string;
  timestamp: string;
  tenantId?: string;
  userId?: string;
  dataType?: string;
  endpoint?: string;
  error?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export const logGdprAction = async (action: GdprAction): Promise<void> => {
  try {
    // Implementazione esistente o nuova
    console.log('📝 GDPR Action:', action);
    
    // Invia al backend per audit trail
    await fetch('/api/gdpr/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(action)
    });
  } catch (error) {
    console.error('Failed to log GDPR action:', error);
    // Non bloccare l'applicazione per errori di logging
  }
};

export const checkConsent = async (consentType: string): Promise<boolean> => {
  try {
    // Verifica consenso dal localStorage (implementazione semplificata)
    const consent = localStorage.getItem(`gdpr_consent_${consentType}`);
    
    if (consent === 'true') {
      return true;
    }
    
    // Verifica consenso dal backend
    const response = await fetch(`/api/gdpr/consent/${consentType}`);
    if (response.ok) {
      const data = await response.json();
      return data.hasConsent === true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to check consent:', error);
    // In caso di errore, assumiamo no consent per sicurezza
    return false;
  }
};
```

### Step 6: Implementazione Metrics

**File:** `src/utils/metrics.ts` (nuovo file)

```typescript
// Metrics per monitoraggio performance

interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

class MetricsCollector {
  private metrics: MetricData[] = [];
  private maxMetrics = 1000;

  record(metric: MetricData): void {
    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || new Date()
    });

    // Mantieni solo le ultime N metriche
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Metric recorded:', metric);
    }
  }

  getMetrics(): MetricData[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  // Invia metriche al backend
  async flush(): Promise<void> {
    if (this.metrics.length === 0) return;

    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics: this.metrics
        })
      });

      this.clearMetrics();
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }
}

export const metricsCollector = new MetricsCollector();

// Helper functions
export const recordApiDuplicatePrevented = (endpoint: string) => {
  metricsCollector.record({
    name: 'api_duplicate_prevented',
    value: 1,
    labels: { endpoint }
  });
};

export const recordApiError = (endpoint: string, errorType: string) => {
  metricsCollector.record({
    name: 'api_error',
    value: 1,
    labels: { endpoint, errorType }
  });
};

export const recordGdprConsentCheck = (result: 'granted' | 'denied') => {
  metricsCollector.record({
    name: 'gdpr_consent_check',
    value: 1,
    labels: { result }
  });
};

export const recordPageLoadTime = (page: string, loadTime: number) => {
  metricsCollector.record({
    name: 'page_load_time',
    value: loadTime,
    labels: { page }
  });
};

// Auto-flush ogni 30 secondi
setInterval(() => {
  metricsCollector.flush().catch(console.error);
}, 30000);
```

---

## 🧪 Testing Implementation

### Quick Test Script

**File:** `scripts/test-implementation.js`

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing API Optimization Implementation...');

// 1. Verifica che i file esistano
const requiredFiles = [
  'src/contexts/TenantContext.tsx',
  'src/services/api.ts',
  'src/components/Dashboard.tsx',
  'src/utils/gdpr.ts',
  'src/utils/metrics.ts'
];

console.log('\n📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
    process.exit(1);
  }
});

// 2. Verifica TypeScript compilation
console.log('\n🔧 Checking TypeScript compilation...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  process.exit(1);
}

// 3. Run tests
console.log('\n🧪 Running tests...');
try {
  execSync('npm test -- --watchAll=false', { stdio: 'inherit' });
  console.log('✅ Tests passed');
} catch (error) {
  console.log('❌ Tests failed');
  process.exit(1);
}

// 4. Build check
console.log('\n🏗️ Checking build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful');
} catch (error) {
  console.log('❌ Build failed');
  process.exit(1);
}

console.log('\n🎉 All checks passed! Implementation is ready.');
```

### Manual Testing Checklist

```markdown
## 📋 Manual Testing Checklist

### Pre-Testing Setup
- [ ] Backup originale completato
- [ ] Branch hotfix/api-optimization creato
- [ ] Dipendenze installate
- [ ] Server di sviluppo avviato

### Functional Testing

#### TenantContext
- [ ] Tenant si carica una sola volta all'avvio
- [ ] Non ci sono richieste duplicate in console
- [ ] Refresh tenant funziona correttamente
- [ ] Error handling funziona
- [ ] Cache viene utilizzata correttamente

#### API Service
- [ ] Richieste duplicate vengono deduplicate
- [ ] Cache funziona correttamente
- [ ] Errori JSON vengono gestiti
- [ ] Retry logic funziona
- [ ] Metriche vengono registrate

#### Dashboard
- [ ] Richiesta consenso GDPR appare quando necessario
- [ ] Dati si caricano dopo consenso
- [ ] Errori vengono mostrati correttamente
- [ ] Nessun fallback a dati dummy
- [ ] Retry funziona

### Performance Testing
- [ ] Tempo di caricamento < 2 secondi
- [ ] Nessuna richiesta duplicata in Network tab
- [ ] Cache hits visibili in console
- [ ] Memory usage stabile

### GDPR Compliance Testing
- [ ] Audit trail viene registrato
- [ ] Consenso viene verificato
- [ ] Dati non vengono mostrati senza consenso
- [ ] Error logging non espone dati sensibili

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

```bash
# 1. Final testing
npm run test
npm run build
npm run lint

# 2. Code review
git add .
git commit -m "feat: implement API optimization and GDPR compliance

- Fix duplicate API requests for /tenants/current
- Implement request deduplication and caching
- Add GDPR-compliant error handling
- Remove dummy data fallbacks
- Add comprehensive audit trail
- Implement consent verification

Fixes: API duplicate requests, JSON parsing errors, GDPR violations"

# 3. Create PR
git push origin hotfix/api-optimization
```

### Production Deployment

```bash
# 1. Merge to main
git checkout main
git merge hotfix/api-optimization

# 2. Tag release
git tag -a v2.0.1 -m "API Optimization and GDPR Compliance Fix"
git push origin v2.0.1

# 3. Deploy
npm run deploy:production

# 4. Monitor
npm run monitor:production
```

### Post-Deployment Monitoring

```bash
# Monitor for 30 minutes
watch -n 30 'curl -s https://app.domain.com/api/health | jq .'

# Check logs
tail -f /var/log/app/application.log | grep -E "(ERROR|WARN|duplicate|GDPR)"

# Monitor metrics
curl -s https://app.domain.com/metrics | grep -E "(api_duplicate|gdpr_consent|api_error)"
```

---

## 📞 Support & Troubleshooting

### Common Issues

1. **TypeScript Errors**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Cache Issues**
   ```javascript
   // Clear API cache in browser console
   window.apiService?.clearCache();
   ```

3. **GDPR Consent Issues**
   ```javascript
   // Reset consent in browser console
   localStorage.removeItem('gdpr_consent_data_processing');
   ```

### Debug Commands

```javascript
// In browser console

// Check cache stats
console.log(window.apiService?.getCacheStats());

// Check tenant context
console.log(window.React?.version);

// Force refresh all data
window.location.reload();
```

---

**Documento completato per:** Implementazione Immediata  
**Prossimo step:** Esecuzione implementazione  
**Support:** Team Development  
**Emergency Contact:** Team Lead