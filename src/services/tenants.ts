import { Company } from '../types';
import apiClient from './api';

// Types
interface TenantStatistics {
  [key: string]: unknown;
}

interface TenantBilling {
  [key: string]: unknown;
}

interface TenantCurrentResponse {
  success: boolean;
  data: {
    tenant: Company;
    statistics?: TenantStatistics;
    billing?: TenantBilling;
  };
}

export interface AdminDataDTO {
  firstName: string;
  lastName: string;
  taxCode?: string;
  email: string;
  password: string;
  username?: string;
}

export interface SecretaryAccountDTO {
  firstName: string;
  lastName: string;
  taxCode?: string;
  email: string;
  password: string;
  username?: string;
}

export interface TenantCreateDTO {
  name: string;
  slug: string;
  domain?: string;
  settings?: Record<string, unknown>;
  subscription_plan?: string;
  companyData?: Record<string, string>;
  adminData?: AdminDataDTO;
  secretaryAccounts?: SecretaryAccountDTO[];
}

export interface TenantUpdateDTO {
  name?: string;
  domain?: string;
  settings?: Record<string, unknown>;
  subscription_plan?: string;
  is_active?: boolean;
}

export interface TenantUsage {
  userCount: number;
  companyCount: number;
  storageUsed: number;
  apiCallsCount: number;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  return fallback;
};

// API Functions
export const getCurrentTenant = async (): Promise<Company> => {
  try {
    const response = await apiClient.get<TenantCurrentResponse>('/api/v1/tenants/current');
    return response.data.data.tenant;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Errore nel caricamento del tenant'));
  }
};

export const getTenantById = async (tenantId: string): Promise<Company> => {
  try {
    const response = await apiClient.get<Company>(`/api/v1/tenants/${tenantId}`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Errore nel caricamento del tenant'));
  }
};

export const getAllTenants = async (): Promise<Company[]> => {
  try {
    const response = await apiClient.get<{ success: boolean; data: Company[]; pagination?: unknown } | Company[]>('/api/v1/tenants');
    if ('success' in response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return [];
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Errore nel caricamento dei tenant'));
  }
};

export const createTenant = async (tenantData: TenantCreateDTO): Promise<Company> => {
  try {
    const response = await apiClient.post<Company>('/api/v1/tenants', tenantData);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Errore nella creazione del tenant'));
  }
};

export const updateTenant = async (tenantId: string, tenantData: TenantUpdateDTO): Promise<Company> => {
  try {
    const response = await apiClient.put<Company>(`/api/v1/tenants/${tenantId}`, tenantData);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Errore nell'aggiornamento del tenant"));
  }
};

export const deleteTenant = async (tenantId: string): Promise<void> => {
  try {
    await apiClient.delete(`/api/v1/tenants/${tenantId}`);
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Errore nell'eliminazione del tenant"));
  }
};

export const getTenantUsage = async (tenantId: string): Promise<TenantUsage> => {
  try {
    const response = await apiClient.get<TenantUsage>(`/api/v1/tenants/${tenantId}/usage`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, "Errore nel caricamento dell'utilizzo del tenant"));
  }
};

export const switchTenant = async (tenantId: string): Promise<void> => {
  try {
    await apiClient.post('/api/v1/tenants/switch', { tenantId });
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Errore nel cambio tenant'));
  }
};

export const validateTenantDomain = async (domain: string): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{ isValid: boolean; message?: string }>('/api/v1/tenants/validate-domain', { domain });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Errore nella validazione del dominio'));
  }
};

export const validateTenantSlug = async (slug: string): Promise<{ isValid: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<{ isValid: boolean; message?: string }>('/api/v1/tenants/validate-slug', { slug });
    return response.data;
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, 'Errore nella validazione dello slug'));
  }
};