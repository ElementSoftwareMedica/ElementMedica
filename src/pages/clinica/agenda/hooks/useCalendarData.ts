/**
 * Calendar Module - useCalendarData Hook
 * 
 * Hook per gestione dati calendario (query API).
 * Centralizza le chiamate per ambulatori, medici, slot e appuntamenti.
 * 
 * @module pages/clinica/agenda/hooks/useCalendarData
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
    ambulatoriApi,
    mediciApi,
    slotsApi,
    appuntamentiApi,
    Ambulatorio,
    Medico,
    SlotDisponibilita,
    Appuntamento
} from '../../../../services/clinicaApi';
import { useTenantFilter } from '../../../../context/TenantFilterContext';
import type { CalendarEvent } from '../types';
import { formatDateISO } from '../utils/dateUtils';

/**
 * SlotDisponibilita come ritornato dall'API (con relazioni opzionali)
 */
type SlotFromAPI = SlotDisponibilita & {
    medico?: {
        id: string;
        nome: string;
        cognome: string;
    };
    ambulatorio?: {
        id: string;
        nome: string;
    };
};

/**
 * Appuntamento come ritornato dall'API (con relazioni opzionali e campi extra)
 */
type AppuntamentoFromAPI = Appuntamento & {
    prezzo?: number;
    prezzoScontato?: number;
    convenzione?: {
        id: string;
        nome: string;
    };
};

interface UseCalendarDataParams {
    /** Date selezionate per cui caricare dati */
    selectedDates: Date[];
    /** Ambulatori selezionati (vuoto = tutti) */
    selectedAmbulatori: string[];
    /** Se true, carica tutti i dati */
    enabled?: boolean;
}

interface UseCalendarDataResult {
    /** Lista ambulatori */
    ambulatori: Ambulatorio[];
    /** Lista medici */
    medici: Medico[];
    /** Slot disponibilità grezzi */
    slots: SlotDisponibilita[];
    /** Appuntamenti grezzi */
    appuntamenti: Appuntamento[];
    /** Eventi calendario convertiti */
    events: CalendarEvent[];
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    error: Error | null;
    /** Refetch data */
    refetch: () => void;
}

/**
 * Hook per caricare dati calendario
 */
