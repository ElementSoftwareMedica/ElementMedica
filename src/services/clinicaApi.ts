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

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './api';

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
    _count?: {
        ambulatori?: number;
    };
}

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
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    createdBy?: string;
    // Relations (when populated)
    ambulatori?: AmbulatorioPrestazione[];
    listiniPrezzo?: ListinoPrezzo[];
    mediciAbilitati?: MedicoAbilitato[];
    templateCampi?: TemplateCampoVisita[];
    strumentiNecessari?: PrestazioneStrumento[];
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

export interface TemplateCampoVisita {
    id: string;
    tenantId: string;
    prestazioneId: string;
    nome: string;           // Field name (internal)
    etichetta: string;      // Display label
    tipo: TipoCampoVisita;
    obbligatorio: boolean;
    ordine: number;         // Display order
    opzioni?: string;       // JSON array for SELECT/MULTISELECT
    valoreDefault?: string;
    validazione?: string;   // JSON validation rules
    placeholder?: string;
    helpText?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

export interface ListinoPrezzo {
    id: string;
    tenantId: string;
    prestazioneId?: string;      // Opzionale: per listino prestazione singola
    bundleId?: string;           // Opzionale: per listino bundle (Tariffario Avanzato)
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
    poliambulatorio?: Poliambulatorio;
    convenzione?: Convenzione;
    medico?: Medico;
}

// Tariffario: Tipo compenso medico
export type TipoCompensoMedico = 'PERCENTUALE' | 'FISSO' | 'MINIMO_MASSIMO';

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

// Legacy type alias for backward compatibility - use ListinoPrezzo directly
export type Listino = ListinoPrezzo;

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
    | 'ANNULLATO'
    | 'NO_SHOW';

export interface SlotDisponibilita {
    id: string;
    tenantId: string;
    ambulatorioId: string;
    medicoId?: string;
    data: string;
    oraInizio: string;
    oraFine: string;
    disponibile: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DisponibilitaMedico {
    id: string;
    tenantId: string;
    medicoId: string;
    ambulatorioId?: string;
    giornoSettimana: number; // 0=Sunday, 1=Monday, etc.
    oraInizio: string;       // HH:MM
    oraFine: string;         // HH:MM
    validoDa: string;
    validoA?: string;
    note?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
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
    dataOra: string;
    durataPrevista: number;
    stato: StatoAppuntamento;
    note?: string;
    noteInterne?: string;
    promemoria: boolean;
    promemoriaInviato: boolean;
    dataConferma?: string;
    dataAnnullamento?: string;
    motivoAnnullamento?: string;
    numeroCoda?: number;
    oraArrivo?: string;
    oraInizio?: string;
    oraFine?: string;
    isRecurring: boolean;
    recurringPattern?: string;
    parentAppuntamentoId?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // Expanded relations
    paziente?: Paziente;
    medico?: Medico;
    ambulatorio?: Ambulatorio;
    prestazione?: Prestazione;
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
    dataInizio?: string;
    dataFine?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
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
    // Relations (when populated)
    visita?: Visita;
    medico?: Medico;
    paziente?: Paziente;
}

// Patient types
export interface Paziente {
    id: string;
    tenantId: string;
    nome: string;
    cognome: string;
    codiceFiscale?: string;
    dataNascita?: string;
    email?: string;
    telefono?: string;
    indirizzo?: string;
    createdAt: string;
    updatedAt: string;
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

    create: (poliambulatorioId: string, data: Partial<SedePoliambulatorio>) =>
        apiPost<ApiResponse<SedePoliambulatorio>>(`${CLINICA_BASE}/poliambulatori/${poliambulatorioId}/sedi`, data)
            .then(extractData),

    update: (id: string, data: Partial<SedePoliambulatorio>) =>
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

    getByPoliambulatorio: (poliambulatorioId: string) =>
        apiGet<ApiResponse<Ambulatorio[]>>(`${CLINICA_BASE}/poliambulatori/${poliambulatorioId}/ambulatori`)
            .then(extractData),

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
        apiPost<ApiResponse<Medico>>(`${CLINICA_BASE}/medici`, data)
            .then(extractData),

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
        specialties?: string[];
        registerCode?: string;
        registerCode2?: string;
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

    // Template fields
    getCampi: (id: string) =>
        apiGet<ApiResponse<TemplateCampoVisita[]>>(`${CLINICA_BASE}/prestazioni/${id}/campi`)
            .then(extractData),

    addCampo: (id: string, data: Partial<TemplateCampoVisita>) =>
        apiPost<ApiResponse<TemplateCampoVisita>>(`${CLINICA_BASE}/prestazioni/${id}/campi`, data)
            .then(extractData),

    updateCampo: (prestazioneId: string, campoId: string, data: Partial<TemplateCampoVisita>) =>
        apiPut<ApiResponse<TemplateCampoVisita>>(`${CLINICA_BASE}/prestazioni/${prestazioneId}/campi/${campoId}`, data)
            .then(extractData),

