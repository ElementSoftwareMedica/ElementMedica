import { useMemo } from 'react';
import { useListQuery, useDetailQuery, useCrudOperations } from '../api/useOptimizedQuery';
import { companiesApi } from '../../api/companies'; // Assumendo che esista

// Tipi per Company
export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  cap: string;
  vatNumber: string;
  fiscalCode: string;
  legalRepresentative: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyFilters {
  search?: string;
  city?: string;
  province?: string;
  page?: number;
  limit?: number;
  sort?: 'name' | 'createdAt' | 'city';
  order?: 'asc' | 'desc';
}

/**
 * Hook ottimizzato per la gestione delle aziende
 */
export const useCompaniesOptimized = (filters: CompanyFilters = {}) => {
  // Normalizza i filtri per evitare re-render inutili
  const normalizedFilters = useMemo(() => ({
    page: 1,
    limit: 20,
    sort: 'name' as const,
    order: 'asc' as const,
    ...filters,
  }), [filters]);

  // Query per la lista delle aziende
  const listQuery = useListQuery(
    'companies',
    normalizedFilters,
    companiesApi.list,
    {
      select: (data) => ({
        ...data,
        // Trasformazioni dei dati se necessarie
        data: data.data.map(company => ({
          ...company,
          displayName: `${company.name} - ${company.city}`,
        }))
      }),
    }
  );

  // Operazioni CRUD
  const crudOperations = useCrudOperations('companies', {
    list: companiesApi.list,
    get: companiesApi.getById,
    create: companiesApi.create,
    update: companiesApi.update,
    delete: companiesApi.delete,
  });

  return {
    // Dati della lista
    companies: listQuery.data?.data || [],
    total: listQuery.data?.total || 0,
    currentPage: listQuery.data?.page || 1,
    totalPages: Math.ceil((listQuery.data?.total || 0) / normalizedFilters.limit),
    
    // Stati della query
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    isFetching: listQuery.isFetching,
    
    // Operazioni CRUD
    createCompany: crudOperations.create.mutateAsync,
    updateCompany: (id: string, data: Partial<Company>) => 
      crudOperations.update.mutateAsync({ id, data }),
    deleteCompany: crudOperations.delete.mutateAsync,
    
    // Stati delle mutazioni
    isCreating: crudOperations.isCreating,
    isUpdating: crudOperations.isUpdating,
    isDeleting: crudOperations.isDeleting,
    isMutating: crudOperations.isMutating,
    
    // Utility
    refetch: listQuery.refetch,
    invalidateList: crudOperations.invalidateList,
    prefetchCompany: crudOperations.prefetchDetail,
    
    // Filtri correnti
    filters: normalizedFilters,
  };
};

/**
 * Hook per il dettaglio di una singola azienda
 */
export const useCompanyDetail = (id: string) => {
  const detailQuery = useDetailQuery(
    'companies',
    id,
    companiesApi.getById,
    {
      select: (data: Company) => ({
        ...data,
        displayName: `${data.name} - ${data.city}`,
        fullAddress: `${data.address}, ${data.city} ${data.province} ${data.cap}`,
      }),
    }
  );

  const crudOperations = useCrudOperations('companies', {
    list: companiesApi.list,
    get: companiesApi.getById,
    create: companiesApi.create,
    update: companiesApi.update,
    delete: companiesApi.delete,
  });

  return {
    company: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    error: detailQuery.error,
    
    // Operazioni sulla singola azienda
    updateCompany: (data: Partial<Company>) => 
      crudOperations.update.mutateAsync({ id, data }),
    deleteCompany: () => crudOperations.delete.mutateAsync(id),
    
    // Stati delle mutazioni
    isUpdating: crudOperations.isUpdating,
    isDeleting: crudOperations.isDeleting,
    
    // Utility
    refetch: detailQuery.refetch,
    invalidate: () => crudOperations.invalidateDetail(id),
  };
};

/**
 * Hook per statistiche delle aziende
 */
export const useCompaniesStats = () => {
  const { companies, isLoading } = useCompaniesOptimized({ limit: 1000 }); // Carica tutte per le stats
  
  const stats = useMemo(() => {
    if (!companies.length) return null;
    
    const byProvince = companies.reduce((acc, company) => {
      acc[company.province] = (acc[company.province] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byCity = companies.reduce((acc, company) => {
      acc[company.city] = (acc[company.city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: companies.length,
      byProvince,
      byCity,
      topProvinces: Object.entries(byProvince)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      topCities: Object.entries(byCity)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
    };
  }, [companies]);
  
  return {
    stats,
    isLoading,
  };
};

export default useCompaniesOptimized;