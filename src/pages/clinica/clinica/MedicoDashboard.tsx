/**
 * MedicoDashboard - Dashboard dedicata per il medico
 * 
 * Mostra agenda giornaliera, pazienti in attesa, 
 * statistiche e notifiche urgenti.
 * 
 * @module pages/poliambulatorio/clinica/MedicoDashboard
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
    Calendar,
    Clock,
    Users,
    FileText,
    Activity,
    Bell,
    AlertCircle,
    ChevronRight,
    User,
    Stethoscope,
    CheckCircle2,
    XCircle,
    Timer,
    Play,
    Pause,
    RefreshCw,
    TrendingUp,
    ClipboardList
} from 'lucide-react';
import {
    appuntamentiApi,
    visiteApi,
    refertiApi,
    Appuntamento,
    Visita,
    Referto
} from '../../../services/clinicaApi';
import { formatDate, formatTime } from '../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

type StatoAppuntamento = 'PRENOTATO' | 'CONFERMATO' | 'IN_ATTESA' | 'IN_CORSO' | 'COMPLETATO' | 'ANNULLATO' | 'NO_SHOW';

interface Notifica {
    id: string;
    tipo: 'urgente' | 'info' | 'warning';
    titolo: string;
    messaggio: string;
    dataOra: Date;
    letto: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const STATO_COLORS: Record<StatoAppuntamento, { bg: string; text: string; dot: string }> = {
    'PRENOTATO': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    'CONFERMATO': { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    'IN_ATTESA': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    'IN_CORSO': { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
    'COMPLETATO': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    'ANNULLATO': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
    'NO_SHOW': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
};

// ============================================
// COMPONENTS
// ============================================

/**
 * Stat Card Component
 */
const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    subValue?: string;
    onClick?: () => void;
}> = ({ icon, label, value, color, subValue, onClick }) => (
    <div
        onClick={onClick}
        className={`
      bg-white rounded-xl border border-gray-200 p-6
      ${onClick ? 'cursor-pointer hover:border-teal-300 hover:shadow-md transition-all' : ''}
    `}
    >
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
            </div>
        </div>
    </div>
);

/**
 * Appointment Timeline Item
 */
