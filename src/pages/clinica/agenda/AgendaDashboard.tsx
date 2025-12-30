/**
 * AgendaDashboard - Dashboard principale del modulo Agenda
 * 
 * Mostra statistiche giornaliere, appuntamenti in arrivo e quick actions.
 * 
 * @module pages/poliambulatorio/agenda/AgendaDashboard
 */

import React, { useMemo } from 'react';
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
    RefreshCw
} from 'lucide-react';
import { appuntamentiApi, StatoAppuntamento } from '../../../services/clinicaApi';
import { formatDate, formatTime } from '../../../utils/dateUtils';
import { getDoctorTitle } from '../../../utils/codiceFiscale';

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
    NO_SHOW: { label: 'No Show', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: AlertCircle }
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
        paziente?: { nome: string; cognome: string };
        medico?: { nome: string; cognome: string };
        prestazione?: { nome: string };
        ambulatorio?: { nome: string };
    };
    onClick: () => void;
}> = ({ appuntamento, onClick }) => {
    const statoConfig = STATO_CONFIG[appuntamento.stato];
    const Icon = statoConfig.icon;

    const dataOra = new Date(appuntamento.dataOra);
    const oraFine = new Date(dataOra.getTime() + appuntamento.durataPrevista * 60000);

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:shadow-sm cursor-pointer transition-all"
        >
            {/* Time Column */}
            <div className="text-center min-w-[60px]">
                <p className="text-lg font-bold text-gray-900">{formatTime(dataOra)}</p>
                <p className="text-xs text-gray-500">{formatTime(oraFine)}</p>
            </div>

            {/* Status Indicator */}
            <div className={`w-1 h-12 rounded-full ${statoConfig.bgColor.replace('bg-', 'bg-').replace('-100', '-500')}`} />

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">
                        {appuntamento.paziente
                            ? `${appuntamento.paziente.cognome} ${appuntamento.paziente.nome}`
                            : 'Paziente'}
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
                            {getDoctorTitle((appuntamento.medico as any).taxCode, (appuntamento.medico as any).gender)} {appuntamento.medico.cognome}
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
// MAIN COMPONENT
// ============================================

export const AgendaDashboard: React.FC = () => {
    const navigate = useNavigate();

    // Query: Today's appointments
    const { data: todayAppuntamenti, isLoading } = useQuery({
        queryKey: ['appuntamenti-today'],
        queryFn: () => appuntamentiApi.getToday()
    });

    // Query: All appointments for stats
    const { data: allAppuntamenti } = useQuery({
        queryKey: ['appuntamenti', { limit: 100 }],
        queryFn: () => appuntamentiApi.getAll({ limit: 100 })
    });

    // Calculate stats
    const stats: DashboardStats = useMemo(() => {
        const today = todayAppuntamenti || [];
        const all = allAppuntamenti?.data || [];

        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const thisWeek = all.filter(a => {
            const d = new Date(a.dataOra);
            return d >= weekStart && d < weekEnd;
        });

        return {
            oggi: {
                totale: today.length,
                confermati: today.filter(a => a.stato === 'CONFERMATO' || a.stato === 'IN_ATTESA').length,
                inAttesa: today.filter(a => a.stato === 'IN_ATTESA').length,
                completati: today.filter(a => a.stato === 'COMPLETATO').length,
                noShow: today.filter(a => a.stato === 'NO_SHOW').length
            },
            settimana: {
                totale: thisWeek.length,
                confermati: thisWeek.filter(a => a.stato === 'CONFERMATO').length
            },
            prossimi: all.filter(a =>
                new Date(a.dataOra) > now &&
                ['PRENOTATO', 'CONFERMATO'].includes(a.stato)
            ).length
        };
    }, [todayAppuntamenti, allAppuntamenti]);

    // Upcoming appointments (next 5)
    const upcomingAppuntamenti = useMemo(() => {
        const today = todayAppuntamenti || [];
        const now = new Date();
        return today
            .filter(a => new Date(a.dataOra) > now && ['PRENOTATO', 'CONFERMATO', 'IN_ATTESA'].includes(a.stato))
            .sort((a, b) => new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime())
            .slice(0, 5);
    }, [todayAppuntamenti]);

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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
                        <p className="text-gray-500 mt-1">
                            {formatDate(new Date(), 'full')}
                        </p>
                    </div>
                    <Link
                        to="/poliambulatorio/agenda/nuovo"
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Nuovo Appuntamento
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Appuntamenti Oggi"
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
                                    <p className="text-sm mt-1">Gli appuntamenti di oggi appariranno qui</p>
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
                            Riepilogo Giornaliero
                        </h2>
                    </div>
                    <div className="p-4">
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(STATO_CONFIG).map(([stato, config]) => {
                                const count = (todayAppuntamenti || []).filter(a => a.stato === stato).length;
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
                            {(todayAppuntamenti || []).length === 0 && (
                                <p className="text-gray-500 text-sm">Nessun appuntamento per oggi</p>
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

export default AgendaDashboard;
