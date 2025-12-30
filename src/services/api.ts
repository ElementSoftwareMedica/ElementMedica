import axios from 'axios';
import { getToken, removeToken, getRefreshToken, removeRefreshToken, refreshAccess } from './auth';

// Coordinamento refresh token
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
const refreshSubscribers: Array<(token: string | null) => void> = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};
const onRefreshed = (token: string | null) => {
  while (refreshSubscribers.length) {
    const cb = refreshSubscribers.shift();
    try {
      cb && cb(token);
    } catch { }
  }
};
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
  _retry?: boolean;
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
// CRITICAL FIX: baseURL must be empty string because service URLs already include full path
// Services use URLs like '/api/v1/auth/verify' which already contain the /api prefix
// If we set baseURL to '/api', we get /api/api/v1/... (double prefix)
const apiClient = axios.create({
  baseURL: '', // Empty string - URLs are already complete with /api/v1/... from services
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
    // CRITICAL FIX: Validate HTTP method FIRST for ALL requests
    // This must happen before any early returns to prevent 'toUpperCase' errors
    // Use a try-catch as ultimate safety net
    try {
      if (!config.method || typeof config.method !== 'string' || config.method.trim() === '') {
        config.method = 'GET';
        console.warn('🔧 [API INTERCEPTOR] Method was invalid, forcing to GET');
      } else {
        // Extra safety: verify it's still a string before calling toUpperCase
        const methodValue = config.method;
        config.method = (methodValue && typeof methodValue === 'string')
          ? methodValue.toUpperCase()
          : 'GET';
      }
    } catch (methodError) {
      console.error('🔧 [API INTERCEPTOR] Error processing method, defaulting to GET:', methodError);
      config.method = 'GET';
    }

    // MULTI-BRAND: Inject X-Frontend-Id header for ALL requests
    const brandId = import.meta.env.VITE_BRAND_ID || 'element-formazione';
    if (!config.headers) config.headers = {};
    (config.headers as Record<string, any>)['X-Frontend-Id'] = brandId;

    // NOTE: Legacy URL rewriting removed - all services now use /api/v1/ directly
    // See: Project 46 E2E optimization (2025-01-14)

    // SOLUZIONE ULTRA-SEMPLIFICATA: Per chiamate apiGet, fai il minimo indispensabile
    if (config._isApiGetCall) {
      // Per apiGet, fai solo le operazioni essenziali senza toccare nulla di Axios

      // Solo token e headers essenziali
      const token = getToken();
      const isAuthRefresh = config.url?.includes('/auth/refresh');
      const isAuthLogin = config.url?.includes('/auth/login');

      if (token && !isAuthRefresh && !isAuthLogin) {
        if (!config.headers) config.headers = {};
        (config.headers as Record<string, any>)['Authorization'] = `Bearer ${token}`;
      } else if (!token && config.url?.includes('/auth/verify')) {
        // Expected for public users - no warning needed
        if (process.env.NODE_ENV === 'development') {
          console.debug('🔍 Auth verify without token (public user)');
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

      // Prefisso /api per URL relativi (se non già presente)
      if (
        typeof config.url === 'string' &&
        !config.url.startsWith('/api') &&
        !/^https?:\/\//i.test(config.url)
      ) {
        config.url = `/api${config.url}`;
      }

      // Fallback baseURL
      if (
        !config.baseURL &&
        typeof config.url === 'string' &&
        !/^https?:\/\//i.test(config.url) &&
        !config.url.startsWith('/api')
      ) {
        config.baseURL = API_BASE_URL;
      }

      return config; // RITORNA SUBITO per apiGet
    }

    // Per tutte le altre chiamate (non apiGet), gestisci normalmente
    // Method is already validated and uppercased at the start of the interceptor
    const safeMethodForLogging = config.method; // Already guaranteed to be uppercase string

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

    // NOTE: Legacy URL rewriting removed - all services now use /api/v1/ directly
    // See: Project 46 E2E optimization (2025-01-14)
    // Removed legacy rewriting for: /trainers, /companies, /schedules, /courses

    // Normalizzazione URL: se comincia con '/' ma non con '/api', prefissa '/api'
    if (
      typeof config.url === 'string' &&
      config.url.startsWith('/') &&
      !config.url.startsWith('/api') &&
      !/^https?:\/\//i.test(config.url)
    ) {
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
    const isAuthUrl = config.url?.includes('/auth/');
    if (token && !isAuthUrl) {
      (config.headers as Record<string, any>)['Authorization'] = `Bearer ${token}`;
      // Debug per getCurrentTenant
      if (config.url?.includes('/tenants/current')) {
        console.log('🔐 Adding token to /tenants/current request:', {
          hasToken: !!token,
          // tokenStart rimosso per evitare esposizione di parti del token
          url: config.url,
          fullURL: (config.baseURL || '') + (config.url || ''),
          timestamp: new Date().toISOString()
        });
      }
    } else if (!token && config.url?.includes('/tenants/current')) {
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
        if (!config._skipGdprCheck) {
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
        }

        // CRITICAL FIX: Create a completely clean config object for cached response
        // This prevents method corruption issues when axios processes the cached response
        const cleanConfig = {
          url: config.url || '',
          method: 'get', // Lowercase 'get' is the correct format for axios
          baseURL: config.baseURL || '',
          headers: {
            ...(config.headers || {}),
            'X-Cached-Response': 'true'
          },
          params: config.params,
          timeout: config.timeout || 30000,
          _cached: true,
          _skipDeduplication: true, // Don't process cached responses again
          _skipGdprCheck: true
        };

        // Return a properly formatted axios response object
        const response = {
          data: cached.data,
          status: 200,
          statusText: 'OK (Cached)',
          headers: {
            'content-type': 'application/json',
            'cache-control': 'private, max-age=0',
            'x-cache': 'HIT'
          },
          config: cleanConfig,
          request: {},
          // Ensure axios recognizes this as a valid response
          [Symbol.toStringTag]: 'AxiosResponse'
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
      if (!config._skipGdprCheck) {
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
      }

      recordApiCall(config.url || '', safeMethodForLogging, timer(), 200, {
        cached: false,
        deduplicated: true
      });

      return activeRequests.get(requestKey);
    }

    // Intercettore per limitare richieste parallele eccessive allo stesso endpoint
    const url = config.url || '';

    // Limite aumentato per permettere batch operations (es. generazione attestati multipli)
    if (pendingRequests.count > 20) {
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

    // Cleanup pendingRequests tracking (anche nel success handler!)
    if (config && config._requestUrl) {
      pendingRequests.count = Math.max(0, pendingRequests.count - 1);
      pendingRequests.urls.delete(config._requestUrl);
    }

    // Validazione JSON response - Skip per status code che non dovrebbero avere body
    const statusCodesWithoutBody = [204, 205, 304]; // No Content, Reset Content, Not Modified

    if (!statusCodesWithoutBody.includes(response.status)) {
      try {
        response.data = validateJsonResponse(response.data, config._requestUrl || 'unknown');
      } catch (jsonError) {
        console.error('JSON validation failed:', jsonError);

        // Log GDPR action per errore JSON (non-blocking)
        if (!config?._skipGdprCheck) {
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
        }

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
    if (!config?._skipGdprCheck) {
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
    }

    // Invalida automaticamente la cache correlata per operazioni di scrittura (POST/PATCH/PUT/DELETE)
    const method = config.method?.toLowerCase();
    if (method && ['post', 'patch', 'put', 'delete'].includes(method)) {
      const url = config._requestUrl || '';
      // Estrai il base path dell'endpoint (es: /api/v1/cms/media/upload -> /cms/media)
      const urlMatch = url.match(/\/api\/v\d+(\/.+?)(?:\/[^/]+)?$/);
      if (urlMatch && urlMatch[1]) {
        // Invalida cache per il base path
        const basePath = urlMatch[1].replace(/\/upload$|\/\d+$|\/[a-f0-9-]{36}$/i, '');
        if (basePath) {
          // Cerca e invalida tutte le cache che contengono questo path
          responseCache.forEach((_, key) => {
            if (key.includes(basePath)) {
              responseCache.delete(key);
              console.log(`🗑️ Auto-invalidated cache for: ${key} (due to ${method?.toUpperCase() || 'UNKNOWN'} ${url})`);
            }
          });
        }
      }
    }

    // Record metrics
    recordApiCall(config._requestUrl || '', config.method || 'GET', timer(), response.status, {
      cached: response.statusText?.includes('Cached') || false,
      deduplicated: false
    });

    return response;
  },
  async (error) => {
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

    // Skip GDPR logging for common non-critical errors:
    // - 403: Permission denied (normal for restricted resources)
    // - 404: Not found (normal during navigation)
    // - Network errors without status (connectivity issues)
    const skipGdprForStatus = [403, 404].includes(status) || status === 0;

    // Log GDPR action per errore (non-blocking) - skip for non-critical errors
    if (!config?._skipGdprCheck && !skipGdprForStatus) {
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
    }

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

    // Evita side effects su auth per errori generici
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

      // Propaga _skipGdprCheck a livello config e rimuovilo dalla querystring
      const skipGdpr = (params as any)?._skipGdprCheck === true;
      if (skipGdpr) {
        (config as any)._skipGdprCheck = true;
        if (config.params && typeof config.params === 'object') {
          const { _skipGdprCheck, ...rest } = config.params as any;
          config.params = rest;
        }
      }

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
      if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'ERR_INSUFFICIENT_RESOURCES') {
        console.error('Browser resource limit reached - try again in a moment');
      }
      // Non loggare dettagli se la chiamata ha _skipGdprCheck
      const cfg = (error && typeof error === 'object' && 'config' in error) ? (error as any).config as ExtendedAxiosConfig : undefined;
      if (!cfg?._skipGdprCheck) {
        console.error('🚨 [API GET] Error details:', {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
          code: error && typeof error === 'object' && 'code' in error ? (error as any).code : 'Unknown',
          config: error && typeof error === 'object' && 'config' in error ? (error as any).config : 'Unknown'
        });
      }
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
        // Abilita withCredentials per inviare i cookie di sessione
        withCredentials: true,
        // Assicurati che il content-type sia corretto
        headers: {
          'Content-Type': 'application/json',
          ...(config?.headers || {})
        }
      };

      const response = await apiClient.post<T>(url, processedData, enhancedConfig);
      return response.data;
    } catch (error: unknown) {
      // Trasforma gli errori axios in errori più informativi
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        const responseData = axiosError.response?.data;
        const status = axiosError.response?.status;

        // Crea un errore più informativo con il messaggio del backend
        const backendMessage = responseData?.error || responseData?.message || responseData?.details;
        if (backendMessage) {
          const enhancedError = new Error(backendMessage) as any;
          enhancedError.response = axiosError.response;
          enhancedError.status = status;
          enhancedError.originalError = error;
          throw enhancedError;
        }
      }
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
      withCredentials: true
    });
    return response.data as T;
  } catch (error: unknown) {
    // Trasforma gli errori axios in errori più informativi
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      const responseData = axiosError.response?.data;
      const status = axiosError.response?.status;

      // Crea un errore più informativo con il messaggio del backend
      const backendMessage = responseData?.error || responseData?.message || responseData?.details;
      if (backendMessage) {
        const enhancedError = new Error(backendMessage) as any;
        enhancedError.response = axiosError.response;
        enhancedError.status = status;
        enhancedError.originalError = error;
        throw enhancedError;
      }
    }
    throw error;
  }
};

export const apiPatch = async <T>(url: string, data = {}): Promise<T> => {
  const getTimeoutForUrl = (url: string): number => {
    if (url.includes('/auth/')) return 10000;
    return 30000;
  };

  try {
    const response = await apiClient.patch(url, data, {
      timeout: getTimeoutForUrl(url),
      withCredentials: true
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

/**
 * Interfaccia per il risultato del download con filename
 */
export interface DownloadResult {
  blob: Blob;
  filename: string | null;
}

/**
 * Funzione per download di file binari (PDF, immagini, etc.)
 * Bypassa la validazione JSON e usa responseType: 'blob'
 * 
 * @param url - URL dell'endpoint da chiamare
 * @returns Blob del file scaricato
 */
export const apiDownload = async (url: string): Promise<Blob> => {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
      timeout: 60000, // Timeout esteso per download
      headers: {
        'Accept': 'application/pdf, application/octet-stream, */*'
      }
    });
    return response.data as Blob;
  } catch (error: unknown) {
    console.error('🚨 [API DOWNLOAD] Error:', error);
    throw error;
  }
};

/**
 * Funzione per download di file binari con estrazione del filename dall'header
 * Ritorna sia il blob che il filename dalla risposta del server
 * 
 * @param url - URL dell'endpoint da chiamare
 * @returns DownloadResult con blob e filename
 */
export const apiDownloadWithFilename = async (url: string): Promise<DownloadResult> => {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
      timeout: 60000, // Timeout esteso per download
      headers: {
        'Accept': 'application/pdf, application/octet-stream, */*'
      }
    });

    // Estrai filename dall'header Content-Disposition
    let filename: string | null = null;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      // Pattern: attachment; filename="nome-file.pdf"
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    return {
      blob: response.data as Blob,
      filename
    };
  } catch (error: unknown) {
    console.error('🚨 [API DOWNLOAD WITH FILENAME] Error:', error);
    throw error;
  }
};

