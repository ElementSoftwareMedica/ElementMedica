import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { getToken } from './auth';

// Create axios instance with API_BASE_URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
    } catch (e) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Apply the same interceptors to directApiClient for absolute-URL calls
directApiClient.interceptors.request.use(
  (config: any) => {
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
    } catch (e) {}
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
      const errorMessage = error.response?.data?.message || error.message;
      console.error('API Error:', errorMessage);
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
  console.log(`Creating ${endpoint} with data:`, JSON.stringify(data).substring(0, 100) + '...');
  
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
  console.log(`Updating ${endpoint}/${id} with data:`, JSON.stringify(data).substring(0, 100) + '...');
  
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
  console.log(`Deleting ${endpoint}/${id}`);
  
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