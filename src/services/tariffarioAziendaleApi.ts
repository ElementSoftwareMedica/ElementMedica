/**
 * Tariffario Aziendale API Client
 * 
 * API client e types per la gestione dei Tariffari Aziende - Medicina del Lavoro
 * 
 * @module services/tariffarioAziendaleApi
 */

import { apiGet, apiPost, apiPut, apiDelete } from './api';

// =============================================
// TYPES
// =============================================

/**
 * Tipo di tariffario
 */
export type TipoTariffario = 'BASE' | 'AZIENDALE';

/**
 * Tipo di voce nel tariffario
 */
export type TipoVoceTariffario = 'PRESTAZIONE' | 'SPESA_FISSA' | 'SPESA_RICORRENTE';

/**
 * Frequenza di applicazione della voce
 */
export type FrequenzaTariffario =
    | 'UNA_TANTUM'
    | 'PER_VISITA'
    | 'PER_DIPENDENTE'
    | 'MENSILE'
    | 'TRIMESTRALE'
    | 'SEMESTRALE'
    | 'ANNUALE';

/**
 * Prestazione MDL semplificata
 */
export interface PrestazioneMDL {
    id: string;
    codice: string;
    nome: string;
    prezzoBase: number;
    durataPrevista: number;
}

/**
 * Company semplificata
 */
export interface CompanySimple {
    id: string;
    ragioneSociale: string;
    piva?: string;
}

/**
 * Convenzione semplificata
 */
export interface ConvenzioneSimple {
    id: string;
    codice: string;
    nome: string;
}

/**
 * Fascia dipendenti prezzo
 */