/**
 * Invalida la cache per un pattern di URL specifico
 * @param urlPattern - Pattern dell'URL da invalidare (es: '/api/v1/attestati')
 */
export const invalidateCache = (urlPattern: string): void => {
  const keysToDelete: string[] = [];

  // Cerca tutte le chiavi che matchano il pattern
  responseCache.forEach((_, key) => {
    if (key.includes(urlPattern)) {
      keysToDelete.push(key);
    }
  });

  // Elimina le chiavi trovate
  keysToDelete.forEach(key => {
    responseCache.delete(key);
    console.log(`🗑️ Cache invalidated for: ${key}`);
  });

  if (keysToDelete.length > 0) {
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for pattern: ${urlPattern}`);
  }
};

/**
 * Cancella completamente la cache
 */
export const clearCache = (): void => {
  const size = responseCache.size;
  responseCache.clear();
  console.log(`🗑️ Cleared entire cache (${size} entries)`);
};

// API Service Object per compatibilità con import esistenti
export const apiService = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  patch: apiPatch,
  delete: apiDelete,
  deleteWithPayload: apiDeleteWithPayload,
  upload: apiUpload,
  client: apiClient,
  invalidateCache,
  clearCache
};

export default apiClient;


async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  // Pre-check opzionale sul refresh token (auth.refreshAccess lo gestisce già, ma evitiamo call inutili)
  const currentRefresh = getRefreshToken();
  if (!currentRefresh) {
    isRefreshing = false;
    return null;
  }

  const doRefresh = async (): Promise<string | null> => {
    try {
      // Centralizza su auth.refreshAccess che gestisce fetch e salvataggio token
      const newToken = await refreshAccess();
      return newToken;
    } catch (e) {
      // Log minimale, senza dettagli sensibili
      console.error('Error refreshing access token via auth.refreshAccess');
      return null;
    } finally {
      isRefreshing = false;
    }
  };

  refreshPromise = doRefresh().then((token) => {
    onRefreshed(token);
    refreshPromise = null;
    return token;
  });

  return refreshPromise;
}

// Patch intercettore response: cerca il blocco 401 e aggiunge refresh