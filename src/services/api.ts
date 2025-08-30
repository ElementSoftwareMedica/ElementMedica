import axios from 'axios';
import { getToken, removeToken } from './auth';
import { API_BASE_URL } from '../config/api';
import { checkConsent, logGdprAction, ConsentRequiredError } from '../utils/gdpr';
import { recordApiCall, startTimer } from '../utils/metrics';
import { throttledApiCall } from './requestThrottler';

// Interfaccia per la configurazione estesa
interface ExtendedAxiosConfig {
  _requestUrl?: string;
  _skipGdprCheck?: boolean;
  _skipDeduplication?: boolean;
  _cacheKey?: string;
  _isApiGetCall?: boolean;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  baseURL?: string;
  data?: unknown;
  withCredentials?: boolean;
  params?: Record<string, unknown>;
  timeout?: number;
}

// Cache per le risposte API
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = {
  default: 5 * 60 * 1000, // 5 minuti
  auth: 15 * 60 * 1000,   // 15 minuti per auth
  static: 30 * 60 * 1000, // 30 minuti per dati statici
};

// Configurazione per il retry delle richieste - disabilitato completamente
const MAX_RETRIES = 0; // Disabilitati i retry automatici
const RETRY_DELAY = 2000;

// Oggetto per tracciare le richieste in sospeso e deduplication
const pendingRequests = {
  count: 0,
  urls: new Set<string>()
};
const activeRequests = new Map<string, Promise<unknown>>();

// Utility per generare chiavi di cache
const getCacheKey = (method: string, url: string, data?: unknown): string => {
  // PROTEZIONE ULTRA-ROBUSTA per i metodi HTTP undefined/null/vuoti
  const safeMethod = (method && typeof method === 'string' && method.trim().length > 0 && /^[A-Za-z]+$/.test(method.trim())) ? method.trim().toUpperCase() : 'GET';
  
  const dataHash = data ? JSON.stringify(data) : '';
  return `${safeMethod}:${url}:${dataHash}`;
};

