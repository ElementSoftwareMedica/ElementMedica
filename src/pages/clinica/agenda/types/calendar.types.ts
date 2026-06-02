/**
 * Calendar Module - Type Definitions
 * 
 * Tipi e interfacce per il modulo calendario clinico.
 * Centralizza tutti i tipi usati nei componenti calendario.
 * 
 * @module pages/clinica/agenda/types
 */

import { StatoAppuntamento, Appuntamento, SlotDisponibilita } from '../../../../services/clinicaApi';

// ============================================
// VIEW TYPES
// ============================================

/**
 * Tipo di vista del calendario
 */
export type ViewType = 'day' | 'week';

/**
 * Modalità di zoom per la visualizzazione oraria
 * - scroll: altezza fissa, scroll verticale
 * - fixed: adatta all'altezza container
 */
export type ZoomMode = 'scroll' | 'fixed';

/**
 * Modalità di colorazione eventi
 * - medico: colore basato sul medico assegnato
 * - ambulatorio: colore basato sull'ambulatorio
 */
export type ColorMode = 'medico' | 'ambulatorio';

// ============================================
// EVENT TYPES
// ============================================

/**
 * Evento calendario unificato (disponibilità o appuntamento)
 * Usato per rendering uniforme nel calendario
 */
export interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    tipo: 'disponibilita' | 'appuntamento';
    stato?: StatoAppuntamento;
    paziente?: string;
    pazienteTelefono?: string;
    medicoId?: string;
    medicoNome?: string;
    ambulatorioId?: string;
    ambulatorioNome?: string;
    prestazione?: string;
    prezzo?: number;
    convenzione?: string;
    convenzioneId?: string;
    prezzoScontato?: number;
    isOverbooking?: boolean;
    /** Note pubbliche appuntamento (P61) */
    note?: string;
    /** Note interne medico-segreteria (Session #12b) */
    noteInterne?: string;
    /** Usato quando showAllSlotsGray è attivo per medici non selezionati */
    isGrayed?: boolean;
    color?: string;
    /** P61: ID entry nella coda (se paziente è in coda) */
    queueEntryId?: string;
    /** P61: ID sessione coda attiva per questo slot */
    queueSessionId?: string;
    /** P61: Numero coda assegnato */
    numeroCoda?: number;
    /** P61: Display number formato "AMB1-03" */
    displayNumberCoda?: string;
    /** ID della visita refertata associata (se presente) */
    visitaId?: string;
    /** P70: Tipo visita MDL (es. PERIODICA, ASSUNZIONE, ecc.) — solo per appuntamenti MDL */
    tipoVisitaMDL?: string | null;
    /** P70: Paziente con anagrafica completa (residenceAddress + residenceCity valorizzati) */
    pazienteAnagraficaCompleta?: boolean;
    /** Consensi base gia validi per visita MDL prenotata */
    consensiMdlValidi?: boolean;
    /** Dati originali dell'API */
    raw: Appuntamento | SlotDisponibilita;
}

// ============================================
// DRAG & DROP TYPES
// ============================================

/**
 * Stato del drag per creazione disponibilità
 */
export interface DragState {
    isDragging: boolean;
    startHour: number | null;
    startDay: Date | null;
    endHour: number | null;
    ambulatorioId: string | null;
}

/**
 * Item trasportato durante drag & drop
 */
export interface DragItem {
    type: 'disponibilita' | 'appuntamento';
    event: CalendarEvent;
}

// ============================================
// TIME TYPES
// ============================================

/**
 * Slot temporale (ora e minuti)
 */
export interface TimeSlot {
    hour: number;
    minutes: number;
    /** Etichetta formattata (es: "08:30") */
    label?: string;
}

/**
 * Preset orario predefinito
 */
export interface TimePreset {
    start: number;
    end: number;
    label: string;
}

// ============================================
// OVERBOOKING TYPES
// ============================================

/**
 * Informazioni colonna per gestione overbooking
 * Usato per posizionare appuntamenti sovrapposti
 */
export interface OverbookingColumn {
    event: CalendarEvent;
    /** Indice colonna (0 = prima colonna) */
    columnIndex: number;
    /** Numero totale colonne in quel momento */
    totalColumns: number;
}

// ============================================
// COLOR TYPES
// ============================================

/**
 * Schema colore per medico/ambulatorio
 */
export interface ColorScheme {
    /** Classe Tailwind per background */
    bg: string;
    /** Classe Tailwind per border */
    border: string;
    /** Classe Tailwind per testo */
    text: string;
    /** Classe Tailwind per dot/badge */
    dot: string;
}

// ============================================
// SETTINGS TYPES
// ============================================

/**
 * Impostazioni calendario persistite in localStorage
 */
export interface CalendarSettings {
    /** Ora inizio visualizzazione (es. 7) */
    viewStartHour: number;
    /** Ora fine visualizzazione (es. 21) */
    viewEndHour: number;
    /** Modalità zoom */
    zoomMode: ZoomMode;
    /** Giorni settimana selezionati (0=Dom, 1=Lun, etc.) */
    selectedDays: number[];
    /** ID ambulatori selezionati (null = tutti) */
    selectedAmbulatori: string[];
    /** ID medici filtrati (vuoto = tutti) */
    filterMedici: string[];
    /** Date specifiche selezionate */
    selectedDates: Date[];
    /** Mostra solo giorni con disponibilità */
    showOnlyAvailability: boolean;
    /** Mostra slot altri medici in grigio */
    showAllSlotsGray: boolean;
    /** Modalità colorazione eventi */
    colorMode: ColorMode;
}

// ============================================
// MODAL TYPES
// ============================================

/**
 * Info per quick add appuntamento
 */
export interface QuickAddInfo {
    date: Date;
    hour: number;
    ambulatorioId: string;
    isOverbooking?: boolean;
    existingCount?: number;
}

/**
 * Info per modal creazione disponibilità
 */
export interface AvailabilityModalInfo {
    date: Date;
    startHour: number;
    endHour: number;
    ambulatorioId: string;
}

/**
 * Info per conferma spostamento disponibilità
 */
export interface MoveDisponibilitaConfirm {
    disponibilita: CalendarEvent;
    targetDate: Date;
    targetAmbulatorioId: string;
    targetHour: number;
    appointmentsToMove: CalendarEvent[];
}
