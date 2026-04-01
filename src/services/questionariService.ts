/**
 * Questionari Medici Service
 * 
 * P61 - Frontend API client per questionari medici MDL
 */

import { apiGet, apiPost, apiPut, apiDeleteWithPayload } from './api';

// ============================================================================
// TYPES
// ============================================================================

export interface QuestionarioMedicoConfig {
    id: string;
    documentoTemplateId: string;
    tenantId: string;
    codiciRischio: string[];
    tipiVisitaMDL: string[];
    specializzazione?: string;
    haScoring: boolean;
    scoringConfig?: ScoringConfig;
    sogliaCritica?: number;
    compilabileDa: CompilatoreQuestionario;
    tempoStimato?: number;
    istruzioniPaziente?: string;
    istruzioniMedico?: string;
    richiedeRevisione: boolean;
    validazioniCustom?: Record<string, unknown>;
    periodicitaMesi?: number;
    promemoria: boolean;
    protocolloSanitarioId?: string;
    protocolloSanitario?: {
        id: string;
        codice: string;
        denominazione: string;
    };
    // P61: Tariffazione
    voceTariffarioId?: string;
    isPagamento: boolean;
    prezzoDefault?: number;
    fatturabile: boolean;
    voceTariffario?: {
        id: string;
        codice: string;
        nome: string;
        prezzoBase: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface ScoringConfig {
    maxScore: number;
    passingScore?: number;
    weights: Record<string, FieldScoringConfig>;
}

export interface FieldScoringConfig {
    weight?: number;
    multiplier?: number;
    ranges?: Array<{
        min?: number;
        max?: number;
        score: number;
        critical?: boolean;
    }>;
    trueScore?: number;
    falseScore?: number;
    trueCritical?: boolean;
    falseCritical?: boolean;
    options?: Record<string, { score: number; critical?: boolean }>;
    perOptionScore?: number;
}

export type CompilatoreQuestionario = 'MEDICO' | 'PAZIENTE' | 'ENTRAMBI' | 'ASSISTITO';

export type TipoDocumentoQuestionario =
    | 'ANAMNESI'
    | 'QUESTIONARIO_ANAMNESI_MDL'
    | 'QUESTIONARIO_RISCHIO'
    | 'QUESTIONARIO_SINTOMI'
    | 'SCHEDA_SORVEGLIANZA'
    | 'ALCOL_SCREENING'
    // Modulistica types (returned by getQuestionariVisita for all docs linked to visit)
    | 'CONSENSO_INFORMATO'
    | 'PRIVACY'
    | 'CERTIFICATO'
    | 'PRESCRIZIONE'
    | 'REFERTO'
    | 'MODULO_GENERICO'
    | 'DICHIARAZIONE'
    | 'ALTRO';

export interface QuestionarioTemplate {
    id: string;
    tenantId: string;
    nome: string;
    descrizione?: string;
    codice?: string;
    tipo: TipoDocumentoQuestionario;
    fase: string;
    versione: number;
    contenutoHtml?: string;
    campi?: CampoQuestionario[];
    branchTypes: string[];
    richiedeFirma: boolean;
    richiedeFirmaMedico: boolean;
    richiedeFirmaDipendente?: boolean;
    richiedeFirmaFormatore?: boolean;
    richiedeFirmaDatore?: boolean;
    validitaGiorni?: number;
    obbligatorio: boolean;
    ordine: number;
    isActive: boolean;
    questionarioConfig?: QuestionarioMedicoConfig;
    prestazioni?: Array<{
        prestazioneId: string;
        prestazione: { id: string; nome: string; codice: string };
        obbligatorio: boolean;
    }>;
    medici?: Array<{
        medicoId: string;
        medico: { id: string; firstName: string; lastName: string };
    }>;
    _count?: {
        compilati: number;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CampoQuestionario {
    name: string;
    type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'radio' | 'textarea' | 'scale' | 'email' | 'phone' | 'signature';
    label: string;
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    /** Valore predefinito impostato nel template - usato da "Pre-compila da template" */
    defaultValue?: string;
    /** Opzioni per select/radio/multiselect (supporta sia string[] che {value,label}[]) */
    options?: Array<string | { value: string; label: string; score?: number }>;
    min?: number;
    max?: number;
    step?: number;
    /** Configurazione scoring per campo (pesi, range, soglie) */
    scoring?: {
        weight?: number;
        ranges?: Array<{ min: number; max: number; score: number; critical?: boolean }>;
        trueScore?: number;
        falseScore?: number;
        trueCritical?: boolean;
        falseCritical?: boolean;
        options?: Record<string, { score: number; critical?: boolean }>;
    };
    validations?: Record<string, unknown>;
    /** Condizione di visibilità: il campo è visibile solo se la condizione è soddisfatta */
    condition?: {
        fieldName: string;
        operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
        value?: string | number | boolean;
    };
}

export type StatoDocumentoCompilato =
    | 'BOZZA'
    | 'DA_FIRMARE'
    | 'FIRMATO_PAZIENTE'
    | 'FIRMATO_MEDICO'
    | 'COMPLETATO'
    | 'SCADUTO'
    | 'ANNULLATO';

export interface QuestionarioCompilato {
    id: string;
    tenantId: string;
    documentoTemplateId: string;
    pazienteId: string;
    visitaId?: string;
    appuntamentoId?: string;
    datiCompilati?: Record<string, unknown>;
    stato: StatoDocumentoCompilato;
    pdfUrl?: string;
    pdfGeneratoAt?: string;
    firmaPaziente?: string;
    firmaPazienteAt?: string;
    firmaMedico?: string;
    firmaMedicoAt?: string;
    firmaMedicoId?: string;
    dataScadenza?: string;
    note?: string;
    punteggioTotale?: number;
    punteggioPercentuale?: number;
    esitoCritico: boolean;
    noteAlgoritmo?: string;
    documentoTemplate: QuestionarioTemplate;
    /** Alias for documentoTemplate (for backward compatibility) */
    template?: QuestionarioTemplate;
    paziente: {
        id: string;
        firstName: string;
        lastName: string;
        fiscalCode?: string;
        gender?: string;
    };
    visita?: {
        id: string;
        dataVisita: string;
        tipoVisitaMDL?: string;
    };
    risposteDettagliate?: QuestionarioRisposta[];
    dataCompilazione?: string;
    createdAt: string;
    updatedAt: string;
}

export interface QuestionarioRisposta {
    id: string;
    documentoCompilatoId: string;
    campoId: string;
    campoLabel?: string;
    valoreTesto?: string;
    valoreNumerico?: number;
    valoreBoolean?: boolean;
    valoreData?: string;
    valoreJson?: unknown;
    punteggio?: number;
    pesoCalcolato?: number;
    flagCritico: boolean;
    validato: boolean;
    validatoDa?: string;
    validatoAt?: string;
    noteValidazione?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface QuestionariFilters {
    tipo?: TipoDocumentoQuestionario;
    fase?: string;
    isActive?: boolean;
    codiceRischio?: string;
    tipoVisitaMDL?: string;
    specializzazione?: string;
    protocolloSanitarioId?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CompilaQuestionarioData {
    pazienteId: string;
    visitaId?: string;
    appuntamentoId?: string;
    companyTenantProfileId?: string; // P72_19: per billing questionari
    datiCompilati: Record<string, unknown>;
    risposte?: Array<{
        campoId: string;
        campoLabel?: string;
        valoreTesto?: string;
        valoreNumerico?: number;
        valoreBoolean?: boolean;
        valoreData?: string;
        valoreJson?: unknown;
    }>;
}

export interface CreateQuestionarioData {
    nome: string;
    descrizione?: string;
    codice?: string;
    tipo: TipoDocumentoQuestionario;
    fase?: string;
    contenutoHtml?: string;
    campi?: CampoQuestionario[];
    richiedeFirma?: boolean;
    richiedeFirmaMedico?: boolean;
    validitaGiorni?: number;
    obbligatorio?: boolean;
    ordine?: number;
    branchTypes?: string[];
    prestazioniIds?: string[];
    mediciIds?: string[];
    // Config MDL
    codiciRischio?: string[];
    tipiVisitaMDL?: string[];
    specializzazione?: string;
    haScoring?: boolean;
    scoringConfig?: ScoringConfig;
    sogliaCritica?: number;
    compilabileDa?: CompilatoreQuestionario;
    tempoStimato?: number;
    istruzioniPaziente?: string;
    istruzioniMedico?: string;
    richiedeRevisione?: boolean;
    validazioniCustom?: Record<string, unknown>;
    periodicitaMesi?: number;
    promemoria?: boolean;
    protocolloSanitarioId?: string;
    // P61: Tariffazione
    voceTariffarioId?: string;
    isPagamento?: boolean;
    prezzoDefault?: number;
    fatturabile?: boolean;
}

// P61: Tipi per tariffazione questionari
export interface PrezzoQuestionario {
    fatturabile: boolean;
    prezzo: number | null;
    fonte: 'default' | 'voce_tariffario' | 'tariffario_azienda' | null;
    voceCodice?: string;
    isPagamento: boolean;
    aliquotaIva: number;
}

export interface MovimentoQuestionario {
    id: string;
    tenantId: string;
    direzione: 'ENTRATA' | 'USCITA';
    tipo: string;
    stato: string;
    importoLordo: number;
    importoNetto: number;
    dataEsecuzione: string;
    descrizione?: string;
    documentoCompilato?: {
        id: string;
        stato: string;
        documentoTemplate: {
            id: string;
            nome: string;
            tipo: string;
        };
    };
    companyTenantProfile?: {
        id: string;
        company: {
            id: string;
            businessName: string;
        };
    };
    person?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const BASE_PATH = '/api/v1/clinica/questionari';

// Template CRUD

export async function getQuestionariTemplates(
    filters?: QuestionariFilters
): Promise<PaginatedResponse<QuestionarioTemplate>> {
    const params = new URLSearchParams();
    if (filters?.tipo) params.append('tipo', filters.tipo);
    if (filters?.fase) params.append('fase', filters.fase);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.codiceRischio) params.append('codiceRischio', filters.codiceRischio);
    if (filters?.tipoVisitaMDL) params.append('tipoVisitaMDL', filters.tipoVisitaMDL);
    if (filters?.specializzazione) params.append('specializzazione', filters.specializzazione);
    if (filters?.protocolloSanitarioId) params.append('protocolloSanitarioId', filters.protocolloSanitarioId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = queryString ? `${BASE_PATH}?${queryString}` : BASE_PATH;

    return apiGet<PaginatedResponse<QuestionarioTemplate>>(url);
}

export async function getQuestionarioTemplateById(id: string): Promise<QuestionarioTemplate> {
    return apiGet<QuestionarioTemplate>(`${BASE_PATH}/${id}`);
}

export async function createQuestionarioTemplate(data: CreateQuestionarioData): Promise<QuestionarioTemplate> {
    return apiPost<QuestionarioTemplate>(BASE_PATH, data);
}

export async function updateQuestionarioTemplate(
    id: string,
    data: Partial<CreateQuestionarioData>
): Promise<QuestionarioTemplate> {
    return apiPut<QuestionarioTemplate>(`${BASE_PATH}/${id}`, data);
}

export async function deleteQuestionarioTemplate(
    id: string,
    deletionReason: string
): Promise<{ success: boolean; message: string }> {
    return apiDeleteWithPayload<{ success: boolean; message: string }>(`${BASE_PATH}/${id}`, { deletionReason });
}

// Compilazione

export async function compilaQuestionario(
    templateId: string,
    data: CompilaQuestionarioData
): Promise<QuestionarioCompilato> {
    return apiPost<QuestionarioCompilato>(`${BASE_PATH}/${templateId}/compila`, data);
}

export async function getQuestionarioCompilato(id: string): Promise<QuestionarioCompilato> {
    return apiGet<QuestionarioCompilato>(`${BASE_PATH}/compilati/${id}`);
}

/**
 * S67: Elimina (soft delete) un questionario compilato.
 * Solo documenti in stato BOZZA o DA_FIRMARE.
 */
export async function deleteQuestionarioCompilato(
    id: string,
    deletionReason: string
): Promise<{ success: boolean; message: string }> {
    return apiDeleteWithPayload<{ success: boolean; message: string }>(`${BASE_PATH}/compilati/${id}`, { deletionReason });
}

/**
 * P72_22: Annulla i movimenti contabili collegati a un questionario compilato
 * SENZA eliminare il documento stesso.
 * Usato quando si rimuove un questionario dall'elenco prestazioni di una visita.
 */
export async function annullaMovimentiCompilato(
    compilatoId: string
): Promise<{ success: boolean; annullati: number; message: string }> {
    return apiDeleteWithPayload<{ success: boolean; annullati: number; message: string }>(
        `${BASE_PATH}/compilati/${compilatoId}/movimenti`,
        {}
    );
}

export async function firmaPaziente(id: string, firma: string): Promise<QuestionarioCompilato> {
    return apiPost<QuestionarioCompilato>(`${BASE_PATH}/compilati/${id}/firma-paziente`, { firma });
}

export async function firmaMedico(id: string, firma: string): Promise<QuestionarioCompilato> {
    return apiPost<QuestionarioCompilato>(`${BASE_PATH}/compilati/${id}/firma-medico`, { firma });
}

/**
 * S71: Generate PDF for a compilato document
 */
export async function generateCompilatoPdf(id: string): Promise<{ success: boolean; pdfUrl: string }> {
    return apiPost<{ success: boolean; pdfUrl: string }>(`${BASE_PATH}/compilati/${id}/generate-pdf`, {});
}

export async function validaRisposte(
    id: string,
    noteValidazione?: string
): Promise<QuestionarioCompilato> {
    return apiPost<QuestionarioCompilato>(`${BASE_PATH}/compilati/${id}/valida`, { noteValidazione });
}

// Query per contesto

export async function getQuestionariPerRischio(codiceRischio: string): Promise<QuestionarioTemplate[]> {
    return apiGet<QuestionarioTemplate[]>(`${BASE_PATH}/per-rischio/${codiceRischio}`);
}

export async function getQuestionariPerTipoVisita(tipoVisitaMDL: string): Promise<QuestionarioTemplate[]> {
    return apiGet<QuestionarioTemplate[]>(`${BASE_PATH}/per-tipo-visita/${tipoVisitaMDL}`);
}

/**
 * S67: Get questionari linked to a protocollo sanitario
 */
export async function getQuestionariPerProtocollo(protocolloId: string): Promise<QuestionarioTemplate[]> {
    return apiGet<QuestionarioTemplate[]>(`${BASE_PATH}/per-protocollo/${protocolloId}`);
}

/**
 * S67: Get suggestion context for a visita (risk codes + protocolli from patient's mansione)
 */
export async function getContestoSuggerimenti(visitaId: string): Promise<{
    codiciRischio: string[];
    protocolliIds: string[];
    tipoVisitaMDL?: string;
}> {
    return apiGet<{ codiciRischio: string[]; protocolliIds: string[]; tipoVisitaMDL?: string }>(
        `${BASE_PATH}/visite/${visitaId}/contesto-suggerimenti`
    );
}

export async function getQuestionariVisita(visitaId: string): Promise<QuestionarioCompilato[]> {
    return apiGet<QuestionarioCompilato[]>(`${BASE_PATH}/visite/${visitaId}/questionari`);
}

export async function getQuestionariPaziente(
    pazienteId: string,
    filters?: { tipo?: string; stato?: string; page?: number; limit?: number }
): Promise<PaginatedResponse<QuestionarioCompilato>> {
    const params = new URLSearchParams();
    if (filters?.tipo) params.append('tipo', filters.tipo);
    if (filters?.stato) params.append('stato', filters.stato);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = queryString
        ? `${BASE_PATH}/pazienti/${pazienteId}/questionari?${queryString}`
        : `${BASE_PATH}/pazienti/${pazienteId}/questionari`;

    return apiGet<PaginatedResponse<QuestionarioCompilato>>(url);
}

// P61: Tariffazione

/**
 * Ottiene il prezzo di un questionario, opzionalmente per una specifica azienda
 */
export async function getPrezzoQuestionario(
    templateId: string,
    companyTenantProfileId?: string
): Promise<PrezzoQuestionario> {
    const params = companyTenantProfileId
        ? `?companyTenantProfileId=${companyTenantProfileId}`
        : '';
    return apiGet<PrezzoQuestionario>(`${BASE_PATH}/${templateId}/prezzo${params}`);
}

/**
 * Ottiene i movimenti contabili generati da questionari
 */
export async function getMovimentiQuestionari(
    filters?: {
        companyTenantProfileId?: string;
        pazienteId?: string;
        dataInizio?: string;
        dataFine?: string;
        stato?: string;
        page?: number;
        limit?: number;
    }
): Promise<PaginatedResponse<MovimentoQuestionario>> {
    const params = new URLSearchParams();
    if (filters?.companyTenantProfileId) params.append('companyTenantProfileId', filters.companyTenantProfileId);
    if (filters?.pazienteId) params.append('pazienteId', filters.pazienteId);
    if (filters?.dataInizio) params.append('dataInizio', filters.dataInizio);
    if (filters?.dataFine) params.append('dataFine', filters.dataFine);
    if (filters?.stato) params.append('stato', filters.stato);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = queryString
        ? `${BASE_PATH}/movimenti/fatturazione?${queryString}`
        : `${BASE_PATH}/movimenti/fatturazione`;

    return apiGet<PaginatedResponse<MovimentoQuestionario>>(url);
}

// ============================================================================
// TIPO HELPERS — Questionari vs Modulistica separation
// ============================================================================

/**
 * Types that belong to the Questionari section (MDL questionnaires).
 * Everything else is Modulistica.
 */
const QUESTIONARIO_TIPO_PREFIXES = ['QUESTIONARIO_'] as const;
const QUESTIONARIO_TIPO_EXACT = ['ALCOL_SCREENING', 'SCHEDA_SORVEGLIANZA'] as const;

/**
 * Returns true if the given tipo belongs to the Questionari section.
 * Used to separate Questionari from Modulistica in the UI.
 * 
 * Questionari: QUESTIONARIO_ANAMNESI_MDL, QUESTIONARIO_RISCHIO, QUESTIONARIO_SINTOMI,
 *              ALCOL_SCREENING, SCHEDA_SORVEGLIANZA
 * Modulistica: ANAMNESI (MEDSPORT1), CONSENSO_INFORMATO, PRIVACY, CERTIFICATO, etc.
 */
export function isQuestionarioTipo(tipo?: string | null): boolean {
    if (!tipo) return false;
    return QUESTIONARIO_TIPO_PREFIXES.some(p => tipo.startsWith(p)) ||
        (QUESTIONARIO_TIPO_EXACT as readonly string[]).includes(tipo);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    // Template
    getQuestionariTemplates,
    getQuestionarioTemplateById,
    createQuestionarioTemplate,
    updateQuestionarioTemplate,
    deleteQuestionarioTemplate,

    // Compilazione
    compilaQuestionario,
    getQuestionarioCompilato,
    deleteQuestionarioCompilato,
    annullaMovimentiCompilato,
    firmaPaziente,
    firmaMedico,
    generateCompilatoPdf,
    validaRisposte,

    // Query
    getQuestionariPerRischio,
    getQuestionariPerTipoVisita,
    getQuestionariPerProtocollo,
    getContestoSuggerimenti,
    getQuestionariVisita,
    getQuestionariPaziente,

    // P61: Tariffazione
    getPrezzoQuestionario,
    getMovimentiQuestionari,

    // Helpers
    isQuestionarioTipo,
};