export const useCalendarData = ({
    selectedDates,
    selectedAmbulatori,
    enabled = true
}: UseCalendarDataParams): UseCalendarDataResult => {
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // Calcola date range per API
    const dateRange = useMemo(() => {
        if (selectedDates.length === 0) return { startDate: '', endDate: '' };

        const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
        return {
            startDate: formatDateISO(sorted[0]),
            endDate: formatDateISO(sorted[sorted.length - 1])
        };
    }, [selectedDates]);

    // Query ambulatori
    const {
        data: ambulatoriData,
        isLoading: isLoadingAmbulatori,
        error: ambulatoriError
    } = useQuery({
        queryKey: ['ambulatori', tenantFilterKey],
        queryFn: async () => {
            const params = getTenantFilterParams();
            const result = await ambulatoriApi.getAll({ limit: 100, ...params });
            return result.data;
        },
        enabled: enabled && isReady
    });

    // Query medici
    const {
        data: mediciData,
        isLoading: isLoadingMedici,
        error: mediciError
    } = useQuery({
        queryKey: ['medici', tenantFilterKey],
        queryFn: async () => {
            const params = getTenantFilterParams();
            const result = await mediciApi.getAll({ limit: 100, ...params });
            return result.data;
        },
        enabled: enabled && isReady
    });

    // Query slots disponibilità
    const {
        data: slotsData,
        isLoading: isLoadingSlots,
        error: slotsError,
        refetch: refetchSlots
    } = useQuery({
        queryKey: ['slots-calendario', dateRange.startDate, dateRange.endDate, tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            const result = await slotsApi.getAll({
                limit: 1000,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' }),
                filters: {
                    dataInizio: dateRange.startDate,
                    dataFine: dateRange.endDate,
                    disponibile: 'true'
                }
            });
            return result.data as SlotFromAPI[];
        },
        enabled: enabled && isReady && !!dateRange.startDate && !!dateRange.endDate
    });

    // Query appuntamenti
    const {
        data: appuntamentiData,
        isLoading: isLoadingAppuntamenti,
        error: appuntamentiError,
        refetch: refetchAppuntamenti
    } = useQuery({
        queryKey: ['appuntamenti-calendario', dateRange.startDate, dateRange.endDate, tenantFilterKey],
        queryFn: async () => {
            const params = getTenantFilterParams();
            const result = await appuntamentiApi.getAll({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                limit: 500,
                ...params
            });
            return result.data as AppuntamentoFromAPI[];
        },
        enabled: enabled && isReady && !!dateRange.startDate && !!dateRange.endDate
    });

    // Converti slots in CalendarEvent
    const slotEvents = useMemo((): CalendarEvent[] => {
        if (!slotsData) return [];

        return slotsData.map((slot): CalendarEvent => {
            const start = new Date(slot.data);
            start.setHours(
                parseInt(slot.oraInizio.split(':')[0]),
                parseInt(slot.oraInizio.split(':')[1])
            );

            const end = new Date(slot.data);
            end.setHours(
                parseInt(slot.oraFine.split(':')[0]),
                parseInt(slot.oraFine.split(':')[1])
            );

            return {
                id: slot.id,
                title: slot.medico?.cognome || 'Medico',
                start,
                end,
                tipo: 'disponibilita',
                medicoId: slot.medicoId,
                medicoNome: slot.medico
                    ? `${slot.medico.cognome} ${slot.medico.nome}`
                    : 'Medico',
                ambulatorioId: slot.ambulatorioId,
                ambulatorioNome: slot.ambulatorio?.nome || 'Ambulatorio',
                raw: slot as SlotDisponibilita
            };
        });
    }, [slotsData]);

    // Converti appuntamenti in CalendarEvent
    const appuntamentoEvents = useMemo((): CalendarEvent[] => {
        if (!appuntamentiData) return [];

        return appuntamentiData.map((app): CalendarEvent => {
            const start = new Date(app.dataOra);
            const durationMinutes = app.durataMinuti || 30;
            const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

            return {
                id: app.id,
                title: app.paziente
                    ? `${app.paziente.cognome} ${app.paziente.nome}`
                    : 'Paziente',
                start,
                end,
                tipo: 'appuntamento',
                stato: app.stato,
                paziente: app.paziente
                    ? `${app.paziente.cognome} ${app.paziente.nome}`
                    : undefined,
                pazienteTelefono: app.paziente?.telefono,
                medicoId: app.medicoId,
                medicoNome: app.medico
                    ? `${app.medico.cognome} ${app.medico.nome}`
                    : undefined,
                ambulatorioId: app.ambulatorioId,
                ambulatorioNome: app.ambulatorio?.nome,
                prestazione: app.prestazione?.nome,
                prezzo: app.prezzo,
                convenzione: app.convenzione?.nome,
                convenzioneId: app.convenzioneId || undefined,
                prezzoScontato: app.prezzoScontato || undefined,
                // P61: Note pubbliche e interne
                note: app.note || undefined,
                noteInterne: app.noteInterne || undefined,
                // P61: Queue system fields
                queueEntryId: app.queueEntryId || undefined,
                queueSessionId: app.queueSessionId || undefined,
                numeroCoda: app.numeroCoda || undefined,
                displayNumberCoda: app.displayNumberCoda || undefined,
                visitaId: (app as any).visita?.id || undefined,
                raw: app as Appuntamento
            };
        });
    }, [appuntamentiData]);

    // Combina tutti gli eventi
    const events = useMemo(() => {
        return [...slotEvents, ...appuntamentoEvents];
    }, [slotEvents, appuntamentoEvents]);

    // Combined refetch
    const refetch = () => {
        refetchSlots();
        refetchAppuntamenti();
    };

    // Combined loading state
    const isLoading = isLoadingAmbulatori || isLoadingMedici || isLoadingSlots || isLoadingAppuntamenti;

    // Combined error state
    const error = ambulatoriError || mediciError || slotsError || appuntamentiError || null;

    return {
        ambulatori: ambulatoriData || [],
        medici: mediciData || [],
        slots: (slotsData || []) as SlotDisponibilita[],
        appuntamenti: (appuntamentiData || []) as Appuntamento[],
        events,
        isLoading,
        error: error as Error | null,
        refetch
    };
};

export default useCalendarData;