    deleteCampo: (prestazioneId: string, campoId: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/prestazioni/${prestazioneId}/campi/${campoId}`),

    reorderCampi: (id: string, orderedIds: string[]) =>
        apiPost<{ success: boolean }>(`${CLINICA_BASE}/prestazioni/${id}/campi/reorder`, { orderedIds }),

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

    // Listini per bundle (Tariffario Avanzato)
    getByBundle: (bundleId: string) =>
        apiGet<ApiResponse<ListinoPrezzo[]>>(`${CLINICA_BASE}/listini/bundle/${bundleId}`)
            .then(extractData),

    // Crea listino per bundle (specifico per medico)
    createForBundle: (data: Partial<ListinoPrezzo> & { bundleId: string }) =>
        apiPost<ApiResponse<ListinoPrezzo>>(`${CLINICA_BASE}/listini/bundle`, data)
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

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/appuntamenti/${id}`),

    changeStato: (id: string, stato: Appuntamento['stato']) =>
        apiPut<ApiResponse<Appuntamento>>(`${CLINICA_BASE}/appuntamenti/${id}/stato`, { stato })
            .then(extractData),

    getTransitions: (id: string) =>
        apiGet<ApiResponse<{ availableStates: string[] }>>(`${CLINICA_BASE}/appuntamenti/${id}/transitions`)
            .then(extractData),

    accetta: (id: string) =>
        apiPost<ApiResponse<Appuntamento>>(`${CLINICA_BASE}/appuntamenti/${id}/accetta`)
            .then(extractData),

    chiama: (id: string) =>
        apiPost<ApiResponse<Appuntamento>>(`${CLINICA_BASE}/appuntamenti/${id}/chiama`)
            .then(extractData),

    getByPaziente: (pazienteId: string) =>
        apiGet<ApiResponse<Appuntamento[]>>(`${CLINICA_BASE}/appuntamenti/paziente/${pazienteId}`)
            .then(extractData),

    getByMedico: (medicoId: string) =>
        apiGet<ApiResponse<Appuntamento[]>>(`${CLINICA_BASE}/appuntamenti/medico/${medicoId}`)
            .then(extractData),

