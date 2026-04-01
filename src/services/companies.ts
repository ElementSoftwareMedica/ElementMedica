import { createService } from './serviceFactory';
import { apiGet } from './api';
import type { Database } from '../types';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

// Creazione del servizio base usando la factory
const baseService = createService<Company, CompanyInsert, CompanyUpdate>('/api/v1/companies');

// Estensione del servizio con eventuali metodi specifici
const companyService = baseService.extend({
  // Qui si possono aggiungere metodi specifici se necessario
});

// Esportazione dei metodi standard con supporto tenant filter
export const getCompanies = (params?: { allTenants?: boolean; tenantIds?: string }): Promise<Company[]> => {
  const queryParts: string[] = [];
  if (params?.allTenants) queryParts.push('allTenants=true');
  if (params?.tenantIds) queryParts.push(`tenantIds=${params.tenantIds}`);
  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return apiGet<Company[]>(`/api/v1/companies${qs}`);
};
export const getCompany = companyService.getById;
export const createCompany = companyService.create;
export const updateCompany = companyService.update;
export const deleteCompany = companyService.delete;

// Esportazione del servizio completo come default
export default companyService;