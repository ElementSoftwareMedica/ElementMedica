/**
 * CartellaPaziente - Vista unificata del paziente
 * 
 * Mostra storico visite, referti, documenti allegati
 * e grafici trend dei dati clinici.
 * 
 * @module pages/poliambulatorio/clinica/CartellaPaziente
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import {
    ArrowLeft,
    User,
    Calendar,
    FileText,
    Activity,
    Clock,
    Phone,
    Mail,
    MapPin,
    ChevronRight,
    Download,
    Eye,
    Plus,
    Filter,
    Search,
    RefreshCw,
    Stethoscope,
    ClipboardList,
    Paperclip,
    TrendingUp,
    Heart,
    Thermometer,
    AlertCircle,
    CheckCircle2,
    History
} from 'lucide-react';
import {
    pazientiApi,
    visiteApi,
    refertiApi,
    appuntamentiApi,
    Paziente,
    Visita,
    Referto,
    Appuntamento
} from '../../../services/clinicaApi';
import { formatDate, formatTime } from '../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

type TabType = 'overview' | 'visite' | 'referti' | 'documenti' | 'trend';

interface TimelineEvent {
    id: string;
    tipo: 'visita' | 'referto' | 'appuntamento' | 'documento';
    titolo: string;
    data: Date;
    descrizione?: string;
    stato?: string;
    link?: string;
}

// ============================================
// COMPONENTS
// ============================================

/**
 * Patient Header Card
 */
