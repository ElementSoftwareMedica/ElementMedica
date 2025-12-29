/**
 * AgendaCalendar - Calendario appuntamenti con viste day/week/month
 * 
 * Supporta drag&drop, filtri per medico/ambulatorio, e quick actions.
 * 
 * @module pages/poliambulatorio/agenda/AgendaCalendar
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Filter,
    Grid3X3,
    List,
    Clock,
    Users,
    Building2,
    Stethoscope,
    RefreshCw,
    LayoutGrid,
    CalendarDays,
    X
} from 'lucide-react';
import { appuntamentiApi, ambulatoriApi, StatoAppuntamento, Appuntamento, Ambulatorio } from '../../../services/clinicaApi';
import { formatDate, formatTime } from '../../../utils/dateUtils';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { getDoctorTitle } from '../../../utils/codiceFiscale';

// ============================================
// TYPES
// ============================================

type ViewType = 'day' | 'week' | 'month';

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    stato: StatoAppuntamento;
    paziente?: string;
    medico?: string;
    ambulatorio?: string;
    prestazione?: string;
    raw: Appuntamento;
}

interface TimeSlot {
    hour: number;
    events: CalendarEvent[];
}

// ============================================
// CONSTANTS
// ============================================

const STATO_COLORS: Record<StatoAppuntamento, string> = {
    PRENOTATO: 'bg-blue-500',
    CONFERMATO: 'bg-green-500',
    IN_ATTESA: 'bg-amber-500',
    IN_CORSO: 'bg-purple-500',
    COMPLETATO: 'bg-gray-400',
    ANNULLATO: 'bg-red-400',
    NO_SHOW: 'bg-orange-500'
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7:00 - 19:00
const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const DAYS_FULL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getWeekDays = (date: Date): Date[] => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay() + 1); // Start from Monday
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
};

const getMonthDays = (date: Date): Date[][] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    // Fill initial empty days
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDay; i++) {
        const d = new Date(firstDay);
        d.setDate(d.getDate() - (startDay - i));
        currentWeek.push(d);
    }

    // Fill month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        currentWeek.push(new Date(year, month, d));
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    // Fill remaining days
    if (currentWeek.length > 0) {
        let nextDay = 1;
        while (currentWeek.length < 7) {
            currentWeek.push(new Date(year, month + 1, nextDay++));
        }
        weeks.push(currentWeek);
    }

    return weeks;
};

const isSameDay = (d1: Date, d2: Date): boolean =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

// ============================================
// COMPONENTS
// ============================================

/**
 * Event Card for calendar
 */
const EventCard: React.FC<{
    event: CalendarEvent;
    compact?: boolean;
    onClick: () => void;
}> = ({ event, compact, onClick }) => (
    <div
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`
      ${STATO_COLORS[event.stato]} text-white rounded px-2 py-1 text-xs cursor-pointer
      hover:opacity-90 transition-opacity truncate
      ${compact ? 'h-5' : 'min-h-[60px]'}
    `}
        title={`${event.title} - ${formatTime(event.start)}`}
    >
        {compact ? (
            <span className="truncate">{formatTime(event.start)} {event.paziente}</span>
        ) : (
            <div className="space-y-0.5">
                <p className="font-medium truncate">{formatTime(event.start)} - {formatTime(event.end)}</p>
                <p className="truncate">{event.paziente}</p>
                {event.prestazione && <p className="truncate opacity-80">{event.prestazione}</p>}
            </div>
        )}
    </div>
);

/**
 * Day View Component
 */
