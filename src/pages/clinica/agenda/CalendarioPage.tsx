/**
 * CalendarioPage - Calendario avanzato con gestione disponibilità e appuntamenti
 * 
 * Funzionalità:
 * - Vista settimana e giorno con tutti gli ambulatori
 * - Drag per definire disponibilità medici (blocchi colorati)
 * - Click su disponibilità per aggiungere appuntamenti pazienti
 * - Filtri per ambulatori, medici e giorni
 * - Legenda colori per medici e stati
 * 
 * @module pages/poliambulatorio/agenda/CalendarioPage
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    Plus,
    Filter,
    Clock,
    Users,
    Building2,
    RefreshCw,
    X,
    Check,
    AlertTriangle,
    Grid,
    List,
    Eye,
    Search,
    User,
    MapPin,
    Edit,
    Save,
    Trash2
} from 'lucide-react';
import {
    appuntamentiApi,
    ambulatoriApi,
    mediciApi,
    slotsApi,
    sediApi,
    SlotDisponibilita,
    StatoAppuntamento,
    Appuntamento,
    Ambulatorio,
    Medico,
    Paziente,
    visiteApi
} from '../../../services/clinicaApi';
import { formatDate, toISODateString } from '../../../utils/dateUtils';
import { apiGet } from '../../../services/api';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useAuth } from '../../../context/AuthContext';
import { useRoleGuard } from '../../../hooks/useRoleGuard';
import { getDoctorTitle } from '../../../utils/codiceFiscale';
import { useToast } from '../../../hooks/useToast';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import { useDailyReset } from '../../../hooks/useDailyReset';
import ElegantSelect from '../../../components/ui/ElegantSelect';

// Modular calendar components
import {
    AppointmentBookingModal,
    AvailabilitySlotModal,
    EditDisponibilitaModal,
    AppointmentDetailModal,
    AmbulatorioOverviewPanel,
    QueueSessionModal,
    BulkQueueCreateModal
} from './components/modals';

// Patient acceptance modal
import { AccettazionePazienteModal } from './components/AccettazionePazienteModal';

// Block components
import {
    DisponibilitaBlock,
    AppuntamentoBlock,
    DragPreview,
    DropPreview
} from './components/blocks';

// Grid components
import {
    TimeColumn,
    DayColumn
} from './components/grid';

// Panel components
import {
    FilterPanel,
    MiniCalendar
} from './components/panels';

// Types from centralized module
import type {
    CalendarEvent,
    DragState,
    DragItem,
    ViewType,
    ZoomMode,
    ColorScheme
} from './types';

// Constants from centralized module
import {
    HOUR_HEIGHT,
    FIVE_MIN_HEIGHT,
    MIN_COLUMN_WIDTH,
    TIME_COLUMN_WIDTH,
    MAX_RECOMMENDED_COLUMNS,
    DEFAULT_START_HOUR,
    DEFAULT_END_HOUR,
    TIME_PRESETS,
    DAYS_OF_WEEK,
    MONTHS,
    STATO_COLORS,
    MEDICO_COLORS,
    CALENDAR_SETTINGS_KEY
} from './constants';

// Utilities from centralized module
import {
    isSameDay,
    getWeekDates
} from './utils/dateUtils';

// Hook for sede closures
import { useSedeClosures } from './hooks/useSedeClosures';
import queueApi from '@/services/queueApi';

// NOTE: Types (TimeSlot, OverbookingColumn, ColorMode) imported from ./types

// NOTE: Utility functions imported from ./utils:
// - isSameDay, getWeekDates from ./utils/dateUtils

// Local utility: minutesToTime (HH:MM format)
const minutesToTime = (minutes: number): string => {
    const totalMinutes = Math.round(minutes);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// ============================================
// MAIN COMPONENT
// ============================================

export const CalendarioPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { showToast } = useToast();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // Daily reset hook - resets selectedDates to current week on first access of the day
    const dailyReset = useDailyReset({
        storageKey: CALENDAR_SETTINGS_KEY,
        lastAccessKey: 'calendario-last-access',
        mode: 'week-start'
    });

    // Helper to get current week dates (Mon-Fri)
    const getCurrentWeekDates = useCallback(() => {
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
    }, []);

    // Load saved settings from localStorage
    const loadSavedSettings = useCallback(() => {
        try {
            const saved = localStorage.getItem(CALENDAR_SETTINGS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Parse selectedDates from ISO strings back to Date objects
                if (parsed.selectedDates && Array.isArray(parsed.selectedDates)) {
                    parsed.selectedDates = parsed.selectedDates.map((d: string) => new Date(d));
                }
                return parsed;
            }
        } catch (e) {
        }
        // Default settings: giornata (7-21), adatta (fixed), Mon-Fri, all doctors
        return {
            viewStartHour: TIME_PRESETS.giornata.start,
            viewEndHour: TIME_PRESETS.giornata.end,
            zoomMode: 'fixed' as ZoomMode,
            selectedDays: [1, 2, 3, 4, 5], // Mon-Fri default
            selectedAmbulatori: null as string[] | null, // null = all ambulatori
            filterMedici: [] as string[], // empty = no filter (show all)
            selectedDates: null as Date[] | null, // null = use default week
            showOnlyAvailability: false,
            showAllSlotsGray: false,
            selectedSedeId: null as string | null
        };
    }, []);

    // State
    const [currentDate, setCurrentDate] = useState(() => {
        const dateParam = searchParams.get('date');
        return dateParam ? new Date(dateParam) : new Date();
    });
    const [view, setView] = useState<ViewType>(() =>
        (searchParams.get('view') as ViewType) || 'week'
    );
    const [showFilters, setShowFilters] = useState(true);
    const [showAmbulatorioOverview, setShowAmbulatorioOverview] = useState(false);

    // Initialize filter states with saved values
    const savedSettings = loadSavedSettings();
    const [selectedAmbulatori, setSelectedAmbulatori] = useState<string[]>(savedSettings.selectedAmbulatori || []);
    const [ambulatoriInitialized, setAmbulatoriInitialized] = useState(savedSettings.selectedAmbulatori !== null);
    const [selectedMedico, setSelectedMedico] = useState<string | null>(null);
    const [filterMedici, setFilterMedici] = useState<string[]>(savedSettings.filterMedici || []); // Multi-select filter for viewing doctors
    const [selectedDays, setSelectedDays] = useState<number[]>(savedSettings.selectedDays || [1, 2, 3, 4, 5]); // Mon-Fri default

    // New feature states
    const [showOnlyAvailability, setShowOnlyAvailability] = useState<boolean>(savedSettings.showOnlyAvailability || false); // Filter to show only columns with availability
    const [showAllSlotsGray, setShowAllSlotsGray] = useState<boolean>(savedSettings.showAllSlotsGray || false); // Show all slots in gray even if medico not selected

    // Sede filter state - filter ambulatori by sede and show closed hours/days in gray
    const [selectedSedeId, setSelectedSedeId] = useState<string | null>(savedSettings.selectedSedeId || null);

    // Zoom/view state - control time range visibility (with localStorage persistence)
    const [viewStartHour, setViewStartHour] = useState(savedSettings.viewStartHour);
    const [viewEndHour, setViewEndHour] = useState(savedSettings.viewEndHour);
    const [zoomMode, setZoomMode] = useState<ZoomMode>(savedSettings.zoomMode);
    const [containerHeight, setContainerHeight] = useState<number>(600); // Default container height for "Adatta" mode
    const [headerHeight, setHeaderHeight] = useState<number>(90); // Dynamic header height measurement
    const [containerMounted, setContainerMounted] = useState(false); // Track if container has been measured
    const containerRef = React.useRef<HTMLDivElement>(null);
    const headerRef = React.useRef<HTMLDivElement>(null); // Ref to measure header height for "Adatta" mode
    const calendarScrollRef = React.useRef<HTMLDivElement>(null); // Ref for horizontal scroll with mouse wheel

    // Mini calendar state - dates selected for viewing (restored from localStorage)
    // Daily reset: if first access of the day, reset to current week
    const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
        // Check if this is the first access of the day
        if (dailyReset.isFirstAccessToday()) {
            // Reset to current week - the hook will mark today as accessed
            return getCurrentWeekDates();
        }
        // Try to load from savedSettings first
        if (savedSettings.selectedDates && Array.isArray(savedSettings.selectedDates) && savedSettings.selectedDates.length > 0) {
            return savedSettings.selectedDates;
        }
        // Default to current week Mon-Fri
        return getCurrentWeekDates();
    });
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());

    // Mark today's access on mount (for daily reset tracking)
    useEffect(() => {
        dailyReset.markTodayAccess();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount — daily access tracking is one-time per session

    // Save settings to localStorage when they change
    useEffect(() => {
        try {
            localStorage.setItem(CALENDAR_SETTINGS_KEY, JSON.stringify({
                viewStartHour,
                viewEndHour,
                zoomMode,
                selectedDays,
                selectedAmbulatori: ambulatoriInitialized ? selectedAmbulatori : null,
                filterMedici,
                selectedDates: selectedDates.map(d => d.toISOString()),
                showOnlyAvailability,
                showAllSlotsGray,
                selectedSedeId
            }));
        } catch (e) {
        }
    }, [viewStartHour, viewEndHour, zoomMode, selectedDays, selectedAmbulatori, filterMedici, ambulatoriInitialized, selectedDates, showOnlyAvailability, showAllSlotsGray, selectedSedeId]);

    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        startHour: null,
        startDay: null,
        endHour: null,
        ambulatorioId: null
    });
    const [quickAddInfo, setQuickAddInfo] = useState<{ date: Date; hour: number; ambulatorioId: string; isOverbooking?: boolean; existingCount?: number } | null>(null);
    // Layout fisso "per ambulatorio": il toggle Ambulatorio/Medico (non funzionante) è stato rimosso.
    const [calendarLayoutMode] = useState<'ambulatorio' | 'medico'>('ambulatorio');
    const [availabilityModalInfo, setAvailabilityModalInfo] = useState<{ date: Date; startHour: number; endHour: number; ambulatorioId: string; medicoId?: string; ambulatori?: Ambulatorio[] } | null>(null);
    const [draggingEvent, setDraggingEvent] = useState<DragItem | null>(null);
    // Appuntamento selezionato per modifica (apre il booking modal in edit mode)
    const [editingAppointment, setEditingAppointment] = useState<CalendarEvent | null>(null);
    // Disponibilità selezionata per modifica
    const [editingDisponibilita, setEditingDisponibilita] = useState<CalendarEvent | null>(null);
    // Conferma eliminazione disponibilità - P68: stores slot info for cascade check
    const [deleteDisponibilitaInfo, setDeleteDisponibilitaInfo] = useState<{ id: string; hasPattern: boolean } | null>(null);
    // Slot disponibilità per gestione coda
    const [queueSlot, setQueueSlot] = useState<CalendarEvent | null>(null);
    // Bulk create queue sessions modal
    const [showBulkQueueModal, setShowBulkQueueModal] = useState(false);
    // Conferma spostamento disponibilità con appuntamenti
    const [moveDisponibilitaConfirm, setMoveDisponibilitaConfirm] = useState<{
        disponibilita: CalendarEvent;
        targetDate: Date;
        targetAmbulatorioId: string;
        targetHour: number;
        appointmentsToMove: CalendarEvent[];
    } | null>(null);

    // Accettazione paziente (check-in) modal
    const [accettazioneAppuntamento, setAccettazioneAppuntamento] = useState<CalendarEvent | null>(null);
    const [accettazioneInitialTab, setAccettazioneInitialTab] = useState<'anagrafica' | 'residenza' | 'appuntamento' | 'fatturazione'>('anagrafica');

    // Conferma eliminazione appuntamento (P72_11: con warning movimenti DA_FATTURARE)
    const [appuntamentoDaEliminare, setAppuntamentoDaEliminare] = useState<{ id: string; isCompletato: boolean } | null>(null);

    // Conferma visita paziente quando medico diverso
    const [visitaMedicoConfirm, setVisitaMedicoConfirm] = useState<{
        event: CalendarEvent;
        visitaId: string;
        medicoAssegnato: { id: string; firstName: string; lastName: string };
        medicoCorrente: { id: string; firstName: string; lastName: string };
    } | null>(null);

    // Get current user for doctor comparison
    const { user, hasPermission } = useAuth();
    const { isMedico, isMedicoCompetente } = useRoleGuard();
    const currentMedicoId = isMedico && !isMedicoCompetente ? user?.id : undefined;
    const canViewOtherAppointments =
        hasPermission('clinica.appuntamenti', 'view_others') ||
        hasPermission('clinica.appuntamenti', 'view_others_same_branch') ||
        hasPermission('clinica.appuntamenti', 'view_others_all') ||
        hasPermission('clinica.appuntamenti', 'create_others') ||
        hasPermission('clinica.appuntamenti', 'edit_others');
    const canCreateForOtherMedici = hasPermission('clinica.appuntamenti', 'create_others');
    const canEditOtherAppointments = hasPermission('clinica.appuntamenti', 'edit_others');
    const restrictCalendarToCurrentMedico = !!currentMedicoId && !canViewOtherAppointments;

    // Auto-refresh: pause when any modal/dialog is open to avoid disrupting user interaction
    const isAnyModalOpen = !!(quickAddInfo || availabilityModalInfo || editingAppointment
        || editingDisponibilita || deleteDisponibilitaInfo || queueSlot || showBulkQueueModal
        || moveDisponibilitaConfirm || accettazioneAppuntamento || visitaMedicoConfirm
        || appuntamentoDaEliminare);

    // Queries
    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-calendario', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            return ambulatoriApi.getAll({
                limit: 100,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    const { data: mediciData } = useQuery({
        queryKey: ['medici-calendario', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            return mediciApi.getAll({
                limit: 100,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    const visibleMedici = useMemo(() => {
        return mediciData?.data || [];
    }, [mediciData]);

    const ownMedici = useMemo(() => {
        if (!currentMedicoId) return visibleMedici;
        return visibleMedici.filter(m => m.id === currentMedicoId || m.personId === currentMedicoId);
    }, [visibleMedici, currentMedicoId]);

    const manageableMedici = useMemo(
        () => currentMedicoId && !canCreateForOtherMedici && !canEditOtherAppointments ? ownMedici : visibleMedici,
        [currentMedicoId, canCreateForOtherMedici, canEditOtherAppointments, ownMedici, visibleMedici]
    );

    const ownMedicoIds = useMemo(() => {
        const ids = new Set<string>();
        ownMedici.forEach(m => {
            ids.add(m.id);
            if (m.personId) ids.add(m.personId);
        });
        return ids;
    }, [ownMedici]);

    // Query sedi con orari settimanali per filtro e visualizzazione grigio
    const { data: sediData } = useQuery({
        queryKey: ['sedi-calendario', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            return sediApi.getAll({
                limit: 100,
                isAttiva: true,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isReady
    });

    // Auto-select all ambulatori when data loads (first time) and auto-add any newly-created ones
    useEffect(() => {
        if (!ambulatoriData?.data || ambulatoriData.data.length === 0) return;
        if (!ambulatoriInitialized) {
            setSelectedAmbulatori(ambulatoriData.data.map(a => a.id));
            setAmbulatoriInitialized(true);
        } else {
            // Auto-include ambulatories created after the saved settings (not in current selection)
            setSelectedAmbulatori(prev => {
                const newIds = ambulatoriData.data
                    .filter(a => !prev.includes(a.id))
                    .map(a => a.id);
                if (newIds.length === 0) return prev;
                return [...prev, ...newIds];
            });
        }
    }, [ambulatoriData, ambulatoriInitialized]);

    // Auto-select all medici when data loads (first time only, unless saved settings exist)
    // Also auto-add any newly-created medici not in filterMedici
    const [mediciInitialized, setMediciInitialized] = useState(savedSettings.filterMedici && savedSettings.filterMedici.length > 0);
    useEffect(() => {
        if (visibleMedici.length === 0) return;
        if (!mediciInitialized) {
            setFilterMedici(visibleMedici.map(m => m.id));
            if (currentMedicoId && ownMedici[0]) setSelectedMedico(ownMedici[0].id);
            setMediciInitialized(true);
        } else {
            // Auto-include medici added after saved settings
            setFilterMedici(prev => {
                const newIds = visibleMedici
                    .filter(m => !prev.includes(m.id))
                    .map(m => m.id);
                const allowedPrev = prev.filter(id => visibleMedici.some(m => m.id === id));
                if (newIds.length === 0) return allowedPrev;
                return [...allowedPrev, ...newIds];
            });
        }
    }, [visibleMedici, ownMedici, mediciInitialized, currentMedicoId]);

    // Auto-select sede principale (or first sede) when data loads
    // This ensures closed hours/days are shown in calendar by default
    useEffect(() => {
        if (sediData?.data && sediData.data.length > 0 && !selectedSedeId) {
            // Prefer sede principale, otherwise first sede
            const sedePrincipale = sediData.data.find(s => s.isPrincipale);
            const sedeToSelect = sedePrincipale || sediData.data[0];
            if (sedeToSelect) {
                setSelectedSedeId(sedeToSelect.id);
            }
        }
    }, [sediData, selectedSedeId]);

    const handleSedeChange = useCallback((value: string) => {
        const nextSedeId = value || null;
        setSelectedSedeId(nextSedeId);
        const allAmbulatori = ambulatoriData?.data || [];
        const scopedAmbulatori = nextSedeId
            ? allAmbulatori.filter(ambulatorio => ambulatorio.sedeId === nextSedeId)
            : allAmbulatori;
        setSelectedAmbulatori((scopedAmbulatori.length > 0 ? scopedAmbulatori : allAmbulatori).map(ambulatorio => ambulatorio.id));
        setAmbulatoriInitialized(true);
    }, [ambulatoriData]);

    // Calculate date range for queries - based ONLY on selectedDates
    // The calendar shows only the days explicitly selected in the mini calendar.
    //
    // IMPORTANT: the fetch range is padded by ±1 day around min/max selected dates.
    // The query date strings (YYYY-MM-DD) go through several timezone conversions
    // (local → ISO date → backend parseToStartOfDay/parseToEndOfDay), and an appointment
    // sitting near a boundary day could be excluded by a UTC vs local edge.
    // Padding guarantees the appointment is always fetched; the per-column render below
    // still places each event precisely with isSameDay(), so the extra days never render.
    const dateRange = useMemo(() => {
        const baseStart = new Date();
        const baseEnd = new Date();
        if (selectedDates.length > 0) {
            const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
            baseStart.setTime(sortedDates[0].getTime());
            baseEnd.setTime(sortedDates[sortedDates.length - 1].getTime());
        }

        const start = new Date(baseStart);
        start.setDate(start.getDate() - 1); // pad one day before
        start.setHours(0, 0, 0, 0);
        const end = new Date(baseEnd);
        end.setDate(end.getDate() + 1); // pad one day after
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }, [selectedDates]);

    // Query: Appointments
    const { data: appuntamentiData, isLoading: loadingAppuntamenti } = useQuery({
        queryKey: ['appuntamenti-calendario', toISODateString(dateRange.start), toISODateString(dateRange.end), tenantFilterKey, restrictCalendarToCurrentMedico ? currentMedicoId : 'all-visible'],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            const dataInizio = toISODateString(dateRange.start);
            const dataFine = toISODateString(dateRange.end);
            return appuntamentiApi.getAll({
                limit: 1000,
                dataInizio,
                dataFine,
                ...(restrictCalendarToCurrentMedico && { medicoId: currentMedicoId }),
                // Multi-tenant params at top level
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' }),
                filters: {
                    dataInizio,
                    dataFine,
                    ...(restrictCalendarToCurrentMedico && { medicoId: currentMedicoId })
                }
            });
        },
        enabled: isReady,
        // Auto-refresh every 30s unless a modal is open (prevents data shifts under forms)
        refetchInterval: isAnyModalOpen ? false : 30000
    });

    // Query: Disponibilità (slots)
    const { data: slotsData, isLoading: loadingSlots } = useQuery({
        queryKey: ['slots-calendario', toISODateString(dateRange.start), toISODateString(dateRange.end), tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            // Use toISODateString (local date format) to avoid timezone issues
            // toISOString() converts to UTC which can shift the date by 1 day in UTC+X timezones
            return slotsApi.getAll({
                limit: 1000,
                // Multi-tenant params at top level (not inside filters)
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' }),
                filters: {
                    dataInizio: toISODateString(dateRange.start),
                    dataFine: toISODateString(dateRange.end),
                    disponibile: 'true'
                }
            });
        },
        enabled: isReady,
        // Auto-refresh every 30s unless a modal is open
        refetchInterval: isAnyModalOpen ? false : 30000
    });

    // Mutations
    const createSlotMutation = useMutation({
        mutationFn: (data: Partial<SlotDisponibilita>) => slotsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['slots-calendario'] });
            showToast({ message: 'Disponibilità creata con successo', type: 'success' });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const deleteSlotMutation = useMutation({
        mutationFn: (id: string) => slotsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['slots-calendario'] });
            showToast({ message: 'Disponibilità eliminata', type: 'success' });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    // P68: Cascade delete mutation (deletes all future slots from same pattern)
    const cascadeDeleteSlotMutation = useMutation({
        mutationFn: (id: string) => slotsApi.deleteCascade(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['slots-calendario'] });
            showToast({ message: `Eliminati ${data.deletedSlots || 0} slot ricorrenti`, type: 'success' });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    // Update mutations for drag & drop
    const updateSlotMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<SlotDisponibilita> }) => slotsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['slots-calendario'] });
            showToast({ message: 'Disponibilità spostata con successo', type: 'success' });
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore nello spostamento', type: 'error' });
        }
    });

    const updateAppuntamentoMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Appuntamento> }) => appuntamentiApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'] });
            // Toast is handled per-call to avoid duplicates
        },
        onError: (error: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    // P72_11: DELETE appuntamento — usa endpoint DELETE (soft-delete + annulla movimenti + libera scadenze)
    const deleteAppuntamentoMutation = useMutation({
        mutationFn: (id: string) => appuntamentiApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'] });
        },
        onError: () => {
            showToast({ message: 'Errore durante l\'eliminazione dell\'appuntamento', type: 'error' });
        }
    });

    // Handler per cambio stato appuntamento dalla tooltip
    const handleUpdateStato = useCallback(async (id: string, stato: string) => {
        await appuntamentiApi.changeStato(id, stato as Appuntamento['stato']);
        queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'] });
        showToast({ message: 'Stato aggiornato', type: 'success' });
    }, [queryClient, showToast]);

    // Assign colors to medici
    const medicoColors = useMemo(() => {
        const map = new Map<string, typeof MEDICO_COLORS[0]>();
        visibleMedici.forEach((medico, i) => {
            map.set(medico.id, MEDICO_COLORS[i % MEDICO_COLORS.length]);
        });
        return map;
    }, [visibleMedici]);

    // Get color for a slot — la colorazione è sempre per medico (toggle colore rimosso)
    const getSlotColor = useCallback((medicoId?: string, _ambulatorioId?: string) => {
        return medicoColors.get(medicoId || '') || MEDICO_COLORS[0];
    }, [medicoColors]);

    // Transform data to calendar events
    const events = useMemo(() => {
        const disponibilita: CalendarEvent[] = (slotsData?.data || []).flatMap(slot => {
            if (!slot.oraInizio || !slot.oraFine) {
                if (import.meta.env.DEV) {
                    console.error('[CalendarioPage] Slot with missing oraInizio/oraFine skipped:', slot?.id, slot?.data);
                }
                return [];
            }
            const date = new Date(slot.data);
            const [startH, startM] = slot.oraInizio.split(':').map(Number);
            const [endH, endM] = slot.oraFine.split(':').map(Number);
            const start = new Date(date);
            start.setHours(startH, startM, 0, 0);
            const end = new Date(date);
            end.setHours(endH, endM, 0, 0);

            const medico = visibleMedici.find(m => m.id === slot.medicoId);
            const medicoFullName = medico
                ? `${getDoctorTitle(medico.taxCode || null, medico.gender || null)} ${medico.lastName || ''} ${medico.firstName || ''}`.trim()
                : 'Medico';

            return [{
                id: slot.id,
                title: 'Disponibilità',
                start,
                end,
                tipo: 'disponibilita' as const,
                medicoId: slot.medicoId,
                medicoNome: medicoFullName,
                ambulatorioId: slot.ambulatorioId,
                raw: slot
            }];
        });

        // Filter out ANNULLATO appointments - they should not appear on calendar
        const activeAppuntamenti = (appuntamentiData?.data || []).filter(app => app.stato !== 'ANNULLATO');

        const appuntamenti: CalendarEvent[] = activeAppuntamenti.flatMap(app => {
            // Use actual visit times (oraInizio/oraFine) when available (completed visits),
            // otherwise fall back to booking time + duration
            const bookingStart = new Date(app.dataOra);
            const start = app.oraInizio ? new Date(app.oraInizio) : bookingStart;
            const duration = app.durataMinuti > 0 ? app.durataMinuti : 30;
            const end = app.oraFine
                ? new Date(app.oraFine)
                : new Date(start.getTime() + duration * 60000);

            // Build paziente name from API fields
            const pazienteNome = app.paziente
                ? `${app.paziente.lastName || ''} ${app.paziente.firstName || ''}`.trim()
                : undefined;

            // Get medico name for tooltip
            if (restrictCalendarToCurrentMedico && app.medicoId !== currentMedicoId && (app as any).medico?.personId !== currentMedicoId) return [];
            const appMedico = visibleMedici.find(m => m.id === app.medicoId);
            const appMedicoFullName = appMedico
                ? `${getDoctorTitle(appMedico.taxCode || null, appMedico.gender || null)} ${appMedico.lastName || ''} ${appMedico.firstName || ''}`.trim()
                : undefined;

            // Get price info from prestazione and convenzione
            const rawApp = app as Appuntamento & {
                prestazione?: { prezzoBase?: number; durataPrevista?: number };
                convenzione?: {
                    id: string;
                    nome: string;
                    codice: string;
                    condizioni?: {
                        percentualeSconto?: number;
                        scontoFisso?: number;
                        codiceSconto?: string;
                        scontoInfo?: { tipo: string; valore: number };
                    };
                }
            };
            const prezzoBase = rawApp.prestazione?.prezzoBase ? Number(rawApp.prestazione.prezzoBase) : undefined;
            // P72_10: Priorità aggiornata for tooltip calcolo costi aziendali completi:
            //           1. totale movimenti ENTRATA (somma reale main + accertamenti = costo totale azienda)
            //           2. prezzo tariffario contrattuale (fallback se movimenti non ancora creati)
            //           3. prezzoBase standard (ultimo resort)
            const prezzoTotaleMovimenti = (rawApp as any)._prezzoTotaleMovimenti as number | undefined;
            const prezzoTariffarioPrestazione = (rawApp as any)._prezzoTariffarioPrestazione as number | undefined;
            const prezzoPrestazioniBase = (rawApp as any)._prezzoPrestazioniBase as number | undefined;
            const prezzoPrincipale = prezzoPrestazioniBase ?? prezzoTariffarioPrestazione ?? prezzoTotaleMovimenti ?? prezzoBase;

            // Calculate discounted price if convenzione exists
            let prezzoScontato: number | undefined = (rawApp as any).prezzoScontato
                ?? (((rawApp as any).prezzoFinale && prezzoPrincipale && (rawApp as any).prezzoFinale < prezzoPrincipale) ? (rawApp as any).prezzoFinale : undefined);
            if (!prezzoScontato && rawApp.convenzione?.condizioni && prezzoPrincipale) {
                const condizioni = rawApp.convenzione.condizioni;

                // Priority: scontoInfo (from codiceSconto lookup) > percentualeSconto > scontoFisso
                if (condizioni.scontoInfo) {
                    const tipoSconto = String(condizioni.scontoInfo.tipo || '').toUpperCase();
                    // Sconto da codice sconto (arricchito dal backend)
                    if (tipoSconto.includes('PERCENT')) {
                        prezzoScontato = prezzoPrincipale * (1 - condizioni.scontoInfo.valore / 100);
                    } else if (tipoSconto.includes('VALORE') || tipoSconto.includes('FISSO')) {
                        // VALORE_ASSOLUTO
                        prezzoScontato = Math.max(0, prezzoPrincipale - condizioni.scontoInfo.valore);
                    }
                } else if (condizioni.percentualeSconto) {
                    prezzoScontato = prezzoPrincipale * (1 - condizioni.percentualeSconto / 100);
                } else if (condizioni.scontoFisso) {
                    prezzoScontato = Math.max(0, prezzoPrincipale - condizioni.scontoFisso);
                }
            }

            return [{
                id: app.id,
                title: app.prestazione?.nome || 'Appuntamento',
                start,
                end,
                tipo: 'appuntamento' as const,
                stato: app.stato,
                paziente: pazienteNome || 'Paziente',
                pazienteTelefono: app.paziente?.phone || app.paziente?.telefono,
                medicoId: app.medicoId,
                medicoNome: appMedicoFullName,
                ambulatorioId: app.ambulatorioId,
                prestazione: app.prestazione?.nome,
                prezzo: prezzoPrincipale,
                prezzoScontato: prezzoScontato,
                convenzione: rawApp.convenzione?.nome,
                convenzioneId: rawApp.convenzione?.id,
                isOverbooking: app.isOverbooking,
                // P61: Note pubbliche e interne
                note: app.note || undefined,
                noteInterne: app.noteInterne || undefined,
                // P61: Queue system fields
                queueEntryId: app.queueEntryId || undefined,
                queueSessionId: app.queueSessionId || undefined,
                numeroCoda: app.numeroCoda || undefined,
                displayNumberCoda: app.displayNumberCoda || undefined,
                // P70: MDL e completezza anagrafica paziente
                tipoVisitaMDL: (rawApp as any).tipoVisitaMDL || null,
                consensiMdlValidi: !!(rawApp as any)._consensiMdlValidi,
                pazienteAnagraficaCompleta: !!(
                    (rawApp as any).paziente?.residenceAddress &&
                    (rawApp as any).paziente?.residenceCity
                ),
                // ID della visita collegata (se completata/fatturata) - usato per "Visualizza Visita"
                visitaId: app.visita?.id || undefined,
                raw: {
                    ...app,
                    prezzo: prezzoPrincipale ?? (app as any).prezzo,
                    prezzoBase: prezzoPrincipale ?? prezzoBase,
                    prezzoScontato,
                    prezzoFinale: prezzoScontato ?? prezzoPrincipale ?? (app as any).prezzo,
                    prezzoConvenzionato: prezzoScontato,
                    _prezzoTariffarioPrestazione: prezzoPrincipale,
                    convenzioneId: rawApp.convenzione?.id || (app as any).convenzioneId,
                }
            }];
        });

        return { disponibilita, appuntamenti };
    }, [slotsData, appuntamentiData, visibleMedici, currentMedicoId, restrictCalendarToCurrentMedico]);

    // Filter events by selected doctors (filterMedici)
    // When showAllSlotsGray is active, include ALL disponibilita but mark them as grayed
    const filteredEvents = useMemo(() => {
        // If no doctors are selected (empty array), show no events
        // This happens after "Nessuno" is clicked
        if (filterMedici.length === 0 && !showAllSlotsGray) {
            return { disponibilita: [], appuntamenti: [] };
        }

        // When showAllSlotsGray is active, include all disponibilita but mark non-selected as grayed
        const disponibilita = showAllSlotsGray
            ? events.disponibilita.map(e => ({
                ...e,
                isGrayed: e.medicoId ? !filterMedici.includes(e.medicoId) : true
            }))
            : events.disponibilita.filter(e => e.medicoId && filterMedici.includes(e.medicoId));

        return {
            disponibilita,
            appuntamenti: events.appuntamenti.filter(e => e.medicoId && filterMedici.includes(e.medicoId))
        };
    }, [events, filterMedici, showAllSlotsGray]);

    // Get selected sede with orari settimanali
    const selectedSede = useMemo(() => {
        if (!selectedSedeId || !sediData?.data) return null;
        return sediData.data.find(s => s.id === selectedSedeId) || null;
    }, [selectedSedeId, sediData]);

    // Use sede closures hook for opening hours logic
    const { getSedeOpeningHours, isHourOpen, getChiusuraSpeciale, hasOrariConfigured } = useSedeClosures({ selectedSede });

    // Filter ambulatori to display - now also filters by sede if selected
    const displayAmbulatori = useMemo(() => {
        let all = ambulatoriData?.data || [];

        // Filter by sede if selected
        if (selectedSedeId) {
            const scoped = all.filter(a => a.sedeId === selectedSedeId);
            if (scoped.length > 0) all = scoped;
        }

        if (selectedAmbulatori.length === 0) return all; // Show all if nothing selected
        return all.filter(a => selectedAmbulatori.includes(a.id));
    }, [ambulatoriData, selectedAmbulatori, selectedSedeId]);

    // Medici da mostrare nella vista per medico (quelli nei filtri attivi)
    const displayMedici = useMemo(() => {
        if (filterMedici.length === 0) return visibleMedici;
        return visibleMedici.filter(m => filterMedici.includes(m.id));
    }, [visibleMedici, filterMedici]);

    // Display days are ONLY the explicitly selected dates from mini calendar
    // No week-based fallback - user must select days they want to see
    const displayDays = useMemo(() => {
        if (selectedDates.length === 0) {
            // If no dates selected, show today only
            return [new Date()];
        }
        // Always use selectedDates, sorted chronologically
        return [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    }, [selectedDates]);

    // Filter days when showOnlyAvailability is active - only show days with disponibilità
    const effectiveDisplayDays = useMemo(() => {
        if (!showOnlyAvailability) return displayDays;

        // Get days that have at least one disponibilità in any displayed ambulatorio
        return displayDays.filter(day => {
            return displayAmbulatori.some(amb => {
                return filteredEvents.disponibilita.some(d =>
                    (d.ambulatorioId === amb.id || !d.ambulatorioId) && isSameDay(d.start, day)
                );
            });
        });
    }, [displayDays, displayAmbulatori, filteredEvents.disponibilita, showOnlyAvailability]);

    // Filter ambulatori when showOnlyAvailability is active - only show ambulatori with disponibilità on displayed days
    const effectiveDisplayAmbulatori = useMemo(() => {
        if (!showOnlyAvailability) return displayAmbulatori;

        // Get ambulatori that have at least one disponibilità on any effective display day
        return displayAmbulatori.filter(amb => {
            return effectiveDisplayDays.some(day => {
                return filteredEvents.disponibilita.some(d =>
                    (d.ambulatorioId === amb.id || !d.ambulatorioId) && isSameDay(d.start, day)
                );
            });
        });
    }, [displayAmbulatori, effectiveDisplayDays, filteredEvents.disponibilita, showOnlyAvailability]);

    // Per-day ambulatori map: for each day, return only ambulatori with disponibilità on that day
    // This is used when showOnlyAvailability is active to show different columns per day
    const ambulatoriPerDay = useMemo(() => {
        if (!showOnlyAvailability) {
            // When not filtering, all days show same ambulatori
            const map = new Map<string, typeof displayAmbulatori>();
            effectiveDisplayDays.forEach(day => {
                map.set(toISODateString(day), displayAmbulatori);
            });
            return map;
        }

        // Build map of ambulatori per day - only those with disponibilità
        const map = new Map<string, typeof displayAmbulatori>();
        effectiveDisplayDays.forEach(day => {
            const dayKey = toISODateString(day);
            const ambulatoriWithDisp = displayAmbulatori.filter(amb =>
                filteredEvents.disponibilita.some(d =>
                    (d.ambulatorioId === amb.id || !d.ambulatorioId) && isSameDay(d.start, day)
                )
            );
            map.set(dayKey, ambulatoriWithDisp);
        });
        return map;
    }, [displayAmbulatori, effectiveDisplayDays, filteredEvents.disponibilita, showOnlyAvailability]);

    // Calculate total columns and check if too many
    // Also calculate effective column width to fill available space
    const columnInfo = useMemo(() => {
        // When using per-day ambulatori, sum columns for each day
        let totalColumns = 0;
        let maxColumnsInDay = 0;
        effectiveDisplayDays.forEach(day => {
            const dayKey = toISODateString(day);
            const dayAmbulatori = ambulatoriPerDay.get(dayKey) || [];
            totalColumns += dayAmbulatori.length;
            maxColumnsInDay = Math.max(maxColumnsInDay, dayAmbulatori.length);
        });

        const isTooMany = totalColumns > MAX_RECOMMENDED_COLUMNS;
        const minWidthNeeded = totalColumns * MIN_COLUMN_WIDTH + TIME_COLUMN_WIDTH;

        // Calculate available width for columns (estimate viewport width minus filter panel)
        // The filter panel is 256px when visible, time column is TIME_COLUMN_WIDTH
        // We use a reasonable estimate for the container width
        const estimatedContainerWidth = typeof window !== 'undefined'
            ? window.innerWidth - 256 - TIME_COLUMN_WIDTH - 32 // 32 for padding/scrollbar
            : 1200 - 256 - TIME_COLUMN_WIDTH;

        // Calculate effective column width - use MIN_COLUMN_WIDTH as floor, but expand to fill space
        let effectiveColumnWidth = MIN_COLUMN_WIDTH;
        if (totalColumns > 0 && !isTooMany) {
            const idealWidth = Math.floor(estimatedContainerWidth / totalColumns);
            // Only expand if we have room, never shrink below MIN_COLUMN_WIDTH
            if (idealWidth > MIN_COLUMN_WIDTH) {
                effectiveColumnWidth = idealWidth;
            }
        }

        return { totalColumns, isTooMany, minWidthNeeded, effectiveColumnWidth, maxColumnsInDay };
    }, [effectiveDisplayDays, ambulatoriPerDay]);

    // Column info for medico-view layout: one sub-column per (medico × day)
    const medicoColumnInfo = useMemo(() => {
        const totalColumns = displayMedici.length * effectiveDisplayDays.length;
        const isTooMany = totalColumns > MAX_RECOMMENDED_COLUMNS;
        const minWidthNeeded = totalColumns * MIN_COLUMN_WIDTH + TIME_COLUMN_WIDTH;
        const estimatedContainerWidth = typeof window !== 'undefined'
            ? window.innerWidth - 256 - TIME_COLUMN_WIDTH - 32
            : 1200 - 256 - TIME_COLUMN_WIDTH;
        let effectiveColumnWidth = MIN_COLUMN_WIDTH;
        if (totalColumns > 0 && !isTooMany) {
            const idealWidth = Math.floor(estimatedContainerWidth / totalColumns);
            if (idealWidth > MIN_COLUMN_WIDTH) effectiveColumnWidth = idealWidth;
        }
        return { totalColumns, isTooMany, minWidthNeeded, effectiveColumnWidth };
    }, [displayMedici, effectiveDisplayDays]);

    // Calculate effective hour height for "Adatta" (fit) mode
    const effectiveHourHeight = useMemo(() => {
        const hourCount = viewEndHour - viewStartHour;
        if (hourCount <= 0) return HOUR_HEIGHT;

        if (zoomMode === 'fixed') {
            // Wait for container to be properly measured before calculating
            // Use a more generous default that looks better while waiting
            if (!containerMounted || containerHeight <= 100) {
                // Calculate based on viewport height estimation while waiting for measurement
                const estimatedViewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
                const estimatedAvailableHeight = Math.max(estimatedViewportHeight - 280, 300); // 280px for header/toolbar/padding
                return Math.floor(estimatedAvailableHeight / hourCount);
            }

            // Fit mode: calculate height to fill available space
            // Use dynamically measured header height instead of fixed value
            // Add buffer for warning banner (~41px if present) and borders/padding
            const warningBannerHeight = columnInfo.isTooMany ? 41 : 0;
            const availableHeight = Math.max(containerHeight - headerHeight - warningBannerHeight - 10, 200);
            const calculatedHeight = Math.floor(availableHeight / hourCount);

            return calculatedHeight;
        }

        // Scroll mode: use larger fixed height for better readability
        // For half-day view (7-13), make cells very tall to fill screen
        // Use HOUR_HEIGHT * 3 for tall appointments (doubled from 1.5)
        const scrollModeHeight = hourCount <= 6 ? 180 : HOUR_HEIGHT * 3;
        return scrollModeHeight;
    }, [zoomMode, viewStartHour, viewEndHour, containerHeight, headerHeight, columnInfo.isTooMany, containerMounted]);

    // Effect to measure container height for "Adatta" mode
    // Uses ResizeObserver for reliable measurements when layout changes
    useEffect(() => {
        if (!containerRef.current) return;

        const measureHeights = () => {
            if (containerRef.current) {
                const height = containerRef.current.clientHeight;
                // Only update if height is valid (> 100px minimum)
                if (height > 100) {
                    setContainerHeight(height);
                    setContainerMounted(true);
                }
            }
            // Measure header height dynamically
            if (headerRef.current) {
                const hHeight = headerRef.current.clientHeight;
                if (hHeight > 0) {
                    setHeaderHeight(hHeight);
                }
            }
        };

        // Initial measurement with requestAnimationFrame to ensure layout is ready
        const initialMeasure = () => {
            requestAnimationFrame(() => {
                measureHeights();
                // Multiple retries for layout stabilization on page reload
                setTimeout(measureHeights, 50);
                setTimeout(measureHeights, 100);
                setTimeout(measureHeights, 250);
                setTimeout(measureHeights, 500);
            });
        };

        initialMeasure();

        // Use ResizeObserver for reliable resize detection
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.height > 100) {
                    setContainerHeight(entry.contentRect.height);
                    setContainerMounted(true);
                }
            }
            // Also remeasure header when container changes
            if (headerRef.current) {
                const hHeight = headerRef.current.clientHeight;
                if (hHeight > 0) {
                    setHeaderHeight(hHeight);
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        // Observe header as well for changes (e.g., warning banner appearing)
        if (headerRef.current) {
            resizeObserver.observe(headerRef.current);
        }

        // Also listen to window resize as fallback
        window.addEventListener('resize', measureHeights);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', measureHeights);
        };
    }, []);

    // Horizontal scroll with mouse wheel when holding Shift or when vertical scroll is at edge
    useEffect(() => {
        const calendarScrollEl = calendarScrollRef.current;
        if (!calendarScrollEl) return;

        const handleWheel = (e: WheelEvent) => {
            // If Shift is held, convert vertical scroll to horizontal
            if (e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                calendarScrollEl.scrollLeft += e.deltaY;
                return;
            }

            // In fixed mode (Adatta), always convert vertical to horizontal scroll
            if (zoomMode === 'fixed' && Math.abs(e.deltaY) > 0) {
                e.preventDefault();
                calendarScrollEl.scrollLeft += e.deltaY;
                return;
            }
        };

        calendarScrollEl.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            calendarScrollEl.removeEventListener('wheel', handleWheel);
        };
    }, [zoomMode]);

    // Navigation handlers
    const navigateDate = useCallback((delta: number) => {
        const newDate = new Date(currentDate);
        if (view === 'day') {
            newDate.setDate(currentDate.getDate() + delta);
        } else {
            newDate.setDate(currentDate.getDate() + (delta * 7));
        }
        setCurrentDate(newDate);
    }, [currentDate, view]);

    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    // Zoom change handler - stable callback to avoid unnecessary FilterPanel re-renders
    const handleZoomChange = useCallback((start: number, end: number) => {
        setViewStartHour(start);
        setViewEndHour(end);
        setZoomMode('fixed');
    }, []);

    // Drag handlers
    const handleDragStart = useCallback((hour: number, ambulatorioId: string, date: Date) => {
        if (currentMedicoId && ownMedici.length === 0) {
            showToast({ message: 'Puoi creare disponibilità solo per il tuo profilo medico', type: 'warning' });
            return;
        }
        setDragState({
            isDragging: true,
            startHour: hour,
            startDay: date,
            endHour: hour + 0.5,
            ambulatorioId
        });
    }, [currentMedicoId, ownMedici.length, showToast]);

    const handleDragMove = useCallback((hour: number) => {
        setDragState(prev => ({
            ...prev,
            endHour: hour
        }));
    }, []);

    const handleDragEnd = useCallback(() => {
        if (!dragState.isDragging || !dragState.startHour || !dragState.endHour || !dragState.ambulatorioId || !dragState.startDay) {
            setDragState({ isDragging: false, startHour: null, startDay: null, endHour: null, ambulatorioId: null });
            return;
        }

        // Round to nearest 5 minutes to avoid floating point precision issues
        const roundToFiveMin = (hour: number) => Math.round(hour * 12) / 12;
        const startHour = roundToFiveMin(Math.min(dragState.startHour, dragState.endHour));
        const endHour = roundToFiveMin(Math.max(dragState.startHour, dragState.endHour));

        if (endHour - startHour < 0.25) { // Minimum 15 minutes
            setDragState({ isDragging: false, startHour: null, startDay: null, endHour: null, ambulatorioId: null });
            return;
        }

        if (calendarLayoutMode === 'medico') {
            // In medico view, dragState.ambulatorioId holds the medicoId (virtual ambulatorio pattern)
            const medicoId = dragState.ambulatorioId;
            const dragDate = dragState.startDay;
            // Compute ambulatories free during the dragged time range on that day
            const ambulatoriLiberi = (ambulatoriData?.data || []).filter(amb => {
                return !events.disponibilita.some(d => {
                    if (d.ambulatorioId !== amb.id) return false;
                    if (!isSameDay(d.start, dragDate)) return false;
                    const dStart = d.start.getHours() + d.start.getMinutes() / 60;
                    const dEnd = d.end.getHours() + d.end.getMinutes() / 60;
                    return startHour < dEnd && endHour > dStart;
                });
            });
            setAvailabilityModalInfo({
                date: dragState.startDay,
                startHour,
                endHour,
                ambulatorioId: '',
                medicoId,
                ambulatori: ambulatoriLiberi
            });
        } else {
            setAvailabilityModalInfo({
                date: dragState.startDay,
                startHour,
                endHour,
                ambulatorioId: dragState.ambulatorioId
            });
        }

        setDragState({ isDragging: false, startHour: null, startDay: null, endHour: null, ambulatorioId: null });
    }, [dragState, calendarLayoutMode, ambulatoriData, events.disponibilita]);

    // Drag & Drop handlers for moving existing events
    const handleItemDragStart = useCallback((e: React.DragEvent, item: DragItem) => {
        setDraggingEvent(item);
    }, []);

    const handleDropEvent = useCallback((date: Date, ambulatorioId: string, hour: number, item: DragItem) => {
        setDraggingEvent(null);

        const event = item.event;
        if (currentMedicoId && item.type === 'appuntamento' && !canEditOtherAppointments && (!event.medicoId || !ownMedicoIds.has(event.medicoId))) {
            showToast({ message: 'Puoi spostare solo i tuoi appuntamenti', type: 'warning' });
            return;
        }
        if (currentMedicoId && item.type === 'disponibilita' && (!event.medicoId || !ownMedicoIds.has(event.medicoId))) {
            showToast({ message: 'Puoi spostare solo le tue disponibilità e i tuoi appuntamenti', type: 'warning' });
            return;
        }
        const duration = (event.end.getTime() - event.start.getTime()) / (60 * 1000); // duration in minutes
        const newDate = toISODateString(date);
        const newOraInizio = minutesToTime(hour * 60);
        const newOraFine = minutesToTime(hour * 60 + duration);

        if (item.type === 'disponibilita') {
            // Check if the disponibilità has appointments that overlap with it
            const appointmentsInSlot = events.appuntamenti.filter(app => {
                if (app.ambulatorioId !== event.ambulatorioId) return false;
                if (app.medicoId !== event.medicoId) return false;
                // Check if appointment overlaps with the disponibilità
                return app.start.getTime() >= event.start.getTime() && app.start.getTime() < event.end.getTime();
            });

            if (appointmentsInSlot.length > 0) {
                // Show confirmation dialog
                setMoveDisponibilitaConfirm({
                    disponibilita: event,
                    targetDate: date,
                    targetAmbulatorioId: ambulatorioId,
                    targetHour: hour,
                    appointmentsToMove: appointmentsInSlot
                });
                return;
            }

            // No appointments, move directly
            updateSlotMutation.mutate({
                id: event.id,
                data: {
                    data: newDate,
                    oraInizio: newOraInizio,
                    oraFine: newOraFine,
                    ambulatorioId
                }
            });
        } else if (item.type === 'appuntamento') {
            // Move appuntamento - need to check if there's a matching disponibilità
            // For now, just update the date and time
            const newDataOra = new Date(date);
            const [h, m] = newOraInizio.split(':').map(Number);
            newDataOra.setHours(h, m, 0, 0);

            updateAppuntamentoMutation.mutate({
                id: event.id,
                data: {
                    dataOra: newDataOra.toISOString(),
                    ambulatorioId
                }
            });
        }
    }, [updateSlotMutation, updateAppuntamentoMutation, events.appuntamenti, currentMedicoId, ownMedicoIds, canEditOtherAppointments, showToast]);

    // Clear dragging on drag end (global)
    useEffect(() => {
        const handleGlobalDragEnd = () => {
            setDraggingEvent(null);
        };
        window.addEventListener('dragend', handleGlobalDragEnd);
        return () => window.removeEventListener('dragend', handleGlobalDragEnd);
    }, []);

    // Event handlers
    const handleSlotClick = useCallback((hour: number, ambulatorioId: string, date: Date) => {
        if (dragState.isDragging) return;
        if (currentMedicoId && !canCreateForOtherMedici) {
            showToast({ message: 'Seleziona un tuo slot disponibilità per prenotare un appuntamento', type: 'info' });
            return;
        }

        // Check for existing appointments at this time slot (overbooking detection)
        // Exclude concluded/absent states: they no longer occupy the slot
        const nonBlockingStates: string[] = ['COMPLETATO', 'FATTURATO', 'NO_SHOW'];
        const existingAtTime = events.appuntamenti.filter(app => {
            if (app.ambulatorioId !== ambulatorioId) return false;
            if (!isSameDay(app.start, date)) return false;
            if (app.stato && nonBlockingStates.includes(app.stato as string)) return false;

            const appStartHour = app.start.getHours() + app.start.getMinutes() / 60;
            const appEndHour = app.end.getHours() + app.end.getMinutes() / 60;

            // Check if the clicked hour falls within an existing appointment
            return hour >= appStartHour && hour < appEndHour;
        });

        const isOverbooking = existingAtTime.length > 0;
        const existingCount = existingAtTime.length;

        setQuickAddInfo({ date, hour, ambulatorioId, isOverbooking, existingCount });
    }, [dragState.isDragging, events.appuntamenti, currentMedicoId, canCreateForOtherMedici, showToast]);

    const handleEventClick = useCallback((event: CalendarEvent, clickedHour?: number) => {
        if (event.tipo === 'appuntamento') {
            // Always open AccettazionePazienteModal on appointment click.
            // It handles all states: PRENOTATO/CONFERMATO (accepts patient),
            // IN_ATTESA/IN_CORSO/COMPLETATO/FATTURATO (shows/edits existing accettazione).
            setAccettazioneInitialTab('anagrafica');
            setAccettazioneAppuntamento(event);
        } else if (event.tipo === 'disponibilita') {
            if (currentMedicoId && !canCreateForOtherMedici && (!event.medicoId || !ownMedicoIds.has(event.medicoId))) {
                showToast({ message: 'Puoi prenotare appuntamenti solo sui tuoi slot disponibilità', type: 'warning' });
                return;
            }
            // Click on disponibilità - open appointment modal for that medico's slot
            const slotStart = event.start;
            // Use clicked hour if provided, otherwise fall back to slot start
            const hour = clickedHour !== undefined ? clickedHour : (slotStart.getHours() + slotStart.getMinutes() / 60);

            // Build the click time from the used hour for proper overbooking check
            const clickDate = new Date(slotStart);
            clickDate.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
            const clickTime = clickDate.getTime();

            // Check if there are existing appointments at this time for overbooking
            // Exclude concluded/absent states: they no longer occupy the slot
            const nonBlockingStates: string[] = ['COMPLETATO', 'FATTURATO', 'NO_SHOW'];
            const existingAtTime = events.appuntamenti.filter(app => {
                if (app.ambulatorioId !== event.ambulatorioId) return false;
                if (app.stato && nonBlockingStates.includes(app.stato as string)) return false;
                const appStart = app.start.getTime();
                const appEnd = app.end.getTime();
                return clickTime >= appStart && clickTime < appEnd;
            });

            const isOverbooking = existingAtTime.length > 0;
            const existingCount = existingAtTime.length;

            setQuickAddInfo({
                date: clickDate,
                hour,
                ambulatorioId: event.ambulatorioId || '',
                isOverbooking,
                existingCount
            });
            // Pre-select the medico from the disponibilità
            if (event.medicoId) {
                setSelectedMedico(event.medicoId);
            }
        }
    }, [events.appuntamenti, currentMedicoId, ownMedicoIds, canCreateForOtherMedici, showToast]);

    const handleAppointmentStatusChange = useCallback((id: string, stato: StatoAppuntamento) => {
        updateAppuntamentoMutation.mutate({ id, data: { stato } }, {
            onSuccess: () => {
                showToast({ message: 'Stato appuntamento aggiornato', type: 'success' });
            }
        });
    }, [updateAppuntamentoMutation, showToast]);

    // P72_11: mostra dialog di conferma prima dell'eliminazione.
    // Se COMPLETATO/FATTURATO → avvisa che ci sono movimenti DA_FATTURARE che verranno annullati.
    const handleAppointmentDelete = useCallback((id: string) => {
        const event = events.appuntamenti.find(e => e.id === id);
        const isCompletato = event?.stato === 'COMPLETATO' || event?.stato === 'FATTURATO';
        setAppuntamentoDaEliminare({ id, isCompletato: !!isCompletato });
    }, [events.appuntamenti]);

    const handleConfirmDeleteAppuntamento = useCallback(() => {
        if (!appuntamentoDaEliminare) return;
        deleteAppuntamentoMutation.mutate(appuntamentoDaEliminare.id, {
            onSuccess: () => {
                showToast({ message: 'Appuntamento eliminato', type: 'success' });
                setAppuntamentoDaEliminare(null);
            },
            onError: () => {
                showToast({ message: 'Errore durante l\'eliminazione', type: 'error' });
                setAppuntamentoDaEliminare(null);
            }
        });
    }, [appuntamentoDaEliminare, deleteAppuntamentoMutation, showToast]);

    // Handler per aprire il modal di accettazione paziente (check-in)
    const handleAccettazioneAppuntamento = useCallback((event: CalendarEvent) => {
        setAccettazioneInitialTab('anagrafica');
        setAccettazioneAppuntamento(event);
    }, []);

    const handleFatturaAppuntamento = useCallback((event: CalendarEvent) => {
        setAccettazioneInitialTab('fatturazione');
        setAccettazioneAppuntamento(event);
    }, []);

    // P70: Handler "Accetta e Visita" — solo per MDL con anagrafica completa
    // 1. Verifica consensi (GDPR + sanitari + prestazione)
    // 2. Se consensi OK → accetta e vai direttamente alla visita
    // 3. Se consensi mancanti → apri modal di accettazione per completare l'iter
    const handleAccettaEVisitaAppuntamento = useCallback(async (event: CalendarEvent) => {
        try {
            // Verifica stato consensi prima di procedere
            try {
                const status = await apiGet<{
                    firmato: boolean;
                    validConsensiPerPaziente?: Record<string, string>;
                }>(`/api/v1/clinica/appuntamenti/${event.id}/consenso-status`);
                const validKeys = Object.keys(status?.validConsensiPerPaziente ?? {});
                const hasGdpr = validKeys.includes('gdpr') || status?.firmato;
                const hasSanitari = validKeys.includes('sanitari') || status?.firmato;
                if (!hasGdpr || !hasSanitari) {
                    showToast({ message: 'Consensi non ancora acquisiti. Completa l\'accettazione.', type: 'warning' });
                    setAccettazioneInitialTab('anagrafica');
                    setAccettazioneAppuntamento(event);
                    return;
                }
            } catch {
                // Se il check fallisce, procedi comunque (non bloccare il workflow)
            }

            // 1. Accetta il paziente (IN_ATTESA)
            await appuntamentiApi.changeStato(event.id, 'IN_ATTESA' as Appuntamento['stato']);
            showToast({ message: 'Paziente accettato. Apertura visita...', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });

            // 2. Ottieni o crea la visita e naviga
            const result = await visiteApi.getOrCreateByAppuntamento(event.id);
            if (!result.success || !result.data) {
                showToast({ message: 'Errore nel recupero della visita', type: 'error' });
                return;
            }
            navigate(`/poliambulatorio/visite/${result.data.id}`);
        } catch (error) {
            showToast({ message: 'Errore durante accettazione e avvio visita', type: 'error' });
        }
    }, [queryClient, showToast, navigate]);

    // Handler per avviare visita paziente (IN_ATTESA → IN_CORSO)
    // Get or create visita and navigate to it
    const handleVisitaAppuntamento = useCallback(async (event: CalendarEvent) => {
        try {
            // Get or create visita from appuntamento
            const result = await visiteApi.getOrCreateByAppuntamento(event.id);

            if (!result.success || !result.data) {
                showToast({ message: 'Errore nel recupero della visita', type: 'error' });
                return;
            }

            const visitaId = result.data.id;
            const medicoAssegnato = result.medicoAssegnato;
            const medicoCorrente = result.medicoCorrente;

            // Check if current user is different from assigned doctor
            if (medicoAssegnato && medicoCorrente && medicoAssegnato.id !== medicoCorrente.id) {
                // Show confirmation modal
                setVisitaMedicoConfirm({
                    event,
                    visitaId,
                    medicoAssegnato,
                    medicoCorrente
                });
                return;
            }

            // Navigate directly to visita page
            navigate(`/poliambulatorio/visite/${visitaId}`);
            showToast({ message: 'Apertura visita paziente...', type: 'success' });

            // Invalidate queries per aggiornare lo stato
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });
        } catch (error) {
            showToast({ message: 'Errore durante l\'avvio della visita', type: 'error' });
        }
    }, [queryClient, showToast, navigate]);

    // Handler per chiamare paziente nel monitor e poi avviare visita
    const handleChiamaEVisitaAppuntamento = useCallback(async (event: CalendarEvent) => {
        try {
            // 1. Fetch fresh appuntamento data to get queueEntryId
            const freshApp = await appuntamentiApi.getById(event.id);
            const entryId = freshApp?.queueEntryId;

            // 2. Tenta di chiamare il paziente nel monitor (non bloccante)
            if (entryId) {
                try {
                    await queueApi.callSpecific({
                        entryId,
                        ambulatorioId: event.ambulatorioId || '',
                        displayedMessage: `Chiamata paziente ${event.paziente || ''}`,
                        skipStatusChange: true,
                        appuntamentoId: event.id
                    });
                    showToast({ message: 'Paziente chiamato dal monitor. Apertura visita...', type: 'success' });
                } catch (callError) {
                    // La chiamata al monitor non è bloccante: procedi comunque con la visita
                    showToast({ message: 'Apertura visita (chiamata monitor non disponibile)', type: 'info' });
                }
            } else {
                showToast({ message: 'Apertura visita (paziente non in coda)', type: 'info' });
            }

            // 3. Get or create visita and navigate
            const result = await visiteApi.getOrCreateByAppuntamento(event.id);
            if (result.success && result.data) {
                navigate(`/poliambulatorio/visite/${result.data.id}`);
                queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });
            } else {
                showToast({ message: 'Errore nel recupero della visita', type: 'error' });
            }
        } catch (error) {
            const errorMsg = 'Errore sconosciuto';
            showToast({ message: `Errore: ${errorMsg}`, type: 'error' });
        }
    }, [queryClient, showToast, navigate]);

    const handleViewVisitaAppuntamento = useCallback((event: CalendarEvent) => {
        if (event.visitaId) {
            navigate(`/poliambulatorio/visite/${event.visitaId}`);
        }
    }, [navigate]);

    const handleModificaAppuntamento = useCallback((event: CalendarEvent) => {
        navigate(`/poliambulatorio/appuntamenti/${event.id}/modifica`);
    }, [navigate]);

    const handleConfirmVisitaMedicoDiverso = useCallback(() => {
        if (!visitaMedicoConfirm) return;

        navigate(`/poliambulatorio/visite/${visitaMedicoConfirm.visitaId}`);
        showToast({
            message: `Attenzione: stai visitando un paziente assegnato a ${visitaMedicoConfirm.medicoAssegnato.firstName} ${visitaMedicoConfirm.medicoAssegnato.lastName}`,
            type: 'warning',
            duration: 5000
        });

        setVisitaMedicoConfirm(null);
        queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });
    }, [visitaMedicoConfirm, navigate, showToast, queryClient]);

    const handleDeleteDisponibilita = useCallback((id: string, hasPattern?: boolean) => {
        const event = events.disponibilita.find(d => d.id === id);
        if (currentMedicoId && (!event?.medicoId || !ownMedicoIds.has(event.medicoId))) {
            showToast({ message: 'Puoi eliminare solo le tue disponibilità', type: 'warning' });
            return;
        }
        setDeleteDisponibilitaInfo({ id, hasPattern: !!hasPattern });
    }, [events.disponibilita, currentMedicoId, ownMedicoIds, showToast]);

    const handleConfirmDeleteDisponibilita = useCallback((cascade: boolean = false) => {
        if (deleteDisponibilitaInfo) {
            if (cascade) {
                cascadeDeleteSlotMutation.mutate(deleteDisponibilitaInfo.id);
            } else {
                deleteSlotMutation.mutate(deleteDisponibilitaInfo.id);
            }
        }
        setDeleteDisponibilitaInfo(null);
    }, [deleteDisponibilitaInfo, deleteSlotMutation, cascadeDeleteSlotMutation]);

    // Handle edit disponibilità - opens edit modal
    const handleEditDisponibilita = useCallback((slot: CalendarEvent) => {
        if (currentMedicoId && (!slot.medicoId || !ownMedicoIds.has(slot.medicoId))) {
            showToast({ message: 'Puoi modificare solo le tue disponibilità', type: 'warning' });
            return;
        }
        setEditingDisponibilita(slot);
    }, [currentMedicoId, ownMedicoIds, showToast]);

    // Handle open queue for slot - opens queue management modal
    const handleOpenQueueForSlot = useCallback((slot: CalendarEvent) => {
        if (currentMedicoId && (!slot.medicoId || !ownMedicoIds.has(slot.medicoId))) {
            showToast({ message: 'Puoi gestire la coda solo sui tuoi slot disponibilità', type: 'warning' });
            return;
        }
        setQueueSlot(slot);
    }, [currentMedicoId, ownMedicoIds, showToast]);

    // Handle move disponibilità confirmation - only availability
    const handleMoveDisponibilitaOnly = useCallback(() => {
        if (!moveDisponibilitaConfirm) return;
        const { disponibilita, targetDate, targetAmbulatorioId, targetHour } = moveDisponibilitaConfirm;
        const duration = (disponibilita.end.getTime() - disponibilita.start.getTime()) / (60 * 1000);
        const newDate = toISODateString(targetDate);
        const newOraInizio = minutesToTime(targetHour * 60);
        const newOraFine = minutesToTime(targetHour * 60 + duration);

        updateSlotMutation.mutate({
            id: disponibilita.id,
            data: {
                data: newDate,
                oraInizio: newOraInizio,
                oraFine: newOraFine,
                ambulatorioId: targetAmbulatorioId
            }
        }, {
            onSuccess: () => {
                showToast({ message: 'Disponibilità spostata', type: 'success' });
                setMoveDisponibilitaConfirm(null);
            }
        });
    }, [moveDisponibilitaConfirm, updateSlotMutation, showToast]);

    // Handle move disponibilità confirmation - with all appointments
    const handleMoveDisponibilitaWithAppointments = useCallback(async () => {
        if (!moveDisponibilitaConfirm) return;
        const { disponibilita, targetDate, targetAmbulatorioId, targetHour, appointmentsToMove } = moveDisponibilitaConfirm;
        const duration = (disponibilita.end.getTime() - disponibilita.start.getTime()) / (60 * 1000);
        const newDate = toISODateString(targetDate);
        const newOraInizio = minutesToTime(targetHour * 60);
        const newOraFine = minutesToTime(targetHour * 60 + duration);

        // Calculate time offset for appointments
        const originalStart = disponibilita.start.getTime();
        const newStartDate = new Date(targetDate);
        const [h, m] = newOraInizio.split(':').map(Number);
        newStartDate.setHours(h, m, 0, 0);
        const timeOffset = newStartDate.getTime() - originalStart;

        try {
            // Move the disponibilità first
            await slotsApi.update(disponibilita.id, {
                data: newDate,
                oraInizio: newOraInizio,
                oraFine: newOraFine,
                ambulatorioId: targetAmbulatorioId
            });

            // Move all appointments with the same offset (in parallel)
            await Promise.all(appointmentsToMove.map(app => {
                const newAppDateTime = new Date(app.start.getTime() + timeOffset);
                return appuntamentiApi.update(app.id, {
                    dataOra: newAppDateTime.toISOString(),
                    ambulatorioId: targetAmbulatorioId
                });
            }));

            // Invalidate both queries after all updates complete
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['slots-calendario'] }),
                queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'] })
            ]);

            // Show single consolidated toast
            showToast({
                message: `Disponibilità e ${appointmentsToMove.length} appuntament${appointmentsToMove.length === 1 ? 'o spostato' : 'i spostati'} con successo`,
                type: 'success'
            });
            setMoveDisponibilitaConfirm(null);
        } catch (error) {
            showToast({
                message: `Errore nello spostamento: ${'Errore sconosciuto'}`,
                type: 'error'
            });
        }
    }, [moveDisponibilitaConfirm, queryClient, showToast]);

    const handleNavigateToForm = useCallback((params: { data: string; ora: string; ambulatorioId: string; medicoId?: string }) => {
        const searchParams = new URLSearchParams({
            data: params.data,
            ora: params.ora,
            ambulatorioId: params.ambulatorioId,
            ...(params.medicoId && { medicoId: params.medicoId })
        });
        navigate(`/poliambulatorio/agenda/nuovo?${searchParams.toString()}`);
    }, [navigate]);

    // Toggle handlers
    const handleAmbulatorioToggle = (id: string) => {
        setSelectedAmbulatori(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    const handleDayToggle = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
        );
    };

    // Header title
    const headerTitle = useMemo(() => {
        if (view === 'day') {
            return formatDate(currentDate, 'full');
        }
        const weekDays = getWeekDates(currentDate);
        const start = weekDays[0];
        const end = weekDays[6];
        if (start.getMonth() === end.getMonth()) {
            return `${start.getDate()} - ${end.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
        }
        return `${start.getDate()} ${MONTHS[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
    }, [currentDate, view]);

    const isLoading = loadingAppuntamenti || loadingSlots;

    // Loading state
    if (isLoading && !events.disponibilita.length && !events.appuntamenti.length) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 text-teal-600 dark:text-teal-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-80px)] flex flex-col bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Calendario</h1>

                        {/* Sede Selector */}
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <ElegantSelect
                                value={selectedSedeId || ''}
                                onChange={handleSedeChange}
                                className="min-w-[220px]"
                                triggerClassName="h-9 rounded-lg text-sm"
                                placeholder="Tutte le sedi"
                                options={[
                                    { value: '', label: 'Tutte le sedi' },
                                    ...(sediData?.data || []).map(sede => ({
                                        value: sede.id,
                                        label: `${sede.nome}${sede.isPrincipale ? ' (Principale)' : ''}`
                                    }))
                                ]}
                            />
                            {selectedSede && hasOrariConfigured && (
                                <span className="text-xs text-gray-500 dark:text-gray-400" title="Orari configurati per questa sede">
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    Orari attivi
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">

                        {/* Show Only Availability Toggle */}
                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <button
                                onClick={() => setShowOnlyAvailability(false)}
                                className={`px-3 py-1.5 text-sm font-medium rounded ${!showOnlyAvailability ? 'bg-white dark:bg-gray-600 shadow text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                title="Mostra tutti gli ambulatori/giorni"
                            >
                                Completo
                            </button>
                            <button
                                onClick={() => setShowOnlyAvailability(true)}
                                className={`px-3 py-1.5 text-sm font-medium rounded ${showOnlyAvailability ? 'bg-white dark:bg-gray-600 shadow text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                                title="Mostra solo dove ci sono disponibilità"
                            >
                                Solo Disp.
                            </button>
                        </div>

                        {/* Show All Slots in Gray Toggle */}
                        <button
                            onClick={() => setShowAllSlotsGray(!showAllSlotsGray)}
                            className={`p-2 border rounded-lg transition-colors ${showAllSlotsGray
                                ? 'border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            title={showAllSlotsGray ? "Nascondi slot di altri medici" : "Mostra tutti gli slot in grigio (anche medici non selezionati)"}
                        >
                            <Eye className="h-5 w-5" />
                        </button>

                        {/* Ambulatorio Overview Toggle */}
                        <button
                            onClick={() => setShowAmbulatorioOverview(!showAmbulatorioOverview)}
                            className={`p-2 border rounded-lg transition-colors ${showAmbulatorioOverview
                                ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            title="Riepilogo Ambulatori"
                        >
                            <Building2 className="h-5 w-5" />
                        </button>

                        {/* Filters Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 border rounded-lg transition-colors ${showFilters
                                ? 'border-teal-300 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Filter className="h-5 w-5" />
                        </button>

                        {/* Bulk Create Queue Sessions */}
                        <button
                            onClick={() => setShowBulkQueueModal(true)}
                            className="p-2 border rounded-lg transition-colors border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-700 dark:hover:text-purple-300"
                            title="Crea sessioni coda per tutte le disponibilità della giornata"
                        >
                            <Users className="h-5 w-5" />
                        </button>

                        {/* New Appointment */}
                        <CRUDButton
                            operation="create"
                            onClick={() => navigate('/poliambulatorio/agenda/nuovo')}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="hidden sm:inline">Nuovo Appuntamento</span>
                        </CRUDButton>
                    </div>
                </div>

                {/* Legenda */}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stati:</span>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(STATO_COLORS).slice(0, 5).map(([stato, color]) => (
                            <div key={stato} className="flex items-center gap-1.5 text-xs">
                                <div className={`w-3 h-3 rounded ${color.split(' ')[0]}`} />
                                <span className="text-gray-600 dark:text-gray-400 capitalize">{stato.toLowerCase().replace('_', ' ')}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-l border-gray-300 dark:border-gray-600 pl-4 ml-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-2">Medici:</span>
                        {Array.from(medicoColors.entries()).slice(0, 4).map(([id, color]) => {
                            const medico = visibleMedici.find(m => m.id === id);
                            return (
                                <span key={id} className="inline-flex items-center gap-1 mr-3 text-xs">
                                    <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                                    <span className="text-gray-600 dark:text-gray-400">{medico?.lastName || medico?.cognome}</span>
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Ambulatorio Overview Panel */}
            <AmbulatorioOverviewPanel
                isOpen={showAmbulatorioOverview}
                onClose={() => setShowAmbulatorioOverview(false)}
                ambulatori={effectiveDisplayAmbulatori}
                disponibilita={events.disponibilita}
                displayDays={effectiveDisplayDays}
                medicoColors={medicoColors}
            />

            {/* Main Content */}
            <div ref={containerRef} className="flex-1 flex overflow-hidden">
                {/* Calendar Grid */}
                <div
                    ref={calendarScrollRef}
                    className={`flex-1 calendar-scroll ${zoomMode === 'scroll' ? 'overflow-auto' : 'overflow-x-auto overflow-y-hidden'}`}
                >
                    {/* Warning banner when too many columns */}
                    {(calendarLayoutMode === 'ambulatorio' ? columnInfo : medicoColumnInfo).isTooMany && (
                        <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-2 flex items-center gap-2 sticky top-0 z-20">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            <span className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>Troppe colonne ({(calendarLayoutMode === 'ambulatorio' ? columnInfo : medicoColumnInfo).totalColumns}):</strong> La visualizzazione potrebbe risultare compressa.
                                Prova a ridurre i giorni o i medici selezionati nei filtri per una migliore leggibilità.
                            </span>
                        </div>
                    )}
                    {calendarLayoutMode === 'ambulatorio' ? (<div style={{ minWidth: `${columnInfo.minWidthNeeded}px` }}>
                        {/* Calendar Headers Container - measured for "Adatta" mode */}
                        <div ref={headerRef}>
                            {/* Day Headers */}
                            <div className="flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10" style={{ top: columnInfo.isTooMany ? '41px' : 0 }}>
                                <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700 sticky left-0 z-20" style={{ width: `${TIME_COLUMN_WIDTH}px` }} />
                                {effectiveDisplayDays.map((day, dayIdx) => {
                                    const dayKey = toISODateString(day);
                                    const dayAmbulatori = ambulatoriPerDay.get(dayKey) || [];
                                    return (
                                        <div
                                            key={dayIdx}
                                            className="relative"
                                            style={{
                                                width: `${dayAmbulatori.length * columnInfo.effectiveColumnWidth}px`,
                                                flexShrink: 0
                                            }}
                                        >
                                            {/* Day separator line - dashed elegant style */}
                                            {dayIdx > 0 && (
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 z-10"
                                                    style={{
                                                        marginLeft: '-1px',
                                                        width: '2px',
                                                        backgroundImage: 'repeating-linear-gradient(to bottom, #6366f1 0px, #6366f1 4px, transparent 4px, transparent 8px)'
                                                    }}
                                                />
                                            )}
                                            {(() => {
                                                const chiusura = selectedSedeId ? getChiusuraSpeciale(day) : null;
                                                const { isOpen } = selectedSedeId ? getSedeOpeningHours(day) : { isOpen: true };
                                                return (
                                                    <div className={`p-1 text-center border-b border-gray-200 dark:border-gray-700 relative
                                                            ${isSameDay(day, new Date()) ? 'bg-teal-50 dark:bg-teal-900/30' : ''}
                                                            ${!isOpen && selectedSedeId ? 'bg-gray-200 dark:bg-gray-700' : ''}`}>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{DAYS_OF_WEEK[(day.getDay() + 6) % 7]}</p>
                                                        <p className={`text-base font-semibold ${isSameDay(day, new Date()) ? 'text-teal-600 dark:text-teal-400' : !isOpen && selectedSedeId ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                            {day.getDate()}
                                                        </p>
                                                        {chiusura && (
                                                            <div
                                                                className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] px-1 py-0.5 rounded-bl font-medium"
                                                                title={`${chiusura.nome}${chiusura.descrizione ? `: ${chiusura.descrizione}` : ''}`}
                                                            >
                                                                {chiusura.isParziale ? 'PARZIALE' : 'CHIUSO'}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            {/* Ambulatorio sub-headers */}
                                            <div className="flex">
                                                {dayAmbulatori.map((amb, ambIdx) => {
                                                    const bgColors = ['bg-gray-50 dark:bg-gray-700', 'bg-slate-100 dark:bg-slate-800', 'bg-zinc-100 dark:bg-zinc-800', 'bg-stone-100 dark:bg-stone-800'];
                                                    const borderColors = ['border-teal-400', 'border-blue-400', 'border-purple-400', 'border-amber-400', 'border-rose-400', 'border-emerald-400', 'border-indigo-400', 'border-orange-400'];
                                                    return (
                                                        <div
                                                            key={amb.id}
                                                            className={`px-0.5 py-0.5 text-center border-r border-gray-200 dark:border-gray-700 ${bgColors[ambIdx % bgColors.length]} border-t-2 ${borderColors[ambIdx % borderColors.length]}`}
                                                            style={{ width: `${columnInfo.effectiveColumnWidth}px`, flexShrink: 0 }}
                                                        >
                                                            <span className="text-[9px] font-medium text-gray-700 dark:text-gray-300 truncate block">{amb.nome}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>{/* End Calendar Headers Container */}

                        {/* Time Grid */}
                        <div className="flex">
                            <TimeColumn startHour={viewStartHour} endHour={viewEndHour} hourHeight={effectiveHourHeight} />
                            {effectiveDisplayDays.map((day, dayIdx) => {
                                const dayKey = toISODateString(day);
                                const dayAmbulatori = ambulatoriPerDay.get(dayKey) || [];
                                return (
                                    <div
                                        key={dayIdx}
                                        className="flex relative"
                                        style={{
                                            width: `${dayAmbulatori.length * columnInfo.effectiveColumnWidth}px`,
                                            flexShrink: 0
                                        }}
                                    >
                                        {/* Day separator line - dashed elegant style */}
                                        {dayIdx > 0 && (
                                            <div
                                                className="absolute left-0 top-0 bottom-0 z-30"
                                                style={{
                                                    marginLeft: '-1px',
                                                    width: '2px',
                                                    backgroundImage: 'repeating-linear-gradient(to bottom, #6366f1 0px, #6366f1 4px, transparent 4px, transparent 8px)'
                                                }}
                                            />
                                        )}
                                        {dayAmbulatori.map((amb, ambIdx) => {
                                            // Include slots for this ambulatorio OR slots without ambulatorioId (universal)
                                            const dayDisp = filteredEvents.disponibilita.filter(d =>
                                                (d.ambulatorioId === amb.id || !d.ambulatorioId) && isSameDay(d.start, day)
                                            );
                                            const dayApps = filteredEvents.appuntamenti.filter(a =>
                                                a.ambulatorioId === amb.id && isSameDay(a.start, day)
                                            );

                                            return (
                                                <DayColumn
                                                    key={amb.id}
                                                    date={day}
                                                    ambulatorio={amb}
                                                    ambulatorioIndex={ambIdx}
                                                    disponibilita={dayDisp}
                                                    appuntamenti={dayApps}
                                                    getSlotColor={getSlotColor}
                                                    selectedMedico={selectedMedico}
                                                    onSlotClick={handleSlotClick}
                                                    onEventClick={handleEventClick}
                                                    onDeleteDisponibilita={handleDeleteDisponibilita}
                                                    onEditDisponibilita={handleEditDisponibilita}
                                                    onOpenQueueForSlot={handleOpenQueueForSlot}
                                                    onDeleteAppuntamento={handleAppointmentDelete}
                                                    onAccettazioneAppuntamento={handleAccettazioneAppuntamento}
                                                    onFatturaAppuntamento={handleFatturaAppuntamento}
                                                    onAccettaEVisitaAppuntamento={handleAccettaEVisitaAppuntamento}
                                                    onVisitaAppuntamento={handleVisitaAppuntamento}
                                                    onChiamaEVisitaAppuntamento={handleChiamaEVisitaAppuntamento}
                                                    onViewVisitaAppuntamento={handleViewVisitaAppuntamento}
                                                    onModificaAppuntamento={handleModificaAppuntamento}
                                                    onUpdateStato={handleUpdateStato}
                                                    onDragStart={handleDragStart}
                                                    onDragMove={handleDragMove}
                                                    onDragEnd={handleDragEnd}
                                                    startHour={viewStartHour}
                                                    endHour={viewEndHour}
                                                    columnWidth={columnInfo.effectiveColumnWidth}
                                                    dragState={dragState}
                                                    draggingEvent={draggingEvent}
                                                    onItemDragStart={handleItemDragStart}
                                                    onDropEvent={handleDropEvent}
                                                    medicoColors={medicoColors}
                                                    hourHeight={effectiveHourHeight}
                                                    isHourOpen={selectedSedeId ? isHourOpen : undefined}
                                                />
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>) : (
                    /* ===== Vista per Medico ===== */
                    <div style={{ minWidth: `${medicoColumnInfo.minWidthNeeded}px` }}>
                        {/* Medico Headers Container */}
                        <div ref={headerRef}>
                            <div className="flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10" style={{ top: medicoColumnInfo.isTooMany ? '41px' : 0 }}>
                                <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-700 border-r border-gray-200 dark:border-gray-700 sticky left-0 z-20" style={{ width: `${TIME_COLUMN_WIDTH}px` }} />
                                {displayMedici.map((medico, medicoIdx) => {
                                    const color = medicoColors.get(medico.id);
                                    const firstName = medico.firstName || medico.nome || '';
                                    const lastName = medico.lastName || medico.cognome || '';
                                    const title = getDoctorTitle(medico.taxCode || medico.codiceFiscale || null, medico.gender || null);
                                    const fullName = `${title} ${lastName} ${firstName}`.trim();
                                    return (
                                        <div
                                            key={medico.id}
                                            className="relative"
                                            style={{
                                                width: `${effectiveDisplayDays.length * medicoColumnInfo.effectiveColumnWidth}px`,
                                                flexShrink: 0
                                            }}
                                        >
                                            {medicoIdx > 0 && (
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 z-10"
                                                    style={{
                                                        marginLeft: '-1px',
                                                        width: '2px',
                                                        backgroundImage: 'repeating-linear-gradient(to bottom, #6366f1 0px, #6366f1 4px, transparent 4px, transparent 8px)'
                                                    }}
                                                />
                                            )}
                                            {/* Medico name row */}
                                            <div className={`p-1 text-center border-b border-gray-200 dark:border-gray-700 ${color?.bg || ''}`}>
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color?.dot || 'bg-gray-400'}`} />
                                                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{fullName}</span>
                                                </div>
                                            </div>
                                            {/* Day sub-headers */}
                                            <div className="flex">
                                                {effectiveDisplayDays.map((day, dayIdx) => (
                                                    <div
                                                        key={dayIdx}
                                                        className={`px-0.5 py-0.5 text-center border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 border-t-2 ${color?.border || 'border-gray-300'} ${isSameDay(day, new Date()) ? 'bg-teal-50 dark:bg-teal-900/30' : ''}`}
                                                        style={{ width: `${medicoColumnInfo.effectiveColumnWidth}px`, flexShrink: 0 }}
                                                    >
                                                        <p className="text-[9px] text-gray-500 dark:text-gray-400">{DAYS_OF_WEEK[(day.getDay() + 6) % 7]}</p>
                                                        <p className={`text-[11px] font-semibold ${isSameDay(day, new Date()) ? 'text-teal-600 dark:text-teal-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {day.getDate()}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Medico Time Grid */}
                        <div className="flex">
                            <TimeColumn startHour={viewStartHour} endHour={viewEndHour} hourHeight={effectiveHourHeight} />
                            {displayMedici.map((medico, medicoIdx) => {
                                const virtualAmb = { id: medico.id, nome: `${medico.lastName || medico.cognome || ''} ${medico.firstName || medico.nome || ''}`.trim() } as Ambulatorio;
                                return (
                                    <div
                                        key={medico.id}
                                        className="flex relative"
                                        style={{ flexShrink: 0 }}
                                    >
                                        {medicoIdx > 0 && (
                                            <div
                                                className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none"
                                                style={{
                                                    marginLeft: '-1px',
                                                    width: '2px',
                                                    backgroundImage: 'repeating-linear-gradient(to bottom, #6366f1 0px, #6366f1 4px, transparent 4px, transparent 8px)'
                                                }}
                                            />
                                        )}
                                        {effectiveDisplayDays.map((day, dayIdx) => {
                                            const dayDisp = filteredEvents.disponibilita.filter(d =>
                                                d.medicoId === medico.id && isSameDay(d.start, day)
                                            );
                                            const dayApps = filteredEvents.appuntamenti.filter(a =>
                                                a.medicoId === medico.id && isSameDay(a.start, day)
                                            );
                                            return (
                                                <DayColumn
                                                    key={dayIdx}
                                                    date={day}
                                                    ambulatorio={virtualAmb}
                                                    ambulatorioIndex={medicoIdx}
                                                    disponibilita={dayDisp}
                                                    appuntamenti={dayApps}
                                                    getSlotColor={getSlotColor}
                                                    selectedMedico={selectedMedico}
                                                    onSlotClick={handleSlotClick}
                                                    onEventClick={handleEventClick}
                                                    onDeleteDisponibilita={handleDeleteDisponibilita}
                                                    onEditDisponibilita={handleEditDisponibilita}
                                                    onOpenQueueForSlot={handleOpenQueueForSlot}
                                                    onDeleteAppuntamento={handleAppointmentDelete}
                                                    onAccettazioneAppuntamento={handleAccettazioneAppuntamento}
                                                    onFatturaAppuntamento={handleFatturaAppuntamento}
                                                    onAccettaEVisitaAppuntamento={handleAccettaEVisitaAppuntamento}
                                                    onVisitaAppuntamento={handleVisitaAppuntamento}
                                                    onChiamaEVisitaAppuntamento={handleChiamaEVisitaAppuntamento}
                                                    onViewVisitaAppuntamento={handleViewVisitaAppuntamento}
                                                    onModificaAppuntamento={handleModificaAppuntamento}
                                                    onUpdateStato={handleUpdateStato}
                                                    onDragStart={handleDragStart}
                                                    onDragMove={handleDragMove}
                                                    onDragEnd={handleDragEnd}
                                                    startHour={viewStartHour}
                                                    endHour={viewEndHour}
                                                    columnWidth={medicoColumnInfo.effectiveColumnWidth}
                                                    dragState={dragState}
                                                    draggingEvent={draggingEvent}
                                                    onItemDragStart={handleItemDragStart}
                                                    onDropEvent={handleDropEvent}
                                                    medicoColors={medicoColors}
                                                    hourHeight={effectiveHourHeight}
                                                    isHourOpen={selectedSedeId ? isHourOpen : undefined}
                                                />
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    )}
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <FilterPanel
                        ambulatori={ambulatoriData?.data || []}
                        medici={visibleMedici}
                        selectedAmbulatori={selectedAmbulatori}
                        selectedMedico={selectedMedico}
                        filterMedici={filterMedici}
                        selectedDates={selectedDates}
                        calendarMonth={calendarMonth}
                        medicoColors={medicoColors}
                        viewStartHour={viewStartHour}
                        viewEndHour={viewEndHour}
                        zoomMode={zoomMode}
                        onZoomChange={handleZoomChange}
                        onZoomModeChange={setZoomMode}
                        onAmbulatorioToggle={handleAmbulatorioToggle}
                        onSelectAllAmbulatori={() => setSelectedAmbulatori((ambulatoriData?.data || []).map(a => a.id))}
                        onClearAmbulatori={() => setSelectedAmbulatori([])}
                        onMedicoSelect={setSelectedMedico}
                        onFilterMedicoToggle={(id) => {
                            setFilterMedici(prev =>
                                prev.includes(id)
                                    ? prev.filter(m => m !== id)
                                    : [...prev, id]
                            );
                        }}
                        onSelectAllMedici={(allIds) => setFilterMedici(allIds)}
                        onClearMediciFilter={() => setFilterMedici([])}
                        onToggleSpecialtyMedici={(docIds, select) => {
                            if (select) {
                                setFilterMedici(prev => [...new Set([...prev, ...docIds])]);
                            } else {
                                setFilterMedici(prev => prev.filter(id => !docIds.includes(id)));
                            }
                        }}
                        onDateToggle={(date) => {
                            setSelectedDates(prev => {
                                const exists = prev.some(d => d.toDateString() === date.toDateString());
                                if (exists) {
                                    return prev.filter(d => d.toDateString() !== date.toDateString());
                                } else {
                                    return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
                                }
                            });
                        }}
                        onDatesSelect={(dates) => setSelectedDates(dates)}
                        onMonthChange={(delta) => {
                            setCalendarMonth(prev => {
                                const next = new Date(prev);
                                next.setMonth(next.getMonth() + delta);
                                return next;
                            });
                        }}
                        onClose={() => setShowFilters(false)}
                    />
                )}
            </div>

            {/* Appointment Booking Modal - Opens on single click */}
            <AppointmentBookingModal
                isOpen={!!quickAddInfo}
                onClose={() => setQuickAddInfo(null)}
                slotInfo={quickAddInfo}
                allMedici={manageableMedici}
                medico={(() => {
                    if (!quickAddInfo) return null;
                    // Find disponibilità at this slot
                    const slotDisp = events.disponibilita.find(d => {
                        const startHour = d.start.getHours() + d.start.getMinutes() / 60;
                        const endHour = d.end.getHours() + d.end.getMinutes() / 60;
                        return d.ambulatorioId === quickAddInfo.ambulatorioId &&
                            isSameDay(d.start, quickAddInfo.date) &&
                            quickAddInfo.hour >= startHour &&
                            quickAddInfo.hour < endHour;
                    });
                    if (slotDisp?.medicoId) {
                        return manageableMedici.find(m => m.id === slotDisp.medicoId) || null;
                    }
                    return null;
                })()}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'], refetchType: 'all' });
                }}
            />

            {/* Availability Slot Modal - Opens on drag */}
            <AvailabilitySlotModal
                isOpen={!!availabilityModalInfo}
                onClose={() => setAvailabilityModalInfo(null)}
                slotInfo={availabilityModalInfo}
                medici={manageableMedici}
                selectedMedicoId={availabilityModalInfo?.medicoId || selectedMedico}
                medicoColors={medicoColors}
                existingDisponibilita={events.disponibilita}
                ambulatori={availabilityModalInfo?.ambulatori}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['slots-disponibilita'], refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['slots-calendario'], refetchType: 'all' });
                }}
            />

            {/* Edit Disponibilità Modal - Opens on edit button in tooltip */}
            <EditDisponibilitaModal
                isOpen={!!editingDisponibilita}
                onClose={() => setEditingDisponibilita(null)}
                slot={editingDisponibilita}
                medici={manageableMedici}
                ambulatori={ambulatoriData?.data || []}
                medicoColors={medicoColors}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['slots-disponibilita'], refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['slots-calendario'], refetchType: 'all' });
                    setEditingDisponibilita(null);
                }}
            />

            {/* Queue Session Modal - Opens from Gestisci Coda button in availability tooltip */}
            {queueSlot && (
                <QueueSessionModal
                    isOpen={!!queueSlot}
                    onClose={() => setQueueSlot(null)}
                    slot={queueSlot}
                    ambulatorioId={queueSlot.ambulatorioId || ''}
                    ambulatorioNome={ambulatoriData?.data?.find(a => a.id === queueSlot.ambulatorioId)?.nome}
                    date={queueSlot.start}
                />
            )}

            {/* Bulk Queue Create Modal - Opens from toolbar button */}
            <BulkQueueCreateModal
                isOpen={showBulkQueueModal}
                onClose={() => setShowBulkQueueModal(false)}
                date={currentDate}
                disponibilita={events.disponibilita}
                ambulatori={ambulatoriData?.data || []}
            />

            {/* Appointment Edit Modal - Opens on appointment click */}
            <AppointmentBookingModal
                isOpen={!!editingAppointment}
                onClose={() => setEditingAppointment(null)}
                slotInfo={editingAppointment ? {
                    date: editingAppointment.start,
                    hour: editingAppointment.start.getHours() + editingAppointment.start.getMinutes() / 60,
                    ambulatorioId: editingAppointment.ambulatorioId || ''
                } : null}
                allMedici={manageableMedici}
                medico={editingAppointment?.medicoId ? manageableMedici.find(m => m.id === editingAppointment.medicoId) || null : null}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'], refetchType: 'all' });
                    setEditingAppointment(null);
                }}
                existingAppointment={editingAppointment}
                onDelete={handleAppointmentDelete}
            />

            {/* Accettazione Paziente Modal (Check-in) */}
            {accettazioneAppuntamento && accettazioneAppuntamento.tipo === 'appuntamento' && (
                <AccettazionePazienteModal
                    appuntamento={accettazioneAppuntamento.raw as Appuntamento}
                    isOpen={!!accettazioneAppuntamento}
                    initialTab={accettazioneInitialTab}
                    onClose={() => {
                        setAccettazioneAppuntamento(null);
                        setAccettazioneInitialTab('anagrafica');
                    }}
                    onConfirm={async (patientData) => {
                        try {
                            // Accetta l'appuntamento (usa lo stato selezionato dall'utente)
                            const app = accettazioneAppuntamento.raw as Appuntamento;

                            // 1. Aggiorna data/ora e/o prestazione se modificate
                            const hasDateChange = patientData.dataOraModificata &&
                                patientData.dataOraModificata !== app.dataOra;
                            const hasPrestChange = patientData.prestazioneModificataId &&
                                patientData.prestazioneModificataId !== app.prestazioneId;
                            if (hasDateChange || hasPrestChange) {
                                await appuntamentiApi.update(app.id, {
                                    ...(hasDateChange ? { dataOra: patientData.dataOraModificata as any } : {}),
                                    ...(hasPrestChange ? { prestazioneId: patientData.prestazioneModificataId } : {}),
                                });
                            }

                            // 2. Accetta il paziente
                            const result = await appuntamentiApi.accetta(
                                app.id,
                                {
                                    convenzioneId: patientData.convenzioneId || undefined,
                                    pazienteId: patientData.pazienteId || undefined,
                                    note: patientData.note || undefined,
                                    noteInterne: patientData.noteInterne || undefined,
                                    stato: patientData.stato || undefined,
                                },
                                app.tenantId
                            );

                            // P54: Avviso se non c'era sessione coda attiva
                            if (result.noActiveQueueSession) {
                                showToast({
                                    message: 'Paziente accettato. Nessuna sessione coda attiva: numero non assegnato.',
                                    type: 'warning',
                                    duration: 5000
                                });
                            } else {
                                showToast({ message: result.message || 'Paziente accettato con successo', type: 'success' });
                            }
                            setAccettazioneAppuntamento(null);
                            // Invalidate queries per aggiornare lo stato
                            // P52 Session #11: Aggiunta anche 'appuntamenti-calendario' per refresh calendario
                            queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });
                            queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'], refetchType: 'all' });
                        } catch (error) {
                            showToast({ message: 'Errore durante l\'accettazione', type: 'error' });
                        }
                    }}
                    onSaveAppointmentOnly={async (appointmentData) => {
                        try {
                            const app = accettazioneAppuntamento!.raw as Appuntamento;
                            const updatePayload: Record<string, unknown> = {};
                            if (appointmentData.dataOra) updatePayload.dataOra = appointmentData.dataOra;
                            if (appointmentData.prestazioneId) updatePayload.prestazioneId = appointmentData.prestazioneId;
                            if (appointmentData.pazienteId) updatePayload.pazienteId = appointmentData.pazienteId;
                            if ('convenzioneId' in appointmentData) updatePayload.convenzioneId = appointmentData.convenzioneId || null;
                            if (appointmentData.note !== undefined) updatePayload.note = appointmentData.note;
                            if (appointmentData.noteInterne !== undefined) updatePayload.noteInterne = appointmentData.noteInterne;
                            if (appointmentData.stato) updatePayload.stato = appointmentData.stato;
                            if (Object.keys(updatePayload).length > 0) {
                                await appuntamentiApi.update(app.id, updatePayload as Partial<Appuntamento>);
                            }
                            showToast({ message: 'Appuntamento aggiornato con successo', type: 'success' });
                            setAccettazioneAppuntamento(null);
                            queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });
                            queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'], refetchType: 'all' });
                        } catch {
                            showToast({ message: 'Errore nell\'aggiornamento dell\'appuntamento', type: 'error' });
                        }
                    }}
                />
            )}

            {/* Conferma eliminazione appuntamento — P72_11 */}
            {appuntamentoDaEliminare && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                        <div className={`border-b px-6 py-4 ${appuntamentoDaEliminare.isCompletato ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${appuntamentoDaEliminare.isCompletato ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}>
                                    <Trash2 className={`w-5 h-5 ${appuntamentoDaEliminare.isCompletato ? 'text-orange-600' : 'text-red-600'}`} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Elimina appuntamento</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {appuntamentoDaEliminare.isCompletato
                                            ? 'Appuntamento con movimenti Da fatturare'
                                            : 'Conferma eliminazione'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            {appuntamentoDaEliminare.isCompletato ? (
                                <>
                                    <div className="flex items-start gap-3 mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                                        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-orange-800 dark:text-orange-300">
                                            Questo appuntamento è completato e ha movimenti contabili in stato <strong>"Da fatturare"</strong>. Eliminandolo, i movimenti verranno annullati e non sarà più possibile fatturarli.
                                        </p>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm">Sei sicuro di voler procedere con l'eliminazione?</p>
                                </>
                            ) : (
                                <p className="text-gray-700 dark:text-gray-300 mb-6">
                                    Vuoi eliminare questo appuntamento? I movimenti contabili in bozza associati verranno annullati automaticamente.
                                </p>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setAppuntamentoDaEliminare(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    disabled={deleteAppuntamentoMutation.isPending}
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleConfirmDeleteAppuntamento}
                                    disabled={deleteAppuntamentoMutation.isPending}
                                    className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${appuntamentoDaEliminare.isCompletato ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    {deleteAppuntamentoMutation.isPending ? (
                                        <><RefreshCw className="w-4 h-4 animate-spin" />Eliminazione...</>
                                    ) : (
                                        <><Trash2 className="w-4 h-4" />Elimina{appuntamentoDaEliminare.isCompletato ? ' comunque' : ''}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Conferma Visita con Medico Diverso */}
            {visitaMedicoConfirm && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Medico diverso</h3>
                                    <p className="text-sm text-gray-600">
                                        Stai per visitare un paziente non assegnato a te
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">
                                Questo appuntamento è assegnato a <strong>{visitaMedicoConfirm.medicoAssegnato.firstName} {visitaMedicoConfirm.medicoAssegnato.lastName}</strong>.
                            </p>
                            <p className="text-gray-700 mb-6">
                                Sei sicuro di voler procedere con la visita?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setVisitaMedicoConfirm(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleConfirmVisitaMedicoDiverso}
                                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                                >
                                    Procedi comunque
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Disponibilità Confirmation Dialog */}
            {/* Conferma eliminazione disponibilità - P68: with cascade options */}
            {deleteDisponibilitaInfo && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="bg-red-50 border-b border-red-200 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                </div>
                                <h3 className="font-semibold text-gray-900">Eliminare disponibilità</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            {deleteDisponibilitaInfo.hasPattern ? (
                                <>
                                    <p className="text-gray-700 mb-4">
                                        Questa disponibilità fa parte di un pattern ricorrente. Come vuoi procedere?
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => handleConfirmDeleteDisponibilita(false)}
                                            className="px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-left"
                                        >
                                            <div className="font-semibold">Elimina solo questa</div>
                                            <div className="text-sm text-red-600">Rimuove solo questo slot singolo</div>
                                        </button>
                                        <button
                                            onClick={() => handleConfirmDeleteDisponibilita(true)}
                                            className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-left"
                                        >
                                            <div className="font-semibold">Elimina tutte le future</div>
                                            <div className="text-sm text-red-100">Rimuove questo e tutti gli slot futuri dello stesso pattern</div>
                                        </button>
                                        <button
                                            onClick={() => setDeleteDisponibilitaInfo(null)}
                                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                        >
                                            Annulla
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-gray-700 mb-4">
                                        Sei sicuro di voler eliminare questa disponibilità? L'operazione non è reversibile.
                                    </p>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => setDeleteDisponibilitaInfo(null)}
                                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                        >
                                            Annulla
                                        </button>
                                        <button
                                            onClick={() => handleConfirmDeleteDisponibilita(false)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                        >
                                            Elimina
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {moveDisponibilitaConfirm && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Spostamento disponibilità</h3>
                                    <p className="text-sm text-gray-600">
                                        Questa disponibilità ha {moveDisponibilitaConfirm.appointmentsToMove.length} appuntament{moveDisponibilitaConfirm.appointmentsToMove.length === 1 ? 'o' : 'i'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700 mb-4">
                                Vuoi spostare solo la disponibilità o anche tutti gli appuntamenti già fissati?
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={handleMoveDisponibilitaWithAppointments}
                                    className="w-full px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Sposta disponibilità + {moveDisponibilitaConfirm.appointmentsToMove.length} appuntament{moveDisponibilitaConfirm.appointmentsToMove.length === 1 ? 'o' : 'i'}
                                </button>
                                <button
                                    onClick={handleMoveDisponibilitaOnly}
                                    className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    <Clock className="w-4 h-4" />
                                    Sposta solo la disponibilità
                                </button>
                                <button
                                    onClick={() => setMoveDisponibilitaConfirm(null)}
                                    className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                                >
                                    Annulla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarioPage;
