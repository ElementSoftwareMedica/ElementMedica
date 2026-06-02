/**
 * AgendaDashboard - Dashboard principale del modulo Agenda
 * 
 * Mostra statistiche giornaliere, appuntamenti in arrivo e quick actions.
 * 
 * @module pages/poliambulatorio/agenda/AgendaDashboard
 */

import React, { useMemo, useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Calendar,
    Clock,
    Users,
    CheckCircle,
    XCircle,
    AlertCircle,
    Plus,
    ArrowRight,
    CalendarDays,
    CalendarClock,
    UserCheck,
    Timer,
    TrendingUp,
    Stethoscope,
    Building2,
    RefreshCw,
    Receipt,
    RotateCcw
} from 'lucide-react';
import { appuntamentiApi, StatoAppuntamento } from '../../../services/clinicaApi';
import { formatDate, formatTime } from '../../../utils/dateUtils';
import { getDoctorTitle } from '../../../utils/codiceFiscale';
import { getPersonDisplayName } from '../../../utils/personDisplayUtils';
import { AgendaFilters } from '../../../components/filters';
import { useDateFilter } from '../../../hooks/useDateFilter';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { useAuth } from '../../../context/AuthContext';

const MedicoDashboardLazy = lazy(() =>
    import('../clinica/MedicoDashboard').then(m => ({ default: m.default }))
);

// ============================================
// TYPES
// ============================================

