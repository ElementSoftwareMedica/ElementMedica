/**
 * FatturazioneDashboard - Dashboard principale fatturazione
 * 
 * Overview incassi, statistiche, quick actions per fatturazione sanitaria.
 * 
 * @module pages/poliambulatorio/fatturazione/FatturazioneDashboard
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Receipt,
    CreditCard,
    TrendingUp,
    TrendingDown,
    Euro,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Plus,
    FileText,
    Calendar,
    Filter,
    Download,
    BarChart3,
    PieChart
} from 'lucide-react';
import { fattureApi, FatturaSanitaria, FatturaStats } from '../../../services/clinicaApi';
import { formatDate } from '../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

type PeriodoFilter = 'oggi' | 'settimana' | 'mese' | 'anno' | 'custom';

interface DateRange {
    dataInizio: string;
    dataFine: string;
}

// ============================================
// COMPONENTS
// ============================================

/**
 * Stat Card Component
 */
const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    color: 'teal' | 'blue' | 'green' | 'amber' | 'red';
}> = ({ title, value, icon, trend, color }) => {
    const colorClasses = {
        teal: 'bg-teal-50 text-teal-600 border-teal-200',
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        red: 'bg-red-50 text-red-600 border-red-200'
    };

    return (
        <div className={`p-6 rounded-xl border ${colorClasses[color]} bg-opacity-50`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="mt-1 text-2xl font-bold">{value}</p>
                    {trend && (
                        <p className={`mt-1 text-sm flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {trend.value}% vs mese precedente
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-full ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

/**
 * Status Badge Component
 */
const StatusBadge: React.FC<{ stato: string }> = ({ stato }) => {
    const config = {
        emessa: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Emessa' },
        pagata: { bg: 'bg-green-100', text: 'text-green-700', label: 'Pagata' },
        annullata: { bg: 'bg-red-100', text: 'text-red-700', label: 'Annullata' },
        parzialmente_pagata: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Parziale' }
    };

    const cfg = config[stato as keyof typeof config] || config.emessa;

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
        </span>
    );
};

/**
 * Recent Invoices List
 */
const RecentInvoices: React.FC<{ fatture: FatturaSanitaria[] }> = ({ fatture }) => {
    if (fatture.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nessuna fattura recente</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-100">
            {fatture.slice(0, 5).map((fattura) => (
                <Link
                    key={fattura.id}
                    to={`/poliambulatorio/fatturazione/${fattura.id}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg">
                            <Receipt className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{fattura.numero}</p>
                            <p className="text-sm text-gray-500">
                                {fattura.paziente?.cognome} {fattura.paziente?.nome} • {formatDate(fattura.dataEmissione)}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-gray-900">€{Number(fattura.totale).toFixed(2)}</p>
                        <StatusBadge stato={fattura.stato} />
                    </div>
                </Link>
            ))}
            {fatture.length > 5 && (
                <Link
                    to="/poliambulatorio/fatturazione"
                    className="block text-center py-3 text-teal-600 hover:text-teal-700 font-medium"
                >
                    Vedi tutte ({fatture.length})
                </Link>
            )}
        </div>
    );
};

/**
 * Payment Methods Chart (placeholder)
 */
const PaymentMethodsChart: React.FC<{ data: FatturaStats['perMetodoPagamento'] }> = ({ data }) => {
    const metodiLabels: Record<string, string> = {
        cash: 'Contanti',
        card: 'Carta',
        transfer: 'Bonifico',
        pos: 'POS',
        check: 'Assegno'
    };

    const total = data.reduce((acc, m) => acc + m.totale, 0);

    return (
        <div className="space-y-3">
            {data.map((metodo) => {
                const percent = total > 0 ? (metodo.totale / total) * 100 : 0;
                return (
                    <div key={metodo.metodo}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{metodiLabels[metodo.metodo] || metodo.metodo}</span>
                            <span className="font-medium">€{Number(metodo.totale).toFixed(2)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-teal-500 rounded-full transition-all"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                );
            })}
            {data.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nessun pagamento registrato</p>
            )}
        </div>
    );
};

/**
 * Quick Actions Panel
 */
const QuickActions: React.FC = () => {
    return (
        <div className="grid grid-cols-2 gap-3">
            <Link
                to="/poliambulatorio/fatturazione/nuova"
                className="flex items-center gap-2 p-4 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors"
            >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Nuova Fattura</span>
            </Link>
            <Link
                to="/poliambulatorio/fatturazione?stato=emessa"
                className="flex items-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
                <Clock className="h-5 w-5" />
                <span className="font-medium">Da Incassare</span>
            </Link>
            <Link
                to="/poliambulatorio/fatturazione/report"
                className="flex items-center gap-2 p-4 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
            >
                <BarChart3 className="h-5 w-5" />
                <span className="font-medium">Report</span>
            </Link>
            <Link
                to="/poliambulatorio/fatturazione/export"
                className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
            >
                <Download className="h-5 w-5" />
                <span className="font-medium">Esporta</span>
            </Link>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const FatturazioneDashboard: React.FC = () => {
    const [periodo, setPeriodo] = useState<PeriodoFilter>('mese');

    // Calculate date range based on period
    const dateRange = useMemo((): DateRange => {
        const now = new Date();
        let dataInizio: Date;

        switch (periodo) {
            case 'oggi':
                dataInizio = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'settimana':
                dataInizio = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'mese':
                dataInizio = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'anno':
                dataInizio = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                dataInizio = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        return {
            dataInizio: dataInizio.toISOString().split('T')[0],
            dataFine: new Date().toISOString().split('T')[0]
        };
    }, [periodo]);

    // Fetch stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['fatture-stats', dateRange],
        queryFn: () => fattureApi.getStats(dateRange)
    });

    // Fetch recent invoices
    const { data: recentFatture, isLoading: fattureLoading } = useQuery({
        queryKey: ['fatture-recent'],
        queryFn: () => fattureApi.getAll({ limit: 10, sortBy: 'dataEmissione', sortOrder: 'desc' })
    });

    const statsData = stats;
    const fatture = recentFatture?.data || [];

    // Calculate pending amount
    const pendingAmount = useMemo(() => {
        const emesse = statsData?.perStato.find((s: { stato: string }) => s.stato === 'emessa');
        return emesse?.totale || 0;
    }, [statsData]);

    const pendingCount = useMemo(() => {
        const emesse = statsData?.perStato.find((s: { stato: string }) => s.stato === 'emessa');
        return emesse?.count || 0;
    }, [statsData]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fatturazione</h1>
                    <p className="text-gray-600">Gestione fatture sanitarie e incassi</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Period filter */}
                    <select
                        value={periodo}
                        onChange={(e) => setPeriodo(e.target.value as PeriodoFilter)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                    >
                        <option value="oggi">Oggi</option>
                        <option value="settimana">Ultima settimana</option>
                        <option value="mese">Questo mese</option>
                        <option value="anno">Quest'anno</option>
                    </select>
                    <Link
                        to="/poliambulatorio/fatturazione/nuova"
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Nuova Fattura
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Fatturato Totale"
                    value={`€${Number(statsData?.totale.fatturato || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                    icon={<Euro className="h-6 w-6" />}
                    color="teal"
                />
                <StatCard
                    title="Da Incassare"
                    value={`€${Number(pendingAmount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                    icon={<Clock className="h-6 w-6" />}
                    color="amber"
                />
                <StatCard
                    title="Fatture Emesse"
                    value={statsData?.totale.count || 0}
                    icon={<Receipt className="h-6 w-6" />}
                    color="blue"
                />
                <StatCard
                    title="In Attesa"
                    value={pendingCount}
                    icon={<AlertCircle className="h-6 w-6" />}
                    color="red"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Invoices */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-900">Fatture Recenti</h2>
                        <Link
                            to="/poliambulatorio/fatturazione"
                            className="text-sm text-teal-600 hover:text-teal-700"
                        >
                            Vedi tutte
                        </Link>
                    </div>
                    {fattureLoading ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="animate-spin h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-3" />
                            Caricamento...
                        </div>
                    ) : (
                        <RecentInvoices fatture={fatture} />
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h2 className="font-semibold text-gray-900 mb-4">Azioni Rapide</h2>
                        <QuickActions />
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <PieChart className="h-5 w-5 text-teal-600" />
                            <h2 className="font-semibold text-gray-900">Metodi di Pagamento</h2>
                        </div>
                        {statsLoading ? (
                            <div className="py-4 text-center text-gray-500">Caricamento...</div>
                        ) : (
                            <PaymentMethodsChart data={statsData?.perMetodoPagamento || []} />
                        )}
                    </div>
                </div>
            </div>

            {/* Status Overview */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Riepilogo per Stato</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { stato: 'emessa', label: 'Emesse', icon: FileText, color: 'blue' },
                        { stato: 'pagata', label: 'Pagate', icon: CheckCircle2, color: 'green' },
                        { stato: 'annullata', label: 'Annullate', icon: XCircle, color: 'red' },
                        { stato: 'parzialmente_pagata', label: 'Parziali', icon: AlertCircle, color: 'amber' }
                    ].map(({ stato, label, icon: Icon, color }) => {
                        const data = statsData?.perStato.find((s: { stato: string }) => s.stato === stato);
                        return (
                            <div
                                key={stato}
                                className={`p-4 rounded-lg bg-${color}-50 border border-${color}-200`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className={`h-5 w-5 text-${color}-600`} />
                                    <span className="font-medium text-gray-700">{label}</span>
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{data?.count || 0}</p>
                                <p className="text-sm text-gray-600">
                                    €{Number(data?.totale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FatturazioneDashboard;