const AppointmentItem: React.FC<{
    appuntamento: Appuntamento;
    onStartVisit?: (id: string) => void;
}> = ({ appuntamento, onStartVisit }) => {
    const stato = appuntamento.stato as StatoAppuntamento;
    const colors = STATO_COLORS[stato] || STATO_COLORS.PRENOTATO;
    const dataOra = new Date(appuntamento.dataOra);
    const isNow = stato === 'IN_CORSO';
    const isPast = stato === 'COMPLETATO' || stato === 'ANNULLATO' || stato === 'NO_SHOW';

    return (
        <div className={`
      flex items-stretch gap-4 p-4 rounded-lg border-2 transition-all
      ${isNow ? 'border-teal-400 bg-teal-50' : 'border-transparent hover:bg-gray-50'}
    `}>
            {/* Time Column */}
            <div className="w-16 flex-shrink-0 text-center">
                <p className={`text-lg font-bold ${isPast ? 'text-gray-400' : 'text-gray-900'}`}>
                    {formatTime(dataOra)}
                </p>
                <p className="text-xs text-gray-400">{appuntamento.durataPrevista} min</p>
            </div>

            {/* Timeline Dot */}
            <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                <div className="flex-1 w-0.5 bg-gray-200 my-1" />
            </div>

            {/* Content */}
            <div className="flex-1">
                <div className="flex items-start justify-between">
                    <div>
                        <p className={`font-medium ${isPast ? 'text-gray-400' : 'text-gray-900'}`}>
                            {appuntamento.paziente?.cognome} {appuntamento.paziente?.nome}
                        </p>
                        <p className="text-sm text-gray-500">
                            {appuntamento.prestazione?.nome || 'Visita generica'}
                        </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {stato.replace('_', ' ')}
                    </span>
                </div>

                {/* Actions */}
                {!isPast && (
                    <div className="mt-3 flex gap-2">
                        {stato === 'IN_ATTESA' && onStartVisit && (
                            <button
                                onClick={() => onStartVisit(appuntamento.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
                            >
                                <Play className="h-4 w-4" />
                                Inizia Visita
                            </button>
                        )}
                        {stato === 'IN_CORSO' && (
                            <Link
                                to={`/poliambulatorio/visite/${appuntamento.id}`}
                                className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
                            >
                                <Stethoscope className="h-4 w-4" />
                                Continua Visita
                            </Link>
                        )}
                        <Link
                            to={`/poliambulatorio/pazienti/${appuntamento.pazienteId}`}
                            className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                        >
                            <FileText className="h-4 w-4" />
                            Scheda
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Waiting Patients List
 */
const WaitingPatients: React.FC<{
    appuntamenti: Appuntamento[];
    onCall: (id: string) => void;
}> = ({ appuntamenti, onCall }) => {
    const waitingList = useMemo(() =>
        appuntamenti
            .filter(a => a.stato === 'IN_ATTESA')
            .sort((a, b) => {
                // Ordina per ora arrivo, poi per ora appuntamento
                const aTime = a.oraArrivo ? new Date(a.oraArrivo).getTime() : new Date(a.dataOra).getTime();
                const bTime = b.oraArrivo ? new Date(b.oraArrivo).getTime() : new Date(b.dataOra).getTime();
                return aTime - bTime;
            }),
        [appuntamenti]
    );

    if (waitingList.length === 0) {
        return (
            <div className="text-center py-8">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Nessun paziente in attesa</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {waitingList.map((app, index) => {
                const waitTime = app.oraArrivo
                    ? Math.round((Date.now() - new Date(app.oraArrivo).getTime()) / 60000)
                    : 0;

                return (
                    <div
                        key={app.id}
                        className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm">
                                {index + 1}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                    {app.paziente?.cognome} {app.paziente?.nome}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {app.prestazione?.nome || 'Visita'} • In attesa da {waitTime} min
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onCall(app.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
                        >
                            <Bell className="h-4 w-4" />
                            Chiama
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * Pending Reports Widget
 */
const PendingReports: React.FC<{
    referti: Referto[];
}> = ({ referti }) => {
    const pendingReferti = useMemo(() =>
        referti.filter(r => r.stato === 'BOZZA' || (r.stato === 'COMPLETATO' && !r.firmato)),
        [referti]
    );

    if (pendingReferti.length === 0) {
        return (
            <div className="text-center py-8">
                <CheckCircle2 className="h-10 w-10 text-green-300 mx-auto mb-2" />
                <p className="text-gray-500">Tutti i referti sono firmati</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {pendingReferti.slice(0, 5).map(referto => (
                <Link
                    key={referto.id}
                    to={`/poliambulatorio/referti/${referto.id}`}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group"
                >
                    <div className="flex items-center gap-3">
                        <div className={`
              w-2 h-2 rounded-full
              ${referto.stato === 'BOZZA' ? 'bg-amber-500' : 'bg-blue-500'}
            `} />
                        <div>
                            <p className="font-medium text-gray-900 group-hover:text-teal-600">
                                {referto.paziente?.cognome || 'Paziente'} - Referto
                            </p>
                            <p className="text-xs text-gray-500">
                                {referto.stato === 'BOZZA' ? 'Da completare' : 'Da firmare'}
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-teal-600" />
                </Link>
            ))}
            {pendingReferti.length > 5 && (
                <Link
                    to="/poliambulatorio/referti?stato=pending"
                    className="block text-center text-sm text-teal-600 hover:text-teal-700 py-2"
                >
                    Vedi tutti ({pendingReferti.length})
                </Link>
            )}
        </div>
    );
};

/**
 * Quick Stats Summary
 */
const QuickStats: React.FC<{
    appuntamenti: Appuntamento[];
    visite: Visita[];
}> = ({ appuntamenti, visite }) => {
    const stats = useMemo(() => {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        const appOggi = appuntamenti.filter(a => {
            const d = new Date(a.dataOra);
            d.setHours(0, 0, 0, 0);
            return d.getTime() === oggi.getTime();
        });

        const completati = appOggi.filter(a => a.stato === 'COMPLETATO').length;
        const totale = appOggi.length;
        const inAttesa = appOggi.filter(a => a.stato === 'IN_ATTESA').length;
        const noShow = appOggi.filter(a => a.stato === 'NO_SHOW').length;

        return { completati, totale, inAttesa, noShow };
    }, [appuntamenti]);

    const progressPercent = stats.totale > 0
        ? Math.round((stats.completati / stats.totale) * 100)
        : 0;

    return (
        <div className="space-y-4">
            {/* Progress bar */}
            <div>
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progresso giornaliero</span>
                    <span className="font-medium text-gray-900">{progressPercent}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.completati}</p>
                    <p className="text-xs text-green-700">Completati</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.inAttesa}</p>
                    <p className="text-xs text-amber-700">In Attesa</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-600">{stats.totale - stats.completati - stats.inAttesa}</p>
                    <p className="text-xs text-gray-700">Da Fare</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{stats.noShow}</p>
                    <p className="text-xs text-red-700">No Show</p>
                </div>
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const MedicoDashboard: React.FC = () => {
    const navigate = useNavigate();

    // Queries
    const { data: appuntamentiData, isLoading: loadingApp, refetch: refetchApp } = useQuery({
        queryKey: ['medico-appuntamenti-oggi'],
        queryFn: () => appuntamentiApi.getToday(),
        refetchInterval: 30000 // Refresh every 30 seconds
    });

    const { data: visiteData } = useQuery({
        queryKey: ['medico-visite-oggi'],
        queryFn: () => visiteApi.getToday()
    });

    const { data: refertiData } = useQuery({
        queryKey: ['medico-referti-pending'],
        queryFn: () => refertiApi.getDaFirmare()
    });

    // Data
    const appuntamenti = appuntamentiData || [];
    const visite = visiteData || [];
    const referti = refertiData || [];

    // Stats
    const stats = useMemo(() => ({
        totaleOggi: appuntamenti.length,
        inAttesa: appuntamenti.filter(a => a.stato === 'IN_ATTESA').length,
        completati: appuntamenti.filter(a => a.stato === 'COMPLETATO').length,
        refertiPending: referti.length
    }), [appuntamenti, referti]);

    // Current visit
    const visitaInCorso = useMemo(() =>
        appuntamenti.find(a => a.stato === 'IN_CORSO'),
        [appuntamenti]
    );

    // Handlers
    const handleStartVisit = async (appuntamentoId: string) => {
        navigate(`/poliambulatorio/visite/nuovo?appuntamento=${appuntamentoId}`);
    };

    const handleCallPatient = async (appuntamentoId: string) => {
        // TODO: Implement WebSocket call
        console.log('Chiama paziente:', appuntamentoId);
        // For now, just navigate to start visit
        handleStartVisit(appuntamentoId);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard Medico</h1>
                        <p className="text-gray-500 text-sm">
                            {formatDate(new Date(), 'full')}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => refetchApp()}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                        <Link
                            to="/poliambulatorio/agenda/calendario"
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                        >
                            <Calendar className="h-5 w-5" />
                            Apri Calendario
                        </Link>
                    </div>
                </div>

                {/* Current Visit Banner */}
                {visitaInCorso && (
                    <div className="bg-teal-600 text-white rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Stethoscope className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-medium">Visita in corso</p>
                                <p className="text-teal-100">
                                    {visitaInCorso.paziente?.cognome} {visitaInCorso.paziente?.nome} - {visitaInCorso.prestazione?.nome}
                                </p>
                            </div>
                        </div>
                        <Link
                            to={`/poliambulatorio/visite/${visitaInCorso.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-teal-600 rounded-lg hover:bg-teal-50"
                        >
                            Continua
                            <ChevronRight className="h-5 w-5" />
                        </Link>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Calendar className="h-6 w-6 text-blue-600" />}
                        label="Appuntamenti Oggi"
                        value={stats.totaleOggi}
                        color="bg-blue-100"
                        onClick={() => navigate('/poliambulatorio/agenda/appuntamenti')}
                    />
                    <StatCard
                        icon={<Users className="h-6 w-6 text-amber-600" />}
                        label="In Attesa"
                        value={stats.inAttesa}
                        color="bg-amber-100"
                    />
                    <StatCard
                        icon={<CheckCircle2 className="h-6 w-6 text-green-600" />}
                        label="Completati"
                        value={stats.completati}
                        color="bg-green-100"
                    />
                    <StatCard
                        icon={<FileText className="h-6 w-6 text-purple-600" />}
                        label="Referti da Firmare"
                        value={stats.refertiPending}
                        color="bg-purple-100"
                        onClick={() => navigate('/poliambulatorio/referti?stato=pending')}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Timeline - 2 columns */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Agenda di Oggi</h2>
                            <Link
                                to="/poliambulatorio/agenda/calendario"
                                className="text-teal-600 hover:text-teal-700 text-sm flex items-center gap-1"
                            >
                                Vedi tutto <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>

                        {loadingApp ? (
                            <div className="flex justify-center py-12">
                                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
                            </div>
                        ) : appuntamenti.length === 0 ? (
                            <div className="text-center py-12">
                                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Nessun appuntamento per oggi</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {appuntamenti
                                    .sort((a, b) => new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime())
                                    .map(app => (
                                        <AppointmentItem
                                            key={app.id}
                                            appuntamento={app}
                                            onStartVisit={handleStartVisit}
                                        />
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar - 1 column */}
                    <div className="space-y-6">
                        {/* Waiting Patients */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Pazienti in Attesa</h2>
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                                    {stats.inAttesa}
                                </span>
                            </div>
                            <WaitingPatients
                                appuntamenti={appuntamenti}
                                onCall={handleCallPatient}
                            />
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Riepilogo</h2>
                            <QuickStats appuntamenti={appuntamenti} visite={visite} />
                        </div>

                        {/* Pending Reports */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Referti Pendenti</h2>
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                                    {referti.length}
                                </span>
                            </div>
                            <PendingReports referti={referti} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicoDashboard;
