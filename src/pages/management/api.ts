/**
 * Management API Service
 * @project 43 - Tenant Roles Management System
 * 
 * IMPORTANT: Use apiGet/apiPost/apiPut/apiDelete wrappers instead of apiClient directly
 * to ensure proper request interceptor handling and avoid 'toUpperCase' errors.
 */

import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api';
import type {
    AccessibleTenantsResponse,
    PersonTenantAccess,
    PersonTenantAccessResponse,
    FeaturesResponse,
    FeaturePreset,
    TenantAccessLevel,
    Tenant
} from './types';

const BASE_URL = '/api/v1/person-tenant-access';
const PERSONS_URL = '/api/v1/persons';
const ROLES_URL = '/api/v1/roles';
const TENANTS_URL = '/api/v1/tenants';

/**
 * User/Person data types for API
 */
export interface CreatePersonData {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    taxCode?: string;
    birthDate?: string;
    password?: string;
    globalRole?: 'ADMIN' | 'USER' | null;
    roleType?: string;
    tenantId?: string;
    companyId?: string;
}

export interface UpdatePersonData extends Partial<CreatePersonData> {
    isActive?: boolean;
    status?: string;
}

export interface Person {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    taxCode?: string;
    birthDate?: string;
    globalRole?: string;
    tenantId?: string;
    isActive: boolean;
    status?: string;
    createdAt: string;
    updatedAt?: string;
    personRoles?: PersonRole[];
    tenantAccess?: PersonTenantAccess[];
}

export interface PersonRole {
    id: string;
    personId: string;
    roleType: string;
    tenantId: string;
    companyId?: string;
    isActive: boolean;
    isPrimary: boolean;
}

export interface Role {
    id: string;
    name: string;
    roleType: string;
    displayName?: string;
    description?: string;
    isActive?: boolean;
    isSystemRole?: boolean;
    permissions: string[];
}

export interface CreateRoleData {
    name: string;
    roleType: string;
    displayName?: string;
    description?: string;
    permissions: string[];
    tenantId?: string;
}

export interface UpdateRoleData extends Partial<CreateRoleData> {
    isActive?: boolean;
}

export interface TenantData {
    name: string;
    slug: string;
    domain?: string;
    billingPlan?: string;
    settings?: Record<string, unknown>;
    isActive?: boolean;
}

/**
 * API per gestione accessi tenant
 */