const DayView: React.FC<{
    date: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onSlotClick: (hour: number) => void;
}> = ({ date, events, onEventClick, onSlotClick }) => {
    const timeSlots: TimeSlot[] = HOURS.map(hour => ({
        hour,
        events: events.filter(e => e.start.getHours() === hour)
    }));

    return (
        <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-3 text-center">
                <p className="text-lg font-semibold text-gray-900">
                    {DAYS_FULL[date.getDay()]} {date.getDate()} {MONTHS[date.getMonth()]}
                </p>
            </div>

            {/* Time slots */}
            <div className="flex-1 overflow-y-auto max-h-[600px]">
                {timeSlots.map(({ hour, events: hourEvents }) => (
                    <div
                        key={hour}
                        className="flex border-b border-gray-100 min-h-[60px] hover:bg-gray-50 cursor-pointer"
                        onClick={() => onSlotClick(hour)}
                    >
                        {/* Time label */}
                        <div className="w-16 flex-shrink-0 p-2 text-right text-sm text-gray-500 border-r border-gray-100">
                            {hour.toString().padStart(2, '0')}:00
                        </div>

                        {/* Events */}
                        <div className="flex-1 p-1 space-y-1">
                            {hourEvents.map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onClick={() => onEventClick(event)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Week View Component
 */
const WeekView: React.FC<{
    date: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onSlotClick: (date: Date, hour: number) => void;
}> = ({ date, events, onEventClick, onSlotClick }) => {
    const weekDays = getWeekDays(date);
    const today = new Date();

    const getEventsForDayHour = (day: Date, hour: number) =>
        events.filter(e => isSameDay(e.start, day) && e.start.getHours() === hour);

    return (
        <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
                <div className="p-2 border-r border-gray-200" />
                {weekDays.map((day, i) => (
                    <div
                        key={i}
                        className={`p-2 text-center border-r border-gray-200 last:border-r-0 ${isSameDay(day, today) ? 'bg-teal-50' : ''
                            }`}
                    >
                        <p className="text-xs text-gray-500">{DAYS_OF_WEEK[day.getDay()]}</p>
                        <p className={`text-lg font-semibold ${isSameDay(day, today) ? 'text-teal-600' : 'text-gray-900'
                            }`}>
                            {day.getDate()}
                        </p>
                    </div>
                ))}
            </div>

            {/* Time grid */}
            <div className="flex-1 overflow-y-auto max-h-[600px]">
                {HOURS.map(hour => (
                    <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
                        <div className="p-2 text-right text-xs text-gray-500 border-r border-gray-100">
                            {hour.toString().padStart(2, '0')}:00
                        </div>
                        {weekDays.map((day, i) => {
                            const hourEvents = getEventsForDayHour(day, hour);
                            return (
                                <div
                                    key={i}
                                    className="min-h-[50px] p-0.5 border-r border-gray-100 last:border-r-0 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => onSlotClick(day, hour)}
                                >
                                    {hourEvents.map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            compact
                                            onClick={() => onEventClick(event)}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Month View Component
 */
const MonthView: React.FC<{
    date: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onDayClick: (date: Date) => void;
}> = ({ date, events, onEventClick, onDayClick }) => {
    const weeks = getMonthDays(date);
    const today = new Date();
    const currentMonth = date.getMonth();

    const getEventsForDay = (day: Date) =>
        events.filter(e => isSameDay(e.start, day));

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {DAYS_OF_WEEK.map((day, i) => (
                    <div key={i} className="p-2 text-center text-sm font-medium text-gray-600 border-r border-gray-200 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-100 last:border-b-0">
                    {week.map((day, dayIndex) => {
                        const dayEvents = getEventsForDay(day);
                        const isToday = isSameDay(day, today);
                        const isCurrentMonth = day.getMonth() === currentMonth;

                        return (
                            <div
                                key={dayIndex}
                                className={`
                  min-h-[100px] p-1 border-r border-gray-100 last:border-r-0 cursor-pointer
                  ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'}
                `}
                                onClick={() => onDayClick(day)}
                            >
                                <p className={`
                  text-sm mb-1 
                  ${isToday
                                        ? 'w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center'
                                        : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                                    }
                `}>
                                    {day.getDate()}
                                </p>
                                <div className="space-y-0.5">
                                    {dayEvents.slice(0, 3).map(event => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            compact
                                            onClick={() => onEventClick(event)}
                                        />
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <p className="text-xs text-gray-500 text-center">
                                            +{dayEvents.length - 3} altri
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

/**
 * Filter Panel Component
 */
const FilterPanel: React.FC<{
    ambulatori: Ambulatorio[];
    selectedAmbulatorio: string | null;
    onAmbulatorioChange: (id: string | null) => void;
    onClose: () => void;
}> = ({ ambulatori, selectedAmbulatorio, onAmbulatorioChange, onClose }) => (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4">
        <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Filtri</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-4 w-4" />
            </button>
        </div>

        <div>
            <label className="block text-sm text-gray-600 mb-2">Ambulatorio</label>
            <select
                value={selectedAmbulatorio || ''}
                onChange={(e) => onAmbulatorioChange(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
                <option value="">Tutti gli ambulatori</option>
                {ambulatori.map(amb => (
                    <option key={amb.id} value={amb.id}>{amb.nome}</option>
                ))}
            </select>
        </div>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const AgendaCalendar: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Tenant filter from global context
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();

    // State
    const [currentDate, setCurrentDate] = useState(() => {
        const dateParam = searchParams.get('date');
        return dateParam ? new Date(dateParam) : new Date();
    });
    const [view, setView] = useState<ViewType>(() =>
        (searchParams.get('view') as ViewType) || 'week'
    );
    const [showFilters, setShowFilters] = useState(false);
    const [selectedAmbulatorio, setSelectedAmbulatorio] = useState<string | null>(
        searchParams.get('ambulatorio')
    );

    // Query: Appointments
    const { data: appuntamentiData, isLoading } = useQuery({
        queryKey: ['appuntamenti-calendar', currentDate.toISOString(), view, tenantFilterKey],
        queryFn: async () => {
            // Calculate date range based on view
            const start = new Date(currentDate);
            const end = new Date(currentDate);

            if (view === 'day') {
                // Just the current day
            } else if (view === 'week') {
                start.setDate(currentDate.getDate() - currentDate.getDay() + 1);
                end.setDate(start.getDate() + 6);
            } else {
                start.setDate(1);
                end.setMonth(currentDate.getMonth() + 1);
                end.setDate(0);
            }

            const tenantParams = getTenantFilterParams();

            return appuntamentiApi.getAll({
                limit: 500,
                filters: {
                    dataInizio: start.toISOString(),
                    dataFine: end.toISOString(),
                    ...(selectedAmbulatorio && { ambulatorioId: selectedAmbulatorio }),
                    ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                    ...(tenantParams.allTenants && { allTenants: 'true' })
                }
            });
        },
        enabled: isReady
    });

    // Query: Ambulatori for filters
    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-calendar', tenantFilterKey],
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

    // Transform appointments to events
    const events: CalendarEvent[] = useMemo(() => {
        const apps = appuntamentiData?.data || [];
        return apps.map(app => {
            const start = new Date(app.dataOra);
            const end = new Date(start.getTime() + app.durataPrevista * 60000);
            return {
                id: app.id,
                title: app.prestazione?.nome || 'Appuntamento',
                start,
                end,
                stato: app.stato,
                paziente: app.paziente ? `${app.paziente.cognome} ${app.paziente.nome}` : undefined,
                medico: app.medico ? `${getDoctorTitle(app.medico.taxCode || null, app.medico.gender || null)} ${app.medico.cognome}` : undefined,
                ambulatorio: app.ambulatorio?.nome,
                prestazione: app.prestazione?.nome,
                raw: app
            };
        });
    }, [appuntamentiData]);

    // Navigation handlers
    const navigateDate = useCallback((delta: number) => {
        const newDate = new Date(currentDate);
        if (view === 'day') {
            newDate.setDate(currentDate.getDate() + delta);
        } else if (view === 'week') {
            newDate.setDate(currentDate.getDate() + (delta * 7));
        } else {
            newDate.setMonth(currentDate.getMonth() + delta);
        }
        setCurrentDate(newDate);
    }, [currentDate, view]);

    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    // Event handlers
    const handleEventClick = useCallback((event: CalendarEvent) => {
        navigate(`/poliambulatorio/agenda/appuntamenti/${event.id}`);
    }, [navigate]);

    const handleSlotClick = useCallback((date: Date, hour?: number) => {
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '09:00';
        navigate(`/poliambulatorio/agenda/nuovo?data=${dateStr}&ora=${timeStr}`);
    }, [navigate]);

    const handleDayClick = useCallback((date: Date) => {
        setCurrentDate(date);
        setView('day');
    }, []);

    // Header title based on view
    const headerTitle = useMemo(() => {
        if (view === 'day') {
            return formatDate(currentDate, 'full');
        } else if (view === 'week') {
            const weekDays = getWeekDays(currentDate);
            const start = weekDays[0];
            const end = weekDays[6];
            if (start.getMonth() === end.getMonth()) {
                return `${start.getDate()} - ${end.getDate()} ${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
            }
            return `${start.getDate()} ${MONTHS[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
        } else {
            return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
    }, [currentDate, view]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigateDate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                onClick={goToToday}
                                className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg"
                            >
                                Oggi
                            </button>
                            <button
                                onClick={() => navigateDate(1)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                        <h2 className="text-lg font-medium text-gray-700">{headerTitle}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Toggle */}
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                            <button
                                onClick={() => setView('day')}
                                className={`p-2 rounded ${view === 'day' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                title="Vista giorno"
                            >
                                <Clock className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setView('week')}
                                className={`p-2 rounded ${view === 'week' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                title="Vista settimana"
                            >
                                <CalendarDays className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setView('month')}
                                className={`p-2 rounded ${view === 'month' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:bg-gray-100'}`}
                                title="Vista mese"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 border rounded-lg ${selectedAmbulatorio
                                    ? 'border-teal-300 bg-teal-50 text-teal-700'
                                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                <Filter className="h-5 w-5" />
                            </button>
                            {showFilters && (
                                <FilterPanel
                                    ambulatori={ambulatoriData?.data || []}
                                    selectedAmbulatorio={selectedAmbulatorio}
                                    onAmbulatorioChange={setSelectedAmbulatorio}
                                    onClose={() => setShowFilters(false)}
                                />
                            )}
                        </div>

                        {/* New Appointment */}
                        <button
                            onClick={() => navigate('/poliambulatorio/agenda/nuovo')}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="hidden sm:inline">Nuovo</span>
                        </button>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-2 bg-white border border-gray-200 rounded-lg p-3">
                    {Object.entries(STATO_COLORS).map(([stato, color]) => (
                        <div key={stato} className="flex items-center gap-1.5 text-xs">
                            <div className={`w-3 h-3 rounded ${color}`} />
                            <span className="text-gray-600 capitalize">{stato.toLowerCase().replace('_', ' ')}</span>
                        </div>
                    ))}
                </div>

                {/* Calendar View */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {view === 'day' && (
                        <DayView
                            date={currentDate}
                            events={events}
                            onEventClick={handleEventClick}
                            onSlotClick={(hour) => handleSlotClick(currentDate, hour)}
                        />
                    )}
                    {view === 'week' && (
                        <WeekView
                            date={currentDate}
                            events={events}
                            onEventClick={handleEventClick}
                            onSlotClick={handleSlotClick}
                        />
                    )}
                    {view === 'month' && (
                        <MonthView
                            date={currentDate}
                            events={events}
                            onEventClick={handleEventClick}
                            onDayClick={handleDayClick}
                        />
                    )}
                </div>

                {/* Stats summary */}
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-teal-600" />
                            <strong>{events.length}</strong> appuntamenti
                        </span>
                        <span className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <strong>{new Set(events.map(e => e.paziente)).size}</strong> pazienti
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/poliambulatorio/agenda/appuntamenti')}
                        className="text-sm text-teal-600 hover:text-teal-700"
                    >
                        Vedi lista completa →
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgendaCalendar;
