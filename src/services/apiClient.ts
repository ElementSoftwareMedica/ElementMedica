import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { getToken } from './auth';

// Create axios instance with API_BASE_URL
// CRITICAL FIX: baseURL must be empty string because service URLs already include full path
// Services use URLs like '/api/v1/cms/pages/slug/...' which already contain the /api prefix
// If we set baseURL to '/api', we get /api/api/v1/... (double prefix)
const apiClient = axios.create({
  baseURL: '', // Empty string - URLs are already complete with /api/v1/... from services
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for authentication
});

// Create a direct axios client for use with backend servers
const directApiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for authentication
});

// Interceptors to attach Authorization and X-Tenant-ID headers
apiClient.interceptors.request.use(
  (config: any) => {
    // CRITICAL FIX: Validate HTTP method FIRST for ALL requests
    // This must happen before any early returns to prevent 'toUpperCase' errors
    try {
      if (!config.method || typeof config.method !== 'string' || config.method.trim() === '') {
        config.method = 'GET';
        console.warn('🔧 [apiClient] Method was invalid, forcing to GET');
      } else {
        // Extra safety: verify it's still a string before calling toUpperCase
        const methodValue = config.method;
        config.method = (methodValue && typeof methodValue === 'string')
          ? methodValue.toUpperCase()
          : 'GET';
      }
    } catch (methodError) {
      console.error('🔧 [apiClient] Error processing method, defaulting to GET:', methodError);
      config.method = 'GET';
    }

    // Ensure headers object exists
    if (!config.headers || typeof config.headers !== 'object') {
      config.headers = {};
    }

    // Auth token
    const token = getToken();
    if (token) {
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }
    // Imposta X-Tenant-ID solo se presente
    try {
      const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;
      if (tenantId) {
        (config.headers as any)['X-Tenant-ID'] = tenantId;
      }
    } catch (e) { }

    // CRITICAL: Add X-Frontend-Id header for brand detection
    // The backend uses this to filter CMS content by brand (element-medica or element-sicurezza)
    const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';
    (config.headers as any)['X-Frontend-Id'] = brandId;

    return config;
  },
  (error) => Promise.reject(error)
);

// Apply the same interceptors to directApiClient for absolute-URL calls
directApiClient.interceptors.request.use(
  (config: any) => {
    // CRITICAL FIX: Validate HTTP method FIRST for ALL requests
    try {
      if (!config.method || typeof config.method !== 'string' || config.method.trim() === '') {
        config.method = 'GET';
      } else {
        const methodValue = config.method;
        config.method = (methodValue && typeof methodValue === 'string')
          ? methodValue.toUpperCase()
          : 'GET';
      }
    } catch (methodError) {
      config.method = 'GET';
    }

    if (!config.headers || typeof config.headers !== 'object') {
      config.headers = {};
    }

    const token = getToken();
    if (token) {
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }
    // Imposta X-Tenant-ID solo se presente
    try {
      const tenantId = typeof localStorage !== 'undefined' ? localStorage.getItem('tenantId') : null;
      if (tenantId) {
        (config.headers as any)['X-Tenant-ID'] = tenantId;
      }
    } catch (e) { }

    // CRITICAL: Add X-Frontend-Id header for brand detection
    const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';
    (config.headers as any)['X-Frontend-Id'] = brandId;

    return config;
  },
  (error) => Promise.reject(error)
);

// Funzione per aggiungere intercettori (per gestione token, errori, ecc.)
export function setupInterceptors(
  onRequest?: (config: any) => any,
  onResponse?: (response: any) => any,
  onError?: (error: any) => any
) {
  // Intercettore per le richieste
  apiClient.interceptors.request.use(
    (config) => (onRequest ? onRequest(config) : config),
    (error) => Promise.reject(error)
  );

  // Intercettore per le risposte
  apiClient.interceptors.response.use(
    (response) => (onResponse ? onResponse(response) : response),
    (error) => {
      if (onError) {
        return onError(error);
      }

      // Gestione predefinita degli errori
      // Non loggare errori 404/403 per endpoint GDPR (sono gestiti silenziosamente nei hooks)
      const status = error.response?.status;
      const url = error.config?.url || '';
      const isGdprEndpoint = url.includes('/gdpr/') || url.includes('/privacy-settings');

      if (isGdprEndpoint && (status === 404 || status === 403)) {
        // GDPR endpoints: 404/403 sono attesi e gestiti silenziosamente dai hooks
        return Promise.reject(error);
      }

      const errorMessage = 'Errore nella richiesta API';
      console.error('API Error:', error.response?.status, error.config?.url);
      return Promise.reject(error);
    }
  );
}

// API generiche
export async function getAll<T>(endpoint: string, config?: any): Promise<T[]> {
  const response = await apiClient.get<T[]>(endpoint, config);
  return response.data;
}

export async function getOne<T>(endpoint: string, id: string | number, config?: any): Promise<T> {
  const response = await apiClient.get<T>(`${endpoint}/${id}`, config);
  return response.data;
}

export async function create<T, D = Partial<T>>(endpoint: string, data: D, config?: any): Promise<T> {

  // Standardizzazione endpoint schedules su API v1 tramite proxy
  if (endpoint === 'schedules') {
    const url = '/api/v1/schedules';
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  }

  // Normal handling for other endpoints
  const response = await apiClient.post<T>(endpoint, data, config);
  return response.data;
}

export async function update<T, D = Partial<T>>(
  endpoint: string,
  id: string | number,
  data: D,
  config?: any
): Promise<T> {
  // Standardizzazione endpoint schedules su API v1 tramite proxy
  if (endpoint === 'schedules') {
    const url = `/api/v1/schedules/${id}`;
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  }

  // Normal handling for other endpoints
  const response = await apiClient.put<T>(`${endpoint}/${id}`, data, config);
  return response.data;
}

export async function remove(endpoint: string, id: string | number, config?: any): Promise<void> {
  // Standardizzazione endpoint schedules su API v1 tramite proxy
  if (endpoint === 'schedules') {
    const url = `/api/v1/schedules/${id}`;
    await apiClient.delete(url, config);
    return;
  }

  // Normal handling for other endpoints
  await apiClient.delete(`${endpoint}/${id}`, config);
}

// Esporta il client per utilizzi specifici
export default apiClient;