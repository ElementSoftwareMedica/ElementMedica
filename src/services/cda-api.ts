/**
 * P65 Fase 4 - CDA API Service
 * 
 * Servizio per comunicazione con API CDA HL7
 */

import { apiGet, apiPost } from '@/services/api';

// ============================================
// TYPES
// ============================================

export type CDASourceType =
    | 'REFERTO'
    | 'GIUDIZIO_IDONEITA'
    | 'CERTIFICATO'
    | 'LETTERA_DIMISSIONE'
    | 'PRESCRIZIONE';

export type StatoInvioCDA =
    | 'NON_INVIATO'
    | 'IN_CODA'
    | 'INVIATO'
    | 'ACCETTATO'
    | 'RIFIUTATO'
    | 'ERRORE';

export interface CDADocument {
    id: string;
    sourceType: CDASourceType;
    sourceId: string;
    cdaXml: string;
    cdaVersion: string;
    templateId?: string;
    hashXml: string;
    algoritmo: string;
    statoInvio: StatoInvioCDA;
    inviatoAt?: string;
    esitoInvio?: string;
    erroreInvio?: string;
    titoloDocumento?: string;
    dataDocumento?: string;
    autoreId?: string;
    pazienteId?: string;
    organizationOID?: string;
    validato: boolean;
    validatoAt?: string;
    erroriValidazione: string[];
    warningsValidazione: string[];
    tenantId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CDAGenerationResult {
    cdaDocumentId: string;
    hash: string;
    xml: string;
}

export interface CDAValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface HL7Mapping {
    id: string;
    entityType: string;
    fieldPath: string;
    codeSystem: string;
    codeSystemOID: string;
    code: string;
    displayName: string;
    codeSystemName?: string;
    context?: string;
    description?: string;
}

export interface CDAConfig {
    oidRegistry: Record<string, string>;
    loincSections: Record<string, { code: string; display: string }>;
}

// ============================================
// API FUNCTIONS
// ============================================

const CDA_BASE_URL = '/api/v1/cda';

/**
 * Ottiene configurazione CDA (OID, codici LOINC)
 */
export async function getCDAConfig(): Promise<CDAConfig> {
    const response = await apiGet<{ success: boolean; data: CDAConfig }>(`${CDA_BASE_URL}/config`);
    return response.data;
}

/**
 * Genera documento CDA da referto
 */
export async function generateCDAFromReferto(refertoId: string): Promise<CDAGenerationResult> {
    const response = await apiPost<{ success: boolean; data: CDAGenerationResult }>(
        `${CDA_BASE_URL}/referto/${refertoId}`
    );
    return response.data;
}

/**
 * Genera documento CDA da giudizio idoneità
 */
export async function generateCDAFromGiudizio(giudizioId: string): Promise<CDAGenerationResult> {
    const response = await apiPost<{ success: boolean; data: CDAGenerationResult }>(
        `${CDA_BASE_URL}/giudizio/${giudizioId}`
    );
    return response.data;
}

/**
 * Recupera documento CDA esistente
 */
export async function getCDADocument(
    sourceType: CDASourceType,
    sourceId: string
): Promise<CDADocument | null> {
    try {
        const response = await apiGet<{ success: boolean; data: CDADocument }>(
            `${CDA_BASE_URL}/${sourceType}/${sourceId}`
        );
        return response.data;
    } catch {
        return null;
    }
}

/**
 * Scarica XML CDA (ritorna URL per download)
 */
export function getCDAXmlDownloadUrl(sourceType: CDASourceType, sourceId: string): string {
    return `${CDA_BASE_URL}/${sourceType}/${sourceId}/xml`;
}

/**
 * Valida documento CDA
 */
export async function validateCDA(cdaDocumentId: string): Promise<CDAValidationResult> {
    const response = await apiPost<{ success: boolean; data: CDAValidationResult }>(
        `${CDA_BASE_URL}/${cdaDocumentId}/validate`
    );
    return response.data;
}

/**
 * Lista documenti CDA per paziente
 */
export async function getPatientCDADocuments(pazienteId: string): Promise<CDADocument[]> {
    const response = await apiGet<{ success: boolean; data: CDADocument[] }>(
        `${CDA_BASE_URL}/patient/${pazienteId}`
    );
    return response.data;
}

/**
 * Ottiene mapping HL7 per campo
 */
export async function getHL7Mapping(
    entityType: string,
    fieldPath: string
): Promise<HL7Mapping | null> {
    try {
        const response = await apiGet<{ success: boolean; data: HL7Mapping }>(
            `${CDA_BASE_URL}/mapping/${entityType}/${fieldPath}`
        );
        return response.data;
    } catch {
        return null;
    }
}
