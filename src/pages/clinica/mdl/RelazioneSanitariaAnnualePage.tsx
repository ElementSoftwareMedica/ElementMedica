/**
 * RelazioneSanitariaAnnualePage - Dashboard Aggregata Annuale MDL
 * 
 * Dashboard per visualizzare statistiche aggregate di tutte le aziende
 * per un dato anno. Report dirigenziale per panoramica globale MDL.
 * 
 * Funzionalità:
 * - KPI principali (tasso idoneità, visite, lavoratori)
 * - Grafici trend mensile
 * - Distribuzione giudizi idoneità
 * - Top rischi lavorativi
 * - Stato trasmissione Allegati 3B
 * 
 * @module pages/clinica/mdl/RelazioneSanitariaAnnualePage
 * @project P56 - Medicina del Lavoro Sistema Completo - FASE 7
 * @compliance D.Lgs 81/08 Art. 40
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart3,
    Users,
    ClipboardCheck,
    TrendingUp,
    Calendar,
    Building2,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    RefreshCw,
    FileText,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    Minus,
    Shield,
    Activity,
    PieChart
} from 'lucide-react';
import { apiGet } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    Legend,
    LineChart,
    Line
} from 'recharts';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

interface DashboardData {
    anno: number;
    dataGenerazione: string;
    aziende: { attive: number };
    lavoratori: {
        totale: number;
        perGenere: { maschi: number; femmine: number; altro: number };
        perFasciaEta: Record<string, number>;
    };
    visite: {
        totale: number;
        perTipologia: Record<string, number>;
    };
    giudizi: {
        totale: number;
        idonei: number;
        conLimitazioni: number;
        conPrescrizioni: number;
        inidoneiTemporanei: number;
        inidoneiPermanenti: number;
        perTipologia: Record<string, number>;
    };
    trendMensile: Array<{ mese: number; count: number }>;
    allegati3B: {
        totaleAziende: number;
        allegatiCreati: number;
        perStato: Record<string, number>;
    };
    topRischi: Array<{ codice: string; count: number }>;
    kpi: {
        tassoIdoneita: number;
        tassoLimitazioni: number;
        visitePerLavoratore: number;
    };
}

// =====================================================
// CONSTANTS
// =====================================================

const MESI_ITALIANI = [
    'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
    'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

const GIUDIZIO_COLORS = {
    'IDONEO': '#10b981',
    'IDONEO_CON_LIMITAZIONI': '#f59e0b',
    'IDONEO_CON_PRESCRIZIONI': '#f97316',
    'NON_IDONEO_TEMPORANEO': '#ef4444',
    'NON_IDONEO_PERMANENTE': '#dc2626'
};

const GIUDIZIO_LABELS: Record<string, string> = {
    'IDONEO': 'Idoneo',
    'IDONEO_CON_LIMITAZIONI': 'Con Limitazioni',
    'IDONEO_CON_PRESCRIZIONI': 'Con Prescrizioni',
    'NON_IDONEO_TEMPORANEO': 'Non Idoneo Temp.',
    'NON_IDONEO_PERMANENTE': 'Non Idoneo Perm.'
};

const RISCHIO_LABELS: Record<string, string> = {
    'RUM': 'Rumore',
    'VIB_MB': 'Vibrazioni mano-braccio',
    'VIB_WBV': 'Vibrazioni corpo intero',
    'CHI': 'Chimico',
    'MMC': 'Movimentazione carichi',
    'VDT': 'Videoterminale',
    'SLC': 'Stress lavoro-correlato',
    'NOT': 'Lavoro notturno',
    'QUO': 'Lavoro in quota'
};

// =====================================================
// COMPONENTE PRINCIPALE
// =====================================================

const RelazioneSanitariaAnnualePage: React.FC = () => {
    const { showToast } = useToast();
    const { isReady, tenantFilterKey } = useTenantFilter();

    // Stato anno selezionato
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1);

    // Anni disponibili (ultimi 5)
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - 1 - i);
    }, []);

    // Fetch dashboard data
    const { data: dashboardResponse, isLoading, refetch, error } = useQuery({
        queryKey: ['relazione-sanitaria-dashboard', selectedYear, tenantFilterKey],
        queryFn: async () => {
            const response = await apiGet<{ success: boolean; data: DashboardData }>(
                `/api/v1/clinica/allegato-3b/dashboard/${selectedYear}`
            );
            return response.data;
        },
        enabled: isReady
    });

    const dashboard = dashboardResponse;

    // Preparazione dati grafici
    const trendData = useMemo(() => {
        if (!dashboard?.trendMensile) return [];
        return dashboard.trendMensile.map(t => ({
            mese: MESI_ITALIANI[t.mese - 1],
            visite: t.count
        }));
    }, [dashboard]);

    const giudiziPieData = useMemo(() => {
        if (!dashboard?.giudizi?.perTipologia) return [];
        return Object.entries(dashboard.giudizi.perTipologia).map(([tipo, count]) => ({
            name: GIUDIZIO_LABELS[tipo] || tipo,
            value: count as number,
            fill: GIUDIZIO_COLORS[tipo as keyof typeof GIUDIZIO_COLORS] || '#94a3b8'
        }));
    }, [dashboard]);

    const etaData = useMemo(() => {
        if (!dashboard?.lavoratori?.perFasciaEta) return [];
        return Object.entries(dashboard.lavoratori.perFasciaEta).map(([fascia, count]) => ({
            fascia,
            lavoratori: count
        }));
    }, [dashboard]);

    const topRischiData = useMemo(() => {
        if (!dashboard?.topRischi) return [];
        return dashboard.topRischi.map(r => ({
            rischio: RISCHIO_LABELS[r.codice] || r.codice,
            count: r.count
        }));
    }, [dashboard]);

    // KPI trend indicator
    const getTrendIcon = (value: number, threshold: number, inverted = false) => {
        if (inverted) {
            if (value < threshold) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
            if (value > threshold) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
        } else {
            if (value > threshold) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
            if (value < threshold) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
        }
        return <Minus className="w-4 h-4 text-gray-400" />;
    };

    // Export to CSV
    const handleExportCSV = () => {
        if (!dashboard) return;

        const rows = [
            ['Relazione Sanitaria Annuale', dashboard.anno.toString()],
            [''],
            ['KPI', 'Valore'],
            ['Tasso Idoneità', `${dashboard.kpi.tassoIdoneita}%`],
            ['Tasso Limitazioni', `${dashboard.kpi.tassoLimitazioni}%`],
            ['Visite/Lavoratore', dashboard.kpi.visitePerLavoratore.toString()],
            [''],
            ['Statistiche', 'Valore'],
            ['Aziende Attive', dashboard.aziende.attive.toString()],
            ['Lavoratori Sorvegliati', dashboard.lavoratori.totale.toString()],
            ['Visite Effettuate', dashboard.visite.totale.toString()],
            ['Giudizi Emessi', dashboard.giudizi.totale.toString()],
            [''],
            ['Giudizi per Tipologia', 'Conteggio'],
            ...Object.entries(dashboard.giudizi.perTipologia).map(([tipo, count]) =>
                [GIUDIZIO_LABELS[tipo] || tipo, count.toString()]
            )
        ];

        const csvContent = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relazione_sanitaria_${selectedYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showToast({ message: 'Export CSV completato', type: 'success' });
    };

    // =====================================================
    // RENDER
    // =====================================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Errore nel caricamento</h3>
                <p className="text-gray-500 mt-2">
                    {(error as Error).message?.includes('network') || (error as Error).message?.includes('Network')
                        ? 'Errore di connessione. Verificare la connessione internet e riprovare.'
                        : 'Impossibile caricare i dati della dashboard'}
                </p>
                <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                    Riprova
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Relazione Sanitaria Annuale
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Dashboard aggregata Medicina del Lavoro - D.Lgs 81/08
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Year Selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={() => refetch()}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                        title="Aggiorna dati"
                    >
                        <RefreshCw className="w-5 h-5 text-gray-500" />
                    </button>

                    {/* Export */}
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {/* Tasso Idoneità */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-green-100">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                        </div>
                        {getTrendIcon(dashboard?.kpi.tassoIdoneita || 0, 85)}
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-bold text-gray-900">
                            {dashboard?.kpi.tassoIdoneita || 0}%
                        </span>
                        <p className="text-sm text-gray-500 mt-1">Tasso Idoneità</p>
                    </div>
                </div>

                {/* Lavoratori Sorvegliati */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-bold text-gray-900">
                            {dashboard?.lavoratori.totale || 0}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">Lavoratori Sorvegliati</p>
                    </div>
                </div>

                {/* Visite Effettuate */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-purple-100">
                            <ClipboardCheck className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-bold text-gray-900">
                            {dashboard?.visite.totale || 0}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">Visite Effettuate</p>
                    </div>
                </div>

                {/* Aziende Attive */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div className="p-2 rounded-lg bg-teal-100">
                            <Building2 className="w-6 h-6 text-teal-600" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <span className="text-3xl font-bold text-gray-900">
                            {dashboard?.aziende.attive || 0}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">Aziende Attive</p>
                    </div>
                </div>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Trend Mensile */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp className="w-5 h-5 text-teal-600" />
                        <h3 className="text-lg font-medium text-gray-900">Trend Visite Mensili</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="mese" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="visite"
                                stroke="#0d9488"
                                strokeWidth={2}
                                dot={{ fill: '#0d9488', r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Distribuzione Giudizi */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <PieChart className="w-5 h-5 text-teal-600" />
                        <h3 className="text-lg font-medium text-gray-900">Distribuzione Giudizi Idoneità</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <RechartsPieChart>
                            <Pie
                                data={giudiziPieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                            >
                                {giudiziPieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </RechartsPieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Secondary Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Distribuzione per Fascia Età */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity className="w-5 h-5 text-teal-600" />
                        <h3 className="text-lg font-medium text-gray-900">Lavoratori per Fascia Età</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={etaData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis dataKey="fascia" type="category" tick={{ fontSize: 12 }} width={70} />
                            <Tooltip />
                            <Bar dataKey="lavoratori" fill="#0d9488" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Rischi */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-teal-600" />
                        <h3 className="text-lg font-medium text-gray-900">Top Rischi Lavorativi</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={topRischiData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis dataKey="rischio" type="category" tick={{ fontSize: 10 }} width={120} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Status Allegati 3B */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-5 h-5 text-teal-600" />
                    <h3 className="text-lg font-medium text-gray-900">Stato Trasmissione Allegati 3B</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <span className="text-2xl font-bold text-gray-900">
                            {dashboard?.allegati3B.totaleAziende || 0}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">Aziende Totali</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <span className="text-2xl font-bold text-blue-700">
                            {dashboard?.allegati3B.allegatiCreati || 0}
                        </span>
                        <p className="text-sm text-blue-600 mt-1">Allegati Creati</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                        <span className="text-2xl font-bold text-green-700">
                            {dashboard?.allegati3B.perStato?.SUBMITTED || 0}
                        </span>
                        <p className="text-sm text-green-600 mt-1">Trasmessi</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg text-center">
                        <span className="text-2xl font-bold text-amber-700">
                            {(dashboard?.allegati3B.perStato?.DRAFT || 0) +
                                (dashboard?.allegati3B.perStato?.IN_PROGRESS || 0)}
                        </span>
                        <p className="text-sm text-amber-600 mt-1">In Lavorazione</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-gray-500">
                Dati aggiornati al: {dashboard?.dataGenerazione
                    ? new Date(dashboard.dataGenerazione).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                    : 'N/D'
                }
            </div>
        </div>
    );
};

export default RelazioneSanitariaAnnualePage;
