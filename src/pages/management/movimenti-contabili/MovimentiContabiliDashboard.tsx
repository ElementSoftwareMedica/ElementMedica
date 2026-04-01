/**
 * MovimentiContabiliDashboard
 * 
 * P59 - Dashboard finanziaria con KPI, grafici e aging report
 * 
 * Features:
 * - KPI principali (totale entrate, uscite, saldo)
 * - Grafico trend ENTRATA vs USCITA
 * - Distribuzione per tipo attività
 * - Widget scadenze (aging report)
 * - Quick actions
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    AlertTriangle,
    Clock,
    FileText,
    Building2,
    Calendar,
    ArrowRight,
    RefreshCcw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../design-system/molecules/Card';
import { Button } from '../../../design-system/atoms/Button';
import { Badge } from '../../../design-system/atoms/Badge';
import { Select } from '../../../design-system/atoms/Select';
import { useToast } from '../../../hooks/useToast';
import {
    useFinancialDashboard,
    useMovimentiInScadenza,
    useMovimentiScaduti
} from '../../../hooks/management/useMovimentiContabili';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import type { BranchType, MovimentoContabile } from '../../../services/movimentiContabiliService';

// ============================================
// KPI CARD COMPONENT
// ============================================

interface KpiCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    trendLabel?: string;
    variant?: 'default' | 'success' | 'danger' | 'warning';
}

const KpiCard: React.FC<KpiCardProps> = ({
    title,
    value,
    icon,
    trend,
    trendLabel,
    variant = 'default'
}) => {
    const variantStyles = {
        default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
        danger: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
        warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    };

    const iconBgStyles = {
        default: 'bg-gray-100 dark:bg-gray-700',
        success: 'bg-green-100 dark:bg-green-800/50',
        danger: 'bg-red-100 dark:bg-red-800/50',
        warning: 'bg-amber-100 dark:bg-amber-800/50',
    };

    return (
        <Card className={`${variantStyles[variant]} border`}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
                        {trend !== undefined && (
                            <div className="flex items-center mt-1 text-sm">
                                {trend >= 0 ? (
                                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                                )}
                                <span className={trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                    {Math.abs(trend).toFixed(1)}%
                                </span>
                                {trendLabel && (
                                    <span className="text-gray-500 dark:text-gray-400 ml-1">{trendLabel}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <div className={`p-3 rounded-lg ${iconBgStyles[variant]}`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// ============================================
// SCADENZA ITEM COMPONENT
// ============================================

interface ScadenzaItemProps {
    movimento: MovimentoContabile;
    isScaduto?: boolean;
    onClick: () => void;
}

const ScadenzaItem: React.FC<ScadenzaItemProps> = ({ movimento, isScaduto, onClick }) => {
    const giorniScadenza = movimento.dataScadenza
        ? Math.ceil((new Date(movimento.dataScadenza).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div
            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-colors"
            onClick={onClick}
        >
            <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${isScaduto ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 line-clamp-1">
                        {movimento.descrizione || movimento.tipo}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {movimento.companyTenantProfile?.ragioneSociale || movimento.person?.lastName || 'N/D'}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {formatCurrency(movimento.importoLordo)}
                </p>
                {giorniScadenza !== null && (
                    <Badge
                        variant={isScaduto ? 'destructive' : 'outline'}
                        className="text-xs"
                    >
                        {isScaduto
                            ? `${Math.abs(giorniScadenza)}g fa`
                            : giorniScadenza === 0
                                ? 'Oggi'
                                : `${giorniScadenza}g`
                        }
                    </Badge>
                )}
            </div>
        </div>
    );
};

// ============================================
// MAIN DASHBOARD COMPONENT
// ============================================

const MovimentiContabiliDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Filters state
    const [branchType, setBranchType] = useState<BranchType | undefined>(undefined);
    const [periodoFilter, setPeriodoFilter] = useState<'mese' | 'trimestre' | 'anno'>('mese');

    // Calculate date range based on period
    const getDateRange = () => {
        const now = new Date();
        const dataDa = new Date();

        switch (periodoFilter) {
            case 'trimestre':
                dataDa.setMonth(now.getMonth() - 3);
                break;
            case 'anno':
                dataDa.setFullYear(now.getFullYear() - 1);
                break;
            default: // mese
                dataDa.setMonth(now.getMonth() - 1);
        }

        return {
            dataDa: dataDa.toISOString().split('T')[0],
            dataA: now.toISOString().split('T')[0],
        };
    };

    const dateRange = getDateRange();

    // Fetch data
    const { stats, aging, isLoading, isError } = useFinancialDashboard({
        branchType,
        ...dateRange,
    });

    const { data: scaduti } = useMovimentiScaduti({ branchType });
    const { data: inScadenza } = useMovimentiInScadenza({ branchType, giorniProssimi: 7 });

    // Handlers
    const handleRefresh = () => {
        // Query invalidation handled by react-query
        showToast({ message: 'Dashboard aggiornata', type: 'success' });
    };

    const handleMovimentoClick = (id: string) => {
        navigate(`/management/movimenti-contabili/${id}`);
    };

    const handleNewMovimento = () => {
        navigate('/management/movimenti-contabili/nuovo');
    };

    const handleViewAll = (type: 'scaduti' | 'in-scadenza' | 'lista') => {
        if (type === 'lista') {
            navigate('/management/movimenti-contabili');
        } else {
            navigate(`/management/movimenti-contabili?stato=${type === 'scaduti' ? 'SCADUTO' : ''}&inScadenza=${type === 'in-scadenza'}`);
        }
    };

    // Format helpers
    const formatAmount = (amount: number | undefined) => {
        return formatCurrency(amount || 0);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Dashboard Finanziaria</h1>
                    <p className="text-gray-500 dark:text-gray-400">Panoramica movimenti contabili</p>
                </div>
                <div className="flex items-center space-x-3">
                    {/* Branch Filter */}
                    <Select
                        value={branchType || 'all'}
                        onChange={(e) => setBranchType(e.target.value === 'all' ? undefined : e.target.value as BranchType)}
                        options={[
                            { value: 'all', label: 'Tutti i Branch' },
                            { value: 'MEDICA', label: 'Clinica Medica' },
                            { value: 'FORMAZIONE', label: 'Formazione' },
                        ]}
                        className="w-[180px]"
                    />

                    {/* Period Filter */}
                    <Select
                        value={periodoFilter}
                        onChange={(e) => setPeriodoFilter(e.target.value as typeof periodoFilter)}
                        options={[
                            { value: 'mese', label: 'Ultimo mese' },
                            { value: 'trimestre', label: 'Ultimo trimestre' },
                            { value: 'anno', label: 'Ultimo anno' },
                        ]}
                        className="w-[180px]"
                    />

                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Aggiorna
                    </Button>

                    <Button onClick={handleNewMovimento}>
                        <FileText className="w-4 h-4 mr-2" />
                        Nuovo Movimento
                    </Button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                </div>
            )}

            {/* Error State */}
            {isError && (
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="py-8 text-center">
                        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-3" />
                        <p className="text-red-700">Errore nel caricamento dei dati</p>
                        <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-3">
                            Riprova
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* KPI Cards */}
            {!isLoading && !isError && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard
                            title="Totale Entrate"
                            value={formatAmount(stats?.totaleEntrate)}
                            icon={<TrendingUp className="w-6 h-6 text-green-600" />}
                            variant="success"
                        />
                        <KpiCard
                            title="Totale Uscite"
                            value={formatAmount(stats?.totaleUscite)}
                            icon={<TrendingDown className="w-6 h-6 text-red-600" />}
                            variant="danger"
                        />
                        <KpiCard
                            title="Saldo"
                            value={formatAmount(stats?.saldo)}
                            icon={<Wallet className="w-6 h-6 text-teal-600" />}
                            variant={stats?.saldo && stats.saldo >= 0 ? 'success' : 'danger'}
                        />
                        <KpiCard
                            title="Scaduti"
                            value={scaduti?.length || 0}
                            icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
                            variant={(scaduti?.length || 0) > 0 ? 'warning' : 'default'}
                        />
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Aging Report Widget */}
                        <Card className="lg:col-span-2">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">Aging Report - Scadenze</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/management/movimenti-contabili/aging')}
                                >
                                    Dettagli <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {aging?.fasce && aging.fasce.length > 0 ? (
                                    <div className="space-y-4">
                                        {aging.fasce.map((fascia) => (
                                            <div key={fascia.fascia} className="flex items-center">
                                                <div className="w-24 text-sm text-gray-600 dark:text-gray-400">
                                                    {fascia.fascia} giorni
                                                </div>
                                                <div className="flex-1 mx-4">
                                                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all ${fascia.fascia === '90+'
                                                                ? 'bg-red-500'
                                                                : fascia.fascia === '61-90'
                                                                    ? 'bg-orange-500'
                                                                    : fascia.fascia === '31-60'
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-green-500'
                                                                }`}
                                                            style={{
                                                                width: `${Math.min(100, (fascia.importoTotale / (aging.totale?.importo || 1)) * 100)}%`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-32 text-right">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                                                        {formatCurrency(fascia.importoTotale)}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                                        ({fascia.count})
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>Nessun movimento con scadenza</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Azioni Rapide</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={handleNewMovimento}
                                >
                                    <FileText className="w-4 h-4 mr-3 text-teal-600" />
                                    Nuovo Movimento
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => handleViewAll('lista')}
                                >
                                    <Building2 className="w-4 h-4 mr-3 text-blue-600" />
                                    Lista Completa
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => navigate('/management/movimenti-contabili/aging')}
                                >
                                    <Calendar className="w-4 h-4 mr-3 text-amber-600" />
                                    Aging Report
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Scadenze Lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Movimenti Scaduti */}
                        <Card className="border-red-200 dark:border-red-800">
                            <CardHeader className="flex flex-row items-center justify-between bg-red-50 dark:bg-red-900/30 rounded-t-lg">
                                <CardTitle className="text-lg flex items-center text-red-700 dark:text-red-400">
                                    <AlertTriangle className="w-5 h-5 mr-2" />
                                    Scaduti ({scaduti?.length || 0})
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewAll('scaduti')}
                                >
                                    Vedi tutti <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4">
                                {scaduti && scaduti.length > 0 ? (
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {scaduti.slice(0, 5).map((m) => (
                                            <ScadenzaItem
                                                key={m.id}
                                                movimento={m}
                                                isScaduto
                                                onClick={() => handleMovimentoClick(m.id)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Nessun movimento scaduto</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Movimenti in Scadenza */}
                        <Card className="border-amber-200 dark:border-amber-800">
                            <CardHeader className="flex flex-row items-center justify-between bg-amber-50 dark:bg-amber-900/30 rounded-t-lg">
                                <CardTitle className="text-lg flex items-center text-amber-700 dark:text-amber-400">
                                    <Clock className="w-5 h-5 mr-2" />
                                    In Scadenza ({inScadenza?.length || 0})
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewAll('in-scadenza')}
                                >
                                    Vedi tutti <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </CardHeader>
                            <CardContent className="p-4">
                                {inScadenza && inScadenza.length > 0 ? (
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {inScadenza.slice(0, 5).map((m) => (
                                            <ScadenzaItem
                                                key={m.id}
                                                movimento={m}
                                                onClick={() => handleMovimentoClick(m.id)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Nessun movimento in scadenza</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
};

export default MovimentiContabiliDashboard;
