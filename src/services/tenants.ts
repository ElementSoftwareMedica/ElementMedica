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
    const response = await apiClient.get<TenantCurrentResponse>('/tenants/current');
    // L'endpoint restituisce { success: true, data: { tenant: {...} } }
    // Estraiamo il tenant dalla struttura annidata
    return response.data.data.tenant;
  } catch (error: any) {
    console.error('Error fetching current tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nel caricamento del tenant');
  }
};

export const getTenantById = async (tenantId: string): Promise<Company> => {
  try {
    const response = await apiClient.get(`/tenant/${tenantId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nel caricamento del tenant');
  }
};

export const getAllTenants = async (): Promise<Company[]> => {
  try {
    const response = await apiClient.get('/tenant');
    return response.data;
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
    throw new Error(error.response?.data?.message || 'Errore nel caricamento dei tenant');
  }
};

export const createTenant = async (tenantData: TenantCreateDTO): Promise<Company> => {
  try {
    const response = await apiClient.post('/tenant', tenantData);
    return response.data;
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nella creazione del tenant');
  }
};

export const updateTenant = async (tenantId: string, tenantData: TenantUpdateDTO): Promise<Company> => {
  try {
    const response = await apiClient.put(`/tenant/${tenantId}`, tenantData);
    return response.data;
  } catch (error: any) {
    console.error('Error updating tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nell\'aggiornamento del tenant');
  }
};

export const deleteTenant = async (tenantId: string): Promise<void> => {
  try {
    await apiClient.delete(`/tenant/${tenantId}`);
  } catch (error: any) {
    console.error('Error deleting tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nell\'eliminazione del tenant');
  }
};

export const getTenantUsage = async (tenantId: string): Promise<TenantUsage> => {
  try {
    const response = await apiClient.get(`/tenant/${tenantId}/usage`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching tenant usage:', error);
    throw new Error(error.response?.data?.message || 'Errore nel caricamento dell\'utilizzo del tenant');
  }
};

export const switchTenant = async (tenantId: string): Promise<void> => {
  try {
    await apiClient.post('/tenant/switch', { tenantId });
  } catch (error: any) {
    console.error('Error switching tenant:', error);
    throw new Error(error.response?.data?.message || 'Errore nel cambio tenant');
  }
};

export const validateTenantDomain = async (domain: string): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const response = await apiClient.post('/tenant/validate-domain', { domain });
    return response.data;
  } catch (error: any) {
    console.error('Error validating domain:', error);
    throw new Error(error.response?.data?.message || 'Errore nella validazione del dominio');
  }
};

export const validateTenantSlug = async (slug: string): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const response = await apiClient.post('/tenant/validate-slug', { slug });
    return response.data;
  } catch (error: any) {
    console.error('Error validating slug:', error);
    throw new Error(error.response?.data?.message || 'Errore nella validazione dello slug');
  }
};