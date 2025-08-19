import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useToast } from '../ui/useToast';
import { useErrorHandler } from '../useErrorHandler';

// Tipi base per le API
interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

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

/**
 * Hook ottimizzato per query GET
 */
export const useOptimizedQuery = <T>(
  queryKey: (string | number)[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  const { error: showError } = useToast();
  const { handleError } = useErrorHandler();

  return useQuery({
    queryKey,
    queryFn,
    ...options,
    onError: (error: any) => {
      handleError(error);
      options?.onError?.(error);
    },
  });
};

/**
 * Hook per liste con paginazione e filtri
 */
export const useListQuery = <T>(
  resource: string,
  params: QueryParams = {},
  fetchFn: (params: QueryParams) => Promise<ListResponse<T>>,
  options?: Omit<UseQueryOptions<ListResponse<T>>, 'queryKey' | 'queryFn'>
) => {
  const queryKey = useMemo(() => [resource, 'list', params], [resource, params]);
  
  return useOptimizedQuery(
    queryKey,
    () => fetchFn(params),
    {
      keepPreviousData: true, // Mantieni i dati precedenti durante il caricamento
      staleTime: 2 * 60 * 1000, // 2 minuti per le liste
      ...options,
    }
  );
};

/**
 * Hook per dettagli di una risorsa
 */
export const useDetailQuery = <T>(
  resource: string,
  id: string | number,
  fetchFn: (id: string | number) => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  const queryKey = useMemo(() => [resource, 'detail', id], [resource, id]);
  
  return useOptimizedQuery(
    queryKey,
    () => fetchFn(id),
    {
      enabled: !!id, // Esegui solo se l'ID è presente
      staleTime: 5 * 60 * 1000, // 5 minuti per i dettagli
      ...options,
    }
  );
};

/**
 * Hook ottimizzato per mutazioni
 */
export const useOptimizedMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>
) => {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (data, variables, context) => {
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error: Error, variables, context) => {
      handleError(error);
      options?.onError?.(error, variables, context);
    },
  });
};

/**
 * Hook per operazioni CRUD ottimizzate
 */
export const useCrudOperations = <T>(
  resource: string,
  api: {
    list: (params: QueryParams) => Promise<ListResponse<T>>;
    get: (id: string | number) => Promise<T>;
    create: (data: Partial<T>) => Promise<T>;
    update: (id: string | number, data: Partial<T>) => Promise<T>;
    delete: (id: string | number) => Promise<void>;
  }
) => {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  // Funzioni di invalidazione
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [resource, 'list'] });
  }, [queryClient, resource]);

  const invalidateDetail = useCallback((id: string | number) => {
    queryClient.invalidateQueries({ queryKey: [resource, 'detail', id] });
  }, [queryClient, resource]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [resource] });
  }, [queryClient, resource]);

  // Mutazioni ottimizzate
  const createMutation = useOptimizedMutation(
    api.create,
    {
      onSuccess: (data) => {
        invalidateList();
        success(`${resource} creato con successo`);
      },
    }
  );

  const updateMutation = useOptimizedMutation(
    ({ id, data }: { id: string | number; data: Partial<T> }) => api.update(id, data),
    {
      onSuccess: (data, { id }) => {
        invalidateDetail(id);
        invalidateList();
        success(`${resource} aggiornato con successo`);
      },
    }
  );

  const deleteMutation = useOptimizedMutation(
    api.delete,
    {
      onSuccess: (_, id) => {
        queryClient.removeQueries({ queryKey: [resource, 'detail', id] });
        invalidateList();
        success(`${resource} eliminato con successo`);
      },
    }
  );

  // Funzioni di utilità
  const prefetchDetail = useCallback(async (id: string | number) => {
    await queryClient.prefetchQuery({
      queryKey: [resource, 'detail', id],
      queryFn: () => api.get(id),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient, resource, api.get]);

  const setDetailData = useCallback((id: string | number, data: T) => {
    queryClient.setQueryData([resource, 'detail', id], data);
  }, [queryClient, resource]);

  const getDetailData = useCallback((id: string | number): T | undefined => {
    return queryClient.getQueryData([resource, 'detail', id]);
  }, [queryClient, resource]);

  return {
    // Mutazioni
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    
    // Utility
    invalidateList,
    invalidateDetail,
    invalidateAll,
    prefetchDetail,
    setDetailData,
    getDetailData,
    
    // Stati delle mutazioni
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
};

export default useOptimizedQuery;