/**
 * P65 - ConsentFSE API Service
 * 
 * Servizio per chiamate API relative ai consensi FSE.
 * Usa il pattern standard apiGet/apiPost/etc.
 * 
 * @module services/consent-fse
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/services/api';

/**
 * Tipi TypeScript per ConsentFSE
 */
export interface ConsentType {
    tipo: string;
    label: string;
    description: string;
    required: boolean;
    legalReference: string;
}

export interface ClinicalDataType {
    tipo: string;
    label: string;
}

export interface DelegationType {
    tipo: string;
    label: string;
}

export interface CollectionMethod {
    tipo: string;
    label: string;
}

export interface ConsentFSETypes {
    consentTypes: ConsentType[];
    clinicalDataTypes: ClinicalDataType[];
    delegationTypes: DelegationType[];
    collectionMethods: CollectionMethod[];
}

export interface ConsentFSE {
    id: string;
    personId: string;
    tipoConsenso: string;
    consentGiven: boolean;
    revokedAt?: string;
    revokedReason?: string;
    modalitaRaccolta: string;
    documentoRiferimento?: string;
    validFrom: string;
    validUntil?: string;
    oscuramentoAttivo: boolean;
    tipiDatiOscurati: string[];
    delegatoId?: string;
    tipoDelega?: string;
    documentoDelega?: string;
    tenantId: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    delegato?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface ConsentMapItem extends ConsentType {
    consent: ConsentFSE | null;
    consentGiven: boolean;
    isExpired: boolean;
}

export interface PersonConsentsResponse {
    personId: string;
    tenantId: string;
    consents: Record<string, ConsentMapItem>;
    summary: {
        total: number;
        given: number;
        revoked: number;
        pending: number;
    };
}

export interface ObscurationStatus {
    personId: string;
    oscuramentoAttivo: boolean;
    tipiDatiOscurati: string[];
    tipiDatiOscuratiLabels: { tipo: string; label: string }[];
    availableTypes: { tipo: string; label: string; isObscured: boolean }[];
    message?: string;
}

export interface UpsertConsentRequest {
    tipoConsenso: string;
    consentGiven: boolean;
    modalitaRaccolta: string;
    documentoRiferimento?: string;
    validUntil?: string;
    delegatoId?: string;
    tipoDelega?: string;
    documentoDelega?: string;
}

export interface BatchConsentsRequest {
    consents: UpsertConsentRequest[];
}

export interface BatchConsentsResponse {
    personId: string;
    total: number;
    successful: number;
    failed: number;
    results: { tipoConsenso: string; success: boolean; data?: ConsentFSE }[];
    errors: { tipoConsenso: string; success: boolean; error: string }[];
}

/**
 * ConsentFSE API Service
 */
export const consentFSEApi = {
    /**
     * Ottieni i tipi di consenso disponibili
     */
    getTypes: (): Promise<ConsentFSETypes> => {
        return apiGet<ConsentFSETypes>('/api/v1/consent-fse/types');
    },

    /**
     * Ottieni tutti i consensi di un paziente
     */
    getPersonConsents: (personId: string): Promise<PersonConsentsResponse> => {
        return apiGet<PersonConsentsResponse>(`/api/v1/consent-fse/person/${personId}`);
    },

    /**
     * Crea o aggiorna un consenso
     */
    upsertConsent: (personId: string, data: UpsertConsentRequest): Promise<ConsentFSE> => {
        return apiPost<ConsentFSE>(`/api/v1/consent-fse/person/${personId}`, data);
    },

    /**
     * Crea o aggiorna multipli consensi
     */
    batchUpsertConsents: (personId: string, data: BatchConsentsRequest): Promise<BatchConsentsResponse> => {
        return apiPost<BatchConsentsResponse>(`/api/v1/consent-fse/person/${personId}/batch`, data);
    },

    /**
     * Revoca un consenso
     */
    revokeConsent: (consentId: string, reason: string): Promise<{ message: string; consent: ConsentFSE }> => {
        return apiPost<{ message: string; consent: ConsentFSE }>(`/api/v1/consent-fse/${consentId}/revoke`, { reason });
    },

    /**
     * Elimina tutti i consensi di un paziente
     */
    deletePersonConsents: (personId: string, reason: string): Promise<{ message: string; deletedCount: number }> => {
        return apiDelete<{ message: string; deletedCount: number }>(`/api/v1/consent-fse/person/${personId}?reason=${encodeURIComponent(reason)}`);
    },

    /**
     * Ottieni stato oscuramento
     */
    getObscurationStatus: (personId: string): Promise<ObscurationStatus> => {
        return apiGet<ObscurationStatus>(`/api/v1/consent-fse/person/${personId}/obscuration`);
    },

    /**
     * Imposta oscuramento dati
     */
    setObscuration: (personId: string, tipiDatiOscurati: string[]): Promise<ObscurationStatus> => {
        return apiPut<ObscurationStatus>(`/api/v1/consent-fse/person/${personId}/obscuration`, { tipiDatiOscurati });
    },

    /**
     * Verifica se un dato è oscurato
     */
    checkObscured: (personId: string, dataType: string): Promise<{ isObscured: boolean }> => {
        return apiGet<{ isObscured: boolean }>(`/api/v1/consent-fse/check-obscured/${personId}/${dataType}`);
    }
};

export default consentFSEApi;
