/**
 * Calendar Module - useCalendarState Hook
 * 
 * Hook per gestione stato UI calendario.
 * Centralizza stati filtri, viste e preferenze utente.
 * 
 * @module pages/clinica/agenda/hooks/useCalendarState
 */

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ViewType, ZoomMode, ColorMode, CalendarSettings } from '../types';
import { TIME_PRESETS, CALENDAR_SETTINGS_KEY } from '../constants';

interface UseCalendarStateResult {
    // View state
    view: ViewType;
    setView: (view: ViewType) => void;
    currentDate: Date;
    setCurrentDate: (date: Date) => void;

    // Zoom state
    viewStartHour: number;
    viewEndHour: number;
    setViewStartHour: (hour: number) => void;
    setViewEndHour: (hour: number) => void;
    zoomMode: ZoomMode;
    setZoomMode: (mode: ZoomMode) => void;
    applyTimePreset: (preset: keyof typeof TIME_PRESETS) => void;

    // Filter state
    selectedAmbulatori: string[];
    setSelectedAmbulatori: (ids: string[]) => void;
    filterMedici: string[];
    setFilterMedici: (ids: string[]) => void;
    selectedDays: number[];
    setSelectedDays: (days: number[]) => void;
    colorMode: ColorMode;
    setColorMode: (mode: ColorMode) => void;

    // Calendar selection
    selectedDates: Date[];
    setSelectedDates: (dates: Date[]) => void;
    calendarMonth: Date;
    setCalendarMonth: (date: Date) => void;

    // Display options
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    showOnlyAvailability: boolean;
    setShowOnlyAvailability: (show: boolean) => void;
    showAllSlotsGray: boolean;
    setShowAllSlotsGray: (show: boolean) => void;

    // Persistence
    saveSettings: () => void;
    resetSettings: () => void;
}

/**
 * Carica impostazioni salvate da localStorage
 */
const loadSavedSettings = (): CalendarSettings => {
    try {
        const saved = localStorage.getItem(CALENDAR_SETTINGS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Parse selectedDates from ISO strings back to Date objects
            if (parsed.selectedDates && Array.isArray(parsed.selectedDates)) {
                parsed.selectedDates = parsed.selectedDates.map((d: string) => new Date(d));
            }
            return parsed as CalendarSettings;
        }
    } catch (e) {
    }

    // Default settings
    return {
        viewStartHour: TIME_PRESETS.giornata.start,
        viewEndHour: TIME_PRESETS.giornata.end,
        zoomMode: 'fixed',
        selectedDays: [1, 2, 3, 4, 5], // Mon-Fri
        selectedAmbulatori: [],
        filterMedici: [],
        selectedDates: [],
        showOnlyAvailability: false,
        showAllSlotsGray: false,
        colorMode: 'medico'
    };
};

/**
 * Genera date default per la settimana corrente (Lun-Ven)
 */
const getDefaultWeekDates = (): Date[] => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday

    const dates: Date[] = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        dates.push(d);
    }
    return dates;
};

/**
 * Hook per gestire lo stato del calendario
 */
export const useCalendarState = (): UseCalendarStateResult => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Carica settings salvate
    const savedSettings = loadSavedSettings();

    // View state
    const [view, setViewInternal] = useState<ViewType>(() =>
        (searchParams.get('view') as ViewType) || 'week'
    );
    const [currentDate, setCurrentDate] = useState(() => {
        const dateParam = searchParams.get('date');
        return dateParam ? new Date(dateParam) : new Date();
    });

    // Zoom state
    const [viewStartHour, setViewStartHour] = useState(savedSettings.viewStartHour);
    const [viewEndHour, setViewEndHour] = useState(savedSettings.viewEndHour);
    const [zoomMode, setZoomMode] = useState<ZoomMode>(savedSettings.zoomMode);

    // Filter state
    const [selectedAmbulatori, setSelectedAmbulatori] = useState<string[]>(
        savedSettings.selectedAmbulatori
    );
    const [filterMedici, setFilterMedici] = useState<string[]>(savedSettings.filterMedici);
    const [selectedDays, setSelectedDays] = useState<number[]>(savedSettings.selectedDays);
    const [colorMode, setColorMode] = useState<ColorMode>(savedSettings.colorMode || 'medico');

    // Calendar selection
    const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
        if (savedSettings.selectedDates && savedSettings.selectedDates.length > 0) {
            return savedSettings.selectedDates;
        }
        return getDefaultWeekDates();
    });
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());

    // Display options
    const [showFilters, setShowFilters] = useState(true);
    const [showOnlyAvailability, setShowOnlyAvailability] = useState(
        savedSettings.showOnlyAvailability
    );
    const [showAllSlotsGray, setShowAllSlotsGray] = useState(savedSettings.showAllSlotsGray);

    // Update URL when view changes
    const setView = useCallback((newView: ViewType) => {
        setViewInternal(newView);
        setSearchParams(prev => {
            prev.set('view', newView);
            return prev;
        });
    }, [setSearchParams]);

    // Apply time preset
    const applyTimePreset = useCallback((preset: keyof typeof TIME_PRESETS) => {
        const p = TIME_PRESETS[preset];
        setViewStartHour(p.start);
        setViewEndHour(p.end);
    }, []);

    // Save settings to localStorage
    const saveSettings = useCallback(() => {
        try {
            localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify({
                viewStartHour,
                viewEndHour,
                zoomMode,
                selectedDays,
                selectedAmbulatori,
                filterMedici,
                selectedDates: selectedDates.map(d => d.toISOString()),
                showOnlyAvailability,
                showAllSlotsGray,
                colorMode
            }));
        } catch (e) {
        }
    }, [
        viewStartHour, viewEndHour, zoomMode, selectedDays,
        selectedAmbulatori, filterMedici, selectedDates,
        showOnlyAvailability, showAllSlotsGray, colorMode
    ]);

    // Auto-save when settings change
    useEffect(() => {
        saveSettings();
    }, [saveSettings]);

    // Reset to defaults
    const resetSettings = useCallback(() => {
        setViewStartHour(TIME_PRESETS.giornata.start);
        setViewEndHour(TIME_PRESETS.giornata.end);
        setZoomMode('fixed');
        setSelectedDays([1, 2, 3, 4, 5]);
        setSelectedAmbulatori([]);
        setFilterMedici([]);
        setSelectedDates(getDefaultWeekDates());
        setShowOnlyAvailability(false);
        setShowAllSlotsGray(false);
        setColorMode('medico');

        localStorage.removeItem(CALENDAR_SETTINGS_KEY);
    }, []);

    return {
        // View
        view,
        setView,
        currentDate,
        setCurrentDate,

        // Zoom
        viewStartHour,
        viewEndHour,
        setViewStartHour,
        setViewEndHour,
        zoomMode,
        setZoomMode,
        applyTimePreset,

        // Filters
        selectedAmbulatori,
        setSelectedAmbulatori,
        filterMedici,
        setFilterMedici,
        selectedDays,
        setSelectedDays,
        colorMode,
        setColorMode,

        // Calendar selection
        selectedDates,
        setSelectedDates,
        calendarMonth,
        setCalendarMonth,

        // Display
        showFilters,
        setShowFilters,
        showOnlyAvailability,
        setShowOnlyAvailability,
        showAllSlotsGray,
        setShowAllSlotsGray,

        // Persistence
        saveSettings,
        resetSettings
    };
};

export default useCalendarState;
