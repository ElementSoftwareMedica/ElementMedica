/**
 * Clinica API Service
 * Centralized API client for ElementMedica clinical module
 * 
 * Provides typed methods for all clinical API endpoints:
 * - Structure (poliambulatori, ambulatori, strumenti)
 * - Catalog (prestazioni, listini, convenzioni)
 * - Agenda (slots, appuntamenti)
 * - Clinical (visite, referti)
 * - Patients (pazienti)
 * 
 * @module services/clinicaApi
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiDeleteWithPayload, apiUpload, apiDownload, apiDownloadWithFilename } from './api';
import type { PersonTenantProfile } from '../types/personMultiTenant';

// Base URL for clinical endpoints
const CLINICA_BASE = '/api/v1/clinica';

// =====================================================
// TYPES
// =====================================================

// API Response wrapper type (backend returns { success, data })
interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    message?: string;
}

// API Response con meta (per permessi e flag aggiuntivi)
interface ApiResponseWithMeta<T> {
    success: boolean;
    data: T;
    meta?: {
        canViewOtherMedici?: boolean;
        [key: string]: unknown;
    };
    error?: string;
    message?: string;
}

// Risultato con meta inclusi
export interface ResultWithMeta<T> {
    data: T;
    meta?: {
        canViewOtherMedici?: boolean;
        [key: string]: unknown;
    };
}

// Helper per estrarre dati dalla risposta wrapper
const extractData = <T>(response: ApiResponse<T>): T => {
    if (response && typeof response === 'object' && 'data' in response) {
        return response.data;
    }
    // Fallback: se la risposta non è wrapped, ritornala com'è
    return response as unknown as T;
};

// Interfaccia per risposta paginata del backend (flat structure)
interface BackendPaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Helper per estrarre risposte paginate (mantiene struttura { data, pagination })
const extractPaginatedData = <T>(response: BackendPaginatedResponse<T>): PaginatedResponse<T> => {
    return {
        data: response?.data || [],
        pagination: response?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
    };
};

// Common types
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface QueryOptions {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    [key: string]: unknown;
}

// Structure types
// Prisma enum StatoPoliambulatorio
export type StatoPoliambulatorio = 'ATTIVO' | 'INATTIVO' | 'SOSPESO';

export interface Poliambulatorio {
    id: string;
    tenantId: string;
    nome: string;
    codice: string;
    descrizione?: string;
    indirizzo?: string;
    citta?: string;
    cap?: string;
    provincia?: string;
    telefono?: string;
    email?: string;
    pec?: string;
    piva?: string;
    codiceFiscale?: string;
    codiceRegionale?: string;
    direttoreSanitarioId?: string;
    stato: StatoPoliambulatorio;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // Relations (when populated)
    ambulatori?: Ambulatorio[];
    sedi?: SedePoliambulatorio[];
    _count?: {
        ambulatori?: number;
        sedi?: number;
    };
}

// Prisma enum StatoAmbulatorio
export type StatoAmbulatorio = 'ATTIVO' | 'INATTIVO' | 'MANUTENZIONE' | 'CHIUSO';

// Tipi di chiusura speciale
export type TipoChiusuraSpeciale =
    | 'FESTIVITA'      // Festività nazionali (Natale, Pasqua, etc.)
    | 'PONTE'          // Ponti (es. ponte 2 Giugno)
    | 'FERIE_ESTIVE'   // Chiusura estiva
    | 'FERIE_NATALIZIE'// Chiusura natalizia
    | 'FERIE_PASQUALI' // Chiusura pasquale
    | 'STRAORDINARIA'  // Chiusura straordinaria (es. ristrutturazione)
    | 'FORMAZIONE'     // Chiusura per formazione del personale
    | 'EVENTO'         // Chiusura per evento speciale
    | 'ALTRO';         // Altro tipo di chiusura

// Chiusure speciali della sede (festivi, ponti, ferie, etc.)
export interface ChiusuraSpecialeSede {
    id: string;
    sedeId: string;
    tipo: TipoChiusuraSpeciale;
    nome: string;           // Nome della chiusura (es. "Natale", "Ponte 2 Giugno")
    descrizione?: string;   // Descrizione opzionale
    dataInizio: string;     // Data inizio chiusura (ISO string)
    dataFine: string;       // Data fine chiusura (per chiusure multi-giorno)
    oraInizio?: string;     // Orario inizio chiusura (se chiusura parziale)
    oraFine?: string;       // Orario fine chiusura (se chiusura parziale)
    isParziale: boolean;    // Se true, chiusura solo in parte della giornata
    ricorrente: boolean;    // Se true, si ripete ogni anno alla stessa data
    annoRiferimento?: number; // Anno di riferimento per chiusure ricorrenti
    attivo: boolean;
    tenantId: string;
}

// Input types for create/update operations (without auto-generated fields)
export type ChiusuraSpecialeSedeInput = Omit<ChiusuraSpecialeSede, 'id' | 'sedeId' | 'tenantId'> & {
    id?: string; // Optional for updates
};

// Orari di apertura settimanali della sede
export interface OrarioSede {
    id: string;
    sedeId: string;
    giornoSettimana: number; // 0=Domenica, 1=Lunedì, ..., 6=Sabato
    fascia: number; // 1=Prima fascia (mattina), 2=Seconda fascia (pomeriggio), etc.
    oraInizio: string; // Formato HH:MM
    oraFine: string;   // Formato HH:MM
    isChiuso: boolean;
    note?: string;
    tenantId: string;
}

// Input type for create/update operations (without auto-generated fields)
export type OrarioSedeInput = Omit<OrarioSede, 'id' | 'sedeId' | 'tenantId'>;

export interface SedePoliambulatorio {
    id: string;
    tenantId: string;
    poliambulatorioId: string;
    direttoreSanitarioId?: string;
    nome: string;
    codice?: string;
    indirizzo: string;
    citta: string;
    cap: string;
    provincia: string;
    telefono?: string;
    email?: string;
    latitudine?: number;
    longitudine?: number;
    isPrincipale: boolean;
    isAttiva: boolean;
    oraAperturaOverride?: string;
    oraChiusuraOverride?: string;
    noteAccessibilita?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // Relations (when populated)
    poliambulatorio?: Poliambulatorio;
    direttoreSanitario?: {
        id: string;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        registerCode?: string;
        specialties?: string[];
    };
    ambulatori?: Ambulatorio[];
    orariSettimanali?: OrarioSede[];
    chiusureSpeciali?: ChiusuraSpecialeSede[];
    _count?: {
        ambulatori?: number;
    };
}

// Input type for creating/updating SedePoliambulatorio
export type SedePoliambulatorioInput = Omit<
    Partial<SedePoliambulatorio>,
    'id' | 'tenantId' | 'poliambulatorioId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'poliambulatorio' | 'direttoreSanitario' | 'ambulatori' | '_count' | 'orariSettimanali' | 'chiusureSpeciali'
> & {
    orariSettimanali?: OrarioSedeInput[];
    chiusureSpeciali?: ChiusuraSpecialeSedeInput[];
};

export interface Ambulatorio {
    id: string;
    tenantId: string;
    poliambulatorioId: string;
    sedeId?: string;
    nome: string;
    codice: string;
    specializzazione?: string;
    descrizione?: string;
    piano?: string;
    capacita: number;
    stato: StatoAmbulatorio;
    colore?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // Relations (when populated)
    poliambulatorio?: Poliambulatorio;
    sede?: SedePoliambulatorio;
    strumenti?: StrumentoAmbulatorio[];
    _count?: {
        appuntamenti?: number;
        prestazioni?: number;
        strumenti?: number;
    };
}

// Enum StatoStrumento - aligned with Prisma schema
export type StatoStrumento = 'ATTIVO' | 'IN_MANUTENZIONE' | 'FUORI_SERVIZIO' | 'DISMESSO' | 'IN_TARATURA';

// Enum TipologiaStrumento - aligned with Prisma schema
export type TipologiaStrumento =
    | 'ECOGRAFO' | 'ELETTROCARDIOGRAFO' | 'RADIOGRAFO' | 'MAMMOGRAFO' | 'TAC' | 'RMN'
    | 'SPIROMETRO' | 'AUDIOMETRO' | 'OFTALMOSCOPIO' | 'DERMATOSCOPIO' | 'COLPOSCOPIO'
    | 'ENDOSCOPIO' | 'ELETTROMIOGRAFO' | 'DENSITOMETRO' | 'LASER' | 'CARBOSSITERAPIA'
    | 'HOLTER_ECG' | 'HOLTER_PRESSORIO' | 'DEFIBRILLATORE' | 'MONITOR_MULTIPARAMETRICO'
    | 'ELETTROBISTURI' | 'CRIOCHIRURGIA' | 'ALTRO';

export interface Strumento {
    id: string;
    tenantId: string;
    codice: string;
    nome: string;
    descrizione?: string;
    marca?: string;
    modello?: string;
    numeroSerie?: string;
    ambulatorioId?: string;
    tipologia?: TipologiaStrumento; // Tipologia di strumento (ECG, Ecografo, etc.)
    stato: StatoStrumento;
    dataAcquisto?: string;
    costoAcquisto?: number;
    dataFineAmmortamento?: string;
    ultimaManutenzione?: string;
    prossimaManutenzione?: string;
    intervallManutenzione?: number;
    ultimaTaratura?: string;
    prossimaTaratura?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    createdBy?: string;
    // Relations (when populated)
    ambulatorio?: Ambulatorio;
    ambulatoriAssegnati?: StrumentoAmbulatorio[];
    manutenzioni?: ManutenzioneStrumento[];
    prestazioniStrumento?: PrestazioneStrumento[];
    _count?: {
        ambulatoriAssegnati?: number;
        manutenzioni?: number;
    };
}

export interface StrumentoAmbulatorio {
    id: string;
    strumentoId: string;
    ambulatorioId: string;
    dataAssegnazione: string;
    dataFineAssegnazione?: string;
    isActive: boolean;
    strumento?: Strumento;
    ambulatorio?: Ambulatorio;
}

export interface ManutenzioneStrumento {
    id: string;
    tenantId: string;
    strumentoId: string;
    tipo: 'PROGRAMMATA' | 'STRAORDINARIA' | 'CORRETTIVA' | 'PREVENTIVA';
    descrizione?: string;
    dataProgrammata?: string;
    dataEsecuzione?: string;
    durataOre?: number;
    esecutore?: string;
    contattoEsecutore?: string;
    costoManodopera?: number;
    costoRicambi?: number;
    costoTotale?: number;
    numeroFattura?: string;
    stato: 'PROGRAMMATA' | 'IN_CORSO' | 'COMPLETATA' | 'ANNULLATA';
    esitoNote?: string;
    prossimaScadenza?: string;
    rapportoUrl?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    strumento?: Strumento;
}

// Medico types - Now based on Person model with MEDICO role
export interface Medico {
    id: string;
    tenantId: string;
    // Person fields (unified entity)
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    taxCode?: string;
    username?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
    notes?: string;
    profileImage?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
    lastLogin?: string;
    // New fields (Progetto 44)
    birthDate?: string;
    pec?: string;
    residenceAddress?: string;
    residenceCity?: string;
    province?: string;
    postalCode?: string;
    iban?: string;
    specialties?: string[];
    registerCode?: string;
    registerCode2?: string;
    shortDescription?: string;
    fullDescription?: string;
    preferences?: { alboRegione?: string;[key: string]: unknown };
    // Legacy fields (for backward compatibility)
    personId?: string;
    codice?: string;
    nome?: string;
    cognome?: string;
    codiceFiscale?: string;
    telefono?: string;
    specializzazione?: string;
    alboRegione?: string;
    numeroAlbo?: string;
    numeroIscrizione?: string;
    provinciaAlbo?: string;
    dataIscrizione?: string;
    abilitazioni?: Array<{
        id: string;
        prestazioneId: string;
        attivo: boolean;
        dataAbilitazione?: string;
        prestazione?: {
            id: string;
            codice: string;
            nome: string;
            tipo?: string;
            brancaSpecialistica?: string;
            prezzoBase?: number | null;
            prezzoPrimaVisita?: number | null;
            prezzoControllo?: number | null;
            durata?: number | null;
        };
    }>;
    note?: string;
    isActive?: boolean;
    // Relations
    personRoles?: Array<{
        id: string;
        roleType: string;
        isActive: boolean;
    }>;
    // Multi-tenant support (Progetto 48)
    tenantProfiles?: PersonTenantProfile[];
    currentProfile?: PersonTenantProfile;
    ambulatoriAssegnati?: MedicoAmbulatorio[];
    disponibilita?: DisponibilitaMedico[];
    _count?: {
        appuntamenti?: number;
        visite?: number;
    };
}

// Tipi documento personale (allineato a Prisma TipoDocumentoPersonale)
export type TipoDocumentoPersonale =
    // Documenti personali medico/dipendente
    | 'ALLEGATO_3'
    | 'CONTRATTO'
    | 'ASSICURAZIONE'
    | 'ISCRIZIONE_ALBO'
    | 'CURRICULUM'
    | 'LAUREA'
    | 'SPECIALIZZAZIONE'
    | 'FORMAZIONE'
    | 'DOCUMENTO_IDENTITA'
    | 'CODICE_FISCALE'
    | 'CERTIFICATO_PENALE'
    | 'VISITA_MEDICA_IDONEITA'
    | 'PRIVACY'
    // Documenti clinici paziente
    | 'REFERTO'
    | 'CERTIFICATO_MEDICO'
    | 'FATTURA_SANITARIA'
    | 'RICEVUTA_SANITARIA'
    | 'CONSENSO_INFORMATO'
    | 'ANAMNESI'
    | 'PRESCRIZIONE'
    | 'ESAME_LABORATORIO'
    | 'IMAGING'
    | 'ALTRO';

export interface PersonDocument {
    id: string;
    personId: string;
    tipo: TipoDocumentoPersonale;
    titolo: string;
    descrizione?: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType: string;
    hashFile?: string;
    // Contesto clinico (opzionale)
    visitaId?: string;
    pazienteId?: string;
    // Versioning
    version: number;
    isCurrentVersion: boolean;
    previousVersionId?: string;
    // Validità
    dataDocumento: string;
    dataScadenza?: string;
    isExpired: boolean;
    valido: boolean;
    // Audit
    uploadedBy: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // Relations
    uploader?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    visita?: {
        id: string;
        dataOra: string;
    };
}

export interface CreatePersonDocumentInput {
    tipo: TipoDocumentoPersonale;
    titolo: string;
    descrizione?: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
    hashFile?: string;
    dataDocumento?: string;
    dataScadenza?: string;
    visitaId?: string;
    pazienteId?: string;
}

export interface MedicoAmbulatorio {
    id: string;
    medicoId: string;
    ambulatorioId: string;
    isDefault: boolean;
    dataAssegnazione: string;
    dataFineAssegnazione?: string;
    isActive: boolean;
    medico?: Medico;
    ambulatorio?: Ambulatorio;
}

// Catalog types - aligned with backend CLINICAL_ENUMS.TipoPrestazione
export type TipoPrestazione =
    | 'VISITA_SPECIALISTICA'
    | 'VISITA_MEDICINA_LAVORO'
    | 'ESAME_STRUMENTALE'
    | 'ESAME_LABORATORIO'
    | 'INTERVENTO_AMBULATORIALE'
    | 'VACCINAZIONE'
    | 'CERTIFICAZIONE'
    | 'CONSULENZA';

// Join table types - aligned with Prisma schema
export interface PrestazioneStrumento {
    id: string;
    prestazioneId: string;
    strumentoId: string;
    isObbligatorio: boolean;
    note?: string;
    tenantId: string;
    createdAt: string;
    deletedAt?: string;
    prestazione?: Prestazione;
    strumento?: Strumento;
}

// Tipologia strumento richiesta per prestazione
export interface PrestazioneTipologiaStrumento {
    id: string;
    prestazioneId: string;
    tipologia: TipologiaStrumento;
    isObbligatorio: boolean;
    quantitaMinima: number;
    note?: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

export interface AmbulatorioPrestazione {
    id: string;
    ambulatorioId: string;
    prestazioneId: string;
    attivo: boolean;
    tenantId: string;
    createdAt: string;
    deletedAt?: string;
    ambulatorio?: Ambulatorio;
    prestazione?: Prestazione;
}

export interface MedicoAbilitato {
    id: string;
    medicoId: string;
    prestazioneId: string;
    attivo: boolean;
    dataAbilitazione: string;
    durataMedico?: number;  // Durata specifica per medico (override)
    compensoTipo: TipoCompensoMedico;
    compensoValore: number;
    compensoMinimo?: number;
    compensoMassimo?: number;
    note?: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    prestazione?: Prestazione;
    medico?: Medico;
}

export interface Prestazione {
    id: string;
    tenantId: string;
    codice: string;
    nome: string;
    descrizione?: string;
    tipo: TipoPrestazione;
    brancheSpecialistiche?: string[]; // Array di branche specialistiche
    brancaSpecialistica?: string; // Legacy - backward compatibility
    durataPrevista: number;
    prezzoBase: number;
    ivaAliquota: number;
    attivo: boolean;
    istruzioniPreparazione?: string;
    richiedeStrumento: boolean;
    strumentiRichiesti: string[];
    // P65.7: Gestione prima visita / controllo
    prezzoPrimaVisita?: number; // Prezzo prima visita (se diverso da prezzoBase)
    prezzoControllo?: number;   // Prezzo controllo (se diverso da prezzoBase)
    durataPrimaVisita?: number; // Durata prima visita in minuti (se diversa da durataPrevista)
    durataControllo?: number;   // Durata visita di controllo in minuti (se diversa da durataPrevista)
    scadenzaDefaultMesi?: number; // Scadenza default per prossimo controllo (mesi)
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    createdBy?: string;
    // Relations (when populated)
    ambulatori?: AmbulatorioPrestazione[];
    listiniPrezzo?: ListinoPrezzo[];
    mediciAbilitati?: MedicoAbilitato[];
    // P65.7: templateCampi rimosso - consolidato in visitTemplates con scope=CATALOGO
    visitTemplates?: VisitTemplate[];
    strumentiNecessari?: PrestazioneStrumento[];
    tipologieRichieste?: PrestazioneTipologiaStrumento[]; // Tipologie strumenti richieste
    _count?: {
        visite?: number;
        ambulatori?: number;
        listiniPrezzo?: number;
    };
}

export interface PrestazioneAmbulatorio {
    id: string;
    prestazioneId: string;
    ambulatorioId: string;
    isActive: boolean;
    createdAt: string;
    prestazione?: Prestazione;
    ambulatorio?: Ambulatorio;
}

// Enum per i tipi di campo visita (allineato a Prisma TipoCampoVisita)
// P65.7: Usato da VisitField in VisitTemplate
export type TipoCampoVisita =
    | 'TESTO'
    | 'TEXTAREA'
    | 'NUMERO'
    | 'DECIMALE'
    | 'DATA'
    | 'DATETIME'
    | 'BOOLEAN'
    | 'SELECT'
    | 'MULTISELECT'
    | 'FILE';

// P65.7: TemplateCampoVisita RIMOSSO - consolidato in VisitTemplate con scope=CATALOGO
// Usare visitTemplatesApi per gestire i template catalogo delle prestazioni

export interface ListinoPrezzo {
    id: string;
    tenantId: string;
    prestazioneId?: string;      // Opzionale: per listino prestazione singola
    bundleId?: string;           // Opzionale: per listino bundle (Tariffario Avanzato)
    documentoTemplateId?: string; // P72_19: per listino questionario MDL
    poliambulatorioId?: string;
    convenzioneId?: string;
    medicoId?: string;           // Tariffario: prezzo specifico per medico
    codice?: string;             // Tariffario: riferimento rapido
    nome?: string;
    descrizione?: string;        // Tariffario: note aggiuntive
    prezzo: number;
    ivaAliquota: number;
    scontoPercentuale?: number;  // Tariffario: sconto sul prezzo base
    durataMedico?: number;       // Durata specifica per medico (override)
    // Compenso medico override
    compensoMedicoTipo?: TipoCompensoMedico;
    compensoMedicoValore?: number;
    compensoMedicoMinimo?: number;
    compensoMedicoMassimo?: number;
    // Validità e priorità
    attivo: boolean;
    validoDa: string;
    validoA?: string;
    priorita: number;            // Tariffario: priorità per conflitti
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    createdBy?: string;
    // Relations
    prestazione?: Prestazione;
    bundle?: OffertaBundle;      // Relazione bundle
    documentoTemplate?: { id: string; nome: string; codice?: string; tipo?: string }; // P72_19
    poliambulatorio?: Poliambulatorio;
    convenzione?: Convenzione;
    medico?: Medico;
}

// Tariffario: Tipo compenso medico
export type TipoCompensoMedico = 'PERCENTUALE' | 'FISSO' | 'MINIMO_MASSIMO';

// =====================================================
// MDL - MEDICINA DEL LAVORO TYPES (Progetto 56)
// =====================================================

// Enum types - aligned with backend schema
/** Tipi visita MDL — D.Lgs 81/08 art. 41 + D.Lgs 19/2022. Allineato a Prisma enum TipoVisitaMDL. */
export type TipoVisitaMDL =
    // Visite ordinarie (Art. 41 c.2)
    | 'PREVENTIVA'                // Art. 41 c.2a – prima dell'assunzione (include prima visita nuovo lavoratore)
    | 'PREVENTIVA_PREASSUNTIVA'   // Art. 41 c.2a-bis – preassuntiva su scelta datore
    | 'PERIODICA'
    | 'CAMBIO_MANSIONE'
    | 'CESSAZIONE_RAPPORTO'
    | 'PRECEDENTE_ASSENZA'
    | 'SU_RICHIESTA_LAVORATORE'
    // Visite speciali
    | 'STRAORDINARIA'
    | 'VERIFICA_IDONEITA'
    | 'RIENTRO_MATERNITA';

export type CodiceRischio =
    | 'RUM' | 'VIB_MB' | 'VIB_WBV' | 'RAD_ION' | 'RAD_NIR' | 'CEM' | 'MIC' | 'CHI'
    | 'CAN' | 'AMI' | 'PIO' | 'BIO' | 'MMC' | 'MOV_RIP' | 'POS' | 'NOT' | 'VDT'
    | 'SLC' | 'QUO' | 'SPA_CON' | 'GUI_MEZ' | 'CAR_ELE' | 'ELE' | 'INC' | 'ISO'
    | 'IPE' | 'POL' | 'ALC';

export type LivelloRischio = 'BASSO' | 'MEDIO' | 'ALTO' | 'MOLTO_ALTO';

export type CompilatoreQuestionario = 'MEDICO' | 'PAZIENTE' | 'ENTRAMBI' | 'ASSISTITO';

// Aligned with Prisma enum CategoriaRischio
export type CategoriaRischio =
    | 'FISICI'      // Rumore, vibrazioni, radiazioni, microclima
    | 'CHIMICI'     // Chimici, cancerogeni, amianto, piombo
    | 'BIOLOGICI'   // Agenti biologici
    | 'ERGONOMICI'  // MMC, movimenti ripetitivi, posture
    | 'ORGANIZZATIVI' // Notturno, VDT, stress
    | 'SPECIFICI'   // Quota, spazi confinati, guida
    | 'SETTORIALI'; // Carrelli, elettrico, incendio

export type TipoGiudizioIdoneita =
    | 'IDONEO'
    | 'IDONEO_CON_PRESCRIZIONI'
    | 'IDONEO_CON_LIMITAZIONI'
    | 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI'
    | 'NON_IDONEO_TEMPORANEO'
    | 'NON_IDONEO_PERMANENTE';

export type StatoGiudizio = 'BOZZA' | 'VALIDO' | 'SCADUTO' | 'SOSTITUITO' | 'RICORRIBILE' | 'RICORSO_IN_CORSO';

// Valori enum Prisma per periodicità esami
export type TipoPeriodicita =
    | 'MESI_6'         // Semestrale
    | 'MESI_12'        // Annuale
    | 'MESI_24'        // Biennale
    | 'MESI_36'        // Triennale
    | 'MESI_60'        // Quinquennale
    | 'SU_INDICAZIONE' // Come da protocollo MC
    | 'UNA_TANTUM';    // Solo alla prima visita

// MDL Interfaces
export interface Mansione {
    id: string;
    tenantId: string;
    siteId?: string;
    codice: string;
    denominazione: string;
    descrizione?: string;
    settore?: string;
    areaLavoro?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    site?: CompanySite;
    rischi?: MansioneRischio[];
    rischiAssociati?: MansioneRischio[];
    lavoratori?: LavoratoreMansione[];
    _count?: {
        rischi: number;
        rischiAssociati: number;
        lavoratori: number;
    };
}

export interface MansioneRischio {
    id: string;
    mansioneId: string;
    codiceRischio: CodiceRischio;
    // Backend uses livello/categoria, frontend transforms to livelloRischio/categoriaRischio
    livello?: LivelloRischio;
    livelloRischio?: LivelloRischio;
    categoria?: CategoriaRischio;
    categoriaRischio?: CategoriaRischio;
    descrizioneEsposizione?: string;
    descrizione?: string;
    misurePrevenzioneDPI?: string;
    fonteRischio?: string;
    periodicitaMesi?: number;
    noteValutazione?: string;
    tenantId: string;
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string;
    mansione?: Mansione;
}

// DTO per create/update Mansione
export interface MansioneRischioInput {
    codiceRischio: CodiceRischio;
    livello?: LivelloRischio;
    categoria?: CategoriaRischio;
    descrizioneEsposizione?: string;
    misurePrevenzioneDPI?: string;
    fonteRischio?: string;
    periodicitaMesi?: number;
}

export interface MansioneCreateInput {
    codice: string;
    denominazione: string;
    siteId?: string;
    descrizione?: string;
    settore?: string;
    areaLavoro?: string;
    rischi?: MansioneRischioInput[];
}

export interface MansioneUpdateInput extends Partial<MansioneCreateInput> { }

// Person basic info for lavoratori relations
interface PersonBasicInfo {
    id: string;
    firstName?: string;
    lastName?: string;
}

export interface LavoratoreMansione {
    id: string;
    personId: string;
    mansioneId: string;
    dataInizio?: string;
    dataAssegnazione?: string;
    dataFine?: string;
    isAttiva?: boolean;
    isActive?: boolean;
    isPrimaria?: boolean;
    note?: string;
    tenantId: string;
    createdAt: string;
    deletedAt?: string;
    person?: PersonBasicInfo | PersonTenantProfile;
    mansione?: Mansione;
}

export interface StatoOccupazionaleStorico {
    id: string;
    personId: string;
    tenantId: string;
    personTenantProfileId?: string | null;
    companyTenantProfileId?: string | null;
    siteId?: string | null;
    repartoId?: string | null;
    mansioneId?: string | null;
    protocolloSanitarioId?: string | null;
    titolo?: string | null;
    title?: string | null;
    status?: string | null;
    tipoContratto?: string | null;
    tipoCollaboratore?: string | null;
    oreSettimanali?: number | null;
    dataInizio: string;
    hiredDate?: string | null;
    dataFine?: string | null;
    endDate?: string | null;
    isCorrente: boolean;
    fonte?: string;
    motivo?: string | null;
    snapshot?: {
        company?: { ragioneSociale?: string; piva?: string; codiceFiscale?: string } | null;
        site?: { siteName?: string; citta?: string } | null;
        reparto?: { nome?: string; codice?: string } | null;
        protocolloSanitario?: { id?: string; codice?: string; denominazione?: string } | null;
        title?: string | null;
        hiredDate?: string | null;
        endDate?: string | null;
        tipoContratto?: string | null;
        tipoCollaboratore?: string | null;
        mansioni?: Array<{ id?: string; codice?: string; denominazione?: string; isPrimaria?: boolean }>;
        rischi?: Array<{ codiceRischio?: string; livello?: string; categoria?: string; sourceMansioneId?: string | null }>;
    } | null;
    companyTenantProfile?: { id: string; company?: { ragioneSociale?: string; piva?: string } | null } | null;
    site?: { id: string; siteName?: string; citta?: string } | null;
    reparto?: { id: string; nome?: string; codice?: string } | null;
    mansione?: { id: string; codice?: string; denominazione?: string } | null;
    protocolloSanitario?: { id: string; codice?: string; denominazione?: string } | null;
}

