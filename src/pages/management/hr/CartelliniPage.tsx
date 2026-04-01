/**
 * P68 - Cartellini Page
 * Visualizzazione e gestione cartellini mensili
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantFilter } from '@/context/TenantFilterContext';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
    FileText,
    Check,
    Lock,
    RefreshCw,
    Eye,
    Filter,
    Clock,
    Calendar,
    TrendingUp,
} from 'lucide-react';
import { CRUDButton } from '@/components/shared/CRUDButton';
import { ActionButton } from '@/components/ui/ActionButton';
import { DropdownAction } from '@/design-system/molecules/Dropdown';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import ResizableTable from '@/components/shared/ResizableTable';
import { useToast } from '@/hooks/useToast';
import {
    cartelliniApi,
    profiliHRApi,
    Cartellino,
    StatoCartellino,
    STATO_CARTELLINO_LABELS,
} from './api';

const STATO_COLORS: Record<StatoCartellino, string> = {
    BOZZA: 'bg-gray-100 text-gray-700',
    VALIDATO: 'bg-blue-100 text-blue-700',
    CHIUSO: 'bg-emerald-100 text-emerald-700',
    CONTESTATO: 'bg-rose-100 text-rose-700',
};

const CartelliniPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedProfilo, setSelectedProfilo] = useState<string>('ALL');
    const [filterStato, setFilterStato] = useState<StatoCartellino | 'ALL'>('ALL');
    const [selectedCartellino, setSelectedCartellino] = useState<Cartellino | null>(null);

    const [year, month] = selectedMonth.split('-').map(Number);

    // Tenant filter for multi-tenant data isolation
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    const { data: profiliData } = useQuery({
        queryKey: ['hr', 'profili', 'list', tenantFilterKey],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = { isActive: true, limit: 200 };
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }
            return profiliHRApi.list(params);
        },
        enabled: isReady,
    });

    const { data: cartelliniData, isLoading } = useQuery({
        queryKey: ['hr', 'cartellini', tenantFilterKey, { year, month, selectedProfilo, filterStato }],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = {
                anno: year,
                mese: month,
                ...(selectedProfilo !== 'ALL' && { profiloHRId: selectedProfilo }),
                ...(filterStato !== 'ALL' && { stato: filterStato }),
            };
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }
            return cartelliniApi.list(params);
        },
        enabled: isReady,
    });

    const generaMutation = useMutation({
        mutationFn: cartelliniApi.genera,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'cartellini'] });
            showToast({ message: 'Cartellino creato/aggiornato', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Impossibile generare il cartellino', type: 'error' });
        },
    });

    const validaMutation = useMutation({
        mutationFn: cartelliniApi.valida,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'cartellini'] });
            showToast({ message: 'Cartellino validato', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Impossibile validare', type: 'error' });
        },
    });

    const chiudiMutation = useMutation({
        mutationFn: cartelliniApi.chiudi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'cartellini'] });
            showToast({ message: 'Cartellino chiuso', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Impossibile chiudere', type: 'error' });
        },
    });

    const profili = profiliData?.data ?? [];
    const cartellini = cartelliniData?.data ?? [];

    // Generate month options (last 12 months + next 1)
    const monthOptions = [];
    for (let i = -1; i < 12; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = format(d, 'MMMM yyyy', { locale: it });
        monthOptions.push({ value, label });
    }

    const columns = [
        {
            key: 'persona',
            label: 'Persona',
            renderCell: (row: Cartellino) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {row.profiloHR?.personTenantProfile?.person?.firstName?.[0]}
                        {row.profiloHR?.personTenantProfile?.person?.lastName?.[0]}
                    </div>
                    <span className="font-medium text-gray-900">
                        {row.profiloHR?.personTenantProfile?.person?.firstName}{' '}
                        {row.profiloHR?.personTenantProfile?.person?.lastName}
                    </span>
                </div>
            ),
        },
        {
            key: 'ore',
            label: 'Ore Lavorate',
            renderCell: (row: Cartellino) => (
                <div className="text-sm">
                    <p className="font-medium text-gray-900">{row.oreLavorateEffettive}h</p>
                    <p className="text-gray-500">su {row.oreLavoratePreviste}h previste</p>
                </div>
            ),
        },
        {
            key: 'differenza',
            label: 'Differenza',
            renderCell: (row: Cartellino) => {
                const diff = row.differenzaOre;
                return (
                    <span className={`font-medium ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {diff >= 0 ? '+' : ''}{diff}h
                    </span>
                );
            },
        },
        {
            key: 'straordinario',
            label: 'Straordinario',
            renderCell: (row: Cartellino) => (
                <span className="text-amber-600 font-medium">
                    {row.oreStraordinario > 0 ? `+${row.oreStraordinario}h` : '-'}
                </span>
            ),
        },
        {
            key: 'assenze',
            label: 'Assenze',
            renderCell: (row: Cartellino) => (
                <div className="text-sm text-gray-600">
                    <span className="text-emerald-600">{row.giorniFerie}g fer</span>
                    <span className="mx-1">|</span>
                    <span className="text-blue-600">{row.giorniPermesso}g per</span>
                    <span className="mx-1">|</span>
                    <span className="text-rose-600">{row.giorniMalattia}g mal</span>
                </div>
            ),
        },
        {
            key: 'presenze',
            label: 'Presenza',
            renderCell: (row: Cartellino) => (
                <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${row.percentualePresenza}%` }}
                        />
                    </div>
                    <span className="text-sm font-medium">{row.percentualePresenza.toFixed(0)}%</span>
                </div>
            ),
        },
        {
            key: 'stato',
            label: 'Stato',
            renderCell: (row: Cartellino) => (
                <Badge className={STATO_COLORS[row.stato]}>
                    {STATO_CARTELLINO_LABELS[row.stato]}
                </Badge>
            ),
        },
        {
            key: 'azioni',
            label: '',
            renderCell: (row: Cartellino) => {
                const actions: DropdownAction[] = [
                    {
                        label: 'Dettagli',
                        icon: <Eye className="w-4 h-4" />,
                        onClick: () => setSelectedCartellino(row),
                    },
                ];

                if (row.stato === 'BOZZA') {
                    actions.push(
                        {
                            label: 'Rigenera',
                            icon: <RefreshCw className="w-4 h-4" />,
                            onClick: () => generaMutation.mutate({ profiloHRId: row.profiloHRId, anno: year, mese: month }),
                        },
                        {
                            label: 'Valida',
                            icon: <Check className="w-4 h-4" />,
                            variant: 'primary',
                            onClick: () => validaMutation.mutate(row.id),
                        }
                    );
                }

                if (row.stato === 'VALIDATO') {
                    actions.push({
                        label: 'Chiudi',
                        icon: <Lock className="w-4 h-4" />,
                        variant: 'primary',
                        onClick: () => chiudiMutation.mutate(row.id),
                    });
                }

                return <ActionButton theme="violet" actions={actions} />;
            },
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cartellini</h1>
                    <p className="text-gray-600">Report mensili presenze e ore lavorate</p>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Cartellini</p>
                        <p className="text-xl font-bold">{cartellini.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Ore Totali</p>
                        <p className="text-xl font-bold">
                            {cartellini.reduce((sum, c) => sum + c.oreLavorateEffettive, 0)}h
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Straordinari</p>
                        <p className="text-xl font-bold">
                            {cartellini.reduce((sum, c) => sum + c.oreStraordinario, 0)}h
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Presenza Media</p>
                        <p className="text-xl font-bold">
                            {cartellini.length > 0
                                ? (cartellini.reduce((sum, c) => sum + c.percentualePresenza, 0) / cartellini.length).toFixed(0)
                                : 0}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Filtri:</span>
                </div>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {monthOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={selectedProfilo} onValueChange={setSelectedProfilo}>
                    <SelectTrigger className="w-64">
                        <SelectValue placeholder="Tutti i collaboratori" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tutti i collaboratori</SelectItem>
                        {profili.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.personTenantProfile?.person?.firstName} {p.personTenantProfile?.person?.lastName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filterStato} onValueChange={(v) => setFilterStato(v as StatoCartellino | 'ALL')}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Tutti gli stati" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tutti gli stati</SelectItem>
                        {Object.entries(STATO_CARTELLINO_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <ResizableTable
                columns={columns}
                data={cartellini}
                onRowClick={(row) => setSelectedCartellino(row)}
            />

            {/* Detail Dialog */}
            <Dialog open={selectedCartellino !== null} onOpenChange={() => setSelectedCartellino(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Cartellino - {selectedCartellino?.profiloHR?.personTenantProfile?.person?.firstName}{' '}
                            {selectedCartellino?.profiloHR?.personTenantProfile?.person?.lastName}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedCartellino && (
                        <div className="space-y-6 py-4">
                            <div className="flex items-center justify-between">
                                <p className="text-lg font-semibold">
                                    {format(new Date(selectedCartellino.anno, selectedCartellino.mese - 1), 'MMMM yyyy', { locale: it })}
                                </p>
                                <Badge className={STATO_COLORS[selectedCartellino.stato]}>
                                    {STATO_CARTELLINO_LABELS[selectedCartellino.stato]}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Ore Previste</p>
                                    <p className="text-xl font-bold">{selectedCartellino.oreLavoratePreviste}h</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Ore Effettive</p>
                                    <p className="text-xl font-bold">{selectedCartellino.oreLavorateEffettive}h</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-500">Differenza</p>
                                    <p className={`text-xl font-bold ${selectedCartellino.differenzaOre >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {selectedCartellino.differenzaOre >= 0 ? '+' : ''}{selectedCartellino.differenzaOre}h
                                    </p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg">
                                    <p className="text-sm text-amber-600">Straordinario</p>
                                    <p className="text-xl font-bold text-amber-700">{selectedCartellino.oreStraordinario}h</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-emerald-50 rounded-lg">
                                    <p className="text-sm text-emerald-600">Ferie</p>
                                    <p className="text-lg font-bold text-emerald-700">{selectedCartellino.giorniFerie} giorni</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-600">Permessi</p>
                                    <p className="text-lg font-bold text-blue-700">{selectedCartellino.giorniPermesso} giorni</p>
                                </div>
                                <div className="p-3 bg-rose-50 rounded-lg">
                                    <p className="text-sm text-rose-600">Malattia</p>
                                    <p className="text-lg font-bold text-rose-700">{selectedCartellino.giorniMalattia} giorni</p>
                                </div>
                                <div className="p-3 bg-violet-50 rounded-lg">
                                    <p className="text-sm text-violet-600">Smart Working</p>
                                    <p className="text-lg font-bold text-violet-700">{selectedCartellino.giorniSmartWorking} giorni</p>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Percentuale Presenza</span>
                                    <span className="font-bold">{selectedCartellino.percentualePresenza.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                        style={{ width: `${selectedCartellino.percentualePresenza}%` }}
                                    />
                                </div>
                            </div>

                            {(selectedCartellino as { timbratureMancanti?: number })?.timbratureMancanti && (selectedCartellino as { timbratureMancanti?: number }).timbratureMancanti! > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm text-amber-700">
                                        ⚠️ {(selectedCartellino as { timbratureMancanti?: number }).timbratureMancanti} timbrature mancanti nel periodo
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CartelliniPage;
