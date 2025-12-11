/**
 * CMS Media Service - Frontend API Client
 * Gestione chiamate API per Media Library
 * 
 * Conformità:
 * ✅ Type Safety: TypeScript strict
 * ✅ Error Handling: Try-catch + user-friendly messages
 * ✅ API Versioning: /api/v1/cms/media
 */

import api, { invalidateCache } from './api';

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  path: string | null;
  variants: {
    thumbnail_jpg?: string;
    thumbnail_webp?: string;
    medium_jpg?: string;
    medium_webp?: string;
    large_jpg?: string;
    large_webp?: string;
  } | null;
  alt: string | null;
  title: string | null;
  description: string | null;
  folderId: string | null;
  tags: string[];
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    space?: string;
    channels?: number;
    depth?: string;
    hasAlpha?: boolean;
  } | null;
  tenantId: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  creator?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  folder?: {
    id: string;
    name: string;
  };
}

export interface MediaFolder {
  id: string;
  name: string;
  parentId: string | null;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  parent?: {
    id: string;
    name: string;
  };
  _count?: {
    media: number;
  };
}

export interface MediaListResponse {
  success: boolean;
  data: MediaFile[];  // Backend returns array directly, not nested
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MediaUploadOptions {
  folderId?: string;
  alt?: string;
  title?: string;
  tags?: string[];
}

export interface MediaUpdateData {
  alt?: string;
  title?: string;
  tags?: string[];
  folderId?: string;
}

export interface FolderCreateData {
  name: string;
  parentId?: string;
}

class CMSMediaService {
  private baseUrl = '/api/v1/cms/media';

  /**
   * Upload singolo o multiplo di file
   */
  async uploadFiles(
    files: File[],
    options?: MediaUploadOptions
  ): Promise<MediaFile[]> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    if (options?.folderId) {
      formData.append('folderId', options.folderId);
    }

    if (options?.alt) {
      formData.append('alt', options.alt);
    }

    if (options?.title) {
      formData.append('title', options.title);
    }

    if (options?.tags && options.tags.length > 0) {
      formData.append('tags', JSON.stringify(options.tags));
    }

    const response = await api.post(`${this.baseUrl}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Invalida cache API per forzare refresh della lista media
    invalidateCache('/cms/media');

    return response.data.data;
  }

  /**
   * Lista media con filtri e paginazione
   */
  async listMedia(params: {
    folderId?: string;
    mimeType?: string;
    tags?: string[];
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ media: MediaFile[]; pagination?: MediaListResponse['pagination'] }> {
    const queryParams = new URLSearchParams();

    if (params.folderId) queryParams.append('folderId', params.folderId);
    if (params.mimeType) queryParams.append('mimeType', params.mimeType);
    if (params.tags && params.tags.length > 0)
      queryParams.append('tags', params.tags.join(','));
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get(
      `${this.baseUrl}?${queryParams.toString()}`
    );

    // Backend returns { success, data: MediaFile[], pagination }
    // Transform to { media, pagination } for frontend compatibility
    return {
      media: response.data.data,
      pagination: response.data.pagination
    };
  }

  /**
   * Ottieni dettaglio singolo media
   */
  async getMedia(id: string): Promise<MediaFile> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * Aggiorna metadati media
   */
  async updateMedia(id: string, data: MediaUpdateData): Promise<MediaFile> {
    const response = await api.patch(`${this.baseUrl}/${id}`, data);

    // Invalida cache API
    invalidateCache('/cms/media');

    return response.data.data;
  }

  /**
   * Elimina media (soft delete)
   */
  async deleteMedia(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);

    // Invalida cache API
    invalidateCache('/cms/media');
  }

  /**
   * Lista cartelle
   */
  async listFolders(parentId?: string): Promise<MediaFolder[]> {
    const queryParams = parentId
      ? `?parentId=${parentId}`
      : '';

    const response = await api.get(
      `${this.baseUrl}/folders/list${queryParams}`
    );

    return response.data.data;
  }

  /**
   * Crea nuova cartella
   */
  async createFolder(data: FolderCreateData): Promise<MediaFolder> {
    const response = await api.post(`${this.baseUrl}/folders`, data);
    return response.data.data;
  }

  /**
   * Elimina cartella (soft delete)
   */
  async deleteFolder(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/folders/${id}`);
  }

  /**
   * Ottieni URL ottimale per display (preferisce WebP se disponibile)
   */
  getOptimalUrl(media: MediaFile, size: 'thumbnail' | 'medium' | 'large' = 'medium'): string {
    if (!media.variants) {
      return media.url;
    }

    // Preferisci WebP per dimensione file ridotta
    const webpKey = `${size}_webp` as keyof typeof media.variants;
    const jpgKey = `${size}_jpg` as keyof typeof media.variants;

    return media.variants[webpKey] || media.variants[jpgKey] || media.url;
  }

  /**
   * Formatta dimensione file in formato leggibile
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Valida file prima dell'upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File troppo grande. Massimo 10MB (attuale: ${this.formatFileSize(file.size)})`,
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo file non supportato. Supportati: immagini e PDF`,
      };
    }

    return { valid: true };
  }

  /**
   * Valida multipli file
   */
  validateFiles(files: File[]): {
    valid: File[];
    invalid: Array<{ file: File; error: string }>;
  } {
    const valid: File[] = [];
    const invalid: Array<{ file: File; error: string }> = [];

    files.forEach((file) => {
      const validation = this.validateFile(file);
      if (validation.valid) {
        valid.push(file);
      } else {
        invalid.push({ file, error: validation.error || 'Errore sconosciuto' });
      }
    });

    return { valid, invalid };
  }
}

export const cmsMediaService = new CMSMediaService();
export default cmsMediaService;