const PatientHeader: React.FC<{
    paziente: Paziente;
    onEdit: () => void;
}> = ({ paziente, onEdit }) => {
    const eta = useMemo(() => {
        if (!paziente.dataNascita) return null;
        const nascita = new Date(paziente.dataNascita);
        const oggi = new Date();
        let eta = oggi.getFullYear() - nascita.getFullYear();
        const m = oggi.getMonth() - nascita.getMonth();
        if (m < 0 || (m === 0 && oggi.getDate() < nascita.getDate())) {
            eta--;
        }
        return eta;
    }, [paziente.dataNascita]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-12 w-12 text-teal-600" />
                </div>

                <div className="flex-1">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {paziente.cognome} {paziente.nome}
                            </h1>
                            <p className="text-gray-500">
                                {paziente.codiceFiscale || 'CF non disponibile'}
                                {eta && ` • ${eta} anni`}
                            </p>
                        </div>
                        <button
                            onClick={onEdit}
                            className="px-4 py-2 text-teal-600 border border-teal-600 rounded-lg hover:bg-teal-50"
                        >
                            Modifica
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {paziente.telefono && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span>{paziente.telefono}</span>
                            </div>
                        )}
                        {paziente.email && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span>{paziente.email}</span>
                            </div>
                        )}
                        {paziente.indirizzo && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span>{paziente.indirizzo}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Stats Cards
 */
const StatsCards: React.FC<{
    visite: Visita[];
    referti: Referto[];
    appuntamenti: Appuntamento[];
}> = ({ visite, referti, appuntamenti }) => {
    const stats = useMemo(() => ({
        totaleVisite: visite.length,
        visiteAnno: visite.filter(v => {
            const d = new Date(v.createdAt);
            const oggi = new Date();
            return d.getFullYear() === oggi.getFullYear();
        }).length,
        totaleReferti: referti.length,
        refertiFirmati: referti.filter(r => r.firmato).length,
        prossimoApp: appuntamenti
            .filter(a => new Date(a.dataOra) > new Date() && a.stato !== 'ANNULLATO')
            .sort((a, b) => new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime())[0]
    }), [visite, referti, appuntamenti]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totaleVisite}</p>
                        <p className="text-xs text-gray-500">Visite totali</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.totaleReferti}</p>
                        <p className="text-xs text-gray-500">Referti</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.refertiFirmati}</p>
                        <p className="text-xs text-gray-500">Referti firmati</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                        {stats.prossimoApp ? (
                            <>
                                <p className="text-sm font-bold text-gray-900">
                                    {formatDate(new Date(stats.prossimoApp.dataOra), 'short')}
                                </p>
                                <p className="text-xs text-gray-500">Prossimo app.</p>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-bold text-gray-400">-</p>
                                <p className="text-xs text-gray-500">Nessun app.</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Timeline Component
 */
const Timeline: React.FC<{
    events: TimelineEvent[];
    maxItems?: number;
}> = ({ events, maxItems = 10 }) => {
    const sortedEvents = useMemo(() =>
        [...events]
            .sort((a, b) => b.data.getTime() - a.data.getTime())
            .slice(0, maxItems),
        [events, maxItems]
    );

    const getEventIcon = (tipo: TimelineEvent['tipo']) => {
        switch (tipo) {
            case 'visita': return <Stethoscope className="h-4 w-4" />;
            case 'referto': return <FileText className="h-4 w-4" />;
            case 'appuntamento': return <Calendar className="h-4 w-4" />;
            case 'documento': return <Paperclip className="h-4 w-4" />;
        }
    };

    const getEventColor = (tipo: TimelineEvent['tipo']) => {
        switch (tipo) {
            case 'visita': return 'bg-blue-500';
            case 'referto': return 'bg-purple-500';
            case 'appuntamento': return 'bg-amber-500';
            case 'documento': return 'bg-gray-500';
        }
    };

    return (
        <div className="space-y-4">
            {sortedEvents.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${getEventColor(event.tipo)}`}>
                            {getEventIcon(event.tipo)}
                        </div>
                        {index < sortedEvents.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-200 my-2" />
                        )}
                    </div>

                    <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-medium text-gray-900">{event.titolo}</p>
                                {event.descrizione && (
                                    <p className="text-sm text-gray-500">{event.descrizione}</p>
                                )}
                            </div>
                            <span className="text-xs text-gray-400">
                                {formatDate(event.data, 'short')}
                            </span>
                        </div>
                        {event.link && (
                            <Link
                                to={event.link}
                                className="mt-2 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
                            >
                                Visualizza <ChevronRight className="h-4 w-4" />
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * Visits List
 */
const VisiteList: React.FC<{
    visite: Visita[];
}> = ({ visite }) => {
    const [search, setSearch] = useState('');

    const filteredVisite = useMemo(() =>
        visite.filter(v =>
            !search ||
            v.note?.toLowerCase().includes(search.toLowerCase())
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [visite, search]
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cerca nelle visite..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                />
            </div>

            {filteredVisite.length === 0 ? (
                <div className="text-center py-8">
                    <Stethoscope className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Nessuna visita trovata</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredVisite.map(visita => (
                        <Link
                            key={visita.id}
                            to={`/poliambulatorio/visite/${visita.id}`}
                            className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-teal-300 transition-colors group"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 group-hover:text-teal-600">
                                            Visita del {formatDate(new Date(visita.createdAt), 'short')}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${visita.stato === 'COMPLETATA' ? 'bg-green-100 text-green-700' :
                                            visita.stato === 'IN_CORSO' ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {visita.stato}
                                        </span>
                                    </div>
                                    {visita.note && (
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{visita.note}</p>
                                    )}
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-teal-600" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Reports List
 */
const RefertiList: React.FC<{
    referti: Referto[];
}> = ({ referti }) => {
    const [filter, setFilter] = useState<'all' | 'firmato' | 'bozza'>('all');

    const filteredReferti = useMemo(() =>
        referti
            .filter(r => {
                if (filter === 'firmato') return r.firmato;
                if (filter === 'bozza') return !r.firmato;
                return true;
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [referti, filter]
    );

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                {(['all', 'firmato', 'bozza'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f
                            ? 'bg-teal-100 text-teal-700'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {f === 'all' ? 'Tutti' : f === 'firmato' ? 'Firmati' : 'Bozze'}
                    </button>
                ))}
            </div>

            {filteredReferti.length === 0 ? (
                <div className="text-center py-8">
                    <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Nessun referto trovato</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredReferti.map(referto => (
                        <div
                            key={referto.id}
                            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-teal-300 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">
                                            Referto del {formatDate(new Date(referto.createdAt), 'short')}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${referto.firmato ? 'bg-green-100 text-green-700' :
                                            referto.stato === 'COMPLETATO' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {referto.firmato ? 'Firmato' : referto.stato}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        to={`/poliambulatorio/referti/${referto.id}`}
                                        className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded"
                                    >
                                        <Eye className="h-5 w-5" />
                                    </Link>
                                    {referto.firmato && (
                                        <button className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded">
                                            <Download className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * Trend Chart Component - Grafici parametri vitali
 */
const TrendChart: React.FC = () => {
    const [selectedMetric, setSelectedMetric] = useState<'pressione' | 'frequenza' | 'temperatura' | 'peso'>('pressione');

    // Dati mock per demo - in produzione verrebbero dalle visite
    const trendData = useMemo(() => [
        { data: '01/10', pressione_sys: 125, pressione_dia: 82, frequenza: 72, temperatura: 36.4, peso: 75.2 },
        { data: '15/10', pressione_sys: 128, pressione_dia: 85, frequenza: 75, temperatura: 36.6, peso: 75.0 },
        { data: '01/11', pressione_sys: 122, pressione_dia: 80, frequenza: 70, temperatura: 36.5, peso: 74.8 },
        { data: '15/11', pressione_sys: 120, pressione_dia: 78, frequenza: 68, temperatura: 36.3, peso: 74.5 },
        { data: '01/12', pressione_sys: 118, pressione_dia: 76, frequenza: 70, temperatura: 36.5, peso: 74.6 },
        { data: '12/12', pressione_sys: 120, pressione_dia: 80, frequenza: 72, temperatura: 36.5, peso: 74.5 },
    ], []);

    const metrics = {
        pressione: {
            label: 'Pressione Arteriosa',
            icon: Activity,
            color: '#ef4444',
            unit: 'mmHg',
            lines: [
                { key: 'pressione_sys', name: 'Sistolica', color: '#ef4444' },
                { key: 'pressione_dia', name: 'Diastolica', color: '#3b82f6' }
            ]
        },
        frequenza: {
            label: 'Frequenza Cardiaca',
            icon: Heart,
            color: '#ec4899',
            unit: 'bpm',
            lines: [{ key: 'frequenza', name: 'FC', color: '#ec4899' }]
        },
        temperatura: {
            label: 'Temperatura',
            icon: Thermometer,
            color: '#f59e0b',
            unit: '°C',
            lines: [{ key: 'temperatura', name: 'Temp', color: '#f59e0b' }]
        },
        peso: {
            label: 'Peso Corporeo',
            icon: User,
            color: '#10b981',
            unit: 'kg',
            lines: [{ key: 'peso', name: 'Peso', color: '#10b981' }]
        }
    };

    const currentMetric = metrics[selectedMetric];
    const Icon = currentMetric.icon;

    // Calcola ultimo valore e variazione - type-safe
    const lastValue = trendData[trendData.length - 1];
    const prevValue = trendData[trendData.length - 2];

    // Tipo per i dati del trend e le sue chiavi numeriche
    type TrendDataPoint = typeof trendData[0];
    type TrendDataKey = 'pressione_sys' | 'pressione_dia' | 'frequenza' | 'temperatura' | 'peso';

    // Helper function per accedere ai valori numerici in modo type-safe
    const getValueFromTrendData = (dataPoint: TrendDataPoint, key: TrendDataKey): number => {
        return dataPoint[key];
    };

    const getVariation = (key: TrendDataKey) => {
        const curr = getValueFromTrendData(lastValue, key);
        const prev = getValueFromTrendData(prevValue, key);
        const diff = curr - prev;
        return { value: curr, diff, isPositive: diff >= 0 };
    };

    return (
        <div className="space-y-6">
            {/* Metric selector */}
            <div className="flex gap-2 flex-wrap">
                {(Object.keys(metrics) as Array<keyof typeof metrics>).map(key => {
                    const metric = metrics[key];
                    const MetricIcon = metric.icon;
                    return (
                        <button
                            key={key}
                            onClick={() => setSelectedMetric(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${selectedMetric === key
                                    ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-500'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <MetricIcon className="h-4 w-4" />
                            {metric.label}
                        </button>
                    );
                })}
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl`} style={{ backgroundColor: `${currentMetric.color}20` }}>
                            <Icon className="h-6 w-6" style={{ color: currentMetric.color }} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{currentMetric.label}</h3>
                            <p className="text-sm text-gray-500">Ultimi 3 mesi</p>
                        </div>
                    </div>

                    {/* Current value */}
                    <div className="text-right">
                        {currentMetric.lines.map(line => {
                            const variation = getVariation(line.key as TrendDataKey);
                            return (
                                <div key={line.key} className="mb-1 last:mb-0">
                                    <span className="text-2xl font-bold" style={{ color: line.color }}>
                                        {variation.value}
                                    </span>
                                    <span className="text-gray-500 ml-1">{currentMetric.unit}</span>
                                    <span className={`ml-2 text-sm ${variation.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {variation.diff >= 0 ? '↑' : '↓'} {Math.abs(variation.diff).toFixed(1)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="data"
                                stroke="#9ca3af"
                                fontSize={12}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                fontSize={12}
                                domain={['dataMin - 5', 'dataMax + 5']}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                formatter={(value: number) => [`${value} ${currentMetric.unit}`, '']}
                            />
                            <Legend />
                            {currentMetric.lines.map(line => (
                                <Area
                                    key={line.key}
                                    type="monotone"
                                    dataKey={line.key}
                                    name={line.name}
                                    stroke={line.color}
                                    fill={`${line.color}20`}
                                    strokeWidth={2}
                                    dot={{ fill: line.color, strokeWidth: 2 }}
                                    activeDot={{ r: 6 }}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(Object.keys(metrics) as Array<keyof typeof metrics>).map(key => {
                    const metric = metrics[key];
                    const MetricIcon = metric.icon;
                    const lastValKey = metric.lines[0].key as TrendDataKey;
                    const lastVal = getValueFromTrendData(lastValue, lastValKey);
                    return (
                        <div
                            key={key}
                            className={`p-4 rounded-xl border ${selectedMetric === key ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-white'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <MetricIcon className="h-5 w-5" style={{ color: metric.color }} />
                                <span className="text-sm text-gray-600">{metric.label}</span>
                            </div>
                            <p className="text-xl font-bold text-gray-900">
                                {key === 'pressione'
                                    ? `${lastValue.pressione_sys}/${lastValue.pressione_dia}`
                                    : lastVal
                                }
                                <span className="text-sm font-normal text-gray-500 ml-1">
                                    {metric.unit}
                                </span>
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const CartellaPaziente: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Queries
    const { data: paziente, isLoading: loadingPaziente } = useQuery({
        queryKey: ['paziente', id],
        queryFn: () => pazientiApi.getById(id!),
        enabled: !!id
    });

    const { data: visite } = useQuery({
        queryKey: ['visite-paziente', id],
        queryFn: () => visiteApi.getByPaziente(id!),
        enabled: !!id
    });

    const { data: referti } = useQuery({
        queryKey: ['referti-paziente', id],
        queryFn: () => refertiApi.getByPaziente(id!),
        enabled: !!id
    });

    const { data: appuntamentiData } = useQuery({
        queryKey: ['appuntamenti-paziente', id],
        queryFn: () => appuntamentiApi.getByPaziente(id!),
        enabled: !!id
    });

    // Timeline events
    const timelineEvents = useMemo<TimelineEvent[]>(() => {
        const events: TimelineEvent[] = [];

        visite?.forEach(v => {
            events.push({
                id: `visita-${v.id}`,
                tipo: 'visita',
                titolo: 'Visita',
                data: new Date(v.createdAt),
                stato: v.stato,
                link: `/poliambulatorio/visite/${v.id}`
            });
        });

        referti?.forEach(r => {
            events.push({
                id: `referto-${r.id}`,
                tipo: 'referto',
                titolo: r.firmato ? 'Referto firmato' : 'Referto',
                data: new Date(r.createdAt),
                stato: r.stato,
                link: `/poliambulatorio/referti/${r.id}`
            });
        });

        appuntamentiData?.forEach(a => {
            events.push({
                id: `app-${a.id}`,
                tipo: 'appuntamento',
                titolo: a.prestazione?.nome || 'Appuntamento',
                data: new Date(a.dataOra),
                stato: a.stato,
                link: `/poliambulatorio/agenda/appuntamenti/${a.id}`
            });
        });

        return events;
    }, [visite, referti, appuntamentiData]);

    // Loading
    if (loadingPaziente) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    // Not found
    if (!paziente) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <p className="text-gray-700">Paziente non trovato</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-teal-600 hover:text-teal-700"
                    >
                        Torna indietro
                    </button>
                </div>
            </div>
        );
    }

    const appuntamenti = appuntamentiData || [];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Cartella Paziente</h1>
                            <p className="text-sm text-gray-500">{paziente.cognome} {paziente.nome}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* Patient Header */}
                <PatientHeader
                    paziente={paziente}
                    onEdit={() => navigate(`/poliambulatorio/pazienti/${id}/modifica`)}
                />

                {/* Stats */}
                <StatsCards
                    visite={visite || []}
                    referti={referti || []}
                    appuntamenti={appuntamenti}
                />

                {/* Tabs */}
                <div className="bg-white rounded-xl border border-gray-200">
                    <div className="border-b border-gray-200">
                        <nav className="flex gap-1 p-2">
                            {([
                                { key: 'overview', label: 'Panoramica', icon: <Activity className="h-4 w-4" /> },
                                { key: 'visite', label: 'Visite', icon: <Stethoscope className="h-4 w-4" /> },
                                { key: 'referti', label: 'Referti', icon: <FileText className="h-4 w-4" /> },
                                { key: 'documenti', label: 'Documenti', icon: <Paperclip className="h-4 w-4" /> },
                                { key: 'trend', label: 'Trend', icon: <TrendingUp className="h-4 w-4" /> }
                            ] as const).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.key
                                        ? 'bg-teal-100 text-teal-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <History className="h-5 w-5 text-gray-400" />
                                        Cronologia Recente
                                    </h3>
                                    <Timeline events={timelineEvents} maxItems={8} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-gray-400" />
                                        Prossimi Appuntamenti
                                    </h3>
                                    {appuntamenti
                                        .filter(a => new Date(a.dataOra) > new Date() && a.stato !== 'ANNULLATO')
                                        .sort((a, b) => new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime())
                                        .slice(0, 3)
                                        .map(app => (
                                            <div key={app.id} className="p-3 bg-gray-50 rounded-lg mb-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {app.prestazione?.nome || 'Appuntamento'}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {formatDate(new Date(app.dataOra), 'full')} alle {formatTime(new Date(app.dataOra))}
                                                        </p>
                                                    </div>
                                                    <Link
                                                        to={`/poliambulatorio/agenda/appuntamenti/${app.id}`}
                                                        className="text-teal-600 hover:text-teal-700"
                                                    >
                                                        <ChevronRight className="h-5 w-5" />
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    {appuntamenti.filter(a => new Date(a.dataOra) > new Date() && a.stato !== 'ANNULLATO').length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                            <p>Nessun appuntamento programmato</p>
                                            <Link
                                                to={`/poliambulatorio/agenda/appuntamenti/nuovo?paziente=${id}`}
                                                className="mt-2 inline-flex items-center gap-1 text-teal-600 hover:text-teal-700"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Prenota appuntamento
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'visite' && <VisiteList visite={visite || []} />}
                        {activeTab === 'referti' && <RefertiList referti={referti || []} />}
                        {activeTab === 'documenti' && (
                            <div className="text-center py-12">
                                <Paperclip className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Gestione documenti in sviluppo</p>
                            </div>
                        )}
                        {activeTab === 'trend' && <TrendChart />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartellaPaziente;
