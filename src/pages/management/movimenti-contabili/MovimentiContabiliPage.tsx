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
import { useQuery } from '@tanstack/react-query';
import {
    Plus,
    Search,
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
    X,
} from 'lucide-react';
import { apiGet } from '../../../services/api';
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
    { value: 'DA_FATTURARE', label: 'Da Fatturare', color: 'orange' },
    { value: 'CONFERMATO', label: 'Confermato', color: 'blue' },
    { value: 'FATTURATO', label: 'Fatturato', color: 'purple' },
    { value: 'PAGATO', label: 'Pagato', color: 'green' },
    { value: 'SCADUTO', label: 'Scaduto', color: 'red' },
    { value: 'ANNULLATO', label: 'Annullato', color: 'gray' },
    { value: 'STORNATO', label: 'Stornato', color: 'gray' },
];

const TIPO_OPTIONS: { value: TipoAttivitaMovimento | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Tutti i tipi' },
    { value: 'VISITA_MEDICA', label: 'Visita Medica' },
    { value: 'PRESTAZIONE_CLINICA', label: 'Prestazione Clinica' },
    { value: 'REFERTO', label: 'Referto' },
    { value: 'VISITA_MDL', label: 'Visita MDL' },
    { value: 'SOPRALLUOGO_MC', label: 'Sopralluogo MC' },
    { value: 'SOPRALLUOGO_RSPP', label: 'Sopralluogo RSPP' },
    { value: 'DVR_NUOVO', label: 'DVR Nuovo' },
    { value: 'DVR_AGGIORNAMENTO_CON_MODIFICHE', label: 'DVR Aggiornamento (con modifiche)' },
    { value: 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE', label: 'DVR Aggiornamento (senza modifiche)' },
    { value: 'NOMINA_MC', label: 'Nomina MC' },
    { value: 'NOMINA_RSPP', label: 'Nomina RSPP' },
    { value: 'GIUDIZIO_IDONEITA', label: 'Giudizio Idoneità' },
    { value: 'ALLEGATO_3B', label: 'Allegato 3B' },
    { value: 'CORSO_FORMAZIONE', label: 'Corso Formazione' },
    { value: 'DOCENZA', label: 'Docenza' },
    { value: 'ATTESTATO', label: 'Attestato' },
    { value: 'BUNDLE', label: 'Bundle' },
    { value: 'CONVENZIONE', label: 'Convenzione' },
    { value: 'CONSULENZA', label: 'Consulenza' },
    { value: 'SPESA_FISSA', label: 'Spesa Fissa' },
    { value: 'SPESA_RICORRENTE', label: 'Spesa Ricorrente' },
    { value: 'RIMBORSO', label: 'Rimborso' },
    { value: 'COMPENSO_FORMATORE', label: 'Compenso Formatore' },
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
    const personIdFromUrl = searchParams.get('personId');

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [direzioneFilter, setDirezioneFilter] = useState<DirezioneMovimento | 'ALL'>(direzioneFromUrl || 'ALL');
    const [statoFilter, setStatoFilter] = useState<StatoMovimento | 'ALL'>(statoFromUrl || 'ALL');
    const [tipoFilter, setTipoFilter] = useState<TipoAttivitaMovimento | 'ALL'>(tipoFromUrl || 'ALL');
    const [branchFilter, setBranchFilter] = useState<BranchType | 'ALL'>('ALL');
    const [personIdFilter, setPersonIdFilter] = useState<string>(personIdFromUrl || '');
    const [companyIdFilter, setCompanyIdFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Build query params
    const queryParams: MovimentiContabiliListParams = useMemo(() => ({
        page,
        limit,
        include: 'person,company',
        ...(direzioneFilter !== 'ALL' && { direzione: direzioneFilter }),
        ...(statoFilter !== 'ALL' && { stato: statoFilter }),
        ...(tipoFilter !== 'ALL' && { tipo: tipoFilter }),
        ...(branchFilter !== 'ALL' && { branchType: branchFilter }),
        ...(personIdFilter && { personId: personIdFilter }),
        ...(companyIdFilter && { companyTenantProfileId: companyIdFilter }),
        ...(searchQuery && { search: searchQuery }),
    }), [page, limit, direzioneFilter, statoFilter, tipoFilter, branchFilter, personIdFilter, companyIdFilter, searchQuery]);

    // Query
    const { data, isLoading, isError, refetch } = useMovimentiContabili(queryParams);
    const deleteMutation = useDeleteMovimento();
    const markAsPaidMutation = useMarkAsPaid();
    const bulkUpdateMutation = useBulkUpdateStato();

    const movimenti = data?.data || [];
    const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 };

    // Derive unique formatori and aziende from ALL loaded movimenti (unfiltered query for dropdowns)
    const { data: allData } = useMovimentiContabili({ limit: 500, page: 1, include: 'person,company' });
    const formatori = useMemo(() => {
        const seen = new Map<string, string>();
        (allData?.data || []).forEach(m => {
            if (m.person && !seen.has(m.person.id)) {
                seen.set(m.person.id, `${m.person.firstName} ${m.person.lastName}`.trim());
            }
        });
        return Array.from(seen.entries()).map(([id, nome]) => ({ value: id, label: nome }));
    }, [allData]);

    const aziende = useMemo(() => {
        const seen = new Map<string, string>();
        (allData?.data || []).forEach(m => {
            const ctp = (m as any).companyTenantProfile;
            const name = ctp?.company?.ragioneSociale;
            if (ctp?.id && name && !seen.has(ctp.id)) seen.set(ctp.id, name);
            const ctpC = (m as any).controparteCollegata?.companyTenantProfile;
            const nameC = ctpC?.company?.ragioneSociale;
            if (ctpC?.id && nameC && !seen.has(ctpC.id)) seen.set(ctpC.id, nameC);
        });
        return Array.from(seen.entries()).map(([id, nome]) => ({ value: id, label: nome }));
    }, [allData]);

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
            case 'person':
                setPersonIdFilter(value);
                break;
            case 'company':
                setCompanyIdFilter(value);
                break;
        }
    }, []);

    const getTipoLabel = (tipo: string) => TIPO_OPTIONS.find(t => t.value === tipo)?.label || tipo.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const getFormatoreLabel = (id: string) => formatori.find(f => f.value === id)?.label || 'Formatore selezionato';
    const getAziendaLabel = (id: string) => aziende.find(a => a.value === id)?.label || 'Azienda selezionata';

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
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-6 text-white shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-teal-50 ring-1 ring-white/15">
                        <FileText className="h-3.5 w-3.5" />
                        Amministrazione
                    </div>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight">Movimenti contabili</h1>
                    <p className="mt-1 text-sm text-slate-200">
                        {pagination.total} movimenti trovati
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="secondary"
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
            </div>

            {/* Filters Card */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-5 space-y-4">
                    {/* Row 1: search + direzione + stato + tipo */}
                    <div className="flex flex-wrap gap-3">
                        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Cerca per descrizione..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </form>
                        <Select
                            value={direzioneFilter}
                            onChange={(e) => handleFilterChange('direzione', e.target.value)}
                            options={[
                                { value: 'ALL', label: 'Tutte le direzioni' },
                                { value: 'ENTRATA', label: '↓ Entrata' },
                                { value: 'USCITA', label: '↑ Uscita' },
                            ]}
                            className="w-[160px]"
                        />
                        <Select
                            value={statoFilter}
                            onChange={(e) => handleFilterChange('stato', e.target.value)}
                            options={STATO_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                            className="w-[180px]"
                        />
                        <Select
                            value={tipoFilter}
                            onChange={(e) => handleFilterChange('tipo', e.target.value)}
                            options={TIPO_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                            className="w-[220px]"
                        />
                        <Button variant="outline" size="sm" onClick={() => refetch()} title="Aggiorna">
                            <RefreshCcw className="w-4 h-4" />
                        </Button>
                    </div>
                    {/* Row 2: formatore + azienda + branch + export */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <Select
                            value={personIdFilter}
                            onChange={(e) => handleFilterChange('person', e.target.value)}
                            options={[
                                { value: '', label: 'Tutti i formatori' },
                                ...formatori,
                            ]}
                            className="w-[220px]"
                        />
                        <Select
                            value={companyIdFilter}
                            onChange={(e) => handleFilterChange('company', e.target.value)}
                            options={[
                                { value: '', label: 'Tutte le aziende' },
                                ...aziende,
                            ]}
                            className="w-[220px]"
                        />
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
                        <div className="ml-auto">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Download className="w-4 h-4 mr-2" />
                                        Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleExport('excel')}>Excel (.xlsx)</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    {/* Active filter chips */}
                    {(personIdFilter || companyIdFilter || tipoFilter !== 'ALL' || statoFilter !== 'ALL' || direzioneFilter !== 'ALL') && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {personIdFilter && (
                                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                                    <User className="w-3 h-3" />
                                    {getFormatoreLabel(personIdFilter)}
                                    <button onClick={() => { setPersonIdFilter(''); setPage(1); }}><X className="w-3 h-3" /></button>
                                </span>
                            )}
                            {companyIdFilter && (
                                <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-800 rounded-full px-2 py-0.5">
                                    <Building2 className="w-3 h-3" />
                                    {getAziendaLabel(companyIdFilter)}
                                    <button onClick={() => { setCompanyIdFilter(''); setPage(1); }}><X className="w-3 h-3" /></button>
                                </span>
                            )}
                            {tipoFilter !== 'ALL' && (
                                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
                                    {getTipoLabel(tipoFilter)}
                                    <button onClick={() => { setTipoFilter('ALL'); setPage(1); }}><X className="w-3 h-3" /></button>
                                </span>
                            )}
                            {statoFilter !== 'ALL' && (
                                <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
                                    {STATO_OPTIONS.find(s => s.value === statoFilter)?.label}
                                    <button onClick={() => { setStatoFilter('ALL'); setPage(1); }}><X className="w-3 h-3" /></button>
                                </span>
                            )}
                        </div>
                    )}
                    {/* Bulk Actions */}
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <span className="text-sm text-blue-700 font-medium">
                                {selectedIds.length} selezionati
                            </span>
                            <Button size="sm" variant="outline" onClick={() => handleBulkAction('confirm')}>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Conferma
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBulkAction('pay')}>
                                Segna Pagati
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                                Deseleziona
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-slate-200 shadow-sm">
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
                                <thead className="bg-slate-50 border-b border-slate-200">
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
                                            className="hover:bg-teal-50/60 cursor-pointer transition-colors"
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
                                                {getTipoLabel(movimento.tipo)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center">
                                                    {movimento.tipoSoggetto === 'AZIENDA' ? (
                                                        <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                                                    ) : (
                                                        <User className="w-4 h-4 text-gray-400 mr-2" />
                                                    )}
                                                    <span className="text-sm text-gray-900">
                                                        {(movimento as any).companyTenantProfile?.company?.ragioneSociale
                                                            || (movimento as any).controparteCollegata?.companyTenantProfile?.company?.ragioneSociale
                                                            || (movimento.person ? `${movimento.person.firstName} ${movimento.person.lastName}` : 'N/D')}
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
            {
                pagination.totalPages > 1 && (
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
                )
            }
        </div >
    );
};

export default MovimentiContabiliPage;
