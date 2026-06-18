/**
 * Types for Calendar Modals
 * @module pages/clinica/agenda/components/modals/types
 */

import type { CalendarEvent } from '../../types/calendar.types';
import type {
    Medico,
    Ambulatorio,
    StatoAppuntamento,
    SlotDisponibilita
} from '../../../../../services/clinicaApi';
import type { MEDICO_COLORS } from '../../constants';

// ============================================
// APPOINTMENT BOOKING MODAL TYPES
// ============================================

export interface AppointmentBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    slotInfo: {
        date: Date;
        hour: number;
        ambulatorioId: string;
        isOverbooking?: boolean;
        existingCount?: number;
    } | null;
    medico: Medico | null;
    onSuccess: () => void;
    existingAppointment?: CalendarEvent | null;
    allMedici?: Medico[];
    onDelete?: (id: string) => void;
}

export interface ScontoValidato {
    valid: boolean;
    tipo?: 'PERCENTUALE' | 'VALORE_ASSOLUTO';
    valore?: number;
}

export interface NewPatientData {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
}

// ============================================
// AVAILABILITY SLOT MODAL TYPES
// ============================================

export interface AvailabilitySlotModalProps {
    isOpen: boolean;
    onClose: () => void;
    slotInfo: {
        date: Date;
        startHour: number;
        endHour: number;
        ambulatorioId: string;
        /** Pre-filled medicoId (medico view mode) */
        medicoId?: string;
    } | null;
    medici: Medico[];
    selectedMedicoId: string | null;
    medicoColors: Map<string, typeof MEDICO_COLORS[0]>;
    onSuccess: () => void;
    existingDisponibilita?: CalendarEvent[];
    /** Ambulatori liberi nella fascia oraria selezionata (medico view mode) */
    ambulatori?: Ambulatorio[];
}

// ============================================
// EDIT DISPONIBILITA MODAL TYPES
// ============================================

export interface EditDisponibilitaModalProps {
    isOpen: boolean;
    onClose: () => void;
    slot: CalendarEvent | null;
    medici: Medico[];
    ambulatori: Ambulatorio[];
    medicoColors: Map<string, typeof MEDICO_COLORS[0]>;
    onSuccess: () => void;
}

// ============================================
// APPOINTMENT DETAIL MODAL TYPES
// ============================================

export interface AppointmentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: CalendarEvent | null;
    medici: Medico[];
    ambulatori: Ambulatorio[];
    onNavigateToEdit: (id: string) => void;
    onStatusChange: (id: string, stato: StatoAppuntamento) => void;
    onDelete: (id: string) => void;
}

// ============================================
// AMBULATORIO OVERVIEW PANEL TYPES
// ============================================

export interface AmbulatorioOverviewPanelProps {
    isOpen: boolean;
    onClose: () => void;
    ambulatori: Ambulatorio[];
    disponibilita: CalendarEvent[];
    displayDays: Date[];
    medicoColors: Map<string, typeof MEDICO_COLORS[0]>;
}
