/**
 * P68 - Timbrature Page
 * Gestione e visualizzazione timbrature del personale
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantFilter } from '@/context/TenantFilterContext';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
    Clock,
    CheckCircle2,
    XCircle,
    Filter,
    Download,
    Plus,
    Trash2,
} from 'lucide-react';
import { CRUDPrimaryButton, CRUDButton } from '@/components/shared/CRUDButton';
import { ActionButton } from '@/components/ui/ActionButton';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import ResizableTable from '@/components/shared/ResizableTable';
import { useToast } from '@/hooks/useToast';
import { timbraturaApi, profiliHRApi, Timbratura, TipoTimbratura } from './api';

const TIPO_LABELS: Record<TipoTimbratura, { label: string; color: string }> = {
    ENTRATA: { label: 'Entrata', color: 'bg-emerald-100 text-emerald-700' },
    USCITA: { label: 'Uscita', color: 'bg-rose-100 text-rose-700' },
    INIZIO_PAUSA: { label: 'Inizio Pausa', color: 'bg-amber-100 text-amber-700' },
    FINE_PAUSA: { label: 'Fine Pausa', color: 'bg-blue-100 text-blue-700' },
    ENTRATA_STRAORDINARIO: { label: 'Entrata Straord.', color: 'bg-violet-100 text-violet-700' },
    USCITA_STRAORDINARIO: { label: 'Uscita Straord.', color: 'bg-pink-100 text-pink-700' },
};

const TimbraturaPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedProfilo, setSelectedProfilo] = useState<string>('ALL');

    const [year, month] = selectedMonth.split('-').map(Number);
    const dataInizio = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
    const dataFine = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

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

    const { data: timbratureData, isLoading } = useQuery({
        queryKey: ['hr', 'timbrature', tenantFilterKey, { dataInizio, dataFine, profiloHRId: selectedProfilo }],
        queryFn: () => {
            const tenantParams = getTenantFilterParams();
            const params: Record<string, unknown> = {
                dataInizio,
                dataFine,
                ...(selectedProfilo !== 'ALL' && { profiloHRId: selectedProfilo }),
            };
            if (tenantParams.tenantIds) {
                params.tenantIds = tenantParams.tenantIds.join(',');
            }
            if (tenantParams.allTenants) {
                params.allTenants = true;
            }
            return timbraturaApi.list(params);
        },
        enabled: isReady,
    });

    const validaMutation = useMutation({
        mutationFn: timbraturaApi.valida,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'timbrature'] });
            showToast({ message: 'Timbratura validata', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Impossibile validare', type: 'error' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: timbraturaApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr', 'timbrature'] });
            showToast({ message: 'Timbratura eliminata', type: 'success' });
        },
        onError: () => {
            showToast({ message: 'Impossibile eliminare', type: 'error' });
        },
    });

    const profili = profiliData?.data ?? [];
    const timbrature = timbratureData?.data ?? [];

    const columns = [
        {
            key: 'dataOra',
            label: 'Data/Ora',
            renderCell: (row: Timbratura) => (
                <div>
                    <p className="font-medium text-gray-900">
                        {format(parseISO(row.dataOra), 'EEEE d MMMM', { locale: it })}
                    </p>
                    <p className="text-sm text-gray-500">
                        {format(parseISO(row.dataOra), 'HH:mm:ss')}
                    </p>
                </div>
            ),
        },
        {
            key: 'persona',
            label: 'Persona',
            renderCell: (row: Timbratura) => (
                <span className="text-gray-700">
                    {row.profiloHR?.personTenantProfile?.person?.firstName}{' '}
                    {row.profiloHR?.personTenantProfile?.person?.lastName}
                </span>
            ),
        },
        {
            key: 'tipo',
            label: 'Tipo',
            renderCell: (row: Timbratura) => {
                const info = TIPO_LABELS[row.tipo];
                return (
                    <Badge className={info.color}>{info.label}</Badge>
                );
            },
        },
        {
            key: 'origine',
            label: 'Origine',
            renderCell: (row: Timbratura) => (
                <span className="text-sm text-gray-500">{row.origine}</span>
            ),
        },
        {
            key: 'validata',
            label: 'Validata',
            renderCell: (row: Timbratura) =>
                row.isValidata ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                    <XCircle className="w-5 h-5 text-gray-300" />
                ),
        },
        {
            key: 'azioni',
            label: '',
            renderCell: (row: Timbratura) => {
                const actions = [];
                if (!row.isValidata) {
                    actions.push({
                        label: 'Valida',
                        icon: <CheckCircle2 className="w-4 h-4" />,
                        variant: 'primary' as const,
                        onClick: () => validaMutation.mutate(row.id),
                    });
                }
                actions.push({
                    label: 'Elimina',
                    icon: <Trash2 className="w-4 h-4" />,
                    variant: 'danger' as const,
                    onClick: () => {
                        const reason = prompt('Motivo eliminazione (min 10 caratteri):');
                        if (reason && reason.length >= 10) {
                            deleteMutation.mutate(row.id);
                        } else if (reason) {
                            showToast({ message: 'Il motivo deve avere almeno 10 caratteri', type: 'error' });
                        }
                    },
                });
                return <ActionButton theme="violet" actions={actions} />;
            },
        },
    ];

    // Generate month options (last 12 months)
    const monthOptions = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = format(d, 'MMMM yyyy', { locale: it });
        monthOptions.push({ value, label });
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Timbrature</h1>
                    <p className="text-gray-600">Registro presenze del personale</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-500">Totale Timbrature</p>
                    <p className="text-2xl font-bold text-gray-900">{timbrature.length}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <p className="text-sm text-emerald-600">Validate</p>
                    <p className="text-2xl font-bold text-emerald-700">
                        {timbrature.filter(t => t.isValidata).length}
                    </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-600">Da Validare</p>
                    <p className="text-2xl font-bold text-amber-700">
                        {timbrature.filter(t => !t.isValidata).length}
                    </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600">Entrate Oggi</p>
                    <p className="text-2xl font-bold text-blue-700">
                        {timbrature.filter(t =>
                            t.tipo === 'ENTRATA' &&
                            format(parseISO(t.dataOra), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        ).length}
                    </p>
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
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
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
            </div>

            {/* Table */}
            <ResizableTable
                columns={columns}
                data={timbrature}
            />
        </div>
    );
};

export default TimbraturaPage;
