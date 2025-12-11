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
import { toast } from 'react-toastify';

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
    staleTime: 0, // TEMPORARILY DISABLED FOR DEBUGGING - sempre fetch fresh
    gcTime: 0, // TEMPORARILY DISABLED FOR DEBUGGING - no cache
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
      
      toast.success(`Pagina "${newPage.title}" creata con successo`);
    },
    onError: (error) => {
      console.error('Error creating CMS page:', error);
      toast.error(error.message || 'Errore durante la creazione della pagina');
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
      
      toast.success(`Pagina "${updatedPage.title}" aggiornata con successo`);
    },
    onError: (error, { id }, context) => {
      // Rollback su errore
      if (context?.previousPage) {
        queryClient.setQueryData(cmsPageKeys.detail(id), context.previousPage);
      }
      
      console.error('Error updating CMS page:', error);
      toast.error(error.message || 'Errore durante l\'aggiornamento della pagina');
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
      
      toast.success(`Pagina "${publishedPage.title}" pubblicata con successo`);
    },
    onError: (error) => {
      console.error('Error publishing CMS page:', error);
      toast.error(error.message || 'Errore durante la pubblicazione della pagina');
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
      
      toast.success(`Pagina "${unpublishedPage.title}" rimossa dalla pubblicazione`);
    },
    onError: (error) => {
      console.error('Error unpublishing CMS page:', error);
      toast.error(error.message || 'Errore durante la rimozione della pubblicazione');
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
      
      toast.success(`Pagina "${deletedPage.title}" eliminata con successo`);
    },
    onError: (error, id, context) => {
      // Rollback su errore
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      
      console.error('Error deleting CMS page:', error);
      toast.error(error.message || 'Errore durante l\'eliminazione della pagina');
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
      
      toast.success(`Pagina duplicata con successo: "${duplicatedPage.title}"`);
    },
    onError: (error) => {
      console.error('Error duplicating CMS page:', error);
      toast.error(error.message || 'Errore durante la duplicazione della pagina');
    },
  });
}