interface DashboardStats {
    oggi: {
        totale: number;
        confermati: number;
        inAttesa: number;
        completati: number;
        noShow: number;
    };
    settimana: {
        totale: number;
        confermati: number;
    };
    prossimi: number;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY_DATE = 'agenda-selected-date';

const STATO_CONFIG: Record<StatoAppuntamento, {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ElementType
}> = {
    PRENOTATO: { label: 'Prenotato', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Calendar },
    CONFERMATO: { label: 'Confermato', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
    IN_ATTESA: { label: 'In Attesa', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Clock },
    IN_CORSO: { label: 'In Corso', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Timer },
    COMPLETATO: { label: 'Completato', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: CheckCircle },
    ANNULLATO: { label: 'Annullato', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
    NO_SHOW: { label: 'No Show', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: AlertCircle },
    FATTURATO: { label: 'Fatturato', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Receipt },
    RINVIATO: { label: 'Rinviato', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: RotateCcw }
};

// ============================================
// COMPONENTS
// ============================================

/**
 * Stat Card Component
 */
const StatCard: React.FC<{
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ElementType;
    color: string;
    trend?: { value: number; label: string };
}> = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
                {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
                {trend && (
                    <p className={`text-xs mt-2 flex items-center gap-1 ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <TrendingUp className={`h-3 w-3 ${trend.value < 0 ? 'rotate-180' : ''}`} />
                        {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
                    </p>
                )}
            </div>
            <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-700', '-100')}`}>
                <Icon className={`h-6 w-6 ${color}`} />
            </div>
        </div>
    </div>
);

/**
 * Appuntamento Card for upcoming list
 */
const AppuntamentoCard: React.FC<{
    appuntamento: {
        id: string;
        dataOra: string;
        durataPrevista: number;
        stato: StatoAppuntamento;
        oraInizio?: string;
        oraFine?: string;
        paziente?: { firstName: string; lastName: string };
        medico?: { firstName: string; lastName: string };
        prestazione?: { nome: string };
        ambulatorio?: { nome: string };
    };
    onClick: () => void;
}> = ({ appuntamento, onClick }) => {
    const statoConfig = STATO_CONFIG[appuntamento.stato];
    const Icon = statoConfig.icon;

    // Use actual visit times when available (completed visits)
    const bookingTime = new Date(appuntamento.dataOra);
    const dataOra = appuntamento.oraInizio ? new Date(appuntamento.oraInizio) : bookingTime;
    const oraFine = appuntamento.oraFine
        ? new Date(appuntamento.oraFine)
        : new Date(bookingTime.getTime() + appuntamento.durataPrevista * 60000);

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:shadow-sm cursor-pointer transition-all"
        >
            {/* Time Column */}
            <div className="text-center min-w-[60px]">
                {/* Show date if appointment is on a different day */}
                {(() => {
                    const today = new Date();
                    const appDate = new Date(appuntamento.dataOra);
                    if (appDate.toDateString() !== today.toDateString()) {
                        return <p className="text-[10px] text-teal-600 font-medium">{appDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</p>;
                    }
                    return null;
                })()}
                <p className="text-lg font-bold text-gray-900">{formatTime(dataOra)}</p>
                <p className="text-xs text-gray-500">{formatTime(oraFine)}</p>
            </div>

            {/* Status Indicator */}
            <div className={`w-1 h-12 rounded-full ${statoConfig.bgColor.replace('bg-', 'bg-').replace('-100', '-500')}`} />

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                        {getPersonDisplayName(appuntamento.paziente, 'Paziente')}
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${statoConfig.bgColor} ${statoConfig.color}`}>
                        <Icon className="h-3 w-3" />
                        {statoConfig.label}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    {appuntamento.prestazione && (
                        <span className="flex items-center gap-1">
                            <Stethoscope className="h-3.5 w-3.5" />
                            {appuntamento.prestazione.nome}
                        </span>
                    )}
                    {appuntamento.medico && (
                        <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {getDoctorTitle((appuntamento.medico as any).taxCode, (appuntamento.medico as any).gender)} {getPersonDisplayName(appuntamento.medico)}
                        </span>
                    )}
                    {appuntamento.ambulatorio && (
                        <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {appuntamento.ambulatorio.nome}
                        </span>
                    )}
                </div>
            </div>

            <ArrowRight className="h-5 w-5 text-gray-400" />
        </div>
    );
};

/**
 * Quick Action Button
 */
const QuickAction: React.FC<{
    label: string;
    icon: React.ElementType;
    to: string;
    color?: string;
}> = ({ label, icon: Icon, to, color = 'teal' }) => (
    <Link
        to={to}
        className={`
      flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed
      transition-all hover:border-solid
      border-${color}-300 hover:border-${color}-500 hover:bg-${color}-50
      text-${color}-600 hover:text-${color}-700
    `}
    >
        <Icon className="h-6 w-6" />
        <span className="text-sm font-medium text-center">{label}</span>
    </Link>
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format date to YYYY-MM-DD for API calls
 */
const formatDateForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Check if two dates are the same day
 */
const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

type ListResponse<T> = T[] | { data?: T[] | { data?: T[]; items?: T[] }; items?: T[]; results?: T[] } | null | undefined;

const asList = <T,>(value: ListResponse<T>): T[] => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    const data = value.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.items)) return data.items;
    }
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.results)) return value.results;
    return [];
};

// ============================================
// MAIN COMPONENT
// ============================================

const AgendaDashboardContent: React.FC = () => {
    const navigate = useNavigate();

    // Tenant filter for multi-tenant support
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    // Date filter with daily reset - resets to today on first access of the day
    const dateFilter = useDateFilter({
        storageKey: 'agenda-dashboard-date-filter',
        mode: 'single',
        defaultDate: new Date()
    });

    // State for selected date using dateFilter hook
    const selectedDate = dateFilter.selectedDate;
    const isToday = dateFilter.isToday;
    const selectedDateStr = formatDateForApi(selectedDate);

    // Handle date changes
    const handleDateChange = (newDate: Date) => {
        dateFilter.setDate(newDate);
    };

    // Build tenant-aware query params
    const tenantParams = useMemo(() => {
        const params = getTenantFilterParams();
        return {
            ...(params.tenantIds && { tenantIds: params.tenantIds.join(',') }),
            ...(params.allTenants && { allTenants: 'true' })
        };
    }, [getTenantFilterParams, tenantFilterKey]);

    // Query: Appointments for selected date (tenant-filtered)
    const { data: dayAppuntamenti, isLoading, refetch } = useQuery({
        queryKey: ['appuntamenti-day', selectedDateStr, tenantFilterKey],
        queryFn: () => isToday
            ? appuntamentiApi.getToday()
            : appuntamentiApi.getByDate(selectedDateStr).then(res => res.data),
        enabled: isReady
    });

    // Query: Week appointments for stats (tenant-filtered, date-scoped)
    const weekRange = useMemo(() => {
        const weekStart = new Date(selectedDate);
        weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
            start: formatDateForApi(weekStart),
            end: formatDateForApi(weekEnd)
        };
    }, [selectedDate]);

    const { data: weekAppuntamenti } = useQuery({
        queryKey: ['appuntamenti-week', weekRange.start, weekRange.end, tenantFilterKey],
        queryFn: () => appuntamentiApi.getAll({
            ...tenantParams,
            dataInizio: weekRange.start,
            dataFine: weekRange.end,
            limit: 500
        }),
        enabled: isReady
    });

    // Query: Upcoming appointments (next 5 from now)
    const { data: upcomingData } = useQuery({
        queryKey: ['appuntamenti-upcoming', tenantFilterKey],
        queryFn: () => appuntamentiApi.getAll({
            ...tenantParams,
            dataInizio: formatDateForApi(new Date()),
            limit: 50
        }),
        enabled: isReady
    });

    // Calculate stats - based on selected date data and week data
    const stats: DashboardStats = useMemo(() => {
        const dayData = asList(dayAppuntamenti);
        const weekData = asList(weekAppuntamenti);

        // Week totals from dedicated week query
        const weekConfermati = weekData.filter(a => a.stato === 'CONFERMATO').length;

        // "Prossimi" from selected date perspective
        const selectedDateStart = new Date(selectedDate);
        selectedDateStart.setHours(0, 0, 0, 0);

        const prossimi = weekData.filter(a =>
            new Date(a.dataOra) > selectedDateStart &&
            ['PRENOTATO', 'CONFERMATO'].includes(a.stato)
        ).length;

        return {
            oggi: {
                totale: dayData.length,
                confermati: dayData.filter(a => a.stato === 'CONFERMATO' || a.stato === 'IN_ATTESA').length,
                inAttesa: dayData.filter(a => a.stato === 'IN_ATTESA').length,
                completati: dayData.filter(a => a.stato === 'COMPLETATO').length,
                noShow: dayData.filter(a => a.stato === 'NO_SHOW').length
            },
            settimana: {
                totale: weekData.length,
                confermati: weekConfermati
            },
            prossimi
        };
    }, [dayAppuntamenti, weekAppuntamenti, selectedDate]);

    // All appointments for the day, sorted chronologically
    const dayAppuntamentiSorted = useMemo(() => {
        const dayData = asList(dayAppuntamenti);
        return [...dayData].sort((a, b) =>
            new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime()
        );
    }, [dayAppuntamenti]);

    // Upcoming appointments (next 5 from now, across all dates)
    const upcomingAppuntamenti = useMemo(() => {
        const now = new Date();
        const all = asList(upcomingData);

        // From upcoming appointments, find next 5 future ones (PRENOTATO/CONFERMATO/IN_ATTESA)
        return [...all]
            .filter(a =>
                new Date(a.dataOra) > now &&
                ['PRENOTATO', 'CONFERMATO', 'IN_ATTESA'].includes(a.stato)
            )
            .sort((a, b) => new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime())
            .slice(0, 5);
    }, [upcomingData]);

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
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="h-7 w-7 text-teal-600" />
                            Dashboard Agenda
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Panoramica appuntamenti e attività del giorno
                        </p>
                    </div>

                    <Link
                        to="/poliambulatorio/calendario"
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all shadow-md hover:shadow-lg font-medium"
                    >
                        <Plus className="h-5 w-5" />
                        Nuovo Appuntamento
                    </Link>
                </div>

                {/* Date Filters with elegant calendar */}
                <AgendaFilters
                    selectedDate={selectedDate}
                    onDateChange={handleDateChange}
                    onRefresh={() => refetch()}
                    isLoading={isLoading}
                />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title={isToday ? "Appuntamenti Oggi" : "Appuntamenti del Giorno"}
                        value={stats.oggi.totale}
                        subtitle={`${stats.oggi.completati} completati`}
                        icon={CalendarDays}
                        color="text-teal-700"
                    />
                    <StatCard
                        title="In Attesa"
                        value={stats.oggi.inAttesa}
                        subtitle="Da chiamare"
                        icon={Clock}
                        color="text-amber-700"
                    />
                    <StatCard
                        title="Questa Settimana"
                        value={stats.settimana.totale}
                        subtitle={`${stats.settimana.confermati} confermati`}
                        icon={Calendar}
                        color="text-blue-700"
                    />
                    <StatCard
                        title="Prossimi"
                        value={stats.prossimi}
                        subtitle="Da confermare"
                        icon={CalendarClock}
                        color="text-purple-700"
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Upcoming Appointments */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-teal-600" />
                                Prossimi Appuntamenti
                            </h2>
                            <Link
                                to="/poliambulatorio/agenda/calendario"
                                className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                            >
                                Vedi calendario
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="p-4 space-y-3">
                            {upcomingAppuntamenti.length > 0 ? (
                                upcomingAppuntamenti.map(app => (
                                    <AppuntamentoCard
                                        key={app.id}
                                        appuntamento={app as any}
                                        onClick={() => navigate(`/poliambulatorio/agenda/appuntamenti/${app.id}`)}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium">Nessun appuntamento in programma</p>
                                    <p className="text-sm mt-1">I prossimi appuntamenti appariranno qui</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">Azioni Rapide</h2>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3">
                            <QuickAction
                                label="Nuovo Appuntamento"
                                icon={Plus}
                                to="/poliambulatorio/agenda/nuovo"
                            />
                            <QuickAction
                                label="Calendario"
                                icon={CalendarDays}
                                to="/poliambulatorio/agenda/calendario"
                            />
                            <QuickAction
                                label="Accettazione"
                                icon={UserCheck}
                                to="/poliambulatorio/agenda/accettazione"
                            />
                            <QuickAction
                                label="Disponibilità"
                                icon={CalendarClock}
                                to="/poliambulatorio/agenda/disponibilita"
                            />
                        </div>
                    </div>
                </div>

                {/* Today's Summary */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-teal-600" />
                            Riepilogo {isToday ? 'Giornaliero' : `del ${formatDate(selectedDate, 'short')}`}
                        </h2>
                    </div>
                    <div className="p-4">
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(STATO_CONFIG).map(([stato, config]) => {
                                const count = (dayAppuntamenti || []).filter(a => a.stato === stato).length;
                                if (count === 0) return null;
                                const Icon = config.icon;
                                return (
                                    <div
                                        key={stato}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor}`}
                                    >
                                        <Icon className={`h-4 w-4 ${config.color}`} />
                                        <span className={`text-sm font-medium ${config.color}`}>
                                            {count} {config.label}
                                        </span>
                                    </div>
                                );
                            })}
                            {(dayAppuntamenti || []).length === 0 && (
                                <p className="text-gray-500 text-sm">Nessun appuntamento per {isToday ? 'oggi' : 'questo giorno'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Links to other sections */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Link
                        to="/poliambulatorio/agenda/appuntamenti"
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:shadow-sm transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-100 rounded-lg">
                                <Calendar className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Tutti gli Appuntamenti</p>
                                <p className="text-sm text-gray-500">Gestisci prenotazioni</p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                    </Link>

                    <Link
                        to="/poliambulatorio/agenda/disponibilita"
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:shadow-sm transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <CalendarClock className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Disponibilità Medici</p>
                                <p className="text-sm text-gray-500">Orari e ferie</p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                    </Link>

                    <Link
                        to="/poliambulatorio/agenda/accettazione"
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:shadow-sm transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <UserCheck className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">Accettazione</p>
                                <p className="text-sm text-gray-500">Check-in pazienti</p>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

/**
 * AgendaDashboard - Role-based wrapper
 * - MEDICO role → renders MedicoDashboard (doctor's personal agenda view)
 * - Other roles → renders full agenda dashboard (admin/receptionist view)
 */
export const AgendaDashboard: React.FC = () => {
    const { user } = useAuth();
    const isMedico = user?.roles?.includes('MEDICO') ?? false;

    if (isMedico) {
        return (
            <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                </div>
            }>
                <MedicoDashboardLazy />
            </Suspense>
        );
    }

    return <AgendaDashboardContent />;
};

export default AgendaDashboard;
