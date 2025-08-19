import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

interface FetchOptions extends Record<string, unknown> {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
  enabled?: boolean;
}

/**
 * Generic hook for fetching data using React Query
 */
export function useQueryData<T = unknown>(
  queryKey: string | unknown[],
  url: string,
  options: FetchOptions = {},
  queryOptions: Omit<UseQueryOptions<T, Error, T>, 'queryKey' | 'queryFn'> = {}
) {
  const { onSuccess, onError, enabled = true, ...axiosOptions } = options;

  const result = useQuery<T, Error>({
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey],
    queryFn: async () => {
      const { data } = await apiClient.get<T>(url, axiosOptions);
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes default stale time
    ...queryOptions,
  });

  // Handle callbacks manually since they're deprecated in newer versions
  if (result.isSuccess && onSuccess) {
    onSuccess(result.data);
  }
  if (result.isError && onError) {
    onError(result.error);
  }

  return result;
}

/**
 * Hook for fetching a list of items
 */
export function useList<T = unknown>(
  resource: string,
  options: FetchOptions = {},
  queryOptions: Omit<UseQueryOptions<T[], Error, T[]>, 'queryKey' | 'queryFn'> = {}
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
export function useGetById<T = unknown>(
  resource: string,
  id: string | number | null | undefined,
  options: FetchOptions = {},
  queryOptions: Omit<UseQueryOptions<T, Error, T>, 'queryKey' | 'queryFn'> = {}
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
export function useCustomQuery<T = unknown>(
  queryName: string,
  url: string,
  options: FetchOptions = {},
  queryOptions: Omit<UseQueryOptions<T, Error, T>, 'queryKey' | 'queryFn'> = {}
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