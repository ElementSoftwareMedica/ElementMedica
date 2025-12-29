/**
 * Clinica Dashboard
 * Main dashboard for ElementMedica Poliambulatorio module
 * 
 * Features:
 * - Overview of daily appointments
 * - Quick stats (patients, visits, referti)
 * - Recent activity timeline
 * - Quick actions panel
 * 
 * @module pages/poliambulatorio/ClinicaDashboard
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Calendar,
    Users,
    FileText,
    Clock,
    Activity,
    AlertCircle,
    CheckCircle,
    TrendingUp,
    Building2,
    Stethoscope,
    ClipboardList,
    PlusCircle
} from 'lucide-react';

// Types
interface DashboardStats {
    appuntamentiOggi: number;
    appuntamentiInAttesa: number;
    visiteInCorso: number;
    refertiDaFirmare: number;
    pazientiTotali: number;
    prestazioniDisponibili: number;
}

interface RecentActivity {
    id: string;
    tipo: 'appuntamento' | 'visita' | 'referto' | 'paziente';
    descrizione: string;
    timestamp: Date;
    stato: 'completato' | 'in_corso' | 'attesa';
}

interface QuickAction {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    color: string;
}

/**
 * ClinicaDashboard Component
 * Main dashboard view for the clinical module
 */
const ClinicaDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        appuntamentiOggi: 0,
        appuntamentiInAttesa: 0,
        visiteInCorso: 0,
        refertiDaFirmare: 0,
        pazientiTotali: 0,
        prestazioniDisponibili: 0
    });

    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Quick actions for clinical staff
    const quickActions: QuickAction[] = [
        {
            label: 'Nuovo Appuntamento',
            icon: PlusCircle,
            href: '/poliambulatorio/appuntamenti/nuovo',
            color: 'bg-blue-500 hover:bg-blue-600'
        },
        {
            label: 'Agenda Oggi',
            icon: Calendar,
            href: '/poliambulatorio/agenda',
            color: 'bg-green-500 hover:bg-green-600'
        },
        {
            label: 'Cerca Paziente',
            icon: Users,
            href: '/poliambulatorio/pazienti',
            color: 'bg-purple-500 hover:bg-purple-600'
        },
        {
            label: 'Referti da Firmare',
            icon: FileText,
            href: '/poliambulatorio/referti?filter=da_firmare',
            color: 'bg-orange-500 hover:bg-orange-600'
        }
    ];

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // TODO: Integrare con API reali quando disponibili
            // const [statsData, activitiesData] = await Promise.all([
            //   clinicaApi.getDashboardStats(),
            //   clinicaApi.getRecentActivities()
            // ]);

            // Inizializzazione con valori vuoti - dati verranno caricati da API
            setStats({
                appuntamentiOggi: 0,
                appuntamentiInAttesa: 0,
                visiteInCorso: 0,
                refertiDaFirmare: 0,
                pazientiTotali: 0,
                prestazioniDisponibili: 0
            });

            setRecentActivities([]);

        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setError('Errore nel caricamento dei dati della dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    const getActivityIcon = (tipo: RecentActivity['tipo']) => {
        switch (tipo) {
            case 'appuntamento': return Calendar;
            case 'visita': return Stethoscope;
            case 'referto': return FileText;
            case 'paziente': return Users;
            default: return Activity;
        }
    };

    const getStatusColor = (stato: RecentActivity['stato']) => {
        switch (stato) {
            case 'completato': return 'text-green-500';
            case 'in_corso': return 'text-blue-500';
            case 'attesa': return 'text-orange-500';
            default: return 'text-gray-500';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">{error}</span>
                <button
                    onClick={loadDashboardData}
                    className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                    Riprova
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Clinica</h1>
                    <p className="text-gray-600">
                        {new Date().toLocaleDateString('it-IT', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Ultimo aggiornamento:</span>
                    <span className="text-sm font-medium">{formatTime(new Date())}</span>
                    <button
                        onClick={loadDashboardData}
                        className="ml-2 p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                        title="Aggiorna dati"
                    >
                        <Activity className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Appuntamenti Oggi */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Appuntamenti Oggi</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.appuntamentiOggi}</p>
                            <p className="text-xs text-orange-600 mt-1">
                                {stats.appuntamentiInAttesa} in attesa
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Visite in Corso */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Visite in Corso</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.visiteInCorso}</p>
                            <p className="text-xs text-green-600 mt-1">
                                <CheckCircle className="inline h-3 w-3 mr-1" />
                                In tempo
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <Stethoscope className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                {/* Referti da Firmare */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Referti da Firmare</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.refertiDaFirmare}</p>
                            {stats.refertiDaFirmare > 0 && (
                                <p className="text-xs text-orange-600 mt-1">
                                    <AlertCircle className="inline h-3 w-3 mr-1" />
                                    Richiede attenzione
                                </p>
                            )}
                        </div>
                        <div className="p-3 bg-orange-100 rounded-full">
                            <FileText className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>

                {/* Pazienti Totali */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Pazienti Registrati</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.pazientiTotali.toLocaleString()}</p>
                            <p className="text-xs text-green-600 mt-1">
                                <TrendingUp className="inline h-3 w-3 mr-1" />
                                +12 questa settimana
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full">
                            <Users className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Azioni Rapide</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {quickActions.map((action) => (
                            <Link
                                key={action.label}
                                to={action.href}
                                className={`${action.color} text-white rounded-lg p-4 flex flex-col items-center justify-center text-center transition-all hover:shadow-md`}
                            >
                                <action.icon className="h-6 w-6 mb-2" />
                                <span className="text-sm font-medium">{action.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Attività Recente</h2>
                        <Link
                            to="/poliambulatorio/attivita"
                            className="text-sm text-blue-600 hover:text-blue-700"
                        >
                            Vedi tutto →
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {recentActivities.map((activity) => {
                            const IconComponent = getActivityIcon(activity.tipo);
                            return (
                                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                    <div className={`p-2 rounded-full ${getStatusColor(activity.stato)} bg-opacity-10`}>
                                        <IconComponent className={`h-4 w-4 ${getStatusColor(activity.stato)}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {activity.descrizione}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatTime(activity.timestamp)}
                                        </p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${activity.stato === 'completato' ? 'bg-green-100 text-green-700' :
                                        activity.stato === 'in_corso' ? 'bg-blue-100 text-blue-700' :
                                            'bg-orange-100 text-orange-700'
                                        }`}>
                                        {activity.stato === 'completato' ? 'Completato' :
                                            activity.stato === 'in_corso' ? 'In corso' : 'In attesa'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                    to="/poliambulatorio/struttura"
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Struttura</h3>
                            <p className="text-sm text-gray-600">Gestione sedi e ambulatori</p>
                        </div>
                    </div>
                </Link>

                <Link
                    to="/poliambulatorio/catalogo"
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:border-green-300 hover:shadow-md transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <ClipboardList className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Catalogo</h3>
                            <p className="text-sm text-gray-600">Prestazioni e listini</p>
                        </div>
                    </div>
                </Link>

                <Link
                    to="/poliambulatorio/agenda"
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:border-purple-300 hover:shadow-md transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Calendar className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Agenda</h3>
                            <p className="text-sm text-gray-600">Calendario appuntamenti</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default ClinicaDashboard;
