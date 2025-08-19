import { useMutation as useReactQueryMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { sanitizeErrorMessage } from '../../utils/errorUtils';
import { toast } from 'react-hot-toast';

interface MutationOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: unknown) => void;
  invalidateQueries?: string[]; // Array of query keys to invalidate after successful mutation
}

/**
 * Generic hook for creating data
 */
export function useCreate<T = unknown, TData = unknown>(
  resource: string,
  options: MutationOptions = {},
  mutationOptions: Omit<UseMutationOptions<T, Error, TData>, 'mutationFn'> = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, invalidateQueries = [`list:${resource}`] } = options;

  return useReactQueryMutation<T, Error, TData>({
    mutationFn: async (data: TData) => {
      const response = await apiClient.post<T>(`/${resource}`, data);
      return response.data;
    },
    ...mutationOptions,
    onSuccess: (data: T, variables: TData, context: unknown) => {
      // Invalidate relevant queries to update the UI
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      
      // Call custom onSuccess handler if provided
      if (onSuccess) {
        onSuccess(data);
      }
      
      // Call the original onSuccess if provided
      if (mutationOptions.onSuccess) {
        mutationOptions.onSuccess(data, variables, context);
      }
    },
    onError: (error: Error, variables: TData, context: unknown) => {
      // Sanitizza e mostra errore all'utente
      const userMessage = sanitizeErrorMessage(error, 'Errore durante la creazione');
      toast.error(userMessage);
      
      // Call custom onError handler if provided
      if (onError) {
        onError(error);
      }
      
      // Call the original onError if provided
      if (mutationOptions.onError) {
        mutationOptions.onError(error, variables, context);
      }
    },
  });
}

// Default export for backward compatibility
export default { useCreate, useUpdate, useDelete };

/**
 * Generic hook for updating data
 */
export function useUpdate<T = unknown, TData = unknown>(
  resource: string,
  id?: string | number,
  options: MutationOptions = {},
  mutationOptions: Omit<UseMutationOptions<T, Error, TData>, 'mutationFn'> = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, invalidateQueries = [`list:${resource}`, `get:${resource}:${id}`] } = options;

  return useReactQueryMutation<T, Error, TData>({
    mutationFn: async (data: TData) => {
      const response = await apiClient.put<T>(
        `/${resource}/${id !== undefined ? id : ''}`, 
        data
      );
      return response.data;
    },
    ...mutationOptions,
    onSuccess: (data: T, variables: TData, context: unknown) => {
      // Invalidate relevant queries to update the UI
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      
      // Call custom onSuccess handler if provided
      if (onSuccess) {
        onSuccess(data);
      }
      
      // Call the original onSuccess if provided
      if (mutationOptions.onSuccess) {
        mutationOptions.onSuccess(data, variables, context);
      }
    },
    onError: (error: Error, variables: TData, context: unknown) => {
      // Sanitizza e mostra errore all'utente
      const userMessage = sanitizeErrorMessage(error, 'Errore durante l\'aggiornamento');
      toast.error(userMessage);
      
      // Call custom onError handler if provided
      if (onError) {
        onError(error);
      }
      
      // Call the original onError if provided
      if (mutationOptions.onError) {
        mutationOptions.onError(error, variables, context);
      }
    },
  });
}

/**
 * Generic hook for deleting data
 */
export function useDelete<T = unknown>(
  resource: string,
  options: MutationOptions = {},
  mutationOptions: Omit<UseMutationOptions<T, Error, string | number>, 'mutationFn'> = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, invalidateQueries = [`list:${resource}`] } = options;

  return useReactQueryMutation<T, Error, string | number>({
    mutationFn: async (id: string | number) => {
      const response = await apiClient.delete<T>(`/${resource}/${id}`);
      return response.data;
    },
    ...mutationOptions,
    onSuccess: (data: T, variables: string | number, context: unknown) => {
      // Invalidate relevant queries to update the UI
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });
      
      // Call custom onSuccess handler if provided
      if (onSuccess) {
        onSuccess(data);
      }
      
      // Call the original onSuccess if provided
      if (mutationOptions.onSuccess) {
        mutationOptions.onSuccess(data, variables, context);
      }
    },
    onError: (error: Error, variables: string | number, context: unknown) => {
      // Sanitizza e mostra errore all'utente
      const userMessage = sanitizeErrorMessage(error, 'Errore durante l\'eliminazione');
      toast.error(userMessage);
      
      // Call custom onError handler if provided
      if (onError) {
        onError(error);
      }
      
      // Call the original onError if provided
      if (mutationOptions.onError) {
        mutationOptions.onError(error, variables, context);
      }
    },
  });
}