    getToday: () =>
        apiGet<ApiResponse<Appuntamento[]>>(`${CLINICA_BASE}/appuntamenti/today`)
            .then(extractData)
};

// =====================================================
// API FUNCTIONS - CLINICAL
// =====================================================

/**
 * Visite API
 */
export const visiteApi = {
    getAll: (options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<Visita>>(`${CLINICA_BASE}/visite`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<Visita>>(`${CLINICA_BASE}/visite/${id}`)
            .then(extractData),

    create: (data: Partial<Visita>) =>
        apiPost<ApiResponse<Visita>>(`${CLINICA_BASE}/visite`, data)
            .then(extractData),

    update: (id: string, data: Partial<Visita>) =>
        apiPut<ApiResponse<Visita>>(`${CLINICA_BASE}/visite/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/visite/${id}`),

    inizia: (id: string) =>
        apiPost<ApiResponse<Visita>>(`${CLINICA_BASE}/visite/${id}/inizia`)
            .then(extractData),

    termina: (id: string) =>
        apiPost<ApiResponse<Visita>>(`${CLINICA_BASE}/visite/${id}/termina`)
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
            .then(extractData)
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

    update: (id: string, data: Partial<Paziente>) =>
        apiPut<ApiResponse<Paziente>>(`${CLINICA_BASE}/pazienti/${id}`, data)
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/pazienti/${id}`),

    search: (query: string) =>
        apiGet<ApiResponse<Paziente[]>>(`${CLINICA_BASE}/pazienti/search`, { q: query })
            .then(extractData),

    getStorico: (id: string) =>
        apiGet<ApiResponse<{ visite: Visita[]; referti: Referto[]; appuntamenti: Appuntamento[] }>>(`${CLINICA_BASE}/pazienti/${id}/storico`)
            .then(extractData)
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
// FATTURAZIONE API
// =====================================================

// Fattura types
export type StatoFattura = 'emessa' | 'pagata' | 'annullata' | 'parzialmente_pagata';
export type MetodoPagamento = 'cash' | 'card' | 'transfer' | 'pos' | 'check';

export interface FatturaSanitaria {
    id: string;
    tenantId: string;
    numero: string;
    dataEmissione: string;
    pazienteId: string;
    visitaId?: string;
    imponibile: number;
    aliquotaIva: number;
    importoIva: number;
    totale: number;
    metodoPagamento?: MetodoPagamento;
    dataPagamento?: string;
    stato: StatoFattura;
    note?: string;
    inviatoTS: boolean;
    dataInvioTS?: string;
    codiceDocumentoTS?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    // Relations
    paziente?: Paziente;
}

export interface FatturaStats {
    totale: {
        fatturato: number;
        imponibile: number;
        iva: number;
        count: number;
    };
    perStato: Array<{
        stato: StatoFattura;
        totale: number;
        count: number;
    }>;
    perMetodoPagamento: Array<{
        metodo: MetodoPagamento;
        totale: number;
        count: number;
    }>;
    trend: Array<{
        mese: string;
        totale: number;
        count: number;
    }>;
}

// Report Types
export interface ReportPrestazione {
    prestazioneId: string;
    prestazioneName: string;
    countFatture: number;
    totale: number;
    imponibile: number;
    iva: number;
    mediaFattura: number;
}

export interface ReportMedico {
    medicoId: string;
    medicoName: string;
    countFatture: number;
    totale: number;
    imponibile: number;
    iva: number;
    pagati: number;
    pendenti: number;
}

export interface DailyReport {
    data: string;
    countFatture: number;
    totale: number;
    incassato: number;
    pendente: number;
}

export interface ReportComparison {
    corrente: FatturaStats;
    precedente: FatturaStats;
    variazioni: {
        fatturato: string;
        count: string;
        mediaFattura: string;
    };
}

/**
 * Fatturazione API
 */
export const fattureApi = {
    getAll: (options?: QueryOptions & {
        stato?: StatoFattura;
        pazienteId?: string;
        dataInizio?: string;
        dataFine?: string;
    }) =>
        apiGet<BackendPaginatedResponse<FatturaSanitaria>>(`${CLINICA_BASE}/fatture`, options)
            .then(extractPaginatedData),

    getById: (id: string) =>
        apiGet<ApiResponse<FatturaSanitaria>>(`${CLINICA_BASE}/fatture/${id}`)
            .then(extractData),

    getByPaziente: (pazienteId: string, options?: QueryOptions) =>
        apiGet<BackendPaginatedResponse<FatturaSanitaria>>(`${CLINICA_BASE}/fatture/paziente/${pazienteId}`, options)
            .then(extractPaginatedData),

    getStats: (options?: { dataInizio?: string; dataFine?: string }) =>
        apiGet<ApiResponse<FatturaStats>>(`${CLINICA_BASE}/fatture/stats`, options)
            .then(extractData),

    getEnums: () =>
        apiGet<ApiResponse<{ stati: StatoFattura[]; metodiPagamento: MetodoPagamento[] }>>(`${CLINICA_BASE}/fatture/enums`)
            .then(extractData),

    create: (data: {
        pazienteId: string;
        dataEmissione: string;
        imponibile: number;
        aliquotaIva?: number;
        visitaId?: string;
        note?: string;
    }) =>
        apiPost<ApiResponse<FatturaSanitaria>>(`${CLINICA_BASE}/fatture`, data)
            .then(extractData),

    createFromVisita: (visitaId: string) =>
        apiPost<ApiResponse<FatturaSanitaria>>(`${CLINICA_BASE}/fatture/from-visita/${visitaId}`, {})
            .then(extractData),

    update: (id: string, data: Partial<FatturaSanitaria>) =>
        apiPut<ApiResponse<FatturaSanitaria>>(`${CLINICA_BASE}/fatture/${id}`, data)
            .then(extractData),

    registerPayment: (id: string, data: { metodoPagamento: MetodoPagamento; note?: string }) =>
        apiPost<ApiResponse<FatturaSanitaria>>(`${CLINICA_BASE}/fatture/${id}/pagamento`, data)
            .then(extractData),

    cancel: (id: string, motivo?: string) =>
        apiPost<ApiResponse<FatturaSanitaria>>(`${CLINICA_BASE}/fatture/${id}/annulla`, { motivo })
            .then(extractData),

    delete: (id: string) =>
        apiDelete<{ success: boolean }>(`${CLINICA_BASE}/fatture/${id}`),

    // Report endpoints
    getReportByPrestazione: (options?: { dataInizio?: string; dataFine?: string }) =>
        apiGet<ApiResponse<ReportPrestazione[]>>(`${CLINICA_BASE}/fatture/report/prestazioni`, options)
            .then(extractData),

    getReportByMedico: (options?: { dataInizio?: string; dataFine?: string }) =>
        apiGet<ApiResponse<ReportMedico[]>>(`${CLINICA_BASE}/fatture/report/medici`, options)
            .then(extractData),

    getDailyReport: (options?: { dataInizio?: string; dataFine?: string }) =>
        apiGet<ApiResponse<DailyReport[]>>(`${CLINICA_BASE}/fatture/report/daily`, options)
            .then(extractData),

    getComparison: (options: {
        dataInizioCorrente: string;
        dataFineCorrente: string;
        dataInizioPrecedente: string;
        dataFinePrecedente: string;
    }) => apiGet<ApiResponse<ReportComparison>>(`${CLINICA_BASE}/fatture/report/comparison`, options)
        .then(extractData),

    exportCSV: (options?: { dataInizio?: string; dataFine?: string; stato?: StatoFattura }) =>
        `${CLINICA_BASE}/fatture/export/csv?${new URLSearchParams(options as Record<string, string>).toString()}`
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

    // Fatturazione
    fatture: fattureApi,

    // Dashboard
    dashboard: dashboardApi
};

export default clinicaApi;