export interface WorkerOccupationalProfile {
    rischi: (MansioneRischio & { _isPersonalizzato?: boolean; _recordId?: string; _sourceMansioneId?: string | null })[];
    hasPersonalizedRisks: boolean;
    mansioni: Mansione[];
    statoOccupazionale?: {
        current?: StatoOccupazionaleStorico | null;
        history?: StatoOccupazionaleStorico[];
    };
    syncResult?: { assigned?: number; skipped?: number };
}

export interface GiudizioIdoneitaMansione {
    id: string;
    giudizioId: string;
    mansioneId: string;
    mansione?: Mansione;
}

export interface GiudizioIdoneita {
    id: string;
    personId: string;
    medicoCompetenteId: string;
    visitaId?: string;
    tipoGiudizio: TipoGiudizioIdoneita;
    stato: StatoGiudizio;
    dataEmissione: string;
    dataScadenza?: string;
    prescrizioniIdoneita?: string;
    limitazioni?: string;
    note?: string;
    notificatoLavoratore: boolean;
    notificatoDatoreLavoro: boolean;
    dataNotificaLavoratore?: string;
    dataNotificaDatoreLavoro?: string;
    dataRicorso?: string;
    esitoRicorso?: string;
    motivazioni?: string;
    ricorsoEntro?: string;
    // PDF generati alla conclusione visita MDL (Art. 41 c.7 D.Lgs 81/08)
    pdfLavoratoreUrl?: string;
    pdfDatoreUrl?: string;
    pdfGeneratoAt?: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    /** P48: il backend include direttamente i campi anagrafici della Person */
    person?: {
        id: string;
        firstName?: string;
        lastName?: string;
        taxCode?: string;
    };
    medicoCompetente?: Medico;
    visita?: Visita & {
        appuntamento?: {
            id: string;
            companyTenantProfile?: { company?: { ragioneSociale?: string } };
        };
    };
    mansioni?: GiudizioIdoneitaMansione[];
    /** Ragione sociale azienda (risolta da mansione.site o visita.appuntamento) */
    _azienda?: string;
    /** Firma del lavoratore per ricevuta (se acquisita) */
    firmaLavoratore?: { createdAt: string } | null;
}

export interface RischioPrestazione {
    id: string;
    codiceRischio: CodiceRischio;
    prestazioneId: string;
    periodicita: TipoPeriodicita;
    obbligatoria: boolean;
    note?: string;
    riferimentoNormativo?: string;
    tenantId: string;
    createdAt: string;
    deletedAt?: string;
    prestazione?: Prestazione;
}

export interface CompanySite {
    id: string;
    companyTenantProfileId: string;
    siteName: string;
    indirizzo?: string;
    citta?: string;
    cap?: string;
    provincia?: string;
    telefono?: string;
    email?: string;
    rsppId?: string;
    medicoCompetenteId?: string;
    tenantId: string;
    deletedAt?: string;
}

// Catalogo rischi (statico, D.Lgs 81/08)
export interface CatalogoRischio {
    codice: CodiceRischio;
    nome: string;
    descrizione: string;
    categoria: CategoriaRischio;
    riferimentoNormativo: string;
    normativa?: string; // Alias per riferimentoNormativo da backend
    periodicita?: number; // Mesi consigliati per accertamenti periodici
    prestazioniObbligatorie: string[];
}

// Risposta API catalogo rischi (backend format)
export interface CatalogoRischiResponse {
    totale: number;
    categorie: string[];
    rischi: Record<CategoriaRischio, CatalogoRischio[]>;
    flatList: CatalogoRischio[];
}

// Tariffario: Fonte prezzo base
export type FontePrezzoBase =
    | 'LISTINO_MEDICO_CONVENZIONE'
    | 'LISTINO_CONVENZIONE'
    | 'LISTINO_MEDICO'
    | 'LISTINO_GENERICO'
    | 'BUNDLE'
    | 'PREZZO_BASE';

// Tariffario: Output calcolo prezzo
export interface CalcoloPrezzoOutput {
    prezzoFinale: number;
    prezzoOriginale: number;
    scontoApplicato: number;
    scontoDescrizione?: string;
    fontePrezzoBase: FontePrezzoBase;
    listinoApplicatoId?: string;
    listinoApplicatoNome?: string;
    prioritaApplicata: number;
    compensoMedico: number;
    compensoMedicoTipo: TipoCompensoMedico;
    compensoMedicoFonte: 'LISTINO' | 'MEDICO_ABILITATO' | 'DEFAULT';
    imponibile: number;
    ivaAliquota: number;
    importoIva: number;
    totaleConIva: number;
}

// =====================================================
// MDL - PROTOCOLLI SANITARI (Progetto 56 - FASE 2)
// =====================================================

export type StatoNomina = 'ATTIVA' | 'SOSPESA' | 'REVOCATA' | 'SCADUTA';
export type TipoNominaRuolo = 'MEDICO_COMPETENTE' | 'MEDICO_COMPETENTE_COORDINATO' | 'RSPP' | 'ASPP' | 'RLS' | 'PREPOSTO' | 'ADDETTO_PS' | 'ADDETTO_AI' | 'DIRIGENTE_SICUREZZA';

export interface ProtocolloSanitario {
    id: string;
    codice: string;
    denominazione: string;
    descrizione?: string;
    mansioneId?: string;
    siteId?: string;
    periodicitaVisiteMesi: number;
    isAttivo: boolean;
    note?: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    mansione?: Mansione;
    site?: CompanySite;
    prestazioni?: ProtocolloPrestazione[];
    mansioniAssociate?: Array<{
        id: string;
        mansioneId: string;
        mansione?: Mansione;
    }>;
    questionari?: Array<{
        id: string;
        titolo?: string;
        documentoTemplate?: { id: string; nome: string };
        compilabileDa?: string;
        periodicitaMesi?: number;
        haScoring?: boolean;
    }>;
    _count?: {
        prestazioni: number;
        questionari?: number;
    };
}

export interface ProtocolloPrestazione {
    id: string;
    protocolloId: string;
    prestazioneId: string;
    isObbligatoria: boolean;
    periodicita?: TipoPeriodicita;
    condizioniApplicazione?: string;
    note?: string;
    createdAt: string;
    deletedAt?: string;
    protocollo?: ProtocolloSanitario;
    prestazione?: Prestazione;
}

export interface ProtocolloCreateInput {
    codice: string;
    denominazione: string;
    descrizione?: string;
    mansioneId?: string;
    mansioniIds?: string[];
    siteId?: string;
    periodicitaVisiteMesi?: number;
    isAttivo?: boolean;
    note?: string;
    prestazioni?: ProtocolloPrestazioneInput[];
    questionariIds?: string[];
}

export interface ProtocolloPrestazioneInput {
    prestazioneId: string;
    isObbligatoria?: boolean;
    periodicita?: TipoPeriodicita;
    condizioniApplicazione?: string;
    note?: string;
}

export interface ProtocolloUpdateInput extends Partial<ProtocolloCreateInput> { }

export interface ProtocolloCosto {
    totale: number;
    totaleObbligatorie: number;
    dettaglio: Array<{
        prestazioneId: string;
        prestazioneNome: string;
        costo: number;
        isObbligatoria: boolean;
        periodicita?: string;
    }>;
}

// =====================================================
// MDL - NOMINE RUOLO (Progetto 56 - FASE 3)
// =====================================================

export interface NominaRuolo {
    id: string;
    personId: string;
    siteId?: string;
    companyTenantProfileId?: string;
    tipoRuolo: TipoNominaRuolo;
    stato: StatoNomina;
    dataInizio: string;
    dataFine?: string;
    dataScadenza?: string;
    dataUltimaFormazione?: string;
    dataProssimaFormazione?: string;
    formazioneRichiesta?: string;
    note?: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    person?: {
        id: string;
        firstName: string;
        lastName: string;
        taxCode?: string;
        tenantProfiles?: Array<{
            email?: string;
            phone?: string;
        }>;
    };
    site?: CompanySite & { companyTenantProfileId?: string };
    companyTenantProfile?: {
        id: string;
        company?: {
            ragioneSociale?: string;
            piva?: string;
        };
    };
}

export interface NominaRuoloCreateInput {
    personId: string;
    siteId?: string;
    companyTenantProfileId?: string;
    tipoRuolo: TipoNominaRuolo;
    dataInizio: string;
    dataFine?: string;
    dataScadenza?: string;
    dataUltimaFormazione?: string;
    dataProssimaFormazione?: string;
    formazioneRichiesta?: string;
    note?: string;
    conflictResolution?: 'CEASE_PREVIOUS' | 'START_AFTER_PREVIOUS';
}

export interface NominaRuoloUpdateInput extends Partial<NominaRuoloCreateInput> {
    stato?: StatoNomina;
}

export interface NominaStats {
    totaleAttive: number;
    perRuolo: Record<TipoNominaRuolo, number>;
    inScadenza30gg: number;
    formazioneScadenza30gg: number;
    alertTotali: number;
}

// =====================================================
// MDL - ALLEGATO 3A (Progetto 56 - FASE 5)
// Cartella Sanitaria e di Rischio D.Lgs 81/08 Art. 41 c.5
// =====================================================

export interface Allegato3AData {
    lavoratore: Allegato3ALavoratore;
    azienda: Allegato3AAzienda;
    istituzione?: {
        motivo?: string;
        data?: string;
        firmaMedicoCompetente?: string;
    };
    datiLavorativi: Allegato3ADatiLavorativi;
    rischiProfessionali: Allegato3ARischio[];
    accertamentiSanitari: Allegato3AAccertamento[];
    visiteMediche?: Array<{
        id: string;
        data?: string;
        dataOra?: string;
        tipoVisitaLabel?: string;
        prestazione?: { nome?: string; codice?: string };
        giudizio?: { esito?: string; dataScadenza?: string };
    }>;
    anamnesi?: Record<string, string | null | undefined>;
    programmaSorveglianzaSanitaria?: {
        protocollo?: { denominazione?: string; periodicitaVisiteMesi?: number };
        accertamentiPrevisti?: Array<{ id?: string; nome?: string; obbligatoria?: boolean; periodicita?: string; periodicitaCustomMesi?: number }>;
    };
    allegatiCartella?: Array<{ id: string; tipo?: string; titolo?: string; fileName?: string; mimeType?: string; data?: string }>;
    giudizioAttuale: Allegato3AGiudizio | null;
    medicoCompetente: Allegato3AMedicoCompetente | null;
    generatedAt: string;
    protocolloApplicato?: string;
}

export interface Allegato3ALavoratore {
    id: string;
    taxCode?: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    birthDate?: string;
    birthPlace?: string;
    birthProvince?: string;
    nationality?: string | null;
    residenza?: {
        indirizzo?: string;
        citta?: string;
        cap?: string;
        provincia?: string;
    };
    contatti?: {
        email?: string;
        phone?: string;
    };
}

export interface Allegato3AAzienda {
    id: string;
    ragioneSociale?: string;
    piva?: string;
    codiceFiscale?: string;
    sedeLegale?: {
        indirizzo?: string;
        citta?: string;
        cap?: string;
        provincia?: string;
    };
    codiceAteco?: string;
    settore?: string;
    attivitaSvolta?: string;
    unitaProduttive?: Array<{ id?: string; nome?: string; indirizzo?: string; citta?: string; cap?: string; provincia?: string }>;
    sedeLavoro?: { id?: string; nome?: string; indirizzo?: string; citta?: string; cap?: string; provincia?: string };
    sede?: {
        id?: string;
        nome?: string;
        indirizzo?: string;
        citta?: string;
    };
}

export interface Allegato3ADatiLavorativi {
    dataAssunzione?: string;
    mansioneAttuale?: string;
    mansioneCodice?: string;
    profiloProfessionale?: string;
    reparto?: string;
    turno?: string;
    contratto?: string;
    protocolloSanitario?: { id?: string; codice?: string; denominazione?: string; periodicitaVisiteMesi?: number };
    storicoMansioni: Array<{
        mansioneNome?: string;
        mansioneCodice?: string;
        dataInizio?: string;
        dataFine?: string;
    }>;
}

export interface Allegato3ARischio {
    tipo: string;
    livello: string;
    descrizione?: string;
    dpiRichiesti?: string[];
    misurePrevenzione?: string[];
    dataValutazione?: string;
}

export interface Allegato3AAccertamento {
    id: string;
    tipo: string;
    data: string;
    esito?: string;
    note?: string;
    prestazioniEseguite?: Array<{
        id: string;
        nome: string;
        codice?: string;
        esito?: string;
    }>;
    medicoEsecutore?: string;
}

export interface Allegato3AGiudizio {
    id: string;
    data: string;
    esito: string;
    limitazioni?: string;
    prescrizioniIdoneita?: string;
    validoFino?: string;
    prossimaVisita?: string;
    tipoVisita?: string;
}

export interface Allegato3AMedicoCompetente {
    id: string;
    nome: string;
    cognome: string;
    alboMedici?: string;
    specializzazione?: string;
    email?: string;
    telefono?: string;
}

export interface Allegato3AStats {
    totaleWorkers: number;
    withActiveGiudizio: number;
    withExpiredGiudizio: number;
    pendingVisits: number;
    byMansione: Record<string, number>;
    byEsitoGiudizio: Record<string, number>;
}

export interface Allegato3ACompany {
    id: string;
    ragioneSociale: string;
    piva?: string;
    codiceFiscale?: string;
    sede?: string | null;
    medicoCompetente?: string | null;
    mediciCoordinati?: string[];
    nomineCount?: number;
    canViewAll?: boolean;
}

// =====================================================
// MDL - ALLEGATO 3B (Progetto 56 - FASE 6)
// Relazione Annuale INAIL D.Lgs 81/08 Art. 40
// =====================================================

export type StatoAllegato3B = 'DA_COMPILARE' | 'BOZZA' | 'COMPILATO' | 'PRONTO' | 'INVIATO' | 'CONFERMATO' | 'ERRORE';

export interface Allegato3B {
    id: string;
    anno: number;
    companyTenantProfileId: string;
    medicoCompetenteId: string;
    stato: StatoAllegato3B;
    dataCompilazione?: string;
    dataInvio?: string;
    dataConferma?: string;
    statoInvio: StatoAllegato3B; // Alias per stato (backward compat)
    protocolloInvio?: string;
    ricevutaInvio?: string;

    // Dati statistici aggregati (da Prisma schema)
    totLavoratoriSorvegliati: number;
    totVisiteEffettuate: number;
    totGiudiziIdoneita: number;
    totGiudiziConLimitazioni: number;
    totGiudiziConPrescrizioni: number;
    totInidoneita: number;
    statistichePerRischio?: Record<string, {
        lavoratoriEsposti?: number;
        perLivello?: Record<string, number>;
        occupatiAl30Giugno?: number;
        occupatiAl31Dicembre?: number;
        lavoratoriSoggettiSorveglianza?: number;
        lavoratoriVisitati?: number;
        al30Giugno?: unknown;
        al31Dicembre?: unknown;
    }>;
    malattieProf?: { totale?: number; perPatologia?: Record<string, number> };
    lavoratoriPerGenere?: { maschi?: number; femmine?: number; altro?: number };
    lavoratoriPerFasciaEta?: Record<string, number>;
    visitePerTipologia?: Record<string, number>;
    giudiziPerTipologia?: Record<string, number>;

    // Statistiche dettagliate (opzionale)
    statistiche?: Allegato3BStatistiche;

