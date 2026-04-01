/**
 * useAccettazioneData - Hook per gestione dati accettazione
 * 
 * Gestisce fetch appuntamenti, medici, ambulatori con filtri avanzati.
 * Integra stato queue per pazienti provenienti da sistema code.
 * 
 * Features:
 * - Supporto per selezione range di date (dataInizio/dataFine)
 * - Auto-reset giornaliero (ogni nuovo giorno riparte dalla data odierna)
 * - Persistenza filtri in localStorage
 * 
 * @module pages/clinica/agenda/components/accettazione
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    appuntamentiApi,
    ambulatoriApi,
    mediciApi,
    StatoAppuntamento,
    Appuntamento,
    Ambulatorio,
    Medico
} from '../../../../../services/clinicaApi';
import { useTenantFilter } from '../../../../../context/TenantFilterContext';
import { useToast } from '../../../../../hooks/useToast';
import { getPersonDisplayName } from '../../../../../utils/personDisplayUtils';
import { toISODateString } from '../../../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

export interface AccettazioneFilters {
    search: string;
    stato: 'tutti' | 'da_accettare' | 'in_attesa' | 'in_corso' | 'completati';
    medicoId: string | null;
    ambulatorioId: string | null;
}

/** Range di date per selezione periodo */
export interface DateRange {
    start: Date | null;
    end: Date | null;
}

export interface AccettazioneStats {
    totale: number;
    daAccettare: number;
    inAttesa: number;
    inCorso: number;
    completati: number;
    noShow: number;
}

export interface GroupedAppuntamenti {
    daAccettare: Appuntamento[];
    inAttesa: Appuntamento[];
    inCorso: Appuntamento[];
    completati: Appuntamento[];
}

export interface UseAccettazioneDataReturn {
    // Data
    appuntamenti: Appuntamento[];
    groupedAppuntamenti: GroupedAppuntamenti;
    medici: Medico[];
    ambulatori: Ambulatorio[];
    stats: AccettazioneStats;

    // Loading states
    isLoading: boolean;
    isLoadingMedici: boolean;
    isLoadingAmbulatori: boolean;

    // Date management - supporta sia single date che range
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    dateRange: DateRange;
    setDateRange: (range: DateRange) => void;
    isRangeMode: boolean;
    setIsRangeMode: (isRange: boolean) => void;
    isToday: boolean;
    goToPreviousDay: () => void;
    goToNextDay: () => void;
    goToToday: () => void;

    // Filters
    filters: AccettazioneFilters;
    setFilters: React.Dispatch<React.SetStateAction<AccettazioneFilters>>;
    resetFilters: () => void;

    // Permissions - per il dropdown medici
    canViewOtherMedici: boolean;

    // Actions
    loadingId: string | null;
    changeStato: (id: string, stato: StatoAppuntamento) => void;
    checkIn: (id: string) => void;
    chiama: (id: string) => void;
    completa: (id: string) => void;
    noShow: (id: string) => void;
    refetch: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY_DATE = 'accettazione-selected-date';
const STORAGE_KEY_DATE_RANGE = 'accettazione-date-range';
const STORAGE_KEY_RANGE_MODE = 'accettazione-range-mode';
const STORAGE_KEY_FILTERS = 'accettazione-filters';
const STORAGE_KEY_LAST_ACCESS = 'accettazione-last-access';

const STATI_DA_ACCETTARE: StatoAppuntamento[] = ['PRENOTATO', 'CONFERMATO'];

const DEFAULT_FILTERS: AccettazioneFilters = {
    search: '',
    stato: 'tutti',
    medicoId: null,
    ambulatorioId: null
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDateForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

/**
 * Controlla se è il primo accesso del giorno e resetta se necessario
 * @returns true se è stato effettuato un reset
 */
const checkDailyReset = (): boolean => {
    const today = toISODateString(new Date());
    const lastAccess = localStorage.getItem(STORAGE_KEY_LAST_ACCESS);

    if (lastAccess !== today) {
        // Primo accesso del giorno - reset al giorno corrente
        localStorage.setItem(STORAGE_KEY_LAST_ACCESS, today);
        localStorage.setItem(STORAGE_KEY_DATE, new Date().toISOString());
        localStorage.setItem(STORAGE_KEY_DATE_RANGE, JSON.stringify({
            start: new Date().toISOString(),
            end: new Date().toISOString()
        }));
        return true;
    }
    return false;
};

const loadDateFromStorage = (): Date => {
    // Check daily reset first
    checkDailyReset();

    const saved = localStorage.getItem(STORAGE_KEY_DATE);
    if (saved) {
        const savedDate = new Date(saved);
        if (!isNaN(savedDate.getTime())) {
            return savedDate;
        }
    }
    return new Date();
};

const loadDateRangeFromStorage = (): DateRange => {
    // Check daily reset first
    checkDailyReset();

    const saved = localStorage.getItem(STORAGE_KEY_DATE_RANGE);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return {
                start: parsed.start ? new Date(parsed.start) : null,
                end: parsed.end ? new Date(parsed.end) : null
            };
        } catch {
            // Ignore parse errors
        }
    }
    // Default: today as single day
    const today = new Date();
    return { start: today, end: today };
};

