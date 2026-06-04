/**
 * Sicurezza API Service
 * Centralized API client for ElementSicurezza module
 * 
 * Provides typed methods for:
 * - OT23 - Modello riduzione tasso INAIL
 * - Future: DVR, PSC, POS, RSPP, etc.
 * 
 * @module services/sicurezzaApi
 * @project P44 - ElementSicurezza Management
 */

import { apiGet, apiPost, apiPut, apiDelete } from './api';

// Base URL for sicurezza endpoints
const SICUREZZA_BASE = '/api/v1/sicurezza';

// =====================================================
// TYPES - OT23
// =====================================================

export type StatoOT23 =
    | 'BOZZA'
    | 'PRONTO'
    | 'INVIATO'
    | 'IN_VALUTAZIONE'
    | 'APPROVATO'
    | 'RESPINTO'
    | 'INTEGRAZIONI_RICHIESTE'
    | 'SCADUTO';

export interface OT23Intervento {
    codice: string;
    descrizione: string;
    punteggio: number;
    sezione?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
    categoria?: string;
    documentazione?: string[];
    note?: string;
    dataAggiunta?: string;
    documentiCaricati?: string[];
}

export interface OT23 {
    id: string;
    anno: number;
    companyTenantProfileId: string;
    tenantId: string;
    stato: StatoOT23;

    // PAT INAIL
    pat: string;
    codiceVoce?: string;
    classificazioneRischio?: string;

    // Interventi
    interventiA?: OT23Intervento[];
    interventiB?: OT23Intervento[];

    // Punteggi
    punteggioSezioneA: number;
    punteggioSezioneB: number;
    punteggioTotale: number;
    haRequisitiBeneficio: boolean;

    // Dati economici
    premioAnnuale?: number;
    percentualeRiduzione?: number;
    risparmioStimato?: number;

    // Invio/Esito
    dataInvio?: string;
    protocolloInail?: string;
    dataEsito?: string;
    esito?: string;

    documentazioneAllegata?: Array<{
        filename: string;
        uploadedAt: string;
        tipo: string;
    }>;

    note?: string;
    createdAt: string;
    updatedAt: string;

    // Relations
    companyTenantProfile?: {
        id: string;
        company?: {
            id: string;
            ragioneSociale?: string;
            piva?: string;
        };
    };
}

export interface OT23CatalogoIntervento {
    codice: string;
    descrizione: string;
    punteggio: number;
    sezione?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
    categoria?: string;
    documentazione?: string[];
    note?: string;
}

export interface OT23Catalogo {
    annoModello?: number;
    regolaAmmissibilita?: string;
    sezioni?: Array<{
        codice: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
        titolo: string;
        requisito: string;
        interventi: OT23CatalogoIntervento[];
    }>;
    sezioneA: OT23CatalogoIntervento[];
    sezioneB: {
        rischioStradale?: OT23CatalogoIntervento[];
        malattieProfessionali?: OT23CatalogoIntervento[];
        formazioneInformazione?: OT23CatalogoIntervento[];
        emergenzeDpi?: OT23CatalogoIntervento[];
        organizzative: OT23CatalogoIntervento[];
        tecniche: OT23CatalogoIntervento[];
        formazione: OT23CatalogoIntervento[];
        sorveglianza: OT23CatalogoIntervento[];
        emergenze: OT23CatalogoIntervento[];
        altro: OT23CatalogoIntervento[];
    };
    tabellaRiduzioni: Array<{
        da: number;
        a: number;
        percentuale: number;
        label: string;
    }>;
    puntiMinimiBeneficio: number;
}

export interface OT23RisparmioCalcolo {
    percentualeRiduzione: number;
    risparmioAnnuale: number;
    fasciaAzienda: string;
}

export interface OT23Dashboard {
    anno: number;
    totale: number;
    conRequisitiBeneficio: number;
    senzaRequisiti: number;
    perStato: Record<StatoOT23, number>;
    totaleRisparmioStimato: number;
    domandeRecenti: OT23[];
}

