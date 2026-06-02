/**
 * Types per DisponibilitaPage
 * @module pages/clinica/agenda/disponibilita/types
 */

import type { DisponibilitaMedico, FerieAssenza, SlotDisponibilita, Medico, Ambulatorio } from '../../../../services/clinicaApi';

export type TabType = 'orari' | 'singole' | 'ferie';
export type ViewMode = 'grid' | 'detail';

export interface SlotForm {
    medicoId: string;
    ambulatorioId: string;
    giorno: number;
    oraInizio: string;
    oraFine: string;
    validoDal: string;
    validoAl: string;
}

export interface SingleSlotForm {
    medicoId: string;
    ambulatorioId: string;
    data: string;
    oraInizio: string;
    oraFine: string;
    isOccupazione: boolean;
}

export interface FerieForm {
    medicoId: string;
    dataInizio: string;
    dataFine: string;
    motivo: string;
    note: string;
}

export const GIORNI_SETTIMANA = [
    { value: 1, label: 'Lunedì', short: 'Lun' },
    { value: 2, label: 'Martedì', short: 'Mar' },
    { value: 3, label: 'Mercoledì', short: 'Mer' },
    { value: 4, label: 'Giovedì', short: 'Gio' },
    { value: 5, label: 'Venerdì', short: 'Ven' },
    { value: 6, label: 'Sabato', short: 'Sab' },
    { value: 0, label: 'Domenica', short: 'Dom' }
];

export const MOTIVI_ASSENZA = [
    { value: 'ferie', label: 'Ferie' },
    { value: 'malattia', label: 'Malattia' },
    { value: 'formazione', label: 'Formazione' },
    { value: 'congedo', label: 'Congedo' },
    { value: 'altro', label: 'Altro' }
];

export const INITIAL_SLOT: SlotForm = {
    medicoId: '',
    ambulatorioId: '',
    giorno: 1,
    oraInizio: '09:00',
    oraFine: '13:00',
    validoDal: new Date().toISOString().split('T')[0],
    validoAl: ''
};

export const INITIAL_SINGLE_SLOT: SingleSlotForm = {
    medicoId: '',
    ambulatorioId: '',
    data: new Date().toISOString().split('T')[0],
    oraInizio: '09:00',
    oraFine: '13:00',
    isOccupazione: false
};

export const INITIAL_FERIE: FerieForm = {
    medicoId: '',
    dataInizio: '',
    dataFine: '',
    motivo: 'ferie',
    note: ''
};

export interface WeeklyScheduleEntry {
    giorno: number;
    oraInizio: string;
    oraFine: string;
}

export interface MedicoWithStats extends Medico {
    slotsCount: number;
    nextSlot?: SlotDisponibilita;
    hasActiveVacation: boolean;
    weeklyHours: number;
    weeklySchedule: WeeklyScheduleEntry[];
}

export type { DisponibilitaMedico, FerieAssenza, SlotDisponibilita, Medico, Ambulatorio };
