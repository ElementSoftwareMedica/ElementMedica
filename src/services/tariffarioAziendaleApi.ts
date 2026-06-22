/**
 * Tariffario Aziendale API Client
 * 
 * API client e types per la gestione dei Tariffari Aziende - Medicina del Lavoro
 * 
 * @module services/tariffarioAziendaleApi
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiDeleteWithPayload } from './api';
import { getToken } from './auth';

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
export type TipoVoceTariffario =
    | 'PRESTAZIONE'
    | 'QUESTIONARIO'
    | 'SPESA_FISSA'
    | 'SPESA_RICORRENTE'
    | 'SOPRALLUOGO_MC'
    | 'SOPRALLUOGO_RSPP'
    | 'DVR_NUOVO'
    | 'DVR_AGGIORNAMENTO_CON_MODIFICHE'
    | 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE'
    | 'NOMINA_MC'
    | 'NOMINA_RSPP'
    | 'CONSULENZA'
    | 'USCITA_MC';

/**
 * P59: Tipo compenso professionista (MC/RSPP)
 */
export type TipoCompensoMedico = 'PERCENTUALE' | 'FISSO' | 'MINIMO_MASSIMO';

/**
 * P59: Labels per tipo compenso
 */
export const TIPO_COMPENSO_LABELS: Record<TipoCompensoMedico, string> = {
    PERCENTUALE: '% del prezzo',
    FISSO: 'Importo fisso',
    MINIMO_MASSIMO: '% con min/max'
};

/**
 * P59: Descrizioni per tipo compenso
 */
export const TIPO_COMPENSO_DESCRIPTIONS: Record<TipoCompensoMedico, string> = {
    PERCENTUALE: 'Il compenso è calcolato come percentuale del prezzo fatturato',
    FISSO: 'Il compenso è un importo fisso indipendente dal prezzo',
    MINIMO_MASSIMO: 'Percentuale con floor minimo e/o ceiling massimo'
};

/**
 * P59: Tipi voce che supportano il compenso professionista
 */
export const TIPI_VOCE_CON_COMPENSO: TipoVoceTariffario[] = [
    'PRESTAZIONE',
    'SOPRALLUOGO_MC',
    'SOPRALLUOGO_RSPP',
    'DVR_NUOVO',
    'DVR_AGGIORNAMENTO_CON_MODIFICHE',
    'DVR_AGGIORNAMENTO_SENZA_MODIFICHE',
    'NOMINA_MC',
    'NOMINA_RSPP',
    'CONSULENZA',
    'QUESTIONARIO',
    'USCITA_MC'
];

/**
 * Categoria visita MDL — D.Lgs 81/08 art. 41 + D.Lgs 19/2022
 * Allineata 1:1 a TipoVisitaMDL per prezzi differenziati nel tariffario aziendale
 */
export type CategoriaVisitaMDL =
    // === VISITE ORDINARIE (Art. 41 c.2) ===
    | 'PREVENTIVA'               // Art. 41.2a – prima dell'assunzione / prima visita nuovo lavoratore
    | 'PREVENTIVA_PREASSUNTIVA'  // Art. 41.2a-bis – in fase preassuntiva su scelta del datore (D.Lgs 19/2022)
    | 'PERIODICA'                // Art. 41.2b – periodicità da protocollo sanitario individuale
    | 'CAMBIO_MANSIONE'          // Art. 41.2c – cambio mansione con esposizione a rischi diversi
    | 'CESSAZIONE_RAPPORTO'      // Art. 41.2d – alla cessazione del rapporto (dove previsto)
    | 'PRECEDENTE_ASSENZA'       // Art. 41.2e – ripresa dopo assenza >60 gg per motivi di salute
    | 'SU_RICHIESTA_LAVORATORE'  // Art. 41.2f – su richiesta del lavoratore (D.Lgs 19/2022)
    // === VISITE SPECIALI ===
    | 'STRAORDINARIA'            // Art. 41.3 – su disposizione MC, organo vigilanza o datore
    | 'VERIFICA_IDONEITA'        // Art. 41.9 – verifica idoneità per giudizio contestato
    | 'RIENTRO_MATERNITA';       // Rientro da maternità/congedo parentale > 60 gg

/**
 * Labels brevi per categoria / tipo visita MDL
 * Copertura completa di TipoVisitaMDL (backend) + CategoriaVisitaMDL (tariffario).
 */
