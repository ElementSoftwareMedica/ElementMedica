/**
 * Management Documents API
 * Client per la gestione documenti interni (DocFolder, InternalDocument)
 *
 * Base path: /api/v1/management/documenti
 *
 * @project P74 - Document Management & Email Templates
 */

import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './api';

const BASE = '/api/v1/management/documenti';

// ============================================================
// TYPES
// ============================================================

export type DocFolderTipo = 'GENERICO' | 'INTERNO' | 'MARKETING';
export type InternalDocumentTipo = 'PROCEDURA' | 'MODULO' | 'MARKETING' | 'ALTRO';

export interface DocFolder {
    id: string;
    tenantId: string;
    nome: string;
    descrizione?: string;
    tipo: DocFolderTipo;
    parentId?: string | null;
    children?: DocFolder[];
    ordine: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    createdBy?: string | null;
    _count?: { documents: number };
}

export interface InternalDocument {
    id: string;
    tenantId: string;
    folderId?: string | null;
    folder?: Pick<DocFolder, 'id' | 'nome' | 'tipo'> | null;
    nome: string;
    descrizione?: string | null;
    tipo: InternalDocumentTipo;
    fileUrl: string;
    fileName: string;
    fileSize?: number | null;
    mimeType?: string | null;
    versione: string;
    revisionNote?: string | null;
    isCurrentVersion: boolean;
    parentDocId?: string | null;
    tags: string[];
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy?: string | null;
    deletedAt?: string | null;
    versions?: Array<Pick<InternalDocument, 'id' | 'versione' | 'revisionNote' | 'createdAt' | 'isCurrentVersion' | 'createdBy'>>;
}

export interface MarketingDocument {
    id: string;
    nome: string;
    descrizione?: string | null;
    fileUrl: string;
    fileName: string;
    fileSize?: number | null;
    mimeType?: string | null;
}

export interface PaginatedDocuments {
    data: InternalDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}

// ============================================================
// FOLDER API
// ============================================================

export const docFolderApi = {
    getTree: (tipo?: DocFolderTipo) =>
        apiGet<{ success: boolean; data: DocFolder[] }>(`${BASE}/cartelle/tree`, tipo ? { tipo } : undefined)
            .then(res => res.data || []),

    getAll: (params?: { tipo?: DocFolderTipo; parentId?: string; includeChildren?: boolean }) =>
        apiGet<{ success: boolean; data: DocFolder[] }>(`${BASE}/cartelle`, params)
            .then(res => res.data || []),

    create: (data: { nome: string; descrizione?: string; tipo?: DocFolderTipo; parentId?: string; ordine?: number }) =>
        apiPost<{ success: boolean; data: DocFolder }>(`${BASE}/cartelle`, data)
            .then(res => res.data),

    update: (id: string, data: Partial<{ nome: string; descrizione: string; ordine: number; isActive: boolean }>) =>
        apiPut<{ success: boolean; data: DocFolder }>(`${BASE}/cartelle/${id}`, data)
            .then(res => res.data),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${BASE}/cartelle/${id}`)
};

// ============================================================
// DOCUMENT API
// ============================================================

export const internalDocumentApi = {
    getAll: (params?: {
        folderId?: string | null;
        tipo?: InternalDocumentTipo;
        search?: string;
        isCurrentVersion?: boolean;
        page?: number;
        limit?: number;
    }) => {
        const query: Record<string, unknown> = { ...params };
        if (params?.folderId === null) query.folderId = '';
        return apiGet<{ success: boolean } & PaginatedDocuments>(`${BASE}`, query)
            .then(res => ({
                data: res.data || [],
                total: res.total || 0,
                page: res.page || 1,
                limit: res.limit || 20,
                pages: res.pages || 1
            }));
    },

    getById: (id: string) =>
        apiGet<{ success: boolean; data: InternalDocument }>(`${BASE}/${id}`)
            .then(res => res.data),

    getMarketing: () =>
        apiGet<{ success: boolean; data: MarketingDocument[] }>(`${BASE}/marketing`)
            .then(res => res.data || []),

    create: (formData: FormData) =>
        apiUpload<{ success: boolean; data: InternalDocument }>(`${BASE}`, formData)
            .then(res => res.data),


    update: (id: string, data: Partial<Pick<InternalDocument, 'nome' | 'descrizione' | 'tipo' | 'tags' | 'isPublic' | 'folderId'>>) =>
        apiPut<{ success: boolean; data: InternalDocument }>(`${BASE}/${id}`, data)
            .then(res => res.data),

    createRevision: (id: string, formData: FormData) =>
        apiUpload<{ success: boolean; data: InternalDocument }>(`${BASE}/${id}/revisione`, formData)
            .then(res => res.data),


    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${BASE}/${id}`)
};
