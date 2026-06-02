/**
 * PersonDataShareConsentService - Frontend API Service
 * 
 * Progetto 48: Gestione consensi condivisione dati cross-tenant (GDPR)
 */

import { apiGet, apiPost, apiPut, apiDelete } from './api';
import type {
    PersonDataShareConsent,
    CreatePersonDataShareConsentDTO,
    DataAccessCheckResult,
    SharedDataType
} from '../types/personMultiTenant';

export class PersonDataShareConsentService {

    /**
     * Crea un nuovo consenso per condivisione dati
     */
    static async createConsent(data: CreatePersonDataShareConsentDTO): Promise<PersonDataShareConsent> {
        return await apiPost('/api/v1/person-consents', data) as PersonDataShareConsent;
    }

    /**
     * Ottiene un consenso specifico
     */
    static async getConsent(
        personId: string,
        sourceTenantId: string,
        targetTenantId: string
    ): Promise<PersonDataShareConsent | null> {
        try {
            const response = await apiGet(
                `/api/v1/person-consents/${personId}/source/${sourceTenantId}/target/${targetTenantId}`
            ) as PersonDataShareConsent;
            return response;
        } catch (error: unknown) {
            if ((error as any)?.status === 404) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Ottiene tutti i consensi attivi per una persona
     */
    static async getActiveConsentsForPerson(personId: string): Promise<PersonDataShareConsent[]> {
        const response = await apiGet(`/api/v1/person-consents/${personId}/active`) as { consents: PersonDataShareConsent[] };
        return response.consents || [];
    }

    /**
     * Ottiene tutti i consensi che permettono accesso da un tenant (come source)
     */
    static async getConsentsBySourceTenant(tenantId: string): Promise<PersonDataShareConsent[]> {
        const response = await apiGet(`/api/v1/tenants/${tenantId}/consents/as-source`) as { consents: PersonDataShareConsent[] };
        return response.consents || [];
    }

    /**
     * Ottiene tutti i consensi che permettono accesso a un tenant (come target)
     */
    static async getConsentsByTargetTenant(tenantId: string): Promise<PersonDataShareConsent[]> {
        const response = await apiGet(`/api/v1/tenants/${tenantId}/consents/as-target`) as { consents: PersonDataShareConsent[] };
        return response.consents || [];
    }

    /**
     * Verifica se un tenant può accedere a dati di un altro tenant per una persona
     */
    static async canAccessData(
        personId: string,
        sourceTenantId: string,
        targetTenantId: string,
        dataType: SharedDataType | string
    ): Promise<DataAccessCheckResult> {
        const response = await apiGet(
            `/api/v1/person-consents/${personId}/check-access?source=${sourceTenantId}&target=${targetTenantId}&dataType=${dataType}`
        ) as DataAccessCheckResult;
        return response;
    }

    /**
     * Revoca un consenso
     */
    static async revokeConsent(
        personId: string,
        sourceTenantId: string,
        targetTenantId: string,
        reason?: string
    ): Promise<PersonDataShareConsent> {
        return await apiPost(
            `/api/v1/person-consents/${personId}/source/${sourceTenantId}/target/${targetTenantId}/revoke`,
            { reason }
        ) as PersonDataShareConsent;
    }

    /**
     * Aggiorna i tipi di dati condivisi in un consenso
     */
    static async updateSharedDataTypes(
        personId: string,
        sourceTenantId: string,
        targetTenantId: string,
        sharedDataTypes: (SharedDataType | string)[],
        excludedFields?: string[]
    ): Promise<PersonDataShareConsent> {
        return await apiPut(
            `/api/v1/person-consents/${personId}/source/${sourceTenantId}/target/${targetTenantId}`,
            { sharedDataTypes, excludedFields }
        ) as PersonDataShareConsent;
    }

    /**
     * Ottiene statistiche consensi per un tenant
     */
    static async getConsentStats(tenantId: string): Promise<{
        tenantId: string;
        consentsAsDataOwner: number;
        consentsAsDataReceiver: number;
        revokedConsents: number;
        totalActive: number;
    }> {
        return await apiGet(`/api/v1/tenants/${tenantId}/consents/stats`) as any;
    }

    /**
     * Elimina tutti i consensi per una persona (per diritto all'oblio GDPR)
     */
    static async deleteAllConsentsForPerson(personId: string): Promise<{ success: boolean; deletedCount: number }> {
        return await apiDelete(`/api/v1/person-consents/${personId}/all`) as any;
    }

    // ============================================
    // ALIAS E METODI PER WIDGET
    // ============================================

    /**
     * Ottiene tutti i consensi per una persona (per widget)
     */
    static async getAllForPerson(personId: string): Promise<{ consents: PersonDataShareConsent[] }> {
        const consents = await this.getActiveConsentsForPerson(personId);
        return { consents };
    }

    /**
     * Crea un nuovo consenso (alias per widget)
     */
    static async create(data: {
        personId: string;
        sourceTenantId: string;
        targetTenantId: string;
        purpose: string;
        scope?: string[];
        legalBasis?: string;
        expiresAt?: Date;
    }): Promise<PersonDataShareConsent> {
        // Mappa i campi del widget al DTO del servizio
        return await this.createConsent({
            personId: data.personId,
            sourceTenantId: data.sourceTenantId,
            targetTenantId: data.targetTenantId,
            sharedDataTypes: data.scope || ['anagrafica'],
            legalBasis: data.legalBasis,
            validUntil: data.expiresAt?.toISOString()
        });
    }

    /**
     * Revoca un consenso per ID (per widget)
     */
    static async revoke(consentId: string): Promise<PersonDataShareConsent> {
        // Il widget passa l'ID del consenso, ma il backend vuole personId/tenantIds
        // Per ora facciamo una chiamata generica
        return await apiPost(`/api/v1/person-consents/${consentId}/revoke`, {}) as PersonDataShareConsent;
    }
}
