import { Company } from '../types';
import apiClient from './api';

// Types
interface TenantCurrentResponse {
  success: boolean;
  data: {
    tenant: Company;
    statistics?: any;
    billing?: any;
  };
}

export interface TenantCreateDTO {
  name: string;
  slug: string;
  domain?: string;
  settings?: Record<string, any>;
  subscription_plan?: string;
}

export interface TenantUpdateDTO {
  name?: string;
  domain?: string;
  settings?: Record<string, any>;
  subscription_plan?: string;
  is_active?: boolean;
}

export interface TenantUsage {
  userCount: number;
  companyCount: number;
  storageUsed: number;
  apiCallsCount: number;
}

// API Functions
export const getCurrentTenant = async (): Promise<Company> => {
  try {
    // Log token availability for debugging
    const token = localStorage.getItem('token');
    console.log('🔍 getCurrentTenant: Token check:', {
      hasToken: !!token,
      tokenStart: token ? token.substring(0, 20) + '...' : 'NO_TOKEN',
      timestamp: new Date().toISOString()
    });
    
    const response = await apiClient.get<TenantCurrentResponse>('/api/tenants/current');
    // L'endpoint restituisce { success: true, data: { tenant: {...} } }
    // Estraiamo il tenant dalla struttura annidata
    console.log('✅ getCurrentTenant: Success', response.data.data.tenant?.name);
    return response.data.data.tenant;
  } catch (error: any) {
    console.error('❌ getCurrentTenant: Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      hasToken: !!localStorage.getItem('token'),
      timestamp: new Date().toISOString()
    });
    throw new Error(error.response?.data?.message || 'Errore nel caricamento del tenant');
  }
};

export const getTenantById = async (tenantId: string): Promise<Company> => {
  try {
    const response = await apiClient.get<Company>(`/tenants/${tenantId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nel caricamento del tenant');
  }
};

export const getAllTenants = async (): Promise<Company[]> => {
  try {
    const response = await apiClient.get<Company[]>('/tenants');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    throw new Error(error.response?.data?.message || 'Errore nel caricamento dei tenant');
  }
};

export const createTenant = async (tenantData: TenantCreateDTO): Promise<Company> => {
  try {
    const response = await apiClient.post<Company>('/tenants', tenantData);
    return response.data;
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nella creazione del tenant');
  }
};

export const updateTenant = async (tenantId: string, tenantData: TenantUpdateDTO): Promise<Company> => {
  try {
    const response = await apiClient.put<Company>(`/tenants/${tenantId}`, tenantData);
    return response.data;
  } catch (error: any) {
    console.error('Error updating tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nell\'aggiornamento del tenant');
  }
};

export const deleteTenant = async (tenantId: string): Promise<void> => {
  try {
    await apiClient.delete(`/tenants/${tenantId}`);
  } catch (error: any) {
    console.error('Error deleting tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nell\'eliminazione del tenant');
  }
};

export const getTenantUsage = async (tenantId: string): Promise<TenantUsage> => {
  try {
    const response = await apiClient.get<TenantUsage>(`/tenants/${tenantId}/usage`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching tenant usage:', error);
    throw new Error(error.response?.data?.message || 'Errore nel caricamento dell\'utilizzo del tenant');
  }
};

export const switchTenant = async (tenantId: string): Promise<void> => {
  try {
    await apiClient.post('/tenants/switch', { tenantId });
  } catch (error: any) {
    console.error('Error switching tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nel cambio tenant');
  }
};

export const validateTenantDomain = async (domain: string): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{ isValid: boolean; message?: string }>('/tenants/validate-domain', { domain });
    return response.data;
  } catch (error: any) {
    console.error('Error validating domain:', error);
    throw new Error(error.response?.data?.message || 'Errore nella validazione del dominio');
  }
};

export const validateTenantSlug = async (slug: string): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{ isValid: boolean; message?: string }>('/tenants/validate-slug', { slug });
    return response.data;
  } catch (error: any) {
    console.error('Error validating slug:', error);
    throw new Error(error.response?.data?.message || 'Errore nella validazione dello slug');
  }
};