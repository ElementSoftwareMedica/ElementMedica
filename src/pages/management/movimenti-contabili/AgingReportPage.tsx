/**
 * AgingReportPage
 * 
 * P59 - Pagina dedicata all'aging report scadenze
 * 
 * Features:
 * - Report scadenze per fascia temporale
 * - Filtri per branch e direzione
 * - Export PDF/Excel
 * - Trend storico
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    Filter,
    Calendar,
    AlertTriangle,
    TrendingUp,
    RefreshCw,
    FileSpreadsheet,
    Printer,
    ChevronRight,
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../design-system/molecules/Card';
import { Select } from '../../../design-system/atoms/Select';
import { Badge } from '../../../design-system/atoms/Badge';
import { useToast } from '../../../hooks/useToast';
import { useAgingReport, useMovimentiContabili } from '../../../hooks/management/useMovimentiContabili';
import movimentiContabiliService, { DirezioneMovimento, BranchType } from '../../../services/movimentiContabiliService';
import { formatCurrency, formatDate } from '../../../utils/formatters';

// ============================================
// TYPES
// ============================================

interface AgingBand {
    label: string;
    min: number;
    max: number | null;
    color: string;
    bgColor: string;
}

// ============================================
// CONSTANTS
// ============================================

const AGING_BANDS: AgingBand[] = [
    { label: 'Corrente', min: -Infinity, max: 0, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: '1-30 giorni', min: 1, max: 30, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { label: '31-60 giorni', min: 31, max: 60, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { label: '61-90 giorni', min: 61, max: 90, color: 'text-red-500', bgColor: 'bg-red-50' },
    { label: 'Oltre 90 giorni', min: 91, max: null, color: 'text-red-700', bgColor: 'bg-red-100' },
];

const BRANCH_OPTIONS = [
    { value: '', label: 'Tutti i Branch' },
    { value: 'MEDICA', label: 'Clinica Medica' },
    { value: 'FORMAZIONE', label: 'Formazione' },
];

const DIREZIONE_OPTIONS = [
    { value: '', label: 'Tutte le Direzioni' },
    { value: 'ENTRATA', label: 'Crediti (Entrate)' },
    { value: 'USCITA', label: 'Debiti (Uscite)' },
];

// ============================================
// HELPERS
// ============================================

const getDaysOverdue = (scadenza: string): number => {
    const today = new Date();
    const dueDate = new Date(scadenza);
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const getAgingBand = (daysOverdue: number): AgingBand => {
    return AGING_BANDS.find(band =>
        daysOverdue >= band.min && (band.max === null || daysOverdue <= band.max)
    ) || AGING_BANDS[AGING_BANDS.length - 1];
};

// ============================================
// MAIN COMPONENT
// ============================================

const AgingReportPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Filters
    const [branch, setBranch] = useState<string>('');
    const [direzione, setDirezione] = useState<string>('');

    // Queries
    const { data: agingData, isLoading: isLoadingAging, refetch } = useAgingReport({
        branchType: (branch as BranchType) || undefined,
        direzione: (direzione as DirezioneMovimento) || undefined,
    });

    // Get detailed movements for scaduti
    const { data: scadutiData } = useMovimentiContabili({
        stato: ['CONFERMATO', 'FATTURATO'],
        branchType: (branch as BranchType) || undefined,
        direzione: (direzione as DirezioneMovimento) || undefined,
    });

    // Filter scaduti movements
    const scadutiMovimenti = useMemo(() => {
        if (!scadutiData?.data) return [];
        const today = new Date();
        return scadutiData.data
            .filter(m => m.dataScadenza && new Date(m.dataScadenza) < today)
            .sort((a, b) => new Date(a.dataScadenza!).getTime() - new Date(b.dataScadenza!).getTime());
    }, [scadutiData]);

    // Group movements by aging band
    const movimentiByBand = useMemo(() => {
        const grouped = new Map<string, typeof scadutiMovimenti>();

        AGING_BANDS.forEach(band => {
            grouped.set(band.label, []);
        });

        scadutiMovimenti.forEach(movimento => {
            if (movimento.dataScadenza) {
                const daysOverdue = getDaysOverdue(movimento.dataScadenza);
                const band = getAgingBand(daysOverdue);
                const list = grouped.get(band.label) || [];
                list.push(movimento);
                grouped.set(band.label, list);
            }
        });

        return grouped;
    }, [scadutiMovimenti]);

    // Calculate totals by band
    const totalsByBand = useMemo(() => {
        const totals = new Map<string, number>();

        movimentiByBand.forEach((movements, bandLabel) => {
            const total = movements.reduce((sum, m) => sum + m.importoLordo, 0);
            totals.set(bandLabel, total);
        });

        return totals;
    }, [movimentiByBand]);

    // Grand total
    const grandTotal = useMemo(() => {
        let total = 0;
        totalsByBand.forEach(value => total += value);
        return total;
    }, [totalsByBand]);

    // Handlers
    const handleExportExcel = async () => {
        try {
            const blob = await movimentiContabiliService.exportExcel({
                stato: ['CONFERMATO', 'FATTURATO'],
                branchType: (branch as BranchType) || undefined,
                direzione: (direzione as DirezioneMovimento) || undefined,
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aging-report-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast({ message: 'Report esportato con successo', type: 'success' });
        } catch (error) {
            showToast({ message: 'Errore nell\'esportazione', type: 'error' });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleRefresh = () => {
        refetch();
        showToast({ message: 'Report aggiornato', type: 'success' });
    };

    return (
        <div className="space-y-6 print:space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" onClick={() => navigate('/management/movimenti-contabili/dashboard')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Dashboard
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Aging Report</h1>
                        <p className="text-gray-500">
                            Analisi scadenze per fascia temporale
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={handleRefresh}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Aggiorna
                    </Button>
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" />
                        Stampa
                    </Button>
                    <Button variant="outline" onClick={handleExportExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                    </Button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block">
                <h1 className="text-2xl font-bold">Aging Report - Scadenze</h1>
                <p className="text-gray-500">Data: {formatDate(new Date().toISOString())}</p>
            </div>

            {/* Filters */}
            <Card className="print:hidden">
                <CardHeader>
                    <CardTitle className="flex items-center text-base">
                        <Filter className="w-4 h-4 mr-2" />
                        Filtri
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Branch</label>
                            <Select
                                value={branch}
                                onChange={(e) => setBranch(e.target.value)}
                                options={BRANCH_OPTIONS}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Direzione</label>
                            <Select
                                value={direzione}
                                onChange={(e) => setDirezione(e.target.value)}
                                options={DIREZIONE_OPTIONS}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {AGING_BANDS.map((band) => {
                    const total = totalsByBand.get(band.label) || 0;
                    const count = movimentiByBand.get(band.label)?.length || 0;

                    return (
                        <Card key={band.label} className={`${band.bgColor} border-0`}>
                            <CardContent className="p-4">
                                <p className={`text-sm font-medium ${band.color}`}>{band.label}</p>
                                <p className={`text-2xl font-bold ${band.color}`}>
                                    {formatCurrency(total)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {count} movimenti
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Total Banner */}
            <Card className="bg-gray-900 text-white">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <AlertTriangle className="w-6 h-6 mr-3 text-yellow-400" />
                        <div>
                            <p className="text-sm text-gray-300">Totale Scaduto</p>
                            <p className="text-3xl font-bold">{formatCurrency(grandTotal)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-300">Movimenti</p>
                        <p className="text-2xl font-bold">{scadutiMovimenti.length}</p>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Tables by Band */}
            {AGING_BANDS.slice(1).map((band) => {
                const movements = movimentiByBand.get(band.label) || [];
                if (movements.length === 0) return null;

                return (
                    <Card key={band.label} className="print:break-inside-avoid">
                        <CardHeader className={band.bgColor}>
                            <CardTitle className={`${band.color} flex items-center justify-between`}>
                                <span>{band.label}</span>
                                <Badge variant="secondary">
                                    {movements.length} movimenti • {formatCurrency(totalsByBand.get(band.label) || 0)}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Movimento
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Tipo
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Scadenza
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                Giorni
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                                Importo
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase print:hidden">
                                                Azioni
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {movements.map((movimento) => {
                                            const daysOverdue = getDaysOverdue(movimento.dataScadenza!);

                                            return (
                                                <tr key={movimento.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-medium text-gray-900">
                                                                #{movimento.id.substring(0, 8)}
                                                            </p>
                                                            {movimento.descrizione && (
                                                                <p className="text-sm text-gray-500 truncate max-w-xs">
                                                                    {movimento.descrizione}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={movimento.direzione === 'ENTRATA' ? 'success' : 'warning'}>
                                                            {movimento.direzione === 'ENTRATA' ? 'Credito' : 'Debito'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-500">
                                                        {formatDate(movimento.dataScadenza!)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="destructive">
                                                            +{daysOverdue} gg
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        {formatCurrency(movimento.importoLordo)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center print:hidden">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => navigate(`/management/movimenti-contabili/${movimento.id}`)}
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            {/* Empty State */}
            {scadutiMovimenti.length === 0 && !isLoadingAging && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Nessuna scadenza
                        </h3>
                        <p className="text-gray-500">
                            Non ci sono movimenti scaduti con i filtri selezionati.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Print Footer */}
            <div className="hidden print:block text-center text-sm text-gray-500 mt-8">
                Report generato il {new Date().toLocaleString('it-IT')}
            </div>
        </div>
    );
};

export default AgingReportPage;
