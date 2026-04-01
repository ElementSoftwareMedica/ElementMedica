/**
 * P68 - HR Personnel Management API
 * API client per il modulo HR
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

export type TipoContratto =
    | 'DIPENDENTE_INDETERMINATO'
    | 'DIPENDENTE_DETERMINATO'
    | 'LIBERA_PROFESSIONE'
    | 'COCOCO'
    | 'PRESTAZIONE_OCCASIONALE'
    | 'TIROCINIO'
    | 'APPRENDISTATO'
    | 'COLLABORAZIONE';

export type TipoCollaboratore =
    | 'AMMINISTRATIVO'
    | 'MEDICO'
    | 'INFERMIERE'
    | 'TECNICO_SANITARIO'
    | 'FORMATORE'
    | 'SEGRETERIA'
    | 'DIRIGENTE'
    | 'CONSULENTE'
    | 'ALTRO';

export type AreaAziendale =
    | 'DIREZIONE'
    | 'AMMINISTRAZIONE'
    | 'CLINICA'
    | 'FORMAZIONE'
    | 'MEDICINA_LAVORO'
    | 'SEGRETERIA'
    | 'MARKETING'
    | 'ALTRO';

export type TipoTurno =
    | 'MATTINA'
    | 'POMERIGGIO'
    | 'GIORNATA'
    | 'NOTTURNO'
    | 'SPEZZATO'
    | 'REPERIBILITA'
    | 'STRAORDINARIO';

export type StatoTurno =
    | 'PIANIFICATO'
    | 'CONFERMATO'
    | 'IN_CORSO'
    | 'COMPLETATO'
    | 'ANNULLATO';

export type TipoTimbratura =
    | 'ENTRATA'
    | 'USCITA'
    | 'INIZIO_PAUSA'
    | 'FINE_PAUSA'
    | 'ENTRATA_STRAORDINARIO'
    | 'USCITA_STRAORDINARIO';

export type TipoAssenza =
    | 'FERIE'
    | 'PERMESSO_ROL'
    | 'PERMESSO_EX_FESTIVITA'
    | 'MALATTIA'
    | 'INFORTUNIO'
    | 'MATERNITA'
    | 'PATERNITA'
    | 'CONGEDO_PARENTALE'
    | 'LUTTO'
    | 'MATRIMONIO'
    | 'DONAZIONE_SANGUE'
    | 'VISITA_MEDICA'
    | 'PERMESSO_STUDIO'
    | 'ASPETTATIVA'
    | 'ALTRO';

export type StatoRichiestaHR =
    | 'BOZZA'
    | 'INVIATA'
    | 'IN_VALUTAZIONE'
    | 'IN_ATTESA'
    | 'APPROVATA'
    | 'RIFIUTATA'
    | 'ANNULLATA';

export type StatoCartellino = 'BOZZA' | 'VALIDATO' | 'CHIUSO' | 'CONTESTATO';

// P68 - Disponibilità Calendario
export type PreferenzaDisponibilita =
    | 'DISPONIBILE'
    | 'PREFERISCO_NO'
    | 'NON_DISPONIBILE'
    | 'SMART_WORKING'
    | 'MEZZA_GIORNATA_MATTINA'
    | 'MEZZA_GIORNATA_POMERIGGIO';

export type FasciaOraria =
    | 'MATTINA'
    | 'POMERIGGIO'
    | 'GIORNATA_INTERA'
    | 'FLESSIBILE';

export interface DisponibilitaCalendario {
    id: string;
    profiloHRId: string;
    tenantId: string;
    data: string;
    preferenza: PreferenzaDisponibilita;
    fasciaPreferita?: FasciaOraria;
    note?: string;
    stato: StatoRichiestaHR;
    approvatoDa?: string;
    approvatoAt?: string;
    createdAt: string;
    updatedAt: string;
    profiloHR?: ProfiloHR;
}

export interface CalendarioDisponibilitaView {
    dataInizio: string;
    dataFine: string;
    profili: Array<{
        profiloHRId: string;
        nome: string;
        gender?: string;
        mansione: string;
        areaAziendale?: string;
        disponibilita: Record<string, {
            preferenza: PreferenzaDisponibilita;
            fasciaPreferita?: FasciaOraria;
            stato: StatoRichiestaHR;
            note?: string;
        }>;
    }>;
}

// Interfaces
export interface MansioneInterna {
    id: string;
    nome: string;
    descrizione?: string;
    areaAziendale: AreaAziendale;
    livelloGerarchico: number;
    requisitiMinimi?: Record<string, unknown>;
    competenzeRichieste?: Record<string, unknown>;
    responsabilita?: Record<string, unknown>;
    oreMinimeSettimanali?: number;
    oreMassimeSettimanali?: number;
    sigla?: string; // Sigla breve per calendario (es: FO, AM, ES)
    colore?: string; // Colore esadecimale per UI
    // P68: Associazione con ruolo per permessi
    defaultRoleId?: string;
    defaultRole?: {
        id: string;
        name: string;
        displayName?: string;
    };
    defaultPermissions?: Record<string, unknown>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProfiloHR {
    id: string;
    personTenantProfileId: string;
    mansioneInternaId?: string;
    supervisoreId?: string;
    dataAssunzione?: string;
    dataFineContratto?: string;
    matricola?: string;
    oreGiornaliereStandard: number;
    oreSettimanaliContrattuali: number;
    pausaPranzoMinuti: number;
    flexibilityMinuti: number;
    saldoFerie: number;
    saldoPermessi: number;
    saldoROL: number;
    isTimbraturaPbligatoria: boolean;
    canAccessTimbratura: boolean;
    noteContrattuali?: string;
    configurazioneOrario?: Record<string, unknown>;
    isActive: boolean;
    // Relations
    personTenantProfile?: {
        id: string;
        tipoContratto?: TipoContratto;
        tipoCollaboratore?: TipoCollaboratore;
        person?: {
            id: string;
            firstName: string;
            lastName: string;
        };
    };
    mansioneInterna?: MansioneInterna;
}

export interface TurnoTemplate {
    id: string;
    nome: string;
    descrizione?: string;
    tipoTurno: TipoTurno;
    oraInizio: string;
    oraFine: string;
    pausaPranzoInizio?: string;
    pausaPranzoFine?: string;
    oreTotali: number;
    colore: string;
    giorniSettimana?: number[];
    isActive: boolean;
}

export interface TurnoAssegnato {
    id: string;
    profiloHRId: string;
    turnoTemplateId?: string;
    mansioneInternaId?: string;
    data: string;
    oraInizio: string;
    oraFine: string;
    pausaPranzoInizio?: string;
    pausaPranzoFine?: string;
    stato: StatoTurno;
    orePreviste: number;
    oreEffettive?: number;
    note?: string;
    isSmartWorking: boolean;
    sedeId?: string;
    profiloHR?: ProfiloHR;
    turnoTemplate?: TurnoTemplate;
    mansioneInterna?: { id: string; nome: string; sigla?: string; colore?: string };
}

export interface Timbratura {
    id: string;
    profiloHRId: string;
    dataOra: string;
    tipo: TipoTimbratura;
    origine: string;
    isValidata: boolean;
    note?: string;
    profiloHR?: ProfiloHR;
}

export interface Assenza {
    id: string;
    profiloHRId: string;
    tipo: TipoAssenza;
    dataInizio: string;
    dataFine: string;
    isGiornataIntera: boolean;
    giorniTotali: number;
    oreTotali?: number;
    stato: StatoRichiestaHR;
    motivazione?: string;
    certificatoMedico?: string;
    noteApprovatore?: string;
    profiloHR?: ProfiloHR;
}

export interface Cartellino {
    id: string;
    profiloHRId: string;
    anno: number;
    mese: number;
    oreLavoratePreviste: number;
    oreLavorateEffettive: number;
    oreStraordinario: number;
    differenzaOre: number;
    giorniFerie: number;
    giorniPermesso: number;
    giorniMalattia: number;
    giorniSmartWorking: number;
    percentualePresenza: number;
    stato: StatoCartellino;
    profiloHR?: ProfiloHR;
}

export interface SelfCompany {
    company: {
        id: string;
        ragioneSociale: string;
        partitaIva?: string;
        codiceFiscale?: string;
        pec?: string;
    };
    profile: {
        id: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        province?: string;
        cap?: string;
        ateco?: string;
        rea?: string;
    };
    sites: Array<{
        id: string;
        name: string;
        address?: string;
        city?: string;
        isHeadquarters: boolean;
    }>;
}

// ============================================================================
// MANSIONI INTERNE
// ============================================================================

export const mansioniInterneApi = {
    list: (params?: { areaAziendale?: AreaAziendale; isActive?: boolean }) =>
        apiGet<{ data: MansioneInterna[] }>('/api/v1/hr/mansioni-interne', params),

    get: (id: string) =>
        apiGet<{ data: MansioneInterna }>(`/api/v1/hr/mansioni-interne/${id}`),

    create: (data: Partial<MansioneInterna>) =>
        apiPost<{ data: MansioneInterna }>('/api/v1/hr/mansioni-interne', data),

    update: (id: string, data: Partial<MansioneInterna>) =>
        apiPut<{ data: MansioneInterna }>(`/api/v1/hr/mansioni-interne/${id}`, data),

    delete: (id: string, deletionReason: string) =>
        apiDelete(`/api/v1/hr/mansioni-interne/${id}?deletionReason=${encodeURIComponent(deletionReason)}`),
};

// ============================================================================
// PROFILI HR
// ============================================================================

export const profiliHRApi = {
    list: (params?: { mansioneInternaId?: string; isActive?: boolean; page?: number; limit?: number }) =>
        apiGet<{ data: ProfiloHR[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
            '/api/v1/hr/profili', params
        ),

    get: (id: string) =>
        apiGet<{ data: ProfiloHR }>(`/api/v1/hr/profili/${id}`),

    create: (data: Partial<ProfiloHR>) =>
        apiPost<{ data: ProfiloHR }>('/api/v1/hr/profili', data),

    update: (id: string, data: Partial<ProfiloHR>) =>
        apiPut<{ data: ProfiloHR }>(`/api/v1/hr/profili/${id}`, data),

    delete: (id: string, deletionReason: string) =>
        apiDelete(`/api/v1/hr/profili/${id}?deletionReason=${encodeURIComponent(deletionReason)}`),

    getSaldoFerie: (id: string) =>
        apiGet<{ data: { saldoFerie: number; saldoPermessi: number; saldoROL: number } }>(`/api/v1/hr/profili/${id}/saldo-ferie`),
};

// ============================================================================
// TURNI
// ============================================================================

export const turniApi = {
    // Templates
    listTemplates: (params?: { tipoTurno?: TipoTurno; isActive?: boolean }) =>
        apiGet<{ data: TurnoTemplate[] }>('/api/v1/hr/turni/templates', params),

    getTemplate: (id: string) =>
        apiGet<{ data: TurnoTemplate }>(`/api/v1/hr/turni/templates/${id}`),

    createTemplate: (data: Partial<TurnoTemplate>) =>
        apiPost<{ data: TurnoTemplate }>('/api/v1/hr/turni/templates', data),

    updateTemplate: (id: string, data: Partial<TurnoTemplate>) =>
        apiPut<{ data: TurnoTemplate }>(`/api/v1/hr/turni/templates/${id}`, data),

    deleteTemplate: (id: string) =>
        apiDelete(`/api/v1/hr/turni/templates/${id}`),

    // Turni Assegnati
    listTurni: (params?: { profiloHRId?: string; dataInizio?: string; dataFine?: string; stato?: StatoTurno }) =>
        apiGet<{ data: TurnoAssegnato[] }>('/api/v1/hr/turni', params),

    createTurno: (data: Partial<TurnoAssegnato>) =>
        apiPost<{ data: TurnoAssegnato }>('/api/v1/hr/turni', data),

    updateTurno: (id: string, data: Partial<TurnoAssegnato>) =>
        apiPut<{ data: TurnoAssegnato }>(`/api/v1/hr/turni/${id}`, data),

    deleteTurno: (id: string) =>
        apiDelete(`/api/v1/hr/turni/${id}`),

    // Calendario - restituisce dati raggruppati per data
    getCalendario: (params: { dataInizio: string; dataFine: string; profiloHRId?: string }) =>
        apiGet<{ data: { dataInizio: string; dataFine: string; calendario: Record<string, TurnoAssegnato[]>; totale: number } }>('/api/v1/hr/turni/calendario', params),
};

// ============================================================================
// DISPONIBILITA CALENDARIO
// ============================================================================

export const disponibilitaApi = {
    // Manager: lista tutte le disponibilità
    list: (params?: {
        profiloHRId?: string;
        dataInizio?: string;
        dataFine?: string;
        preferenza?: PreferenzaDisponibilita;
        stato?: StatoRichiestaHR;
        fasciaPreferita?: FasciaOraria;
    }) =>
        apiGet<{ data: DisponibilitaCalendario[] }>('/api/v1/hr/disponibilita', params),

    // Employee: le mie disponibilità
    getMie: (params?: { dataInizio?: string; dataFine?: string; anno?: number; mese?: number }) =>
        apiGet<{ data: DisponibilitaCalendario[] }>('/api/v1/hr/disponibilita/mie', params),

    // Manager: vista calendario aggregata
    getCalendario: (params?: {
        dataInizio?: string;
        dataFine?: string;
        anno?: number;
        mese?: number;
        mansioneInternaId?: string;
        profiloHRIds?: string | string[];
    }) =>
        apiGet<{ data: CalendarioDisponibilitaView }>('/api/v1/hr/disponibilita/calendario', params),

    // Crea/aggiorna singola disponibilità
    upsert: (data: {
        data: string;
        preferenza: PreferenzaDisponibilita;
        fasciaPreferita?: FasciaOraria;
        note?: string;
        profiloHRId?: string;
    }) =>
        apiPost<{ data: DisponibilitaCalendario }>('/api/v1/hr/disponibilita', data),

    // Bulk upsert (multipli giorni)
    bulkUpsert: (data: {
        disponibilita: Array<{
            data: string;
            preferenza: PreferenzaDisponibilita;
            fasciaPreferita?: FasciaOraria;
            note?: string;
        }>;
        profiloHRId?: string;
    }) =>
        apiPost<{ data: DisponibilitaCalendario[]; count: number }>('/api/v1/hr/disponibilita/bulk', data),

    // Bulk multi-profilo (manager: salva per più dipendenti)
    bulkMulti: (data: {
        entries: Array<{
            profiloHRId: string;
            data: string;
            preferenza: PreferenzaDisponibilita;
            fasciaPreferita: FasciaOraria;
            note?: string;
        }>;
    }) =>
        apiPost<{ data: DisponibilitaCalendario[]; count: number }>('/api/v1/hr/disponibilita/bulk-multi', data),

    // Manager: approva disponibilità
    approva: (id: string) =>
        apiPost<{ data: DisponibilitaCalendario }>(`/api/v1/hr/disponibilita/${id}/approva`),

    // Elimina disponibilità
    delete: (id: string) =>
        apiDelete(`/api/v1/hr/disponibilita/${id}`),
};

// ============================================================================
// TIMBRATURE
// ============================================================================

export const timbraturaApi = {
    getStatoOggi: () =>
        apiGet<{ data: { ultimaTimbratura?: Timbratura; statoAttuale: 'IN_SEDE' | 'IN_PAUSA' | 'FUORI_SEDE'; timbratureOggi: Timbratura[]; hasHRProfile?: boolean; timbraturaObbligatoria?: boolean } }>(
            '/api/v1/hr/timbratura/stato-oggi'
        ),

    timbra: (tipo: TipoTimbratura) =>
        apiPost<{ data: { timbratura: Timbratura; statoAttuale: string } }>('/api/v1/hr/timbratura', { tipo }),

    list: (params?: { profiloHRId?: string; dataInizio?: string; dataFine?: string; tipo?: TipoTimbratura }) =>
        apiGet<{ data: Timbratura[] }>('/api/v1/hr/timbratura', params),

    createManuale: (data: { profiloHRId: string; dataOra: string; tipo: TipoTimbratura; note?: string }) =>
        apiPost<{ data: Timbratura }>('/api/v1/hr/timbratura/manuale', data),

    valida: (id: string) =>
        apiPost<{ data: Timbratura }>(`/api/v1/hr/timbratura/${id}/valida`),

    delete: (id: string) =>
        apiDelete(`/api/v1/hr/timbratura/${id}`),
};

// ============================================================================
// ASSENZE
// ============================================================================

export const assenzeApi = {
    list: (params?: { profiloHRId?: string; stato?: StatoRichiestaHR; tipo?: TipoAssenza; page?: number; limit?: number }) =>
        apiGet<{ data: Assenza[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
            '/api/v1/hr/assenze', params
        ),

    getMie: (params?: { stato?: StatoRichiestaHR }) =>
        apiGet<{ data: Assenza[] }>('/api/v1/hr/assenze/mie', params),

    getCalendario: (params: { dataInizio: string; dataFine: string; profiloHRId?: string }) =>
        apiGet<{ data: Assenza[] }>('/api/v1/hr/assenze/calendario', params),

    create: (data: Partial<Assenza>) =>
        apiPost<{ data: Assenza }>('/api/v1/hr/assenze', data),

    approva: (id: string, noteApprovatore?: string) =>
        apiPost<{ data: Assenza }>(`/api/v1/hr/assenze/${id}/approva`, { noteApprovatore }),

    rifiuta: (id: string, noteApprovatore: string) =>
        apiPost<{ data: Assenza }>(`/api/v1/hr/assenze/${id}/rifiuta`, { noteApprovatore }),

    delete: (id: string) =>
        apiDelete(`/api/v1/hr/assenze/${id}`),
};

// ============================================================================
// CARTELLINI
// ============================================================================

export const cartelliniApi = {
    list: (params?: { profiloHRId?: string; anno?: number; mese?: number; stato?: StatoCartellino }) =>
        apiGet<{ data: Cartellino[] }>('/api/v1/hr/cartellini', params),

    getMio: (params?: { anno?: number; mese?: number }) =>
        apiGet<{ data: Cartellino | null }>('/api/v1/hr/cartellini/mio', params),

    get: (id: string) =>
        apiGet<{ data: Cartellino }>(`/api/v1/hr/cartellini/${id}`),

    genera: (data: { profiloHRId: string; anno: number; mese: number }) =>
        apiPost<{ data: Cartellino }>('/api/v1/hr/cartellini/genera', data),

    valida: (id: string) =>
        apiPost<{ data: Cartellino }>(`/api/v1/hr/cartellini/${id}/valida`),

    chiudi: (id: string) =>
        apiPost<{ data: Cartellino }>(`/api/v1/hr/cartellini/${id}/chiudi`),
};

// ============================================================================
// SELF COMPANY
// ============================================================================

export const selfCompanyApi = {
    get: () =>
        apiGet<{ data: SelfCompany | null }>('/api/v1/hr/self-company'),

    setup: (data: {
        ragioneSociale: string;
        partitaIva?: string;
        codiceFiscale?: string;
        pec?: string;
        email?: string;
        phone?: string;
        address?: string;
        city?: string;
        province?: string;
        cap?: string;
        siteData?: { name: string; address?: string; city?: string };
    }) => apiPost<{ data: SelfCompany }>('/api/v1/hr/self-company/setup', data),

    update: (data: Partial<SelfCompany['profile']> & Partial<SelfCompany['company']>) =>
        apiPut<{ data: SelfCompany }>('/api/v1/hr/self-company', data),

    listSedi: () =>
        apiGet<{ data: SelfCompany['sites'] }>('/api/v1/hr/self-company/sedi'),

    addSede: (data: { name: string; address?: string; city?: string; province?: string; isHeadquarters?: boolean }) =>
        apiPost<{ data: SelfCompany['sites'][0] }>('/api/v1/hr/self-company/sedi', data),

    updateSede: (id: string, data: { name?: string; address?: string; city?: string; isActive?: boolean }) =>
        apiPut<{ data: SelfCompany['sites'][0] }>(`/api/v1/hr/self-company/sedi/${id}`, data),

    deleteSede: (id: string) =>
        apiDelete(`/api/v1/hr/self-company/sedi/${id}`),
};

// ============================================================================
// LABELS & UTILITIES
// ============================================================================

export const TIPO_CONTRATTO_LABELS: Record<TipoContratto, string> = {
    DIPENDENTE_INDETERMINATO: 'Dipendente T. Indeterminato',
    DIPENDENTE_DETERMINATO: 'Dipendente T. Determinato',
    LIBERA_PROFESSIONE: 'Libera Professione',
    COCOCO: 'Co.Co.Co.',
    PRESTAZIONE_OCCASIONALE: 'Prestazione Occasionale',
    TIROCINIO: 'Tirocinio',
    APPRENDISTATO: 'Apprendistato',
    COLLABORAZIONE: 'Collaborazione',
};

export const TIPO_COLLABORATORE_LABELS: Record<TipoCollaboratore, string> = {
    AMMINISTRATIVO: 'Amministrativo',
    MEDICO: 'Medico',
    INFERMIERE: 'Infermiere',
    TECNICO_SANITARIO: 'Tecnico Sanitario',
    FORMATORE: 'Formatore',
    SEGRETERIA: 'Segreteria',
    DIRIGENTE: 'Dirigente',
    CONSULENTE: 'Consulente',
    ALTRO: 'Altro',
};

export const AREA_AZIENDALE_LABELS: Record<AreaAziendale, string> = {
    DIREZIONE: 'Direzione',
    AMMINISTRAZIONE: 'Amministrazione',
    CLINICA: 'Clinica',
    FORMAZIONE: 'Formazione',
    MEDICINA_LAVORO: 'Medicina del Lavoro',
    SEGRETERIA: 'Segreteria',
    MARKETING: 'Marketing',
    ALTRO: 'Altro',
};

export const TIPO_TURNO_LABELS: Record<TipoTurno, string> = {
    MATTINA: 'Mattina',
    POMERIGGIO: 'Pomeriggio',
    GIORNATA: 'Giornata Intera',
    NOTTURNO: 'Notturno',
    SPEZZATO: 'Spezzato',
    REPERIBILITA: 'Reperibilità',
    STRAORDINARIO: 'Straordinario',
};

export const STATO_TURNO_LABELS: Record<StatoTurno, string> = {
    PIANIFICATO: 'Pianificato',
    CONFERMATO: 'Confermato',
    IN_CORSO: 'In Corso',
    COMPLETATO: 'Completato',
    ANNULLATO: 'Annullato',
};

export const TIPO_ASSENZA_LABELS: Record<TipoAssenza, string> = {
    FERIE: 'Ferie',
    PERMESSO_ROL: 'Permesso ROL',
    PERMESSO_EX_FESTIVITA: 'Ex Festività',
    MALATTIA: 'Malattia',
    INFORTUNIO: 'Infortunio',
    MATERNITA: 'Maternità',
    PATERNITA: 'Paternità',
    CONGEDO_PARENTALE: 'Congedo Parentale',
    LUTTO: 'Lutto',
    MATRIMONIO: 'Matrimonio',
    DONAZIONE_SANGUE: 'Donazione Sangue',
    VISITA_MEDICA: 'Visita Medica',
    PERMESSO_STUDIO: 'Permesso Studio',
    ASPETTATIVA: 'Aspettativa',
    ALTRO: 'Altro',
};

export const STATO_RICHIESTA_LABELS: Record<StatoRichiestaHR, string> = {
    BOZZA: 'Bozza',
    INVIATA: 'Inviata',
    IN_VALUTAZIONE: 'In Valutazione',
    IN_ATTESA: 'In Attesa',
    APPROVATA: 'Approvata',
    RIFIUTATA: 'Rifiutata',
    ANNULLATA: 'Annullata',
};

export const STATO_CARTELLINO_LABELS: Record<StatoCartellino, string> = {
    BOZZA: 'Bozza',
    VALIDATO: 'Validato',
    CHIUSO: 'Chiuso',
    CONTESTATO: 'Contestato',
};

export const PREFERENZA_DISPONIBILITA_LABELS: Record<PreferenzaDisponibilita, string> = {
    DISPONIBILE: 'Disponibile',
    PREFERISCO_NO: 'Preferisco no',
    NON_DISPONIBILE: 'Non disponibile',
    SMART_WORKING: 'Smart Working',
    MEZZA_GIORNATA_MATTINA: 'Mezza giornata (mattina)',
    MEZZA_GIORNATA_POMERIGGIO: 'Mezza giornata (pomeriggio)',
};

export const FASCIA_ORARIA_LABELS: Record<FasciaOraria, string> = {
    MATTINA: 'Mattina (08:00-14:00)',
    POMERIGGIO: 'Pomeriggio (14:00-20:00)',
    GIORNATA_INTERA: 'Giornata Intera',
    FLESSIBILE: 'Flessibile',
};

// Colori per le preferenze (per il calendario)
export const PREFERENZA_DISPONIBILITA_COLORS: Record<PreferenzaDisponibilita, { bg: string; text: string; border: string }> = {
    DISPONIBILE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    PREFERISCO_NO: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    NON_DISPONIBILE: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    SMART_WORKING: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    MEZZA_GIORNATA_MATTINA: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    MEZZA_GIORNATA_POMERIGGIO: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
};
