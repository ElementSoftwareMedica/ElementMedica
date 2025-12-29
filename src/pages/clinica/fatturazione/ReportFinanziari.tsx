/**
 * ReportFinanziari - Report e statistiche finanziarie
 * 
 * Dashboard avanzata per analisi incassi, report per periodo,
 * confronti temporali e export contabilità.
 * 
 * @module pages/poliambulatorio/fatturazione/ReportFinanziari
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Download,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Users,
    Stethoscope,
    Euro,
    FileSpreadsheet,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Filter
} from 'lucide-react';
import {
    fattureApi,
    FatturaStats,
    ReportPrestazione,
    ReportMedico,
    DailyReport,
    ReportComparison
} from '../../../services/clinicaApi';
import { formatDate } from '../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

type PeriodoPreset = 'oggi' | 'settimana' | 'mese' | 'trimestre' | 'anno' | 'custom';
type ViewType = 'overview' | 'prestazioni' | 'medici' | 'giornaliero';

interface DateRange {
    dataInizio: string;
    dataFine: string;
}

// ============================================
// UTILITIES
// ============================================

const getDateRange = (preset: PeriodoPreset): DateRange => {
    const now = new Date();
    const dataFine = now.toISOString().split('T')[0];
    let dataInizio: string;

    switch (preset) {
        case 'oggi':
            dataInizio = dataFine;
            break;
        case 'settimana':
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            dataInizio = weekAgo.toISOString().split('T')[0];
            break;
        case 'mese':
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dataInizio = monthAgo.toISOString().split('T')[0];
            break;
        case 'trimestre':
            const quarterAgo = new Date(now);
            quarterAgo.setMonth(quarterAgo.getMonth() - 3);
            dataInizio = quarterAgo.toISOString().split('T')[0];
            break;
        case 'anno':
            dataInizio = `${now.getFullYear()}-01-01`;
            break;
        default:
            dataInizio = dataFine;
    }

    return { dataInizio, dataFine };
};

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
};

const formatPercentage = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
};

// ============================================
// COMPONENTS
// ============================================

/**
 * Period Selector
 */