export const managementApi = {
    /**
     * Ottiene i tenant accessibili dall'utente corrente
     */
    async getMyTenants(): Promise<AccessibleTenantsResponse> {
        return apiGet<AccessibleTenantsResponse>(`${BASE_URL}/my-tenants`);
    },

    /**
     * Ottiene i tenant accessibili da un utente specifico
     */
    async getPersonTenants(personId: string): Promise<AccessibleTenantsResponse> {
        return apiGet<AccessibleTenantsResponse>(`${BASE_URL}/persons/${personId}/tenants`);
    },

    /**
     * Concede accesso a un tenant per un utente
     */
    async grantTenantAccess(
        personId: string,
        data: {
            tenantId: string;
            accessLevel?: TenantAccessLevel;
            enabledFeatures?: string[];
            defaultRoleType?: string;
            isPrimary?: boolean;
            validUntil?: string;
        }
    ): Promise<PersonTenantAccessResponse> {
        return apiPost<PersonTenantAccessResponse>(`${BASE_URL}/persons/${personId}/tenants`, data);
    },

    /**
     * Aggiorna l'accesso a un tenant per un utente
     */
    async updateTenantAccess(
        personId: string,
        tenantId: string,
        data: {
            accessLevel?: TenantAccessLevel;
            enabledFeatures?: string[];
            defaultRoleType?: string;
            isPrimary?: boolean;
            validUntil?: string;
        }
    ): Promise<PersonTenantAccessResponse> {
        return apiPut<PersonTenantAccessResponse>(`${BASE_URL}/persons/${personId}/tenants/${tenantId}`, data);
    },

    /**
     * Revoca l'accesso a un tenant per un utente
     */
    async revokeTenantAccess(personId: string, tenantId: string): Promise<PersonTenantAccessResponse> {
        return apiDelete<PersonTenantAccessResponse>(`${BASE_URL}/persons/${personId}/tenants/${tenantId}`);
    },

    /**
     * Imposta il tenant primario per un utente
     */
    async setPrimaryTenant(personId: string, tenantId: string): Promise<PersonTenantAccessResponse> {
        return apiPut<PersonTenantAccessResponse>(`${BASE_URL}/persons/${personId}/primary-tenant`, { tenantId });
    },

    /**
     * Ottiene tutti gli utenti con accesso a un tenant
     */
    async getTenantPersons(
        tenantId: string,
        options?: { accessLevel?: TenantAccessLevel; feature?: string; isActive?: boolean }
    ): Promise<{ success: boolean; data: PersonTenantAccess[]; meta: { total: number; tenantId: string } }> {
        const params: Record<string, string> = {};
        if (options?.accessLevel) params.accessLevel = options.accessLevel;
        if (options?.feature) params.feature = options.feature;
        if (options?.isActive !== undefined) params.isActive = String(options.isActive);

        return apiGet<{ success: boolean; data: PersonTenantAccess[]; meta: { total: number; tenantId: string } }>(
            `${BASE_URL}/tenants/${tenantId}/persons`,
            params
        );
    },

    /**
     * Esegue la migrazione degli utenti esistenti
     */
    async migrateUsers(): Promise<{ success: boolean; data: { migrated: number; skipped: number; total: number }; message: string }> {
        return apiPost<{ success: boolean; data: { migrated: number; skipped: number; total: number }; message: string }>(`${BASE_URL}/migrate`, {});
    },

    /**
     * Ottiene la lista delle features disponibili
     */
    async getFeatures(): Promise<FeaturesResponse> {
        return apiGet<FeaturesResponse>(`${BASE_URL}/features`);
    },

    /**
     * Ottiene i preset di features per i diversi tipi di tenant
     */
    async getFeaturePresets(): Promise<{ success: boolean; data: FeaturePreset[]; meta: { total: number; availableFeatures: string[] } }> {
        return apiGet<{ success: boolean; data: FeaturePreset[]; meta: { total: number; availableFeatures: string[] } }>(`${BASE_URL}/presets`);
    },

    // =============================================
    // PERSONS API - Gestione Utenti
    // =============================================

    /**
     * Ottiene lista utenti con paginazione
     */
    async getPersons(params?: {
        limit?: number;
        offset?: number;
        search?: string;
        tenantId?: string;
        roleType?: string;
        isActive?: boolean;
    }): Promise<{ data: Person[]; total: number }> {
        const queryParams: Record<string, string> = {};
        if (params?.limit) queryParams.limit = String(params.limit);
        if (params?.offset) queryParams.offset = String(params.offset);
        if (params?.search) queryParams.search = params.search;
        if (params?.tenantId) queryParams.tenantId = params.tenantId;
        if (params?.roleType) queryParams.roleType = params.roleType;
        if (params?.isActive !== undefined) queryParams.isActive = String(params.isActive);

        return apiGet<{ data: Person[]; total: number }>(PERSONS_URL, queryParams);
    },

    /**
     * Ottiene un utente per ID
     */
    async getPerson(id: string): Promise<{ data: Person }> {
        return apiGet<{ data: Person }>(`${PERSONS_URL}/${id}`);
    },

    /**
     * Crea un nuovo utente
     */
    async createPerson(data: CreatePersonData): Promise<{ success: boolean; data: Person; message?: string }> {
        return apiPost<{ success: boolean; data: Person; message?: string }>(PERSONS_URL, data);
    },

    /**
     * Aggiorna un utente esistente
     */
    async updatePerson(id: string, data: UpdatePersonData): Promise<{ success: boolean; data: Person; message?: string }> {
        return apiPut<{ success: boolean; data: Person; message?: string }>(`${PERSONS_URL}/${id}`, data);
    },

    /**
     * Elimina un utente (soft delete)
     */
    async deletePerson(id: string): Promise<{ success: boolean; message?: string }> {
        return apiDelete<{ success: boolean; message?: string }>(`${PERSONS_URL}/${id}`);
    },

    /**
     * Aggiunge un ruolo a un utente
     */
    async addPersonRole(personId: string, roleType: string, tenantId?: string): Promise<{ success: boolean; data: PersonRole; message?: string }> {
        return apiPost<{ success: boolean; data: PersonRole; message?: string }>(`${PERSONS_URL}/${personId}/roles`, {
            roleType,
            ...(tenantId && { tenantId })
        });
    },

    /**
     * Rimuove un ruolo da un utente
     */
    async removePersonRole(personId: string, roleType: string): Promise<{ success: boolean; message?: string }> {
        return apiDelete<{ success: boolean; message?: string }>(`${PERSONS_URL}/${personId}/roles/${roleType}`);
    },

    /**
     * Cambia lo stato di un utente (attivo/inattivo)
     */
    async togglePersonStatus(personId: string, isActive: boolean): Promise<{ success: boolean; data: Person; message?: string }> {
        return apiPut<{ success: boolean; data: Person; message?: string }>(`${PERSONS_URL}/${personId}/status`, { isActive });
    },

    /**
     * Reset password utente
     */
    async resetPersonPassword(personId: string): Promise<{ success: boolean; message?: string }> {
        return apiPost<{ success: boolean; message?: string }>(`${PERSONS_URL}/${personId}/reset-password`, {});
    },

    // =============================================
    // ROLES API - Gestione Ruoli
    // =============================================

    /**
     * Ottiene lista ruoli
     */
    async getRoles(params?: { tenantId?: string; isActive?: boolean }): Promise<{ success: boolean; data: { data: Role[]; pagination?: unknown } }> {
        const queryParams: Record<string, string> = {};
        if (params?.tenantId) queryParams.tenantId = params.tenantId;
        if (params?.isActive !== undefined) queryParams.isActive = String(params.isActive);

        return apiGet<{ success: boolean; data: { data: Role[]; pagination?: unknown } }>(ROLES_URL, queryParams);
    },

    /**
     * Ottiene un ruolo per ID
     */
    async getRole(id: string): Promise<{ success: boolean; data: Role }> {
        return apiGet<{ success: boolean; data: Role }>(`${ROLES_URL}/${id}`);
    },

    /**
     * Crea un nuovo ruolo
     */
    async createRole(data: CreateRoleData): Promise<{ success: boolean; data: Role; message?: string }> {
        return apiPost<{ success: boolean; data: Role; message?: string }>(ROLES_URL, data);
    },

    /**
     * Aggiorna un ruolo esistente
     */
    async updateRole(id: string, data: UpdateRoleData): Promise<{ success: boolean; data: Role; message?: string }> {
        return apiPut<{ success: boolean; data: Role; message?: string }>(`${ROLES_URL}/${id}`, data);
    },

    /**
     * Elimina un ruolo
     */
    async deleteRole(id: string): Promise<{ success: boolean; message?: string }> {
        return apiDelete<{ success: boolean; message?: string }>(`${ROLES_URL}/${id}`);
    },

    /**
     * Sposta un ruolo nella gerarchia
     */
    async moveRoleInHierarchy(
        roleId: string,
        newParentId: string | null,
        newLevel?: number
    ): Promise<{ success: boolean; data?: unknown; message?: string }> {
        return apiPut<{ success: boolean; data?: unknown; message?: string }>(`${ROLES_URL}/hierarchy/move`, {
            roleId,
            newParentId,
            newLevel
        });
    },

    // =============================================
    // TENANTS API - Gestione Tenant
    // =============================================

    /**
     * Ottiene lista tenant (admin only)
     */
    async getTenants(): Promise<{ success: boolean; data: Tenant[] }> {
        return apiGet<{ success: boolean; data: Tenant[] }>(TENANTS_URL);
    },

    /**
     * Ottiene un tenant per ID
     */
    async getTenant(id: string): Promise<{ success: boolean; data: Tenant }> {
        return apiGet<{ success: boolean; data: Tenant }>(`${TENANTS_URL}/${id}`);
    },

    /**
     * Crea un nuovo tenant
     */
    async createTenant(data: TenantData): Promise<{ success: boolean; data: Tenant; message?: string }> {
        return apiPost<{ success: boolean; data: Tenant; message?: string }>(TENANTS_URL, data);
    },

    /**
     * Aggiorna un tenant esistente
     */
    async updateTenant(id: string, data: Partial<TenantData>): Promise<{ success: boolean; data: Tenant; message?: string }> {
        return apiPut<{ success: boolean; data: Tenant; message?: string }>(`${TENANTS_URL}/${id}`, data);
    },

    /**
     * Elimina un tenant
     */
    async deleteTenant(id: string): Promise<{ success: boolean; message?: string }> {
        return apiDelete<{ success: boolean; message?: string }>(`${TENANTS_URL}/${id}`);
    }
};

// Re-export types
export type { Tenant, PersonTenantAccess, TenantAccessLevel, Feature } from './types';

export default managementApi;