export const CATEGORIA_VISITA_LABELS: Record<CategoriaVisitaMDL, string> = {
    PREVENTIVA: 'Visita Preventiva',
    PREVENTIVA_PREASSUNTIVA: 'Preventiva Preassuntiva',
    PERIODICA: 'Visita Periodica',
    CAMBIO_MANSIONE: 'Cambio Mansione',
    CESSAZIONE_RAPPORTO: 'Cessazione Rapporto',
    PRECEDENTE_ASSENZA: 'Precedente Assenza >60gg',
    SU_RICHIESTA_LAVORATORE: 'Su Richiesta Lavoratore',
    STRAORDINARIA: 'Visita Straordinaria',
    VERIFICA_IDONEITA: 'Verifica Idoneità',
    RIENTRO_MATERNITA: 'Rientro Maternità/Congedo',
};

/**
 * Descrizioni normative per categoria / tipo visita MDL
 */
export const CATEGORIA_VISITA_DESCRIPTIONS: Record<CategoriaVisitaMDL, string> = {
    PREVENTIVA: 'Art. 41.2a – Prima dell\'assunzione o inizio sorveglianza sanitaria, include la prima visita per nuovo lavoratore',
    PREVENTIVA_PREASSUNTIVA: 'Art. 41.2a-bis – In fase preassuntiva, su scelta del datore di lavoro (D.Lgs 19/2022)',
    PERIODICA: 'Art. 41.2b – Visita periodica secondo la frequenza stabilita dal MC nel protocollo sanitario individuale',
    CAMBIO_MANSIONE: 'Art. 41.2c – Per cambio di mansione che comporta esposizione a rischi lavorativi diversi',
    CESSAZIONE_RAPPORTO: 'Art. 41.2d – Alla cessazione del rapporto di lavoro, nei casi previsti dalla normativa di settore',
    PRECEDENTE_ASSENZA: 'Art. 41.2e – Ripresa del lavoro dopo assenza lavorativa >60 giorni continuativi per motivi di salute',
    SU_RICHIESTA_LAVORATORE: 'Art. 41.2f – Su richiesta del lavoratore, qualora il MC la ritenga correlata ai rischi lavorativi (D.Lgs 19/2022)',
    STRAORDINARIA: 'Art. 41.3 – Su disposizione dell\'organo di vigilanza, del medico competente o su richiesta motivata del datore',
    VERIFICA_IDONEITA: 'Art. 41.9 – Visita di verifica dell\'idoneità in caso di contestazione del giudizio da parte del lavoratore',
    RIENTRO_MATERNITA: 'Visita di rientro dopo maternità o congedo parentale superiore a 60 giorni continuativi',
};

/**
 * Labels per i tipi di voce tariffario
 */
export const TIPO_VOCE_LABELS: Record<TipoVoceTariffario, string> = {
    PRESTAZIONE: 'Prestazione Medicina del Lavoro',
    QUESTIONARIO: 'Questionario / Modulo MDL',
    SPESA_FISSA: 'Spesa Una Tantum',
    SPESA_RICORRENTE: 'Spesa Ricorrente Periodica',
    SOPRALLUOGO_MC: 'Sopralluogo Medico Competente',
    SOPRALLUOGO_RSPP: 'Sopralluogo RSPP',
    DVR_NUOVO: 'Nuovo DVR',
    DVR_AGGIORNAMENTO_CON_MODIFICHE: 'Aggiornamento DVR (con modifiche)',
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'Aggiornamento DVR (senza modifiche)',
    NOMINA_MC: 'Nomina Medico Competente',
    NOMINA_RSPP: 'Nomina RSPP',
    CONSULENZA: 'Consulenza MDL',
    USCITA_MC: 'Uscita Medico Competente',
};

/**
 * Descrizioni estese per i tipi di voce tariffario (per tooltip/helper text)
 */
export const TIPO_VOCE_DESCRIPTIONS: Record<TipoVoceTariffario, string> = {
    PRESTAZIONE: 'Visite ed esami da protocollo sanitario. Frequenza determinata dal rischio lavorativo.',
    QUESTIONARIO: 'Questionario anamnestico, di rischio o di sorveglianza sanitaria MDL.',
    SPESA_FISSA: 'Costo singolo applicato una volta (es. setup iniziale, attivazione).',
    SPESA_RICORRENTE: 'Costo che si ripete periodicamente (mensile, trimestrale, annuale).',
    SOPRALLUOGO_MC: 'Visita annuale del Medico Competente presso la sede aziendale.',
    SOPRALLUOGO_RSPP: 'Visita del RSPP per valutazione rischi in loco.',
    DVR_NUOVO: 'Prima redazione del Documento di Valutazione dei Rischi (Art. 17 D.Lgs 81/08).',
    DVR_AGGIORNAMENTO_CON_MODIFICHE: 'Aggiornamento DVR con variazioni sostanziali ai rischi o alle misure preventive.',
    DVR_AGGIORNAMENTO_SENZA_MODIFICHE: 'Revisione annuale di conferma DVR senza variazioni sostanziali.',
    NOMINA_MC: 'Incarico annuale del Medico Competente.',
    NOMINA_RSPP: 'Incarico annuale del Responsabile Servizio Prevenzione Protezione.',
    CONSULENZA: 'Consulenza professionale MDL a tariffa oraria o per frazione d\'ora. Rendicontabile per azienda.',
    USCITA_MC: 'Uscita del Medico Competente presso la sede aziendale. Genera automaticamente movimento Da Fatturare verso l\'azienda e compenso al medico.',
};

