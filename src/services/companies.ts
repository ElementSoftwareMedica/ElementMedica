import { createService } from './serviceFactory';
import type { Database } from '../types';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

// Creazione del servizio base usando la factory
const baseService = createService<Company, CompanyInsert, CompanyUpdate>('/companies');

// Estensione del servizio con eventuali metodi specifici
const companyService = baseService.extend({
  // Qui si possono aggiungere metodi specifici se necessario
});

// Esportazione dei metodi standard
export const getCompanies = companyService.getAll;
export const getCompany = companyService.getById;
export const createCompany = companyService.create;
export const updateCompany = companyService.update;
export const deleteCompany = companyService.delete;

// Esportazione del servizio completo come default
export default companyService;