// Utility per validare JSON
const validateJsonResponse = (data: unknown, url: string): unknown => {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Invalid JSON response from ${url}:`, data);
      throw new Error(`Invalid JSON response from ${url}`);
    }
  }
  return data;
};

// Utility per determinare TTL cache
const getCacheTtl = (url: string): number => {
  if (url.includes('/auth/') || url.includes('/login')) return CACHE_TTL.auth;
  if (url.includes('/static/') || url.includes('/config/')) return CACHE_TTL.static;
  return CACHE_TTL.default;
};

// Create base API client with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Abilita withCredentials per supportare CORS con credenziali
  withCredentials: true,
  // Rimuovo timeout globale per permettere timeout specifici per operazione
});

// Request interceptor for API calls
apiClient.interceptors.request.use(
  (config: any) => {
    // SOLUZIONE ULTRA-SEMPLIFICATA: Per chiamate apiGet, fai il minimo indispensabile
    if (config._isApiGetCall) {
      // Per apiGet, fai solo le operazioni essenziali senza toccare nulla di Axios

      // Solo token e headers essenziali
      const token = getToken();

      if (token) {
        if (!config.headers) config.headers = {};
        (config.headers as Record<string, any>)['Authorization'] = `Bearer ${token}`;
      } else {
        // Per endpoint di autenticazione, questo è critico
        if (config.url?.includes('/auth/verify')) {
          console.error('🚨 [CRITICAL] No token found for /auth/verify endpoint!');
        }
      }

      // Imposta l'header X-Tenant-ID solo se presente in localStorage (niente fallback o gating host)
      try {
        const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;
        if (tenantId && tenantId !== 'default-company') {
          if (!config.headers) config.headers = {};
          (config.headers as Record<string, any>)['X-Tenant-ID'] = tenantId;
        }
      } catch (e) {
        // safe noop
      }

      // Evita doppio '/api' quando baseURL già termina con '/api' e l'URL inizia con '/api/'
      if (
        typeof config.baseURL === 'string' && /\/api\/?$/i.test(config.baseURL) &&
        typeof config.url === 'string' && config.url.startsWith('/api/')
      ) {
        config.url = config.url.replace(/^\/api\//, '/');
      }

      // Normalizzazione URL: se comincia con '/' ma non con '/api', prefissa '/api'
      if (typeof config.url === 'string' && config.url.startsWith('/') && !config.url.startsWith('/api') && !/^https?:\/\//i.test(config.url)) {
        config.url = `/api${config.url}`;
      }

      // Fallback baseURL: se manca baseURL e l'URL è relativo (non assoluto) e NON inizia già con "/api",
      // imposta la baseURL a API_BASE_URL per garantire il prefisso corretto in produzione.
      if (
        !config.baseURL &&
        typeof config.url === 'string' &&
        !/^https?:\/\//i.test(config.url) &&
        !config.url.startsWith('/api')
      ) {
        config.baseURL = API_BASE_URL;
      }

      return config; // RITORNA SUBITO senza altre elaborazioni
    }

    // Per tutte le altre chiamate (non apiGet), gestisci normalmente
    let safeMethodForLogging = 'GET';

    try {
      const method = config.method;

      // SOLUZIONE DEFINITIVA: Controllo più rigoroso per valori null, undefined, vuoti o non stringa
      if (method === null ||
          method === undefined ||
          method === '' ||
          typeof method !== 'string' ||
          (typeof method === 'object' && method !== null)) {

        // CORREZIONE CRITICA: SEMPRE impostare un metodo valido per evitare errori toUpperCase
        config.method = 'GET';
        safeMethodForLogging = 'GET';
        console.log('🔧 [API INTERCEPTOR] Method was null/undefined/empty/non-string, forcing to GET. Original method:', typeof method, method);
      } else {
        // Assicurati che sia una stringa valida prima di chiamare toUpperCase
        const methodStr = String(method).trim();
        if (methodStr.length > 0 && /^[A-Za-z]+$/.test(methodStr)) {
          config.method = methodStr.toUpperCase();
          safeMethodForLogging = methodStr.toUpperCase();
        } else {
          console.log('🔧 [API INTERCEPTOR] Method was invalid string format, forcing to GET. Original method:', methodStr);
          // CORREZIONE CRITICA: SEMPRE impostare un metodo valido
          config.method = 'GET';
          safeMethodForLogging = 'GET';
        }
      }
    } catch (error) {
      console.warn('🚨 [API INTERCEPTOR] Error processing HTTP method, forcing to GET:', error);
      // CORREZIONE CRITICA: SEMPRE impostare un metodo valido in caso di errore
      config.method = 'GET';
      safeMethodForLogging = 'GET';
    }

    // PROTEZIONE ULTRA-ROBUSTA: Assicurati che headers sia sempre un oggetto valido
    if (!config.headers || typeof config.headers !== 'object' || config.headers === null) {
      config.headers = {};
    }

    // PROTEZIONE AGGIUNTIVA: Assicurati che Content-Type sia sempre definito per evitare undefined
    if (!(config.headers as Record<string, any>)['Content-Type'] && !(config.headers as Record<string, any>)['content-type']) {
      (config.headers as Record<string, any>)['Content-Type'] = 'application/json';
    }

    // Evita doppio '/api' quando baseURL già termina con '/api' e l'URL inizia con '/api/'
    if (
      typeof config.baseURL === 'string' && /\/api\/?$/i.test(config.baseURL) &&
      typeof config.url === 'string' && config.url.startsWith('/api/')
    ) {
      config.url = config.url.replace(/^\/api\//, '/');
    }

    // Normalizzazione URL: se comincia con '/' ma non con '/api', prefissa '/api'
    if (typeof config.url === 'string' && config.url.startsWith('/') && !config.url.startsWith('/api') && !/^https?:\/\//i.test(config.url)) {
      config.url = `/api${config.url}`;
    }

    // Fallback baseURL: se manca baseURL e l'URL è relativo (non assoluto) e NON inizia già con "/api",
    // imposta la baseURL a API_BASE_URL per garantire il prefisso corretto in produzione.
    if (
      !config.baseURL &&
      typeof config.url === 'string' &&
      !/^https?:\/\//i.test(config.url) &&
      !config.url.startsWith('/api')
    ) {
      config.baseURL = API_BASE_URL;
    }

    const timer = startTimer();
    // Usa il metodo sicuro per getCacheKey
    const requestKey = getCacheKey(safeMethodForLogging, config.url || '', config.data);

    // Debug: Log della configurazione axios
    console.log('🔍 [AXIOS DEBUG] Request config:', {
      url: config.url,
      baseURL: config.baseURL,
      fullURL: (config.baseURL || '') + (config.url || ''),
      method: config.method,
      isApiGetCall: config._isApiGetCall,
      contentType: (config.headers as Record<string, any>)['Content-Type']
    });

    // Add auth token if available
    const token = getToken();
    if (token) {
      (config.headers as Record<string, any>)['Authorization'] = `Bearer ${token}`;
      // Debug per getCurrentTenant
      if (config.url?.includes('/tenants/current')) {
        console.log('🔐 Adding token to /tenants/current request:', {
          hasToken: !!token,
          tokenStart: token.substring(0, 20) + '...',
          url: config.url,
          fullURL: (config.baseURL || '') + (config.url || ''),
          timestamp: new Date().toISOString()
        });
      }
    } else if (config.url?.includes('/tenants/current')) {
      console.warn('⚠️ No token available for /tenants/current request:', {
        url: config.url,
        fullURL: (config.baseURL || '') + (config.url || ''),
        timestamp: new Date().toISOString()
      });
    }

    // Imposta l'header X-Tenant-ID solo se presente in localStorage (senza fallback o gating host)
    try {
      const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;
      if (tenantId && tenantId !== 'default-company') {
        (config.headers as Record<string, any>)['X-Tenant-ID'] = tenantId;
      }
    } catch (e) {
      // safe noop
    }

    // Traccia l'URL della richiesta per il logging
    config._requestUrl = config.url;
    config._cacheKey = requestKey;

    // GDPR Compliance Check (skip per auth endpoints) - non-blocking
    if (!config._skipGdprCheck && !config.url?.includes('/auth/') && !config.url?.includes('/login')) {
      // Esegui il controllo GDPR in modo non-blocking
      checkConsent('api_access', 'system').then(hasConsent => {
        if (!hasConsent) {
          logGdprAction(
            'system',
            'API_ACCESS_DENIED',
            'api',
            config.url || 'unknown',
            {
              url: config.url,
              method: safeMethodForLogging,
              reason: 'Missing consent for API access'
            }
          );
        }
      }).catch(error => {
        // Log errore ma continua (fallback graceful)
        console.warn('GDPR consent check failed, continuing:', error);
      });
    }

    // Check cache per richieste GET
    if (safeMethodForLogging.toLowerCase() === 'get' && !config._skipDeduplication) {
      const cached = responseCache.get(requestKey);
      if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
        console.log(`📦 Cache hit for ${config.url}`);

        // Log GDPR action per cache hit (non-blocking)
        logGdprAction(
           'system',
           'API_CACHE_HIT',
           'api',
           config.url || 'unknown',
           {
             url: config.url,
             cacheAge: Date.now() - cached.timestamp
           }
         );

        // Simula risposta cached
        const response = {
          data: cached.data,
          status: 200,
          statusText: 'OK (Cached)',
          headers: {},
          config: config,
          request: {}
        };

        recordApiCall(config.url || '', safeMethodForLogging, timer(), 200, { 
          cached: true, 
          deduplicated: false 
        });
        
        return Promise.resolve(response);
      }
    }

    // Deduplication per richieste identiche in corso
    if (!config._skipDeduplication && activeRequests.has(requestKey)) {
      console.log(`🔄 Deduplicating request: ${safeMethodForLogging} ${config.url}`);
      
      // Log GDPR action per deduplication (non-blocking)
      logGdprAction(
         'system',
         'API_REQUEST_DEDUPLICATED',
         'api',
         config.url || 'unknown',
         {
           url: config.url,
           method: safeMethodForLogging
         }
       );
      
      recordApiCall(config.url || '', safeMethodForLogging, timer(), 200, { 
        cached: false, 
        deduplicated: true 
      });
      
      return activeRequests.get(requestKey);
    }
    
    // Intercettore per limitare richieste parallele eccessive allo stesso endpoint
    const url = config.url || '';
    
    // Se abbiamo troppe richieste pendenti o abbiamo già una richiesta per questo URL, possiamo rifiutare
    if (pendingRequests.count > 5) {
      throw new Error('Troppe richieste simultanee');
    }
    
    if (pendingRequests.urls.has(url)) {
      console.warn(`Richiesta duplicata per ${url} - ottimizzando`);
    } else {
      pendingRequests.count++;
      pendingRequests.urls.add(url);
      
      // Aggiungiamo una proprietà al config per tracciare l'URL per il cleanup
      config._requestUrl = url;
    }
    
    // Interceptor per convertire i campi numerici prima dell'invio
    if (config.data && config.url && (
      config.url.includes('/courses') || 
      config.url.includes('/bulk-import')
    )) {
      // Tratta i dati come un record generico
      const originalData = config.data as Record<string, unknown> | Array<Record<string, unknown>>;
      
      // Funzione di conversione per un singolo oggetto corso - ottimizzata
      const convertCourseFields = (course: Record<string, unknown>): Record<string, unknown> => {
        const result = { ...course };
        
        // Ottimizzazione: converti tutti i campi numerici in un'unica iterazione
        const numericFields = {
          validityYears: true, // true = intero
          maxPeople: true,
          price: false, // false = float
          pricePerPerson: false
        };
        
        // Converti tutti i campi numerici in un loop
        Object.entries(numericFields).forEach(([field, isInteger]) => {
          if (result[field] !== undefined && result[field] !== null) {
            // Se è una stringa, pulisci e converti
            if (typeof result[field] === 'string') {
              const cleanValue = (result[field] as string).replace(/[^\d.]/g, '');
              if (cleanValue) {
                const numValue = Number(cleanValue);
                if (!isNaN(numValue)) {
                  result[field] = isInteger ? Math.floor(numValue) : Number(numValue.toFixed(2));
                } else {
                  result[field] = null;
                }
              } else {
                result[field] = null;
              }
            } 
            // Se non è già un numero, imposta null
            else if (typeof result[field] !== 'number') {
              result[field] = null;
            }
            // Se è già un numero, assicurati che sia del tipo corretto
            else if (isInteger && result[field] % 1 !== 0) {
              result[field] = Math.floor(result[field] as number);
            }
          }
        });
        
        // Assicurati che duration rimanga una stringa
        if (result.duration !== undefined && result.duration !== null) {
          result.duration = String(result.duration);
        }
        
        return result;
      };
      
      try {
        // Gestisci sia oggetti singoli che array
        if (Array.isArray(originalData)) {
          // È un array di oggetti (ad es. bulk import)
          const convertedData = originalData.map(convertCourseFields);
          config.data = convertedData;
        } else {
          // È un singolo oggetto
          const convertedData = convertCourseFields(originalData);
          config.data = convertedData;
        }
      } catch (error) {
        // Ignora errori e continua con i dati originali
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
apiClient.interceptors.response.use(
  (response) => {
    const config = response.config as ExtendedAxiosConfig;
    const timer = startTimer();
    
    // Cleanup del conteggio richieste
    if (config && config._requestUrl) {
      pendingRequests.count = Math.max(0, pendingRequests.count - 1);
      pendingRequests.urls.delete(config._requestUrl);
    }

    // Cleanup active requests
    if (config._cacheKey) {
      activeRequests.delete(config._cacheKey);
    }

    // Validazione JSON response - Skip per status code che non dovrebbero avere body
    const statusCodesWithoutBody = [204, 205, 304]; // No Content, Reset Content, Not Modified
    
    if (!statusCodesWithoutBody.includes(response.status)) {
      try {
        response.data = validateJsonResponse(response.data, config._requestUrl || 'unknown');
      } catch (jsonError) {
        console.error('JSON validation failed:', jsonError);
        
        // Log GDPR action per errore JSON (non-blocking)
        logGdprAction(
           'system',
           'API_JSON_VALIDATION_ERROR',
           'api',
           config._requestUrl || 'unknown',
           {
             url: config._requestUrl,
             status: response.status
           },
           false,
           jsonError instanceof Error ? jsonError.message : 'JSON validation failed'
         );
        
        recordApiCall(config._requestUrl || '', config.method || 'GET', timer(), response.status, {
          cached: false,
          deduplicated: false,
          error: 'JSON validation failed'
        });
        
        throw jsonError;
      }
    } else {
      // Per status code senza body, assicurati che response.data sia null o undefined
      console.log(`✅ Skipping JSON validation for status ${response.status} (No Content expected)`);
      response.data = null;
    }

    // Cache delle risposte GET successful
    if (config.method?.toLowerCase() === 'get' && response.status === 200 && config._cacheKey) {
      const ttl = getCacheTtl(config._requestUrl || '');
      responseCache.set(config._cacheKey, {
        data: response.data,
        timestamp: Date.now(),
        ttl
      });
      
      // Cleanup cache periodico (mantieni solo ultimi 100 entries)
      if (responseCache.size > 100) {
        const entries = Array.from(responseCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        entries.slice(0, 50).forEach(([key]) => responseCache.delete(key));
      }
    }

    // Log GDPR action per successful response (non-blocking)
    logGdprAction(
       'system',
       'API_RESPONSE_SUCCESS',
       'api',
       config._requestUrl || 'unknown',
       {
         url: config._requestUrl,
         method: config.method,
         status: response.status,
         cached: response.statusText?.includes('Cached') || false
       }
     );

    // Record metrics
    recordApiCall(config._requestUrl || '', config.method || 'GET', timer(), response.status, {
      cached: response.statusText?.includes('Cached') || false,
      deduplicated: false
    });
    
    return response;
  },
  (error) => {
    const config = error?.config as ExtendedAxiosConfig;
    const timer = startTimer();
    
    // Cleanup del conteggio richieste anche in caso di errore
    if (config && config._requestUrl) {
      pendingRequests.count = Math.max(0, pendingRequests.count - 1);
      pendingRequests.urls.delete(config._requestUrl);
    }

    // Cleanup active requests
    if (config?._cacheKey) {
      activeRequests.delete(config._cacheKey);
    }

    const errorMessage = error.message || 'Unknown API error';
    const status = error.response?.status || 0;

    // Log GDPR action per errore (non-blocking)
    logGdprAction(
       'system',
       'API_RESPONSE_ERROR',
       'api',
       config?._requestUrl || 'unknown',
       {
         url: config?._requestUrl,
         method: config?.method,
         status,
         errorType: error.constructor.name
       },
       false,
       errorMessage
     );

    // Record metrics per errore
    recordApiCall(config?._requestUrl || '', config?.method || 'GET', timer(), status, {
      cached: false,
      deduplicated: false,
      error: errorMessage
    });
    
    // Nessun retry automatico, riduciamo il debug
    if (process.env.NODE_ENV !== 'production' && error?.config?.url) {
      console.debug(`API Error [${error.config?.url}]: ${error.code || error.name || 'Unknown error'}`);
    }
    
    // Handle auth errors - be more selective to avoid unnecessary logouts
    if (error.response?.status === 401 || error.response?.status === 403) {
      const url = config?._requestUrl || error.config?.url || '';
      
      // CORREZIONE CRITICA: Non gestire errori 401 durante il login
      // Un 401 durante il login significa credenziali errate, non token scaduto
      const isLoginEndpoint = url.includes('/login');
      const isAuthVerifyEndpoint = url.includes('/auth/verify');
      const isPermissionEndpoint = url.includes('/advanced-permissions') || url.includes('/permissions');
      const isCriticalAuthError = error.response?.data?.code === 'AUTH_TOKEN_EXPIRED' || 
                                  error.response?.data?.code === 'AUTH_TOKEN_INVALID' ||
                                  error.response?.data?.code === 'AUTH_TOKEN_MISSING' ||
                                  error.response?.data?.code === 'AUTH_SESSION_INVALID';
      
      // Don't logout for login endpoint - 401 means wrong credentials, not expired token
      if (isLoginEndpoint) {
        console.warn('Login failed with 401 - wrong credentials, not logging out:', {
          url,
          status: error.response?.status,
          code: error.response?.data?.code,
          message: error.response?.data?.message
        });
      }
      // Don't logout for permission-related endpoints - these might fail due to insufficient permissions
      // but the user is still authenticated
      else if (isPermissionEndpoint && !isCriticalAuthError) {
        console.warn('Permission-related error, not logging out:', {
          url,
          status: error.response?.status,
          code: error.response?.data?.code,
          message: error.response?.data?.message
        });
      } 
      // Only logout for token verification endpoints or critical auth errors
      else if (isAuthVerifyEndpoint || isCriticalAuthError) {
        console.log('Critical authentication error, clearing token and redirecting to login', {
          url,
          status: error.response?.status,
          code: error.response?.data?.code
        });
        
        // Log GDPR action per redirect (non-blocking)
        logGdprAction(
           'system',
           'AUTH_ERROR_REDIRECT',
           'auth',
           url || 'unknown',
           {
             status,
             url,
             errorCode: error.response?.data?.code
           },
           false,
           'Authentication error redirect'
         );
        
        removeToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else {
        // Log the error but don't logout for non-critical auth errors
        console.warn('Non-critical auth error, not logging out:', {
          url,
          status: error.response?.status,
          code: error.response?.data?.code
        });
      }
    }
    
    return Promise.reject(error);
  }
);

// API utility functions with type assertions for safety
export const apiGet = async <T>(url: string, params = {}): Promise<T> => {
  // Usa il throttling per prevenire ERR_INSUFFICIENT_RESOURCES
  return throttledApiCall(url, async () => {
    try {
      // Configurazione speciale per endpoint di autenticazione per evitare cache browser
      const isAuthEndpoint = url.includes('/auth/');
      
      // SOLUZIONE DEFINITIVA: Usa direttamente apiClient.get() per evitare problemi interni di Axios
      const config: ExtendedAxiosConfig = {
        params: {
          ...params,
          // Cache-busting per endpoint auth
          ...(isAuthEndpoint && { _t: Date.now() })
        },
        timeout: 20000, // Timeout ridotto
        headers: {}
      };
      
      // Headers no-cache per endpoint di autenticazione
      if (isAuthEndpoint) {
        config.headers!['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        config.headers!['Pragma'] = 'no-cache';
        config.headers!['Expires'] = '0';
        console.log('🚫 [CACHE BYPASS] Adding no-cache headers for auth endpoint:', url);
      }
      
      // Aggiungi il flag personalizzato per l'interceptor
      (config as any)._isApiGetCall = true;
      
      // USA DIRETTAMENTE apiClient.get() invece di apiClient.request()
      // Questo evita problemi interni di Axios con il metodo HTTP
      const response = await apiClient.get(url, config);
      return response.data as T;
    } catch (error: unknown) {
      // Errore più descrittivo per ERR_INSUFFICIENT_RESOURCES
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_INSUFFICIENT_RESOURCES') {
        console.error('Browser resource limit reached - try again in a moment');
      }
      console.error('🚨 [API GET] Error details:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error && typeof error === 'object' && 'code' in error ? error.code : 'Unknown',
        config: error && typeof error === 'object' && 'config' in error ? error.config : 'Unknown'
      });
      throw error;
    }
  }, 2); // Priorità alta per le GET
};

// Funzione per garantire che i tipi dei campi numerici siano mantenuti
const preserveNumericTypes = (data: unknown): unknown => {
  // Se è null, undefined o non è un oggetto, restituisci il valore originale
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }
  
  // Se è un array, applica recursivamente la funzione a ogni elemento
  if (Array.isArray(data)) {
    return data.map(item => preserveNumericTypes(item));
  }
  
  // Clona l'oggetto per non modificare l'originale
  const result: Record<string, any> = { ...(data as Record<string, any>) };
  
  // Campi numerici di interesse
  const integerFields = ['validityYears', 'maxPeople'];
  const floatFields = ['price', 'pricePerPerson'];
  
  // Converti gli interi
  for (const field of integerFields) {
    if (result[field] !== undefined && result[field] !== null) {
      const value = result[field];
      // Se è già un numero, mantienilo tale
      // Se è una stringa, convertila in numero se possibile
      if (typeof value === 'string') {
        const parsedValue = parseInt(value, 10);
        if (!isNaN(parsedValue)) {
          result[field] = parsedValue;
        }
      }
    }
  }
  
  // Converti i float
  for (const field of floatFields) {
    if (result[field] !== undefined && result[field] !== null) {
      const value = result[field];
      // Se è già un numero, mantienilo tale
      // Se è una stringa, convertila in numero se possibile
      if (typeof value === 'string') {
        const parsedValue = parseFloat(value);
        if (!isNaN(parsedValue)) {
          result[field] = parsedValue;
        }
      }
    }
  }
  
  // Processa recursivamente eventuali oggetti annidati
  for (const key in result) {
    if (result[key] !== null && typeof result[key] === 'object') {
      result[key] = preserveNumericTypes(result[key]);
    }
  }
  
  return result;
};

// Funzione di POST API con preservazione di tipi numerici
export async function apiPost<T = unknown>(
  url: string,
  data?: unknown,
  config?: Record<string, unknown>,
  enablePreserveNumericTypes = true
): Promise<T> {
  // Usa il throttling per prevenire ERR_INSUFFICIENT_RESOURCES
  return throttledApiCall(url, async () => {
    // Se data è un oggetto e la preservazione dei tipi è abilitata, processa i dati
    let processedData = data;
    
    // Elaboriamo i dati solo se necessario per evitare de/serializzazioni eccessive
    if (enablePreserveNumericTypes && data && typeof data === 'object') {
      try {
        // Funzione semplificata per assicurare tipi corretti
        const ensureCorrectTypes = (obj: unknown): unknown => {
          // Se è un array, gestiamolo diversamente
          if (Array.isArray(obj)) {
            return obj.map(item => ensureCorrectTypes(item));
          }
          
          // Se non è un oggetto o è null, restituisci com'è
          if (!obj || typeof obj !== 'object') return obj;
          
          const result: Record<string, unknown> = {};
          
          // Copia tutte le proprietà, convertendo solo i tipi necessari
          for (const [key, value] of Object.entries(obj)) {
            if (value === undefined || value === null) {
              result[key] = null;
              continue;
            }
            
            // Gestisci specificamente i campi di numeri interi
            if ((key === 'validityYears' || key === 'maxPeople') && value !== undefined) {
              const numValue = Number(value);
              result[key] = !isNaN(numValue) ? Math.round(numValue) : null;
            }
            // Gestisci i campi di numeri decimali
            else if ((key === 'price' || key === 'pricePerPerson') && value !== undefined) {
              const numValue = Number(value);
              result[key] = !isNaN(numValue) ? numValue : null;
            }
            // Per altri oggetti, applica ricorsivamente
            else if (typeof value === 'object' && value !== null) {
              result[key] = ensureCorrectTypes(value);
            }
            // Altrimenti, copia il valore così com'è
            else {
              result[key] = value;
            }
          }
          
          return result;
        };
        
        processedData = ensureCorrectTypes(data);
      } catch (error: unknown) {
        // In caso di errore, continua con i dati originali
        processedData = data;
      }
    }
    
    try {
      // Determina il timeout in base al tipo di operazione
      const getTimeoutForUrl = (url: string): number => {
        // Timeout per autenticazione (10 secondi)
        if (url.includes('/auth/')) {
          return 10000; // 10 secondi per autenticazione
        }
        // Timeout esteso per generazione documenti (60 secondi)
        if (url.includes('/generate') || url.includes('/documents')) {
          return 60000;
        }
        // Timeout standard per altre operazioni (30 secondi)
        return 30000;
      };

      const timeoutValue = config?.timeout || getTimeoutForUrl(url);
      const withCredentialsValue = url.includes('/auth/'); // Abilita per auth endpoints
      
      // Debug log per le chiamate di autenticazione
      if (url.includes('/auth/')) {
        console.log('🔐 Auth API Call Debug:', {
          url,
          timeout: timeoutValue,
          withCredentials: withCredentialsValue,
          baseURL: API_BASE_URL
        });
      }
      
      const enhancedConfig: Record<string, unknown> = { 
        ...config,
        timeout: timeoutValue,
        // Abilita withCredentials per le chiamate di autenticazione
        withCredentials: withCredentialsValue,
        // Assicurati che il content-type sia corretto
        headers: {
          'Content-Type': 'application/json',
          ...(config?.headers || {})
        }
      };
      
      const response = await apiClient.post<T>(url, processedData, enhancedConfig);
      return response.data;
    } catch (error: unknown) {
      throw error;
    }
  }, 1); // Priorità media per le POST
}

export const apiPut = async <T>(url: string, data = {}): Promise<T> => {
  // Determina il timeout in base al tipo di operazione
  const getTimeoutForUrl = (url: string): number => {
    // Timeout ridotto per operazioni di autenticazione (10 secondi)
    if (url.includes('/auth/')) {
      return 10000;
    }
    // Timeout esteso per generazione documenti (60 secondi)
    if (url.includes('/generate') || url.includes('/documents')) {
      return 60000;
    }
    // Timeout standard per altre operazioni (30 secondi)
    return 30000;
  };

  try {
    const response = await apiClient.put(url, data, {
      timeout: getTimeoutForUrl(url),
      withCredentials: url.includes('/auth/') ? true : false
    });
    return response.data as T;
  } catch (error: unknown) {
    throw error;
  }
};

export const apiDelete = async <T>(url: string): Promise<T> => {
  try {
    // Determina il timeout in base al tipo di operazione
    const getTimeoutForUrl = (url: string): number => {
      // Timeout ridotto per operazioni di autenticazione (10 secondi)
      if (url.includes('/auth/')) {
        return 10000;
      }
      // Timeout esteso per generazione documenti (60 secondi)
      if (url.includes('/generate') || url.includes('/documents')) {
        return 60000;
      }
      // Timeout standard per altre operazioni (30 secondi)
      return 30000;
    };

    const timeoutValue = getTimeoutForUrl(url);
    const withCredentialsValue = url.includes('/auth/'); // Abilita per auth endpoints
    
    // Debug log per le chiamate di autenticazione
    if (url.includes('/auth/')) {
      console.log('🔐 Auth DELETE API Call Debug:', {
        url,
        timeout: timeoutValue,
        withCredentials: withCredentialsValue,
        baseURL: API_BASE_URL
      });
    }

    const response = await apiClient.delete(url, {
      timeout: timeoutValue,
      // Abilita withCredentials per le chiamate di autenticazione
      withCredentials: withCredentialsValue,
      // Assicurati che gli headers siano corretti
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data as T;
  } catch (error: unknown) {
    throw error;
  }
};

// For DELETE requests with payload
export const apiDeleteWithPayload = async <T>(url: string, data = {}): Promise<T> => {
  const config = {
    method: 'DELETE',
    url,
    data,
    timeout: 30000 // Timeout esteso anche per DELETE with payload
  };
  const response = await apiClient(config);
  return response.data as T;
};

// Funzione per upload di file con FormData
export const apiUpload = async <T>(url: string, formData: FormData, config?: Record<string, unknown>): Promise<T> => {
  try {
    const enhancedConfig: Record<string, unknown> = {
      ...config,
      timeout: 60000, // Timeout esteso per upload
      headers: {
        ...(config?.headers || {}),
        // Non impostare Content-Type per FormData, axios lo gestisce automaticamente
      }
    };
    
    const response = await apiClient.post<T>(url, formData, enhancedConfig);
    return response.data;
  } catch (error: unknown) {
    throw error;
  }
};

// API Service Object per compatibilità con import esistenti
export const apiService = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete,
  deleteWithPayload: apiDeleteWithPayload,
  upload: apiUpload,
  client: apiClient
};

export default apiClient;