/**
 * Frequenza di applicazione della voce (temporale)
 */
export type FrequenzaTariffario =
    | 'UNA_TANTUM'
    | 'PER_VISITA'    // DEPRECATO: usare unitaCalcolo
    | 'PER_DIPENDENTE' // DEPRECATO: usare unitaCalcolo
    | 'MENSILE'
    | 'TRIMESTRALE'
    | 'SEMESTRALE'
    | 'ANNUALE'
    | 'SECONDO_SORVEGLIANZA'; // Frequenza da protocollo sanitario individuale

/**
 * Unità di calcolo per il prezzo (moltiplicatore) - P44 Enhancement
 */
export type UnitaCalcoloTariffario =
    | 'FLAT'           // Prezzo fisso, non moltiplicato
    | 'PER_DIPENDENTE' // Prezzo × numero dipendenti
    | 'PER_SEDE'       // Prezzo × numero sedi
    | 'PER_VISITA';    // Prezzo × numero visite effettuate

/**
 * Labels per unità di calcolo
 */
export const UNITA_CALCOLO_LABELS: Record<UnitaCalcoloTariffario, string> = {
    FLAT: 'Prezzo Fisso',
    PER_DIPENDENTE: 'Per Dipendente',
    PER_SEDE: 'Per Sede',
    PER_VISITA: 'Per Visita'
};

/**
 * Descrizioni per unità di calcolo
 */
export const UNITA_CALCOLO_DESCRIPTIONS: Record<UnitaCalcoloTariffario, string> = {
    FLAT: 'Il prezzo non viene moltiplicato, si applica come indicato.',
    PER_DIPENDENTE: 'Il prezzo viene moltiplicato per il numero di dipendenti dell\'azienda.',
    PER_SEDE: 'Il prezzo viene moltiplicato per il numero di sedi operative.',
    PER_VISITA: 'Il prezzo viene applicato ad ogni visita/prestazione effettuata.'
};

/**
 * Modalità di attivazione della fatturazione - P44 Enhancement
 */
export type ModalitaAttivazioneTariffario =
    | 'AUTOMATICA'    // Genera fattura automaticamente alla scadenza
    | 'SU_CONFERMA'   // Fattura solo se confermato (es. sopralluogo eseguito)
    | 'SU_ESECUZIONE'; // Fattura quando la prestazione viene eseguita

/**
 * Labels per modalità attivazione
 */
export const MODALITA_ATTIVAZIONE_LABELS: Record<ModalitaAttivazioneTariffario, string> = {
    AUTOMATICA: 'Automatica',
    SU_CONFERMA: 'Su Conferma',
    SU_ESECUZIONE: 'Su Esecuzione'
};

/**
 * Descrizioni per modalità attivazione
 */
export const MODALITA_ATTIVAZIONE_DESCRIPTIONS: Record<ModalitaAttivazioneTariffario, string> = {
    AUTOMATICA: 'La fattura viene generata automaticamente alla scadenza prevista.',
    SU_CONFERMA: 'La fattura viene generata solo dopo conferma manuale (es. sopralluogo effettuato).',
    SU_ESECUZIONE: 'La fattura viene generata quando la prestazione viene effettivamente eseguita.'
};

/**
 * Tipo prestazione MDL (subset usato in Medicina del Lavoro)
 */
export type TipoPrestazioneMDL =
    | 'VISITA_MEDICINA_LAVORO'
    | 'ESAME_STRUMENTALE'
    | 'ESAME_LABORATORIO'
    | 'VACCINAZIONE'
    | 'VISITA_SPECIALISTICA'
    | 'CONSULENZA';

/**
 * Prestazione MDL semplificata
 */
export interface PrestazioneMDL {
    id: string;
    codice: string | null;
    nome: string;
    tipo: TipoPrestazioneMDL;
    prezzoBase: number;
    durataPrevista: number;
    ivaAliquota?: number;
}

/**
 * Questionario MDL (DocumentoTemplate con tipo questionario)
 */