export interface FasciaDipendentiPrezzo {
    id: string;
    voceTariffarioId: string;
    minDipendenti: number;
    maxDipendenti: number | null;
    prezzo: number;
    descrizione?: string;
    tenantId: string;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

/**
 * Voce del tariffario
 */
export interface VoceTariffario {
    id: string;
    tariffarioAziendaleId: string;
    tipo: TipoVoceTariffario;
    prestazioneId?: string | null;
    prestazione?: PrestazioneMDL | null;
    nome?: string | null;
    descrizione?: string | null;
    prezzoBase: number;
    ivaAliquota: number;
    frequenza: FrequenzaTariffario;
    usaFasceDipendenti: boolean;
    fasceDipendenti: FasciaDipendentiPrezzo[];
    ordine: number;
    attivo: boolean;
    note?: string | null;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

/**
 * Tariffario aziendale semplificato (per liste)
 */
export interface TariffarioAziendaleSimple {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string | null;
}

/**
 * Tariffario aziendale completo
 */
export interface TariffarioAziendale {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string | null;
    tipo: TipoTariffario;
    companyId?: string | null;
    company?: CompanySimple | null;
    tariffarioOrigineId?: string | null;
    tariffarioOrigine?: TariffarioAziendaleSimple | null;
    tariffariDerivati?: TariffarioAziendaleSimple[];
    convenzioneId?: string | null;
    convenzione?: ConvenzioneSimple | null;
    validoDa: string;
    validoA?: string | null;
    attivo: boolean;
    successoreId?: string | null;
    successore?: TariffarioAziendaleSimple & { validoDa: string } | null;
    predecessore?: TariffarioAziendaleSimple & { validoA: string } | null;
    voci: VoceTariffario[];
    note?: string | null;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    createdBy?: string | null;
    _count?: {
        voci: number;
        tariffariDerivati: number;
    };
}

/**
 * Tariffario per lista (senza voci complete)
 */
export interface TariffarioAziendaleListItem {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string | null;
    tipo: TipoTariffario;
    companyId?: string | null;
    company?: CompanySimple | null;
    convenzioneId?: string | null;
    convenzione?: ConvenzioneSimple | null;
    validoDa: string;
    validoA?: string | null;
    attivo: boolean;
    tenantId: string;
    createdAt: string;
    _count?: {
        voci: number;
        tariffariDerivati: number;
    };
}

/**
 * Filtri per lista tariffari
 */
export interface TariffarioFilters {
    tipo?: TipoTariffario;
    companyId?: string;
    convenzioneId?: string;
    attivo?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}

/**
 * Risposta paginata
 */
export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

/**
 * Payload creazione tariffario
 */
export interface CreateTariffarioPayload {
    codice: string;
    nome: string;
    descrizione?: string;
    tipo?: TipoTariffario;
    companyId?: string;
    convenzioneId?: string;
    validoDa?: string;
    validoA?: string;
    attivo?: boolean;
    note?: string;
    voci?: CreateVocePayload[];
}

/**
 * Payload aggiornamento tariffario
 */
export interface UpdateTariffarioPayload {
    codice?: string;
    nome?: string;
    descrizione?: string;
    companyId?: string;
    convenzioneId?: string;
    validoDa?: string;
    validoA?: string | null;
    attivo?: boolean;
    note?: string;
    successoreId?: string | null;
}

/**
 * Payload clonazione tariffario
 */
export interface CloneTariffarioPayload {
    companyId: string;
    codice?: string;
    nome?: string;
    validoDa?: string;
    validoA?: string;
    convenzioneId?: string;
}

/**
 * Payload creazione voce
 */
export interface CreateVocePayload {
    tipo: TipoVoceTariffario;
    prestazioneId?: string;
    nome?: string;
    descrizione?: string;
    prezzoBase: number;
    ivaAliquota?: number;
    frequenza?: FrequenzaTariffario;
    usaFasceDipendenti?: boolean;
    ordine?: number;
    note?: string;
    fasceDipendenti?: CreateFasciaPayload[];
}

/**
 * Payload aggiornamento voce
 */
export interface UpdateVocePayload {
    prestazioneId?: string;
    nome?: string;
    descrizione?: string;
    prezzoBase?: number;
    ivaAliquota?: number;
    frequenza?: FrequenzaTariffario;
    usaFasceDipendenti?: boolean;
    ordine?: number;
    attivo?: boolean;
    note?: string;
}

/**
 * Payload creazione fascia
 */
export interface CreateFasciaPayload {
    minDipendenti: number;
    maxDipendenti?: number | null;
    prezzo: number;
    descrizione?: string;
}

/**
 * Payload aggiornamento fascia
 */
export interface UpdateFasciaPayload {
    minDipendenti?: number;
    maxDipendenti?: number | null;
    prezzo?: number;
    descrizione?: string;
}

/**
 * Risultato calcolo prezzo
 */
export interface CalcoloPrezzoResult {
    prezzo: number;
    fascia: {
        id: string;
        minDipendenti: number;
        maxDipendenti: number | null;
        descrizione?: string;
    } | null;
    usaFasce: boolean;
    warning?: string;
}

// =============================================
// LABELS & UTILITIES
// =============================================

export const TIPO_TARIFFARIO_LABELS: Record<TipoTariffario, string> = {
    BASE: 'Template Base',
    AZIENDALE: 'Aziendale'
};

export const TIPO_VOCE_LABELS: Record<TipoVoceTariffario, string> = {
    PRESTAZIONE: 'Prestazione MDL',
    SPESA_FISSA: 'Spesa Fissa',
    SPESA_RICORRENTE: 'Spesa Ricorrente'
};

export const FREQUENZA_LABELS: Record<FrequenzaTariffario, string> = {
    UNA_TANTUM: 'Una tantum',
    PER_VISITA: 'Per visita',
    PER_DIPENDENTE: 'Per dipendente',
    MENSILE: 'Mensile',
    TRIMESTRALE: 'Trimestrale',
    SEMESTRALE: 'Semestrale',
    ANNUALE: 'Annuale'
};

/**
 * Formatta il range dipendenti
 */
export function formatFasciaDipendenti(min: number, max: number | null): string {
    if (max === null) {
        return `${min}+ dipendenti`;
    }
    if (min === max) {
        return `${min} dipendenti`;
    }
    return `${min}-${max} dipendenti`;
}

/**
 * Ottiene il nome visualizzato di una voce
 */
export function getVoceDisplayName(voce: VoceTariffario): string {
    if (voce.tipo === 'PRESTAZIONE' && voce.prestazione) {
        return voce.prestazione.nome;
    }
    return voce.nome || 'Voce senza nome';
}

// =============================================
// API CLIENT
// =============================================

const BASE_URL = '/api/v1/tariffari-aziendali';

export const tariffariAziendaliApi = {
    /**
     * Lista tariffari con filtri
     */
    async getAll(filters: TariffarioFilters = {}): Promise<PaginatedResponse<TariffarioAziendaleListItem>> {
        const params = new URLSearchParams();
        if (filters.tipo) params.append('tipo', filters.tipo);
        if (filters.companyId) params.append('companyId', filters.companyId);
        if (filters.convenzioneId) params.append('convenzioneId', filters.convenzioneId);
        if (filters.attivo !== undefined) params.append('attivo', String(filters.attivo));
        if (filters.search) params.append('search', filters.search);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));

