/**
 * useMediaLibrary Hook
 * Custom React Query hook per gestione Media Library
 * 
 * Features:
 * - Lista media con cache e invalidazione
 * - Upload con progress e ottimizzazione
 * - CRUD operations con optimistic updates
 * - Folders management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import cmsMediaService, {
  MediaFile,
  MediaFolder,
  MediaUploadOptions,
  MediaUpdateData,
  FolderCreateData,
} from '../../services/cmsMediaService';

const QUERY_KEYS = {
  media: (filters?: MediaListFilters) => ['cms-media', filters],
  mediaDetail: (id: string) => ['cms-media', id],
  folders: (parentId?: string) => ['cms-folders', parentId],
};

export interface MediaListFilters {
  folderId?: string;
  mimeType?: string;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Hook per lista media
 */
export function useMediaList(filters?: MediaListFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.media(filters),
    queryFn: () => cmsMediaService.listMedia(filters || {}),
    staleTime: 1000 * 60 * 5, // 5 minuti cache
    refetchOnWindowFocus: false, // Evita refetch non necessari
    retry: 1, // Solo 1 retry per evitare errori multipli
    retryDelay: 1000,
  });
}

/**
 * Hook per dettaglio media
 */
export function useMediaDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.mediaDetail(id),
    queryFn: () => cmsMediaService.getMedia(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minuti cache
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Hook per upload files
 */
export function useUploadMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      files,
      options,
    }: {
      files: File[];
      options?: MediaUploadOptions;
    }) => cmsMediaService.uploadFiles(files, options),
    onSuccess: (data, variables) => {
      // Invalida cache lista media
      queryClient.invalidateQueries({ queryKey: ['cms-media'] });

      // Toast success
      const count = data.length;
      toast.success(
        `${count} ${count === 1 ? 'file caricato' : 'file caricati'} con successo`
      );
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || 'Errore durante il caricamento'
      );
    },
  });
}

/**
 * Hook per update media
 */
export function useUpdateMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MediaUpdateData }) =>
      cmsMediaService.updateMedia(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.mediaDetail(id) });

      // Snapshot previous value
      const previousMedia = queryClient.getQueryData<MediaFile>(
        QUERY_KEYS.mediaDetail(id)
      );

      // Optimistically update
      if (previousMedia) {
        queryClient.setQueryData<MediaFile>(QUERY_KEYS.mediaDetail(id), {
          ...previousMedia,
          ...data,
        });
      }

      return { previousMedia };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousMedia) {
        queryClient.setQueryData(
          QUERY_KEYS.mediaDetail(variables.id),
          context.previousMedia
        );
      }
      toast.error(
        error.response?.data?.error || 'Errore durante l\'aggiornamento'
      );
    },
    onSuccess: (data, variables) => {
      // Invalida cache
      queryClient.invalidateQueries({ queryKey: ['cms-media'] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.mediaDetail(variables.id),
      });

      toast.success('Media aggiornato con successo');
    },
  });
}

/**
 * Hook per delete media
 */
export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cmsMediaService.deleteMedia(id),
    onSuccess: () => {
      // Invalida cache
      queryClient.invalidateQueries({ queryKey: ['cms-media'] });
      toast.success('Media eliminato con successo');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || 'Errore durante l\'eliminazione'
      );
    },
  });
}

/**
 * Hook per lista folders
 */
export function useFolders(parentId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.folders(parentId),
    queryFn: () => cmsMediaService.listFolders(parentId),
    staleTime: 1000 * 60 * 10, // 10 minuti cache (folders cambiano raramente)
  });
}

/**
 * Hook per create folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FolderCreateData) => cmsMediaService.createFolder(data),
    onSuccess: (data) => {
      // Invalida cache folders
      queryClient.invalidateQueries({ queryKey: ['cms-folders'] });
      toast.success(`Cartella "${data.name}" creata con successo`);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || 'Errore durante la creazione della cartella'
      );
    },
  });
}

/**
 * Hook per delete folder
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cmsMediaService.deleteFolder(id),
    onSuccess: () => {
      // Invalida cache
      queryClient.invalidateQueries({ queryKey: ['cms-folders'] });
      toast.success('Cartella eliminata con successo');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.error || 'Errore durante l\'eliminazione della cartella'
      );
    },
  });
}

/**
 * Hook aggregato per tutte le operazioni media library
 */
export function useMediaLibrary(filters?: MediaListFilters) {
  const mediaList = useMediaList(filters);
  const uploadMedia = useUploadMedia();
  const updateMedia = useUpdateMedia();
  const deleteMedia = useDeleteMedia();
  const folders = useFolders(filters?.folderId);
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();

  return {
    // Data
    media: mediaList.data?.media || [],
    pagination: mediaList.data?.pagination,
    folders: folders.data || [],

    // Loading states
    isLoading: mediaList.isLoading || folders.isLoading,
    isUploading: uploadMedia.isPending,
    isUpdating: updateMedia.isPending,
    isDeleting: deleteMedia.isPending,

    // Actions
    upload: uploadMedia.mutate,
    update: updateMedia.mutate,
    delete: deleteMedia.mutate,
    createFolder: createFolder.mutate,
    deleteFolder: deleteFolder.mutate,
    refetch: mediaList.refetch,
  };
}
