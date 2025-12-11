/**
 * Backup Service - Frontend
 * 
 * Client API per gestione backup e restore database
 */

import api from './api';

// Response wrapper type per API
interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export interface EntityInfo {
    name: string;
    model: string;
    label: string;
    count: number;
    large?: boolean;
    defaultOff?: boolean;
    priority: number;
    dependencies?: string[];
}

export interface DependencyWarning {
    entity: string;
    label: string;
    message: string;
    missingDeps: string[];
}

export interface DependencyValidation {
    valid: boolean;
    missing: Record<string, string[]>;
    suggestions: string[];
    warnings: DependencyWarning[];
}

export interface CategoryInfo {
    label: string;
    icon: string;
    entities: EntityInfo[];
}

export interface EntitiesResponse {
    categories: Record<string, CategoryInfo>;
    totals: {
        entities: number;
        records: number;
    };
}

export interface BackupInfo {
    id: string;
    filename?: string;
    size: number;
    createdAt: string;
    entities: number;
    records: number;
    corrupted?: boolean;
}

export interface BackupManifest {
    id: string;
    createdAt: string;
    createdBy?: string;
    tenantId?: string;
    version: string;
    entities: Array<{
        name: string;
        model: string;
        count: number;
        filename: string;
    }>;
    totalRecords: number;
    checksums: Record<string, string>;
    media?: {
        uploadsSize: number;
        filesCount: number;
    };
}

export interface ValidationResult {
    valid: boolean;
    manifest: BackupManifest;
    errors: string[];
    warnings: string[];
}

export interface PreviewResult {
    valid: boolean;
    manifest: BackupManifest;
    entities: BackupManifest['entities'];
    totalRecords: number;
    createdAt: string;
    errors: string[];
    warnings: string[];
}

export interface RestoreResult {
    success: Array<{
        name: string;
        imported: number;
        updated: number;
        skipped: number;
    }>;
    errors: Array<{
        name: string;
        error: string;
    }>;
    skipped: string[];
    mediaRestored: boolean;
}

export interface UploadResult {
    tempPath: string;
    filename: string;
    size: number;
    validation: ValidationResult;
}

const backupService = {
    /**
     * Ottiene lista entità con conteggi
     */
    async getEntities(): Promise<EntitiesResponse> {
        const response = await api.get<ApiResponse<EntitiesResponse>>('/api/v1/backup/entities');
        return response.data.data;
    },

    /**
     * Valida le dipendenze delle entità selezionate
     */
    async validateDependencies(entities: string[]): Promise<DependencyValidation> {
        const response = await api.post<ApiResponse<DependencyValidation>>('/api/v1/backup/validate-dependencies', {
            entities
        });
        return response.data.data;
    },

    /**
     * Crea nuovo backup
     */
    async createBackup(entities: string[], includeMedia = false): Promise<BackupInfo> {
        const response = await api.post<ApiResponse<BackupInfo>>('/api/v1/backup/create', {
            entities,
            includeMedia
        });
        return response.data.data;
    },

    /**
     * Scarica backup
     */
    async downloadBackup(id: string): Promise<void> {
        const response = await api.get<Blob>(`/api/v1/backup/download/${id}`, {
            responseType: 'blob'
        });

        // Crea link per download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${id}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    /**
     * Upload file backup
     */
    async uploadBackup(file: File): Promise<UploadResult> {
        const formData = new FormData();
        formData.append('backup', file);

        const response = await api.post<ApiResponse<UploadResult>>('/api/v1/backup/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data.data;
    },

    /**
     * Preview contenuto backup
     */
    async previewBackup(tempPath: string): Promise<PreviewResult> {
        const response = await api.post<ApiResponse<PreviewResult>>('/api/v1/backup/preview', { tempPath });
        return response.data.data;
    },

    /**
     * Esegue restore
     */
    async restoreBackup(
        tempPath: string,
        entities?: string[],
        overwrite = false
    ): Promise<RestoreResult> {
        const response = await api.post<ApiResponse<RestoreResult>>('/api/v1/backup/restore', {
            tempPath,
            entities,
            overwrite
        });
        return response.data.data;
    },

    /**
     * Lista backup precedenti
     */
    async getHistory(): Promise<BackupInfo[]> {
        const response = await api.get<ApiResponse<BackupInfo[]>>('/api/v1/backup/history');
        return response.data.data;
    },

    /**
     * Elimina backup
     */
    async deleteBackup(id: string): Promise<void> {
        await api.delete(`/api/v1/backup/${id}`);
    },

    /**
     * Formatta dimensione file
     */
    formatSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Formatta conteggio record
     */
    formatCount(count: number): string {
        if (count >= 1000000) {
            return (count / 1000000).toFixed(1) + 'M';
        }
        if (count >= 1000) {
            return (count / 1000).toFixed(1) + 'k';
        }
        return count.toString();
    }
};

export default backupService;
