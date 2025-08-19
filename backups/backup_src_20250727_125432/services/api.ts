import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getToken, removeToken } from './auth';
import { API_BASE_URL } from '../config/api';
import { checkConsent, logGdprAction, ConsentRequiredError } from '../utils/gdpr';
import { recordApiCall, startTimer } from '../utils/metrics';

// Estendi l'interfaccia AxiosRequestConfig per includere _requestUrl
interface ExtendedAxiosConfig extends AxiosRequestConfig {
  _requestUrl?: string;
  _skipGdprCheck?: boolean;
  _skipDeduplication?: boolean;
  _cacheKey?: string;
  _isApiGetCall?: boolean;
  method?: string; // Aggiungi esplicitamente la proprietà method
  url?: string; // Aggiungi esplicitamente la proprietà url
}

// Cache per le risposte API
interface CacheEntry {
  data: any;
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
const activeRequests = new Map<string, Promise<any>>();

// Utility per generare chiavi di cache
const getCacheKey = (method: string, url: string, data?: any): string => {
  // PROTEZIONE ULTRA-ROBUSTA per i metodi HTTP undefined/null/vuoti
  const safeMethod = (method && typeof method === 'string' && method.trim().length > 0 && /^[A-Za-z]+$/.test(method.trim())) ? method.trim().toUpperCase() : 'GET';
  
  const dataHash = data ? JSON.stringify(data) : '';
  return `${safeMethod}:${url}:${dataHash}`;
};

// Utility per validare JSON
const validateJsonResponse = (data: any, url: string): any => {
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
      console.log('🔧 [API INTERCEPTOR] Detected apiGet call - minimal processing');
      
      // Solo token e headers essenziali
      const token = getToken();
      if (token) {
        if (!config.headers) config.headers = {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Tenant ID per localhost
      if (config.baseURL?.includes('localhost') || window.location.hostname === 'localhost') {
        const tenantId = localStorage.getItem('tenantId') || 'default-company';
        if (!config.headers) config.headers = {};
        config.headers['X-Tenant-ID'] = tenantId;
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
    if (!config.headers['Content-Type'] && !config.headers['content-type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    const timer = startTimer();
    // Usa il metodo sicuro per getCacheKey
    const requestKey = getCacheKey(safeMethodForLogging, config.url || '', config.data);
    
    // Debug: Log della configurazione axios
    console.log('🔍 [AXIOS DEBUG] Request config:', {
      url: config.url,
      baseURL: config.baseURL,
      fullURL: config.baseURL + config.url,
      method: config.method,
      isApiGetCall: config._isApiGetCall,
      contentType: config.headers['Content-Type']
    });
    
    // Add auth token if available
    const token = getToken();
    console.log('🔑 [API INTERCEPTOR] Token from localStorage:', token);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 [API INTERCEPTOR] Authorization header set:', config.headers['Authorization']);
    } else {
      console.log('🚨 [API INTERCEPTOR] No token found in localStorage!');
    }
    
    // Add tenant ID header for localhost development
    // For localhost, we use the tenant ID from localStorage (saved during login)
    if (config.baseURL?.includes('localhost') || window.location.hostname === 'localhost') {
      const tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        config.headers['X-Tenant-ID'] = tenantId;
        console.log('🏢 [API INTERCEPTOR] X-Tenant-ID header set from localStorage:', tenantId);
      } else {
        // Fallback per compatibilità durante lo sviluppo
        config.headers['X-Tenant-ID'] = 'default-company';
        console.log('🏢 [API INTERCEPTOR] X-Tenant-ID header set to fallback: default-company');
      }
    }
    
    // Traccia l'URL della richiesta per il logging
    config._requestUrl = config.url;
    config._cacheKey = requestKey;

    // GDPR Compliance Check (skip per auth endpoints) - non-blocking
    if (!config._skipGdprCheck && !config.url?.includes('/auth/') && !config.url?.includes('/login')) {
      // Esegui il controllo GDPR in modo non-blocking
      checkConsent('api_access').then(hasConsent => {
        if (!hasConsent) {
          logGdprAction({
            action: 'API_ACCESS_DENIED',
            timestamp: new Date().toISOString(),
            metadata: {
              url: config.url,
              method: safeMethodForLogging,
              reason: 'Missing consent for API access'
            }
          }).catch(err => console.warn('Failed to log GDPR action:', err));
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
        logGdprAction({
          action: 'API_CACHE_HIT',
          timestamp: new Date().toISOString(),
          metadata: {
            url: config.url,
            cacheAge: Date.now() - cached.timestamp
          }
        }).catch(err => console.warn('Failed to log GDPR action:', err));
        
        // Simula risposta cached
        const response: AxiosResponse = {
          data: cached.data,
          status: 200,
          statusText: 'OK (Cached)',
          headers: {},
          config: config as AxiosRequestConfig,
          request: {}
        };
        
        recordApiCall(config.url || '', safeMethodForLogging, timer(), 200, { 
          cached: true, 
          deduplicated: false 
        });
        
        return Promise.resolve(response) as any;
      }
    }

    // Deduplication per richieste identiche in corso
    if (!config._skipDeduplication && activeRequests.has(requestKey)) {
      console.log(`🔄 Deduplicating request: ${safeMethodForLogging} ${config.url}`);
      
      // Log GDPR action per deduplication (non-blocking)
      logGdprAction({
        action: 'API_REQUEST_DEDUPLICATED',
        timestamp: new Date().toISOString(),
        metadata: {
          url: config.url,
          method: safeMethodForLogging
        }
      }).catch(err => console.warn('Failed to log GDPR action:', err));
      
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
      const originalData = config.data as Record<string, any> | Array<Record<string, any>>;
      
      // Funzione di conversione per un singolo oggetto corso - ottimizzata
      const convertCourseFields = (course: Record<string, any>): Record<string, any> => {
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

    // Validazione JSON response
    try {
      response.data = validateJsonResponse(response.data, config._requestUrl || 'unknown');
    } catch (jsonError) {
      console.error('JSON validation failed:', jsonError);
      
      // Log GDPR action per errore JSON (non-blocking)
      logGdprAction({
        action: 'API_JSON_VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
        error: jsonError instanceof Error ? jsonError.message : 'JSON validation failed',
        metadata: {
          url: config._requestUrl,
          status: response.status
        }
      }).catch(err => console.warn('Failed to log GDPR action:', err));
      
      recordApiCall(config._requestUrl || '', config.method || 'GET', timer(), response.status, {
        cached: false,
        deduplicated: false,
        error: 'JSON validation failed'
      });
      
      throw jsonError;
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
    logGdprAction({
      action: 'API_RESPONSE_SUCCESS',
      timestamp: new Date().toISOString(),
      metadata: {
        url: config._requestUrl,
        method: config.method,
        status: response.status,
        cached: response.statusText?.includes('Cached') || false
      }
    }).catch(err => console.warn('Failed to log GDPR action:', err));

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
    logGdprAction({
      action: 'API_RESPONSE_ERROR',
      timestamp: new Date().toISOString(),
      error: errorMessage,
      metadata: {
        url: config?._requestUrl,
        method: config?.method,
        status,
        errorType: error.constructor.name
      }
    }).catch(err => console.warn('Failed to log GDPR action:', err));

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
      
      // Only logout for actual authentication endpoints or critical auth failures
      // Avoid logout for 404 errors or non-critical endpoints
      const isAuthEndpoint = url.includes('/auth/') || url.includes('/login') || url.includes('/verify');
      const isCriticalAuthError = error.response?.data?.code === 'AUTH_TOKEN_EXPIRED' || 
                                  error.response?.data?.code === 'AUTH_TOKEN_INVALID' ||
                                  error.response?.data?.code === 'AUTH_TOKEN_MISSING';
      
      if (isAuthEndpoint || isCriticalAuthError) {
        console.log('Critical authentication error, clearing token and redirecting to login', {
          url,
          status: error.response?.status,
          code: error.response?.data?.code
        });
        
        // Log GDPR action per redirect (non-blocking)
        logGdprAction({
          action: 'AUTH_ERROR_REDIRECT',
          timestamp: new Date().toISOString(),
          metadata: {
            status,
            url,
            errorCode: error.response?.data?.code
          }
        }).catch(err => console.warn('Failed to log GDPR action:', err));
        
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
  try {
    // Configurazione speciale per endpoint di autenticazione per evitare cache browser
    const isAuthEndpoint = url.includes('/auth/');
    
    // SOLUZIONE DEFINITIVA: Usa direttamente apiClient.get() per evitare problemi interni di Axios
    const config: AxiosRequestConfig = {
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
    
    console.log('🔧 [API GET] Using apiClient.get() with config:', {
      url,
      hasParams: !!config.params,
      hasHeaders: !!config.headers,
      timeout: config.timeout,
      _isApiGetCall: (config as any)._isApiGetCall
    });
    
    // USA DIRETTAMENTE apiClient.get() invece di apiClient.request()
    // Questo evita problemi interni di Axios con il metodo HTTP
    const response = await apiClient.get(url, config);
    return response.data as T;
  } catch (error: any) {
    // Errore più descrittivo per ERR_INSUFFICIENT_RESOURCES
    if (error?.code === 'ERR_INSUFFICIENT_RESOURCES') {
      console.error('Browser resource limit reached - try again in a moment');
    }
    console.error('🚨 [API GET] Error details:', {
      url,
      error: error.message,
      code: error.code,
      config: error.config
    });
    throw error;
  }
};

// Funzione per garantire che i tipi dei campi numerici siano mantenuti
const preserveNumericTypes = (data: any): any => {
  // Se è null, undefined o non è un oggetto, restituisci il valore originale
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }
  
  // Se è un array, applica recursivamente la funzione a ogni elemento
  if (Array.isArray(data)) {
    return data.map(item => preserveNumericTypes(item));
  }
  
  // Clona l'oggetto per non modificare l'originale
  const result = { ...data };
  
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
export async function apiPost<T = any>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  enablePreserveNumericTypes = true
): Promise<T> {
  // Se data è un oggetto e la preservazione dei tipi è abilitata, processa i dati
  let processedData = data;
  
  // Elaboriamo i dati solo se necessario per evitare de/serializzazioni eccessive
  if (enablePreserveNumericTypes && data && typeof data === 'object') {
    try {
      // Funzione semplificata per assicurare tipi corretti
      const ensureCorrectTypes = (obj: any): any => {
        // Se è un array, gestiamolo diversamente
        if (Array.isArray(obj)) {
          return obj.map(item => ensureCorrectTypes(item));
        }
        
        // Se non è un oggetto o è null, restituisci com'è
        if (!obj || typeof obj !== 'object') return obj;
        
        const result: Record<string, any> = {};
        
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
    } catch (error: any) {
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
    
    const enhancedConfig: AxiosRequestConfig = { 
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
  } catch (error: any) {
    throw error;
  }
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
  } catch (error: any) {
    throw error;
  }
};

export const apiDelete = async <T>(url: string): Promise<T> => {
  try {
    const response = await apiClient.delete(url, {
      timeout: 30000 // Timeout esteso anche per DELETE
    });
    return response.data as T;
  } catch (error: any) {
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
export const apiUpload = async <T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> => {
  try {
    const enhancedConfig: AxiosRequestConfig = {
      ...config,
      timeout: 60000, // Timeout esteso per upload
      headers: {
        ...(config?.headers || {}),
        // Non impostare Content-Type per FormData, axios lo gestisce automaticamente
      }
    };
    
    const response = await apiClient.post<T>(url, formData, enhancedConfig);
    return response.data;
  } catch (error: any) {
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