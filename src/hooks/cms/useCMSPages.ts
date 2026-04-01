/**
 * React Query Hooks for CMS Pages
 * 
 * Features:
 * - useCMSPages: Lista pagine con filtri
 * - useCMSPage: Singola pagina
 * - useCreateCMSPage: Crea nuova pagina
 * - useUpdateCMSPage: Aggiorna pagina
 * - usePublishCMSPage: Pubblica/Unpublish
 * - useDeleteCMSPage: Elimina pagina
 * - useDuplicateCMSPage: Duplica pagina
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import cmsPagesService, {
  CMSPage,
  CMSPageListFilters,
  CMSPageListResponse,
  CreateCMSPageData,
  UpdateCMSPageData,
} from '../../services/cmsPagesService';

// Query Keys
export const cmsPageKeys = {
  all: ['cms-pages'] as const,
  lists: () => [...cmsPageKeys.all, 'list'] as const,
  list: (filters?: CMSPageListFilters) => [...cmsPageKeys.lists(), filters] as const,
  details: () => [...cmsPageKeys.all, 'detail'] as const,
  detail: (id: string) => [...cmsPageKeys.details(), id] as const,
  bySlug: (slug: string) => [...cmsPageKeys.all, 'slug', slug] as const,
};

/**
 * Hook per lista pagine CMS
 */
export function useCMSPages(
  filters?: CMSPageListFilters,
  options?: Omit<UseQueryOptions<CMSPageListResponse, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CMSPageListResponse, Error>({
    queryKey: cmsPageKeys.list(filters),
    queryFn: () => cmsPagesService.listPages(filters),
    staleTime: 30000, // 30 secondi
    ...options,
  });
}

/**
 * Hook per singola pagina CMS per ID
 */
export function useCMSPage(
  id: string | undefined,
  options?: Omit<UseQueryOptions<CMSPage, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CMSPage, Error>({
    queryKey: cmsPageKeys.detail(id!),
    queryFn: () => cmsPagesService.getPage(id!),
    enabled: !!id,
    staleTime: 30000,
    ...options,
  });
}

/**
 * Hook per singola pagina CMS per slug (per frontend pubblico)
 */
export function useCMSPageBySlug(
  slug: string | undefined,
  options?: Omit<UseQueryOptions<CMSPage, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CMSPage, Error>({
    queryKey: cmsPageKeys.bySlug(slug!),
    queryFn: () => cmsPagesService.getBySlug(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch on window focus
    ...options,
  });
}

/**
 * Hook per creare pagina CMS
 */
export function useCreateCMSPage() {
  const queryClient = useQueryClient();

  return useMutation<CMSPage, Error, CreateCMSPageData>({
    mutationFn: (data) => cmsPagesService.createPage(data),
    onSuccess: (newPage) => {
      // Invalida lista pagine per ricaricare
      queryClient.invalidateQueries({ queryKey: cmsPageKeys.lists() });

      // Toast handled by calling component
    },
    onError: (error) => {
      // Toast handled by calling component
    },
  });
}

/**
 * Hook per aggiornare pagina CMS
 */
export function useUpdateCMSPage() {
  const queryClient = useQueryClient();

  return useMutation<CMSPage, Error, { id: string; data: UpdateCMSPageData }, { previousPage?: CMSPage }>({
    mutationFn: ({ id, data }) => cmsPagesService.updatePage(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: cmsPageKeys.detail(id) });

      // Snapshot previous value
      const previousPage = queryClient.getQueryData<CMSPage>(cmsPageKeys.detail(id));

      // Optimistic update
      if (previousPage) {
        queryClient.setQueryData<CMSPage>(cmsPageKeys.detail(id), {
          ...previousPage,
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousPage };
    },
    onSuccess: (updatedPage) => {
      // Invalida sia lista che dettaglio
      queryClient.invalidateQueries({ queryKey: cmsPageKeys.lists() });
      queryClient.setQueryData(cmsPageKeys.detail(updatedPage.id), updatedPage);

      // Toast handled by calling component
    },
    onError: (error, { id }, context) => {
      // Rollback su errore
      if (context?.previousPage) {
        queryClient.setQueryData(cmsPageKeys.detail(id), context.previousPage);
      }

      // Toast handled by calling component
    },
  });
}

/**
 * Hook per pubblicare pagina CMS
 */
export function usePublishCMSPage() {
  const queryClient = useQueryClient();

  return useMutation<CMSPage, Error, string>({
    mutationFn: (id) => cmsPagesService.publishPage(id),
    onSuccess: (publishedPage) => {
      // Invalida lista e aggiorna dettaglio
      queryClient.invalidateQueries({ queryKey: cmsPageKeys.lists() });
      queryClient.setQueryData(cmsPageKeys.detail(publishedPage.id), publishedPage);

      // Toast handled by calling component
    },
    onError: (error) => {
      // Toast handled by calling component
    },
  });
}

/**
 * Hook per unpublish pagina CMS
 */
export function useUnpublishCMSPage() {
  const queryClient = useQueryClient();

  return useMutation<CMSPage, Error, string>({
    mutationFn: (id) => cmsPagesService.unpublishPage(id),
    onSuccess: (unpublishedPage) => {
      // Invalida lista e aggiorna dettaglio
      queryClient.invalidateQueries({ queryKey: cmsPageKeys.lists() });
      queryClient.setQueryData(cmsPageKeys.detail(unpublishedPage.id), unpublishedPage);

      // Toast handled by calling component
    },
    onError: (error) => {
      // Toast handled by calling component
    },
  });
}

/**
 * Hook per eliminare pagina CMS
 */
export function useDeleteCMSPage() {
  const queryClient = useQueryClient();

  return useMutation<CMSPage, Error, string, { previousLists?: Array<[any, any]> }>({
    mutationFn: (id) => cmsPagesService.deletePage(id),
    onMutate: async (id) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: cmsPageKeys.lists() });

      // Snapshot previous list
      const previousLists = queryClient.getQueriesData({ queryKey: cmsPageKeys.lists() });

      // Optimistic update: rimuovi dalla lista
      queryClient.setQueriesData<CMSPageListResponse>(
        { queryKey: cmsPageKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.filter((page) => page.id !== id),
            pagination: {
              ...old.pagination,
              total: old.pagination.total - 1,
            },
          };
        }
      );

      return { previousLists };
    },
    onSuccess: (deletedPage) => {
      // Invalida tutte le liste
      queryClient.invalidateQueries({ queryKey: cmsPageKeys.lists() });
      // Rimuovi dal cache del dettaglio
      queryClient.removeQueries({ queryKey: cmsPageKeys.detail(deletedPage.id) });

      // Toast handled by calling component
    },
    onError: (error, id, context) => {
      // Rollback su errore
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      // Toast handled by calling component
    },
  });
}

/**
 * Hook per duplicare pagina CMS
 */
export function useDuplicateCMSPage() {
  const queryClient = useQueryClient();

  return useMutation<CMSPage, Error, string>({
    mutationFn: (id) => cmsPagesService.duplicatePage(id),
    onSuccess: (duplicatedPage) => {
      // Invalida lista per ricaricare con nuova pagina
      queryClient.invalidateQueries({ queryKey: cmsPageKeys.lists() });

      // Toast handled by calling component
    },
    onError: (error) => {
      // Toast handled by calling component
    },
  });
}
