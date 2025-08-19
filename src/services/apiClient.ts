import axios from 'axios';
import { API_BASE_URL } from '../config/api';

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
  
  // Special handling for schedules endpoint which is inconsistent across servers
  if (endpoint === 'schedules') {
    // Try possible endpoints in order until one works
    const possibleEndpoints = [
      '/schedules',                       // Direct endpoint via Vite proxy
      'http://localhost:4003/schedules',  // Fixed server direct 
      '/api/schedules',                   // With API prefix via Vite proxy
      'http://localhost:4003/api/schedules', // Fixed server with API prefix
      'http://127.0.0.1:4003/schedules',  // Alternative localhost notation
    ];
    
    let lastError = null;
    const allErrors = [];
    
    // Try each endpoint until one works
    for (const url of possibleEndpoints) {
      try {
        console.log(`[DEBUG] Trying endpoint: ${url} with payload:`, JSON.stringify(data));
        const response = await axios.post<T>(url, data, config);
        console.log(`Success with endpoint: ${url}`);
        return response.data;
      } catch (err: any) {
        // More detailed error logging
        console.warn(`Failed with endpoint: ${url}`);
        console.error('Error details:', {
          message: err.message,
          response: err.response ? {
            status: err.response.status,
            data: err.response.data,
            headers: err.response.headers
          } : 'No response object',
          request: err.request ? 'Request object exists' : 'No request object'
        });
        lastError = err;
        allErrors.push({url, error: err.message, status: err.response?.status, data: err.response?.data});
      }
    }
    
    // If all endpoints failed, throw the last error with more context
    console.error('All schedule creation endpoints failed', JSON.stringify(allErrors));
    throw lastError;
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
  
  // Special handling for schedules endpoint which is inconsistent across servers
  if (endpoint === 'schedules') {
    // Try possible endpoints in order until one works
    const possibleEndpoints = [
      `/schedules/${id}`,                       // Direct endpoint via Vite proxy
      `http://localhost:4003/schedules/${id}`,  // Fixed server direct 
      `/api/schedules/${id}`,                   // With API prefix via Vite proxy
      `http://localhost:4003/api/schedules/${id}`, // Fixed server with API prefix
      `http://127.0.0.1:4003/schedules/${id}`,  // Alternative localhost notation
    ];
    
    let lastError = null;
    
    // Try each endpoint until one works
    for (const url of possibleEndpoints) {
      try {
        console.log(`Trying endpoint: ${url}...`);
        const response = await axios.put<T>(url, data, config);
        console.log(`Success with endpoint: ${url}`);
        return response.data;
      } catch (err) {
        console.warn(`Failed with endpoint: ${url}`, err);
        lastError = err;
      }
    }
    
    // If all endpoints failed, throw the last error
    console.error('All schedule update endpoints failed');
    throw lastError;
  }
  
  // Normal handling for other endpoints
  const response = await apiClient.put<T>(`${endpoint}/${id}`, data, config);
  return response.data;
}

export async function remove(endpoint: string, id: string | number, config?: any): Promise<void> {
  console.log(`Deleting ${endpoint}/${id}`);
  
  // Special handling for schedules endpoint which is inconsistent across servers
  if (endpoint === 'schedules') {
    // Try possible endpoints in order until one works
    const possibleEndpoints = [
      `/schedules/${id}`,                       // Direct endpoint via Vite proxy
      `http://localhost:4003/schedules/${id}`,  // Fixed server direct 
      `/api/schedules/${id}`,                   // With API prefix via Vite proxy
      `http://localhost:4003/api/schedules/${id}`, // Fixed server with API prefix
      `http://127.0.0.1:4003/schedules/${id}`,  // Alternative localhost notation
    ];
    
    let lastError = null;
    
    // Try each endpoint until one works
    for (const url of possibleEndpoints) {
      try {
        console.log(`Trying to delete from endpoint: ${url}...`);
        await axios.delete(url, config);
        console.log(`Successfully deleted from endpoint: ${url}`);
        return;
      } catch (err) {
        console.warn(`Failed to delete from endpoint: ${url}`, err);
        lastError = err;
      }
    }
    
    // If all endpoints failed, throw the last error
    console.error('All schedule deletion endpoints failed');
    throw lastError;
  }
  
  // Normal handling for other endpoints
  await apiClient.delete(`${endpoint}/${id}`, config);
}

// Esporta il client per utilizzi specifici
export default apiClient;