const PeriodSelector: React.FC<{
    preset: PeriodoPreset;
    onPresetChange: (preset: PeriodoPreset) => void;
    customRange: DateRange;
    onCustomRangeChange: (range: DateRange) => void;
}> = ({ preset, onPresetChange, customRange, onCustomRangeChange }) => {
    const presets: { value: PeriodoPreset; label: string }[] = [
        { value: 'oggi', label: 'Oggi' },
        { value: 'settimana', label: 'Settimana' },
        { value: 'mese', label: 'Mese' },
        { value: 'trimestre', label: 'Trimestre' },
        { value: 'anno', label: 'Anno' },
        { value: 'custom', label: 'Personalizzato' }
    ];

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {presets.map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => onPresetChange(value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${preset === value
                                ? 'bg-white text-teal-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {preset === 'custom' && (
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={customRange.dataInizio}
                        onChange={(e) => onCustomRangeChange({ ...customRange, dataInizio: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                        type="date"
                        value={customRange.dataFine}
                        onChange={(e) => onCustomRangeChange({ ...customRange, dataFine: e.target.value })}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                    />
                </div>
            )}
        </div>
    );
};

/**
 * Summary Card
 */
const SummaryCard: React.FC<{
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: { value: string; isPositive: boolean };
    color: 'teal' | 'blue' | 'green' | 'amber' | 'purple';
}> = ({ title, value, subtitle, icon, trend, color }) => {
    const colorClasses = {
        teal: 'bg-teal-50 text-teal-600 border-teal-200',
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200'
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
                    {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
                    {trend && (
                        <div className={`mt-2 flex items-center gap-1 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {trend.isPositive ? (
                                <TrendingUp className="h-4 w-4" />
                            ) : (
                                <TrendingDown className="h-4 w-4" />
                            )}
                            {trend.value} vs periodo precedente
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

/**
 * View Tab Selector
 */
const ViewTabs: React.FC<{
    activeView: ViewType;
    onViewChange: (view: ViewType) => void;
}> = ({ activeView, onViewChange }) => {
    const tabs: { value: ViewType; label: string; icon: React.ReactNode }[] = [
        { value: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
        { value: 'prestazioni', label: 'Per Prestazione', icon: <Stethoscope className="h-4 w-4" /> },
        { value: 'medici', label: 'Per Medico', icon: <Users className="h-4 w-4" /> },
        { value: 'giornaliero', label: 'Giornaliero', icon: <Calendar className="h-4 w-4" /> }
    ];

    return (
        <div className="border-b border-gray-200">
            <nav className="flex gap-4">
                {tabs.map(({ value, label, icon }) => (
                    <button
                        key={value}
                        onClick={() => onViewChange(value)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeView === value
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {icon}
                        {label}
                    </button>
                ))}
            </nav>
        </div>
    );
};

/**
 * Prestazioni Report Table
 */
const PrestazioniTable: React.FC<{
    data: ReportPrestazione[];
    isLoading: boolean;
}> = ({ data, isLoading }) => {
    const [sortField, setSortField] = useState<keyof ReportPrestazione>('totale');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            const multiplier = sortOrder === 'asc' ? 1 : -1;
            return (Number(aVal) - Number(bVal)) * multiplier;
        });
    }, [data, sortField, sortOrder]);

    const handleSort = (field: keyof ReportPrestazione) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }: { field: keyof ReportPrestazione }) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
        ) : (
            <ChevronDown className="h-4 w-4" />
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Prestazione
                        </th>
                        <th
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('countFatture')}
                        >
                            <div className="flex items-center justify-end gap-1">
                                Fatture <SortIcon field="countFatture" />
                            </div>
                        </th>
                        <th
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('totale')}
                        >
                            <div className="flex items-center justify-end gap-1">
                                Totale <SortIcon field="totale" />
                            </div>
                        </th>
                        <th
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('mediaFattura')}
                        >
                            <div className="flex items-center justify-end gap-1">
                                Media <SortIcon field="mediaFattura" />
                            </div>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            % Totale
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sortedData.map((row) => {
                        const totalSum = data.reduce((sum, r) => sum + r.totale, 0);
                        const percentage = totalSum > 0 ? (row.totale / totalSum * 100) : 0;

                        return (
                            <tr key={row.prestazioneId} className="hover:bg-gray-50">
                                <td className="px-4 py-4">
                                    <span className="font-medium text-gray-900">{row.prestazioneName}</span>
                                </td>
                                <td className="px-4 py-4 text-right text-gray-600">
                                    {row.countFatture}
                                </td>
                                <td className="px-4 py-4 text-right font-medium text-gray-900">
                                    {formatCurrency(row.totale)}
                                </td>
                                <td className="px-4 py-4 text-right text-gray-600">
                                    {formatCurrency(row.mediaFattura)}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-teal-500 rounded-full"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-500 w-12 text-right">
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

/**
 * Medici Report Table
 */
const MediciTable: React.FC<{
    data: ReportMedico[];
    isLoading: boolean;
}> = ({ data, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Medico
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Fatture
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Totale
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Pagati
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Pendenti
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            % Incasso
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((row) => {
                        const incassoPercentage = row.totale > 0 ? (row.pagati / row.totale * 100) : 0;

                        return (
                            <tr key={row.medicoId} className="hover:bg-gray-50">
                                <td className="px-4 py-4">
                                    <span className="font-medium text-gray-900">{row.medicoName}</span>
                                </td>
                                <td className="px-4 py-4 text-right text-gray-600">
                                    {row.countFatture}
                                </td>
                                <td className="px-4 py-4 text-right font-medium text-gray-900">
                                    {formatCurrency(row.totale)}
                                </td>
                                <td className="px-4 py-4 text-right text-green-600">
                                    {formatCurrency(row.pagati)}
                                </td>
                                <td className="px-4 py-4 text-right text-amber-600">
                                    {formatCurrency(row.pendenti)}
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${incassoPercentage >= 80
                                            ? 'bg-green-100 text-green-700'
                                            : incassoPercentage >= 50
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                        {incassoPercentage.toFixed(0)}%
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

/**
 * Daily Report Table
 */
const DailyTable: React.FC<{
    data: DailyReport[];
    isLoading: boolean;
}> = ({ data, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Data
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Fatture
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Totale
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Incassato
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Pendente
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((row) => (
                        <tr key={row.data} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                                <span className="font-medium text-gray-900">
                                    {formatDate(row.data, 'medium')}
                                </span>
                            </td>
                            <td className="px-4 py-4 text-right text-gray-600">
                                {row.countFatture}
                            </td>
                            <td className="px-4 py-4 text-right font-medium text-gray-900">
                                {formatCurrency(row.totale)}
                            </td>
                            <td className="px-4 py-4 text-right text-green-600">
                                {formatCurrency(row.incassato)}
                            </td>
                            <td className="px-4 py-4 text-right text-amber-600">
                                {formatCurrency(row.pendente)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const ReportFinanziari: React.FC = () => {
    // State
    const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>('mese');
    const [customRange, setCustomRange] = useState<DateRange>(() => getDateRange('mese'));
    const [activeView, setActiveView] = useState<ViewType>('overview');

    // Calculate actual date range
    const dateRange = useMemo(() => {
        if (periodoPreset === 'custom') {
            return customRange;
        }
        return getDateRange(periodoPreset);
    }, [periodoPreset, customRange]);

    // Fetch stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['fatture-stats', dateRange],
        queryFn: () => fattureApi.getStats(dateRange)
    });

    // Fetch report by prestazione
    const { data: reportPrestazioni, isLoading: prestazioniLoading } = useQuery({
        queryKey: ['fatture-report-prestazioni', dateRange],
        queryFn: () => fattureApi.getReportByPrestazione(dateRange),
        enabled: activeView === 'prestazioni' || activeView === 'overview'
    });

    // Fetch report by medico
    const { data: reportMedici, isLoading: mediciLoading } = useQuery({
        queryKey: ['fatture-report-medici', dateRange],
        queryFn: () => fattureApi.getReportByMedico(dateRange),
        enabled: activeView === 'medici' || activeView === 'overview'
    });

    // Fetch daily report
    const { data: reportDaily, isLoading: dailyLoading } = useQuery({
        queryKey: ['fatture-report-daily', dateRange],
        queryFn: () => fattureApi.getDailyReport(dateRange),
        enabled: activeView === 'giornaliero'
    });

    // Calculate summary values
    const summary = useMemo(() => {
        if (!stats) return null;

        const pagati = stats.perStato.find((s: { stato: string }) => s.stato === 'pagata');
        const pendenti = stats.perStato.find((s: { stato: string }) => s.stato === 'emessa');

        return {
            fatturato: stats.totale.fatturato,
            incassato: pagati?.totale || 0,
            pendente: pendenti?.totale || 0,
            count: stats.totale.count,
            mediaFattura: stats.totale.count > 0 ? stats.totale.fatturato / stats.totale.count : 0
        };
    }, [stats]);

    // Export CSV handler
    const handleExportCSV = () => {
        const url = fattureApi.exportCSV(dateRange);
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        to="/poliambulatorio/fatturazione"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Report Finanziari</h1>
                        <p className="text-gray-600">Analisi dettagliata incassi e fatturazione</p>
                    </div>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Esporta CSV
                </button>
            </div>

            {/* Period Selector */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <PeriodSelector
                    preset={periodoPreset}
                    onPresetChange={setPeriodoPreset}
                    customRange={customRange}
                    onCustomRangeChange={setCustomRange}
                />
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <SummaryCard
                        title="Fatturato Totale"
                        value={formatCurrency(summary.fatturato)}
                        subtitle={`${summary.count} fatture`}
                        icon={<Euro className="h-6 w-6" />}
                        color="teal"
                    />
                    <SummaryCard
                        title="Incassato"
                        value={formatCurrency(summary.incassato)}
                        subtitle={`${((summary.incassato / summary.fatturato) * 100 || 0).toFixed(0)}% del totale`}
                        icon={<TrendingUp className="h-6 w-6" />}
                        color="green"
                    />
                    <SummaryCard
                        title="Pendente"
                        value={formatCurrency(summary.pendente)}
                        subtitle="Da incassare"
                        icon={<TrendingDown className="h-6 w-6" />}
                        color="amber"
                    />
                    <SummaryCard
                        title="Media Fattura"
                        value={formatCurrency(summary.mediaFattura)}
                        icon={<BarChart3 className="h-6 w-6" />}
                        color="blue"
                    />
                    <SummaryCard
                        title="IVA Totale"
                        value={formatCurrency(stats?.totale.iva || 0)}
                        icon={<FileSpreadsheet className="h-6 w-6" />}
                        color="purple"
                    />
                </div>
            )}

            {/* View Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <ViewTabs activeView={activeView} onViewChange={setActiveView} />

                <div className="p-6">
                    {activeView === 'overview' && (
                        <div className="space-y-8">
                            {/* Trend Chart Placeholder */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-4">Trend Mensile</h3>
                                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <div className="text-center text-gray-500">
                                        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>Grafico trend (disponibile con recharts)</p>
                                        {stats?.trend && (
                                            <p className="text-sm mt-2">
                                                {stats.trend.length} mesi di dati disponibili
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Top Prestazioni */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-4">Top 5 Prestazioni</h3>
                                <PrestazioniTable
                                    data={(reportPrestazioni || []).slice(0, 5)}
                                    isLoading={prestazioniLoading}
                                />
                            </div>

                            {/* Top Medici */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-4">Riepilogo Medici</h3>
                                <MediciTable
                                    data={(reportMedici || []).slice(0, 5)}
                                    isLoading={mediciLoading}
                                />
                            </div>
                        </div>
                    )}

                    {activeView === 'prestazioni' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Report per Prestazione</h3>
                                <span className="text-sm text-gray-500">
                                    {reportPrestazioni?.length || 0} prestazioni
                                </span>
                            </div>
                            <PrestazioniTable
                                data={reportPrestazioni || []}
                                isLoading={prestazioniLoading}
                            />
                        </div>
                    )}

                    {activeView === 'medici' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Report per Medico</h3>
                                <span className="text-sm text-gray-500">
                                    {reportMedici?.length || 0} medici
                                </span>
                            </div>
                            <MediciTable
                                data={reportMedici || []}
                                isLoading={mediciLoading}
                            />
                        </div>
                    )}

                    {activeView === 'giornaliero' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Report Giornaliero</h3>
                                <span className="text-sm text-gray-500">
                                    {reportDaily?.length || 0} giorni
                                </span>
                            </div>
                            <DailyTable
                                data={reportDaily || []}
                                isLoading={dailyLoading}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Methods Distribution */}
            {stats && stats.perMetodoPagamento.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Distribuzione Metodi di Pagamento</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats.perMetodoPagamento.map((metodo: { metodo: string; totale: number; count: number }) => {
                            const total = stats.perMetodoPagamento.reduce((s: number, m: { totale: number }) => s + m.totale, 0);
                            const percentage = total > 0 ? (metodo.totale / total * 100) : 0;

                            return (
                                <div key={metodo.metodo} className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500 capitalize">{metodo.metodo}</p>
                                    <p className="text-xl font-bold text-gray-900 mt-1">
                                        {formatCurrency(metodo.totale)}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {metodo.count} pagamenti ({percentage.toFixed(0)}%)
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportFinanziari;
