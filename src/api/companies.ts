/* eslint-disable */
// Mock API per le aziende - da sostituire con implementazione reale

import type { Company } from '../types';
import type { CompanyFilters } from '../hooks/resources/useCompaniesOptimized';

interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  [key: string]: any;
}

// Mock data per testing
const mockCompanies: Company[] = [
  {
    id: '1',
    ragioneSociale: 'Acme Corporation',
    name: 'Acme Corporation',
    email: 'info@acme.com',
    phone: '+39 02 1234567',
    address: 'Via Roma 123',
    city: 'Milano',
    province: 'MI',
    cap: '20100',
    vatNumber: 'IT12345678901',
    fiscalCode: 'ACMCORP123',
    contactPerson: 'Mario Rossi',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  },
  {
    id: '2',
    ragioneSociale: 'Tech Solutions SRL',
    name: 'Tech Solutions SRL',
    email: 'contact@techsolutions.it',
    phone: '+39 06 9876543',
    address: 'Via Nazionale 456',
    city: 'Roma',
    province: 'RM',
    cap: '00100',
    vatNumber: 'IT98765432109',
    fiscalCode: 'TECHSOL456',
    contactPerson: 'Giulia Bianchi',
    createdAt: new Date('2024-01-20T14:30:00Z'),
    updatedAt: new Date('2024-01-20T14:30:00Z'),
  },
];

// Simula delay di rete
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const companiesApi = {
  // Lista aziende con filtri e paginazione
  list: async (params: QueryParams = {}): Promise<ListResponse<Company>> => {
    await delay(500); // Simula latenza di rete
    
    const {
      page = 1,
      limit = 20,
      search = '',
      sort = 'name',
      order = 'asc'
    } = params;
    
    let filteredCompanies = [...mockCompanies];
    
    // Filtro per ricerca
    if (search) {
      const searchLower = search.toLowerCase();
      filteredCompanies = filteredCompanies.filter(company => 
        company.name?.toLowerCase().includes(searchLower) ||
        company.city?.toLowerCase().includes(searchLower) ||
        company.email?.toLowerCase().includes(searchLower) ||
        company.ragioneSociale.toLowerCase().includes(searchLower)
      );
    }
    
    // Ordinamento
    filteredCompanies.sort((a, b) => {
      const aValue = a[sort as keyof Company] as string;
      const bValue = b[sort as keyof Company] as string;
      
      if (order === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
    
    // Paginazione
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);
    
    return {
      data: paginatedCompanies,
      total: filteredCompanies.length,
      page,
      limit,
    };
  },
  
  // Dettaglio azienda
  getById: async (id: string | number): Promise<Company> => {
    await delay(300);
    
    const company = mockCompanies.find(c => c.id === String(id));
    if (!company) {
      throw new Error(`Azienda con ID ${id} non trovata`);
    }
    
    return company;
  },
  
  // Creazione azienda
  create: async (data: Partial<Company>): Promise<Company> => {
    await delay(800);
    
    const newCompany: Company = {
      id: String(Date.now()),
      ragioneSociale: data.ragioneSociale || data.name || '',
      name: data.name || data.ragioneSociale || '',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
      province: data.province || '',
      cap: data.cap || '',
      vatNumber: data.vatNumber || '',
      fiscalCode: data.fiscalCode || '',
      contactPerson: data.contactPerson || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockCompanies.push(newCompany);
    return newCompany;
  },
  
  // Aggiornamento azienda
  update: async (id: string | number, data: Partial<Company>): Promise<Company> => {
    await delay(600);
    
    const index = mockCompanies.findIndex(c => c.id === String(id));
    if (index === -1) {
      throw new Error(`Azienda con ID ${id} non trovata`);
    }
    
    const updatedCompany = {
      ...mockCompanies[index],
      ...data,
      id: String(id), // Mantieni l'ID originale
      updatedAt: new Date(),
    };
    
    mockCompanies[index] = updatedCompany;
    return updatedCompany;
  },
  
  // Eliminazione azienda
  delete: async (id: string | number): Promise<void> => {
    await delay(400);
    
    const index = mockCompanies.findIndex(c => c.id === String(id));
    if (index === -1) {
      throw new Error(`Azienda con ID ${id} non trovata`);
    }
    
    mockCompanies.splice(index, 1);
  },
  
  // Ricerca aziende
  search: async (query: string): Promise<Company[]> => {
    await delay(300);
    
    const queryLower = query.toLowerCase();
    return mockCompanies.filter(company => 
      company.name?.toLowerCase().includes(queryLower) ||
      company.city?.toLowerCase().includes(queryLower) ||
      company.email?.toLowerCase().includes(queryLower) ||
      company.ragioneSociale.toLowerCase().includes(queryLower)
    );
  },
};

export default companiesApi;