export interface QuestionarioMDL {
    id: string;
    codice: string | null;
    nome: string;
    tipo: string;  // TipoDocumentoTemplate value
    descrizione?: string | null;
}

/**
 * Risposta combinata di getPrestazioniMDL
 */
export interface PrestazioniMDLResponse {
    prestazioni: PrestazioneMDL[];
    questionari: QuestionarioMDL[];
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
    documentoTemplateId?: string | null;
    documentoTemplate?: QuestionarioMDL | null;
    nome?: string | null;
    descrizione?: string | null;
    prezzoBase: number;
    ivaAliquota: number;
    frequenza: FrequenzaTariffario;
    unitaCalcolo: UnitaCalcoloTariffario;            // P44 Enhancement
    modalitaAttivazione: ModalitaAttivazioneTariffario; // P44 Enhancement
    usaFasceDipendenti: boolean;
    fasceDipendenti: FasciaDipendentiPrezzo[];
    ordine: number;
    attivo: boolean;
    note?: string | null;
    // Categoria visita MDL: distingue prima visita da visita periodica (solo PRESTAZIONE)
    categoriaVisita?: CategoriaVisitaMDL | null;
    // Durata minima in minuti per fatturazione consulenze (es. 30 min = 0.5h × tariffa oraria)
    durataMinimaMinuti?: number | null;
    // P59: Compenso professionista per voci SOPRALLUOGO_*, DVR_*, NOMINA_*, CONSULENZA
    compensoProfessionistaTipo?: TipoCompensoMedico | null;
    compensoProfessionistaValore?: number | null;
    compensoProfessionistaMinimo?: number | null;
    compensoProfessionistaMassimo?: number | null;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

/**
 * P65: Voce tariffario con contesto tariffario e aziende associate
 * Usata nella tab Tariffario Aziendale di PrestazioneDetailPage
 */
export interface VoceTariffarioWithContext extends VoceTariffario {
    tariffarioAziendale: {
        id: string;
        codice: string;
        nome: string;
        attivo: boolean;
        validoDa: string;
        validoA?: string | null;
        convenzioneId?: string | null;
        convenzione?: { id: string; codice: string; nome: string } | null;
        companyAssociations: Array<{
            companyTenantProfile: {
                id: string;
                company: {
                    id: string;
                    ragioneSociale: string;
                    piva?: string;
                };
            };
        }>;
    };
}
export interface TariffarioAziendaleSimple {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string | null;
}

/**
 * P59 Sprint 11: Tariffario derivato con info azienda
 */
export interface TariffarioDerivato extends TariffarioAziendaleSimple {
    companyTenantProfile?: {
        id: string;
        company?: CompanySimple | null;
    } | null;
}

/**
 * Tariffario aziendale completo
 */
export interface TariffarioAziendale {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string | null;
    // P59 Sprint 11: Rimosso tipo (non più BASE/AZIENDALE con M2M)
    convenzioneId?: string | null;
    convenzione?: ConvenzioneSimple | null;
    validoDa: string;
    validoA?: string | null;
    attivo: boolean;
    // P59 Sprint 11.1: Rimosso successore dal tariffario (ora è su association)
    voci: VoceTariffario[];
    note?: string | null;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    createdBy?: string | null;
    // P59 Sprint 11.1: Associazioni M2M con successore specifico per azienda
    companyAssociations?: TariffarioCompanyAssociation[];
    _count?: {
        voci: number;
        companyAssociations?: number;  // P59: Rimosso tariffariDerivati
    };
}

/**
 * Tariffario per lista (senza voci complete)
 * P59 Sprint 11: Aggiornato per M2M (rimosso tipo, tariffariDerivati)
 */
export interface TariffarioAziendaleListItem {
    id: string;
    codice: string;
    nome: string;
    descrizione?: string | null;
    convenzioneId?: string | null;
    convenzione?: ConvenzioneSimple | null;
    validoDa: string;
    validoA?: string | null;
    attivo: boolean;
    tenantId: string;
    createdAt: string;
    // P59 Sprint 11: Info associazione quando recuperato via company
    association?: {
        id: string;
        validoDa: string;
        validoA?: string | null;
        attivo: boolean;
        note?: string | null;
        createdAt: string;
    };
    _count?: {
        voci: number;
        companyAssociations?: number;  // Numero di aziende associate
    };
}

/**
 * Filtri per lista tariffari
 * P59 Sprint 11: Rimosso tipo e companyId (usa nuovo pattern M2M)
 */
export interface TariffarioFilters {
    convenzioneId?: string;
    attivo?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    tenantIds?: string;
    allTenants?: boolean;
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
 * P59 Sprint 11.1: Rimosso successoreId (ora è su association)
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
}

/**
 * P59 Sprint 11.1: Payload aggiornamento associazione tariffario-azienda
 */
export interface UpdateTariffarioAssociationPayload {
    validoDa?: string;
    validoA?: string | null;
    attivo?: boolean;
    note?: string | null;
    successoreAssociationId?: string | null;
}

/**
 * P59 Sprint 11: Payload associazione tariffario (M2M)
 * Associa un tariffario esistente a un'azienda senza clonare
 */
export interface AssociateTariffarioPayload {
    companyTenantProfileId: string;
    validoDa?: string;
    validoA?: string;
    note?: string;
}

/**
 * P59 Sprint 11: Associazione tariffario-azienda (M2M)
/**
 * P59 Sprint 11.1: Associazione M2M tariffario-azienda con successore specifico
 */
export interface TariffarioCompanyAssociation {
    id: string;
    tariffarioId: string;
    companyTenantProfileId: string;
    validoDa: string;
    validoA?: string | null;
    attivo: boolean;
    note?: string | null;
    createdAt: string;
    // P59 Sprint 11.1: Successore specifico per questa associazione azienda
    successoreAssociationId?: string | null;
    successoreAssociation?: {
        id: string;
        tariffario?: TariffarioAziendaleSimple & { validoDa: string };
    } | null;
    predecessoreAssociation?: {
        id: string;
        tariffario?: TariffarioAziendaleSimple & { validoA: string };
    } | null;
    tariffario?: TariffarioAziendaleSimple;
    companyTenantProfile?: {
        id: string;
        company: {
            id: string;
            ragioneSociale: string;
            partitaIva?: string;
            piva?: string;
        };
    };
}

/**
 * Payload creazione voce
 */
export interface CreateVocePayload {
    tipo: TipoVoceTariffario;
    prestazioneId?: string;
    documentoTemplateId?: string;
    nome?: string;
    descrizione?: string;
    prezzoBase: number;
    ivaAliquota?: number;
    frequenza?: FrequenzaTariffario;
    unitaCalcolo?: UnitaCalcoloTariffario;           // P44 Enhancement
    modalitaAttivazione?: ModalitaAttivazioneTariffario; // P44 Enhancement
    usaFasceDipendenti?: boolean;
    ordine?: number;
    note?: string;
    fasceDipendenti?: CreateFasciaPayload[];
    // Categoria visita MDL (solo PRESTAZIONE): prima visita vs periodica vs su richiesta
    categoriaVisita?: CategoriaVisitaMDL;
    // Durata minima in minuti per consulenze (es. 30)
    durataMinimaMinuti?: number;
    // P59: Compenso professionista per voci SOPRALLUOGO_*, DVR_*, NOMINA_*, CONSULENZA
    compensoProfessionistaTipo?: TipoCompensoMedico;
    compensoProfessionistaValore?: number;
    compensoProfessionistaMinimo?: number;
    compensoProfessionistaMassimo?: number;
}

/**
 * Payload aggiornamento voce
 */
export interface UpdateVocePayload {
    prestazioneId?: string;
    documentoTemplateId?: string;
    nome?: string;
    descrizione?: string;
    prezzoBase?: number;
    ivaAliquota?: number;
    frequenza?: FrequenzaTariffario;
    unitaCalcolo?: UnitaCalcoloTariffario;           // P44 Enhancement
    modalitaAttivazione?: ModalitaAttivazioneTariffario; // P44 Enhancement
    usaFasceDipendenti?: boolean;
    ordine?: number;
    attivo?: boolean;
    note?: string;
    // Categoria visita MDL (solo PRESTAZIONE)
    categoriaVisita?: CategoriaVisitaMDL | null;
    // Durata minima in minuti (solo CONSULENZA)
    durataMinimaMinuti?: number | null;
    // P59: Compenso professionista
    compensoProfessionistaTipo?: TipoCompensoMedico;
    compensoProfessionistaValore?: number;
    compensoProfessionistaMinimo?: number;
    compensoProfessionistaMassimo?: number;
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

export const TIPO_PRESTAZIONE_MDL_LABELS: Record<TipoPrestazioneMDL, string> = {
    VISITA_MEDICINA_LAVORO: 'Visita MDL',
    ESAME_STRUMENTALE: 'Esame Strumentale',
    ESAME_LABORATORIO: 'Esame Laboratorio',
    VACCINAZIONE: 'Vaccinazione',
    VISITA_SPECIALISTICA: 'Visita Specialistica',
    CONSULENZA: 'Consulenza'
};

export const FREQUENZA_LABELS: Record<FrequenzaTariffario, string> = {
    UNA_TANTUM: 'Una tantum',
    PER_VISITA: 'Per visita',
    PER_DIPENDENTE: 'Per dipendente',
    MENSILE: 'Mensile',
    TRIMESTRALE: 'Trimestrale',
    SEMESTRALE: 'Semestrale',
    ANNUALE: 'Annuale',
    SECONDO_SORVEGLIANZA: 'Secondo sorveglianza sanitaria'
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
    if (voce.tipo === 'QUESTIONARIO' && voce.documentoTemplate) {
        return voce.documentoTemplate.nome;
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
     * P59 Sprint 11: Rimosso tipo e companyId (usa M2M via getByCompany)
     */
    async getAll(filters: TariffarioFilters = {}): Promise<PaginatedResponse<TariffarioAziendaleListItem>> {
        const params = new URLSearchParams();
        if (filters.convenzioneId) params.append('convenzioneId', filters.convenzioneId);
        if (filters.attivo !== undefined) params.append('attivo', String(filters.attivo));
        if (filters.search) params.append('search', filters.search);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));
        if (filters.tenantIds) params.append('tenantIds', filters.tenantIds);
        if (filters.allTenants) params.append('allTenants', 'true');

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
     * Lista prestazioni MDL disponibili (prestazioni + questionari)
     */
    async getPrestazioniMDL(): Promise<{ success: boolean; data: PrestazioniMDLResponse }> {
        return apiGet(`${BASE_URL}/prestazioni-mdl`);
    },

    /**
     * Dettaglio tariffario con voci
     * @param id - ID del tariffario
     * @param tenantParams - Parametri tenant opzionali (tenantIds, allTenants) per accesso cross-tenant
     */
    async getById(id: string, tenantParams?: { tenantIds?: string[]; allTenants?: boolean }): Promise<{ success: boolean; data: TariffarioAziendale }> {
        const queryParams = new URLSearchParams();
        if (tenantParams?.tenantIds?.length) {
            queryParams.append('tenantIds', tenantParams.tenantIds.join(','));
        }
        if (tenantParams?.allTenants) {
            queryParams.append('allTenants', 'true');
        }
        const queryString = queryParams.toString();
        return apiGet(`${BASE_URL}/${id}${queryString ? `?${queryString}` : ''}`);
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
     * Clona un tariffario con tutte le sue voci
     */
    async clonaTariffario(id: string): Promise<{ success: boolean; data: TariffarioAziendale; message: string }> {
        return apiPost(`${BASE_URL}/${id}/clone`, {});
    },

    /**
     * P59 Sprint 11: Associa tariffario a un'azienda (M2M, non crea copia)
     * @param id - ID del tariffario da associare
     * @param data - Dati dell'associazione (companyTenantProfileId, validità, note)
     */
    async associate(
        id: string,
        data: AssociateTariffarioPayload
    ): Promise<{ success: boolean; data: TariffarioCompanyAssociation; message?: string }> {
        return apiPost(`${BASE_URL}/${id}/associate`, data);
    },

    /**
     * P59 Sprint 11: Rimuove l'associazione tariffario-azienda (M2M)
     */
    async dissociate(
        tariffarioId: string,
        companyTenantProfileId: string
    ): Promise<{ success: boolean; message: string }> {
        return apiDelete(`${BASE_URL}/${tariffarioId}/dissociate/${companyTenantProfileId}`);
    },

    /**
     * P59 Sprint 11: Ottiene le aziende associate a un tariffario (M2M)
     */
    async getAssociatedCompanies(
        tariffarioId: string
    ): Promise<{
        success: boolean; data: Array<{
            associationId: string;
            validoDa: string;
            validoA?: string | null;
            attivo: boolean;
            note?: string | null;
            createdAt: string;
            company: {
                id: string;
                companyId: string;
                ragioneSociale: string;
                partitaIva?: string;
                codiceFiscale?: string;
                status: string;
                numeroSedi: number;
            };
        }>
    }> {
        return apiGet(`${BASE_URL}/${tariffarioId}/companies`);
    },

    /**
     * P59 Sprint 11.1: Aggiorna un'associazione tariffario-azienda
     * Permette di modificare validità, stato attivo, note e successore specifico per questa azienda
     */
    async updateAssociation(
        associationId: string,
        data: UpdateTariffarioAssociationPayload
    ): Promise<{ success: boolean; data: TariffarioCompanyAssociation; message?: string }> {
        return apiPatch(`${BASE_URL}/associations/${associationId}`, data);
    },

    /**
     * Scarica il PDF del tariffario
     * 
     * Usa axios invece di fetch nativo per beneficiare del proxy Vite
     * e degli interceptor configurati (headers, auth, etc.)
     */
    async downloadPDF(id: string, tenantParams?: { tenantIds?: string[]; allTenants?: boolean }): Promise<void> {
        const params = new URLSearchParams();
        if (tenantParams?.tenantIds?.length) {
            params.append('tenantIds', tenantParams.tenantIds.join(','));
        }
        if (tenantParams?.allTenants) {
            params.append('allTenants', 'true');
        }

        const queryString = params.toString();
        const url = `${BASE_URL}/${id}/pdf${queryString ? `?${queryString}` : ''}`;

        // Usa getToken() per centralizare l'accesso al token
        const token = getToken();
        if (!token) {
            throw new Error('Non autenticato');
        }

        // Ottieni brandId per l'header X-Frontend-Id
        const brandId = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Frontend-Id': brandId, // Importante per il multi-tenant
            },
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Errore nel download del PDF: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');

        // Cleanup dopo un po'
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60000);
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
     * Aggiunge più voci in un'unica transazione (usato per VISITA_MEDICINA_LAVORO)
     */
    async addVoceBatch(tariffarioId: string, voci: CreateVocePayload[]): Promise<{ success: boolean; data: VoceTariffario[] }> {
        return apiPost(`${BASE_URL}/${tariffarioId}/voci/batch`, { voci });
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

    /**
     * P59 Sprint 11.2: Riordina le voci del tariffario
     * @param tariffarioId - ID del tariffario
     * @param updates - Array di { id, ordine } per ogni voce da aggiornare
     */
    async reorderVoci(tariffarioId: string, updates: Array<{ id: string; ordine: number }>): Promise<{ success: boolean; message: string }> {
        return apiPatch(`${BASE_URL}/${tariffarioId}/voci/reorder`, { updates });
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
    },

    /**
     * P59 Sprint 11.2: Ottiene i tariffari di un'azienda (via M2M)
     */
    async getByCompany(companyId: string): Promise<{ success: boolean; data: TariffarioAziendaleListItem[] }> {
        return apiGet(`/api/v1/companies/${companyId}/tariffari`);
    },

    /**
     * P65: Ottiene le voci tariffario aziendali che contengono una specifica prestazione
     * Ritorna voci con tariffario parent e aziende associate
     */
    async getVociByPrestazione(prestazioneId: string): Promise<{ success: boolean; data: VoceTariffarioWithContext[] }> {
        return apiGet(`${BASE_URL}/by-prestazione/${prestazioneId}`);
    },

    /**
     * P65: Ottiene le voci tariffario di tipo QUESTIONARIO che prezzano un DocumentoTemplate
     * Utilizzato da modulistica/:id tab Tariffario MDL
     */
    async getVociByTemplate(templateId: string): Promise<{ success: boolean; data: VoceTariffarioWithContext[] }> {
        return apiGet(`${BASE_URL}/by-template/${templateId}`);
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

// =============================================
// CONSULENZE MDL TYPES & API
// =============================================

/**
 * Stato workflow consulenza MDL
 */
export type StatoConsulenzaMDL = 'DA_RENDICONTARE' | 'RENDICONTATA' | 'FATTURATA' | 'ANNULLATA';

export const STATO_CONSULENZA_LABELS: Record<StatoConsulenzaMDL, string> = {
    DA_RENDICONTARE: 'Da rendicontare',
    RENDICONTATA: 'Rendicontata',
    FATTURATA: 'Fatturata',
    ANNULLATA: 'Annullata'
};

export const STATO_CONSULENZA_COLORS: Record<StatoConsulenzaMDL, string> = {
    DA_RENDICONTARE: 'bg-yellow-100 text-yellow-800',
    RENDICONTATA: 'bg-blue-100 text-blue-800',
    FATTURATA: 'bg-green-100 text-green-800',
    ANNULLATA: 'bg-gray-100 text-gray-500 line-through'
};

/**
 * Consulenza MDL registrata per azienda
 */
export interface ConsulenzaMDL {
    id: string;
    companyTenantProfileId: string;
    siteId?: string | null;
    site?: { id: string; nome: string } | null;
    professionistaId?: string | null;
    data: string;
    durataMinuti: number;
    oggetto: string;
    note?: string | null;
    importo?: number | null;
    stato: StatoConsulenzaMDL;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export interface CreateConsulenzaPayload {
    companyTenantProfileId: string;
    siteId?: string;
    professionistaId?: string;
    data: string;
    durataMinuti: number;
    oggetto: string;
    note?: string;
    importo?: number;
}

export interface UpdateConsulenzaPayload {
    siteId?: string | null;
    professionistaId?: string | null;
    data?: string;
    durataMinuti?: number;
    oggetto?: string;
    note?: string | null;
    importo?: number | null;
}

const CONSULENZE_MDL_URL = '/api/v1/consulenze-mdl';

export const consulenzeMDLApi = {
    async getAll(
        filters: { companyTenantProfileId?: string; stato?: StatoConsulenzaMDL; page?: number; limit?: number } = {}
    ): Promise<{ success: boolean; data: ConsulenzaMDL[]; total: number; page: number; totalPages: number }> {
        const params = new URLSearchParams();
        if (filters.companyTenantProfileId) params.append('companyTenantProfileId', filters.companyTenantProfileId);
        if (filters.stato) params.append('stato', filters.stato);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));
        const qs = params.toString();
        return apiGet(`${CONSULENZE_MDL_URL}${qs ? `?${qs}` : ''}`);
    },

    async getById(id: string): Promise<{ success: boolean; data: ConsulenzaMDL }> {
        return apiGet(`${CONSULENZE_MDL_URL}/${id}`);
    },

    async create(data: CreateConsulenzaPayload): Promise<{ success: boolean; data: ConsulenzaMDL }> {
        return apiPost(CONSULENZE_MDL_URL, data);
    },

    async update(id: string, data: UpdateConsulenzaPayload): Promise<{ success: boolean; data: ConsulenzaMDL }> {
        return apiPut(`${CONSULENZE_MDL_URL}/${id}`, data);
    },

    async rendiconta(id: string): Promise<{ success: boolean; data: ConsulenzaMDL; message: string }> {
        return apiPatch(`${CONSULENZE_MDL_URL}/${id}/rendiconta`, {});
    },

    async annulla(id: string): Promise<{ success: boolean; data: ConsulenzaMDL; message: string }> {
        return apiPatch(`${CONSULENZE_MDL_URL}/${id}/annulla`, {});
    },

    async delete(id: string, deletionReason: string): Promise<{ success: boolean; message: string }> {
        return apiDeleteWithPayload(`${CONSULENZE_MDL_URL}/${id}`, { deletionReason });
    }
};

// ─── Uscite MC ──────────────────────────────────────────────────────────────

export type StatoUscitaMC = 'DA_FATTURARE' | 'FATTURATA' | 'ANNULLATA';

export interface UscitaMC {
    id: string;
    companyTenantProfileId: string;
    siteId?: string | null;
    medicoId?: string | null;
    site?: { id: string; siteName: string } | null;
    medico?: { id: string; firstName: string; lastName: string; gender?: string } | null;
    data: string;
    note?: string | null;
    stato: StatoUscitaMC;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export interface MedicoDisponibileUscita {
    id: string;
    firstName: string;
    lastName: string;
    gender?: string;
    tipoRuolo: 'MEDICO_COMPETENTE' | 'MEDICO_COMPETENTE_COORDINATO';
    isPrimario: boolean;
}

export interface CreateUscitaMCPayload {
    companyTenantProfileId: string;
    siteId?: string;
    medicoId?: string;
    data: string;
    note?: string;
}

const USCITE_MC_URL = '/api/v1/uscite-mc';

export const usciteMCApi = {
    async getAll(
        filters: { companyTenantProfileId?: string; stato?: StatoUscitaMC; page?: number; limit?: number } = {}
    ): Promise<{ success: boolean; data: UscitaMC[]; total: number; page: number; totalPages: number }> {
        const params = new URLSearchParams();
        if (filters.companyTenantProfileId) params.append('companyTenantProfileId', filters.companyTenantProfileId);
        if (filters.stato) params.append('stato', filters.stato);
        if (filters.page) params.append('page', String(filters.page));
        if (filters.limit) params.append('limit', String(filters.limit));
        const qs = params.toString();
        return apiGet(`${USCITE_MC_URL}${qs ? `?${qs}` : ''}`);
    },

    async getMediciDisponibili(
        companyTenantProfileId: string
    ): Promise<{ success: boolean; data: MedicoDisponibileUscita[] }> {
        return apiGet(`${USCITE_MC_URL}/medici-disponibili?companyTenantProfileId=${companyTenantProfileId}`);
    },

    async create(data: CreateUscitaMCPayload): Promise<{ success: boolean; data: UscitaMC }> {
        return apiPost(USCITE_MC_URL, data);
    },

    async annulla(id: string): Promise<{ success: boolean; data: UscitaMC; message: string }> {
        return apiPatch(`${USCITE_MC_URL}/${id}/annulla`, {});
    },

    async delete(id: string, deletionReason: string): Promise<{ success: boolean; message: string }> {
        return apiDeleteWithPayload(`${USCITE_MC_URL}/${id}`, { deletionReason });
    }
};

export default tariffariAziendaliApi;