const loadRangeModeFromStorage = (): boolean => {
    const saved = localStorage.getItem(STORAGE_KEY_RANGE_MODE);
    return saved === 'true';
};

const loadFiltersFromStorage = (): AccettazioneFilters => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_FILTERS);
        if (saved) {
            return { ...DEFAULT_FILTERS, ...JSON.parse(saved) };
        }
    } catch {
        // Ignore parse errors
    }
    return DEFAULT_FILTERS;
};

// ============================================
// HOOK
// ============================================

export const useAccettazioneData = (): UseAccettazioneDataReturn => {
    const queryClient = useQueryClient();
    const { tenantFilterKey, isReady } = useTenantFilter();
    const { showToast } = useToast();
    const initializedRef = useRef(false);

    // =====================
    // Daily Reset Check (on mount)
    // =====================
    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            const wasReset = checkDailyReset();
            if (wasReset) {
                // Force re-read from storage after reset
                setSelectedDateState(new Date());
                setDateRangeState({ start: new Date(), end: new Date() });
            }
        }
    }, []);

    // =====================
    // Date State - Supporta sia single date che range
    // =====================
    const [selectedDate, setSelectedDateState] = useState<Date>(loadDateFromStorage);
    const [dateRange, setDateRangeState] = useState<DateRange>(loadDateRangeFromStorage);
    const [isRangeMode, setIsRangeModeState] = useState<boolean>(loadRangeModeFromStorage);

    const isToday = isSameDay(selectedDate, new Date());
    const selectedDateStr = formatDateForApi(selectedDate);

    // Per range mode, formatta entrambe le date
    const rangeStartStr = dateRange.start ? formatDateForApi(dateRange.start) : selectedDateStr;
    const rangeEndStr = dateRange.end ? formatDateForApi(dateRange.end) : rangeStartStr;

    const setSelectedDate = useCallback((date: Date) => {
        setSelectedDateState(date);
        localStorage.setItem(STORAGE_KEY_DATE, date.toISOString());
        // Sync con range (imposta entrambe le date uguali per compatibilità)
        if (!isRangeMode) {
            setDateRangeState({ start: date, end: date });
            localStorage.setItem(STORAGE_KEY_DATE_RANGE, JSON.stringify({
                start: date.toISOString(),
                end: date.toISOString()
            }));
        }
    }, [isRangeMode]);

    const setDateRange = useCallback((range: DateRange) => {
        setDateRangeState(range);
        localStorage.setItem(STORAGE_KEY_DATE_RANGE, JSON.stringify({
            start: range.start?.toISOString() || null,
            end: range.end?.toISOString() || null
        }));
        // Sync selectedDate con start del range
        if (range.start) {
            setSelectedDateState(range.start);
            localStorage.setItem(STORAGE_KEY_DATE, range.start.toISOString());
        }
    }, []);

    const setIsRangeMode = useCallback((isRange: boolean) => {
        setIsRangeModeState(isRange);
        localStorage.setItem(STORAGE_KEY_RANGE_MODE, isRange.toString());
    }, []);

    const goToPreviousDay = useCallback(() => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        setSelectedDate(newDate);
    }, [selectedDate, setSelectedDate]);

    const goToNextDay = useCallback(() => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        setSelectedDate(newDate);
    }, [selectedDate, setSelectedDate]);

    const goToToday = useCallback(() => {
        setSelectedDate(new Date());
        setDateRange({ start: new Date(), end: new Date() });
    }, [setSelectedDate, setDateRange]);

    // =====================
    // Filters State
    // =====================
    const [filters, setFilters] = useState<AccettazioneFilters>(loadFiltersFromStorage);

    // Persist filters to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filters));
    }, [filters]);

    const resetFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
    }, []);

    // =====================
    // Action State
    // =====================
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [canViewOtherMedici, setCanViewOtherMedici] = useState<boolean>(true);

    // =====================
    // Queries
    // =====================

    // Appuntamenti for selected date or range
    const { data: appuntamentiRaw = [], isLoading, refetch } = useQuery({
        queryKey: ['appuntamenti-accettazione', isRangeMode ? `${rangeStartStr}-${rangeEndStr}` : selectedDateStr, tenantFilterKey],
        queryFn: async () => {
            if (isRangeMode && dateRange.start && dateRange.end) {
                // Modalità range: fetch per periodo
                const result = await appuntamentiApi.getByDateRange(rangeStartStr, rangeEndStr);
                return result.data || [];
            } else if (isToday) {
                // Usa il nuovo metodo con meta per avere il flag canViewOtherMedici
                const result = await appuntamentiApi.getTodayWithMeta();
                // Aggiorna il flag dei permessi
                if (result.meta?.canViewOtherMedici !== undefined) {
                    setCanViewOtherMedici(result.meta.canViewOtherMedici);
                }
                return result.data || [];
            } else {
                const result = await appuntamentiApi.getByDate(selectedDateStr);
                return result.data || [];
            }
        },
        refetchInterval: 30000, // Refresh every 30 seconds
        enabled: isReady
    });

    // Medici list
    const { data: mediciData, isLoading: isLoadingMedici } = useQuery({
        queryKey: ['medici-accettazione', tenantFilterKey],
        queryFn: async () => {
            const result = await mediciApi.getAll({ limit: 200 });
            return result.data || [];
        },
        enabled: isReady,
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    // Ambulatori list
    const { data: ambulatoriData, isLoading: isLoadingAmbulatori } = useQuery({
        queryKey: ['ambulatori-accettazione', tenantFilterKey],
        queryFn: async () => {
            const result = await ambulatoriApi.getAll({ limit: 200 });
            return result.data || [];
        },
        enabled: isReady,
        staleTime: 5 * 60 * 1000 // 5 minutes
    });

    const medici = mediciData || [];
    const ambulatori = ambulatoriData || [];

    // =====================
    // Mutations
    // =====================

    const changeStatoMutation = useMutation({
        mutationFn: async ({ id, stato }: { id: string; stato: StatoAppuntamento }) => {
            setLoadingId(id);
            if (stato === 'IN_ATTESA') {
                return appuntamentiApi.accetta(id);
            } else if (stato === 'IN_CORSO') {
                return appuntamentiApi.chiama(id);
            } else {
                return appuntamentiApi.changeStato(id, stato);
            }
        },
        onSuccess: (result, { stato }) => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti-accettazione'] });
            // P54: Avviso se non c'era sessione coda attiva
            if (stato === 'IN_ATTESA' && result && typeof result === 'object' && 'noActiveQueueSession' in result && result.noActiveQueueSession) {
                showToast({
                    message: 'Check-in completato. Nessuna sessione coda attiva: numero non assegnato.',
                    type: 'warning',
                    duration: 5000
                });
            } else {
                const messages: Record<string, string> = {
                    'IN_ATTESA': 'Check-in completato',
                    'IN_CORSO': 'Paziente chiamato',
                    'COMPLETATO': 'Visita completata',
                    'NO_SHOW': 'Paziente segnato come non presentato'
                };
                showToast({ message: messages[stato] || 'Stato aggiornato', type: 'success' });
            }
        },
        onError: () => {
            showToast({ message: 'Errore nel cambio stato', type: 'error' });
        },
        onSettled: () => {
            setLoadingId(null);
        }
    });

    // =====================
    // Action Handlers
    // =====================

    const changeStato = useCallback((id: string, stato: StatoAppuntamento) => {
        changeStatoMutation.mutate({ id, stato });
    }, [changeStatoMutation]);

    const checkIn = useCallback((id: string) => {
        changeStato(id, 'IN_ATTESA');
    }, [changeStato]);

    const chiama = useCallback((id: string) => {
        changeStato(id, 'IN_CORSO');
    }, [changeStato]);

    const completa = useCallback((id: string) => {
        changeStato(id, 'COMPLETATO');
    }, [changeStato]);

    const noShow = useCallback((id: string) => {
        changeStato(id, 'NO_SHOW');
    }, [changeStato]);

    // =====================
    // Filtered & Grouped Data
    // =====================

    const { appuntamenti, groupedAppuntamenti, stats } = useMemo(() => {
        let filtered = [...appuntamentiRaw];

        // Apply search filter
        if (filters.search) {
            const term = filters.search.toLowerCase();
            filtered = filtered.filter(a => {
                const pazNome = getPersonDisplayName(a.paziente, '').toLowerCase();
                return pazNome.includes(term) ||
                    a.numero?.toLowerCase().includes(term) ||
                    a.numeroCoda?.toString().includes(term);
            });
        }

        // Apply medico filter
        if (filters.medicoId) {
            filtered = filtered.filter(a => a.medicoId === filters.medicoId);
        }

        // Apply ambulatorio filter
        if (filters.ambulatorioId) {
            filtered = filtered.filter(a => a.ambulatorioId === filters.ambulatorioId);
        }

        // Apply stato filter
        if (filters.stato !== 'tutti') {
            switch (filters.stato) {
                case 'da_accettare':
                    filtered = filtered.filter(a => STATI_DA_ACCETTARE.includes(a.stato));
                    break;
                case 'in_attesa':
                    filtered = filtered.filter(a => a.stato === 'IN_ATTESA');
                    break;
                case 'in_corso':
                    filtered = filtered.filter(a => a.stato === 'IN_CORSO');
                    break;
                case 'completati':
                    filtered = filtered.filter(a => a.stato === 'COMPLETATO');
                    break;
            }
        }

        // Sort chronologically
        const sorted = filtered.sort((a, b) =>
            new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime()
        );

        // Group by stato
        const grouped: GroupedAppuntamenti = {
            daAccettare: sorted.filter(a => STATI_DA_ACCETTARE.includes(a.stato)),
            inAttesa: sorted.filter(a => a.stato === 'IN_ATTESA'),
            inCorso: sorted.filter(a => a.stato === 'IN_CORSO'),
            completati: sorted.filter(a => a.stato === 'COMPLETATO')
        };

        // Calculate stats from all data (before filters except stato)
        const allData: Appuntamento[] = appuntamentiRaw;
        const calculatedStats: AccettazioneStats = {
            totale: allData.length,
            daAccettare: allData.filter((a: Appuntamento) => STATI_DA_ACCETTARE.includes(a.stato)).length,
            inAttesa: allData.filter((a: Appuntamento) => a.stato === 'IN_ATTESA').length,
            inCorso: allData.filter((a: Appuntamento) => a.stato === 'IN_CORSO').length,
            completati: allData.filter((a: Appuntamento) => a.stato === 'COMPLETATO').length,
            noShow: allData.filter((a: Appuntamento) => a.stato === 'NO_SHOW').length
        };

        return {
            appuntamenti: sorted,
            groupedAppuntamenti: grouped,
            stats: calculatedStats
        };
    }, [appuntamentiRaw, filters]);

    return {
        // Data
        appuntamenti,
        groupedAppuntamenti,
        medici,
        ambulatori,
        stats,

        // Loading states
        isLoading,
        isLoadingMedici,
        isLoadingAmbulatori,

        // Date management - supporta sia single date che range
        selectedDate,
        setSelectedDate,
        dateRange,
        setDateRange,
        isRangeMode,
        setIsRangeMode,
        isToday,
        goToPreviousDay,
        goToNextDay,
        goToToday,

        // Filters
        filters,
        setFilters,
        resetFilters,

        // Permissions - per il dropdown medici
        canViewOtherMedici,

        // Actions
        loadingId,
        changeStato,
        checkIn,
        chiama,
        completa,
        noShow,
        refetch
    };
};

export default useAccettazioneData;
