/**
 * StrutturaDashboard
 * 
 * Dashboard overview per la gestione della struttura del poliambulatorio.
 * Mostra statistiche, card informative e quick actions.
 * 
 * @module pages/poliambulatorio/struttura/StrutturaDashboard
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Building2,
    Stethoscope,
    Wrench,
    Plus,
    ArrowRight,
    AlertTriangle,
    CheckCircle,
    Clock,
    MapPin,
    Activity
} from 'lucide-react';
import { poliambulatoriApi, ambulatoriApi, strumentiApi } from '../../../services/clinicaApi';
import type { Poliambulatorio, Ambulatorio, Strumento, StatoStrumento } from '../../../services/clinicaApi';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    href?: string;
    color?: 'teal' | 'emerald' | 'amber' | 'red' | 'gray';
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    href,
    color = 'teal'
}) => {
    const colorClasses = {
        teal: 'bg-teal-50 text-teal-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        red: 'bg-red-50 text-red-600',
        gray: 'bg-gray-50 text-gray-600'
    };

    const content = (
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-sm ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                            <Activity className="h-4 w-4" />
                            <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            {href && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm text-teal-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                        Visualizza tutti <ArrowRight className="h-4 w-4" />
                    </span>
                </div>
            )}
        </div>
    );

    if (href) {
        return <Link to={href}>{content}</Link>;
    }

    return content;
};

interface QuickActionProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, description, icon, href }) => (
    <Link
        to={href}
        className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all group"
    >
        <div className="p-3 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors">
            {icon}
        </div>
        <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{title}</h4>
            <p className="text-sm text-gray-500">{description}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-teal-600 transition-colors" />
    </Link>
);

interface AlertItemProps {
    type: 'warning' | 'info' | 'success';
    title: string;
    description: string;
    action?: {
        label: string;
        href: string;
    };
}

const AlertItem: React.FC<AlertItemProps> = ({ type, title, description, action }) => {
    const typeClasses = {
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-emerald-50 border-emerald-200 text-emerald-800'
    };

    const iconClasses = {
        warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        info: <Clock className="h-5 w-5 text-blue-500" />,
        success: <CheckCircle className="h-5 w-5 text-emerald-500" />
    };

    return (
        <div className={`p-4 rounded-xl border ${typeClasses[type]}`}>
            <div className="flex items-start gap-3">
                {iconClasses[type]}
                <div className="flex-1">
                    <h4 className="font-medium">{title}</h4>
                    <p className="text-sm opacity-80 mt-0.5">{description}</p>
                    {action && (
                        <Link to={action.href} className="text-sm font-medium underline mt-2 inline-block">
                            {action.label}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

const StrutturaDashboard: React.FC = () => {
    // Queries
    const { data: poliambulatori, isLoading: loadingPoliambulatori } = useQuery({
        queryKey: ['poliambulatori'],
        queryFn: () => poliambulatoriApi.getAll({ limit: 100 })
    });

    const { data: ambulatori, isLoading: loadingAmbulatori } = useQuery({
        queryKey: ['ambulatori'],
        queryFn: () => ambulatoriApi.getAll({ limit: 100 })
    });

    const { data: strumenti, isLoading: loadingStrumenti } = useQuery({
        queryKey: ['strumenti'],
        queryFn: () => strumentiApi.getAll({ limit: 100 })
    });

    // Calculate stats
    const poliambulatoriList = poliambulatori?.data || [];
    const ambulatoriList = ambulatori?.data || [];
    const strumentiList = strumenti?.data || [];

    const activePoliambulatori = poliambulatoriList.filter((p: Poliambulatorio) => p.attivo).length;
    const activeAmbulatori = ambulatoriList.filter((a: Ambulatorio) => a.stato === 'ATTIVO').length;
    const activeStrumenti = strumentiList.filter((s: Strumento) => s.stato === 'ATTIVO').length;

    // Strumenti per stato
    const strumentiByStato = strumentiList.reduce((acc: Record<string, number>, s: Strumento) => {
        acc[s.stato] = (acc[s.stato] || 0) + 1;
        return acc;
    }, {});

    // Manutenzioni in scadenza (prossimi 30 giorni)
    const oggi = new Date();
    const tra30giorni = new Date(oggi.getTime() + 30 * 24 * 60 * 60 * 1000);
    const manutenzioniInScadenza = strumentiList.filter((s: Strumento) => {
        if (!s.prossimaManutenzione) return false;
        const dataManut = new Date(s.prossimaManutenzione);
        return dataManut >= oggi && dataManut <= tra30giorni;
    });

    // Strumenti in manutenzione o fuori servizio
    const strumentiProblematici = strumentiList.filter((s: Strumento) =>
        s.stato === 'IN_MANUTENZIONE' || s.stato === 'FUORI_SERVIZIO'
    );

    const isLoading = loadingPoliambulatori || loadingAmbulatori || loadingStrumenti;

    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestione Struttura</h1>
                    <p className="text-gray-500 mt-1">Panoramica di poliambulatori, ambulatori e strumentario</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/poliambulatorio/poliambulatori/nuovo"
                        className="btn-clinica-primary inline-flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Nuovo Poliambulatorio
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Poliambulatori"
                    value={activePoliambulatori}
                    subtitle={`${poliambulatoriList.length - activePoliambulatori} inattivi`}
                    icon={<Building2 className="h-6 w-6" />}
                    href="/poliambulatorio/poliambulatori"
                    color="teal"
                />
                <StatCard
                    title="Ambulatori"
                    value={activeAmbulatori}
                    subtitle={`${ambulatoriList.length - activeAmbulatori} inattivi`}
                    icon={<Stethoscope className="h-6 w-6" />}
                    href="/poliambulatorio/ambulatori"
                    color="emerald"
                />
                <StatCard
                    title="Strumenti Attivi"
                    value={activeStrumenti}
                    subtitle={`${strumentiByStato['IN_MANUTENZIONE'] || 0} in manutenzione`}
                    icon={<Wrench className="h-6 w-6" />}
                    href="/poliambulatorio/strumenti"
                    color="amber"
                />
                <StatCard
                    title="Manutenzioni"
                    value={manutenzioniInScadenza.length}
                    subtitle="Prossimi 30 giorni"
                    icon={<Clock className="h-6 w-6" />}
                    href="/poliambulatorio/strumenti?tab=manutenzioni"
                    color={manutenzioniInScadenza.length > 5 ? 'red' : 'gray'}
                />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Azioni Rapide</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <QuickAction
                            title="Nuovo Ambulatorio"
                            description="Aggiungi un nuovo ambulatorio"
                            icon={<Plus className="h-5 w-5" />}
                            href="/poliambulatorio/ambulatori/nuovo"
                        />
                        <QuickAction
                            title="Nuovo Strumento"
                            description="Registra nuovo strumento"
                            icon={<Wrench className="h-5 w-5" />}
                            href="/poliambulatorio/strumenti/nuovo"
                        />
                        <QuickAction
                            title="Gestione Orari"
                            description="Configura orari ambulatori"
                            icon={<Clock className="h-5 w-5" />}
                            href="/poliambulatorio/ambulatori?tab=orari"
                        />
                        <QuickAction
                            title="Report ROI Strumenti"
                            description="Analisi rendimento strumenti"
                            icon={<Activity className="h-5 w-5" />}
                            href="/poliambulatorio/strumenti/roi"
                        />
                    </div>

                    {/* Poliambulatori List */}
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Poliambulatori</h2>
                            <Link to="/poliambulatorio/poliambulatori" className="text-sm text-teal-600 font-medium hover:underline">
                                Vedi tutti
                            </Link>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                            {poliambulatoriList.slice(0, 5).map((poli: Poliambulatorio) => (
                                <Link
                                    key={poli.id}
                                    to={`/poliambulatorio/poliambulatori/${poli.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-teal-50">
                                            <Building2 className="h-5 w-5 text-teal-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{poli.nome}</h3>
                                            {poli.citta && (
                                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {poli.citta} {poli.provincia && `(${poli.provincia})`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${poli.attivo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {poli.attivo ? 'Attivo' : 'Inattivo'}
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-gray-400" />
                                    </div>
                                </Link>
                            ))}
                            {poliambulatoriList.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                    <p>Nessun poliambulatorio registrato</p>
                                    <Link to="/poliambulatorio/poliambulatori/nuovo" className="text-teal-600 font-medium mt-2 inline-block">
                                        Crea il primo poliambulatorio
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Alerts & Info Sidebar */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Avvisi</h2>

                    {manutenzioniInScadenza.length > 0 && (
                        <AlertItem
                            type="warning"
                            title={`${manutenzioniInScadenza.length} manutenzioni in scadenza`}
                            description="Strumenti che richiedono manutenzione nei prossimi 30 giorni"
                            action={{
                                label: 'Visualizza',
                                href: '/poliambulatorio/strumenti?tab=manutenzioni'
                            }}
                        />
                    )}

                    {strumentiProblematici.length > 0 && (
                        <AlertItem
                            type="warning"
                            title={`${strumentiProblematici.length} strumenti non disponibili`}
                            description="Strumenti in manutenzione o guasti"
                            action={{
                                label: 'Gestisci',
                                href: '/poliambulatorio/strumenti?stato=problematici'
                            }}
                        />
                    )}

                    {manutenzioniInScadenza.length === 0 && strumentiProblematici.length === 0 && (
                        <AlertItem
                            type="success"
                            title="Tutto in ordine"
                            description="Nessun avviso critico per la struttura"
                        />
                    )}

                    {/* Strumenti Status */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h3 className="font-medium text-gray-900 mb-4">Stato Strumentario</h3>
                        <div className="space-y-3">
                            {Object.entries(strumentiByStato).map(([stato, count]) => (
                                <div key={stato} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">
                                        {stato.replace(/_/g, ' ').charAt(0) + stato.replace(/_/g, ' ').slice(1).toLowerCase()}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stato === 'DISPONIBILE' ? 'bg-emerald-100 text-emerald-700' :
                                        stato === 'IN_USO' ? 'bg-blue-100 text-blue-700' :
                                            stato === 'IN_MANUTENZIONE' ? 'bg-amber-100 text-amber-700' :
                                                stato === 'GUASTO' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-600'
                                        }`}>
                                        {count as number}
                                    </span>
                                </div>
                            ))}
                            {Object.keys(strumentiByStato).length === 0 && (
                                <p className="text-sm text-gray-500">Nessuno strumento registrato</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StrutturaDashboard;