    note?: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    companyTenantProfile?: {
        id: string;
        company?: {
            ragioneSociale?: string;
            piva?: string;
            codiceFiscale?: string;
        };
    };
    medicoCompetente?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface Allegato3BStatistiche {
    // Sezione A - Dati generali
    totaleOccupati: number;
    totaleOccupatiMaschi: number;
    totaleOccupatiFemmine: number;
    occupatiAl30Giugno?: number;
    occupatiAl31Dicembre?: number;
    occupatiDateRiferimento?: {
        al30Giugno?: { count?: number; perGenere?: { maschi?: number; femmine?: number; altro?: number } };
        al31Dicembre?: { count?: number; perGenere?: { maschi?: number; femmine?: number; altro?: number } };
        fonte?: string;
        logica?: string;
    };
    totaleSorvegliatiSanitari: number;

    // Sezione B - Visite mediche
    visitePreventive: number;
    visitePeriodiche: number;
    visiteRichiestaDL: number;
    visiteRichiestaLavoratore: number;
    visiteCambioMansione: number;
    visiteRientroMalattia: number;

    // Sezione C - Giudizi di idoneità
    idonei: number;
    idoneiConPrescrizioni: number;
    idoneiConLimitazioni: number;
    nonIdoneiTemporanei: number;
    nonIdoneiPermanenti: number;

    // Sezione D - Statistiche per rischio
    statistichePerRischio: Array<{
        tipoRischio: string;
        lavoratoriEsposti: number;
        visiteProgrammate: number;
        visiteEffettuate: number;
        giudiziEmessi: number;
    }>;

    // Sezione E - Malattie professionali
    malattieRilevate: number;
    malattieDeununciate: number;

    // Metadati
    periodoRiferimento: {
        dataInizio: string;
        dataFine: string;
    };
    dataGenerazione: string;
}

export interface Allegato3BCreateInput {
    anno: number;
    companyTenantProfileId: string;
    medicoCompetenteId: string;
    note?: string;
    statisticheOverride?: Partial<Pick<Allegato3B,
        'totLavoratoriSorvegliati' |
        'totVisiteEffettuate' |
        'totGiudiziIdoneita' |
        'totGiudiziConLimitazioni' |
        'totGiudiziConPrescrizioni' |
        'totInidoneita'
    >>;
}

export interface Allegato3BEligibleCompany {
    id: string;
    companyTenantProfileId: string;
    ragioneSociale: string;
    piva?: string;
    codiceFiscale?: string;
    codiceAteco?: string;
    medicoCompetenteId: string;
    medicoCompetente?: string;
    nomineCount: number;
}

export interface Allegato3BXmlPreviewField {
    key?: keyof NonNullable<Allegato3BCreateInput['statisticheOverride']> | string;
    label: string;
    value: unknown;
    required?: boolean;
    editable?: boolean;
    type?: 'date' | 'json' | string;
}

export interface Allegato3BXmlPreviewGroup {
    title: string;
    fields: Allegato3BXmlPreviewField[];
}

export interface Allegato3BPreviewResponse extends Allegato3BStatistiche {
    xmlPreview?: {
        valid: boolean;
        errors: string[];
        warnings: string[];
        fieldGroups: Allegato3BXmlPreviewGroup[];
    };
}

export interface Allegato3BUpdateInput {
    statoInvio?: StatoAllegato3B;
    dataInvio?: string;
    codiceInvio?: string;
    erroreInvio?: string;
    note?: string;
}

// =====================================================
// MALATTIE PROFESSIONALI - D.Lgs 81/08 Art. 40
// =====================================================

export type TipologiaMalattiaProfessionale = 'SOSPETTA' | 'ACCERTATA';
export type EsitoMalattiaProfessionale = 'IN_ACCERTAMENTO' | 'RICONOSCIUTA' | 'NON_RICONOSCIUTA';

export interface MalattiaProfessionale {
    id: string;
    personId: string;
    tenantId: string;
    companyTenantProfileId: string;
    codiceNosologico?: string;
    denominazione: string;
    dataDiagnosi: string;
    dataNotificaINAIL?: string;
    agenteCausale?: string;
    tipologia: TipologiaMalattiaProfessionale;
    esito: EsitoMalattiaProfessionale;
    note?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    person?: {
        id: string;
        firstName: string;
        lastName: string;
        taxCode?: string;
        gender?: string;
    };
    companyTenantProfile?: {
        id: string;
        company?: {
            id: string;
            ragioneSociale?: string;
        };
    };
}

export interface MalattiaProfessionaleCreateInput {
    personId: string;
    companyTenantProfileId: string;
    codiceNosologico?: string;
    denominazione: string;
    dataDiagnosi: string;
    dataNotificaINAIL?: string;
    agenteCausale?: string;
    tipologia?: TipologiaMalattiaProfessionale;
    esito?: EsitoMalattiaProfessionale;
    note?: string;
}

export interface MalattiaProfessionaleUpdateInput {
    codiceNosologico?: string;
    denominazione?: string;
    dataDiagnosi?: string;
    dataNotificaINAIL?: string;
    agenteCausale?: string;
    tipologia?: TipologiaMalattiaProfessionale;
    esito?: EsitoMalattiaProfessionale;
    note?: string;
}

export interface MalattieProfessionaliAggregazione {
    totale: number;
    perPatologia: Array<{
        codice?: string;
        denominazione: string;
        totale: number;
        sospette: number;
        accertate: number;
    }>;
}

// =====================================================
// MDL - SCADENZE MDL (Progetto 56 - FASE 7)
// Dashboard Scadenze Medicina del Lavoro
// =====================================================

export type CategoriaScadenzaMDL =
    | 'nomina_mc'
    | 'nomina_rspp'
    | 'giudizio_idoneita'
    | 'visita_periodica'
    | 'sopralluogo'
    | 'dvr';

export type LivelloUrgenzaScadenza =
    | 'scaduto'      // Già scaduto
    | 'critico'      // < 7 giorni
    | 'urgente'      // 7-30 giorni
    | 'attenzione'   // 30-60 giorni
    | 'programmato'; // > 60 giorni

export interface ScadenzaMDL {
    id: string;
    categoria: CategoriaScadenzaMDL;
    tipo: string;
    descrizione: string;
    dataScadenza: string;
    livelloUrgenza: LivelloUrgenzaScadenza;
    giorniAllaScadenza: number | null;
    isPrenotata?: boolean;
    entita: ScadenzaEntita;
    azioni: Array<{
        tipo: string;
        label: string;
        url: string;
    }>;
}

export interface ScadenzaEntita {
    tipo: string;
    id?: string;
    persona?: string;
    personaId?: string;
    azienda?: string;
    companyTenantProfileId?: string;
    sede?: string;
    siteId?: string;
    mansione?: string;
    mansioneId?: string;
    mansioneIds?: string[];
    esito?: string;
    giudizioId?: string;
    protocollo?: string;
    frequenzaMesi?: number;
    ultimoSopralluogo?: string;
    dataEsecuzione?: string;
    effettuatoDa?: string;
    // Campi visita protocollo
    scadenzaPrestazioneId?: string;
    prestazione?: string;
    prestazioneId?: string;
    protocolloId?: string;
    periodicitaMesi?: number;
    isPrimaVisita?: boolean;
    // Ricongiunzione: slot visita che aggrega più accertamenti
    isRaggruppata?: boolean;
    isPrenotata?: boolean;
    isObbligatoria?: boolean;
    prestazioni?: Array<{
        scadenzaPrestazioneId: string;
        prestazione: string | null;
        prestazioneId: string;
        dataScadenza: string;
        periodicitaMesi: number;
        isObbligatoria?: boolean;
    }>;
}

/** Scadenza singola per lavoratore (all'interno di un gruppo per prestazione) */
export interface ScadenzaProtocolloItem {
    id: string;
    dataScadenza: string | null;
    dataEsecuzione: string | null;
    eseguita: boolean;
    isPrimaVisita: boolean;
    appuntamento: { id: string; dataOra: string | null; stato: string; tipoVisitaMDL: string | null } | null;
    visita: { id: string; dataOra: string | null } | null;
}

/** Gruppo di scadenze per una singola prestazione (es. "Visita Medica del Lavoro") - usato in VisitaScadenzaCard */
export interface ScadenzaProtocolloGruppo {
    prestazioneId: string | null;
    /** P72_21: presente quando si tratta di un questionario periodico (al posto di prestazioneId) */
    documentoTemplateId?: string | null;
    prestazioneName: string;
    prestazioneCodice: string | null;
    /** Tipo prestazione — VISITA_MEDICINA_LAVORO identifica la visita medica principale; QUESTIONARIO per questionari periodici */
    prestazioneTipo: string | null;
    /** P72_14: true se la prestazione è obbligatoria nel protocollo sanitario */
    isObbligatoria: boolean;
    periodicitaMesi: number;
    scadenze: ScadenzaProtocolloItem[];
}

/** Scadenza per-prestazione in prossima esecuzione (±60 giorni dalla data appuntamento) - usato nel booking modal */
export interface ScadenzaPrestazioneInScadenza {
    id: string;
    prestazioneId: string;
    prestazione: { id: string; nome: string; codice: string | null; tipo: string } | null;
    dataScadenza: string | null;
    periodicitaMesi: number;
    isPrimaVisita: boolean;
    giorniAllaScadenza: number; // positivo = manca, negativo = scaduta
}

export interface ScadenzeMDLStatistiche {
    perUrgenza: {
        critico: number;
        urgente: number;
        attenzione: number;
        programmato: number;
    };
    perCategoria: {
        nomina_mc: number;
        nomina_rspp: number;
        giudizio_idoneita: number;
        visita_periodica: number;
        sopralluogo: number;
        dvr: number;
    };
    indicePriorita: number;
}

export interface ScadenzeMDLResponse {
    scadenze: ScadenzaMDL[];
    statistiche: ScadenzeMDLStatistiche;
    filtri: {
        dataInizio: string;
        dataFine: string;
        totale: number;
    };
}

export interface ScadenzeMDLNotifiche {
    notifiche: ScadenzaMDL[];
    conteggio: {
        scadute: number;
        critiche: number;
        urgenti: number;
    };
}

export interface ScadenzeAziendaRiepilogo {
    companyTenantProfileId: string;
    statisticheGenerali: ScadenzeMDLStatistiche;
    perSede: Array<{
        siteId: string;
        sede: string;
        scadenze: ScadenzaMDL[];
        statistiche: {
            totale: number;
            scaduti: number;
            critici: number;
            urgenti: number;
        };
    }>;
}

export interface ScadenzeCalendarioEvento {
    id: string;
    title: string;
    description: string;
    date: string;
    categoria: CategoriaScadenzaMDL;
    urgenza: LivelloUrgenzaScadenza;
    color: string;
    entita: ScadenzaEntita;
}

// =====================================================
// PEC - POSTA ELETTRONICA CERTIFICATA (FASE 4)
// =====================================================

// Tipo PEC Log
export type TipoPecLog = 'GIUDIZIO_LAVORATORE' | 'GIUDIZIO_DATORE' | 'COMUNICAZIONE_MDL' | 'ALLEGATO_3B';

// Stato invio PEC
export type StatoPecLog = 'PENDING' | 'INVIATO' | 'ACCETTATO' | 'CONSEGNATO' | 'ERRORE' | 'RIMBALZATO';

// Log invio PEC
export interface PecLog {
    id: string;
    messageId: string;
    giudizioId?: string;
    tenantId: string;
    tipo: TipoPecLog;
    destinatario: string;
    oggetto: string;
    statoInvio: StatoPecLog;
    dataInvio: string;
    smtpResponse?: string;
    ricevutaAccettazione?: string;
    dataAccettazione?: string;
    ricevutaConsegna?: string;
    dataConsegna?: string;
    errore?: string;
    tentativiInvio: number;
    createdAt: string;
    updatedAt: string;
}

// Risultato invio PEC
export interface PecSendResult {
    success: boolean;
    messageId: string;
    pecLog: PecLog;
    smtpResponse?: string;
}

// Input invio PEC al lavoratore
export interface PecSendToWorkerInput {
    pecDestinatario?: string; // Se non specificato usa PEC del lavoratore
    ccDatoreLavoro?: boolean; // Mette in CC il datore
}

// Input invio PEC al datore
export interface PecSendToEmployerInput {
    pecDestinatario?: string; // Se non specificato usa PEC azienda
}

// Input invio PEC a entrambi
export interface PecSendToBothInput {
    pecLavoratore?: string;
    pecDatoreLavoro?: string;
}

// Risultato invio a entrambi
export interface PecSendBothResult {
    lavoratore: PecSendResult | null;
    datore: PecSendResult | null;
    errors: Array<{ recipient: 'lavoratore' | 'datore'; error: string }>;
}

// Stato consegna PEC
export interface PecDeliveryStatus {
    messageId: string;
    stato: StatoPecLog;
    dataInvio: string;
    accettato: boolean;
    dataAccettazione?: string;
    consegnato: boolean;
    dataConsegna?: string;
    errore?: string;
}

// Statistiche PEC
export interface PecStats {
    totaleInvii: number;
    pending: number;
    inviati: number;
    accettati: number;
    consegnati: number;
    errori: number;
    tassoSuccesso: number;
    perTipo: Record<TipoPecLog, number>;
}

// =====================================================
// PEC CONFIG - Configurazione PEC Tenant (FASE 4.2)
// =====================================================

// Provider PEC supportati
export type PecProvider = 'ARUBA' | 'LEGALMAIL' | 'POSTECERT' | 'CUSTOM' | 'ENV';

// Configurazione PEC per tenant
export interface PecConfig {
    provider: PecProvider;
    host: string;
    port: number;
    secure: boolean;
    pecAddress: string;
    senderName: string;
    enabled: boolean;
    testMode: boolean;
    testRecipient?: string | null;
    hasPassword: boolean;
    createdAt?: string;
    updatedAt?: string;
}

// Provider PEC disponibile
export interface PecProviderInfo {
    code: PecProvider;
    name: string;
    host: string | null;
    port: number;
    secure: boolean;
    instructions: string;
}

// Input per salvare configurazione PEC
export interface PecConfigInput {
    provider: PecProvider;
    host?: string;
    port?: number;
    secure?: boolean;
    pecAddress: string;
    password?: string;
    senderName?: string;
    enabled?: boolean;
    testMode?: boolean;
    testRecipient?: string;
}

// Stato configurazione PEC
export interface PecConfigStatus {
    configured: boolean;
    enabled: boolean;
    ready: boolean;
    provider?: PecProvider;
    pecAddress?: string;
    testMode?: boolean;
    message: string;
}

// Risultato test PEC
export interface PecTestResult {
    success: boolean;
    message: string;
    messageId?: string;
    recipient: string;
    sentAt: string;
}

// Tariffario: Input calcolo prezzo
export interface CalcoloPrezzoInput {
    prestazioneId: string;
    medicoId?: string;
    pazienteId?: string;
    convenzioneId?: string;
    codiceSconto?: string;
    bundleId?: string;
}

// Tariffario: Breakdown prezzi
export interface BreakdownPrezzo {
    prestazione: {
        id: string;
        nome: string;
        codice: string;
        prezzoBase: number;
        ivaAliquota: number;
    } | null;
    listiniApplicabili: Array<{
        id: string;
        nome: string;
        prezzo: number;
        priorita: number;
        convenzione?: { id: string; nome: string; tipo: TipoConvenzione } | null;
        medico?: { id: string; nome: string } | null;
        hasCompensoOverride: boolean;
    }>;
    bundlesApplicabili: Array<{
        id: string;
        codice: string;
        nome: string;
        prezzoBundle: number | null;
        scontoPercentuale: number | null;
    }>;
    prezzoBase: number;
}

// Tariffario: Offerta Bundle
export interface OffertaBundle {
    id: string;
    tenantId: string;
    codice: string;
    nome: string;
    descrizione?: string;
    prezzoBundle?: number;
    scontoPercentuale?: number;
    ivaAliquota: number;
    durataBundle?: number; // Durata totale esecuzione in minuti
    compensoMedicoTipo?: TipoCompensoMedico;
    compensoMedicoValore?: number;
    compensoMedicoMinimo?: number;
    compensoMedicoMassimo?: number;
    attivo: boolean;
    validoDa: string;
    validoA?: string;
    soloNuoviPazienti: boolean;
    maxUtilizzi?: number;
    utilizziCorrente: number;
    // Progetto 44: Applicability criteria
    etaMinima?: number;
    etaMassima?: number;
    genereApplicabile?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
    convenzioniIds?: string[];
    codiciScontoIds?: string[];
    // Timestamps
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    createdBy?: string;
    // Computed fields
    prezzoSingoli?: number;
    prezzoEffettivo?: number;
    risparmio?: number;
    durataEstimata?: number;
    // Relations
    prestazioni?: OffertaBundlePrestazione[];
}

// Input type for creating/updating bundle prestazioni (without server-generated fields)
export interface OffertaBundlePrestazioneInput {
    prestazioneId: string;
    quantita: number;
    obbligatoria: boolean;
    ordine: number;
}

// Input type for creating/updating bundle (without server-generated fields)
export interface OffertaBundleInput {
    codice?: string;
    nome: string;
    descrizione?: string;
    prezzoBundle?: number;
    scontoPercentuale?: number;
    ivaAliquota?: number;
    durataBundle?: number; // Durata totale esecuzione in minuti
    compensoMedicoTipo?: TipoCompensoMedico;
    compensoMedicoValore?: number;
    compensoMedicoMinimo?: number;
    compensoMedicoMassimo?: number;
    attivo?: boolean;
    validoDa?: string;
    validoA?: string;
    soloNuoviPazienti?: boolean;
    maxUtilizzi?: number;
    // Progetto 44: Applicability criteria
    etaMinima?: number;
    etaMassima?: number;
    genereApplicabile?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
    convenzioniIds?: string[];
    codiciScontoIds?: string[];
    prestazioni?: OffertaBundlePrestazioneInput[];
}

export interface OffertaBundlePrestazione {
    id: string;
    offertaBundleId: string;
    prestazioneId: string;
    quantita: number;
    obbligatoria: boolean;
    ordine: number;
    tenantId: string;
    createdAt: string;
    deletedAt?: string;
    // Relations
    prestazione?: Prestazione;
}

// Tariffario Medico: Compensi personalizzati per medico
export interface TariffarioMedico {
    id: string;
    tenantId: string;
    medicoId: string;
    brancaSpecialistica?: string;
    convenzioneId?: string;
    compensoMedicoTipo: TipoCompensoMedico;
    compensoMedicoValore?: number;
    compensoMedicoMinimo?: number;
    compensoMedicoMassimo?: number;
    note?: string;
    attivo: boolean;
    priorita: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // Relations
    medico?: Medico;
    convenzione?: Convenzione;
}

export interface TariffarioMedicoInput {
    medicoId: string;
    brancaSpecialistica?: string;
    convenzioneId?: string;
    compensoMedicoTipo: TipoCompensoMedico;
    compensoMedicoValore?: number;
    compensoMedicoMinimo?: number;
    compensoMedicoMassimo?: number;
    note?: string;
    attivo?: boolean;
    priorita?: number;
}

// Paziente filter for bundle applicability
export interface PazienteFilter {
    id: string;
    dataNascita?: string;
    sesso?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
    convenzioneId?: string;
    isNuovoPaziente?: boolean;
}

// Enum TipoConvenzione - aligned with Prisma schema
export type TipoConvenzione = 'AZIENDALE' | 'ASSICURATIVA' | 'PUBBLICA' | 'PRIVATA';

// Enum TipoRiconoscimento - aligned with Prisma schema
export type TipoRiconoscimento = 'PERCENTUALE' | 'VALORE_ASSOLUTO';

// Enum StatoRiconoscimento - aligned with Prisma schema
export type StatoRiconoscimento = 'DA_EROGARE' | 'EROGATO' | 'ANNULLATO';

export interface Convenzione {
    id: string;
    tenantId: string;
    codice: string;
    nome: string;
    descrizione?: string | null;
    tipo: TipoConvenzione;
    enteTerzo?: string | null;
    partitaIva?: string | null;
    codiceFiscale?: string | null;
    telefono?: string | null;
    email?: string | null;
    referente?: string | null;
    dataInizio: string;
    dataFine?: string | null;
    attiva: boolean;
    condizioni?: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    createdBy?: string | null;
    aziende?: ConvenzioneAzienda[];
    // Listini associati con info prestazione
    listiniPrezzo?: Array<{
        id: string;
        prestazioneId?: string | null;
        bundleId?: string | null;
        prezzo: number;
        prestazione?: {
            id: string;
            codice: string;
            nome: string;
        } | null;
    }>;
}

// Convenzione-Azienda association
export interface ConvenzioneAzienda {
    id: string;
    convenzioneId: string;
    aziendaId: string;
    referenteAziendale?: string | null;
    emailReferente?: string | null;
    telefonoReferente?: string | null;
    note?: string | null;
    dataAdesione: string;
    dataFineAdesione?: string | null;
    attiva: boolean;
    tenantId: string;
    createdAt: string;
    // Relations
    convenzione?: {
        id: string;
        codice: string;
        nome: string;
    };
    azienda?: {
        id: string;
        ragioneSociale: string;
        piva?: string;
        mail?: string;
        telefono?: string;
    };
    riconoscimenti?: RiconoscimentoConvenzione[];
}

export interface ConvenzioneAziendaInput {
    aziendaId: string;
    referenteAziendale?: string;
    emailReferente?: string;
    telefonoReferente?: string;
    note?: string;
    dataAdesione?: string;
    dataFineAdesione?: string;
    attiva?: boolean;
}

// Riconoscimento Convenzione
export interface RiconoscimentoConvenzione {
    id: string;
    convenzioneAziendaId: string;
    bundleId?: string | null;
    prestazioneId?: string | null;
    tipo: TipoRiconoscimento;
    valore: number;
    valoreMinimo?: number | null;
    valoreMassimo?: number | null;
    dataInizio: string;
    dataFine?: string | null;
    attivo: boolean;
    descrizione?: string | null;
    note?: string | null;
    tenantId: string;
    createdAt: string;
    // Relations
    convenzioneAzienda?: ConvenzioneAzienda;
    bundle?: {
        id: string;
        codice: string;
        nome: string;
        prezzoBundle?: number;
    };
    prestazione?: {
        id: string;
        codice: string;
        nome: string;
        prezzoBase?: number;
    };
}

export interface RiconoscimentoConvenzioneInput {
    convenzioneAziendaId: string;
    bundleId?: string;
    prestazioneId?: string;
    tipo: TipoRiconoscimento;
    valore: number;
    valoreMinimo?: number;
    valoreMassimo?: number;
    dataInizio?: string;
    dataFine?: string;
    attivo?: boolean;
    descrizione?: string;
    note?: string;
}

// Riconoscimento Erogato
export interface RiconoscimentoErogato {
    id: string;
    riconoscimentoConvenzioneId: string;
    pazienteId: string;
    appuntamentoId?: string | null;
    importoCalcolato: number;
    importoBase: number;
    stato: StatoRiconoscimento;
    dataCalcolo: string;
    dataErogazione?: string | null;
    note?: string | null;
    tenantId: string;
    createdAt: string;
    // Relations
    riconoscimentoConvenzione?: RiconoscimentoConvenzione;
    paziente?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

// Agenda types
export type StatoAppuntamento =
    | 'PRENOTATO'
    | 'CONFERMATO'
    | 'IN_ATTESA'
    | 'IN_CORSO'
    | 'COMPLETATO'
    | 'FATTURATO'
    | 'ANNULLATO'
    | 'NO_SHOW'
    | 'RINVIATO';

// === PROGETTO 55: Stati Prestazione Appuntamento ===
export type StatoPrestazioneAppuntamento =
    | 'DA_ESEGUIRE'
    | 'IN_CORSO'
    | 'ESEGUITA'
    | 'IN_ATTESA_REFERTO'
    | 'REFERTATA'
    | 'ANNULLATA';

// === PROGETTO 55: Multi-Prestazioni per Appuntamento ===
export interface AppuntamentoPrestazione {
    id: string;
    appuntamentoId: string;
    prestazioneId: string;
    medicoRefertanteId?: string | null;
    ordine: number;
    stato: StatoPrestazioneAppuntamento;
    dataEsecuzione?: string | null;
    note?: string | null;
    refertoId?: string | null;
    compensoMedicoCalcolato?: number | null;
    compensoMedicoPagato: boolean;
    compensoPagatoData?: string | null;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    /** P73: ID visita secondaria creata per il medico specialista, se diverso dal medico principale */
    visitaSecondariaId?: string | null;
    // Relazioni espanse
    prestazione?: {
        id: string;
        nome: string;
        codice: string;
        categoria?: string;
        brancheSpecialistiche?: string[];
    };
    medicoRefertante?: {
        id: string;
        firstName: string;
        lastName: string;
        gender?: string;
    };
    referto?: {
        id: string;
        numeroReferto: string;
        stato: string;
    };
    appuntamento?: Appuntamento & {
        paziente?: {
            id: string;
            firstName: string;
            lastName: string;
            taxCode?: string;
            birthDate?: string;
        };
        medico?: {
            id: string;
            firstName: string;
            lastName: string;
        };
        azienda?: {
            id: string;
            ragioneSociale: string;
        };
    };
}

export interface SlotDisponibilita {
    id: string;
    tenantId: string;
    ambulatorioId: string;
    medicoId?: string;
    prestazioneId?: string | null;
    disponibilitaMedicoId?: string; // P68: Reference to parent recurring pattern
    data: string;
    oraInizio: string;
    oraFine: string;
    disponibile: boolean;
    forceCreate?: boolean; // Allow creating even if overlap exists (for scenario 2)
    createdAt: string;
    updatedAt: string;
}

export interface DisponibilitaMedico {
    id: string;
    tenantId: string;
    medicoId: string;
    ambulatorioId?: string;
    giorno: number;           // 0=Sunday, 1=Monday, etc. (Prisma field)
    oraInizio: string;       // HH:MM
    oraFine: string;         // HH:MM
    validoDal: string;       // Prisma field
    validoAl?: string;       // Prisma field (optional end date)
    durataSlot?: number;     // minutes per slot
    maxAppuntamenti?: number | string; // max bookings per slot
    note?: string;
    attivo: boolean;         // Prisma field
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // P68: Auto-generation metadata (returned on create/update)
    _slotsGenerated?: number;
    _slotsSkipped?: number;
}

export interface FerieAssenza {
    id: string;
    tenantId: string;
    medicoId: string;
    dataInizio: string;
    dataFine: string;
    motivo?: string;
    note?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Appuntamento {
    id: string;
    tenantId: string;
    numero: string;
    pazienteId: string;
    medicoId: string;
    ambulatorioId: string;
    prestazioneId?: string;
    convenzioneId?: string;
    dataOra: string;
    durataMinuti: number;  // Duration in minutes (database field, default 30)
    stato: StatoAppuntamento;
    isOverbooking?: boolean;  // Flag to track if appointment was booked in overbooking
    note?: string;
    noteInterne?: string;
    promemoria: boolean;
    promemoriaInviato: boolean;
    dataConferma?: string;
    dataAnnullamento?: string;
    motivoAnnullamento?: string;
    numeroCoda?: number;
    displayNumberCoda?: string; // P61: Display number formato "AMB1-03"
    queueEntryId?: string;      // P61: ID entry coda per chiamare paziente
    queueEntryStato?: string;   // P61: Stato entry coda (IN_ATTESA, CHIAMATO, etc)
    queueSessionId?: string;    // P61: ID sessione coda per filtrare la coda
    oraArrivo?: string;
    oraChiamata?: string;
    oraInizio?: string;
    oraFine?: string;
    pagamentoAnticipato?: boolean;  // Pagamento registrato prima della visita
    pagamentoDataOra?: string;       // Data/ora del pagamento
    isRecurring: boolean;
    recurringPattern?: string;
    parentAppuntamentoId?: string;
    companyTenantProfileId?: string;  // Azienda per MDL / sorveglianza sanitaria
    tipoVisitaMDL?: TipoVisitaMDL;    // Tipo visita MDL (Art. 41 D.Lgs 81/08)
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // Expanded relations
    paziente?: Paziente;
    medico?: Medico;
    ambulatorio?: Ambulatorio;
    prestazione?: Prestazione;
    convenzione?: {
        id: string;
        nome: string;
        codice: string;
        condizioni?: {
            scontoPercentuale?: number;
            scontoFisso?: number;
            codiceSconto?: string;
        };
    };
    visita?: Visita;
}

// Clinical types
export interface Visita {
    id: string;
    tenantId: string;
    appuntamentoId: string;
    pazienteId: string;
    medicoId: string;
    prestazioneId: string;
    stato: 'PROGRAMMATA' | 'IN_CORSO' | 'COMPLETATA' | 'ANNULLATA';
    dataOra?: string; // Data/ora visita dal backend Prisma
    dataInizio?: string; // Legacy - backward compatibility
    dataFine?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
    // Progetto 52 - Visit Template System
    visitTemplateId?: string;
    confidentiality?: VisitConfidentiality;
    accessControl?: VisitAccessControl;
    datiStrutturati?: Record<string, unknown>;
    visitTemplate?: VisitTemplate;
    // P65.7: Prima visita / controllo
    isPrimaVisita?: boolean; // Se true, usa prezzoPrimaVisita invece di prezzoBase/prezzoControllo
    // P56: Medicina del Lavoro
    tipoVisitaMDL?: TipoVisitaMDL;
    // Fatturazione
    fatture?: {
        id: string;
        numeroFattura: string;
        stato: string;
        totale: number;
        dataEmissione: string;
        dataPagamento?: string;
    }[];
    // Relazioni opzionali (incluse da API con include)
    prestazione?: {
        id: string;
        nome: string;
        codice?: string;
        prezzo?: number;
        durata?: number;
        scadenzaDefaultMesi?: number; // Mesi default per prossimo controllo
    };
    medico?: {
        id: string;
        firstName?: string;
        lastName?: string;
        gender?: string;
    };
    // Medico refertante (può differire dal medico visitante)
    medicoRefertanteId?: string | null;
    medicoRefertante?: {
        id: string;
        firstName?: string;
        lastName?: string;
        gender?: string;
        tenantProfiles?: {
            specialties?: string[];
            registerCode?: string;
            email?: string;
            isPrimary?: boolean;
        }[];
    } | null;
    paziente?: {
        id: string;
        firstName?: string;
        lastName?: string;
        codiceFiscale?: string;
    };
    // Timer persistence
    durataEffettiva?: number; // seconds
    // P65.7: Follow-up / scadenza prossimo controllo
    prossimoControllo?: string | null; // ISO date: next scheduled visit
    noteFollowup?: string | null;
    // Revision tracking (Session #12b)
    revisions?: VisitaRevision[];
    // P71: Invio referto via email al paziente
    invioRefertoMail?: boolean;
    // P73: Visita secondaria per specialista
    isVisitaSecundaria?: boolean;
    visitaParentId?: string | null;
}

/** P73: Visita collegata (secondaria o principale) */
export interface VisitaCollegata {
    id: string;
    stato: string;
    dataOra?: string;
    isVisitaSecundaria: boolean;
    appPrestazioneId?: string | null;
    medico?: { id: string; firstName?: string; lastName?: string };
    prestazione?: { id: string; nome: string; codice?: string };
}

/**
 * Revisione di una visita per audit trail
 */
export interface VisitaRevision {
    id: string;
    version?: number;
    revisionNumber?: number;
    createdAt?: string;
    changedAt?: string;
    motivo?: string;
    changeReason?: string;
    changeType?: string;
    changedFields?: string[];
    previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    createdBy?: {
        id?: string;
        firstName?: string;
        lastName?: string;
    };
    changer?: {
        id?: string;
        firstName?: string;
        lastName?: string;
    };
}

// =====================================================
// PROGETTO 52 - VISIT TEMPLATE TYPES
// =====================================================

/**
 * Livelli di riservatezza per le visite
 */
export type VisitConfidentiality = 'NORMAL' | 'RESTRICTED' | 'HIGHLY_RESTRICTED';

/**
 * Controllo accessi per visite ristrette
 */
export interface VisitAccessControl {
    confidentiality: VisitConfidentiality;
    allowedPersonIds?: string[];
    allowedRoleTypes?: string[];
    allowedSpecialties?: string[];
    denyPersonIds?: string[];
}

/**
 * Tipi di campo supportati nel template
 */
export type VisitFieldType =
    | 'TEXT'
    | 'TEXTAREA'
    | 'RICHTEXT'
    | 'NUMBER'
    | 'DROPDOWN'
    | 'MULTI_CHOICE'
    | 'DATE'
    | 'DATETIME'
    | 'BOOLEAN'
    | 'FILE'
    | 'VITALS'
    | 'STRUMENTARIO_IMPORT';

/**
 * Opzioni di stampa per un campo
 */
export interface VisitFieldPrintOptions {
    include: 'ALWAYS' | 'IF_VALUED' | 'NEVER';
    showLabel: boolean;
    showTitle: boolean;
    section?: string;
}

/**
 * Range di validazione per campi
 */
export interface VisitFieldValidation {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
}

/**
 * Range valori normali (per grafici)
 */
export interface VisitFieldNormalRange {
    min?: number;
    max?: number;
}

/**
 * Configurazione HL7/CDA per un campo - Per export FSE 2.0
 * Permette di mappare campi personalizzati a codici LOINC standard
 */
export interface VisitFieldHL7Config {
    /** Codice LOINC/ICD/SNOMED del campo */
    code?: string;
    /** Sistema di codifica (default: LOINC) */
    codeSystem?: 'LOINC' | 'ICD10' | 'ICD9_CM' | 'SNOMED_CT' | 'ATC';
    /** Sezione CDA di appartenenza */
    section?: 'ANAMNESI' | 'ESAME_OBIETTIVO' | 'DIAGNOSI' | 'TERAPIA' | 'PRESCRIZIONI' | 'ALLERGIE' | 'CONCLUSIONI' | 'ESAMI_LABORATORIO' | 'ESAMI_RADIOLOGIA';
    /** Nome visualizzato nel CDA */
    displayName?: string;
    /** Unità di misura (per valori numerici) */
    unit?: string;
    /** Se includere nel CDA export (default: true se code presente) */
    includeInCDA?: boolean;
}

/**
 * Definizione di un campo nel template visita
 */
export interface VisitField {
    id?: string;
    name: string;
    label: string;
    type: VisitFieldType;
    section: string;
    position?: { row: number; col: number };
    size?: { width: number; height: number };
    carryOverFromPrevious?: boolean;
    showChart?: boolean;
    required: boolean;
    visible: boolean;
    order: number;
    defaultValue?: string;
    placeholder?: string;
    helpText?: string;
    options?: (string | { value: string; label: string; description?: string })[];
    validation?: VisitFieldValidation;
    normalRange?: VisitFieldNormalRange;
    metadata?: Record<string, unknown>;
    computed?: boolean;
    computeFormula?: string;
    printOptions?: VisitFieldPrintOptions;
    /** Quando true, il MULTI_CHOICE mostra un campo "Altro" per voci personalizzate */
    allowCustom?: boolean;
    /** P65: Configurazione HL7/CDA per export FSE - Opzionale */
    hl7?: VisitFieldHL7Config;
    /**
     * P72: Binding diretto a colonna flat di Visita al salvataggio.
     * Il valore di questo campo viene copiato anche nella colonna DB corrispondente
     * ad ogni aggiornamento della visita, garantendo coerenza tra datiStrutturati e flat columns.
     */
    mappedField?: 'anamnesi' | 'esamiObiettivo' | 'diagnosiPrincipale' | 'terapia' | 'noteClinico' | 'prescrizioni';
}

/**
 * Sezione della sidebar
 */
export interface VisitSidebarSection {
    id: string;
    label?: string;
    title: string;
    icon?: string;
    order: number;
    visible: boolean;
    expandedByDefault?: boolean;
}

/**
 * Configurazione sidebar del template
 */
export interface VisitSidebarConfig {
    singlePage?: boolean; // Se true, mostra tutti i campi in un'unica pagina senza tab
    collapsible: boolean;
    defaultTab: string;
    defaultCollapsed?: string[];
    sections: VisitSidebarSection[];
    /** Layout delle sezioni: 'tabs' (default), 'sections' (pagina singola con card), 'continuous' (flusso continuo) */
    sectionLayout?: 'tabs' | 'sections' | 'continuous';
    /** Se mostrare il timer visivamente (viene sempre registrato) */
    showTimer?: boolean;
}

/**
 * Sezione di stampa
 */
export interface VisitPrintSection {
    id: string;
    label: string;
    order: number;
    include: boolean;
}

/**
 * Configurazione stampa referto
 */
export interface VisitPrintConfig {
    showLogo?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    includeLogo: boolean;
    includeHeader: boolean;
    includeFooter: boolean;
    includeSignature: boolean;
    pageFormat: 'A4' | 'A5' | 'LETTER';
    orientation: 'portrait' | 'landscape';
    headerContent?: string;
    footerContent?: string;
    signaturePosition?: 'bottom-left' | 'bottom-center' | 'bottom-right';
    includeTimestamp?: boolean;
    includePageNumbers?: boolean;
    sections?: VisitPrintSection[];
    /** P52 Session #11: ID template di stampa da /management/templates */
    printTemplateId?: string;
}

/**
 * Scope gerarchico del template visita
 * PERSONAL: Template personale del medico per una prestazione
 * CATALOGO: Template campi default per prestazione nel catalogo (consolida TemplateCampoVisita)
 * PRESTAZIONE: Template default per una prestazione specifica
 * GLOBAL: Template globale di sistema (default per tutti)
 */
export type TemplateScope = 'GLOBAL' | 'CATALOGO' | 'PRESTAZIONE' | 'PERSONAL';

/**
 * Template visita personalizzabile per medico
 */
export interface VisitTemplate {
    id: string;
    medicoId?: string; // Null per template GLOBAL/CATALOGO
    tenantId: string;
    scope?: TemplateScope; // Scope gerarchico
    prestazioneId?: string;
    bundleId?: string;
    name: string;
    description?: string;
    isDefault: boolean;
    isActive: boolean;
    fields: VisitField[];
    sidebarConfig: VisitSidebarConfig;
    printConfig: VisitPrintConfig;
    // P65.7: Scadenza default per prossimo controllo (mesi)
    defaultScadenzaMesi?: number;
    version: number;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    createdBy?: string;
    resolvedScope?: TemplateScope | 'DEFAULT' | 'SYSTEM_DEFAULT'; // Set when resolved
    // Relations (when populated)
    medico?: {
        id: string;
        firstName: string;
        lastName: string;
        tenantProfiles?: Array<{
            specialties?: string[];
            title?: string;
        }>;
    };
    prestazione?: {
        id: string;
        nome: string;
        codice: string;
        tipo?: string;
    };
    bundle?: {
        id: string;
        nome: string;
        codice: string;
    };
    isSystem?: boolean; // true per template default sistema
}

/**
 * Defaults del sistema per template
 */
export interface VisitTemplateDefaults {
    fields: VisitField[];
    sidebarConfig: VisitSidebarConfig;
    printConfig: VisitPrintConfig;
    fieldTypes: Record<string, string>;
}

/**
 * Input per creazione/aggiornamento template
 */
export interface VisitTemplateInput {
    medicoId?: string; // Null per template GLOBAL/CATALOGO
    medicoIds?: string[]; // Multi-select: admin crea un template per medico (scope PERSONAL)
    name: string;
    description?: string;
    scope?: TemplateScope; // GLOBAL, CATALOGO, PRESTAZIONE, PERSONAL
    prestazioneId?: string;
    prestazioneIds?: string[]; // Multi-select: creates one template per prestazione
    bundleId?: string;
    fields?: VisitField[];
    sidebarConfig?: VisitSidebarConfig;
    printConfig?: VisitPrintConfig;
    // P65.7: Scadenza default per prossimo controllo (mesi)
    defaultScadenzaMesi?: number;
    isDefault?: boolean;
    isActive?: boolean;
}

/**
 * Opzioni per clonazione template
 */
export interface VisitTemplateCloneOptions {
    newName?: string;
    newMedicoId?: string;
    newPrestazioneId?: string;
    newBundleId?: string;
}

export interface Referto {
    id: string;
    tenantId: string;
    visitaId: string;
    medicoId: string;
    pazienteId: string;
    contenuto: string;
    stato: 'BOZZA' | 'COMPLETATO' | 'FIRMATO';
    dataFirma?: string;
    firmato: boolean;
    createdAt: string;
    updatedAt: string;
    // Additional fields returned by API
    numeroReferto?: string;
    titolo?: string;
    // Relations (when populated)
    visita?: Visita;
    medico?: Medico;
    paziente?: Paziente;
}

// Patient types
export interface Paziente {
    id: string;
    tenantId: string;
    // Italian field names (legacy/internal)
    nome: string;
    cognome: string;
    telefono?: string;
    // English field names (API format from Person model)
    firstName?: string;
    lastName?: string;
    phone?: string;
    // Common fields
    codiceFiscale?: string;
    taxCode?: string;
    dataNascita?: string;
    birthDate?: string;
    etnia?: string | null;
    email?: string;
    indirizzo?: string;
    createdAt: string;
    updatedAt: string;
    // Multi-tenant support (Progetto 48)
    tenantProfiles?: PersonTenantProfile[];
    currentProfile?: PersonTenantProfile;

