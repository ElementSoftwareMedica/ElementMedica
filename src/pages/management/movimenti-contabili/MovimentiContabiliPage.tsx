/**
 * MovimentiContabiliPage
 * 
 * P59 - Lista movimenti contabili con filtri avanzati
 * 
 * Features:
 * - Tabella resizable con filtri
 * - Filtri per direzione, stato, tipo, periodo
 * - Azioni bulk (cambio stato, eliminazione)
 * - Export Excel/PDF
 * - Click per dettaglio
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Plus,
    Search,
    Filter,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    MoreVertical,
    Edit,
    Trash2,
    CheckCircle,
    FileText,
    Building2,
    User,
    Calendar,
    ChevronLeft,
    ChevronRight,
    RefreshCcw,
} from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';
import { Input } from '../../../design-system/atoms/Input';
import { Badge } from '../../../design-system/atoms/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../design-system/molecules/Card';
import { Select } from '../../../design-system/atoms/Select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../../design-system';
import { useToast } from '../../../hooks/useToast';
import { CRUDButton } from '../../../components/shared/CRUDButton';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import {
    useMovimentiContabili,
    useDeleteMovimento,
    useMarkAsPaid,
    useBulkUpdateStato,
} from '../../../hooks/management/useMovimentiContabili';
import movimentiContabiliService from '../../../services/movimentiContabiliService';
import type {
    MovimentoContabile,
    DirezioneMovimento,
    StatoMovimento,
    TipoAttivitaMovimento,
    BranchType,
    MovimentiContabiliListParams,
} from '../../../services/movimentiContabiliService';
import { formatCurrency, formatDate } from '../../../utils/formatters';

// ============================================
// CONSTANTS
// ============================================

const STATO_OPTIONS: { value: StatoMovimento | 'ALL'; label: string; color: string }[] = [
    { value: 'ALL', label: 'Tutti gli stati', color: 'gray' },
    { value: 'BOZZA', label: 'Bozza', color: 'gray' },
    { value: 'CONFERMATO', label: 'Confermato', color: 'blue' },
    { value: 'FATTURATO', label: 'Fatturato', color: 'purple' },
    { value: 'PAGATO', label: 'Pagato', color: 'green' },
    { value: 'SCADUTO', label: 'Scaduto', color: 'red' },
    { value: 'ANNULLATO', label: 'Annullato', color: 'gray' },
];

const TIPO_OPTIONS: { value: TipoAttivitaMovimento | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Tutti i tipi' },
    { value: 'VISITA_MEDICA', label: 'Visita Medica' },
    { value: 'VISITA_SPECIALISTICA', label: 'Visita Specialistica' },
    { value: 'ESAME_DIAGNOSTICO', label: 'Esame Diagnostico' },
    { value: 'GIUDIZIO_IDONEITA', label: 'Giudizio Idoneità' },
    { value: 'ALLEGATO_3B', label: 'Allegato 3B' },
    { value: 'DVR', label: 'DVR' },
    { value: 'SOPRALLUOGO', label: 'Sopralluogo' },
    { value: 'NOMINA_RUOLO', label: 'Nomina Ruolo' },
    { value: 'CORSO_FORMAZIONE', label: 'Corso Formazione' },
    { value: 'CORSO_AGGIORNAMENTO', label: 'Corso Aggiornamento' },
    { value: 'BUNDLE_PACCHETTO', label: 'Bundle/Pacchetto' },
    { value: 'PREVENTIVO', label: 'Preventivo' },
    { value: 'CONSULENZA', label: 'Consulenza' },
    { value: 'ALTRO', label: 'Altro' },
];

// ============================================
// HELPER COMPONENTS
// ============================================

const StatoBadge: React.FC<{ stato: StatoMovimento }> = ({ stato }) => {
    const option = STATO_OPTIONS.find(o => o.value === stato);
    const colorMap: Record<string, string> = {
        gray: 'bg-gray-100 text-gray-800',
        blue: 'bg-blue-100 text-blue-800',
        purple: 'bg-purple-100 text-purple-800',
        green: 'bg-green-100 text-green-800',
        red: 'bg-red-100 text-red-800',
    };

    return (
        <Badge className={colorMap[option?.color || 'gray']}>
            {option?.label || stato}
        </Badge>
    );
};

const DirezioneBadge: React.FC<{ direzione: DirezioneMovimento }> = ({ direzione }) => {
    if (direzione === 'ENTRATA') {
        return (
            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3" />
                Entrata
            </Badge>
        );
    }
    return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Uscita
        </Badge>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const MovimentiContabiliPage: React.FC = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    // Filters from URL
    const direzioneFromUrl = searchParams.get('direzione') as DirezioneMovimento | null;
    const statoFromUrl = searchParams.get('stato') as StatoMovimento | null;
    const tipoFromUrl = searchParams.get('tipo') as TipoAttivitaMovimento | null;

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [direzioneFilter, setDirezioneFilter] = useState<DirezioneMovimento | 'ALL'>(direzioneFromUrl || 'ALL');
    const [statoFilter, setStatoFilter] = useState<StatoMovimento | 'ALL'>(statoFromUrl || 'ALL');
    const [tipoFilter, setTipoFilter] = useState<TipoAttivitaMovimento | 'ALL'>(tipoFromUrl || 'ALL');
    const [branchFilter, setBranchFilter] = useState<BranchType | 'ALL'>('ALL');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Build query params
    const queryParams: MovimentiContabiliListParams = useMemo(() => ({
        page,
        limit,
        ...(direzioneFilter !== 'ALL' && { direzione: direzioneFilter }),
        ...(statoFilter !== 'ALL' && { stato: statoFilter }),
        ...(tipoFilter !== 'ALL' && { tipo: tipoFilter }),
        ...(branchFilter !== 'ALL' && { branchType: branchFilter }),
        ...(searchQuery && { search: searchQuery }),
    }), [page, limit, direzioneFilter, statoFilter, tipoFilter, branchFilter, searchQuery]);

    // Query
    const { data, isLoading, isError, refetch } = useMovimentiContabili(queryParams);
    const deleteMutation = useDeleteMovimento();
    const markAsPaidMutation = useMarkAsPaid();
    const bulkUpdateMutation = useBulkUpdateStato();

    const movimenti = data?.data || [];
    const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

    // Handlers
    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        refetch();
    }, [refetch]);

    const handleFilterChange = useCallback((filterType: string, value: string) => {
        setPage(1);
        switch (filterType) {
            case 'direzione':
                setDirezioneFilter(value as DirezioneMovimento | 'ALL');
                break;
            case 'stato':
                setStatoFilter(value as StatoMovimento | 'ALL');
                break;
            case 'tipo':
                setTipoFilter(value as TipoAttivitaMovimento | 'ALL');
                break;
            case 'branch':
                setBranchFilter(value as BranchType | 'ALL');
                break;
        }
    }, []);

    const handleRowClick = (movimento: MovimentoContabile) => {
        navigate(`/management/movimenti-contabili/${movimento.id}`);
    };

    const handleNew = () => {
        navigate('/management/movimenti-contabili/nuovo');
    };

    const handleEdit = (id: string) => {
        navigate(`/management/movimenti-contabili/${id}/modifica`);
    };

    const handleDelete = async (movimento: MovimentoContabile) => {
        const reason = prompt('Inserisci il motivo della cancellazione (min 10 caratteri):');
        if (!reason || reason.length < 10) {
            showToast({ message: 'Motivo troppo breve (minimo 10 caratteri)', type: 'error' });
            return;
        }

        try {
            await deleteMutation.mutateAsync({ id: movimento.id, deletionReason: reason });
            showToast({ message: 'Movimento eliminato', type: 'success' });
        } catch (error) {
            showToast({ message: 'Errore nella cancellazione', type: 'error' });
        }
    };

    const handleMarkAsPaid = async (movimento: MovimentoContabile) => {
        try {
            await markAsPaidMutation.mutateAsync({
                id: movimento.id,
                dataPagamento: new Date().toISOString(),
            });
            showToast({ message: 'Movimento segnato come pagato', type: 'success' });
        } catch (error) {
            showToast({ message: 'Errore nell\'aggiornamento', type: 'error' });
        }
    };

    const handleBulkAction = async (action: 'confirm' | 'pay' | 'delete') => {
        if (selectedIds.length === 0) {
            showToast({ message: 'Seleziona almeno un movimento', type: 'warning' });
            return;
        }

        try {
            if (action === 'confirm') {
                await bulkUpdateMutation.mutateAsync({ ids: selectedIds, stato: 'CONFERMATO' });
                showToast({ message: `${selectedIds.length} movimenti confermati`, type: 'success' });
            } else if (action === 'pay') {
                await bulkUpdateMutation.mutateAsync({ ids: selectedIds, stato: 'PAGATO' });
                showToast({ message: `${selectedIds.length} movimenti segnati come pagati`, type: 'success' });
            }
            setSelectedIds([]);
        } catch (error) {
            showToast({ message: 'Errore nell\'operazione bulk', type: 'error' });
        }
    };

    const handleExport = async (format: 'excel' | 'pdf') => {
        try {
            const blob = format === 'excel'
                ? await movimentiContabiliService.exportExcel(queryParams)
                : await movimentiContabiliService.exportPdf(queryParams);

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `movimenti-contabili.${format === 'excel' ? 'xlsx' : 'pdf'}`;
            a.click();
            URL.revokeObjectURL(url);

            showToast({ message: `Export ${format.toUpperCase()} completato`, type: 'success' });
        } catch (error) {
            showToast({ message: 'Errore nell\'export', type: 'error' });
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === movimenti.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(movimenti.map(m => m.id));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Movimenti Contabili</h1>
                    <p className="text-gray-500">
                        {pagination.total} movimenti trovati
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/management/movimenti-contabili/dashboard')}
                    >
                        Dashboard
                    </Button>
                    <CRUDButton
                        operation="create"
                        variant="primary"
                        onClick={handleNew}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nuovo Movimento
                    </CRUDButton>
                </div>
            </div>

            {/* Filters Card */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4">
                        {/* Search */}
                        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Cerca per descrizione, soggetto..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </form>

                        {/* Direzione Filter */}
                        <Select
                            value={direzioneFilter}
                            onChange={(e) => handleFilterChange('direzione', e.target.value)}
                            options={[
                                { value: 'ALL', label: 'Tutte le direzioni' },
                                { value: 'ENTRATA', label: 'Entrata' },
                                { value: 'USCITA', label: 'Uscita' },
                            ]}
                            className="w-[180px]"
                        />

                        {/* Stato Filter */}
                        <Select
                            value={statoFilter}
                            onChange={(e) => handleFilterChange('stato', e.target.value)}
                            options={STATO_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                            className="w-[180px]"
                        />

                        {/* Tipo Filter */}
                        <Select
                            value={tipoFilter}
                            onChange={(e) => handleFilterChange('tipo', e.target.value)}
                            options={TIPO_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                            className="w-[180px]"
                        />

                        {/* Branch Filter */}
                        <Select
                            value={branchFilter}
                            onChange={(e) => handleFilterChange('branch', e.target.value)}
                            options={[
                                { value: 'ALL', label: 'Tutti i branch' },
                                { value: 'MEDICA', label: 'Clinica Medica' },
                                { value: 'FORMAZIONE', label: 'Formazione' },
                            ]}
                            className="w-[180px]"
                        />

                        {/* Export */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleExport('excel')}>
                                    Excel (.xlsx)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                                    PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Refresh */}
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                            <RefreshCcw className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Bulk Actions */}
                    {selectedIds.length > 0 && (
                        <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm text-blue-700">
                                {selectedIds.length} selezionati
                            </span>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkAction('confirm')}
                            >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Conferma
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkAction('pay')}
                            >
                                Segna Pagati
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedIds([])}
                            >
                                Deseleziona
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                        </div>
                    ) : isError ? (
                        <div className="text-center py-12 text-red-500">
                            Errore nel caricamento dei dati
                        </div>
                    ) : movimenti.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>Nessun movimento trovato</p>
                            <Button variant="outline" size="sm" onClick={handleNew} className="mt-3">
                                <Plus className="w-4 h-4 mr-2" />
                                Crea il primo movimento
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === movimenti.length}
                                                onChange={toggleSelectAll}
                                                className="rounded"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Direzione
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Tipo
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Soggetto
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Importo
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Data
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Scadenza
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Stato
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                            Azioni
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {movimenti.map((movimento) => (
                                        <tr
                                            key={movimento.id}
                                            className="hover:bg-gray-50 cursor-pointer"
                                            onClick={() => handleRowClick(movimento)}
                                        >
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(movimento.id)}
                                                    onChange={() => toggleSelect(movimento.id)}
                                                    className="rounded"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <DirezioneBadge direzione={movimento.direzione} />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {TIPO_OPTIONS.find(t => t.value === movimento.tipo)?.label || movimento.tipo}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center">
                                                    {movimento.tipoSoggetto === 'AZIENDA' ? (
                                                        <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                                                    ) : (
                                                        <User className="w-4 h-4 text-gray-400 mr-2" />
                                                    )}
                                                    <span className="text-sm text-gray-900">
                                                        {movimento.companyTenantProfile?.ragioneSociale ||
                                                            (movimento.person ? `${movimento.person.firstName} ${movimento.person.lastName}` :
                                                                'N/D')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`text-sm font-medium ${movimento.direzione === 'ENTRATA' ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {movimento.direzione === 'USCITA' ? '-' : '+'}
                                                    {formatCurrency(movimento.importoLordo)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {formatDate(movimento.dataEsecuzione)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {movimento.dataScadenza ? formatDate(movimento.dataScadenza) : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <StatoBadge stato={movimento.stato} />
                                            </td>
                                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEdit(movimento.id)}>
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Modifica
                                                        </DropdownMenuItem>
                                                        {movimento.stato !== 'PAGATO' && (
                                                            <DropdownMenuItem onClick={() => handleMarkAsPaid(movimento)}>
                                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                                Segna Pagato
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(movimento)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Elimina
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} totali)
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovimentiContabiliPage;
