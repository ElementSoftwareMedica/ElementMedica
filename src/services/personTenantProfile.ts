/**
 * PersonTenantProfileService - Frontend API Service
 * 
 * Progetto 48: Gestione profili persona per tenant
 */

import { apiGet, apiPost, apiPut, apiDelete } from './api';
import type {
    PersonTenantProfile,
    PersonTenantProfilesResponse,
    CreatePersonTenantProfileDTO,
    UpdatePersonTenantProfileDTO
} from '../types/personMultiTenant';

export class PersonTenantProfileService {

    /**
     * Ottiene il profilo di una persona per il tenant corrente
     */
    static async getProfile(personId: string, tenantId: string): Promise<PersonTenantProfile | null> {
        try {
            const response = await apiGet(`/api/v1/person-profiles/${personId}/tenant/${tenantId}`) as PersonTenantProfile;
            return response;
        } catch (error: unknown) {
            if ((error as any)?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Ottiene tutti i profili di una persona (tutti i tenant a cui ha accesso)
     */
    static async getAllProfilesForPerson(personId: string): Promise<PersonTenantProfile[]> {
        const response = await apiGet(`/api/v1/person-profiles/${personId}`) as { profiles: PersonTenantProfile[] };
        return response.profiles || [];
    }

    /**
     * Ottiene tutti i profili in un tenant
     */
    static async getProfilesByTenant(
        tenantId: string,
        options: {
            status?: string;
            companyId?: string;
            siteId?: string;
            repartoId?: string;
            isActive?: boolean;
            page?: number;
            limit?: number;
        } = {}
    ): Promise<PersonTenantProfilesResponse> {
        const params = new URLSearchParams();

        if (options.status) params.append('status', options.status);
        if (options.companyId) params.append('companyId', options.companyId);
        if (options.siteId) params.append('siteId', options.siteId);
        if (options.repartoId) params.append('repartoId', options.repartoId);
        if (options.isActive !== undefined) params.append('isActive', options.isActive.toString());
        if (options.page) params.append('page', options.page.toString());
        if (options.limit) params.append('limit', options.limit.toString());

        const queryString = params.toString();
        const url = `/api/v1/tenants/${tenantId}/person-profiles${queryString ? `?${queryString}` : ''}`;

        return await apiGet(url) as PersonTenantProfilesResponse;
    }

    /**
     * Crea un nuovo profilo per una persona in un tenant
     */
    static async createProfile(data: CreatePersonTenantProfileDTO): Promise<PersonTenantProfile> {
        return await apiPost('/api/v1/person-profiles', data) as PersonTenantProfile;
    }

    /**
     * Aggiorna un profilo esistente
     */
    static async updateProfile(
        personId: string,
        tenantId: string,
        data: UpdatePersonTenantProfileDTO
    ): Promise<PersonTenantProfile> {
        return await apiPut(`/api/v1/person-profiles/${personId}/tenant/${tenantId}`, data) as PersonTenantProfile;
    }

    /**
     * Elimina un profilo (soft delete)
     */
    static async deleteProfile(personId: string, tenantId: string): Promise<void> {
        await apiDelete(`/api/v1/person-profiles/${personId}/tenant/${tenantId}`);
    }

    /**
     * Imposta un profilo come primario
     */
    static async setPrimaryProfile(personId: string, tenantId: string): Promise<PersonTenantProfile> {
        return await apiPost(`/api/v1/person-profiles/${personId}/tenant/${tenantId}/set-primary`, {}) as PersonTenantProfile;
    }

    /**
     * Ottiene il profilo primario di una persona
     */
    static async getPrimaryProfile(personId: string): Promise<PersonTenantProfile | null> {
        try {
            return await apiGet(`/api/v1/person-profiles/${personId}/primary`) as PersonTenantProfile;
        } catch (error: unknown) {
            if ((error as any)?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Cerca profili con criteri vari
     */
    static async searchProfiles(
        tenantId: string,
        criteria: {
            query?: string;
            status?: string;
            companyId?: string;
            specialties?: string[];
            certifications?: string[];
        }
    ): Promise<PersonTenantProfile[]> {
        const params = new URLSearchParams();

        if (criteria.query) params.append('query', criteria.query);
        if (criteria.status) params.append('status', criteria.status);
        if (criteria.companyId) params.append('companyId', criteria.companyId);
        if (criteria.specialties?.length) params.append('specialties', criteria.specialties.join(','));
        if (criteria.certifications?.length) params.append('certifications', criteria.certifications.join(','));

        const queryString = params.toString();
        const url = `/api/v1/tenants/${tenantId}/person-profiles/search${queryString ? `?${queryString}` : ''}`;

        const response = await apiGet(url) as { profiles: PersonTenantProfile[] };
        return response.profiles || [];
    }

    /**
     * Ottiene profili per ruolo
     */
    static async getProfilesByRole(tenantId: string, roleType: string | string[]): Promise<PersonTenantProfile[]> {
        const roles = Array.isArray(roleType) ? roleType.join(',') : roleType;
        const response = await apiGet(`/api/v1/tenants/${tenantId}/person-profiles/by-role?roleType=${roles}`) as { profiles: PersonTenantProfile[] };
        return response.profiles || [];
    }

    /**
     * Ottiene o crea un profilo (utile per auto-enrollment)
     */
    static async getOrCreateProfile(
        personId: string,
        tenantId: string,
        defaultData: Partial<CreatePersonTenantProfileDTO> = {}
    ): Promise<PersonTenantProfile> {
        return await apiPost('/api/v1/person-profiles/get-or-create', {
            personId,
            tenantId,
            ...defaultData
        }) as PersonTenantProfile;
    }

    // ============================================
    // ALIAS PER WIDGET (compatibilità)
    // ============================================

    /**
     * Alias di getAllProfilesForPerson per i widget
     */
    static async getAllForPerson(personId: string): Promise<{ profiles: PersonTenantProfile[] }> {
        const profiles = await this.getAllProfilesForPerson(personId);
        return { profiles };
    }

    /**
     * Alias di setPrimaryProfile per i widget
     */
    static async setPrimary(personId: string, tenantId: string): Promise<PersonTenantProfile> {
        return await this.setPrimaryProfile(personId, tenantId);
    }

    /**
     * Alias di deleteProfile per i widget
     */
    static async delete(personId: string, tenantId: string): Promise<void> {
        return await this.deleteProfile(personId, tenantId);
    }
}

export default PersonTenantProfileService;