export interface OT23CreateData {
    companyTenantProfileId: string;
    anno: number;
    pat?: string;
    codiceVoce?: string;
    classificazioneRischio?: string;
    premioAnnuale?: number;
    note?: string;
}

export interface OT23UpdateData {
    pat?: string;
    codiceVoce?: string;
    classificazioneRischio?: string;
    premioAnnuale?: number;
    interventiA?: OT23Intervento[];
    interventiB?: OT23Intervento[];
    note?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    message?: string;
}

interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

// =====================================================
// OT23 API
// =====================================================

// P51: Type per supporto multi-tenant headers
type ApiOptions = Record<string, unknown> & {
    headers?: Record<string, string>;
};

export const ot23Api = {
    /**
     * Lista domande OT23 con filtri
     * P44: Supporta headers opzionali per multi-tenant (X-Operate-Tenant-Id)
     */
    async getAll(params?: {
        page?: number;
        limit?: number;
        companyTenantProfileId?: string;
        anno?: number;
        stato?: StatoOT23;
    }, options?: ApiOptions): Promise<{ data: OT23[]; pagination: { total: number; page: number; limit: number; pages: number } }> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', String(params.page));
        if (params?.limit) queryParams.append('limit', String(params.limit));
        if (params?.companyTenantProfileId) queryParams.append('companyTenantProfileId', params.companyTenantProfileId);
        if (params?.anno) queryParams.append('anno', String(params.anno));
        if (params?.stato) queryParams.append('stato', params.stato);

        const url = `${SICUREZZA_BASE}/ot23${queryParams.toString() ? `?${queryParams}` : ''}`;
        const response = await apiGet<PaginatedResponse<OT23>>(url, {}, options);
        return {
            data: response.data,
            pagination: response.pagination
        };
    },

    /**
     * Ottiene una singola domanda OT23
     * P44: Supporta headers opzionali per multi-tenant
     */
    async getById(id: string, options?: ApiOptions): Promise<OT23> {
        const response = await apiGet<ApiResponse<OT23>>(`${SICUREZZA_BASE}/ot23/${id}`, {}, options);
        return response.data;
    },

    /**
     * Crea una nuova domanda OT23
     * P51: Supporta headers opzionali per multi-tenant
     */
    async create(data: OT23CreateData, options?: ApiOptions): Promise<OT23> {
        const response = await apiPost<ApiResponse<OT23>>(`${SICUREZZA_BASE}/ot23`, data, options);
        return response.data;
    },

    /**
     * Aggiorna una domanda OT23
     * P51: Supporta headers opzionali per multi-tenant
     */
    async update(id: string, data: OT23UpdateData, options?: ApiOptions): Promise<OT23> {
        const response = await apiPut<ApiResponse<OT23>>(`${SICUREZZA_BASE}/ot23/${id}`, data, options);
        return response.data;
    },

    /**
     * Aggiunge un intervento alla domanda
     * P51: Supporta headers opzionali per multi-tenant
     */
    async addIntervento(id: string, sezione: 'A' | 'B' | 'C' | 'D' | 'E' | 'F', intervento: OT23CatalogoIntervento, options?: ApiOptions): Promise<OT23> {
        const response = await apiPost<ApiResponse<OT23>>(`${SICUREZZA_BASE}/ot23/${id}/interventi`, {
            sezione,
            intervento
        }, options);
        return response.data;
    },

    /**
     * Rimuove un intervento dalla domanda
     * P51: Supporta headers opzionali per multi-tenant
     */
    async removeIntervento(id: string, sezione: 'A' | 'B' | 'C' | 'D' | 'E' | 'F', codice: string, options?: ApiOptions): Promise<OT23> {
        const response = await apiDelete<ApiResponse<OT23>>(`${SICUREZZA_BASE}/ot23/${id}/interventi/${codice}?sezione=${sezione}`, options);
        return response.data;
    },

    /**
     * Aggiorna stato domanda
     * P51: Supporta headers opzionali per multi-tenant
     */
    async updateStato(id: string, stato: StatoOT23, metadata?: { protocolloInail?: string; esito?: string }, options?: ApiOptions): Promise<OT23> {
        const response = await apiPut<ApiResponse<OT23>>(`${SICUREZZA_BASE}/ot23/${id}/stato`, {
            stato,
            ...metadata
        }, options);
        return response.data;
    },

    /**
     * Genera anteprima XML
     */
    async getXml(id: string): Promise<string> {
        const response = await apiGet<string>(`${SICUREZZA_BASE}/ot23/${id}/xml`);
        return response;
    },

    /**
     * Download XML come file
     */
    async downloadXml(id: string, filename: string): Promise<void> {
        const xml = await this.getXml(id);
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `ot23_${id}.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    /**
     * Elimina domanda OT23 (soft delete)
     * P51: Supporta headers opzionali per multi-tenant
     */
    async delete(id: string, options?: ApiOptions): Promise<void> {
        await apiDelete(`${SICUREZZA_BASE}/ot23/${id}`, options);
    },

    /**
     * Ottiene catalogo interventi con punteggi
     */
    async getCatalogo(): Promise<OT23Catalogo> {
        const response = await apiGet<ApiResponse<OT23Catalogo>>(`${SICUREZZA_BASE}/ot23/catalogo`);
        return response.data;
    },

    /**
     * Calcola risparmio stimato
     */
    async calcolaRisparmio(premioAnnuale: number, numeroDipendenti: number): Promise<OT23RisparmioCalcolo> {
        const response = await apiGet<ApiResponse<OT23RisparmioCalcolo>>(
            `${SICUREZZA_BASE}/ot23/calcola-risparmio?premioAnnuale=${premioAnnuale}&numeroDipendenti=${numeroDipendenti}`
        );
        return response.data;
    },

    /**
     * Dashboard OT23 per anno
     */
    async getDashboard(anno: number): Promise<OT23Dashboard> {
        const response = await apiGet<ApiResponse<OT23Dashboard>>(`${SICUREZZA_BASE}/ot23/dashboard/${anno}`);
        return response.data;
    }
};

// =====================================================
// ENUMS API
// =====================================================

export interface SicurezzaEnums {
    statoOT23: Array<{ value: StatoOT23; label: string; color: string }>;
    categorieInterventi: Array<{ value: string; label: string }>;
}

export const sicurezzaEnumsApi = {
    async getEnums(): Promise<SicurezzaEnums> {
        const response = await apiGet<ApiResponse<SicurezzaEnums>>(`${SICUREZZA_BASE}/enums`);
        return response.data;
    }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Ottiene il colore per uno stato OT23
 */
export function getOT23StatoColor(stato: StatoOT23): string {
    const colors: Record<StatoOT23, string> = {
        BOZZA: 'gray',
        PRONTO: 'blue',
        INVIATO: 'indigo',
        IN_VALUTAZIONE: 'yellow',
        APPROVATO: 'green',
        RESPINTO: 'red',
        INTEGRAZIONI_RICHIESTE: 'orange',
        SCADUTO: 'gray'
    };
    return colors[stato] || 'gray';
}

/**
 * Ottiene label per uno stato OT23
 */
export function getOT23StatoLabel(stato: StatoOT23): string {
    const labels: Record<StatoOT23, string> = {
        BOZZA: 'Bozza',
        PRONTO: 'Pronto per invio',
        INVIATO: 'Inviato',
        IN_VALUTAZIONE: 'In valutazione INAIL',
        APPROVATO: 'Approvato',
        RESPINTO: 'Respinto',
        INTEGRAZIONI_RICHIESTE: 'Integrazioni richieste',
        SCADUTO: 'Scaduto'
    };
    return labels[stato] || stato;
}

/**
 * Verifica se la domanda può essere modificata
 */
export function canEditOT23(stato: StatoOT23): boolean {
    return ['BOZZA', 'INTEGRAZIONI_RICHIESTE'].includes(stato);
}

/**
 * Verifica se la domanda può essere inviata
 */
export function canSubmitOT23(ot23: OT23): boolean {
    return ot23.stato === 'PRONTO' && ot23.haRequisitiBeneficio;
}

export default {
    ot23: ot23Api,
    enums: sicurezzaEnumsApi
};