    // Extended fields from P48 migration (now returned by AppuntamentoService)
    gender?: 'MALE' | 'FEMALE';
    sesso?: 'MALE' | 'FEMALE' | '';
    birthPlace?: string;
    comuneNascita?: string;
    birthProvince?: string;
    provinciaNascita?: string;
    residenceAddress?: string;
    residenceCity?: string;
    comune?: string;
    postalCode?: string;
    cap?: string;
    province?: string;
    provincia?: string;
    numeroCi?: string;
    tipoCi?: 'CI' | 'PASSAPORTO' | 'PATENTE' | 'PERMESSO_SOGGIORNO' | 'ALTRO';
    altroDocumento?: string;
    isMinore?: boolean;
    isNonAutonomo?: boolean;
    tutelanti?: Array<{
        id: string;
        relazione: string;
        isLegalGuardian: boolean;
        tutelante: {
            id: string;
            firstName: string;
            lastName: string;
            taxCode?: string | null;
        };
    }>;
}

// Discount types
export interface ScontoClinico {
    id: string;
    tenantId: string;
    codice: string;
    descrizione?: string;
    tipo: 'percentuale' | 'fisso';
    valore: number;
    validoDa: string;
    validoA?: string;
    limiteUtilizzi?: number;
    utilizziAttuali: number;
    isActive: boolean;
    source?: 'unified' | 'legacy';
    createdAt: string;
    updatedAt: string;
}

// =====================================================
// API FUNCTIONS - STRUCTURE
// =====================================================

/**
 * Poliambulatori API
 */
export const poliambulatoriApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Poliambulatorio>>(`${CLINICA_BASE}/poliambulatori`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Poliambulatorio>>(`${CLINICA_BASE}/poliambulatori/${id}`)
            .then(extractData),

    create: (data: Partial<Poliambulatorio>) =>
        apiPost<ApiResponse<Poliambulatorio>>(`${CLINICA_BASE}/poliambulatori`, data)
            .then(extractData),

    update: (id: string, data: Partial<Poliambulatorio>) =>
        apiPut<ApiResponse<Poliambulatorio>>(`${CLINICA_BASE}/poliambulatori/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/poliambulatori/${id}`),

    getStats: () =>
        apiGet<ApiResponse<{ total: number; active: number; inactive: number }>>(`${CLINICA_BASE}/poliambulatori/stats`)
            .then(extractData)
};

/**
 * Sedi Poliambulatorio API
 */
export const sediApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<SedePoliambulatorio>>(`${CLINICA_BASE}/sedi`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<SedePoliambulatorio>>(`${CLINICA_BASE}/sedi/${id}`)
            .then(extractData),

    getByPoliambulatorio: (poliambulatorioId: string) =>
        apiGet<ApiResponse<SedePoliambulatorio[]>>(`${CLINICA_BASE}/poliambulatori/${poliambulatorioId}/sedi`)
            .then(extractData),

    create: (poliambulatorioId: string, data: SedePoliambulatorioInput) =>
        apiPost<ApiResponse<SedePoliambulatorio>>(`${CLINICA_BASE}/poliambulatori/${poliambulatorioId}/sedi`, data)
            .then(extractData),

    update: (id: string, data: SedePoliambulatorioInput) =>
        apiPut<ApiResponse<SedePoliambulatorio>>(`${CLINICA_BASE}/sedi/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/sedi/${id}`),

    assignDirettore: (sedeId: string, direttoreSanitarioId: string) =>
        apiPut<ApiResponse<SedePoliambulatorio>>(`${CLINICA_BASE}/sedi/${sedeId}/direttore`, { direttoreSanitarioId })
            .then(extractData)
};

/**
 * Ambulatori API
 */
export const ambulatoriApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Ambulatorio>>(`${CLINICA_BASE}/ambulatori`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Ambulatorio>>(`${CLINICA_BASE}/ambulatori/${id}`)
            .then(extractData),

    /** @deprecated Use getAll with poliambulatorioId filter instead */
    getByPoliambulatorio: async (poliambulatorioId: string): Promise<Ambulatorio[]> => {
        const result = await ambulatoriApi.getAll({ poliambulatorioId, stato: 'ATTIVO' });
        return result.data || [];
    },

    create: (data: Partial<Ambulatorio>) =>
        apiPost<ApiResponse<Ambulatorio>>(`${CLINICA_BASE}/ambulatori`, data)
            .then(extractData),

    update: (id: string, data: Partial<Ambulatorio>) =>
        apiPut<ApiResponse<Ambulatorio>>(`${CLINICA_BASE}/ambulatori/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/ambulatori/${id}`),

    getOrari: (id: string) =>
        apiGet<ApiResponse<unknown[]>>(`${CLINICA_BASE}/ambulatori/${id}/orari`)
            .then(extractData),

    getStats: () =>
        apiGet<ApiResponse<{ total: number; active: number; bySpecializzazione: Record<string, number> }>>(`${CLINICA_BASE}/ambulatori/stats`)
            .then(extractData)
};

/**
 * Strumenti API
 */
export const strumentiApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Strumento>>(`${CLINICA_BASE}/strumenti`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Strumento>>(`${CLINICA_BASE}/strumenti/${id}`)
            .then(extractData),

    create: (data: Partial<Strumento>) =>
        apiPost<ApiResponse<Strumento>>(`${CLINICA_BASE}/strumenti`, data)
            .then(extractData),

    update: (id: string, data: Partial<Strumento>) =>
        apiPut<ApiResponse<Strumento>>(`${CLINICA_BASE}/strumenti/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/strumenti/${id}`),

    getManutenzioni: (id: string) =>
        apiGet<ApiResponse<ManutenzioneStrumento[]>>(`${CLINICA_BASE}/strumenti/${id}/manutenzioni`)
            .then(extractData),

    addManutenzione: (id: string, data: Partial<ManutenzioneStrumento>) =>
        apiPost<ApiResponse<ManutenzioneStrumento>>(`${CLINICA_BASE}/strumenti/${id}/manutenzioni`, data)
            .then(extractData),

    getROI: (id: string) =>
        apiGet<ApiResponse<unknown>>(`${CLINICA_BASE}/strumenti/${id}/roi`)
            .then(extractData),

    getROIComparison: () =>
        apiGet<ApiResponse<unknown>>(`${CLINICA_BASE}/strumenti/roi/comparison`)
            .then(extractData),

    getStats: () =>
        apiGet<ApiResponse<{
            total: number;
            byStato: Record<StatoStrumento, number>;
            manutenzioniInScadenza: number;
        }>>(`${CLINICA_BASE}/strumenti/stats`)
            .then(extractData),

    getScadenzeManutenzioni: (giorni?: number) =>
        apiGet<ApiResponse<Strumento[]>>(`${CLINICA_BASE}/strumenti/manutenzioni/scadenze`, { giorni: giorni || 30 })
            .then(extractData)
};

/**
 * Manutenzioni API
 * API per gestione manutenzioni strumenti standalone
 */
export const manutenzioniApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<ManutenzioneStrumento>>(`${CLINICA_BASE}/manutenzioni`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<ManutenzioneStrumento>>(`${CLINICA_BASE}/manutenzioni/${id}`)
            .then(extractData),

    create: (data: Partial<ManutenzioneStrumento>) =>
        apiPost<ApiResponse<ManutenzioneStrumento>>(`${CLINICA_BASE}/manutenzioni`, data)
            .then(extractData),

    update: (id: string, data: Partial<ManutenzioneStrumento>) =>
        apiPut<ApiResponse<ManutenzioneStrumento>>(`${CLINICA_BASE}/manutenzioni/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/manutenzioni/${id}`),

    getInScadenza: (giorni?: number) =>
        apiGet<ApiResponse<ManutenzioneStrumento[]>>(`${CLINICA_BASE}/manutenzioni/scadenza`, { giorni: giorni || 30 })
            .then(extractData),

    getStats: (options?: { strumentoId?: string; anno?: number }) =>
        apiGet<ApiResponse<{
            totale: number;
            perStato: Record<string, number>;
            perTipo: Record<string, number>;
            costi: { totale: number; manodopera: number; ricambi: number };
        }>>(`${CLINICA_BASE}/manutenzioni/stats`, options)
            .then(extractData),

    completa: (id: string, data: { esitoNote?: string; prossimaScadenza?: string; rapportoUrl?: string }) =>
        apiPut<ApiResponse<ManutenzioneStrumento>>(`${CLINICA_BASE}/manutenzioni/${id}/completa`, data)
            .then(extractData),

    annulla: (id: string, motivo?: string) =>
        apiPut<ApiResponse<ManutenzioneStrumento>>(`${CLINICA_BASE}/manutenzioni/${id}/annulla`, { motivo })
            .then(extractData),

    createRicorrente: (data: {
        strumentoId: string;
        descrizione: string;
        intervallo: number;
        dataInizio: string;
        numeroOccorrenze?: number;
        esecutore?: string;
    }) =>
        apiPost<ApiResponse<ManutenzioneStrumento[]>>(`${CLINICA_BASE}/manutenzioni/ricorrente`, data)
            .then(extractData)
};

/**
 * Medici API
 */
export const mediciApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Medico>>(`${CLINICA_BASE}/medici`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Medico>>(`${CLINICA_BASE}/medici/${id}`)
            .then(extractData),

    create: (data: Partial<Medico>) =>
        apiPost<ApiResponse<Medico> & { credentials?: { username: string; temporaryPassword: string; note?: string } | null }>(`${CLINICA_BASE}/medici`, data),


    update: (id: string, data: Partial<Medico>) =>
        apiPut<ApiResponse<Medico>>(`${CLINICA_BASE}/medici/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/medici/${id}`),

    // Ambulatori association
    getAmbulatori: (id: string) =>
        apiGet<ApiResponse<MedicoAmbulatorio[]>>(`${CLINICA_BASE}/medici/${id}/ambulatori`)
            .then(extractData),

    addAmbulatorio: (id: string, ambulatorioId: string, isDefault?: boolean) =>
        apiPost<ApiResponse<MedicoAmbulatorio>>(`${CLINICA_BASE}/medici/${id}/ambulatori`, { ambulatorioId, isDefault })
            .then(extractData),

    removeAmbulatorio: (id: string, ambulatorioId: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/medici/${id}/ambulatori/${ambulatorioId}`),

    // Disponibilità
    getDisponibilita: (id: string) =>
        apiGet<ApiResponse<DisponibilitaMedico[]>>(`${CLINICA_BASE}/medici/${id}/disponibilita`)
            .then(extractData),

    // Stats
    getStats: () =>
        apiGet<ApiResponse<{
            total: number;
            active: number;
            bySpecializzazione: Record<string, number>;
        }>>(`${CLINICA_BASE}/medici/stats`)
            .then(extractData),

    // Enable existing person as medico
    enable: (data: {
        personId: string;
        email?: string;
        phone?: string;
        pec?: string;
        residenceAddress?: string;
        residenceCity?: string;
        province?: string;
        postalCode?: string;
        iban?: string;
        notes?: string;
        specialties?: string[];
        registerCode?: string;
        registerCode2?: string;
        shortDescription?: string;
        fullDescription?: string;
        alboRegione?: string;
        prestazioniIds?: string[];
    }) =>
        apiPost<ApiResponse<Medico>>(`${CLINICA_BASE}/medici/enable`, data)
            .then(extractData),

    // Documents API
    getDocuments: (medicoId: string, options?: { tipo?: string; includeExpired?: boolean }) =>
        apiGet<ApiResponse<PersonDocument[]>>(`${CLINICA_BASE}/medici/${medicoId}/documents`, options)
            .then(extractData),

    uploadDocument: (medicoId: string, data: CreatePersonDocumentInput) =>
        apiPost<ApiResponse<PersonDocument>>(`${CLINICA_BASE}/medici/${medicoId}/documents`, data)
            .then(extractData),

    getDocumentVersions: (medicoId: string, docId: string) =>
        apiGet<ApiResponse<PersonDocument[]>>(`${CLINICA_BASE}/medici/${medicoId}/documents/${docId}/versions`)
            .then(extractData),

    deleteDocument: (medicoId: string, docId: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/medici/${medicoId}/documents/${docId}`)
};

// =====================================================
// API FUNCTIONS - CATALOG
// =====================================================

/**
 * Prestazioni API
 */
export const prestazioniApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Prestazione>>(`${CLINICA_BASE}/prestazioni`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Prestazione>>(`${CLINICA_BASE}/prestazioni/${id}`)
            .then(extractData),

    create: (data: Partial<Prestazione>) =>
        apiPost<ApiResponse<Prestazione>>(`${CLINICA_BASE}/prestazioni`, data)
            .then(extractData),

    update: (id: string, data: Partial<Prestazione>) =>
        apiPut<ApiResponse<Prestazione>>(`${CLINICA_BASE}/prestazioni/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/prestazioni/${id}`),

    // P65.7: Template campi RIMOSSI - usare visitTemplatesApi con scope=CATALOGO
    // Esempio: visitTemplatesApi.getByPrestazione(prestazioneId, { scope: 'CATALOGO' })

    // Doctors association
    getMedici: (id: string) =>
        apiGet<ApiResponse<MedicoAbilitato[]>>(`${CLINICA_BASE}/prestazioni/${id}/medici`)
            .then(extractData),

    getMediciAbilitati: (id: string) =>
        apiGet<ApiResponse<MedicoAbilitato[]>>(`${CLINICA_BASE}/prestazioni/${id}/medici`)
            .then(extractData),

    addMedico: (id: string, medicoId: string) =>
        apiPost<{ success: boolean }>(`${CLINICA_BASE}/prestazioni/${id}/medici`, { medicoId }),

    removeMedico: (id: string, medicoId: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/prestazioni/${id}/medici/${medicoId}`),

    // Ambulatori association
    getAmbulatori: (id: string) =>
        apiGet<ApiResponse<PrestazioneAmbulatorio[]>>(`${CLINICA_BASE}/prestazioni/${id}/ambulatori`)
            .then(extractData),

    addAmbulatorio: (id: string, ambulatorioId: string) =>
        apiPost<ApiResponse<PrestazioneAmbulatorio>>(`${CLINICA_BASE}/prestazioni/${id}/ambulatori`, { ambulatorioId })
            .then(extractData),

    removeAmbulatorio: (id: string, ambulatorioId: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/prestazioni/${id}/ambulatori/${ambulatorioId}`),

    // Stats
    getStats: () =>
        apiGet<ApiResponse<{
            total: number;
            active: number;
            byTipo: Record<TipoPrestazione, number>;
        }>>(`${CLINICA_BASE}/prestazioni/stats`)
            .then(extractData)
};

/**
 * Listini Prezzo API - manages pricing for prestazioni
 */
export const listiniApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<ListinoPrezzo>>(`${CLINICA_BASE}/listini`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<ListinoPrezzo>>(`${CLINICA_BASE}/listini/${id}`)
            .then(extractData),

    create: (data: Partial<ListinoPrezzo>) =>
        apiPost<ApiResponse<ListinoPrezzo>>(`${CLINICA_BASE}/listini`, data)
            .then(extractData),

    update: (id: string, data: Partial<ListinoPrezzo>) =>
        apiPut<ApiResponse<ListinoPrezzo>>(`${CLINICA_BASE}/listini/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/listini/${id}`),

    getByPrestazione: (prestazioneId: string) =>
        apiGet<ApiResponse<ListinoPrezzo[]>>(`${CLINICA_BASE}/listini/prestazione/${prestazioneId}`)
            .then(extractData),

    getByMedico: (medicoId: string) =>
        apiGet<ApiResponse<ListinoPrezzo[]>>(`${CLINICA_BASE}/listini/medico/${medicoId}`)
            .then(extractData),

    // Listini per bundle (Tariffario Avanzato)
    getByBundle: (bundleId: string) =>
        apiGet<ApiResponse<ListinoPrezzo[]>>(`${CLINICA_BASE}/listini/bundle/${bundleId}`)
            .then(extractData),

    // Crea listino per bundle (specifico per medico)
    createForBundle: (data: Partial<ListinoPrezzo> & { bundleId: string }) =>
        apiPost<ApiResponse<ListinoPrezzo>>(`${CLINICA_BASE}/listini/bundle`, data)
            .then(extractData),

    // P72_19: Listini per questionario (documentoTemplate)
    getByDocumentoTemplate: (templateId: string) =>
        apiGet<ApiResponse<ListinoPrezzo[]>>(`${CLINICA_BASE}/listini/questionario/${templateId}`)
            .then(extractData),

    // P72_19: Crea listino per questionario (specifico per medico)
    createForDocumentoTemplate: (data: Partial<ListinoPrezzo> & { documentoTemplateId: string }) =>
        apiPost<ApiResponse<ListinoPrezzo>>(`${CLINICA_BASE}/listini/questionario`, data)
            .then(extractData),

    calculatePrice: (data: { prestazioneId: string; convenzioneId?: string; poliambulatorioId?: string }) =>
        apiPost<ApiResponse<{ prezzoBase: number; prezzoFinale: number; sconto?: number }>>(`${CLINICA_BASE}/listini/calculate`, data)
            .then(extractData)
};

/**
 * Tariffario API - Advanced pricing calculation
 * Progetto 44: Sistema Tariffario Avanzato
 */
export const tariffarioApi = {
    // Calculate price with cascading priority
    calcolaPrezzo: (input: CalcoloPrezzoInput) =>
        apiPost<ApiResponse<CalcoloPrezzoOutput>>(`${CLINICA_BASE}/tariffario/calcola-prezzo`, input)
            .then(extractData),

    // Get pricing breakdown for a prestazione
    getBreakdown: (prestazioneId: string, options?: { medicoId?: string; convenzioneId?: string }) =>
        apiGet<ApiResponse<BreakdownPrezzo>>(`${CLINICA_BASE}/tariffario/breakdown/${prestazioneId}`, options)
            .then(extractData)
};

/**
 * Bundle/Offerte API - Package offers management
 * Progetto 44: Sistema Tariffario Avanzato
 */
export const bundleApi = {
    getAll: (options?: QueryOptions & { attivo?: boolean; includeExpired?: boolean }) =>
        apiGet<BackendPaginatedResponse<OffertaBundle>>(`${CLINICA_BASE}/bundle`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<OffertaBundle>>(`${CLINICA_BASE}/bundle/${id}`)
            .then(extractData),

    create: (data: OffertaBundleInput) =>
        apiPost<ApiResponse<OffertaBundle>>(`${CLINICA_BASE}/bundle`, data)
            .then(extractData),

    update: (id: string, data: OffertaBundleInput) =>
        apiPut<ApiResponse<OffertaBundle>>(`${CLINICA_BASE}/bundle/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/bundle/${id}`),

    toggle: (id: string, attivo: boolean) =>
        apiPatch<ApiResponse<OffertaBundle>>(`${CLINICA_BASE}/bundle/${id}/toggle`, { attivo })
            .then(extractData),

    getByPrestazione: (prestazioneId: string) =>
        apiGet<ApiResponse<OffertaBundle[]>>(`${CLINICA_BASE}/bundle/by-prestazione/${prestazioneId}`)
            .then(extractData),

    // Applicability check for patient
    checkApplicability: (bundleId: string, paziente: PazienteFilter) =>
        apiPost<ApiResponse<{ applicabile: boolean; motivo?: string }>>(`${CLINICA_BASE}/bundle/check-applicability`, { bundleId, paziente })
            .then(extractData),

    // Get all applicable bundles for patient
    getApplicableForPatient: (paziente: PazienteFilter) =>
        apiPost<ApiResponse<OffertaBundle[]>>(`${CLINICA_BASE}/bundle/for-patient`, { paziente })
            .then(extractData),

    // Increment usage counter
    incrementUsage: (id: string) =>
        apiPost<ApiResponse<{ utilizziCorrente: number }>>(`${CLINICA_BASE}/bundle/${id}/increment-usage`, {})
            .then(extractData)
};

/**
 * Tariffario Medico API - Per-medico pricing configuration
 * Progetto 44: Sistema Tariffario Avanzato
 */
export const tariffarioMedicoApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<TariffarioMedico>>(`${CLINICA_BASE}/tariffario-medico`, options)
            .then(extractPaginatedData),

    getByMedico: (medicoId: string) =>
        apiGet<ApiResponse<TariffarioMedico[]>>(`${CLINICA_BASE}/tariffario-medico/by-medico/${medicoId}`)
            .then(extractData),

    getEffective: (data: { medicoId: string; brancaSpecialistica?: string; convenzioneId?: string }) =>
        apiPost<ApiResponse<TariffarioMedico | null>>(`${CLINICA_BASE}/tariffario-medico/effective`, data)
            .then(extractData),

    create: (data: TariffarioMedicoInput) =>
        apiPost<ApiResponse<TariffarioMedico>>(`${CLINICA_BASE}/tariffario-medico`, data)
            .then(extractData),

    update: (id: string, data: TariffarioMedicoInput) =>
        apiPut<ApiResponse<TariffarioMedico>>(`${CLINICA_BASE}/tariffario-medico/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/tariffario-medico/${id}`)
};

/**
 * Convenzioni API
 */
export const convenzioniApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Convenzione>>(`${CLINICA_BASE}/convenzioni`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Convenzione>>(`${CLINICA_BASE}/convenzioni/${id}`)
            .then(extractData),

    create: (data: Partial<Convenzione>) =>
        apiPost<ApiResponse<Convenzione>>(`${CLINICA_BASE}/convenzioni`, data)
            .then(extractData),

    update: (id: string, data: Partial<Convenzione>) =>
        apiPut<ApiResponse<Convenzione>>(`${CLINICA_BASE}/convenzioni/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/convenzioni/${id}`),

    checkValidity: (id: string) =>
        apiGet<ApiResponse<{ valid: boolean; message?: string }>>(`${CLINICA_BASE}/convenzioni/${id}/validity`)
            .then(extractData),

    // Listini association
    getListini: (convenzioneId: string) =>
        apiGet<ApiResponse<ListinoPrezzo[]>>(`${CLINICA_BASE}/convenzioni/${convenzioneId}/listini`)
            .then(extractData),

    associateListino: (convenzioneId: string, listinoId: string) =>
        apiPost<ApiResponse<{ success: boolean }>>(`${CLINICA_BASE}/convenzioni/${convenzioneId}/listini`, { listinoId })
            .then(extractData),

    removeListino: (convenzioneId: string, listinoId: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/convenzioni/${convenzioneId}/listini/${listinoId}`),

    // Aziende associate
    getAziende: (convenzioneId: string) =>
        apiGet<ApiResponse<ConvenzioneAzienda[]>>(`${CLINICA_BASE}/convenzioni/${convenzioneId}/aziende`)
            .then(extractData),

    associateAzienda: (convenzioneId: string, data: ConvenzioneAziendaInput) =>
        apiPost<ApiResponse<ConvenzioneAzienda>>(`${CLINICA_BASE}/convenzioni/${convenzioneId}/aziende`, data)
            .then(extractData),

    updateAziendaAssociation: (convenzioneId: string, associazioneId: string, data: Partial<ConvenzioneAziendaInput>) =>
        apiPut<ApiResponse<ConvenzioneAzienda>>(`${CLINICA_BASE}/convenzioni/${convenzioneId}/aziende/${associazioneId}`, data)
            .then(extractData),

    removeAzienda: (convenzioneId: string, associazioneId: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/convenzioni/${convenzioneId}/aziende/${associazioneId}`)
};

/**
 * Riconoscimenti Convenzione API
 */
export const riconoscimentiApi = {
    // Get riconoscimenti per associazione azienda-convenzione
    getByConvenzioneAzienda: (convenzioneId: string, aziendaAssociazioneId: string) =>
        apiGet<ApiResponse<RiconoscimentoConvenzione[]>>(
            `${CLINICA_BASE}/convenzioni/${convenzioneId}/aziende/${aziendaAssociazioneId}/riconoscimenti`
        ).then(extractData),

    // CRUD riconoscimenti
    create: (data: RiconoscimentoConvenzioneInput) =>
        apiPost<ApiResponse<RiconoscimentoConvenzione>>(`${CLINICA_BASE}/riconoscimenti`, data)
            .then(extractData),

    update: (id: string, data: Partial<RiconoscimentoConvenzioneInput>) =>
        apiPut<ApiResponse<RiconoscimentoConvenzione>>(`${CLINICA_BASE}/riconoscimenti/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/riconoscimenti/${id}`),

    // Erogazioni
    eroga: (data: {
        riconoscimentoConvenzioneId: string;
        pazienteId: string;
        importoBase: number;
        appuntamentoId?: string;
        note?: string;
    }) =>
        apiPost<ApiResponse<RiconoscimentoErogato>>(`${CLINICA_BASE}/riconoscimenti/eroga`, data)
            .then(extractData),

    updateStatoErogazione: (id: string, stato: StatoRiconoscimento) =>
        apiPut<ApiResponse<RiconoscimentoErogato>>(`${CLINICA_BASE}/riconoscimenti/erogazione/${id}/stato`, { stato })
            .then(extractData),

    getErogazioniByAzienda: (aziendaId: string, options?: { page?: number; pageSize?: number; stato?: StatoRiconoscimento; dataInizio?: string; dataFine?: string }) =>
        apiGet<BackendPaginatedResponse<RiconoscimentoErogato>>(`${CLINICA_BASE}/riconoscimenti/azienda/${aziendaId}/erogazioni`, options)
            .then(extractPaginatedData),

    // Utility
    getApplicabili: (params: { pazienteId: string; bundleId?: string; prestazioneId?: string }) =>
        apiGet<ApiResponse<RiconoscimentoConvenzione[]>>(`${CLINICA_BASE}/riconoscimenti/applicabili`, params)
            .then(extractData),

    getStatistiche: (filters?: { convenzioneId?: string; aziendaId?: string; dataInizio?: string; dataFine?: string }) =>
        apiGet<ApiResponse<{
            totaleErogazioni: number;
            perStato: Record<string, { count: number; importo: number }>;
            importoTotaleRiconosciuto: number;
            importoBaseTotale: number;
        }>>(`${CLINICA_BASE}/riconoscimenti/statistiche`, filters)
            .then(extractData)
};

/**
 * Sconti Clinici API
 */
export const scontiApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<ScontoClinico>>(`${CLINICA_BASE}/sconti`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<ScontoClinico>>(`${CLINICA_BASE}/sconti/${id}`)
            .then(extractData),

    create: (data: Partial<ScontoClinico>) =>
        apiPost<ApiResponse<ScontoClinico>>(`${CLINICA_BASE}/sconti`, data)
            .then(extractData),

    update: (id: string, data: Partial<ScontoClinico>) =>
        apiPut<ApiResponse<ScontoClinico>>(`${CLINICA_BASE}/sconti/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/sconti/${id}`),

    validate: (data: { codice: string; prezzoBase: number; prestazioneId?: string }) =>
        apiPost<ApiResponse<{ valid: boolean; sconto?: ScontoClinico; errors?: string[] }>>(`${CLINICA_BASE}/sconti/validate`, data)
            .then(extractData),

    apply: (data: { codice: string; prezzoBase: number; prestazioneId?: string }) =>
        apiPost<ApiResponse<{ success: boolean; prezzoOriginale: number; prezzoFinale: number; scontoApplicato: number; source?: string }>>(`${CLINICA_BASE}/sconti/apply`, data)
            .then(extractData),

    getStatistics: () =>
        apiGet<ApiResponse<unknown>>(`${CLINICA_BASE}/sconti/statistics`)
            .then(extractData),

    getForPrestazione: (prestazioneId: string) =>
        apiGet<ApiResponse<ScontoClinico[]>>(`${CLINICA_BASE}/sconti/prestazione/${prestazioneId}`)
            .then(extractData)
};

// =====================================================
// API FUNCTIONS - AGENDA
// =====================================================

/**
 * Slot Disponibilità API
 */
export const slotsApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<SlotDisponibilita>>(`${CLINICA_BASE}/slots`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<SlotDisponibilita>>(`${CLINICA_BASE}/slots/${id}`)
            .then(extractData),

    create: (data: Partial<SlotDisponibilita>) =>
        apiPost<ApiResponse<SlotDisponibilita>>(`${CLINICA_BASE}/slots`, data)
            .then(extractData),

    update: (id: string, data: Partial<SlotDisponibilita>) =>
        apiPut<ApiResponse<SlotDisponibilita>>(`${CLINICA_BASE}/slots/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/slots/${id}`),

    // P68: Cascade delete (deletes all future slots from the same pattern)
    deleteCascade: (id: string) =>
        apiDelete<{ success: boolean; deletedSlots: number; message: string }>(`${CLINICA_BASE}/slots/${id}/cascade`),

    getAvailability: (params: { dataInizio: string; dataFine: string; ambulatorioId?: string; medicoId?: string }) =>
        apiGet<ApiResponse<SlotDisponibilita[]>>(`${CLINICA_BASE}/slots/availability`, params)
            .then(extractData),

    checkOverlap: (data: { ambulatorioId: string; data: string; oraInizio: string; oraFine: string }) =>
        apiPost<ApiResponse<{ hasOverlap: boolean; conflicts?: SlotDisponibilita[] }>>(`${CLINICA_BASE}/slots/check-overlap`, data)
            .then(extractData)
};

/**
 * Disponibilità Medico API
 */
export const disponibilitaApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<DisponibilitaMedico>>(`${CLINICA_BASE}/disponibilita`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<DisponibilitaMedico>>(`${CLINICA_BASE}/disponibilita/${id}`)
            .then(extractData),

    create: (data: Partial<DisponibilitaMedico>) =>
        apiPost<ApiResponse<DisponibilitaMedico>>(`${CLINICA_BASE}/disponibilita`, data)
            .then(extractData),

    update: (id: string, data: Partial<DisponibilitaMedico>) =>
        apiPut<ApiResponse<DisponibilitaMedico>>(`${CLINICA_BASE}/disponibilita/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/disponibilita/${id}`),

    getByMedico: (medicoId: string) =>
        apiGet<ApiResponse<DisponibilitaMedico[]>>(`${CLINICA_BASE}/disponibilita/medico/${medicoId}`)
            .then(extractData),

    copyWeek: (medicoId: string, fromDate: string, toDate: string) =>
        apiPost<ApiResponse<{ success: boolean; created: number }>>(`${CLINICA_BASE}/disponibilita/copy-week`, { medicoId, fromDate, toDate })
            .then(extractData),

    generateSlots: (medicoId: string, dataInizio: string, dataFine: string) =>
        apiPost<ApiResponse<{ created: number; skipped: number; errors: number; details: string[] }>>(`${CLINICA_BASE}/disponibilita/generate-slots`, { medicoId, dataInizio, dataFine })
            .then(extractData)
};

/**
 * Ferie e Assenze API
 */
export const ferieApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<FerieAssenza>>(`${CLINICA_BASE}/ferie`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<FerieAssenza>>(`${CLINICA_BASE}/ferie/${id}`)
            .then(extractData),

    create: (data: Partial<FerieAssenza>) =>
        apiPost<ApiResponse<FerieAssenza>>(`${CLINICA_BASE}/ferie`, data)
            .then(extractData),

    update: (id: string, data: Partial<FerieAssenza>) =>
        apiPut<ApiResponse<FerieAssenza>>(`${CLINICA_BASE}/ferie/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/ferie/${id}`),

    getByMedico: (medicoId: string) =>
        apiGet<ApiResponse<FerieAssenza[]>>(`${CLINICA_BASE}/ferie/medico/${medicoId}`)
            .then(extractData),

    checkConflicts: (medicoId: string, dataInizio: string, dataFine: string) =>
        apiGet<ApiResponse<{ hasConflicts: boolean; appuntamenti?: Appuntamento[] }>>(
            `${CLINICA_BASE}/ferie/check-conflicts`,
            { medicoId, dataInizio, dataFine }
        ).then(extractData)
};

/**
 * Appuntamenti API
 */
export const appuntamentiApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Appuntamento>>(`${CLINICA_BASE}/appuntamenti`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Appuntamento>>(`${CLINICA_BASE}/appuntamenti/${id}`)
            .then(extractData),

    create: (data: Partial<Appuntamento>) =>
        apiPost<ApiResponse<Appuntamento>>(`${CLINICA_BASE}/appuntamenti`, data)
            .then(extractData),

    update: (id: string, data: Partial<Appuntamento>) =>
        apiPut<ApiResponse<Appuntamento>>(`${CLINICA_BASE}/appuntamenti/${id}`, data)
            .then(extractData),

    delete: (id: string, deletionReason = 'Eliminazione manuale appuntamento') =>
        apiDeleteWithPayload<{ success: boolean }>(`${CLINICA_BASE}/appuntamenti/${id}`, { deletionReason }),

    changeStato: (id: string, stato: Appuntamento['stato'], data?: { motivo?: string; motivoAnnullamento?: string }) =>
        apiPut<ApiResponse<Appuntamento>>(`${CLINICA_BASE}/appuntamenti/${id}/stato`, { stato, ...(data || {}) })
            .then(extractData),

    getTransitions: (id: string) =>
        apiGet<ApiResponse<{ availableStates: string[] }>>(`${CLINICA_BASE}/appuntamenti/${id}/transitions`)
            .then(extractData),

    /**
     * Accetta paziente (check-in) - Cambia stato a IN_ATTESA
     * @param id - ID appuntamento
     * @param data - Dati opzionali (convenzioneId, pazienteId, note, noteInterne)
     * @param tenantId - Tenant ID opzionale per cross-tenant
     * @returns Appuntamento con flag noActiveQueueSession se nessuna sessione coda attiva
     */
    accetta: (id: string, data?: { convenzioneId?: string; pazienteId?: string; note?: string; noteInterne?: string; stato?: string }, tenantId?: string) =>
        apiPost<ApiResponse<Appuntamento> & { noActiveQueueSession?: boolean }>(
            `${CLINICA_BASE}/appuntamenti/${id}/accetta`,
            data,
            tenantId ? { headers: { 'X-Operate-Tenant-Id': tenantId } } : undefined
        ),

    chiama: (id: string, tenantId?: string) =>
        apiPost<ApiResponse<Appuntamento>>(
            `${CLINICA_BASE}/appuntamenti/${id}/chiama`,
            undefined,
            tenantId ? { headers: { 'X-Operate-Tenant-Id': tenantId } } : undefined
        ).then(extractData),

    /**
     * Annulla visita in corso: azzera oraInizio e riporta stato a PRENOTATO.
     * Da usare quando il medico esce dalla VisitaPage senza completare.
     */
    annullaVisita: (id: string) =>
        apiPost<ApiResponse<Appuntamento>>(`${CLINICA_BASE}/appuntamenti/${id}/annulla-visita`, {})
            .then(extractData),

    /**
     * Registra pagamento per appuntamento
     * Gestisce sia il pagamento anticipato che quello post-visita
     * - Se stato è PRENOTATO/CONFERMATO/IN_ATTESA/IN_CORSO: registra pagamento anticipato
     * - Se stato è COMPLETATO: cambia in FATTURATO
     */
    registraPagamento: (id: string, tenantId?: string) =>
        apiPost<ApiResponse<Appuntamento>>(
            `${CLINICA_BASE}/appuntamenti/${id}/pagamento`,
            undefined,
            tenantId ? { headers: { 'X-Operate-Tenant-Id': tenantId } } : undefined
        ).then(extractData),

    /**
     * Check if patient already has an appointment with the same doctor on the same day
     * Used to warn users before creating potential duplicate bookings
     */
    checkDuplicate: (pazienteId: string, medicoId: string, dataOra: string, excludeAppuntamentoId?: string) =>
        apiGet<ApiResponse<{ hasDuplicate: boolean; existingAppointments: Appuntamento[] }>>(
            `${CLINICA_BASE}/appuntamenti/check-duplicate`,
            { pazienteId, medicoId, dataOra, ...(excludeAppuntamentoId && { excludeAppuntamentoId }) }
        ).then(extractData),

    getByPaziente: (pazienteId: string) =>
        apiGet<ApiResponse<Appuntamento[]>>(`${CLINICA_BASE}/appuntamenti/paziente/${pazienteId}`)
            .then(extractData),

    getByMedico: (medicoId: string) =>
        apiGet<ApiResponse<Appuntamento[]>>(`${CLINICA_BASE}/appuntamenti/medico/${medicoId}`)
            .then(extractData),

    /** 
     * Get today's appointments with permission meta 
     * @returns Data and meta with canViewOtherMedici flag
     */
    getToday: async (): Promise<Appuntamento[]> => {
        const response = await apiGet<ApiResponseWithMeta<Appuntamento[]>>(`${CLINICA_BASE}/appuntamenti/today`);
        // Store meta in a way components can access
        // For simplicity, attach to the array (not ideal but works)
        const data = response.data || [];
        // @ts-expect-error - Attaching meta to array for backward compatibility
        data._meta = response.meta;
        return data;
    },

    /** 
     * Get today's appointments with full response including meta
     */
    getTodayWithMeta: async (): Promise<ResultWithMeta<Appuntamento[]>> => {
        const response = await apiGet<ApiResponseWithMeta<Appuntamento[]>>(`${CLINICA_BASE}/appuntamenti/today`);
        return {
            data: response.data || [],
            meta: response.meta
        };
    },

    /** Get appointments for a specific date */
    getByDate: (date: string) => {
        // date is in YYYY-MM-DD format (local timezone)
        // Send as-is to backend - backend will interpret as full day range
        // DO NOT append 'Z' suffix as that forces UTC interpretation
        return apiGet<BackendPaginatedResponse<Appuntamento>>(
            `${CLINICA_BASE}/appuntamenti`,
            { dataInizio: date, dataFine: date, limit: 100 }
        ).then(extractPaginatedData);
    },

    /** Get appointments for a date range (e.g., Jan 14-17) */
    getByDateRange: (dataInizio: string, dataFine: string) => {
        // Dates in YYYY-MM-DD format (local timezone)
        // For range queries - useful for Accettazione multi-day view
        return apiGet<BackendPaginatedResponse<Appuntamento>>(
            `${CLINICA_BASE}/appuntamenti`,
            { dataInizio, dataFine, limit: 500 }
        ).then(extractPaginatedData);
    }
};

// =====================================================
// PROGETTO 55: Multi-Prestazioni API
// =====================================================

export interface AppuntamentoPrestazioneStats {
    totali: number;
    daRefertare: number;
    refertate: number;
    percentualeCompletamento: number;
    totaleCompensi: number;
    compensiPagati: number;
    compensiDaPagare: number;
}

/**
 * API per gestione multi-prestazioni appuntamento
 * Progetto 55: Medicina del Lavoro
 */
export const appuntamentoPrestazioniApi = {
    /**
     * Crea prestazioni da bundle
     * @param appuntamentoId - ID appuntamento
     * @param bundleId - ID bundle offerta
     * @param medicoRefertanteOverrides - Override medico refertante per prestazioneId
     */
    createFromBundle: (
        appuntamentoId: string,
        bundleId: string,
        medicoRefertanteOverrides?: Record<string, string>
    ) =>
        apiPost<ApiResponse<AppuntamentoPrestazione[]>>(
            `${CLINICA_BASE}/appuntamenti/${appuntamentoId}/prestazioni/from-bundle`,
            { bundleId, medicoRefertanteOverrides }
        ).then(extractData),

    /**
     * Crea prestazioni singole
     * @param appuntamentoId - ID appuntamento
     * @param prestazioni - Array di { prestazioneId, medicoRefertanteId?, ordine? }
     * @param visitaId - P73: ID visita principale (opzionale, per creare visita secondaria)
     */
    create: (
        appuntamentoId: string,
        prestazioni: Array<{ prestazioneId: string; medicoRefertanteId?: string; ordine?: number }>,
        visitaId?: string
    ) =>
        apiPost<ApiResponse<AppuntamentoPrestazione[]>>(
            `${CLINICA_BASE}/appuntamenti/${appuntamentoId}/prestazioni`,
            { prestazioni, visitaId }
        ).then(extractData),

    /**
     * Lista prestazioni per appuntamento
     * @param appuntamentoId - ID appuntamento
     */
    listByAppuntamento: (appuntamentoId: string) =>
        apiGet<ApiResponse<AppuntamentoPrestazione[]>>(
            `${CLINICA_BASE}/appuntamenti/${appuntamentoId}/prestazioni`
        ).then(extractData),

    /**
     * Lista prestazioni da refertare per medico corrente
     * @param options - Opzioni query (page, limit, stati)
     */
    listDaRefertare: (options?: { page?: number; limit?: number; stati?: string }) =>
        apiGet<{
            success: boolean;
            data: AppuntamentoPrestazione[];
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        }>(
            `${CLINICA_BASE}/prestazioni-da-refertare`,
            options
        ),

    /**
     * Statistiche prestazioni per medico refertante
     * @param dateRange - Range date opzionale
     */
    getStats: (dateRange?: { from?: string; to?: string }) =>
        apiGet<ApiResponse<AppuntamentoPrestazioneStats>>(
            `${CLINICA_BASE}/prestazioni-da-refertare/stats`,
            dateRange
        ).then(extractData),

    /**
     * Aggiorna stato prestazione
     * @param id - ID prestazione appuntamento
     * @param stato - Nuovo stato
     * @param updates - Altri campi (note, dataEsecuzione)
     */
    updateStato: (
        id: string,
        stato: StatoPrestazioneAppuntamento,
        updates?: { note?: string; dataEsecuzione?: string; applyNormalPreset?: boolean; visitaParentId?: string }
    ) =>
        apiPatch<ApiResponse<AppuntamentoPrestazione>>(
            `${CLINICA_BASE}/prestazioni/${id}/stato`,
            { stato, ...updates }
        ).then(extractData),

    /**
     * Collega referto a prestazione
     * @param id - ID prestazione appuntamento
     * @param refertoId - ID referto
     */
    linkReferto: (id: string, refertoId: string) =>
        apiPost<ApiResponse<AppuntamentoPrestazione>>(
            `${CLINICA_BASE}/prestazioni/${id}/link-referto`,
            { refertoId }
        ).then(extractData),

    /**
     * Assegna medico refertante
     * @param id - ID prestazione appuntamento
     * @param medicoRefertanteId - ID medico
     */
    assignMedicoRefertante: (id: string, medicoRefertanteId: string) =>
        apiPost<ApiResponse<AppuntamentoPrestazione>>(
            `${CLINICA_BASE}/prestazioni/${id}/medico-refertante`,
            { medicoRefertanteId }
        ).then(extractData),

    /**
     * Crea/recupera la visita secondaria collegata a una prestazione appuntamento.
     * Usato dalla card Prestazioni per aprire la scheda compatta dell'accertamento
     * anche quando il medico refertante coincide con il medico della visita principale.
     */
    ensureVisitaSecondaria: (id: string, visitaParentId?: string) =>
        apiPost<ApiResponse<{ appPrestazioneId?: string; visitaSecondariaId: string; visita?: { id: string } }>>(
            `${CLINICA_BASE}/prestazioni/${id}/visita-secondaria`,
            { visitaParentId }
        ).then(extractData),

    /**
     * Calcola compenso per medico refertante
     * @param id - ID prestazione appuntamento
     * @param importoPrestazione - Importo della prestazione
     */
    calcolaCompenso: (id: string, importoPrestazione: number) =>
        apiPost<ApiResponse<AppuntamentoPrestazione>>(
            `${CLINICA_BASE}/prestazioni/${id}/calcola-compenso`,
            { importoPrestazione }
        ).then(extractData),

    /**
     * Marca compenso come pagato
     * @param id - ID prestazione appuntamento
     */
    marcaCompensoPagato: (id: string) =>
        apiPost<ApiResponse<AppuntamentoPrestazione>>(
            `${CLINICA_BASE}/prestazioni/${id}/compenso-pagato`,
            {}
        ).then(extractData),

    /**
     * Elimina prestazione (soft delete)
     * @param id - ID prestazione appuntamento
     */
    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/prestazioni/${id}`)
};

// =====================================================
// API FUNCTIONS - CLINICAL
// =====================================================

/**
 * Visite API
 */
// =====================================================
// API FUNCTIONS - VISIT TEMPLATES (Progetto 52)
// =====================================================

/**
 * Visit Templates API
 * Gestione template visite personalizzabili per medico
 */
export const visitTemplatesApi = {
    /**
     * Recupera tutti i template (con paginazione, per admin)
     * P65.7: Aggiunto supporto per filtro `scope` (PERSONAL, PRESTAZIONE, GLOBAL, CATALOGO)
     */
    getAll: (options?: QueryOptions & {
        medicoId?: string;
        prestazioneId?: string;
        bundleId?: string;
        scope?: TemplateScope; // P65.7: Filtro per scope
        isDefault?: boolean;
        isActive?: boolean;
        allTenants?: boolean;
        tenantIds?: string;
    }) =>
        apiGet<BackendPaginatedResponse<VisitTemplate>>(`${CLINICA_BASE}/visit-templates`, options)
            .then(extractPaginatedData),

    /**
     * Recupera un template per ID
     */
    getById: (id: string) =>
        apiGet<ApiResponse<VisitTemplate>>(`${CLINICA_BASE}/visit-templates/${id}`)
            .then(extractData),

    /**
     * Recupera i template del medico corrente
     */
    getMyTemplates: (options?: { includeInactive?: boolean }) =>
        apiGet<ApiResponse<VisitTemplate[]>>(`${CLINICA_BASE}/visit-templates/my-templates`, options)
            .then(extractData),

    /**
     * Recupera i template di un medico specifico
     */
    getByMedico: (medicoId: string, options?: { includeInactive?: boolean }) =>
        apiGet<ApiResponse<VisitTemplate[]>>(`${CLINICA_BASE}/visit-templates/medico/${medicoId}`, options)
            .then(extractData),

    /**
     * Trova il template da usare per una visita specifica
     * Priorità: prestazione > bundle > default medico > sistema
     */
    getForVisit: (params: { medicoId: string; prestazioneId?: string; bundleId?: string }) =>
        apiGet<ApiResponse<VisitTemplate>>(`${CLINICA_BASE}/visit-templates/for-visit`, params)
            .then(extractData),

    /**
     * Recupera i default del sistema (campi, sidebar, stampa, tipi)
     */
    getDefaults: () =>
        apiGet<ApiResponse<VisitTemplateDefaults>>(`${CLINICA_BASE}/visit-templates/defaults`)
            .then(extractData),

    /**
     * Crea un nuovo template
     */
    create: (data: VisitTemplateInput) =>
        apiPost<ApiResponse<VisitTemplate>>(`${CLINICA_BASE}/visit-templates`, data)
            .then(extractData),

    /**
     * Aggiorna un template esistente
     */
    update: (id: string, data: Partial<VisitTemplateInput>) =>
        apiPut<ApiResponse<VisitTemplate>>(`${CLINICA_BASE}/visit-templates/${id}`, data)
            .then(extractData),

    /**
     * Clona un template
     */
    clone: (id: string, options: VisitTemplateCloneOptions) =>
        apiPost<ApiResponse<VisitTemplate>>(`${CLINICA_BASE}/visit-templates/${id}/clone`, options)
            .then(extractData),

    /**
     * Risolve gerarchicamente il template applicabile (PERSONAL > PRESTAZIONE > GLOBAL)
     * @param medicoId - ID del medico (opzionale, usa utente corrente)
     * @param prestazioneId - ID della prestazione (opzionale)
     * @param bundleId - ID del bundle (opzionale)
     */
    resolve: (params?: { medicoId?: string; prestazioneId?: string; bundleId?: string }) =>
        apiGet<ApiResponse<VisitTemplate>>(`${CLINICA_BASE}/visit-templates/resolve`, params)
            .then(extractData),

    /**
     * Elimina un template (soft delete)
     */
    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/visit-templates/${id}`)
};

// =====================================================
// API FUNCTIONS - CLINICAL (VISITE & REFERTI)
// =====================================================

export const visiteApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Visita>>(`${CLINICA_BASE}/visite`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Visita>>(`${CLINICA_BASE}/visite/${id}`)
            .then(extractData),

    /**
     * Get or create visita from appuntamento
     * If visita exists for appuntamento, returns it.
     * If not, creates a new visita with data from appuntamento.
     * @param appuntamentoId - Appointment ID
     * @returns {Promise<{visita: Visita, created: boolean, medicoAssegnato: Medico | null, medicoCorrente: Medico | null}>}
     */
    getOrCreateByAppuntamento: (appuntamentoId: string) =>
        apiGet<{
            success: boolean;
            data: Visita;
            created: boolean;
            medicoAssegnato: { id: string; firstName: string; lastName: string } | null;
            medicoCorrente: { id: string; firstName: string; lastName: string } | null;
        }>(`${CLINICA_BASE}/visite/by-appuntamento/${appuntamentoId}`),

    create: (data: Partial<Visita>) =>
        apiPost<ApiResponse<Visita>>(`${CLINICA_BASE}/visite`, data)
            .then(extractData),

    update: (id: string, data: Partial<Visita>) =>
        apiPut<ApiResponse<Visita>>(`${CLINICA_BASE}/visite/${id}`, data)
            .then(extractData),

    delete: (id: string, deletionReason: string) =>
        apiDeleteWithPayload<{ success: boolean; id: string; deletedAt: string; deletionReason: string }>(`${CLINICA_BASE}/visite/${id}`, { deletionReason }),

    inizia: (id: string) =>
        apiPost<ApiResponse<Visita>>(`${CLINICA_BASE}/visite/${id}/inizia`)
            .then(extractData),

    termina: (id: string) =>
        apiPost<{ success: boolean; data: Visita; billingWarnings?: Array<{ type: string; message: string; solutionUrl?: string; field?: string }>; message?: string }>(`${CLINICA_BASE}/visite/${id}/termina`),

    nuovaVersione: (id: string, motivo?: string) =>
        apiPost<ApiResponse<Visita>>(`${CLINICA_BASE}/visite/${id}/nuova-versione`, { motivo })
            .then(extractData),

    annullaModifiche: (id: string) =>
        apiPost<ApiResponse<Visita>>(`${CLINICA_BASE}/visite/${id}/annulla-modifiche`)
            .then(extractData),

    getCampi: (id: string) =>
        apiGet<ApiResponse<unknown[]>>(`${CLINICA_BASE}/visite/${id}/campi`)
            .then(extractData),

    saveCampo: (id: string, data: { templateCampoId: string; valore: unknown }) =>
        apiPost<ApiResponse<unknown>>(`${CLINICA_BASE}/visite/${id}/campi`, data)
            .then(extractData),

    getByPaziente: (pazienteId: string) =>
        apiGet<ApiResponse<Visita[]>>(`${CLINICA_BASE}/visite/paziente/${pazienteId}`)
            .then(extractData),

    getByMedico: (medicoId: string) =>
        apiGet<ApiResponse<Visita[]>>(`${CLINICA_BASE}/visite/medico/${medicoId}`)
            .then(extractData),

    getToday: () =>
        apiGet<ApiResponse<Visita[]>>(`${CLINICA_BASE}/visite/today`)
            .then(extractData),

    /**
     * Genera PDF del referto per una visita
     * @param id - Visita ID
     * @returns PDF generation result with fileUrl and displayFilename
     */
    generateRefertoPdf: (id: string) =>
        apiPost<ApiResponse<{
            documentId: string;
            fileUrl: string;
            displayFilename: string;
            fileSize: number;
            generatedAt: string;
        }>>(`${CLINICA_BASE}/visite/${id}/pdf`)
            .then(extractData),

    /**
     * Ottiene l'ultimo PDF referto generato per una visita
     * @param id - Visita ID
     * @returns PDF info or null if not found
     */
    getRefertoPdf: (id: string) =>
        apiGet<ApiResponse<{
            id: string;
            fileUrl: string;
            displayFilename: string;
            createdAt: string;
        } | null>>(`${CLINICA_BASE}/visite/${id}/pdf`)
            .then(extractData)
            .catch(() => null),  // Return null if no PDF exists

    /**
     * Aggiorna il medico refertante di una visita
     * @param id - Visita ID
     * @param medicoRefertanteId - Person ID del medico refertante (null per ripristinare l'originale)
     */
    updateMedicoRefertante: (id: string, medicoRefertanteId: string | null) =>
        apiPut<ApiResponse<Visita>>(`${CLINICA_BASE}/visite/${id}/medico-refertante`, { medicoRefertanteId })
            .then(extractData),

    /**
     * P71: Aggiorna impostazione "invio referto via mail" per la visita
     * @param id - Visita ID
     * @param invioRefertoMail - true = invia referto PDF al paziente via email dopo terminazione
     */
    updateImpostazioniInvio: (id: string, invioRefertoMail: boolean) =>
        apiPatch<ApiResponse<{ id: string; invioRefertoMail: boolean }>>(`${CLINICA_BASE}/visite/${id}/impostazioni-invio`, { invioRefertoMail })
            .then(extractData),

    /** P73: Visita principale — recupera tutte le visite specialistiche collegate */
    getVisiteCollegate: (id: string) =>
        apiGet<ApiResponse<VisitaCollegata[]>>(`${CLINICA_BASE}/visite/${id}/visite-collegate`)
            .then(extractData),

    /** P73: Visita secondaria — recupera la visita principale */
    getVisitaPrincipale: (id: string) =>
        apiGet<ApiResponse<VisitaCollegata>>(`${CLINICA_BASE}/visite/${id}/visita-principale`)
            .then(extractData),
};

/**
 * Referti API
 */
export const refertiApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Referto>>(`${CLINICA_BASE}/referti`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Referto>>(`${CLINICA_BASE}/referti/${id}`)
            .then(extractData),

    create: (data: Partial<Referto>) =>
        apiPost<ApiResponse<Referto>>(`${CLINICA_BASE}/referti`, data)
            .then(extractData),

    update: (id: string, data: Partial<Referto>) =>
        apiPut<ApiResponse<Referto>>(`${CLINICA_BASE}/referti/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/referti/${id}`),

    firma: (id: string) =>
        apiPost<ApiResponse<Referto>>(`${CLINICA_BASE}/referti/${id}/firma`)
            .then(extractData),

    getVersioni: (id: string) =>
        apiGet<ApiResponse<unknown[]>>(`${CLINICA_BASE}/referti/${id}/versioni`)
            .then(extractData),

    getPdf: (id: string) =>
        apiGet<ApiResponse<string>>(`${CLINICA_BASE}/referti/${id}/pdf`)
            .then(extractData),

    getByVisita: (visitaId: string) =>
        apiGet<ApiResponse<Referto[]>>(`${CLINICA_BASE}/referti/visita/${visitaId}`)
            .then(extractData),

    getByPaziente: (pazienteId: string) =>
        apiGet<ApiResponse<Referto[]>>(`${CLINICA_BASE}/referti/paziente/${pazienteId}`)
            .then(extractData),

    getDaFirmare: () =>
        apiGet<ApiResponse<Referto[]>>(`${CLINICA_BASE}/referti/da-firmare`)
            .then(extractData)
};

// =====================================================
// API FUNCTIONS - PATIENTS
// =====================================================

/**
 * Pazienti API
 */
export const pazientiApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Paziente>>(`${CLINICA_BASE}/pazienti`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Paziente>>(`${CLINICA_BASE}/pazienti/${id}`)
            .then(extractData),

    create: (data: Partial<Paziente>) =>
        apiPost<ApiResponse<Paziente>>(`${CLINICA_BASE}/pazienti`, data)
            .then(extractData),

    createProvisional: (data: { firstName: string; lastName: string; phone?: string; email?: string }) =>
        apiPost<{ success: boolean; data: { id: string; firstName: string; lastName: string; taxCode?: string; birthDate?: string; phone?: string; email?: string; residenceAddress?: string; tenantId: string }; isNew: boolean; wasLinked: boolean; message: string }>(`${CLINICA_BASE}/pazienti/provisional`, data),

    update: (id: string, data: Partial<Paziente>) =>
        apiPut<ApiResponse<Paziente>>(`${CLINICA_BASE}/pazienti/${id}`, data)
            .then(extractData),

    addTutelante: (id: string, data: {
        tutelanteId?: string;
        guardianId?: string;
        firstName?: string;
        lastName?: string;
        nome?: string;
        cognome?: string;
        taxCode?: string;
        codiceFiscale?: string;
        relazione?: string;
        tutelareTipo?: string;
        isLegalGuardian?: boolean;
        phone?: string;
        email?: string;
    }) =>
        apiPost<ApiResponse<unknown>>(`${CLINICA_BASE}/pazienti/${id}/tutelanti`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/pazienti/${id}`),

    search: (query: string) =>
        apiGet<ApiResponse<Paziente[]>>(`${CLINICA_BASE}/pazienti/search`, { q: query })
            .then(extractData),

    getStorico: (id: string) =>
        apiGet<ApiResponse<{
            visite: Visita[];
            referti: Referto[];
            appuntamenti: Appuntamento[];
            prossimaScadenzaMDL: string | null;
            prossimaScadenzaPeriodicita: number | null;
            /** Ultima visita MDL completata (PREVENTIVA o PERIODICA). Fallback: ultimo appuntamento. */
            ultimaScadenzaMDL: {
                dataEsecuzione: string | null;
                dataOra: string | null;
                tipoVisitaMDL: string | null;
                giudizioIdoneita: string | null;
                /** true se non esiste visita MDL e il dato proviene dall'ultimo appuntamento */
                isFallbackAppuntamento?: boolean;
            } | null;
            /** Prossima scadenza già coperta da un appuntamento attivo (computed field) */
            prossimaScadenzaPrenotata: {
                dataOra: string | null;
                tipoVisitaMDL: string | null;
                dataScadenza: string | null;
            } | null;
            /** true se la prossima scadenza ha già un appuntamento prenotato (non annullato/no-show) */
            prossimaScadenzaIsBooked: boolean;
            /** Data appuntamento prenotato per la prossima scadenza (valorizzata solo se prossimaScadenzaIsBooked) */
            prossimaScadenzaAppuntamentoData: string | null;
        }>>(`${CLINICA_BASE}/pazienti/${id}/storico`)
            .then(extractData),

    /**
     * Cerca persona per codice fiscale (anche cross-tenant)
     * @param taxCode - Codice fiscale (16 caratteri)
     * @returns Info sulla persona trovata e se è già paziente nel tenant corrente
     */
    searchByTaxCode: (taxCode: string) =>
        apiGet<{
            success: boolean;
            found: boolean;
            isPazienteInTenant?: boolean;
            person?: {
                id: string;
                firstName: string;
                lastName: string;
                taxCode: string;
                email?: string;
                phone?: string;
                birthDate?: string;
                residenceAddress?: string;
                residenceCity?: string;
                postalCode?: string;
                province?: string;
                isFromOtherTenant: boolean;
                roles: string[];
            };
            message?: string;
        }>(`${CLINICA_BASE}/pazienti/cerca-cf/${taxCode}`),

    /**
     * Crea o aggiorna paziente con dati accettazione
     * Usa POST /pazienti che internamente chiama findOrCreatePaziente
     * @param data - Dati paziente completi
     * @returns Paziente creato/aggiornato
     */
    findOrCreate: (data: {
        existingPersonId?: string;  // ID paziente esistente per update
        firstName: string;
        lastName: string;
        taxCode: string;
        birthDate?: string;
        gender?: 'MALE' | 'FEMALE';
        birthPlace?: string;
        birthProvince?: string;
        etnia?: string | null;
        email?: string;
        phone?: string;
        residenceAddress?: string;
        residenceCity?: string;
        postalCode?: string;
        province?: string;
        numeroCi?: string;
        tipoCi?: 'CI' | 'PASSAPORTO' | 'PATENTE' | 'PERMESSO_SOGGIORNO' | 'ALTRO';
        altroDocumento?: string;
        isMinore?: boolean;
        isNonAutonomo?: boolean;
    }) =>
        apiPost<{
            success: boolean;
            data: Paziente;
            isNew: boolean;
            wasLinked: boolean;
            message: string;
        }>(`${CLINICA_BASE}/pazienti`, data)
};

// =====================================================
// DASHBOARD API
// =====================================================

/**
 * Dashboard API
 */
export const dashboardApi = {
    getStats: () =>
        apiGet<ApiResponse<{
            appuntamentiOggi: number;
            appuntamentiInAttesa: number;
            visiteInCorso: number;
            refertiDaFirmare: number;
            pazientiTotali: number;
            prestazioniDisponibili: number;
        }>>(`${CLINICA_BASE}/dashboard/stats`)
            .then(extractData),

    getRecentActivities: () =>
        apiGet<ApiResponse<Array<{
            id: string;
            tipo: string;
            descrizione: string;
            timestamp: string;
            stato: string;
        }>>>(`${CLINICA_BASE}/dashboard/activities`)
            .then(extractData)
};

// =====================================================
// MODULISTICA TYPES & API (Progetto 53 - Session #13)
// =====================================================

// Enums Modulistica
export type FaseDocumento =
    | 'REGISTRAZIONE'
    | 'PRE_VISITA'
    | 'DURANTE_VISITA'
    | 'POST_VISITA'
    | 'AMMINISTRATIVO'
    | 'ALTRO';

export type TipoDocumentoTemplate =
    | 'CONSENSO_INFORMATO'
    | 'PRIVACY'
    | 'ANAMNESI'
    | 'CERTIFICATO'
    | 'PRESCRIZIONE'
    | 'REFERTO'
    | 'MODULO_GENERICO'
    | 'DICHIARAZIONE'
    | 'QUESTIONARIO_ANAMNESI_MDL'
    | 'QUESTIONARIO_RISCHIO'
    | 'QUESTIONARIO_SINTOMI'
    | 'SCHEDA_SORVEGLIANZA'
    | 'ALCOL_SCREENING'
    | 'ALTRO';

export type StatoDocumentoCompilato =
    | 'BOZZA'
    | 'DA_FIRMARE'
    | 'FIRMATO_PAZIENTE'
    | 'FIRMATO_MEDICO'
    | 'COMPLETATO'
    | 'SCADUTO'
    | 'ANNULLATO';

// Campo template compilabile
// Logica condizionale per mostrare/nascondere campi
export interface CampoCondition {
    /** Nome del campo da cui dipende */
    fieldName: string;
    /** Operatore di confronto */
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
    /** Valore atteso per attivare la condizione */
    value?: string | number | boolean;
}

export type CampoTemplateType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'radio' | 'email' | 'phone' | 'signature';

export interface CampoTemplate {
    name: string;
    type: CampoTemplateType;
    label: string;
    required: boolean;
    options?: string[];
    defaultValue?: string;
    placeholder?: string;
    helpText?: string;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
    /** Condizione per mostrare questo campo (se non soddisfatta, il campo è nascosto) */
    condition?: CampoCondition;
    /** Configurazione scoring per campo (attiva solo se template ha haScoring) */
    scoring?: {
        /** Peso del campo nel calcolo del punteggio (default 1) */
        weight?: number;
        /** Per boolean: punteggio se true */
        trueScore?: number;
        /** Per boolean: punteggio se false */
        falseScore?: number;
        /** Per boolean: se true è critico */
        trueCritical?: boolean;
        /** Per boolean: se false è critico */
        falseCritical?: boolean;
        /** Per select/radio/multiselect: punteggi per opzione (indice → score) */
        optionScores?: number[];
        /** Per number: range → punteggio [{min, max, score, critical}] */
        ranges?: { min?: number; max?: number; score: number; critical?: boolean }[];
    };
}

// Template documento
export interface DocumentoTemplate {
    id: string;
    tenantId: string;
    nome: string;
    descrizione?: string;
    codice?: string;
    tipo: TipoDocumentoTemplate;
    fase: FaseDocumento;
    versione: number;
    contenutoHtml?: string;
    contenutoPdf?: string;
    campi?: CampoTemplate[];
    consensoCodici?: string[];
    branchTypes: string[];
    richiedeFirma: boolean;
    richiedeFirmaMedico: boolean;
    richiedeFirmaDipendente?: boolean;
    richiedeFirmaFormatore?: boolean;
    richiedeFirmaDatore?: boolean;
    validitaGiorni?: number;
    scadenzaFissa?: string;
    isActive: boolean;
    ordine: number;
    obbligatorio: boolean;
    /** Configurazione questionario/scoring (1:1 relation) */
    questionarioConfig?: {
        id: string;
        haScoring: boolean;
        scoringConfig?: { maxScore?: number; passingScore?: number };
        sogliaCritica?: number;
        // MDL-specific
        specializzazione?: string;
        codiciRischio?: CodiceRischio[];
        tipiVisitaMDL?: TipoVisitaMDL[];
        compilabileDa?: CompilatoreQuestionario;
        tempoStimato?: number;
        istruzioniPaziente?: string;
        istruzioniMedico?: string;
        richiedeRevisione?: boolean;
        periodicitaMesi?: number;
        promemoria?: boolean;
        isPagamento?: boolean;
        fatturabile?: boolean;
        prezzoDefault?: number | null;
    };
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    // Relations
    prestazioni?: {
        prestazioneId: string;
        obbligatorio: boolean;
        prestazione?: { id: string; nome: string; codice?: string };
    }[];
    medici?: {
        medicoId: string;
        medico?: { id: string; firstName: string; lastName: string; gender?: string };
    }[];
    _count?: { compilati: number };
}

// Input per creazione/aggiornamento template
export interface DocumentoTemplateInput {
    nome: string;
    descrizione?: string;
    codice?: string;
    tipo?: TipoDocumentoTemplate;
    fase?: FaseDocumento;
    contenutoHtml?: string;
    campi?: CampoTemplate[];
    consensoCodici?: string[];
    branchTypes?: string[];
    richiedeFirma?: boolean;
    richiedeFirmaMedico?: boolean;
    richiedeFirmaDipendente?: boolean;
    richiedeFirmaFormatore?: boolean;
    richiedeFirmaDatore?: boolean;
    validitaGiorni?: number;
    scadenzaFissa?: string;
    isActive?: boolean;
    ordine?: number;
    obbligatorio?: boolean;
    prestazioniIds?: string[];
    mediciIds?: string[];
    /** Configurazione questionario/scoring */
    questionarioConfig?: {
        haScoring?: boolean;
        scoringConfig?: {
            maxScore?: number;
            passingScore?: number;
        };
        sogliaCritica?: number;
        // MDL-specific
        specializzazione?: string;
        codiciRischio?: CodiceRischio[];
        tipiVisitaMDL?: TipoVisitaMDL[];
        compilabileDa?: CompilatoreQuestionario;
        tempoStimato?: number;
        istruzioniPaziente?: string;
        istruzioniMedico?: string;
        richiedeRevisione?: boolean;
        periodicitaMesi?: number;
        promemoria?: boolean;
        isPagamento?: boolean;
        fatturabile?: boolean;
        prezzoDefault?: number | null;
    };
}

// Documento compilato
export interface DocumentoCompilato {
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
    motivoAnnullamento?: string;
    compilatoDa?: string;
    createdAt: string;
    updatedAt: string;
    // Relations
    documentoTemplate?: DocumentoTemplate;
    paziente?: { id: string; firstName: string; lastName: string; taxCode?: string };
    visita?: { id: string; dataOra: string; stato: string };
    medicoFirmante?: { id: string; firstName: string; lastName: string; gender?: string };
}

// Stats modulistica
export interface ModulisticaStats {
    totali: number;
    perStato: Record<StatoDocumentoCompilato, number>;
    scadutiOggi: number;
    daFirmare: number;
}

// Documento da compilare (template + stato compilazione)
export interface DocumentoDaCompilare {
    template: DocumentoTemplate;
    compilato: { id: string; stato: StatoDocumentoCompilato; firmaPaziente?: string; firmaMedico?: string; pdfUrl?: string } | null;
    obbligatorio: boolean;
}

// Templates API
export const modulisticaTemplatesApi = {
    getAll: (options?: QueryOptions & { tipo?: TipoDocumentoTemplate; fase?: FaseDocumento; isActive?: boolean }) =>
        apiGet<{ success: boolean; data: DocumentoTemplate[]; total: number; page: number; limit: number }>(
            `${CLINICA_BASE}/modulistica/templates`,
            options
        ).then(res => ({ data: res.data || [], total: res.total || 0, page: res.page || 1, limit: res.limit || 50 })),

    getApplicabili: (options: { prestazioneId?: string; medicoId?: string; fase?: FaseDocumento; branchTypes?: string }) =>
        apiGet<ApiResponse<DocumentoTemplate[]>>(`${CLINICA_BASE}/modulistica/templates/applicabili`, options)
            .then(extractData),

    getById: (id: string) =>
        apiGet<ApiResponse<DocumentoTemplate>>(`${CLINICA_BASE}/modulistica/templates/${id}`)
            .then(extractData),

    create: (data: DocumentoTemplateInput) =>
        apiPost<ApiResponse<DocumentoTemplate>>(`${CLINICA_BASE}/modulistica/templates`, data)
            .then(extractData),

    update: (id: string, data: Partial<DocumentoTemplateInput>) =>
        apiPut<ApiResponse<DocumentoTemplate>>(`${CLINICA_BASE}/modulistica/templates/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/modulistica/templates/${id}`),

    toggleActive: (id: string, isActive: boolean) =>
        apiPost<ApiResponse<DocumentoTemplate>>(`${CLINICA_BASE}/modulistica/templates/${id}/toggle-active`, { isActive })
            .then(extractData),

    duplicate: (id: string) =>
        apiPost<ApiResponse<DocumentoTemplate>>(`${CLINICA_BASE}/modulistica/templates/${id}/duplicate`, {})
            .then(extractData),

    initDaNormativa: () =>
        apiPost<ApiResponse<{ created: number; skipped: number; total: number; templates: DocumentoTemplate[] }>>(
            `${CLINICA_BASE}/modulistica/templates/init-da-normativa`, {}
        ).then(extractData)
};

// Documenti compilati API
export const modulisticaDocumentiApi = {
    getAll: (options?: QueryOptions & {
        pazienteId?: string;
        visitaId?: string;
        appuntamentoId?: string;
        stato?: StatoDocumentoCompilato;
        templateId?: string;
        scaduti?: boolean;
    }) =>
        apiGet<{ success: boolean; data: DocumentoCompilato[]; total: number; page: number; limit: number }>(
            `${CLINICA_BASE}/modulistica/documenti`,
            options
        ).then(res => ({ data: res.data || [], total: res.total || 0, page: res.page || 1, limit: res.limit || 50 })),

    getDaCompilare: (options: { pazienteId: string; prestazioneId?: string; medicoId?: string; fase: FaseDocumento }) =>
        apiGet<ApiResponse<DocumentoDaCompilare[]>>(`${CLINICA_BASE}/modulistica/documenti/da-compilare`, options)
            .then(extractData),

    getStats: () =>
        apiGet<ApiResponse<ModulisticaStats>>(`${CLINICA_BASE}/modulistica/documenti/stats`)
            .then(extractData),

    getById: (id: string) =>
        apiGet<ApiResponse<DocumentoCompilato>>(`${CLINICA_BASE}/modulistica/documenti/${id}`)
            .then(extractData),

    create: (data: {
        documentoTemplateId: string;
        pazienteId: string;
        visitaId?: string;
        appuntamentoId?: string;
        datiCompilati?: Record<string, unknown>;
        note?: string;
    }) =>
        apiPost<ApiResponse<DocumentoCompilato>>(`${CLINICA_BASE}/modulistica/documenti`, data)
            .then(extractData),

    update: (id: string, datiCompilati: Record<string, unknown>) =>
        apiPut<ApiResponse<DocumentoCompilato>>(`${CLINICA_BASE}/modulistica/documenti/${id}`, { datiCompilati })
            .then(extractData),

    firmaPaziente: (id: string, firma: string) =>
        apiPost<ApiResponse<DocumentoCompilato>>(`${CLINICA_BASE}/modulistica/documenti/${id}/firma-paziente`, { firma })
            .then(extractData),

    firmaMedico: (id: string, firma: string) =>
        apiPost<ApiResponse<DocumentoCompilato>>(`${CLINICA_BASE}/modulistica/documenti/${id}/firma-medico`, { firma })
            .then(extractData),

    savePdf: (id: string, pdfUrl: string) =>
        apiPost<ApiResponse<DocumentoCompilato>>(`${CLINICA_BASE}/modulistica/documenti/${id}/pdf`, { pdfUrl })
            .then(extractData),

    annulla: (id: string, motivo: string) =>
        apiPost<ApiResponse<DocumentoCompilato>>(`${CLINICA_BASE}/modulistica/documenti/${id}/annulla`, { motivo })
            .then(extractData),

    delete: (id: string, deletionReason: string) =>
        apiDeleteWithPayload<{ success: boolean }>(`${CLINICA_BASE}/modulistica/documenti/${id}`, { deletionReason }),

    processScaduti: () =>
        apiPost<{ success: boolean; processed: number }>(`${CLINICA_BASE}/modulistica/process-scaduti`, {})
};

// =====================================================
// DOCUMENTI CLINICI API (Allegati Visita)
// Session #17: Upload allegati visita
// =====================================================

export type TipoAllegatoClinico = 'document' | 'image' | 'dicom' | 'lab_result' | 'trace' | 'other';

export type TipologiaClinicaAllegato =
    | 'ECG'
    | 'AUDIOMETRIA'
    | 'SPIROMETRIA'
    | 'ESAMI_SANGUE'
    | 'TEST_DROGA'
    | 'ALCOL_TEST'
    | 'RADIOGRAFIA'
    | 'ECOGRAFIA'
    | 'VISITA'
    | 'CERTIFICATO'
    | 'ALTRO';

export const TIPOLOGIE_CLINICHE_LABELS: Record<TipologiaClinicaAllegato, string> = {
    ECG: 'ECG',
    AUDIOMETRIA: 'Audiometria',
    SPIROMETRIA: 'Spirometria',
    ESAMI_SANGUE: 'Esami del Sangue',
    TEST_DROGA: 'Test Droga',
    ALCOL_TEST: 'AlcolTest',
    RADIOGRAFIA: 'Radiografia',
    ECOGRAFIA: 'Ecografia',
    VISITA: 'Visita',
    CERTIFICATO: 'Certificato',
    ALTRO: 'Altro',
};

export interface AllegatoClinico {
    id: string;
    visitaId: string;
    /** Nome display (fornito dall'utente al momento dell'upload) */
    nome: string;
    /** Nome file generato per lo storage (es. timestamp_uuid.ext) */
    fileName: string;
    /** URL/path del file sul server */
    fileUrl: string;
    mimeType: string;
    fileSize?: number | null;
    tipo: TipoAllegatoClinico;
    descrizione?: string;
    tipologiaClinica?: TipologiaClinicaAllegato | string;
    dataEsecuzione?: string;
    caricatoDa?: string | null;
    hashFile?: string | null;
    createdAt: string;
    updatedAt: string;
    /** P73: true se l'allegato appartiene a una visita collegata (principale o secondaria) */
    fromLinkedVisit?: boolean;
}

export interface StorageStats {
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
    byType: Record<string, { count: number; size: number }>;
}

export const documentiCliniciApi = {
    /**
     * Get storage statistics for clinical documents
     */
    getStorageStats: () =>
        apiGet<ApiResponse<StorageStats>>(`${CLINICA_BASE}/documenti/storage-stats`)
            .then(extractData),

    /**
     * List allegati for a specific visit
     */
    getAllegatiVisita: (visitaId: string) =>
        apiGet<ApiResponse<AllegatoClinico[]>>(`${CLINICA_BASE}/documenti/visita/${visitaId}`)
            .then(extractData),

    /**
     * Upload allegato to visit (multipart/form-data)
     */
    uploadAllegatoVisita: async (
        file: File,
        visitaId: string,
        tipo: TipoAllegatoClinico = 'document',
        descrizione?: string,
        tipologiaClinica?: string,
        dataEsecuzione?: string
    ): Promise<AllegatoClinico> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('visitaId', visitaId);
        formData.append('tipo', tipo);
        if (descrizione) formData.append('descrizione', descrizione);
        if (tipologiaClinica) formData.append('tipologiaClinica', tipologiaClinica);
        if (dataEsecuzione) formData.append('dataEsecuzione', dataEsecuzione);

        const result = await apiUpload<ApiResponse<AllegatoClinico>>(`${CLINICA_BASE}/documenti/visita/upload`, formData);
        return extractData(result);
    },

    /**
     * Download allegato
     */
    downloadAllegato: async (allegatoId: string): Promise<Blob> => {
        return apiDownload(`${CLINICA_BASE}/documenti/visita/download/${allegatoId}`);
    },

    /**
     * Delete allegato
     */
    deleteAllegato: (allegatoId: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/documenti/visita/${allegatoId}`),

    /**
     * Update allegato metadata
     */
    updateAllegato: (allegatoId: string, data: {
        nome?: string;
        descrizione?: string;
        tipologiaClinica?: string | null;
        dataEsecuzione?: string | null;
    }) =>
        apiPatch<ApiResponse<AllegatoClinico>>(`${CLINICA_BASE}/documenti/visita/${allegatoId}`, data)
            .then(extractData),

    /**
     * Get all allegati for a patient across all visits (optional tipologiaClinica filter)
     */
    getAllegatiPaziente: (personId: string, tipologiaClinica?: string | string[]) => {
        const tipologieStr = Array.isArray(tipologiaClinica)
            ? tipologiaClinica.join(',')
            : tipologiaClinica;
        return apiGet<ApiResponse<(AllegatoClinico & {
            visita: { id: string; dataOra: string; prestazione?: { nome: string }; medico?: { firstName: string; lastName: string } }
        })[]>>(`${CLINICA_BASE}/documenti/paziente/${personId}`,
            tipologieStr ? { tipologiaClinica: tipologieStr } : undefined
        ).then(extractData);
    },
};

// =====================================================
// R19 - PROFILO DI SALUTE PERSONA
// =====================================================

/**
 * Profilo sanitario e di sicurezza per una persona in un tenant.
 * Traccia invalidità, abitudini salute, DPI e mezzi aziendali.
 */
// ─── Sub-types ────────────────────────────────────────────────────────────────
export interface VaccinazioneRecord {
    tipo: string;          // es. "tetano", "covid", "epatiteB", "influenza"
    data?: string | null;  // ISO date
    scadenza?: string | null;
    eseguita: boolean;
    note?: string | null;
}

export interface EsposizioneRecord {
    agente: string;        // es. "amianto", "piombo", "rumore", "vibrazioni"
    periodoInizio?: string | null;
    periodoFine?: string | null;
    azienda?: string | null;
    note?: string | null;
}

export interface CorsoFormazioneDpiRecord {
    tipo: string;          // es. "uso_dpi", "sicurezza_lavoro", "primo_soccorso"
    data?: string | null;
    scadenza?: string | null;
    ente?: string | null;
    valido?: boolean;
}

export interface AbilitazioneMezzo {
    tipo: string;          // es. "carrello_elevatore", "PLE", "gruetta", "trattore"
    ottenuto?: string | null;  // data conseguimento
    scadenza?: string | null;
    ente?: string | null;      // ente formatore/certificatore
    nota?: string | null;
}

export interface DpiConsegna {
    tipo: string;          // es. "guanti", "elmetto", "scarpe_antinf"
    data?: string | null;
    misura?: string | null;
    firma?: boolean;       // firma di ricevuta
    note?: string | null;
}

export interface ProfiloDiSalute {
    id: string;
    personId: string;
    tenantId: string;
    // Stato civile & familiari
    statoCivile?: string | null;
    numeroFigli?: number | null;
    professione?: string | null;
    // Invalidità
    hasInvalidita: boolean;
    tipoInvalidita?: string | null;
    gradoInvaliditaCivile?: number | null;
    gradoInvaliditaInail?: number | null;
    gradoInvaliditaInps?: number | null;
    causaDiServizio: boolean;
    gradoCausaDiServizio?: number | null;
    legge104: boolean;
    legge104Grado?: number | null;
    // Patologie croniche
    hasDiabete: boolean;
    tipoDiabete?: string | null;
    terapiaInsulina: boolean;
    hasIpertensione: boolean;
    hasCardiopatie: boolean;
    hasAsma: boolean;
    hasEpilessia: boolean;
    altrePatologie?: string | null;
    farmaci?: string | null;
    allergieFarmaci?: string | null;
    // Abitudini
    fumatore?: string | null;
    tipoSigaretta?: string | null;
    sigaretteGiorno?: number | null;
    anniFumo?: number | null;
    etaInizioFumo?: number | null;
    alcol?: string | null;
    unitaAlcolSettimana?: number | null;
    droghe?: string | null;
    attivitaFisica?: string | null;
    oreAttivitaSettimana?: number | null;
    peso?: number | null;
    altezza?: number | null;
    bmi?: number | null;
    alimentazione?: string | null;
    porzioniFruttaVerdure?: number | null;
    // Sonno
    qualitaSonno?: string | null;
    oreSonnoNotte?: number | null;
    sonnolenzaDiurna: boolean;
    scalaEpworth?: number | null;
    apneaNotturna: boolean;
    disturbiSonno?: string | null;
    // Diuresi
    diuresiFrequenza?: string | null;
    diuresiNocturia: boolean;
    diuresiUrgenza: boolean;
    diuresiDolore: boolean;
    diuresiEmaturia: boolean;
    // Alvo
    alvoFrequenza?: string | null;
    alvoFormaBristol?: number | null;
    alvoDolore: boolean;
    alvoSanguinamento: boolean;
    // Salute riproduttiva
    sesso?: string | null;
    ciclaMestruale?: boolean | null;
    etaMenarca?: number | null;
    cicloDurata?: number | null;
    cicloDurataFlusso?: number | null;
    cicloRegolare?: boolean | null;
    ultimaMestruazione?: string | null;
    menopausa: boolean;
    etaMenopausa?: number | null;
    numeroGravidanze?: number | null;
    gravidanzeATermine?: number | null;
    gravidanzePretermine?: number | null;
    abortiSpontanei?: number | null;
    abortiVolontari?: number | null;
    inGravidanza: boolean;
    inAllattamento: boolean;
    settimanaGestazione?: number | null;
    // Vaccinazioni & esposizioni
    vaccinazioni?: VaccinazioneRecord[] | null;
    esposizioniLavorative?: EsposizioneRecord[] | null;
    // Donazioni
    donatoreOrgani: boolean;
    donatoreSangue: boolean;
    donatoreSangueFrequenza?: string | null;
    // DPI personali
    usaDpiPersonali: boolean;
    dpiPersonali: string[];
    datInizioUsoDpiPersonali?: string | null;
    // DPI aziendali
    dpiAzienda: string[];
    altriDpiAzienda?: string | null;
    dataInizioUsoDpiAzienda?: string | null;
    corsiFormazioneDpi?: CorsoFormazioneDpiRecord[] | null;
    // Mezzi aziendali
    usaMezziAziendali: boolean;
    mezziAziendali: string[];
    altriMezziAziendali?: string | null;
    patenteCategorie: string[];
    patenteScadenza?: string | null;
    patenteSospesa: boolean;
    cqc: boolean;                        // Certificato Qualificazione Conducente
    cqcScadenza?: string | null;
    abilitazioniMezzi?: AbilitazioneMezzo[] | null;
    // Formazione obbligatoria D.Lgs 81/08 art. 37
    formazioneGenerale: boolean;
    formazioneGeneraleData?: string | null;
    formazioneGeneraleScadenza?: string | null;
    formazioneSpecifica: boolean;
    formazioneSpecificaData?: string | null;
    formazioneSpecificaScadenza?: string | null;
    addestramentoCompletato: boolean;
    // Idoneità specifiche
    idoneoLavoroInQuota?: boolean | null;
    idoneoSpazioConfinato?: boolean | null;
    idoneoGuida?: boolean | null;
    idoneoVDT?: boolean | null;           // VDT > 20h/settimana
    // DPI consegne
    dpiConsegne?: DpiConsegna[] | null;
    // Note
    noteSalute?: string | null;
    createdAt: string;
    updatedAt: string;
}

export const FUMATORE_LABELS: Record<string, string> = {
    non_fumatore: 'Non fumatore',
    ex_fumatore: 'Ex fumatore',
    occasionale: 'Fumatore occasionale',
    fumatore: 'Fumatore',
};

export const ALCOL_LABELS: Record<string, string> = {
    non_bevitore: 'Non bevitore',
    occasionale: 'Occasionale',
    moderato: 'Moderato',
    eccessivo: 'Eccessivo',
};

export const ATTIVITA_FISICA_LABELS: Record<string, string> = {
    sedentario: 'Sedentario',
    leggera: 'Attività leggera',
    moderata: 'Attività moderata',
    intensa: 'Attività intensa',
};

export const DPI_PERSONALI_OPTIONS = [
    { value: 'occhiali', label: 'Occhiali da vista' },
    { value: 'lenti_contatto', label: 'Lenti a contatto' },
    { value: 'apparecchio_acustico', label: 'Apparecchio acustico' },
    { value: 'protesi_arto', label: 'Protesi arto' },
    { value: 'bustina_lombare', label: 'Busto lombare' },
    { value: 'girello_stampelle', label: 'Girello/stampelle' },
    { value: 'altro', label: 'Altro' },
] as const;

export const DPI_AZIENDA_OPTIONS = [
    { value: 'elmetto', label: 'Elmetto' },
    { value: 'guanti', label: 'Guanti' },
    { value: 'scarpe_antinf', label: 'Scarpe antinfortunistiche' },
    { value: 'mascherina_ffp2', label: 'Mascherina FFP2/FFP3' },
    { value: 'otoprotettori', label: 'Otoprotettori' },
    { value: 'occhiali_protezione', label: 'Occhiali protezione' },
    { value: 'visiera', label: 'Visiera' },
    { value: 'imbracatura', label: 'Imbracatura' },
    { value: 'indumenti_protezione', label: 'Indumenti protezione' },
    { value: 'guanti_antitaglio', label: 'Guanti antitaglio' },
    { value: 'gilet_riflettente', label: 'Gilet riflettente' },
    { value: 'altro', label: 'Altro' },
] as const;

export const MEZZI_AZIENDALI_OPTIONS = [
    { value: 'autovettura', label: 'Autovettura' },
    { value: 'furgone', label: 'Furgone' },
    { value: 'muletto', label: 'Muletto/Carrello elevatore' },
    { value: 'piattaforma_elevabile', label: 'Piattaforma elevabile' },
    { value: 'trattore', label: 'Trattore' },
    { value: 'mezzo_aereo', label: 'Mezzo aereo' },
    { value: 'moto', label: 'Moto/Scooter' },
    { value: 'camion', label: 'Camion' },
    { value: 'altro', label: 'Altro' },
] as const;

export const profiloDiSaluteApi = {
    getByPerson: (personId: string) =>
        apiGet<ApiResponse<ProfiloDiSalute | null>>(`${CLINICA_BASE}/profilo-salute/persona/${personId}`)
            .then(extractData),

    upsert: (personId: string, data: Partial<ProfiloDiSalute>) =>
        apiPut<ApiResponse<ProfiloDiSalute>>(`${CLINICA_BASE}/profilo-salute/persona/${personId}`, data)
            .then(extractData),

    delete: (personId: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/profilo-salute/persona/${personId}`),
};

// =====================================================
// MDL - MEDICINA DEL LAVORO API (Progetto 56)
// =====================================================

/**
 * Mansioni API - Gestione mansioni con rischi associati
 */
export const mansioniApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Mansione>>(`${CLINICA_BASE}/mansioni`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Mansione>>(`${CLINICA_BASE}/mansioni/${id}`)
            .then(extractData),

    create: (data: MansioneCreateInput) =>
        apiPost<ApiResponse<Mansione>>(`${CLINICA_BASE}/mansioni`, data)
            .then(extractData),

    update: (id: string, data: MansioneUpdateInput) =>
        apiPut<ApiResponse<Mansione>>(`${CLINICA_BASE}/mansioni/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/mansioni/${id}`),

    duplicate: (id: string) =>
        apiPost<ApiResponse<Mansione>>(`${CLINICA_BASE}/mansioni/${id}/duplicate`, {})
            .then(extractData),

    // Worker assignment
    assignWorker: (id: string, data: { personId: string; dataAssegnazione?: string; note?: string }) =>
        apiPost<ApiResponse<LavoratoreMansione>>(`${CLINICA_BASE}/mansioni/${id}/assign`, data)
            .then(extractData),

    removeWorkerAssignment: (assignmentId: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/mansioni/assignment/${assignmentId}`),

    getWorkerRisks: (personId: string) =>
        apiGet<ApiResponse<WorkerOccupationalProfile>>(`${CLINICA_BASE}/mansioni/worker/${personId}/risks`)
            .then(extractData),

    getWorkerOccupationalProfile: (personId: string) =>
        apiGet<ApiResponse<WorkerOccupationalProfile>>(`${CLINICA_BASE}/mansioni/worker/${personId}/occupational-profile`)
            .then(extractData),

    updateWorkerOccupationalProfile: (personId: string, data: {
        protocolloSanitarioId?: string | null;
        title?: string | null;
        hiredDate?: string | null;
        endDate?: string | null;
        tipoContratto?: string | null;
        tipoCollaboratore?: string | null;
        oreSettimanali?: number | null;
        companyTenantProfileId?: string | null;
        siteId?: string | null;
        repartoId?: string | null;
    }) =>
        apiPut<ApiResponse<WorkerOccupationalProfile>>(`${CLINICA_BASE}/mansioni/worker/${personId}/occupational-profile`, data)
            .then(extractData),

    // Per-worker additional risks (non condivisi con altri sulla stessa mansione)
    addWorkerRischio: (personId: string, data: { codiceRischio: CodiceRischio; livello?: LivelloRischio; categoria: CategoriaRischio; note?: string }) =>
        apiPost<ApiResponse<MansioneRischio>>(`${CLINICA_BASE}/mansioni/worker/${personId}/rischio-aggiuntivo`, data)
            .then(extractData),

    updateWorkerRischio: (id: string, data: { livello?: LivelloRischio; note?: string }) =>
        apiPut<ApiResponse<MansioneRischio>>(`${CLINICA_BASE}/mansioni/worker-rischio-aggiuntivo/${id}`, data)
            .then(extractData),

    removeWorkerRischio: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/mansioni/worker-rischio-aggiuntivo/${id}`),

    initializeWorkerRisks: (personId: string) =>
        apiPost<ApiResponse<{ initialized: boolean }>>(`${CLINICA_BASE}/mansioni/worker/${personId}/initialize-risks`, {})
            .then(extractData),

    // By site
    getBySite: (siteId: string, options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Mansione>>(`${CLINICA_BASE}/mansioni`, { ...options, siteId })
            .then(extractPaginatedData)
};

/**
 * Giudizi Idoneità API - Gestione giudizi medico competente (Art. 41 D.Lgs 81/08)
 */
export const giudiziIdoneitaApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<GiudizioIdoneita>>(`${CLINICA_BASE}/giudizi-idoneita`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<GiudizioIdoneita>>(`${CLINICA_BASE}/giudizi-idoneita/${id}`)
            .then(extractData),

    getByWorker: (personId: string) =>
        apiGet<ApiResponse<GiudizioIdoneita>>(`${CLINICA_BASE}/giudizi-idoneita/worker/${personId}`)
            .then(extractData),

    getExpiring: (days?: number) =>
        apiGet<ApiResponse<GiudizioIdoneita[]>>(`${CLINICA_BASE}/giudizi-idoneita/expiring`, { days })
            .then(extractData),

    getStatsByMedico: (medicoId: string) =>
        apiGet<ApiResponse<{
            totale: number;
            perTipo: Record<TipoGiudizioIdoneita, number>;
            perStato: Record<StatoGiudizio, number>;
        }>>(`${CLINICA_BASE}/giudizi-idoneita/stats/${medicoId}`)
            .then(extractData),

    create: (data: Partial<GiudizioIdoneita>) =>
        apiPost<ApiResponse<GiudizioIdoneita>>(`${CLINICA_BASE}/giudizi-idoneita`, data)
            .then(extractData),

    update: (id: string, data: Partial<GiudizioIdoneita>) =>
        apiPut<ApiResponse<GiudizioIdoneita>>(`${CLINICA_BASE}/giudizi-idoneita/${id}`, data)
            .then(extractData),

    delete: (id: string, deletionReason: string) =>
        apiDeleteWithPayload<{ success: boolean }>(`${CLINICA_BASE}/giudizi-idoneita/${id}`, { deletionReason }),

    // Notifications
    notifyWorker: (id: string) =>
        apiPost<ApiResponse<GiudizioIdoneita>>(`${CLINICA_BASE}/giudizi-idoneita/${id}/notify-worker`, {})
            .then(extractData),

    notifyEmployer: (id: string) =>
        apiPost<ApiResponse<GiudizioIdoneita>>(`${CLINICA_BASE}/giudizi-idoneita/${id}/notify-employer`, {})
            .then(extractData),

    // Appeals (Art. 41 c.9)
    registerAppeal: (id: string, data: { dataRicorso: string; motivazione?: string }) =>
        apiPost<ApiResponse<GiudizioIdoneita>>(`${CLINICA_BASE}/giudizi-idoneita/${id}/appeal`, data)
            .then(extractData),

    resolveAppeal: (id: string, data: { esitoRicorso: string; note?: string }) =>
        apiPost<ApiResponse<GiudizioIdoneita>>(`${CLINICA_BASE}/giudizi-idoneita/${id}/appeal-resolution`, data)
            .then(extractData),

    // Firma lavoratore per ricevuta — position opzionale { page, x, y, w } normalizzati 0-1
    saveFirmaLavoratore: (id: string, firmaImageBase64: string, position?: { page: number; x: number; y: number; w: number }) =>
        apiPost<{ success: boolean; firmaId: string }>(`${CLINICA_BASE}/giudizi-idoneita/${id}/firma-lavoratore`, { firmaImageBase64, position }),

    getFirmaLavoratore: (id: string) =>
        apiGet<{ firma: { firmaImageUrl: string; createdAt: string; note?: string } | null; hasFirma: boolean }>(`${CLINICA_BASE}/giudizi-idoneita/${id}/firma-lavoratore`),

    pdfUrl: (id: string, destinatario: 'lavoratore' | 'datore' = 'lavoratore') =>
        `${CLINICA_BASE}/giudizi-idoneita/${id}/pdf/${destinatario}`,

    // Scarica il PDF come Blob tramite client autenticato (include header tenant corretti)
    fetchPdfBlob: (id: string, destinatario: 'lavoratore' | 'datore' = 'lavoratore') =>
        apiDownload(`${CLINICA_BASE}/giudizi-idoneita/${id}/pdf/${destinatario}`),

    // PDF Documents (Art. 41 c.7 — copia lavoratore e datore di lavoro)
    generateDocuments: (id: string) =>
        apiPost<ApiResponse<{ pdfLavoratoreUrl: string; pdfDatoreUrl: string }>>(
            `${CLINICA_BASE}/giudizi-idoneita/${id}/generate-documents`, {}
        ).then(extractData),

    completeWorkflow: (id: string) =>
        apiPost<ApiResponse<{ pdfLavoratoreUrl: string; pdfDatoreUrl: string; emailInviata: boolean }>>(
            `${CLINICA_BASE}/giudizi-idoneita/${id}/complete-workflow`, {}
        ).then(extractData),

    getPdfUrl: (id: string, destinatario: 'lavoratore' | 'datore') =>
        `${CLINICA_BASE}/giudizi-idoneita/${id}/pdf/${destinatario}`,

    batchPreview: () =>
        apiGet<ApiResponse<{
            totaleGiudizi: number;
            companies: Array<{
                companyTenantProfileId: string | null;
                ragioneSociale: string;
                totale: number;
                giaInviati: number;
                giudizi: Array<{
                    id: string;
                    personId: string;
                    lavoratore: string;
                    tipoGiudizio: string;
                    hasPdf: boolean;
                    alreadySent: boolean;
                }>;
            }>;
        }>>(`${CLINICA_BASE}/giudizi-idoneita/batch-preview`)
            .then(extractData),

    batchGenerateAndSend: (params?: {
        companyTenantProfileId?: string;
        companyTenantProfileIds?: string[];
        personIds?: string[];
        force?: boolean;
    }) =>
        apiPost<ApiResponse<{
            giudiziTrovati: number;
            pdfGenerati: number;
            pdfErrori: number;
            email: { processed: number; sent: number; skipped: number; errors: number };
            zipAziende: { total: number; companies: number; sent: number; errors: number };
        }>>(`${CLINICA_BASE}/giudizi-idoneita/batch-generate-send`, params || {})
            .then(extractData),

    // Invio sicuro forzato di giudizi selezionati con scelta destinatario
    batchSecureSend: (params: { giudizioIds: string[]; recipientType: 'worker' | 'employer' | 'both' }) =>
        apiPost<ApiResponse<{
            richiesti: number;
            processati: number;
            inviati: number;
            saltati: number;
            errori: number;
        }>>(`${CLINICA_BASE}/giudizi-idoneita/batch-secure-send`, params)
            .then(extractData)
};

/**
 * Rischio-Prestazioni API - Mapping rischi → prestazioni obbligatorie
 */
export const rischioPrestazioniApi = {
    // Catalogo statico rischi D.Lgs 81/08
    getCatalogo: () =>
        apiGet<CatalogoRischiResponse>(`${CLINICA_BASE}/rischio-prestazioni/catalogo`),

    // Default mapping da normativa
    getDefaultMapping: () =>
        apiGet<ApiResponse<Record<CodiceRischio, { prestazioni: string[]; periodicita: TipoPeriodicita }>>>(`${CLINICA_BASE}/rischio-prestazioni/default-mapping`)
            .then(extractData),

    // Mapping configurato per tenant
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<RischioPrestazione>>(`${CLINICA_BASE}/rischio-prestazioni`, options)
            .then(extractPaginatedData),

    getByRischio: (codiceRischio: CodiceRischio) =>
        apiGet<ApiResponse<RischioPrestazione[]>>(`${CLINICA_BASE}/rischio-prestazioni/by-risk/${codiceRischio}`)
            .then(extractData),

    // Calcolo prestazioni per lavoratore
    getWorkerPrestazioni: (personId: string) =>
        apiGet<ApiResponse<{
            rischi: MansioneRischio[];
            prestazioniRichieste: Array<{
                prestazione: Prestazione;
                periodicita: TipoPeriodicita;
                obbligatoria: boolean;
                daCodiceRischio: CodiceRischio;
            }>;
        }>>(`${CLINICA_BASE}/rischio-prestazioni/worker/${personId}`)
            .then(extractData),

    getStats: () =>
        apiGet<ApiResponse<{
            totaleMapping: number;
            perRischio: Record<CodiceRischio, number>;
            perPeriodicita: Record<TipoPeriodicita, number>;
        }>>(`${CLINICA_BASE}/rischio-prestazioni/stats`)
            .then(extractData),

    create: (data: Partial<RischioPrestazione>) =>
        apiPost<ApiResponse<RischioPrestazione>>(`${CLINICA_BASE}/rischio-prestazioni`, data)
            .then(extractData),

    update: (id: string, data: Partial<RischioPrestazione>) =>
        apiPut<ApiResponse<RischioPrestazione>>(`${CLINICA_BASE}/rischio-prestazioni/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/rischio-prestazioni/${id}`),

    seedDefaults: () =>
        apiPost<ApiResponse<{
            success: boolean;
            prestazioni: { created: number; skipped: number };
            mappings: { created: number; skipped: number };
            summary: string;
        }>>(`${CLINICA_BASE}/rischio-prestazioni/seed-defaults`, {})
            .then(extractData)
};

/**
 * Protocolli Sanitari API - Gestione protocolli per mansione/sede (Progetto 56 - FASE 2)
 */
export const protocolliSanitariApi = {
    getAll: (options?: QueryOptions & { mansioneId?: string; siteId?: string; isAttivo?: boolean }) =>
        apiGet<BackendPaginatedResponse<ProtocolloSanitario>>(`${CLINICA_BASE}/protocolli-sanitari`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<ProtocolloSanitario>>(`${CLINICA_BASE}/protocolli-sanitari/${id}`)
            .then(extractData),

    getByMansione: (mansioneId: string) =>
        apiGet<ApiResponse<ProtocolloSanitario[]>>(`${CLINICA_BASE}/protocolli-sanitari/by-mansione/${mansioneId}`)
            .then(extractData),

    getBySite: (siteId: string) =>
        apiGet<ApiResponse<ProtocolloSanitario[]>>(`${CLINICA_BASE}/protocolli-sanitari/by-site/${siteId}`)
            .then(extractData),

    getCost: (id: string) =>
        apiGet<ApiResponse<ProtocolloCosto>>(`${CLINICA_BASE}/protocolli-sanitari/${id}/cost`)
            .then(extractData),

    suggest: (mansioneId: string) =>
        apiGet<ApiResponse<{ prestazioniSuggerite: Array<{ prestazioneId: string; prestazione: { id: string; codice: string; nome: string }; isObbligatoria: boolean; periodicita: string; rischiCorrelati: string[] }>; suggestedCodice: string; suggestedDenominazione: string; periodicitaVisiteMesiSuggerita: number }>>(`${CLINICA_BASE}/protocolli-sanitari/suggest/${mansioneId}`)
            .then(extractData),

    create: (data: ProtocolloCreateInput) =>
        apiPost<ApiResponse<ProtocolloSanitario>>(`${CLINICA_BASE}/protocolli-sanitari`, data)
            .then(extractData),

    update: (id: string, data: ProtocolloUpdateInput) =>
        apiPut<ApiResponse<ProtocolloSanitario>>(`${CLINICA_BASE}/protocolli-sanitari/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/protocolli-sanitari/${id}`),

    duplicate: (id: string) =>
        apiPost<ApiResponse<ProtocolloSanitario>>(`${CLINICA_BASE}/protocolli-sanitari/${id}/duplicate`, {})
            .then(extractData),

    setActive: (id: string, isAttivo: boolean) =>
        apiPut<ApiResponse<ProtocolloSanitario>>(`${CLINICA_BASE}/protocolli-sanitari/${id}/activate`, { isAttivo })
            .then(extractData)
};

/**
 * Nomine Ruolo API - Gestione figure sicurezza MC/RSPP/RLS (Progetto 56 - FASE 3)
 */
export const nomineRuoloApi = {
    getAll: (options?: QueryOptions & {
        siteId?: string;
        companyTenantProfileId?: string;
        tipoRuolo?: TipoNominaRuolo;
        stato?: StatoNomina;
        personId?: string;
        expiringDays?: number
    }) =>
        apiGet<BackendPaginatedResponse<NominaRuolo>>(`${CLINICA_BASE}/nomine-ruolo`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<NominaRuolo>>(`${CLINICA_BASE}/nomine-ruolo/${id}`)
            .then(extractData),

    getBySite: (siteId: string) =>
        apiGet<ApiResponse<NominaRuolo[]>>(`${CLINICA_BASE}/nomine-ruolo/by-site/${siteId}`)
            .then(extractData),

    getByCompany: (companyTenantProfileId: string) =>
        apiGet<ApiResponse<NominaRuolo[]>>(`${CLINICA_BASE}/nomine-ruolo/by-company/${companyTenantProfileId}`)
            .then(extractData),

    getByPerson: (personId: string) =>
        apiGet<ApiResponse<NominaRuolo[]>>(`${CLINICA_BASE}/nomine-ruolo/by-person/${personId}`)
            .then(extractData),

    getExpiring: (days?: number) =>
        apiGet<ApiResponse<NominaRuolo[]>>(`${CLINICA_BASE}/nomine-ruolo/expiring/${days || 30}`)
            .then(extractData),

    getStats: () =>
        apiGet<ApiResponse<NominaStats>>(`${CLINICA_BASE}/nomine-ruolo/stats`)
            .then(extractData),

    create: (data: NominaRuoloCreateInput) =>
        apiPost<ApiResponse<NominaRuolo>>(`${CLINICA_BASE}/nomine-ruolo`, data)
            .then(extractData),

    update: (id: string, data: NominaRuoloUpdateInput) =>
        apiPut<ApiResponse<NominaRuolo>>(`${CLINICA_BASE}/nomine-ruolo/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/nomine-ruolo/${id}`),

    cease: (id: string, dataFine?: string) =>
        apiPut<ApiResponse<NominaRuolo>>(`${CLINICA_BASE}/nomine-ruolo/${id}/cease`, { dataFine })
            .then(extractData),

    suspend: (id: string, motivo: string) =>
        apiPut<ApiResponse<NominaRuolo>>(`${CLINICA_BASE}/nomine-ruolo/${id}/suspend`, { motivo })
            .then(extractData),

    reactivate: (id: string) =>
        apiPut<ApiResponse<NominaRuolo>>(`${CLINICA_BASE}/nomine-ruolo/${id}/reactivate`, {})
            .then(extractData),

    renew: (id: string, newPersonId?: string) =>
        apiPut<ApiResponse<NominaRuolo>>(`${CLINICA_BASE}/nomine-ruolo/${id}/renew`, { newPersonId })
            .then(extractData),

    updateFormazione: (id: string, data: {
        dataUltimaFormazione?: string;
        dataProssimaFormazione?: string;
        formazioneRichiesta?: string;
        note?: string;
    }) =>
        apiPut<ApiResponse<NominaRuolo>>(`${CLINICA_BASE}/nomine-ruolo/${id}/formazione`, data)
            .then(extractData)
};

// =====================================================
// MDL - ALLEGATO 3A API (Progetto 56 - FASE 5)
// =====================================================

export const allegato3AApi = {
    // Elenco aziende visibili con nomina medico competente/coordinato
    getCompanies: () =>
        apiGet<ApiResponse<Allegato3ACompany[]>>(`${CLINICA_BASE}/allegato-3a/companies`)
            .then(extractData),

    // Genera dati cartella sanitaria per un lavoratore
    generate: (personId: string, companyTenantProfileId: string) =>
        apiGet<ApiResponse<Allegato3AData>>(`${CLINICA_BASE}/allegato-3a/${personId}/${companyTenantProfileId}`)
            .then(extractData),

    // Genera bulk per tutti i lavoratori di un'azienda
    generateBulk: (companyTenantProfileId: string) =>
        apiGet<ApiResponse<{ workers: Allegato3AData[]; stats: Allegato3AStats }>>(`${CLINICA_BASE}/allegato-3a/bulk/${companyTenantProfileId}`)
            .then(extractData),

    // Ottiene statistiche per azienda
    getStats: (companyTenantProfileId: string) =>
        apiGet<ApiResponse<Allegato3AStats>>(`${CLINICA_BASE}/allegato-3a/stats/${companyTenantProfileId}`)
            .then(extractData),

    // Ottiene storico visite lavoratore
    getWorkerHistory: (personId: string) =>
        apiGet<ApiResponse<Allegato3AAccertamento[]>>(`${CLINICA_BASE}/allegato-3a/worker/${personId}/history`)
            .then(extractData),

    // Ottiene giudizio attuale lavoratore
    getWorkerGiudizio: (personId: string) =>
        apiGet<ApiResponse<Allegato3AGiudizio | null>>(`${CLINICA_BASE}/allegato-3a/worker/${personId}/giudizio`)
            .then(extractData)
};

// =====================================================
// MDL - ALLEGATO 3B API (Progetto 56 - FASE 6)
// =====================================================

export const allegato3BApi = {
    // Lista allegati 3B
    getAll: (params?: { anno?: number; companyTenantProfileId?: string }) =>
        apiGet<ApiResponse<Allegato3B[]>>(`${CLINICA_BASE}/allegato-3b`, params as Record<string, string>)
            .then(extractData),

    // Ottiene dettaglio allegato 3B
    getById: (id: string) =>
        apiGet<ApiResponse<Allegato3B>>(`${CLINICA_BASE}/allegato-3b/${id}`)
            .then(extractData),

    // Crea nuovo allegato 3B
    create: (data: Allegato3BCreateInput) =>
        apiPost<ApiResponse<Allegato3B>>(`${CLINICA_BASE}/allegato-3b`, data)
            .then(extractData),

    // Aziende eleggibili: solo aziende con MC/MC coordinato attivo
    getEligibleCompanies: () =>
        apiGet<ApiResponse<Allegato3BEligibleCompany[]>>(`${CLINICA_BASE}/allegato-3b/eligible-companies`)
            .then(extractData),

    // Compila statistiche allegato 3B
    compile: (id: string) =>
        apiPost<ApiResponse<Allegato3B>>(`${CLINICA_BASE}/allegato-3b/${id}/compile`, {})
            .then(extractData),

    // Genera e scarica XML INAIL — usa download diretto (il server invia raw XML)
    getXml: (id: string) =>
        apiDownloadWithFilename(`${CLINICA_BASE}/allegato-3b/${id}/xml`),

    // Scarica ZIP con tutti gli XML di un anno
    getZip: (anno: number) =>
        apiDownloadWithFilename(`${CLINICA_BASE}/allegato-3b/zip/${anno}`),

    // Preview statistiche (senza salvare)
    preview: (data: { anno: number; companyTenantProfileId: string }) =>
        apiPost<ApiResponse<Allegato3BPreviewResponse>>(`${CLINICA_BASE}/allegato-3b/preview`, data)
            .then(extractData),

    // Aggiorna stato invio
    updateStato: (id: string, data: Allegato3BUpdateInput) =>
        apiPut<ApiResponse<Allegato3B>>(`${CLINICA_BASE}/allegato-3b/${id}/stato`, data)
            .then(extractData),

    // Elimina allegato 3B (soft delete)
    delete: (id: string) =>
        apiDelete<ApiResponse<void>>(`${CLINICA_BASE}/allegato-3b/${id}`),

    // Genera e compila Allegato 3B per tutte le aziende con MC attivo
    generateAll: (anno: number) =>
        apiPost<ApiResponse<{
            anno: number;
            totaleAziende: number;
            creati: number;
            compilati: number;
            errori: number;
            dettagli: Array<{ companyTenantProfileId: string; ragioneSociale: string; status: string; error?: string }>;
        }>>(`${CLINICA_BASE}/allegato-3b/generate-all`, { anno })
            .then(extractData)
};

// =====================================================
// MALATTIE PROFESSIONALI API
// =====================================================

export const malattieProfessionaliApi = {
    getAll: (params?: { personId?: string; companyTenantProfileId?: string; anno?: number; tipologia?: string; esito?: string; page?: number; limit?: number }) =>
        apiGet<{ success: boolean; data: MalattiaProfessionale[]; pagination: { total: number; page: number; limit: number; pages: number } }>(`${CLINICA_BASE}/malattie-professionali`, params as Record<string, string>)
            .then(res => res),

    getByPerson: (personId: string) =>
        apiGet<ApiResponse<MalattiaProfessionale[]>>(`${CLINICA_BASE}/malattie-professionali/by-person/${personId}`)
            .then(extractData),

    getByCompany: (companyTenantProfileId: string, anno?: number) =>
        apiGet<{ success: boolean; data: MalattiaProfessionale[]; aggregazione: MalattieProfessionaliAggregazione }>(`${CLINICA_BASE}/malattie-professionali/by-company/${companyTenantProfileId}`, anno ? { anno: String(anno) } as Record<string, string> : undefined)
            .then(res => res),

    getById: (id: string) =>
        apiGet<ApiResponse<MalattiaProfessionale>>(`${CLINICA_BASE}/malattie-professionali/${id}`)
            .then(extractData),

    create: (data: MalattiaProfessionaleCreateInput) =>
        apiPost<ApiResponse<MalattiaProfessionale>>(`${CLINICA_BASE}/malattie-professionali`, data)
            .then(extractData),

    update: (id: string, data: MalattiaProfessionaleUpdateInput) =>
        apiPut<ApiResponse<MalattiaProfessionale>>(`${CLINICA_BASE}/malattie-professionali/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/malattie-professionali/${id}`),
};

// =====================================================
// MDL - SCADENZE MDL API (Progetto 56 - FASE 7)
// =====================================================

export const scadenzeMDLApi = {
    // Ottiene tutte le scadenze MDL
    getAll: (params?: {
        companyTenantProfileId?: string;
        siteId?: string;
        categoria?: CategoriaScadenzaMDL;
        livelloUrgenza?: LivelloUrgenzaScadenza;
        giorni?: number;
        limit?: number;
        includePrenotate?: boolean;
    }) =>
        apiGet<ApiResponse<ScadenzeMDLResponse>>(`${CLINICA_BASE}/scadenze-mdl`, params as Record<string, string>)
            .then(extractData),

    // Ottiene solo statistiche aggregate
    getStatistiche: (giorni?: number) =>
        apiGet<ApiResponse<ScadenzeMDLStatistiche>>(`${CLINICA_BASE}/scadenze-mdl/statistiche`, { giorni: giorni?.toString() })
            .then(extractData),

    // Ottiene notifiche urgenti (per badge/alert)
    getNotifiche: (giorniAvviso?: number, giorniPre?: number) =>
        apiGet<ApiResponse<ScadenzeMDLNotifiche>>(`${CLINICA_BASE}/scadenze-mdl/notifiche`, {
            giorniAvviso: giorniAvviso?.toString(),
            giorniPre: giorniPre?.toString()
        })
            .then(extractData),

    // Ottiene riepilogo per azienda
    getByAzienda: (companyTenantProfileId: string) =>
        apiGet<ApiResponse<ScadenzeAziendaRiepilogo>>(`${CLINICA_BASE}/scadenze-mdl/azienda/${companyTenantProfileId}`)
            .then(extractData),

    // Ottiene scadenze per sede
    getBySede: (siteId: string, giorni?: number) =>
        apiGet<ApiResponse<ScadenzeMDLResponse>>(`${CLINICA_BASE}/scadenze-mdl/sede/${siteId}`, { giorni: giorni?.toString() })
            .then(extractData),

    // Ottiene scadenze formato calendario
    getCalendario: (params?: {
        dataInizio?: string;
        dataFine?: string;
        companyTenantProfileId?: string;
    }) =>
        apiGet<ApiResponse<{ eventi: ScadenzeCalendarioEvento[]; periodo: { dataInizio: string; dataFine: string } }>>(`${CLINICA_BASE}/scadenze-mdl/calendario`, params as Record<string, string>)
            .then(extractData),

    // Export scadenze
    exportData: (params?: {
        formato?: 'csv' | 'json';
        giorni?: number;
        companyTenantProfileId?: string;
    }) =>
        apiGet<ApiResponse<ScadenzaMDL[]>>(`${CLINICA_BASE}/scadenze-mdl/export`, params as Record<string, string>)
            .then(extractData),

    // Registra esecuzione scadenze per-prestazione dopo visita MDL e crea le successive
    programmaPrestazioni: (data: {
        personId: string;
        mansioneId: string;
        visitaId?: string;
        dataVisita?: string; // ISO date string
        excludePrestazioniIds?: string[]; // P72_15: prestazioni da non programmare
        dateOverrides?: Record<string, string>; // P72_18: date manuali per prestazione (prestazioneId → ISO date)
        prestazioniAggiuntive?: { id: string; periodicitaMesi: number }[]; // P72_20: aggiuntive per ScadenzaPrestazioneProtocollo
        questionariAggiuntivi?: { documentoTemplateId: string; periodicitaMesi: number }[]; // P72_23: questionari periodici
    }) =>
        apiPost<ApiResponse<{ updated: number; created: number; message: string }>>(`${CLINICA_BASE}/scadenze-mdl/programma-prestazioni`, data)
            .then(extractData),

    /** Restituisce tutte le ScadenzaPrestazioneProtocollo di un lavoratore, raggruppate per prestazione */
    getScadenzePersona: (personId: string) =>
        apiGet<ApiResponse<ScadenzaProtocolloGruppo[]>>(`${CLINICA_BASE}/scadenze-mdl/persona/${personId}`)
            .then(extractData),

    /**
     * Restituisce le ScadenzaPrestazioneProtocollo aperte di un lavoratore entro ±giorni dalla dataRiferimento.
     * Usato dal modal prenotazione MDL per auto-selezionare le prestazioni in scadenza.
     */
    getScadenzeInScadenza: (personId: string, dataRiferimento: string, options?: { giorni?: number; giorniPre?: number; giorniPost?: number; excludeAppuntamentoId?: string }) =>
        apiGet<ApiResponse<ScadenzaPrestazioneInScadenza[]>>(
            `${CLINICA_BASE}/scadenze-mdl/persona/${personId}/in-scadenza`,
            {
                dataRiferimento,
                ...(options?.giorni != null && { giorni: options.giorni.toString() }),
                ...(options?.giorniPre != null && { giorniPre: options.giorniPre.toString() }),
                ...(options?.giorniPost != null && { giorniPost: options.giorniPost.toString() }),
                ...(options?.excludeAppuntamentoId && { excludeAppuntamentoId: options.excludeAppuntamentoId }),
            }
        ).then(extractData),

    /** Aggiorna la data di scadenza di una singola ScadenzaPrestazioneProtocollo */
    patchDataScadenza: (id: string, dataScadenza: string) =>
        apiPatch<ApiResponse<{ id: string; dataScadenza: string }>>(`${CLINICA_BASE}/scadenze-mdl/${id}/data-scadenza`, { dataScadenza })
            .then(extractData),

    /** Riconcilia le date di un gruppo di scadenze pendenti alla stessa data */
    reconciliaDate: (ids: string[], targetDate: string) =>
        apiPost<ApiResponse<{ aggiornate: number }>>(`${CLINICA_BASE}/scadenze-mdl/reconcilia-date`, { ids, targetDate })
            .then(extractData),

    /** Genera le scadenze iniziali per tutte le mansioni attive di un lavoratore */
    generaIniziali: (personId: string) =>
        apiPost<ApiResponse<{ created: number; skipped: number }>>(`${CLINICA_BASE}/scadenze-mdl/genera-iniziali`, { personId })
            .then(extractData),
};

// =====================================================
// PEC - POSTA ELETTRONICA CERTIFICATA API (FASE 4)
// =====================================================

export const pecApi = {
    // Invia giudizio al lavoratore via PEC
    sendToWorker: (giudizioId: string, data: PecSendToWorkerInput = {}) =>
        apiPost<ApiResponse<PecSendResult>>(`${CLINICA_BASE}/pec/giudizio/${giudizioId}/lavoratore`, data)
            .then(extractData),

    // Invia giudizio al datore di lavoro via PEC
    sendToEmployer: (giudizioId: string, data: PecSendToEmployerInput = {}) =>
        apiPost<ApiResponse<PecSendResult>>(`${CLINICA_BASE}/pec/giudizio/${giudizioId}/datore`, data)
            .then(extractData),

    // Invia giudizio a entrambi (lavoratore e datore)
    sendToBoth: (giudizioId: string, data: PecSendToBothInput = {}) =>
        apiPost<ApiResponse<PecSendBothResult>>(`${CLINICA_BASE}/pec/giudizio/${giudizioId}/both`, data)
            .then(extractData),

    // Ottiene log PEC per un giudizio
    getLogsForGiudizio: (giudizioId: string) =>
        apiGet<ApiResponse<PecLog[]>>(`${CLINICA_BASE}/pec/giudizio/${giudizioId}/logs`)
            .then(extractData),

    // Verifica stato consegna PEC
    checkStatus: (messageId: string) =>
        apiGet<ApiResponse<PecDeliveryStatus>>(`${CLINICA_BASE}/pec/status/${messageId}`)
            .then(extractData),

    // Ottiene statistiche PEC
    getStats: (params?: { from?: string; to?: string }) =>
        apiGet<ApiResponse<PecStats>>(`${CLINICA_BASE}/pec/stats`, params as Record<string, string>)
            .then(extractData)
};

// =====================================================
// PEC CONFIG - CONFIGURAZIONE PEC TENANT API (FASE 4.2)
// =====================================================

export const pecConfigApi = {
    // Lista provider PEC supportati
    getProviders: () =>
        apiGet<ApiResponse<PecProviderInfo[]>>(`${CLINICA_BASE}/pec-config/providers`)
            .then(extractData),

    // Recupera configurazione PEC del tenant corrente
    getConfig: () =>
        apiGet<ApiResponse<PecConfig | null>>(`${CLINICA_BASE}/pec-config`)
            .then(res => res.data),

    // Verifica stato configurazione PEC
    getStatus: () =>
        apiGet<ApiResponse<PecConfigStatus>>(`${CLINICA_BASE}/pec-config/status`)
            .then(extractData),

    // Salva/aggiorna configurazione PEC
    saveConfig: (data: PecConfigInput) =>
        apiPost<ApiResponse<PecConfig>>(`${CLINICA_BASE}/pec-config`, data)
            .then(extractData),

    // Elimina configurazione PEC
    deleteConfig: () =>
        apiDelete<ApiResponse<{ deleted: boolean }>>(`${CLINICA_BASE}/pec-config`)
            .then(extractData),

    // Testa configurazione PEC
    testConfig: (testRecipient: string) =>
        apiPost<ApiResponse<PecTestResult>>(`${CLINICA_BASE}/pec-config/test`, { testRecipient })
            .then(extractData)
};

// =====================================================
// P66 - SCADENZE CENTRALIZZATE API (Deadlines & Farmaci)
// =====================================================

// Types for Scadenze
export type DeadlineCategory =
    | 'VISITA_MEDICA'
    | 'FORMAZIONE'
    | 'PROTOCOLLO_MDL'
    | 'SOPRALLUOGO'
    | 'VISITA'
    | 'PROTOCOLLO_SANITARIO'
    | 'TARIFFARIO'
    | 'FARMACO'
    | 'MANUTENZIONE'
    | 'CERTIFICAZIONE'
    | 'DOCUMENTO'
    | 'CONTRATTO'
    | 'ALTRO';

export type DeadlinePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL' | 'URGENT';

export type DeadlineStatus = 'ATTIVA' | 'IN_PREAVVISO' | 'SCADUTA' | 'COMPLETATA' | 'ANNULLATA';

export type FormaFarmaceutica =
    | 'COMPRESSE' | 'CAPSULE' | 'FIALE' | 'SOLUZIONE_ORALE' | 'SCIROPPO'
    | 'CREMA' | 'POMATA' | 'GEL' | 'COLLIRIO' | 'SPRAY' | 'SUPPOSTE'
    | 'AEROSOL' | 'CEROTTO' | 'ALTRO';

export interface DeadlineItem {
    id: string;
    tenantId: string;
    categoria: DeadlineCategory;
    priorita: DeadlinePriority;
    status: DeadlineStatus;

    // Riferimento polimorfico
    entityType?: string;
    entityId?: string;

    // Dati scadenza
    dataScadenza: string;
    dataPreavviso1?: string;
    dataPreavviso2?: string;
    giorniPreavviso1?: number;
    giorniPreavviso2?: number;

    // Informazioni
    titolo: string;
    descrizione?: string;

    // Responsabili
    responsabileId?: string;
    responsabile?: { id: string; nome: string; cognome: string; };
    personId?: string;
    person?: { id: string; nome: string; cognome: string; email?: string | null; phone?: string | null; telefono?: string | null; };
    companyId?: string;
    company?: { id: string; ragioneSociale: string; };
    companySiteId?: string;
    companySite?: { id: string; nome: string; };
    ambulatorioId?: string;
    ambulatorio?: { id: string; nome: string; };

    // Notifiche
    notificaInviata1: boolean;
    notificaInviata2: boolean;

    // Completamento
    completataIl?: string;
    completatoDaId?: string;
    noteCompletamento?: string;

    // Ricorrenza
    ricorrente: boolean;
    frequenzaMesi?: number;

    // Extra per farmaco
    ubicazione?: string;
    quantita?: number;
    unitaMisura?: string;
    lottoNumero?: string;
    farmacoId?: string;

    // Timestamps
    createdAt: string;
    updatedAt: string;
}

export interface DeadlineInput {
    categoria: DeadlineCategory;
    priorita: DeadlinePriority;
    entityType?: string;
    entityId?: string;
    dataScadenza: string;
    giorniPreavviso1?: number;
    giorniPreavviso2?: number;
    titolo: string;
    descrizione?: string;
    responsabileId?: string;
    personId?: string;
    companyId?: string;
    companySiteId?: string;
    ambulatorioId?: string;
    ricorrente?: boolean;
    frequenzaMesi?: number;
    ubicazione?: string;
    quantita?: number;
    unitaMisura?: string;
    lottoNumero?: string;
}

export interface DeadlineStats {
    totali: number;
    scadute: number;
    inScadenza7gg: number;
    inScadenza30gg: number;
    perCategoria: Array<{ categoria: DeadlineCategory; count: number; }>;
    perPriorita: Array<{ priorita: DeadlinePriority; count: number; }>;
}

export interface DeadlineFilters {
    categoria?: DeadlineCategory;
    status?: DeadlineStatus;
    priorita?: DeadlinePriority;
    dataInizio?: string;
    dataFine?: string;
    responsabileId?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const scadenzeApi = {
    // Lista scadenze con filtri
    getAll: (filters?: DeadlineFilters) =>
        apiGet<PaginatedResponse<DeadlineItem>>('/api/v1/scadenze', filters as Record<string, string>),

    // Statistiche dashboard
    getStats: (filters?: DeadlineFilters) =>
        apiGet<DeadlineStats>('/api/v1/scadenze/stats', filters as Record<string, string>),

    // Dettaglio scadenza
    getById: (id: string) =>
        apiGet<DeadlineItem>(`/api/v1/scadenze/${id}`),

    // Crea scadenza
    create: (data: DeadlineInput) =>
        apiPost<DeadlineItem>('/api/v1/scadenze', data),

    // Aggiorna scadenza
    update: (id: string, data: Partial<DeadlineInput>) =>
        apiPut<DeadlineItem>(`/api/v1/scadenze/${id}`, data),

    // Completa scadenza
    complete: (id: string, noteCompletamento?: string) =>
        apiPost<DeadlineItem>(`/api/v1/scadenze/${id}/complete`, { noteCompletamento }),

    resolveDerived: (data: { entityType: string; entityId: string; newDate?: string; note?: string }) =>
        apiPost<{ success: boolean; data: unknown }>('/api/v1/scadenze/resolve-derived', data),

    // Elimina scadenza
    delete: (id: string, deletionReason: string) =>
        apiDeleteWithPayload<{ success: boolean }>(`/api/v1/scadenze/${id}`, { deletionReason })
};

// Farmaco types
export interface Farmaco {
    id: string;
    tenantId: string;
    codice: string;
    nome: string;
    principioAttivo?: string;
    formaFarmaceutica?: FormaFarmaceutica;
    dosaggio?: string;
    ubicazione: string;
    ambulatorioId?: string;
    ambulatorio?: { id: string; nome: string; codice?: string; };
    quantitaDisponibile: number;
    unitaMisura: string;
    quantitaMinima?: number;
    dataScadenza: string;
    lottoNumero?: string;
    fornitore?: string;
    dataAcquisto?: string;
    prezzoAcquisto?: number;
    note?: string;
    immagineUrl?: string;

    // Computed flags
    isSottoScorta?: boolean;
    isInScadenza?: boolean;
    isScaduto?: boolean;

    // Related deadlines
    deadlines?: DeadlineItem[];

    createdAt: string;
    updatedAt: string;
}

export interface FarmacoInput {
    codice: string;
    nome: string;
    principioAttivo?: string;
    formaFarmaceutica?: FormaFarmaceutica;
    dosaggio?: string;
    ubicazione: string;
    ambulatorioId?: string;
    quantitaDisponibile: number;
    unitaMisura?: string;
    quantitaMinima?: number;
    dataScadenza: string;
    lottoNumero?: string;
    fornitore?: string;
    dataAcquisto?: string;
    prezzoAcquisto?: number;
    note?: string;
}

export interface FarmacoFilters {
    ambulatorioId?: string;
    ubicazione?: string;
    formaFarmaceutica?: FormaFarmaceutica;
    dataInizio?: string;
    dataFine?: string;
    dataScadenzaDa?: string;
    dataScadenzaA?: string;
    inScadenza?: boolean;
    sottoScorta?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface FarmacoStats {
    totali: number;
    scaduti: number;
    inScadenza30gg: number;
    sottoScorta: number;
    perUbicazione: Array<{ ubicazione: string; count: number; }>;
}

export const farmaciApi = {
    // Lista farmaci con filtri
    getAll: (filters?: FarmacoFilters) =>
        apiGet<PaginatedResponse<Farmaco>>('/api/v1/scadenze/farmaci', filters as Record<string, string>),

    // Statistiche farmaci
    getStats: () =>
        apiGet<FarmacoStats>('/api/v1/scadenze/farmaci/stats'),

    // Ubicazioni per autocomplete
    getUbicazioni: () =>
        apiGet<string[]>('/api/v1/scadenze/farmaci/ubicazioni'),

    // Dettaglio farmaco
    getById: (id: string) =>
        apiGet<Farmaco>(`/api/v1/scadenze/farmaci/${id}`),

    // Crea farmaco
    create: (data: FarmacoInput) =>
        apiPost<Farmaco>('/api/v1/scadenze/farmaci', data),

    // Aggiorna farmaco
    update: (id: string, data: Partial<FarmacoInput>) =>
        apiPut<Farmaco>(`/api/v1/scadenze/farmaci/${id}`, data),

    // Carico/scarico quantità
    updateQuantita: (id: string, delta: number, motivo: string) =>
        apiPost<Farmaco>(`/api/v1/scadenze/farmaci/${id}/quantita`, { delta, motivo }),

    // Elimina farmaco
    delete: (id: string, deletionReason: string) =>
        apiDeleteWithPayload<{ success: boolean }>(`/api/v1/scadenze/farmaci/${id}`, { deletionReason })
};

// =====================================================
// P74 - EMAIL TEMPLATES
// =====================================================

export interface EmailTemplate {
    id: string;
    tenantId: string;
    nome: string;
    branca?: string | null;
    medicoId?: string | null;
    prestazioneId?: string | null;
    subject: string;
    bodyHtml: string;
    allegatiIds: string[];
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy?: string | null;
    deletedAt?: string | null;
}

export interface EmailTemplateInput {
    nome: string;
    branca?: string;
    medicoId?: string;
    prestazioneId?: string;
    subject: string;
    bodyHtml: string;
    allegatiIds?: string[];
    isDefault?: boolean;
    isActive?: boolean;
}

export const emailTemplatesApi = {
    getAll: (params?: { branca?: string; medicoId?: string; prestazioneId?: string; isActive?: boolean }) =>
        apiGet<{ success: boolean; data: EmailTemplate[]; total: number; page: number }>(`${CLINICA_BASE}/email-templates`, params)
            .then(res => ({ data: res.data || [], total: res.total || 0 })),

    getById: (id: string) =>
        apiGet<{ success: boolean; data: EmailTemplate }>(`${CLINICA_BASE}/email-templates/${id}`)
            .then(res => res.data),

    resolve: (params: { prestazioneId?: string; medicoId?: string; branca?: string }) =>
        apiGet<{ success: boolean; data: EmailTemplate | null }>(`${CLINICA_BASE}/email-templates/resolve`, params)
            .then(res => res.data),

    create: (data: EmailTemplateInput) =>
        apiPost<{ success: boolean; data: EmailTemplate }>(`${CLINICA_BASE}/email-templates`, data)
            .then(res => res.data),

    update: (id: string, data: Partial<EmailTemplateInput>) =>
        apiPut<{ success: boolean; data: EmailTemplate }>(`${CLINICA_BASE}/email-templates/${id}`, data)
            .then(res => res.data),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/email-templates/${id}`)
};

// =====================================================
// UNIFIED EXPORT
// =====================================================

export const clinicaApi = {
    // Structure
    poliambulatori: poliambulatoriApi,
    sedi: sediApi,
    ambulatori: ambulatoriApi,
    strumenti: strumentiApi,

    // Catalog
    prestazioni: prestazioniApi,
    listini: listiniApi,
    convenzioni: convenzioniApi,
    sconti: scontiApi,

    // Tariffario Avanzato (Progetto 44)
    tariffario: tariffarioApi,
    bundle: bundleApi,
    tariffarioMedico: tariffarioMedicoApi,

    // Agenda
    slots: slotsApi,
    appuntamenti: appuntamentiApi,

    // Clinical
    visite: visiteApi,
    referti: refertiApi,

    // Patients
    pazienti: pazientiApi,

    // Dashboard
    dashboard: dashboardApi,

    // Modulistica (Progetto 53)
    modulisticaTemplates: modulisticaTemplatesApi,
    modulisticaDocumenti: modulisticaDocumentiApi,

    // Documenti Clinici (Allegati)
    documentiClinici: documentiCliniciApi,

    // MDL - Medicina del Lavoro (Progetto 56)
    mansioni: mansioniApi,
    giudiziIdoneita: giudiziIdoneitaApi,
    rischioPrestazioni: rischioPrestazioniApi,
    protocolliSanitari: protocolliSanitariApi,
    nomineRuolo: nomineRuoloApi,
    allegato3A: allegato3AApi,           // FASE 5: Cartella Sanitaria
    allegato3B: allegato3BApi,           // FASE 6: Relazione Annuale INAIL
    malattieProfessionali: malattieProfessionaliApi, // Malattie Professionali D.Lgs 81/08 Art. 40
    scadenzeMDL: scadenzeMDLApi,         // FASE 7: Dashboard Scadenze
    pec: pecApi,                         // FASE 4: PEC Integration
    pecConfig: pecConfigApi,             // FASE 4.2: Configurazione PEC Tenant

    // P66 - Sistema Scadenze Centralizzato
    scadenze: scadenzeApi,
    farmaci: farmaciApi,

    // R19 - Profilo Di Salute Persona
    profiloDiSalute: profiloDiSaluteApi,

    // P74 - Email Templates
    emailTemplates: emailTemplatesApi,
};

export default clinicaApi;
