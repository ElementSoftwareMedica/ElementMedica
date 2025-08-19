import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

interface FetchOptions extends Record<string, any> {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  enabled?: boolean;
}

/**
 * Generic hook for fetching data using React Query
 */
export function useQueryData<T = any>(
  queryKey: string | any[],
  url: string,
  options: FetchOptions = {},
  queryOptions: Omit<UseQueryOptions<T, any, T>, 'queryKey' | 'queryFn'> = {}
) {
  const { onSuccess, onError, enabled = true, ...axiosOptions } = options;

  return useQuery<T, any>(
    queryKey,
    async () => {
      const { data } = await apiClient.get<T>(url, axiosOptions);
      return data;
    },
    {
      onSuccess,
      onError,
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes default stale time
      ...queryOptions,
    }
  );
}

/**
 * Hook for fetching a list of items
 */
export function useList<T = any>(
  resource: string,
  options: FetchOptions = {},
  queryOptions: Omit<UseQueryOptions<T[], any, T[]>, 'queryKey' | 'queryFn'> = {}
) {
  return useQueryData<T[]>(
    ['list', resource, options],
    `/${resource}`,
    options,
    queryOptions
  );
}

/**
 * Hook for fetching a single item by ID
 */
export function useGetById<T = any>(
  resource: string,
  id: string | number | null | undefined,
  options: FetchOptions = {},
  queryOptions: Omit<UseQueryOptions<T, any, T>, 'queryKey' | 'queryFn'> = {}
) {
  return useQueryData<T>(
    ['get', resource, id],
    `/${resource}/${id}`,
    {
      ...options,
      enabled: options.enabled !== false && id !== null && id !== undefined,
    },
    queryOptions
  );
}

/**
 * Hook for fetching data with a custom query
 */
export function useCustomQuery<T = any>(
  queryName: string,
  url: string,
  options: FetchOptions = {},
  queryOptions: Omit<UseQueryOptions<T, any, T>, 'queryKey' | 'queryFn'> = {}
) {
  return useQueryData<T>(
    ['custom', queryName, options],
    url,
    options,
    queryOptions
  );
}

// Default export for backward compatibility
export default { useQueryData, useCustomQuery };