        const queryString = params.toString();
        const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
        return apiGet<PaginatedResponse<TariffarioAziendaleListItem>>(url);
    },

    /**
     * Lista tariffari base (per dropdown clonazione)
     */
    async getBase(): Promise<{ success: boolean; data: TariffarioAziendaleSimple[] }> {
        return apiGet(`${BASE_URL}/base`);
    },

    /**
     * Lista prestazioni MDL disponibili
     */
    async getPrestazioniMDL(): Promise<{ success: boolean; data: PrestazioneMDL[] }> {
        return apiGet(`${BASE_URL}/prestazioni-mdl`);
    },

    /**
     * Dettaglio tariffario con voci
     */
    async getById(id: string): Promise<{ success: boolean; data: TariffarioAziendale }> {
        return apiGet(`${BASE_URL}/${id}`);
    },

    /**
     * Crea nuovo tariffario
     */
    async create(data: CreateTariffarioPayload): Promise<{ success: boolean; data: TariffarioAziendale }> {
        return apiPost(BASE_URL, data);
    },

    /**
     * Aggiorna tariffario
     */
    async update(id: string, data: UpdateTariffarioPayload): Promise<{ success: boolean; data: TariffarioAziendale }> {
        return apiPut(`${BASE_URL}/${id}`, data);
    },

    /**
     * Elimina tariffario
     */
    async delete(id: string): Promise<{ success: boolean; message: string }> {
        return apiDelete(`${BASE_URL}/${id}`);
    },

    /**
     * Clona tariffario per un'azienda
     */
    async clone(id: string, data: CloneTariffarioPayload): Promise<{ success: boolean; data: TariffarioAziendale }> {
        return apiPost(`${BASE_URL}/${id}/clone`, data);
    },

    // =============================================
    // VOCI
    // =============================================

    /**
     * Aggiunge una voce al tariffario
     */
    async addVoce(tariffarioId: string, data: CreateVocePayload): Promise<{ success: boolean; data: VoceTariffario }> {
        return apiPost(`${BASE_URL}/${tariffarioId}/voci`, data);
    },

    /**
     * Aggiorna una voce
     */
    async updateVoce(tariffarioId: string, voceId: string, data: UpdateVocePayload): Promise<{ success: boolean; data: VoceTariffario }> {
        return apiPut(`${BASE_URL}/${tariffarioId}/voci/${voceId}`, data);
    },

    /**
     * Elimina una voce
     */
    async deleteVoce(tariffarioId: string, voceId: string): Promise<{ success: boolean; message: string }> {
        return apiDelete(`${BASE_URL}/${tariffarioId}/voci/${voceId}`);
    },

    // =============================================
    // FASCE DIPENDENTI
    // =============================================

    /**
     * Aggiunge una fascia dipendenti
     */
    async addFascia(voceId: string, data: CreateFasciaPayload): Promise<{ success: boolean; data: FasciaDipendentiPrezzo }> {
        return apiPost(`${BASE_URL}/voci/${voceId}/fasce`, data);
    },

    /**
     * Aggiorna una fascia dipendenti
     */
    async updateFascia(voceId: string, fasciaId: string, data: UpdateFasciaPayload): Promise<{ success: boolean; data: FasciaDipendentiPrezzo }> {
        return apiPut(`${BASE_URL}/voci/${voceId}/fasce/${fasciaId}`, data);
    },

    /**
     * Elimina una fascia dipendenti
     */
    async deleteFascia(voceId: string, fasciaId: string): Promise<{ success: boolean; message: string }> {
        return apiDelete(`${BASE_URL}/voci/${voceId}/fasce/${fasciaId}`);
    },

    /**
     * Calcola prezzo per numero dipendenti
     */
    async calcolaPrezzo(voceId: string, numeroDipendenti: number): Promise<{ success: boolean; data: CalcoloPrezzoResult }> {
        return apiPost(`${BASE_URL}/voci/${voceId}/calcola-prezzo`, { numeroDipendenti });
    }
};

// =============================================
// API PER COMPANIES
// =============================================

export const companyTariffariApi = {
    /**
     * Ottiene i tariffari di un'azienda
     */
    async getByCompany(companyId: string): Promise<{ success: boolean; data: TariffarioAziendaleListItem[] }> {
        return apiGet(`/api/v1/companies/${companyId}/tariffari`);
    }
};

export default tariffariAziendaliApi;
